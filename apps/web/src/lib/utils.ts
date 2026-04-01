export function generateNonce(): string {
  return crypto.randomUUID();
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';

  const storage = window.sessionStorage;
  const storageKey = 'smart-attendance-device-id';
  let deviceId = storage.getItem(storageKey);

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    storage.setItem(storageKey, deviceId);
  }

  return deviceId;
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins} phút`;
  }
  
  return `${hours}h ${mins}m`;
}

export function toLocalDateInputValue(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
