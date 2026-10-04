import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Plus,
  Search,
  QrCode,
  Edit,
  ExternalLink,
  Trash2,
  UserPlus,
  LayoutGrid,
  Columns,
  List,
  CalendarDays,
  CheckCircle2,
  Camera,
  Users,
  Sparkles,
  Check,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { useStudioData } from '../context/StudioDataContext';
import { formatDate, formatPKR } from '../utils/calculations';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { EventQrModal } from '../components/common/EventQrModal';
import { IntegratedBookingModal } from '../components/common/IntegratedBookingModal';
import { Event, EventStatus } from '../types';

interface CalendarPageProps {
  navigate: (path: string) => void;
}

type CalendarViewMode = 'MONTH' | 'WEEK' | 'DAY' | 'AGENDA';

const HOURS_SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
  '23:00',
];

const BOOKING_ADDONS = [
  { id: 'addon-drone', name: '4K Drone Aerial Coverage', price: 25000 },
  { id: 'addon-sde', name: 'Same-Day Edit (SDE) Highlight Reel', price: 30000 },
  { id: 'addon-gimbal', name: 'Ronin 4D / Crane Cinema Rig', price: 20000 },
  { id: 'addon-album', name: 'Luxury Italian Acrylic Album', price: 35000 },
];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({ navigate }) => {
  const {
    events,
    daySchedules,
    clients,
    packages,
    tasks,
    teamMembers,
    teamAssignments,
    equipment,
    equipmentAssignments,
    createClient,
    createEvent,
    updateEvent,
    deleteEvent,
    addToast,
  } = useStudioData();

  // Initialize calendar to current month
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date('2026-10-15T12:00:00'));
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-10-25');
  const [viewMode, setViewMode] = useState<CalendarViewMode>('MONTH');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Event Inspector / Reschedule Modal state
  const [inspectedEvent, setInspectedEvent] = useState<Event | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleStart, setRescheduleStart] = useState<string>('18:00');
  const [rescheduleEnd, setRescheduleEnd] = useState<string>('23:00');
  const [rescheduleVenue, setRescheduleVenue] = useState<string>('');
  const [rescheduleStatus, setRescheduleStatus] = useState<EventStatus>('Confirmed');
  const [isUpdatingEvent, setIsUpdatingEvent] = useState<boolean>(false);

  // QR Modal state
  const [qrEvent, setQrEvent] = useState<Event | null>(null);

  // Unified 3-Step Calendar-First Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [bookingDate, setBookingDate] = useState<string>('2026-10-25');
  const [bookingStartTime, setBookingStartTime] = useState<string>('18:00');

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      if (evt.status === 'Cancelled') return false;
      const client = clients.find((c) => c.id === evt.clientId);
      const matchesSearch =
        !searchQuery.trim() ||
        (evt.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (evt.venue || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (evt.city || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = categoryFilter === 'ALL' || evt.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [events, clients, searchQuery, categoryFilter]);

  const openBookingModalForSlot = (dateStr: string, startHour = '18:00') => {
    setBookingDate(dateStr);
    setSelectedDateStr(dateStr);
    setBookingStartTime(startHour);
    setIsBookingModalOpen(true);
  };

  const openInspector = (evt: Event) => {
    setInspectedEvent(evt);
    setRescheduleDate(evt.eventDate);
    setRescheduleStart(evt.startTime || '18:00');
    setRescheduleEnd(evt.endTime || '23:00');
    setRescheduleVenue(evt.venue || '');
    setRescheduleStatus(evt.status);
  };

  const handleSaveInspectorChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectedEvent) return;
    setIsUpdatingEvent(true);
    try {
      await updateEvent(inspectedEvent.id, {
        eventDate: rescheduleDate,
        startTime: rescheduleStart,
        endTime: rescheduleEnd,
        venue: rescheduleVenue,
        status: rescheduleStatus,
      });
      setInspectedEvent(null);
      addToast('Calendar event schedule updated.');
    } catch (err: any) {
      addToast(err?.message || 'Failed to update event schedule', 'error');
    } finally {
      setIsUpdatingEvent(false);
    }
  };

  // Navigation Handlers
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'MONTH' || viewMode === 'AGENDA') {
      d.setMonth(d.getMonth() - 1, 1);
    } else if (viewMode === 'WEEK') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
      setSelectedDateStr(toDateStr(d));
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'MONTH' || viewMode === 'AGENDA') {
      d.setMonth(d.getMonth() + 1, 1);
    } else if (viewMode === 'WEEK') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
      setSelectedDateStr(toDateStr(d));
    }
    setCurrentDate(d);
  };

  const handleGoToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(toDateStr(today));
  };

  // Compute Month Grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays: Array<{ dayNumber: number; dateStr: string } | null> = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ dayNumber: d, dateStr });
  }

  // Compute Week Days
  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(start);
      d.setDate(start.getDate() + idx);
      return {
        date: d,
        dateStr: toDateStr(d),
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
      };
    });
  }, [currentDate]);

  const getEventsForDate = (dateStr: string) => {
    return filteredEvents.filter((e) => {
      if (e.eventDate === dateStr) return true;
      return daySchedules.some((ds) => ds.eventId === e.id && ds.date === dateStr);
    });
  };

  const getEventReservedGear = (eventId: string) => {
    return equipmentAssignments
      .filter((ea) => ea.eventId === eventId)
      .map((ea) => equipment.find((eq) => eq.id === ea.equipmentId))
      .filter(Boolean);
  };

  const selectedDayEvents = getEventsForDate(selectedDateStr);
  const todayStr = toDateStr(new Date());

  const headerTitle = useMemo(() => {
    if (viewMode === 'MONTH' || viewMode === 'AGENDA') {
      return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    if (viewMode === 'WEEK') {
      const first = weekDays[0].date;
      const last = weekDays[6].date;
      return `${first.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} – ${last.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`;
    }
    return new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [viewMode, currentDate, weekDays, selectedDateStr]);

  return (
    <div className="space-y-5">
      {/* Top Google Calendar Style Control Bar */}
      <div className="p-4 sm:p-5 bg-surface rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => openBookingModalForSlot(selectedDateStr)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-light text-[#111111] rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Quick Calendar Booking</span>
            </button>

            <button
              type="button"
              onClick={handleGoToday}
              className="px-3.5 py-2 bg-background hover:bg-surface border border-border rounded-xl text-xs font-semibold text-primary transition-colors cursor-pointer"
            >
              Today
            </button>

            <div className="inline-flex items-center bg-background border border-border rounded-xl p-0.5">
              <button
                type="button"
                onClick={handlePrev}
                className="p-2 rounded-lg hover:bg-surface text-text-muted hover:text-primary transition-colors cursor-pointer"
                aria-label="Previous period"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="p-2 rounded-lg hover:bg-surface text-text-muted hover:text-primary transition-colors cursor-pointer"
                aria-label="Next period"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <h2 className="font-display text-lg sm:text-2xl font-bold text-primary pl-1">
              {headerTitle}
            </h2>
          </div>

          {/* Right: View Switcher (Month / Week / Day / Schedule) */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center bg-background border border-border rounded-xl p-1">
              {(
                [
                  { id: 'MONTH', label: 'Month', icon: LayoutGrid },
                  { id: 'WEEK', label: 'Week', icon: Columns },
                  { id: 'DAY', label: 'Day', icon: CalendarDays },
                  { id: 'AGENDA', label: 'Schedule', icon: List },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = viewMode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setViewMode(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? 'bg-accent text-[#111111] shadow-2xs'
                        : 'text-text-muted hover:text-primary'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Search & Category Filter Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bookings by title, client, venue, city..."
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-xs text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-xl text-xs font-semibold text-primary focus:outline-none focus:border-accent"
            >
              <option value="ALL">All Event Categories</option>
              <option value="Wedding">Wedding</option>
              <option value="Nikah">Nikah</option>
              <option value="Engagement">Engagement</option>
              <option value="Corporate">Corporate</option>
              <option value="Birthday">Birthday</option>
              <option value="Concert">Concert</option>
            </select>
            <span className="text-[11px] text-text-muted">
              Click any date or time slot to launch 1-stop booking &amp; gear allocation
            </span>
          </div>
        </div>
      </div>

      {/* ===================== 1. MONTH VIEW (RESPONSIVE DESKTOP + MOBILE) ===================== */}
      {viewMode === 'MONTH' && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 items-start">
          {/* Calendar 7-Col Grid */}
          <div className="xl:col-span-3 bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border bg-background/70 text-center py-2.5 text-[11px] font-bold uppercase tracking-wider text-text-muted">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            <div className="grid grid-cols-7 divide-x divide-y divide-border">
              {calendarDays.map((cell, index) => {
                if (!cell) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="min-h-20 sm:min-h-28 md:min-h-32 bg-background/30 p-1.5"
                    />
                  );
                }

                const matchedEvents = getEventsForDate(cell.dateStr);
                const isSelected = selectedDateStr === cell.dateStr;
                const isToday = todayStr === cell.dateStr;

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => openBookingModalForSlot(cell.dateStr)}
                    className={`min-h-20 sm:min-h-28 md:min-h-32 p-1.5 sm:p-2 flex flex-col justify-between transition-colors cursor-pointer group ${
                      isSelected
                        ? 'bg-accent/10 ring-1 ring-inset ring-accent'
                        : 'hover:bg-background/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isToday
                            ? 'bg-accent text-[#111111]'
                            : isSelected
                            ? 'text-accent font-extrabold'
                            : 'text-primary'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openBookingModalForSlot(cell.dateStr);
                        }}
                        className="opacity-70 sm:opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-accent/20 text-accent transition-opacity cursor-pointer"
                        title={`Quick Book on ${cell.dateStr}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-1 space-y-1 flex-1 overflow-hidden">
                      {matchedEvents.length > 0 && (
                        <div className="sm:hidden flex flex-wrap gap-1 mt-1">
                          {matchedEvents.map((ev) => (
                            <span
                              key={ev.id}
                              className="w-2 h-2 rounded-full bg-accent inline-block"
                            />
                          ))}
                          <span className="text-[10px] font-bold text-accent">
                            {matchedEvents.length}
                          </span>
                        </div>
                      )}

                      <div className="hidden sm:block space-y-1">
                        {matchedEvents.slice(0, 3).map((evt) => {
                          const gearCount = getEventReservedGear(evt.id).length;
                          return (
                            <div
                              key={evt.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                openInspector(evt);
                              }}
                              className="p-1.5 rounded-lg bg-accent/15 hover:bg-accent/25 border border-accent/30 text-[10px] transition-colors cursor-pointer"
                            >
                              <div className="font-bold text-primary truncate">{evt.title}</div>
                              <div className="flex items-center justify-between text-[9px] text-text-muted mt-0.5">
                                <span>{evt.startTime || '18:00'}</span>
                                <span>{gearCount > 0 ? `${gearCount} gear` : evt.venue}</span>
                              </div>
                            </div>
                          );
                        })}
                        {matchedEvents.length > 3 && (
                          <div className="text-[10px] font-bold text-accent pl-1">
                            +{matchedEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Selected-Day Agenda & Resource Sidebar */}
          <div className="bg-surface rounded-2xl border border-border p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-accent">
                  Selected Date Schedule
                </div>
                <h3 className="font-display text-lg font-bold text-primary">
                  {formatDate(selectedDateStr)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => openBookingModalForSlot(selectedDateStr)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-accent hover:bg-accent-light text-[#111111] text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Book Date</span>
              </button>
            </div>

            {selectedDayEvents.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CalendarIcon className="w-8 h-8 text-text-muted mx-auto opacity-50" />
                <div className="text-xs font-semibold text-primary">Date Available for Booking</div>
                <p className="text-[11px] text-text-muted">
                  No studio shoots scheduled on {formatDate(selectedDateStr)}.
                </p>
                <button
                  type="button"
                  onClick={() => openBookingModalForSlot(selectedDateStr)}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-accent/40 text-accent hover:bg-accent/10 text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Event on This Date</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayEvents.map((evt) => {
                  const client = clients.find((c) => c.id === evt.clientId);
                  const reservedGear = getEventReservedGear(evt.id);
                  return (
                    <div
                      key={evt.id}
                      className="p-3.5 rounded-xl bg-background border border-border hover:border-accent/50 transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                            {evt.category}
                          </span>
                          <h4 className="text-xs font-bold text-primary leading-snug">
                            {evt.title}
                          </h4>
                        </div>
                        <StatusBadge status={evt.status} size="sm" />
                      </div>

                      <div className="space-y-1 text-[11px] text-text-muted">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span>
                            {evt.startTime || '18:00'} – {evt.endTime || '23:00'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span className="truncate">
                            {[evt.venue, evt.city].filter(Boolean).join(', ')}
                          </span>
                        </div>
                        {client && (
                          <div className="text-[10px] text-primary font-medium">
                            Client: {client.name} ({client.phone})
                          </div>
                        )}
                      </div>

                      {/* Reserved Gear List */}
                      {reservedGear.length > 0 && (
                        <div className="pt-2 border-t border-border space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-accent flex items-center gap-1">
                            <Camera className="w-3 h-3" />
                            <span>Reserved Gear ({reservedGear.length})</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {reservedGear.map((eq) =>
                              eq ? (
                                <span
                                  key={eq.id}
                                  className="px-2 py-0.5 rounded bg-surface border border-border text-[10px] font-medium text-primary"
                                >
                                  {eq.name}
                                </span>
                              ) : null
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-border">
                        <button
                          type="button"
                          onClick={() => setQrEvent(evt)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/15 hover:bg-accent/25 text-accent text-[10px] font-bold cursor-pointer"
                        >
                          <QrCode className="w-3 h-3" />
                          <span>QR Pass</span>
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openInspector(evt)}
                            className="px-2 py-1 rounded-lg border border-border hover:border-accent text-[10px] font-semibold text-primary cursor-pointer"
                          >
                            Edit / Reschedule
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/events/${evt.id}`)}
                            className="p-1 rounded-lg border border-border hover:border-accent text-primary cursor-pointer"
                            title="Open Event Room"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== 2. WEEK VIEW ===================== */}
      {viewMode === 'WEEK' && (
        <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-x-auto">
          <div className="min-w-[780px]">
            <div className="grid grid-cols-8 border-b border-border bg-background/70">
              <div className="p-3 text-[10px] font-bold uppercase tracking-wider text-text-muted text-center border-r border-border">
                PKT Time
              </div>
              {weekDays.map((wd) => {
                const isToday = wd.dateStr === todayStr;
                const dayEvts = getEventsForDate(wd.dateStr);
                return (
                  <div
                    key={wd.dateStr}
                    onClick={() => {
                      setSelectedDateStr(wd.dateStr);
                      setViewMode('DAY');
                    }}
                    className={`p-2.5 text-center border-r border-border last:border-r-0 cursor-pointer hover:bg-background ${
                      isToday ? 'bg-accent/10' : ''
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      {wd.dayName}
                    </div>
                    <div
                      className={`mt-0.5 inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-bold ${
                        isToday ? 'bg-accent text-[#111111]' : 'text-primary'
                      }`}
                    >
                      {wd.dayNum}
                    </div>
                    {dayEvts.length > 0 && (
                      <div className="text-[10px] font-semibold text-accent mt-0.5">
                        {dayEvts.length} booking(s)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="divide-y divide-border">
              {HOURS_SLOTS.map((hourSlot) => {
                const hourPrefix = hourSlot.slice(0, 2);
                return (
                  <div key={hourSlot} className="grid grid-cols-8 min-h-14">
                    <div className="p-2 text-[11px] font-mono text-text-muted text-center border-r border-border bg-background/40">
                      {hourSlot}
                    </div>
                    {weekDays.map((wd) => {
                      const slotEvents = getEventsForDate(wd.dateStr).filter(
                        (e) => (e.startTime || '18:00').slice(0, 2) === hourPrefix
                      );
                      return (
                        <div
                          key={`${wd.dateStr}-${hourSlot}`}
                          onClick={() => openBookingModalForSlot(wd.dateStr, hourSlot)}
                          className="p-1 border-r border-border last:border-r-0 hover:bg-accent/5 transition-colors cursor-pointer space-y-1"
                        >
                          {slotEvents.map((ev) => (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                openInspector(ev);
                              }}
                              className="p-1.5 rounded-lg bg-accent/20 border border-accent/40 text-[10px] shadow-2xs"
                            >
                              <div className="font-bold text-primary truncate">{ev.title}</div>
                              <div className="text-[9px] text-text-muted truncate">
                                {ev.startTime}–{ev.endTime} · {ev.venue}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================== 3. DAY VIEW ===================== */}
      {viewMode === 'DAY' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          <div className="lg:col-span-2 bg-surface rounded-2xl border border-border shadow-xs overflow-hidden divide-y divide-border">
            {HOURS_SLOTS.map((hourSlot) => {
              const hourPrefix = hourSlot.slice(0, 2);
              const matching = selectedDayEvents.filter(
                (e) => (e.startTime || '18:00').slice(0, 2) === hourPrefix
              );
              return (
                <div
                  key={hourSlot}
                  onClick={() => openBookingModalForSlot(selectedDateStr, hourSlot)}
                  className="flex items-stretch min-h-16 hover:bg-accent/5 transition-colors cursor-pointer group"
                >
                  <div className="w-20 shrink-0 p-3 text-xs font-mono text-text-muted border-r border-border bg-background/40 flex items-center justify-center">
                    {hourSlot}
                  </div>
                  <div className="flex-1 p-2 space-y-1.5 flex flex-col justify-center">
                    {matching.length === 0 ? (
                      <span className="text-[11px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity pl-2">
                        + Click to book event at {hourSlot} on {formatDate(selectedDateStr)}
                      </span>
                    ) : (
                      matching.map((ev) => {
                        const gear = getEventReservedGear(ev.id);
                        return (
                          <div
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              openInspector(ev);
                            }}
                            className="p-3 rounded-xl bg-accent/15 border border-accent/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div>
                              <div className="text-xs font-bold text-primary">{ev.title}</div>
                              <div className="text-[11px] text-text-muted">
                                {ev.startTime || '18:00'} – {ev.endTime || '23:00'} · {ev.venue},{' '}
                                {ev.city}
                              </div>
                              {gear.length > 0 && (
                                <div className="text-[10px] text-accent font-medium mt-0.5">
                                  Reserved Gear: {gear.map((g) => g?.name).join(', ')}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQrEvent(ev);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-surface border border-border text-accent text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <QrCode className="w-3 h-3" />
                                <span>QR</span>
                              </button>
                              <StatusBadge status={ev.status} size="sm" />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-surface rounded-2xl border border-border p-5 space-y-4">
            <h3 className="font-display text-lg font-bold text-primary">
              Bookings on {formatDate(selectedDateStr)}
            </h3>
            <p className="text-xs text-text-muted">
              {selectedDayEvents.length} event(s) scheduled on this day.
            </p>
            <button
              type="button"
              onClick={() => openBookingModalForSlot(selectedDateStr)}
              className="w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-light text-[#111111] text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              + New Booking on {formatDate(selectedDateStr)}
            </button>
          </div>
        </div>
      )}

      {/* ===================== 4. SCHEDULE / AGENDA VIEW ===================== */}
      {viewMode === 'AGENDA' && (
        <div className="bg-surface rounded-2xl border border-border shadow-xs divide-y divide-border">
          {filteredEvents.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <CalendarIcon className="w-8 h-8 text-accent mx-auto" />
              <div className="text-sm font-bold text-primary">No Matching Events Scheduled</div>
              <p className="text-xs text-text-muted">
                Click &ldquo;Quick Calendar Booking&rdquo; above to add a new event.
              </p>
            </div>
          ) : (
            [...filteredEvents]
              .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
              .map((evt) => {
                const client = clients.find((c) => c.id === evt.clientId);
                const assignedCount = teamAssignments.filter((a) => a.eventId === evt.id).length;
                const reservedGear = getEventReservedGear(evt.id);
                return (
                  <div
                    key={evt.id}
                    className="p-4 sm:p-5 hover:bg-background/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-16 text-center p-2 rounded-xl bg-accent/15 border border-accent/30 shrink-0">
                        <div className="text-[10px] font-bold uppercase text-accent">
                          {new Date(evt.eventDate + 'T12:00:00').toLocaleDateString('en-US', {
                            month: 'short',
                          })}
                        </div>
                        <div className="font-display text-xl font-bold text-primary">
                          {new Date(evt.eventDate + 'T12:00:00').getDate()}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-primary">{evt.title}</span>
                          <StatusBadge status={evt.status} size="sm" />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-accent" />
                            {evt.startTime || '18:00'} – {evt.endTime || '23:00'}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-accent" />
                            {[evt.venue, evt.city].filter(Boolean).join(', ')}
                          </span>
                          {client && <span>Client: {client.name}</span>}
                          <span>Crew: {assignedCount}</span>
                          <span>Reserved Gear: {reservedGear.length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQrEvent(evt)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent text-xs font-bold cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR Code</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openInspector(evt)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border hover:border-accent text-xs font-semibold text-primary cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5 text-accent" />
                        <span>Reschedule / Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/events/${evt.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                      >
                        <span>Event Room</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* ===================== EVENT INSPECTOR & QUICK RESCHEDULE MODAL ===================== */}
      <Modal
        isOpen={Boolean(inspectedEvent)}
        onClose={() => setInspectedEvent(null)}
        title={inspectedEvent ? `Calendar Booking: ${inspectedEvent.title}` : 'Event Details'}
      >
        {inspectedEvent && (
          <form onSubmit={handleSaveInspectorChanges} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  {inspectedEvent.category} Booking
                </div>
                <div className="text-sm font-bold text-gray-900">{inspectedEvent.title}</div>
                <div className="text-xs text-gray-600">
                  Package Value: {formatPKR(inspectedEvent.packagePrice)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const target = inspectedEvent;
                  setInspectedEvent(null);
                  setQrEvent(target);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 border border-amber-500/30 text-xs font-bold cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>Generate QR Code</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Event Date
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Booking Status
                </label>
                <select
                  value={rescheduleStatus}
                  onChange={(e) => setRescheduleStatus(e.target.value as EventStatus)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                >
                  <option value="Inquiry">Inquiry</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Editing">Editing</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={rescheduleStart}
                  onChange={(e) => setRescheduleStart(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={rescheduleEnd}
                  onChange={(e) => setRescheduleEnd(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Venue / Hall Location
              </label>
              <input
                type="text"
                value={rescheduleVenue}
                onChange={(e) => setRescheduleVenue(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const id = inspectedEvent.id;
                    setInspectedEvent(null);
                    navigate(`/events/${id}`);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Event Room</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const id = inspectedEvent.id;
                    setInspectedEvent(null);
                    await deleteEvent(id);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={isUpdatingEvent}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isUpdatingEvent ? 'Saving...' : 'Save Schedule'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ===================== UNIFIED 3-STEP INTEGRATED CALENDAR BOOKING MODAL ===================== */}
      <IntegratedBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        initialDate={bookingDate}
        initialStartTime={bookingStartTime}
        clients={clients}
        events={events}
        daySchedules={daySchedules}
        packages={packages}
        teamMembers={teamMembers}
        teamAssignments={teamAssignments}
        equipment={equipment}
        equipmentAssignments={equipmentAssignments}
        createClient={createClient}
        createEvent={createEvent}
        addToast={addToast}
      />

      {/* QR Code Modal */}
      <EventQrModal
        isOpen={Boolean(qrEvent)}
        onClose={() => setQrEvent(null)}
        event={qrEvent}
        tasks={tasks}
        teamMembers={teamMembers}
      />
    </div>
  );
};
