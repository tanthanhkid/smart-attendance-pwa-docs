import { Injectable } from '@nestjs/common';
import { PrismaService, formatDateISO, summarizeAttendanceReview } from '@/common';
import { Prisma, AttendanceStatus as PrismaAttendanceStatus } from '@prisma/client';

export const MAX_REPORT_PAGE_SIZE = 1000;
const CSV_HEADERS = [
  'date',
  'employee_code',
  'employee_name',
  'branch_code',
  'branch_name',
  'check_in',
  'check_out',
  'total_minutes',
  'overtime_minutes',
  'status',
  'recorded',
  'flagged',
  'risk_score',
] as const;

type AttendanceReportEmployee = {
  id: string;
  fullName: string;
  employeeCode: string;
  branchId: string;
  departmentId: string | null;
  department: { id: string; name: string } | null;
};

type AttendanceReportBranch = {
  id: string;
  name: string;
  code: string;
};

type AttendanceReportFlag = {
  id: string;
  code: string;
  message: string;
  severity: string;
  createdAt: Date;
};

type AttendanceReportEvent = {
  id: string;
  type: string;
  occurredAt: Date;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  distanceMeters: number | null;
  decision: string | null;
};

export interface AttendanceReportItem {
  id: string;
  employeeId: string;
  branchId: string;
  workDate: Date;
  status: PrismaAttendanceStatus | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  totalMinutes: number | null;
  overtimeMinutes: number | null;
  riskScore: number;
  isFlagged: boolean;
  recorded: boolean;
  employee: {
    id: string;
    fullName: string;
    employeeCode: string;
    branchId: string;
    departmentId: string | null;
    departmentName: string | null;
  };
  branch: AttendanceReportBranch;
  flags: AttendanceReportFlag[];
  review: ReturnType<typeof summarizeAttendanceReview>;
  checkInEvent: AttendanceReportEvent | null;
  checkOutEvent: AttendanceReportEvent | null;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private toCoordinate(value: Prisma.Decimal | number | null): number | null {
    if (value === null) {
      return null;
    }

    return typeof value === 'number' ? value : value.toNumber();
  }

  private mapReviewEvent(event: {
    id: string;
    type: string;
    occurredAt: Date;
    latitude: Prisma.Decimal | number | null;
    longitude: Prisma.Decimal | number | null;
    accuracyMeters: number | null;
    distanceMeters: number | null;
    decision: string | null;
  } | undefined): AttendanceReportEvent | null {
    if (!event) {
      return null;
    }

    return {
      ...event,
      latitude: this.toCoordinate(event.latitude),
      longitude: this.toCoordinate(event.longitude),
    };
  }

  private mapReportSession(session: {
    id: string;
    employeeId: string;
    branchId: string;
    workDate: Date;
    status: PrismaAttendanceStatus | null;
    checkInAt: Date | null;
    checkOutAt: Date | null;
    totalMinutes: number | null;
    overtimeMinutes: number | null;
    riskScore: number;
    isFlagged: boolean;
    employee: AttendanceReportEmployee;
    branch: AttendanceReportBranch;
    flags: AttendanceReportFlag[];
    events: Array<{
      id: string;
      type: string;
      occurredAt: Date;
      latitude: Prisma.Decimal | number | null;
      longitude: Prisma.Decimal | number | null;
      accuracyMeters: number | null;
      distanceMeters: number | null;
      decision: string | null;
    }>;
  }): AttendanceReportItem {
    const checkInEvent = this.mapReviewEvent(
      session.events.find((event) => event.type === 'CHECK_IN'),
    );
    const checkOutEvent = this.mapReviewEvent(
      session.events.find((event) => event.type === 'CHECK_OUT'),
    );

    return {
      id: session.id,
      employeeId: session.employeeId,
      branchId: session.branchId,
      workDate: session.workDate,
      status: session.status,
      checkInAt: session.checkInAt,
      checkOutAt: session.checkOutAt,
      totalMinutes: session.totalMinutes,
      overtimeMinutes: session.overtimeMinutes,
      riskScore: session.riskScore,
      isFlagged: session.isFlagged,
      recorded: session.status !== null,
      employee: {
        id: session.employee.id,
        fullName: session.employee.fullName,
        employeeCode: session.employee.employeeCode,
        branchId: session.employee.branchId,
        departmentId: session.employee.departmentId,
        departmentName: session.employee.department?.name ?? null,
      },
      branch: session.branch,
      flags: session.flags,
      review: summarizeAttendanceReview({
        status: session.status,
        isFlagged: session.isFlagged,
        riskScore: session.riskScore,
        flags: session.flags,
      }),
      checkInEvent,
      checkOutEvent,
    };
  }

