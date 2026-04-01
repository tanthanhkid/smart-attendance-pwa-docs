import { strict as assert } from 'node:assert';
import { AttendanceStatus } from '../src/common';
import type { PrismaService } from '../src/common';
import {
  MAX_REPORT_PAGE_SIZE,
  ReportsService,
  buildAttendanceCsv,
} from '../src/modules/reports/reports.service';

type AttendanceSessionRecord = {
  id: string;
  employeeId: string;
  branchId: string;
  workDate: Date;
  createdAt: Date;
  updatedAt: Date;
  status: AttendanceStatus | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  totalMinutes: number | null;
  overtimeMinutes: number | null;
  riskScore: number;
  isFlagged: boolean;
  employee: {
    id: string;
    employeeCode: string;
    fullName: string;
    branchId: string;
    managerUserId: string | null;
    departmentId: string | null;
    department: { id: string; name: string } | null;
  };
  branch: {
    id: string;
    code: string;
    name: string;
  };
  flags: Array<{
    id: string;
    code: string;
    message: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    createdAt: Date;
  }>;
  events: Array<{
    id: string;
    type: string;
    occurredAt: Date;
    latitude: number | null;
    longitude: number | null;
    accuracyMeters: number | null;
    distanceMeters: number | null;
    decision: string | null;
  }>;
};

function createServiceFixture(options: {
  sessions: AttendanceSessionRecord[];
  total: number;
}) {
  let lastFindManyArgs: Record<string, unknown> | null = null;
  let lastCountArgs: Record<string, unknown> | null = null;

  const matchesWhere = (session: AttendanceSessionRecord, where?: Record<string, unknown>): boolean => {
    if (!where) return true;

    const andConditions = Array.isArray(where.AND) ? (where.AND as Record<string, unknown>[]) : [];
    if (andConditions.some((condition) => !matchesWhere(session, condition))) {
      return false;
    }

    const orConditions = Array.isArray(where.OR) ? (where.OR as Record<string, unknown>[]) : [];
    if (orConditions.length > 0 && !orConditions.some((condition) => matchesWhere(session, condition))) {
      return false;
    }

    if (where.branchId !== undefined && session.branchId !== where.branchId) return false;
    if (where.employeeId !== undefined && session.employeeId !== where.employeeId) return false;
    if (where.isFlagged !== undefined && session.isFlagged !== where.isFlagged) return false;

    if (where.status !== undefined) {
      if (where.status === null) {
        if (session.status !== null) return false;
      } else if (typeof where.status === 'object' && where.status !== null) {
        const statusFilter = where.status as { not?: unknown };
        if ('not' in statusFilter && statusFilter.not === null && session.status === null) {
          return false;
        }
      } else if (session.status !== where.status) {
        return false;
      }
    }

    if (where.workDate && typeof where.workDate === 'object') {
      const workDateFilter = where.workDate as { gte?: Date; lte?: Date; lt?: Date };
      if (workDateFilter.gte && session.workDate < workDateFilter.gte) return false;
      if (workDateFilter.lte && session.workDate > workDateFilter.lte) return false;
      if (workDateFilter.lt && session.workDate >= workDateFilter.lt) return false;
    }

    if (where.employee && typeof where.employee === 'object') {
      const employeeFilter = where.employee as { departmentId?: string | null; managerUserId?: string | null };
      if (employeeFilter.departmentId !== undefined && session.employee.departmentId !== employeeFilter.departmentId) {
        return false;
      }
      if (employeeFilter.managerUserId !== undefined && session.employee.managerUserId !== employeeFilter.managerUserId) {
        return false;
      }
    }

    return true;
  };

  const prisma = {
    attendanceSession: {
      findMany: async (args: Record<string, unknown>) => {
        lastFindManyArgs = args;
        const take = typeof args.take === 'number' ? args.take : options.sessions.length;
        const skip = typeof args.skip === 'number' ? args.skip : 0;
        const where = args.where as Record<string, unknown> | undefined;
        return options.sessions.filter((session) => matchesWhere(session, where)).slice(skip, skip + take);
      },
      count: async (args: Record<string, unknown>) => {
        lastCountArgs = args;
        const where = args.where as Record<string, unknown> | undefined;
        return options.sessions.filter((session) => matchesWhere(session, where)).length;
      },
    },
  } as unknown as PrismaService;

  return {
    service: new ReportsService(prisma),
    getLastFindManyArgs: () => lastFindManyArgs,
    getLastCountArgs: () => lastCountArgs,
  };
}

