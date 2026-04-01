import { Controller, Get, Query, UseGuards, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard, RolesGuard, Roles, UserRole, CurrentUser } from '@/common';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  private resolveManagerBranchId(
    role: UserRole,
    employee: { branchId?: string | null } | null | undefined,
    branchId?: string,
  ): string | undefined {
    if (role === UserRole.MANAGER) {
      if (!employee?.branchId) {
        throw new ForbiddenException('Manager branch context is required');
      }

      return employee.branchId;
    }

    return branchId;
  }

  @Get('system-summary')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get system-wide dashboard summary' })
  @ApiResponse({ status: 200, description: 'System summary' })
  getSystemSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('branchId') branchId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.dashboardService.getSystemSummary({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      branchId,
      departmentId,
    });
  }

  @Get('branch-summary')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get branch dashboard summary' })
  @ApiResponse({ status: 200, description: 'Branch summary' })
  getBranchSummary(
    @CurrentUser('role') role: UserRole,
    @CurrentUser('employee') employee: { branchId?: string | null } | null,
    @Query('branchId') branchId: string,
    @Query('date') date?: string,
  ) {
    const effectiveBranchId = this.resolveManagerBranchId(role, employee, branchId) ?? branchId;
    if (!effectiveBranchId) {
      throw new BadRequestException('branchId is required');
    }

    return this.dashboardService.getBranchSummary(
      effectiveBranchId,
      date ? new Date(date) : undefined,
    );
  }

  @Get('trends')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get attendance trends' })
  @ApiResponse({ status: 200, description: 'Trends data' })
  getTrends(
    @CurrentUser('role') role: UserRole,
    @CurrentUser('employee') employee: { branchId?: string | null } | null,
    @Query('branchId') branchId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('days') days?: number,
  ) {
    return this.dashboardService.getTrends({
      branchId: this.resolveManagerBranchId(role, employee, branchId),
      departmentId,
      days,
    });
  }

  @Get('heatmap')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get attendance heatmap' })
  @ApiResponse({ status: 200, description: 'Heatmap data' })
  getHeatmap(
    @CurrentUser('role') role: UserRole,
    @CurrentUser('employee') employee: { branchId?: string | null } | null,
    @Query('branchId') branchId?: string,
  ) {
    return this.dashboardService.getHeatmap(this.resolveManagerBranchId(role, employee, branchId));
  }
}


