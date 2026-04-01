import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService, ERROR_MESSAGES, BUSINESS_RULES, buildPaginationQuery, applyPagination, getTodayDateRange } from '@/common';
import { Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    cursor?: string;
    limit?: number;
    branchId?: string;
    scopeBranchId?: string;
    departmentId?: string;
    search?: string;
    status?: 'active' | 'inactive' | 'all';
  }) {
    const {
      cursor,
      limit = BUSINESS_RULES.PAGINATION.DEFAULT_LIMIT,
      branchId,
      scopeBranchId,
      departmentId,
      search,
      status = 'active',
    } = params;

    const where: Prisma.EmployeeWhereInput = {};

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    const effectiveBranchId = scopeBranchId ?? branchId;
    if (effectiveBranchId) {
      where.branchId = effectiveBranchId;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const employees = await this.prisma.employee.findMany({
      where,
      ...buildPaginationQuery(cursor, limit),
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, role: true } },
      },
    });

    return applyPagination(employees, limit);
  }

  async findOne(id: string, scopeBranchId?: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        branch: true,
        department: true,
        user: { select: { id: true, email: true, role: true, isActive: true } },
        sessions: {
          take: 10,
          orderBy: { workDate: 'desc' },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(ERROR_MESSAGES.EMPLOYEE.NOT_FOUND);
    }

    if (scopeBranchId && employee.branchId !== scopeBranchId) {
      throw new ForbiddenException('You do not have access to this employee');
    }

    return employee;
  }

  async findByUserId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (!user?.employee) {
      throw new NotFoundException(ERROR_MESSAGES.EMPLOYEE.NOT_FOUND);
    }

    return this.findOne(user.employee.id);
  }

  async create(data: {
    employeeCode: string;
    fullName: string;
    phone?: string;
    branchId: string;
    departmentId?: string;
    email: string;
    password: string;
    createdByUserId: string;
  }) {
    const existingEmployee = await this.prisma.employee.findFirst({
      where: { branchId: data.branchId, employeeCode: data.employeeCode },
    });

    if (existingEmployee) {
      throw new BadRequestException(ERROR_MESSAGES.EMPLOYEE.CODE_EXISTS);
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new BadRequestException(ERROR_MESSAGES.EMPLOYEE.EMAIL_EXISTS);
    }

    const passwordHash = await hash(data.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          employeeCode: data.employeeCode,
          fullName: data.fullName,
          phone: data.phone,
          branchId: data.branchId,
          departmentId: data.departmentId,
          user: {
            create: {
              email: data.email,
              passwordHash,
              role: 'EMPLOYEE',
            },
          },
        },
        include: {
          branch: true,
          department: true,
          user: { select: { id: true, email: true, role: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: data.createdByUserId,
          action: 'CREATE_EMPLOYEE',
          entityType: 'Employee',
          entityId: employee.id,
          metadataJson: {
            employeeCode: data.employeeCode,
            fullName: data.fullName,
            branchId: data.branchId,
          },
        },
      });

      return employee;
    });
  }

  async update(id: string, data: {
    fullName?: string;
    phone?: string;
    branchId?: string;
    departmentId?: string;
    isActive?: boolean;
  }) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      throw new NotFoundException(ERROR_MESSAGES.EMPLOYEE.NOT_FOUND);
    }

    return this.prisma.employee.update({
      where: { id },
      data: {
        fullName: data.fullName ?? employee.fullName,
        phone: data.phone ?? employee.phone,
        branchId: data.branchId ?? employee.branchId,
        departmentId: data.departmentId ?? employee.departmentId,
        isActive: data.isActive ?? employee.isActive,
      },
      include: {
        branch: true,
        department: true,
        user: { select: { id: true, email: true, role: true } },
      },
    });
  }

  async assignBranch(id: string, branchId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      throw new NotFoundException(ERROR_MESSAGES.EMPLOYEE.NOT_FOUND);
    }

    return this.prisma.employee.update({
      where: { id },
      data: { branchId },
      include: { branch: true },
    });
  }

  async assignDepartment(id: string, departmentId: string | null) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      throw new NotFoundException(ERROR_MESSAGES.EMPLOYEE.NOT_FOUND);
    }

    return this.prisma.employee.update({
      where: { id },
      data: { departmentId },
      include: { department: true },
    });
  }

  async getTodayAttendance(employeeId: string) {
    const { start: today, end: tomorrow } = getTodayDateRange();

    const session = await this.prisma.attendanceSession.findFirst({
      where: {
        employeeId,
        workDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        events: { orderBy: { occurredAt: 'asc' } },
        flags: true,
      },
    });

    return session;
  }
}
