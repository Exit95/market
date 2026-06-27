/**
 * src/lib/content-filter.ts
 * Umfassender Filter gegen Hassrede, Beleidigungen, Rassismus, Antisemitismus,
 * Extremismus, sexuelle/vulgäre Inhalte und Spam.
 *
 * Wird geprüft bei: Registrierung, Profil-Update, Inserat-Erstellung, Nachrichten.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCKED PATTERNS (Regex, case-insensitive)
// ═══════════════════════════════════════════════════════════════════════════════

const BLOCKED_PATTERNS: RegExp[] = [
    // ── Antisemitismus & NS ──────────────────────────────────────────────────
    /jude[n]?\s*\d/i,
    /jude[n]?\s*(raus|tod|vernicht|hass|pack|dreck|schwein)/i,
    /holocaust\s*(lüge|leugn|fake|gab\s*es\s*nicht)/i,
    /\b(sieg\s*heil|heil\s*hitler|heil\s*h)\b/i,
    /\b(88|1488|14\s*88|18\s*88)\b/,
    /hakenkr(eu|ü)z/i,
    /\bnsdap\b/i,
    /\bwaffen.?ss\b/i,
    /drittes?\s*reich/i,
    /\breich\s*(bürger|bewegung)\b/i,
    /arische?\s*(rasse|volk|bruder|blut)/i,
    /white\s*(power|supremac|pride\s*world)/i,
    /\b(zyklon|vergasung|gaskammer|endlösung)\b/i,
    /\bführer\s*(befehl|prinzip)\b/i,

    // ── Rassismus ────────────────────────────────────────────────────────────
    /\bneger\b/i,
    /\bnigger\b/i,
    /\bnigga\b/i,
    /\bkanake?n?\b/i,
    /\bkümmelt?ürk/i,
    /\bkameltreiber\b/i,
    /\bschlitzaug/i,
    /\bzigeuner\b/i,
    /\bscheiss?\s*(ausländer|türk|arab|muslim|jude|neger|flüchtling|pole|russ)/i,
    /\b(ausländer|flüchtling|asylant)\s*(raus|heim|pack|gesindel|dreck)/i,
    /rasse[n]?\s*(krieg|kampf|hass|rein|schande)/i,
    /ethnische?\s*säuberung/i,
    /\buntermenschen?\b/i,
    /\bvolks(verräter|tod|feind|schädling)\b/i,
    /\büberfremdung\b/i,
    /\bumvolkung\b/i,

    // ── Extremismus & Gewalt ─────────────────────────────────────────────────
    /\b(isis|dschihad|kalifat|al.?qaida)\b/i,
    /\balle\s*(töten|umbringen|vergasen|aufhängen|erschießen)\b/i,
    /\b(amok|anschlag|terror)\s*(plan|machen|vorbereiten|drohen)\b/i,
    /\bbombe[n]?\s*(bau|anleitung|basteln)\b/i,

    // ── Schwere Beleidigungen ────────────────────────────────────────────────
    /\bhurensohn\b/i,
    /\bhurenkind\b/i,
    /\bmissgeburt\b/i,
    /\bbehindert(e[rs]?)?\s*(stück|mensch|kind|sau|schwein)\b/i,
    /\bspast(i|en|iker)?\b/i,
    /\bmongo(loide?)?\b/i,
    /\bwichser\b/i,
    /\bfotze\b/i,
    /\bschlampe\b/i,
    /\bnuttensohn\b/i,
    /\bdrecks?(sau|schwein|vieh|kind|kerl|weib|typ)\b/i,

    // ── Vulgäres / Sexuelles (in Inseraten/Namen unangemessen) ───────────────
    /\barsch(loch|geige|ficken|gesicht)?\b/i,
    /\bfick(en|t|er|e)?\b/i,
    /\bfuck(ing|er|ed|s)?\b/i,
    /\bschwanz\s*(bild|pic|foto|lutschen)\b/i,
    /\bpenis\b/i,
    /\bvagina\b/i,
    /\btitten\b/i,
    /\bporno?\b/i,
    /\bhentai\b/i,
    /\bsex\s*(skla|zwang|handel)\b/i,
    /\bvergewaltig/i,
    /\bpädophil/i,
    /\bkinderporno/i,

    // ── Drogenhandel ─────────────────────────────────────────────────────────
    /\b(koks|kokain|heroin|crystal\s*meth|mdma|ecstasy)\s*(kauf|verkauf|bestell|liefe)/i,
    /\bdroge[n]?\s*(deal|verkauf|kauf|bestell)/i,

    // ── Waffen (illegaler Handel) ────────────────────────────────────────────
    /\b(waffe|pistole|gewehr)\s*(kauf|verkauf|illegal|schwarz)/i,

    // ── Neonazi-Codes ────────────────────────────────────────────────────────
    /\bc\s*18\b/i,           // Combat 18
    /\b28\s*(crew|division)\b/i, // Blood & Honour
    /\bblood\s*&?\s*honour\b/i,
    /\bhammer\s*skin/i,
];

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCKED WORDS (Exact match, case-insensitive)
// ═══════════════════════════════════════════════════════════════════════════════

const BLOCKED_WORDS = new Set([
    // Rassismus
    'nigger', 'nigga', 'neger', 'kanake', 'kanaken', 'kameltreiber', 'zigeuner',
    // Beleidigungen
    'hurensohn', 'hurenkind', 'missgeburt', 'spasti', 'mongo', 'wichser',
    'fotze', 'schlampe', 'nuttensohn',
    // Vulgär (als Username/Titel inakzeptabel)
    'arsch', 'arschloch', 'penis', 'vagina', 'titten', 'ficken', 'ficker',
    'schwuchtel', 'transen',
    // NS
    'hitler', 'goebbels', 'himmler', 'mengele', 'eichmann',
]);

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCKED EMAIL DOMAINS
// ═══════════════════════════════════════════════════════════════════════════════

const BLOCKED_EMAIL_DOMAINS = new Set([
    'nigger.com', 'nigga.com', 'nazi.com', 'hitler.com',
    'tempmail.com', 'throwaway.email', 'guerrillamail.com',
    'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com',
    'mailinator.com', 'trashmail.com', 'fakeinbox.com',
]);

// ═══════════════════════════════════════════════════════════════════════════════
// SUSPICIOUS NUMBER PATTERNS (Neonazi-Codes in Usernamen)
// ═══════════════════════════════════════════════════════════════════════════════

const SUSPICIOUS_NUMBER_PATTERNS = /\b(88|1488|14\s*88|18\s*88|c18)\b/;

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZATION (Anti-Umgehung)
// ═══════════════════════════════════════════════════════════════════════════════

function normalize(text: string): string {
    return text
        .normalize('NFKD')
        // Leetspeak
        .replace(/[@ÀÁÂÃÄÅàáâãäå4]/g, 'a')
        .replace(/[0ÒÓÔÕÖòóôõö]/g, 'o')
        .replace(/[1!|ÌÍÎÏìíîï]/g, 'i')
        .replace(/[3€ÈÉÊËèéêë]/g, 'e')
        .replace(/[$5ŠšŞş]/g, 's')
        .replace(/[7]/g, 't')
        .replace(/[8]/g, 'b')
        // Sonderzeichen die Wörter verbinden
        .replace(/[._\-*+#~]/g, '')
        // Mehrfache Leerzeichen
        .replace(/\s+/g, ' ')
        .trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Prüft einen Text auf verbotene Inhalte.
 * Gibt den Grund zurück wenn blockiert, oder null wenn OK.
 */
