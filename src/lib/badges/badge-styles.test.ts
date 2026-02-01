import { describe, expect, it } from 'vitest';

import { getLegendaryBadgeClass, getRarityLabel, getRarityOrder } from './badge-styles';

describe('getLegendaryBadgeClass', () => {
  it('returns empty string when not legendary', () => {
    expect(getLegendaryBadgeClass(false, false)).toBe('');
    expect(getLegendaryBadgeClass(false, true)).toBe('');
  });

  it('returns animated class when legendary and no reduced motion', () => {
    expect(getLegendaryBadgeClass(true, false)).toBe('badge-card-legendary');
  });

  it('returns static class when legendary and reduced motion preferred', () => {
    expect(getLegendaryBadgeClass(true, true)).toBe('badge-card-legendary-static');
  });
});

describe('getRarityOrder', () => {
  it('returns lower values for rarer badges', () => {
    expect(getRarityOrder('LEGENDARY')).toBeLessThan(getRarityOrder('GOLD'));
    expect(getRarityOrder('GOLD')).toBeLessThan(getRarityOrder('SILVER'));
    expect(getRarityOrder('SILVER')).toBeLessThan(getRarityOrder('BRONZE'));
  });
});

describe('getRarityLabel', () => {
  it('returns German labels for each rarity', () => {
    expect(getRarityLabel('LEGENDARY')).toBe('Legendär');
    expect(getRarityLabel('GOLD')).toBe('Gold');
    expect(getRarityLabel('SILVER')).toBe('Silber');
    expect(getRarityLabel('BRONZE')).toBe('Bronze');
  });
});
