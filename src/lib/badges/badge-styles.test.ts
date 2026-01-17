import { describe, expect, it } from 'vitest';

import { getLegendaryBadgeClass } from './badge-styles';

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
