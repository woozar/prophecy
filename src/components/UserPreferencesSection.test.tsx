import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/lib/api-client';
import { showErrorToast, showSuccessToast } from '@/lib/toast/toast';
import { useUserStore } from '@/store/useUserStore';

import { UserPreferencesSection } from './UserPreferencesSection';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    user: {
      preferences: {
        update: vi.fn(),
      },
    },
  },
}));

vi.mock('@/lib/toast/toast', () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}));

vi.mock('@/store/useUserStore', () => ({
  useUserStore: vi.fn(),
}));

describe('UserPreferencesSection', () => {
  const mockSetUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUserStore).mockImplementation((selector) => {
      const state = {
        setUser: mockSetUser,
        currentUserId: 'user-1',
        users: {
          'user-1': {
            id: 'user-1',
            username: 'testuser',
            displayName: 'Test User',
            animationsEnabled: true,
          },
        },
      } as never;
      return selector(state);
    });
  });

  it('renders with animations enabled', () => {
    render(<UserPreferencesSection animationsEnabled={true} />);

    expect(screen.getByText('Animationen aktiv')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deaktivieren' })).toBeInTheDocument();
  });

  it('renders with animations disabled', () => {
    render(<UserPreferencesSection animationsEnabled={false} />);

    expect(screen.getByText('Animationen deaktiviert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aktivieren' })).toBeInTheDocument();
  });

  it('toggles animations off successfully', async () => {
    vi.mocked(apiClient.user.preferences.update).mockResolvedValue({
      data: { success: true, animationsEnabled: false },
      error: undefined,
    } as never);

    render(<UserPreferencesSection animationsEnabled={true} />);

    const button = screen.getByRole('button', { name: 'Deaktivieren' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(apiClient.user.preferences.update).toHaveBeenCalledWith({
        animationsEnabled: false,
      });
    });

    expect(showSuccessToast).toHaveBeenCalledWith('Animationen deaktiviert');
    expect(mockSetUser).toHaveBeenCalled();
  });

  it('toggles animations on successfully', async () => {
    vi.mocked(apiClient.user.preferences.update).mockResolvedValue({
      data: { success: true, animationsEnabled: true },
      error: undefined,
    } as never);

    render(<UserPreferencesSection animationsEnabled={false} />);

    const button = screen.getByRole('button', { name: 'Aktivieren' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(apiClient.user.preferences.update).toHaveBeenCalledWith({
        animationsEnabled: true,
      });
    });

    expect(showSuccessToast).toHaveBeenCalledWith('Animationen aktiviert');
  });

  it('shows error toast on API error response', async () => {
    vi.mocked(apiClient.user.preferences.update).mockResolvedValue({
      data: null,
      error: { error: 'Server error' },
    } as never);

    render(<UserPreferencesSection animationsEnabled={true} />);

    const button = screen.getByRole('button', { name: 'Deaktivieren' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith('Server error');
    });
  });

  it('shows connection error toast on network error', async () => {
    vi.mocked(apiClient.user.preferences.update).mockRejectedValue(new Error('Network error'));

    render(<UserPreferencesSection animationsEnabled={true} />);

    const button = screen.getByRole('button', { name: 'Deaktivieren' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith('Verbindungsfehler');
    });
  });

  it('shows loading state while updating', async () => {
    let resolvePromise: (value: never) => void;
    const promise = new Promise<never>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(apiClient.user.preferences.update).mockReturnValue(promise);

    render(<UserPreferencesSection animationsEnabled={true} />);

    const button = screen.getByRole('button', { name: 'Deaktivieren' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Wird aktualisiert...' })).toBeDisabled();
    });

    resolvePromise!({ data: { success: true, animationsEnabled: false } } as never);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Aktivieren' })).not.toBeDisabled();
    });
  });
});
