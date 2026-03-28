import { prisma } from '../utils/prisma.js';

// Claude API direkt ueber fetch - kein zusaetzliches SDK noetig
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const AI_ENABLED = !!ANTHROPIC_API_KEY;
const CLAUDE_MODEL = 'claude-sonnet-4-6';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

interface AiSuggestion {
  improvedTitle?: string;
  improvedDescription?: string;
  suggestedCategory?: string;
  suggestedCondition?: string;
  suggestedPrice?: { min: number; max: number };
  qualityHints?: string[];
}

interface AiRiskResult {
  riskScore: number;
  flags: string[];
  reasons: string[];
}

interface AiModerationResult {
  isProblematic: boolean;
  category: string;
  confidence: number;
  summary: string;
}

async function callClaude(systemPrompt: string, userMessage: string): Promise<string | null> {
  if (!AI_ENABLED) return null;
  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    if (!response.ok) {
      console.error('Claude API error:', response.status, await response.text());
      return null;
    }
    const data = await response.json();
    const textBlock = data.content?.find((b: any) => b.type === 'text');
    return textBlock?.text ?? null;
  } catch (error) {
    console.error('Claude API call failed:', error);
    return null;
  }
}

function parseJsonFromClaude(text: string | null): any {
  if (!text) return null;
  // Claude gibt manchmal JSON in Markdown-Bloecken zurueck
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  const jsonStr = (jsonMatch[1] || text).trim();
  try {
    return JSON.parse(jsonStr);
  } catch {
    console.error('Failed to parse Claude response as JSON:', jsonStr.substring(0, 200));
    return null;
  }
}

