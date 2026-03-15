import type { APIRoute } from 'astro';
import { requireAuth, isAuthContext } from '../../../../lib/auth-middleware';
import { prisma } from '../../../../lib/auth';
import crypto from 'crypto';

// In a real app we'd use Redis or DB to store the temporary token.
// For demonstration, we will map dealId -> token and expiry.
const handshakeTokens = new Map<string, { token: string; expiresAt: number }>();

export const GET: APIRoute = async ({ request, cookies, params }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const dealId = params.id;
    if (!dealId) return new Response('Bad request', { status: 400 });

    const deal = await prisma.deal.findUnique({
        where: { id: dealId }
    });

    if (!deal) return new Response('Not found', { status: 404 });
    
    // Only the buyer generates the token, seller scans it.
    if (deal.buyerId !== auth.userId) {
        return new Response('Only buyer can generate handshake token', { status: 403 });
    }

    if (deal.handshakeStatus === 'VERIFIED') {
        return new Response(JSON.stringify({ error: 'Deal already verified' }), { status: 400 });
    }

    // Generate a secure 6-digit or random token
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    handshakeTokens.set(dealId, { token, expiresAt });

    return new Response(JSON.stringify({ token, expiresAt }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
};

export const POST: APIRoute = async ({ request, cookies, params }) => {
    const auth = await requireAuth(request, cookies);
    if (!isAuthContext(auth)) return auth;

    const dealId = params.id;
    if (!dealId) return new Response('Bad request', { status: 400 });

    const { token } = await request.json();

    const deal = await prisma.deal.findUnique({
        where: { id: dealId }
    });

    if (!deal) return new Response('Not found', { status: 404 });
    
    // Only the seller scans the token
    if (deal.sellerId !== auth.userId) {
        return new Response('Only seller can verify handshake', { status: 403 });
    }

    const savedRecord = handshakeTokens.get(dealId);
    if (!savedRecord || savedRecord.token !== token) {
        return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 400 });
    }

    if (Date.now() > savedRecord.expiresAt) {
        handshakeTokens.delete(dealId);
        return new Response(JSON.stringify({ error: 'Token expired' }), { status: 400 });
    }

    // Verify
    const updatedDeal = await prisma.deal.update({
        where: { id: dealId },
        data: {
            handshakeStatus: 'VERIFIED',
            status: 'COMPLETED',
            completedAt: new Date()
        }
    });

    // Cleanup token
    handshakeTokens.delete(dealId);

    // Audit Log
    await prisma.auditLog.create({
        data: {
            userId: auth.userId,
            action: 'handshake_verified',
            entityId: dealId,
            details: { role: 'seller', method: 'QR_CODE' },
            ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
        }
    });

    return new Response(JSON.stringify({ success: true, deal: updatedDeal }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
};
