'use client';

import { useSyncExternalStore } from 'react';

interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  employeeId: string | null;
  employee?: {
    id: string;
    employeeCode: string;
    fullName: string;
    branchId: string;
    branchName: string;
    departmentId: string | null;
    departmentName: string | null;
  } | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (data: { user: User; accessToken: string; refreshToken: string }) => void;
  setTokens: (data: { accessToken: string; refreshToken: string }) => void;
  logout: () => void;
}

type Selector<T> = (state: AuthState) => T;
type Listener = () => void;

const STORAGE_KEY = 'smart-attendance-auth';

/**
 * Security fix (SLOP-071): Use sessionStorage for sensitive tokens instead of localStorage.
 * sessionStorage is cleared when the browser tab/window is closed,
 * reducing the window of exposure for token theft via XSS.
 */
const useSessionStorage = typeof window !== 'undefined' && window.sessionStorage !== undefined;

const secureSetItem = (key: string, value: string) => {
  if (useSessionStorage) {
    window.sessionStorage.setItem(key, value);
  }
};

const secureGetItem = (key: string): string | null => {
  if (useSessionStorage) {
    return window.sessionStorage.getItem(key);
  }
  return null;
};

const secureRemoveItem = (key: string) => {
  if (useSessionStorage) {
    window.sessionStorage.removeItem(key);
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isUser = (value: unknown): value is User => {
  if (!isRecord(value)) return false;

  const candidate = value;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.email !== 'string' ||
    (candidate.role !== 'ADMIN' && candidate.role !== 'MANAGER' && candidate.role !== 'EMPLOYEE') ||
    !(typeof candidate.employeeId === 'string' || candidate.employeeId === null)
  ) {
    return false;
  }

  if (candidate.employee == null) return true;
  if (!isRecord(candidate.employee)) return false;

  const employee = candidate.employee;
  return (
    typeof employee.id === 'string' &&
    typeof employee.employeeCode === 'string' &&
    typeof employee.fullName === 'string' &&
    typeof employee.branchId === 'string' &&
    typeof employee.branchName === 'string' &&
    (typeof employee.departmentId === 'string' || employee.departmentId === null) &&
    (typeof employee.departmentName === 'string' || employee.departmentName === null)
  );
};

const isStoredAuthState = (value: unknown): value is Pick<AuthState, 'user' | 'accessToken' | 'refreshToken' | 'isAuthenticated'> => {
  if (!isRecord(value)) return false;

  const candidate = value;
  return (
    'user' in candidate &&
    'accessToken' in candidate &&
    'refreshToken' in candidate &&
    'isAuthenticated' in candidate &&
    (candidate.user === null || isUser(candidate.user)) &&
    (typeof candidate.accessToken === 'string' || candidate.accessToken === null) &&
    (typeof candidate.refreshToken === 'string' || candidate.refreshToken === null) &&
    typeof candidate.isAuthenticated === 'boolean'
  );
};

const defaultState = (): AuthState => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  setAuth: (data) => {
    authStore.setState({
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      isAuthenticated: true,
    });
  },
  setTokens: (data) => {
    authStore.setState({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
  },
  logout: () => {
    authStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },
});

function createAuthStore() {
  let state = defaultState();
  const listeners = new Set<Listener>();

  const notify = () => {
    listeners.forEach((listener) => listener());
  };

  const save = () => {
    if (typeof window === 'undefined') return;

    const { user, accessToken, refreshToken, isAuthenticated } = state;
    secureSetItem(
      STORAGE_KEY,
      JSON.stringify({ user, accessToken, refreshToken, isAuthenticated }),
    );
  };

  const hydrate = () => {
    if (typeof window === 'undefined') return;

    const raw = secureGetItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed: unknown = JSON.parse(raw);
      if (isStoredAuthState(parsed)) {
        state = {
          ...defaultState(),
          ...parsed,
        };
      } else {
        secureRemoveItem(STORAGE_KEY);
      }
    } catch {
      secureRemoveItem(STORAGE_KEY);
    }
  };

  const setState = (patch: Partial<AuthState>) => {
    state = {
      ...state,
      ...patch,
    };
    save();
    notify();
  };

  const getState = () => state;

  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  hydrate();

  return {
    getState,
    setState,
    subscribe,
  };
}

const authStore = createAuthStore();

export function getAuthStateSnapshot(): Pick<AuthState, 'user' | 'accessToken' | 'refreshToken' | 'isAuthenticated'> {
  const { user, accessToken, refreshToken, isAuthenticated } = authStore.getState();
  return { user, accessToken, refreshToken, isAuthenticated };
}

export function getStoredAccessToken(): string | null {
  return authStore.getState().accessToken;
}

export function useAuthStore(): AuthState;
export function useAuthStore<T>(selector: Selector<T>): T;
export function useAuthStore<T>(selector?: Selector<T>): AuthState | T {
  const state = useSyncExternalStore(authStore.subscribe, authStore.getState, authStore.getState);
  return selector ? selector(state) : state;
}
