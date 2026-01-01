'use client';

import { useCallback, useState } from 'react';

import { apiClient } from '@/lib/api-client';
import { showErrorToast, showSuccessToast } from '@/lib/toast/toast';

interface UseExportRoundResult {
  exportRound: (roundId: string) => Promise<void>;
  isExporting: boolean;
  exportingRoundId: string | null;
}

export function useExportRound(): UseExportRoundResult {
  const [exportingRoundId, setExportingRoundId] = useState<string | null>(null);

  const exportRound = useCallback(async (roundId: string) => {
    setExportingRoundId(roundId);
    try {
      const { data, error } = await apiClient.rounds.export(roundId);

      if (error) {
        throw new Error((error as { error?: string }).error || 'Fehler beim Exportieren');
      }

      if (data) {
        const url = URL.createObjectURL(data.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        showSuccessToast('Export erfolgreich');
      }
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setExportingRoundId(null);
    }
  }, []);

  return {
    exportRound,
    isExporting: exportingRoundId !== null,
    exportingRoundId,
  };
}
