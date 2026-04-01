'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, useAuthStore } from '@/lib';
import type { BranchListItem, EmployeeListItem } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Building2, MapPinned, RefreshCw, Save, Users2 } from 'lucide-react';

type BranchDraft = {
  centerLat: string;
  centerLng: string;
  radiusMeters: string;
};

type EmployeeDraft = {
  branchId: string;
  managerUserId: string;
};

const PAGE_LIMIT = 100;

function toText(value: number | string | null | undefined) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function createBranchDraft(branch: BranchListItem): BranchDraft {
  return {
    centerLat: toText(branch.geofence?.centerLat ?? branch.latitude),
    centerLng: toText(branch.geofence?.centerLng ?? branch.longitude),
    radiusMeters: toText(branch.geofence?.radiusMeters ?? ''),
  };
}

async function fetchAllBranches() {
  const items: BranchListItem[] = [];
  let cursor: string | undefined;

  do {
    const response = await apiClient.getBranches({ cursor, limit: PAGE_LIMIT });
    items.push(...response.items);
    cursor = response.hasMore ? response.nextCursor : undefined;
  } while (cursor);

  return items;
}

async function fetchAllEmployees() {
  const items: EmployeeListItem[] = [];
  let cursor: string | undefined;

  do {
    const response = await apiClient.getEmployees({ cursor, limit: PAGE_LIMIT });
    items.push(...response.items);
    cursor = response.hasMore ? response.nextCursor : undefined;
  } while (cursor);

  return items;
}

