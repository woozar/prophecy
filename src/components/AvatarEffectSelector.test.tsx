import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { showErrorToast, showSuccessToast } from '@/lib/toast/toast';

import { AvatarEffectSelector } from './AvatarEffectSelector';

// Mock toast
vi.mock('@/lib/toast/toast', () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}));

// Mock apiClient
const mockUpdateAvatarSettings = vi.fn();
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    user: {
      avatarSettings: {
        update: (data: unknown) => mockUpdateAvatarSettings(data),
      },
    },
  },
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

describe('AvatarEffectSelector', () => {
  const defaultProps = {
    username: 'testuser',
    displayName: 'Test User',
    avatarUrl: null,
    currentEffect: null,
    currentColors: [],
    onEffectChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders all effect options', () => {
      render(<AvatarEffectSelector {...defaultProps} />);

      expect(screen.getByText('Kein Effekt')).toBeInTheDocument();
      expect(screen.getByText('Glow')).toBeInTheDocument();
      expect(screen.getByText('Partikel')).toBeInTheDocument();
      expect(screen.getByText('Blitze')).toBeInTheDocument();
      expect(screen.getByText('Heiligenschein')).toBeInTheDocument();
      expect(screen.getByText('Funken')).toBeInTheDocument();
    });

    it('renders color selection when effect is not none', () => {
      render(<AvatarEffectSelector {...defaultProps} currentEffect="glow" />);

      expect(screen.getByText('Farben wählen (Mehrfachauswahl)')).toBeInTheDocument();
    });

    it('hides color selection when effect is none', () => {
      render(<AvatarEffectSelector {...defaultProps} currentEffect={null} />);

      expect(screen.queryByText('Farben wählen (Mehrfachauswahl)')).not.toBeInTheDocument();
    });
  });

  describe('effect selection', () => {
    it('selects effect when clicked', () => {
      render(<AvatarEffectSelector {...defaultProps} currentColors={['cyan']} />);

      fireEvent.click(screen.getByText('Glow'));

      // Should show color selector now
      expect(screen.getByText('Farben wählen (Mehrfachauswahl)')).toBeInTheDocument();
    });

    it('shows save button when effect changes', () => {
      // Start with 'none' effect and cyan color (matching defaults)
      render(
        <AvatarEffectSelector {...defaultProps} currentEffect={null} currentColors={['cyan']} />
      );

      // No changes yet
      expect(screen.queryByText('Effekte speichern')).not.toBeInTheDocument();

      // Change effect to glow
      fireEvent.click(screen.getByText('Glow'));

      // Now there should be changes
      expect(screen.getByText('Effekte speichern')).toBeInTheDocument();
    });

    it('hides save button when no changes', () => {
      render(
        <AvatarEffectSelector {...defaultProps} currentEffect="glow" currentColors={['cyan']} />
      );

      expect(screen.queryByText('Effekte speichern')).not.toBeInTheDocument();
    });
  });

  describe('color selection', () => {
    it('toggles color when clicked', () => {
      render(
        <AvatarEffectSelector {...defaultProps} currentEffect="glow" currentColors={['cyan']} />
      );

      // Click on teal color (should add it)
      const tealButton = screen.getByTitle('Teal');
      fireEvent.click(tealButton);

      // Save button should appear since colors changed
      expect(screen.getByText('Effekte speichern')).toBeInTheDocument();
    });

    it('prevents removing last color', () => {
      render(
        <AvatarEffectSelector {...defaultProps} currentEffect="glow" currentColors={['cyan']} />
      );

      // Try to remove the only selected color
      const cyanButton = screen.getByTitle('Cyan');
      fireEvent.click(cyanButton);

      // Save button should not appear since color didn't change
      expect(screen.queryByText('Effekte speichern')).not.toBeInTheDocument();
    });

    it('allows multiple color selection', () => {
      render(
        <AvatarEffectSelector {...defaultProps} currentEffect="glow" currentColors={['cyan']} />
      );

      fireEvent.click(screen.getByTitle('Teal'));
      fireEvent.click(screen.getByTitle('Violet'));

      expect(screen.getByText('Effekte speichern')).toBeInTheDocument();
    });
  });

  describe('saving', () => {
    it('calls API and shows success toast on save', async () => {
      const mockOnEffectChange = vi.fn();
      mockUpdateAvatarSettings.mockResolvedValue({ error: null });

      render(
        <AvatarEffectSelector
          {...defaultProps}
          currentEffect={null}
          onEffectChange={mockOnEffectChange}
        />
      );

      fireEvent.click(screen.getByText('Glow'));
      fireEvent.click(screen.getByText('Effekte speichern'));

      await waitFor(() => {
        expect(mockUpdateAvatarSettings).toHaveBeenCalledWith({
          avatarEffect: 'glow',
          avatarEffectColors: ['cyan'],
        });
      });

      expect(showSuccessToast).toHaveBeenCalledWith('Effekte gespeichert');
      expect(mockOnEffectChange).toHaveBeenCalledWith('glow', ['cyan']);
    });

    it('shows error toast on API failure', async () => {
      mockUpdateAvatarSettings.mockResolvedValue({
        error: { error: 'Server error' },
      });

      render(<AvatarEffectSelector {...defaultProps} currentEffect={null} />);

      fireEvent.click(screen.getByText('Glow'));
      fireEvent.click(screen.getByText('Effekte speichern'));

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith('Server error');
      });
    });

    it('shows loading state while saving', async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockUpdateAvatarSettings.mockReturnValue(pendingPromise);

      render(<AvatarEffectSelector {...defaultProps} currentEffect={null} />);

      fireEvent.click(screen.getByText('Glow'));
      fireEvent.click(screen.getByText('Effekte speichern'));

      expect(screen.getByText('Wird gespeichert...')).toBeInTheDocument();

      resolvePromise!({ error: null });

      await waitFor(() => {
        expect(screen.queryByText('Wird gespeichert...')).not.toBeInTheDocument();
      });
    });

    it('calls onEffectChange with null when selecting none', async () => {
      const mockOnEffectChange = vi.fn();
      mockUpdateAvatarSettings.mockResolvedValue({ error: null });

      render(
        <AvatarEffectSelector
          {...defaultProps}
          currentEffect="glow"
          currentColors={['cyan']}
          onEffectChange={mockOnEffectChange}
        />
      );

      fireEvent.click(screen.getByText('Kein Effekt'));
      fireEvent.click(screen.getByText('Effekte speichern'));

      await waitFor(() => {
        expect(mockOnEffectChange).toHaveBeenCalledWith(null, ['cyan']);
      });
    });
  });

  describe('initial state', () => {
    it('uses current effect as initial selection', () => {
      render(
        <AvatarEffectSelector
          {...defaultProps}
          currentEffect="lightning"
          currentColors={['rose']}
        />
      );

      // Color selector should be visible since effect is not none
      expect(screen.getByText('Farben wählen (Mehrfachauswahl)')).toBeInTheDocument();
    });

    it('defaults to cyan when no colors provided', () => {
      render(<AvatarEffectSelector {...defaultProps} currentEffect="glow" currentColors={[]} />);

      // Save button should appear because currentColors=[] differs from default ['cyan']
      expect(screen.getByText('Effekte speichern')).toBeInTheDocument();
    });

    it('uses provided colors as initial selection', () => {
      render(
        <AvatarEffectSelector
          {...defaultProps}
          currentEffect="glow"
          currentColors={['violet', 'emerald']}
        />
      );

      // No save button should appear since state matches current
      expect(screen.queryByText('Effekte speichern')).not.toBeInTheDocument();
    });
  });
});