function createSession(index: number): AttendanceSessionRecord {
  const day = String((index % 28) + 1).padStart(2, '0');
  const isFlagged = index % 4 === 0;
  const isUnrecorded = index % 5 === 0;

  return {
    id: `session-${index + 1}`,
    employeeId: `employee-${index + 1}`,
    branchId: `branch-${(index % 3) + 1}`,
    workDate: new Date(`2026-04-${day}T00:00:00.000Z`),
    createdAt: new Date(`2026-04-${day}T07:55:00.000Z`),
    updatedAt: new Date(`2026-04-${day}T17:05:00.000Z`),
    status: isUnrecorded ? null : index % 2 === 0 ? 'ON_TIME' : 'LATE',
    checkInAt: new Date(`2026-04-${day}T08:00:00.000Z`),
    checkOutAt: isUnrecorded ? null : new Date(`2026-04-${day}T17:00:00.000Z`),
    totalMinutes: 540,
    overtimeMinutes: 60,
    riskScore: isFlagged ? 25 : 5,
    isFlagged,
    employee: {
      id: `employee-${index + 1}`,
      employeeCode: `EMP${String(index + 1).padStart(5, '0')}`,
      fullName: `Employee ${index + 1}`,
      branchId: `branch-${(index % 3) + 1}`,
      managerUserId: index % 2 === 0 ? 'manager-1' : 'manager-2',
      departmentId: index % 2 === 0 ? 'dept-1' : null,
      department: index % 2 === 0 ? { id: 'dept-1', name: 'Operations' } : null,
    },
    branch: {
      id: `branch-${(index % 3) + 1}`,
      code: `B${String((index % 9) + 1).padStart(3, '0')}`,
      name: `Branch ${index + 1}`,
    },
    flags: isFlagged
      ? [
          {
            id: `flag-${index + 1}`,
            code: 'RISK_SCORE',
            message: 'High risk score',
            severity: 'HIGH',
            createdAt: new Date(`2026-04-${day}T08:05:00.000Z`),
          },
        ]
      : [],
    events: [
      {
        id: `event-${index + 1}-in`,
        type: 'CHECK_IN',
        occurredAt: new Date(`2026-04-${day}T08:00:00.000Z`),
        latitude: 10.75 + index / 1000,
        longitude: 106.67 + index / 1000,
        accuracyMeters: 12,
        distanceMeters: 40,
        decision: 'ALLOW',
      },
      ...(isUnrecorded
        ? []
        : [
            {
              id: `event-${index + 1}-out`,
              type: 'CHECK_OUT',
              occurredAt: new Date(`2026-04-${day}T17:00:00.000Z`),
              latitude: 10.75 + index / 1000,
              longitude: 106.67 + index / 1000,
              accuracyMeters: 12,
              distanceMeters: 40,
              decision: 'ALLOW',
            },
          ]),
    ],
  };
}

