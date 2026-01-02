import { User } from '@prisma/client';

import { transformProphecyToResponse } from '@/lib/api/prophecy-transform';
import { createAuditLog } from '@/lib/audit/audit-service';
import { prisma } from '@/lib/db/prisma';
import { sseEmitter } from '@/lib/sse/event-emitter';

import { generateKimberlyRating } from './kimberly-ai';

export interface BotRatingResult {
  botId: string;
  botName: string;
  ratingsCreated: number;
  ratingsSkipped: number;
  errors: string[];
}

export interface RunBotRatingsResult {
  roundId: string;
  roundTitle: string;
  results: BotRatingResult[];
  totalRatingsCreated: number;
}

interface ProphecyInfo {
  id: string;
  title: string;
  description: string | null;
  creatorId: string;
}

interface RatingGenerationResult {
  value: number;
  reasoning: string | null;
}

/**
 * Generiert zufällige Bewertung für Randolf (-10 bis +10)
 */
function generateRandolfRating(): number {
  return Math.floor(Math.random() * 21) - 10;
}

/**
 * Berechnet den Durchschnitt der menschlichen Bewertungen für eine Prophezeiung
 */
async function calculateHumanMeanRating(prophecyId: string): Promise<number> {
  const ratings = await prisma.rating.findMany({
    where: { prophecyId },
    select: { value: true, user: { select: { isBot: true } } },
  });

  const humanNonZeroRatings = ratings.filter((r) => r.value !== 0 && !r.user.isBot);

  if (humanNonZeroRatings.length === 0) {
    return 0;
  }

  const sum = humanNonZeroRatings.reduce((acc, r) => acc + r.value, 0);
  return Math.round(sum / humanNonZeroRatings.length);
}

/**
 * Generiert die Bewertung basierend auf Bot-Typ
 */
async function generateBotRating(
  bot: User,
  prophecy: ProphecyInfo,
  fulfillmentDate: Date
): Promise<RatingGenerationResult> {
  if (bot.username === 'randolf') {
    const value = generateRandolfRating();
    console.log(`[Randolf] Zufällige Bewertung für "${prophecy.title}": ${value}`);
    return { value, reasoning: null };
  }

  if (bot.username === 'kimberly') {
    const kimberlyResult = await generateKimberlyRating(
      prophecy.title,
      prophecy.description,
      fulfillmentDate
    );
    return { value: kimberlyResult.rating, reasoning: kimberlyResult.reasoning };
  }

  if (bot.username === 'meanfred') {
    const value = await calculateHumanMeanRating(prophecy.id);
    console.log(`[Meanfred] Durchschnittsbewertung für "${prophecy.title}": ${value}`);
    return { value, reasoning: 'Durchschnitt der menschlichen Bewertungen' };
  }

  return { value: 0, reasoning: null };
}

/**
 * Prüft ob die Bewertung übersprungen werden soll
 */
async function shouldSkipRating(
  bot: User,
  prophecy: ProphecyInfo
): Promise<{ skip: boolean; reason?: string }> {
  if (prophecy.creatorId === bot.id) {
    console.log(`[Bot-Ratings] Überspringe eigene Prophezeiung: "${prophecy.title}"`);
    return { skip: true, reason: 'own' };
  }

  const existingRating = await prisma.rating.findUnique({
    where: {
      prophecyId_userId: {
        prophecyId: prophecy.id,
        userId: bot.id,
      },
    },
  });

  if (existingRating) {
    console.log(`[Bot-Ratings] Bereits bewertet: "${prophecy.title}"`);
    return { skip: true, reason: 'existing' };
  }

  return { skip: false };
}

/**
 * Berechnet average rating und count für eine Prophezeiung (ohne Bot-Bewertungen)
 */
async function recalculateAverageRating(prophecyId: string) {
  const ratings = await prisma.rating.findMany({
    where: { prophecyId },
    select: { value: true, user: { select: { isBot: true } } },
  });

  // Filter out zero-value ratings (unrated) and bot ratings
  const humanNonZeroRatings = ratings.filter((r) => r.value !== 0 && !r.user.isBot);
  const ratingCount = humanNonZeroRatings.length;
  const averageRating =
    ratingCount > 0 ? humanNonZeroRatings.reduce((sum, r) => sum + r.value, 0) / ratingCount : null;

  return prisma.prophecy.update({
    where: { id: prophecyId },
    data: { averageRating, ratingCount },
  });
}

