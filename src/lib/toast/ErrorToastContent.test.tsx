import type { ReactNode } from 'react';

import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorToastContent } from './ErrorToastContent';

// Mock navigator.clipboard
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Wrapper with MantineProvider
function Wrapper({ children }: { children: ReactNode }) {
  return <MantineProvider>{children}</MantineProvider>;
}

describe('ErrorToastContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title correctly', () => {
    render(<ErrorToastContent title="Test Error" />, { wrapper: Wrapper });

    expect(screen.getByText('Test Error')).toBeInTheDocument();
  });

  it('renders title and description correctly', () => {
    render(<ErrorToastContent title="Test Error" description="Additional details" />, {
      wrapper: Wrapper,
    });

    expect(screen.getByText('Test Error')).toBeInTheDocument();
    expect(screen.getByText('Additional details')).toBeInTheDocument();
  });

  it('copies title to clipboard when copy button is clicked', async () => {
    render(<ErrorToastContent title="Test Error" />, { wrapper: Wrapper });

    const copyButton = screen.getByRole('button', { name: 'Fehlermeldung kopieren' });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('Test Error');
    });
  });

  it('copies title and description to clipboard when both are present', async () => {
    render(<ErrorToastContent title="Test Error" description="More info" />, { wrapper: Wrapper });

    const copyButton = screen.getByRole('button', { name: 'Fehlermeldung kopieren' });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('Test Error\nMore info');
    });
  });

  it('has accessible copy button', () => {
    render(<ErrorToastContent title="Test Error" />, { wrapper: Wrapper });

    const copyButton = screen.getByRole('button', { name: 'Fehlermeldung kopieren' });
    expect(copyButton).toBeInTheDocument();
  });
});
