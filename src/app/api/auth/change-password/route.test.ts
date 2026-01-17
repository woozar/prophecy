import { NextRequest } from 'next/server';

import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db/prisma';

import { POST } from './route';

// Hoisted mock functions for use in vi.mock factories
const { mockSetSessionCookie, mockRequireSession } = vi.hoisted(() => ({
  mockSetSessionCookie: vi.fn(),
  mockRequireSession: vi.fn(),
}));

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

// Mock session utilities
vi.mock('@/lib/auth/session', () => ({
  requireSession: mockRequireSession,
  setSessionCookie: mockSetSessionCookie,
}));

const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  username: 'testuser',
  displayName: 'Test User',
  passwordHash: 'hashed-password',
  forcePasswordChange: false,
  role: 'USER',
  status: 'ACTIVE',
  avatarUrl: null,
  avatarEffect: null,
  avatarEffectColors: null,
  animationsEnabled: true,
  isBot: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('POST /api/auth/change-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(bcrypt.hash).mockResolvedValue('new-hashed-password' as never);
  });

  it('returns 401 when not logged in', async () => {
    mockRequireSession.mockRejectedValue(new Error('Nicht angemeldet'));

    const request = new NextRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: 'oldpass',
        newPassword: 'newpass123',
        confirmPassword: 'newpass123',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Nicht angemeldet');
  });

  it('returns 400 when new password is too short', async () => {
    mockRequireSession.mockResolvedValue({ userId: 'user-1' });

    const request = new NextRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: 'oldpass',
        newPassword: 'short',
        confirmPassword: 'short',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Neues Passwort muss mindestens 8 Zeichen haben');
  });

  it('returns 400 when passwords do not match', async () => {
    mockRequireSession.mockResolvedValue({ userId: 'user-1' });

    const request = new NextRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: 'oldpass',
        newPassword: 'newpass123',
        confirmPassword: 'differentpass',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Passwörter stimmen nicht überein');
  });

  it('returns 404 when user not found', async () => {
    mockRequireSession.mockResolvedValue({ userId: 'user-1' });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: 'oldpass',
        newPassword: 'newpass123',
        confirmPassword: 'newpass123',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Benutzer nicht gefunden');
  });

  it('returns 400 when current password is required but not provided', async () => {
    mockRequireSession.mockResolvedValue({ userId: 'user-1' });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      createMockUser({ forcePasswordChange: false, passwordHash: 'existing-hash' })
    );

    const request = new NextRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        newPassword: 'newpass123',
        confirmPassword: 'newpass123',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Aktuelles Passwort erforderlich');
  });

  it('returns 401 when current password is wrong', async () => {
    mockRequireSession.mockResolvedValue({ userId: 'user-1' });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      createMockUser({ forcePasswordChange: false, passwordHash: 'existing-hash' })
    );
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const request = new NextRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: 'wrongpass',
        newPassword: 'newpass123',
        confirmPassword: 'newpass123',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Aktuelles Passwort ist falsch');
  });

  it('changes password successfully with correct current password', async () => {
    mockRequireSession.mockResolvedValue({ userId: 'user-1' });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      createMockUser({ forcePasswordChange: false, passwordHash: 'existing-hash' })
    );
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(prisma.user.update).mockResolvedValue(createMockUser());

    const request = new NextRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: 'correctpass',
        newPassword: 'newpass123',
        confirmPassword: 'newpass123',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        passwordHash: 'new-hashed-password',
        forcePasswordChange: false,
      },
    });
    expect(mockSetSessionCookie).toHaveBeenCalled();
  });

  it('does not require current password when forcePasswordChange is true', async () => {
    mockRequireSession.mockResolvedValue({ userId: 'user-1' });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      createMockUser({ forcePasswordChange: true, passwordHash: 'existing-hash' })
    );
    vi.mocked(prisma.user.update).mockResolvedValue(createMockUser());

    const request = new NextRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        newPassword: 'newpass123',
        confirmPassword: 'newpass123',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('does not require current password when user has no password yet', async () => {
    mockRequireSession.mockResolvedValue({ userId: 'user-1' });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      createMockUser({ forcePasswordChange: false, passwordHash: null })
    );
    vi.mocked(prisma.user.update).mockResolvedValue(createMockUser());

    const request = new NextRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        newPassword: 'newpass123',
        confirmPassword: 'newpass123',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('resets forcePasswordChange flag after changing password', async () => {
    mockRequireSession.mockResolvedValue({ userId: 'user-1' });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      createMockUser({ forcePasswordChange: true })
    );
    vi.mocked(prisma.user.update).mockResolvedValue(createMockUser());

    const request = new NextRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        newPassword: 'newpass123',
        confirmPassword: 'newpass123',
      }),
    });
    await POST(request);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          forcePasswordChange: false,
        }),
      })
    );
  });

  it('refreshes session cookie after password change', async () => {
    mockRequireSession.mockResolvedValue({ userId: 'user-1' });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      createMockUser({ forcePasswordChange: true })
    );
    vi.mocked(prisma.user.update).mockResolvedValue(createMockUser());

    const request = new NextRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        newPassword: 'newpass123',
        confirmPassword: 'newpass123',
      }),
    });
    await POST(request);

    expect(mockSetSessionCookie).toHaveBeenCalledWith({
      id: 'user-1',
      username: 'testuser',
      displayName: 'Test User',
      role: 'USER',
    });
  });
});
