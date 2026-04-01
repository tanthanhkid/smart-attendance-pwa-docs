'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient, useAuthStore } from '@/lib';
import type { BranchSummaryResponse, SystemSummaryResponse } from '@/lib/api-client';
import { Users, Building, AlertTriangle, CheckCircle, LogOut, RefreshCw, WifiOff, Clock } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [summary, setSummary] = useState<SystemSummaryResponse | BranchSummaryResponse | null>(null);
  const [scope, setScope] = useState<'system' | 'branch' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const loadDashboard = useCallback(async (currentUser: NonNullable<typeof user>) => {
    setLoading(true);
    setError(null);
    setSummary(null);
    setScope(null);

    try {
      if (currentUser.role === 'ADMIN') {
        const data = await apiClient.getSystemSummary();
        setSummary(data);
        setScope('system');
      } else {
        const branchId = currentUser.employee?.branchId;
        if (!branchId) {
          throw new Error('Không tìm thấy chi nhánh được gán cho tài khoản quản lý này.');
        }

        const data = await apiClient.getBranchSummary(branchId);
        setSummary(data);
        setScope('branch');
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'NETWORK_OFFLINE') {
        setError('Bạn đang offline. Vui lòng kiểm tra kết nối mạng.');
      } else {
        setError('Không thể tải dữ liệu dashboard. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRetry = () => {
    if (user) {
      void loadDashboard(user);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (user.role === 'EMPLOYEE') {
      router.push('/attendance');
      return;
    }

    void loadDashboard(user);
  }, [user, router, loadDashboard]);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const branchSummary = scope === 'branch' ? (summary as BranchSummaryResponse | null) : null;
  const systemSummary = scope === 'system' ? (summary as SystemSummaryResponse | null) : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-yellow-500 text-yellow-900 p-2 text-center text-sm flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          Bạn đang offline
        </div>
      )}

      {/* Error Banner with Retry */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-red-700 text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={handleRetry} className="ml-4">
              <RefreshCw className="h-4 w-4 mr-1" />
              Thử lại
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {user?.employee?.fullName || user?.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{user?.role}</Badge>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Summary Cards */}
        {scope === 'system' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{systemSummary?.totalEmployees || 0}</p>
                    <p className="text-sm text-muted-foreground">Nhân viên</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{systemSummary?.totalSessions || 0}</p>
                    <p className="text-sm text-muted-foreground">Lượt chấm công</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{systemSummary?.flaggedSessions || 0}</p>
                    <p className="text-sm text-muted-foreground">Bị cờ ({systemSummary?.flaggedRate || 0}%)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Building className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{systemSummary?.branchCount || 0}</p>
                    <p className="text-sm text-muted-foreground">Chi nhánh</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Building className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{branchSummary?.branch?.name || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">Chi nhánh phụ trách</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{branchSummary?.totalEmployees || 0}</p>
                    <p className="text-sm text-muted-foreground">Nhân viên trong chi nhánh</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{branchSummary?.checkedIn || 0}</p>
                    <p className="text-sm text-muted-foreground">Đã được ghi nhận hôm nay</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{branchSummary?.unrecordedCount || 0}</p>
                    <p className="text-sm text-muted-foreground">
                      Chưa ghi nhận, trễ: {branchSummary?.lateCount || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{scope === 'system' ? 'Tổng quan hệ thống' : 'Tổng quan chi nhánh'}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-muted-foreground">Phạm vi dữ liệu</p>
              <p className="font-medium">{scope === 'system' ? 'Toàn hệ thống' : branchSummary?.branch?.code || 'Chi nhánh của bạn'}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-muted-foreground">Trạng thái</p>
              <p className="font-medium">{isOnline ? 'Đang trực tuyến' : 'Đang offline'}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-muted-foreground">
                {scope === 'system' ? 'Tỷ lệ bị cờ' : 'Số lượt bị cờ'}
              </p>
              <p className="font-medium">
                {scope === 'system'
                  ? `${systemSummary?.flaggedRate || 0}%`
                  : `${branchSummary?.flaggedCount || 0} lượt`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Stats */}
        <Card>
          <CardHeader>
            <CardTitle>{scope === 'system' ? 'Thống kê tháng này' : 'Thống kê chi nhánh hôm nay'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-muted-foreground text-sm">
                  {scope === 'system' ? 'Đã được ghi nhận' : 'Nhân viên được ghi nhận'}
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {scope === 'system'
                    ? `${systemSummary?.recordedSessions || 0}`
                    : `${branchSummary?.checkedIn || 0}`}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-muted-foreground text-sm">
                  {scope === 'system' ? 'Chưa ghi nhận' : 'Nhân viên chưa ghi nhận'}
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {scope === 'system'
                    ? `${systemSummary?.unrecordedSessions || 0}`
                    : `${branchSummary?.unrecordedCount || 0}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
