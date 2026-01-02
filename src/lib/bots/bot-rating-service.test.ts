import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db/prisma';
import { sseEmitter } from '@/lib/sse/event-emitter';

import { runBotRatingsForRound } from './bot-rating-service';
import * as kimberlyAi from './kimberly-ai';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    round: { findUnique: vi.fn() },
    user: { findMany: vi.fn() },
    rating: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    prophecy: { update: vi.fn() },
  },
}));

vi.mock('@/lib/sse/event-emitter', () => ({
  sseEmitter: { broadcast: vi.fn() },
}));

vi.mock('@/lib/audit/audit-service', () => ({
  createAuditLog: vi.fn(),
}));

vi.mock('./kimberly-ai', () => ({
  generateKimberlyRating: vi.fn(),
}));

const mockRound = {
  id: 'round-1',
  title: 'Test Runde',
  submissionDeadline: new Date(Date.now() - 86400000), // Yesterday
  fulfillmentDate: new Date('2026-12-31'),
  prophecies: [
    { id: 'prophecy-1', title: 'Prophezeiung 1', description: 'Desc 1', creatorId: 'user-1' },
    { id: 'prophecy-2', title: 'Prophezeiung 2', description: null, creatorId: 'user-2' },
  ],
};

const mockBots = [
  {
    id: 'bot-randolf',
    username: 'randolf',
    displayName: 'Randolf der Zufällige',
    status: 'APPROVED',
    isBot: true,
  },
  {
    id: 'bot-kimberly',
    username: 'kimberly',
    displayName: 'Kimberly die Weise',
    status: 'APPROVED',
    isBot: true,
  },
  {
    id: 'bot-meanfred',
    username: 'meanfred',
    displayName: 'Meanfred der Durchschnittliche',
    status: 'APPROVED',
    isBot: true,
  },
];

