import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const r2Client = env.r2.accountId ? new S3Client({
  region: 'auto',
  endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.r2.accessKeyId!,
    secretAccessKey: env.r2.secretAccessKey!,
  },
}) : null;

const USE_R2 = !!r2Client;
const UPLOAD_BASE = path.resolve(process.cwd(), env.upload.dir);

// Ensure local directories exist if not using R2
if (!USE_R2) {
  const DIRS = ['avatars', 'brands', 'assets', 'projects', 'temp'];
  DIRS.forEach((dir) => {
    fs.mkdirSync(path.join(UPLOAD_BASE, dir), { recursive: true });
  });
}

export async function uploadFile(
  category: string,
  filename: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (USE_R2) {
    const key = `${category}/${filename}`;
    
    await r2Client!.send(
      new PutObjectCommand({
        Bucket: env.r2.bucketName!,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );
    
    return getPublicUrl(category, filename);
  } else {
    const uploadPath = path.join(UPLOAD_BASE, category);
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    const filePath = path.join(uploadPath, filename);
    fs.writeFileSync(filePath, buffer);
    
    return `/uploads/${category}/${filename}`;
  }
}

export async function deleteFile(filePathOrUrl: string): Promise<void> {
  try {
    // Extract category and filename from url like /uploads/assets/123.jpg or https://.../assets/123.jpg
    const normalized = filePathOrUrl.replace(/\/$/, '');
    const parts = normalized.split('/');
    const filename = parts.pop()!;
    const category = parts.pop()!;
    if (!filename || !category) return;

    if (USE_R2) {
      await r2Client!.send(
        new DeleteObjectCommand({
          Bucket: env.r2.bucketName!,
          Key: `${category}/${filename}`,
        })
      );
    } else {
      const filePath = path.join(UPLOAD_BASE, category, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (err) {
    console.error(`[Storage] Failed to delete file: ${filePathOrUrl}`, err);
  }
}

export function getPublicUrl(category: string, filename: string): string {
  if (USE_R2 && env.r2.publicUrl) {
    return `${env.r2.publicUrl}/${category}/${filename}`;
  }
  return `/uploads/${category}/${filename}`;
}

export function generateFilename(originalName: string): string {
  const timestamp = Date.now();
  const hash = crypto.randomBytes(4).toString('hex');
  const ext = path.extname(originalName);
  const basename = path.basename(originalName, ext)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .substring(0, 30);
  
  return `${timestamp}-${hash}-${basename}${ext}`;
}

export function getFileSizeBytes(filePath: string): number {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}
