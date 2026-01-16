import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { validateSession } from '@/lib/auth/admin-validation';
import { prisma } from '@/lib/db/prisma';
import { calculateRoundStatistics } from '@/lib/statistics/calculate';

import { GET } from './route';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    round: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/admin-validation', () => ({
  validateSession: vi.fn(),
}));

vi.mock('@/lib/statistics/calculate', () => ({
  calculateRoundStatistics: vi.fn(),
}));

const mockSession = {
  userId: 'user-1',
  username: 'testuser',
  role: 'USER' as const,
  status: 'APPROVED' as const,
};
const mockAdminSession = {
  userId: 'admin-1',
  username: 'admin',
  role: 'ADMIN' as const,
  status: 'APPROVED' as const,
};

const createMockRound = (overrides = {}) => ({
  id: 'round-1',
  title: 'Test Round',
  submissionDeadline: new Date('2025-12-01'),
  ratingDeadline: new Date('2025-12-15'),
  fulfillmentDate: new Date('2025-12-31'),
  resultsPublishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createMockStatistics = () => ({
  roundId: 'round-1',
  totalProphecies: 10,
  totalAcceptedProphecies: 8,
  resolvedProphecies: 8,
  isComplete: true,
  creatorStats: [],
  raterStats: [],
});

const createParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe('GET /api/rounds/[id]/statistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(validateSession).mockResolvedValue({
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) as never,
    });

    const request = new NextRequest('http://localhost/api/rounds/1/statistics');
    const response = await GET(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when round not found', async () => {
    vi.mocked(validateSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.round.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/rounds/1/statistics');
    const response = await GET(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Runde nicht gefunden');
  });

  it('returns 403 for regular user when results not published', async () => {
    vi.mocked(validateSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.round.findUnique).mockResolvedValue(createMockRound());

    const request = new NextRequest('http://localhost/api/rounds/1/statistics');
    const response = await GET(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Ergebnisse wurden noch nicht veröffentlicht');
  });

  it('returns statistics for regular user when results are published', async () => {
    vi.mocked(validateSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.round.findUnique).mockResolvedValue(
      createMockRound({ resultsPublishedAt: new Date() })
    );
    vi.mocked(calculateRoundStatistics).mockResolvedValue(createMockStatistics());

    const request = new NextRequest('http://localhost/api/rounds/1/statistics');
    const response = await GET(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.statistics).toBeDefined();
    expect(data.statistics.totalProphecies).toBe(10);
  });

  it('returns statistics for admin even when results not published', async () => {
    vi.mocked(validateSession).mockResolvedValue({ session: mockAdminSession });
    vi.mocked(prisma.round.findUnique).mockResolvedValue(createMockRound());
    vi.mocked(calculateRoundStatistics).mockResolvedValue(createMockStatistics());

    const request = new NextRequest('http://localhost/api/rounds/1/statistics');
    const response = await GET(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.statistics).toBeDefined();
    expect(data.statistics.totalProphecies).toBe(10);
  });

  it('returns 500 on database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(validateSession).mockResolvedValue({ session: mockAdminSession });
    vi.mocked(prisma.round.findUnique).mockRejectedValue(new Error('DB Error'));

    const request = new NextRequest('http://localhost/api/rounds/1/statistics');
    const response = await GET(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Laden der Statistiken');
    consoleSpy.mockRestore();
  });
});
