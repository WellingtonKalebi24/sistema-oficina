import type { AuthSession, AuthUser } from "../api/auth.js";

const STORAGE_KEY = "joia.auth.session";

export type StoredSession = {
  accessToken: string;
  permissions: string[];
  refreshToken: string;
  sessionId: string;
  tenantId: string;
  user: AuthUser;
};

export function readStoredSession(): StoredSession | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredSession;

    if (!parsed.accessToken || !parsed.refreshToken || !parsed.sessionId || !parsed.user) {
      clearStoredSession();
      return null;
    }

    return parsed;
  } catch {
    clearStoredSession();
    return null;
  }
}

export function storeSession(session: AuthSession): StoredSession {
  const stored: StoredSession = {
    accessToken: session.accessToken,
    permissions: session.user.permissions,
    refreshToken: session.refreshToken,
    sessionId: session.sessionId,
    tenantId: session.tenantId,
    user: session.user,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  return stored;
}

export function clearStoredSession(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function hasPermission(session: StoredSession | null, permission: string): boolean {
  return Boolean(session?.permissions.includes(permission));
}

export function getSessionStorageKey(): string {
  return STORAGE_KEY;
}
