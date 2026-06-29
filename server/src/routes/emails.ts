import { Router, Response } from 'express';
import path from 'path';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createUpload, processUpload } from '../middleware/upload';
import { sendEmail, fillTemplate } from '../services/emailService';
import { wrapInHtmlTemplate } from '../services/emailTemplate';

const router = Router();
router.use(authenticate);

const templateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  category: z.enum(['order', 'followup', 'revision', 'confirmation', 'thank_you']),
  isDefault: z.boolean().optional().default(false),
  headerText: z.string().optional().nullable(),
  headerColor: z.string().optional().nullable(),
  headerAlign: z.string().optional().nullable(),
  bodyAlign: z.string().optional().nullable(),
  footerText: z.string().optional().nullable(),
  footerAlign: z.string().optional().nullable(),
});

const sendEmailSchema = z.object({
  templateId: z.string().optional(),
  projectId: z.string().optional(),
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
  variables: z.record(z.string()).optional(),
  // For sending, allow overriding styles if needed
  headerText: z.string().optional().nullable(),
  headerColor: z.string().optional().nullable(),
  headerAlign: z.string().optional().nullable(),
  bodyAlign: z.string().optional().nullable(),
  footerText: z.string().optional().nullable(),
  footerAlign: z.string().optional().nullable(),
});

// ─── Templates ───────────────────────────────────────────────

// GET /api/email/templates
router.get('/templates', async (req: AuthRequest, res: Response): Promise<void> => {
  const templates = await prisma.emailTemplate.findMany({
    where: { userId: req.user!.id },
    orderBy: [{ isDefault: 'desc' }, { category: 'asc' }],
  });
  res.json(templates);
});

// POST /api/email/templates
router.post('/templates', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const template = await prisma.emailTemplate.create({
    data: { ...parsed.data, userId: req.user!.id },
  });
  res.status(201).json(template);
});

// GET /api/email/templates/:id
router.get('/templates/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const template = await prisma.emailTemplate.findFirst({
    where: { id: req.params.id as string, userId: req.user!.id },
  });
  if (!template) { res.status(404).json({ error: 'Template not found' }); return; }
  res.json(template);
});

// PUT /api/email/templates/:id
router.put('/templates/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = templateSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const existing = await prisma.emailTemplate.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (!existing) { res.status(404).json({ error: 'Template not found' }); return; }

  const template = await prisma.emailTemplate.update({ where: { id: req.params.id as string }, data: parsed.data });
  res.json(template);
});

// DELETE /api/email/templates/:id
router.delete('/templates/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.emailTemplate.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (!existing) { res.status(404).json({ error: 'Template not found' }); return; }

  await prisma.emailTemplate.delete({ where: { id: req.params.id as string } });
  res.json({ message: 'Template deleted' });
});

// ─── Send Email ───────────────────────────────────────────────

