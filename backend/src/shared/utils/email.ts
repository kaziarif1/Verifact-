import nodemailer from 'nodemailer';
import { config } from '../../config/env';
import { logger } from './logger';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: { user: config.smtp.user, pass: config.smtp.pass },
});

export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  try {
    await transporter.sendMail({ from: config.smtp.from, to, subject, html });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    logger.error(`Failed to send email to ${to}:`, err);
    throw err;
  }
};

export const buildVerifyEmailHtml = (displayName: string, token: string): string => `
  <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#fff;">
    <h1 style="color:#DC2626;font-size:28px;margin-bottom:8px;">Verifact</h1>
    <p style="color:#374151;font-size:16px;">Hi ${displayName},</p>
    <p style="color:#374151;font-size:16px;">Please verify your email to start fact-checking.</p>
    <a href="${config.frontendUrl}/verify-email/${token}"
       style="display:inline-block;background:#DC2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">
      Verify Email
    </a>
    <p style="color:#6B7280;font-size:13px;margin-top:24px;">This link expires in 24 hours.</p>
  </div>
`;

export const buildPasswordResetHtml = (displayName: string, token: string): string => `
  <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#fff;">
    <h1 style="color:#DC2626;font-size:28px;margin-bottom:8px;">Verifact</h1>
    <p style="color:#374151;font-size:16px;">Hi ${displayName},</p>
    <p style="color:#374151;font-size:16px;">You requested a password reset. Click below to set a new password.</p>
    <a href="${config.frontendUrl}/reset-password/${token}"
       style="display:inline-block;background:#DC2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;">
      Reset Password
    </a>
    <p style="color:#6B7280;font-size:13px;margin-top:24px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
  </div>
`;
