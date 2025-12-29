'use client';

import { ReactNode, memo, useMemo } from 'react';

import { Modal as MantineModal, type ModalProps as MantineModalProps } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

import { useReducedMotion } from '@/hooks/useReducedMotion';

type ModalVariant = 'default' | 'danger' | 'warning' | 'violet';

interface ModalProps extends Omit<MantineModalProps, 'styles' | 'classNames' | 'title'> {
  children: ReactNode;
  /** Modal title */
  title?: ReactNode;
  /** Modal variant for different border colors */
  variant?: ModalVariant;
  /** Disable glow animation */
  noAnimation?: boolean;
  /** Show close button in header */
  showCloseButton?: boolean;
}

const variantStyles = {
  default: {
    primary: '#06b6d4',
    secondary: '#14b8a6',
    tertiary: '#8b5cf6',
    borderColor: 'rgba(6,182,212,0.4)',
    shadowColor: 'rgba(6,182,212,0.25)',
    glowColor: 'rgba(6,182,212,0.15)',
  },
  danger: {
    primary: '#ef4444',
    secondary: '#f97316',
    tertiary: '#ec4899',
    borderColor: 'rgba(239,68,68,0.4)',
    shadowColor: 'rgba(239,68,68,0.25)',
    glowColor: 'rgba(239,68,68,0.15)',
  },
  warning: {
    primary: '#eab308',
    secondary: '#f97316',
    tertiary: '#84cc16',
    borderColor: 'rgba(234,179,8,0.4)',
    shadowColor: 'rgba(234,179,8,0.25)',
    glowColor: 'rgba(234,179,8,0.15)',
  },
  violet: {
    primary: '#8b5cf6',
    secondary: '#a855f7',
    tertiary: '#6366f1',
    borderColor: 'rgba(139,92,246,0.4)',
    shadowColor: 'rgba(139,92,246,0.25)',
    glowColor: 'rgba(139,92,246,0.15)',
  },
};

export const Modal = memo(function Modal({
  children,
  variant = 'default',
  title,
  noAnimation = false,
  showCloseButton = false,
  onClose,
  ...props
}: Readonly<ModalProps>) {
  const colors = variantStyles[variant];
  const reducedMotion = useReducedMotion();
  const shouldAnimate = !noAnimation && !reducedMotion;

  const styles = useMemo(
    () => ({
      overlay: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      },
      inner: {
        padding: '1rem',
      },
      content: {
        background: 'transparent',
        boxShadow: 'none',
        overflow: 'visible',
      },
      body: {
        padding: 0,
      },
    }),
    []
  );

  const gradientBorder = useMemo(
    () =>
      `linear-gradient(135deg, ${colors.primary}, ${colors.secondary}, ${colors.tertiary}, ${colors.primary})`,
    [colors]
  );

  return (
    <MantineModal centered styles={styles} withCloseButton={false} onClose={onClose} {...props}>
      {/* Outer fog layer - very diffuse */}
      <div
        className="absolute -inset-16 rounded-3xl -z-50 opacity-40"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${colors.primary}40 0%, transparent 70%)`,
          filter: 'blur(40px)',
          animation: shouldAnimate ? 'modal-glow-pulse 4s ease-in-out infinite' : 'none',
        }}
      />
      {/* Mid fog layer */}
      <div
        className="absolute -inset-10 rounded-2xl -z-40 opacity-50"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 50%, ${colors.secondary}50 0%, transparent 60%)`,
          filter: 'blur(30px)',
          animation: shouldAnimate ? 'modal-glow-pulse 3s ease-in-out infinite reverse' : 'none',
        }}
      />
      {/* Inner fog layer - more intense */}
      <div
        className="absolute -inset-6 rounded-2xl -z-30 opacity-60"
        style={{
          background: `radial-gradient(ellipse at center, ${colors.shadowColor} 0%, transparent 70%)`,
          filter: 'blur(20px)',
          animation: shouldAnimate ? 'modal-glow-pulse 3.5s ease-in-out infinite' : 'none',
        }}
      />
      {/* Animated glow effect (blurred border) */}
      <div
        className="absolute -inset-[2px] rounded-xl opacity-60 -z-20"
        style={{
          background: gradientBorder,
          backgroundSize: '300% 300%',
          animation: shouldAnimate ? 'modal-border-flow 4s ease infinite' : 'none',
          filter: 'blur(15px)',
        }}
      />
      {/* Secondary blur layer */}
      <div
        className="absolute -inset-1 rounded-xl opacity-40 -z-15"
        style={{
          background: gradientBorder,
          backgroundSize: '300% 300%',
          animation: shouldAnimate ? 'modal-border-flow 4s ease infinite' : 'none',
          filter: 'blur(8px)',
        }}
      />
      {/* Crisp gradient border */}
      <div
        className="absolute -inset-[2px] rounded-xl -z-10"
        style={{
          background: gradientBorder,
          backgroundSize: '300% 300%',
          animation: shouldAnimate ? 'modal-border-flow 4s ease infinite' : 'none',
        }}
      />
      {/* Modal content background */}
      <div className="relative bg-[rgba(16,32,48,0.98)] rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] p-6">
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between gap-4 mb-4">
            {title && <h3 className="text-lg font-semibold text-white">{title}</h3>}
            {showCloseButton && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-(--text-muted) hover:text-white hover:bg-[rgba(98,125,152,0.2)] transition-colors"
                aria-label="Schließen"
              >
                <IconX size={18} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </MantineModal>
  );
});
