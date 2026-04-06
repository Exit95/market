import { z } from 'zod';

export const reportSchema = z.object({
  reason: z.enum(['SCAM', 'FAKE', 'OFFENSIVE', 'PROHIBITED', 'MISLEADING', 'DUPLICATE', 'HARASSMENT', 'SPAM', 'OTHER']),
  description: z.string().max(1000).optional().default(''),
});

export type ReportFormData = z.infer<typeof reportSchema>;
