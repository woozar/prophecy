import { describe, it, expect } from 'vitest';
import { createRoundSchema, updateRoundSchema } from './round';

describe('createRoundSchema', () => {
  const validData = {
    title: 'Prophezeiungen 2025',
    submissionDeadline: new Date('2025-12-01'),
    ratingDeadline: new Date('2025-12-15'),
    fulfillmentDate: new Date('2025-12-31'),
  };

  it('accepts valid input', () => {
    const result = createRoundSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = createRoundSchema.safeParse({
      ...validData,
      title: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects whitespace-only title', () => {
    const result = createRoundSchema.safeParse({
      ...validData,
      title: '   ',
    });
    expect(result.success).toBe(false);
  });

  it('rejects title longer than 100 characters', () => {
    const result = createRoundSchema.safeParse({
      ...validData,
      title: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('rejects when submissionDeadline is not before ratingDeadline', () => {
    const result = createRoundSchema.safeParse({
      ...validData,
      submissionDeadline: new Date('2025-12-20'),
      ratingDeadline: new Date('2025-12-15'),
    });
    expect(result.success).toBe(false);
  });

  it('rejects when ratingDeadline is not before fulfillmentDate', () => {
    const result = createRoundSchema.safeParse({
      ...validData,
      ratingDeadline: new Date('2025-12-31'),
      fulfillmentDate: new Date('2025-12-20'),
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing submissionDeadline', () => {
    const { submissionDeadline, ...rest } = validData;
    const result = createRoundSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing ratingDeadline', () => {
    const { ratingDeadline, ...rest } = validData;
    const result = createRoundSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing fulfillmentDate', () => {
    const { fulfillmentDate, ...rest } = validData;
    const result = createRoundSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe('updateRoundSchema', () => {
  const validData = {
    title: 'Updated Title',
    submissionDeadline: new Date('2025-12-01'),
    ratingDeadline: new Date('2025-12-15'),
    fulfillmentDate: new Date('2025-12-31'),
  };

  it('accepts valid input', () => {
    const result = updateRoundSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = updateRoundSchema.safeParse({
      ...validData,
      title: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date order', () => {
    const result = updateRoundSchema.safeParse({
      ...validData,
      submissionDeadline: new Date('2025-12-20'),
      ratingDeadline: new Date('2025-12-15'),
    });
    expect(result.success).toBe(false);
  });
});
