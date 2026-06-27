/**
 * src/lib/mailer.ts
 * Nodemailer wrapper for transactional emails.
 */
import nodemailer from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } from './env';

function getTransport() {
  return nodemailer.createTransport({
    host: SMTP_HOST(),
    port: SMTP_PORT(),
    secure: SMTP_SECURE(),
    auth: {
      user: SMTP_USER(),
      pass: SMTP_PASS(),
    },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

export async function sendMail(opts: { to: string; subject: string; html: string }) {
  const transport = getTransport();
  return transport.sendMail({
    from: SMTP_FROM(),
    ...opts,
  });
}

export function emailVerifyHtml(url: string) {
  return `
    <div style="font-family:'Inter',system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;background:#F8FAFB;padding:0">
      <div style="background:#1A2332;padding:24px 32px;text-align:center">
        <span style="color:#FFFFFF;font-size:20px;font-weight:600;letter-spacing:-0.02em">Ehren-Deal</span>
      </div>
      <div style="background:#FFFFFF;padding:32px;border:1px solid #E5E7EB;border-top:none">
        <h2 style="color:#1A2332;font-size:20px;margin:0 0 12px">E-Mail bestätigen</h2>
        <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 20px">Klicke auf den Button, um deine E-Mail-Adresse bei Ehren-Deal zu bestätigen:</p>
        <a href="${url}" style="display:inline-block;margin:8px 0 20px;padding:12px 28px;background:#1B65A6;color:#FFFFFF;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
          E-Mail bestätigen
        </a>
        <p style="color:#94A3B8;font-size:13px;line-height:1.5">Der Link ist 24 Stunden gültig. Falls du dich nicht registriert hast, ignoriere diese E-Mail.</p>
      </div>
      <div style="padding:16px 32px;text-align:center">
        <p style="color:#94A3B8;font-size:12px;margin:0">Ehren-Deal — Sicher handeln mit Vertrauen</p>
      </div>
    </div>`;
}

export function passwordResetHtml(url: string) {
  return `
    <div style="font-family:'Inter',system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;background:#F8FAFB;padding:0">
      <div style="background:#1A2332;padding:24px 32px;text-align:center">
        <span style="color:#FFFFFF;font-size:20px;font-weight:600;letter-spacing:-0.02em">Ehren-Deal</span>
      </div>
      <div style="background:#FFFFFF;padding:32px;border:1px solid #E5E7EB;border-top:none">
        <h2 style="color:#1A2332;font-size:20px;margin:0 0 12px">Passwort zurücksetzen</h2>
        <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 20px">Du hast eine Anfrage zum Zurücksetzen deines Passworts bei Ehren-Deal gestellt. Klicke auf den Button, um ein neues Passwort zu vergeben:</p>
        <a href="${url}" style="display:inline-block;margin:8px 0 20px;padding:12px 28px;background:#1B65A6;color:#FFFFFF;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
          Neues Passwort vergeben
        </a>
        <p style="color:#94A3B8;font-size:13px;line-height:1.5">Der Link ist <strong style="color:#1A2332">1 Stunde</strong> gültig. Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail — dein Passwort bleibt unverändert.</p>
      </div>
      <div style="padding:16px 32px;text-align:center">
        <p style="color:#94A3B8;font-size:12px;margin:0">Ehren-Deal — Sicher handeln mit Vertrauen</p>
      </div>
    </div>`;
}
