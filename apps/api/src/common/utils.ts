import { Prisma } from '@prisma/client';

/**
 * Get today's date range (start of day to start of next day)
 */
export function getTodayDateRange(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/**
 * Get date range from a date to start of next day
 */
export function getDateRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/**
 * Parse date string to Date object, setting to start of day
 */
export function parseDateStart(dateStr: string): Date {
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Calculate total minutes between two dates
 */
export function calculateMinutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

/**
 * Calculate overtime minutes
 */
export function calculateOvertimeMinutes(
  totalMinutes: number,
  expectedMinutes: number = 8 * 60
): number {
  return Math.max(0, totalMinutes - expectedMinutes);
}

/**
 * Determine if attendance is late based on check-in hour
 */
export function isLateCheckIn(checkInTime: Date, thresholdHour: number = 9): boolean {
  return checkInTime.getHours() >= thresholdHour;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface PaginationResult<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Apply cursor-based pagination to a list
 */
export function applyPagination<T extends { id: string }>(
  items: T[],
  limit: number
): PaginationResult<T> {
  const hasMore = items.length > limit;
  const result = hasMore ? items.slice(0, -1) : items;

  return {
    items: result,
    hasMore,
    nextCursor: hasMore ? result[result.length - 1]?.id : undefined,
  };
}

/**
 * Build pagination Prisma query options
 */
export function buildPaginationQuery(cursor?: string, limit: number = 20) {
  return {
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  };
}

/**
 * Format date for display (ISO date part only)
 */
export function formatDateISO(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Runtime guard for string enums.
 */
export function isEnumValue<T extends Record<string, string>>(
  enumObject: T,
  value: unknown,
): value is T[keyof T] {
  return typeof value === 'string' && Object.values(enumObject).includes(value as T[keyof T]);
}

export interface AttendanceReviewSummary {
  recorded: boolean;
  flagged: boolean;
  requiresReview: boolean;
  state: 'RECORDED' | 'FLAGGED' | 'UNRECORDED';
  reasons: string[];
}

export function summarizeAttendanceReview(params: {
  status: string | null;
  isFlagged: boolean;
  riskScore?: number;
  flags?: Array<{ code: string; message: string }>;
}): AttendanceReviewSummary {
  const recorded = params.status !== null;
  const flagged = params.isFlagged;
  const requiresReview = !recorded || flagged;
  const state = !recorded ? 'UNRECORDED' : flagged ? 'FLAGGED' : 'RECORDED';
  const reasons = new Set<string>();

  if (!recorded) {
    reasons.add('Session is not recorded yet');
  }

  if (flagged) {
    reasons.add(`Risk score ${params.riskScore ?? 0}`);
  }

  for (const flag of params.flags ?? []) {
    reasons.add(flag.message);
  }

  return {
    recorded,
    flagged,
    requiresReview,
    state,
    reasons: Array.from(reasons),
  };
}
