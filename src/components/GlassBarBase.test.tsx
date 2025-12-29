import { render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  FogFill,
  GlassBarContainer,
  useFillGradientStyle,
  useFogLayerStyles,
  useGlassContainerStyle,
  useGlassHighlightStyle,
} from './GlassBarBase';

describe('GlassBarBase', () => {
  describe('useGlassContainerStyle', () => {
    it('returns correct styles for numeric dimensions', () => {
      const { result } = renderHook(() => useGlassContainerStyle(200, 20));

      expect(result.current.width).toBe(200);
      expect(result.current.height).toBe(20);
      expect(result.current.background).toContain('rgba(16, 42, 67, 0.4)');
    });

    it('returns correct styles for string dimensions', () => {
      const { result } = renderHook(() => useGlassContainerStyle('100%', '24px'));

      expect(result.current.width).toBe('100%');
      expect(result.current.height).toBe('24px');
    });

    it('includes border style', () => {
      const { result } = renderHook(() => useGlassContainerStyle(100, 10));

      expect(result.current.border).toContain('rgba(6, 182, 212, 0.2)');
    });

    it('includes box-shadow style', () => {
      const { result } = renderHook(() => useGlassContainerStyle(100, 10));

      expect(result.current.boxShadow).toBeDefined();
      expect(result.current.boxShadow).toContain('inset');
    });
  });

  describe('useGlassHighlightStyle', () => {
    it('returns correct positioning', () => {
      const { result } = renderHook(() => useGlassHighlightStyle(20));

      expect(result.current.top).toBe(2);
      expect(result.current.left).toBe(4);
      expect(result.current.right).toBe(4);
    });

    it('calculates height based on thickness', () => {
      const { result } = renderHook(() => useGlassHighlightStyle(20));

      expect(result.current.height).toBe(6); // 20 * 0.3
    });

    it('includes gradient background', () => {
      const { result } = renderHook(() => useGlassHighlightStyle(20));

      expect(result.current.background).toContain('linear-gradient');
      expect(result.current.background).toContain('rgba(255,255,255,0.15)');
    });
  });

  describe('useFogLayerStyles', () => {
    it('returns three fog layer styles', () => {
      const { result } = renderHook(() => useFogLayerStyles('#06b6d4'));

      expect(result.current.fogLayer1Style).toBeDefined();
      expect(result.current.fogLayer2Style).toBeDefined();
      expect(result.current.fogLayer3Style).toBeDefined();
    });

    it('includes color in fog layer backgrounds', () => {
      const { result } = renderHook(() => useFogLayerStyles('#ff0000'));

      expect(result.current.fogLayer1Style.background).toContain('#ff0000');
      expect(result.current.fogLayer2Style.background).toContain('#ff0000');
    });

    it('includes animation styles', () => {
      const { result } = renderHook(() => useFogLayerStyles('#06b6d4'));

      expect(result.current.fogLayer1Style.animation).toContain('fog-wisps');
      expect(result.current.fogLayer2Style.animation).toContain('fog-wisps');
      expect(result.current.fogLayer3Style.animation).toContain('fog-wisps');
    });
  });

  describe('useFillGradientStyle', () => {
    it('returns background with color', () => {
      const { result } = renderHook(() => useFillGradientStyle('#06b6d4'));

      expect(result.current.background).toContain('#06b6d4');
      expect(result.current.background).toContain('linear-gradient');
    });

    it('returns box-shadow with color', () => {
      const { result } = renderHook(() => useFillGradientStyle('#ff5500'));

      expect(result.current.boxShadow).toContain('#ff5500');
    });
  });

  describe('FogFill', () => {
    it('renders fog layers', () => {
      const { container } = render(
        <FogFill color="#06b6d4" style={{ width: '50%', height: '100%' }} />
      );

      // Should have 4 divs - 1 container + 3 fog layers
      const divs = container.querySelectorAll('div');
      expect(divs.length).toBe(4);
    });

    it('applies style prop to container', () => {
      const { container } = render(<FogFill color="#06b6d4" style={{ width: '75%', left: 0 }} />);

      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.style.width).toBe('75%');
    });

    it('has transition classes', () => {
      const { container } = render(<FogFill color="#06b6d4" style={{ width: '50%' }} />);

      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.className).toContain('transition-all');
    });
  });

  describe('GlassBarContainer', () => {
    it('renders children', () => {
      render(
        <GlassBarContainer length={200} thickness={20}>
          <span data-testid="child">Content</span>
        </GlassBarContainer>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('applies length and thickness styles', () => {
      const { container } = render(
        <GlassBarContainer length={300} thickness={24}>
          <span>Content</span>
        </GlassBarContainer>
      );

      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.style.width).toBe('300px');
      expect(outerDiv.style.height).toBe('24px');
    });

    it('has rounded-full class', () => {
      const { container } = render(
        <GlassBarContainer length={100} thickness={10}>
          <span>Content</span>
        </GlassBarContainer>
      );

      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.className).toContain('rounded-full');
    });

    it('has overflow-hidden class', () => {
      const { container } = render(
        <GlassBarContainer length={100} thickness={10}>
          <span>Content</span>
        </GlassBarContainer>
      );

      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.className).toContain('overflow-hidden');
    });

    it('renders highlight element', () => {
      const { container } = render(
        <GlassBarContainer length={100} thickness={10}>
          <span>Content</span>
        </GlassBarContainer>
      );

      // Should have highlight div with pointer-events-none
      const highlightDiv = container.querySelector('.pointer-events-none');
      expect(highlightDiv).toBeInTheDocument();
    });

    it('accepts string length', () => {
      const { container } = render(
        <GlassBarContainer length="100%" thickness={20}>
          <span>Content</span>
        </GlassBarContainer>
      );

      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.style.width).toBe('100%');
    });
  });
});
