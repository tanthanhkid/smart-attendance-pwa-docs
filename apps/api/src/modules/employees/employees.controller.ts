import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, UserRole } from '@/common';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  AssignBranchDto,
  AssignDepartmentDto,
  EmployeeQueryDto,
} from './dto';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

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
  @ApiOperation({ summary: 'List all employees' })
  @ApiResponse({ status: 200, description: 'Employees retrieved' })
  findAll(
    @CurrentUser('role') role: UserRole,
    @CurrentUser('employee') employee: { branchId?: string | null } | null,
    @Query() query: EmployeeQueryDto,
  ) {
    return this.employeesService.findAll({
      ...query,
      branchId: query.branchId,
      scopeBranchId: this.resolveManagerBranchId(role, employee),
    });
  }

  @Get('me')
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get current employee profile' })
  @ApiResponse({ status: 200, description: 'Employee profile retrieved' })
  getMe(@CurrentUser('id') userId: string) {
    return this.employeesService.findByUserId(userId);
  }

  @Get('me/today')
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get today attendance for current employee' })
  @ApiResponse({ status: 200, description: 'Today attendance retrieved' })
  getMeToday(@CurrentUser('employeeId') employeeId: string) {
    return this.employeesService.getTodayAttendance(employeeId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get employee by ID' })
  @ApiResponse({ status: 200, description: 'Employee retrieved' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('role') role: UserRole,
    @CurrentUser('employee') employee: { branchId?: string | null } | null,
  ) {
    return this.employeesService.findOne(
      id,
      this.resolveManagerBranchId(role, employee),
    );
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new employee with user account' })
  @ApiResponse({ status: 201, description: 'Employee created' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create({ ...dto, createdByUserId: userId });
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an employee' })
  @ApiResponse({ status: 200, description: 'Employee updated' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Post(':id/assign-branch')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign employee to a branch' })
  @ApiResponse({ status: 200, description: 'Branch assigned' })
  assignBranch(@Param('id') id: string, @Body() dto: AssignBranchDto) {
    return this.employeesService.assignBranch(id, dto.branchId);
  }

  @Post(':id/assign-department')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign employee to a department' })
  @ApiResponse({ status: 200, description: 'Department assigned' })
  assignDepartment(@Param('id') id: string, @Body() dto: AssignDepartmentDto) {
    return this.employeesService.assignDepartment(id, dto.departmentId);
  }
}
