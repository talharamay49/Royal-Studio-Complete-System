export interface AdminErrorLogEntry {
  id: string;
  timestamp: string;
  route: string;
  message: string;
  componentStack?: string;
  source: 'AdminErrorBoundary' | 'WindowRuntime' | 'UnhandledPromise';
}

const ERROR_LOG_STORAGE_KEY = 'royal_studio_admin_error_logs_v1';
const MAX_ERROR_LOGS = 50;

class GlobalAdminErrorLogger {
  private memoryLogs: AdminErrorLogEntry[] = [];

  public logError(
    error: unknown,
    options?: {
      route?: string;
      componentStack?: string;
      source?: AdminErrorLogEntry['source'];
      notifyAdminToast?: boolean;
    }
  ): AdminErrorLogEntry {
    const errMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
        ? error
        : 'Unexpected client-side runtime error in Admin ERP.';

    const entry: AdminErrorLogEntry = {
      id: `ERR-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      route:
        options?.route ||
        (typeof window !== 'undefined' ? window.location.pathname : '/admin'),
      message: errMessage,
      componentStack: options?.componentStack?.slice(0, 600),
      source: options?.source || 'AdminErrorBoundary',
    };

    this.memoryLogs = [entry, ...this.memoryLogs].slice(0, MAX_ERROR_LOGS);

    if (typeof window !== 'undefined') {
      try {
        const existingRaw = window.sessionStorage.getItem(ERROR_LOG_STORAGE_KEY);
        const existing: AdminErrorLogEntry[] = existingRaw ? JSON.parse(existingRaw) : [];
        const updated = [entry, ...existing].slice(0, MAX_ERROR_LOGS);
        window.sessionStorage.setItem(ERROR_LOG_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore sessionStorage quota issues
      }

      if (options?.notifyAdminToast !== false) {
        window.dispatchEvent(
          new CustomEvent<AdminErrorLogEntry>('royalstudio:admin-error-alert', {
            detail: entry,
          })
        );
      }
    }

    return entry;
  }

  public getLogs(): AdminErrorLogEntry[] {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.sessionStorage.getItem(ERROR_LOG_STORAGE_KEY);
        if (raw) {
          return JSON.parse(raw) as AdminErrorLogEntry[];
        }
      } catch {
        // Fallback to memoryLogs
      }
    }
    return this.memoryLogs;
  }

  public clearLogs(): void {
    this.memoryLogs = [];
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(ERROR_LOG_STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
  }
}

export const adminErrorLogger = new GlobalAdminErrorLogger();
