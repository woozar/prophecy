'use client';

import { memo, useMemo } from 'react';

import type { ConnectionStatus } from '@/hooks/useSSE';
import { useUserStore } from '@/store/useUserStore';

const statusConfig: Record<ConnectionStatus, { color: string; glow: string; label: string }> = {
  connected: { color: '#22d3ee', glow: 'rgba(6, 182, 212, 0.6)', label: 'Verbunden' },
  connecting: { color: '#eab308', glow: 'rgba(234, 179, 8, 0.5)', label: 'Verbinde...' },
  disconnected: { color: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)', label: 'Getrennt' },
};

export const SSEStatusIndicator = memo(function SSEStatusIndicator() {
  const connectionStatus = useUserStore((state) => state.connectionStatus);

  const indicatorStyle = useMemo(
    () => ({
      width: 8,
      height: 8,
      borderRadius: '50%',
      backgroundColor: statusConfig[connectionStatus].color,
      boxShadow: `0 0 8px 2px ${statusConfig[connectionStatus].glow}`,
    }),
    [connectionStatus]
  );

  return (
    <output
      aria-live="polite"
      aria-label={`Verbindungsstatus: ${statusConfig[connectionStatus].label}`}
      style={indicatorStyle}
      title={`SSE: ${statusConfig[connectionStatus].label}`}
    />
  );
});
