import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, DELETE, PATCH } from './route';
import { prisma } from '@/lib/db/prisma';

const mockGet = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({
    get: mockGet,
  })),
}));

// Mock webauthn
vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: vi.fn().mockResolvedValue({
    challenge: 'test-challenge',
    rp: { name: 'Test', id: 'localhost' },
  }),
  verifyRegistrationResponse: vi.fn().mockResolvedValue({
    verified: true,
    registrationInfo: {
      credential: {
        publicKey: new Uint8Array([1, 2, 3]),
        counter: 0,
      },
      credentialDeviceType: 'singleDevice',
      credentialBackedUp: false,
    },
  }),
}));

vi.mock('@/lib/auth/webauthn', () => ({
  webauthnConfig: {
    rpName: 'Test',
    rpID: 'localhost',
    origin: 'http://localhost:3000',
    timeout: 60000,
  },
  storeChallenge: vi.fn(),
  getChallenge: vi.fn().mockReturnValue('test-challenge'),
  clearChallenge: vi.fn(),
}));

const mockSession = {
  userId: 'user-1',
  username: 'testuser',
  role: 'USER',
};

const mockSessionCookie = Buffer.from(JSON.stringify(mockSession)).toString('base64');

const createMockAuthenticator = (overrides = {}) => ({
  id: 'auth-1',
  name: 'Passkey 1',
  credentialID: 'cred-1',
  credentialPublicKey: 'public-key',
  counter: 0,
  credentialDeviceType: 'singleDevice',
  credentialBackedUp: false,
  transports: 'usb',
  userId: 'user-1',
  createdAt: new Date(),
  lastUsedAt: null,
  ...overrides,
});

describe('GET /api/users/me/passkeys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGet.mockReturnValue(undefined);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Nicht angemeldet');
  });

  it('returns passkeys when authenticated', async () => {
    mockGet.mockReturnValue({ value: mockSessionCookie });
    vi.mocked(prisma.authenticator.findMany).mockResolvedValue([
      createMockAuthenticator(),
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.passkeys).toHaveLength(1);
    expect(data.passkeys[0].name).toBe('Passkey 1');
  });
});

describe('POST /api/users/me/passkeys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGet.mockReturnValue(undefined);

    const request = new NextRequest('http://localhost/api/users/me/passkeys', {
      method: 'POST',
      body: JSON.stringify({ action: 'options' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Nicht angemeldet');
  });

  it('returns 400 for invalid action', async () => {
    mockGet.mockReturnValue({ value: mockSessionCookie });

    const request = new NextRequest('http://localhost/api/users/me/passkeys', {
      method: 'POST',
      body: JSON.stringify({ action: 'invalid' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Ungültige Aktion');
  });

  it('returns options for action=options', async () => {
    mockGet.mockReturnValue({ value: mockSessionCookie });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      username: 'testuser',
      displayName: 'Test User',
      authenticators: [],
    } as never);

    const request = new NextRequest('http://localhost/api/users/me/passkeys', {
      method: 'POST',
      body: JSON.stringify({ action: 'options' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.options).toBeDefined();
  });

  it('returns 404 when user not found for options', async () => {
    mockGet.mockReturnValue({ value: mockSessionCookie });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/users/me/passkeys', {
      method: 'POST',
      body: JSON.stringify({ action: 'options' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Benutzer nicht gefunden');
  });

  it('verifies and creates passkey for action=verify', async () => {
    mockGet.mockReturnValue({ value: mockSessionCookie });
    vi.mocked(prisma.authenticator.count).mockResolvedValue(0);
    vi.mocked(prisma.authenticator.create).mockResolvedValue(createMockAuthenticator());

    const request = new NextRequest('http://localhost/api/users/me/passkeys', {
      method: 'POST',
      body: JSON.stringify({
        action: 'verify',
        credential: {
          id: 'cred-id',
          response: { transports: ['usb'] },
        },
        name: 'My Passkey',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.passkey).toBeDefined();
  });

  it('returns 400 when credential missing for verify', async () => {
    mockGet.mockReturnValue({ value: mockSessionCookie });

    const request = new NextRequest('http://localhost/api/users/me/passkeys', {
      method: 'POST',
      body: JSON.stringify({ action: 'verify' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Ungültige Anfrage');
  });
});

describe('DELETE /api/users/me/passkeys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGet.mockReturnValue(undefined);

    const request = new NextRequest('http://localhost/api/users/me/passkeys?id=auth-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Nicht angemeldet');
  });

  it('returns 400 when id is missing', async () => {
    mockGet.mockReturnValue({ value: mockSessionCookie });

    const request = new NextRequest('http://localhost/api/users/me/passkeys', {
      method: 'DELETE',
    });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Passkey-ID erforderlich');
  });

  it('returns 404 when passkey not found', async () => {
    mockGet.mockReturnValue({ value: mockSessionCookie });
    vi.mocked(prisma.authenticator.findFirst).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/users/me/passkeys?id=auth-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Passkey nicht gefunden');
  });

  it('returns 400 when deleting last passkey without password', async () => {
    mockGet.mockReturnValue({ value: mockSessionCookie });
    vi.mocked(prisma.authenticator.findFirst).mockResolvedValue(createMockAuthenticator());
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      passwordHash: null,
      authenticators: [createMockAuthenticator()],
    } as never);

    const request = new NextRequest('http://localhost/api/users/me/passkeys?id=auth-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Du kannst deinen letzten Passkey nicht löschen, wenn kein Passwort gesetzt ist.');
  });

  it('deletes passkey successfully', async () => {
    mockGet.mockReturnValue({ value: mockSessionCookie });
    vi.mocked(prisma.authenticator.findFirst).mockResolvedValue(createMockAuthenticator());
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      passwordHash: 'hashed',
      authenticators: [createMockAuthenticator()],
    } as never);
    vi.mocked(prisma.authenticator.delete).mockResolvedValue(createMockAuthenticator());

    const request = new NextRequest('http://localhost/api/users/me/passkeys?id=auth-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});

describe('PATCH /api/users/me/passkeys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGet.mockReturnValue(undefined);

    const request = new NextRequest('http://localhost/api/users/me/passkeys', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'auth-1', name: 'New Name' }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Nicht angemeldet');
  });

  it('returns 400 when id or name is missing', async () => {
    mockGet.mockReturnValue({ value: mockSessionCookie });

    const request = new NextRequest('http://localhost/api/users/me/passkeys', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'auth-1' }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('ID und Name erforderlich');
  });

  it('returns 404 when passkey not found', async () => {
    mockGet.mockReturnValue({ value: mockSessionCookie });
    vi.mocked(prisma.authenticator.findFirst).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/users/me/passkeys', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'auth-1', name: 'New Name' }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Passkey nicht gefunden');
  });

  it('renames passkey successfully', async () => {
    mockGet.mockReturnValue({ value: mockSessionCookie });
    vi.mocked(prisma.authenticator.findFirst).mockResolvedValue(createMockAuthenticator());
    vi.mocked(prisma.authenticator.update).mockResolvedValue(
      createMockAuthenticator({ name: 'New Name' })
    );

    const request = new NextRequest('http://localhost/api/users/me/passkeys', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'auth-1', name: 'New Name' }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
