import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProfileAvatarSection } from './ProfileAvatarSection';

function renderWithMantine(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

// Mock toast
vi.mock('@/lib/toast/toast', () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}));

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

describe('ProfileAvatarSection', () => {
  const defaultProps = {
    username: 'testuser',
    displayName: 'Test User',
    avatarUrl: null,
    avatarEffect: null,
    avatarEffectColors: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders section title', () => {
      renderWithMantine(<ProfileAvatarSection {...defaultProps} />);

      expect(screen.getByText('Avatar & Effekte')).toBeInTheDocument();
    });

    it('renders profile picture section', () => {
      renderWithMantine(<ProfileAvatarSection {...defaultProps} />);

      expect(screen.getByText('Profilbild')).toBeInTheDocument();
    });

    it('renders upload instructions', () => {
      renderWithMantine(<ProfileAvatarSection {...defaultProps} />);

      expect(screen.getByText('Bild hier ablegen oder klicken')).toBeInTheDocument();
    });

    it('renders effect selector', () => {
      renderWithMantine(<ProfileAvatarSection {...defaultProps} />);

      expect(screen.getByText('Effekt wählen')).toBeInTheDocument();
      expect(screen.getByText('Kein Effekt')).toBeInTheDocument();
      expect(screen.getByText('Glow')).toBeInTheDocument();
    });

    it('renders avatar preview', () => {
      renderWithMantine(<ProfileAvatarSection {...defaultProps} />);

      // Should have multiple avatar previews (upload + effect selector)
      const avatars = screen.getAllByTitle('Test User');
      expect(avatars.length).toBeGreaterThan(0);
    });
  });

  describe('state management', () => {
    it('updates avatar URL when upload succeeds', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ avatarUrl: '/api/uploads/avatars/new.webp' }),
      });

      renderWithMantine(<ProfileAvatarSection {...defaultProps} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const dropzone = screen.getByText('Bild hier ablegen oder klicken').closest('div');

      fireEvent.drop(dropzone!, {
        dataTransfer: {
          files: [file],
          types: ['Files'],
        },
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/users/me/avatar', expect.any(Object));
      });
    });

    it('updates effect when effect selector changes', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      renderWithMantine(<ProfileAvatarSection {...defaultProps} />);

      // Click on Glow effect
      fireEvent.click(screen.getByText('Glow'));

      // Save button should appear
      expect(screen.getByText('Effekte speichern')).toBeInTheDocument();
    });
  });

  describe('integration', () => {
    it('passes avatar state to both components', () => {
      renderWithMantine(
        <ProfileAvatarSection
          {...defaultProps}
          avatarUrl="/api/uploads/avatars/existing.webp"
          avatarEffect="glow"
          avatarEffectColors={['cyan', 'teal']}
        />
      );

      // Delete button should be visible since avatar exists
      expect(screen.getByText('Avatar entfernen')).toBeInTheDocument();

      // Color selection should be visible since effect is glow
      expect(screen.getByText('Farben wählen (Mehrfachauswahl)')).toBeInTheDocument();
    });

    it('renders with null display name', () => {
      renderWithMantine(<ProfileAvatarSection {...defaultProps} displayName={null} />);

      // Should fall back to username for title
      expect(screen.getAllByTitle('testuser').length).toBeGreaterThan(0);
    });
  });
});
