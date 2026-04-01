import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@/styles/globals.css';
import { PWAProvider } from '@/components/pwa-provider';

export const metadata: Metadata = {
  title: 'Smart Attendance',
  description: 'PWA Chấm công thông minh - Check-in/out với GPS Geofencing',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Smart Attendance',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Smart Attendance',
    title: 'Smart Attendance',
    description: 'PWA Chấm công thông minh - Check-in/out với GPS Geofencing',
  },
};

export const viewport: Viewport = {
  themeColor: '#111827',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.svg" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.svg" sizes="180x180" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-background antialiased">
        <PWAProvider>{children}</PWAProvider>
      </body>
    </html>
  );
}
