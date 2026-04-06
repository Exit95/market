/**
 * src/lib/service-validation.ts
 * Zod schemas for Leistungstausch inputs.
 */
import { z } from 'zod';

export const ServiceListingCreateSchema = z.object({
  title: z.string()
    .min(10, 'Titel muss mindestens 10 Zeichen haben.')
    .max(80, 'Titel darf maximal 80 Zeichen haben.'),
  offeredDescription: z.string()
    .min(50, 'Beschreibe deine Leistung mit mindestens 50 Zeichen.')
    .max(2000, 'Beschreibung darf maximal 2000 Zeichen haben.'),
  offeredCategoryId: z.string().min(1, 'Kategorie ist erforderlich.'),
  soughtCategoryIds: z.array(z.string().min(1))
    .min(1, 'Wähle mindestens eine gesuchte Kategorie.')
    .max(3, 'Maximal 3 gesuchte Kategorien.'),
  soughtDescription: z.string()
    .min(30, 'Beschreibe deine Gegenleistung mit mindestens 30 Zeichen.')
    .max(1000, 'Beschreibung darf maximal 1000 Zeichen haben.'),
  effort: z.enum([
    'UNTER_1_STUNDE',
    'EIN_BIS_DREI_STUNDEN',
    'DREI_BIS_ACHT_STUNDEN',
    'MEHRERE_TAGE',
    'FORTLAUFEND',
  ], { message: 'Ungültiger Aufwand.' }),
  locationType: z.enum(['VOR_ORT', 'REMOTE', 'BEIDES'], { message: 'Ungültiger Durchführungsort.' }),
  city: z.string().max(100).optional(),
  postalCode: z.string().regex(/^\d{5}$/, 'PLZ muss 5 Ziffern haben.').optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  availability: z.array(z.enum(['WERKTAGS', 'ABENDS', 'WOCHENENDE', 'FLEXIBEL'])).optional(),
  experienceLevel: z.enum(['ANFAENGER', 'FORTGESCHRITTEN', 'PROFI']).optional(),
  requirements: z.string().max(500, 'Voraussetzungen dürfen maximal 500 Zeichen haben.').optional(),
}).refine(data => {
  if (data.locationType !== 'REMOTE') {
    return !!data.city && !!data.postalCode;
  }
  return true;
}, { message: 'Stadt und PLZ sind bei Vor-Ort-Leistungen erforderlich.', path: ['city'] });

export const ServiceListingUpdateSchema = ServiceListingCreateSchema.partial();

export const ServiceListingQuerySchema = z.object({
  query: z.string().optional(),
  offeredCategory: z.string().optional(),
  soughtCategory: z.string().optional(),
  city: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(1).max(500).optional(),
  locationType: z.enum(['VOR_ORT', 'REMOTE', 'BEIDES']).optional(),
  effort: z.string().optional(),
  availability: z.string().optional(),
  experienceLevel: z.string().optional(),
  verifiedOnly: z.coerce.boolean().optional(),
  sortBy: z.enum(['newest', 'relevance', 'rating', 'distance']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const ServiceReportSchema = z.object({
  serviceListingId: z.string().min(1),
  reason: z.enum([
    'NICHT_DIENSTLEISTUNG',
    'DISKRIMINIERUNG',
    'SPAM',
    'BETRUG',
    'UNANGEMESSEN',
    'DUPLIKAT',
    'SONSTIGES',
  ], { message: 'Ungültiger Meldegrund.' }),
  description: z.string().max(1000).optional(),
});

export const ServiceProposalCreateSchema = z.object({
  serviceListingId: z.string().min(1, 'Listing-ID ist erforderlich.'),
  offeredDescription: z.string()
    .min(30, 'Beschreibe dein Angebot mit mindestens 30 Zeichen.')
    .max(2000, 'Beschreibung darf maximal 2000 Zeichen haben.'),
  offeredCategoryId: z.string().min(1, 'Kategorie ist erforderlich.'),
  offeredEffort: z.enum([
    'UNTER_1_STUNDE', 'EIN_BIS_DREI_STUNDEN', 'DREI_BIS_ACHT_STUNDEN',
    'MEHRERE_TAGE', 'FORTLAUFEND',
  ], { message: 'Ungültiger Aufwand.' }),
  soughtDescription: z.string()
    .min(30, 'Beschreibe deine Erwartung mit mindestens 30 Zeichen.')
    .max(2000, 'Beschreibung darf maximal 2000 Zeichen haben.'),
  soughtEffort: z.enum([
    'UNTER_1_STUNDE', 'EIN_BIS_DREI_STUNDEN', 'DREI_BIS_ACHT_STUNDEN',
    'MEHRERE_TAGE', 'FORTLAUFEND',
  ], { message: 'Ungültiger Aufwand.' }),
  locationType: z.enum(['VOR_ORT', 'REMOTE', 'BEIDES'], { message: 'Ungültiger Durchführungsort.' }),
  proposedLocation: z.string().max(200).optional(),
  proposedTimeframe: z.string().max(200).optional(),
  message: z.string().max(1000).optional(),
  parentProposalId: z.string().optional(),
});

export const ServiceProposalActionSchema = z.object({
  action: z.enum(['accept', 'decline', 'withdraw'], { message: 'Ungültige Aktion.' }),
});
