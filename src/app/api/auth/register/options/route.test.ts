import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db/prisma';

import { POST } from './route';

// Mock webauthn
vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: vi.fn().mockResolvedValue({
    challenge: 'test-challenge',
    rp: { name: 'Test', id: 'localhost' },
    user: { id: 'temp-id', name: 'testuser', displayName: 'Test User' },
  }),
}));

vi.mock('@/lib/auth/webauthn', () => ({
  webauthnConfig: {
    rpName: 'Test',
    rpID: 'localhost',
    timeout: 60000,
  },
  storeChallenge: vi.fn(),
}));

describe('POST /api/auth/register/options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when username is too short', async () => {
    const request = new NextRequest('http://localhost/api/auth/register/options', {
      method: 'POST',
      body: JSON.stringify({ username: 'ab' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Benutzername muss mindestens 3 Zeichen haben');
  });

  it('returns 400 when username is missing', async () => {
    const request = new NextRequest('http://localhost/api/auth/register/options', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Benutzername muss mindestens 3 Zeichen haben');
  });

  it('returns 409 when username already exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'existing-user',
      username: 'testuser',
    } as never);

    const request = new NextRequest('http://localhost/api/auth/register/options', {
      method: 'POST',
      body: JSON.stringify({ username: 'testuser' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('Dieser Benutzername ist bereits vergeben');
  });

  it('returns registration options for valid username', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/auth/register/options', {
      method: 'POST',
      body: JSON.stringify({ username: 'newuser', displayName: 'New User' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.options).toBeDefined();
    expect(data.tempUserId).toBeDefined();
    expect(data.username).toBe('newuser');
    expect(data.displayName).toBe('New User');
  });

  it('uses username as displayName when not provided', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/auth/register/options', {
      method: 'POST',
      body: JSON.stringify({ username: 'newuser' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.displayName).toBe('newuser');
  });
});
