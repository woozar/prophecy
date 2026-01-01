import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/lib/api-client';
import { showErrorToast, showSuccessToast } from '@/lib/toast/toast';

import { useExportRound } from './useExportRound';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    rounds: {
      export: vi.fn(),
    },
  },
}));

vi.mock('@/lib/toast/toast', () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}));

// Mock matchMedia for JSDOM
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

describe('useExportRound', () => {
  const mockBlob = new Blob(['test'], { type: 'application/octet-stream' });
  const mockFilename = 'export.xlsx';
  const mockRoundId = 'round-123';

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock URL methods
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useExportRound());

    expect(result.current.isExporting).toBe(false);
    expect(result.current.exportingRoundId).toBeNull();
    expect(typeof result.current.exportRound).toBe('function');
  });

  it('should export round successfully', async () => {
    vi.mocked(apiClient.rounds.export).mockResolvedValueOnce({
      data: { blob: mockBlob, filename: mockFilename },
      error: null,
      response: new Response(),
    });

    const { result } = renderHook(() => useExportRound());

    await act(async () => {
      await result.current.exportRound(mockRoundId);
    });

    expect(apiClient.rounds.export).toHaveBeenCalledWith(mockRoundId);
    expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(showSuccessToast).toHaveBeenCalledWith('Export erfolgreich');
  });

  it('should set exportingRoundId while exporting', async () => {
    let resolveExport: (value: unknown) => void;
    const exportPromise = new Promise((resolve) => {
      resolveExport = resolve;
    });

    vi.mocked(apiClient.rounds.export).mockReturnValueOnce(
      exportPromise as ReturnType<typeof apiClient.rounds.export>
    );

    const { result } = renderHook(() => useExportRound());

    expect(result.current.exportingRoundId).toBeNull();
    expect(result.current.isExporting).toBe(false);

    act(() => {
      result.current.exportRound(mockRoundId);
    });

    await waitFor(() => {
      expect(result.current.exportingRoundId).toBe(mockRoundId);
      expect(result.current.isExporting).toBe(true);
    });

    await act(async () => {
      resolveExport!({ data: null, error: null });
    });

    await waitFor(() => {
      expect(result.current.exportingRoundId).toBeNull();
      expect(result.current.isExporting).toBe(false);
    });
  });

  it('should handle API error with message', async () => {
    vi.mocked(apiClient.rounds.export).mockResolvedValueOnce({
      data: null,
      error: { error: 'Export fehlgeschlagen' },
      response: new Response(),
    });

    const { result } = renderHook(() => useExportRound());

    await act(async () => {
      await result.current.exportRound(mockRoundId);
    });

    expect(showErrorToast).toHaveBeenCalledWith('Export fehlgeschlagen');
    expect(result.current.isExporting).toBe(false);
  });

  it('should handle API error without message', async () => {
    vi.mocked(apiClient.rounds.export).mockResolvedValueOnce({
      data: null,
      error: {},
      response: new Response(),
    });

    const { result } = renderHook(() => useExportRound());

    await act(async () => {
      await result.current.exportRound(mockRoundId);
    });

    expect(showErrorToast).toHaveBeenCalledWith('Fehler beim Exportieren');
  });

  it('should handle thrown Error', async () => {
    vi.mocked(apiClient.rounds.export).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useExportRound());

    await act(async () => {
      await result.current.exportRound(mockRoundId);
    });

    expect(showErrorToast).toHaveBeenCalledWith('Network error');
    expect(result.current.isExporting).toBe(false);
  });

  it('should handle non-Error thrown value', async () => {
    vi.mocked(apiClient.rounds.export).mockRejectedValueOnce('Unknown error');

    const { result } = renderHook(() => useExportRound());

    await act(async () => {
      await result.current.exportRound(mockRoundId);
    });

    expect(showErrorToast).toHaveBeenCalledWith('Unbekannter Fehler');
  });
});
