import React from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  DollarSign,
  CalendarDays,
  Calendar,
  Users,
  UserCheck,
  Camera,
  Package,
  FileText,
  CreditCard,
  Layers,
  Building2,
  CheckSquare,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  User as UserIcon,
  Globe,
  Sun,
  Moon,
  Palette,
  Bot
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStudioData } from '../../context/StudioDataContext';
import { useStudioTheme } from '@/components/shared/StudioProfileContext';

interface SidebarProps {
  currentPath: string;
  navigate: (path: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  navigate,
  isCollapsed,
  setIsCollapsed
}) => {
  const { user, isAdmin, isClient, logout } = useAuth();
  const { profile } = useStudioData();
  const { resolvedMode, toggleThemeMode, themeConfig } = useStudioTheme();

  const studioName = profile?.studioName || 'Royal Studio';
  const logoSrc = profile?.primaryLogo || profile?.logo || '/RoyalLogo.png';
  const sidebarStyle = themeConfig.sidebarStyle || 'obsidian';

  const isEditorialLight = sidebarStyle === 'editorial' && resolvedMode === 'light';

  const adminNavItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Chatbot Manager', path: '/chatbot-manager', icon: Bot },
    { label: 'Website & Portfolio CMS', path: '/website-cms', icon: Globe },
    { label: 'Finance', path: '/finance', icon: DollarSign },
    { label: 'Events', path: '/events', icon: CalendarDays },
    { label: 'Calendar', path: '/calendar', icon: Calendar },
    { label: 'Clients', path: '/clients', icon: Users },
    { label: 'Team', path: '/team', icon: UserCheck },
    { label: 'Equipment', path: '/equipment', icon: Camera },
    { label: 'Packages', path: '/packages', icon: Package },
    { label: 'Invoices', path: '/invoices', icon: FileText },
    { label: 'Team Payments', path: '/team-payments', icon: CreditCard },
    { label: 'Payout Batch', path: '/payout-batch', icon: Layers },
    { label: 'Studio Expenses', path: '/studio-expenses', icon: Building2 },
    { label: 'Tasks', path: '/tasks', icon: CheckSquare },
    { label: 'Reports', path: '/reports', icon: BarChart3 },
    { label: 'Theme Customizer', path: '/theme-customizer', icon: Palette },
    { label: 'Studio Settings', path: '/profile', icon: Settings }
  ];

  const staffNavItems = [
    { label: 'Assigned Work', path: '/tasks', icon: CheckSquare },
    { label: 'Assigned Events', path: '/events', icon: CalendarDays },
    { label: 'My Profile', path: '/profile', icon: Settings }
  ];

  const clientNavItems = [
    { label: 'My Events & Schedule', path: '/events', icon: CalendarDays },
    { label: 'Payments & Invoices', path: '/invoices', icon: CreditCard },
    { label: 'Photo Proofing Gallery', path: '/client-gallery', icon: Camera },
    { label: 'My Client Profile', path: '/profile', icon: UserIcon }
  ];

  const navItems = isAdmin ? adminNavItems : isClient ? clientNavItems : staffNavItems;

  return (
    <aside
      className={`relative flex flex-col h-full transition-all duration-300 z-30 border-r ${
        isEditorialLight
          ? 'bg-surface text-text border-border'
          : 'bg-[#111111] text-[#e8e4dc] border-white/10'
      } ${isCollapsed ? 'w-20' : 'w-full lg:w-64'}`}
    >
      {/* Brand Header matching Portfolio Luxury Typography */}
      <div
        className={`flex items-center justify-between px-4 py-5 border-b ${
          isEditorialLight ? 'border-border' : 'border-white/10'
        }`}
      >
        <div
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-3 cursor-pointer overflow-hidden"
        >
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={studioName}
              className={`w-10 h-10 rounded-xl object-contain p-1 border shrink-0 ${
                isEditorialLight
                  ? 'bg-background border-border'
                  : 'bg-[#1a1a1a] border-white/10'
              }`}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/RoyalLogo.png';
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center font-display font-bold text-[#111111] shadow-md shrink-0">
              RS
            </div>
          )}
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span
                className={`font-display font-semibold text-base tracking-wide truncate ${
                  isEditorialLight ? 'text-primary' : 'text-white'
                }`}
              >
                {studioName}
              </span>
              <span className="text-[10px] text-accent font-medium tracking-[0.18em] uppercase">
                {profile?.city || 'Burewala'} · Studio ERP
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`hidden md:flex p-1.5 rounded-lg transition-colors cursor-pointer ${
            isEditorialLight
              ? 'text-text-muted hover:text-primary hover:bg-background'
              : 'text-white/50 hover:text-white hover:bg-white/10'
          }`}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div
          className={`px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] ${
            isEditorialLight ? 'text-text-muted' : 'text-white/40'
          }`}
        >
          {!isCollapsed &&
            (isAdmin
              ? 'Studio Management'
              : isClient
              ? 'Client Portal'
              : 'Staff Workspace')}
        </div>
        {navItems.map((item) => {
          const isActive =
            currentPath === item.path ||
            (item.path !== '/dashboard' && currentPath.startsWith(item.path));
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-accent text-[#111111] font-semibold shadow-xs'
                  : isEditorialLight
                  ? 'text-text hover:text-primary hover:bg-background'
                  : 'text-white/75 hover:text-white hover:bg-white/5'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive
                    ? 'text-[#111111]'
                    : isEditorialLight
                    ? 'text-text-muted'
                    : 'text-white/50'
                }`}
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Quick Actions: Theme Toggle & Public Site Link */}
      <div className="px-3 pb-2 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleThemeMode}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              isEditorialLight
                ? 'border-border text-text hover:border-accent hover:text-accent bg-background/60'
                : 'border-white/10 text-white/80 hover:border-accent hover:text-accent bg-white/5'
            }`}
            title={resolvedMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {resolvedMode === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-accent shrink-0" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-accent shrink-0" />
            )}
            {!isCollapsed && (
              <span className="truncate">
                {resolvedMode === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            )}
          </button>

          {!isCollapsed && isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/theme-customizer')}
              className={`p-2 rounded-lg border transition-all cursor-pointer ${
                isEditorialLight
                  ? 'border-border text-text hover:border-accent hover:text-accent bg-background/60'
                  : 'border-white/10 text-white/80 hover:border-accent hover:text-accent bg-white/5'
              }`}
              title="Open Admin Theme Customizer"
            >
              <Palette className="w-3.5 h-3.5 text-accent" />
            </button>
          )}
        </div>

        <Link
          href="/"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-accent hover:bg-accent/10 border border-accent/25 transition-all"
          title={isCollapsed ? 'View Public Website' : undefined}
        >
          <Globe className="w-4 h-4 shrink-0 text-accent" />
          {!isCollapsed && <span className="truncate">Public Portfolio</span>}
        </Link>
      </div>

      {/* User Footer */}
      <div
        className={`p-3 border-t ${
          isEditorialLight ? 'border-border bg-background/50' : 'border-white/10 bg-black/40'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-accent font-bold shrink-0 border ${
                isEditorialLight
                  ? 'bg-surface border-border'
                  : 'bg-[#1c1c1c] border-white/10'
              }`}
            >
              {isAdmin ? <Shield className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div
                  className={`text-xs font-semibold truncate ${
                    isEditorialLight ? 'text-primary' : 'text-white'
                  }`}
                >
                  {user?.email || 'admin@royalstudio.online'}
                </div>
                <div className="text-[10px] text-accent font-medium truncate">
                  {isAdmin ? 'Administrator · Active' : user?.name}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => logout()}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isEditorialLight
                ? 'text-text-muted hover:text-rose-600 hover:bg-rose-50'
                : 'text-white/50 hover:text-rose-400 hover:bg-white/10'
            }`}
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
