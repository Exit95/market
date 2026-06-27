/**
 * src/data/service-categories.ts
 * Static service category data for SSR rendering and fallback.
 */

export interface ServiceCategoryData {
  slug: string;
  name: string;
  icon: string;
  description: string;
}

export const serviceCategories: ServiceCategoryData[] = [
  { slug: 'handwerk-reparatur', name: 'Handwerk & Reparatur', icon: '/icons/service/handwerk.svg', description: 'Möbelaufbau, Renovierung, Reparaturen' },
  { slug: 'digital-it', name: 'Digital & IT', icon: '/icons/service/digital.svg', description: 'Webdesign, Programmierung, IT-Support' },
  { slug: 'haushalt-reinigung', name: 'Haushalt & Reinigung', icon: '/icons/service/haushalt.svg', description: 'Putzen, Aufräumen, Wäsche' },
  { slug: 'garten-aussenbereich', name: 'Garten & Außenbereich', icon: '/icons/service/garten.svg', description: 'Rasenmähen, Hecke schneiden, Bepflanzung' },
  { slug: 'transport-umzug', name: 'Transport & Umzug', icon: '/icons/service/transport.svg', description: 'Umzugshilfe, Transporte, Entsorgung' },
  { slug: 'nachhilfe-bildung', name: 'Nachhilfe & Bildung', icon: '/icons/service/nachhilfe.svg', description: 'Mathe, Sprachen, Musikunterricht' },
  { slug: 'kreativ-medien', name: 'Kreativ & Medien', icon: '/icons/service/kreativ.svg', description: 'Fotografie, Videoschnitt, Grafikdesign' },
  { slug: 'pflege-betreuung', name: 'Pflege & Betreuung', icon: '/icons/service/pflege.svg', description: 'Kinderbetreuung, Tierbetreuung, Seniorenhilfe' },
  { slug: 'buero-verwaltung', name: 'Büro & Verwaltung', icon: '/icons/service/buero.svg', description: 'Steuerhilfe, Schreibarbeiten, Übersetzung' },
  { slug: 'sport-fitness', name: 'Sport & Fitness', icon: '/icons/service/sport.svg', description: 'Personal Training, Yoga, Tanzunterricht' },
  { slug: 'events-unterhaltung', name: 'Events & Unterhaltung', icon: '/icons/service/events.svg', description: 'DJ, Moderation, Kochen für Events' },
  { slug: 'sonstiges', name: 'Sonstiges', icon: '/icons/service/sonstiges.svg', description: 'Alles was nicht in andere Kategorien passt' },
];

export const effortLabels: Record<string, string> = {
  UNTER_1_STUNDE: 'Unter 1 Stunde',
  EIN_BIS_DREI_STUNDEN: '1–3 Stunden',
  DREI_BIS_ACHT_STUNDEN: '3–8 Stunden',
  MEHRERE_TAGE: 'Mehrere Tage',
  FORTLAUFEND: 'Fortlaufend',
};

export const locationTypeLabels: Record<string, string> = {
  VOR_ORT: 'Vor Ort',
  REMOTE: 'Remote',
  BEIDES: 'Beides möglich',
};

export const experienceLevelLabels: Record<string, string> = {
  ANFAENGER: 'Anfänger',
  FORTGESCHRITTEN: 'Fortgeschritten',
  PROFI: 'Profi',
};

export const availabilityLabels: Record<string, string> = {
  WERKTAGS: 'Werktags',
  ABENDS: 'Abends',
  WOCHENENDE: 'Wochenende',
  FLEXIBEL: 'Flexibel',
};
