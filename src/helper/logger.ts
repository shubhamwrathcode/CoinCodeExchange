import Toast from 'react-native-simple-toast';

export const showError = (err: any) => {
  if (!err) return;
  const msg =
    typeof err === 'string'
      ? err
      : err?.message || err?.error || err?.msg || err?.data?.message || err?.response?.data?.message || String(err || '');
  if (msg && msg !== '[object Object]') {
    try {
      Toast.showWithGravity(msg, Toast.LONG, Toast.BOTTOM);
    } catch {
      Toast.show(msg, Toast.LONG);
    }
  }
};

export const showSuccess = (message: any) => {
  if (!message) return;
  const msg =
    typeof message === 'string'
      ? message
      : message?.message || message?.msg || message?.data?.message || String(message || '');
  if (msg && msg !== '[object Object]') {
    try {
      Toast.showWithGravity(msg, Toast.LONG, Toast.BOTTOM);
    } catch {
      Toast.show(msg, Toast.LONG);
    }
  }
};

export const logger = (_e: unknown) => {
  // No-op in production; use showError for user-facing errors
};
