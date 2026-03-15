/**
 * src/lib/ai-fraud-scanner.ts
 * KI-gestützte Betrugserkennung für Ehren-Deal
 *
 * Drei Kernbereiche:
 *  1. Anzeigenprüfung (Titel, Beschreibung, Preis)
 *  2. Chat-Nachrichtenanalyse (erweiterte Scam-Erkennung)
 *  3. Preis-Anomalieerkennung (Vergleich mit Kategorie-Durchschnitt)
 *
 * Architektur: Regelbasierte Heuristiken + Score-System.
 * Optional erweiterbar um externe AI-APIs (OpenAI, HuggingFace).
 */
import { prisma } from './auth';

// ── Scam-Keywords für Anzeigentitel & -beschreibung ─────────────────────────

const TITLE_SCAM_PATTERNS: Array<{ re: RegExp; flag: string; weight: number }> = [
    { re: /gratis|kostenlos|geschenkt|umsonst/i, flag: 'FREE_ITEM_BAIT', weight: 0.3 },
    { re: /nur\s+heute|letzte\s+chance|sofort\s+zuschlagen|dringend/i, flag: 'URGENCY_PRESSURE', weight: 0.25 },
    { re: /original\s*verpackt.*\d+%\s*rabatt|rabatt.*original/i, flag: 'FAKE_DISCOUNT', weight: 0.4 },
    { re: /iphone|macbook|playstation|rolex|gucci|louis\s*vuitton|prada|chanel/i, flag: 'HIGH_VALUE_BRAND', weight: 0.15 },
    { re: /replica|nachbau|1:1|aaa\+|mirror\s*quality/i, flag: 'COUNTERFEIT_INDICATOR', weight: 0.8 },
    { re: /western\s*union|moneygram|geldgram|vorkasse|vorab.*überweisen/i, flag: 'SCAM_PAYMENT_METHOD', weight: 0.7 },
    { re: /whatsapp|wa\.me|telegram|t\.me|signal\s*app/i, flag: 'OFF_PLATFORM_CONTACT', weight: 0.5 },
    { re: /steam\s*card|gift\s*card|paysafe|crypto.*zahlung|bitcoin.*zahlung/i, flag: 'UNTRACEABLE_PAYMENT', weight: 0.6 },
];

const DESCRIPTION_SCAM_PATTERNS: Array<{ re: RegExp; flag: string; weight: number }> = [
    { re: /nur\s*per\s*(überweisung|vorkasse|paypal\s*friends|paypal\s*freunde)/i, flag: 'UNSAFE_PAYMENT_ONLY', weight: 0.5 },
    { re: /kontaktiere?\s*mich\s*(auf|per|über)\s*(whatsapp|telegram|signal|sms)/i, flag: 'OFF_PLATFORM_REDIRECT', weight: 0.6 },
    { re: /versand\s*aus\s*dem\s*ausland|china|hongkong|shenzhen/i, flag: 'FOREIGN_SHIPPING_SCAM', weight: 0.3 },
    { re: /keine\s*(rückgabe|garantie|gewährleistung|umtausch).*privat/i, flag: 'NO_RECOURSE_WARNING', weight: 0.15 },
    { re: /passwort|login\s*daten|zugangs?\s*daten|account\s*daten/i, flag: 'CREDENTIAL_HARVESTING', weight: 0.7 },
    { re: /kurier\s*(kommt|holt|bringt)|dhl\s*bote\s*kommt/i, flag: 'FAKE_COURIER_SCAM', weight: 0.5 },
    { re: /gewinn|lotterie|erbe|erbschaft|millionen?\s*(euro|dollar|usd)/i, flag: 'ADVANCE_FEE_SCAM', weight: 0.8 },
    { re: /safe-payment|sicher.*link|zahlungs?\s*link.*klick/i, flag: 'PHISHING_LINK_PATTERN', weight: 0.7 },
];

// ── Chat-Nachricht: Erweiterte KI-Muster ────────────────────────────────────

