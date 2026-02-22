/**
 * src/lib/message-filter.ts
 * Content filter for chat messages
 */

interface FilterResult {
    blocked: boolean;
    reason?: string;
}

// Patterns that are blocked
const PATTERNS: Array<{ re: RegExp; reason: string }> = [
    {
        re: /whatsapp/i,
        reason: 'WhatsApp-Links oder -Erwähnungen sind nicht erlaubt.',
    },
    {
        re: /https?:\/\/[^\s]+/i,
        reason: 'Externe Links sind im Chat nicht erlaubt.',
    },
    {
        // German/international phone number patterns
        // +49..., 0049..., 015x, 016x, 017x, 030..., etc.
        re: /(\+?\d[\d\s\-\/()]{7,}\d)/,
        reason: 'Telefonnummern dürfen nicht im Chat geteilt werden.',
    },
    {
        // Obfuscated phone: "null null 30 12345", "o1o", "zero one"
        re: /\b(zero|null|eins?|two|zwei|drei|four|vier|five|fünf|six|sechs|seven|sieben|eight|acht|nine|neun)\b.{0,5}\b(zero|null|eins?|two|zwei|drei|vier|fünf|sechs|sieben|acht|neun)\b/i,
        reason: 'Verschleierte Telefonnummern sind nicht erlaubt.',
    },
    {
        // Telegram handles or similar off-platform contact attempts
        re: /@[\w]{3,}\s*(telegram|signal|wickr|threema)/i,
        reason: 'Weiterleitungen zu anderen Plattformen sind nicht erlaubt.',
    },
];

export function filterMessage(body: string): FilterResult {
    for (const { re, reason } of PATTERNS) {
        if (re.test(body)) return { blocked: true, reason };
    }
    return { blocked: false };
}
