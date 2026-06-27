/**
 * DEPRECATED — Mangopay wurde durch Stripe ersetzt.
 * Diese Datei existiert nur als Stub um Build-Fehler zu vermeiden.
 * Alle Payment-Logik nutzt jetzt /lib/stripe.ts
 */

export function calculateFee(_amountCents: number): number {
    throw new Error('Mangopay ist deprecated. Nutze stripe.ts für Gebührenberechnung.');
}

export function eurosToCents(euros: number): number {
    return Math.round(euros * 100);
}
