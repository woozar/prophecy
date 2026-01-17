import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db/prisma';

import { ensureAdminExists, ensureBotsExist } from './admin-seed';

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-admin-password'),
  },
}));

// Mock fs
const mockExistsSync = vi.fn();
vi.mock('node:fs', () => ({
  existsSync: (p: string) => mockExistsSync(p),
}));

// Mock fs/promises
const mockCopyFile = vi.fn();
const mockMkdir = vi.fn();
vi.mock('node:fs/promises', () => ({
  copyFile: (...args: unknown[]) => mockCopyFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
}));

describe('ensureAdminExists', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('logs warning when ADMIN_PW is not set', async () => {
    delete process.env.ADMIN_PW;
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await ensureAdminExists();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ADMIN_PW nicht gesetzt'));
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('does not create admin when admin already exists', async () => {
    process.env.ADMIN_PW = 'admin-password';
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'existing-admin',
      username: 'admin',
      displayName: 'Administrator',
      passwordHash: 'existing-hash',
      role: 'ADMIN',
      status: 'APPROVED',
      isBot: false,
      forcePasswordChange: false,
      avatarUrl: null,
      avatarEffect: null,
      avatarEffectColors: null,
      animationsEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await ensureAdminExists();

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { username: 'admin' },
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('creates admin when ADMIN_PW is set and admin does not exist', async () => {
    process.env.ADMIN_PW = 'admin-password';
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'new-admin',
      username: 'admin',
      displayName: 'Administrator',
      passwordHash: 'hashed-admin-password',
      role: 'ADMIN',
      status: 'APPROVED',
      isBot: false,
      forcePasswordChange: false,
      avatarUrl: null,
      avatarEffect: null,
      avatarEffectColors: null,
      animationsEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await ensureAdminExists();

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        username: 'admin',
        displayName: 'Administrator',
        passwordHash: 'hashed-admin-password',
        role: 'ADMIN',
        status: 'APPROVED',
      },
    });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Admin-User erstellt'));
    consoleSpy.mockRestore();
  });

  it('handles database error gracefully', async () => {
    process.env.ADMIN_PW = 'admin-password';
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database connection failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await ensureAdminExists();

    expect(consoleSpy).toHaveBeenCalledWith(
      'Fehler beim Erstellen des Admin-Users:',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it('hashes password with correct salt rounds', async () => {
    const bcrypt = await import('bcrypt');
    process.env.ADMIN_PW = 'admin-password';
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'new-admin',
      username: 'admin',
      displayName: 'Administrator',
      passwordHash: 'hashed-admin-password',
      role: 'ADMIN',
      status: 'APPROVED',
      isBot: false,
      forcePasswordChange: false,
      avatarUrl: null,
      avatarEffect: null,
      avatarEffectColors: null,
      animationsEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await ensureAdminExists();

    expect(bcrypt.default.hash).toHaveBeenCalledWith('admin-password', 12);
    consoleSpy.mockRestore();
  });
});

describe('ensureBotsExist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReset();
    mockCopyFile.mockReset();
    mockMkdir.mockReset();
  });

  it('creates all three bot users with upsert', async () => {
    // Source files exist, upload dir exists
    mockExistsSync.mockReturnValue(true);
    mockCopyFile.mockResolvedValue(undefined);
    vi.mocked(prisma.user.upsert).mockResolvedValue({
      id: 'bot-id',
      username: 'randolf',
      displayName: 'Randolf der Zufällige',
      passwordHash: null,
      role: 'USER',
      status: 'APPROVED',
      isBot: true,
      forcePasswordChange: false,
      avatarUrl: '/api/uploads/avatars/bot-randolf.webp',
      avatarEffect: 'particles',
      avatarEffectColors: JSON.stringify(['orange', 'amber']),
      animationsEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await ensureBotsExist();

    expect(prisma.user.upsert).toHaveBeenCalledTimes(3);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Bot-User erstellt'));
    consoleSpy.mockRestore();
  });

  it('copies avatar files when source exists', async () => {
    mockExistsSync.mockReturnValue(true);
    mockCopyFile.mockResolvedValue(undefined);
    vi.mocked(prisma.user.upsert).mockResolvedValue({
      id: 'bot-id',
      username: 'randolf',
      displayName: 'Randolf der Zufällige',
      passwordHash: null,
      role: 'USER',
      status: 'APPROVED',
      isBot: true,
      forcePasswordChange: false,
      avatarUrl: '/api/uploads/avatars/bot-randolf.webp',
      avatarEffect: 'particles',
      avatarEffectColors: JSON.stringify(['orange', 'amber']),
      animationsEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await ensureBotsExist();

    expect(mockCopyFile).toHaveBeenCalledTimes(3);
    consoleSpy.mockRestore();
  });

  it('creates upload directory if it does not exist', async () => {
    // For each bot: check source file, then check upload dir
    // Bot 1: source exists, upload dir doesn't exist (triggers mkdir)
    // Bot 2 & 3: source exists, upload dir now exists
    mockExistsSync
      .mockReturnValueOnce(true) // bot 1: source file exists
      .mockReturnValueOnce(false) // bot 1: upload dir doesn't exist
      .mockReturnValueOnce(true) // bot 2: source file exists
      .mockReturnValueOnce(true) // bot 2: upload dir exists (after mkdir)
      .mockReturnValueOnce(true) // bot 3: source file exists
      .mockReturnValueOnce(true); // bot 3: upload dir exists
    mockMkdir.mockResolvedValue(undefined);
    mockCopyFile.mockResolvedValue(undefined);
    vi.mocked(prisma.user.upsert).mockResolvedValue({
      id: 'bot-id',
      username: 'randolf',
      displayName: 'Randolf der Zufällige',
      passwordHash: null,
      role: 'USER',
      status: 'APPROVED',
      isBot: true,
      forcePasswordChange: false,
      avatarUrl: '/api/uploads/avatars/bot-randolf.webp',
      avatarEffect: 'particles',
      avatarEffectColors: JSON.stringify(['orange', 'amber']),
      animationsEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await ensureBotsExist();

    expect(mockMkdir).toHaveBeenCalledWith('./uploads/avatars', { recursive: true });
    consoleSpy.mockRestore();
  });

  it('logs warning when source avatar file not found', async () => {
    mockExistsSync.mockReturnValue(false); // source file doesn't exist
    vi.mocked(prisma.user.upsert).mockResolvedValue({
      id: 'bot-id',
      username: 'randolf',
      displayName: 'Randolf der Zufällige',
      passwordHash: null,
      role: 'USER',
      status: 'APPROVED',
      isBot: true,
      forcePasswordChange: false,
      avatarUrl: null,
      avatarEffect: 'particles',
      avatarEffectColors: JSON.stringify(['orange', 'amber']),
      animationsEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await ensureBotsExist();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Avatar-Datei nicht gefunden'));
    expect(mockCopyFile).not.toHaveBeenCalled();
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('handles copy error gracefully', async () => {
    mockExistsSync.mockReturnValue(true);
    mockCopyFile.mockRejectedValue(new Error('Copy failed'));
    vi.mocked(prisma.user.upsert).mockResolvedValue({
      id: 'bot-id',
      username: 'randolf',
      displayName: 'Randolf der Zufällige',
      passwordHash: null,
      role: 'USER',
      status: 'APPROVED',
      isBot: true,
      forcePasswordChange: false,
      avatarUrl: null,
      avatarEffect: 'particles',
      avatarEffectColors: JSON.stringify(['orange', 'amber']),
      animationsEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await ensureBotsExist();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Fehler beim Kopieren von Avatar'),
      expect.any(Error)
    );
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('handles database error gracefully', async () => {
    mockExistsSync.mockReturnValue(true);
    mockCopyFile.mockResolvedValue(undefined);
    vi.mocked(prisma.user.upsert).mockRejectedValue(new Error('Database error'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await ensureBotsExist();

    expect(errorSpy).toHaveBeenCalledWith('Fehler beim Erstellen der Bot-User:', expect.any(Error));
    errorSpy.mockRestore();
  });

  it('upserts with correct bot data including avatarUrl when copy succeeds', async () => {
    mockExistsSync.mockReturnValue(true);
    mockCopyFile.mockResolvedValue(undefined);
    vi.mocked(prisma.user.upsert).mockResolvedValue({
      id: 'bot-id',
      username: 'randolf',
      displayName: 'Randolf der Zufällige',
      passwordHash: null,
      role: 'USER',
      status: 'APPROVED',
      isBot: true,
      forcePasswordChange: false,
      avatarUrl: '/api/uploads/avatars/bot-randolf.webp',
      avatarEffect: 'particles',
      avatarEffectColors: JSON.stringify(['orange', 'amber']),
      animationsEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await ensureBotsExist();

    // Check first bot (randolf)
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { username: 'randolf' },
      update: {
        displayName: 'Randolf der Zufällige',
        avatarEffect: 'particles',
        avatarEffectColors: JSON.stringify(['orange', 'amber']),
        isBot: true,
        status: 'APPROVED',
        avatarUrl: '/api/uploads/avatars/bot-randolf.webp',
      },
      create: {
        username: 'randolf',
        displayName: 'Randolf der Zufällige',
        avatarEffect: 'particles',
        avatarEffectColors: JSON.stringify(['orange', 'amber']),
        role: 'USER',
        status: 'APPROVED',
        isBot: true,
        avatarUrl: '/api/uploads/avatars/bot-randolf.webp',
      },
    });
    consoleSpy.mockRestore();
  });

  it('upserts without avatarUrl when source file not found', async () => {
    mockExistsSync.mockReturnValue(false);
    vi.mocked(prisma.user.upsert).mockResolvedValue({
      id: 'bot-id',
      username: 'randolf',
      displayName: 'Randolf der Zufällige',
      passwordHash: null,
      role: 'USER',
      status: 'APPROVED',
      isBot: true,
      forcePasswordChange: false,
      avatarUrl: null,
      avatarEffect: 'particles',
      avatarEffectColors: JSON.stringify(['orange', 'amber']),
      animationsEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await ensureBotsExist();

    // Check that upsert was called without avatarUrl
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { username: 'randolf' },
      update: {
        displayName: 'Randolf der Zufällige',
        avatarEffect: 'particles',
        avatarEffectColors: JSON.stringify(['orange', 'amber']),
        isBot: true,
        status: 'APPROVED',
      },
      create: {
        username: 'randolf',
        displayName: 'Randolf der Zufällige',
        avatarEffect: 'particles',
        avatarEffectColors: JSON.stringify(['orange', 'amber']),
        role: 'USER',
        status: 'APPROVED',
        isBot: true,
      },
    });
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });
});
