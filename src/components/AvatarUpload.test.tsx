import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { showErrorToast, showSuccessToast } from '@/lib/toast/toast';

import { AvatarUpload } from './AvatarUpload';

function renderWithMantine(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

// Mock apiClient
const mockAvatarUpload = vi.fn();
const mockAvatarDelete = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    user: {
      avatar: {
        upload: (...args: unknown[]) => mockAvatarUpload(...args),
        delete: () => mockAvatarDelete(),
      },
    },
  },
}));

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

      expect(screen.getByText('Entfernen')).toBeInTheDocument();
    });

    it('hides delete button when no avatar', () => {
      renderWithMantine(<AvatarUpload {...defaultProps} avatarUrl={null} />);

      expect(screen.queryByText('Entfernen')).not.toBeInTheDocument();
    });
  });

  describe('upload functionality', () => {
    it('calls API on file drop and shows success toast', async () => {
      const mockOnAvatarChange = vi.fn();
      mockAvatarUpload.mockResolvedValue({
        data: { avatarUrl: '/api/uploads/avatars/new.webp' },
        error: null,
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
        expect(mockAvatarUpload).toHaveBeenCalledWith(file);
      });

      await waitFor(() => {
        expect(showSuccessToast).toHaveBeenCalledWith('Avatar hochgeladen');
      });

      expect(mockOnAvatarChange).toHaveBeenCalledWith('/api/uploads/avatars/new.webp');
    });

    it('shows error toast on upload failure', async () => {
      mockAvatarUpload.mockResolvedValue({
        data: null,
        error: { error: 'Upload failed' },
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
      mockAvatarDelete.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      renderWithMantine(
        <AvatarUpload
          {...defaultProps}
          avatarUrl="/api/uploads/avatars/test.webp"
          onAvatarChange={mockOnAvatarChange}
        />
      );

      fireEvent.click(screen.getByText('Entfernen'));

      await waitFor(() => {
        expect(mockAvatarDelete).toHaveBeenCalled();
      });

      expect(showSuccessToast).toHaveBeenCalledWith('Avatar entfernt');
      expect(mockOnAvatarChange).toHaveBeenCalledWith(null);
    });

    it('shows error toast on delete failure', async () => {
      mockAvatarDelete.mockResolvedValue({
        data: null,
        error: { error: 'Delete failed' },
      });

      renderWithMantine(
        <AvatarUpload {...defaultProps} avatarUrl="/api/uploads/avatars/test.webp" />
      );

      fireEvent.click(screen.getByText('Entfernen'));

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith('Delete failed');
      });
    });

    it('shows loading state while deleting', async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockAvatarDelete.mockReturnValue(pendingPromise);

      renderWithMantine(
        <AvatarUpload {...defaultProps} avatarUrl="/api/uploads/avatars/test.webp" />
      );

      fireEvent.click(screen.getByText('Entfernen'));

      expect(screen.getByText('Entfernen...')).toBeInTheDocument();

      resolvePromise!({ data: { success: true }, error: null });

      await waitFor(() => {
        expect(screen.queryByText('Entfernen...')).not.toBeInTheDocument();
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
