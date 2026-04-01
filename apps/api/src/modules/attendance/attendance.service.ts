import { Injectable, ConflictException, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  AttendanceDecision,
  AttendanceEventType,
  AttendanceStatus,
  ApprovalStatus,
  PrismaService,
  RiskLevel,
  ERROR_MESSAGES,
  BUSINESS_RULES,
  getDateRange,
  getTodayDateRange,
  isLateCheckIn,
  calculateMinutesBetween,
  calculateOvertimeMinutes,
  buildPaginationQuery,
  applyPagination,
} from '@/common';
import { Prisma } from '@prisma/client';

export interface RiskScoreResult {
  score: number;
  level: RiskLevel;
  decision: AttendanceDecision;
  flags: { code: string; message: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' }[];
}

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async checkIn(employeeId: string, dto: {
    latitude: number;
    longitude: number;
    accuracy: number;
    speed?: number;
    heading?: number;
    timestamp: string;
    nonce: string;
    deviceId: string;
  }) {
    // 1. Check duplicate nonce
    const existingNonce = await this.prisma.attendanceEvent.findUnique({
      where: { employeeId_nonce: { employeeId, nonce: dto.nonce } },
    });

    if (existingNonce) {
      throw new ConflictException(ERROR_MESSAGES.ATTENDANCE.DUPLICATE_NONCE);
    }

    // 2. Get employee with branch geofence
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        branch: {
          include: { geofence: true },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(ERROR_MESSAGES.EMPLOYEE.NOT_FOUND);
    }

    // 3. Check if already checked in today
    const { start: today, end: tomorrow } = getTodayDateRange();

    const existingSession = await this.prisma.attendanceSession.findFirst({
      where: {
        employeeId,
        workDate: { gte: today, lt: tomorrow },
      },
    });

    if (existingSession?.checkInAt && existingSession.status !== null) {
      throw new BadRequestException(ERROR_MESSAGES.ATTENDANCE.ALREADY_CHECKED_IN);
    }

    // 4. Calculate risk score
    const riskResult = this.calculateRiskScore(
      dto.latitude,
      dto.longitude,
      dto.accuracy,
      dto.speed,
      employee.branch.geofence,
    );

    // 5. Determine decision
    const decision = riskResult.decision;
    const isRecorded = decision !== AttendanceDecision.REJECT;

    // 6. Calculate distance
    const distance = employee.branch.geofence
      ? this.calculateDistance(
          dto.latitude,
          dto.longitude,
          Number(employee.branch.geofence.centerLat),
          Number(employee.branch.geofence.centerLng),
        )
      : 0;

    // 7. Determine attendance status
    const now = new Date();
    const status = isLateCheckIn(now, BUSINESS_RULES.CHECK_IN_HOUR_THRESHOLD)
      ? AttendanceStatus.LATE
      : AttendanceStatus.ON_TIME;

    // 8. Create session and event in transaction
    const isFlagged = decision !== AttendanceDecision.ALLOW;

    const session = await this.prisma.$transaction(async (tx) => {
      const sessionData = {
        branchId: employee.branchId,
        workDate: today,
        status: isRecorded ? status : null,
        checkInAt: now,
        checkOutAt: null,
        totalMinutes: null,
        overtimeMinutes: 0,
        riskScore: riskResult.score,
        isFlagged,
      };

      const currentSession = existingSession
        ? await tx.attendanceSession.update({
            where: { id: existingSession.id },
            data: sessionData,
          })
        : await tx.attendanceSession.create({
            data: {
              employeeId,
              ...sessionData,
            },
          });

      await tx.attendanceEvent.create({
        data: {
          attendanceSessionId: currentSession.id,
          employeeId,
          branchId: employee.branchId,
          type: !isRecorded
            ? AttendanceEventType.REJECTED
            : AttendanceEventType.CHECK_IN,
          occurredAt: now,
          latitude: new Prisma.Decimal(dto.latitude),
          longitude: new Prisma.Decimal(dto.longitude),
          accuracyMeters: dto.accuracy,
          speedMps: dto.speed ?? null,
          distanceMeters: distance,
          nonce: dto.nonce,
          decision: decision,
        },
      });

      if (existingSession) {
        await tx.attendanceFlag.deleteMany({
          where: { attendanceSessionId: existingSession.id },
        });
      }

      // Replace flags for the current day's final session state.
      if (riskResult.flags.length > 0) {
        await tx.attendanceFlag.createMany({
          data: riskResult.flags.map((flag) => ({
            attendanceSessionId: currentSession.id,
            code: flag.code,
            message: flag.message,
            severity: flag.severity,
          })),
        });
      }

      return currentSession;
    });

    return {
      status: 'SUCCESS',
      sessionId: session.id,
      attendanceStatus: isRecorded ? status : null,
      riskLevel: riskResult.level,
      distanceMeters: distance,
      recorded: isRecorded,
      flagged: isFlagged,
      message: !isRecorded
        ? ERROR_MESSAGES.ATTENDANCE.CHECKIN_PENDING_REVIEW
        : isFlagged
          ? ERROR_MESSAGES.ATTENDANCE.CHECKIN_FLAGGED
          : ERROR_MESSAGES.ATTENDANCE.CHECKIN_SUCCESS,
      riskScore: riskResult.score,
      flags: riskResult.flags,
    };
  }

