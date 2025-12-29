import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { prisma } from '@/lib/db/prisma';

import { ApiError } from './errors';
import { getProphecyWithAccessCheck } from './prophecy-access';

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    prophecy: {
      findUnique: vi.fn(),
    },
  },
}));

const mockFindUnique = prisma.prophecy.findUnique as Mock;

describe('getProphecyWithAccessCheck', () => {
  const userId = 'user-123';
  const prophecyId = 'prophecy-456';

  const futureDate = new Date(Date.now() + 86400000); // tomorrow
  const pastDate = new Date(Date.now() - 86400000); // yesterday

  const mockProphecy = {
    id: prophecyId,
    title: 'Test Prophecy',
    description: 'Description',
    creatorId: userId,
    roundId: 'round-789',
    averageRating: null,
    ratingCount: 0,
    createdAt: new Date(),
    round: {
      id: 'round-789',
      title: 'Test Round',
      submissionDeadline: futureDate,
      ratingDeadline: futureDate,
      fulfillmentDate: futureDate,
      createdAt: new Date(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns prophecy when all checks pass', async () => {
    mockFindUnique.mockResolvedValue(mockProphecy);

    const result = await getProphecyWithAccessCheck(prophecyId, userId);

    expect(result).toEqual(mockProphecy);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: prophecyId },
      include: { round: true },
    });
  });

  it('throws 404 when prophecy not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(getProphecyWithAccessCheck(prophecyId, userId)).rejects.toThrow(ApiError);

    try {
      await getProphecyWithAccessCheck(prophecyId, userId);
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(404);
      expect((error as ApiError).message).toBe('Prophezeiung nicht gefunden');
    }
  });

  it('throws 403 when user is not owner', async () => {
    mockFindUnique.mockResolvedValue(mockProphecy);

    await expect(getProphecyWithAccessCheck(prophecyId, 'other-user')).rejects.toThrow(ApiError);

    try {
      await getProphecyWithAccessCheck(prophecyId, 'other-user');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(403);
    }
  });

  it('skips owner check when requireOwner is false', async () => {
    mockFindUnique.mockResolvedValue(mockProphecy);

    const result = await getProphecyWithAccessCheck(prophecyId, 'other-user', {
      requireOwner: false,
    });

    expect(result).toEqual(mockProphecy);
  });

  it('throws 400 when deadline passed', async () => {
    const expiredProphecy = {
      ...mockProphecy,
      round: {
        ...mockProphecy.round,
        submissionDeadline: pastDate,
      },
    };
    mockFindUnique.mockResolvedValue(expiredProphecy);

    await expect(getProphecyWithAccessCheck(prophecyId, userId)).rejects.toThrow(ApiError);

    try {
      await getProphecyWithAccessCheck(prophecyId, userId);
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(400);
    }
  });

  it('uses custom deadline error message', async () => {
    const expiredProphecy = {
      ...mockProphecy,
      round: {
        ...mockProphecy.round,
        submissionDeadline: pastDate,
      },
    };
    mockFindUnique.mockResolvedValue(expiredProphecy);

    try {
      await getProphecyWithAccessCheck(prophecyId, userId, {
        deadlineErrorMessage: 'Custom deadline message',
      });
    } catch (error) {
      expect((error as ApiError).message).toBe('Custom deadline message');
    }
  });

  it('skips deadline check when checkDeadline is false', async () => {
    const expiredProphecy = {
      ...mockProphecy,
      round: {
        ...mockProphecy.round,
        submissionDeadline: pastDate,
      },
    };
    mockFindUnique.mockResolvedValue(expiredProphecy);

    const result = await getProphecyWithAccessCheck(prophecyId, userId, {
      checkDeadline: false,
    });

    expect(result).toEqual(expiredProphecy);
  });
});
