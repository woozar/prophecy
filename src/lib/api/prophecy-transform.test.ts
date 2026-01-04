import type { Prophecy } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { transformProphecyToResponse } from './prophecy-transform';

describe('transformProphecyToResponse', () => {
  const createMockProphecy = (overrides: Partial<Prophecy> = {}): Prophecy => ({
    id: 'prophecy-123',
    title: 'Test Prophecy',
    description: 'A test description',
    creatorId: 'user-456',
    roundId: 'round-789',
    createdAt: new Date('2025-01-15T10:30:00.000Z'),
    updatedAt: new Date('2025-01-15T10:30:00.000Z'),
    fulfilled: null,
    resolvedAt: null,
    ...overrides,
  });

  it('transforms prophecy object correctly', () => {
    const prophecy = createMockProphecy();

    const result = transformProphecyToResponse(prophecy);

    expect(result).toEqual({
      id: 'prophecy-123',
      title: 'Test Prophecy',
      description: 'A test description',
      creatorId: 'user-456',
      roundId: 'round-789',
      createdAt: '2025-01-15T10:30:00.000Z',
      fulfilled: null,
      resolvedAt: null,
    });
  });

  it('converts Date to ISO string for createdAt', () => {
    const prophecy = createMockProphecy({
      createdAt: new Date('2025-06-20T15:45:30.123Z'),
    });

    const result = transformProphecyToResponse(prophecy);

    expect(result.createdAt).toBe('2025-06-20T15:45:30.123Z');
    expect(typeof result.createdAt).toBe('string');
  });

  it('converts Date to ISO string for resolvedAt when set', () => {
    const prophecy = createMockProphecy({
      resolvedAt: new Date('2025-12-01T08:00:00.000Z'),
      fulfilled: true,
    });

    const result = transformProphecyToResponse(prophecy);

    expect(result.resolvedAt).toBe('2025-12-01T08:00:00.000Z');
    expect(typeof result.resolvedAt).toBe('string');
  });

  it('handles null resolvedAt correctly', () => {
    const prophecy = createMockProphecy({
      resolvedAt: null,
    });

    const result = transformProphecyToResponse(prophecy);

    expect(result.resolvedAt).toBeNull();
  });

  it('preserves fulfilled state when true', () => {
    const prophecy = createMockProphecy({
      fulfilled: true,
      resolvedAt: new Date(),
    });

    const result = transformProphecyToResponse(prophecy);

    expect(result.fulfilled).toBe(true);
  });

  it('preserves fulfilled state when false', () => {
    const prophecy = createMockProphecy({
      fulfilled: false,
      resolvedAt: new Date(),
    });

    const result = transformProphecyToResponse(prophecy);

    expect(result.fulfilled).toBe(false);
  });

  it('preserves empty description', () => {
    const prophecy = createMockProphecy({
      description: '',
    });

    const result = transformProphecyToResponse(prophecy);

    expect(result.description).toBe('');
  });
});
