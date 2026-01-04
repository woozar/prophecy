import type { ReactNode } from 'react';

import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorToastContent, createErrorToastContent } from './ErrorToastContent';

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

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('uses fallback when clipboard API fails', async () => {
    // Make clipboard API fail
    mockWriteText.mockRejectedValueOnce(new Error('Clipboard not available'));

    // Mock document.execCommand for fallback
    const mockExecCommand = vi.fn().mockReturnValue(true);
    document.execCommand = mockExecCommand;

    // Render first, then set up mocks for the click action
    render(<ErrorToastContent title="Test Error" description="Details" />, { wrapper: Wrapper });

    // Track textarea creation and operations
    const mockTextarea = {
      value: '',
      style: { position: '', opacity: '' },
      select: vi.fn(),
      remove: vi.fn(),
    };
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string) => {
        if (tagName === 'textarea') {
          return mockTextarea as unknown as HTMLTextAreaElement;
        }
        return originalCreateElement(tagName);
      });
    const appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation(() => mockTextarea as never);

    const copyButton = screen.getByRole('button', { name: 'Fehlermeldung kopieren' });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockExecCommand).toHaveBeenCalledWith('copy');
    });

    expect(mockTextarea.value).toBe('Test Error\nDetails');
    expect(mockTextarea.select).toHaveBeenCalled();
    expect(mockTextarea.remove).toHaveBeenCalled();

    // Clean up spies immediately
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
  });

  it('handles complete copy failure gracefully', async () => {
    // Make clipboard API fail
    mockWriteText.mockRejectedValueOnce(new Error('Clipboard not available'));

    // Make fallback also fail
    document.execCommand = vi.fn().mockImplementation(() => {
      throw new Error('execCommand failed');
    });

    render(<ErrorToastContent title="Test Error" />, { wrapper: Wrapper });

    const copyButton = screen.getByRole('button', { name: 'Fehlermeldung kopieren' });

    // Should not throw
    expect(() => fireEvent.click(copyButton)).not.toThrow();
  });

  describe('createErrorToastContent', () => {
    it('creates ErrorToastContent with title only', () => {
      const content = createErrorToastContent('Error Title');
      render(content, { wrapper: Wrapper });

      expect(screen.getByText('Error Title')).toBeInTheDocument();
    });

    it('creates ErrorToastContent with title and description', () => {
      const content = createErrorToastContent('Error Title', 'Error Description');
      render(content, { wrapper: Wrapper });

      expect(screen.getByText('Error Title')).toBeInTheDocument();
      expect(screen.getByText('Error Description')).toBeInTheDocument();
    });
  });
});
