import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeAll } from 'vitest';
import { DateTimePicker } from './DateTimePicker';
import { MantineProvider } from '@mantine/core';

// Mock matchMedia for Mantine
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

// Wrapper component for Mantine context
function renderWithMantine(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe('DateTimePicker', () => {
  it('renders date input button', () => {
    renderWithMantine(<DateTimePicker />);
    // Mantine DateTimePicker renders as a button
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('displays label when provided', () => {
    renderWithMantine(<DateTimePicker label="Datum wählen" />);
    expect(screen.getByText('Datum wählen')).toBeInTheDocument();
  });

  it('applies custom label styling', () => {
    renderWithMantine(<DateTimePicker label="Datum" />);
    const label = screen.getByText('Datum');
    expect(label).toHaveClass('text-sm', 'font-medium');
  });

  it('displays formatted date value', () => {
    const testDate = new Date('2025-06-15T14:30:00');
    renderWithMantine(<DateTimePicker value={testDate} />);
    // German date format: DD.MM.YYYY HH:mm
    expect(screen.getByText('15.06.2025 14:30')).toBeInTheDocument();
  });

  it('can be disabled', () => {
    renderWithMantine(<DateTimePicker disabled />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('shows asterisk when required', () => {
    renderWithMantine(<DateTimePicker label="Datum" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows error state when error prop provided', () => {
    renderWithMantine(<DateTimePicker error="Ungültiges Datum" />);
    expect(screen.getByText('Ungültiges Datum')).toBeInTheDocument();
  });

  it('renders without label when not provided', () => {
    renderWithMantine(<DateTimePicker />);
    const labelTexts = screen.queryByText(/Datum/);
    expect(labelTexts).toBeNull();
  });

  it('has date input styling class', () => {
    const { container } = renderWithMantine(<DateTimePicker />);
    expect(container.querySelector('.mantine-DateTimePicker-input')).toBeInTheDocument();
  });
});
