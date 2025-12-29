import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { PasswordManagement } from './PasswordManagement';
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

describe('PasswordManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('shows loading state initially', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));
    renderWithMantine(<PasswordManagement hasPasskeys={true} />);

    expect(screen.getByText('Passwort')).toBeInTheDocument();
    expect(screen.getByText('Laden...')).toBeInTheDocument();
  });

  it('shows password enabled state after loading', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ passwordLoginEnabled: true, canDisablePasswordLogin: true }),
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
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ passwordLoginEnabled: false, canDisablePasswordLogin: false }),
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
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ passwordLoginEnabled: true, canDisablePasswordLogin: true }),
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
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ passwordLoginEnabled: false, canDisablePasswordLogin: false }),
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
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ passwordLoginEnabled: true, canDisablePasswordLogin: true }),
    });

    await act(async () => {
      renderWithMantine(<PasswordManagement hasPasskeys={true} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Passwort-Login deaktivieren')).toBeInTheDocument();
    });
  });

  it('hides disable button when no passkeys', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ passwordLoginEnabled: true, canDisablePasswordLogin: true }),
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
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ passwordLoginEnabled: true, canDisablePasswordLogin: false }),
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
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ passwordLoginEnabled: true, canDisablePasswordLogin: true }),
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
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ passwordLoginEnabled: true, canDisablePasswordLogin: true }),
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
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ passwordLoginEnabled: true, canDisablePasswordLogin: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
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

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ passwordLoginEnabled: true, canDisablePasswordLogin: true }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Cannot disable' }),
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
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

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

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ passwordLoginEnabled: true, canDisablePasswordLogin: true }),
      })
      .mockRejectedValueOnce(new Error('Network error'));

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
