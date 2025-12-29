import { describe, expect, it } from 'vitest';

import { createProphecySchema, updateProphecySchema } from './prophecy';

describe('createProphecySchema', () => {
  it('accepts valid input', () => {
    const result = createProphecySchema.safeParse({
      roundId: 'round-123',
      title: 'My Prophecy',
      description: 'A description',
    });
    expect(result.success).toBe(true);
  });

  it('accepts input without description', () => {
    const result = createProphecySchema.safeParse({
      roundId: 'round-123',
      title: 'My Prophecy',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('');
    }
  });

  it('rejects empty roundId', () => {
    const result = createProphecySchema.safeParse({
      roundId: '',
      title: 'My Prophecy',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('Runde ist erforderlich');
    }
  });

  it('rejects empty title', () => {
    const result = createProphecySchema.safeParse({
      roundId: 'round-123',
      title: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('Titel ist erforderlich');
    }
  });

  it('rejects title longer than 200 characters', () => {
    const result = createProphecySchema.safeParse({
      roundId: 'round-123',
      title: 'a'.repeat(201),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('Titel darf maximal 200 Zeichen haben');
    }
  });

  it('rejects description longer than 2000 characters', () => {
    const result = createProphecySchema.safeParse({
      roundId: 'round-123',
      title: 'Valid Title',
      description: 'a'.repeat(2001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('Beschreibung darf maximal 2000 Zeichen haben');
    }
  });
});

describe('updateProphecySchema', () => {
  it('accepts valid input', () => {
    const result = updateProphecySchema.safeParse({
      title: 'Updated Title',
      description: 'Updated description',
    });
    expect(result.success).toBe(true);
  });

  it('accepts input without description', () => {
    const result = updateProphecySchema.safeParse({
      title: 'Updated Title',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('');
    }
  });

  it('rejects empty title', () => {
    const result = updateProphecySchema.safeParse({
      title: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects title longer than 200 characters', () => {
    const result = updateProphecySchema.safeParse({
      title: 'a'.repeat(201),
    });
    expect(result.success).toBe(false);
  });
});
