import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'localhost';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const MAIL_FROM = process.env.MAIL_FROM || 'noreply@ehren-deal.de';
const APP_URL = process.env.APP_URL || 'https://ehren-deal.de';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  tls: { rejectUnauthorized: false },
});

export async function sendMail(to: string, subject: string, html: string) {
  try {
    await transporter.sendMail({
      from: `"Ehren-Deal" <${MAIL_FROM}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('E-Mail-Versand fehlgeschlagen:', error);
    return false;
  }
}

export async function sendPasswordResetMail(to: string, token: string) {
  const resetLink = `${APP_URL}/reset-password?token=${token}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; width: 48px; height: 48px; border-radius: 24px; background: #2563EB; color: #fff; font-size: 20px; font-weight: 700; line-height: 48px;">ED</div>
        <h1 style="font-size: 22px; color: #171717; margin: 12px 0 0;">Passwort zuruecksetzen</h1>
      </div>
      <p style="font-size: 15px; color: #525252; line-height: 24px;">
        Du hast angefordert, dein Passwort zurueckzusetzen. Klicke auf den Button, um ein neues Passwort zu vergeben.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetLink}" style="display: inline-block; background: #2563EB; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 10px; font-size: 15px; font-weight: 600;">
          Passwort zuruecksetzen
        </a>
      </div>
      <p style="font-size: 13px; color: #A3A3A3; line-height: 20px;">
        Dieser Link ist 1 Stunde gueltig. Falls du kein neues Passwort angefordert hast, ignoriere diese E-Mail.
      </p>
      <hr style="border: none; border-top: 1px solid #E5E5E5; margin: 24px 0;" />
      <p style="font-size: 12px; color: #A3A3A3; text-align: center;">Ehren-Deal - Der faire Marktplatz</p>
    </div>
  `;
  return sendMail(to, 'Passwort zuruecksetzen - Ehren-Deal', html);
}

export async function sendVerificationMail(to: string, token: string) {
  const verifyLink = `${APP_URL}/verify-email?token=${token}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; width: 48px; height: 48px; border-radius: 24px; background: #2563EB; color: #fff; font-size: 20px; font-weight: 700; line-height: 48px;">ED</div>
        <h1 style="font-size: 22px; color: #171717; margin: 12px 0 0;">E-Mail bestaetigen</h1>
      </div>
      <p style="font-size: 15px; color: #525252; line-height: 24px;">
        Willkommen bei Ehren-Deal! Bitte bestaetige deine E-Mail-Adresse, um alle Funktionen nutzen zu koennen.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${verifyLink}" style="display: inline-block; background: #2563EB; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 10px; font-size: 15px; font-weight: 600;">
          E-Mail bestaetigen
        </a>
      </div>
      <p style="font-size: 13px; color: #A3A3A3; line-height: 20px;">
        Dieser Link ist 24 Stunden gueltig.
      </p>
      <hr style="border: none; border-top: 1px solid #E5E5E5; margin: 24px 0;" />
      <p style="font-size: 12px; color: #A3A3A3; text-align: center;">Ehren-Deal - Der faire Marktplatz</p>
    </div>
  `;
  return sendMail(to, 'E-Mail bestaetigen - Ehren-Deal', verifyLink);
}
