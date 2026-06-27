/**
 * prisma/seed-categories.ts
 * Seed-Script für Kategorien + Unterkategorien.
 * Ausführen: npx tsx prisma/seed-categories.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
    {
        slug: 'elektronik', name: 'Elektronik', icon: '/icons/elektronik.svg', position: 1,
        children: [
            { slug: 'smartphones', name: 'Smartphones & Handys', position: 1 },
            { slug: 'laptops-pcs', name: 'Laptops & PCs', position: 2 },
            { slug: 'tablets', name: 'Tablets & E-Reader', position: 3 },
            { slug: 'gaming-konsolen', name: 'Gaming & Konsolen', position: 4 },
            { slug: 'tv-audio', name: 'TV & Audio', position: 5 },
            { slug: 'kameras', name: 'Kameras & Foto', position: 6 },
            { slug: 'elektronik-zubehoer', name: 'Zubehör & Kabel', position: 7 },
        ],
    },
    {
        slug: 'fahrzeuge', name: 'Fahrzeuge', icon: '/icons/fahrzeuge.svg', position: 2,
        children: [
            { slug: 'autos', name: 'Autos', position: 1 },
            { slug: 'motorraeder', name: 'Motorräder & Roller', position: 2 },
            { slug: 'fahrraeder', name: 'Fahrräder & E-Bikes', position: 3 },
            { slug: 'wohnmobile', name: 'Wohnmobile & Wohnwagen', position: 4 },
            { slug: 'fahrzeug-teile', name: 'Teile & Zubehör', position: 5 },
            { slug: 'boote', name: 'Boote & Wassersport', position: 6 },
        ],
    },
    {
        slug: 'mode', name: 'Mode & Kleidung', icon: '/icons/mode-bekleidung.svg', position: 3,
        children: [
            { slug: 'damenmode', name: 'Damenmode', position: 1 },
            { slug: 'herrenmode', name: 'Herrenmode', position: 2 },
            { slug: 'kinderbekleidung', name: 'Kinderbekleidung', position: 3 },
            { slug: 'schuhe', name: 'Schuhe', position: 4 },
            { slug: 'accessoires', name: 'Accessoires & Schmuck', position: 5 },
            { slug: 'taschen', name: 'Taschen & Koffer', position: 6 },
            { slug: 'designermode', name: 'Designermode & Luxus', position: 7 },
        ],
    },
    {
        slug: 'moebel', name: 'Möbel & Wohnen', icon: '/icons/moebel-wohnen.svg', position: 4,
        children: [
            { slug: 'wohnzimmer', name: 'Wohnzimmer', position: 1 },
            { slug: 'schlafzimmer', name: 'Schlafzimmer', position: 2 },
            { slug: 'kueche-esszimmer', name: 'Küche & Esszimmer', position: 3 },
            { slug: 'badezimmer', name: 'Badezimmer', position: 4 },
            { slug: 'buero-moebel', name: 'Büromöbel', position: 5 },
            { slug: 'garten-balkon', name: 'Garten & Balkon', position: 6 },
            { slug: 'dekoration', name: 'Dekoration & Lampen', position: 7 },
        ],
    },
    {
        slug: 'sport', name: 'Sport & Freizeit', icon: '/icons/sport-freizeit.svg', position: 5,
        children: [
            { slug: 'fitness', name: 'Fitness & Gym', position: 1 },
            { slug: 'outdoor', name: 'Outdoor & Camping', position: 2 },
            { slug: 'wintersport', name: 'Wintersport', position: 3 },
            { slug: 'ballsport', name: 'Ballsport', position: 4 },
            { slug: 'radsport', name: 'Radsport', position: 5 },
            { slug: 'wassersport', name: 'Wassersport', position: 6 },
        ],
    },
    {
        slug: 'haushalt', name: 'Haushalt & Garten', icon: '/icons/haushalt.svg', position: 6,
        children: [
            { slug: 'kuechengeraete', name: 'Küchengeräte', position: 1 },
            { slug: 'waschmaschinen', name: 'Waschmaschinen & Trockner', position: 2 },
            { slug: 'staubsauger', name: 'Staubsauger & Reinigung', position: 3 },
            { slug: 'gartengeraete', name: 'Gartengeräte', position: 4 },
            { slug: 'werkzeug', name: 'Werkzeug & Heimwerken', position: 5 },
            { slug: 'haustiere', name: 'Haustierbedarf', position: 6 },
        ],
    },
    {
        slug: 'bucher', name: 'Bücher & Medien', icon: '/icons/buecher-medien.svg', position: 7,
        children: [
            { slug: 'buecher', name: 'Bücher', position: 1 },
            { slug: 'filme-serien', name: 'Filme & Serien', position: 2 },
            { slug: 'musik', name: 'Musik & Vinyl', position: 3 },
            { slug: 'videospiele', name: 'Videospiele', position: 4 },
            { slug: 'comics-manga', name: 'Comics & Manga', position: 5 },
        ],
    },
    {
        slug: 'spielzeug', name: 'Spielzeug & Baby', icon: '/icons/spielzeug.svg', position: 8,
        children: [
            { slug: 'baby-kleinkind', name: 'Baby & Kleinkind', position: 1 },
            { slug: 'spielzeug-kinder', name: 'Spielzeug (3-12 Jahre)', position: 2 },
            { slug: 'lego-baukloetze', name: 'LEGO & Bausteine', position: 3 },
            { slug: 'puppen-figuren', name: 'Puppen & Figuren', position: 4 },
            { slug: 'kinderwagen', name: 'Kinderwagen & Autositze', position: 5 },
            { slug: 'kindermoebel', name: 'Kindermöbel', position: 6 },
        ],
    },
    {
        slug: 'sonstiges', name: 'Sonstiges', icon: '/icons/mieten-kaufen.svg', position: 9,
        children: [
            { slug: 'sammlerstuecke', name: 'Sammlerstücke & Kunst', position: 1 },
            { slug: 'musikinstrumente', name: 'Musikinstrumente', position: 2 },
            { slug: 'tickets-gutscheine', name: 'Tickets & Gutscheine', position: 3 },
            { slug: 'dienstleistungen', name: 'Dienstleistungen', position: 4 },
            { slug: 'tauschen-verschenken', name: 'Tauschen & Verschenken', position: 5 },
        ],
    },
];

async function seed() {
    console.log('Seeding categories...');

    for (const cat of categories) {
        const parent = await prisma.category.upsert({
            where: { slug: cat.slug },
            update: { name: cat.name, icon: cat.icon, position: cat.position },
            create: { slug: cat.slug, name: cat.name, icon: cat.icon, position: cat.position },
        });

        for (const child of cat.children) {
            await prisma.category.upsert({
                where: { slug: child.slug },
                update: { name: child.name, position: child.position, parentId: parent.id },
                create: { slug: child.slug, name: child.name, position: child.position, parentId: parent.id },
            });
        }

        console.log(`  ✓ ${cat.name} (${cat.children.length} Unterkategorien)`);
    }

    const total = await prisma.category.count();
    console.log(`\nFertig: ${total} Kategorien erstellt.`);
}

seed()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
