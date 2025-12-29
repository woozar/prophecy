import { NextRequest } from 'next/server';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSession } from '@/lib/auth/session';
import { sseEmitter } from '@/lib/sse/event-emitter';

import { GET } from './route';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/sse/event-emitter', () => ({
  sseEmitter: {
    addClient: vi.fn(),
    removeClient: vi.fn(),
  },
}));

describe('GET /api/sse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/sse');
    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(await response.text()).toBe('Unauthorized');
  });

  it('returns SSE stream response for authenticated user', async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: 'user-1',
      username: 'testuser',
      role: 'USER',
      iat: Date.now(),
    });

    const request = new NextRequest('http://localhost/api/sse');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform');
    expect(response.headers.get('Connection')).toBe('keep-alive');
    expect(response.headers.get('X-Accel-Buffering')).toBe('no');
  });

  it('registers client with SSE emitter', async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: 'user-1',
      username: 'testuser',
      role: 'USER',
      iat: Date.now(),
    });

    const request = new NextRequest('http://localhost/api/sse');
    const response = await GET(request);

    // Read first chunk to trigger stream start
    const reader = response.body?.getReader();
    if (reader) {
      await reader.read();
    }

    expect(sseEmitter.addClient).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1-\d+$/),
      expect.any(Object)
    );
  });

  it('sends connection message on start', async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: 'user-1',
      username: 'testuser',
      role: 'USER',
      iat: Date.now(),
    });

    const request = new NextRequest('http://localhost/api/sse');
    const response = await GET(request);

    const reader = response.body?.getReader();
    if (reader) {
      const { value } = await reader.read();
      const text = new TextDecoder().decode(value);
      expect(text).toBe(': connected\n\n');
    }
  });

  it('removes client on abort', async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: 'user-1',
      username: 'testuser',
      role: 'USER',
      iat: Date.now(),
    });

    const controller = new AbortController();
    const request = new NextRequest('http://localhost/api/sse', {
      signal: controller.signal,
    });
    const response = await GET(request);

    // Read to trigger stream start
    const reader = response.body?.getReader();
    if (reader) {
      await reader.read();
    }

    // Abort the request
    controller.abort();

    // Verify the request was aborted
    expect(controller.signal.aborted).toBe(true);
  });

  it('removes client on stream cancel', async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: 'user-1',
      username: 'testuser',
      role: 'USER',
      iat: Date.now(),
    });

    const request = new NextRequest('http://localhost/api/sse');
    const response = await GET(request);

    // Cancel the stream
    await response.body?.cancel();

    expect(sseEmitter.removeClient).toHaveBeenCalled();
  });

  it('generates unique client ID with timestamp', async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: 'user-1',
      username: 'testuser',
      role: 'USER',
      iat: Date.now(),
    });

    const now = Date.now();
    vi.setSystemTime(now);

    const request = new NextRequest('http://localhost/api/sse');
    const response = await GET(request);

    const reader = response.body?.getReader();
    if (reader) {
      await reader.read();
    }

    expect(sseEmitter.addClient).toHaveBeenCalledWith(`user-1-${now}`, expect.any(Object));
  });
});
