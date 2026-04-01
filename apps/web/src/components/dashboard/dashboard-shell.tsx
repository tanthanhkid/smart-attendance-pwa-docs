'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib';
import { Building2, FileText, LayoutDashboard, ListChecks, LogOut, Settings2, TimerReset } from 'lucide-react';

const baseNavItems = [
  { href: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/dashboard/reviews', label: 'Review queue', icon: ListChecks },
  { href: '/dashboard/reports', label: 'Báo cáo', icon: FileText },
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (user.role === 'EMPLOYEE') {
      router.push('/attendance');
    }
  }, [user, router]);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  if (!user || user.role === 'EMPLOYEE') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-cyan-50">
        <div className="rounded-2xl border bg-white/90 p-8 shadow-lg">
          <p className="text-sm text-muted-foreground">Đang điều hướng...</p>
        </div>
      </div>
    );
  }

  const branchLabel = user.role === 'MANAGER'
    ? user.employee?.branchName || 'Branch scope'
    : 'Toàn hệ thống';
  const navItems = user.role === 'ADMIN'
    ? [...baseNavItems, { href: '/dashboard/settings', label: 'Thiết lập', icon: Settings2 }] as const
    : baseNavItems;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_40%,_#f8fafc_100%)]">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                  <TimerReset className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Manager Console</p>
                  <h1 className="text-xl font-semibold text-slate-900">Smart Attendance</h1>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-slate-300 bg-white/90 px-3 py-1 text-slate-700">
                {user.role}
              </Badge>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Phạm vi đang xem</p>
              <p className="text-lg font-semibold text-slate-900">{branchLabel}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all',
                      active
                        ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/attendance"
                className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-900 transition hover:bg-cyan-100"
              >
                <Building2 className="h-4 w-4" />
                App nhân viên
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
