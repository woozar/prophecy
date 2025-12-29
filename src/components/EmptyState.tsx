'use client';

import { ReactNode, memo, useMemo } from 'react';

import { Card } from '@/components/Card';

interface EmptyStateProps {
  /** Main message to display */
  message: string;
  /** Optional icon element */
  icon?: ReactNode;
  /** Optional description text */
  description?: string;
  /** Optional action button or element */
  action?: ReactNode;
  /** Card padding size */
  padding?: 'p-6' | 'p-8';
}

export const EmptyState = memo(function EmptyState({
  message,
  icon,
  description,
  action,
  padding = 'p-8',
}: Readonly<EmptyStateProps>) {
  const hasExtras = useMemo(() => icon || description || action, [icon, description, action]);

  if (hasExtras) {
    return (
      <Card padding={padding}>
        <div className="text-center">
          {icon && (
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[rgba(6,182,212,0.1)] flex items-center justify-center">
              {icon}
            </div>
          )}
          <h2 className="text-xl font-semibold text-white mb-2">{message}</h2>
          {description && <p className="text-(--text-secondary)">{description}</p>}
          {action && <div className="mt-4">{action}</div>}
        </div>
      </Card>
    );
  }

  return (
    <Card padding={padding}>
      <p className="text-center text-(--text-muted)">{message}</p>
    </Card>
  );
});
