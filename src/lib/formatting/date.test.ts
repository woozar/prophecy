import { describe, it, expect } from 'vitest';
import { formatDate, type DateFormatType } from './date';

describe('formatDate', () => {
  // Use a fixed date for consistent testing
  const testDate = new Date('2025-06-15T14:30:00');

  describe('with Date object', () => {
    it('formats date with datetime format by default', () => {
      const result = formatDate(testDate);
      expect(result).toMatch(/15\.06\.2025/);
      expect(result).toMatch(/14:30/);
    });

    it('formats date with date format', () => {
      const result = formatDate(testDate, 'date');
      expect(result).toBe('15.06.2025');
    });

    it('formats date with short format', () => {
      const result = formatDate(testDate, 'short');
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2025/);
    });
  });

  describe('with ISO string', () => {
    it('formats ISO date string with datetime format', () => {
      const result = formatDate('2025-06-15T14:30:00');
      expect(result).toMatch(/15\.06\.2025/);
    });

    it('formats ISO date string with date format', () => {
      const result = formatDate('2025-06-15T14:30:00', 'date');
      expect(result).toBe('15.06.2025');
    });
  });

  describe('with timestamp', () => {
    it('formats timestamp with datetime format', () => {
      const timestamp = testDate.getTime();
      const result = formatDate(timestamp);
      expect(result).toMatch(/15\.06\.2025/);
    });

    it('formats timestamp with date format', () => {
      const timestamp = testDate.getTime();
      const result = formatDate(timestamp, 'date');
      expect(result).toBe('15.06.2025');
    });
  });

  describe('edge cases', () => {
    it('handles start of year', () => {
      const result = formatDate('2025-01-01T00:00:00', 'date');
      expect(result).toBe('01.01.2025');
    });

    it('handles end of year', () => {
      const result = formatDate('2025-12-31T23:59:00', 'date');
      expect(result).toBe('31.12.2025');
    });

    it('handles midnight', () => {
      const result = formatDate('2025-06-15T00:00:00', 'datetime');
      expect(result).toMatch(/00:00/);
    });
  });
});
