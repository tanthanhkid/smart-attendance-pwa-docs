import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Put,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { JwtAuthGuard, RolesGuard, Roles, UserRole, CurrentUser } from '@/common';
import {
  CreateBranchDto,
  UpdateBranchDto,
  SetGeofenceDto,
  SetWifiConfigDto,
  BranchQueryDto,
} from './dto';

@ApiTags('branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  private requireManagerBranchId(employee: { branchId?: string | null } | null | undefined): string {
    if (!employee?.branchId) {
      throw new ForbiddenException('Manager branch context is required');
    }

    return employee.branchId;
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List all branches' })
  @ApiResponse({ status: 200, description: 'Branches retrieved' })
  findAll(
    @CurrentUser('role') role: UserRole,
    @CurrentUser('employee') employee: { branchId?: string | null } | null,
    @Query() query: BranchQueryDto,
  ) {
    return this.branchesService.findAll({
      ...query,
      branchId: role === UserRole.MANAGER ? this.requireManagerBranchId(employee) : undefined,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get branch by ID' })
  @ApiResponse({ status: 200, description: 'Branch retrieved' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('role') role: UserRole,
    @CurrentUser('employee') employee: { branchId?: string | null } | null,
  ) {
    if (role === UserRole.MANAGER && id !== this.requireManagerBranchId(employee)) {
      throw new ForbiddenException('Managers can only access their own branch');
    }

    return this.branchesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new branch' })
  @ApiResponse({ status: 201, description: 'Branch created' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a branch' })
  @ApiResponse({ status: 200, description: 'Branch updated' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a branch' })
  @ApiResponse({ status: 204, description: 'Branch deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete branch with employees' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  remove(@Param('id') id: string) {
    return this.branchesService.remove(id);
  }

  @Put(':id/geofence')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Set geofence for branch' })
  @ApiResponse({ status: 200, description: 'Geofence updated' })
  setGeofence(@Param('id') id: string, @Body() dto: SetGeofenceDto) {
    return this.branchesService.setGeofence(id, dto);
  }

  @Put(':id/wifi-config')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Add WiFi config for branch (future-ready)' })
  @ApiResponse({ status: 201, description: 'WiFi config added' })
  setWifiConfig(@Param('id') id: string, @Body() dto: SetWifiConfigDto) {
    return this.branchesService.setWifiConfig(id, dto);
  }
}

