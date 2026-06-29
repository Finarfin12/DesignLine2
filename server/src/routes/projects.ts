import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/projects/public/:id (Public access for Presentation Mode)
router.get('/public/:id', async (req: Request, res: Response): Promise<void> => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id as string },
    select: {
      id: true,
      name: true,
      category: true,
      client: { select: { name: true, company: true } },
      assets: {
        where: { type: 'image' },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, fileUrl: true, type: true }
      }
    }
  });

  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
  res.json(project);
});

router.use(authenticate);

const projectSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['Logo', 'Brochure', 'Poster', 'Packaging', 'Digital', 'UI/UX', 'Other']),
  status: z.enum(['draft', 'active', 'on_hold', 'completed']).default('active'),
  clientId: z.string().optional(),
  deadline: z.string().datetime().optional(),
  notes: z.string().optional(),
  timeSpent: z.number().int().optional(),
});

const briefSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  clientName: z.string().optional(),
  projectType: z.string().optional(),
  deliverables: z.array(z.string()).optional(),
  specs: z.object({
    size: z.string().optional(),
    resolution: z.string().optional(),
    colorMode: z.string().optional(),
    format: z.string().optional(),
    bleed: z.string().optional(),
    material: z.string().optional(),
    lamination: z.string().optional(),
    finishing: z.string().optional(),
    platform: z.string().optional(),
    pagesCount: z.string().optional(),
    software: z.string().optional(),
  }).optional(),
  references: z.array(z.string()).optional(),
});

const invoiceSchema = z.object({
  items: z.array(z.object({
    description: z.string().min(1),
    qty: z.number().min(1),
    price: z.number().min(0),
  })),
  tax: z.number().optional(),
  discount: z.number().optional(),
  status: z.enum(['draft', 'sent', 'paid']).default('draft'),
  notes: z.string().optional(),
});

// GET /api/projects
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, category, search, page = '1', limit = '20' } = req.query as Record<string, string>;

  const where: Record<string, unknown> = { userId: req.user!.id };
  if (status) where.status = status;
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: { client: true, brief: true, tags: { include: { tag: true } } },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.project.count({ where }),
  ]);

  res.json({ projects, total, page: parseInt(page), limit: parseInt(limit) });
});

// POST /api/projects
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const project = await prisma.project.create({
    data: { ...parsed.data, userId: req.user!.id },
    include: { client: true },
  });
  res.status(201).json(project);
});

// GET /api/projects/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id as string, userId: req.user!.id },
    include: { client: true, brief: true, assets: { orderBy: { createdAt: 'desc' } }, tasks: { orderBy: { createdAt: 'asc' } }, tags: { include: { tag: true } }, emailLogs: { orderBy: { sentAt: 'desc' }, take: 10 } },
  });
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
  res.json(project);
});

// PUT /api/projects/:id
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = projectSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const existing = await prisma.project.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (!existing) { res.status(404).json({ error: 'Project not found' }); return; }

  const project = await prisma.project.update({
    where: { id: req.params.id as string },
    data: parsed.data,
    include: { client: true },
  });
  res.json(project);
});

// DELETE /api/projects/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.project.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (!existing) { res.status(404).json({ error: 'Project not found' }); return; }

  await prisma.project.delete({ where: { id: req.params.id as string } });
  res.json({ message: 'Project deleted' });
});

// GET /api/projects/:id/brief
router.get('/:id/brief', async (req: AuthRequest, res: Response): Promise<void> => {
  const project = await prisma.project.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

  const brief = await prisma.brief.findUnique({ where: { projectId: req.params.id as string } });
  if (!brief) { res.status(404).json({ error: 'Brief not found' }); return; }
  res.json(brief);
});

// POST /api/projects/:id/brief
router.post('/:id/brief', async (req: AuthRequest, res: Response): Promise<void> => {
  const project = await prisma.project.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

  const parsed = briefSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const brief = await prisma.brief.upsert({
    where: { projectId: req.params.id as string },
    create: { projectId: req.params.id as string, ...parsed.data },
    update: parsed.data,
  });
  res.status(201).json(brief);
});

// PUT /api/projects/:id/brief
router.put('/:id/brief', async (req: AuthRequest, res: Response): Promise<void> => {
  const project = await prisma.project.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

  const parsed = briefSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const brief = await prisma.brief.update({ where: { projectId: req.params.id as string }, data: parsed.data });
  res.json(brief);
});

// GET /api/projects/:id/invoice
router.get('/:id/invoice', async (req: AuthRequest, res: Response): Promise<void> => {
  const project = await prisma.project.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

  const invoice = await prisma.invoice.findUnique({ where: { projectId: req.params.id as string } });
  if (!invoice) { res.status(404).json({ error: 'Invoice not found' }); return; }
  res.json(invoice);
});

// POST /api/projects/:id/invoice
router.post('/:id/invoice', async (req: AuthRequest, res: Response): Promise<void> => {
  const project = await prisma.project.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

  const parsed = invoiceSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const invoice = await prisma.invoice.upsert({
    where: { projectId: req.params.id as string },
    create: { projectId: req.params.id as string, ...(parsed.data as any) },
    update: parsed.data as any,
  });
  res.status(201).json(invoice);
});

// PUT /api/projects/:id/invoice
router.put('/:id/invoice', async (req: AuthRequest, res: Response): Promise<void> => {
  const project = await prisma.project.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

  const parsed = invoiceSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const invoice = await prisma.invoice.update({ where: { projectId: req.params.id as string }, data: parsed.data as any });
  res.json(invoice);
});

// Task Schemas
const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  isCompleted: z.boolean().optional(),
});

// Tasks Endpoints
router.post('/:id/tasks', async (req: AuthRequest, res: Response): Promise<void> => {
  const project = await prisma.project.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const task = await prisma.task.create({
    data: {
      projectId: req.params.id as string,
      title: parsed.data.title,
    },
  });
  res.status(201).json(task);
});

router.put('/:id/tasks/:taskId', async (req: AuthRequest, res: Response): Promise<void> => {
  const project = await prisma.project.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const task = await prisma.task.update({
    where: { id: req.params.taskId as string, projectId: req.params.id as string },
    data: parsed.data,
  });
  res.json(task);
});

router.delete('/:id/tasks/:taskId', async (req: AuthRequest, res: Response): Promise<void> => {
  const project = await prisma.project.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

  await prisma.task.delete({
    where: { id: req.params.taskId as string, projectId: req.params.id as string },
  });
  res.json({ message: 'Task deleted' });
});

export default router;
