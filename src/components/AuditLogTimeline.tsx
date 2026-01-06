'use client';

import { memo, useMemo } from 'react';

import {
  IconEdit,
  IconHistory,
  IconRefresh,
  IconRobot,
  IconStar,
  IconTrash,
} from '@tabler/icons-react';

import { formatDate } from '@/lib/formatting/date';
import {
  type AuditAction,
  AuditActions,
  type AuditEntityType,
  auditEntityTypeSchema,
} from '@/lib/schemas/audit';

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
  ANALYZE: IconRobot,
};

const actionColorMap: Record<AuditAction, string> = {
  CREATE: '#22d3ee', // cyan
  UPDATE: '#eab308', // yellow
  DELETE: '#ef4444', // red
  BULK_DELETE: '#f97316', // orange
  ANALYZE: '#a855f7', // purple (AI)
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
          <span className="text-red-400/80 line-through wrap-break-word">
            {oldValue || <em className="text-(--text-muted)">(leer)</em>}
          </span>
        </div>
        <div className="flex gap-2">
          <span className="text-green-400 shrink-0">+</span>
          <span className="text-green-400/80 wrap-break-word">
            {newValue || <em className="text-(--text-muted)">(leer)</em>}
          </span>
        </div>
      </div>
    </div>
  );
});

function formatRatingValue(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function getRatingDescription(log: AuditLogEntry, userName: string): string | null {
  if (log.action === AuditActions.BULK_DELETE) {
    const oldData = log.oldValue ? JSON.parse(log.oldValue) : {};
    const count = oldData.count || 'Alle';
    const plural = oldData.count === 1 ? '' : 'en';
    return `${count} Bewertung${plural} wurden zurückgesetzt`;
  }

  const newData = log.newValue ? JSON.parse(log.newValue) : {};
  const oldData = log.oldValue ? JSON.parse(log.oldValue) : {};

  switch (log.action) {
    case AuditActions.CREATE:
      return `${userName} hat mit ${formatRatingValue(newData.value)} bewertet`;
    case AuditActions.UPDATE:
      return `${userName} hat Bewertung von ${formatRatingValue(oldData.value)} auf ${formatRatingValue(newData.value)} geändert`;
    case AuditActions.DELETE:
      return `${userName} hat Bewertung entfernt`;
    default:
      return null;
  }
}

function getProphecyDescription(log: AuditLogEntry, userName: string): string | null {
  switch (log.action) {
    case AuditActions.CREATE:
      return `${userName} hat die Prophezeiung erstellt`;
    case AuditActions.UPDATE:
      return `${userName} hat die Prophezeiung bearbeitet`;
    case AuditActions.DELETE:
      return `${userName} hat die Prophezeiung gelöscht`;
    case AuditActions.ANALYZE:
      return `${userName} hat eine Inhaltsanalyse durchgeführt`;
    default:
      return null;
  }
}

function getLogDescription(log: AuditLogEntry): string {
  const userName = log.user?.displayName || log.user?.username || 'Unbekannt';

  if (log.entityType === auditEntityTypeSchema.enum.RATING) {
    const description = getRatingDescription(log, userName);
    if (description) return description;
  }

  if (log.entityType === auditEntityTypeSchema.enum.PROPHECY) {
    const description = getProphecyDescription(log, userName);
    if (description) return description;
  }

  return `${userName} hat eine Änderung vorgenommen`;
}

interface AuditLogEntryItemProps {
  log: AuditLogEntry;
}

const AuditLogEntryItem = memo(function AuditLogEntryItem({ log }: AuditLogEntryItemProps) {
  const description = useMemo(() => getLogDescription(log), [log]);

  const prophecyChanges = useMemo(() => {
    if (log.entityType === auditEntityTypeSchema.enum.PROPHECY && log.action === 'UPDATE') {
      return getProphecyChanges(log.oldValue, log.newValue);
    }
    return null;
  }, [log]);

  const formattedDate = useMemo(() => formatDate(log.createdAt, 'datetime'), [log.createdAt]);

  return (
    <div className="flex gap-3 py-3 border-b border-[rgba(98,125,152,0.2)] last:border-b-0">
      <div className="shrink-0 mt-0.5">
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
