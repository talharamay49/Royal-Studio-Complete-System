import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, LayoutDashboard, ShieldAlert } from 'lucide-react';
import { adminErrorLogger, AdminErrorLogEntry } from '../../utils/errorLogger';

interface Props {
  children: ReactNode;
  currentPath?: string;
  onResetNavigate?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  lastLogEntry: AdminErrorLogEntry | null;
}

export class AdminErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
    lastLogEntry: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected view error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (typeof window !== 'undefined') {
      const msg = String(error?.message || '');
      if (
        msg.includes('Failed to load chunk') ||
        msg.includes('ChunkLoadError') ||
        msg.includes('Loading chunk')
      ) {
        try {
          const reloadKey = 'royalstudio_admin_chunk_reload_ts';
          const lastReload = Number(window.sessionStorage.getItem(reloadKey) || '0');
          const now = Date.now();
          if (now - lastReload > 10000) {
            window.sessionStorage.setItem(reloadKey, String(now));
            window.location.reload();
            return;
          }
        } catch {
          // Ignore storage restrictions
        }
      }
    }

    const logEntry = adminErrorLogger.logError(error, {
      route: this.props.currentPath,
      componentStack: errorInfo?.componentStack || undefined,
      source: 'AdminErrorBoundary',
      notifyAdminToast: true,
    });
    this.setState({ lastLogEntry: logEntry });
  }

  private handleRecover = () => {
    this.setState({ hasError: false, errorMessage: '', lastLogEntry: null });
  };

  private handleReturnDashboard = () => {
    this.setState({ hasError: false, errorMessage: '', lastLogEntry: null });
    if (this.props.onResetNavigate) {
      this.props.onResetNavigate();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 sm:p-8 bg-surface rounded-2xl border border-border text-center max-w-lg mx-auto my-10 space-y-4 shadow-premium">
          <div className="w-12 h-12 rounded-full bg-rose-500/15 text-rose-500 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 text-accent text-[11px] font-semibold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>
              Admin Alert Logged
              {this.state.lastLogEntry ? ` · #${this.state.lastLogEntry.id}` : ''}
            </span>
          </div>

          <h3 className="font-display text-xl sm:text-2xl font-semibold text-primary">
            View Recovery Active
          </h3>
          <p className="text-xs text-text-muted leading-relaxed">
            {this.state.errorMessage}
          </p>

          {this.state.lastLogEntry && (
            <div className="p-3 rounded-xl bg-background border border-border text-left text-[11px] font-mono text-text-muted space-y-1">
              <div className="flex justify-between">
                <span>Route:</span>
                <span className="text-primary">{this.state.lastLogEntry.route}</span>
              </div>
              <div className="flex justify-between">
                <span>Logged At:</span>
                <span className="text-primary">
                  {new Date(this.state.lastLogEntry.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={this.handleRecover}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-light text-[#111111] rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry View</span>
            </button>
            <button
              type="button"
              onClick={this.handleReturnDashboard}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-background border border-border text-primary rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-accent" />
              <span>Return to Dashboard</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
