import React from 'react';
import {
  Menu,
  RotateCw,
  Clock,
  AlertCircle,
  ShieldAlert,
  Palette
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStudioData } from '../../context/StudioDataContext';
import { ThemeToggle } from '../common/ThemeToggle';
import { NotificationCenter } from '../common/NotificationCenter';

interface TopbarProps {
  currentPath: string;
  onToggleMobileNav: () => void;
  navigate: (path: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentPath,
  onToggleMobileNav,
  navigate
}) => {
  const {
    user,
    isAdmin,
    idleRemainingSeconds,
    idleTimeoutMinutes,
    setIdleTimeoutMinutes,
    extendSession,
  } = useAuth();
  const { profile, invoices, tasks, refreshAll, isLoading } = useStudioData();
  const studioName = profile?.studioName || 'Royal Studio';

  const overdueCount = invoices.filter(i => i.status === 'Overdue').length;
  const urgentTaskCount = tasks.filter(t => t.priority === 'Urgent' && t.status !== 'Completed').length;

  const minutes = Math.floor(idleRemainingSeconds / 60);
  const seconds = idleRemainingSeconds % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  const isWarningSoon = idleRemainingSeconds <= 120;

  const formatPathTitle = (path: string): string => {
    if (path === '/' || path === '/dashboard') return 'Studio Overview';
    if (path === '/website-cms' || path === '/portfolio-cms') return 'Website & Portfolio CMS';
    if (path === '/theme-customizer' || path === '/theme' || path === '/appearance') return 'Admin Theme Customizer';
    if (path === '/finance') return 'Financial Performance & Margins';
    if (path === '/events') return 'Event Bookings & Schedules';
    if (path.startsWith('/events/')) return 'Operational Event Room';
    if (path === '/calendar') return 'Studio Master Calendar';
    if (path === '/clients') return 'Client Directory & CRM';
    if (path === '/team') return 'Production Crew & Talents';
    if (path === '/equipment') return 'Gear Locker & Maintenance';
    if (path === '/packages') return 'Package Service Master';
    if (path === '/invoices') return 'Invoices & Billing';
    if (path === '/team-payments') return 'Crew Payroll Ledger';
    if (path === '/payout-batch') return 'Batch Crew Payout';
    if (path === '/studio-expenses') return 'Studio Overhead Expenses';
    if (path === '/tasks') return 'Post-Production Pipeline';
    if (path === '/reports') return 'Analytics & Reports';
    if (path === '/profile') return 'Studio Profile & Business Settings';
    return `${studioName} Manager`;
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-14 sm:h-16 px-3 sm:px-6 lg:px-8 bg-surface/90 backdrop-blur-md border-b border-border transition-colors duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onToggleMobileNav}
          className="lg:hidden p-2 rounded-lg text-text-muted hover:text-primary hover:bg-background shrink-0 cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="font-display text-lg sm:text-xl md:text-2xl font-semibold text-primary leading-tight truncate">
            {formatPathTitle(currentPath)}
          </h1>
          <div className="hidden xs:flex items-center gap-1.5 text-[11px] text-text-muted truncate">
            <span className="truncate">{studioName}</span>
            <span>·</span>
            <span className="capitalize truncate">{currentPath.replace('/', '') || 'Dashboard'}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-2.5">
        {/* Actionable Alert Buttons */}
        {overdueCount > 0 && (
          <button
            onClick={() => navigate('/invoices')}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-500/10 border border-rose-500/25 rounded-lg hover:bg-rose-500/20 transition-colors cursor-pointer"
            title={`${overdueCount} overdue invoice(s)`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>{overdueCount} Overdue</span>
          </button>
        )}

        {urgentTaskCount > 0 && (
          <button
            onClick={() => navigate('/tasks')}
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-accent-dark bg-accent/15 border border-accent/30 rounded-lg hover:bg-accent/25 transition-colors cursor-pointer"
            title={`${urgentTaskCount} urgent task(s) pending`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-accent" />
            <span>{urgentTaskCount} Urgent</span>
          </button>
        )}

        {/* Auto-Logout Inactivity Timer & Duration Selector */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
            isWarningSoon
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-500 animate-pulse'
              : 'bg-background border-border text-text-muted'
          }`}
          title={`Auto-logout after ${idleTimeoutMinutes} minutes of inactivity. Click timer to reset.`}
        >
          <button
            type="button"
            onClick={extendSession}
            className="inline-flex items-center gap-1.5 cursor-pointer hover:text-primary"
            aria-label="Reset inactivity timer"
          >
            <Clock className={`w-3.5 h-3.5 ${isWarningSoon ? 'text-rose-500' : 'text-accent'}`} />
            <span className="text-[11px] font-mono tabular-nums font-semibold">
              {timeFormatted}
            </span>
          </button>
          <select
            aria-label="Inactivity auto-logout duration"
            value={idleTimeoutMinutes}
            onChange={(e) =>
              setIdleTimeoutMinutes(Number(e.target.value) as 5 | 15 | 30 | 60)
            }
            className="hidden sm:inline-block bg-transparent text-[10px] font-semibold uppercase tracking-wider text-accent focus:outline-none cursor-pointer border-l border-border pl-1.5 ml-0.5"
          >
            <option value={5} className="bg-surface text-primary">5m Idle</option>
            <option value={15} className="bg-surface text-primary">15m Idle</option>
            <option value={30} className="bg-surface text-primary">30m Idle</option>
            <option value={60} className="bg-surface text-primary">60m Idle</option>
          </select>
        </div>

        {/* Admin Theme Customizer Quick Button */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate('/theme-customizer')}
            className={`p-2 hover:text-accent hover:bg-background border rounded-lg transition-all cursor-pointer ${
              currentPath === '/theme-customizer'
                ? 'text-accent border-accent bg-accent/10'
                : 'text-text-muted border-transparent hover:border-border'
            }`}
            title="Open Admin Theme Customizer"
            aria-label="Open Admin Theme Customizer"
          >
            <Palette className="w-4 h-4" />
          </button>
        )}

        {/* Synchronized Light / Dark Mode ThemeToggle */}
        <ThemeToggle />

        {/* Notification Alert Center (Admin & Staff Upcoming Events) */}
        <NotificationCenter navigate={navigate} />

        {/* Refresh button */}
        <button
          onClick={() => refreshAll()}
          disabled={isLoading}
          className="p-2 text-text-muted hover:text-primary hover:bg-background rounded-lg transition-colors cursor-pointer"
          title="Synchronize studio database"
        >
          <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-accent' : ''}`} />
        </button>

        {/* User Profile Summary */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="hidden sm:block text-right">
            <div className="text-xs font-semibold text-primary leading-tight">
              {isAdmin ? studioName : user?.name}
            </div>
            <div className="text-[10px] font-medium text-accent">
              {user?.email || 'admin@royalstudio.online'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
