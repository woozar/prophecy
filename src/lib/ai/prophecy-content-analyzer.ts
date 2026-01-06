import { openai } from '@ai-sdk/openai';
import { Output, generateText } from 'ai';
import { z } from 'zod';

export const CONTENT_CATEGORIES = [
  'sexy',
  'morbid',
  'sport',
  'environment',
  'science',
  'finance',
] as const;

export type ContentCategory = (typeof CONTENT_CATEGORIES)[number];

const ContentAnalysisSchema = z.object({
  categories: z
    .array(z.enum(CONTENT_CATEGORIES))
    .describe('Array der erkannten Kategorien (kann leer sein)'),
  confidence: z.number().min(0).max(1).describe('Konfidenz der Klassifikation (0-1)'),
  reasoning: z.string().describe('Kurze Begründung der Klassifikation in 1-2 Sätzen'),
});

export type ContentAnalysisResult = z.infer<typeof ContentAnalysisSchema>;

const SYSTEM_PROMPT = `Du bist ein Inhalts-Klassifikator für Prophezeiungen.
Analysiere den gegebenen Text und bestimme, ob er in eine oder mehrere der folgenden Kategorien fällt:

KATEGORIEN:
- sexy: Anzügliche, erotische oder romantisch-körperliche Inhalte
- morbid: Tod, Krankheit, Unfälle, düstere oder makabere Themen
- sport: Sportveranstaltungen, Wettkämpfe, Athleten, Teams, Ligen
- environment: Umweltschutz, Klimawandel, Nachhaltigkeit, Natur
- science: Wissenschaft, Forschung, Technologie, Entdeckungen, Medizin
- finance: Börse, Aktien, Wirtschaft, Geld, Kryptowährung, Investments

WICHTIG:
- Die meisten Prophezeiungen gehören zu KEINER Kategorie - gib dann ein leeres Array zurück
- Sei konservativ: Nur eindeutige Zuordnungen, keine Vermutungen
- Eine Prophezeiung kann mehreren Kategorien angehören
- "Konfidenz" bezieht sich auf die Sicherheit deiner Klassifikation
- Gib immer eine kurze Begründung (1-2 Sätze), warum die Kategorien zugeordnet wurden oder nicht

Beispiele:
- "Deutschland wird die EM gewinnen" -> categories: ["sport"], reasoning: "Bezieht sich auf die Fußball-Europameisterschaft."
- "Bitcoin erreicht 100.000$" -> categories: ["finance"], reasoning: "Thematisiert Kryptowährungskurse."
- "Das Wetter wird schlecht" -> categories: [], reasoning: "Allgemeine Wettervorhersage ohne spezifischen Themenbezug."
- "XY wird schwanger" -> categories: [], reasoning: "Persönliches Ereignis ohne eindeutige Kategoriezuordnung."`;

export async function analyzeContentCategories(
  title: string,
  description: string | null
): Promise<ContentAnalysisResult> {
  const prophecyText = description
    ? `Titel: ${title}\nBeschreibung: ${description}`
    : `Prophezeiung: ${title}`;

  console.log(`[ContentAnalyzer] Analysiere: "${title}"`);

  try {
    const { output } = await generateText({
      model: openai('gpt-4o-mini'),
      system: SYSTEM_PROMPT,
      prompt: prophecyText,
      output: Output.object({ schema: ContentAnalysisSchema }),
      temperature: 0.1,
    });

    console.log(
      `[ContentAnalyzer] Erkannte Kategorien: ${output.categories.join(', ') || 'keine'} (Konfidenz: ${output.confidence})`
    );

    return output;
  } catch (error) {
    console.error('[ContentAnalyzer] Fehler bei Analyse:', error);
    return { categories: [], confidence: 0, reasoning: 'Analyse fehlgeschlagen' };
  }
}

export const CATEGORY_TO_BADGE: Record<ContentCategory, string> = {
  sexy: 'content_sexy',
  morbid: 'content_morbid',
  sport: 'content_sport',
  environment: 'content_environment',
  science: 'content_science',
  finance: 'content_finance',
};