export const aiService = {
  isEnabled(): boolean {
    return AI_ENABLED;
  },

  // 1. KI-gestuetzte Inserat-Erstellung
  async suggestListingImprovements(title: string, description: string, categorySlug?: string): Promise<AiSuggestion | null> {
    const systemPrompt = `Du bist ein Experte fuer Online-Marktplatz-Inserate auf Ehren-Deal, einem deutschen Marktplatz.
Analysiere das Inserat und gib Verbesserungsvorschlaege als JSON zurueck.

Antworte NUR mit validem JSON in diesem Format:
{
  "improvedTitle": "verbesserter Titel oder null",
  "improvedDescription": "verbesserte Beschreibung oder null",
  "suggestedCategory": "vorgeschlagene Kategorie-Slug oder null",
  "suggestedCondition": "NEW|LIKE_NEW|GOOD|ACCEPTABLE|DEFECTIVE oder null",
  "qualityHints": ["Hinweis 1", "Hinweis 2"]
}

Kategorien: elektronik, haus-garten, mode, familie-baby-kind, fahrzeuge, freizeit-hobby, immobilien, dienstleistungen, tiere, sonstiges`;

    const userMsg = `Titel: ${title}\nBeschreibung: ${description}${categorySlug ? `\nKategorie: ${categorySlug}` : ''}`;

    const response = await callClaude(systemPrompt, userMsg);
    const result = parseJsonFromClaude(response);
    if (!result) return null;

    // Log AI check
    try {
      await prisma.aiCheck.create({
        data: {
          checkType: 'listing_suggestion',
          targetType: 'listing',
          targetId: 'draft',
          score: null,
          result: result,
          flagged: false,
          reviewed: false,
        },
      });
    } catch (e) {
      console.error('Failed to log AI check:', e);
    }

    return result as AiSuggestion;
  },

  // 2. KI-gestuetzte Inseratspruefung
  async checkListingQuality(listingId: string): Promise<{ qualityScore: number; riskScore: number; suggestions: any } | null> {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { images: true },
    });
    if (!listing) return null;

    const sellerProfile = await prisma.profile.findUnique({
      where: { id: listing.sellerId },
    });

    const systemPrompt = `Du bist ein Qualitaets- und Sicherheitspruefer fuer den Marktplatz Ehren-Deal.
Pruefe das Inserat auf Qualitaet und Risiko. Antworte NUR als JSON:
{
  "qualityScore": 0.0-1.0,
  "riskScore": 0.0-1.0,
  "suggestions": {
    "quality": ["Qualitaetshinweis 1"],
    "risk": ["Risikohinweis 1"],
    "improvement": ["Verbesserungsvorschlag 1"]
  }
}

qualityScore: 1.0 = perfektes Inserat, 0.0 = sehr schlecht
riskScore: 0.0 = sicher, 1.0 = sehr verdaechtig`;

    const userMsg = `Titel: ${listing.title}
Beschreibung: ${listing.description}
Preis: ${listing.price / 100} EUR
Zustand: ${listing.condition}
Anzahl Bilder: ${listing.images.length}
Verkaeufer Trust-Level: ${sellerProfile?.trustLevel ?? 'NEW'}
Verkaeufer Deals: ${sellerProfile?.totalDeals ?? 0}`;

    const response = await callClaude(systemPrompt, userMsg);
    const result = parseJsonFromClaude(response);
    if (!result) return null;

    // Update listing
    try {
      await prisma.listing.update({
        where: { id: listingId },
        data: {
          aiQualityScore: result.qualityScore,
          aiRiskScore: result.riskScore,
          aiSuggestions: result.suggestions,
        },
      });

      const flagged = result.riskScore > 0.7;
      await prisma.aiCheck.create({
        data: {
          checkType: 'listing_quality',
          targetType: 'listing',
          targetId: listingId,
          score: result.qualityScore,
          result: result,
          flagged,
          reviewed: false,
        },
      });
    } catch (e) {
      console.error('Failed to update listing AI scores:', e);
    }

    return result;
  },

  // 3. Scam- und Sicherheitsanalyse
  async analyzeRisk(targetType: 'listing' | 'message' | 'user', targetId: string, content: string): Promise<AiRiskResult | null> {
    const systemPrompt = `Du bist ein Sicherheitsanalyst fuer den Marktplatz Ehren-Deal.
Analysiere den Inhalt auf Betrug, Scam und verdaechtige Muster. Antworte NUR als JSON:
{
  "riskScore": 0.0-1.0,
  "flags": ["FLAG_1", "FLAG_2"],
  "reasons": ["Grund 1", "Grund 2"]
}

Moegliche Flags: SCAM_PATTERN, PHISHING, PRICE_MANIPULATION, FAKE_PROFILE, SPAM, HARASSMENT, PROHIBITED_CONTENT
riskScore: 0.0 = sicher, 1.0 = sehr verdaechtig`;

    const userMsg = `Typ: ${targetType}\nInhalt: ${content}`;

    const response = await callClaude(systemPrompt, userMsg);
    const result = parseJsonFromClaude(response) as AiRiskResult | null;
    if (!result) return null;

    try {
      const flagged = result.riskScore > 0.7;
      await prisma.aiCheck.create({
        data: {
          checkType: 'scam_detection',
          targetType,
          targetId,
          score: result.riskScore,
          result: result as any,
          flagged,
          reviewed: false,
        },
      });

      if (flagged && targetType === 'listing') {
        console.warn(`AI flagged listing ${targetId} with risk score ${result.riskScore}: ${result.reasons.join(', ')}`);
      }
    } catch (e) {
      console.error('Failed to log risk analysis:', e);
    }

    return result;
  },

  // 4. Moderationshilfe
  async moderateContent(content: string, contentType: 'listing' | 'message' | 'review'): Promise<AiModerationResult | null> {
    const systemPrompt = `Du bist Content-Moderator fuer den Marktplatz Ehren-Deal.
Pruefe den Inhalt auf Verstoesse. Antworte NUR als JSON:
{
  "isProblematic": true/false,
  "category": "SPAM|OFFENSIVE|SCAM|PROHIBITED|SAFE",
  "confidence": 0.0-1.0,
  "summary": "Kurze Zusammenfassung der Moderation"
}`;

    const userMsg = `Inhaltstyp: ${contentType}\nInhalt: ${content}`;

    const response = await callClaude(systemPrompt, userMsg);
    return parseJsonFromClaude(response) as AiModerationResult | null;
  },

  // 5. Preisempfehlung
  async suggestPrice(title: string, description: string, condition: string, categorySlug: string): Promise<{ min: number; max: number; confidence: number } | null> {
    const systemPrompt = `Du bist ein Preisexperte fuer den deutschen Gebrauchtwarenmarkt.
Schaetze einen fairen Preisbereich in Euro-Cent. Antworte NUR als JSON:
{
  "min": 1000,
  "max": 5000,
  "confidence": 0.7
}

min/max sind in Cent (1000 = 10.00 EUR). confidence: 0.0-1.0
Markiere die Empfehlung als Schaetzung, keine feste Wahrheit.`;

    const userMsg = `Titel: ${title}\nBeschreibung: ${description}\nZustand: ${condition}\nKategorie: ${categorySlug}`;

    const response = await callClaude(systemPrompt, userMsg);
    return parseJsonFromClaude(response);
  },

  // 6. Moderations-Queue-Priorisierung
  async prioritizeReports(): Promise<void> {
    if (!AI_ENABLED) return;
    try {
      const pendingReports = await prisma.report.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });

      for (const report of pendingReports) {
        await this.analyzeRisk(
          report.targetType.toLowerCase() as 'listing' | 'message' | 'user',
          report.targetId,
          report.description || ''
        );
      }
    } catch (error) {
      console.error('AI report prioritization failed (non-critical):', error);
    }
  },
};
