import { Controller, Get, Query, UseGuards, ForbiddenException, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { AttendanceStatus, JwtAuthGuard, RolesGuard, Roles, UserRole, isEnumValue, CurrentUser } from '@/common';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private buildDownloadUrl(params: {
    from: string;
    to: string;
    branchId?: string;
    departmentId?: string;
  }): string {
    const query = new URLSearchParams({
      from: params.from,
      to: params.to,
    });

    if (params.branchId) {
      query.set('branchId', params.branchId);
    }
    if (params.departmentId) {
      query.set('departmentId', params.departmentId);
    }

    const apiPrefix = process.env.API_PREFIX || 'api';
    return `/${apiPrefix}/reports/download?${query.toString()}`;
  }

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

  @Get('attendance')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get attendance report with filters' })
  @ApiResponse({ status: 200, description: 'Attendance report' })
  getAttendanceReport(
    @CurrentUser('role') role: UserRole,
    @CurrentUser('employee') employee: { branchId?: string | null } | null,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('branchId') branchId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const effectiveBranchId = this.resolveManagerBranchId(role, employee, branchId);
    return this.reportsService.getAttendanceReport({
      from: new Date(from),
      to: new Date(to),
      branchId: effectiveBranchId,
      departmentId,
      employeeId,
      status: isEnumValue(AttendanceStatus, status) ? status : undefined,
      page: page ?? 1,
      pageSize: pageSize ?? 50,
    });
  }

  @Get('export')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Export attendance data as CSV' })
  @ApiResponse({ status: 200, description: 'CSV export metadata' })
  async exportAttendance(
    @CurrentUser('role') role: UserRole,
    @CurrentUser('employee') employee: { branchId?: string | null } | null,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('branchId') branchId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    const effectiveBranchId = this.resolveManagerBranchId(role, employee, branchId);
    const result = await this.reportsService.exportAttendance({
      from: new Date(from),
      to: new Date(to),
      branchId: effectiveBranchId,
      departmentId,
    });

    return {
      filename: result.filename,
      contentType: result.contentType,
      totalMatched: result.total,
      exportedCount: result.returned,
      truncated: result.truncated,
      limit: result.limit,
      downloadUrl: this.buildDownloadUrl({
        from,
        to,
        branchId: effectiveBranchId,
        departmentId,
      }),
    };
  }

  @Get('download')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Download attendance export as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async downloadAttendance(
    @CurrentUser('role') role: UserRole,
    @CurrentUser('employee') employee: { branchId?: string | null } | null,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('branchId') branchId?: string,
    @Query('departmentId') departmentId?: string,
    @Res({ passthrough: true }) response?: Response,
  ) {
    const effectiveBranchId = this.resolveManagerBranchId(role, employee, branchId);
    const result = await this.reportsService.exportAttendance({
      from: new Date(from),
      to: new Date(to),
      branchId: effectiveBranchId,
      departmentId,
    });

    response?.setHeader('Content-Type', `${result.contentType}; charset=utf-8`);
    response?.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

    return result.csv;
  }
}
