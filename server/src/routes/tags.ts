import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const tagSchema = z.object({
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6366f1'),
});

// GET /api/tags
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const tags = await prisma.tag.findMany({
    where: { userId: req.user!.id },
    orderBy: { name: 'asc' },
  });
  res.json(tags);
});

// POST /api/tags
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = tagSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const existing = await prisma.tag.findFirst({ where: { userId: req.user!.id, name: parsed.data.name } });
  if (existing) { res.status(409).json({ error: 'Tag dengan nama tersebut sudah ada' }); return; }
  const tag = await prisma.tag.create({ data: { ...parsed.data, userId: req.user!.id } });
  res.status(201).json(tag);
});

// PUT /api/tags/:id
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.tag.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (!existing) { res.status(404).json({ error: 'Tag not found' }); return; }
  const parsed = tagSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const tag = await prisma.tag.update({ where: { id: req.params.id as string }, data: parsed.data });
  res.json(tag);
});

// DELETE /api/tags/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.tag.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (!existing) { res.status(404).json({ error: 'Tag not found' }); return; }
  await prisma.tag.delete({ where: { id: req.params.id as string } });
  res.json({ message: 'Tag deleted' });
});

// PUT /api/tags/:entity/:entityId - Replace tags on an entity
router.put('/:entity/:entityId', async (req: AuthRequest, res: Response): Promise<void> => {
  const entity = req.params.entity as string;
  const entityId = req.params.entityId as string;
  const { tagIds } = z.object({ tagIds: z.array(z.string()) }).parse(req.body);

  if (!['project', 'asset', 'client'].includes(entity)) {
    res.status(400).json({ error: 'Invalid entity type' });
    return;
  }

  const prismaEntity = prisma[entity as keyof typeof prisma] as any;
  const owner = await prismaEntity.findFirst({ where: { id: entityId, userId: req.user!.id } });
  if (!owner) { res.status(404).json({ error: 'Entity not found' }); return; }

  const junctionModel = entity === 'project' ? 'projectTag' : entity === 'asset' ? 'assetTag' : 'clientTag';
  const prismaJunction = prisma[junctionModel as keyof typeof prisma] as any;
  const fkField = `${entity}Id`;

  await prismaJunction.deleteMany({ where: { [fkField]: entityId } });
  if (tagIds.length > 0) {
    await prismaJunction.createMany({
      data: tagIds.map((tagId: string) => ({ [fkField]: entityId, tagId })),
    });
  }

  const updated = await prismaEntity.findUnique({
    where: { id: entityId },
    include: { tags: { include: { tag: true } } },
  });

  res.json(updated);
});

export default router;