export function checkContent(text: string): string | null {
    if (!text || text.trim().length === 0) return null;

    const normalized = normalize(text);
    const lower = text.toLowerCase();
    const normalizedLower = normalized.toLowerCase();

    // 1. Blocked patterns (Regex)
    for (const pattern of BLOCKED_PATTERNS) {
        if (pattern.test(text) || pattern.test(normalized)) {
            return 'Dieser Inhalt verstößt gegen unsere Nutzungsbedingungen und wurde blockiert.';
        }
    }

    // 2. Blocked words (Exact match auf Wort-Ebene)
    const words = lower.split(/[\s\-_.@,;:!?()[\]{}'"]+/).filter(Boolean);
    const normalizedWords = normalizedLower.split(/[\s,;:!?()[\]{}'"]+/).filter(Boolean);
    const allWords = [...new Set([...words, ...normalizedWords])];

    for (const word of allWords) {
        if (BLOCKED_WORDS.has(word)) {
            return 'Dieser Inhalt verstößt gegen unsere Nutzungsbedingungen und wurde blockiert.';
        }
    }

    return null;
}

/**
 * Prüft Benutzernamen (strenger als normaler Text)
 */
export function checkUsername(firstName?: string, lastName?: string): string | null {
    const parts = [firstName, lastName].filter(Boolean);
    const combined = parts.join(' ');

    // Jeden Teil einzeln prüfen
    for (const part of parts) {
        if (!part) continue;
        const result = checkContent(part);
        if (result) return result;
    }

    // Kombiniert prüfen (z.B. "Jude" + "88")
    const combinedResult = checkContent(combined);
    if (combinedResult) return combinedResult;

    // Verdächtige Zahlenkombinationen in Namen
    if (SUSPICIOUS_NUMBER_PATTERNS.test(combined)) {
        return 'Dieser Benutzername ist nicht erlaubt.';
    }

    // Keine reinen Zahlen als Name
    if (firstName && /^\d+$/.test(firstName.trim())) {
        return 'Vorname darf nicht nur aus Zahlen bestehen.';
    }
    if (lastName && /^\d+$/.test(lastName.trim())) {
        return 'Nachname darf nicht nur aus Zahlen bestehen.';
    }

    // Mindestlänge für echte Namen
    if (firstName && firstName.trim().length < 2) {
        return 'Vorname muss mindestens 2 Zeichen haben.';
    }

    return null;
}

/**
 * Prüft eine E-Mail-Adresse auf verbotene Inhalte und Domains
 */
export function checkEmail(email: string): string | null {
    const [localPart, domain] = email.toLowerCase().split('@');

    // Blocked domains (Wegwerf-Mails + Hate-Domains)
    if (domain && BLOCKED_EMAIL_DOMAINS.has(domain)) {
        return 'Diese E-Mail-Domain ist nicht erlaubt. Bitte verwende eine gültige E-Mail-Adresse.';
    }

    // Check local part for hate content
    if (localPart) {
        const result = checkContent(localPart.replace(/[._\-+]/g, ' '));
        if (result) return 'Diese E-Mail-Adresse enthält unangemessene Inhalte.';
    }

    return null;
}

/**
 * Prüft Inserat-Titel und Beschreibung (umfassend)
 */
export function checkListing(title: string, description: string): string | null {
    const titleResult = checkContent(title);
    if (titleResult) return `Titel: ${titleResult}`;

    const descResult = checkContent(description);
    if (descResult) return `Beschreibung: ${descResult}`;

    // Titel-spezifische Checks
    if (title.trim().length < 5) {
        return 'Der Titel muss mindestens 5 Zeichen lang sein.';
    }

    // Nur Großbuchstaben (SPAM)
    if (title.length > 10 && title === title.toUpperCase() && /[A-Z]/.test(title)) {
        return 'Bitte verwende keine durchgehende Großschreibung im Titel.';
    }

    return null;
}
