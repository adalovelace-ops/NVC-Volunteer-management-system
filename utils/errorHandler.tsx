import { Alert, Platform } from 'react-native';
import { getRequestErrorMessage, getRequestErrorTitle } from './requestErrors';

type ShowOptions = {
  fallbackTitle?: string;
  fallbackMessage?: string;
};

export function showError(error: unknown, options: ShowOptions = {}) {
  const title = getRequestErrorTitle(error, options.fallbackTitle || 'Error');
  const message = getRequestErrorMessage(error, options.fallbackMessage || 'An unexpected error occurred.');

  try {
    if (Platform.OS === 'web') {
      // Simple web fallback while the app lacks a global toast UI
      // eslint-disable-next-line no-alert
      alert(`${title}\n\n${message}`);
      return;
    }
  } catch {
    // ignore
  }

  Alert.alert(title, message);
}

export function showInfo(title: string, message: string) {
  try {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      alert(`${title}\n\n${message}`);
      return;
    }
  } catch {
    // ignore
  }

  Alert.alert(title, message);
}

export default { showError, showInfo };
