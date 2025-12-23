import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { Modal } from './Modal';

// Mock matchMedia
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? false : false,
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

describe('Modal', () => {
  it('renders children content', () => {
    renderWithMantine(
      <Modal opened onClose={() => {}}>
        <p>Modal Content</p>
      </Modal>
    );
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    renderWithMantine(
      <Modal opened onClose={() => {}} title="Test Title">
        Content
      </Modal>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('does not render title when not provided', () => {
    renderWithMantine(
      <Modal opened onClose={() => {}}>
        Content
      </Modal>
    );
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('renders close button when showCloseButton is true', () => {
    renderWithMantine(
      <Modal opened onClose={() => {}} showCloseButton>
        Content
      </Modal>
    );
    expect(screen.getByLabelText('Schließen')).toBeInTheDocument();
  });

  it('does not render close button by default', () => {
    renderWithMantine(
      <Modal opened onClose={() => {}}>
        Content
      </Modal>
    );
    expect(screen.queryByLabelText('Schließen')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    renderWithMantine(
      <Modal opened onClose={onClose} showCloseButton>
        Content
      </Modal>
    );
    fireEvent.click(screen.getByLabelText('Schließen'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders with default variant', () => {
    renderWithMantine(
      <Modal opened onClose={() => {}}>
        Content
      </Modal>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders with danger variant', () => {
    renderWithMantine(
      <Modal opened onClose={() => {}} variant="danger">
        Danger Content
      </Modal>
    );
    expect(screen.getByText('Danger Content')).toBeInTheDocument();
  });

  it('renders with warning variant', () => {
    renderWithMantine(
      <Modal opened onClose={() => {}} variant="warning">
        Warning Content
      </Modal>
    );
    expect(screen.getByText('Warning Content')).toBeInTheDocument();
  });

  it('renders with violet variant', () => {
    renderWithMantine(
      <Modal opened onClose={() => {}} variant="violet">
        Violet Content
      </Modal>
    );
    expect(screen.getByText('Violet Content')).toBeInTheDocument();
  });

  it('disables animations when noAnimation is true', () => {
    renderWithMantine(
      <Modal opened onClose={() => {}} noAnimation>
        No Animation Content
      </Modal>
    );
    expect(screen.getByText('No Animation Content')).toBeInTheDocument();
  });

  it('renders with title and close button together', () => {
    const onClose = vi.fn();
    renderWithMantine(
      <Modal opened onClose={onClose} title="Modal Title" showCloseButton>
        Content
      </Modal>
    );
    expect(screen.getByText('Modal Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Schließen')).toBeInTheDocument();
  });

  it('does not render close button when onClose is not provided', () => {
    renderWithMantine(
      // @ts-expect-error - testing edge case without onClose
      <Modal opened showCloseButton>
        Content
      </Modal>
    );
    // showCloseButton is true but onClose is not provided, so button should not render
    expect(screen.queryByLabelText('Schließen')).not.toBeInTheDocument();
  });
});
