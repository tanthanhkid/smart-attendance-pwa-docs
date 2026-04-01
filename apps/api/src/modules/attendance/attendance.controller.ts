import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '@/common';
import { CurrentUser } from '@/common';
import { CheckInDto, CheckOutDto, AttendanceHistoryQueryDto, ManualCorrectionDto } from './dto';

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  private requireEmployeeContext(employeeId: string | null | undefined): string {
    if (!employeeId) {
      throw new ForbiddenException('Employee context is required for attendance actions');
    }

    return employeeId;
  }

  @Post('check-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check in with geolocation' })
  @ApiResponse({ status: 200, description: 'Check-in result' })
  @ApiResponse({ status: 409, description: 'Duplicate submission' })
  checkIn(
    @CurrentUser('employeeId') employeeId: string | null,
    @Body() dto: CheckInDto,
  ) {
    return this.attendanceService.checkIn(this.requireEmployeeContext(employeeId), dto);
  }

  @Post('check-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check out with geolocation' })
  @ApiResponse({ status: 200, description: 'Check-out result' })
  @ApiResponse({ status: 400, description: 'No open session' })
  checkOut(
    @CurrentUser('employeeId') employeeId: string | null,
    @Body() dto: CheckOutDto,
  ) {
    return this.attendanceService.checkOut(this.requireEmployeeContext(employeeId), dto);
  }

  @Get('me/today')
  @ApiOperation({ summary: 'Get today attendance status' })
  @ApiResponse({ status: 200, description: 'Today attendance' })
  getMeToday(@CurrentUser('employeeId') employeeId: string | null) {
    return this.attendanceService.getTodayAttendance(this.requireEmployeeContext(employeeId));
  }

  @Get('me/history')
  @ApiOperation({ summary: 'Get attendance history' })
  @ApiResponse({ status: 200, description: 'Attendance history' })
  getHistory(
    @CurrentUser('employeeId') employeeId: string | null,
    @Query() query: AttendanceHistoryQueryDto,
  ) {
    return this.attendanceService.getHistory(this.requireEmployeeContext(employeeId), query);
  }

  @Post('manual-requests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request manual correction' })
  @ApiResponse({ status: 201, description: 'Request created' })
  requestCorrection(
    @CurrentUser('id') userId: string,
    @CurrentUser('employeeId') employeeId: string | null,
    @Body() dto: ManualCorrectionDto,
  ) {
    return this.attendanceService.requestCorrection(
      this.requireEmployeeContext(employeeId),
      userId,
      dto,
    );
  }
}
