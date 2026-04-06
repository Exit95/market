/**
 * src/lib/service-content-filter.ts
 * Content-Filter-Pipeline für Leistungstausch.
 *
 * Prüft alle Texte auf:
 * 1. Diskriminierung (Hard Block)
 * 2. Geld/Waren-Referenzen (Hard Block)
 * 3. Unzulässige Dienstleistungen (Soft Block → Admin)
 * 4. Qualitätsprobleme (Warnung)
 */

export interface FilterResult {
  passed: boolean;
  level: 'ok' | 'warning' | 'soft_block' | 'hard_block';
  rule: string | null;
  message: string | null;
  flags: string[];
}

// ── 1. Diskriminierung ──────────────────────────────────────────────────────

const DISCRIMINATION_PATTERNS: Array<{ re: RegExp; flag: string }> = [
  { re: /\b(nur\s+für\s+deutsche|keine\s+ausl[aä]nder|nur\s+(?:bio-?)?deutsche)\b/i, flag: 'ETHNIC_EXCLUSION' },
  { re: /\b(keine?\s+(?:türk|arab|afrik|asiat|rum[aä]n|bulgar|pol|russ)\w*)\b/i, flag: 'ETHNIC_EXCLUSION' },
  { re: /\b(keine?\s+(?:muslim|islam|jud|jüd|christ|hindu|buddhist)\w*)\b/i, flag: 'RELIGIOUS_EXCLUSION' },
  { re: /\b(nur\s+(?:für\s+)?(?:christen|muslime|juden))\b/i, flag: 'RELIGIOUS_EXCLUSION' },
  { re: /\b((?:juden|jews?)\s*(?:raus|weg|vergasen))\b/i, flag: 'ANTISEMITISM' },
  { re: /\b((?:(((?:jüd|jew)\w*)\s+(?:kontrolle|verschwörung|lobby))))\b/i, flag: 'ANTISEMITISM' },
  { re: /\b(heil\s+hitler|sieg\s+heil|white\s+power|1488|14\s*words)\b/i, flag: 'RIGHTWING_EXTREMISM' },
  { re: /(?:^|\s)(88|1488)(?:\s|$|[.,!?])/, flag: 'RIGHTWING_CODE' },
  { re: /\b(keine?\s+(?:schwul|lesb|trans|homo|queer)\w*)\b/i, flag: 'HOMOPHOBIA' },
  { re: /\b(schwuchtel|tunte|transe)\b/i, flag: 'HOMOPHOBIC_SLUR' },
  { re: /\b(keine?\s+(?:frauen|männer|weiber)\s+(?:erwünscht|erlaubt|gewollt))\b/i, flag: 'GENDER_DISCRIMINATION' },
  { re: /\b(keine?\s+(?:alten|senioren|jungen))\b/i, flag: 'AGE_DISCRIMINATION' },
  { re: /\b(behindert|krüppel|spast|mongo)\b/i, flag: 'ABLEISM' },
  { re: /\b(neger|kanake?|kümmelt[uü]rk|schlitzauge|zigeuner)\b/i, flag: 'RACIST_SLUR' },
];

// ── 2. Geld / Waren ────────────────────────────────────────────────────────

const MONEY_GOODS_PATTERNS: Array<{ re: RegExp; flag: string }> = [
  { re: /\b(\d+\s*[€$]|[€$]\s*\d+|\d+\s*(?:euro|eur)\b)/i, flag: 'MONEY_REFERENCE' },
  { re: /\b(stundenlohn|bezahlung|vergütung|honorar|gehalt|lohn|entgelt)\b/i, flag: 'PAYMENT_TERM' },
  { re: /\b(vb|verhandlungsbasis|festpreis|preis)\b/i, flag: 'PRICE_TERM' },
  { re: /\b(gegen\s+(?:geld|bezahlung|zahlung))\b/i, flag: 'MONEY_EXCHANGE' },
  { re: /\b(verkauf\w*|zu\s+verkaufen)\b/i, flag: 'SALE_TERM' },
  { re: /\b(wie\s+neu|ovp|originalverpackung?|unbenutzt|neuwertig)\b/i, flag: 'PRODUCT_CONDITION' },
  { re: /\b(versand\s+(?:möglich|inklusive|gegen)|dhl|hermes|dpd)\b/i, flag: 'SHIPPING_REFERENCE' },
  { re: /\b(zuzahlung|aufpreis|differenz|aufzahlung|plus\s+\d+)\b/i, flag: 'SURCHARGE' },
  { re: /\b(gegen\s+(?:aufpreis|aufzahlung|zuzahlung))\b/i, flag: 'SURCHARGE_EXCHANGE' },
];