describe('runBotRatingsForRound', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error when round not found', async () => {
    vi.mocked(prisma.round.findUnique).mockResolvedValue(null);

    await expect(runBotRatingsForRound('non-existent')).rejects.toThrow('Runde nicht gefunden');
  });

  it('throws error when submission phase not ended', async () => {
    vi.mocked(prisma.round.findUnique).mockResolvedValue({
      ...mockRound,
      submissionDeadline: new Date(Date.now() + 86400000), // Tomorrow
    } as never);

    await expect(runBotRatingsForRound('round-1')).rejects.toThrow(
      'Einreichungsphase ist noch nicht beendet'
    );
  });

  it('throws error when no bots found', async () => {
    vi.mocked(prisma.round.findUnique).mockResolvedValue(mockRound as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);

    await expect(runBotRatingsForRound('round-1')).rejects.toThrow('Keine Bot-User gefunden');
  });

  it('creates ratings for all prophecies by all bots', async () => {
    vi.mocked(prisma.round.findUnique).mockResolvedValue(mockRound as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockBots as never);
    vi.mocked(prisma.rating.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.rating.create).mockImplementation((({
      data,
    }: {
      data: { prophecyId: string; userId: string; value: number };
    }) =>
      Promise.resolve({
        id: `rating-${data.prophecyId}-${data.userId}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as never);
    vi.mocked(prisma.rating.findMany).mockResolvedValue([
      { value: 5, user: { isBot: false } },
    ] as never);
    vi.mocked(prisma.prophecy.update).mockImplementation((({ where }: { where: { id: string } }) =>
      Promise.resolve({
        id: where.id,
        title: 'Test',
        description: null,
        creatorId: 'user-1',
        roundId: 'round-1',
        averageRating: 5,
        ratingCount: 1,
        fulfilled: null,
        resolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as never);
    vi.mocked(kimberlyAi.generateKimberlyRating).mockResolvedValue({
      rating: -3,
      reasoning: 'Test Begründung',
    });

    const result = await runBotRatingsForRound('round-1');

    expect(result.roundId).toBe('round-1');
    expect(result.roundTitle).toBe('Test Runde');
    expect(result.results).toHaveLength(3);
    expect(result.totalRatingsCreated).toBe(6); // 3 bots * 2 prophecies
  });

  it('skips already rated prophecies', async () => {
    vi.mocked(prisma.round.findUnique).mockResolvedValue(mockRound as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockBots as never);
    vi.mocked(prisma.rating.findUnique).mockResolvedValue({ id: 'existing-rating' } as never);

    const result = await runBotRatingsForRound('round-1');

    expect(result.totalRatingsCreated).toBe(0);
    expect(result.results[0].ratingsSkipped).toBe(2);
  });

  it('skips own prophecies', async () => {
    const roundWithBotProphecy = {
      ...mockRound,
      prophecies: [
        { id: 'prophecy-1', title: 'Bot Prophecy', description: null, creatorId: 'bot-randolf' },
      ],
    };

    vi.mocked(prisma.round.findUnique).mockResolvedValue(roundWithBotProphecy as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockBots as never);
    vi.mocked(prisma.rating.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.rating.create).mockImplementation((({
      data,
    }: {
      data: { prophecyId: string; userId: string; value: number };
    }) =>
      Promise.resolve({
        id: `rating-${data.prophecyId}-${data.userId}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as never);
    vi.mocked(prisma.rating.findMany).mockResolvedValue([
      { value: 5, user: { isBot: false } },
    ] as never);
    vi.mocked(prisma.prophecy.update).mockResolvedValue({} as never);
    vi.mocked(kimberlyAi.generateKimberlyRating).mockResolvedValue({
      rating: 0,
      reasoning: null,
    });

    const result = await runBotRatingsForRound('round-1');

    // Randolf should skip his own prophecy, Kimberly should rate it
    const randolfResult = result.results.find((r) => r.botName === 'Randolf der Zufällige');
    expect(randolfResult?.ratingsSkipped).toBe(1);
    expect(randolfResult?.ratingsCreated).toBe(0);
  });

  it('broadcasts SSE events for each rating', async () => {
    vi.mocked(prisma.round.findUnique).mockResolvedValue({
      ...mockRound,
      prophecies: [mockRound.prophecies[0]],
    } as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([mockBots[0]] as never); // Only Randolf
    vi.mocked(prisma.rating.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.rating.create).mockResolvedValue({
      id: 'new-rating',
      prophecyId: 'prophecy-1',
      userId: 'bot-randolf',
      value: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(prisma.rating.findMany).mockResolvedValue([
      { value: 5, user: { isBot: false } },
    ] as never);
    vi.mocked(prisma.prophecy.update).mockResolvedValue({
      id: 'prophecy-1',
      title: 'Test',
      description: null,
      creatorId: 'user-1',
      roundId: 'round-1',
      averageRating: 5,
      ratingCount: 1,
      fulfilled: null,
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    await runBotRatingsForRound('round-1');

    expect(sseEmitter.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'prophecy:updated' })
    );
    expect(sseEmitter.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'rating:created' })
    );
  });

  it('generates random ratings between -10 and 10 for Randolf', async () => {
    vi.mocked(prisma.round.findUnique).mockResolvedValue({
      ...mockRound,
      prophecies: [mockRound.prophecies[0]],
    } as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([mockBots[0]] as never); // Only Randolf
    vi.mocked(prisma.rating.findUnique).mockResolvedValue(null);

    let capturedValue: number | undefined;
    vi.mocked(prisma.rating.create).mockImplementation((({
      data,
    }: {
      data: { prophecyId: string; userId: string; value: number };
    }) => {
      capturedValue = data.value;
      return Promise.resolve({
        id: 'new-rating',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }) as never);
    vi.mocked(prisma.rating.findMany).mockResolvedValue([
      { value: 5, user: { isBot: false } },
    ] as never);
    vi.mocked(prisma.prophecy.update).mockResolvedValue({} as never);

    await runBotRatingsForRound('round-1');

    expect(capturedValue).toBeGreaterThanOrEqual(-10);
    expect(capturedValue).toBeLessThanOrEqual(10);
  });

  it('calculates rounded average of human ratings for Meanfred', async () => {
    const mockMeanfred = mockBots.find((b) => b.username === 'meanfred')!;

    vi.mocked(prisma.round.findUnique).mockResolvedValue({
      ...mockRound,
      prophecies: [mockRound.prophecies[0]],
    } as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([mockMeanfred] as never);
    vi.mocked(prisma.rating.findUnique).mockResolvedValue(null);

    let capturedValue: number | undefined;
    vi.mocked(prisma.rating.create).mockImplementation((({
      data,
    }: {
      data: { prophecyId: string; userId: string; value: number };
    }) => {
      capturedValue = data.value;
      return Promise.resolve({
        id: 'new-rating',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }) as never);
    // Human ratings: 3, 5, 7 → Average = 5
    vi.mocked(prisma.rating.findMany).mockResolvedValue([
      { value: 3, user: { isBot: false } },
      { value: 5, user: { isBot: false } },
      { value: 7, user: { isBot: false } },
      { value: -10, user: { isBot: true } }, // Bot rating should be ignored
    ] as never);
    vi.mocked(prisma.prophecy.update).mockResolvedValue({} as never);

    await runBotRatingsForRound('round-1');

    expect(capturedValue).toBe(5); // (3 + 5 + 7) / 3 = 5
  });

  it('rounds Meanfred rating mathematically', async () => {
    const mockMeanfred = mockBots.find((b) => b.username === 'meanfred')!;

    vi.mocked(prisma.round.findUnique).mockResolvedValue({
      ...mockRound,
      prophecies: [mockRound.prophecies[0]],
    } as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([mockMeanfred] as never);
    vi.mocked(prisma.rating.findUnique).mockResolvedValue(null);

    let capturedValue: number | undefined;
    vi.mocked(prisma.rating.create).mockImplementation((({
      data,
    }: {
      data: { prophecyId: string; userId: string; value: number };
    }) => {
      capturedValue = data.value;
      return Promise.resolve({
        id: 'new-rating',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }) as never);
    // Human ratings: 3, 4 → Average = 3.5 → Rounded = 4
    vi.mocked(prisma.rating.findMany).mockResolvedValue([
      { value: 3, user: { isBot: false } },
      { value: 4, user: { isBot: false } },
    ] as never);
    vi.mocked(prisma.prophecy.update).mockResolvedValue({} as never);

    await runBotRatingsForRound('round-1');

    expect(capturedValue).toBe(4); // Math.round(3.5) = 4
  });

  it('returns 0 for Meanfred when no human ratings exist', async () => {
    const mockMeanfred = mockBots.find((b) => b.username === 'meanfred')!;

    vi.mocked(prisma.round.findUnique).mockResolvedValue({
      ...mockRound,
      prophecies: [mockRound.prophecies[0]],
    } as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([mockMeanfred] as never);
    vi.mocked(prisma.rating.findUnique).mockResolvedValue(null);

    let capturedValue: number | undefined;
    vi.mocked(prisma.rating.create).mockImplementation((({
      data,
    }: {
      data: { prophecyId: string; userId: string; value: number };
    }) => {
      capturedValue = data.value;
      return Promise.resolve({
        id: 'new-rating',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }) as never);
    // Only bot ratings, no human ratings
    vi.mocked(prisma.rating.findMany).mockResolvedValue([
      { value: 5, user: { isBot: true } },
    ] as never);
    vi.mocked(prisma.prophecy.update).mockResolvedValue({} as never);

    await runBotRatingsForRound('round-1');

    expect(capturedValue).toBe(0);
  });
});
