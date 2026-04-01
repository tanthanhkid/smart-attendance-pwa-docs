import { strict as assert } from 'node:assert';
import type { PrismaService } from '../src/common';
import {
  MAX_REPORT_PAGE_SIZE,
  ReportsService,
  buildAttendanceCsv,
} from '../src/modules/reports/reports.service';

type AttendanceSessionRecord = {
  workDate: Date;
  status: string | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  totalMinutes: number | null;
  overtimeMinutes: number | null;
  isFlagged: boolean;
  riskScore: number;
  employee: {
    employeeCode: string;
    fullName: string;
  };
  branch: {
    code: string;
    name: string;
  };
};

function createServiceFixture(options: {
  sessions: AttendanceSessionRecord[];
  total: number;
}) {
  let lastFindManyArgs: Record<string, unknown> | null = null;
  let lastCountArgs: Record<string, unknown> | null = null;

  const prisma = {
    attendanceSession: {
      findMany: async (args: Record<string, unknown>) => {
        lastFindManyArgs = args;
        const take = typeof args.take === 'number' ? args.take : options.sessions.length;
        const skip = typeof args.skip === 'number' ? args.skip : 0;
        return options.sessions.slice(skip, skip + take);
      },
      count: async (args: Record<string, unknown>) => {
        lastCountArgs = args;
        return options.total;
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

  return {
    workDate: new Date(`2026-04-${day}T00:00:00.000Z`),
    status: index % 2 === 0 ? 'ON_TIME' : 'LATE',
    checkInAt: new Date(`2026-04-${day}T08:00:00.000Z`),
    checkOutAt: new Date(`2026-04-${day}T17:00:00.000Z`),
    totalMinutes: 540,
    overtimeMinutes: 60,
    isFlagged: index % 10 === 0,
    riskScore: index % 10 === 0 ? 25 : 5,
    employee: {
      employeeCode: `EMP${String(index + 1).padStart(5, '0')}`,
      fullName: `Employee ${index + 1}`,
    },
    branch: {
      code: `B${String((index % 9) + 1).padStart(3, '0')}`,
      name: `Branch ${index + 1}`,
    },
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
