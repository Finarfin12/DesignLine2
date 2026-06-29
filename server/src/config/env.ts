import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE_MB: z.string().default('50'),
  
  EMAIL_MODE: z.enum(['mailhog', 'gmail', 'resend']).default('mailhog'),
  EMAIL_FROM_NAME: z.string().default('DesignFlow'),
  EMAIL_FROM_ADDRESS: z.string().optional(),
  
  MAILHOG_HOST: z.string().default('localhost'),
  MAILHOG_PORT: z.string().default('1025'),
  
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),

  RESEND_API_KEY: z.string().optional(),
  
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),
});

let parsedEnv;
try {
  // Allow extra env variables but validate the ones we care about
  parsedEnv = envSchema.parse(process.env);
} catch (error: any) {
  console.error('❌ Invalid environment variables:');
  console.error(error.errors);
  process.exit(1);
}

export const env = {
  port: parseInt(parsedEnv.PORT, 10),
  nodeEnv: parsedEnv.NODE_ENV,
  clientUrl: parsedEnv.CLIENT_URL,

  jwt: {
    secret: parsedEnv.JWT_SECRET,
    expiresIn: parsedEnv.JWT_EXPIRES_IN,
  },

  upload: {
    dir: parsedEnv.UPLOAD_DIR,
    maxFileSizeMb: parseInt(parsedEnv.MAX_FILE_SIZE_MB, 10),
  },

  email: {
    mode: parsedEnv.EMAIL_MODE as 'mailhog' | 'gmail' | 'resend',
    fromName: parsedEnv.EMAIL_FROM_NAME,
    fromAddress: parsedEnv.EMAIL_FROM_ADDRESS || parsedEnv.SMTP_USER || 'noreply@designflow.local',
    mailhog: {
      host: parsedEnv.MAILHOG_HOST,
      port: parseInt(parsedEnv.MAILHOG_PORT, 10),
    },
    gmail: {
      host: parsedEnv.SMTP_HOST,
      port: parseInt(parsedEnv.SMTP_PORT, 10),
      user: parsedEnv.SMTP_USER,
      pass: parsedEnv.SMTP_PASS,
    },
    resend: {
      apiKey: parsedEnv.RESEND_API_KEY,
    }
  },

  r2: {
    accountId: parsedEnv.R2_ACCOUNT_ID,
    accessKeyId: parsedEnv.R2_ACCESS_KEY_ID,
    secretAccessKey: parsedEnv.R2_SECRET_ACCESS_KEY,
    bucketName: parsedEnv.R2_BUCKET_NAME,
    publicUrl: parsedEnv.R2_PUBLIC_URL,
  }
};
