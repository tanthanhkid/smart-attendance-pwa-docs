import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Min, Max, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ description: 'Unique branch code' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(20)
  code: string;

  @ApiProperty({ description: 'Branch name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Branch address' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ description: 'Latitude coordinate' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude coordinate' })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class UpdateBranchDto {
  @ApiPropertyOptional({ description: 'Branch name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Branch address' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ description: 'Latitude coordinate' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude coordinate' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Whether branch is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SetGeofenceDto {
  @ApiProperty({ description: 'Center latitude coordinate' })
  @IsNumber()
  @IsNotEmpty()
  centerLat: number;

  @ApiProperty({ description: 'Center longitude coordinate' })
  @IsNumber()
  @IsNotEmpty()
  centerLng: number;

  @ApiProperty({ description: 'Geofence radius in meters (min 1)' })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  radiusMeters: number;
}

export class SetWifiConfigDto {
  @ApiPropertyOptional({ description: 'WiFi SSID' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  ssid?: string;

  @ApiPropertyOptional({ description: 'WiFi BSSID (MAC address)' })
  @IsOptional()
  @IsString()
  @MaxLength(17)
  bssid?: string;

  @ApiPropertyOptional({ description: 'Whether WiFi config is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BranchQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search by name or code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 'active', enum: ['active', 'inactive', 'all'] })
  @IsOptional()
  @IsString()
  status?: 'active' | 'inactive' | 'all';
}
