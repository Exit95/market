/**
 * src/lib/notifications.ts
 * Transactional E-Mail-Benachrichtigungen für Deal- und Payment-Events.
 *
 * Design: Trust-first Theme (Navy + Trust Blue + Safe Green)
 * Tonalität: Du-Form, klar, direkt, Sicherheit betonen (Vault: Markenidentität)
 */
import { sendMail } from './mailer';

// ─── Shared Template ─────────────────────────────────────────────────────────

function emailWrapper(content: string): string {
    return `
    <div style="font-family:'Inter',system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;background:#F8FAFB;padding:0">
        <div style="background:#1A2332;padding:24px 32px;text-align:center">
            <span style="color:#FFFFFF;font-size:20px;font-weight:600;letter-spacing:-0.02em">Ehren-Deal</span>
        </div>
        <div style="background:#FFFFFF;padding:32px;border:1px solid #E5E7EB;border-top:none">
            ${content}
        </div>
        <div style="padding:16px 32px;text-align:center">
            <p style="color:#94A3B8;font-size:12px;margin:0">Ehren-Deal — Sicher handeln mit Vertrauen</p>
            <p style="color:#94A3B8;font-size:11px;margin:4px 0 0"><a href="https://ehren-deal.de" style="color:#1B65A6;text-decoration:none">ehren-deal.de</a></p>
        </div>
    </div>`;
}

function cta(url: string, label: string): string {
    return `<a href="${url}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#1B65A6;color:#FFFFFF;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${label}</a>`;
}

function trustHint(text: string): string {
    return `<div style="background:#E8F5E9;border-left:3px solid #22A06B;padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0">
        <p style="color:#1A2332;font-size:13px;margin:0">&#x1f6e1;&#xfe0f; ${text}</p>
    </div>`;
}

// ─── Payment Notifications ───────────────────────────────────────────────────

/** Käufer: Zahlung erfolgreich eingegangen */
export async function notifyPaymentSucceeded(data: {
    buyerEmail: string;
    buyerName: string;
    listingTitle: string;
    amountEuros: string;
    dealId: string;
}) {
    const dealUrl = `https://ehren-deal.de/deals/${data.dealId}`;
    return sendMail({
        to: data.buyerEmail,
        subject: `Zahlung bestätigt — ${data.listingTitle}`,
        html: emailWrapper(`
            <h2 style="color:#1A2332;font-size:20px;margin:0 0 8px">Zahlung erfolgreich</h2>
            <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 16px">
                Hallo ${data.buyerName}, deine Zahlung über <strong style="color:#1A2332">${data.amountEuros} €</strong>
                für <strong style="color:#1A2332">${data.listingTitle}</strong> ist eingegangen.
            </p>
            ${trustHint('Dein Geld liegt sicher im Treuhand-Konto, bis du den Erhalt bestätigst.')}
            <p style="color:#64748B;font-size:14px;line-height:1.6">
                Der Verkäufer wurde benachrichtigt und wird den Artikel versenden.
            </p>
            ${cta(dealUrl, 'Deal ansehen')}
        `),
    });
}

/** Verkäufer: Zahlung eingegangen, bitte versenden */
export async function notifySellerPaymentReceived(data: {
    sellerEmail: string;
    sellerName: string;
    listingTitle: string;
    amountEuros: string;
    dealId: string;
}) {
    const dealUrl = `https://ehren-deal.de/deals/${data.dealId}`;
    return sendMail({
        to: data.sellerEmail,
        subject: `Zahlung eingegangen — ${data.listingTitle}`,
        html: emailWrapper(`
            <h2 style="color:#1A2332;font-size:20px;margin:0 0 8px">Zahlung eingegangen</h2>
            <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 16px">
                Hallo ${data.sellerName}, die Zahlung für <strong style="color:#1A2332">${data.listingTitle}</strong>
                über <strong style="color:#1A2332">${data.amountEuros} €</strong> wurde bestätigt.
            </p>
            <p style="color:#64748B;font-size:14px;line-height:1.6">
                Bitte versende den Artikel und markiere den Deal als versandt.
            </p>
            ${cta(dealUrl, 'Jetzt versenden')}
        `),
    });
}

/** Käufer: Zahlung fehlgeschlagen */
export async function notifyPaymentFailed(data: {
    buyerEmail: string;
    buyerName: string;
    listingTitle: string;
    dealId: string;
}) {
    const dealUrl = `https://ehren-deal.de/deals/${data.dealId}`;
    return sendMail({
        to: data.buyerEmail,
        subject: `Zahlung fehlgeschlagen — ${data.listingTitle}`,
        html: emailWrapper(`
            <h2 style="color:#1A2332;font-size:20px;margin:0 0 8px">Zahlung fehlgeschlagen</h2>
            <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 16px">
                Hallo ${data.buyerName}, deine Zahlung für <strong style="color:#1A2332">${data.listingTitle}</strong>
                konnte nicht verarbeitet werden.
            </p>
            <p style="color:#64748B;font-size:14px;line-height:1.6">
                Bitte versuche es erneut oder verwende eine andere Zahlungsmethode.
            </p>
            ${cta(dealUrl, 'Erneut bezahlen')}
        `),
    });
}

