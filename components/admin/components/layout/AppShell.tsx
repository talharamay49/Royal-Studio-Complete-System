import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Footer } from './Footer';
import { ToastContainer } from '../common/ToastContainer';
import { EventQrModal } from '../common/EventQrModal';
import { useAuth } from '../../context/AuthContext';
import { useStudioData } from '../../context/StudioDataContext';
import { Event } from '../../types';
import {
  X,
  LayoutDashboard,
  CalendarDays,
  Calendar,
  CheckSquare,
  CreditCard,
  FileText,
  Globe,
  Menu
} from 'lucide-react';

interface AppShellProps {
  currentPath: string;
  navigate: (path: string) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ currentPath, navigate, children }) => {
  const {
    isAdmin,
    showIdleWarning,
    idleRemainingSeconds,
    extendSession,
    logout,
  } = useAuth();
  const { events, tasks, teamMembers } = useStudioData();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [qrScannedEvent, setQrScannedEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || events.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const qrEventId = params.get('qrEvent');
    if (qrEventId) {
      const matched = events.find((e) => e.id === qrEventId);
      if (matched) {
        setQrScannedEvent(matched);
      }
    }
  }, [events]);

  const mobileQuickItems = isAdmin
    ? [
        { label: 'Home', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Events', path: '/events', icon: CalendarDays },
        { label: 'Billing', path: '/invoices', icon: FileText },
        { label: 'Website', path: '/website-cms', icon: Globe },
      ]
    : [
        { label: 'Assigned Work', path: '/tasks', icon: CheckSquare },
        { label: 'Assigned Events', path: '/events', icon: CalendarDays },
        { label: 'My Profile', path: '/profile', icon: CreditCard },
      ];

  return (
    <div className="admin-portal-root flex h-dvh w-screen overflow-hidden bg-background text-text font-sans transition-colors duration-300">
      {/* Desktop Sidebar (1024px+ for spacious tablet & desktop layout) */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar
          currentPath={currentPath}
          navigate={navigate}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
      </div>

      {/* Mobile & Tablet Slide-Over Drawer (<1024px) */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden bg-black/65 backdrop-blur-xs"
          onClick={() => setIsMobileNavOpen(false)}
        >
          <div
            className="relative flex flex-col w-72 max-w-[85vw] h-full bg-[#111111] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(false)}
              className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-white/10 text-white/80 hover:text-white border border-white/15"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar
              currentPath={currentPath}
              navigate={(path) => {
                navigate(path);
                setIsMobileNavOpen(false);
              }}
              isCollapsed={false}
              setIsCollapsed={() => {}}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        <Topbar
          currentPath={currentPath}
          onToggleMobileNav={() => setIsMobileNavOpen(true)}
          navigate={navigate}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 lg:p-8 2xl:p-10 pb-20 lg:pb-8 flex flex-col justify-between">
          <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto space-y-5 sm:space-y-6 w-full flex-1">
            {children}
            <Footer />
          </div>
        </main>

        {/* Mobile Bottom Quick-Navigation Bar */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#111111] border-t border-white/10 px-2 py-1.5 flex items-center justify-around shadow-2xl">
          {mobileQuickItems.map((item) => {
            const Icon = item.icon;
            const active =
              currentPath === item.path ||
              (item.path !== '/dashboard' && currentPath.startsWith(item.path));
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-semibold tracking-wider uppercase transition-colors ${
                  active ? 'text-accent' : 'text-white/60 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-semibold tracking-wider uppercase text-white/60 hover:text-white"
          >
            <Menu className="w-4 h-4 mb-0.5" />
            <span>Menu</span>
          </button>
        </nav>
      </div>

      <ToastContainer />

      {/* Mobile Scanned QR Assignment Modal */}
      <EventQrModal
        isOpen={Boolean(qrScannedEvent)}
        onClose={() => {
          setQrScannedEvent(null);
          if (typeof window !== 'undefined' && window.location.search.includes('qrEvent=')) {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }}
        event={qrScannedEvent}
        tasks={tasks}
        teamMembers={teamMembers}
      />

      {/* Pre-Logout 60-Second Inactivity Warning Modal */}
      {showIdleWarning && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="idle-warning-title"
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-accent/40 bg-surface p-6 sm:p-7 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
              <span className="font-mono text-lg font-bold tabular-nums">
                {idleRemainingSeconds}s
              </span>
            </div>
            <h3
              id="idle-warning-title"
              className="font-display text-2xl font-semibold text-primary"
            >
              Inactivity Session Warning
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-text-muted leading-relaxed">
              Your session will expire in{' '}
              <span className="font-semibold text-accent">{idleRemainingSeconds} seconds</span>{' '}
              due to inactivity. Would you like to extend your session and keep working?
            </p>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-background border border-border">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, (idleRemainingSeconds / 60) * 100))}%` }}
              />
            </div>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={extendSession}
                className="w-full sm:w-auto flex-1 py-2.5 px-5 rounded-xl bg-accent hover:bg-accent-light text-[#111111] text-xs font-semibold uppercase tracking-widest transition-all cursor-pointer"
              >
                Extend Session (Keep Working)
              </button>
              <button
                type="button"
                onClick={() => void logout('manual')}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-border bg-background hover:border-rose-500/50 hover:text-rose-500 text-xs font-semibold uppercase tracking-wider text-text-muted transition-all cursor-pointer"
              >
                Sign Out Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
