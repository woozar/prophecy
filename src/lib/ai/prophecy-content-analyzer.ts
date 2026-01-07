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
  'politics',
  'nerd',
  'weather',
  'celebrity',
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
- politics: Politik, Wahlen, Parteien, Regierungen, Gesetze, internationale Beziehungen
- nerd: Nischen-Spezialwissen, technische Details die nur Experten kennen, obskure Fakten, sehr spezifische Metriken oder Fachbegriffe die Laien nicht verstehen würden
- weather: Wetter, Wettervorhersagen, Temperaturen, Niederschlag, Unwetter, Jahreszeiten, meteorologische Ereignisse
- celebrity: Prominente, Stars, Klatsch und Tratsch, Boulevard, Promi-Beziehungen, Scheidungen, Skandale, rotes Tuch

WICHTIG:
- Die meisten Prophezeiungen gehören zu KEINER Kategorie - gib dann ein leeres Array zurück
- Sei konservativ: Nur eindeutige Zuordnungen, keine Vermutungen
- Eine Prophezeiung kann mehreren Kategorien angehören
- "Konfidenz" bezieht sich auf die Sicherheit deiner Klassifikation
- Gib immer eine kurze Begründung (1-2 Sätze), warum die Kategorien zugeordnet wurden oder nicht

Beispiele:
- "Deutschland wird die EM gewinnen" -> categories: ["sport"], reasoning: "Bezieht sich auf die Fußball-Europameisterschaft."
- "Bitcoin erreicht 100.000$" -> categories: ["finance"], reasoning: "Thematisiert Kryptowährungskurse."
- "Dieses Jahr gibt es weiße Weihnachten in München" -> categories: ["weather"], reasoning: "Prophezeiung über Schneefall zu einem bestimmten Zeitpunkt."
- "Taylor Swift und Travis Kelce werden sich trennen" -> categories: ["celebrity"], reasoning: "Klatsch über Promi-Beziehung."
- "Mein Nachbar wird schwanger" -> categories: [], reasoning: "Persönliches Ereignis ohne Promi-Bezug."
- "Die CDU wird die nächste Bundestagswahl gewinnen" -> categories: ["politics"], reasoning: "Bezieht sich auf Wahlen und Parteien."
- "Perowskit-Solarzellen werden 30% Wirkungsgrad erreichen" -> categories: ["nerd", "science"], reasoning: "Sehr technisches Detail über einen spezifischen Wirkungsgrad einer Nischen-Technologie, das nur Experten verstehen."
- "SpaceX wird eine Rakete erfolgreich landen" -> categories: ["science"], reasoning: "Raumfahrt/Technologie, aber kein nerd-Thema da Mainstream-bekannt."
- "Die weltweite Produktion von Palmöl wird im vergleich zum Vorjahr rückläufig sein" -> categories: ["environment"], reasoning: "Bezieht sich auf Nachhaltigkeit und Umweltauswirkungen der Palmöl-Industrie."`;

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
  politics: 'content_politics',
  nerd: 'content_nerd',
  weather: 'content_weather',
  celebrity: 'content_celebrity',
};
