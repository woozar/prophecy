import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { validateAdminSession } from '@/lib/auth/admin-validation';
import { prisma } from '@/lib/db/prisma';
import { generateRoundExcel } from '@/lib/export/excel';

import { GET } from './route';

vi.mock('@/lib/auth/admin-validation', () => ({
  validateAdminSession: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    round: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/export/excel', () => ({
  generateRoundExcel: vi.fn(),
}));

const mockSession = {
  userId: 'admin-1',
  username: 'admin',
  role: 'ADMIN' as const,
  iat: Date.now(),
};

const createMockRound = (overrides = {}) => ({
  id: 'round-1',
  title: 'Test Runde 2025',
  submissionDeadline: new Date('2025-01-15'),
  ratingDeadline: new Date('2025-01-31'),
  fulfillmentDate: new Date('2025-12-31'),
  resultsPublishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  prophecies: [
    {
      id: 'prophecy-1',
      title: 'Test Prophezeiung',
      description: 'Beschreibung',
      ratingCount: 3,
      averageRating: 2.5,
      fulfilled: null,
      createdAt: new Date(),
      creator: {
        username: 'testuser',
        displayName: 'Test User',
      },
      ratings: [
        {
          value: 5,
          createdAt: new Date(),
          user: {
            username: 'rater1',
            displayName: 'Rater Eins',
          },
        },
      ],
    },
  ],
  ...overrides,
});

const createParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe('GET /api/rounds/[id]/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns admin validation error when not authorized', async () => {
    const mockError = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    vi.mocked(validateAdminSession).mockResolvedValue({ error: mockError as never });

    const request = new NextRequest('http://localhost/api/rounds/1/export');
    const response = await GET(request, createParams('1'));

    expect(response.status).toBe(401);
  });

  it('returns 403 when user is not admin', async () => {
    const mockError = new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    vi.mocked(validateAdminSession).mockResolvedValue({ error: mockError as never });

    const request = new NextRequest('http://localhost/api/rounds/1/export');
    const response = await GET(request, createParams('1'));

    expect(response.status).toBe(403);
  });

  it('returns 404 when round not found', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.round.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/rounds/1/export');
    const response = await GET(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Runde nicht gefunden');
  });

  it('returns Excel file on success', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.round.findUnique).mockResolvedValue(createMockRound() as never);
    vi.mocked(generateRoundExcel).mockResolvedValue(Buffer.from('mock'));

    const request = new NextRequest('http://localhost/api/rounds/1/export');
    const response = await GET(request, createParams('1'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(response.headers.get('Content-Disposition')).toContain('attachment');
    expect(response.headers.get('Content-Disposition')).toContain('.xlsx');
  });

  it('uses round title in filename', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.round.findUnique).mockResolvedValue(createMockRound() as never);
    vi.mocked(generateRoundExcel).mockResolvedValue(Buffer.from('mock'));

    const request = new NextRequest('http://localhost/api/rounds/1/export');
    const response = await GET(request, createParams('1'));

    expect(response.headers.get('Content-Disposition')).toContain('Test_Runde_2025_Export.xlsx');
  });

  it('sanitizes special characters in filename', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.round.findUnique).mockResolvedValue(
      createMockRound({ title: 'Runde <mit> "Sonderzeichen" & mehr!' }) as never
    );
    vi.mocked(generateRoundExcel).mockResolvedValue(Buffer.from('mock'));

    const request = new NextRequest('http://localhost/api/rounds/1/export');
    const response = await GET(request, createParams('1'));

    const disposition = response.headers.get('Content-Disposition');
    // Extract filename from header (format: attachment; filename="...")
    const filenameMatch = disposition?.match(/filename="(.+)"/);
    const filename = filenameMatch?.[1] || '';

    // Check that the filename itself doesn't contain problematic characters
    expect(filename).not.toContain('<');
    expect(filename).not.toContain('>');
    expect(filename).not.toContain('&');
    expect(filename).toBe('Runde_mit_Sonderzeichen_mehr_Export.xlsx');
  });

  it('passes correct data to generateRoundExcel', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.round.findUnique).mockResolvedValue(createMockRound() as never);
    vi.mocked(generateRoundExcel).mockResolvedValue(Buffer.from('mock'));

    const request = new NextRequest('http://localhost/api/rounds/1/export');
    await GET(request, createParams('1'));

    expect(generateRoundExcel).toHaveBeenCalledWith(
      expect.objectContaining({
        round: {
          title: 'Test Runde 2025',
          submissionDeadline: expect.any(Date),
          ratingDeadline: expect.any(Date),
          fulfillmentDate: expect.any(Date),
        },
        prophecies: [
          expect.objectContaining({
            id: 'prophecy-1',
            title: 'Test Prophezeiung',
            description: 'Beschreibung',
            creatorUsername: 'testuser',
            creatorDisplayName: 'Test User',
            ratingCount: 3,
            averageRating: 2.5,
            fulfilled: null,
          }),
        ],
        ratings: [
          expect.objectContaining({
            prophecyId: 'prophecy-1',
            prophecyTitle: 'Test Prophezeiung',
            raterUsername: 'rater1',
            raterDisplayName: 'Rater Eins',
            value: 5,
          }),
        ],
      })
    );
  });

  it('handles round with no prophecies', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.round.findUnique).mockResolvedValue(
      createMockRound({ prophecies: [] }) as never
    );
    vi.mocked(generateRoundExcel).mockResolvedValue(Buffer.from('mock'));

    const request = new NextRequest('http://localhost/api/rounds/1/export');
    const response = await GET(request, createParams('1'));

    expect(response.status).toBe(200);
    expect(generateRoundExcel).toHaveBeenCalledWith(
      expect.objectContaining({
        prophecies: [],
        ratings: [],
      })
    );
  });

  it('returns 500 on database error', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.round.findUnique).mockRejectedValue(new Error('DB Error'));

    const request = new NextRequest('http://localhost/api/rounds/1/export');
    const response = await GET(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Exportieren der Runde');
  });

  it('returns 500 on excel generation error', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.round.findUnique).mockResolvedValue(createMockRound() as never);
    vi.mocked(generateRoundExcel).mockRejectedValue(new Error('Excel Error'));

    const request = new NextRequest('http://localhost/api/rounds/1/export');
    const response = await GET(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Exportieren der Runde');
  });
});
