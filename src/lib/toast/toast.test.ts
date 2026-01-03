import { notifications } from '@mantine/notifications';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { showErrorToast, showInfoToast, showSuccessToast, showWarningToast } from './toast';

// Mock mantine notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Mock toast-styles
vi.mock('./toast-styles', () => ({
  successToast: vi.fn((message: string, description?: string) => ({
    type: 'success',
    message,
    description,
  })),
  errorToast: vi.fn((message: string, description?: string) => ({
    type: 'error',
    message,
    description,
  })),
  errorToastWithCopy: vi.fn((message: string, description?: string) => ({
    type: 'error',
    message,
    description,
  })),
  warningToast: vi.fn((message: string, description?: string) => ({
    type: 'warning',
    message,
    description,
  })),
  infoToast: vi.fn((message: string, description?: string) => ({
    type: 'info',
    message,
    description,
  })),
}));

describe('toast utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('showSuccessToast', () => {
    it('shows success notification with message only', () => {
      showSuccessToast('Operation successful');

      expect(notifications.show).toHaveBeenCalledWith({
        type: 'success',
        message: 'Operation successful',
        description: undefined,
      });
    });

    it('shows success notification with message and description', () => {
      showSuccessToast('Saved', 'Your changes have been saved');

      expect(notifications.show).toHaveBeenCalledWith({
        type: 'success',
        message: 'Saved',
        description: 'Your changes have been saved',
      });
    });
  });

  describe('showErrorToast', () => {
    it('shows error notification with message only', () => {
      showErrorToast('Something went wrong');

      expect(notifications.show).toHaveBeenCalledWith({
        type: 'error',
        message: 'Something went wrong',
        description: undefined,
      });
    });

    it('shows error notification with message and description', () => {
      showErrorToast('Error', 'Please try again later');

      expect(notifications.show).toHaveBeenCalledWith({
        type: 'error',
        message: 'Error',
        description: 'Please try again later',
      });
    });
  });

  describe('showWarningToast', () => {
    it('shows warning notification with message only', () => {
      showWarningToast('Be careful');

      expect(notifications.show).toHaveBeenCalledWith({
        type: 'warning',
        message: 'Be careful',
        description: undefined,
      });
    });

    it('shows warning notification with message and description', () => {
      showWarningToast('Warning', 'This action cannot be undone');

      expect(notifications.show).toHaveBeenCalledWith({
        type: 'warning',
        message: 'Warning',
        description: 'This action cannot be undone',
      });
    });
  });

  describe('showInfoToast', () => {
    it('shows info notification with message only', () => {
      showInfoToast('Did you know?');

      expect(notifications.show).toHaveBeenCalledWith({
        type: 'info',
        message: 'Did you know?',
        description: undefined,
      });
    });

    it('shows info notification with message and description', () => {
      showInfoToast('Info', 'Here is some helpful information');

      expect(notifications.show).toHaveBeenCalledWith({
        type: 'info',
        message: 'Info',
        description: 'Here is some helpful information',
      });
    });
  });

  it('each toast type calls notifications.show exactly once', () => {
    showSuccessToast('Success');
    showErrorToast('Error');
    showWarningToast('Warning');
    showInfoToast('Info');

    expect(notifications.show).toHaveBeenCalledTimes(4);
  });
});
