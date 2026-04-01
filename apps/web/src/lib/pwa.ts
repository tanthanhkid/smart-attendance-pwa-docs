'use client';

import { useEffect, useState } from 'react';

const INSTALL_PROMPT_DISMISSED_AT_KEY = 'smart-attendance:pwa-install-dismissed-at';
const INSTALL_PROMPT_COOLDOWN_MS = 5 * 24 * 60 * 60 * 1000;

function getInstallPromptCooldownState() {
  if (typeof window === 'undefined') {
    return { isDismissed: false, dismissedAt: null as number | null };
  }

  const dismissedAtRaw = window.localStorage.getItem(INSTALL_PROMPT_DISMISSED_AT_KEY);
  if (!dismissedAtRaw) {
    return { isDismissed: false, dismissedAt: null as number | null };
  }

  const dismissedAt = Number.parseInt(dismissedAtRaw, 10);
  const isCoolingDown =
    Number.isFinite(dismissedAt) && Date.now() - dismissedAt < INSTALL_PROMPT_COOLDOWN_MS;

  if (!isCoolingDown) {
    window.localStorage.removeItem(INSTALL_PROMPT_DISMISSED_AT_KEY);
    return { isDismissed: false, dismissedAt: null as number | null };
  }

  return { isDismissed: true, dismissedAt };
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWADisplayMode {
  isStandalone: boolean;
  isIOSStandalone: boolean;
  isInWebApp: boolean;
  displayMode: string;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isDismissStateReady, setIsDismissStateReady] = useState(false);
  const [displayMode, setDisplayMode] = useState<PWADisplayMode>({
    isStandalone: false,
    isIOSStandalone: false,
    isInWebApp: false,
    displayMode: 'browser',
  });

  useEffect(() => {
    const { isDismissed: nextDismissed } = getInstallPromptCooldownState();
    setIsDismissed(nextDismissed);
    setIsDismissStateReady(true);
  }, []);

  useEffect(() => {
    const standaloneMediaQuery = window.matchMedia('(display-mode: standalone)');

    const checkDisplayMode = (): PWADisplayMode => {
      if (typeof window === 'undefined') {
        return { isStandalone: false, isIOSStandalone: false, isInWebApp: false, displayMode: 'browser' };
      }

      const nav = window.navigator as Navigator & { standalone?: boolean };

      const isStandalone = standaloneMediaQuery.matches;
      const isIOSStandalone = nav.standalone === true;
      const isInWebApp = isStandalone || isIOSStandalone;

      let mode = 'browser';
      if (isIOSStandalone) {
        mode = 'standalone-ios';
      } else if (isStandalone) {
        mode = 'standalone';
      } else if (window.matchMedia('(display-mode: minimal-ui)').matches) {
        mode = 'minimal-ui';
      } else if (window.matchMedia('(display-mode: fullscreen)').matches) {
        mode = 'fullscreen';
      }

      return {
        isStandalone,
        isIOSStandalone,
        isInWebApp,
        displayMode: mode,
      };
    };

    const updateDisplayMode = () => {
      setDisplayMode(checkDisplayMode());
    };

    setDisplayMode(checkDisplayMode());

    standaloneMediaQuery.addEventListener('change', updateDisplayMode);

    if ('standalone' in window.navigator) {
      window.addEventListener('resize', updateDisplayMode);
    }

    return () => {
      standaloneMediaQuery.removeEventListener('change', updateDisplayMode);
      window.removeEventListener('resize', updateDisplayMode);
    };
  }, []);

  useEffect(() => {
    if (displayMode.isInWebApp || !isDismissStateReady) {
      setIsInstallable(false);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const { isDismissed: blockedByCooldown } = getInstallPromptCooldownState();
      setIsDismissed(blockedByCooldown);
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(!blockedByCooldown);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setIsDismissed(false);
      window.localStorage.removeItem(INSTALL_PROMPT_DISMISSED_AT_KEY);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [displayMode.isInWebApp, isDismissStateReady]);

  const installPWA = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const dismissInstallPrompt = () => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(INSTALL_PROMPT_DISMISSED_AT_KEY, String(Date.now()));
    setIsDismissed(true);
    setIsInstallable(false);
    setDeferredPrompt(null);
  };

  return {
    isInstallable: isDismissStateReady && !isDismissed && isInstallable,
    installPWA,
    dismissInstallPrompt,
    displayMode,
  };
}

export function useServiceWorker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let activeRegistration: ServiceWorkerRegistration | null = null;

    navigator.serviceWorker
      .register('/sw.js')
      .then((serviceWorkerRegistration) => {
        activeRegistration = serviceWorkerRegistration;
        setRegistration(serviceWorkerRegistration);

        serviceWorkerRegistration.addEventListener('updatefound', () => {
          const newWorker = serviceWorkerRegistration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
      })
      .catch(() => {
        // Service worker is optional; keep the app usable without it.
      });

    const interval = setInterval(() => {
      activeRegistration?.update();
    }, 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const skipWaiting = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  return {
    updateAvailable,
    skipWaiting,
  };
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [effectiveType, setEffectiveType] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateNetworkStatus = () => {
      setIsOnline(navigator.onLine);

      const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
      if (connection) {
        setEffectiveType(connection.effectiveType || null);
      }
    };

    updateNetworkStatus();

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    const connection = (navigator as Navigator & { connection?: { effectiveType?: string; addEventListener?: (type: string, listener: () => void) => void; removeEventListener?: (type: string, listener: () => void) => void } }).connection;
    if (connection?.addEventListener) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);

      if (connection?.removeEventListener) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, []);

  return {
    isOnline,
    effectiveType,
  };
}
