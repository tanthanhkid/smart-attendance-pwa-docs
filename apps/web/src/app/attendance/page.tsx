'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  apiClient,
  getGeolocationData,
  generateNonce,
  getDeviceId,
  GeolocationError,
} from '@/lib';
import { formatTime, formatDuration } from '@/lib';
import { Clock, LogOut, History, AlertTriangle, CheckCircle, XCircle, WifiOff } from 'lucide-react';
import type { TodaySessionResponse } from '@/lib/api-client';

function getQueuedAttendanceAction(endpoint: string): 'check-in' | 'check-out' | null {
  if (endpoint === '/attendance/check-in') {
    return 'check-in';
  }
  if (endpoint === '/attendance/check-out') {
    return 'check-out';
  }

  return null;
}

export default function AttendancePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [todaySession, setTodaySession] = useState<TodaySessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<'check-in' | 'check-out' | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isOnline, setIsOnline] = useState(true);

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

  const fetchTodaySession = useCallback(async () => {
    setError('');
    try {
      const data = await apiClient.getMeToday();
      setTodaySession(data ? { ...data, flags: data.flags ?? [] } : null);
      if (
        (pendingAction === 'check-in' && data?.checkInAt) ||
        (pendingAction === 'check-out' && data?.checkOutAt)
      ) {
        setPendingAction(null);
      }
    } catch (err) {
      const message = err instanceof Error && err.message === 'NETWORK_OFFLINE'
        ? 'Bạn đang offline. Không thể tải dữ liệu chấm công hôm nay.'
        : 'Không thể tải dữ liệu chấm công hôm nay. Vui lòng thử lại.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [pendingAction]);

  useEffect(() => {
    if (!user || user.role !== 'EMPLOYEE') {
      router.push('/auth/login');
      return;
    }
    void fetchTodaySession();
  }, [user, router, fetchTodaySession]);

  useEffect(() => {
    if (!isOnline || !pendingAction) {
      return;
    }

    const syncCheckTimer = window.setTimeout(() => {
      void fetchTodaySession();
    }, 1500);

    return () => {
      window.clearTimeout(syncCheckTimer);
    };
  }, [isOnline, pendingAction, fetchTodaySession]);

  useEffect(() => {
    const unsubscribe = apiClient.subscribeToQueueEvents((event) => {
      const action = getQueuedAttendanceAction(event.endpoint);
      if (!action) {
        return;
      }

      if (event.status === 'succeeded') {
        setError('');
        setMessage(
          action === 'check-in'
            ? 'Yêu cầu check-in đã được đồng bộ thành công.'
            : 'Yêu cầu check-out đã được đồng bộ thành công.',
        );
        void fetchTodaySession();
        return;
      }

      if (event.status === 'failed') {
        setPendingAction((current) => (current === action ? null : current));
        setError(
          action === 'check-in'
            ? 'Không thể đồng bộ yêu cầu check-in đã xếp hàng. Vui lòng thử lại.'
            : 'Không thể đồng bộ yêu cầu check-out đã xếp hàng. Vui lòng thử lại.',
        );
      }
    });

    return unsubscribe;
  }, [fetchTodaySession]);

  const handleCheckIn = async () => {
    setError('');
    setMessage('');
    setActionLoading(true);

    try {
      const geo = await getGeolocationData();
      
      const response = await apiClient.checkInWithOfflineSupport({
        latitude: geo.latitude,
        longitude: geo.longitude,
        accuracy: geo.accuracy,
        speed: geo.speed ?? undefined,
        heading: geo.heading ?? undefined,
        timestamp: new Date().toISOString(),
        nonce: generateNonce(),
        deviceId: getDeviceId(),
      });

      if (response.queued) {
        setMessage('Check-in đã được lưu vào hàng đợi. Sẽ gửi khi có mạng.');
        setPendingAction('check-in');
        return;
      }

      const data = response.result;
      if (data.status === 'SUCCESS') {
        setMessage(
          data.recorded === false
            ? 'Check-in đã gửi thành công nhưng chưa được ghi nhận. Quản lý sẽ thấy trạng thái này trong báo cáo.'
            : data.flagged
              ? `Check-in thành công với cờ ${data.riskLevel}`
              : 'Check-in thành công!',
        );
        await fetchTodaySession();
      } else {
        setError(data.message || 'Check-in thất bại');
      }
    } catch (err: unknown) {
      if (err instanceof GeolocationError) {
        if (err.isPermissionDenied) {
          setError('Quyền truy cập vị trí bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.');
        } else if (err.isPositionUnavailable) {
          setError('Không thể lấy vị trí. Vui lòng bật GPS.');
        } else {
          setError(err.message || 'Không thể lấy vị trí.');
        }
      } else if (err instanceof Error) {
        if (err.message === 'NETWORK_OFFLINE') {
          setError('Bạn đang offline. Yêu cầu sẽ được gửi khi có mạng.');
        } else {
          setError(err.message || 'Check-in thất bại');
        }
      } else {
        setError('Check-in thất bại');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setError('');
    setMessage('');
    setActionLoading(true);

    try {
      const geo = await getGeolocationData();
      
      const response = await apiClient.checkOutWithOfflineSupport({
        latitude: geo.latitude,
        longitude: geo.longitude,
        accuracy: geo.accuracy,
        speed: geo.speed ?? undefined,
        heading: geo.heading ?? undefined,
        timestamp: new Date().toISOString(),
        nonce: generateNonce(),
        deviceId: getDeviceId(),
      });

      if (response.queued) {
        setMessage('Check-out đã được lưu vào hàng đợi. Sẽ gửi khi có mạng.');
        setPendingAction('check-out');
        return;
      }

      const data = response.result;
      if (data.status === 'SUCCESS') {
        setMessage(`Check-out thành công! Tổng: ${formatDuration(data.totalMinutes ?? 0)}`);
        await fetchTodaySession();
      } else {
        setError(data.message || 'Check-out thất bại');
      }
    } catch (err: unknown) {
      if (err instanceof GeolocationError) {
        if (err.isPermissionDenied) {
          setError('Quyền truy cập vị trí bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.');
        } else if (err.isPositionUnavailable) {
          setError('Không thể lấy vị trí. Vui lòng bật GPS.');
        } else {
          setError(err.message || 'Không thể lấy vị trí.');
        }
      } else if (err instanceof Error) {
        if (err.message === 'NETWORK_OFFLINE') {
          setError('Bạn đang offline. Yêu cầu sẽ được gửi khi có mạng.');
        } else {
          setError(err.message || 'Check-out thất bại');
        }
      } else {
        setError('Check-out thất bại');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isCheckedIn = !!todaySession?.checkInAt;
  const isCheckedOut = !!todaySession?.checkOutAt;
  const isRecorded = todaySession?.status !== null && todaySession?.status !== undefined;
  const pendingLabel = pendingAction === 'check-in'
    ? 'Đang chờ đồng bộ check-in'
    : 'Đang chờ đồng bộ check-out';
  const actionDisabled = actionLoading || pendingAction !== null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-yellow-500 text-yellow-900 p-2 text-center text-sm flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          Bạn đang offline. Yêu cầu check-in/out sẽ được gửi khi có mạng.
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Chấm công</h1>
            <p className="text-sm text-muted-foreground">
              {user?.employee?.fullName || user?.email}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Hôm nay</CardTitle>
              <Badge variant={pendingAction ? 'secondary' : isCheckedIn ? 'success' : 'secondary'}>
                {pendingAction
                  ? pendingLabel
                  : isCheckedOut
                    ? 'Đã check-out'
                    : isCheckedIn && !isRecorded
                      ? 'Đã gửi, chờ ghi nhận'
                    : isCheckedIn
                      ? 'Đã check-in'
                      : 'Chưa check-in'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingAction && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Yêu cầu của bạn đã được xếp hàng và sẽ đồng bộ khi có mạng.
              </div>
            )}

            {/* Time Display */}
            <div className="text-center py-6">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-3xl font-bold">
                {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-muted-foreground">
                {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>

            {/* Session Info */}
            {todaySession && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-muted-foreground">Check-in</p>
                  <p className="font-medium">
                    {todaySession.checkInAt ? formatTime(todaySession.checkInAt) : '-'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-muted-foreground">Check-out</p>
                  <p className="font-medium">
                    {todaySession.checkOutAt ? formatTime(todaySession.checkOutAt) : '-'}
                  </p>
                </div>
                {todaySession.totalMinutes && (
                  <div className="col-span-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-muted-foreground">Tổng thời gian</p>
                    <p className="font-medium">{formatDuration(todaySession.totalMinutes)}</p>
                  </div>
                )}
                {isCheckedIn && (
                  <div className="col-span-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-muted-foreground">Trạng thái ghi nhận</p>
                    <p className="font-medium">
                      {isRecorded ? 'Đã ghi nhận vào công' : 'Chưa ghi nhận, cần quản lý xem lại'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Flags */}
            {((todaySession?.flags?.length ?? 0) > 0) && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Cảnh báo</span>
                </div>
                {todaySession?.flags?.map((flag, idx: number) => (
                  <p key={idx} className="text-sm text-yellow-700 mt-1">{flag.message}</p>
                ))}
              </div>
            )}

            {/* Messages */}
            {message && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {message}
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          {!isCheckedIn ? (
            <Button
              size="lg"
              onClick={handleCheckIn}
              disabled={actionDisabled}
              className="h-20 text-lg"
            >
              {actionLoading ? 'Đang xử lý...' : pendingAction ? 'Đã xếp hàng' : 'Check-in'}
            </Button>
          ) : !isCheckedOut ? (
            <Button
              size="lg"
              onClick={handleCheckOut}
              disabled={actionDisabled}
              className="h-20 text-lg"
              variant="secondary"
            >
              {actionLoading ? 'Đang xử lý...' : pendingAction ? 'Đã xếp hàng' : 'Check-out'}
            </Button>
          ) : (
            <Button size="lg" disabled className="h-20 text-lg" variant="outline">
              Đã hoàn thành
            </Button>
          )}
        </div>

        {/* Navigation */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push('/history')}
        >
          <History className="h-4 w-4 mr-2" />
          Xem lịch sử chấm công
        </Button>
      </main>
    </div>
  );
}
