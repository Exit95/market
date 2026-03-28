import { prisma } from '../utils/prisma.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

/**
 * Semantische Suche - erweitert die bestehende Keyword-Suche
 *
 * Aktuell: Fuzzy-Matching und Synonym-Erkennung via Claude
 * Zukuenftig: Vector Embeddings fuer echte semantische Suche
 *
 * Architektur-Entscheidung:
 * - Phase 1 (aktuell): Claude analysiert Suchquery und generiert erweiterte Keywords
 * - Phase 2: Embeddings in separater Tabelle/pgvector, Cosine-Similarity
 */

interface SearchExpansion {
  expandedTerms: string[];
  suggestedCategory?: string;
  correctedQuery?: string;
}

export const searchService = {
  /**
   * Erweitert eine Suchanfrage um Synonyme und korrigierte Begriffe
   */
  async expandQuery(query: string): Promise<SearchExpansion | null> {
    if (!ANTHROPIC_API_KEY || query.length < 3) return null;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 256,
          system: `Du bist ein Suchoptimierungs-Assistent fuer einen deutschen Marktplatz.
Erweitere die Suchanfrage um Synonyme, aehnliche Begriffe und korrigiere Tippfehler.
Antworte NUR als JSON:
{
  "expandedTerms": ["term1", "term2"],
  "suggestedCategory": "kategorie-slug oder null",
  "correctedQuery": "korrigierter Suchbegriff oder null"
}
Kategorien: elektronik, haus-garten, mode, familie-baby-kind, fahrzeuge, freizeit-hobby, immobilien, dienstleistungen, tiere, sonstiges`,
          messages: [{ role: 'user', content: `Suchanfrage: "${query}"` }],
        }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      const text = data.content?.[0]?.text;
      if (!text) return null;

      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
      return JSON.parse((jsonMatch[1] || text).trim());
    } catch {
      return null;
    }
  },

  /**
   * Erweiterte Suche: kombiniert Keyword-Suche mit semantischer Erweiterung
   */
  async search(query: string, options: {
    categoryId?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const { categoryId, limit = 24, offset = 0 } = options;

    // Semantische Erweiterung (async, non-blocking)
    const expansion = await this.expandQuery(query);

    // Alle Suchbegriffe sammeln
    const searchTerms = [query];
    if (expansion?.correctedQuery) searchTerms.push(expansion.correctedQuery);
    if (expansion?.expandedTerms) searchTerms.push(...expansion.expandedTerms);

    // Deduplizieren
    const uniqueTerms = [...new Set(searchTerms.map(t => t.toLowerCase()))];

    // OR-Bedingungen fuer alle Terme
    const searchConditions = uniqueTerms.flatMap(term => [
      { title: { contains: term } },
      { description: { contains: term } },
    ]);

    const where: any = {
      status: 'ACTIVE',
      OR: searchConditions,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    } else if (expansion?.suggestedCategory) {
      // Optional: Kategorie-Vorschlag nutzen
      const cat = await prisma.category.findUnique({
        where: { slug: expansion.suggestedCategory },
      });
      if (cat) {
        // Nicht filtern, aber als Hinweis zurueckgeben
      }
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          images: { orderBy: { position: 'asc' }, take: 1 },
          seller: {
            select: {
              id: true, displayName: true, avatarUrl: true,
              trustLevel: true, avgRating: true,
            },
          },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    return {
      listings,
      total,
      expansion: expansion ? {
        correctedQuery: expansion.correctedQuery,
        suggestedCategory: expansion.suggestedCategory,
      } : null,
    };
  },
};
