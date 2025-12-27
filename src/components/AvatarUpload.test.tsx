import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { AvatarUpload } from './AvatarUpload';
import { MantineProvider } from '@mantine/core';
import { showSuccessToast, showErrorToast } from '@/lib/toast/toast';

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

describe('AvatarUpload', () => {
  const defaultProps = {
    username: 'testuser',
    displayName: 'Test User',
    avatarUrl: null,
    avatarEffect: null,
    avatarEffectColors: [],
    onAvatarChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders dropzone with instructions', () => {
      renderWithMantine(<AvatarUpload {...defaultProps} />);

      expect(screen.getByText('Bild hier ablegen oder klicken')).toBeInTheDocument();
      expect(screen.getByText('Max. 5MB (JPEG, PNG, WebP, GIF)')).toBeInTheDocument();
    });

    it('renders avatar preview with initials', () => {
      renderWithMantine(<AvatarUpload {...defaultProps} />);

      expect(screen.getByTitle('Test User')).toBeInTheDocument();
    });

    it('shows delete button when avatar exists', () => {
      renderWithMantine(
        <AvatarUpload {...defaultProps} avatarUrl="/api/uploads/avatars/test.webp" />
      );

      expect(screen.getByText('Avatar entfernen')).toBeInTheDocument();
    });

    it('hides delete button when no avatar', () => {
      renderWithMantine(<AvatarUpload {...defaultProps} avatarUrl={null} />);

      expect(screen.queryByText('Avatar entfernen')).not.toBeInTheDocument();
    });
  });

  describe('upload functionality', () => {
    it('calls API on file drop and shows success toast', async () => {
      const mockOnAvatarChange = vi.fn();
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ avatarUrl: '/api/uploads/avatars/new.webp' }),
      });

      renderWithMantine(<AvatarUpload {...defaultProps} onAvatarChange={mockOnAvatarChange} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const dropzone = screen.getByText('Bild hier ablegen oder klicken').closest('div');

      // Simulate drop
      fireEvent.drop(dropzone!, {
        dataTransfer: {
          files: [file],
          types: ['Files'],
        },
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/users/me/avatar', {
          method: 'POST',
          body: expect.any(FormData),
        });
      });

      await waitFor(() => {
        expect(showSuccessToast).toHaveBeenCalledWith('Avatar hochgeladen');
      });

      expect(mockOnAvatarChange).toHaveBeenCalledWith('/api/uploads/avatars/new.webp');
    });

    it('shows error toast on upload failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Upload failed' }),
      });

      renderWithMantine(<AvatarUpload {...defaultProps} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const dropzone = screen.getByText('Bild hier ablegen oder klicken').closest('div');

      fireEvent.drop(dropzone!, {
        dataTransfer: {
          files: [file],
          types: ['Files'],
        },
      });

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith('Upload failed');
      });
    });
  });

  describe('delete functionality', () => {
    it('calls API on delete and shows success toast', async () => {
      const mockOnAvatarChange = vi.fn();
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      renderWithMantine(
        <AvatarUpload
          {...defaultProps}
          avatarUrl="/api/uploads/avatars/test.webp"
          onAvatarChange={mockOnAvatarChange}
        />
      );

      fireEvent.click(screen.getByText('Avatar entfernen'));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/users/me/avatar', {
          method: 'DELETE',
        });
      });

      expect(showSuccessToast).toHaveBeenCalledWith('Avatar entfernt');
      expect(mockOnAvatarChange).toHaveBeenCalledWith(null);
    });

    it('shows error toast on delete failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Delete failed' }),
      });

      renderWithMantine(
        <AvatarUpload {...defaultProps} avatarUrl="/api/uploads/avatars/test.webp" />
      );

      fireEvent.click(screen.getByText('Avatar entfernen'));

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith('Delete failed');
      });
    });

    it('shows loading state while deleting', async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      globalThis.fetch = vi.fn().mockReturnValue(pendingPromise);

      renderWithMantine(
        <AvatarUpload {...defaultProps} avatarUrl="/api/uploads/avatars/test.webp" />
      );

      fireEvent.click(screen.getByText('Avatar entfernen'));

      expect(screen.getByText('Wird entfernt...')).toBeInTheDocument();

      resolvePromise!({ ok: true, json: () => Promise.resolve({ success: true }) });

      await waitFor(() => {
        expect(screen.queryByText('Wird entfernt...')).not.toBeInTheDocument();
      });
    });
  });

  describe('avatar effect display', () => {
    it('passes avatar effect to preview', () => {
      renderWithMantine(
        <AvatarUpload {...defaultProps} avatarEffect="glow" avatarEffectColors={['cyan', 'teal']} />
      );

      // The avatar preview should be rendered with the effect
      expect(screen.getByTitle('Test User')).toBeInTheDocument();
    });
  });
});
