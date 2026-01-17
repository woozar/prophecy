import { NextRequest, NextResponse } from 'next/server';

import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearChallenge, getChallenge } from '@/lib/auth/webauthn';
import { prisma } from '@/lib/db/prisma';

import { POST } from './route';

vi.mock('@/lib/auth/webauthn', () => ({
  webauthnConfig: {
    rpID: 'localhost',
    origin: 'http://localhost:3000',
  },
  getChallenge: vi.fn(),
  clearChallenge: vi.fn(),
}));

const { mockDuplicateResponse, mockSuccessResponse, mockErrorResponse } = vi.hoisted(() => ({
  mockDuplicateResponse: vi.fn(),
  mockSuccessResponse: vi.fn(),
  mockErrorResponse: vi.fn(),
}));

vi.mock('@/lib/auth/registration', () => ({
  normalizeUsername: vi.fn((u: string) => u.toLowerCase().replaceAll(/[^a-z0-9_-]/g, '')),
  duplicateUsernameResponse: mockDuplicateResponse,
  setPendingUserCookie: vi.fn(),
  registrationSuccessResponse: mockSuccessResponse,
  registrationErrorResponse: mockErrorResponse,
}));

vi.mock('@simplewebauthn/server', () => ({
  verifyRegistrationResponse: vi.fn(),
}));

describe('POST /api/auth/register/verify', () => {
  const mockCredential = {
    id: 'credential-base64',
    rawId: 'credential-base64',
    type: 'public-key',
    response: {
      clientDataJSON: 'mock-client-data',
      attestationObject: 'mock-attestation',
      transports: ['usb', 'nfc'],
    },
  };

  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    displayName: 'Test User',
    passwordHash: null,
    forcePasswordChange: false,
    avatarUrl: null,
    avatarEffect: null,
    avatarEffectColors: null,
    animationsEnabled: true,
    role: 'USER',
    status: 'PENDING',
    isBot: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    authenticators: [{ id: 'auth-1' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDuplicateResponse.mockImplementation(() =>
      NextResponse.json({ error: 'Dieser Benutzername ist bereits vergeben' }, { status: 409 })
    );
    mockSuccessResponse.mockImplementation((user) => NextResponse.json({ success: true, user }));
    mockErrorResponse.mockImplementation((error, message) => {
      console.error(message, error);
      return NextResponse.json({ error: 'Registrierung fehlgeschlagen' }, { status: 500 });
    });
  });

  it('returns 400 when credential is missing', async () => {
    const request = new NextRequest('http://localhost/api/auth/register/verify', {
      method: 'POST',
      body: JSON.stringify({ tempUserId: 'temp-1', username: 'testuser' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Ungültige Anfrage');
  });

  it('returns 400 when tempUserId is missing', async () => {
    const request = new NextRequest('http://localhost/api/auth/register/verify', {
      method: 'POST',
      body: JSON.stringify({ credential: mockCredential, username: 'testuser' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Ungültige Anfrage');
  });

  it('returns 400 when username is missing', async () => {
    const request = new NextRequest('http://localhost/api/auth/register/verify', {
      method: 'POST',
      body: JSON.stringify({ credential: mockCredential, tempUserId: 'temp-1' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Ungültige Anfrage');
  });

  it('returns 400 when challenge is expired', async () => {
    vi.mocked(getChallenge).mockReturnValue(null);

    const request = new NextRequest('http://localhost/api/auth/register/verify', {
      method: 'POST',
      body: JSON.stringify({
        credential: mockCredential,
        tempUserId: 'expired-temp',
        username: 'testuser',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Registrierung abgelaufen. Bitte erneut versuchen.');
  });

  it('returns 400 when verification fails', async () => {
    vi.mocked(getChallenge).mockReturnValue('valid-challenge');
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: false,
      registrationInfo: undefined,
    });

    const request = new NextRequest('http://localhost/api/auth/register/verify', {
      method: 'POST',
      body: JSON.stringify({
        credential: mockCredential,
        tempUserId: 'temp-1',
        username: 'testuser',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Passkey-Verifizierung fehlgeschlagen');
  });

  it('returns 409 when username is already taken', async () => {
    vi.mocked(getChallenge).mockReturnValue('valid-challenge');
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: true,
      registrationInfo: {
        fmt: 'none',
        aaguid: '00000000-0000-0000-0000-000000000000',
        credential: {
          id: 'cred-id',
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 0,
        },
        credentialType: 'public-key',
        attestationObject: new Uint8Array([1, 2, 3]),
        userVerified: true,
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
        origin: 'http://localhost:3000',
        rpID: 'localhost',
      },
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, id: 'existing-user' });

    const request = new NextRequest('http://localhost/api/auth/register/verify', {
      method: 'POST',
      body: JSON.stringify({
        credential: mockCredential,
        tempUserId: 'temp-1',
        username: 'testuser',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('Dieser Benutzername ist bereits vergeben');
  });

  it('successfully registers user', async () => {
    vi.mocked(getChallenge).mockReturnValue('valid-challenge');
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: true,
      registrationInfo: {
        fmt: 'none',
        aaguid: '00000000-0000-0000-0000-000000000000',
        credential: {
          id: 'cred-id',
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 0,
        },
        credentialType: 'public-key',
        attestationObject: new Uint8Array([1, 2, 3]),
        userVerified: true,
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
        origin: 'http://localhost:3000',
        rpID: 'localhost',
      },
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost/api/auth/register/verify', {
      method: 'POST',
      body: JSON.stringify({
        credential: mockCredential,
        tempUserId: 'temp-1',
        username: 'testuser',
        displayName: 'Test User',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(clearChallenge).toHaveBeenCalledWith('temp-1');
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        username: 'testuser',
        displayName: 'Test User',
        status: 'PENDING',
        authenticators: {
          create: expect.objectContaining({
            credentialID: 'credential-base64',
            name: 'Mein Passkey',
          }),
        },
      }),
      include: { authenticators: true },
    });
  });

  it('uses username as displayName when not provided', async () => {
    vi.mocked(getChallenge).mockReturnValue('valid-challenge');
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: true,
      registrationInfo: {
        fmt: 'none',
        aaguid: '00000000-0000-0000-0000-000000000000',
        credential: {
          id: 'cred-id',
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 0,
        },
        credentialType: 'public-key',
        attestationObject: new Uint8Array([1, 2, 3]),
        userVerified: true,
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
        origin: 'http://localhost:3000',
        rpID: 'localhost',
      },
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost/api/auth/register/verify', {
      method: 'POST',
      body: JSON.stringify({
        credential: mockCredential,
        tempUserId: 'temp-1',
        username: 'testuser',
      }),
    });
    await POST(request);

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        displayName: 'testuser',
      }),
      include: { authenticators: true },
    });
  });
});
