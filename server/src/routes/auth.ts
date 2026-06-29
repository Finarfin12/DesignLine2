import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendEmail } from '../services/emailService';

const router = Router();

// ─── Validation Schemas ──────────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotSchema = z.object({
  email: z.string().email(),
});

const resetSchema = z.object({
  token: z.string(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

// ─── Helper ───────────────────────────────────────────────────
function signToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

// ─── Routes ──────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
  });

  const token = signToken(user.id, user.email);
  res.status(201).json({ token, user });
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid email or password format' });
    return;
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = signToken(user.id, user.email);
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
  });
});

// POST /api/auth/logout
router.post('/logout', authenticate, (_req: Request, res: Response): void => {
  // JWT is stateless — client deletes the token
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true, updatedAt: true },
  });
  res.json(user);
});

// PUT /api/auth/me
router.put('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const data = parsed.data;

  if (data.email) {
    const existing = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id: req.user!.id } },
    });
    if (existing) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data,
    select: { id: true, name: true, email: true, avatarUrl: true, updatedAt: true },
  });

  res.json(user);
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  res.json({ message: 'Password changed successfully' });
});

// POST /api/auth/forgot
router.post('/forgot', async (req: Request, res: Response): Promise<void> => {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid email' });
    return;
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to prevent email enumeration
  if (!user) {
    res.json({ message: 'If that email exists, a reset link has been sent.' });
    return;
  }

  // Invalidate previous tokens
  await prisma.passwordReset.deleteMany({ where: { userId: user.id } });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await prisma.passwordReset.create({
    data: { userId: user.id, token, expiresAt },
  });

  const resetUrl = `${env.clientUrl}/reset-password?token=${token}`;

  try {
    await sendEmail({
      to: email,
      subject: 'Reset Password — DesignFlow',
      html: `
        <p>Kami menerima permintaan reset password untuk akun <strong>${user.email}</strong>.</p>
        <p>Klik tombol di bawah untuk membuat password baru. Link ini berlaku selama <strong>1 jam</strong>.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
          <tr>
            <td align="center">
              <a href="${resetUrl}" style="display:inline-block;background:#6366f1;color:#ffffff;font-size:14px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">Reset Password</a>
            </td>
          </tr>
        </table>
        <p style="color:#6b7280;font-size:13px;">Jika tombol tidak berfungsi, salin tautan berikut ke browser:<br><span style="color:#6366f1;word-break:break-all;">${resetUrl}</span></p>
        <p style="margin-top:24px;padding-top:20px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:13px;">Abaikan email ini jika kamu tidak merasa meminta reset password.</p>
      `,
    });
  } catch (err) {
    console.error('[Auth] Failed to send reset email:', err);
  }

  res.json({ message: 'If that email exists, a reset link has been sent.' });
});

// POST /api/auth/reset
router.post('/reset', async (req: Request, res: Response): Promise<void> => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { token, password } = parsed.data;

  const reset = await prisma.passwordReset.findUnique({ where: { token } });

  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    res.status(400).json({ error: 'Invalid or expired reset token' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
    prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
  ]);

  res.json({ message: 'Password reset successfully. Please login.' });
});

export default router;
