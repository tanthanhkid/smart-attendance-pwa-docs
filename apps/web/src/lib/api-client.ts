import { getStoredAccessToken } from './auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface RequestOptions extends RequestInit {
  token?: string;
}

interface QueuedRequest {
  id: string;
  endpoint: string;
  options: RequestOptions;
  timestamp: number;
  retryCount: number;
}

export interface QueueEvent {
  requestId: string;
  endpoint: string;
  status: 'queued' | 'succeeded' | 'failed';
  queueSize: number;
  errorMessage?: string;
}

type QueueListener = (event: QueueEvent) => void;

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
    employeeId: string | null;
    employee: {
      id: string;
      employeeCode: string;
      fullName: string;
      branchId: string;
      branchName: string;
      departmentId: string | null;
      departmentName: string | null;
    } | null;
  };
  accessToken: string;
  refreshToken: string;
}

export interface TodaySessionResponse {
  status?: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  totalMinutes: number | null;
  isFlagged?: boolean;
  riskScore?: number;
  flags: Array<{ code: string; message: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' }>;
}

export interface AttendanceActionResponse {
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  recorded?: boolean;
  riskLevel?: string;
  flagged?: boolean;
  message?: string;
  totalMinutes?: number;
}

export interface HistoryResponse {
  items: Array<{
    id: string;
    workDate: string;
    status: string | null;
    checkInAt: string | null;
    checkOutAt: string | null;
    totalMinutes: number | null;
    isFlagged: boolean;
    branch: { name: string };
    flags: Array<{ code: string; message: string }>;
  }>;
  hasMore: boolean;
  nextCursor?: string;
}

export interface SystemSummaryResponse {
  totalEmployees: number;
  totalSessions: number;
  recordedSessions: number;
  unrecordedSessions: number;
  flaggedSessions: number;
  flaggedRate: number;
  lateRate: number;
  branchCount: number;
}

export interface BranchSummaryResponse {
  branch: { id: string; name: string; code: string } | null;
  totalEmployees: number;
  checkedIn: number;
  unrecordedCount: number;
  notCheckedIn: number;
  lateCount: number;
  flaggedCount: number;
  attendanceRate: number;
}

const MAX_RETRY_COUNT = 3;
const QUEUE_KEY = 'smart-attendance-request-queue';

/**
 * Offline queue manager for attendance requests that need to be retried.
 */
class OfflineQueue {
  private queue: QueuedRequest[] = [];

  constructor() {
    this.load();
  }

  private load() {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.sessionStorage.getItem(QUEUE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.queue = parsed.filter((item): item is QueuedRequest => this.isQueuedRequest(item));
        }
      }
    } catch {
      this.queue = [];
    }
  }

  private isQueuedRequest(item: unknown): item is QueuedRequest {
    if (!item || typeof item !== 'object') return false;

    const candidate = item as Partial<QueuedRequest>;
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.endpoint === 'string' &&
      typeof candidate.timestamp === 'number' &&
      typeof candidate.retryCount === 'number' &&
      typeof candidate.options === 'object' &&
      candidate.options !== null
    );
  }

  private save() {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
  }

  add(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>) {
    const queuedRequest: QueuedRequest = {
      ...request,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
    };
    this.queue.push(queuedRequest);
    this.save();
    return queuedRequest.id;
  }

  getAll(): QueuedRequest[] {
    return [...this.queue];
  }

  remove(id: string) {
    this.queue = this.queue.filter((r) => r.id !== id);
    this.save();
  }

  incrementRetry(id: string): boolean {
    const request = this.queue.find((r) => r.id === id);
    if (request) {
      request.retryCount++;
      this.save();
      return request.retryCount < MAX_RETRY_COUNT;
    }
    return false;
  }

  clear() {
    this.queue = [];
    this.save();
  }

  get count(): number {
    return this.queue.length;
  }
}

const offlineQueue = new OfflineQueue();

