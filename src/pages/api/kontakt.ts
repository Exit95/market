import type { APIRoute } from 'astro';
import { z } from 'zod';
import { prisma } from '../../lib/auth';
import { checkRateLimit, rateLimitResponse } from '../../lib/rate-limit';

const KontaktSchema = z.object({
    name: z.string().min(1, 'Name ist erforderlich').max(200),
    email: z.string().email('Ungültige E-Mail-Adresse'),
    subject: z.enum([
        'allgemein',
        'konto',
        'inserat',
        'zahlung',
        'streitfall',
        'datenschutz',
        'sonstiges',
    ], { errorMap: () => ({ message: 'Bitte wähle einen Betreff' }) }),
    message: z.string().min(10, 'Nachricht muss mindestens 10 Zeichen lang sein').max(5000),
});

export const POST: APIRoute = async ({ request, clientAddress }) => {
    // Rate limit: 5 contact messages per 15 minutes per IP
    if (!checkRateLimit(`kontakt_ip:${clientAddress}`, 5, 15 * 60 * 1000)) {
        return rateLimitResponse(15 * 60);
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return err(400, 'Ungültiges JSON');
    }

    const parsed = KontaktSchema.safeParse(body);
    if (!parsed.success) {
        const firstError = parsed.error.issues?.[0]?.message ?? 'Ungültige Eingabe';
        return err(400, firstError);
    }

    const { name, email, subject, message } = parsed.data;

    // Log the contact request to audit log
    try {
        await prisma.auditLog.create({
            data: {
                action: 'contact_form',
                ip: clientAddress,
                userAgent: request.headers.get('user-agent'),
                metaJson: { name, email, subject, message },
            },
        });
    } catch (e) {
        // DB error should not block the response – log and continue
        console.error('[kontakt] auditLog write failed:', e);
    }

    return new Response(
        JSON.stringify({ ok: true, message: 'Nachricht gesendet' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
};

function err(status: number, message: string) {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
