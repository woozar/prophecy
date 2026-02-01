import { after } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { validateAdminSession } from '@/lib/auth/admin-validation';
import { runBotRatingsForRound } from '@/lib/bots/bot-rating-service';

import { POST } from './route';

vi.mock('@/lib/auth/admin-validation', () => ({
  validateAdminSession: vi.fn(),
}));

vi.mock('@/lib/bots/bot-rating-service', () => ({
  runBotRatingsForRound: vi.fn(),
}));

vi.mock('next/server', async (importOriginal) => {
  const original = await importOriginal<typeof import('next/server')>();
  return {
    ...original,
    after: vi.fn((cb: () => void) => cb()),
  };
});

const mockAdminSession = {
  userId: 'admin-1',
  username: 'admin',
  role: 'ADMIN' as const,
  status: 'APPROVED' as const,
};

describe('POST /api/admin/rounds/[id]/bot-ratings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) as never,
    });

    const request = new Request('http://localhost/api/admin/rounds/round-1/bot-ratings', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'round-1' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when user is not admin', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({
      error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }) as never,
    });

    const request = new Request('http://localhost/api/admin/rounds/round-1/bot-ratings', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'round-1' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns 200 immediately and schedules bot ratings via after()', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockAdminSession });
    vi.mocked(runBotRatingsForRound).mockResolvedValue({
      roundId: 'round-1',
      roundTitle: 'Test Runde',
      results: [],
      totalRatingsCreated: 10,
    });

    const request = new Request('http://localhost/api/admin/rounds/round-1/bot-ratings', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'round-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Bot-Bewertungen wurden gestartet');
    expect(after).toHaveBeenCalledOnce();
    expect(runBotRatingsForRound).toHaveBeenCalledWith('round-1');
  });

  it('passes the correct round id to the service', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockAdminSession });
    vi.mocked(runBotRatingsForRound).mockResolvedValue({
      roundId: 'specific-round-id',
      roundTitle: 'Specific Round',
      results: [],
      totalRatingsCreated: 0,
    });

    const request = new Request('http://localhost/api/admin/rounds/specific-round-id/bot-ratings', {
      method: 'POST',
    });

    await POST(request, { params: Promise.resolve({ id: 'specific-round-id' }) });

    expect(runBotRatingsForRound).toHaveBeenCalledWith('specific-round-id');
  });

  it('logs errors from background processing without affecting response', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockAdminSession });
    vi.mocked(runBotRatingsForRound).mockRejectedValue(new Error('Runde nicht gefunden'));

    const request = new Request('http://localhost/api/admin/rounds/round-1/bot-ratings', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'round-1' }) });
    const data = await response.json();

    // Response is still 200 since processing happens in background
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Wait for the after() callback to complete
    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('[Bot-Ratings] Fehler:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
