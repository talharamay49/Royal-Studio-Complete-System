import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Bell,
  Calendar,
  Clock,
  MapPin,
  CheckSquare,
  AlertTriangle,
  CheckCheck,
  X,
  BellRing,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStudioData } from '../../context/StudioDataContext';
import { formatDate } from '../../utils/calculations';

interface NotificationItem {
  id: string;
  type: 'EVENT' | 'TASK' | 'INVOICE';
  urgency: 'HIGH' | 'MEDIUM' | 'NORMAL';
  isWithin24Hours: boolean;
  title: string;
  subtitle: string;
  meta: string;
  daysUntil: number;
  targetPath: string;
}

interface NotificationCenterProps {
  navigate: (path: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ navigate }) => {
  const { user, isAdmin } = useAuth();
  const { events, tasks, invoices, equipment, equipmentAssignments, addToast } =
    useStudioData();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [filter, setFilter] = useState<'ALL' | 'EVENT' | 'TASK'>('ALL');
  const [pushPermission, setPushPermission] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const [readIds, setReadIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined' && user?.id) {
      try {
        const raw = window.localStorage.getItem(`royal_notif_read_${user.id}`);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const hasAnnouncedRef = useRef<boolean>(false);
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);

  // Register Service Worker for Mobile & Desktop Push Notifications
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw-notifications.js')
        .then((reg) => {
          swRegRef.current = reg;
        })
        .catch(() => {
          // Ignore service worker registration restrictions in preview
        });
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && user?.id) {
      try {
        const raw = window.localStorage.getItem(`royal_notif_read_${user.id}`);
        setReadIds(raw ? JSON.parse(raw) : []);
      } catch {
        setReadIds([]);
      }
    }
  }, [user?.id]);

  // Close popover on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Play a gentle chime when a 24h push alert fires
  const playNotificationChime = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Ignore audio autoplay block
    }
  }, []);

  // Dispatch Native Device / Mobile / Computer Notification
  const dispatchDevicePushNotification = useCallback(
    async (title: string, body: string, targetPath = '/admin') => {
      playNotificationChime();
      if (typeof window === 'undefined' || !('Notification' in window)) return false;

      try {
        let perm = Notification.permission;
        if (perm === 'default') {
          perm = await Notification.requestPermission();
          setPushPermission(perm);
        }

        if (perm === 'granted') {
          if (swRegRef.current && 'showNotification' in swRegRef.current) {
            await swRegRef.current.showNotification(title, {
              body,
              icon: '/icon.png',
              badge: '/icon.png',
              tag: `royal-studio-${Date.now()}`,
              data: { url: targetPath },
            });
            return true;
          }
          new Notification(title, {
            body,
            icon: '/icon.png',
          });
          return true;
        }
      } catch {
        // Fallback to in-app toast
      }
      return false;
    },
    [playNotificationChime]
  );

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Upcoming Events (24h Priority Alert + Scheduled Events for Admin & Staff)
    const activeEvents = events
      .filter((e) => e.status !== 'Cancelled' && e.status !== 'Completed')
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

    activeEvents.forEach((evt) => {
      const evtStartStr = `${evt.eventDate}T${evt.startTime || '18:00'}:00`;
      const evtDateTime = new Date(evtStartStr);
      const evtDateOnly = new Date(evt.eventDate);
      evtDateOnly.setHours(0, 0, 0, 0);

      const diffHours = (evtDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      const diffDays = Math.round(
        (evtDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      const isWithin24Hours = (diffHours >= -6 && diffHours <= 24) || diffDays === 0 || diffDays === 1;

      if (diffDays >= -2 && diffDays <= 60) {
        const dayBadge =
          diffDays === 0
            ? '24h Alert · Today'
            : diffDays === 1
            ? '24h Alert · Tomorrow'
            : diffDays < 0
            ? 'Active Shoot'
            : `In ${diffDays} days`;

        const locationStr = [evt.venue, evt.city].filter(Boolean).join(', ') || 'Burewala';
        const timeStr = `${evt.startTime || '18:00'} – ${evt.endTime || '23:00'}`;

        const reservedGearCount = equipmentAssignments.filter(
          (ea) => ea.eventId === evt.id
        ).length;
        const gearNote =
          reservedGearCount > 0 ? ` · ${reservedGearCount} Gear Reserved` : '';

        items.push({
          id: `notif-evt-${evt.id}-${evt.eventDate}`,
          type: 'EVENT',
          urgency: isWithin24Hours || diffDays <= 3 ? 'HIGH' : diffDays <= 14 ? 'MEDIUM' : 'NORMAL',
          isWithin24Hours,
          title: `${dayBadge}: ${evt.title}`,
          subtitle: `Date: ${formatDate(evt.eventDate)} · Time: ${timeStr}`,
          meta: `Location: ${locationStr}${gearNote}`,
          daysUntil: diffDays,
          targetPath: isAdmin ? `/calendar` : `/events`,
        });
      }
    });

    // 2. Assigned / Pending Tasks
    tasks
      .filter((t) => t.status !== 'Completed')
      .forEach((tsk) => {
        const due = new Date(tsk.dueDate);
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const dueLabel =
          diffDays < 0
            ? `Overdue (${Math.abs(diffDays)}d ago)`
            : diffDays === 0
            ? 'Due Today (24h)'
            : diffDays === 1
            ? 'Due Tomorrow (24h)'
            : `Due ${formatDate(tsk.dueDate)}`;

        items.push({
          id: `notif-tsk-${tsk.id}-${tsk.status}`,
          type: 'TASK',
          urgency: tsk.priority === 'Urgent' || diffDays <= 1 ? 'HIGH' : 'MEDIUM',
          isWithin24Hours: diffDays === 0 || diffDays === 1,
          title: `Task [${tsk.priority}]: ${tsk.title}`,
          subtitle: `${dueLabel} · Status: ${tsk.status}`,
          meta: isAdmin ? 'Post-Production Pipeline' : 'Assigned Work',
          daysUntil: diffDays,
          targetPath: '/tasks',
        });
      });

    // 3. Overdue Invoices (Admin Only)
    if (isAdmin) {
      invoices
        .filter((inv) => inv.status === 'Overdue')
        .forEach((inv) => {
          items.push({
            id: `notif-inv-${inv.id}`,
            type: 'INVOICE',
            urgency: 'HIGH',
            isWithin24Hours: true,
            title: `Overdue Invoice ${inv.invoiceNumber}`,
            subtitle: `Due ${formatDate(inv.dueDate)} · Balance PKR ${inv.remainingAmount.toLocaleString()}`,
            meta: 'Client Billing Alert',
            daysUntil: -1,
            targetPath: '/invoices',
          });
        });
    }

    return items.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [events, tasks, invoices, equipmentAssignments, isAdmin]);

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  // Automatic 24-Hour Pre-Event Toast + Device Push Notification on Session Start
  useEffect(() => {
    if (hasAnnouncedRef.current || notifications.length === 0 || !user) return;
    const upcomingEvents = notifications.filter((n) => n.type === 'EVENT');
    if (upcomingEvents.length > 0) {
      hasAnnouncedRef.current = true;
      const priorityEvt =
        upcomingEvents.find((e) => e.isWithin24Hours) || upcomingEvents[0];

      const alertLabel = priorityEvt.isWithin24Hours
        ? `24h Event Preparation Alert: ${priorityEvt.title}`
        : `Upcoming Assigned Event: ${priorityEvt.title}`;

      addToast(`${alertLabel} — ${priorityEvt.subtitle} (${priorityEvt.meta})`, 'info');

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        void dispatchDevicePushNotification(
          alertLabel,
          `${priorityEvt.subtitle} · ${priorityEvt.meta}`,
          priorityEvt.targetPath
        );
      }
    }
  }, [notifications, user, addToast, dispatchDevicePushNotification]);

  const markAsRead = (id: string) => {
    if (readIds.includes(id)) return;
    const updated = [...readIds, id];
    setReadIds(updated);
    if (typeof window !== 'undefined' && user?.id) {
      try {
        window.localStorage.setItem(`royal_notif_read_${user.id}`, JSON.stringify(updated));
      } catch {
        // Ignore
      }
    }
  };

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    if (typeof window !== 'undefined' && user?.id) {
      try {
        window.localStorage.setItem(`royal_notif_read_${user.id}`, JSON.stringify(allIds));
      } catch {
        // Ignore
      }
    }
  };

  const handleEnableAndSendPushAlert = async () => {
    const upcomingEvents = notifications.filter((n) => n.type === 'EVENT');
    const targetEvt = upcomingEvents[0];
    const title = targetEvt
      ? `24h Event Reminder: ${targetEvt.title}`
      : 'Royal Studio Device Push Alert';
    const body = targetEvt
      ? `${targetEvt.subtitle} · ${targetEvt.meta}`
      : `You have ${notifications.length} active studio notification(s).`;

    const sentNative = await dispatchDevicePushNotification(
      title,
      body,
      isAdmin ? '/admin/calendar' : '/admin/events'
    );

    if (sentNative) {
      addToast('Mobile & Computer push notification dispatched to your device!');
    } else {
      addToast(`${title} — ${body}`, 'info');
    }
  };

  const filteredNotifications = notifications.filter(
    (n) => filter === 'ALL' || n.type === filter
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-2 rounded-lg border transition-all cursor-pointer ${
          isOpen
            ? 'text-accent border-accent bg-accent/10'
            : 'text-text-muted border-transparent hover:text-primary hover:bg-background hover:border-border'
        }`}
        title="24h Upcoming Event & Device Push Notifications"
        aria-label="Open Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed sm:absolute right-3 sm:right-0 top-14 sm:top-auto sm:mt-2 w-[calc(100vw-1.5rem)] sm:w-96 rounded-2xl border border-border bg-surface shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="p-3.5 border-b border-border flex items-center justify-between gap-2 bg-background/60">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-accent" />
              <span className="text-xs font-bold text-primary">
                {isAdmin ? '24h Studio & Device Alerts' : '24h Assigned Event Alerts'}
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-accent/15 text-accent">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="px-2 py-1 rounded-lg text-[10px] font-semibold text-accent hover:bg-accent/10 transition-colors cursor-pointer inline-flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Read All</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-primary cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Device / Mobile Push Status Bar */}
          <div className="px-3.5 py-2 bg-accent/10 border-b border-border flex items-center justify-between gap-2 text-[11px]">
            <span className="flex items-center gap-1.5 text-primary font-medium">
              <Smartphone className="w-3.5 h-3.5 text-accent" />
              <Laptop className="w-3.5 h-3.5 text-accent" />
              <span>
                Device Push:{' '}
                <strong className="text-accent">
                  {pushPermission === 'granted' ? 'Active (Mobile & PC)' : 'Ready'}
                </strong>
              </span>
            </span>
            <button
              type="button"
              onClick={handleEnableAndSendPushAlert}
              className="px-2.5 py-1 rounded-lg bg-accent text-[#111111] font-bold text-[10px] uppercase tracking-wider cursor-pointer"
            >
              {pushPermission === 'granted' ? 'Send 24h Push' : 'Enable Device Push'}
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center justify-between gap-1 px-3 py-2 border-b border-border bg-surface text-[11px]">
            <div className="flex items-center gap-1">
              {(['ALL', 'EVENT', 'TASK'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    filter === tab
                      ? 'bg-accent text-[#111111]'
                      : 'text-text-muted hover:text-primary hover:bg-background'
                  }`}
                >
                  {tab === 'ALL'
                    ? `All (${notifications.length})`
                    : tab === 'EVENT'
                    ? `Events (${notifications.filter((n) => n.type === 'EVENT').length})`
                    : `Tasks (${notifications.filter((n) => n.type === 'TASK').length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Notification Items */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-1.5">
                <Bell className="w-6 h-6 text-text-muted mx-auto opacity-50" />
                <div className="text-xs font-semibold text-primary">No Active Alerts</div>
                <p className="text-[11px] text-text-muted">
                  24-hour pre-event preparation alerts and task reminders appear here automatically.
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const isUnread = !readIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      markAsRead(item.id);
                      setIsOpen(false);
                      navigate(item.targetPath);
                    }}
                    className={`p-3.5 hover:bg-background/80 transition-colors cursor-pointer flex items-start gap-3 ${
                      isUnread ? 'bg-accent/5' : ''
                    }`}
                  >
                    <div
                      className={`mt-0.5 p-2 rounded-xl shrink-0 ${
                        item.isWithin24Hours
                          ? 'bg-rose-500/15 text-rose-500'
                          : item.type === 'EVENT'
                          ? 'bg-amber-500/15 text-amber-500'
                          : 'bg-sky-500/15 text-sky-500'
                      }`}
                    >
                      {item.type === 'EVENT' ? (
                        <Calendar className="w-4 h-4" />
                      ) : item.type === 'TASK' ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-primary truncate">
                          {item.title}
                        </span>
                        {item.isWithin24Hours && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500 text-[9px] font-bold uppercase shrink-0">
                            24h Alert
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-text-muted flex items-center gap-1 truncate">
                        <Clock className="w-3 h-3 text-accent shrink-0" />
                        <span className="truncate">{item.subtitle}</span>
                      </div>
                      <div className="text-[10px] text-text-muted flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-accent shrink-0" />
                        <span className="truncate">{item.meta}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Action */}
          <div className="p-2.5 border-t border-border bg-background/60 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleEnableAndSendPushAlert}
              className="text-[11px] font-semibold text-accent hover:underline cursor-pointer px-2 py-1"
            >
              Test Mobile / PC Alert Now
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate(isAdmin ? '/calendar' : '/events');
              }}
              className="text-[11px] font-semibold text-primary hover:text-accent cursor-pointer px-2 py-1"
            >
              {isAdmin ? 'Open Master Calendar →' : 'View Assigned Events →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
