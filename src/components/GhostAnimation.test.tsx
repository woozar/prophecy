import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GhostAnimation } from './GhostAnimation';

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    width,
    height,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
  }) => <img src={src} alt={alt} width={width} height={height} data-testid="ghost-image" />,
}));

// Mock the useReducedMotion hook
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

import { useReducedMotion } from '@/hooks/useReducedMotion';

const GHOST_IMAGES = ['/ghost.png', '/ghost2.png', '/ghost3.png', '/ghost4.png', '/ghost5.png'];

describe('GhostAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(useReducedMotion).mockReturnValue(false);

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });

    // Mock Math.random for predictable tests
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('returns null when reduced motion is preferred', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
    const { container } = render(<GhostAnimation />);
    expect(container.firstChild).toBeNull();
  });

  it('starts with no ghost visible', () => {
    const { container } = render(<GhostAnimation />);
    const ghostImage = container.querySelector('[data-testid="ghost-image"]');
    expect(ghostImage).toBeNull();
  });

  it('spawns ghost after interval passes', () => {
    const { container } = render(<GhostAnimation />);

    // Advance past the minimum interval (60s + random portion)
    act(() => {
      vi.advanceTimersByTime(90_000); // 90 seconds
    });

    const ghostImage = container.querySelector('[data-testid="ghost-image"]');
    expect(ghostImage).toBeInTheDocument();
  });

  it('container has pointer-events-none to not block interactions', () => {
    const { container } = render(<GhostAnimation />);

    act(() => {
      vi.advanceTimersByTime(90_000);
    });

    const containerDiv = container.querySelector('.pointer-events-none');
    expect(containerDiv).toBeInTheDocument();
  });

  it('container has aria-hidden for accessibility', () => {
    const { container } = render(<GhostAnimation />);

    act(() => {
      vi.advanceTimersByTime(90_000);
    });

    const containerDiv = container.querySelector('[aria-hidden="true"]');
    expect(containerDiv).toBeInTheDocument();
  });

  it('ghost disappears after animation duration completes', () => {
    const { container } = render(<GhostAnimation />);

    // Spawn ghost
    act(() => {
      vi.advanceTimersByTime(90_000);
    });

    expect(container.querySelector('[data-testid="ghost-image"]')).toBeInTheDocument();

    // Wait for animation to complete (1800ms + 100ms buffer)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(container.querySelector('[data-testid="ghost-image"]')).toBeNull();
  });

  it('selects image from GHOST_IMAGES array', () => {
    // Mock random to select the third image (index 2)
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const { container } = render(<GhostAnimation />);

    act(() => {
      vi.advanceTimersByTime(90_000);
    });

    const img = container.querySelector('[data-testid="ghost-image"]') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    // With Math.random() = 0.5, floor(0.5 * 5) = 2, so third image
    expect(img.src).toContain('ghost');
    expect(GHOST_IMAGES.some((ghostImg) => img.src.includes(ghostImg))).toBe(true);
  });

  it('positions ghost within viewport bounds with padding', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const { container } = render(<GhostAnimation />);

    act(() => {
      vi.advanceTimersByTime(90_000);
    });

    const ghostWrapper = container.querySelector('.absolute') as HTMLElement;
    expect(ghostWrapper).toBeInTheDocument();

    const left = parseFloat(ghostWrapper.style.left);
    const top = parseFloat(ghostWrapper.style.top);

    // With padding of 100 and ghost size of 150, valid range is 100 to (viewport - 100 - 150)
    // x: 100 to 774 (1024 - 100 - 150)
    // y: 100 to 518 (768 - 100 - 150)
    expect(left).toBeGreaterThanOrEqual(100);
    expect(left).toBeLessThanOrEqual(774);
    expect(top).toBeGreaterThanOrEqual(100);
    expect(top).toBeLessThanOrEqual(518);
  });

  it('applies correct animation style to ghost', () => {
    const { container } = render(<GhostAnimation />);

    act(() => {
      vi.advanceTimersByTime(90_000);
    });

    const ghostWrapper = container.querySelector('.absolute') as HTMLElement;
    expect(ghostWrapper.style.animation).toContain('ghost-fly-towards');
    expect(ghostWrapper.style.animation).toContain('1.8s');
  });

  it('schedules next ghost after spawning', () => {
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
    render(<GhostAnimation />);

    // Initial schedule call
    const initialCallCount = setTimeoutSpy.mock.calls.length;

    // Spawn first ghost
    act(() => {
      vi.advanceTimersByTime(90_000);
    });

    // Should have scheduled another timeout for next ghost
    expect(setTimeoutSpy.mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it('cleans up timeout on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const { unmount } = render(<GhostAnimation />);

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