// POST /api/email/send  (with optional file attachments)
router.post('/send', createUpload('temp').array('attachments', 5), processUpload('temp'), async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = sendEmailSchema.safeParse({
    ...req.body,
    variables: req.body.variables ? JSON.parse(req.body.variables) : {},
  });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const { templateId, projectId, recipientEmail, recipientName, subject, body, variables, headerText, headerColor, headerAlign, bodyAlign, footerText, footerAlign } = parsed.data;

  // Auto-build variables from project data if a project is selected
  let mergedVars: Record<string, string> = { ...(variables || {}) };

  let projectName = '';
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user!.id },
      include: { client: true },
    });
    if (project) {
      projectName = project.name;
      const p = project as any;
      const brief = (p.brief || {}) as Record<string, any>;
      const specs = (brief.specs || {}) as Record<string, any>;
      const deliverables = Array.isArray(brief.deliverables)
        ? (brief.deliverables as string[]).join(', ')
        : (brief.deliverables || '');

      // Only set variables that are NOT already provided by user
      const autoVars: Record<string, string> = {
        projectName: project.name,
        clientName: project.client?.name || recipientName || '',
        projectType: brief.projectType || p.category || '',
        description: brief.description || p.description || '',
        deliverables: deliverables as string,
        'specs.size': specs.size || '',
        'specs.material': specs.material || '',
        'specs.lamination': specs.lamination || '',
        'specs.finishing': specs.finishing || '',
        'specs.quantity': specs.quantity ? String(specs.quantity) : '',
        deadline: project.deadline ? new Date(project.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
        status: project.status || '',
      };

      // Merge: user-provided variables take precedence
      mergedVars = { ...autoVars, ...mergedVars };
    }
  }

  // Fill template variables
  const finalSubject = fillTemplate(subject, mergedVars);
  const finalBody = fillTemplate(body, mergedVars);

  // Build attachment list from uploaded files
  const files = req.files as any[];
  const attachments = files?.map((f) => ({
    filename: f.originalname,
    path: f.url,
  })) || [];

  const attachmentUrls = files?.map((f) => f.url) || [];

  let status: 'sent' | 'failed' = 'sent';
  let errorMessage: string | undefined;

  try {
    // Fetch template defaults if not provided in request
    let templateStyles: any = {};
    if (templateId) {
      const template = await prisma.emailTemplate.findFirst({ where: { id: templateId, userId: req.user!.id } });
      if (template) templateStyles = template;
    }

    const htmlContent = wrapInHtmlTemplate(finalBody, {
      recipientName: recipientName || mergedVars.clientName,
      subject: finalSubject,
      projectName: projectName || undefined,
      headerText: headerText || templateStyles.headerText || undefined,
      headerColor: headerColor || templateStyles.headerColor || undefined,
      headerAlign: headerAlign || templateStyles.headerAlign || undefined,
      bodyAlign: bodyAlign || templateStyles.bodyAlign || undefined,
      footerText: footerText || templateStyles.footerText || undefined,
      footerAlign: footerAlign || templateStyles.footerAlign || undefined,
    });

    await sendEmail({
      to: recipientEmail,
      subject: finalSubject,
      html: htmlContent,
      attachments,
    });
  } catch (err) {
    status = 'failed';
    errorMessage = err instanceof Error ? err.message : 'Unknown error';
  }

  // Log the email
  const log = await prisma.emailLog.create({
    data: {
      userId: req.user!.id,
      projectId: projectId || null,
      templateId: templateId || null,
      recipientEmail,
      recipientName: recipientName || null,
      subject: finalSubject,
      body: finalBody,
      attachments: attachmentUrls,
      status,
      errorMessage: errorMessage || null,
    },
  });

  if (status === 'failed') {
    res.status(500).json({ error: 'Failed to send email', log });
    return;
  }

  res.json({ message: 'Email sent successfully', log });
});

// POST /api/email/preview
router.post('/preview', async (req: AuthRequest, res: Response): Promise<void> => {
  const previewSchema = z.object({
    subject: z.string().min(1),
    body: z.string().min(1),
    variables: z.record(z.string()).optional(),
  });
  const parsed = previewSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const { subject, body, variables } = parsed.data;
  const finalSubject = fillTemplate(subject, variables || {});
  const finalBody = fillTemplate(body, variables || {});

  res.json({ subject: finalSubject, body: finalBody });
});

// ─── Logs ──────────────────────────────────────────────────────

// GET /api/email/logs
router.get('/logs', async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [logs, total] = await Promise.all([
    prisma.emailLog.findMany({
      where: { userId: req.user!.id },
      include: { project: true, template: true },
      orderBy: { sentAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.emailLog.count({ where: { userId: req.user!.id } }),
  ]);

  res.json({ logs, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/email/logs/:id
router.get('/logs/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const log = await prisma.emailLog.findFirst({
    where: { id: req.params.id as string, userId: req.user!.id },
    include: { project: true, template: true },
  });
  if (!log) { res.status(404).json({ error: 'Log not found' }); return; }
  res.json(log);
});

export default router;
