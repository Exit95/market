import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: 'Elektronik', slug: 'elektronik', icon: 'smartphone', sortOrder: 1 },
    { name: 'Haus & Garten', slug: 'haus-garten', icon: 'home', sortOrder: 2 },
    { name: 'Mode', slug: 'mode', icon: 'shirt', sortOrder: 3 },
    { name: 'Familie, Baby & Kind', slug: 'familie-baby-kind', icon: 'baby', sortOrder: 4 },
    { name: 'Fahrzeuge', slug: 'fahrzeuge', icon: 'car', sortOrder: 5 },
    { name: 'Freizeit & Hobby', slug: 'freizeit-hobby', icon: 'gamepad', sortOrder: 6 },
    { name: 'Immobilien', slug: 'immobilien', icon: 'building', sortOrder: 7 },
    { name: 'Dienstleistungen', slug: 'dienstleistungen', icon: 'briefcase', sortOrder: 8 },
    { name: 'Tiere', slug: 'tiere', icon: 'paw-print', sortOrder: 9 },
    { name: 'Sonstiges', slug: 'sonstiges', icon: 'package', sortOrder: 10 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
  }
  console.log('Seed complete');
}

main().catch(console.error).finally(() => prisma.$disconnect());
