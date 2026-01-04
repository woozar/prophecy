import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSession } from '@/lib/auth/session';
import { getBadgeHolders } from '@/lib/badges/badge-service';

import { GET } from './route';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/badges/badge-service', () => ({
  getBadgeHolders: vi.fn(),
}));

describe('GET /api/badges/[id]/holders', () => {
  const mockSession = {
    userId: 'user-1',
    username: 'testuser',
    role: 'USER' as const,
    iat: Date.now(),
  };

  const mockHolders = [
    {
      id: 'user-badge-1',
      userId: 'user-1',
      badgeId: 'badge-1',
      earnedAt: new Date('2025-01-05'),
      user: {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        avatarUrl: '/avatars/test.webp',
        avatarEffect: 'glow',
        avatarEffectColors: '["cyan","teal"]',
      },
    },
    {
      id: 'user-badge-2',
      userId: 'user-2',
      badgeId: 'badge-1',
      earnedAt: new Date('2025-01-10'),
      user: {
        id: 'user-2',
        username: 'anotheruser',
        displayName: null,
        avatarUrl: null,
        avatarEffect: null,
        avatarEffectColors: null,
      },
    },
  ];

  const createRequest = () => new NextRequest('http://localhost/api/badges/badge-1/holders');

  const createParams = (id: string) => ({ params: Promise.resolve({ id }) });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await GET(createRequest(), createParams('badge-1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns badge holders for authenticated user', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(getBadgeHolders).mockResolvedValue(mockHolders);

    const response = await GET(createRequest(), createParams('badge-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.holders).toHaveLength(2);
    expect(data.holders[0].user.username).toBe('testuser');
    expect(data.holders[0].earnedAt).toBe('2025-01-05T00:00:00.000Z');
    expect(data.holders[1].user.displayName).toBeNull();
  });

  it('calls getBadgeHolders with correct badge id', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(getBadgeHolders).mockResolvedValue([]);

    await GET(createRequest(), createParams('specific-badge-id'));

    expect(getBadgeHolders).toHaveBeenCalledWith('specific-badge-id');
  });

  it('returns empty array when no holders', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(getBadgeHolders).mockResolvedValue([]);

    const response = await GET(createRequest(), createParams('badge-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.holders).toEqual([]);
  });

  it('returns 500 on service error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(getBadgeHolders).mockRejectedValue(new Error('Service error'));

    const response = await GET(createRequest(), createParams('badge-1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Laden der Badge-Besitzer');
    consoleSpy.mockRestore();
  });
});
