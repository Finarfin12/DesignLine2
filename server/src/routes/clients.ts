import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const clientSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  company: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/clients
router.get('/', async (req: AuthRequest, res: Response) => {
  const clients = await prisma.client.findMany({
    where: { userId: req.user!.id },
    include: { _count: { select: { projects: true } }, tags: { include: { tag: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(clients);
});

// POST /api/clients
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = clientSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const client = await prisma.client.create({
    data: {
      ...parsed.data,
      userId: req.user!.id,
    }
  });
  res.status(201).json(client);
});

// GET /api/clients/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await prisma.client.findFirst({
    where: { id: req.params.id as string, userId: req.user!.id },
    include: { _count: { select: { projects: true } }, tags: { include: { tag: true } } },
  });
  if (!client) { res.status(404).json({ error: 'Client not found' }); return; }
  res.json(client);
});

// PUT /api/clients/:id
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = clientSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const existing = await prisma.client.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (!existing) { res.status(404).json({ error: 'Client not found' }); return; }

  const client = await prisma.client.update({
    where: { id: req.params.id as string },
    data: parsed.data,
  });
  res.json(client);
});

// DELETE /api/clients/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.client.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (!existing) { res.status(404).json({ error: 'Client not found' }); return; }

  await prisma.client.delete({ where: { id: req.params.id as string } });
  res.json({ message: 'Client deleted' });
});

export default router;
