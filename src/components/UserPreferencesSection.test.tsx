import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/lib/api-client';
import { showErrorToast, showSuccessToast } from '@/lib/toast/toast';
import { useUserStore } from '@/store/useUserStore';

import { UserPreferencesSection } from './UserPreferencesSection';

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
    renderWithMantine(<UserPreferencesSection animationsEnabled={true} />);

    const switchElement = screen.getByRole('switch', { name: /animationen/i });
    expect(switchElement).toBeChecked();
  });

  it('renders with animations disabled', () => {
    renderWithMantine(<UserPreferencesSection animationsEnabled={false} />);

    const switchElement = screen.getByRole('switch', { name: /animationen/i });
    expect(switchElement).not.toBeChecked();
  });

  it('toggles animations off successfully', async () => {
    vi.mocked(apiClient.user.preferences.update).mockResolvedValue({
      data: { success: true, animationsEnabled: false },
      error: undefined,
    } as never);

    renderWithMantine(<UserPreferencesSection animationsEnabled={true} />);

    const switchElement = screen.getByRole('switch', { name: /animationen/i });
    fireEvent.click(switchElement);

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

    renderWithMantine(<UserPreferencesSection animationsEnabled={false} />);

    const switchElement = screen.getByRole('switch', { name: /animationen/i });
    fireEvent.click(switchElement);

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

    renderWithMantine(<UserPreferencesSection animationsEnabled={true} />);

    const switchElement = screen.getByRole('switch', { name: /animationen/i });
    fireEvent.click(switchElement);

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith('Server error');
    });
  });

  it('shows connection error toast on network error', async () => {
    vi.mocked(apiClient.user.preferences.update).mockRejectedValue(new Error('Network error'));

    renderWithMantine(<UserPreferencesSection animationsEnabled={true} />);

    const switchElement = screen.getByRole('switch', { name: /animationen/i });
    fireEvent.click(switchElement);

    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith('Verbindungsfehler');
    });
  });

  it('disables switch while updating', async () => {
    let resolvePromise: (value: never) => void;
    const promise = new Promise<never>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(apiClient.user.preferences.update).mockReturnValue(promise);

    renderWithMantine(<UserPreferencesSection animationsEnabled={true} />);

    const switchElement = screen.getByRole('switch', { name: /animationen/i });
    fireEvent.click(switchElement);

    await waitFor(() => {
      expect(switchElement).toBeDisabled();
    });

    resolvePromise!({ data: { success: true, animationsEnabled: false } } as never);

    await waitFor(() => {
      expect(switchElement).not.toBeDisabled();
    });
  });
});
