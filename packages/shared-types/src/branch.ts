export interface BranchDto {
  id: string;
  code: string;
  name: string;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BranchGeofenceDto {
  id: string;
  branchId: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BranchWithGeofenceDto extends BranchDto {
  geofence?: BranchGeofenceDto;
}

export interface BranchWifiConfigDto {
  id: string;
  branchId: string;
  ssid: string | null;
  bssid: string | null;
  isActive: boolean;
}

export interface DepartmentDto {
  id: string;
  branchId: string;
  name: string;
  code: string | null;
  createdAt: Date;
  updatedAt: Date;
}
