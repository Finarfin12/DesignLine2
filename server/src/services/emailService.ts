import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { env } from '../config/env';

const resend = env.email.resend.apiKey ? new Resend(env.email.resend.apiKey) : null;

function createTransporter() {
  if (env.email.mode === 'resend') return null;
  
  if (env.email.mode === 'mailhog') {
    return nodemailer.createTransport({
      host: env.email.mailhog.host,
      port: env.email.mailhog.port,
      secure: false,
      ignoreTLS: true,
    });
  }

  // Gmail SMTP
  return nodemailer.createTransport({
    host: env.email.gmail.host,
    port: env.email.gmail.port,
    secure: false,
    auth: {
      user: env.email.gmail.user,
      pass: env.email.gmail.pass,
    },
  });
}

const transporter = createTransporter();

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    path: string;
  }>;
}

export async function sendEmail(options: SendEmailOptions) {
  const fromAddress =
    env.email.mode === 'mailhog'
      ? `"${env.email.fromName}" <noreply@designflow.local>`
      : `"${env.email.fromName}" <${env.email.fromAddress}>`;

  if (env.email.mode === 'resend' && resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments?.map(a => ({
          filename: a.filename,
          path: a.path,
        })),
      });
      
      if (error) throw error;
      console.log(`[Email] Sent to ${options.to} via Resend | MsgId: ${data?.id}`);
      return { messageId: data?.id };
    } catch (error) {
      console.error('❌ Resend send failed:', error);
      throw error;
    }
  }

  // Fallback to Nodemailer
  if (!transporter) {
    throw new Error('Email service not configured correctly.');
  }

  try {
    const result = await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });

    console.log(
      `[Email] Sent to ${options.to} | Mode: ${env.email.mode} | MsgId: ${result.messageId}`
    );

    return result;
  } catch (error) {
    console.error(`[Email] Failed to send to ${options.to}:`, error);
    throw error;
  }
}

export function fillTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, key) => {
    return key in variables ? variables[key] : `{{${key}}}`;
  });
}
