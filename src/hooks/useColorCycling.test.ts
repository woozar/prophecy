import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useColorCycling } from './useColorCycling';

describe('useColorCycling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns first color initially', () => {
    const colors = ['cyan', 'violet', 'emerald'];

    const { result } = renderHook(() => useColorCycling(colors, 2000));

    expect(result.current).toBe('cyan');
  });

  it('cycles through colors at specified interval', () => {
    const colors = ['cyan', 'violet', 'emerald'];

    const { result } = renderHook(() => useColorCycling(colors, 2000));

    expect(result.current).toBe('cyan');

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current).toBe('violet');

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current).toBe('emerald');
  });

  it('wraps around to first color after last', () => {
    const colors = ['cyan', 'violet'];

    const { result } = renderHook(() => useColorCycling(colors, 1000));

    expect(result.current).toBe('cyan');

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current).toBe('violet');

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current).toBe('cyan');
  });

  it('returns fallback cyan for empty array', () => {
    const { result } = renderHook(() => useColorCycling([], 1000));

    expect(result.current).toBe('cyan');
  });

  it('does not start interval for single color', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval');

    renderHook(() => useColorCycling(['cyan'], 1000));

    expect(setIntervalSpy).not.toHaveBeenCalled();

    setIntervalSpy.mockRestore();
  });

  it('returns single color without cycling', () => {
    const { result } = renderHook(() => useColorCycling(['violet'], 1000));

    expect(result.current).toBe('violet');

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Still the same color
    expect(result.current).toBe('violet');
  });

  it('cleans up interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const colors = ['cyan', 'violet'];

    const { unmount } = renderHook(() => useColorCycling(colors, 1000));

    expect(clearIntervalSpy).not.toHaveBeenCalled();

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

    clearIntervalSpy.mockRestore();
  });

  it('recreates interval when colors length changes', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    const { rerender } = renderHook(({ colors }) => useColorCycling(colors, 1000), {
      initialProps: { colors: ['cyan', 'violet'] },
    });

    rerender({ colors: ['cyan', 'violet', 'emerald'] });

    expect(clearIntervalSpy).toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
  });

  it('recreates interval when intervalMs changes', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const colors = ['cyan', 'violet'];

    const { rerender } = renderHook(({ interval }) => useColorCycling(colors, interval), {
      initialProps: { interval: 1000 },
    });

    rerender({ interval: 2000 });

    expect(clearIntervalSpy).toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
  });
});
