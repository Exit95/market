/**
 * Mangopay Integration – Treuhandkonto / Escrow
 * Docs: https://docs.mangopay.com/api-reference
 *
 * Transaction Flow:
 * 1. Buyer creates PayIn → money lands in Buyer's Mangopay wallet
 * 2. Transfer: Buyer wallet → Platform escrow wallet (held while order is open)
 * 3. Buyer confirms receipt → Transfer: Escrow wallet → Seller wallet
 * 4. Seller requests Payout → money goes to their IBAN
 */

import Mangopay from 'mangopay2-nodejs-sdk';

const mangopay = new Mangopay({
    clientId: import.meta.env.MANGOPAY_CLIENT_ID,
    clientApiKey: import.meta.env.MANGOPAY_API_KEY,
    baseUrl: import.meta.env.MANGOPAY_BASE_URL || 'https://api.sandbox.mangopay.com',
});

export { mangopay };

// ─── Users ────────────────────────────────────────────────────────────────────

export async function createMangopayUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    birthday: number; // Unix timestamp
    nationality: string; // 'DE'
    countryOfResidence: string; // 'DE'
}) {
    return mangopay.Users.create({
        PersonType: 'NATURAL',
        FirstName: data.firstName,
        LastName: data.lastName,
        Email: data.email,
        Birthday: data.birthday,
        Nationality: data.nationality,
        CountryOfResidence: data.countryOfResidence,
    } as Mangopay.user.CreateNaturalUser);
}

// ─── Wallets ──────────────────────────────────────────────────────────────────

export async function createWallet(userId: string, description = 'Novamarkt Wallet') {
    return mangopay.Wallets.create({
        Owners: [userId],
        Description: description,
        Currency: 'EUR',
    });
}

export async function getWalletBalance(walletId: string) {
    const wallet = await mangopay.Wallets.get(walletId);
    return wallet.Balance; // { Currency: 'EUR', Amount: <cents> }
}

// ─── PayIn (Buyer pays) ───────────────────────────────────────────────────────

/**
 * Create a card PayIn — buyer pays into their Mangopay wallet
 * Returns the RedirectURL to send the buyer to for 3DS
 */
export async function createCardPayIn(data: {
    buyerMangopayId: string;
    walletId: string;
    amountCents: number; // e.g. 94900 for 949.00€
    feeCents: number;    // Novamarkt platform fee
    returnUrl: string;   // after 3DS redirect
    listingTitle: string;
}) {
    return mangopay.PayIns.create({
        AuthorId: data.buyerMangopayId,
        CreditedWalletId: data.walletId,
        DebitedFunds: { Currency: 'EUR', Amount: data.amountCents },
        Fees: { Currency: 'EUR', Amount: data.feeCents },
        ReturnURL: data.returnUrl,
        CardType: 'CB_VISA_MASTERCARD',
        ExecutionType: 'WEB',
        PaymentType: 'CARD',
        StatementDescriptor: 'SECUREMARKT',
        Tag: data.listingTitle,
    } as unknown as Mangopay.payIn.CreateCardWebPayIn);
}

// ─── Transfer (Escrow hold / Release) ─────────────────────────────────────────

/**
 * Transfer funds between wallets (e.g. buyer → escrow, escrow → seller)
 */
export async function createTransfer(data: {
    authorId: string;
    debitedWalletId: string;
    creditedWalletId: string;
    amountCents: number;
    feeCents?: number;
    tag?: string;
}) {
    return mangopay.Transfers.create({
        AuthorId: data.authorId,
        DebitedWalletId: data.debitedWalletId,
        CreditedWalletId: data.creditedWalletId,
        DebitedFunds: { Currency: 'EUR', Amount: data.amountCents },
        Fees: { Currency: 'EUR', Amount: data.feeCents ?? 0 },
        Tag: data.tag ?? 'Novamarkt transfer',
    });
}

// ─── Payout (Seller withdraws) ────────────────────────────────────────────────

/**
 * Register a bank account (IBAN) for a user
 */
export async function createBankAccount(userId: string, iban: string, ownerName: string) {
    return mangopay.Users.createBankAccount(userId, {
        Type: 'IBAN',
        OwnerName: ownerName,
        OwnerAddress: { Country: 'DE' } as Mangopay.address.CreateAddress,
        IBAN: iban,
        BIC: 'XXXXXXXX',
    } as Mangopay.bankAccount.IBANDetails);
}

/**
 * Payout: send funds from wallet to IBAN
 */
export async function createPayout(data: {
    authorId: string;
    walletId: string;
    bankAccountId: string;
    amountCents: number;
    tag?: string;
}) {
    return mangopay.PayOuts.create({
        AuthorId: data.authorId,
        DebitedWalletId: data.walletId,
        DebitedFunds: { Currency: 'EUR', Amount: data.amountCents },
        Fees: { Currency: 'EUR', Amount: 0 },
        BankAccountId: data.bankAccountId,
        PaymentType: 'BANK_WIRE',
        Tag: data.tag ?? 'Novamarkt payout',
    } as Mangopay.payOut.CreatePayOut);
}

// ─── Refund ───────────────────────────────────────────────────────────────────

/**
 * Refund a PayIn (e.g. if buyer reports a problem)
 */
export async function refundPayIn(payInId: string, authorId: string) {
    return mangopay.PayIns.createRefund(payInId, {
        AuthorId: authorId,
    } as Mangopay.refund.CreatePayInRefund);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Berechne Novamarkt-Gebühr: 2.4% des Kaufpreises */
export function calculateFee(amountCents: number): number {
    return Math.round(amountCents * 0.024);
}

/** Konvertiere Euro-Betrag zu Cent (Mangopay arbeitet immer in Cent) */
export function eurosToCents(euros: number): number {
    return Math.round(euros * 100);
}
