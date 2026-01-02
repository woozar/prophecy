import { openai } from '@ai-sdk/openai';
import { Output, generateText } from 'ai';
import { z } from 'zod';

const KimberlyResponseSchema = z.object({
  rating: z
    .number()
    .int()
    .min(-10)
    .max(10)
    .describe('Bewertung von -10 (sicher) bis +10 (unmöglich)'),
  reasoning: z.string().describe('Kurze Begründung in 1-2 Sätzen'),
});

function buildKimberlyPrompt(now: Date, fulfillmentDate: Date): string {
  const nowStr = now.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const fulfillmentStr = fulfillmentDate.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return `Du bist Kimberly, eine weise Seherin, die die Wahrscheinlichkeit von Prophezeiungen einschätzt.

Aktuelles Datum: ${nowStr}
Stichtag der Prophezeiung: ${fulfillmentStr}

Die Prophezeiung muss bis zum Stichtag eintreten, um als erfüllt zu gelten.

Deine Aufgabe: Analysiere die gegebene Prophezeiung und schätze ihre Eintrittswahrscheinlichkeit auf einer Skala von -10 bis +10:

Bewertungsskala:
- -10: Sehr wahrscheinlich (fast sicher, wird eintreten)
- -5: Wahrscheinlich (gute Chancen auf Eintritt)
- 0: Neutral / 50:50 Chance
- +5: Unwahrscheinlich (möglich aber unwahrscheinlich)
- +10: Extrem unwahrscheinlich (physisch/logisch unmöglich)

Berücksichtige:
- Historische Muster und Trends
- Aktuelle Entwicklungen und Kontexte
- Logische Plausibilität
- Verbleibende Zeit bis zum Stichtag

Gib deine Bewertung als Zahl und eine kurze Begründung.`;
}

export interface KimberlyRatingResult {
  rating: number;
  reasoning: string | null;
}

/**
 * Generiert eine KI-basierte Bewertung für Kimberly
 */
export async function generateKimberlyRating(
  title: string,
  description: string | null,
  fulfillmentDate: Date
): Promise<KimberlyRatingResult> {
  const now = new Date();
  const systemPrompt = buildKimberlyPrompt(now, fulfillmentDate);

  const prophecyText = description
    ? `Titel: ${title}\nBeschreibung: ${description}`
    : `Prophezeiung: ${title}`;

  console.log(`[Kimberly] Bewerte Prophezeiung: "${title}"`);
  console.log(`[Kimberly] Stichtag: ${fulfillmentDate.toLocaleDateString('de-DE')}`);

  try {
    const { output } = await generateText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      prompt: prophecyText,
      output: Output.object({ schema: KimberlyResponseSchema }),
      temperature: 0.3,
    });

    const result = output;

    console.log(`[Kimberly] Bewertung: ${result.rating}`);
    console.log(`[Kimberly] Begründung: ${result.reasoning}`);

    return { rating: result.rating, reasoning: result.reasoning };
  } catch (error) {
    console.error('[Kimberly] Fehler bei KI-Bewertung:', error);
    return { rating: 0, reasoning: null };
  }
}
