import { Injectable } from '@nestjs/common';
import { AttendanceStatus, PrismaService, formatDateISO } from '@/common';
import { Prisma } from '@prisma/client';

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

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getAttendanceReport(params: {
    from: Date;
    to: Date;
    branchId?: string;
    departmentId?: string;
    employeeId?: string;
    status?: AttendanceStatus;
    page?: number;
    pageSize?: number;
  }) {
    const {
      from,
      to,
      branchId,
      departmentId,
      employeeId,
      status,
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
    if (departmentId) {
      where.employee = { departmentId };
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
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),
      this.prisma.attendanceSession.count({ where }),
    ]);

    return {
      items: items.map((session) => ({
        ...session,
        recorded: session.status !== null,
      })),
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
      recorded: session.status !== null,
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
