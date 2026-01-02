import { generateText } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateKimberlyRating } from './kimberly-ai';

// Mock the ai module
vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: {
    object: vi.fn((config) => config),
  },
}));

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(() => 'mocked-model'),
}));

describe('generateKimberlyRating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns rating and reasoning from structured output', async () => {
    vi.mocked(generateText).mockResolvedValue({
      output: {
        rating: -5,
        reasoning: 'Historische Daten zeigen hohe Wahrscheinlichkeit.',
      },
      text: '',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      response: { id: '', modelId: '', timestamp: new Date() },
      request: {},
      warnings: [],
      providerMetadata: undefined,
    } as never);

    const result = await generateKimberlyRating(
      'Test Prophezeiung',
      'Beschreibung',
      new Date('2026-12-31')
    );

    expect(result.rating).toBe(-5);
    expect(result.reasoning).toBe('Historische Daten zeigen hohe Wahrscheinlichkeit.');
  });

  it('returns 0 and null reasoning on error', async () => {
    vi.mocked(generateText).mockRejectedValue(new Error('API Error'));

    const result = await generateKimberlyRating('Test Prophezeiung', null, new Date('2026-12-31'));

    expect(result.rating).toBe(0);
    expect(result.reasoning).toBeNull();
  });

  it('includes fulfillment date in prompt', async () => {
    vi.mocked(generateText).mockResolvedValue({
      output: {
        rating: 0,
        reasoning: 'Neutral.',
      },
      text: '',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      response: { id: '', modelId: '', timestamp: new Date() },
      request: {},
      warnings: [],
      providerMetadata: undefined,
    } as never);

    await generateKimberlyRating('Test', null, new Date('2026-03-31'));

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('31.03.2026'),
      })
    );
  });

  it('handles prophecy with description', async () => {
    vi.mocked(generateText).mockResolvedValue({
      output: {
        rating: 5,
        reasoning: 'Unwahrscheinlich.',
      },
      text: '',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      response: { id: '', modelId: '', timestamp: new Date() },
      request: {},
      warnings: [],
      providerMetadata: undefined,
    } as never);

    await generateKimberlyRating('Titel', 'Detaillierte Beschreibung', new Date('2026-12-31'));

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Titel: Titel'),
      })
    );
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Beschreibung: Detaillierte Beschreibung'),
      })
    );
  });
});
