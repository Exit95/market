export const LISTING_CONDITIONS = [
  { value: 'NEW', label: 'Neu' },
  { value: 'LIKE_NEW', label: 'Wie neu' },
  { value: 'GOOD', label: 'Gut' },
  { value: 'ACCEPTABLE', label: 'Akzeptabel' },
  { value: 'DEFECTIVE', label: 'Defekt' },
] as const;

export const DEAL_STATUS_LABELS: Record<string, string> = {
  INQUIRY: 'Anfrage',
  NEGOTIATING: 'In Verhandlung',
  RESERVED: 'Reserviert',
  AGREED: 'Zugesagt',
  PAID: 'Bezahlt',
  SHIPPED: 'Versendet',
  HANDED_OVER: 'Übergeben',
  COMPLETED: 'Abgeschlossen',
  CANCELED: 'Storniert',
  CONFLICT: 'Konfliktfall',
};

export const REPORT_REASONS = [
  { value: 'SCAM', label: 'Betrugsversuch' },
  { value: 'FAKE', label: 'Fake-Inserat / Fake-Profil' },
  { value: 'OFFENSIVE', label: 'Beleidigung / Belästigung' },
  { value: 'PROHIBITED', label: 'Verbotener Artikel' },
  { value: 'MISLEADING', label: 'Irreführende Beschreibung' },
  { value: 'DUPLICATE', label: 'Doppeltes Inserat' },
  { value: 'HARASSMENT', label: 'Belästigung' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'OTHER', label: 'Sonstiges' },
] as const;

export const TRUST_LEVEL_LABELS: Record<string, string> = {
  NEW: 'Neu',
  CONFIRMED: 'Bestätigt',
  VERIFIED: 'Verifiziert',
  TRUSTED: 'Top-Verkäufer',
  IDENTIFIED: 'ID geprüft',
};

export const MAX_LISTING_IMAGES = 10;
export const MIN_LISTING_IMAGES = 1;
export const MAX_REVIEW_TEXT_LENGTH = 500;
export const BLIND_REVIEW_DAYS = 14;
