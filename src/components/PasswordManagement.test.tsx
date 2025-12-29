import { MantineProvider } from '@mantine/core';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { PasswordManagement } from './PasswordManagement';

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

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

vi.mock('@/lib/toast/toast', () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}));

// Mock apiClient
const mockPasswordLoginGet = vi.fn();
const mockPasswordLoginToggle = vi.fn();
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    user: {
      passwordLogin: {
        get: () => mockPasswordLoginGet(),
        toggle: (enabled: boolean) => mockPasswordLoginToggle(enabled),
      },
    },
  },
}));

describe('PasswordManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    mockPasswordLoginGet.mockImplementation(() => new Promise(() => {}));
    renderWithMantine(<PasswordManagement hasPasskeys={true} />);

    expect(screen.getByText('Passwort')).toBeInTheDocument();
    expect(screen.getByText('Laden...')).toBeInTheDocument();
  });

  it('shows password enabled state after loading', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: true, canDisablePasswordLogin: true },
    });

    await act(async () => {
      renderWithMantine(<PasswordManagement hasPasskeys={true} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Passwort-Login aktiv')).toBeInTheDocument();
    });
    expect(screen.getByText('Passwort ändern')).toBeInTheDocument();
  });

  it('shows password disabled state after loading', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: false, canDisablePasswordLogin: false },
    });

    await act(async () => {
      renderWithMantine(<PasswordManagement hasPasskeys={true} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Passwort-Login deaktiviert')).toBeInTheDocument();
    });
    expect(screen.getByText('Passwort setzen')).toBeInTheDocument();
  });

  it('navigates to change-password when clicking change password button', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: true, canDisablePasswordLogin: true },
    });

    await act(async () => {
      renderWithMantine(<PasswordManagement hasPasskeys={true} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Passwort ändern')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Passwort ändern'));
    expect(mockPush).toHaveBeenCalledWith('/change-password');
  });

  it('navigates to change-password when clicking set password button', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: false, canDisablePasswordLogin: false },
    });

    await act(async () => {
      renderWithMantine(<PasswordManagement hasPasskeys={true} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Passwort setzen')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Passwort setzen'));
    expect(mockPush).toHaveBeenCalledWith('/change-password');
  });

  it('shows disable button when password enabled and has passkeys', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: true, canDisablePasswordLogin: true },
    });

    await act(async () => {
      renderWithMantine(<PasswordManagement hasPasskeys={true} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Passwort-Login deaktivieren')).toBeInTheDocument();
    });
  });

  it('hides disable button when no passkeys', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: true, canDisablePasswordLogin: true },
    });

    await act(async () => {
      renderWithMantine(<PasswordManagement hasPasskeys={false} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Passwort-Login aktiv')).toBeInTheDocument();
    });

    expect(screen.queryByText('Passwort-Login deaktivieren')).not.toBeInTheDocument();
  });

  it('shows hint about passkeys when no passkeys but password enabled', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: true, canDisablePasswordLogin: false },
    });

    await act(async () => {
      renderWithMantine(<PasswordManagement hasPasskeys={false} />);
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          'Füge mindestens einen Passkey hinzu, um Passwort-Login deaktivieren zu können.'
        )
      ).toBeInTheDocument();
    });
  });

  it('opens confirmation modal when clicking disable button', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: true, canDisablePasswordLogin: true },
    });

    await act(async () => {
      renderWithMantine(<PasswordManagement hasPasskeys={true} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Passwort-Login deaktivieren')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Passwort-Login deaktivieren'));

    await waitFor(() => {
      expect(screen.getByText('Passwort-Login deaktivieren?')).toBeInTheDocument();
    });
  });

  it('closes modal when clicking cancel', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: true, canDisablePasswordLogin: true },
    });

    await act(async () => {
      renderWithMantine(<PasswordManagement hasPasskeys={true} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Passwort-Login deaktivieren')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Passwort-Login deaktivieren'));

    await waitFor(() => {
      expect(screen.getByText('Passwort-Login deaktivieren?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Abbrechen'));

    await waitFor(() => {
      expect(screen.queryByText('Passwort-Login deaktivieren?')).not.toBeInTheDocument();
    });
  });

  it('disables password login when confirming', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: true, canDisablePasswordLogin: true },
    });
    mockPasswordLoginToggle.mockResolvedValueOnce({
      data: { success: true },
      error: null,
    });

    await act(async () => {
      renderWithMantine(<PasswordManagement hasPasskeys={true} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Passwort-Login deaktivieren')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Passwort-Login deaktivieren'));

    await waitFor(() => {
      expect(screen.getByText('Deaktivieren')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Deaktivieren'));
    });

    await waitFor(() => {
      expect(screen.getByText('Passwort-Login deaktiviert')).toBeInTheDocument();
    });
  });

  it('shows error when disable fails', async () => {
    const { showErrorToast } = await import('@/lib/toast/toast');

    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: true, canDisablePasswordLogin: true },
    });
    mockPasswordLoginToggle.mockResolvedValueOnce({
      error: { error: 'Cannot disable' },
    });

    await act(async () => {
      renderWithMantine(<PasswordManagement hasPasskeys={true} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Passwort-Login deaktivieren')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Passwort-Login deaktivieren'));

    await waitFor(() => {
      expect(screen.getByText('Deaktivieren')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Deaktivieren'));
    });

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith('Cannot disable');
    });
  });

  it('handles network error when fetching status', async () => {
    mockPasswordLoginGet.mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      renderWithMantine(<PasswordManagement hasPasskeys={true} />);
    });

    // Should silently fail and show card without crashing
    await waitFor(() => {
      expect(screen.getByText('Passwort')).toBeInTheDocument();
    });
  });

  it('handles network error when disabling', async () => {
    const { showErrorToast } = await import('@/lib/toast/toast');

    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: true, canDisablePasswordLogin: true },
    });
    mockPasswordLoginToggle.mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      renderWithMantine(<PasswordManagement hasPasskeys={true} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Passwort-Login deaktivieren')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Passwort-Login deaktivieren'));

    await waitFor(() => {
      expect(screen.getByText('Deaktivieren')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Deaktivieren'));
    });

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith('Verbindungsfehler');
    });
  });
});
