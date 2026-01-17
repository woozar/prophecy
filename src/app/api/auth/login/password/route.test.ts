import { NextRequest, NextResponse } from 'next/server';

import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db/prisma';

import { POST } from './route';

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
  },
}));

const { mockLoginSuccessResponse, mockLoginErrorResponse } = vi.hoisted(() => ({
  mockLoginSuccessResponse: vi.fn(),
  mockLoginErrorResponse: vi.fn(),
}));

// Mock session utilities
vi.mock('@/lib/auth/session', () => ({
  setSessionCookie: vi.fn(),
  loginSuccessResponse: mockLoginSuccessResponse,
  loginErrorResponse: mockLoginErrorResponse,
}));

const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  username: 'testuser',
  displayName: 'Test User',
  passwordHash: 'hashed-password',
  forcePasswordChange: false,
  avatarUrl: null,
  avatarEffect: null,
  avatarEffectColors: null,
  animationsEnabled: true,
  role: 'USER',
  status: 'APPROVED',
  isBot: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('POST /api/auth/login/password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoginSuccessResponse.mockImplementation((user) =>
      NextResponse.json({ success: true, user })
    );
    mockLoginErrorResponse.mockImplementation(() =>
      NextResponse.json({ error: 'Fehler bei der Anmeldung' }, { status: 500 })
    );
  });

  it('returns 400 when username is missing', async () => {
    const request = new NextRequest('http://localhost/api/auth/login/password', {
      method: 'POST',
      body: JSON.stringify({ password: 'password123' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Benutzername erforderlich');
  });

  it('returns 400 when password is missing', async () => {
    const request = new NextRequest('http://localhost/api/auth/login/password', {
      method: 'POST',
      body: JSON.stringify({ username: 'testuser' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Passwort erforderlich');
  });

  it('returns 401 when user not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/auth/login/password', {
      method: 'POST',
      body: JSON.stringify({ username: 'testuser', password: 'password123' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Benutzername oder Passwort falsch');
  });

  it('returns 400 when user has no password', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(createMockUser({ passwordHash: null }));

    const request = new NextRequest('http://localhost/api/auth/login/password', {
      method: 'POST',
      body: JSON.stringify({ username: 'testuser', password: 'password123' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Kein Passwort gesetzt. Bitte mit Passkey anmelden.');
  });

  it('returns 401 when password is wrong', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(createMockUser());
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const request = new NextRequest('http://localhost/api/auth/login/password', {
      method: 'POST',
      body: JSON.stringify({ username: 'testuser', password: 'wrongpassword' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Benutzername oder Passwort falsch');
  });

  it('returns 403 when user is pending', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(createMockUser({ status: 'PENDING' }));
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const request = new NextRequest('http://localhost/api/auth/login/password', {
      method: 'POST',
      body: JSON.stringify({ username: 'testuser', password: 'password123' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Dein Konto wurde noch nicht freigegeben');
  });

  it('returns 403 when user is suspended', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(createMockUser({ status: 'SUSPENDED' }));
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const request = new NextRequest('http://localhost/api/auth/login/password', {
      method: 'POST',
      body: JSON.stringify({ username: 'testuser', password: 'password123' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Dein Konto ist gesperrt');
  });

  it('logs in successfully with valid credentials', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(createMockUser());
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const request = new NextRequest('http://localhost/api/auth/login/password', {
      method: 'POST',
      body: JSON.stringify({ username: 'testuser', password: 'password123' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
