import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService, ERROR_MESSAGES, BUSINESS_RULES, buildPaginationQuery, applyPagination } from '@/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    cursor?: string;
    limit?: number;
    search?: string;
    status?: 'active' | 'inactive' | 'all';
    branchId?: string;
  }) {
    const {
      cursor,
      limit = BUSINESS_RULES.PAGINATION.DEFAULT_LIMIT,
      search,
      status = 'active',
      branchId,
    } = params;

    const where: Prisma.BranchWhereInput = {};

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (branchId) {
      where.id = branchId;
    }

    const branches = await this.prisma.branch.findMany({
      where,
      ...buildPaginationQuery(cursor, limit),
      orderBy: { createdAt: 'desc' },
      include: {
        geofence: true,
        _count: {
          select: { employees: true },
        },
      },
    });

    return applyPagination(branches, limit);
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        geofence: true,
        wifiConfigs: true,
        departments: true,
        _count: {
          select: { employees: true },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException(ERROR_MESSAGES.BRANCH.NOT_FOUND);
    }

    return branch;
  }

  async create(data: {
    code: string;
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const existing = await this.prisma.branch.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new BadRequestException(ERROR_MESSAGES.BRANCH.CODE_EXISTS);
    }

    return this.prisma.branch.create({
      data: {
        code: data.code,
        name: data.name,
        address: data.address,
        latitude: data.latitude ? new Prisma.Decimal(data.latitude) : null,
        longitude: data.longitude ? new Prisma.Decimal(data.longitude) : null,
      },
      include: { geofence: true },
    });
  }

  async update(id: string, data: {
    name?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    isActive?: boolean;
  }) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      throw new NotFoundException(ERROR_MESSAGES.BRANCH.NOT_FOUND);
    }

    return this.prisma.branch.update({
      where: { id },
      data: {
        name: data.name ?? branch.name,
        address: data.address ?? branch.address,
        latitude: data.latitude !== undefined ? new Prisma.Decimal(data.latitude) : branch.latitude,
        longitude: data.longitude !== undefined ? new Prisma.Decimal(data.longitude) : branch.longitude,
        isActive: data.isActive ?? branch.isActive,
      },
      include: { geofence: true },
    });
  }

  async remove(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });

    if (!branch) {
      throw new NotFoundException(ERROR_MESSAGES.BRANCH.NOT_FOUND);
    }

    if (branch._count.employees > 0) {
      throw new BadRequestException(ERROR_MESSAGES.BRANCH.HAS_EMPLOYEES);
    }

    return this.prisma.branch.delete({ where: { id } });
  }

  async setGeofence(id: string, data: {
    centerLat: number;
    centerLng: number;
    radiusMeters: number;
  }) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      throw new NotFoundException(ERROR_MESSAGES.BRANCH.NOT_FOUND);
    }

    return this.prisma.branchGeofence.upsert({
      where: { branchId: id },
      create: {
        branchId: id,
        centerLat: new Prisma.Decimal(data.centerLat),
        centerLng: new Prisma.Decimal(data.centerLng),
        radiusMeters: data.radiusMeters,
      },
      update: {
        centerLat: new Prisma.Decimal(data.centerLat),
        centerLng: new Prisma.Decimal(data.centerLng),
        radiusMeters: data.radiusMeters,
      },
    });
  }

  async setWifiConfig(id: string, data: {
    ssid?: string;
    bssid?: string;
    isActive?: boolean;
  }) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      throw new NotFoundException(ERROR_MESSAGES.BRANCH.NOT_FOUND);
    }

    return this.prisma.branchWifiConfig.create({
      data: {
        branchId: id,
        ssid: data.ssid,
        bssid: data.bssid,
        isActive: data.isActive ?? true,
      },
    });
  }
}
