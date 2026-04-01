import { Injectable } from '@nestjs/common';
import { AttendanceStatus, PrismaService } from '@/common';
import { Prisma } from '@prisma/client';
import { ReportsService } from '../reports';
import type {
  AttendanceDashboardSummary,
} from '@smart-attendance/shared-types';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private reportsService: ReportsService,
  ) {}

  async getSystemSummary(params: {
    from?: Date;
    to?: Date;
    branchId?: string;
    departmentId?: string;
  }): Promise<AttendanceDashboardSummary> {
    const { from, to, branchId, departmentId } = params;

    const whereClause: Prisma.AttendanceSessionWhereInput = {};
    const employeeScope: Prisma.EmployeeWhereInput = { isActive: true };

    if (from || to) {
      whereClause.workDate = {};
      if (from) whereClause.workDate.gte = from;
      if (to) whereClause.workDate.lte = to;
    }

    if (branchId) whereClause.branchId = branchId;
    if (branchId) {
      employeeScope.branchId = branchId;
    }
    if (departmentId) {
      whereClause.employee = { departmentId };
      employeeScope.departmentId = departmentId;
    }

    const recordedWhereClause: Prisma.AttendanceSessionWhereInput = {
      ...whereClause,
      status: { not: null },
    };

    const unrecordedWhereClause: Prisma.AttendanceSessionWhereInput = {
      ...whereClause,
      checkInAt: { not: null },
      status: null,
    };

    const reviewRequiredWhereClause: Prisma.AttendanceSessionWhereInput = {
      ...whereClause,
      OR: [{ status: null }, { isFlagged: true }],
    };

    const [totalEmployees, totalSessions, flaggedSessions, lateSessions, recordedSessions, unrecordedSessions, reviewRequiredSessions] = await Promise.all([
      this.prisma.employee.count({ where: employeeScope }),
      this.prisma.attendanceSession.count({ where: whereClause }),
      this.prisma.attendanceSession.count({ where: { ...whereClause, isFlagged: true } }),
      this.prisma.attendanceSession.count({ where: { ...whereClause, status: AttendanceStatus.LATE } }),
      this.prisma.attendanceSession.count({ where: recordedWhereClause }),
      this.prisma.attendanceSession.count({ where: unrecordedWhereClause }),
      this.prisma.attendanceSession.count({ where: reviewRequiredWhereClause }),
    ]);

    const branchCount = branchId || departmentId
      ? (
          await this.prisma.employee.findMany({
            where: employeeScope,
            distinct: ['branchId'],
            select: { branchId: true },
          })
        ).length
      : await this.prisma.branch.count({ where: { isActive: true } });

    return {
      totalEmployees,
      totalSessions,
      recordedSessions,
      unrecordedSessions,
      reviewRequiredSessions,
      flaggedSessions,
      lateSessions,
      branchCount,
      flaggedRate: totalSessions > 0 ? Math.round((flaggedSessions / totalSessions) * 100) : 0,
      lateRate: totalSessions > 0 ? Math.round((lateSessions / totalSessions) * 100) : 0,
    };
  }

  async getBranchSummary(branchId: string, date?: Date, managerUserId?: string) {
    const targetDate = date || new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const reviewRequiredWhereClause: Prisma.AttendanceSessionWhereInput = {
      branchId,
      workDate: { gte: targetDate, lt: nextDay },
      OR: [{ status: null }, { isFlagged: true }],
    };

    if (managerUserId) {
      reviewRequiredWhereClause.employee = { managerUserId };
    }

    const [branch, totalEmployees, checkedIn, unrecordedCount, lateCount, flaggedCount, reviewRequiredCount] = await Promise.all([
      this.prisma.branch.findUnique({
        where: { id: branchId },
        include: { geofence: true },
      }),
      this.prisma.employee.count({
        where: {
          branchId,
          isActive: true,
          ...(managerUserId ? { managerUserId } : {}),
        },
      }),
      this.prisma.attendanceSession.count({
        where: {
          branchId,
          workDate: { gte: targetDate, lt: nextDay },
          checkInAt: { not: null },
          status: { not: null },
          ...(managerUserId ? { employee: { managerUserId } } : {}),
        },
      }),
      this.prisma.attendanceSession.count({
        where: {
          branchId,
          workDate: { gte: targetDate, lt: nextDay },
          checkInAt: { not: null },
          status: null,
          ...(managerUserId ? { employee: { managerUserId } } : {}),
        },
      }),
      this.prisma.attendanceSession.count({
        where: {
          branchId,
          workDate: { gte: targetDate, lt: nextDay },
          status: AttendanceStatus.LATE,
          ...(managerUserId ? { employee: { managerUserId } } : {}),
        },
      }),
      this.prisma.attendanceSession.count({
        where: {
          branchId,
          workDate: { gte: targetDate, lt: nextDay },
          isFlagged: true,
          ...(managerUserId ? { employee: { managerUserId } } : {}),
        },
      }),
      this.prisma.attendanceSession.count({ where: reviewRequiredWhereClause }),
    ]);

    return {
      branch: branch ? { id: branch.id, name: branch.name, code: branch.code } : null,
      totalEmployees,
      checkedIn,
      unrecordedCount,
      notCheckedIn: totalEmployees - checkedIn,
      lateCount,
      flaggedCount,
      reviewRequiredCount,
      attendanceRate: totalEmployees > 0 ? Math.round((checkedIn / totalEmployees) * 100) : 0,
    };
  }

  async getTrends(params: {
    branchId?: string;
    departmentId?: string;
    managerUserId?: string;
    days?: number;
  }) {
    const { branchId, departmentId, managerUserId, days = 7 } = params;

    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    const whereClause: Prisma.AttendanceSessionWhereInput = {
      workDate: { gte: from },
    };

    if (branchId) whereClause.branchId = branchId;

    const employeeWhere: Prisma.EmployeeWhereInput = {};
    if (departmentId) employeeWhere.departmentId = departmentId;
    if (managerUserId) employeeWhere.managerUserId = managerUserId;
    if (Object.keys(employeeWhere).length > 0) {
      whereClause.employee = employeeWhere;
    }

    const sessions = await this.prisma.attendanceSession.groupBy({
      by: ['workDate', 'status'],
      where: whereClause,
      _count: true,
    });

    const trendMap = new Map<string, { date: string; status: string; count: number }>();

    for (const session of sessions) {
      const dateKey = session.workDate.toISOString().split('T')[0];
      const key = `${dateKey}_${session.status}`;
      trendMap.set(key, {
        date: dateKey,
        status: session.status || 'UNKNOWN',
        count: session._count,
      });
    }

    return Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getHeatmap(branchId?: string, params?: {
    page?: number;
    pageSize?: number;
  }, managerUserId?: string) {
    const { page = 1, pageSize = 30 } = params || {};
    const from = new Date();
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);

    const whereClause: Prisma.AttendanceSessionWhereInput = {
      workDate: { gte: from },
    };

    if (branchId) whereClause.branchId = branchId;
    if (managerUserId) whereClause.employee = { managerUserId };

    const [heatmap, branches] = await Promise.all([
      this.prisma.attendanceSession.groupBy({
        by: ['branchId', 'workDate'],
        where: whereClause,
        _count: true,
        _avg: { riskScore: true },
        orderBy: { workDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.branch.findMany({
        where: branchId ? { id: branchId } : {},
        select: { id: true, name: true },
      }),
    ]);

    const total = await this.prisma.attendanceSession.groupBy({
      by: ['branchId', 'workDate'],
      where: whereClause,
      _count: true,
    });

    const branchMap = new Map(branches.map((b) => [b.id, b.name]));

    return {
      items: heatmap.map((h) => ({
        branchId: h.branchId,
        branchName: branchMap.get(h.branchId) || 'Unknown',
        date: h.workDate.toISOString().split('T')[0],
        count: h._count,
        avgRiskScore: h._avg.riskScore || 0,
      })),
      total: total.length,
      page,
      pageSize,
      totalPages: Math.ceil(total.length / pageSize),
    };
  }

  async getReviewQueue(params: {
    branchId?: string;
    departmentId?: string;
    scopeManagerUserId?: string;
    from?: Date;
    to?: Date;
    page?: number;
    pageSize?: number;
  }): ReturnType<ReportsService['getAttendanceReport']> {
    const from = params.from ?? (() => {
      const rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - 6);
      rangeStart.setHours(0, 0, 0, 0);
      return rangeStart;
    })();

    const to = params.to ?? (() => {
      const rangeEnd = new Date();
      rangeEnd.setHours(23, 59, 59, 999);
      return rangeEnd;
    })();

    return this.reportsService.getAttendanceReport({
      from,
      to,
      branchId: params.branchId,
      departmentId: params.departmentId,
      scopeManagerUserId: params.scopeManagerUserId,
      needsReview: true,
      page: params.page,
      pageSize: params.pageSize,
    });
  }
}
