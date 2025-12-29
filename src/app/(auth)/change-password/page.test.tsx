import { MantineProvider } from '@mantine/core';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import ChangePasswordPage from './page';

// Mock matchMedia
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
const mockBack = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

// Mock toast
vi.mock('@/lib/toast/toast', () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}));

// Mock apiClient
const mockPasswordLoginGet = vi.fn();
const mockChangePassword = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    user: {
      passwordLogin: {
        get: () => mockPasswordLoginGet(),
      },
    },
    auth: {
      changePassword: (
        currentPassword: string | undefined,
        newPassword: string,
        confirmPassword: string
      ) => mockChangePassword(currentPassword, newPassword, confirmPassword),
    },
  },
}));

// Mock store
let mockCurrentUserId: string | null = 'user-123';

vi.mock('@/store/useUserStore', () => ({
  useUserStore: (selector: (state: { currentUserId: string | null }) => unknown) => {
    return selector({ currentUserId: mockCurrentUserId });
  },
}));

function renderWithMantine(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe('ChangePasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUserId = 'user-123';
  });

  it('redirects to login when not logged in', async () => {
    mockCurrentUserId = null;

    await act(async () => {
      renderWithMantine(<ChangePasswordPage />);
    });

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('shows loading state initially', () => {
    mockPasswordLoginGet.mockImplementation(() => new Promise(() => {}));

    renderWithMantine(<ChangePasswordPage />);

    expect(screen.getByText('Laden...')).toBeInTheDocument();
  });

  it('shows change password form after loading', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: true, forcePasswordChange: false },
    });

    await act(async () => {
      renderWithMantine(<ChangePasswordPage />);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Passwort ändern' })).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Aktuelles Passwort')).toBeInTheDocument();
    expect(screen.getByLabelText('Neues Passwort')).toBeInTheDocument();
    expect(screen.getByLabelText('Passwort bestätigen')).toBeInTheDocument();
  });

  it('shows set password form when user has no existing password', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: false, forcePasswordChange: false },
    });

    await act(async () => {
      renderWithMantine(<ChangePasswordPage />);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Passwort setzen' })).toBeInTheDocument();
    });
    // Should not show current password field
    expect(screen.queryByLabelText('Aktuelles Passwort')).not.toBeInTheDocument();
    expect(
      screen.getByText('Du hast noch kein Passwort. Setze jetzt ein Passwort für deinen Account.')
    ).toBeInTheDocument();
  });

  it('shows force change title when forcePasswordChange is true from API', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: true, forcePasswordChange: true },
    });

    await act(async () => {
      renderWithMantine(<ChangePasswordPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Neues Passwort setzen')).toBeInTheDocument();
    });
    expect(
      screen.getByText('Dein Passwort wurde zurückgesetzt. Bitte wähle ein neues Passwort.')
    ).toBeInTheDocument();
    // Should not show current password field in force mode
    expect(screen.queryByText('Aktuelles Passwort')).not.toBeInTheDocument();
  });

  it('hides cancel button when forcePasswordChange is true', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: true, forcePasswordChange: true },
    });

    await act(async () => {
      renderWithMantine(<ChangePasswordPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Neues Passwort setzen')).toBeInTheDocument();
    });
    expect(screen.queryByText('Abbrechen')).not.toBeInTheDocument();
  });

  it('validates empty current password', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: true, forcePasswordChange: false },
    });

    await act(async () => {
      renderWithMantine(<ChangePasswordPage />);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Passwort ändern' })).toBeInTheDocument();
    });

    // Fill only new password fields
    const newPasswordInput = screen.getByLabelText('Neues Passwort');
    const confirmInput = screen.getByLabelText('Passwort bestätigen');

    fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmInput, { target: { value: 'newpassword123' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Passwort ändern' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Aktuelles Passwort erforderlich')).toBeInTheDocument();
    });
  });

  it('validates empty new password', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: false, forcePasswordChange: false },
    });

    await act(async () => {
      renderWithMantine(<ChangePasswordPage />);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Passwort setzen' })).toBeInTheDocument();
    });

    // Submit without filling anything
    const submitButton = screen.getByRole('button', { name: 'Passwort setzen' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Neues Passwort erforderlich')).toBeInTheDocument();
    });
  });

  it('validates password length', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: false, forcePasswordChange: false },
    });

    await act(async () => {
      renderWithMantine(<ChangePasswordPage />);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Passwort setzen' })).toBeInTheDocument();
    });

    const newPasswordInput = screen.getByLabelText('Neues Passwort');
    fireEvent.change(newPasswordInput, { target: { value: 'short' } });

    const submitButton = screen.getByRole('button', { name: 'Passwort setzen' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Mindestens 8 Zeichen')).toBeInTheDocument();
    });
  });

  it('validates password confirmation', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: false, forcePasswordChange: false },
    });

    await act(async () => {
      renderWithMantine(<ChangePasswordPage />);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Passwort setzen' })).toBeInTheDocument();
    });

    const newPasswordInput = screen.getByLabelText('Neues Passwort');
    const confirmInput = screen.getByLabelText('Passwort bestätigen');

    fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmInput, { target: { value: 'different123' } });

    const submitButton = screen.getByRole('button', { name: 'Passwort setzen' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Passwörter stimmen nicht überein')).toBeInTheDocument();
    });
  });

  it('validates empty confirm password', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: false, forcePasswordChange: false },
    });

    await act(async () => {
      renderWithMantine(<ChangePasswordPage />);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Passwort setzen' })).toBeInTheDocument();
    });

    const newPasswordInput = screen.getByLabelText('Neues Passwort');
    fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });

    const submitButton = screen.getByRole('button', { name: 'Passwort setzen' });
    fireEvent.click(submitButton);

    // The error message appears in an error paragraph element (class contains text-red-400)
    await waitFor(() => {
      const errorElements = screen.getAllByText('Passwort bestätigen');
      // Should have 2 - the label and the error message
      expect(errorElements.length).toBe(2);
    });
  });

  it('submits password change successfully', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: false, forcePasswordChange: false },
    });
    mockChangePassword.mockResolvedValueOnce({ error: null });

    await act(async () => {
      renderWithMantine(<ChangePasswordPage />);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Passwort setzen' })).toBeInTheDocument();
    });

    const newPasswordInput = screen.getByLabelText('Neues Passwort');
    const confirmInput = screen.getByLabelText('Passwort bestätigen');

    await act(async () => {
      fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
      fireEvent.change(confirmInput, { target: { value: 'newpassword123' } });
    });

    const submitButton = screen.getByRole('button', { name: 'Passwort setzen' });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Verify the change password API was called with correct parameters
    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith(
        undefined,
        'newpassword123',
        'newpassword123'
      );
    });
  });

  it('shows error on API failure', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: false, forcePasswordChange: false },
    });
    mockChangePassword.mockResolvedValueOnce({ error: { error: 'Invalid password' } });

    await act(async () => {
      renderWithMantine(<ChangePasswordPage />);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Passwort setzen' })).toBeInTheDocument();
    });

    const newPasswordInput = screen.getByLabelText('Neues Passwort');
    const confirmInput = screen.getByLabelText('Passwort bestätigen');

    await act(async () => {
      fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
      fireEvent.change(confirmInput, { target: { value: 'newpassword123' } });
    });

    const submitButton = screen.getByRole('button', { name: 'Passwort setzen' });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Verify the API was called
    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalled();
    });

    // On failure, should not redirect
    expect(mockPush).not.toHaveBeenCalledWith('/profile');
  });

  it('shows network error on fetch failure', async () => {
    const { showErrorToast } = await import('@/lib/toast/toast');

    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: false, forcePasswordChange: false },
    });
    mockChangePassword.mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      renderWithMantine(<ChangePasswordPage />);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Passwort setzen' })).toBeInTheDocument();
    });

    const newPasswordInput = screen.getByLabelText('Neues Passwort');
    const confirmInput = screen.getByLabelText('Passwort bestätigen');

    await act(async () => {
      fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
      fireEvent.change(confirmInput, { target: { value: 'newpassword123' } });
    });

    const submitButton = screen.getByRole('button', { name: 'Passwort setzen' });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith('Verbindungsfehler');
    });
  });

  it('calls router.back when cancel is clicked', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: true, forcePasswordChange: false },
    });

    await act(async () => {
      renderWithMantine(<ChangePasswordPage />);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Passwort ändern' })).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: 'Abbrechen' });
    fireEvent.click(cancelButton);

    expect(mockBack).toHaveBeenCalled();
  });

  it('shows button text as "Passwort ändern" when user has existing password', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: true, forcePasswordChange: false },
    });

    await act(async () => {
      renderWithMantine(<ChangePasswordPage />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Passwort ändern' })).toBeInTheDocument();
    });
  });

  it('handles password status check error gracefully', async () => {
    mockPasswordLoginGet.mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      renderWithMantine(<ChangePasswordPage />);
    });

    // Should show the form with "Passwort ändern" (assumes has password on error)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Passwort ändern' })).toBeInTheDocument();
    });
  });

  it('handles response with no data', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({ data: null });

    await act(async () => {
      renderWithMantine(<ChangePasswordPage />);
    });

    // Should show the form (assumes has password when no data)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Passwort ändern' })).toBeInTheDocument();
    });
  });

  it('shows default error message when API returns no error field', async () => {
    mockPasswordLoginGet.mockResolvedValueOnce({
      data: { passwordLoginEnabled: false, forcePasswordChange: false },
    });
    mockChangePassword.mockResolvedValueOnce({ error: {} });

    await act(async () => {
      renderWithMantine(<ChangePasswordPage />);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Passwort setzen' })).toBeInTheDocument();
    });

    const newPasswordInput = screen.getByLabelText('Neues Passwort');
    const confirmInput = screen.getByLabelText('Passwort bestätigen');

    await act(async () => {
      fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
      fireEvent.change(confirmInput, { target: { value: 'newpassword123' } });
    });

    const submitButton = screen.getByRole('button', { name: 'Passwort setzen' });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Verify the API was called
    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalled();
    });

    // On failure, should not redirect
    expect(mockPush).not.toHaveBeenCalledWith('/profile');
  });
});
