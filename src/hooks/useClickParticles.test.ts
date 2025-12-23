import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClickParticles } from './useClickParticles';

// Mock useIsMobile
vi.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

describe('useClickParticles', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('returns containerRef, particles, and handleClick', () => {
    const { result } = renderHook(() => useClickParticles());

    expect(result.current.containerRef).toBeDefined();
    expect(result.current.particles).toEqual([]);
    expect(typeof result.current.handleClick).toBe('function');
  });

  it('starts with empty particles array', () => {
    const { result } = renderHook(() => useClickParticles());
    expect(result.current.particles).toHaveLength(0);
  });

  it('creates particles when enabled and clicked', () => {
    const { result } = renderHook(() => useClickParticles({ enabled: true, count: 5 }));

    const mockEvent = {
      clientX: 100,
      clientY: 200,
    } as React.MouseEvent<HTMLButtonElement>;

    act(() => {
      result.current.handleClick(mockEvent);
    });

    expect(result.current.particles).toHaveLength(5);
  });

  it('creates correct number of particles based on count option', () => {
    const { result } = renderHook(() => useClickParticles({ enabled: true, count: 3 }));

    const mockEvent = {
      clientX: 100,
      clientY: 200,
    } as React.MouseEvent<HTMLButtonElement>;

    act(() => {
      result.current.handleClick(mockEvent);
    });

    expect(result.current.particles).toHaveLength(3);
  });

  it('does not create particles when disabled', () => {
    const { result } = renderHook(() => useClickParticles({ enabled: false }));

    const mockEvent = {
      clientX: 100,
      clientY: 200,
    } as React.MouseEvent<HTMLButtonElement>;

    act(() => {
      result.current.handleClick(mockEvent);
    });

    expect(result.current.particles).toHaveLength(0);
  });

  it('calls original onClick when provided', () => {
    const originalOnClick = vi.fn();
    const { result } = renderHook(() => useClickParticles({ enabled: false }));

    const mockEvent = {
      clientX: 100,
      clientY: 200,
    } as React.MouseEvent<HTMLButtonElement>;

    act(() => {
      result.current.handleClick(mockEvent, originalOnClick);
    });

    expect(originalOnClick).toHaveBeenCalledWith(mockEvent);
  });

  it('creates particles with correct position from click event', () => {
    const { result } = renderHook(() => useClickParticles({ enabled: true, count: 1 }));

    const mockEvent = {
      clientX: 150,
      clientY: 250,
    } as React.MouseEvent<HTMLButtonElement>;

    act(() => {
      result.current.handleClick(mockEvent);
    });

    expect(result.current.particles[0].x).toBe(150);
    expect(result.current.particles[0].y).toBe(250);
  });

  it('particles have required properties', () => {
    const { result } = renderHook(() => useClickParticles({ enabled: true, count: 1 }));

    const mockEvent = {
      clientX: 100,
      clientY: 200,
    } as React.MouseEvent<HTMLButtonElement>;

    act(() => {
      result.current.handleClick(mockEvent);
    });

    const particle = result.current.particles[0];
    expect(particle).toHaveProperty('id');
    expect(particle).toHaveProperty('x');
    expect(particle).toHaveProperty('y');
    expect(particle).toHaveProperty('vx');
    expect(particle).toHaveProperty('vy');
    expect(particle).toHaveProperty('size');
    expect(particle).toHaveProperty('color');
    expect(particle).toHaveProperty('opacity');
  });

  it('uses default count of 8 particles', () => {
    const { result } = renderHook(() => useClickParticles({ enabled: true }));

    const mockEvent = {
      clientX: 100,
      clientY: 200,
    } as React.MouseEvent<HTMLButtonElement>;

    act(() => {
      result.current.handleClick(mockEvent);
    });

    expect(result.current.particles).toHaveLength(8);
  });

  it('accumulates particles on multiple clicks', () => {
    const { result } = renderHook(() => useClickParticles({ enabled: true, count: 2 }));

    const mockEvent = {
      clientX: 100,
      clientY: 200,
    } as React.MouseEvent<HTMLButtonElement>;

    act(() => {
      result.current.handleClick(mockEvent);
      result.current.handleClick(mockEvent);
    });

    expect(result.current.particles).toHaveLength(4);
  });
});
