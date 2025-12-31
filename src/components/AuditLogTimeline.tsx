'use client';

import { memo, useMemo } from 'react';

import { IconEdit, IconHistory, IconRefresh, IconStar, IconTrash } from '@tabler/icons-react';

import { formatDate } from '@/lib/formatting/date';

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'BULK_DELETE';
type AuditEntityType = 'RATING' | 'PROPHECY';

export interface AuditLogEntry {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  prophecyId: string | null;
  userId: string;
  oldValue: string | null;
  newValue: string | null;
  context: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
  };
}

interface AuditLogTimelineProps {
  logs: AuditLogEntry[];
}

const actionIconMap: Record<AuditAction, typeof IconStar> = {
  CREATE: IconStar,
  UPDATE: IconEdit,
  DELETE: IconTrash,
  BULK_DELETE: IconRefresh,
};

const actionColorMap: Record<AuditAction, string> = {
  CREATE: '#22d3ee', // cyan
  UPDATE: '#eab308', // yellow
  DELETE: '#ef4444', // red
  BULK_DELETE: '#f97316', // orange
};

interface ActionIconProps {
  action: AuditAction;
}

const ActionIcon = memo(function ActionIcon({ action }: ActionIconProps) {
  const Icon = actionIconMap[action] || IconHistory;
  const color = actionColorMap[action] || 'var(--text-muted)';

  return <Icon size={16} style={{ color }} />;
});

interface ProphecyChangeDetails {
  titleChanged: boolean;
  descriptionChanged: boolean;
  oldTitle?: string;
  newTitle?: string;
  oldDescription?: string;
  newDescription?: string;
}

function getProphecyChanges(
  oldValue: string | null,
  newValue: string | null
): ProphecyChangeDetails | null {
  if (!oldValue || !newValue) return null;

  try {
    const oldData = JSON.parse(oldValue) as { title?: string; description?: string };
    const newData = JSON.parse(newValue) as { title?: string; description?: string };

    const titleChanged = oldData.title !== newData.title;
    const descriptionChanged = oldData.description !== newData.description;

    if (!titleChanged && !descriptionChanged) return null;

    return {
      titleChanged,
      descriptionChanged,
      oldTitle: oldData.title,
      newTitle: newData.title,
      oldDescription: oldData.description,
      newDescription: newData.description,
    };
  } catch {
    return null;
  }
}

interface ChangeDetailProps {
  label: string;
  oldValue?: string;
  newValue?: string;
}

const ChangeDetail = memo(function ChangeDetail({ label, oldValue, newValue }: ChangeDetailProps) {
  return (
    <div className="mt-2 text-xs">
      <span className="text-(--text-muted)">{label}:</span>
      <div className="mt-1 space-y-1">
        <div className="flex gap-2">
          <span className="text-red-400 shrink-0">−</span>
          <span className="text-red-400/80 line-through break-words">
            {oldValue || <em className="text-(--text-muted)">(leer)</em>}
          </span>
        </div>
        <div className="flex gap-2">
          <span className="text-green-400 shrink-0">+</span>
          <span className="text-green-400/80 break-words">
            {newValue || <em className="text-(--text-muted)">(leer)</em>}
          </span>
        </div>
      </div>
    </div>
  );
});

interface AuditLogEntryItemProps {
  log: AuditLogEntry;
}

const AuditLogEntryItem = memo(function AuditLogEntryItem({ log }: AuditLogEntryItemProps) {
  const description = useMemo(() => {
    const userName = log.user?.displayName || log.user?.username || 'Unbekannt';

    if (log.entityType === 'RATING') {
      if (log.action === 'BULK_DELETE') {
        const oldData = log.oldValue ? JSON.parse(log.oldValue) : {};
        return `${oldData.count || 'Alle'} Bewertung${oldData.count !== 1 ? 'en' : ''} wurden zurückgesetzt`;
      }
      const newData = log.newValue ? JSON.parse(log.newValue) : {};
      const oldData = log.oldValue ? JSON.parse(log.oldValue) : {};

      if (log.action === 'CREATE') {
        const valueStr = newData.value > 0 ? `+${newData.value}` : String(newData.value);
        return `${userName} hat mit ${valueStr} bewertet`;
      }
      if (log.action === 'UPDATE') {
        const oldValueStr = oldData.value > 0 ? `+${oldData.value}` : String(oldData.value);
        const newValueStr = newData.value > 0 ? `+${newData.value}` : String(newData.value);
        return `${userName} hat Bewertung von ${oldValueStr} auf ${newValueStr} geändert`;
      }
      if (log.action === 'DELETE') {
        return `${userName} hat Bewertung entfernt`;
      }
    }

    if (log.entityType === 'PROPHECY') {
      if (log.action === 'CREATE') {
        return `${userName} hat die Prophezeiung erstellt`;
      }
      if (log.action === 'UPDATE') {
        return `${userName} hat die Prophezeiung bearbeitet`;
      }
      if (log.action === 'DELETE') {
        return `${userName} hat die Prophezeiung gelöscht`;
      }
    }

    return `${userName} hat eine Änderung vorgenommen`;
  }, [log]);

  const prophecyChanges = useMemo(() => {
    if (log.entityType === 'PROPHECY' && log.action === 'UPDATE') {
      return getProphecyChanges(log.oldValue, log.newValue);
    }
    return null;
  }, [log]);

  const formattedDate = useMemo(() => formatDate(log.createdAt, 'datetime'), [log.createdAt]);

  return (
    <div className="flex gap-3 py-3 border-b border-[rgba(98,125,152,0.2)] last:border-b-0">
      <div className="flex-shrink-0 mt-0.5">
        <ActionIcon action={log.action} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">{description}</p>
        {prophecyChanges?.titleChanged && (
          <ChangeDetail
            label="Titel"
            oldValue={prophecyChanges.oldTitle}
            newValue={prophecyChanges.newTitle}
          />
        )}
        {prophecyChanges?.descriptionChanged && (
          <ChangeDetail
            label="Beschreibung"
            oldValue={prophecyChanges.oldDescription}
            newValue={prophecyChanges.newDescription}
          />
        )}
        {log.context && <p className="text-xs text-(--text-muted) mt-1 italic">{log.context}</p>}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-(--text-muted)">{formattedDate}</span>
        </div>
      </div>
    </div>
  );
});

export const AuditLogTimeline = memo(function AuditLogTimeline({
  logs,
}: Readonly<AuditLogTimelineProps>) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-(--text-muted) text-center py-4">
        Keine Änderungen protokolliert.
      </p>
    );
  }

  return (
    <div className="divide-y divide-[rgba(98,125,152,0.2)]">
      {logs.map((log) => (
        <AuditLogEntryItem key={log.id} log={log} />
      ))}
    </div>
  );
});
