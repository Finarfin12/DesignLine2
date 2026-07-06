import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import brandRoutes from './routes/brands';
import assetRoutes from './routes/assets';
import emailRoutes from './routes/emails';
import clientRoutes from './routes/clients';
import searchRoutes from './routes/search';
import tagRoutes from './routes/tags';

const app = express();

// ─── Security Middleware ─────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: env.clientUrl,
  credentials: true,
}));

// ─── Rate Limiting ───────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later.' },
});

app.use(limiter);

// ─── Body Parsing ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Static Files (uploads) ──────────────────────────────────
const uploadsPath = path.resolve(process.cwd(), env.upload.dir);
app.use('/uploads', express.static(uploadsPath));

// ─── Health Check ────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: env.nodeEnv });
});

// ─── API Routes ──────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/tags', tagRoutes);

// ─── 404 ─────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global Error Handler ────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────
app.listen(env.port, () => {
  console.log(`\n🚀 DesignFlow API running on http://localhost:${env.port}`);
  console.log(`📧 Email mode: ${env.email.mode}`);
  if (env.email.mode === 'mailhog') {
    console.log(`📬 MailHog UI: http://localhost:8025`);
  }
  console.log(`📁 Uploads: ${uploadsPath}\n`);
});

export default app;