const CHAT_KI_PATTERNS: Array<{ re: RegExp; flag: string; weight: number }> = [
    { re: /ich\s*(bin|lebe|wohne)\s*(im|in)\s*ausland/i, flag: 'KI_ABROAD_CLAIM', weight: 0.3 },
    { re: /mein\s*(sohn|tochter|bruder|freund)\s*holt.*ab/i, flag: 'KI_THIRD_PARTY_PICKUP', weight: 0.25 },
    { re: /zahle?\s*(mehr|extra|drauf)|überzahl/i, flag: 'KI_OVERPAYMENT_SCAM', weight: 0.6 },
    { re: /kurier.*schick|spedition.*schick|dhl.*bote/i, flag: 'KI_FAKE_COURIER', weight: 0.5 },
    { re: /paypal\s*(freunde|friends|family)|freunde.*familie/i, flag: 'KI_UNSAFE_PAYPAL', weight: 0.5 },
    { re: /link.*klick|klick.*link|hier.*bezahl/i, flag: 'KI_PHISHING_LINK', weight: 0.6 },
    { re: /verifizier.*identität|bestätig.*konto|konto.*bestätig/i, flag: 'KI_IDENTITY_PHISHING', weight: 0.7 },
    { re: /crypto|bitcoin|ethereum|usdt|wallet.*adresse/i, flag: 'KI_CRYPTO_PAYMENT', weight: 0.5 },
    { re: /geschäftlich.*angebot|invest.*chance|rendite/i, flag: 'KI_INVESTMENT_SCAM', weight: 0.6 },
    { re: /nicht\s*über\s*(die\s*)?plattform|außerhalb.*plattform|privat.*handeln/i, flag: 'KI_OFF_PLATFORM_DEAL', weight: 0.7 },
];

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface FraudAnalysisResult {
    flagged: boolean;
    score: number;        // 0.0 – 1.0 (0 = clean, 1 = definite fraud)
    flags: string[];
    action: 'ALLOW' | 'REVIEW' | 'BLOCK';
    reason?: string;
}

export interface ChatScanKIResult {
    isSafe: boolean;
    score: number;
    flags: string[];
    warning?: string;
}

// ── Score-Schwellwerte ──────────────────────────────────────────────────────

const REVIEW_THRESHOLD = 0.4;   // Score >= 0.4 → Anzeige als DRAFT zur Review
const BLOCK_THRESHOLD = 0.8;    // Score >= 0.8 → Anzeige direkt ablehnen
const CHAT_WARN_THRESHOLD = 0.3;
const CHAT_BLOCK_THRESHOLD = 0.7;

// ── Hilfsfunktionen ─────────────────────────────────────────────────────────

/**
 * Preis-Anomalieerkennung: Vergleicht den Preis mit aktiven Angeboten
 * derselben Kategorie. Nutzt den Durchschnittspreis aus der Datenbank.
 */
async function detectPriceAnomaly(
    price: number,
    category: string,
): Promise<{ flag: string; weight: number } | null> {
    if (price <= 0) return null;

    const result = await prisma.listing.aggregate({
        where: { category: category as any, status: 'ACTIVE' },
        _avg: { price: true },
        _count: { price: true },
    });

    const avgPrice = result._avg.price;
    const count = result._count.price;

    if (!avgPrice || count < 3) return null;

    if (price < avgPrice * 0.3) {
        return { flag: 'PRICE_ANOMALY_SEVERE', weight: 0.5 };
    }
    if (price < avgPrice * 0.5) {
        return { flag: 'PRICE_ANOMALY_MODERATE', weight: 0.3 };
    }

    return null;
}

// ── Hauptfunktionen ─────────────────────────────────────────────────────────

/**
 * Analysiert eine Anzeige auf Betrugsmuster.
 * Kombiniert: Titel-Scan + Beschreibungs-Scan + Preis-Anomalie (DB-basiert)
 */
