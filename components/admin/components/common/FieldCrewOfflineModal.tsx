import React, { useState, useEffect, useMemo } from 'react';
import {
  Wifi,
  WifiOff,
  CheckCircle2,
  Camera,
  CheckSquare,
  MapPin,
  Clock,
  QrCode,
  RefreshCw,
  Plus,
  X,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';
import {
  Event,
  Client,
  EventDaySchedule,
  EventTeamAssignment,
  TeamMember,
  Equipment,
  EventEquipmentAssignment,
  OfflineCrewCheckInRecord,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useStudioData } from '../../context/StudioDataContext';
import { formatDate } from '../../utils/calculations';

interface FieldCrewOfflineModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  client?: Client;
  daySchedules: EventDaySchedule[];
  crewAssignments?: EventTeamAssignment[];
  teamMembers?: TeamMember[];
  equipmentAssignments: EventEquipmentAssignment[];
  equipment: Equipment[];
  onToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

interface ShotItem {
  id: string;
  label: string;
  dayLabel: string;
  completed: boolean;
}

interface GearCheckItem {
  id: string;
  name: string;
  category: string;
  checkedOut: boolean;
  returned: boolean;
}

const DEFAULT_WEDDING_SHOT_LIST: ShotItem[] = [
  { id: 'sh-1', label: 'Bridal Solo Signature Portraits & Jewelry Macro Details', dayLabel: 'Main Day', completed: true },
  { id: 'sh-2', label: 'Groom Sherwani / Turban Preparation & Watch Close-Ups', dayLabel: 'Main Day', completed: true },
  { id: 'sh-3', label: 'Couple First Look / Stage Royal Portrait Session', dayLabel: 'Main Day', completed: false },
  { id: 'sh-4', label: '4K Drone Aerial Venue Establishing & Marquee Flyover', dayLabel: 'Main Day', completed: false },
  { id: 'sh-5', label: 'Nikah / Ring Exchange Emotional Close-Up Multi-Cam', dayLabel: 'Main Day', completed: false },
  { id: 'sh-6', label: 'Immediate Family & VIP Table Group Portraits', dayLabel: 'Main Day', completed: false },
  { id: 'sh-7', label: 'Rukhsati / Grand Exit Slow-Motion Gimbal Sequence', dayLabel: 'Main Day', completed: false },
  { id: 'sh-8', label: 'Dual-Card Field Backup Verification Before Pack-Up', dayLabel: 'Wrap Up', completed: false },
];

const OFFLINE_STORAGE_PREFIX = 'royal_studio_offline_field_crew_v1_';

export const FieldCrewOfflineModal: React.FC<FieldCrewOfflineModalProps> = ({
  isOpen,
  onClose,
  event,
  daySchedules,
  equipmentAssignments,
  equipment,
}) => {
  const { user } = useAuth();
  const { syncFieldCrewEventState, addToast } = useStudioData();

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [shotList, setShotList] = useState<ShotItem[]>(DEFAULT_WEDDING_SHOT_LIST);
  const [gearList, setGearList] = useState<GearCheckItem[]>([]);
  const [checkIns, setCheckIns] = useState<OfflineCrewCheckInRecord[]>([]);
  const [newShotLabel, setNewShotLabel] = useState('');
  const [checkInNotes, setCheckInNotes] = useState('Arrived on location at venue marquee with primary camera kit.');
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingOfflineQueue, setPendingOfflineQueue] = useState(false);

  const storageKey = `${OFFLINE_STORAGE_PREFIX}${event.id}`;

  const defaultGearItems = useMemo<GearCheckItem[]>(() => {
    const explicit = equipmentAssignments
      .map((ea) => {
        const eq = equipment.find((item) => item.id === ea.equipmentId);
        return eq
          ? {
              id: eq.id,
              name: `${eq.name} (${eq.serialNumber})`,
              category: eq.category,
              checkedOut: true,
              returned: false,
            }
          : null;
      })
      .filter(Boolean) as GearCheckItem[];

    if (explicit.length > 0) return explicit;

    return [
      { id: 'g-1', name: 'Sony A7S III / FX3 Cinema Body + 2x 256GB V90 SD', category: 'Camera', checkedOut: true, returned: false },
      { id: 'g-2', name: 'Sony A7 IV Stills Body + 24-70mm f/2.8 GM II', category: 'Camera', checkedOut: true, returned: false },
      { id: 'g-3', name: 'Sony 85mm f/1.4 GM Portrait Prime + Godox AD200 Pro', category: 'Lens/Light', checkedOut: true, returned: false },
      { id: 'g-4', name: 'DJI RS3 Pro Gimbal + DJI Mic 2 Dual Receiver', category: 'Gimbal/Audio', checkedOut: true, returned: false },
      { id: 'g-5', name: 'DJI Air 3 / Mavic 3 Pro Drone + 3 Flight Batteries', category: 'Drone', checkedOut: true, returned: false },
    ];
  }, [equipmentAssignments, equipment]);

  // Hydrate cached offline state from localStorage or event record
  useEffect(() => {
    if (typeof window === 'undefined' || !event.id) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.shotList) && parsed.shotList.length > 0) {
          setShotList(parsed.shotList);
        } else if (event.offlineShotList && event.offlineShotList.length > 0) {
          setShotList(event.offlineShotList);
        }
        if (Array.isArray(parsed.gearList) && parsed.gearList.length > 0) {
          setGearList(parsed.gearList);
        } else if (event.offlineGearChecklist && event.offlineGearChecklist.length > 0) {
          setGearList(event.offlineGearChecklist);
        } else {
          setGearList(defaultGearItems);
        }
        if (Array.isArray(parsed.checkIns)) {
          setCheckIns(parsed.checkIns);
        } else if (Array.isArray(event.fieldCheckIns)) {
          setCheckIns(event.fieldCheckIns);
        }
        setPendingOfflineQueue(Boolean(parsed.pendingSync));
      } else {
        setShotList(
          event.offlineShotList && event.offlineShotList.length > 0
            ? event.offlineShotList
            : DEFAULT_WEDDING_SHOT_LIST
        );
        setGearList(
          event.offlineGearChecklist && event.offlineGearChecklist.length > 0
            ? event.offlineGearChecklist
            : defaultGearItems
        );
        setCheckIns(event.fieldCheckIns || []);
      }
    } catch {
      setGearList(defaultGearItems);
    }
  }, [event.id, storageKey, defaultGearItems]);

  // Listen for online/offline transitions and auto-sync when connection returns
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const persistOfflineState = async (
    nextShots: ShotItem[],
    nextGear: GearCheckItem[],
    nextCheckIns: OfflineCrewCheckInRecord[],
    newCheckInRecord?: OfflineCrewCheckInRecord
  ) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          eventId: event.id,
          eventTitle: event.title,
          venue: event.venue,
          city: event.city,
          eventDate: event.eventDate,
          daySchedules,
          shotList: nextShots,
          gearList: nextGear,
          checkIns: nextCheckIns,
          updatedAt: new Date().toISOString(),
          pendingSync: !navigator.onLine,
        })
      );
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setPendingOfflineQueue(true);
      return;
    }

    try {
      setIsSyncing(true);
      await syncFieldCrewEventState(event.id, {
        offlineShotList: nextShots,
        offlineGearChecklist: nextGear,
        checkIn: newCheckInRecord,
      });
      setPendingOfflineQueue(false);
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          window.localStorage.setItem(
            storageKey,
            JSON.stringify({ ...parsed, pendingSync: false })
          );
        }
      }
    } catch {
      setPendingOfflineQueue(true);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  const toggleShotItem = (id: string) => {
    const next = shotList.map((s) =>
      s.id === id ? { ...s, completed: !s.completed } : s
    );
    setShotList(next);
    void persistOfflineState(next, gearList, checkIns);
  };

  const handleAddShot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShotLabel.trim()) return;
    const item: ShotItem = {
      id: `sh-${Date.now().toString(36)}`,
      label: newShotLabel.trim(),
      dayLabel: 'Field Custom',
      completed: false,
    };
    const next = [...shotList, item];
    setShotList(next);
    setNewShotLabel('');
    void persistOfflineState(next, gearList, checkIns);
  };

  const toggleGearField = (id: string, field: 'checkedOut' | 'returned') => {
    const next = gearList.map((g) =>
      g.id === id ? { ...g, [field]: !g[field] } : g
    );
    setGearList(next);
    void persistOfflineState(shotList, next, checkIns);
  };

  const handleCrewCheckIn = () => {
    const record: OfflineCrewCheckInRecord = {
      id: `chk-${Date.now().toString(36)}`,
      eventId: event.id,
      crewName: user?.name || 'Senior Field Crew',
      role: user?.role || 'Photographer / Cinematographer',
      checkedInAt: new Date().toISOString(),
      locationLabel: `${event.venue}, ${event.city}`,
      notes: checkInNotes.trim() || 'Checked in at venue via PWA Field Mode',
      syncedToServer: isOnline,
    };
    const nextCheckIns = [record, ...checkIns];
    setCheckIns(nextCheckIns);
    void persistOfflineState(shotList, gearList, nextCheckIns, record);
    addToast(
      isOnline
        ? `Crew check-in recorded & synced for ${event.title}!`
        : `Crew check-in saved offline! Will auto-sync when mobile data returns.`
    );
  };

  const completedShotsCount = shotList.filter((s) => s.completed).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[115] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-2xl border border-border bg-surface p-5 sm:p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isOnline
                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                }`}
              >
                {isOnline ? (
                  <>
                    <Wifi className="w-3 h-3" />
                    <span>Online · Cached for Offline Field Use</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    <span>Offline Farmhouse / Marquee Mode Active</span>
                  </>
                )}
              </span>

              {pendingOfflineQueue && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold">
                  Queued for Sync
                </span>
              )}
            </div>

            <h3 className="font-display text-xl sm:text-2xl font-bold text-primary">
              PWA Offline Field Crew Mode — {event.title}
            </h3>
            <p className="text-xs text-text-muted">
              Run-sheet, shot list, equipment load-out, and QR crew check-in cached locally on your device for remote marquees and farmhouses with weak mobile signal.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => persistOfflineState(shotList, gearList, checkIns)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent text-xs font-bold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-background cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cached Run-Sheet Summary */}
        <div className="p-4 rounded-xl bg-background border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="font-bold text-primary flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-accent" />
              <span>
                {event.venue}, {event.city} · {formatDate(event.eventDate)}
              </span>
            </div>
            <div className="text-text-muted flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3 text-accent" />
                Crew Call: <strong>{event.callTime || '17:00'}</strong> | Shoot: {event.startTime || '18:00'} – {event.endTime || '23:00'}
              </span>
              <span>·</span>
              <span>
                Shot Progress: <strong className="text-accent">{completedShotsCount}/{shotList.length}</strong>
              </span>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[11px] font-bold shrink-0">
            <ShieldCheck className="w-4 h-4" />
            <span>Offline Cache Ready</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left 7 Cols: Interactive Offline Shot List */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-accent" />
                <span>Field Shot List &amp; Key Moments ({completedShotsCount}/{shotList.length})</span>
              </h4>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {shotList.map((shot) => (
                <button
                  key={shot.id}
                  type="button"
                  onClick={() => toggleShotItem(shot.id)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer text-xs ${
                    shot.completed
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-primary'
                      : 'border-border bg-background hover:border-accent/50 text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                        shot.completed
                          ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                          : 'border-border bg-surface'
                      }`}
                    >
                      {shot.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </span>
                    <span className={shot.completed ? 'line-through opacity-75' : 'font-medium'}>
                      {shot.label}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-surface border border-border text-[10px] text-text-muted shrink-0">
                    {shot.dayLabel}
                  </span>
                </button>
              ))}
            </div>

            <form onSubmit={handleAddShot} className="flex gap-2">
              <input
                type="text"
                value={newShotLabel}
                onChange={(e) => setNewShotLabel(e.target.value)}
                placeholder="Add custom field shot or couple request..."
                className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-xs text-primary"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-accent text-[#111111] text-xs font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Shot</span>
              </button>
            </form>
          </div>

          {/* Right 5 Cols: Equipment Load-Out Checklist & QR Crew Check-In */}
          <div className="lg:col-span-5 space-y-4">
            {/* Equipment Checklist */}
            <div className="p-4 rounded-xl bg-background border border-border space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-accent" />
                <span>Offline Equipment Load-Out &amp; Return</span>
              </h4>
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1 text-xs">
                {gearList.map((g) => (
                  <div
                    key={g.id}
                    className="p-2.5 rounded-lg bg-surface border border-border space-y-1.5"
                  >
                    <div className="font-semibold text-primary text-[11px]">{g.name}</div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-text-muted">
                        <input
                          type="checkbox"
                          checked={g.checkedOut}
                          onChange={() => toggleGearField(g.id, 'checkedOut')}
                          className="accent-amber-500"
                        />
                        <span>Checked Out</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-emerald-500 font-semibold">
                        <input
                          type="checkbox"
                          checked={g.returned}
                          onChange={() => toggleGearField(g.id, 'returned')}
                          className="accent-emerald-500"
                        />
                        <span>Packed &amp; Returned</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Field Crew Check-In Box */}
            <div className="p-4 rounded-xl bg-background border border-accent/40 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Field Venue Crew Check-In</span>
                </h4>
                <span className="text-[10px] text-text-muted">
                  {checkIns.length} Check-In(s)
                </span>
              </div>

              <input
                type="text"
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
                placeholder="Check-in note (e.g. Arrived at Marquee Gate 2)"
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-primary"
              />

              <button
                type="button"
                onClick={handleCrewCheckIn}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Log Field Crew Check-In ({user?.name || 'Crew'})</span>
              </button>

              {checkIns.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border max-h-28 overflow-y-auto">
                  {checkIns.map((ci) => (
                    <div
                      key={ci.id}
                      className="p-2 rounded-lg bg-surface border border-border flex items-center justify-between text-[10px]"
                    >
                      <div>
                        <strong className="text-primary">{ci.crewName}</strong> · {ci.locationLabel}
                        <div className="text-text-muted">
                          {new Date(ci.checkedInAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold">
                        Checked In
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
