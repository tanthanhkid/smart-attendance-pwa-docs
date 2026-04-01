'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient, useAuthStore } from '@/lib';
import type { AttendanceReportItem, BranchListItem } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Filter, RefreshCw } from 'lucide-react';

function todayIso() {
  return new Date().toISOString().split('T')[0] ?? '';
}

function defaultFromIso() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0] ?? '';
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('vi-VN', {
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

export default function DashboardReportsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [items, setItems] = useState<AttendanceReportItem[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchListItem[]>([]);
  const [filters, setFilters] = useState({
    from: defaultFromIso(),
    to: todayIso(),
    branchId: '',
    status: '',
    needsReview: 'all',
  });

  const isAdmin = user?.role === 'ADMIN';
  const activeBranchId = user?.role === 'MANAGER' ? user.employee?.branchId ?? '' : filters.branchId;
  const reviewQuery =
    filters.needsReview === 'all'
      ? {}
      : filters.needsReview === 'needs-review'
        ? { needsReview: true }
        : { recorded: true, flagged: false };

  const loadReports = async () => {
    if (!user || user.role === 'EMPLOYEE') {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [reportResponse, branchResponse] = await Promise.all([
        apiClient.getAttendanceReport({
          from: filters.from,
          to: filters.to,
          branchId: activeBranchId || undefined,
          status: filters.status || undefined,
          ...reviewQuery,
          page: 1,
          pageSize: 50,
        }),
        isAdmin ? apiClient.getBranches({ limit: 50 }) : Promise.resolve({ items: [] }),
      ]);

      setItems(reportResponse.items);
      setTotal(reportResponse.total);
      setBranches(branchResponse.items);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Không thể tải attendance reports.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filters.from, filters.to, activeBranchId, filters.status, filters.needsReview]);

  const summary = useMemo(() => {
    const recorded = items.filter((item) => item.recorded).length;
    const flagged = items.filter((item) => item.isFlagged).length;
    const unrecorded = items.filter((item) => !item.recorded).length;

    return { recorded, flagged, unrecorded };
  }, [items]);

  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      const blob = await apiClient.downloadAttendanceReport({
        from: filters.from,
        to: filters.to,
        branchId: activeBranchId || undefined,
        departmentId: undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `attendance-report-${filters.from}-${filters.to}.csv`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(
        exportError instanceof Error ? exportError.message : 'Không thể export report.',
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard title="Tổng số dòng" value={total} />
        <SummaryCard title="Đã ghi nhận" value={summary.recorded} />
        <SummaryCard title="Chưa ghi nhận" value={summary.unrecorded} />
        <SummaryCard title="Flagged" value={summary.flagged} />
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Attendance reports</CardTitle>
            <CardDescription>Lọc, rà soát và export dữ liệu attendance theo trạng thái ghi nhận.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void loadReports()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Tải lại
            </Button>
            <Button onClick={() => void handleExport()} disabled={exporting} className="gap-2">
              <Download className="h-4 w-4" />
              {exporting ? 'Đang export...' : 'Export CSV'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-5">
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
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Attendance status</span>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="">Tất cả</option>
                <option value="ON_TIME">ON_TIME</option>
                <option value="LATE">LATE</option>
                <option value="OVERTIME">OVERTIME</option>
                <option value="EARLY_CHECKOUT">EARLY_CHECKOUT</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Review filter</span>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
                value={filters.needsReview}
                onChange={(event) => setFilters((current) => ({ ...current, needsReview: event.target.value }))}
              >
                <option value="all">Tất cả</option>
                <option value="needs-review">Chỉ case cần review</option>
                <option value="recorded-only">Chỉ case đã ghi nhận</option>
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div className="flex items-center gap-2 font-medium text-slate-700">
              <Filter className="h-4 w-4" />
              Review status đang áp dụng
            </div>
            <p className="mt-1">
              {filters.needsReview === 'needs-review'
                ? 'Đang chỉ hiển thị các session flagged hoặc chưa ghi nhận.'
                : filters.needsReview === 'recorded-only'
                  ? 'Đang hiển thị các session đã ghi nhận.'
                  : 'Đang hiển thị tất cả session trong phạm vi đã chọn.'}
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Đang tải report...</div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-muted-foreground">
              Không có dữ liệu attendance trong phạm vi hiện tại.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {['Ngày', 'Nhân viên', 'Chi nhánh', 'Check-in', 'Check-out', 'Trạng thái', 'Review'].map((header) => (
                      <th key={header} className="px-4 py-3 text-left font-semibold text-slate-700">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-slate-700">{formatDate(item.workDate)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{item.employee.fullName}</div>
                        <div className="text-xs text-slate-500">{item.employee.employeeCode}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.branch.code}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDateTime(item.checkInAt)}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDateTime(item.checkOutAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={item.recorded ? 'outline' : 'secondary'}>
                            {item.recorded ? item.status ?? 'RECORDED' : 'UNRECORDED'}
                          </Badge>
                          {item.isFlagged && <Badge variant="warning">FLAGGED</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-900">Risk {item.riskScore}</p>
                          <p className="text-xs text-slate-500">
                            {(item.review?.reasons ?? item.flags?.map((flag) => flag.message) ?? []).slice(0, 2).join(' • ') || '-'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-1 text-3xl font-semibold text-slate-950">{value}</p>
      </CardContent>
    </Card>
  );
}
