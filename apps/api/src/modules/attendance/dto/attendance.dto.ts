import { IsNumber, IsNotEmpty, IsString, IsOptional, Min, Max, IsUUID, MaxLength, IsISO8601 } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckInDto {
  @ApiProperty({ description: 'Latitude from GPS', example: 21.0285 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude from GPS', example: 105.8542 })
  @IsNumber()
  longitude: number;

  @ApiProperty({ description: 'GPS accuracy in meters', example: 10 })
  @IsNumber()
  @Min(0)
  accuracy: number;

  @ApiPropertyOptional({ description: 'Speed in meters per second' })
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiPropertyOptional({ description: 'Heading in degrees (0-360)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number;

  @ApiProperty({ description: 'Client timestamp ISO string', example: '2024-01-15T08:30:00.000Z' })
  @IsString()
  @IsNotEmpty()
  timestamp: string;

  @ApiProperty({ description: 'Unique nonce to prevent duplicate submissions (UUID v4)' })
  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  nonce: string;

  @ApiProperty({ description: 'Device installation ID' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;
}

export class CheckOutDto extends CheckInDto {}

export class AttendanceHistoryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 20, description: 'Number of records to return (1-100)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter from date (ISO string)', example: '2024-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'Filter to date (ISO string)', example: '2024-01-31T23:59:59.999Z' })
  @IsOptional()
  @IsString()
  to?: string;
}

export class ManualCorrectionDto {
  @ApiProperty({ description: 'Attendance session ID to correct' })
  @IsUUID()
  @IsNotEmpty()
  attendanceSessionId: string;

  @ApiProperty({ description: 'Reason for the correction request' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({ description: 'Requested check-in time (ISO string)', example: '2024-01-15T08:30:00.000Z' })
  @IsOptional()
  @IsISO8601()
  requestedCheckInAt?: string;

  @ApiPropertyOptional({ description: 'Requested check-out time (ISO string)', example: '2024-01-15T17:30:00.000Z' })
  @IsOptional()
  @IsISO8601()
  requestedCheckOutAt?: string;
}
