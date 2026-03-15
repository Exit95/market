/**
 * Ehren-Deal Security Utilities
 * Core Logic for Scam Prevention, Identity Verification & Trust Scoring
 */

// Basic Trust Score constants
const BASE_TRUST_SCORE = 10;
const MAX_TRUST_SCORE = 100;
const VERIFIED_ID_BONUS = 50;

/**
 * Calculates current trust score based on user verification status
 */
export function calculateTrustScore(user: { idVerified: boolean; fraudSignals?: number }) {
    let score = BASE_TRUST_SCORE;
    
    if (user.idVerified) {
        score += VERIFIED_ID_BONUS;
    }

    if (user.fraudSignals && user.fraudSignals > 0) {
        score -= user.fraudSignals * 20; // Heavy penalty for fraud signals
    }

    return Math.max(0, Math.min(score, MAX_TRUST_SCORE));
}

/**
 * Regex to detect common phishing patterns and off-platform movement (e.g., WhatsApp, Telegram)
 */
const SCAM_REGEX = {
    whatsapp: /(?:whatsapp|wa\.me|01[5-7]\d\s*\d{2,4}\s*\d{2,4}\s*\d{2,4})/i,
    telegram: /(?:telegram|t\.me|tele)/i,
    email: /[a-zA-Z0-9._%+-]+(?:\s*@\s*|\s*\[at\]\s*|\s*\(at\)\s*)[a-zA-Z0-9.-]+(?:\s*\.\s*|\s*dot\s*)[a-zA-Z]{2,}/i,
    phishingLinks: /(?:paypal\.me|bit\.ly|tinyurl\.com|goo\.gl|shippo|safe-payment)/i,
    nigeriaConnection: /(?:steam card|gift card|kurier|dhl bote|western union|geldgram|westernunion)/i
};

export interface ChatScanResult {
    isSafe: boolean;
    flags: string[];
}

/**
 * Scans a chat message for potential scam patterns
 */
export function scanChatMessage(message: string): ChatScanResult {
    const flags: string[] = [];
    
    if (SCAM_REGEX.whatsapp.test(message)) flags.push("OFF_PLATFORM_WHATSAPP");
    if (SCAM_REGEX.telegram.test(message)) flags.push("OFF_PLATFORM_TELEGRAM");
    if (SCAM_REGEX.email.test(message)) flags.push("EXTERNAL_EMAIL");
    if (SCAM_REGEX.phishingLinks.test(message)) flags.push("SUSPICIOUS_LINK");
    if (SCAM_REGEX.nigeriaConnection.test(message)) flags.push("KNOWN_SCAM_KEYWORD");

    return {
        isSafe: flags.length === 0,
        flags
    };
}

/**
 * Determines if a user meets the threshold to post high-risk items (e.g., Rolex, Cars)
 */
export function canPostHighRiskItem(user: { idVerified: boolean; fraudSignals?: number }) {
    const score = calculateTrustScore(user);
    // Requires verified ID and a minimum trust threshold without active fraud signals
    return user.idVerified && score >= 60 && (!user.fraudSignals || user.fraudSignals === 0);
}

/**
 * High-Risk categories on Ehren-Deal
 */
export const HIGH_RISK_CATEGORIES = [
    "UHREN", "AUTOS", "SMARTPHONES", "SCHMUCK", "DESIGNER"
];

/**
 * Rate limiter utility map (In-memory for now. Use Redis in production)
 */
const rateLimits = new Map<string, { count: number, resetAt: number }>();

export function checkRateLimit(ipOrUserId: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const record = rateLimits.get(ipOrUserId);

    if (!record || now > record.resetAt) {
        rateLimits.set(ipOrUserId, { count: 1, resetAt: now + windowMs });
        return true;
    }

    if (record.count >= limit) {
        return false;
    }

    record.count++;
    return true;
}
