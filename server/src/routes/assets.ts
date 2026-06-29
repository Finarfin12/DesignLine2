import { Router, Response } from 'express';
import path from 'path';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createUpload, processUpload } from '../middleware/upload';
import { deleteFile } from '../services/storageService';

const router = Router();
router.use(authenticate);

const assetMetaSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['font', 'color', 'template', 'icon', 'image', 'mockup', 'palette', 'moodboard']),
  category: z.string().optional(),
  brandId: z.string().optional(),
  projectId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  license: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  version: z.coerce.number().int().optional(),
  revisionNotes: z.string().optional(),
});

// GET /api/assets
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { type, brandId, search, page = '1', limit = '24' } = req.query as Record<string, string>;

  const where: Record<string, unknown> = { userId: req.user!.id };
  if (type) where.type = type;
  if (brandId) where.brandId = brandId;
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: { brand: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.asset.count({ where }),
  ]);

  res.json({ assets, total, page: parseInt(page), limit: parseInt(limit) });
});

// POST /api/assets — Upload new asset
router.post('/', createUpload('assets').single('file'), processUpload('assets'), async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }

  let parsedTags: string[] = [];
  if (req.body.tags) {
    try { parsedTags = JSON.parse(req.body.tags); } catch { parsedTags = []; }
  }
  let parsedMetadata: Record<string, unknown> = {};
  if (req.body.metadata) {
    try { parsedMetadata = JSON.parse(req.body.metadata); } catch { parsedMetadata = {}; }
  }
  let parsedLicense: Record<string, unknown> = {};
  if (req.body.license) {
    try { parsedLicense = JSON.parse(req.body.license); } catch { parsedLicense = {}; }
  }
  const parsed = assetMetaSchema.safeParse({
    ...req.body,
    tags: parsedTags,
    metadata: parsedMetadata,
    license: parsedLicense,
  });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const fileUrl = (req.file as any).url;

  const asset = await prisma.asset.create({
    data: {
      ...(parsed.data as any),
      userId: req.user!.id,
      fileUrl,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    },
  });
  res.status(201).json(asset);
});

// POST /api/assets/link — Add an external asset link (no upload)
router.post('/link', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = assetMetaSchema.extend({ fileUrl: z.string().min(1, 'URL or path is required') }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const asset = await prisma.asset.create({
    data: {
      ...(parsed.data as any),
      userId: req.user!.id,
    },
  });
  res.status(201).json(asset);
});

// GET /api/assets/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const asset = await prisma.asset.findFirst({
    where: { id: req.params.id as string, userId: req.user!.id },
    include: { brand: true, project: true },
  });
  if (!asset) { res.status(404).json({ error: 'Asset not found' }); return; }

  // Increment usage count
  await prisma.asset.update({ where: { id: asset.id }, data: { usageCount: { increment: 1 } } });

  res.json(asset);
});

// PUT /api/assets/:id
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = assetMetaSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const existing = await prisma.asset.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (!existing) { res.status(404).json({ error: 'Asset not found' }); return; }

  const asset = await prisma.asset.update({ where: { id: req.params.id as string }, data: parsed.data as any });
  res.json(asset);
});

// DELETE /api/assets/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.asset.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
  if (!existing) { res.status(404).json({ error: 'Asset not found' }); return; }

  deleteFile(existing.fileUrl);
  await prisma.asset.delete({ where: { id: req.params.id as string } });
  res.json({ message: 'Asset deleted' });
});

// POST /api/assets/upload-image — Upload image for rich text editor (no asset record)
router.post('/upload-image', createUpload('editor').single('image'), processUpload('editor'), async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
  res.json({ url: (req.file as any).url });
});

export default router;