  async getAttendanceReport(params: {
    from: Date;
    to: Date;
    branchId?: string;
    departmentId?: string;
    employeeId?: string;
    scopeManagerUserId?: string;
    status?: PrismaAttendanceStatus;
    needsReview?: boolean;
    recorded?: boolean;
    flagged?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const {
      from,
      to,
      branchId,
      departmentId,
      employeeId,
      scopeManagerUserId,
      status,
      needsReview,
      recorded,
      flagged,
      page = 1,
      pageSize = 50,
    } = params;

    const parsedPage = Number(page);
    const parsedPageSize = Number(pageSize);
    const normalizedPage = Number.isFinite(parsedPage) ? Math.max(1, Math.floor(parsedPage)) : 1;
    const normalizedPageSize = Math.min(
      Math.max(Number.isFinite(parsedPageSize) ? Math.floor(parsedPageSize) : 50, 1),
      MAX_REPORT_PAGE_SIZE,
    );

    const where: Prisma.AttendanceSessionWhereInput = {
      workDate: {
        gte: from,
        lte: to,
      },
    };

    if (branchId) where.branchId = branchId;
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    const employeeWhere: Prisma.EmployeeWhereInput = {};
    if (departmentId) {
      employeeWhere.departmentId = departmentId;
    }
    if (scopeManagerUserId) {
      employeeWhere.managerUserId = scopeManagerUserId;
    }
    if (Object.keys(employeeWhere).length > 0) {
      where.employee = employeeWhere;
    }

    const reviewConditions: Prisma.AttendanceSessionWhereInput[] = [];
    if (needsReview !== undefined) {
      reviewConditions.push(
        needsReview
          ? { OR: [{ status: null }, { isFlagged: true }] }
          : { status: { not: null }, isFlagged: false },
      );
    }
    if (recorded !== undefined) {
      reviewConditions.push({ status: recorded ? { not: null } : null });
    }
    if (flagged !== undefined) {
      reviewConditions.push({ isFlagged: flagged });
    }

    if (reviewConditions.length > 0) {
      where.AND = reviewConditions;
    }

    const [items, total] = await Promise.all([
      this.prisma.attendanceSession.findMany({
        where,
        skip: (normalizedPage - 1) * normalizedPageSize,
        take: normalizedPageSize,
        orderBy: { workDate: 'desc' },
        include: {
          employee: {
            select: {
              id: true,
              fullName: true,
              employeeCode: true,
              branchId: true,
              departmentId: true,
              department: { select: { id: true, name: true } },
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          flags: {
            select: {
              id: true,
              attendanceSessionId: true,
              code: true,
              message: true,
              severity: true,
              createdAt: true,
            },
          },
          events: {
            orderBy: { occurredAt: 'asc' },
            select: {
              id: true,
              type: true,
              occurredAt: true,
              latitude: true,
              longitude: true,
              accuracyMeters: true,
              distanceMeters: true,
              decision: true,
            },
          },
        },
      }),
      this.prisma.attendanceSession.count({ where }),
    ]);

    return {
      items: items.map((session) => this.mapReportSession(session)),
      total,
      page: normalizedPage,
      pageSize: normalizedPageSize,
      totalPages: Math.ceil(total / normalizedPageSize),
    };
  }

  async exportAttendance(params: {
    from: Date;
    to: Date;
    branchId?: string;
    departmentId?: string;
    scopeManagerUserId?: string;
  }): Promise<AttendanceExportResponse> {
    const sessions = await this.getAttendanceReport({
      ...params,
      page: 1,
      pageSize: MAX_REPORT_PAGE_SIZE,
    });

    const data = sessions.items.map((session) => ({
      date: formatDateISO(session.workDate),
      employee_code: session.employee.employeeCode,
      employee_name: session.employee.fullName,
      branch_code: session.branch.code,
      branch_name: session.branch.name,
      check_in: session.checkInAt?.toISOString() || '',
      check_out: session.checkOutAt?.toISOString() || '',
      total_minutes: session.totalMinutes || 0,
      overtime_minutes: session.overtimeMinutes || 0,
      status: session.status || 'UNKNOWN',
      recorded: session.recorded,
      flagged: session.isFlagged,
      risk_score: session.riskScore,
    }));

    return {
      filename: `attendance_report_${formatDateISO(params.from)}_${formatDateISO(params.to)}.csv`,
      contentType: 'text/csv',
      csv: buildAttendanceCsv(data),
      total: sessions.total,
      returned: data.length,
      truncated: sessions.total > data.length,
      limit: MAX_REPORT_PAGE_SIZE,
    };
  }
}

export interface AttendanceExportResponse {
  filename: string;
  contentType: 'text/csv';
  csv: string;
  total: number;
  returned: number;
  truncated: boolean;
  limit: number;
}

export function escapeCsvValue(value: string | number | boolean | null | undefined): string {
  const stringValue = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(stringValue) || /^\s|\s$/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function buildAttendanceCsv(rows: AttendanceReportRow[]): string {
  const lines = [CSV_HEADERS.join(',')];

  for (const row of rows) {
    lines.push(
      [
        row.date,
        row.employee_code,
        row.employee_name,
        row.branch_code,
        row.branch_name,
        row.check_in,
        row.check_out,
        row.total_minutes,
        row.overtime_minutes,
        row.status,
        row.recorded,
        row.flagged,
        row.risk_score,
      ]
        .map(escapeCsvValue)
        .join(','),
    );
  }

  return lines.join('\n');
}

export interface AttendanceReportRow {
  date: string;
  employee_code: string;
  employee_name: string;
  branch_code: string;
  branch_name: string;
  check_in: string;
  check_out: string;
  total_minutes: number;
  overtime_minutes: number;
  status: string;
  recorded: boolean;
  flagged: boolean;
  risk_score: number;
}
