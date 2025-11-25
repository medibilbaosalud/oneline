export const PASSPHRASE_KEY = 'oneline_encryption_passphrase_v1';

export function getStoredPassphrase(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(PASSPHRASE_KEY);
  } catch {
    return null;
  }
}

export function setStoredPassphrase(passphrase: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PASSPHRASE_KEY, passphrase);
  } catch {
    // ignore quota and availability errors
  }
}

export function clearStoredPassphrase() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PASSPHRASE_KEY);
  } catch {
    // ignore availability errors
  }
}