/**
 * Erstellt Rating und sendet SSE-Updates
 */
async function createRatingAndBroadcast(
  bot: User,
  prophecy: ProphecyInfo,
  ratingResult: RatingGenerationResult
): Promise<void> {
  const rating = await prisma.rating.create({
    data: {
      prophecyId: prophecy.id,
      userId: bot.id,
      value: ratingResult.value,
    },
  });

  const botName = bot.displayName || bot.username;
  const auditContext = ratingResult.reasoning
    ? `Bot-Bewertung durch ${botName}: ${ratingResult.reasoning}`
    : `Bot-Bewertung durch ${botName}`;

  await createAuditLog({
    entityType: 'RATING',
    entityId: rating.id,
    action: 'CREATE',
    prophecyId: prophecy.id,
    userId: bot.id,
    newValue: { value: rating.value },
    context: auditContext,
  });

  const updatedProphecy = await recalculateAverageRating(prophecy.id);

  sseEmitter.broadcast({
    type: 'prophecy:updated',
    data: transformProphecyToResponse(updatedProphecy),
  });

  sseEmitter.broadcast({
    type: 'rating:created',
    data: {
      id: rating.id,
      value: rating.value,
      prophecyId: rating.prophecyId,
      userId: rating.userId,
      createdAt: rating.createdAt.toISOString(),
    },
  });
}

/**
 * Verarbeitet alle Prophezeiungen für einen Bot
 */
async function processBotRatings(
  bot: User,
  prophecies: ProphecyInfo[],
  fulfillmentDate: Date
): Promise<BotRatingResult> {
  console.log(`[Bot-Ratings] Starte Bewertungen für ${bot.displayName || bot.username}`);

  const result: BotRatingResult = {
    botId: bot.id,
    botName: bot.displayName || bot.username,
    ratingsCreated: 0,
    ratingsSkipped: 0,
    errors: [],
  };

  for (const prophecy of prophecies) {
    try {
      const skipCheck = await shouldSkipRating(bot, prophecy);
      if (skipCheck.skip) {
        result.ratingsSkipped++;
        continue;
      }

      const ratingResult = await generateBotRating(bot, prophecy, fulfillmentDate);
      await createRatingAndBroadcast(bot, prophecy, ratingResult);
      result.ratingsCreated++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unbekannt';
      result.errors.push(`Fehler bei Prophezeiung "${prophecy.title}": ${errorMsg}`);
    }
  }

  return result;
}

/**
 * Führt Bot-Bewertungen für eine Runde aus
 */
export async function runBotRatingsForRound(roundId: string): Promise<RunBotRatingsResult> {
  console.log(`[Bot-Ratings] Starte für Runde: ${roundId}`);

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      prophecies: {
        select: {
          id: true,
          title: true,
          description: true,
          creatorId: true,
        },
      },
    },
  });

  if (!round) {
    throw new Error('Runde nicht gefunden');
  }

  console.log(`[Bot-Ratings] Runde "${round.title}" mit ${round.prophecies.length} Prophezeiungen`);

  if (new Date() < round.submissionDeadline) {
    throw new Error('Einreichungsphase ist noch nicht beendet');
  }

  const bots = await prisma.user.findMany({
    where: { isBot: true, status: 'APPROVED' },
  });

  console.log(
    `[Bot-Ratings] ${bots.length} Bots gefunden: ${bots.map((b) => b.username).join(', ')}`
  );

  if (bots.length === 0) {
    throw new Error('Keine Bot-User gefunden. Bitte führe "npx prisma db seed" aus.');
  }

  const results: BotRatingResult[] = [];

  for (const bot of bots) {
    const result = await processBotRatings(bot, round.prophecies, round.fulfillmentDate);
    results.push(result);
  }

  return {
    roundId: round.id,
    roundTitle: round.title,
    results,
    totalRatingsCreated: results.reduce((sum, r) => sum + r.ratingsCreated, 0),
  };
}
