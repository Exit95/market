/**
 * IDnow KYC Integration
 * API Docs: https://www.idnow.io/developers/api-reference/
 *
 * Flow:
 * 1. POST /api/kyc/start → createIdent() → returns identId + redirectUrl
 * 2. User completes video ident on IDnow
 * 3. IDnow calls our webhook → getIdentStatus() → update DB
 */

const BASE_URL = import.meta.env.IDNOW_BASE_URL || 'https://gateway.test.idnow.de';
const COMPANY_ID = import.meta.env.IDNOW_COMPANY_ID;
const API_KEY = import.meta.env.IDNOW_API_KEY;

type IdentStatus = 'PENDING' | 'REVIEW_PENDING' | 'SUCCESS' | 'FAILED' | 'ABORTED' | 'EXPIRED';

interface IdentResult {
    identId: string;
    status: IdentStatus;
    redirectUrl: string;
}

interface IdentStatusResult {
    identId: string;
    status: IdentStatus;
    firstName?: string;
    lastName?: string;
    birthday?: string;
    nationality?: string;
    completedAt?: string;
}

/**
 * Create a new IDnow identification session for a user
 * Returns the identId and the URL to redirect the user to
 */
export async function createIdent(userId: string, userEmail: string): Promise<IdentResult> {
    const identId = `${COMPANY_ID}-${userId}-${Date.now()}`;

    const res = await fetch(`${BASE_URL}/api/v1/${COMPANY_ID}/identifications/${identId}/start`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': API_KEY,
        },
        body: JSON.stringify({
            userdata: {
                id: userId,
                email: userEmail,
            },
            style: {
                themeColor: '#06b6d4',
                requestRedirect: `${import.meta.env.APP_URL}/kyc/callback`,
            },
        }),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`IDnow error ${res.status}: ${errorText}`);
    }

    return {
        identId,
        status: 'PENDING',
        redirectUrl: `${BASE_URL}/api/v1/${COMPANY_ID}/identifications/${identId}/identification/start`,
    };
}

/**
 * Get the current status of an identification
 */
export async function getIdentStatus(identId: string): Promise<IdentStatusResult> {
    const res = await fetch(
        `${BASE_URL}/api/v1/${COMPANY_ID}/identifications/${identId}`,
        {
            headers: {
                'X-API-KEY': API_KEY,
            },
        },
    );

    if (!res.ok) {
        throw new Error(`IDnow status check failed: ${res.status}`);
    }

    const data = await res.json();
    return {
        identId,
        status: data.identificationprocess?.result || 'PENDING',
        firstName: data.userdata?.firstname,
        lastName: data.userdata?.lastname,
        birthday: data.userdata?.birthday,
        nationality: data.userdata?.nationality,
        completedAt: data.identificationprocess?.companyid ? new Date().toISOString() : undefined,
    };
}

/**
 * Validate IDnow webhook signature
 * In production: verify HMAC signature from IDnow
 */
export function validateWebhookPayload(payload: unknown): boolean {
    // TODO: implement HMAC validation with IDnow webhook secret
    return payload !== null && typeof payload === 'object';
}
