import { z } from 'zod';

export const profileSchema = z.object({
  displayName: z.string().min(2, 'Name muss mindestens 2 Zeichen lang sein').max(50),
  bio: z.string().max(500, 'Bio darf maximal 500 Zeichen lang sein').optional().default(''),
  city: z.string().min(1, 'Bitte gib einen Standort an').optional().default(''),
  postalCode: z.string().optional().default(''),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

// Alias fuer Edit-Screen
export const profileEditSchema = profileSchema;
export type ProfileEditFormData = ProfileFormData;