// ── 3. Unzulässige Dienstleistungen ────────────────────────────────────────

const ILLEGAL_SERVICE_PATTERNS: Array<{ re: RegExp; flag: string }> = [
  { re: /\b(sex\w*\s+(?:dienst|service|leistung|angebot|massage))\b/i, flag: 'SEXUAL_SERVICE' },
  { re: /\b(erotik|escort|intim|happy\s+end)\b/i, flag: 'SEXUAL_SERVICE' },
  { re: /\b(drogen|gras|weed|kokain|mdma|ecstasy)\b/i, flag: 'ILLEGAL_SUBSTANCE' },
  { re: /\b(waffen|schusswaffe|munition|sprengstoff)\b/i, flag: 'ILLEGAL_WEAPON' },
  { re: /\b(fälsch\w*|gefälscht\w*|fake\s+(?:ausweis|führerschein|dokument))\b/i, flag: 'FORGERY' },
  { re: /\b(schwarzarbeit|ohne\s+rechnung|steuerfrei\s+(?:arbeit|leistung))\b/i, flag: 'TAX_EVASION' },
];

// ── 4. Qualität ─────────────────────────────────────────────────────────────

const QUALITY_PATTERNS: Array<{ re: RegExp; flag: string }> = [
  { re: /^(mache alles|kann alles|bin flexibel|biete hilfe)$/i, flag: 'TOO_VAGUE' },
  { re: /(.)\1{5,}/i, flag: 'SPAM_REPETITION' },
  { re: /(test|asdf|lorem ipsum|xxx)/i, flag: 'TEST_CONTENT' },
];

export function filterServiceContent(text: string): FilterResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { passed: true, level: 'ok', rule: null, message: null, flags: [] };
  }

  for (const p of DISCRIMINATION_PATTERNS) {
    if (p.re.test(trimmed)) {
      return {
        passed: false,
        level: 'hard_block',
        rule: 'DISKRIMINIERUNG',
        message: 'Dieser Inhalt verstößt gegen unsere Antidiskriminierungsrichtlinien und kann nicht veröffentlicht werden.',
        flags: [p.flag],
      };
    }
  }

  for (const p of MONEY_GOODS_PATTERNS) {
    if (p.re.test(trimmed)) {
      return {
        passed: false,
        level: 'hard_block',
        rule: 'KEIN_GELD_KEINE_WARE',
        message: 'Im Leistungstausch sind keine Geldbeträge, Preise oder Warenangebote erlaubt. Hier geht es ausschließlich um Dienstleistung gegen Dienstleistung.',
        flags: [p.flag],
      };
    }
  }

  for (const p of ILLEGAL_SERVICE_PATTERNS) {
    if (p.re.test(trimmed)) {
      return {
        passed: false,
        level: 'soft_block',
        rule: 'UNZULAESSIGE_DIENSTLEISTUNG',
        message: 'Dieses Angebot wurde zur Überprüfung markiert und wird von unserem Team geprüft.',
        flags: [p.flag],
      };
    }
  }

  const qualityFlags: string[] = [];
  for (const p of QUALITY_PATTERNS) {
    if (p.re.test(trimmed)) {
      qualityFlags.push(p.flag);
    }
  }
  if (qualityFlags.length > 0) {
    return {
      passed: true,
      level: 'warning',
      rule: 'QUALITAET',
      message: 'Dein Text könnte detaillierter sein. Je genauer du beschreibst, desto bessere Vorschläge bekommst du.',
      flags: qualityFlags,
    };
  }

  return { passed: true, level: 'ok', rule: null, message: null, flags: [] };
}

export function filterServiceListing(fields: {
  title: string;
  offeredDescription: string;
  soughtDescription: string;
  requirements?: string;
}): FilterResult {
  const texts = [
    { name: 'Titel', text: fields.title },
    { name: 'Leistungsbeschreibung', text: fields.offeredDescription },
    { name: 'Gegenleistung', text: fields.soughtDescription },
  ];
  if (fields.requirements) {
    texts.push({ name: 'Voraussetzungen', text: fields.requirements });
  }

  let worstWarning: FilterResult | null = null;

  for (const { name, text } of texts) {
    const result = filterServiceContent(text);
    if (result.level === 'hard_block' || result.level === 'soft_block') {
      return { ...result, message: `${name}: ${result.message}` };
    }
    if (result.level === 'warning' && !worstWarning) {
      worstWarning = { ...result, message: `${name}: ${result.message}` };
    }
  }

  return worstWarning ?? { passed: true, level: 'ok', rule: null, message: null, flags: [] };
}
