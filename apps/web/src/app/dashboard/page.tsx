'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient, useAuthStore } from '@/lib';
import type { BranchSummaryResponse, DashboardTrendPoint, SystemSummaryResponse } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, ArrowRight, BarChart3, CalendarDays, CheckCircle2, Clock3, FileText, ShieldAlert } from 'lucide-react';

type DashboardScope = 'system' | 'branch';

type DashboardState = {
  summary: SystemSummaryResponse | BranchSummaryResponse | null;
  trends: DashboardTrendPoint[];
  scope: DashboardScope | null;
  loading: boolean;
  error: string | null;
};

function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(date));
}

function summarizeTrendByDate(trends: DashboardTrendPoint[]) {
  const dateMap = new Map<string, number>();
  for (const point of trends) {
    dateMap.set(point.date, (dateMap.get(point.date) ?? 0) + point.count);
  }

  return Array.from(dateMap.entries()).map(([date, count]) => ({ date, count }));
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [state, setState] = useState<DashboardState>({
    summary: null,
    trends: [],
    scope: null,
    loading: true,
    error: null,
  });
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

    if (user.role === 'EMPLOYEE') {
      router.push('/attendance');
      return;
    }

    const loadDashboard = async () => {
      setState((current) => ({ ...current, loading: true, error: null }));

      try {
        if (user.role === 'ADMIN') {
          const [summary, trends] = await Promise.all([
            apiClient.getSystemSummary(),
            apiClient.getTrends({ days: 7 }),
          ]);
          setState({ summary, trends, scope: 'system', loading: false, error: null });
          return;
        }

        const branchId = user.employee?.branchId;
        if (!branchId) {
          throw new Error('Không tìm thấy branch cho tài khoản hiện tại.');
        }

        const [summary, trends] = await Promise.all([
          apiClient.getBranchSummary(branchId),
          apiClient.getTrends({ branchId, days: 7 }),
        ]);

        setState({ summary, trends, scope: 'branch', loading: false, error: null });
      } catch (error) {
        setState((current) => ({
          ...current,
          loading: false,
          error:
            error instanceof Error && error.message === 'NETWORK_OFFLINE'
              ? 'Bạn đang offline. Dashboard cần kết nối để tải dữ liệu mới.'
              : 'Không thể tải dashboard. Vui lòng thử lại.',
        }));
      }
    };

    void loadDashboard();
  }, [user, router]);

  const summary = state.summary;
  const trendRows = summarizeTrendByDate(state.trends);
  const topTrendDay = trendRows.reduce<{ date: string; count: number } | null>((best, current) => {
    if (!best || current.count > best.count) return current;
    return best;
  }, null);

  const renderSummaryCards = () => {
    if (!summary) return null;

    if (state.scope === 'system') {
      const systemSummary = summary as SystemSummaryResponse;
      return (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Đã ghi nhận"
            value={systemSummary.recordedSessions}
            note={`${systemSummary.totalSessions} lượt chấm công`}
            icon={<CheckCircle2 className="h-5 w-5" />}
            tone="emerald"
          />
          <StatCard
            title="Chưa ghi nhận"
            value={systemSummary.unrecordedSessions}
            note="Cần review thêm"
            icon={<ShieldAlert className="h-5 w-5" />}
            tone="amber"
          />
          <StatCard
            title="Bị cờ"
            value={systemSummary.flaggedSessions}
            note={`${systemSummary.flaggedRate}% flagged rate`}
            icon={<AlertTriangle className="h-5 w-5" />}
            tone="rose"
          />
          <StatCard
            title="Chi nhánh"
            value={systemSummary.branchCount}
            note="Phạm vi toàn hệ thống"
            icon={<BarChart3 className="h-5 w-5" />}
            tone="sky"
          />
        </div>
      );
    }

    const branchSummary = summary as BranchSummaryResponse;
    return (
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Đã ghi nhận"
          value={branchSummary.checkedIn}
          note={`${branchSummary.attendanceRate}% attendance rate`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Chưa ghi nhận"
          value={branchSummary.unrecordedCount}
          note={`${branchSummary.notCheckedIn} người chưa check-in`}
          icon={<ShieldAlert className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Bị cờ"
          value={branchSummary.flaggedCount}
          note={`${branchSummary.lateCount} lượt trễ`}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="rose"
        />
        <StatCard
          title="Chi nhánh"
          value={branchSummary.branch?.code || 'N/A'}
          note={branchSummary.branch?.name || 'Branch scope'}
          icon={<BarChart3 className="h-5 w-5" />}
          tone="sky"
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {state.loading ? (
        <div className="grid place-items-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        </div>
      ) : (
        <>
          {state.error && (
            <Card className="border-rose-200 bg-rose-50/80">
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-semibold text-rose-900">Không tải được dashboard</p>
                  <p className="text-sm text-rose-700">{state.error}</p>
                </div>
                <Button variant="outline" onClick={() => router.refresh()} className="shrink-0">
                  Thử lại
                </Button>
              </CardContent>
            </Card>
          )}

          <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <Card className="overflow-hidden border-slate-200 bg-slate-950 text-white shadow-xl">
              <CardContent className="relative flex h-full flex-col gap-6 p-6 sm:p-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.20),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(34,197,94,0.12),_transparent_28%)]" />
                <div className="relative flex flex-wrap items-center gap-3">
                  <Badge className="border-sky-400/30 bg-sky-400/15 text-sky-100">
                    {state.scope === 'system' ? 'System view' : 'Branch view'}
                  </Badge>
                  <Badge className="border-white/20 bg-white/10 text-white">
                    {isOnline ? 'Online' : 'Offline'}
                  </Badge>
                  {topTrendDay && (
                    <Badge className="border-emerald-400/30 bg-emerald-400/15 text-emerald-100">
                      Peak: {formatDateLabel(topTrendDay.date)}
                    </Badge>
                  )}
                </div>

                <div className="relative space-y-3">
                  <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                    Dashboard quản lý dành cho theo dõi review, báo cáo và rủi ro attendance.
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                    Từ đây quản lý có thể thấy session nào đã ghi nhận, session nào cần xem lại và đi
                    thẳng sang review queue hoặc attendance report để xử lý nhanh.
                  </p>
                </div>

                <div className="relative flex flex-wrap gap-3">
                  <Link
                    href="/dashboard/reviews"
                    className="inline-flex items-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-slate-950 shadow-sm transition hover:bg-slate-100"
                  >
                    Xem review queue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <Link
                    href="/dashboard/reports"
                    className="inline-flex items-center rounded-lg border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
                  >
                    Attendance reports
                    <FileText className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardDescription>Signals nổi bật</CardDescription>
                <CardTitle className="text-xl">Nhịp vận hành 7 ngày gần nhất</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {trendRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Chưa có trend data.</p>
                  ) : (
                    trendRows.slice(-7).map((row) => {
                      const max = Math.max(...trendRows.map((item) => item.count), 1);
                      const width = Math.max(8, Math.round((row.count / max) * 100));

                      return (
                        <div key={row.date} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-800">{formatDateLabel(row.date)}</span>
                            <span className="text-slate-500">{row.count}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500" style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Điểm cần xử lý ngay</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {state.scope === 'system'
                      ? `${(summary as SystemSummaryResponse | null)?.unrecordedSessions ?? 0} unrecorded`
                      : `${(summary as BranchSummaryResponse | null)?.unrecordedCount ?? 0} unrecorded`}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Chuyển sang review queue để xem chi tiết từng case.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {renderSummaryCards()}

          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardDescription>Tác vụ nhanh</CardDescription>
                  <CardTitle className="text-xl">Đi thẳng đến màn hình xử lý</CardTitle>
                </div>
                <Badge variant="outline">Manager ready</Badge>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <QuickAction
                  href="/dashboard/reviews"
                  title="Review queue"
                  description="Tập trung các ca chưa ghi nhận và chỉnh công chờ duyệt."
                />
                <QuickAction
                  href="/dashboard/reports"
                  title="Attendance reports"
                  description="Xem bảng attendance với filter, export và drill-down."
                />
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardDescription>Operational notes</CardDescription>
                <CardTitle className="text-xl">Tín hiệu đang theo dõi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <MetricLine label="Attendance status" value={state.scope === 'system' ? 'System-wide' : 'Branch scoped'} />
                <MetricLine label="Review path" value="Unrecorded + approval requests" />
                <MetricLine label="Export mode" value="Sync CSV" />
                <MetricLine label="PWA mode" value={isOnline ? 'Online available' : 'Offline detected'} />
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  note,
  icon,
  tone,
}: {
  title: string;
  value: string | number;
  note: string;
  icon: ReactNode;
  tone: 'emerald' | 'amber' | 'rose' | 'sky';
}) {
  const toneStyles = {
    emerald: 'from-emerald-500/20 to-emerald-100',
    amber: 'from-amber-500/20 to-amber-100',
    rose: 'from-rose-500/20 to-rose-100',
    sky: 'from-sky-500/20 to-sky-100',
  }[tone];

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${toneStyles} text-slate-900`}>
          {icon}
        </div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        <p className="mt-2 text-sm text-slate-500">{note}</p>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-900" />
      </div>
    </Link>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}
