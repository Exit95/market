/**
 * src/lib/service-notifications.ts
 * E-Mail-Templates für Leistungstausch-Benachrichtigungen.
 */
import { sendMail } from './mailer';

const TEAL = '#0D9488';
const NAVY = '#1A2332';

function wrapTemplate(content: string): string {
  return `
    <div style="font-family:'Inter',system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;background:#F8FAFB;padding:0">
      <div style="background:${NAVY};padding:24px 32px;text-align:center">
        <span style="color:#FFFFFF;font-size:20px;font-weight:600;letter-spacing:-0.02em">Ehren-Deal</span>
        <span style="color:${TEAL};font-size:12px;font-weight:500;margin-left:8px;padding:2px 8px;background:rgba(13,148,136,0.2);border-radius:10px">Leistungstausch</span>
      </div>
      <div style="background:#FFFFFF;padding:32px;border:1px solid #E5E7EB;border-top:none">
        ${content}
      </div>
      <div style="padding:16px 32px;text-align:center">
        <p style="color:#94A3B8;font-size:12px;margin:0">Ehren-Deal — Leistung gegen Leistung</p>
      </div>
    </div>`;
}

function ctaButton(url: string, text: string): string {
  return `<a href="${url}" style="display:inline-block;margin:8px 0 20px;padding:12px 28px;background:${TEAL};color:#FFFFFF;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${text}</a>`;
}

export async function sendProposalReceivedEmail(opts: {
  to: string;
  proposerName: string;
  listingTitle: string;
  offeredDescription: string;
  proposalUrl: string;
}) {
  const html = wrapTemplate(`
    <h2 style="color:${NAVY};font-size:20px;margin:0 0 12px">Neuer Vorschlag erhalten</h2>
    <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 16px">
      <strong>${opts.proposerName}</strong> hat einen Vorschlag für dein Angebot <strong>"${opts.listingTitle}"</strong> gesendet.
    </p>
    <div style="background:#F0FDFA;border:1px solid #99F6E4;border-radius:8px;padding:16px;margin:0 0 20px">
      <p style="color:${NAVY};font-size:14px;margin:0 0 4px;font-weight:600">Angebotene Leistung:</p>
      <p style="color:#64748B;font-size:13px;margin:0;line-height:1.5">${opts.offeredDescription.slice(0, 200)}${opts.offeredDescription.length > 200 ? '...' : ''}</p>
    </div>
    ${ctaButton(opts.proposalUrl, 'Vorschlag ansehen')}
    <p style="color:#94A3B8;font-size:13px;line-height:1.5">Du kannst den Vorschlag annehmen, ablehnen oder einen Gegenvorschlag senden.</p>
  `);
  return sendMail({ to: opts.to, subject: `Neuer Vorschlag für "${opts.listingTitle}"`, html });
}

export async function sendProposalAcceptedEmail(opts: {
  to: string;
  otherName: string;
  listingTitle: string;
  dealUrl: string;
}) {
  const html = wrapTemplate(`
    <h2 style="color:${NAVY};font-size:20px;margin:0 0 12px">Vorschlag angenommen — Deal steht!</h2>
    <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 20px">
      Dein Vorschlag für <strong>"${opts.listingTitle}"</strong> wurde von <strong>${opts.otherName}</strong> angenommen. Der Deal ist jetzt aktiv.
    </p>
    ${ctaButton(opts.dealUrl, 'Deal ansehen')}
    <p style="color:#94A3B8;font-size:13px;line-height:1.5">Ihr könnt jetzt im Chat die Details klären und eure Leistungen erbringen.</p>
  `);
  return sendMail({ to: opts.to, subject: `Deal steht: "${opts.listingTitle}"`, html });
}

export async function sendCounterProposalEmail(opts: {
  to: string;
  proposerName: string;
  listingTitle: string;
  proposalUrl: string;
}) {
  const html = wrapTemplate(`
    <h2 style="color:${NAVY};font-size:20px;margin:0 0 12px">Gegenvorschlag erhalten</h2>
    <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 20px">
      <strong>${opts.proposerName}</strong> hat einen Gegenvorschlag für <strong>"${opts.listingTitle}"</strong> gesendet.
    </p>
    ${ctaButton(opts.proposalUrl, 'Gegenvorschlag ansehen')}
    <p style="color:#94A3B8;font-size:13px;line-height:1.5">Du kannst annehmen, ablehnen oder erneut kontern (max. 5 Runden).</p>
  `);
  return sendMail({ to: opts.to, subject: `Gegenvorschlag für "${opts.listingTitle}"`, html });
}
