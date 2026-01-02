import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

// Mock session
let mockSession: { userId: string; role: string } | null = null;

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(async () => mockSession),
}));

// Mock bot-rating-service
const mockRunBotRatingsForRound = vi.fn();

vi.mock('@/lib/bots/bot-rating-service', () => ({
  runBotRatingsForRound: (...args: unknown[]) => mockRunBotRatingsForRound(...args),
}));

describe('POST /api/admin/rounds/[id]/bot-ratings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
  });

  it('returns 401 when not logged in', async () => {
    mockSession = null;

    const request = new Request('http://localhost/api/admin/rounds/round-1/bot-ratings', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'round-1' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when user is not admin', async () => {
    mockSession = { userId: 'user-1', role: 'USER' };

    const request = new Request('http://localhost/api/admin/rounds/round-1/bot-ratings', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'round-1' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('runs bot ratings successfully and returns result', async () => {
    mockSession = { userId: 'admin-1', role: 'ADMIN' };

    const mockResult = {
      roundId: 'round-1',
      roundTitle: 'Test Runde',
      results: [
        { botId: 'bot-1', botName: 'Randolf', ratingsCreated: 5, ratingsSkipped: 0, errors: [] },
        { botId: 'bot-2', botName: 'Kimberly', ratingsCreated: 5, ratingsSkipped: 0, errors: [] },
      ],
      totalRatingsCreated: 10,
    };

    mockRunBotRatingsForRound.mockResolvedValue(mockResult);

    const request = new Request('http://localhost/api/admin/rounds/round-1/bot-ratings', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'round-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('10 Bot-Bewertungen erstellt');
    expect(data.result).toEqual(mockResult);
    expect(mockRunBotRatingsForRound).toHaveBeenCalledWith('round-1');
  });

  it('returns 400 when round not found', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSession = { userId: 'admin-1', role: 'ADMIN' };
    mockRunBotRatingsForRound.mockRejectedValue(new Error('Runde nicht gefunden'));

    const request = new Request('http://localhost/api/admin/rounds/non-existent/bot-ratings', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'non-existent' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Runde nicht gefunden');
    consoleSpy.mockRestore();
  });

  it('returns 400 when submission phase not ended', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSession = { userId: 'admin-1', role: 'ADMIN' };
    mockRunBotRatingsForRound.mockRejectedValue(
      new Error('Einreichungsphase ist noch nicht beendet')
    );

    const request = new Request('http://localhost/api/admin/rounds/round-1/bot-ratings', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'round-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Einreichungsphase ist noch nicht beendet');
    consoleSpy.mockRestore();
  });

  it('returns 400 when no bots found', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSession = { userId: 'admin-1', role: 'ADMIN' };
    mockRunBotRatingsForRound.mockRejectedValue(new Error('Keine Bot-User gefunden'));

    const request = new Request('http://localhost/api/admin/rounds/round-1/bot-ratings', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'round-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Keine Bot-User gefunden');
    consoleSpy.mockRestore();
  });

  it('handles non-Error exceptions gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSession = { userId: 'admin-1', role: 'ADMIN' };
    mockRunBotRatingsForRound.mockRejectedValue('Unknown error');

    const request = new Request('http://localhost/api/admin/rounds/round-1/bot-ratings', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'round-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Fehler bei Bot-Bewertungen');
    consoleSpy.mockRestore();
  });

  it('passes the correct round id to the service', async () => {
    mockSession = { userId: 'admin-1', role: 'ADMIN' };
    mockRunBotRatingsForRound.mockResolvedValue({
      roundId: 'specific-round-id',
      roundTitle: 'Specific Round',
      results: [],
      totalRatingsCreated: 0,
    });

    const request = new Request('http://localhost/api/admin/rounds/specific-round-id/bot-ratings', {
      method: 'POST',
    });

    await POST(request, { params: Promise.resolve({ id: 'specific-round-id' }) });

    expect(mockRunBotRatingsForRound).toHaveBeenCalledWith('specific-round-id');
  });
});
