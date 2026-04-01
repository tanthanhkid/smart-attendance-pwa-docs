import test from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { AttendanceService } from '../src/modules/attendance/attendance.service';
import { ApprovalsService } from '../src/modules/approvals/approvals.service';

test('attendance correction requests persist requested timestamps', async () => {
  const approvalCreates: Array<Record<string, unknown>> = [];
  const auditCreates: Array<Record<string, unknown>> = [];

  const service = new AttendanceService({
    attendanceSession: {
      findFirst: async () => ({
        id: 'session-1',
        branchId: 'branch-a',
        workDate: new Date('2026-04-01T00:00:00.000Z'),
      }),
    },
    $transaction: async (callback: (tx: never) => Promise<unknown>) =>
      callback({
        approvalRequest: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            approvalCreates.push(data);
            return { id: 'approval-1', ...data };
          },
        },
        auditLog: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            auditCreates.push(data);
            return data;
          },
        },
      } as never),
  } as never);

  await service.requestCorrection('employee-1', 'user-1', {
    attendanceSessionId: 'session-1',
    reason: 'Forgot to check out',
    requestedCheckInAt: '2026-04-01T01:10:00.000Z',
    requestedCheckOutAt: '2026-04-01T10:05:00.000Z',
  });

  assert.equal(approvalCreates.length, 1);
  assert.equal(
    (approvalCreates[0].requestedCheckInAt as Date).toISOString(),
    '2026-04-01T01:10:00.000Z',
  );
  assert.equal(
    (approvalCreates[0].requestedCheckOutAt as Date).toISOString(),
    '2026-04-01T10:05:00.000Z',
  );
  assert.equal(
    auditCreates[0].metadataJson && (auditCreates[0].metadataJson as Record<string, string>).requestedCheckInAt,
    '2026-04-01T01:10:00.000Z',
  );
});

test('attendance correction requests require at least one requested timestamp', async () => {
  const service = new AttendanceService({
    attendanceSession: {
      findFirst: async () => ({
        id: 'session-1',
        branchId: 'branch-a',
        workDate: new Date('2026-04-01T00:00:00.000Z'),
      }),
    },
    $transaction: async () => {
      throw new Error('transaction should not run');
    },
  } as never);

  await assert.rejects(
    () =>
      service.requestCorrection('employee-1', 'user-1', {
        attendanceSessionId: 'session-1',
        reason: 'Forgot to check out',
      }),
    BadRequestException,
  );
});

test('approval approval applies requested correction timestamps to the session', async () => {
  const approvalUpdateCalls: Array<Record<string, unknown>> = [];
  const sessionUpdateCalls: Array<Record<string, unknown>> = [];
  const auditCreates: Array<Record<string, unknown>> = [];

  const request = {
    id: 'approval-1',
    employeeId: 'employee-1',
    branchId: 'branch-a',
    attendanceSessionId: 'session-1',
    status: 'PENDING',
    reason: 'Fix attendance',
    requestedCheckInAt: new Date('2026-04-01T01:10:00.000Z'),
    requestedCheckOutAt: new Date('2026-04-01T10:05:00.000Z'),
    session: {
      id: 'session-1',
      checkInAt: null,
      checkOutAt: null,
      workDate: new Date('2026-04-01T00:00:00.000Z'),
    },
  };

  const service = new ApprovalsService({
    approvalRequest: {
      findUnique: async () => request,
    },
    $transaction: async (callback: (tx: never) => Promise<unknown>) =>
      callback({
        approvalRequest: {
          update: async ({ data }: { data: Record<string, unknown> }) => {
            approvalUpdateCalls.push(data);
            return { id: request.id, ...data };
          },
        },
        attendanceSession: {
          update: async ({ data }: { data: Record<string, unknown> }) => {
            sessionUpdateCalls.push(data);
            return { id: request.session.id, ...data };
          },
        },
        attendanceFlag: {
          deleteMany: async () => ({ count: 0 }),
        },
        attendanceEvent: {
          findFirst: async () => null,
          update: async ({ data }: { data: Record<string, unknown> }) => data,
          create: async ({ data }: { data: Record<string, unknown> }) => data,
        },
        auditLog: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            auditCreates.push(data);
            return data;
          },
        },
      } as never),
  } as never);

  await service.approve('approval-1', 'reviewer-1', 'branch-a');

  assert.equal(approvalUpdateCalls.length, 1);
  assert.equal(sessionUpdateCalls.length, 1);
  assert.equal(
    (sessionUpdateCalls[0].checkInAt as Date).toISOString(),
    '2026-04-01T01:10:00.000Z',
  );
  assert.equal(
    (sessionUpdateCalls[0].checkOutAt as Date).toISOString(),
    '2026-04-01T10:05:00.000Z',
  );
  assert.equal(sessionUpdateCalls[0].status, 'OVERTIME');
  assert.equal(sessionUpdateCalls[0].totalMinutes, 535);
  assert.equal(sessionUpdateCalls[0].overtimeMinutes, 55);
  assert.equal(auditCreates[0].metadataJson && (auditCreates[0].metadataJson as Record<string, unknown>).appliedCheckInAt, '2026-04-01T01:10:00.000Z');
});
