import { Router, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const q = (req.query.q as string || '').trim();
  if (!q || q.length < 2) {
    res.json({ projects: [], brands: [], assets: [], clients: [] });
    return;
  }

  const where = { contains: q, mode: 'insensitive' as const };
  const userId = req.user!.id;

  const [projects, brands, assets, clients] = await Promise.all([
    prisma.project.findMany({ where: { userId, OR: [{ name: where }, { notes: where }] }, take: 10, orderBy: { updatedAt: 'desc' } }),
    prisma.brand.findMany({ where: { userId, name: where }, take: 10, orderBy: { name: 'asc' } }),
    prisma.asset.findMany({ where: { userId, name: where }, take: 10, orderBy: { createdAt: 'desc' } }),
    prisma.client.findMany({ where: { userId, OR: [{ name: where }, { company: where }] }, take: 10, orderBy: { name: 'asc' } }),
  ]);

  res.json({ projects, brands, assets, clients });
});

export default router;
