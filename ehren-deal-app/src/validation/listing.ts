import { z } from 'zod';

export const listingSchema = z.object({
  title: z.string().min(3, 'Titel muss mindestens 3 Zeichen lang sein').max(100, 'Titel darf maximal 100 Zeichen lang sein'),
  description: z.string().max(5000, 'Beschreibung darf maximal 5000 Zeichen lang sein').optional().default(''),
  categoryId: z.string().uuid('Bitte wähle eine Kategorie'),
  price: z.number().min(0, 'Preis darf nicht negativ sein').max(10000000, 'Preis zu hoch'),
  priceType: z.enum(['FIXED', 'NEGOTIABLE', 'FREE']),
  condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'ACCEPTABLE', 'DEFECTIVE']),
  city: z.string().min(1, 'Bitte gib einen Standort an'),
  postalCode: z.string().optional().default(''),
  shippingAvailable: z.boolean().default(false),
  pickupAvailable: z.boolean().default(true),
});

export type ListingFormData = z.infer<typeof listingSchema>;
