export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

export enum AttendanceEventType {
  CHECK_IN = 'CHECK_IN',
  CHECK_OUT = 'CHECK_OUT',
  REJECTED = 'REJECTED',
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
}

export enum AttendanceStatus {
  ON_TIME = 'ON_TIME',
  LATE = 'LATE',
  ABSENT = 'ABSENT',
  EARLY_CHECKOUT = 'EARLY_CHECKOUT',
  OVERTIME = 'OVERTIME',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum AttendanceDecision {
  ALLOW = 'ALLOW',
  ALLOW_WITH_FLAG = 'ALLOW_WITH_FLAG',
  REJECT = 'REJECT',
  REVIEW = 'REVIEW',
}

export enum DevicePlatform {
  WEB = 'WEB',
  ANDROID = 'ANDROID',
  IOS = 'IOS',
}

export enum ReportType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  MONTHLY_ATTENDANCE = 'MONTHLY_ATTENDANCE',
}

export enum ExportFormat {
  CSV = 'CSV',
  EXCEL = 'EXCEL',
  PDF = 'PDF',
}
