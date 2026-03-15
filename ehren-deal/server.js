import express from 'express';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: false }));

/** HTML-escape to prevent injection in mail body */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Statische HTML-Seite ausliefern
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// E-Mail-Anmeldung verarbeiten
app.post('/signup', async (req, res) => {
  const email = (req.body.email || '').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.redirect('/?error=1');
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  const safeEmail = escapeHtml(email);

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'Ehren-Deal <office@ehren-deal.de>',
      to: process.env.NOTIFY_EMAIL,
      subject: 'Neue Anmeldung auf ehren-deal.de',
      html: `
        <h2 style="color:#1a3a1a;">Neue Anmeldung auf ehren-deal.de!</h2>
        <p><strong>E-Mail:</strong> ${safeEmail}</p>
        <p style="color:#888;">Eingetragen am ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</p>
      `,
    });
    console.log(`[signup] Mail gesendet für: ${safeEmail}`);
  } catch (err) {
    console.error('[signup] Mailfehler:', err.message);
  }

  res.redirect('/?success=1');
});

app.listen(PORT, () => console.log(`Server läuft auf :${PORT}`));

