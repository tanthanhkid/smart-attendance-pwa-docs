/**
 * Business Rules Constants
 * Centralized configuration for attendance business rules
 */

export const BUSINESS_RULES = {
  // Working hours
  DEFAULT_WORKING_HOURS: 8,
  DEFAULT_WORKING_MINUTES: 8 * 60,

  // Late threshold (minutes after scheduled start)
  DEFAULT_LATE_THRESHOLD_MINUTES: 15,

  // Geofence configuration
  GEOFENCE: {
    DEFAULT_RADIUS_METERS: 100,
    DOUBLE_RADIUS_MULTIPLIER: 2,
    EDGE_THRESHOLD_MULTIPLIER: 1,
  },

  // GPS accuracy thresholds (meters)
  GPS_ACCURACY: {
    GOOD_THRESHOLD: 10,
    ACCEPTABLE_THRESHOLD: 50,
    POOR_THRESHOLD: 100,
    VERY_POOR_THRESHOLD: 200,
  },

  // Speed thresholds (meters per second)
  SPEED: {
    WALKING_MAX: 2.5,      // ~9 km/h
    RUNNING_MAX: 8,        // ~29 km/h
    CAR_MIN: 15,           // ~54 km/h
    IMPOSSIBLE: 50,        // Reject threshold
  },

  // Risk scoring thresholds
  RISK_SCORE: {
    REJECT_THRESHOLD: 50,
    FLAG_THRESHOLD: 20,
  },

  // Password requirements
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 128,
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },

  // Session validation
  SESSION: {
    MAX_OVERTIME_MINUTES: 4 * 60, // 4 hours max overtime
  },

  // Check-in hour threshold (24h format)
  CHECK_IN_HOUR_THRESHOLD: 9,
} as const;

export const ERROR_MESSAGES = {
  // Authentication
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid credentials',
    ACCOUNT_INACTIVE: 'Account is inactive',
    USER_NOT_FOUND: 'User not found',
    USER_INACTIVE: 'User not found or inactive',
    INVALID_REFRESH_TOKEN: 'Invalid refresh token',
    TOKEN_EXPIRED: 'Token has expired',
  },

  // Attendance
  ATTENDANCE: {
    ALREADY_CHECKED_IN: 'Already checked in today',
    NO_OPEN_SESSION: 'No open attendance session found',
    SESSION_MISSING_CHECKIN: 'Open attendance session is missing check-in time',
    NOT_FOUND: 'Attendance session not found',
    DUPLICATE_NONCE: 'Duplicate nonce - submission already processed',
    CHECKIN_PENDING_REVIEW: 'Check-in submitted but not recorded due to risk factors',
    CHECKIN_FLAGGED: 'Check-in allowed with flags - pending review',
    CHECKIN_SUCCESS: 'Check-in successful',
    CHECKOUT_SUCCESS: 'Check-out successful',
  },

  // Employee
  EMPLOYEE: {
    NOT_FOUND: 'Employee not found',
    CODE_EXISTS: 'Employee code already exists in this branch',
    EMAIL_EXISTS: 'Email already registered',
  },

  // Branch
  BRANCH: {
    NOT_FOUND: 'Branch not found',
    CODE_EXISTS: 'Branch code already exists',
    HAS_EMPLOYEES: 'Cannot delete branch with employees',
  },

  // Approval
  APPROVAL: {
    NOT_FOUND: 'Approval request not found',
  },

  // General
  GENERAL: {
    NOT_FOUND: 'Resource not found',
    BAD_REQUEST: 'Invalid request',
    FORBIDDEN: 'Access denied',
    INTERNAL_ERROR: 'Internal server error',
  },
} as const;

export type ErrorMessages = typeof ERROR_MESSAGES;