async function main() {
  const csv = buildAttendanceCsv([
    {
      date: '2026-04-01',
      employee_code: 'EMP00001',
      employee_name: 'Nguyen, "An"',
      branch_code: 'HCM001',
      branch_name: 'HQ',
      check_in: '2026-04-01T08:00:00.000Z',
      check_out: '2026-04-01T17:00:00.000Z',
      total_minutes: 540,
      overtime_minutes: 60,
      status: 'ON_TIME',
      recorded: true,
      flagged: false,
      risk_score: 3,
    },
  ]);

  assert.equal(
    csv,
    [
      'date,employee_code,employee_name,branch_code,branch_name,check_in,check_out,total_minutes,overtime_minutes,status,recorded,flagged,risk_score',
      '2026-04-01,EMP00001,"Nguyen, ""An""",HCM001,HQ,2026-04-01T08:00:00.000Z,2026-04-01T17:00:00.000Z,540,60,ON_TIME,true,false,3',
    ].join('\n'),
  );

  const sessions = Array.from({ length: MAX_REPORT_PAGE_SIZE + 1 }, (_, index) => createSession(index));
  const fixture = createServiceFixture({
    sessions,
    total: sessions.length,
  });

  const reviewReport = await fixture.service.getAttendanceReport({
    from: new Date('2026-04-01T00:00:00.000Z'),
    to: new Date('2026-04-30T23:59:59.999Z'),
    needsReview: true,
  });

  assert.equal(
    reviewReport.items.every((item) => item.review.requiresReview),
    true,
  );
  assert.equal(
    reviewReport.items.every((item) => item.review.state !== 'RECORDED'),
    true,
  );
  assert.equal(
    reviewReport.items.every((item) => item.isFlagged || item.status === null),
    true,
  );
  assert.equal(
    reviewReport.items.some((item) => item.flags.length > 0),
    true,
  );
  assert.equal(reviewReport.items[0]?.checkInEvent?.latitude != null, true);
  assert.equal(reviewReport.items[0]?.checkInEvent?.longitude != null, true);

  const report = await fixture.service.getAttendanceReport({
    from: new Date('2026-04-01T00:00:00.000Z'),
    to: new Date('2026-04-30T23:59:59.999Z'),
    page: 2,
    pageSize: 50_000,
  });

  assert.equal(report.pageSize, MAX_REPORT_PAGE_SIZE);
  assert.equal(report.page, 2);
  assert.equal(report.totalPages, 2);
  assert.equal(fixture.getLastFindManyArgs()?.take, MAX_REPORT_PAGE_SIZE);
  assert.equal(fixture.getLastFindManyArgs()?.skip, MAX_REPORT_PAGE_SIZE);
  assert.equal(fixture.getLastCountArgs() != null, true);

  const managerScopedReport = await fixture.service.getAttendanceReport({
    from: new Date('2026-04-01T00:00:00.000Z'),
    to: new Date('2026-04-30T23:59:59.999Z'),
    scopeManagerUserId: 'manager-1',
    page: 1,
    pageSize: 20,
  });

  assert.equal(managerScopedReport.items.length, 20);
  assert.equal(
    managerScopedReport.items.every((item) => Number(item.employee.employeeCode.slice(3)) % 2 === 1),
    true,
  );
  assert.equal(
    ((fixture.getLastFindManyArgs()?.where as { employee?: { managerUserId?: string } } | undefined)?.employee?.managerUserId),
    'manager-1',
  );

  const exportResult = await fixture.service.exportAttendance({
    from: new Date('2026-04-01T00:00:00.000Z'),
    to: new Date('2026-04-30T23:59:59.999Z'),
  });

  assert.equal(exportResult.contentType, 'text/csv');
  assert.equal(exportResult.total, sessions.length);
  assert.equal(exportResult.returned, MAX_REPORT_PAGE_SIZE);
  assert.equal(exportResult.truncated, true);
  assert.equal(exportResult.limit, MAX_REPORT_PAGE_SIZE);
  assert.match(exportResult.filename, /^attendance_report_2026-04-01_2026-04-30\.csv$/);
  assert.equal(exportResult.csv.split('\n').length, MAX_REPORT_PAGE_SIZE + 1);

  console.log('reports.test.ts passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
