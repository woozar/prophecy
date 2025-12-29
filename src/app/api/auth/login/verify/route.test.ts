import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/db/prisma';
import { getChallenge, clearChallenge } from '@/lib/auth/webauthn';
import { setSessionCookie } from '@/lib/auth/session';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { Prisma } from '@prisma/client';

type AuthenticatorWithUser = Prisma.AuthenticatorGetPayload<{ include: { user: true } }>;

vi.mock('@/lib/auth/webauthn', () => ({
  webauthnConfig: {
    rpID: 'localhost',
    origin: 'http://localhost:3000',
  },
  getChallenge: vi.fn(),
  clearChallenge: vi.fn(),
}));

const { mockLoginSuccessResponse, mockLoginErrorResponse } = vi.hoisted(() => ({
  mockLoginSuccessResponse: vi.fn(),
  mockLoginErrorResponse: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  setSessionCookie: vi.fn(),
  loginSuccessResponse: mockLoginSuccessResponse,
  loginErrorResponse: mockLoginErrorResponse,
}));

vi.mock('@simplewebauthn/server', () => ({
  verifyAuthenticationResponse: vi.fn(),
}));

describe('POST /api/auth/login/verify', () => {
  const mockUser: AuthenticatorWithUser['user'] = {
    id: 'user-1',
    username: 'testuser',
    displayName: 'Test User',
    passwordHash: null,
    forcePasswordChange: false,
    avatarUrl: null,
    avatarEffect: null,
    avatarEffectColors: null,
    role: 'USER',
    status: 'APPROVED',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthenticator: AuthenticatorWithUser = {
    id: 'auth-1',
    name: 'Test Passkey',
    createdAt: new Date(),
    credentialID: 'credential-base64',
    userId: 'user-1',
    credentialPublicKey: Buffer.from('public-key').toString('base64'),
    counter: 0,
    credentialDeviceType: 'singleDevice',
    credentialBackedUp: false,
    transports: 'usb,nfc',
    lastUsedAt: null,
    user: mockUser,
  };

  const mockCredential = {
    id: 'credential-base64',
    rawId: 'credential-base64',
    type: 'public-key',
    response: {
      clientDataJSON: 'mock-client-data',
      authenticatorData: 'mock-auth-data',
      signature: 'mock-signature',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoginSuccessResponse.mockImplementation((user) =>
      NextResponse.json({ success: true, user })
    );
    mockLoginErrorResponse.mockImplementation((error, message) => {
      console.error(message, error);
      return NextResponse.json({ error: 'Login fehlgeschlagen' }, { status: 500 });
    });
  });

  it('returns 400 when credential is missing', async () => {
    const request = new NextRequest('http://localhost/api/auth/login/verify', {
      method: 'POST',
      body: JSON.stringify({ challengeKey: 'test-key' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Ungültige Anfrage');
  });

  it('returns 400 when challengeKey is missing', async () => {
    const request = new NextRequest('http://localhost/api/auth/login/verify', {
      method: 'POST',
      body: JSON.stringify({ credential: mockCredential }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Ungültige Anfrage');
  });

  it('returns 400 when challenge is expired', async () => {
    vi.mocked(getChallenge).mockReturnValue(null);

    const request = new NextRequest('http://localhost/api/auth/login/verify', {
      method: 'POST',
      body: JSON.stringify({ credential: mockCredential, challengeKey: 'expired-key' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Anmeldung abgelaufen. Bitte erneut versuchen.');
  });

  it('returns 404 when passkey not found', async () => {
    vi.mocked(getChallenge).mockReturnValue('valid-challenge');
    vi.mocked(prisma.authenticator.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.authenticator.findMany).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/auth/login/verify', {
      method: 'POST',
      body: JSON.stringify({ credential: mockCredential, challengeKey: 'valid-key' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Passkey nicht gefunden');
  });

  it('returns 403 when user is not approved', async () => {
    vi.mocked(getChallenge).mockReturnValue('valid-challenge');
    const pendingAuthenticator: AuthenticatorWithUser = {
      ...mockAuthenticator,
      user: { ...mockUser, status: 'PENDING' },
    };
    vi.mocked(prisma.authenticator.findUnique).mockResolvedValue(pendingAuthenticator);

    const request = new NextRequest('http://localhost/api/auth/login/verify', {
      method: 'POST',
      body: JSON.stringify({ credential: mockCredential, challengeKey: 'valid-key' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Dein Konto wurde noch nicht freigegeben');
  });

  it('returns 400 when verification fails', async () => {
    vi.mocked(getChallenge).mockReturnValue('valid-challenge');
    vi.mocked(prisma.authenticator.findUnique).mockResolvedValue(mockAuthenticator);
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
      verified: false,
      authenticationInfo: {
        credentialID: 'credential-base64',
        newCounter: 0,
        userVerified: false,
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
        origin: 'http://localhost:3000',
        rpID: 'localhost',
      },
    });

    const request = new NextRequest('http://localhost/api/auth/login/verify', {
      method: 'POST',
      body: JSON.stringify({ credential: mockCredential, challengeKey: 'valid-key' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Passkey-Verifizierung fehlgeschlagen');
  });

  it('successfully logs in user', async () => {
    vi.mocked(getChallenge).mockReturnValue('valid-challenge');
    vi.mocked(prisma.authenticator.findUnique).mockResolvedValue(mockAuthenticator);
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
      verified: true,
      authenticationInfo: {
        credentialID: 'credential-base64',
        newCounter: 1,
        userVerified: true,
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
        origin: 'http://localhost:3000',
        rpID: 'localhost',
      },
    });
    vi.mocked(prisma.authenticator.update).mockResolvedValue({
      ...mockAuthenticator,
      counter: 1,
    });

    const request = new NextRequest('http://localhost/api/auth/login/verify', {
      method: 'POST',
      body: JSON.stringify({ credential: mockCredential, challengeKey: 'valid-key' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(clearChallenge).toHaveBeenCalledWith('valid-key');
    expect(setSessionCookie).toHaveBeenCalledWith(mockUser);
    expect(prisma.authenticator.update).toHaveBeenCalledWith({
      where: { id: 'auth-1' },
      data: {
        counter: 1,
        lastUsedAt: expect.any(Date),
      },
    });
  });

  it('tries rawId when credential ID not found', async () => {
    vi.mocked(getChallenge).mockReturnValue('valid-challenge');
    // First call returns null, second call returns authenticator
    vi.mocked(prisma.authenticator.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mockAuthenticator);
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
      verified: true,
      authenticationInfo: {
        credentialID: 'credential-base64',
        newCounter: 1,
        userVerified: true,
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
        origin: 'http://localhost:3000',
        rpID: 'localhost',
      },
    });
    vi.mocked(prisma.authenticator.update).mockResolvedValue(mockAuthenticator);

    const request = new NextRequest('http://localhost/api/auth/login/verify', {
      method: 'POST',
      body: JSON.stringify({
        credential: { ...mockCredential, rawId: 'raw-id-value' },
        challengeKey: 'valid-key',
      }),
    });
    const response = await POST(request);

    expect(prisma.authenticator.findUnique).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
  });
});
