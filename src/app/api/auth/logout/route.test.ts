import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

const mockDelete = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      delete: mockDelete,
    })
  ),
}));

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes session cookie', async () => {
    await POST();

    expect(mockDelete).toHaveBeenCalledWith('session');
  });

  it('deletes pendingUser cookie', async () => {
    await POST();

    expect(mockDelete).toHaveBeenCalledWith('pendingUser');
  });

  it('returns success response', async () => {
    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
