'use client';

import { useEffect } from 'react';

const SW_PATH = '/sw.js';

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register(SW_PATH);
        if (process.env.NODE_ENV !== 'production') {
          console.info('[pwa] service worker registered', registration.scope);
        }
      } catch (error) {
        console.error('[pwa] failed to register service worker', error);
      }
    };

    register();
  }, []);

  return null;
}