  async checkOut(employeeId: string, dto: {
    latitude: number;
    longitude: number;
    accuracy: number;
    speed?: number;
    heading?: number;
    timestamp: string;
    nonce: string;
    deviceId: string;
  }) {
    // Check duplicate nonce
    const existingNonce = await this.prisma.attendanceEvent.findUnique({
      where: { employeeId_nonce: { employeeId, nonce: dto.nonce } },
    });

    if (existingNonce) {
      throw new ConflictException(ERROR_MESSAGES.ATTENDANCE.DUPLICATE_NONCE);
    }

    // Get open session for today
    const { start: today, end: tomorrow } = getTodayDateRange();

    const session = await this.prisma.attendanceSession.findFirst({
      where: {
        employeeId,
        workDate: { gte: today, lt: tomorrow },
        checkInAt: { not: null },
        checkOutAt: null,
      },
      include: { branch: { include: { geofence: true } } },
    });

    if (!session) {
      throw new BadRequestException(ERROR_MESSAGES.ATTENDANCE.NO_OPEN_SESSION);
    }
    if (!session.checkInAt) {
      throw new BadRequestException(ERROR_MESSAGES.ATTENDANCE.SESSION_MISSING_CHECKIN);
    }

    // Calculate risk score (lighter for checkout)
    const riskResult = this.calculateRiskScore(
      dto.latitude,
      dto.longitude,
      dto.accuracy,
      dto.speed,
      session.branch.geofence,
    );

    const distance = session.branch.geofence
      ? this.calculateDistance(
          dto.latitude,
          dto.longitude,
          Number(session.branch.geofence.centerLat),
          Number(session.branch.geofence.centerLng),
        )
      : 0;

    const now = new Date();
    const totalMinutes = calculateMinutesBetween(session.checkInAt, now);
    const overtimeMinutes = calculateOvertimeMinutes(totalMinutes, BUSINESS_RULES.DEFAULT_WORKING_MINUTES);

    const updatedSession = await this.prisma.$transaction(async (tx) => {
      await tx.attendanceEvent.create({
        data: {
          attendanceSessionId: session.id,
          employeeId,
          branchId: session.branchId,
          type: AttendanceEventType.CHECK_OUT,
          occurredAt: now,
          latitude: new Prisma.Decimal(dto.latitude),
          longitude: new Prisma.Decimal(dto.longitude),
          accuracyMeters: dto.accuracy,
          speedMps: dto.speed ?? null,
          distanceMeters: distance,
          nonce: dto.nonce,
          decision: AttendanceDecision.ALLOW,
        },
      });

      return tx.attendanceSession.update({
        where: { id: session.id },
        data: {
          checkOutAt: now,
          totalMinutes,
          overtimeMinutes,
          status: overtimeMinutes > 0 ? AttendanceStatus.OVERTIME : session.status,
        },
        include: { events: { orderBy: { occurredAt: 'asc' } }, flags: true },
      });
    });

    return {
      status: 'SUCCESS',
      sessionId: updatedSession.id,
      checkOutAt: updatedSession.checkOutAt,
      totalMinutes,
      overtimeMinutes,
      message: ERROR_MESSAGES.ATTENDANCE.CHECKOUT_SUCCESS,
    };
  }

