'use client';

import { memo, useMemo, ReactNode } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';

type ModalVariant = 'danger' | 'warning' | 'violet';

interface ConfirmModalProps {
  /** Whether the modal is open */
  opened: boolean;
  /** Called when the modal is closed */
  onClose: () => void;
  /** Called when the confirm button is clicked */
  onConfirm: () => void;
  /** Modal title */
  title: string;
  /** Modal message/content */
  children: ReactNode;
  /** Text for the confirm button */
  confirmText: string;
  /** Text shown while submitting */
  confirmingText?: string;
  /** Whether the action is in progress */
  isSubmitting?: boolean;
  /** Modal variant - determines colors */
  variant?: ModalVariant;
}

const outlineVariants: Record<
  ModalVariant,
  'danger-outline' | 'warning-outline' | 'violet-outline'
> = {
  danger: 'danger-outline',
  warning: 'warning-outline',
  violet: 'violet-outline',
};

export const ConfirmModal = memo(function ConfirmModal({
  opened,
  onClose,
  onConfirm,
  title,
  children,
  confirmText,
  confirmingText = 'Bitte warten...',
  isSubmitting = false,
  variant = 'danger',
}: Readonly<ConfirmModalProps>) {
  const outlineVariant = useMemo(() => outlineVariants[variant], [variant]);

  return (
    <Modal opened={opened} onClose={onClose} title={title} variant={variant} size="sm">
      <div className="text-(--text-muted) mb-6">{children}</div>

      <div className="flex justify-end gap-3">
        <Button variant={outlineVariant} onClick={onClose} disabled={isSubmitting}>
          Abbrechen
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? confirmingText : confirmText}
        </Button>
      </div>
    </Modal>
  );
});
