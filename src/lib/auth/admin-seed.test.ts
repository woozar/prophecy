import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db/prisma';

import { ensureAdminExists } from './admin-seed';

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-admin-password'),
  },
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
      forcePasswordChange: false,
      avatarUrl: null,
      avatarEffect: null,
      avatarEffectColors: null,
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
      forcePasswordChange: false,
      avatarUrl: null,
      avatarEffect: null,
      avatarEffectColors: null,
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
      forcePasswordChange: false,
      avatarUrl: null,
      avatarEffect: null,
      avatarEffectColors: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await ensureAdminExists();

    expect(bcrypt.default.hash).toHaveBeenCalledWith('admin-password', 12);
  });
});
