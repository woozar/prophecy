import { NextRequest, NextResponse } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { findExistingUser } from '@/lib/auth/registration';
import { prisma } from '@/lib/db/prisma';

import { POST } from './route';

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
  },
}));

const { mockDuplicateResponse, mockSuccessResponse, mockErrorResponse } = vi.hoisted(() => ({
  mockDuplicateResponse: vi.fn(),
  mockSuccessResponse: vi.fn(),
  mockErrorResponse: vi.fn(),
}));

// Mock registration utilities
vi.mock('@/lib/auth/registration', () => ({
  findExistingUser: vi.fn(),
  normalizeUsername: vi.fn((u: string) => u.toLowerCase().replaceAll(/[^a-z0-9_-]/g, '')),
  duplicateUsernameResponse: mockDuplicateResponse,
  setPendingUserCookie: vi.fn(),
  registrationSuccessResponse: mockSuccessResponse,
  registrationErrorResponse: mockErrorResponse,
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
  role: 'USER',
  status: 'PENDING',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('POST /api/auth/register/password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDuplicateResponse.mockImplementation(() =>
      NextResponse.json({ error: 'Dieser Benutzername ist bereits vergeben' }, { status: 409 })
    );
    mockSuccessResponse.mockImplementation((user) => NextResponse.json({ success: true, user }));
    mockErrorResponse.mockImplementation(() =>
      NextResponse.json({ error: 'Fehler bei der Registrierung' }, { status: 500 })
    );
  });

  it('returns 400 when username is missing', async () => {
    const request = new NextRequest('http://localhost/api/auth/register/password', {
      method: 'POST',
      body: JSON.stringify({ password: 'password123' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Benutzername und Passwort erforderlich');
  });

  it('returns 400 when password is missing', async () => {
    const request = new NextRequest('http://localhost/api/auth/register/password', {
      method: 'POST',
      body: JSON.stringify({ username: 'testuser' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Benutzername und Passwort erforderlich');
  });

  it('returns 400 when username is too short', async () => {
    const request = new NextRequest('http://localhost/api/auth/register/password', {
      method: 'POST',
      body: JSON.stringify({ username: 'ab', password: 'password123' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Benutzername muss mindestens 3 Zeichen lang sein');
  });

  it('returns 400 when password is too short', async () => {
    const request = new NextRequest('http://localhost/api/auth/register/password', {
      method: 'POST',
      body: JSON.stringify({ username: 'testuser', password: '1234567' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Passwort muss mindestens 8 Zeichen lang sein');
  });

  it('returns 409 when username already exists', async () => {
    vi.mocked(findExistingUser).mockResolvedValue(createMockUser() as never);

    const request = new NextRequest('http://localhost/api/auth/register/password', {
      method: 'POST',
      body: JSON.stringify({ username: 'testuser', password: 'password123' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('Dieser Benutzername ist bereits vergeben');
  });

  it('creates user successfully', async () => {
    vi.mocked(findExistingUser).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(createMockUser());

    const request = new NextRequest('http://localhost/api/auth/register/password', {
      method: 'POST',
      body: JSON.stringify({
        username: 'newuser',
        password: 'password123',
        displayName: 'New User',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('uses username as displayName when not provided', async () => {
    vi.mocked(findExistingUser).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(createMockUser());

    const request = new NextRequest('http://localhost/api/auth/register/password', {
      method: 'POST',
      body: JSON.stringify({ username: 'newuser', password: 'password123' }),
    });
    await POST(request);

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          displayName: 'newuser',
        }),
      })
    );
  });
});