export async function analyzeListingContent(
    title: string,
    description: string,
    price: number,
    category: string,
): Promise<FraudAnalysisResult> {
    const flags: string[] = [];
    let totalWeight = 0;

    // 1) Titel-Scan
    for (const { re, flag, weight } of TITLE_SCAM_PATTERNS) {
        if (re.test(title)) {
            flags.push(flag);
            totalWeight += weight;
        }
    }

    // 2) Beschreibungs-Scan
    for (const { re, flag, weight } of DESCRIPTION_SCAM_PATTERNS) {
        if (re.test(description)) {
            flags.push(flag);
            totalWeight += weight;
        }
    }

    // 3) Preis-Anomalieerkennung (Vergleich mit DB-Durchschnitt)
    try {
        const priceAnomaly = await detectPriceAnomaly(price, category);
        if (priceAnomaly) {
            flags.push(priceAnomaly.flag);
            totalWeight += priceAnomaly.weight;
        }
    } catch {
        // DB-Fehler sollte Listing-Erstellung nicht blockieren
    }

    // 4) Kombinations-Bonus: Mehrere Flags = überproportional verdächtig
    if (flags.length >= 3) totalWeight += 0.2;
    if (flags.length >= 5) totalWeight += 0.3;

    const score = Math.min(1, totalWeight);
    let action: FraudAnalysisResult['action'] = 'ALLOW';
    let reason: string | undefined;

    if (score >= BLOCK_THRESHOLD) {
        action = 'BLOCK';
        reason = 'Anzeige enthält mehrere starke Betrugsmerkmale und wurde blockiert.';
    } else if (score >= REVIEW_THRESHOLD) {
        action = 'REVIEW';
        reason = 'Anzeige wurde zur Sicherheitsprüfung zurückgehalten.';
    }

    return { flagged: score >= REVIEW_THRESHOLD, score, flags, action, reason };
}

/**
 * Erweiterte KI-Analyse für Chat-Nachrichten.
 * Ergänzt die bestehenden regelbasierten Filter in security.ts und message-filter.ts.
 */
export function scanChatMessageKI(message: string): ChatScanKIResult {
    const flags: string[] = [];
    let totalWeight = 0;

    for (const { re, flag, weight } of CHAT_KI_PATTERNS) {
        if (re.test(message)) {
            flags.push(flag);
            totalWeight += weight;
        }
    }

    // Kombinations-Bonus
    if (flags.length >= 2) totalWeight += 0.15;
    if (flags.length >= 4) totalWeight += 0.25;

    const score = Math.min(1, totalWeight);
    let warning: string | undefined;

    if (score >= CHAT_BLOCK_THRESHOLD) {
        warning = 'Nachricht aufgrund verdächtiger Inhalte geblockt (Sicherheitsrichtlinie).';
    } else if (score >= CHAT_WARN_THRESHOLD) {
        warning = 'Mögliche betrügerische Inhalte erkannt. Bitte bleibe für deine Sicherheit auf der Plattform.';
    }

    return {
        isSafe: score < CHAT_BLOCK_THRESHOLD,
        score,
        flags,
        warning,
    };
}

/**
 * Leichtgewichtige Echtzeit-Prüfung für Client-Side Debouncing.
 * Nur regelbasiert (keine DB-Calls), für schnelle Antworten.
 */
export function detectMessageRealtime(text: string): { isSafe: boolean; flags: string[]; warning?: string } {
    if (!text || text.length < 3) return { isSafe: true, flags: [] };

    const flags: string[] = [];

    // Schnelle Regex-Prüfung mit den KI-Patterns
    for (const { re, flag } of CHAT_KI_PATTERNS) {
        if (re.test(text)) flags.push(flag);
    }

    // Auch die Listing-Scam-Keywords prüfen (Off-Platform, Payment)
    for (const { re, flag } of TITLE_SCAM_PATTERNS) {
        if ((flag.includes('PAYMENT') || flag.includes('PLATFORM')) && re.test(text)) {
            if (!flags.includes(flag)) flags.push(flag);
        }
    }

    const warning = flags.length > 0
        ? 'Achtung: Deine Nachricht enthält Inhalte, die auf einen möglichen Betrugsversuch hinweisen. Bitte bleibe für die sichere Abwicklung auf der Plattform.'
        : undefined;

    return { isSafe: flags.length === 0, flags, warning };
}

