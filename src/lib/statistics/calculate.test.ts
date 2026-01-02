import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db/prisma';

import { calculateRoundStatistics } from './calculate';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    prophecy: {
      findMany: vi.fn(),
    },
  },
}));

const createMockUser = (id: string, username: string) => ({
  id,
  username,
  displayName: `Display ${username}`,
  avatarUrl: null,
  isBot: false,
});

const createMockProphecy = (overrides = {}) => ({
  id: 'prophecy-1',
  title: 'Test Prophecy',
  description: 'Description',
  creatorId: 'user-1',
  roundId: 'round-1',
  createdAt: new Date(),
  fulfilled: null,
  resolvedAt: null,
  averageRating: null,
  ratingCount: 0,
  creator: createMockUser('user-1', 'creator1'),
  ratings: [],
  ...overrides,
});

describe('calculateRoundStatistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty stats when no prophecies exist', async () => {
    vi.mocked(prisma.prophecy.findMany).mockResolvedValue([]);

    const result = await calculateRoundStatistics('round-1');

    expect(result.roundId).toBe('round-1');
    expect(result.totalAcceptedProphecies).toBe(0);
    expect(result.resolvedProphecies).toBe(0);
    expect(result.isComplete).toBe(true);
    expect(result.creatorStats).toHaveLength(0);
    expect(result.raterStats).toHaveLength(0);
  });

  it('calculates creator stats correctly', async () => {
    vi.mocked(prisma.prophecy.findMany).mockResolvedValue([
      createMockProphecy({
        id: 'p1',
        averageRating: 5,
        fulfilled: true,
        creator: createMockUser('user-1', 'creator1'),
      }),
      createMockProphecy({
        id: 'p2',
        averageRating: 3,
        fulfilled: false,
        creator: createMockUser('user-1', 'creator1'),
      }),
      createMockProphecy({
        id: 'p3',
        averageRating: null,
        fulfilled: null,
        creator: createMockUser('user-1', 'creator1'),
      }),
    ] as never);

    const result = await calculateRoundStatistics('round-1');

    expect(result.creatorStats).toHaveLength(1);
    const creator = result.creatorStats[0];
    expect(creator.totalProphecies).toBe(3);
    expect(creator.acceptedProphecies).toBe(2);
    expect(creator.fulfilledProphecies).toBe(1);
    expect(creator.totalScore).toBe(5);
    expect(creator.maxPossibleScore).toBe(8);
    expect(creator.scorePercentage).toBe(63);
  });

  it('calculates rater stats correctly', async () => {
    vi.mocked(prisma.prophecy.findMany).mockResolvedValue([
      createMockProphecy({
        id: 'p1',
        averageRating: 5,
        fulfilled: true,
        ratings: [
          { value: 3, user: createMockUser('rater-1', 'rater1') },
          { value: -2, user: createMockUser('rater-2', 'rater2') },
        ],
      }),
      createMockProphecy({
        id: 'p2',
        averageRating: 3,
        fulfilled: false,
        ratings: [
          { value: -4, user: createMockUser('rater-1', 'rater1') },
          { value: 2, user: createMockUser('rater-2', 'rater2') },
        ],
      }),
    ] as never);

    const result = await calculateRoundStatistics('round-1');

    expect(result.raterStats).toHaveLength(2);

    // rater-1: +3 correct (fulfilled), -4 correct (not fulfilled) = +7 correct, 0 incorrect
    const rater1 = result.raterStats.find((r) => r.userId === 'rater-1');
    expect(rater1).toBeDefined();
    expect(rater1!.correctPoints).toBe(7);
    expect(rater1!.incorrectPoints).toBe(0);
    expect(rater1!.netScore).toBe(7);

    // rater-2: -2 incorrect (fulfilled), +2 incorrect (not fulfilled) = 0 correct, 4 incorrect
    const rater2 = result.raterStats.find((r) => r.userId === 'rater-2');
    expect(rater2).toBeDefined();
    expect(rater2!.correctPoints).toBe(0);
    expect(rater2!.incorrectPoints).toBe(4);
    expect(rater2!.netScore).toBe(-4);
  });

  it('excludes zero ratings from rater stats', async () => {
    vi.mocked(prisma.prophecy.findMany).mockResolvedValue([
      createMockProphecy({
        id: 'p1',
        averageRating: 5,
        fulfilled: true,
        ratings: [
          { value: 0, user: createMockUser('rater-1', 'rater1') },
          { value: 3, user: createMockUser('rater-2', 'rater2') },
        ],
      }),
    ] as never);

    const result = await calculateRoundStatistics('round-1');

    expect(result.raterStats).toHaveLength(1);
    expect(result.raterStats[0].userId).toBe('rater-2');
  });

  it('sorts creators by totalScore descending', async () => {
    vi.mocked(prisma.prophecy.findMany).mockResolvedValue([
      createMockProphecy({
        id: 'p1',
        averageRating: 5,
        fulfilled: true,
        creator: createMockUser('user-1', 'lowScore'),
      }),
      createMockProphecy({
        id: 'p2',
        averageRating: 10,
        fulfilled: true,
        creator: createMockUser('user-2', 'highScore'),
      }),
    ] as never);

    const result = await calculateRoundStatistics('round-1');

    expect(result.creatorStats[0].userId).toBe('user-2');
    expect(result.creatorStats[1].userId).toBe('user-1');
  });

  it('sorts raters by netScore descending', async () => {
    vi.mocked(prisma.prophecy.findMany).mockResolvedValue([
      createMockProphecy({
        id: 'p1',
        averageRating: 5,
        fulfilled: true,
        ratings: [
          { value: 2, user: createMockUser('rater-1', 'low') },
          { value: 5, user: createMockUser('rater-2', 'high') },
        ],
      }),
    ] as never);

    const result = await calculateRoundStatistics('round-1');

    expect(result.raterStats[0].userId).toBe('rater-2');
    expect(result.raterStats[1].userId).toBe('rater-1');
  });

  it('calculates isComplete correctly', async () => {
    vi.mocked(prisma.prophecy.findMany).mockResolvedValue([
      createMockProphecy({ id: 'p1', averageRating: 5, fulfilled: true }),
      createMockProphecy({ id: 'p2', averageRating: 3, fulfilled: null }),
    ] as never);

    const result = await calculateRoundStatistics('round-1');

    expect(result.totalAcceptedProphecies).toBe(2);
    expect(result.resolvedProphecies).toBe(1);
    expect(result.isComplete).toBe(false);
  });

  it('marks as complete when all prophecies resolved', async () => {
    vi.mocked(prisma.prophecy.findMany).mockResolvedValue([
      createMockProphecy({ id: 'p1', averageRating: 5, fulfilled: true }),
      createMockProphecy({ id: 'p2', averageRating: 3, fulfilled: false }),
    ] as never);

    const result = await calculateRoundStatistics('round-1');

    expect(result.isComplete).toBe(true);
  });
});