  async getTodayAttendance(employeeId: string) {
    const { start: today, end: tomorrow } = getTodayDateRange();

    const session = await this.prisma.attendanceSession.findFirst({
      where: {
        employeeId,
        workDate: { gte: today, lt: tomorrow },
      },
      include: {
        events: { orderBy: { occurredAt: 'asc' } },
        flags: true,
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    return session;
  }

  async getHistory(employeeId: string, params: {
    cursor?: string;
    limit?: number;
    from?: string;
    to?: string;
  }) {
    const { cursor, limit = BUSINESS_RULES.PAGINATION.DEFAULT_LIMIT, from, to } = params;
    const normalizedLimit = Math.min(
      Math.max(limit, 1),
      BUSINESS_RULES.PAGINATION.MAX_LIMIT,
    );

    const where: Prisma.AttendanceSessionWhereInput = { employeeId };

    if (from || to) {
      where.workDate = {};
      if (from) where.workDate.gte = new Date(from);
      if (to) where.workDate.lte = new Date(to);
    }

    const sessions = await this.prisma.attendanceSession.findMany({
      where,
      ...buildPaginationQuery(cursor, normalizedLimit),
      orderBy: { workDate: 'desc' },
      include: {
        events: { orderBy: { occurredAt: 'asc' } },
        flags: true,
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    return applyPagination(sessions, normalizedLimit);
  }

  async requestCorrection(employeeId: string, actorUserId: string, dto: {
    attendanceSessionId: string;
    reason: string;
    requestedCheckInAt?: string;
    requestedCheckOutAt?: string;
  }) {
    const session = await this.prisma.attendanceSession.findFirst({
      where: {
        id: dto.attendanceSessionId,
        employeeId,
      },
    });

    if (!session) {
      throw new NotFoundException(ERROR_MESSAGES.ATTENDANCE.NOT_FOUND);
    }

    const requestedCheckInAt = dto.requestedCheckInAt
      ? this.parseRequestedTimestamp(dto.requestedCheckInAt, 'requestedCheckInAt')
      : null;
    const requestedCheckOutAt = dto.requestedCheckOutAt
      ? this.parseRequestedTimestamp(dto.requestedCheckOutAt, 'requestedCheckOutAt')
      : null;

    if (!requestedCheckInAt && !requestedCheckOutAt) {
      throw new BadRequestException('At least one requested correction timestamp is required');
    }

    this.assertTimestampWithinSessionDay(session.workDate, requestedCheckInAt, 'requestedCheckInAt');
    this.assertTimestampWithinSessionDay(session.workDate, requestedCheckOutAt, 'requestedCheckOutAt');

    if (
      requestedCheckInAt &&
      requestedCheckOutAt &&
      requestedCheckOutAt < requestedCheckInAt
    ) {
      throw new BadRequestException('requestedCheckOutAt must be after requestedCheckInAt');
    }

    return this.prisma.$transaction(async (tx) => {
      const approval = await tx.approvalRequest.create({
        data: {
          employeeId,
          branchId: session.branchId,
          attendanceSessionId: session.id,
          reason: dto.reason,
          status: ApprovalStatus.PENDING,
          requestedCheckInAt,
          requestedCheckOutAt,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: 'REQUEST_ATTENDANCE_CORRECTION',
          entityType: 'ApprovalRequest',
          entityId: approval.id,
          metadataJson: {
            sessionId: session.id,
            reason: dto.reason,
            ...(requestedCheckInAt
              ? { requestedCheckInAt: requestedCheckInAt.toISOString() }
              : {}),
            ...(requestedCheckOutAt
              ? { requestedCheckOutAt: requestedCheckOutAt.toISOString() }
              : {}),
          },
        },
      });

      return approval;
    });
  }

  async recordAttendanceReview(
    sessionId: string,
    reviewerId: string,
    note?: string,
    scopeBranchId?: string,
  ) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
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
      },
    });

    if (!session) {
      throw new NotFoundException(ERROR_MESSAGES.ATTENDANCE.NOT_FOUND);
    }

    if (scopeBranchId && session.branchId !== scopeBranchId) {
      throw new ForbiddenException('You do not have access to this attendance session');
    }

    if (!session.checkInAt) {
      throw new BadRequestException('Attendance session is missing check-in time');
    }

    const nextStatus = this.resolveRecordedStatus(session.checkInAt, session.checkOutAt);
    const totalMinutes = session.checkOutAt
      ? calculateMinutesBetween(session.checkInAt, session.checkOutAt)
      : session.totalMinutes;
    const overtimeMinutes =
      session.checkOutAt && totalMinutes !== null
        ? calculateOvertimeMinutes(totalMinutes, BUSINESS_RULES.DEFAULT_WORKING_MINUTES)
        : session.overtimeMinutes;

    return this.prisma.$transaction(async (tx) => {
      const updatedSession = await tx.attendanceSession.update({
        where: { id: sessionId },
        data: {
          status: nextStatus,
          totalMinutes,
          overtimeMinutes,
          isFlagged: false,
          riskScore: 0,
        },
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
        },
      });

      await tx.attendanceFlag.deleteMany({
        where: { attendanceSessionId: sessionId },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: reviewerId,
          action: 'RECORD_ATTENDANCE_AFTER_REVIEW',
          entityType: 'AttendanceSession',
          entityId: sessionId,
          metadataJson: {
            sessionId,
            previousStatus: session.status,
            nextStatus,
            previousRiskScore: session.riskScore,
            previousFlagCount: session.flags.length,
            ...(note ? { note } : {}),
          },
        },
      });

      return {
        ...updatedSession,
        flags: [],
      };
    });
  }

