'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { IconLoader2 } from '@tabler/icons-react';

import { apiClient } from '@/lib/api-client/client';

import { AuditLogEntry, AuditLogTimeline } from './AuditLogTimeline';
import { Modal } from './Modal';

interface ProphecyAuditModalProps {
  prophecyId: string | null;
  prophecyTitle?: string;
  onClose: () => void;
}

export const ProphecyAuditModal = memo(function ProphecyAuditModal({
  prophecyId,
  prophecyTitle,
  onClose,
}: Readonly<ProphecyAuditModalProps>) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!prophecyId) return;

    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await apiClient.prophecies.getAuditLogs(prophecyId);
      if (fetchError) {
        setError('Fehler beim Laden des Verlaufs');
      } else if (data?.auditLogs) {
        setLogs(data.auditLogs);
      }
    } catch {
      setError('Fehler beim Laden des Verlaufs');
    } finally {
      setIsLoading(false);
    }
  }, [prophecyId]);

  useEffect(() => {
    if (prophecyId) {
      fetchLogs();
    } else {
      setLogs([]);
      setError(null);
    }
  }, [prophecyId, fetchLogs]);

  // Listen for SSE events to auto-refresh when audit log is updated
  useEffect(() => {
    if (!prophecyId) return;

    const eventSource = new EventSource('/api/sse');
    eventSourceRef.current = eventSource;

    const handleAuditLogCreated = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as { prophecyId: string };
        if (data.prophecyId === prophecyId) {
          // Refetch logs when this prophecy's audit log is updated
          fetchLogs();
        }
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.addEventListener('auditLog:created', handleAuditLogCreated);

    return () => {
      eventSource.removeEventListener('auditLog:created', handleAuditLogCreated);
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [prophecyId, fetchLogs]);

  const title = prophecyTitle ? `Verlauf: ${prophecyTitle}` : 'Änderungsverlauf';

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8 gap-2 text-(--text-muted)">
          <IconLoader2 size={20} className="animate-spin" />
          <span>Laden...</span>
        </div>
      );
    }

    if (error) {
      return <p className="text-sm text-red-400 text-center py-4">{error}</p>;
    }

    return <AuditLogTimeline logs={logs} />;
  };

  return (
    <Modal opened={!!prophecyId} onClose={onClose} title={title} size="lg" showCloseButton>
      {renderContent()}
    </Modal>
  );
});
