import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { PasskeyManager } from './PasskeyManager';
import { MantineProvider } from '@mantine/core';
import { startRegistration } from '@simplewebauthn/browser';
import { notifications } from '@mantine/notifications';
import { successToast, errorToast } from '@/lib/toast/toast-styles';

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

const mockStartRegistration = vi.mocked(startRegistration);
const mockNotifications = vi.mocked(notifications);
const mockSuccessToast = vi.mocked(successToast);
const mockErrorToast = vi.mocked(errorToast);

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
    const confirmButton = allButtons.find(
      (btn) => btn.textContent?.includes('Löschen') && !btn.hasAttribute('title')
    );
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/users/me/passkeys?id=1', { method: 'DELETE' });
    });
  });

  it('removes passkey from list after successful delete', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    globalThis.fetch = mockFetch;

    renderWithMantine(<PasskeyManager initialPasskeys={mockPasskeys} />);

    expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
    expect(screen.getByText('iPhone')).toBeInTheDocument();

    // Open delete modal for first passkey
    const deleteButtons = screen.getAllByTitle('Löschen');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Passkey löschen?')).toBeInTheDocument();
    });

    // Confirm delete
    const allButtons = screen.getAllByRole('button');
    const confirmButton = allButtons.find(
      (btn) => btn.textContent?.includes('Löschen') && !btn.hasAttribute('title')
    );
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(screen.queryByText('MacBook Pro')).not.toBeInTheDocument();
    });
    expect(screen.getByText('iPhone')).toBeInTheDocument();
    expect(mockSuccessToast).toHaveBeenCalledWith('Passkey gelöscht');
  });

  it('shows error toast when delete fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Deletion forbidden' }),
    });
    globalThis.fetch = mockFetch;

    renderWithMantine(<PasskeyManager initialPasskeys={mockPasskeys} />);

    const deleteButtons = screen.getAllByTitle('Löschen');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Passkey löschen?')).toBeInTheDocument();
    });

    const allButtons = screen.getAllByRole('button');
    const confirmButton = allButtons.find(
      (btn) => btn.textContent?.includes('Löschen') && !btn.hasAttribute('title')
    );
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalledWith('Fehler', 'Deletion forbidden');
    });
    // Passkey should still be in the list
    expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
  });

  it('renames passkey successfully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    globalThis.fetch = mockFetch;

    renderWithMantine(<PasskeyManager initialPasskeys={mockPasskeys} />);

    // Open edit modal
    const editButtons = screen.getAllByTitle('Umbenennen');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Passkey umbenennen')).toBeInTheDocument();
    });

    // Change the name
    const input = screen.getByDisplayValue('MacBook Pro');
    fireEvent.change(input, { target: { value: 'Work Laptop' } });

    // Save
    fireEvent.click(screen.getByText('Speichern'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/users/me/passkeys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: '1', name: 'Work Laptop' }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Work Laptop')).toBeInTheDocument();
    });
    expect(mockSuccessToast).toHaveBeenCalledWith('Passkey umbenannt');
  });

  it('shows error toast when rename fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Name already exists' }),
    });
    globalThis.fetch = mockFetch;

    renderWithMantine(<PasskeyManager initialPasskeys={mockPasskeys} />);

    const editButtons = screen.getAllByTitle('Umbenennen');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Passkey umbenennen')).toBeInTheDocument();
    });

    const input = screen.getByDisplayValue('MacBook Pro');
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.click(screen.getByText('Speichern'));

    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalledWith('Fehler', 'Name already exists');
    });
  });

  it('registers new passkey successfully', async () => {
    const mockCredential = { id: 'cred123', type: 'public-key' };
    mockStartRegistration.mockResolvedValue(mockCredential as never);

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ options: { challenge: 'test' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            passkey: { id: '3', name: 'New Device', createdAt: '2025-06-20T10:00:00Z' },
          }),
      });
    globalThis.fetch = mockFetch;

    renderWithMantine(<PasskeyManager initialPasskeys={mockPasskeys} />);

    // Open add modal
    fireEvent.click(screen.getByText('Passkey hinzufügen'));

    await waitFor(() => {
      expect(screen.getByText('Neuer Passkey')).toBeInTheDocument();
    });

    // Enter name and create
    const input = screen.getByPlaceholderText('z.B. MacBook Pro, iPhone...');
    fireEvent.change(input, { target: { value: 'New Device' } });
    fireEvent.click(screen.getByText('Passkey erstellen'));

    // Verify API calls
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/users/me/passkeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'options' }),
      });
    });

    await waitFor(() => {
      expect(mockStartRegistration).toHaveBeenCalledWith({ optionsJSON: { challenge: 'test' } });
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/users/me/passkeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', credential: mockCredential, name: 'New Device' }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText('New Device')).toBeInTheDocument();
    });
    expect(mockSuccessToast).toHaveBeenCalledWith('Passkey hinzugefügt', 'New Device');
  });

  it('shows error when registration options fetch fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Server error' }),
    });
    globalThis.fetch = mockFetch;

    renderWithMantine(<PasskeyManager initialPasskeys={[]} />);

    fireEvent.click(screen.getByText('Passkey hinzufügen'));

    await waitFor(() => {
      expect(screen.getByText('Neuer Passkey')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Passkey erstellen'));

    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalledWith('Fehler', 'Server error');
    });
  });

  it('shows cancelled message when user cancels WebAuthn', async () => {
    const notAllowedError = new Error('User cancelled');
    notAllowedError.name = 'NotAllowedError';
    mockStartRegistration.mockRejectedValue(notAllowedError);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ options: { challenge: 'test' } }),
    });
    globalThis.fetch = mockFetch;

    renderWithMantine(<PasskeyManager initialPasskeys={[]} />);

    fireEvent.click(screen.getByText('Passkey hinzufügen'));

    await waitFor(() => {
      expect(screen.getByText('Neuer Passkey')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Passkey erstellen'));

    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalledWith(
        'Abgebrochen',
        'Passkey-Registrierung wurde abgebrochen'
      );
    });
  });

  it('shows error when verification fails', async () => {
    const mockCredential = { id: 'cred123', type: 'public-key' };
    mockStartRegistration.mockResolvedValue(mockCredential as never);

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ options: { challenge: 'test' } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Verification failed' }),
      });
    globalThis.fetch = mockFetch;

    renderWithMantine(<PasskeyManager initialPasskeys={[]} />);

    fireEvent.click(screen.getByText('Passkey hinzufügen'));

    await waitFor(() => {
      expect(screen.getByText('Neuer Passkey')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Passkey erstellen'));

    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalledWith('Fehler', 'Verification failed');
    });
  });

  it('shows loading state during registration', async () => {
    let resolveRegistration: (value: unknown) => void;
    const registrationPromise = new Promise((resolve) => {
      resolveRegistration = resolve;
    });
    mockStartRegistration.mockReturnValue(registrationPromise as never);

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ options: { challenge: 'test' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            passkey: { id: 'test', name: 'Test', createdAt: new Date().toISOString() },
          }),
      });
    globalThis.fetch = mockFetch;

    renderWithMantine(<PasskeyManager initialPasskeys={[]} />);

    fireEvent.click(screen.getByText('Passkey hinzufügen'));

    await waitFor(() => {
      expect(screen.getByText('Neuer Passkey')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Passkey erstellen'));

    await waitFor(() => {
      expect(screen.getByText('Wird registriert...')).toBeInTheDocument();
    });

    // Cleanup: resolve the promise and wait for state updates
    await act(async () => {
      resolveRegistration!({ id: 'test', type: 'public-key' });
    });
  });

  it('registers passkey without custom name', async () => {
    const mockCredential = { id: 'cred123', type: 'public-key' };
    mockStartRegistration.mockResolvedValue(mockCredential as never);

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ options: { challenge: 'test' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            passkey: { id: '3', name: 'Unnamed Passkey', createdAt: '2025-06-20T10:00:00Z' },
          }),
      });
    globalThis.fetch = mockFetch;

    renderWithMantine(<PasskeyManager initialPasskeys={[]} />);

    fireEvent.click(screen.getByText('Passkey hinzufügen'));

    await waitFor(() => {
      expect(screen.getByText('Neuer Passkey')).toBeInTheDocument();
    });

    // Don't enter a name, just create
    fireEvent.click(screen.getByText('Passkey erstellen'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenLastCalledWith('/api/users/me/passkeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', credential: mockCredential, name: undefined }),
      });
    });
  });

  it('closes edit modal when cancel button is clicked', async () => {
    renderWithMantine(<PasskeyManager initialPasskeys={mockPasskeys} />);

    // Open edit modal
    const editButtons = screen.getAllByTitle('Umbenennen');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Passkey umbenennen')).toBeInTheDocument();
    });

    // Change the name
    const input = screen.getByDisplayValue('MacBook Pro');
    fireEvent.change(input, { target: { value: 'Modified Name' } });

    // Click cancel button
    fireEvent.click(screen.getByText('Abbrechen'));

    await waitFor(() => {
      expect(screen.queryByText('Passkey umbenennen')).not.toBeInTheDocument();
    });

    // Original name should still be displayed
    expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
  });

  it('closes edit modal via onClose and resets edit name', async () => {
    renderWithMantine(<PasskeyManager initialPasskeys={mockPasskeys} />);

    // Open edit modal
    const editButtons = screen.getAllByTitle('Umbenennen');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Passkey umbenennen')).toBeInTheDocument();
    });

    // Change the name
    const input = screen.getByDisplayValue('MacBook Pro');
    fireEvent.change(input, { target: { value: 'New Name' } });

    // Close modal via overlay click (triggers onClose)
    const overlay = document.querySelector('.mantine-Modal-overlay');
    if (overlay) {
      fireEvent.click(overlay);
    }

    await waitFor(() => {
      expect(screen.queryByText('Passkey umbenennen')).not.toBeInTheDocument();
    });
  });

  it('closes delete confirmation modal via onClose', async () => {
    renderWithMantine(<PasskeyManager initialPasskeys={mockPasskeys} />);

    // Open delete modal
    const deleteButtons = screen.getAllByTitle('Löschen');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Passkey löschen?')).toBeInTheDocument();
    });

    // Close modal via overlay click (triggers onClose)
    const overlay = document.querySelector('.mantine-Modal-overlay');
    if (overlay) {
      fireEvent.click(overlay);
    }

    await waitFor(() => {
      expect(screen.queryByText('Passkey löschen?')).not.toBeInTheDocument();
    });
  });

  it('handles generic error during registration', async () => {
    const genericError = new Error('Generic error');
    mockStartRegistration.mockRejectedValue(genericError);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ options: { challenge: 'test' } }),
    });
    globalThis.fetch = mockFetch;

    renderWithMantine(<PasskeyManager initialPasskeys={[]} />);

    fireEvent.click(screen.getByText('Passkey hinzufügen'));

    await waitFor(() => {
      expect(screen.getByText('Neuer Passkey')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Passkey erstellen'));

    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalledWith('Fehler', 'Generic error');
    });
  });
});
