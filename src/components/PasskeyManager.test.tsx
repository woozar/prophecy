import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { PasskeyManager } from './PasskeyManager';
import { MantineProvider } from '@mantine/core';

function renderWithMantine(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

// Mock matchMedia for useReducedMotion hook
beforeAll(() => {
  Object.defineProperty(globalThis, 'matchMedia', {
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

// Mock dependencies
vi.mock('@simplewebauthn/browser', () => ({
  startRegistration: vi.fn(),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

vi.mock('@/lib/toast/toast-styles', () => ({
  successToast: vi.fn((title, message) => ({ title, message })),
  errorToast: vi.fn((title, message) => ({ title, message })),
}));

describe('PasskeyManager', () => {
  const mockPasskeys = [
    {
      id: '1',
      name: 'MacBook Pro',
      createdAt: '2025-01-15T10:00:00Z',
      lastUsedAt: '2025-06-15T14:30:00Z',
      credentialDeviceType: 'singleDevice',
    },
    {
      id: '2',
      name: 'iPhone',
      createdAt: '2025-03-20T08:00:00Z',
      lastUsedAt: null,
      credentialDeviceType: 'multiDevice',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders card with title', () => {
    renderWithMantine(<PasskeyManager initialPasskeys={[]} />);
    expect(screen.getByText('Passkeys')).toBeInTheDocument();
  });

  it('shows add button', () => {
    renderWithMantine(<PasskeyManager initialPasskeys={[]} />);
    // Button shows either "Passkey" or "Passkey hinzufügen" depending on screen size
    expect(screen.getByText('Passkey hinzufügen')).toBeInTheDocument();
  });

  it('shows empty state when no passkeys', () => {
    renderWithMantine(<PasskeyManager initialPasskeys={[]} />);
    expect(screen.getByText('Keine Passkeys registriert.')).toBeInTheDocument();
  });

  it('displays passkey names', () => {
    renderWithMantine(<PasskeyManager initialPasskeys={mockPasskeys} />);
    expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
    expect(screen.getByText('iPhone')).toBeInTheDocument();
  });

  it('displays creation dates', () => {
    renderWithMantine(<PasskeyManager initialPasskeys={mockPasskeys} />);
    expect(screen.getByText(/Erstellt am 15\.1\.2025/)).toBeInTheDocument();
  });

  it('displays last used date when available', () => {
    renderWithMantine(<PasskeyManager initialPasskeys={mockPasskeys} />);
    expect(screen.getByText(/Zuletzt verwendet: 15\.6\.2025/)).toBeInTheDocument();
  });

  it('opens add passkey modal when button clicked', async () => {
    renderWithMantine(<PasskeyManager initialPasskeys={[]} />);
    fireEvent.click(screen.getByText('Passkey hinzufügen'));
    await waitFor(() => {
      expect(screen.getByText('Neuer Passkey')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('z.B. MacBook Pro, iPhone...')).toBeInTheDocument();
  });

  it('closes add modal when cancel clicked', async () => {
    renderWithMantine(<PasskeyManager initialPasskeys={[]} />);
    fireEvent.click(screen.getByText('Passkey hinzufügen'));
    await waitFor(() => {
      expect(screen.getByText('Neuer Passkey')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Abbrechen'));
    await waitFor(() => {
      expect(screen.queryByText('Neuer Passkey')).not.toBeInTheDocument();
    });
  });

  it('opens confirmation modal when delete clicked', async () => {
    renderWithMantine(<PasskeyManager initialPasskeys={mockPasskeys} />);

    // Find delete buttons by title
    const deleteButtons = screen.getAllByTitle('Löschen');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Passkey löschen?')).toBeInTheDocument();
    });
    expect(screen.getByText(/"MacBook Pro"/)).toBeInTheDocument();
  });

  it('closes delete modal when cancel clicked', async () => {
    renderWithMantine(<PasskeyManager initialPasskeys={mockPasskeys} />);

    // Open delete modal
    const deleteButtons = screen.getAllByTitle('Löschen');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Passkey löschen?')).toBeInTheDocument();
    });

    // Click cancel
    const cancelButtons = screen.getAllByText('Abbrechen');
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);

    await waitFor(() => {
      expect(screen.queryByText('Passkey löschen?')).not.toBeInTheDocument();
    });
  });

  it('opens edit modal when edit button clicked', async () => {
    renderWithMantine(<PasskeyManager initialPasskeys={mockPasskeys} />);

    // Find edit buttons by title
    const editButtons = screen.getAllByTitle('Umbenennen');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Passkey umbenennen')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('MacBook Pro')).toBeInTheDocument();
  });

  it('has disabled save button when edit name is empty', async () => {
    renderWithMantine(<PasskeyManager initialPasskeys={mockPasskeys} />);

    // Open edit modal
    const editButtons = screen.getAllByTitle('Umbenennen');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Passkey umbenennen')).toBeInTheDocument();
    });

    // Clear the input
    const input = screen.getByDisplayValue('MacBook Pro');
    fireEvent.change(input, { target: { value: '' } });

    const saveButtonText = screen.getByText('Speichern');
    const saveButton = saveButtonText.closest('button');
    expect(saveButton).toBeDisabled();
  });

  it('calls delete API when confirmed', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    globalThis.fetch = mockFetch;

    renderWithMantine(<PasskeyManager initialPasskeys={mockPasskeys} />);

    // Open delete modal
    const deleteButtons = screen.getAllByTitle('Löschen');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Passkey löschen?')).toBeInTheDocument();
    });

    // Find the confirm button in the modal (the red "Löschen" button)
    const allButtons = screen.getAllByRole('button');
    const confirmButton = allButtons.find(btn =>
      btn.textContent?.includes('Löschen') && !btn.hasAttribute('title')
    );
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/users/me/passkeys?id=1', { method: 'DELETE' });
    });
  });
});