class ApiClient {
  private baseUrl: string;
  private isOnline: boolean = true;
  private queueListeners = new Set<QueueListener>();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.setupNetworkListeners();
  }

  private normalizeHeaders(headers?: HeadersInit): Record<string, string> {
    if (!headers) {
      return {};
    }

    const normalized = new Headers(headers);
    const result: Record<string, string> = {};
    normalized.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  private serializeRequestOptions(options: RequestOptions): RequestOptions {
    const headers = this.normalizeHeaders(options.headers);

    return {
      ...options,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    };
  }

  private setupNetworkListeners() {
    if (typeof window === 'undefined') return;

    this.isOnline = navigator.onLine;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private async processQueue() {
    const requests = offlineQueue.getAll();
    for (const request of requests) {
      try {
        await this.requestInternal(request.endpoint, request.options);
        offlineQueue.remove(request.id);
        this.emitQueueEvent({
          requestId: request.id,
          endpoint: request.endpoint,
          status: 'succeeded',
        });
      } catch {
        const canRetry = offlineQueue.incrementRetry(request.id);
        if (!canRetry) {
          offlineQueue.remove(request.id);
          this.emitQueueEvent({
            requestId: request.id,
            endpoint: request.endpoint,
            status: 'failed',
            errorMessage: 'SYNC_FAILED',
          });
        }
      }
    }
  }

  private emitQueueEvent(
    event: Omit<QueueEvent, 'queueSize'>,
  ) {
    const payload: QueueEvent = {
      ...event,
      queueSize: offlineQueue.count,
    };

    for (const listener of this.queueListeners) {
      listener(payload);
    }
  }

  private async requestInternal<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getHeaders(options);

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      const errorBody = contentType.includes('application/json')
        ? await response.json().catch(() => ({ message: 'Request failed' }))
        : await response.text().catch(() => 'Request failed');

      const message =
        typeof errorBody === 'string'
          ? errorBody
          : errorBody.message || `HTTP ${response.status}`;
      throw new Error(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }

    return (await response.text()) as T;
  }

  private getHeaders(options: RequestOptions): HeadersInit {
    const headers = new Headers(options.headers);

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const token = options.token ?? getStoredAccessToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  /**
   * Get count of queued offline requests.
   */
  getQueuedRequestCount(): number {
    return offlineQueue.count;
  }

  subscribeToQueueEvents(listener: QueueListener): () => void {
    this.queueListeners.add(listener);
    return () => {
      this.queueListeners.delete(listener);
    };
  }

  /**
   * Manually trigger retry of queued requests.
   */
  async retryQueuedRequests(): Promise<{ succeeded: number; failed: number }> {
    const requests = offlineQueue.getAll();
    let succeeded = 0;
    let failed = 0;

    for (const request of requests) {
      try {
        await this.requestInternal(request.endpoint, request.options);
        offlineQueue.remove(request.id);
        succeeded++;
      } catch {
        failed++;
      }
    }

    return { succeeded, failed };
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    if (!this.isOnline) {
      throw new Error('NETWORK_OFFLINE');
    }

    return this.requestInternal<T>(endpoint, options);
  }

  /**
   * Execute an attendance action with offline queue support.
   * If offline, the request will be queued and retried when back online.
   */
  async executeWithOfflineSupport<T>(
    endpoint: string,
    data: unknown,
    options: RequestOptions = {}
  ): Promise<{ queued: true } | { queued: false; result: T }> {
    if (!this.isOnline) {
      const requestId = offlineQueue.add({
        endpoint,
        options: {
          ...this.serializeRequestOptions(options),
          method: options.method || 'POST',
          body: JSON.stringify(data),
        },
      });
      this.emitQueueEvent({
        requestId,
        endpoint,
        status: 'queued',
      });
      return { queued: true };
    }

    try {
      const result = await this.requestInternal<T>(endpoint, {
        ...this.serializeRequestOptions(options),
        method: options.method || 'POST',
        body: JSON.stringify(data),
      });
      return { queued: false, result };
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        const requestId = offlineQueue.add({
          endpoint,
          options: {
            ...this.serializeRequestOptions(options),
            method: options.method || 'POST',
            body: JSON.stringify(data),
          },
        });
        this.emitQueueEvent({
          requestId,
          endpoint,
          status: 'queued',
        });
        return { queued: true };
      }
      throw error;
    }
  }

  // Auth
  async login(email: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async refreshToken(refreshToken: string) {
    return this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  // Attendance
  async checkIn(data: {
    latitude: number;
    longitude: number;
    accuracy: number;
    speed?: number;
    heading?: number;
    timestamp: string;
    nonce: string;
    deviceId: string;
  }): Promise<AttendanceActionResponse> {
    return this.request<AttendanceActionResponse>('/attendance/check-in', { method: 'POST', body: JSON.stringify(data) });
  }

  async checkOut(data: {
    latitude: number;
    longitude: number;
    accuracy: number;
    speed?: number;
    heading?: number;
    timestamp: string;
    nonce: string;
    deviceId: string;
  }): Promise<AttendanceActionResponse> {
    return this.request<AttendanceActionResponse>('/attendance/check-out', { method: 'POST', body: JSON.stringify(data) });
  }

  /**
   * Execute check-in with offline support.
   * Queues the request if offline and returns { queued: true }.
   */
  async checkInWithOfflineSupport(data: {
    latitude: number;
    longitude: number;
    accuracy: number;
    speed?: number;
    heading?: number;
    timestamp: string;
    nonce: string;
    deviceId: string;
  }): Promise<{ queued: true } | { queued: false; result: AttendanceActionResponse }> {
    return this.executeWithOfflineSupport<AttendanceActionResponse>('/attendance/check-in', data);
  }

  /**
   * Execute check-out with offline support.
   * Queues the request if offline and returns { queued: true }.
   */
  async checkOutWithOfflineSupport(data: {
    latitude: number;
    longitude: number;
    accuracy: number;
    speed?: number;
    heading?: number;
    timestamp: string;
    nonce: string;
    deviceId: string;
  }): Promise<{ queued: true } | { queued: false; result: AttendanceActionResponse }> {
    return this.executeWithOfflineSupport<AttendanceActionResponse>('/attendance/check-out', data);
  }

  async getMeToday(): Promise<TodaySessionResponse | null> {
    return this.request<TodaySessionResponse | null>('/attendance/me/today');
  }

  async getHistory(params?: { cursor?: string; limit?: number; from?: string; to?: string }): Promise<HistoryResponse> {
    const query = new URLSearchParams();
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    return this.request<HistoryResponse>(`/attendance/me/history?${query}`);
  }

  async requestCorrection(data: { attendanceSessionId: string; reason: string }) {
    return this.request('/attendance/manual-requests', { method: 'POST', body: JSON.stringify(data) });
  }

  // Branches
  async getBranches(params?: { cursor?: string; limit?: number; search?: string }) {
    const query = new URLSearchParams();
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    return this.request(`/branches?${query}`);
  }

  async getBranch(id: string) {
    return this.request(`/branches/${id}`);
  }

  async createBranch(data: { code: string; name: string; address?: string; latitude?: number; longitude?: number }) {
    return this.request('/branches', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateBranch(id: string, data: Partial<{ name: string; address: string; latitude: number; longitude: number; isActive: boolean }>) {
    return this.request(`/branches/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async setGeofence(branchId: string, data: { centerLat: number; centerLng: number; radiusMeters: number }) {
    return this.request(`/branches/${branchId}/geofence`, { method: 'PUT', body: JSON.stringify(data) });
  }

  // Employees
  async getEmployees(params?: { cursor?: string; limit?: number; branchId?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.branchId) query.set('branchId', params.branchId);
    if (params?.search) query.set('search', params.search);
    return this.request(`/employees?${query}`);
  }

  async getMe() {
    return this.request('/employees/me');
  }

  // Dashboard
  async getSystemSummary(params?: { from?: string; to?: string; branchId?: string }): Promise<SystemSummaryResponse> {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.branchId) query.set('branchId', params.branchId);
    return this.request<SystemSummaryResponse>(`/dashboard/system-summary?${query}`);
  }

  async getBranchSummary(branchId: string, date?: string) {
    const query = new URLSearchParams({ branchId });
    if (date) query.set('date', date);
    return this.request<BranchSummaryResponse>(`/dashboard/branch-summary?${query}`);
  }

  async getTrends(params?: { branchId?: string; days?: number }) {
    const query = new URLSearchParams();
    if (params?.branchId) query.set('branchId', params.branchId);
    if (params?.days) query.set('days', String(params.days));
    return this.request(`/dashboard/trends?${query}`);
  }

  // Approvals
  async getApprovals(params?: { cursor?: string; limit?: number; status?: string; branchId?: string }) {
    const query = new URLSearchParams();
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    if (params?.branchId) query.set('branchId', params.branchId);
    return this.request(`/approvals?${query}`);
  }

  async approveRequest(id: string) {
    return this.request(`/approvals/${id}/approve`, { method: 'POST' });
  }

  async rejectRequest(id: string, reason?: string) {
    return this.request(`/approvals/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
  }

  // Reports
  async getAttendanceReport(params: {
    from: string;
    to: string;
    branchId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const query = new URLSearchParams({
      from: params.from,
      to: params.to,
    });
    if (params.branchId) query.set('branchId', params.branchId);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    return this.request(`/reports/attendance?${query}`);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export type { ApiClient };
