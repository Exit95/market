#!/usr/bin/env tsx
/**
 * scripts/auto-release.ts
 * ---------------------------------------------------------------------------
 * Cron job: auto-release orders that have been DELIVERED for > 48h without
 * an open dispute.
 *
 * Run:
 *   npx tsx scripts/auto-release.ts
 *
 * Recommended cron (every 15 minutes):
 *   */15 * * * * cd / opt / novamarkt && npx tsx scripts / auto - release.ts >> /var/log / novamarkt - release.log 2 >& 1
    *
 * Or with node - cron inside a worker process(see scripts / worker.ts).
 * ---------------------------------------------------------------------------
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const RELEASE_AFTER_MS = 48 * 60 * 60 * 1000; // 48 hours

async function main() {
    const threshold = new Date(Date.now() - RELEASE_AFTER_MS);

    const eligible = await prisma.order.findMany({
        where: {
            status: 'DELIVERED',
            completedAt: { lte: threshold },
            dispute: null,          // no dispute exists
        },
        select: { id: true, sellerId: true, totalAmount: true, currency: true },
    });

    console.log(`[auto-release] ${new Date().toISOString()} — ${eligible.length} orders eligible`);

    for (const order of eligible) {
        await prisma.$transaction([
            prisma.order.update({
                where: { id: order.id },
                data: { status: 'COMPLETED' },
            }),
            prisma.auditLog.create({
                data: {
                    action: 'order_auto_released',
                    metaJson: {
                        orderId: order.id,
                        sellerId: order.sellerId,
                        amountCents: order.totalAmount,
                    },
                },
            }),
        ]);

        // TODO: trigger actual Stripe payout / Mangopay transfer to seller here
        console.log(`[auto-release] Released order ${order.id} → seller ${order.sellerId}`);
    }
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
