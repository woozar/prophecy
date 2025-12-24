import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcrypt';

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
  },
}));

// Mock session utilities
vi.mock('@/lib/auth/session', () => ({
  setSessionCookie: vi.fn(),
  loginSuccessResponse: vi.fn().mockImplementation((user) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ success: true, user });
  }),
  loginErrorResponse: vi.fn().mockImplementation(() => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: 'Fehler bei der Anmeldung' }, { status: 500 });
  }),
}));

const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  username: 'testuser',
  displayName: 'Test User',
  role: 'USER',
  status: 'APPROVED',
  passwordHash: 'hashed-password',
  ...overrides,
});

describe('POST /api/auth/login/password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when username is missing', async () => {
    const request = new NextRequest('http://localhost/api/auth/login/password', {
      method: 'POST',
      body: JSON.stringify({ password: 'password123' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Benutzername und Passwort erforderlich');
  });

  it('returns 400 when password is missing', async () => {
    const request = new NextRequest('http://localhost/api/auth/login/password', {
      method: 'POST',
      body: JSON.stringify({ username: 'testuser' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Benutzername und Passwort erforderlich');
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
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      createMockUser({ passwordHash: null })
    );

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
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      createMockUser({ status: 'PENDING' })
    );
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
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      createMockUser({ status: 'SUSPENDED' })
    );
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
