/**
 * src/lib/mailer.ts
 * Nodemailer wrapper for transactional emails.
 */
import nodemailer from 'nodemailer';

function getTransport() {
  return nodemailer.createTransport({
    host: import.meta.env.SMTP_HOST,
    port: Number(import.meta.env.SMTP_PORT) || 587,
    secure: import.meta.env.SMTP_SECURE === 'true',
    auth: {
      user: import.meta.env.SMTP_USER,
      pass: import.meta.env.SMTP_PASS,
    },
  });
}

export async function sendMail(opts: { to: string; subject: string; html: string }) {
  const transport = getTransport();
  return transport.sendMail({
    from: import.meta.env.SMTP_FROM ?? 'Novamarkt <noreply@novamarkt.de>',
    ...opts,
  });
}

export function emailVerifyHtml(url: string) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#06b6d4">E-Mail bestätigen</h2>
      <p>Klicke auf den Link, um deine E-Mail-Adresse bei Novamarkt zu bestätigen:</p>
      <a href="${url}" style="display:inline-block;margin:1rem 0;padding:.75rem 1.5rem;background:#06b6d4;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">
        E-Mail bestätigen
      </a>
      <p style="color:#666;font-size:.85rem">Der Link ist 24 Stunden gültig. Falls du dich nicht registriert hast, ignoriere diese E-Mail.</p>
    </div>`;
}

// Legacy aliases for existing API routes
export const kycSuccessEmail  = (to: string, name: string) => sendMail({ to, subject: 'KYC erfolgreich', html: `<p>Hallo ${name}, deine Identität wurde verifiziert.</p>` });
export const paymentConfirmEmail = (to: string, amount: string) => sendMail({ to, subject: 'Zahlung bestätigt', html: `<p>Zahlung über ${amount} erfolgreich.</p>` });
export const refundEmail = (to: string, amount: string) => sendMail({ to, subject: 'Rückerstattung', html: `<p>Rückerstattung über ${amount} eingeleitet.</p>` });
export const sendEmail = sendMail;
export const webhookNotification = (to: string, msg: string) => sendMail({ to, subject: 'Webhook Benachrichtigung', html: `<p>${msg}</p>` });
export const paymentReceivedEmail = (to: string, amount: string) => sendMail({ to, subject: 'Zahlung eingegangen', html: `<p>Deine Zahlung über ${amount} wurde erfolgreich empfangen.</p>` });
export const releasePaymentEmail = (to: string, amount: string) => sendMail({ to, subject: 'Zahlung freigegeben', html: `<p>Der Betrag von ${amount} wurde an den Verkäufer freigegeben.</p>` });