export default function DashboardSettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchListItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [branchDrafts, setBranchDrafts] = useState<Record<string, BranchDraft>>({});
  const [employeeDrafts, setEmployeeDrafts] = useState<Record<string, EmployeeDraft>>({});
  const [savingBranchId, setSavingBranchId] = useState<string | null>(null);
  const [savingEmployeeId, setSavingEmployeeId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  const loadData = async (silent = false) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [branchItems, employeeItems] = await Promise.all([fetchAllBranches(), fetchAllEmployees()]);

      setBranches(branchItems);
      setEmployees(employeeItems);
      setBranchDrafts(
        Object.fromEntries(branchItems.map((branch) => [branch.id, createBranchDraft(branch)])),
      );
      setEmployeeDrafts(
        Object.fromEntries(
          employeeItems.map((employee) => [
            employee.id,
            {
              branchId: employee.branchId,
              managerUserId: employee.managerUserId ?? '',
            },
          ]),
        ),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải dữ liệu thiết lập.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const managerOptions = useMemo(
    () =>
      employees
        .filter((employee) => employee.user?.role === 'MANAGER' && employee.user?.id)
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesBranch = branchFilter ? employee.branchId === branchFilter : true;
      const matchesSearch = normalizedSearch
        ? employee.fullName.toLowerCase().includes(normalizedSearch) ||
          employee.employeeCode.toLowerCase().includes(normalizedSearch) ||
          (employee.user?.email ?? '').toLowerCase().includes(normalizedSearch)
        : true;

      return matchesBranch && matchesSearch;
    });
  }, [branchFilter, employees, search]);

  const handleBranchDraftChange = (branchId: string, field: keyof BranchDraft, value: string) => {
    setBranchDrafts((current) => ({
      ...current,
      [branchId]: {
        ...(current[branchId] ?? { centerLat: '', centerLng: '', radiusMeters: '' }),
        [field]: value,
      },
    }));
  };

  const handleEmployeeDraftChange = (employeeId: string, field: keyof EmployeeDraft, value: string) => {
    setEmployeeDrafts((current) => ({
      ...current,
      [employeeId]: {
        ...(current[employeeId] ?? { branchId: '', managerUserId: '' }),
        [field]: value,
      },
    }));
  };

  const saveBranch = async (branchId: string) => {
    const draft = branchDrafts[branchId];
    const centerLat = Number(draft?.centerLat);
    const centerLng = Number(draft?.centerLng);
    const radiusMeters = Number(draft?.radiusMeters);

    if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng) || !Number.isFinite(radiusMeters) || radiusMeters <= 0) {
      setError('Vui lòng nhập tọa độ và bán kính hợp lệ cho chi nhánh.');
      return;
    }

    setSavingBranchId(branchId);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.updateBranch(branchId, {
        latitude: centerLat,
        longitude: centerLng,
      });
      await apiClient.setGeofence(branchId, {
        centerLat,
        centerLng,
        radiusMeters,
      });
      setSuccess('Đã lưu geofence chi nhánh.');
      await loadData(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu geofence.');
    } finally {
      setSavingBranchId(null);
    }
  };

  const saveEmployee = async (employee: EmployeeListItem) => {
    const draft = employeeDrafts[employee.id];
    if (!draft?.branchId) {
      setError('Nhân viên phải thuộc một chi nhánh.');
      return;
    }

    const payload: {
      branchId: string;
      managerUserId: string | null;
      departmentId?: string | null;
    } = {
      branchId: draft.branchId,
      managerUserId: draft.managerUserId || null,
    };

    if (draft.branchId !== employee.branchId) {
      payload.departmentId = null;
    }

    setSavingEmployeeId(employee.id);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.updateEmployee(employee.id, payload);
      setSuccess(`Đã cập nhật phân công cho ${employee.fullName}.`);
      await loadData(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu phân công nhân sự.');
    } finally {
      setSavingEmployeeId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Building2 className="h-5 w-5" />
              Thiết lập hệ thống
            </CardTitle>
            <CardDescription>
              Cấu hình geofence chi nhánh và gán nhân viên cho đúng quản lý để dashboard, review và report scope đúng dữ liệu.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => void loadData(true)} className="gap-2" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Tải lại
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Admin only</Badge>
            <Badge variant="outline">Manager scope by assignment</Badge>
            <Badge variant="outline">Geofence ready</Badge>
          </div>
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MapPinned className="h-5 w-5" />
              Geofence chi nhánh
            </CardTitle>
            <CardDescription>
              Tọa độ này được dùng để so sánh khoảng cách check-in/check-out và tính risk score.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {branches.map((branch) => {
              const draft = branchDrafts[branch.id] ?? createBranchDraft(branch);

              return (
                <div key={branch.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {branch.code} - {branch.name}
                      </p>
                      <p className="text-sm text-slate-500">{branch.address || 'Chưa có địa chỉ'}</p>
                    </div>
                    <Badge variant={branch.geofence ? 'outline' : 'secondary'}>
                      {branch.geofence ? 'Đã có geofence' : 'Chưa cấu hình'}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-500">Latitude</span>
                      <Input
                        value={draft.centerLat}
                        onChange={(event) => handleBranchDraftChange(branch.id, 'centerLat', event.target.value)}
                        placeholder="10.7712000"
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-500">Longitude</span>
                      <Input
                        value={draft.centerLng}
                        onChange={(event) => handleBranchDraftChange(branch.id, 'centerLng', event.target.value)}
                        placeholder="106.6980000"
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-500">Radius (m)</span>
                      <Input
                        value={draft.radiusMeters}
                        onChange={(event) => handleBranchDraftChange(branch.id, 'radiusMeters', event.target.value)}
                        placeholder="100"
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={() => void saveBranch(branch.id)}
                      disabled={savingBranchId === branch.id}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {savingBranchId === branch.id ? 'Đang lưu...' : 'Lưu geofence'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users2 className="h-5 w-5" />
              Gán nhân viên cho quản lý
            </CardTitle>
            <CardDescription>
              Manager chỉ xem dashboard, review queue và report của nhân viên được gán cho mình. Đổi chi nhánh sẽ xóa phòng ban hiện tại để tránh lệch dữ liệu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
              <label className="space-y-2 text-sm">
                <span className="text-slate-500">Tìm nhân viên</span>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tên, mã nhân viên, email"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-500">Lọc theo chi nhánh</span>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={branchFilter}
                  onChange={(event) => setBranchFilter(event.target.value)}
                >
                  <option value="">Tất cả chi nhánh</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.code} - {branch.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="space-y-3">
              {filteredEmployees.map((employee) => {
                const draft = employeeDrafts[employee.id] ?? {
                  branchId: employee.branchId,
                  managerUserId: employee.managerUserId ?? '',
                };
                const availableManagers = managerOptions.filter((manager) => manager.branchId === draft.branchId);
                const isManagerAccount = employee.user?.role === 'MANAGER';

                return (
                  <div key={employee.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{employee.fullName}</p>
                        <p className="text-sm text-slate-500">
                          {employee.employeeCode}
                          {employee.user?.email ? ` • ${employee.user.email}` : ''}
                          {employee.department?.name ? ` • ${employee.department.name}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{employee.user?.role ?? 'NO_ROLE'}</Badge>
                        <Badge variant={employee.isActive ? 'outline' : 'secondary'}>
                          {employee.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                      <label className="space-y-2 text-sm">
                        <span className="text-slate-500">Chi nhánh</span>
                        <select
                          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={draft.branchId}
                          onChange={(event) => handleEmployeeDraftChange(employee.id, 'branchId', event.target.value)}
                        >
                          {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.code} - {branch.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2 text-sm">
                        <span className="text-slate-500">Quản lý trực tiếp</span>
                        <select
                          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={draft.managerUserId}
                          onChange={(event) => handleEmployeeDraftChange(employee.id, 'managerUserId', event.target.value)}
                          disabled={isManagerAccount}
                        >
                          <option value="">{isManagerAccount ? 'Manager account' : 'Chưa gán quản lý'}</option>
                          {availableManagers.map((manager) => (
                            <option key={manager.user?.id} value={manager.user?.id}>
                              {manager.fullName} ({manager.employeeCode})
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="flex items-end">
                        <Button
                          onClick={() => void saveEmployee(employee)}
                          disabled={savingEmployeeId === employee.id}
                          className="w-full gap-2 lg:w-auto"
                        >
                          <Save className="h-4 w-4" />
                          {savingEmployeeId === employee.id ? 'Đang lưu...' : 'Lưu phân công'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredEmployees.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                  Không có nhân viên nào khớp bộ lọc hiện tại.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
