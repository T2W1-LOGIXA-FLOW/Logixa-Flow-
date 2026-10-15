// src/lib/email.ts

import nodemailer from 'nodemailer';

const EMAIL_SERVICE_MODE = (process.env.EMAIL_SERVICE || 'mock').toLowerCase();
const EMAIL_SERVICE_ENABLED = process.env.EMAIL_SERVICE_ENABLED !== 'false';
const EMAIL_USER = process.env.EMAIL_USER || process.env.EMAIL_SERVER_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || process.env.EMAIL_SERVER_PASSWORD;
const EMAIL_SERVER_HOST = process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com';
const EMAIL_SERVER_PORT = Number(process.env.EMAIL_SERVER_PORT || 587);
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@logixaflow.com';
const EMAIL_ADMIN = process.env.EMAIL_ADMIN || process.env.ADMIN_EMAIL || 'admin@logixaflow.com';

const isMockEmailService = EMAIL_SERVICE_MODE === 'mock' || !EMAIL_USER || !EMAIL_PASSWORD;
const isProduction = process.env.NODE_ENV === 'production' || process.env.ENVIRONMENT === 'production';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character);
}

function logMockEmail(to: string, subject: string, body: string) {
  console.info('[Mock Email Service]', JSON.stringify({
    to,
    subject,
    body,
    from: EMAIL_FROM,
    timestamp: new Date().toISOString(),
  }, null, 2));
}

const transporter = EMAIL_SERVICE_ENABLED && (EMAIL_SERVICE_MODE === 'smtp' || EMAIL_SERVICE_MODE === 'gmail' || EMAIL_SERVICE_MODE === 'sendgrid')
  ? nodemailer.createTransport({
      host: EMAIL_SERVER_HOST,
      port: EMAIL_SERVER_PORT,
      secure: EMAIL_SERVER_PORT === 465,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD,
      },
    })
  : EMAIL_SERVICE_ENABLED && isMockEmailService
    ? nodemailer.createTransport({ jsonTransport: true })
    : null;

if (!transporter && EMAIL_SERVICE_ENABLED && !isMockEmailService) {
  console.warn('Email service not configured. Email sending will be disabled.');
}

async function sendMailWithFallback({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  if (!EMAIL_SERVICE_ENABLED) {
    console.info('[Email Service Disabled] Email sending is disabled by EMAIL_SERVICE_ENABLED=false.');
    return false;
  }

  if (!transporter || isMockEmailService) {
    if (isProduction) {
      console.error('Email service is not configured; refusing to report a mock email as sent.');
      return false;
    }
    logMockEmail(to, subject, text || html);
    return true;
  }

  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text: text || html,
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export async function sendConfirmationEmail(
  to: string,
  name: string,
  submissionId?: string
): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Thank you, ${escapeHtml(name)}! 🎉</h2>
      <p>We have received your contact form submission.</p>
      <p>Our team will review your message and get back to you as soon as possible.</p>
      ${submissionId ? `<p><strong>Reference ID:</strong> ${escapeHtml(submissionId)}</p>` : ''}
      <hr />
      <p style="color: #666; font-size: 12px;">
        This is an automated email from Logixa Flow. Please do not reply to this email.
      </p>
    </div>
  `;

  return sendMailWithFallback({
    to,
    subject: 'We received your message - Logixa Flow',
    html,
    text: `Thank you, ${name}!\n\nWe have received your contact form submission. Our team will review your message and get back to you as soon as possible.`,
  });
}

export async function sendAdminNotification(
  contactName: string,
  contactEmail: string,
  subject: string,
  message: string,
  phone?: string
): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Contact Submission</h2>
      <p><strong>Name:</strong> ${escapeHtml(contactName)}</p>
      <p><strong>Email:</strong> <a href="mailto:${encodeURIComponent(contactEmail)}">${escapeHtml(contactEmail)}</a></p>
      ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ''}
      <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <hr />
      <h3>Message:</h3>
      <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
      <hr />
      <p style="color: #666; font-size: 12px;">
        Submitted on: ${new Date().toLocaleString()}
      </p>
    </div>
  `;

  return sendMailWithFallback({
    to: EMAIL_ADMIN,
    subject: `New Contact: ${subject} from ${contactName}`,
    html,
    text: `New Contact Submission\n\nName: ${contactName}\nEmail: ${contactEmail}\n${phone ? `Phone: ${phone}\n` : ''}Subject: ${subject}\n\nMessage:\n${message}`,
  });
}

export async function sendCustomEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<boolean> {
  return sendMailWithFallback({
    to,
    subject,
    html,
    text,
  });
}
