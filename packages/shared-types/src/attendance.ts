import {
  AttendanceDecision,
  AttendanceEventType,
  AttendanceStatus,
  RiskLevel,
} from './enums';

export interface AttendanceSessionDto {
  id: string;
  employeeId: string;
  branchId: string;
  workDate: Date;
  status: AttendanceStatus | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  totalMinutes: number | null;
  overtimeMinutes: number;
  riskScore: number;
  isFlagged: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceEventDto {
  id: string;
  attendanceSessionId: string | null;
  employeeId: string;
  branchId: string;
  type: AttendanceEventType;
  occurredAt: Date;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  speedMps: number | null;
  distanceMeters: number | null;
  nonce: string | null;
  decision: AttendanceDecision | null;
  createdAt: Date;
}

export interface AttendanceFlagDto {
  id: string;
  attendanceSessionId: string;
  code: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: Date;
}

export interface AttendanceReviewSummaryDto {
  recorded: boolean;
  flagged: boolean;
  requiresReview: boolean;
  state: 'RECORDED' | 'FLAGGED' | 'UNRECORDED';
  reasons: string[];
}

export interface AttendanceParticipantDto {
  id: string;
  employeeCode: string;
  fullName: string;
  branchId?: string | null;
  branchName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
}

export interface AttendanceBranchDto {
  id: string;
  code: string;
  name: string;
}

export interface AttendanceCheckInRequest {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number;
  heading?: number;
  timestamp: string;
  nonce: string;
  deviceId: string;
}

export interface AttendanceCheckOutRequest extends AttendanceCheckInRequest {}

export interface AttendanceCheckInResponse {
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  sessionId?: string;
  attendanceStatus?: AttendanceStatus;
  riskLevel?: RiskLevel;
  distanceMeters?: number;
  flagged?: boolean;
  message?: string;
  riskScore?: number;
  flags?: AttendanceFlagDto[];
}

export interface AttendanceHistoryQuery {
  cursor?: string;
  limit?: number;
  from?: string;
  to?: string;
  status?: AttendanceStatus;
}

export interface AttendanceHistoryItem extends AttendanceSessionDto {
  branchName?: string;
  checkInEvent?: AttendanceEventDto;
  checkOutEvent?: AttendanceEventDto;
  flags?: AttendanceFlagDto[];
}

export interface AttendanceReviewItem extends AttendanceSessionDto {
  employee: AttendanceParticipantDto;
  branch: AttendanceBranchDto;
  flags: AttendanceFlagDto[];
  review: AttendanceReviewSummaryDto;
  checkInEvent?: AttendanceEventDto | null;
  checkOutEvent?: AttendanceEventDto | null;
}

export interface AttendanceReviewQueueResponse {
  items: AttendanceReviewItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AttendanceDashboardSummary {
  totalEmployees: number;
  totalSessions: number;
  recordedSessions: number;
  unrecordedSessions: number;
  reviewRequiredSessions: number;
  flaggedSessions: number;
  lateSessions: number;
  branchCount: number;
  flaggedRate: number;
  lateRate: number;
}

export interface ManualCorrectionRequest {
  attendanceSessionId: string;
  reason: string;
  requestedCheckInAt?: string;
  requestedCheckOutAt?: string;
}
