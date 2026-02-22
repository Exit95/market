/**
 * prisma/seed.ts
 * Seed: 3 Users, 10 Listings, 2 Conversations, 1 Order
 */
import { PrismaClient, ListingCategory, ListingStatus, OrderStatus } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

const HASH_OPTS = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 };

async function main() {
    console.log('🌱 Seeding Novamarkt...');

    // ── Users ──────────────────────────────────────────────────────────────────
    const [admin, seller, buyer] = await Promise.all([
        prisma.user.upsert({
            where: { email: 'admin@novamarkt.de' },
            update: {},
            create: {
                email: 'admin@novamarkt.de',
                passwordHash: await hash('Admin1234!', HASH_OPTS),
                firstName: 'Nova',
                lastName: 'Admin',
                role: 'ADMIN',
                emailVerified: true,
                city: 'Berlin',
                postalCode: '10115',
            },
        }),
        prisma.user.upsert({
            where: { email: 'seller@novamarkt.de' },
            update: {},
            create: {
                email: 'seller@novamarkt.de',
                passwordHash: await hash('Seller1234!', HASH_OPTS),
                firstName: 'Klaus',
                lastName: 'Müller',
                emailVerified: true,
                phoneVerified: true,
                idVerified: true,
                city: 'Hamburg',
                postalCode: '20249',
            },
        }),
        prisma.user.upsert({
            where: { email: 'buyer@novamarkt.de' },
            update: {},
            create: {
                email: 'buyer@novamarkt.de',
                passwordHash: await hash('Buyer1234!', HASH_OPTS),
                firstName: 'Anna',
                lastName: 'Schmidt',
                emailVerified: true,
                city: 'München',
                postalCode: '80331',
            },
        }),
    ]);

    // ── TrustScores ───────────────────────────────────────────────────────────
    await Promise.all([
        prisma.trustScore.upsert({ where: { userId: seller.id }, update: {}, create: { userId: seller.id, score: 82, level: 'TRUSTED' } }),
        prisma.trustScore.upsert({ where: { userId: buyer.id }, update: {}, create: { userId: buyer.id, score: 25, level: 'BASIC' } }),
    ]);

    // ── Listings ──────────────────────────────────────────────────────────────
    const listingData = [
        { title: 'iPhone 15 Pro Max 256GB – Titanium', price: 94900, category: ListingCategory.ELEKTRONIK, city: 'Hamburg', postalCode: '20249', description: 'Wie neu, kein Kratzer. Akku 98%. Originalzubehör vollständig.', treuhand: true },
        { title: 'Sony WH-1000XM5 Kopfhörer – schwarz', price: 19500, category: ListingCategory.ELEKTRONIK, city: 'Hamburg', postalCode: '20249', description: 'Im tadellosem Zustand, kaum benutzt.', treuhand: true },
        { title: 'PlayStation 5 Digital + 3 Spiele', price: 38000, category: ListingCategory.ELEKTRONIK, city: 'Hamburg', postalCode: '20249', description: 'PS5 Digital Edition, 2 Controller, Gran Turismo 7, FIFA 24, GoW.', treuhand: true },
        { title: 'VW Golf 7 GTI 2018 – 120tkm', price: 1850000, category: ListingCategory.FAHRZEUGE, city: 'Hamburg', postalCode: '20249', description: 'Scheckheftgepflegt, HU neu, Klimaautomatik, Navi.', treuhand: true },
        { title: 'IKEA KALLAX Regal 4×4 weiß', price: 7900, category: ListingCategory.MOEBEL, city: 'München', postalCode: '80331', description: '147×147×39 cm, guter Zustand.', treuhand: false },
        { title: 'Trek Marlin 7 Mountainbike RH M', price: 68000, category: ListingCategory.SPORT, city: 'München', postalCode: '80331', description: 'Shimano Deore 12-Gang, 29 Zoll, sehr guter Zustand.', treuhand: true },
        { title: 'Vintage Lederjacke Gr. L – Braun', price: 5500, category: ListingCategory.MODE, city: 'Köln', postalCode: '50667', description: 'Echtes Leder, schöner Vintagecharakter.', treuhand: false },
        { title: 'Bosch Akkuschrauber GSR 18V-55 Set', price: 8900, category: ListingCategory.HAUSHALT, city: 'Düsseldorf', postalCode: '40213', description: 'Inkl. 2 Akkus, Ladegerät, L-BOXX + Bits.', treuhand: false },
        { title: 'Kinderwagen Bugaboo Fox 3 – Sand', price: 49900, category: ListingCategory.SPIELZEUG, city: 'Berlin', postalCode: '10115', description: 'Sehr gepflegt, alle Extras dabei.', treuhand: true },
        { title: 'Sachbuch-Paket Programmierung 12 Bücher', price: 3500, category: ListingCategory.BUCHER, city: 'Berlin', postalCode: '10115', description: 'Clean Code, DDD, Refactoring u.a.', treuhand: false },
    ];

    const listings = await Promise.all(
        listingData.map((d, i) =>
            prisma.listing.upsert({
                where: { id: `seed-listing-${i + 1}` },
                update: {},
                create: {
                    id: `seed-listing-${i + 1}`,
                    sellerId: i < 4 ? seller.id : buyer.id, // first 4 by seller, rest by buyer
                    status: ListingStatus.ACTIVE,
                    condition: 'Sehr gut',
                    currency: 'EUR',
                    country: 'DE',
                    ...d,
                },
            }),
        ),
    );

    // ── Listing Images (first listing) ────────────────────────────────────────
    await prisma.listingImage.upsert({
        where: { id: 'seed-img-1' },
        update: {},
        create: {
            id: 'seed-img-1',
            listingId: listings[0].id,
            objectKey: 'seed/iphone15.jpg',
            url: 'https://images.unsplash.com/photo-1695048133142-1a20484429be?w=800',
            position: 0,
        },
    });

    // ── Conversations ─────────────────────────────────────────────────────────
    const [conv1, conv2] = await Promise.all([
        prisma.conversation.upsert({
            where: { listingId_buyerId: { listingId: listings[0].id, buyerId: buyer.id } },
            update: {},
            create: {
                listingId: listings[0].id,
                buyerId: buyer.id,
                sellerId: seller.id,
                messages: {
                    create: [
                        { senderId: buyer.id, body: 'Hallo, ist das iPhone noch verfügbar?' },
                        { senderId: seller.id, body: 'Ja, noch vorhanden! Treuhand-Kauf möglich.' },
                        { senderId: buyer.id, body: 'Super, ich würde gerne kaufen.' },
                    ],
                },
            },
        }),
        prisma.conversation.upsert({
            where: { listingId_buyerId: { listingId: listings[3].id, buyerId: buyer.id } },
            update: {},
            create: {
                listingId: listings[3].id,
                buyerId: buyer.id,
                sellerId: seller.id,
                messages: {
                    create: [
                        { senderId: buyer.id, body: 'Ist der Golf noch zu haben?' },
                        { senderId: seller.id, body: 'Ja, Besichtigung gerne nach Absprache.' },
                    ],
                },
            },
        }),
    ]);

    // ── Order + Payment ───────────────────────────────────────────────────────
    const order = await prisma.order.upsert({
        where: { id: 'seed-order-1' },
        update: {},
        create: {
            id: 'seed-order-1',
            listingId: listings[0].id,
            buyerId: buyer.id,
            sellerId: seller.id,
            status: OrderStatus.PAID,
            totalAmount: 94900,
            feeCents: 2278, // ~2.4%
            currency: 'EUR',
        },
    });

    await prisma.payment.upsert({
        where: { orderId: order.id },
        update: {},
        create: {
            orderId: order.id,
            provider: 'stripe',
            paymentIntentId: 'pi_seed_test_12345',
            status: 'SUCCEEDED',
            amountCents: 94900,
            currency: 'EUR',
        },
    });

    // ── AuditLog ──────────────────────────────────────────────────────────────
    await prisma.auditLog.createMany({
        skipDuplicates: true,
        data: [
            { actorId: seller.id, action: 'register', ip: '127.0.0.1' },
            { actorId: buyer.id, action: 'register', ip: '127.0.0.2' },
            { actorId: buyer.id, action: 'login', ip: '127.0.0.2' },
        ],
    });

    console.log('✅ Seed complete.');
    console.log(`   Users:   admin / seller / buyer`);
    console.log(`   Listings: ${listings.length}`);
    console.log(`   Conversations: 2, Messages: 5`);
    console.log(`   Orders: 1 (PAID)`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
