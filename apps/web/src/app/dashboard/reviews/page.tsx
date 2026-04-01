'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, useAuthStore } from '@/lib';
import type { ApprovalRequestItem, AttendanceReportItem, BranchListItem } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, ClipboardList, RefreshCw, ShieldAlert } from 'lucide-react';

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

function formatDateTime(date: string | null) {
  if (!date) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export default function DashboardReviewsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewItems, setReviewItems] = useState<AttendanceReportItem[]>([]);
  const [approvalItems, setApprovalItems] = useState<ApprovalRequestItem[]>([]);
  const [branches, setBranches] = useState<BranchListItem[]>([]);
  const [recordingSessionId, setRecordingSessionId] = useState<string | null>(null);
  const [filters, setFilters] = useState(() => {
    const to = todayIso();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 14);
    const from = fromDate.toISOString().split('T')[0];

    return {
      from,
      to,
      branchId: '',
    };
  });

  const isAdmin = user?.role === 'ADMIN';
  const activeBranchId = user?.role === 'MANAGER' ? user.employee?.branchId ?? '' : filters.branchId;

  const loadData = async () => {
    if (!user || user.role === 'EMPLOYEE') {
      router.push('/attendance');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [reviewResponse, approvalsResponse, branchResponse] = await Promise.all([
        apiClient.getAttendanceReport({
          from: filters.from,
          to: filters.to,
          branchId: activeBranchId || undefined,
          needsReview: true,
          page: 1,
          pageSize: 25,
        }),
        apiClient.getApprovals({
          status: 'PENDING',
          branchId: activeBranchId || undefined,
          limit: 10,
        }),
        isAdmin ? apiClient.getBranches({ limit: 50 }) : Promise.resolve({ items: [] }),
      ]);

      setReviewItems(reviewResponse.items);
      setApprovalItems(approvalsResponse.items);
      setBranches(branchResponse.items);
    } catch (loadError) {
      setError(
        loadError instanceof Error && loadError.message === 'NETWORK_OFFLINE'
          ? 'Bạn đang offline. Không thể tải review queue.'
          : 'Không thể tải review queue. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filters.from, filters.to, activeBranchId]);

  const stats = useMemo(() => {
    const unrecorded = reviewItems.filter((item) => !item.recorded).length;
    const flagged = reviewItems.filter((item) => item.isFlagged).length;

    return {
      total: reviewItems.length,
      unrecorded,
      flagged,
      approvals: approvalItems.length,
    };
  }, [approvalItems.length, reviewItems]);

  const handleRecord = async (sessionId: string) => {
    setRecordingSessionId(sessionId);
    setError(null);

    try {
      await apiClient.recordAttendanceReview(sessionId, 'Recorded from manager review queue');
      await loadData();
    } catch (recordError) {
      setError(
        recordError instanceof Error
          ? recordError.message
          : 'Không thể ghi nhận attendance session này.',
      );
    } finally {
      setRecordingSessionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <ReviewStatCard title="Cases cần review" value={stats.total} icon={<ClipboardList className="h-5 w-5" />} tone="slate" />
        <ReviewStatCard title="Chưa ghi nhận" value={stats.unrecorded} icon={<ShieldAlert className="h-5 w-5" />} tone="amber" />
        <ReviewStatCard title="Bị cờ" value={stats.flagged} icon={<AlertTriangle className="h-5 w-5" />} tone="rose" />
        <ReviewStatCard title="Yêu cầu chỉnh công" value={stats.approvals} icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Review queue</CardTitle>
            <CardDescription>Danh sách session attendance cần quản lý xem lại.</CardDescription>
          </div>
          <Button variant="outline" onClick={() => void loadData()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Tải lại
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Từ ngày</span>
              <input
                type="date"
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
                value={filters.from}
                onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Đến ngày</span>
              <input
                type="date"
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
                value={filters.to}
                onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
              />
            </label>
            {isAdmin && (
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Chi nhánh</span>
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2"
                  value={filters.branchId}
                  onChange={(event) => setFilters((current) => ({ ...current, branchId: event.target.value }))}
                >
                  <option value="">Tất cả chi nhánh</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.code} - {branch.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Đang tải review queue...</div>
          ) : reviewItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-muted-foreground">
              Không có attendance case nào cần review trong phạm vi hiện tại.
            </div>
          ) : (
            <div className="space-y-4">
              {reviewItems.map((item) => (
                <Card key={item.id} className="border-slate-200 shadow-sm">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-slate-900">{item.employee.fullName}</p>
                          <Badge variant={item.recorded ? 'outline' : 'secondary'}>
                            {item.recorded ? 'Đã ghi nhận' : 'Chưa ghi nhận'}
                          </Badge>
                          {item.isFlagged && <Badge variant="warning">Flagged</Badge>}
                        </div>
                        <p className="text-sm text-slate-500">
                          {item.employee.employeeCode} • {item.branch.code} • {formatDate(item.workDate)}
                        </p>
                      </div>
                      <div className="text-sm text-slate-500">
                        Risk score: <span className="font-semibold text-slate-900">{item.riskScore}</span>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                      <InfoTile label="Check-in" value={formatDateTime(item.checkInAt)} />
                      <InfoTile label="Check-out" value={formatDateTime(item.checkOutAt)} />
                      <InfoTile label="Accuracy" value={item.checkInEvent?.accuracyMeters ? `${Math.round(item.checkInEvent.accuracyMeters)}m` : '-'} />
                      <InfoTile label="Khoảng cách" value={item.checkInEvent?.distanceMeters ? `${Math.round(item.checkInEvent.distanceMeters)}m` : '-'} />
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-700">Review reasons</p>
                      <div className="flex flex-wrap gap-2">
                        {(item.review?.reasons ?? item.flags?.map((flag) => flag.message) ?? []).map((reason) => (
                          <span
                            key={reason}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {!item.recorded && (
                        <Button
                          onClick={() => void handleRecord(item.id)}
                          disabled={recordingSessionId === item.id}
                        >
                          {recordingSessionId === item.id ? 'Đang ghi nhận...' : 'Ghi nhận attendance'}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => router.push('/dashboard/reports')}
                      >
                        Mở trong báo cáo
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Correction requests đang chờ</CardTitle>
          <CardDescription>Yêu cầu chỉnh công từ nhân viên vẫn đi qua approval flow hiện tại.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {approvalItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có correction request nào đang chờ.</p>
          ) : (
            approvalItems.map((approval) => (
              <div
                key={approval.id}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {approval.employee.fullName} • {approval.branch.code}
                    </p>
                    <p className="text-sm text-slate-500">{approval.reason}</p>
                  </div>
                  <Badge variant="outline">{approval.status}</Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewStatCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  tone: 'slate' | 'amber' | 'rose' | 'emerald';
}) {
  const color = {
    slate: 'bg-slate-100 text-slate-900',
    amber: 'bg-amber-100 text-amber-900',
    rose: 'bg-rose-100 text-rose-900',
    emerald: 'bg-emerald-100 text-emerald-900',
  }[tone];

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${color}`}>{icon}</div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-1 text-3xl font-semibold text-slate-950">{value}</p>
      </CardContent>
    </Card>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
