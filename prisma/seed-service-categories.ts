/**
 * prisma/seed-service-categories.ts
 * Seed-Script für Leistungstausch-Kategorien.
 * Ausführen: npx tsx prisma/seed-service-categories.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const serviceCategories = [
  { slug: 'handwerk-reparatur', name: 'Handwerk & Reparatur', icon: '/icons/service/handwerk.svg', description: 'Möbelaufbau, Renovierung, Reparaturen', position: 1 },
  { slug: 'digital-it', name: 'Digital & IT', icon: '/icons/service/digital.svg', description: 'Webdesign, Programmierung, IT-Support', position: 2 },
  { slug: 'haushalt-reinigung', name: 'Haushalt & Reinigung', icon: '/icons/service/haushalt.svg', description: 'Putzen, Aufräumen, Wäsche', position: 3 },
  { slug: 'garten-aussenbereich', name: 'Garten & Außenbereich', icon: '/icons/service/garten.svg', description: 'Rasenmähen, Hecke schneiden, Bepflanzung', position: 4 },
  { slug: 'transport-umzug', name: 'Transport & Umzug', icon: '/icons/service/transport.svg', description: 'Umzugshilfe, Transporte, Entsorgung', position: 5 },
  { slug: 'nachhilfe-bildung', name: 'Nachhilfe & Bildung', icon: '/icons/service/nachhilfe.svg', description: 'Mathe, Sprachen, Musikunterricht', position: 6 },
  { slug: 'kreativ-medien', name: 'Kreativ & Medien', icon: '/icons/service/kreativ.svg', description: 'Fotografie, Videoschnitt, Grafikdesign', position: 7 },
  { slug: 'pflege-betreuung', name: 'Pflege & Betreuung', icon: '/icons/service/pflege.svg', description: 'Kinderbetreuung, Tierbetreuung, Seniorenhilfe', position: 8 },
  { slug: 'buero-verwaltung', name: 'Büro & Verwaltung', icon: '/icons/service/buero.svg', description: 'Steuerhilfe, Schreibarbeiten, Übersetzung', position: 9 },
  { slug: 'sport-fitness', name: 'Sport & Fitness', icon: '/icons/service/sport.svg', description: 'Personal Training, Yoga, Tanzunterricht', position: 10 },
  { slug: 'events-unterhaltung', name: 'Events & Unterhaltung', icon: '/icons/service/events.svg', description: 'DJ, Moderation, Kochen für Events', position: 11 },
  { slug: 'sonstiges', name: 'Sonstiges', icon: '/icons/service/sonstiges.svg', description: 'Alles was nicht in andere Kategorien passt', position: 12 },
];

async function main() {
  console.log('Seeding service categories...');
  for (const cat of serviceCategories) {
    await prisma.serviceCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, description: cat.description, position: cat.position },
      create: cat,
    });
    console.log(`  ✓ ${cat.name}`);
  }
  console.log(`Done. ${serviceCategories.length} service categories seeded.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
