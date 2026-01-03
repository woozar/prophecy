import { createElement } from 'react';

import type { NotificationData } from '@mantine/notifications';

import { createErrorToastContent } from './ErrorToastContent';

// Custom Icons als React Elemente
const CheckIcon = createElement(
  'svg',
  {
    xmlns: 'http://www.w3.org/2000/svg',
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: '#22d3ee',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  createElement('path', { d: 'M20 6 9 17l-5-5' })
);

const XIcon = createElement(
  'svg',
  {
    xmlns: 'http://www.w3.org/2000/svg',
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: '#f87171',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  createElement('circle', { cx: 12, cy: 12, r: 10 }),
  createElement('path', { d: 'm15 9-6 6' }),
  createElement('path', { d: 'm9 9 6 6' })
);

const WarningIcon = createElement(
  'svg',
  {
    xmlns: 'http://www.w3.org/2000/svg',
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: '#fbbf24',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  createElement('path', {
    d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3',
  }),
  createElement('path', { d: 'M12 9v4' }),
  createElement('path', { d: 'M12 17h.01' })
);

const InfoIcon = createElement(
  'svg',
  {
    xmlns: 'http://www.w3.org/2000/svg',
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: '#06b6d4',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  createElement('circle', { cx: 12, cy: 12, r: 10 }),
  createElement('path', { d: 'M12 16v-4' }),
  createElement('path', { d: 'M12 8h.01' })
);

// Success Toast - Cyan/Teal glow
export const successToast = (title: string, message?: string): NotificationData => ({
  title,
  message,
  icon: CheckIcon,
  autoClose: 4000,
  withCloseButton: true,
  styles: {
    root: {
      background: 'linear-gradient(135deg, rgba(16, 42, 67, 0.95), rgba(10, 25, 41, 0.98))',
      border: '1px solid rgba(6, 182, 212, 0.5)',
      backdropFilter: 'blur(16px)',
      borderRadius: '12px',
      boxShadow:
        '0 4px 24px rgba(0, 0, 0, 0.5), 0 0 60px rgba(6, 182, 212, 0.25), 0 0 20px rgba(6, 182, 212, 0.2), inset 0 1px 0 rgba(6, 182, 212, 0.15)',
    },
    icon: {
      backgroundColor: 'rgba(6, 182, 212, 0.15)',
      borderRadius: '8px',
    },
    title: {
      color: '#22d3ee',
      fontWeight: 600,
    },
    description: {
      color: '#9fb3c8',
    },
    closeButton: {
      color: '#627d98',
      '&:hover': {
        backgroundColor: 'rgba(6, 182, 212, 0.15)',
        color: '#22d3ee',
      },
    },
  },
});

// Error Toast - Red glow
export const errorToast = (title: string, message?: string): NotificationData => ({
  title,
  message,
  icon: XIcon,
  autoClose: 6000,
  withCloseButton: true,
  styles: {
    root: {
      background: 'linear-gradient(135deg, rgba(30, 15, 20, 0.98), rgba(20, 10, 15, 0.99))',
      border: '2px solid rgba(239, 68, 68, 0.5)',
      backdropFilter: 'blur(16px)',
      borderRadius: '12px',
      boxShadow:
        '0 4px 24px rgba(0, 0, 0, 0.6), 0 0 60px rgba(239, 68, 68, 0.3), 0 0 30px rgba(239, 68, 68, 0.25), inset 0 1px 0 rgba(239, 68, 68, 0.15)',
    },
    icon: {
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
      borderRadius: '8px',
    },
    title: {
      color: '#f87171',
      fontWeight: 600,
    },
    description: {
      color: '#9fb3c8',
    },
    closeButton: {
      color: '#627d98',
      '&:hover': {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        color: '#f87171',
      },
    },
  },
});

// Warning Toast - Amber glow
export const warningToast = (title: string, message?: string): NotificationData => ({
  title,
  message,
  icon: WarningIcon,
  autoClose: 5000,
  withCloseButton: true,
  styles: {
    root: {
      background: 'linear-gradient(135deg, rgba(30, 25, 15, 0.95), rgba(15, 12, 8, 0.98))',
      border: '1px solid rgba(251, 191, 36, 0.4)',
      backdropFilter: 'blur(16px)',
      borderRadius: '12px',
      boxShadow:
        '0 4px 24px rgba(0, 0, 0, 0.5), 0 0 40px rgba(251, 191, 36, 0.12), inset 0 1px 0 rgba(251, 191, 36, 0.1)',
    },
    icon: {
      backgroundColor: 'rgba(251, 191, 36, 0.15)',
      borderRadius: '8px',
    },
    title: {
      color: '#fbbf24',
      fontWeight: 600,
    },
    description: {
      color: '#9fb3c8',
    },
    closeButton: {
      color: '#627d98',
      '&:hover': {
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
        color: '#fbbf24',
      },
    },
  },
});

// Info Toast - Cyan glow (subtle)
export const infoToast = (title: string, message?: string): NotificationData => ({
  title,
  message,
  icon: InfoIcon,
  autoClose: 4000,
  withCloseButton: true,
  styles: {
    root: {
      background: 'linear-gradient(135deg, rgba(16, 42, 67, 0.95), rgba(10, 25, 41, 0.98))',
      border: '1px solid rgba(6, 182, 212, 0.3)',
      backdropFilter: 'blur(16px)',
      borderRadius: '12px',
      boxShadow:
        '0 4px 24px rgba(0, 0, 0, 0.5), 0 0 30px rgba(6, 182, 212, 0.1), inset 0 1px 0 rgba(6, 182, 212, 0.08)',
    },
    icon: {
      backgroundColor: 'rgba(6, 182, 212, 0.1)',
      borderRadius: '8px',
    },
    title: {
      color: '#9fb3c8',
      fontWeight: 600,
    },
    description: {
      color: '#627d98',
    },
    closeButton: {
      color: '#627d98',
      '&:hover': {
        backgroundColor: 'rgba(6, 182, 212, 0.15)',
        color: '#06b6d4',
      },
    },
  },
});

// Error Toast with Copy Button - Red glow
export const errorToastWithCopy = (title: string, description?: string): NotificationData => ({
  message: createErrorToastContent(title, description),
  icon: XIcon,
  autoClose: 6000,
  withCloseButton: true,
  styles: {
    root: {
      background: 'linear-gradient(135deg, rgba(30, 15, 20, 0.98), rgba(20, 10, 15, 0.99))',
      border: '2px solid rgba(239, 68, 68, 0.5)',
      backdropFilter: 'blur(16px)',
      borderRadius: '12px',
      boxShadow:
        '0 4px 24px rgba(0, 0, 0, 0.6), 0 0 60px rgba(239, 68, 68, 0.3), 0 0 30px rgba(239, 68, 68, 0.25), inset 0 1px 0 rgba(239, 68, 68, 0.15)',
    },
    icon: {
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
      borderRadius: '8px',
    },
    closeButton: {
      color: '#627d98',
      '&:hover': {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        color: '#f87171',
      },
    },
  },
});
