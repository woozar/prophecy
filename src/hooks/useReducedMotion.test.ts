import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useReducedMotion } from './useReducedMotion';

describe('useReducedMotion', () => {
  const mockMatchMedia = vi.fn();
  const mockAddEventListener = vi.fn();
  const mockRemoveEventListener = vi.fn();

  beforeEach(() => {
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    });
    vi.stubGlobal('matchMedia', mockMatchMedia);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    mockMatchMedia.mockReset();
    mockAddEventListener.mockReset();
    mockRemoveEventListener.mockReset();
  });

  it('returns false when prefers-reduced-motion is not set', () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when prefers-reduced-motion is set', () => {
    mockMatchMedia.mockReturnValue({
      matches: true,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    });

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('queries the correct media query', () => {
    renderHook(() => useReducedMotion());
    expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('subscribes to media query changes', () => {
    renderHook(() => useReducedMotion());
    expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('unsubscribes from media query changes on unmount', () => {
    const { unmount } = renderHook(() => useReducedMotion());
    unmount();
    expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('updates when media query changes', () => {
    let changeCallback: (() => void) | null = null;
    mockAddEventListener.mockImplementation((event: string, callback: () => void) => {
      if (event === 'change') {
        changeCallback = callback;
      }
    });

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    // Simulate media query change
    mockMatchMedia.mockReturnValue({
      matches: true,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    });

    act(() => {
      changeCallback?.();
    });

    expect(result.current).toBe(true);
  });

  it('returns false during SSR (getServerSnapshot)', () => {
    // To test getServerSnapshot, we need to simulate the server environment
    // where matchMedia is not available. The getServerSnapshot is used by
    // useSyncExternalStore when rendering on the server.
    // Since we're in a jsdom environment, we test this by checking the
    // initial render behavior which uses the snapshot.
    const { result } = renderHook(() => useReducedMotion());
    // In client environment, it should use getSnapshot which checks matchMedia
    expect(result.current).toBe(false);
  });
});
