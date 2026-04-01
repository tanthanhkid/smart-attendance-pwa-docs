'use client';

import type { ReactNode } from 'react';
import { usePWAInstall, useNetworkStatus, useServiceWorker } from '@/lib/pwa';
import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCw } from 'lucide-react';

export function PWAProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <NetworkBanner />
      <InstallPrompt />
      <UpdatePrompt />
    </>
  );
}

function NetworkBanner() {
  const { isOnline, effectiveType } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-yellow-900 p-3 z-50 flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">
        Bạn đang offline. Một số tính năng có thể không hoạt động.
        {effectiveType && <span className="ml-1 opacity-75">(Connection: {effectiveType})</span>}
      </span>
    </div>
  );
}

function InstallPrompt() {
  const { isInstallable, installPWA, dismissInstallPrompt, displayMode } = usePWAInstall();

  if (!isInstallable) return null;

  const isIOS = displayMode.isIOSStandalone;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50 border">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h3 className="font-semibold">
            {isIOS ? 'Thêm vào màn hình chính' : 'Cài đặt ứng dụng'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isIOS
              ? 'Nhấn nút Chia sẻ → "Thêm vào màn hình chính"'
              : 'Cài đặt Smart Attendance lên màn hình chính để sử dụng nhanh hơn.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={dismissInstallPrompt}>
            Đóng
          </Button>
          {!isIOS && (
            <Button size="sm" onClick={installPWA}>
              Cài đặt
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function UpdatePrompt() {
  const { updateAvailable, skipWaiting } = useServiceWorker();

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-primary text-primary-foreground rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-center gap-4">
        <RefreshCw className="h-5 w-5 animate-spin" />
        <div className="flex-1">
          <h3 className="font-semibold">Cập nhật mới</h3>
          <p className="text-sm opacity-90 mt-1">
            Phiên bản mới đã sẵn sàng.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={skipWaiting}>
          Cập nhật
        </Button>
      </div>
    </div>
  );
}
