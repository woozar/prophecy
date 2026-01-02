import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAnimationLoop } from './useAnimationLoop';

describe('useAnimationLoop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial timestamp', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const { result } = renderHook(() => useAnimationLoop(100));

    expect(result.current).toBe(now);
  });

  it('updates timestamp at specified interval', () => {
    const startTime = 1000000;
    vi.setSystemTime(startTime);

    const { result } = renderHook(() => useAnimationLoop(50));

    expect(result.current).toBe(startTime);

    // Advance time by interval
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // After advancing, the hook should have a newer timestamp
    expect(result.current).toBeGreaterThan(startTime);
  });

  it('cleans up interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    const { unmount } = renderHook(() => useAnimationLoop(100));

    expect(clearIntervalSpy).not.toHaveBeenCalled();

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

    clearIntervalSpy.mockRestore();
  });

  it('recreates interval when intervalMs changes', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    const { rerender } = renderHook(({ interval }) => useAnimationLoop(interval), {
      initialProps: { interval: 100 },
    });

    expect(clearIntervalSpy).not.toHaveBeenCalled();

    rerender({ interval: 200 });

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

    clearIntervalSpy.mockRestore();
  });

  it('uses different intervals correctly', () => {
    const startTime = 1000000;
    vi.setSystemTime(startTime);

    const { result } = renderHook(() => useAnimationLoop(30));

    const initialTime = result.current;

    // 30ms interval for ~33fps animation
    act(() => {
      vi.advanceTimersByTime(30);
    });

    // Should have updated
    expect(result.current).toBeGreaterThan(initialTime);
  });
});
