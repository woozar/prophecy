import { notifications } from '@mantine/notifications';

import { errorToastWithCopy, infoToast, successToast, warningToast } from './toast-styles';

export function showSuccessToast(message: string, description?: string) {
  notifications.show(successToast(message, description));
}

export function showErrorToast(message: string, description?: string) {
  notifications.show(errorToastWithCopy(message, description));
}

export function showWarningToast(message: string, description?: string) {
  notifications.show(warningToast(message, description));
}

export function showInfoToast(message: string, description?: string) {
  notifications.show(infoToast(message, description));
}
