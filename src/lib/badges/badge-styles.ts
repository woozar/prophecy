/**
 * Returns the CSS class for legendary badge cards based on animation preference.
 * Uses static styling when reduced motion is preferred.
 */
export function getLegendaryBadgeClass(isLegendary: boolean, reducedMotion: boolean): string {
  if (!isLegendary) return '';
  return reducedMotion ? 'badge-card-legendary-static' : 'badge-card-legendary';
}
