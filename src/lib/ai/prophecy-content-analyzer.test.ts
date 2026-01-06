import { generateText } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CATEGORY_TO_BADGE,
  CONTENT_CATEGORIES,
  analyzeContentCategories,
} from './prophecy-content-analyzer';

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(() => 'mocked-model'),
}));

vi.mock('ai', () => ({
  Output: { object: vi.fn() },
  generateText: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGenerateText = generateText as any;

describe('analyzeContentCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return sport category for sports prophecy', async () => {
    mockGenerateText.mockResolvedValue({
      output: { categories: ['sport'], confidence: 0.9, reasoning: 'Bezieht sich auf die EM.' },
    });

    const result = await analyzeContentCategories('Deutschland wird die EM gewinnen', null);

    expect(result.categories).toContain('sport');
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.reasoning).toBe('Bezieht sich auf die EM.');
  });

  it('should return finance category for financial prophecy', async () => {
    mockGenerateText.mockResolvedValue({
      output: { categories: ['finance'], confidence: 0.85, reasoning: 'Kryptowährungsprognose.' },
    });

    const result = await analyzeContentCategories('Bitcoin erreicht 100.000$', null);

    expect(result.categories).toContain('finance');
    expect(result.reasoning).toBeDefined();
  });

  it('should return empty categories for generic prophecy', async () => {
    mockGenerateText.mockResolvedValue({
      output: { categories: [], confidence: 0.9, reasoning: 'Zu allgemein.' },
    });

    const result = await analyzeContentCategories('Es wird etwas Unerwartetes passieren', null);

    expect(result.categories).toHaveLength(0);
    expect(result.reasoning).toBe('Zu allgemein.');
  });

  it('should return empty result on API error', async () => {
    mockGenerateText.mockRejectedValue(new Error('API Error'));

    const result = await analyzeContentCategories('Test', null);

    expect(result.categories).toHaveLength(0);
    expect(result.confidence).toBe(0);
    expect(result.reasoning).toBe('Analyse fehlgeschlagen');
  });

  it('should handle multiple categories', async () => {
    mockGenerateText.mockResolvedValue({
      output: {
        categories: ['finance', 'environment'],
        confidence: 0.85,
        reasoning: 'Nachhaltige Investments kombinieren Umwelt und Finanzen.',
      },
    });

    const result = await analyzeContentCategories(
      'Nachhaltige Investments werden boomen',
      'Grüne Anleihen verdreifachen ihren Wert'
    );

    expect(result.categories).toContain('finance');
    expect(result.categories).toContain('environment');
  });

  it('should include description in analysis when provided', async () => {
    mockGenerateText.mockResolvedValue({
      output: {
        categories: ['science'],
        confidence: 0.8,
        reasoning: 'Wissenschaftliche Entdeckung.',
      },
    });

    await analyzeContentCategories('Neue Entdeckung', 'Forscher finden neues Element');

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Beschreibung'),
      })
    );
  });
});

describe('CATEGORY_TO_BADGE mapping', () => {
  it('should have correct badge keys for all categories', () => {
    expect(CATEGORY_TO_BADGE.sexy).toBe('content_sexy');
    expect(CATEGORY_TO_BADGE.morbid).toBe('content_morbid');
    expect(CATEGORY_TO_BADGE.sport).toBe('content_sport');
    expect(CATEGORY_TO_BADGE.environment).toBe('content_environment');
    expect(CATEGORY_TO_BADGE.science).toBe('content_science');
    expect(CATEGORY_TO_BADGE.finance).toBe('content_finance');
  });

  it('should have mapping for all defined categories', () => {
    for (const category of CONTENT_CATEGORIES) {
      expect(CATEGORY_TO_BADGE[category]).toBeDefined();
      expect(CATEGORY_TO_BADGE[category]).toMatch(/^content_/);
    }
  });
});
