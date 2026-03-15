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

/** Platform fee: 2.4% */
export const FEE_RATE = 0.024;
export function calcFee(amountCents: number) {
    return Math.round(amountCents * FEE_RATE);
}
