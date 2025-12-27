import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/db/prisma';

// Mock webauthn
vi.mock('@simplewebauthn/server', () => ({
  generateAuthenticationOptions: vi.fn().mockResolvedValue({
    challenge: 'test-challenge',
    rpId: 'localhost',
  }),
}));

vi.mock('@/lib/auth/webauthn', () => ({
  webauthnConfig: {
    rpID: 'localhost',
    timeout: 60000,
  },
  storeChallenge: vi.fn(),
}));

const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  username: 'testuser',
  displayName: 'Test User',
  passwordHash: null,
  avatarUrl: null,
  avatarEffect: null,
  avatarEffectColors: null,
  role: 'USER',
  status: 'APPROVED',
  createdAt: new Date(),
  updatedAt: new Date(),
  authenticators: [
    {
      credentialID: 'cred-1',
      transports: 'usb,nfc',
    },
  ],
  ...overrides,
});

describe('POST /api/auth/login/options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns options without username (discoverable credentials)', async () => {
    const request = new NextRequest('http://localhost/api/auth/login/options', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.options).toBeDefined();
    expect(data.challengeKey).toBeDefined();
  });

  it('returns 404 when user not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/auth/login/options', {
      method: 'POST',
      body: JSON.stringify({ username: 'nonexistent' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Benutzer nicht gefunden');
  });

  it('returns 403 when user not approved', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(createMockUser({ status: 'PENDING' }));

    const request = new NextRequest('http://localhost/api/auth/login/options', {
      method: 'POST',
      body: JSON.stringify({ username: 'testuser' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Dein Konto wurde noch nicht freigegeben');
  });

  it('returns 400 when user has no passkeys', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(createMockUser({ authenticators: [] }));

    const request = new NextRequest('http://localhost/api/auth/login/options', {
      method: 'POST',
      body: JSON.stringify({ username: 'testuser' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Kein Passkey für diesen Benutzer registriert');
  });

  it('returns options with allowCredentials for valid user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(createMockUser());

    const request = new NextRequest('http://localhost/api/auth/login/options', {
      method: 'POST',
      body: JSON.stringify({ username: 'testuser' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.options).toBeDefined();
    expect(data.challengeKey).toBe('user-1');
  });
});
