import { Router, Response } from 'express';
import path from 'path';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createUpload, processUpload } from '../middleware/upload';
import { deleteFile } from '../services/storageService';

const router = Router();
router.use(authenticate);

const brandSchema = z.object({
  name: z.string().min(1),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  neutralColor: z.string().optional(),
  fontHeading: z.string().optional(),
  fontBody: z.string().optional(),
  guidelines: z.record(z.unknown()).optional(),
});

// GET /api/brands
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const brands = await prisma.brand.findMany({
    where: { userId: req.user!.id },
    include: { _count: { select: { assets: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(brands);
});

// POST /api/brands
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = brandSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const brand = await prisma.brand.create({
    data: { ...(parsed.data as any), userId: req.user!.id },
  });
  res.status(201).json(brand);
});

// GET /api/brands/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const brand = await prisma.brand.findFirst({
    where: { id: req.params.id as string, userId: req.user!.id },
    include: { assets: true },
  });
  if (!brand) { res.status(404).json({ error: 'Brand not found' }); return; }
  res.json(brand);
});

// PUT /api/brands/:id
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = brandSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const existing = await prisma.brand.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (!existing) { res.status(404).json({ error: 'Brand not found' }); return; }

  const brand = await prisma.brand.update({ where: { id: req.params.id as string }, data: parsed.data as any });
  res.json(brand);
});

// DELETE /api/brands/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.brand.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (!existing) { res.status(404).json({ error: 'Brand not found' }); return; }

  // Clean up logo files
  if (existing.logoUrl) deleteFile(existing.logoUrl);
  if ((existing as any).secondaryLogoUrl) deleteFile((existing as any).secondaryLogoUrl);

  await prisma.brand.delete({ where: { id: req.params.id as string } });
  res.json({ message: 'Brand deleted' });
});

// POST /api/brands/:id/logo
router.post('/:id/logo', createUpload('brands').single('logo'), processUpload('brands'), async (req: AuthRequest, res: Response): Promise<void> => {
  const brand = await prisma.brand.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (!brand) { res.status(404).json({ error: 'Brand not found' }); return; }
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }

  // Delete old logo if exists
  if (brand.logoUrl) deleteFile(brand.logoUrl);

  const logoUrl = (req.file as any).url;

  const updated = await prisma.brand.update({ where: { id: req.params.id as string }, data: { logoUrl } });
  res.json(updated);
});

// POST /api/brands/:id/secondary-logo
router.post('/:id/secondary-logo', createUpload('brands').single('logo'), processUpload('brands'), async (req: AuthRequest, res: Response): Promise<void> => {
  const brand = await prisma.brand.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (!brand) { res.status(404).json({ error: 'Brand not found' }); return; }
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }

  // Delete old logo if exists
  if ((brand as any).secondaryLogoUrl) deleteFile((brand as any).secondaryLogoUrl);

  const secondaryLogoUrl = (req.file as any).url;

  const updated = await prisma.brand.update({ where: { id: req.params.id as string }, data: { secondaryLogoUrl } as any });
  res.json(updated);
});

export default router;
