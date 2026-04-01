import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApprovalsService } from './approvals.service';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, UserRole } from '@/common';
import { ApprovalsQueryDto, RejectApprovalDto } from './dto';

@ApiTags('approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

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

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List all approval requests' })
  @ApiResponse({ status: 200, description: 'Approvals retrieved' })
  findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @CurrentUser('employee') employee: { branchId?: string | null } | null,
    @Query() query: ApprovalsQueryDto,
  ) {
    return this.approvalsService.findAll({
      ...query,
      branchId: query.branchId,
      scopeBranchId: this.resolveManagerBranchId(role, employee),
      scopeManagerUserId: role === UserRole.MANAGER ? userId : undefined,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get approval request by ID' })
  @ApiResponse({ status: 200, description: 'Approval request retrieved' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @CurrentUser('employee') employee: { branchId?: string | null } | null,
  ) {
    return this.approvalsService.findOne(
      id,
      this.resolveManagerBranchId(role, employee),
      role === UserRole.MANAGER ? userId : undefined,
    );
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a correction request' })
  @ApiResponse({ status: 200, description: 'Approved' })
  approve(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @CurrentUser('employee') employee: { branchId?: string | null } | null,
  ) {
    return this.approvalsService.approve(
      id,
      userId,
      this.resolveManagerBranchId(role, employee),
      role === UserRole.MANAGER ? userId : undefined,
    );
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a correction request' })
  @ApiResponse({ status: 200, description: 'Rejected' })
  reject(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @CurrentUser('employee') employee: { branchId?: string | null } | null,
    @Body() dto: RejectApprovalDto,
  ) {
    return this.approvalsService.reject(
      id,
      userId,
      dto.reason,
      this.resolveManagerBranchId(role, employee),
      role === UserRole.MANAGER ? userId : undefined,
    );
  }
}
