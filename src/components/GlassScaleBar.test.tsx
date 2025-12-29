import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GlassScaleBar } from './GlassScaleBar';

describe('GlassScaleBar', () => {
  it('renders without crashing', () => {
    const { container } = render(<GlassScaleBar value={0} />);
    expect(container.querySelector('.rounded-full')).toBeInTheDocument();
  });

  it('clamps value to minimum of -10', () => {
    const { container } = render(<GlassScaleBar value={-20} />);
    const fillElement = container.querySelector('.transition-all');
    // At -10, fill should be 50% width (full left side)
    expect(fillElement).toHaveStyle({ width: '50%' });
  });

  it('clamps value to maximum of 10', () => {
    const { container } = render(<GlassScaleBar value={20} />);
    const fillElement = container.querySelector('.transition-all');
    // At +10, fill should be 50% width (full right side)
    expect(fillElement).toHaveStyle({ width: '50%' });
  });

  it('shows no fill when value is 0', () => {
    const { container } = render(<GlassScaleBar value={0} />);
    const fillElement = container.querySelector('.transition-all');
    expect(fillElement).toBeNull();
  });

  it('fills from center to right for positive values', () => {
    const { container } = render(<GlassScaleBar value={5} />);
    const fillElement = container.querySelector('.transition-all');
    // +5 = 25% fill (half of 50%)
    expect(fillElement).toHaveStyle({ width: '25%', left: '50%' });
  });

  it('fills from center to left for negative values', () => {
    const { container } = render(<GlassScaleBar value={-5} />);
    const fillElement = container.querySelector('.transition-all');
    // -5 = 25% fill (half of 50%)
    expect(fillElement).toHaveStyle({ width: '25%', right: '50%' });
  });

  it('uses default thickness of 24px', () => {
    const { container } = render(<GlassScaleBar value={0} />);
    const containerElement = container.firstChild;
    expect(containerElement).toHaveStyle({ height: '24px' });
  });

  it('applies custom thickness', () => {
    const { container } = render(<GlassScaleBar value={0} thickness={16} />);
    const containerElement = container.firstChild;
    expect(containerElement).toHaveStyle({ height: '16px' });
  });

  it('applies custom length', () => {
    const { container } = render(<GlassScaleBar value={0} length={300} />);
    const containerElement = container.firstChild;
    expect(containerElement).toHaveStyle({ width: '300px' });
  });

  it('uses default positive color (cyan)', () => {
    const { container } = render(<GlassScaleBar value={5} />);
    const fillElement = container.querySelector('.transition-all');
    const style = fillElement?.getAttribute('style') || '';
    expect(style).toContain('#22d3ee');
  });

  it('uses default negative color (purple)', () => {
    const { container } = render(<GlassScaleBar value={-5} />);
    const fillElement = container.querySelector('.transition-all');
    const style = fillElement?.getAttribute('style') || '';
    expect(style).toContain('#a855f7');
  });

  it('accepts custom positive color', () => {
    const { container } = render(<GlassScaleBar value={5} positiveColor="#00ff00" />);
    const fillElement = container.querySelector('.transition-all');
    const style = fillElement?.getAttribute('style') || '';
    expect(style).toContain('#00ff00');
  });

  it('accepts custom negative color', () => {
    const { container } = render(<GlassScaleBar value={-5} negativeColor="#ff0000" />);
    const fillElement = container.querySelector('.transition-all');
    const style = fillElement?.getAttribute('style') || '';
    expect(style).toContain('#ff0000');
  });

  it('renders center marker', () => {
    const { container } = render(<GlassScaleBar value={0} />);
    // Center marker has animation style
    const centerMarker = Array.from(container.querySelectorAll('.absolute')).find((el) =>
      el.getAttribute('style')?.includes('center-glow-pulse')
    );
    expect(centerMarker).toBeInTheDocument();
  });

  it('shows edge glow when value is between extremes', () => {
    const { container: containerMid } = render(<GlassScaleBar value={5} />);
    const { container: containerMax } = render(<GlassScaleBar value={10} />);

    const midElements = containerMid.querySelectorAll('.absolute').length;
    const maxElements = containerMax.querySelectorAll('.absolute').length;

    // Edge glow only shows when not at max, so mid should have more elements
    expect(midElements).toBeGreaterThan(maxElements);
  });

  describe('fill percentage calculation', () => {
    it('calculates correct fill for +10', () => {
      const { container } = render(<GlassScaleBar value={10} />);
      const fillElement = container.querySelector('.transition-all');
      expect(fillElement).toHaveStyle({ width: '50%' });
    });

    it('calculates correct fill for -10', () => {
      const { container } = render(<GlassScaleBar value={-10} />);
      const fillElement = container.querySelector('.transition-all');
      expect(fillElement).toHaveStyle({ width: '50%' });
    });

    it('calculates correct fill for +2', () => {
      const { container } = render(<GlassScaleBar value={2} />);
      const fillElement = container.querySelector('.transition-all');
      // +2 = 10% fill (2/10 * 50%)
      expect(fillElement).toHaveStyle({ width: '10%' });
    });

    it('calculates correct fill for -8', () => {
      const { container } = render(<GlassScaleBar value={-8} />);
      const fillElement = container.querySelector('.transition-all');
      // -8 = 40% fill (8/10 * 50%)
      expect(fillElement).toHaveStyle({ width: '40%' });
    });
  });
});