/** Verkäufer: Geld freigegeben (Escrow → Seller Wallet) */
export async function notifyFundsReleased(data: {
    sellerEmail: string;
    sellerName: string;
    listingTitle: string;
    amountEuros: string;
    dealId: string;
}) {
    const dealUrl = `https://ehren-deal.de/deals/${data.dealId}`;
    return sendMail({
        to: data.sellerEmail,
        subject: `Geld freigegeben — ${data.listingTitle}`,
        html: emailWrapper(`
            <h2 style="color:#1A2332;font-size:20px;margin:0 0 8px">Geld freigegeben</h2>
            <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 16px">
                Hallo ${data.sellerName}, der Käufer hat den Erhalt von
                <strong style="color:#1A2332">${data.listingTitle}</strong> bestätigt.
            </p>
            <p style="color:#22A06B;font-size:16px;font-weight:600;margin:16px 0">
                ${data.amountEuros} € wurden in dein Wallet freigegeben.
            </p>
            <p style="color:#64748B;font-size:14px;line-height:1.6">
                Du kannst den Betrag jetzt auf dein Bankkonto auszahlen lassen.
            </p>
            ${cta(dealUrl, 'Zum Dashboard')}
        `),
    });
}

/** Verkäufer: Auszahlung auf Bankkonto erfolgreich */
export async function notifyPayoutSucceeded(data: {
    sellerEmail: string;
    sellerName: string;
    amountEuros: string;
}) {
    return sendMail({
        to: data.sellerEmail,
        subject: `Auszahlung erfolgreich — ${data.amountEuros} €`,
        html: emailWrapper(`
            <h2 style="color:#1A2332;font-size:20px;margin:0 0 8px">Auszahlung erfolgreich</h2>
            <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 16px">
                Hallo ${data.sellerName}, deine Auszahlung über
                <strong style="color:#22A06B">${data.amountEuros} €</strong>
                wurde an dein Bankkonto überwiesen.
            </p>
            <p style="color:#64748B;font-size:13px">
                Die Gutschrift erfolgt in der Regel innerhalb von 1-3 Werktagen.
            </p>
        `),
    });
}

/** Verkäufer: Auszahlung fehlgeschlagen */
export async function notifyPayoutFailed(data: {
    sellerEmail: string;
    sellerName: string;
    amountEuros: string;
}) {
    return sendMail({
        to: data.sellerEmail,
        subject: `Auszahlung fehlgeschlagen — bitte Bankdaten prüfen`,
        html: emailWrapper(`
            <h2 style="color:#1A2332;font-size:20px;margin:0 0 8px">Auszahlung fehlgeschlagen</h2>
            <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 16px">
                Hallo ${data.sellerName}, die Auszahlung über
                <strong style="color:#1A2332">${data.amountEuros} €</strong>
                konnte nicht durchgeführt werden.
            </p>
            <p style="color:#64748B;font-size:14px;line-height:1.6">
                Bitte überprüfe deine Bankdaten in deinen Einstellungen.
            </p>
            ${cta('https://ehren-deal.de/einstellungen', 'Bankdaten prüfen')}
        `),
    });
}

/** Admin: Payout fehlgeschlagen — manuelle Prüfung erforderlich */
export async function notifyAdminPayoutFailed(data: {
    resourceId: string;
    sellerEmail: string;
    amountEuros: string;
}) {
    const adminEmail = process.env.SMTP_FROM || import.meta.env.SMTP_FROM || 'admin@ehren-deal.de';
    return sendMail({
        to: adminEmail,
        subject: `[ADMIN] Payout fehlgeschlagen: ${data.resourceId}`,
        html: emailWrapper(`
            <h2 style="color:#DC2626;font-size:20px;margin:0 0 8px">Payout fehlgeschlagen</h2>
            <p style="color:#64748B;font-size:14px;line-height:1.6">
                <strong>Resource ID:</strong> ${data.resourceId}<br>
                <strong>Verkäufer:</strong> ${data.sellerEmail}<br>
                <strong>Betrag:</strong> ${data.amountEuros} €
            </p>
            <p style="color:#64748B;font-size:14px;line-height:1.6">
                Bitte im Stripe Dashboard prüfen und ggf. manuell auslösen.
            </p>
        `),
    });
}
