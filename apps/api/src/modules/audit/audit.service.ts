import { Injectable } from '@nestjs/common';
import { BUSINESS_RULES, PrismaService, buildPaginationQuery, applyPagination } from '@/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    cursor?: string;
    limit?: number;
    actorId?: string;
    action?: string;
    entityType?: string;
    from?: Date;
    to?: Date;
  }) {
    const { cursor, limit = BUSINESS_RULES.PAGINATION.DEFAULT_LIMIT, actorId, action, entityType, from, to } = params;

    const where: Prisma.AuditLogWhereInput = {};

    if (actorId) where.actorUserId = actorId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      ...buildPaginationQuery(cursor, limit),
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { id: true, email: true, role: true } },
      },
    });

    return applyPagination(logs, limit);
  }

  async log(
    actorUserId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType,
        entityId,
        metadataJson: metadata,
      },
    });
  }
}
