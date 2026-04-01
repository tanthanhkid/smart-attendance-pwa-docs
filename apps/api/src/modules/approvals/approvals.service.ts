import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import {
  ApprovalStatus,
  AttendanceDecision,
  AttendanceEventType,
  AttendanceStatus,
  PrismaService,
  ERROR_MESSAGES,
  BUSINESS_RULES,
  buildPaginationQuery,
  applyPagination,
  calculateMinutesBetween,
  calculateOvertimeMinutes,
  getDateRange,
  isLateCheckIn,
} from '@/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class ApprovalsService {
  constructor(private prisma: PrismaService) {}

  private assertBranchAccess(requestBranchId: string, scopeBranchId?: string) {
    if (scopeBranchId && requestBranchId !== scopeBranchId) {
      throw new ForbiddenException('You do not have access to this approval request');
    }
  }

  private assertManagerAccess(requestManagerUserId: string | null, scopeManagerUserId?: string) {
    if (scopeManagerUserId && requestManagerUserId !== scopeManagerUserId) {
      throw new ForbiddenException('You do not have access to this approval request');
    }
  }

  private assertPendingStatus(status: unknown) {
    if (status !== 'PENDING') {
      throw new BadRequestException('Approval request has already been processed');
    }
  }

  private buildManualCorrectionPatch(request: {
    session: {
      checkInAt: Date | null;
      checkOutAt: Date | null;
      workDate: Date;
    } | null;
    requestedCheckInAt: Date | null;
    requestedCheckOutAt: Date | null;
  }) {
    if (!request.session) {
      throw new BadRequestException('Manual correction requires an attendance session');
    }

    const checkInAt = request.requestedCheckInAt ?? request.session.checkInAt;
    const checkOutAt = request.requestedCheckOutAt ?? request.session.checkOutAt;

    if (!checkInAt) {
      throw new BadRequestException('Manual correction requires a check-in time');
    }

    const { start, end } = getDateRange(request.session.workDate);
    const isWithinSessionDay = (date: Date) => date >= start && date < end;

    if (!isWithinSessionDay(checkInAt)) {
      throw new BadRequestException('Requested check-in time must stay within the session work date');
    }

    if (checkOutAt && !isWithinSessionDay(checkOutAt)) {
      throw new BadRequestException('Requested check-out time must stay within the session work date');
    }

    if (checkOutAt && checkOutAt < checkInAt) {
      throw new BadRequestException('Requested check-out time must be after check-in time');
    }

    let status = isLateCheckIn(checkInAt, BUSINESS_RULES.CHECK_IN_HOUR_THRESHOLD)
      ? AttendanceStatus.LATE
      : AttendanceStatus.ON_TIME;
    let totalMinutes: number | null = null;
    let overtimeMinutes = 0;

    if (checkOutAt) {
      totalMinutes = calculateMinutesBetween(checkInAt, checkOutAt);
      if (totalMinutes < 0) {
        throw new BadRequestException('Requested check-out time must be after check-in time');
      }

      overtimeMinutes = calculateOvertimeMinutes(totalMinutes, BUSINESS_RULES.DEFAULT_WORKING_MINUTES);
      if (overtimeMinutes > 0) {
        status = AttendanceStatus.OVERTIME;
      } else if (totalMinutes < BUSINESS_RULES.DEFAULT_WORKING_MINUTES) {
        status = AttendanceStatus.EARLY_CHECKOUT;
      }
    }

    return {
      checkInAt,
      checkOutAt,
      totalMinutes,
      overtimeMinutes,
      status,
    };
  }

  async findAll(params: {
    cursor?: string;
    limit?: number;
    branchId?: string;
    scopeBranchId?: string;
    scopeManagerUserId?: string;
    status?: ApprovalStatus;
    reviewedBy?: string;
  }) {
    const {
      cursor,
      limit = BUSINESS_RULES.PAGINATION.DEFAULT_LIMIT,
      branchId,
      scopeBranchId,
      scopeManagerUserId,
      status,
      reviewedBy,
    } = params;

    const where: Prisma.ApprovalRequestWhereInput = {};

    if (scopeBranchId) {
      where.branchId = scopeBranchId;
    } else if (branchId) {
      where.branchId = branchId;
    }
    if (scopeManagerUserId) {
      where.employee = { managerUserId: scopeManagerUserId };
    }
    if (status) where.status = status;
    if (reviewedBy) where.reviewedByUserId = reviewedBy;

    const requests = await this.prisma.approvalRequest.findMany({
      where,
      ...buildPaginationQuery(cursor, limit),
      orderBy: { createdAt: 'desc' },
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true } },
        branch: { select: { id: true, name: true, code: true } },
        session: { select: { id: true, checkInAt: true, checkOutAt: true, workDate: true } },
      },
    });

    return applyPagination(requests, limit);
  }

  async findOne(id: string, scopeBranchId?: string, scopeManagerUserId?: string) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true, managerUserId: true } },
        branch: { select: { id: true, name: true, code: true } },
        session: { 
          select: { 
            id: true, 
            checkInAt: true, 
            checkOutAt: true, 
            workDate: true,
            riskScore: true,
            isFlagged: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(ERROR_MESSAGES.APPROVAL.NOT_FOUND);
    }

    this.assertBranchAccess(request.branchId, scopeBranchId);
    this.assertManagerAccess(request.employee.managerUserId, scopeManagerUserId);

    return request;
  }

  async approve(id: string, reviewerId: string, scopeBranchId?: string, scopeManagerUserId?: string) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        session: true,
        employee: {
          select: {
            managerUserId: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(ERROR_MESSAGES.APPROVAL.NOT_FOUND);
    }

    this.assertBranchAccess(request.branchId, scopeBranchId);
    this.assertManagerAccess(request.employee.managerUserId, scopeManagerUserId);

    this.assertPendingStatus(request.status);

    const correction = this.buildManualCorrectionPatch(request);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.approvalRequest.update({
        where: { id },
        data: {
          status: ApprovalStatus.APPROVED,
          reviewedByUserId: reviewerId,
          reviewedAt: new Date(),
        },
        include: {
          employee: { select: { id: true, fullName: true, employeeCode: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
      });

      // Update attendance session if exists
      if (request.session) {
        await tx.attendanceSession.update({
          where: { id: request.session.id },
          data: {
            checkInAt: correction.checkInAt,
            checkOutAt: correction.checkOutAt,
            totalMinutes: correction.totalMinutes,
            overtimeMinutes: correction.overtimeMinutes,
            status: correction.status,
            isFlagged: false,
            riskScore: 0,
          },
        });

        await tx.attendanceFlag.deleteMany({
          where: { attendanceSessionId: request.session.id },
        });

        if (request.requestedCheckInAt) {
          await this.upsertSessionEvent(tx, {
            attendanceSessionId: request.session.id,
            employeeId: request.employeeId,
            branchId: request.branchId,
            type: AttendanceEventType.CHECK_IN,
            occurredAt: request.requestedCheckInAt,
          });
        }

        if (request.requestedCheckOutAt) {
          await this.upsertSessionEvent(tx, {
            attendanceSessionId: request.session.id,
            employeeId: request.employeeId,
            branchId: request.branchId,
            type: AttendanceEventType.CHECK_OUT,
            occurredAt: request.requestedCheckOutAt,
          });
        }

        if (request.requestedCheckInAt || request.requestedCheckOutAt) {
          await tx.attendanceEvent.create({
            data: {
              attendanceSessionId: request.session.id,
              employeeId: request.employeeId,
              branchId: request.branchId,
              type: AttendanceEventType.MANUAL_ADJUSTMENT,
              occurredAt: new Date(),
              decision: AttendanceDecision.ALLOW,
            },
          });
        }
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          actorUserId: reviewerId,
          action: 'APPROVE_ATTENDANCE_CORRECTION',
          entityType: 'ApprovalRequest',
          entityId: id,
          metadataJson: {
            requestId: id,
            employeeId: request.employeeId,
            approved: true,
            ...(request.requestedCheckInAt
              ? { requestedCheckInAt: request.requestedCheckInAt.toISOString() }
              : {}),
            ...(request.requestedCheckOutAt
              ? { requestedCheckOutAt: request.requestedCheckOutAt.toISOString() }
              : {}),
            appliedCheckInAt: correction.checkInAt.toISOString(),
            ...(correction.checkOutAt ? { appliedCheckOutAt: correction.checkOutAt.toISOString() } : {}),
            ...(correction.totalMinutes !== null ? { totalMinutes: correction.totalMinutes } : {}),
          },
        },
      });

      return updated;
    });
  }

  async reject(id: string, reviewerId: string, reason?: string, scopeBranchId?: string, scopeManagerUserId?: string) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            managerUserId: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(ERROR_MESSAGES.APPROVAL.NOT_FOUND);
    }

    this.assertBranchAccess(request.branchId, scopeBranchId);
    this.assertManagerAccess(request.employee.managerUserId, scopeManagerUserId);

    this.assertPendingStatus(request.status);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.approvalRequest.update({
        where: { id },
        data: {
          status: ApprovalStatus.REJECTED,
          reviewedByUserId: reviewerId,
          reviewedAt: new Date(),
        },
        include: {
          employee: { select: { id: true, fullName: true, employeeCode: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          actorUserId: reviewerId,
          action: 'REJECT_ATTENDANCE_CORRECTION',
          entityType: 'ApprovalRequest',
          entityId: id,
          metadataJson: {
            requestId: id,
            employeeId: request.employeeId,
            approved: false,
            reason,
            ...(request.requestedCheckInAt
              ? { requestedCheckInAt: request.requestedCheckInAt.toISOString() }
              : {}),
            ...(request.requestedCheckOutAt
              ? { requestedCheckOutAt: request.requestedCheckOutAt.toISOString() }
              : {}),
          },
        },
      });

      return updated;
    });
  }

  private async upsertSessionEvent(
    tx: Prisma.TransactionClient,
    params: {
      attendanceSessionId: string;
      employeeId: string;
      branchId: string;
      type: AttendanceEventType;
      occurredAt: Date;
    },
  ) {
    const existingEvent = await tx.attendanceEvent.findFirst({
      where: {
        attendanceSessionId: params.attendanceSessionId,
        type: params.type,
      },
      orderBy: { occurredAt: params.type === AttendanceEventType.CHECK_OUT ? 'desc' : 'asc' },
    });

    if (existingEvent) {
      await tx.attendanceEvent.update({
        where: { id: existingEvent.id },
        data: {
          occurredAt: params.occurredAt,
          decision: AttendanceDecision.ALLOW,
        },
      });
      return;
    }

    await tx.attendanceEvent.create({
      data: {
        attendanceSessionId: params.attendanceSessionId,
        employeeId: params.employeeId,
        branchId: params.branchId,
        type: params.type,
        occurredAt: params.occurredAt,
        decision: AttendanceDecision.ALLOW,
      },
    });
  }
}
