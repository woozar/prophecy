import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { ConfirmModal } from './ConfirmModal';

// Mock matchMedia
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

function renderWithMantine(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe('ConfirmModal', () => {
  const defaultProps = {
    opened: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Confirm Action',
    confirmText: 'Confirm',
    children: <p>Are you sure?</p>,
  };

  it('renders title', () => {
    renderWithMantine(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
  });

  it('renders children content', () => {
    renderWithMantine(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('renders confirm button with correct text', () => {
    renderWithMantine(<ConfirmModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('renders cancel button', () => {
    renderWithMantine(<ConfirmModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    renderWithMantine(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    renderWithMantine(<ConfirmModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows confirming text when isSubmitting is true', () => {
    renderWithMantine(
      <ConfirmModal {...defaultProps} isSubmitting confirmingText="Processing..." />
    );
    expect(screen.getByRole('button', { name: 'Processing...' })).toBeInTheDocument();
  });

  it('uses default confirming text when not provided', () => {
    renderWithMantine(<ConfirmModal {...defaultProps} isSubmitting />);
    expect(screen.getByRole('button', { name: 'Bitte warten...' })).toBeInTheDocument();
  });

  it('disables buttons when isSubmitting is true', () => {
    renderWithMantine(<ConfirmModal {...defaultProps} isSubmitting />);
    expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bitte warten...' })).toBeDisabled();
  });

  it('renders with danger variant by default', () => {
    renderWithMantine(<ConfirmModal {...defaultProps} />);
    // Modal renders with danger styling
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
  });

  it('renders with warning variant', () => {
    renderWithMantine(<ConfirmModal {...defaultProps} variant="warning" />);
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
  });

  it('renders with violet variant', () => {
    renderWithMantine(<ConfirmModal {...defaultProps} variant="violet" />);
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
  });
});
