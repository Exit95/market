/**
 * src/lib/stripe.ts
 */
import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
    if (!_stripe) {
        _stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
            apiVersion: '2025-01-27.acacia',
        });
    }
    return _stripe;
}

/**
 * Ehren-Deal Gebührenmodell (aufgeteilt):
 * - Käufer zahlt: Artikelpreis + 0,50 € Servicegebühr
 * - Verkäufer erhält: Artikelpreis − 5 % Verkaufsprovision
 * - Plattform verdient: 0,50 € + 5 % pro Transaktion
 */

/** Feste Servicegebühr für Käufer in Cent (0,50 €) */
export const BUYER_FEE_CENTS = 50;

/** Verkäufer-Provision als Dezimalwert (5 %) */
export const SELLER_COMMISSION_RATE = 0.05;

/** Berechne die Käufer-Servicegebühr (fest: 0,50 €) */
export function calcBuyerFee(): number {
    return BUYER_FEE_CENTS;
}

/** Berechne die Verkäufer-Provision (5 % vom Artikelpreis) */
export function calcSellerCommission(priceCents: number): number {
    return Math.round(priceCents * SELLER_COMMISSION_RATE);
}

/** Gesamtbetrag den der Käufer zahlt (Artikelpreis + 0,50 € Servicegebühr) */
export function calcBuyerTotal(priceCents: number): number {
    return priceCents + BUYER_FEE_CENTS;
}

/** Netto-Auszahlung an den Verkäufer (Artikelpreis − 5 % Provision) */
export function calcSellerPayout(priceCents: number): number {
    return priceCents - calcSellerCommission(priceCents);
}

/** @deprecated – Alte API, nutze calcBuyerFee() oder calcSellerCommission() */
export function calcFee(amountCents: number) {
    return calcBuyerFee();
}
