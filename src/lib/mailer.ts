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
    from: import.meta.env.SMTP_FROM ?? 'Ehren-Deal <noreply@ehren-deal.de>',
    ...opts,
  });
}

export function emailVerifyHtml(url: string) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#06b6d4">E-Mail bestätigen</h2>
      <p>Klicke auf den Link, um deine E-Mail-Adresse bei Ehren-Deal zu bestätigen:</p>
      <a href="${url}" style="display:inline-block;margin:1rem 0;padding:.75rem 1.5rem;background:#06b6d4;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">
        E-Mail bestätigen
      </a>
      <p style="color:#666;font-size:.85rem">Der Link ist 24 Stunden gültig. Falls du dich nicht registriert hast, ignoriere diese E-Mail.</p>
    </div>`;
}

export function passwordResetHtml(url: string) {
  return `
    <div style="font-family:'Barlow',sans-serif;max-width:560px;margin:0 auto;background:#0a0a0b;padding:2rem;border:1px solid rgba(200,151,58,0.2)">
      <h2 style="color:#c8973a;font-family:'Cormorant Garamond',serif;font-weight:300;margin-bottom:1rem">Passwort zurücksetzen</h2>
      <p style="color:#e8e4de;font-size:.9rem;line-height:1.6">Du hast eine Anfrage zum Zurücksetzen deines Passworts bei Ehren-Deal gestellt. Klicke auf den Button, um ein neues Passwort zu vergeben:</p>
      <a href="${url}" style="display:inline-block;margin:1.5rem 0;padding:.75rem 2rem;background:#c8973a;color:#0a0a0b;text-decoration:none;font-weight:600;font-size:.85rem;letter-spacing:.05em;text-transform:uppercase">
        Neues Passwort vergeben
      </a>
      <p style="color:#e8e4de99;font-size:.8rem;line-height:1.5">Der Link ist <strong style="color:#c8973a">1 Stunde</strong> gültig. Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail – dein Passwort bleibt unverändert.</p>
      <hr style="border:none;height:1px;background:linear-gradient(90deg,transparent,#c8973a40,transparent);margin:1.5rem 0"/>
      <p style="color:#e8e4de50;font-size:.7rem;text-align:center">Ehren-Deal – Sicher handeln mit Ehre</p>
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