  private resolveRecordedStatus(checkInAt: Date, checkOutAt: Date | null): AttendanceStatus {
    let status = isLateCheckIn(checkInAt, BUSINESS_RULES.CHECK_IN_HOUR_THRESHOLD)
      ? AttendanceStatus.LATE
      : AttendanceStatus.ON_TIME;

    if (checkOutAt) {
      const totalMinutes = calculateMinutesBetween(checkInAt, checkOutAt);
      const overtimeMinutes = calculateOvertimeMinutes(totalMinutes, BUSINESS_RULES.DEFAULT_WORKING_MINUTES);

      if (overtimeMinutes > 0) {
        status = AttendanceStatus.OVERTIME;
      } else if (totalMinutes < BUSINESS_RULES.DEFAULT_WORKING_MINUTES) {
        status = AttendanceStatus.EARLY_CHECKOUT;
      }
    }

    return status;
  }

  private calculateRiskScore(
    lat: number,
    lng: number,
    accuracy: number,
    speed: number | undefined,
    geofence: { centerLat: Prisma.Decimal; centerLng: Prisma.Decimal; radiusMeters: number } | null,
  ): RiskScoreResult {
    let score = 0;
    const flags: { code: string; message: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' }[] = [];

    if (geofence) {
      const distance = this.calculateDistance(
        lat,
        lng,
        Number(geofence.centerLat),
        Number(geofence.centerLng),
      );

      const doubleRadius = geofence.radiusMeters * BUSINESS_RULES.GEOFENCE.DOUBLE_RADIUS_MULTIPLIER;
      if (distance > doubleRadius) {
        score += 100;
        flags.push({
          code: 'OUTSIDE_GEOFENCE',
          message: `Location is ${Math.round(distance)}m from branch (radius: ${geofence.radiusMeters}m)`,
          severity: 'HIGH',
        });
      } else if (distance > geofence.radiusMeters) {
        score += 50;
        flags.push({
          code: 'EDGE_GEOFENCE',
          message: `Location is ${Math.round(distance)}m from branch`,
          severity: 'MEDIUM',
        });
      }
    }

    if (accuracy > BUSINESS_RULES.GPS_ACCURACY.POOR_THRESHOLD) {
      score += 25;
      flags.push({
        code: 'POOR_ACCURACY',
        message: `GPS accuracy is ${Math.round(accuracy)}m`,
        severity: accuracy > BUSINESS_RULES.GPS_ACCURACY.VERY_POOR_THRESHOLD ? 'HIGH' : 'MEDIUM',
      });
    }

    if (speed !== undefined && speed > BUSINESS_RULES.SPEED.IMPOSSIBLE) {
      score += 40;
      flags.push({
        code: 'IMPOSSIBLE_SPEED',
        message: `Movement speed ${Math.round(speed)}m/s detected`,
        severity: 'HIGH',
      });
    }

    let level: RiskLevel;
    let decision: AttendanceDecision;

    if (score >= BUSINESS_RULES.RISK_SCORE.REJECT_THRESHOLD) {
      level = RiskLevel.HIGH;
      decision = AttendanceDecision.REJECT;
    } else if (score >= BUSINESS_RULES.RISK_SCORE.FLAG_THRESHOLD) {
      level = RiskLevel.MEDIUM;
      decision = AttendanceDecision.ALLOW_WITH_FLAG;
    } else {
      level = RiskLevel.LOW;
      decision = AttendanceDecision.ALLOW;
    }

    return { score, level, decision, flags };
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    // Haversine formula
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private parseRequestedTimestamp(value: string, fieldName: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid ISO timestamp`);
    }

    return date;
  }

  private assertTimestampWithinSessionDay(
    sessionWorkDate: Date,
    timestamp: Date | null,
    fieldName: string,
  ) {
    if (!timestamp) {
      return;
    }

    const { start, end } = getDateRange(sessionWorkDate);
    if (timestamp < start || timestamp >= end) {
      throw new BadRequestException(`${fieldName} must stay within the session work date`);
    }
  }
}
