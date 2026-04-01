import test from 'node:test';
import assert from 'node:assert/strict';
import { AttendanceService } from '../src/modules/attendance/attendance.service';

test('check-in reuses rejected session for the same work date', async () => {
  const updateCalls: Array<Record<string, unknown>> = [];
  const deleteManyCalls: Array<Record<string, unknown>> = [];
  const createManyCalls: Array<Record<string, unknown>> = [];
  const eventCreates: Array<Record<string, unknown>> = [];

  const rejectedSession = {
    id: 'session-1',
    employeeId: 'employee-1',
    branchId: 'branch-1',
    workDate: new Date('2026-04-01T00:00:00.000Z'),
    checkInAt: null,
  };

  const service = new AttendanceService({
    attendanceEvent: {
      findUnique: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        eventCreates.push(data);
        return data;
      },
    },
    employee: {
      findUnique: async () => ({
        id: 'employee-1',
        branchId: 'branch-1',
        branch: {
          geofence: {
            centerLat: 10.7712,
            centerLng: 106.698,
            radiusMeters: 100,
          },
        },
      }),
    },
    attendanceSession: {
      findFirst: async () => rejectedSession,
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updateCalls.push(data);
        return { ...rejectedSession, ...data };
      },
      create: async () => {
        throw new Error('create should not run for a rejected session retry');
      },
    },
    attendanceFlag: {
      deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
        deleteManyCalls.push(where);
        return { count: 1 };
      },
      createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
        createManyCalls.push({ data });
        return { count: data.length };
      },
    },
    $transaction: async (callback: (tx: never) => Promise<unknown>) =>
      callback({
        attendanceSession: {
          update: async ({ data }: { data: Record<string, unknown> }) => {
            updateCalls.push(data);
            return { ...rejectedSession, ...data };
          },
          create: async () => {
            throw new Error('create should not run for a rejected session retry');
          },
        },
        attendanceEvent: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            eventCreates.push(data);
            return data;
          },
        },
        attendanceFlag: {
          deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
            deleteManyCalls.push(where);
            return { count: 1 };
          },
          createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
            createManyCalls.push({ data });
            return { count: data.length };
          },
        },
      } as never),
  } as never);

  const result = await service.checkIn('employee-1', {
    latitude: 10.7712,
    longitude: 106.698,
    accuracy: 10,
    timestamp: '2026-04-01T06:10:00.000Z',
    nonce: 'nonce-1',
    deviceId: 'device-1',
  });

  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.sessionId, 'session-1');
  assert.equal(updateCalls.length, 1);
  assert.equal(deleteManyCalls.length, 1);
  assert.deepEqual(deleteManyCalls[0], { attendanceSessionId: 'session-1' });
  assert.equal(eventCreates.length, 1);
  assert.equal(eventCreates[0].attendanceSessionId, 'session-1');
  assert.equal(createManyCalls.length, 0);
});

test('high-risk check-in succeeds but stays unrecorded for manager review', async () => {
  const sessionCreates: Array<Record<string, unknown>> = [];
  const flagCreates: Array<Record<string, unknown>[]> = [];
  const eventCreates: Array<Record<string, unknown>> = [];

  const service = new AttendanceService({
    attendanceEvent: {
      findUnique: async () => null,
    },
    employee: {
      findUnique: async () => ({
        id: 'employee-1',
        branchId: 'branch-1',
        branch: {
          geofence: {
            centerLat: 10.7712,
            centerLng: 106.698,
            radiusMeters: 100,
          },
        },
      }),
    },
    attendanceSession: {
      findFirst: async () => null,
    },
    $transaction: async (callback: (tx: never) => Promise<unknown>) =>
      callback({
        attendanceSession: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            sessionCreates.push(data);
            return { id: 'session-risk', ...data };
          },
          update: async () => {
            throw new Error('update should not run for a new session');
          },
        },
        attendanceEvent: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            eventCreates.push(data);
            return data;
          },
        },
        attendanceFlag: {
          deleteMany: async () => ({ count: 0 }),
          createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
            flagCreates.push(data);
            return { count: data.length };
          },
        },
      } as never),
  } as never);

  const result = await service.checkIn('employee-1', {
    latitude: 10.7805,
    longitude: 106.71,
    accuracy: 150,
    timestamp: '2026-04-01T06:10:00.000Z',
    nonce: 'nonce-risk',
    deviceId: 'device-1',
  });

  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.recorded, false);
  assert.equal(result.flagged, true);
  assert.equal(result.sessionId, 'session-risk');
  assert.equal(sessionCreates.length, 1);
  assert.equal(sessionCreates[0].status, null);
  assert.notEqual(sessionCreates[0].checkInAt, null);
  assert.equal(eventCreates.length, 1);
  assert.equal(eventCreates[0].type, 'REJECTED');
  assert.ok(flagCreates[0].length > 0);
});
