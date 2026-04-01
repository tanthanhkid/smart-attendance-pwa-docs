import test from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../src/common';
import { EmployeesController } from '../src/modules/employees/employees.controller';
import { EmployeesService } from '../src/modules/employees/employees.service';
import { ApprovalsController } from '../src/modules/approvals/approvals.controller';
import { ApprovalsService } from '../src/modules/approvals/approvals.service';

test('manager employee listing is forced to the manager branch', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const employeesService = {
    findAll: async (params: Record<string, unknown>) => {
      calls.push(params);
      return { items: [], hasMore: false };
    },
  } as unknown as EmployeesService;

  const controller = new EmployeesController(employeesService);

  await controller.findAll(
    UserRole.MANAGER,
    { branchId: 'branch-a' },
    { branchId: 'branch-b', search: 'Ana' } as never,
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].branchId, 'branch-b');
  assert.equal(calls[0].scopeBranchId, 'branch-a');
  assert.equal(calls[0].search, 'Ana');
});

test('manager approval actions are forced to the manager branch', async () => {
  const calls: Array<{ method: string; payload: Record<string, unknown> }> = [];
  const approvalsService = {
    findAll: async (params: Record<string, unknown>) => {
      calls.push({ method: 'findAll', payload: params });
      return { items: [], hasMore: false };
    },
    findOne: async (id: string, scopeBranchId?: string) => {
      calls.push({ method: 'findOne', payload: { id, scopeBranchId } });
      return {};
    },
    approve: async (id: string, reviewerId: string, scopeBranchId?: string) => {
      calls.push({ method: 'approve', payload: { id, reviewerId, scopeBranchId } });
      return {};
    },
    reject: async (id: string, reviewerId: string, reason?: string, scopeBranchId?: string) => {
      calls.push({ method: 'reject', payload: { id, reviewerId, reason, scopeBranchId } });
      return {};
    },
  } as unknown as ApprovalsService;

  const controller = new ApprovalsController(approvalsService);

  await controller.findAll(
    UserRole.MANAGER,
    { branchId: 'branch-a' },
    { branchId: 'branch-b', status: 'PENDING' } as never,
  );
  await controller.findOne('approval-1', UserRole.MANAGER, { branchId: 'branch-a' });
  await controller.approve('approval-1', 'user-1', UserRole.MANAGER, { branchId: 'branch-a' });
  await controller.reject(
    'approval-2',
    'user-1',
    UserRole.MANAGER,
    { branchId: 'branch-a' },
    { reason: 'no' } as never,
  );

  assert.equal(calls[0].method, 'findAll');
  assert.equal(calls[0].payload.branchId, 'branch-b');
  assert.equal(calls[0].payload.scopeBranchId, 'branch-a');
  assert.equal(calls[1].payload.scopeBranchId, 'branch-a');
  assert.equal(calls[2].payload.scopeBranchId, 'branch-a');
  assert.equal(calls[3].payload.scopeBranchId, 'branch-a');
});

test('employee and approval service reads reject cross-branch access', async () => {
  const employeesService = new EmployeesService({
    employee: {
      findUnique: async () => ({
        id: 'employee-1',
        branchId: 'branch-a',
        fullName: 'Employee One',
      }),
    },
  } as never);

  const approvalsService = new ApprovalsService({
    approvalRequest: {
      findUnique: async () => ({
        id: 'approval-1',
        branchId: 'branch-a',
        employeeId: 'employee-1',
        status: 'PENDING',
      }),
    },
  } as never);

  await assert.rejects(
    () => employeesService.findOne('employee-1', 'branch-b'),
    ForbiddenException,
  );

  await assert.rejects(
    () => approvalsService.findOne('approval-1', 'branch-b'),
    ForbiddenException,
  );
});
