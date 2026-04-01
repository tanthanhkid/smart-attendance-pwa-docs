'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient, useAuthStore, formatTime, formatDate, formatDuration } from '@/lib';
import { ArrowLeft, CheckCircle, XCircle, Clock, RefreshCw, WifiOff } from 'lucide-react';
import type { HistoryResponse } from '@/lib/api-client';

type AttendanceSession = HistoryResponse['items'][number];

export default function HistoryPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (user.role !== 'EMPLOYEE') {
      router.push('/dashboard');
      return;
    }

    fetchHistory();
  }, [user, router]);

  const fetchHistory = async (nextCursor?: string) => {
    if (nextCursor) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await apiClient.getHistory({
        cursor: nextCursor,
        limit: 20,
      });

      if (nextCursor) {
        setSessions(prev => [...prev, ...response.items]);
      } else {
        setSessions(response.items);
      }
      setHasMore(response.hasMore);
      setCursor(response.nextCursor);
    } catch (err) {
      if (err instanceof Error && err.message === 'NETWORK_OFFLINE') {
        setError('Bạn đang offline. Vui lòng kiểm tra kết nối mạng.');
      } else {
        setError('Không thể tải lịch sử. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (hasMore && cursor) {
      fetchHistory(cursor);
    }
  };

  const getStatusBadge = (status: string | null, isFlagged: boolean) => {
    if (status === null) {
      return <Badge variant="secondary">Chưa ghi nhận</Badge>;
    }
    if (isFlagged) {
      return <Badge variant="warning">Cờ</Badge>;
    }
    switch (status) {
      case 'ON_TIME':
        return <Badge variant="success">Đúng giờ</Badge>;
      case 'LATE':
        return <Badge variant="destructive">Trễ</Badge>;
      case 'OVERTIME':
        return <Badge>Tăng ca</Badge>;
      default:
        return <Badge variant="secondary">-</Badge>;
    }
  };

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

      {/* Header */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/attendance')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Lịch sử chấm công</h1>
        </div>
      </header>

      {/* Error State */}
      {error && !loading && sessions.length === 0 && (
        <main className="max-w-lg mx-auto p-4">
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-red-500 mb-4">
                <RefreshCw className="h-12 w-12 mx-auto opacity-50" />
              </div>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => fetchHistory()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Thử lại
              </Button>
            </CardContent>
          </Card>
        </main>
      )}

      {/* Content */}
      <main className="max-w-lg mx-auto p-4 space-y-4">
        {sessions.length === 0 && !error ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có lịch sử chấm công</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {sessions.map((session) => (
              <Card key={session.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {formatDate(session.workDate)}
                    </CardTitle>
                    {getStatusBadge(session.status, session.isFlagged)}
                  </div>
                  <p className="text-sm text-muted-foreground">{session.branch.name}</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Check-in</p>
                      <p className="font-medium flex items-center justify-center gap-1">
                        {session.checkInAt ? (
                          <>
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            {formatTime(session.checkInAt)}
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 text-gray-400" />
                            -
                          </>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Check-out</p>
                      <p className="font-medium flex items-center justify-center gap-1">
                        {session.checkOutAt ? (
                          <>
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            {formatTime(session.checkOutAt)}
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 text-gray-400" />
                            -
                          </>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Tổng</p>
                      <p className="font-medium">
                        {session.totalMinutes ? formatDuration(session.totalMinutes) : '-'}
                      </p>
                    </div>
                  </div>

                  {session.flags.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      {session.flags.map((flag, idx) => (
                        <p key={idx} className="text-xs text-yellow-600">
                          ⚠️ {flag.message}
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {hasMore && (
              <Button
                variant="outline"
                className="w-full"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Đang tải...' : 'Tải thêm'}
              </Button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
