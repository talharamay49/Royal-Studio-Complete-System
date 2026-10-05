import React, { useState, useMemo, useEffect } from 'react';
import {
  UserPlus,
  Search,
  Clock,
  Camera,
  Users,
  Check,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle2,
  Package as PackageIcon,
  Calculator,
  Sparkles,
  Copy,
} from 'lucide-react';
import { Modal } from './Modal';
import {
  Client,
  Event,
  EventCategory,
  WeddingSubtype,
  EventDaySchedule,
  Package,
  TeamMember,
  EventTeamAssignment,
  Equipment,
  EventEquipmentAssignment,
  TimingMode,
  CameraCategoryTier,
  CrewCategoryTier,
} from '../../types';
import {
  CAMERA_CATEGORY_RATES,
  enforceDayTimeWindow,
  formatPKR,
  formatDate,
  calculateTierSlotSummary,
  mapCameraTierToCrewTier,
  type DayTierSlot,
} from '../../utils/calculations';

export type DayPackageMode = 'BUILTIN' | 'CUSTOM';

export interface BookingDayInput {
  id: string;
  date: string;
  eventType: string;
  venue: string;
  timingMode: TimingMode;
  startTime: string;
  endTime: string;
  durationHours: number;
  notes: string;
  // Per-Day Package Mode: Pre-Defined Studio Package ('BUILTIN') OR Customized Package ('CUSTOM')
  packageMode: DayPackageMode;
  // When 'BUILTIN' (Pre-Defined Package):
  selectedPackageId: string;
  packageBaseRate: number;
  // When 'CUSTOM' (Customized Package under Day 1 / Day 2 / Day 3):
  // Category 1 Cam + Tier 1 Crew = 10k/cam/day
  // Category 2 Cam + Tier 2 Crew = 15k/cam/day
  // Category 3 Cam + Tier 3 Crew = 20k/cam/day
  cameraCategory: CameraCategoryTier;
  crewCategory: CrewCategoryTier;
  cameraCount: number;
  tierSlots?: DayTierSlot[];
  extraCustomAmount: number;
  customPackageName: string;
  customPackageDeliverables: string;
  saveCustomToLibrary: boolean;
  // Per-day assigned inventory cameras & crew members
  assignedCameraIds: string[];
  assignedCrewIds: string[];
}

const DAY_TIME_PRESETS = [
  { label: '09:00 – 14:00 (5h)', start: '09:00', end: '14:00' },
  { label: '10:00 – 15:00 (5h)', start: '10:00', end: '15:00' },
  { label: '11:00 – 16:00 (5h)', start: '11:00', end: '16:00' },
  { label: '12:00 – 17:00 (5h)', start: '12:00', end: '17:00' },
];

const NIGHT_TIME_PRESETS = [
  { label: '18:00 – 23:00', start: '18:00', end: '23:00' },
  { label: '19:00 – 23:59', start: '19:00', end: '23:59' },
  { label: '17:00 – 22:30', start: '17:00', end: '22:30' },
];

const WEDDING_CEREMONY_CHIPS = [
  'Mehndi',
  'Barat',
  'Walima',
  'Nikah',
  'Mayun / Dholki',
  'Engagement',
  'Bridal Shoot',
  'Qawali Night',
];

const GENERAL_FUNCTION_CHIPS = [
  'Main Event',
  'Day 1 Session',
  'Day 2 Session',
  'Gala Dinner',
  'Stage Coverage',
];

const COMBINED_TIER_OPTIONS: Array<{
  camTier: CameraCategoryTier;
  crewTier: CrewCategoryTier;
  title: string;
  subtitle: string;
  ratePerCamPerDay: number;
  badge: string;
}> = [
  {
    camTier: 'CAT_1',
    crewTier: 'CREW_CAT_1',
    title: 'Category 1 Camera + Tier 1 Crew',
    subtitle: 'Standard 4K Camera + Tier 1 Operator (Combined)',
    ratePerCamPerDay: 10000,
    badge: 'PKR 10,000 / cam / day',
  },
  {
    camTier: 'CAT_2',
    crewTier: 'CREW_CAT_2',
    title: 'Category 2 Camera + Tier 2 Crew',
    subtitle: 'Pro Full-Frame Cinema + Tier 2 Senior Crew (Combined)',
    ratePerCamPerDay: 15000,
    badge: 'PKR 15,000 / cam / day',
  },
  {
    camTier: 'CAT_3',
    crewTier: 'CREW_CAT_3',
    title: 'Category 3 Camera + Tier 3 Crew',
    subtitle: 'Flagship 8K Cinema Rig + Tier 3 Master DOP (Combined)',
    ratePerCamPerDay: 20000,
    badge: 'PKR 20,000 / cam / day',
  },
];

interface IntegratedBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate: string;
  initialStartTime?: string;
  clients: Client[];
  events: Event[];
  daySchedules: EventDaySchedule[];
  packages: Package[];
  teamMembers: TeamMember[];
  teamAssignments: EventTeamAssignment[];
  equipment: Equipment[];
  equipmentAssignments: EventEquipmentAssignment[];
  createClient: (data: Partial<Client>) => Promise<Client>;
  createPackage?: (data: Partial<Package>) => Promise<Package>;
  createEvent: (data: any) => Promise<Event>;
  addToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

function addDaysToDateStr(dateStr: string, daysToAdd: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + daysToAdd);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function resolveWeddingSubtypeFromDayType(dayEventType: string): WeddingSubtype {
  const norm = dayEventType.toLowerCase();
  if (norm.includes('mehndi') || norm.includes('mayun') || norm.includes('dholki')) return 'Mehndi';
  if (norm.includes('barat')) return 'Barat';
  if (norm.includes('walima')) return 'Walima';
  if (norm.includes('nikah')) return 'Nikah';
  if (norm.includes('engagement')) return 'Engagement';
  return 'Other';
}

export function getDayCalculatedCost(day: BookingDayInput): number {
  if (day.packageMode === 'BUILTIN') {
    return Math.max(0, Number(day.packageBaseRate || 0));
  }
  const extra = Math.max(0, Number(day.extraCustomAmount || 0));
  if (Array.isArray(day.tierSlots) && day.tierSlots.length > 0) {
    const slotsSum = day.tierSlots.reduce(
      (acc, slot) => acc + calculateTierSlotSummary(slot).subtotal,
      0
    );
    return slotsSum + extra;
  }
  const combinedRate = CAMERA_CATEGORY_RATES[day.cameraCategory]?.ratePerDay || 15000;
  const cams = Math.max(0, Number(day.cameraCount || 0));
  return cams * combinedRate + extra;
}

export const IntegratedBookingModal: React.FC<IntegratedBookingModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  initialStartTime = '18:00',
  clients,
  events,
  daySchedules,
  packages,
  teamMembers,
  teamAssignments,
  equipment,
  equipmentAssignments,
  createClient,
  createEvent,
  addToast,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Customer Selection & On-the-Fly Quick Add
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [isQuickAddClient, setIsQuickAddClient] = useState<boolean>(false);
  const [newClientName, setNewClientName] = useState<string>('');
  const [newClientPhone, setNewClientPhone] = useState<string>('');
  const [newClientEmail, setNewClientEmail] = useState<string>('');
  const [newClientCity, setNewClientCity] = useState<string>('Burewala');
  const [newClientAddress, setNewClientAddress] = useState<string>('');
  const [isCreatingClient, setIsCreatingClient] = useState<boolean>(false);

  // Step 2: Overall Booking Category & Per-Date Functions + Timing (DM 5-Hr vs Night Time)
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<EventCategory>('Wedding');
  const [venue, setVenue] = useState<string>('');
  const [city, setCity] = useState<string>('Burewala');
  const [notes, setNotes] = useState<string>('');
  const [isMultiDay, setIsMultiDay] = useState<boolean>(false);
  const [bookingDays, setBookingDays] = useState<BookingDayInput[]>([]);

  // Step 3: Financial Adjustments
  const [discount, setDiscount] = useState<number>(0);
  const [advancePaid, setAdvancePaid] = useState<number>(50000);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Camera inventory items & active team members
  const cameraInventory = useMemo(() => {
    return equipment.filter((eq) => eq.category === 'Camera');
  }, [equipment]);

  const activeTeamRoster = useMemo(() => {
    return teamMembers.filter(
      (tm) =>
        tm.isActive &&
        tm.availabilityStatus !== 'On Leave' &&
        tm.availabilityStatus !== 'Inactive'
    );
  }, [teamMembers]);

  // Helper to check busy cameras and crew on a specific date
  const getBusyResourcesForDate = (dateStr: string) => {
    const overlappingEventIds = new Set<string>();
    const eventTitleById = new Map<string, string>();

    events.forEach((evt) => {
      if (evt.status === 'Cancelled') return;
      eventTitleById.set(evt.id, evt.title);
      if (evt.eventDate === dateStr) {
        overlappingEventIds.add(evt.id);
      }
    });

    daySchedules.forEach((ds) => {
      if (ds.date === dateStr) {
        const parentEvt = events.find((e) => e.id === ds.eventId);
        if (parentEvt && parentEvt.status !== 'Cancelled') {
          overlappingEventIds.add(ds.eventId);
          eventTitleById.set(ds.eventId, parentEvt.title);
        }
      }
    });

    const busyEqMap = new Map<string, string>();
    equipmentAssignments.forEach((ea) => {
      if (overlappingEventIds.has(ea.eventId) && !ea.isCheckedIn) {
        busyEqMap.set(ea.equipmentId, eventTitleById.get(ea.eventId) || 'Booked Event');
      }
    });

    const busyCrewMap = new Map<string, string>();
    teamAssignments.forEach((ta) => {
      if (overlappingEventIds.has(ta.eventId) && ta.assignmentStatus !== 'Cancelled') {
        busyCrewMap.set(ta.teamMemberId, eventTitleById.get(ta.eventId) || 'Booked Event');
      }
    });

    return { busyEqMap, busyCrewMap };
  };

  // Build default per-day package & resource config
  const buildDefaultDayConfig = (
    dayFunction: string,
    dateStr: string,
    dayIndex: number,
    timingMode: TimingMode = 'NIGHT_TIME',
    startTime = '18:00',
    endTime = '23:00'
  ): BookingDayInput => {
    const enforced = enforceDayTimeWindow(startTime, endTime, timingMode);
    const { busyEqMap, busyCrewMap } = getBusyResourcesForDate(dateStr);

    const availCams = cameraInventory
      .filter(
        (c) => c.status !== 'Maintenance' && c.status !== 'Damaged' && !busyEqMap.has(c.id)
      )
      .slice(0, 2)
      .map((c) => c.id);

    const availCrew = activeTeamRoster
      .filter((tm) => !busyCrewMap.has(tm.id))
      .slice(0, 2)
      .map((tm) => tm.id);

    const defaultCamCount = Math.max(1, availCams.length || 2);
    const firstPkg = packages[dayIndex % Math.max(1, packages.length)] || packages[0];

    return {
      id: `day-${Date.now()}-${dayIndex + 1}`,
      date: dateStr,
      eventType: dayFunction,
      venue: '',
      timingMode,
      startTime: enforced.startTime,
      endTime: enforced.endTime,
      durationHours: enforced.durationHours,
      notes: '',
      packageMode: 'CUSTOM',
      selectedPackageId: firstPkg ? firstPkg.id : '',
      packageBaseRate: firstPkg ? firstPkg.price : 30000,
      cameraCategory: 'CAT_2',
      crewCategory: 'CREW_CAT_2',
      cameraCount: defaultCamCount,
      tierSlots: [
        {
          id: `slot-${Date.now()}-${dayIndex + 1}-1`,
          cameraCategory: 'CAT_2',
          crewCategory: 'CREW_CAT_2',
          photographers: 1,
          videographers: 1,
          drones: 0,
        },
      ],
      extraCustomAmount: 0,
      customPackageName: `${dayFunction} Customized Package`,
      customPackageDeliverables:
        'Full Editorial Photography, 4K/8K Master Highlight Film, Online Private Gallery',
      saveCustomToLibrary: false,
      assignedCameraIds: availCams,
      assignedCrewIds: availCrew,
    };
  };

  // Initialize state whenever modal opens for a calendar date/slot
  useEffect(() => {
    if (!isOpen) return;
    const startH = parseInt((initialStartTime || '18:00').split(':')[0] || '18', 10);
    const defaultTimingMode: TimingMode = startH >= 8 && startH <= 16 ? 'DAY_TIME' : 'NIGHT_TIME';
    const rawStart =
      defaultTimingMode === 'DAY_TIME'
        ? `${String(startH).padStart(2, '0')}:00`
        : initialStartTime || '18:00';
    const rawEnd = `${String(Math.min(23, startH + 5)).padStart(2, '0')}:00`;

    setStep(1);
    setCustomerSearch('');
    setIsQuickAddClient(false);
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }

    setIsMultiDay(false);
    setBookingDays([
      buildDefaultDayConfig('Barat', initialDate, 0, defaultTimingMode, rawStart, rawEnd),
    ]);
    setDiscount(0);
  }, [isOpen, initialDate, initialStartTime, clients.length, packages.length]);

  const filteredClients = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q)
    );
  }, [clients, customerSearch]);

  const selectedCustomer = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId]
  );

  // Live Per-Day and Overall Booking Totals
  const pricingSummary = useMemo(() => {
    const dayBreakdowns = bookingDays.map((day, idx) => {
      const cost = getDayCalculatedCost(day);
      const camRate = CAMERA_CATEGORY_RATES[day.cameraCategory]?.ratePerDay || 15000;
      const pkgObj = packages.find((p) => p.id === day.selectedPackageId);
      const slotDescriptions =
        day.packageMode === 'CUSTOM' && Array.isArray(day.tierSlots) && day.tierSlots.length > 0
          ? day.tierSlots.map((s) => calculateTierSlotSummary(s).formulaText).join(' + ')
          : '';
      const formulaLabel =
        day.packageMode === 'BUILTIN'
          ? `Pre-Defined: ${pkgObj?.name || 'Studio Package'} (${formatPKR(cost)})`
          : slotDescriptions
          ? `Customized: ${slotDescriptions}${
              day.extraCustomAmount > 0 ? ` + ${formatPKR(day.extraCustomAmount)}` : ''
            } = ${formatPKR(cost)}`
          : `Customized: ${day.cameraCount} Cam × ${formatPKR(camRate)} (${day.cameraCategory.replace(
              'CAT_',
              'Cat '
            )} + Tier ${day.cameraCategory.replace('CAT_', '')} Crew)${
              day.extraCustomAmount > 0 ? ` + ${formatPKR(day.extraCustomAmount)}` : ''
            } = ${formatPKR(cost)}`;
      return {
        dayNumber: idx + 1,
        eventType: day.eventType,
        date: day.date,
        packageMode: day.packageMode,
        cost,
        formulaLabel,
      };
    });

    const subtotalAllDays = dayBreakdowns.reduce((sum, d) => sum + d.cost, 0);
    const disc = Math.max(0, Number(discount || 0));
    const totalCost = Math.max(0, subtotalAllDays - disc);

    return {
      dayBreakdowns,
      subtotalAllDays,
      discount: disc,
      totalCost,
    };
  }, [bookingDays, packages, discount]);

  // Step 1 Handlers
  const handleSelectExistingCustomer = (client: Client) => {
    setSelectedClientId(client.id);
    setCity(client.city || 'Burewala');
    if (!title.trim()) {
      setTitle(`${client.name} — ${category} Booking`);
    }
    setStep(2);
  };

  const handleQuickCreateCustomer = async () => {
    if (!newClientName.trim() || !newClientPhone.trim()) {
      addToast('Customer Name and Phone Number are required.', 'error');
      return;
    }
    setIsCreatingClient(true);
    try {
      const created = await createClient({
        name: newClientName.trim(),
        phone: newClientPhone.trim(),
        whatsapp: newClientPhone.trim(),
        email: newClientEmail.trim(),
        city: newClientCity.trim() || 'Burewala',
        address: newClientAddress.trim() || newClientCity.trim() || 'Burewala',
      });
      setSelectedClientId(created.id);
      setCity(created.city || 'Burewala');
      if (!title.trim()) {
        setTitle(`${created.name} — ${category} Booking`);
      }
      setIsQuickAddClient(false);
      setNewClientName('');
      setNewClientPhone('');
      setNewClientEmail('');
      setNewClientAddress('');
      setStep(2);
    } catch (err: any) {
      addToast(err?.message || 'Failed to create customer', 'error');
    } finally {
      setIsCreatingClient(false);
    }
  };

  // Category Change Handler
  const handleCategoryChange = (nextCategory: EventCategory) => {
    setCategory(nextCategory);
    if (selectedCustomer) {
      setTitle(`${selectedCustomer.name} — ${nextCategory} Booking`);
    }
    setBookingDays((prev) =>
      prev.map((d, idx) => {
        if (idx === 0) {
          const defaultLabel =
            nextCategory === 'Wedding'
              ? prev.length > 1
                ? 'Mehndi'
                : 'Barat'
              : nextCategory;
          return {
            ...d,
            eventType: defaultLabel,
            customPackageName: `${defaultLabel} Customized Package`,
          };
        }
        return d;
      })
    );
  };

  // Step 2 Multi-Day & Timing Mode Handlers
  const handleToggleMultiDay = (multi: boolean) => {
    setIsMultiDay(multi);
    if (!multi && bookingDays.length > 1) {
      const single = bookingDays[0];
      const lbl = category === 'Wedding' ? 'Barat' : category;
      setBookingDays([
        {
          ...single,
          eventType: lbl,
          customPackageName: `${lbl} Customized Package`,
        },
      ]);
    } else if (multi && bookingDays.length === 1) {
      const firstDay = bookingDays[0];
      const secondDate = addDaysToDateStr(firstDay.date, 1);
      const day1Lbl = category === 'Wedding' ? 'Mehndi' : 'Day 1 Session';
      const day2Lbl = category === 'Wedding' ? 'Barat' : 'Day 2 Session';
      setBookingDays([
        {
          ...firstDay,
          eventType: day1Lbl,
          customPackageName: `${day1Lbl} Customized Package`,
        },
        buildDefaultDayConfig(day2Lbl, secondDate, 1, 'NIGHT_TIME', '18:00', '23:00'),
      ]);
    }
  };

  // 1-Click Multi-Day Wedding Ceremony Sequence Presets
  const handleApplyWeddingSequencePreset = (ceremonies: string[]) => {
    const baseDate = bookingDays[0]?.date || initialDate;
    setIsMultiDay(ceremonies.length > 1);
    const generated: BookingDayInput[] = ceremonies.map((ceremony, idx) => {
      const existing = bookingDays[idx];
      const dateStr = addDaysToDateStr(baseDate, idx);
      const isDayCeremony =
        ceremony.toLowerCase().includes('walima') ||
        ceremony.toLowerCase().includes('nikah');
      const mode: TimingMode = existing
        ? existing.timingMode
        : isDayCeremony
        ? 'DAY_TIME'
        : 'NIGHT_TIME';
      const startT = existing?.startTime || (mode === 'DAY_TIME' ? '12:00' : '18:00');
      const endT = existing?.endTime || (mode === 'DAY_TIME' ? '17:00' : '23:00');
      const freshDefault = buildDefaultDayConfig(ceremony, dateStr, idx, mode, startT, endT);

      if (existing) {
        return {
          ...existing,
          date: dateStr,
          eventType: ceremony,
          customPackageName: `${ceremony} Customized Package`,
        };
      }
      return freshDefault;
    });
    setBookingDays(generated);
    addToast(`Configured ${ceremonies.length}-Day schedule: ${ceremonies.join(' → ')}`, 'info');
  };

  const handleAddBookingDay = () => {
    const lastDay = bookingDays[bookingDays.length - 1];
    const nextDate = lastDay ? addDaysToDateStr(lastDay.date, 1) : initialDate;
    const dayIdx = bookingDays.length + 1;
    const defaultSubtypes =
      category === 'Wedding'
        ? ['Mehndi', 'Barat', 'Walima', 'Nikah', 'Mayun / Dholki']
        : ['Day 1 Session', 'Day 2 Session', 'Day 3 Session', 'Day 4 Session'];
    const nextLabel =
      defaultSubtypes[(dayIdx - 1) % defaultSubtypes.length] || `Day ${dayIdx}`;

    setIsMultiDay(true);
    setBookingDays((prev) => [
      ...prev,
      buildDefaultDayConfig(nextLabel, nextDate, dayIdx - 1, 'NIGHT_TIME', '18:00', '23:00'),
    ]);
  };

  const handleRemoveBookingDay = (id: string) => {
    if (bookingDays.length <= 1) return;
    const next = bookingDays.filter((d) => d.id !== id);
    setBookingDays(next);
    if (next.length === 1) {
      setIsMultiDay(false);
    }
  };

  const handleUpdateBookingDay = (id: string, patch: Partial<BookingDayInput>) => {
    setBookingDays((prev) =>
      prev.map((day) => {
        if (day.id !== id) return day;
        const updated = { ...day, ...patch };

        // Sync crewCategory automatically whenever cameraCategory changes
        if (patch.cameraCategory) {
          updated.crewCategory = CAMERA_CATEGORY_RATES[patch.cameraCategory].crewTier;
        }

        // If switching timingMode to DAY_TIME, default to a strict 5-hour daytime slot
        if (patch.timingMode === 'DAY_TIME' && day.timingMode !== 'DAY_TIME') {
          const enforced = enforceDayTimeWindow('11:00', '16:00', 'DAY_TIME');
          updated.startTime = enforced.startTime;
          updated.endTime = enforced.endTime;
          updated.durationHours = enforced.durationHours;
          return updated;
        }

        if (patch.timingMode === 'NIGHT_TIME' && day.timingMode !== 'NIGHT_TIME') {
          const enforced = enforceDayTimeWindow('18:00', '23:00', 'NIGHT_TIME');
          updated.startTime = enforced.startTime;
          updated.endTime = enforced.endTime;
          updated.durationHours = enforced.durationHours;
          return updated;
        }

        // If startTime changed while in DAY_TIME mode, automatically advance endTime to +5 hours
        if (updated.timingMode === 'DAY_TIME' && patch.startTime && !patch.endTime) {
          const startH = parseInt(patch.startTime.split(':')[0] || '11', 10);
          const startM = patch.startTime.split(':')[1] || '00';
          const autoEnd = `${String(Math.min(23, startH + 5)).padStart(2, '0')}:${startM}`;
          const enforced = enforceDayTimeWindow(patch.startTime, autoEnd, 'DAY_TIME');
          updated.startTime = enforced.startTime;
          updated.endTime = enforced.endTime;
          updated.durationHours = enforced.durationHours;
          return updated;
        }

        // Enforce strict 5-hour Day Time (DM) window constraint on any time change
        if (patch.startTime !== undefined || patch.endTime !== undefined) {
          const enforced = enforceDayTimeWindow(
            updated.startTime,
            updated.endTime,
            updated.timingMode
          );
          if (enforced.wasClamped && updated.timingMode === 'DAY_TIME') {
            addToast(
              'Day Time (DM) enforces a strict maximum 5-hour window for this date.',
              'info'
            );
          }
          updated.startTime = enforced.startTime;
          updated.endTime = enforced.endTime;
          updated.durationHours = enforced.durationHours;
        }
        return updated;
      })
    );
  };

  // Per-Day Camera & Crew Toggle Handlers
  const handleToggleDayCamera = (dayId: string, camId: string, busyTitle?: string) => {
    if (busyTitle) {
      addToast(`Camera is already reserved for "${busyTitle}" on this date.`, 'warning');
      return;
    }
    setBookingDays((prev) =>
      prev.map((day) => {
        if (day.id !== dayId) return day;
        const exists = day.assignedCameraIds.includes(camId);
        const nextCamIds = exists
          ? day.assignedCameraIds.filter((id) => id !== camId)
          : [...day.assignedCameraIds, camId];
        return {
          ...day,
          assignedCameraIds: nextCamIds,
          cameraCount: Math.max(1, nextCamIds.length),
        };
      })
    );
  };

  const handleDayCameraCountChange = (dayId: string, nextCount: number) => {
    const clamped = Math.max(1, Math.min(20, nextCount));
    setBookingDays((prev) =>
      prev.map((day) => {
        if (day.id !== dayId) return day;
        const { busyEqMap, busyCrewMap } = getBusyResourcesForDate(day.date);
        const availCams = cameraInventory
          .filter(
            (c) => c.status !== 'Maintenance' && c.status !== 'Damaged' && !busyEqMap.has(c.id)
          )
          .slice(0, clamped)
          .map((c) => c.id);
        const availCrew = activeTeamRoster
          .filter((tm) => !busyCrewMap.has(tm.id))
          .slice(0, clamped)
          .map((tm) => tm.id);
        return {
          ...day,
          cameraCount: clamped,
          assignedCameraIds: availCams,
          assignedCrewIds: availCrew,
        };
      })
    );
  };

  const handleToggleDayCrew = (dayId: string, memberId: string, busyTitle?: string) => {
    if (busyTitle) {
      addToast(`Team member is already assigned to "${busyTitle}" on this date.`, 'warning');
      return;
    }
    setBookingDays((prev) =>
      prev.map((day) => {
        if (day.id !== dayId) return day;
        const exists = day.assignedCrewIds.includes(memberId);
        const nextCrewIds = exists
          ? day.assignedCrewIds.filter((id) => id !== memberId)
          : [...day.assignedCrewIds, memberId];
        return {
          ...day,
          assignedCrewIds: nextCrewIds,
        };
      })
    );
  };

  // Copy Day 1's Package / Tier Setup to All Other Days
  const handleCopyDay1SetupToAllDays = () => {
    const firstDay = bookingDays[0];
    if (!firstDay) return;
    setBookingDays((prev) =>
      prev.map((d, idx) =>
        idx === 0
          ? d
          : {
              ...d,
              packageMode: firstDay.packageMode,
              selectedPackageId: firstDay.selectedPackageId,
              packageBaseRate: firstDay.packageBaseRate,
              cameraCategory: firstDay.cameraCategory,
              crewCategory: firstDay.crewCategory,
              cameraCount: firstDay.cameraCount,
              extraCustomAmount: firstDay.extraCustomAmount,
              customPackageName: `${d.eventType} Customized Package`,
              customPackageDeliverables: firstDay.customPackageDeliverables,
              saveCustomToLibrary: firstDay.saveCustomToLibrary,
            }
      )
    );
    addToast(`Copied Day 1 (${firstDay.eventType}) package & tier setup to all days.`, 'info');
  };

  // Final Booking Submission
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      setStep(1);
      addToast('Please select or create a customer in Step 1.', 'error');
      return;
    }

    const primaryDay = bookingDays[0];
    if (!primaryDay || !primaryDay.date) {
      setStep(2);
      addToast('Please configure at least one event date in Step 2.', 'error');
      return;
    }

    const ceremoniesLabel = bookingDays.map((d) => d.eventType).join(', ');
    const resolvedTitle =
      title.trim() ||
      `${selectedCustomer?.name || 'Client'} — ${
        bookingDays.length > 1
          ? `${bookingDays.length}-Day ${category} (${ceremoniesLabel})`
          : `${category} (${primaryDay.eventType})`
      }`;

    const inferredWeddingSubtype: WeddingSubtype | undefined =
      category === 'Wedding'
        ? resolveWeddingSubtypeFromDayType(primaryDay.eventType)
        : undefined;

    setIsSubmitting(true);
    try {
      const allSelectedEquipmentIds = Array.from(
        new Set(bookingDays.flatMap((d) => d.assignedCameraIds))
      );
      const allSelectedCrewIds = Array.from(
        new Set(bookingDays.flatMap((d) => d.assignedCrewIds))
      );

      await createEvent({
        clientId: selectedClientId,
        title: resolvedTitle,
        category,
        weddingSubtype: inferredWeddingSubtype,
        packageId:
          primaryDay.packageMode === 'BUILTIN'
            ? primaryDay.selectedPackageId || undefined
            : undefined,
        customPackageName:
          primaryDay.packageMode === 'CUSTOM'
            ? primaryDay.customPackageName.trim() || `${primaryDay.eventType} Customized Package`
            : undefined,
        packageBasePrice: pricingSummary.subtotalAllDays,
        eventDate: primaryDay.date,
        timingMode: primaryDay.timingMode,
        startTime: primaryDay.startTime,
        endTime: primaryDay.endTime,
        venue: venue.trim() || primaryDay.venue.trim() || city.trim() || 'Burewala',
        city: city.trim() || 'Burewala',
        packagePrice: pricingSummary.totalCost,
        advancePaid: Number(advancePaid || 0),
        discount: Number(discount || 0),
        tax: 0,
        notes: notes.trim(),
        isMultiDay: isMultiDay || bookingDays.length > 1,
        daySchedulesInput: bookingDays.map((d, idx) => {
          const dayCalculatedCost = getDayCalculatedCost(d);
          const dayCombinedRate = CAMERA_CATEGORY_RATES[d.cameraCategory].ratePerDay;

          const customPackageForDay =
            d.packageMode === 'CUSTOM' &&
            d.saveCustomToLibrary &&
            (d.customPackageName.trim() || `${d.eventType} Customized Package`)
              ? {
                  name: d.customPackageName.trim() || `${d.eventType} Customized Package`,
                  category,
                  price: dayCalculatedCost,
                  description: `Customized ${d.eventType} package (${d.cameraCount} Cam × ${CAMERA_CATEGORY_RATES[d.cameraCategory].shortLabel})`,
                  requiredPhotographers: Math.max(1, Math.ceil(d.cameraCount / 2)),
                  requiredVideographers: Math.max(1, Math.floor(d.cameraCount / 2)),
                  includedServices: d.customPackageDeliverables
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                  deliverables: d.customPackageDeliverables
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                }
              : undefined;

          return {
            dayNumber: idx + 1,
            date: d.date,
            eventType: d.eventType || `Day ${idx + 1}`,
            venue: d.venue.trim() || venue.trim() || city.trim() || 'Burewala',
            timingMode: d.timingMode,
            startTime: d.startTime,
            endTime: d.endTime,
            durationHours: d.durationHours,
            notes: d.notes,
            packageMode: d.packageMode,
            standardPackageId:
              d.packageMode === 'BUILTIN' ? d.selectedPackageId || undefined : undefined,
            customPackageName:
              d.packageMode === 'CUSTOM'
                ? d.customPackageName.trim() || `${d.eventType} Customized Package`
                : undefined,
            packageBaseRate: dayCalculatedCost,
            customPrice: dayCalculatedCost,
            extraCustomAmount: d.extraCustomAmount,
            cameraCategory: d.cameraCategory,
            crewCategory: d.crewCategory,
            cameraCount: d.cameraCount,
            crewCount: Math.max(d.cameraCount, d.assignedCrewIds.length),
            cameraRatePerDay: dayCombinedRate,
            crewRatePerDay: dayCombinedRate,
            assignedCameraIds: d.assignedCameraIds,
            assignedCrewIds: d.assignedCrewIds,
            customPackageToCreate: customPackageForDay,
          };
        }),
        cameraCategory: primaryDay.cameraCategory,
        cameraCount: primaryDay.cameraCount,
        cameraRatePerDay: CAMERA_CATEGORY_RATES[primaryDay.cameraCategory].ratePerDay,
        crewCategory: primaryDay.crewCategory,
        crewCount: Math.max(primaryDay.cameraCount, primaryDay.assignedCrewIds.length),
        crewRatePerDay: CAMERA_CATEGORY_RATES[primaryDay.cameraCategory].ratePerDay,
        addOnsTotal: 0,
        autoAllocateResources: true,
        selectedEquipmentIds: allSelectedEquipmentIds,
        selectedCrewIds: allSelectedCrewIds,
      });

      onClose();
      addToast(
        `Booked "${resolvedTitle}" (${bookingDays.length} day(s)) — Total ${formatPKR(
          pricingSummary.totalCost
        )} synced to Calendar & Inventory!`
      );
    } catch (err: any) {
      addToast(err?.message || 'Failed to complete event booking', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="4xl"
      title={`Integrated Studio Event Booking — ${formatDate(
        bookingDays[0]?.date || initialDate
      )}`}
    >
      <div className="space-y-5 overflow-x-hidden">
        {/* 3-Step Unified Progress Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
          {[
            {
              num: 1 as const,
              title: '1. Customer Selection',
              sub: selectedCustomer ? selectedCustomer.name : 'Existing or Quick Add',
            },
            {
              num: 2 as const,
              title: '2. Event Days & Timing',
              sub: `${bookingDays.length} Day(s): ${bookingDays
                .map((d) => d.eventType)
                .join(', ')}`,
            },
            {
              num: 3 as const,
              title: '3. Day Packages & Cam/Crew Tiers',
              sub: `${bookingDays.length} Day(s) · Total ${formatPKR(pricingSummary.totalCost)}`,
            },
          ].map((item) => {
            const active = step === item.num;
            const completed = step > item.num;
            return (
              <button
                key={item.num}
                type="button"
                onClick={() => {
                  if (item.num > 1 && !selectedClientId) {
                    addToast('Please select or add a customer first.', 'info');
                    return;
                  }
                  setStep(item.num);
                }}
                className={`p-2.5 rounded-lg text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : completed
                    ? 'bg-white text-slate-900 border border-slate-200'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full text-xs font-extrabold flex items-center justify-center shrink-0 ${
                    active
                      ? 'bg-amber-400 text-slate-950'
                      : completed
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {completed ? <Check className="w-3.5 h-3.5" /> : item.num}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">{item.title}</div>
                  <div
                    className={`text-[11px] truncate font-mono ${
                      active ? 'text-amber-300' : 'text-slate-500'
                    }`}
                  >
                    {item.sub}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ===================== STEP 1: CUSTOMER SELECTION & QUICK ADD ===================== */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {isQuickAddClient
                    ? 'Add a New Customer On the Fly'
                    : 'Select Existing Studio Customer'}
                </h4>
                <p className="text-xs text-slate-500">
                  {isQuickAddClient
                    ? 'Instant customer creation within the booking workflow — zero tab switching.'
                    : 'Search by customer name, phone, email, or city, or add a new client immediately.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddClient((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-950 border border-amber-500/40 text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>
                  {isQuickAddClient ? 'Search Existing Customers' : '+ Add New Customer'}
                </span>
              </button>
            </div>

            {isQuickAddClient ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Customer Full Name *
                    </label>
                    <input
                      type="text"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="e.g. Hamza & Ayeza Family"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone / WhatsApp Number *
                    </label>
                    <input
                      type="text"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      placeholder="e.g. 0300-1234567"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      placeholder="client@example.com"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={newClientCity}
                      onChange={(e) => setNewClientCity(e.target.value)}
                      placeholder="Burewala / Lahore / Multan"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Residential / Venue Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={newClientAddress}
                    onChange={(e) => setNewClientAddress(e.target.value)}
                    placeholder="Street, Sector, or Town"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsQuickAddClient(false)}
                    className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isCreatingClient}
                    onClick={handleQuickCreateCustomer}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                  >
                    <span>
                      {isCreatingClient ? 'Saving Customer...' : 'Save Customer & Continue'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Searchable Dropdown + Instant Filter Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Filter customers by name, phone, or city..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <select
                      value={selectedClientId}
                      onChange={(e) => {
                        const found = clients.find((c) => c.id === e.target.value);
                        if (found) {
                          setSelectedClientId(found.id);
                          setCity(found.city || 'Burewala');
                          if (!title.trim()) {
                            setTitle(`${found.name} — ${category} Booking`);
                          }
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-900"
                    >
                      <option value="" disabled>
                        -- Quick Dropdown: Select Existing Customer ({clients.length}) --
                      </option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.phone} ({c.city || 'Burewala'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {filteredClients.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <p className="text-xs text-slate-600">
                        No existing customer matches &ldquo;{customerSearch}&rdquo;.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setNewClientName(customerSearch);
                          setIsQuickAddClient(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add &ldquo;{customerSearch}&rdquo; as New Customer</span>
                      </button>
                    </div>
                  ) : (
                    filteredClients.map((client) => {
                      const isSelected = client.id === selectedClientId;
                      return (
                        <div
                          key={client.id}
                          onClick={() => handleSelectExistingCustomer(client)}
                          className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                            isSelected
                              ? 'bg-amber-50/90 border-amber-500 ring-1 ring-amber-500'
                              : 'bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {client.name}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {client.phone}
                              {client.email ? ` · ${client.email}` : ''}
                              {client.city ? ` · ${client.city}` : ''}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                          >
                            <span>Select &amp; Next</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedCustomer && (
                  <div className="flex items-center justify-end pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleSelectExistingCustomer(selectedCustomer)}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                    >
                      <span>Continue with {selectedCustomer.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===================== STEP 2: EVENT DETAILS, MULTI-DAY & TIMING (DM 5-HR WINDOW) ===================== */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Customer Summary Bar */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs">
              <div className="truncate">
                <span className="text-slate-500">Customer: </span>
                <strong className="text-slate-900">{selectedCustomer?.name}</strong>
                <span className="text-slate-500 font-mono ml-1.5">
                  ({selectedCustomer?.phone})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-bold text-amber-800 hover:underline shrink-0 cursor-pointer"
              >
                Change Customer
              </button>
            </div>

            {/* Streamlined Event Core Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Booking Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value as EventCategory)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                >
                  <option value="Wedding">Wedding (Single or Multi-Day)</option>
                  <option value="Nikah">Nikah Ceremony</option>
                  <option value="Engagement">Engagement</option>
                  <option value="Bridal Shower">Bridal Shower</option>
                  <option value="Corporate">Corporate Event</option>
                  <option value="Birthday">Birthday Event</option>
                  <option value="Concert">Concert / Live Show</option>
                  <option value="Other">Other Shoot</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Overall Booking Title (Auto-generated if left blank)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Hamza & Ayeza Wedding Coverage"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Venue / Marquee / Hall Location
                </label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. Royal Palm Marquee, Canal Road"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Burewala"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>
            </div>

            {/* Single Day vs Multiple Days Direct Control */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Per-Day Ceremony &amp; Time Slot Schedule
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Each day defines its ceremony (e.g., Mehndi, Barat, Walima) and timing mode.{' '}
                    <strong>Day Time (DM)</strong> strictly enforces a 5-hour window.
                  </p>
                </div>

                <div className="inline-flex items-center p-1 bg-white border border-slate-300 rounded-lg shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleMultiDay(false)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                      !isMultiDay
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Single Day
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleMultiDay(true)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                      isMultiDay
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Multiple Days ({bookingDays.length})
                  </button>
                </div>
              </div>

              {/* Quick 1-Click Multi-Day Wedding Sequence Templates */}
              {category === 'Wedding' && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-700 inline-flex items-center gap-1 mr-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Quick Wedding Templates:</span>
                  </span>
                  {[
                    { label: '1-Day Barat Only', seq: ['Barat'] },
                    { label: '1-Day Walima Only', seq: ['Walima'] },
                    { label: '2-Day: Barat + Walima', seq: ['Barat', 'Walima'] },
                    { label: '3-Day: Mehndi + Barat + Walima', seq: ['Mehndi', 'Barat', 'Walima'] },
                    {
                      label: '4-Day: Mayun + Mehndi + Barat + Walima',
                      seq: ['Mayun / Dholki', 'Mehndi', 'Barat', 'Walima'],
                    },
                  ].map((tpl) => (
                    <button
                      key={tpl.label}
                      type="button"
                      onClick={() => handleApplyWeddingSequencePreset(tpl.seq)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 text-slate-800 border border-slate-300 hover:border-amber-400 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Per-Date Schedule Cards */}
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {bookingDays.map((dayItem, index) => {
                  const isDayTime = dayItem.timingMode === 'DAY_TIME';
                  const presets = isDayTime ? DAY_TIME_PRESETS : NIGHT_TIME_PRESETS;
                  const functionChips =
                    category === 'Wedding' ? WEDDING_CEREMONY_CHIPS : GENERAL_FUNCTION_CHIPS;

                  return (
                    <div
                      key={dayItem.id}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[11px] font-mono font-bold">
                            Day {index + 1}: {dayItem.eventType}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {formatDate(dayItem.date)}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            · {dayItem.durationHours} hrs ({dayItem.startTime} – {dayItem.endTime})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Control 1: Timing Mode Selector (Day Time DM vs Night Time) */}
                          <div className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateBookingDay(dayItem.id, { timingMode: 'DAY_TIME' })
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                                isDayTime
                                  ? 'bg-amber-400 text-slate-950 shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <Sun className="w-3 h-3" />
                              <span>Day Time (DM · 5h)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateBookingDay(dayItem.id, { timingMode: 'NIGHT_TIME' })
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                                !isDayTime
                                  ? 'bg-slate-900 text-white shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <Moon className="w-3 h-3" />
                              <span>Night Time</span>
                            </button>
                          </div>

                          {bookingDays.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveBookingDay(dayItem.id)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Remove Day"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Quick Ceremony / Day Function Selector Chips */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1">
                          Day {index + 1} Ceremony:
                        </span>
                        {functionChips.map((chip) => {
                          const isSelectedChip =
                            dayItem.eventType.toLowerCase() === chip.toLowerCase();
                          return (
                            <button
                              key={chip}
                              type="button"
                              onClick={() =>
                                handleUpdateBookingDay(dayItem.id, {
                                  eventType: chip,
                                  customPackageName: `${chip} Customized Package`,
                                })
                              }
                              className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                                isSelectedChip
                                  ? 'bg-amber-400 text-slate-950 border-amber-500 font-bold'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {chip}
                            </button>
                          );
                        })}
                      </div>

                      {/* Strict 5-Hour DM Constraint Banner */}
                      {isDayTime && (
                        <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300/80 flex items-center justify-between gap-2 text-[11px] text-amber-950">
                          <span className="inline-flex items-center gap-1.5 font-semibold">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span>
                              Day Time (DM) Constraint Active: Strict 5-hour maximum window enforced (
                              {dayItem.startTime} to {dayItem.endTime} · {dayItem.durationHours}h).
                            </span>
                          </span>
                        </div>
                      )}

                      {/* Date, Custom Ceremony Name, Start Time, End Time */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Date *
                          </label>
                          <input
                            type="date"
                            value={dayItem.date}
                            onChange={(e) =>
                              handleUpdateBookingDay(dayItem.id, { date: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Day Function Name
                          </label>
                          <input
                            type="text"
                            value={dayItem.eventType}
                            onChange={(e) =>
                              handleUpdateBookingDay(dayItem.id, { eventType: e.target.value })
                            }
                            placeholder="e.g. Mehndi / Barat"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Start Time
                          </label>
                          <input
                            type="time"
                            value={dayItem.startTime}
                            onChange={(e) =>
                              handleUpdateBookingDay(dayItem.id, { startTime: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            End Time {isDayTime ? '(Max +5h)' : ''}
                          </label>
                          <input
                            type="time"
                            value={dayItem.endTime}
                            onChange={(e) =>
                              handleUpdateBookingDay(dayItem.id, { endTime: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                          />
                        </div>
                      </div>

                      {/* Quick Time Window Presets */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] font-semibold text-slate-500 mr-1">
                          Quick Time Slots:
                        </span>
                        {presets.map((p) => {
                          const isCurrent =
                            dayItem.startTime === p.start && dayItem.endTime === p.end;
                          return (
                            <button
                              key={p.label}
                              type="button"
                              onClick={() =>
                                handleUpdateBookingDay(dayItem.id, {
                                  startTime: p.start,
                                  endTime: p.end,
                                })
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border transition-colors cursor-pointer ${
                                isCurrent
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleAddBookingDay}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Another Event Day</span>
                </button>
                <span className="text-[11px] font-mono text-slate-600">
                  Total Active Days: <strong>{bookingDays.length}</strong>
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Event Notes / Pose &amp; Wardrobe / Coverage Directives
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bridal portrait lighting, family group list, drone venue clearance..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Customer</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                <span>Next: Day 1 / Day 2 Packages &amp; Cam+Crew Tiers</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ===================== STEP 3: PER-DAY PRE-DEFINED OR CUSTOMIZED (CAM + CREW COMBINED TIER) PACKAGES ===================== */}
        {step === 3 && (
          <form onSubmit={handleConfirmBooking} className="space-y-4">
            {/* Top Header & Copy Day 1 Helper */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <PackageIcon className="w-4 h-4 text-amber-600" />
                  <span>
                    Configure Each Day (Day 1{bookingDays.length > 1 ? `, Day 2${bookingDays.length > 2 ? ', Day 3...' : ''}` : ''}): Pre-Defined Package OR Customized Camera + Crew Tier
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Under <strong>Customized Package</strong>, selecting a tier combines Camera + Crew payment:
                  <strong> Cat 1 + Tier 1 = PKR 10k/cam</strong> ·{' '}
                  <strong>Cat 2 + Tier 2 = PKR 15k/cam</strong> ·{' '}
                  <strong>Cat 3 + Tier 3 = PKR 20k/cam</strong> per day.
                </p>
              </div>

              {bookingDays.length > 1 && (
                <button
                  type="button"
                  onClick={handleCopyDay1SetupToAllDays}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-amber-50 text-slate-800 border border-slate-300 text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-600" />
                  <span>Copy Day 1 Setup to All {bookingDays.length} Days</span>
                </button>
              )}
            </div>

            {/* PER-DAY CONFIGURATION CARDS (DAY 1, DAY 2, DAY 3...) */}
            <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
              {bookingDays.map((dayItem, idx) => {
                const dayCost = getDayCalculatedCost(dayItem);
                const { busyEqMap, busyCrewMap } = getBusyResourcesForDate(dayItem.date);
                const combinedRate = CAMERA_CATEGORY_RATES[dayItem.cameraCategory].ratePerDay;

                return (
                  <div
                    key={dayItem.id}
                    className="p-4 rounded-xl bg-white border-2 border-slate-200 shadow-2xs space-y-3.5"
                  >
                    {/* Day Header Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-mono font-extrabold">
                          Day {idx + 1}: {dayItem.eventType}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          {formatDate(dayItem.date)} ·{' '}
                          {dayItem.timingMode === 'DAY_TIME' ? 'Day Time (5h DM)' : 'Night Time'} (
                          {dayItem.startTime}–{dayItem.endTime})
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-400/25 border border-amber-500 text-slate-950 text-xs font-mono font-extrabold">
                          Day {idx + 1} Total: {formatPKR(dayCost)}
                        </span>
                      </div>

                      {/* Toggle: Pre-Defined Package vs Customized Package (Camera + Crew Tier) */}
                      <div className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-300 rounded-lg shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const found =
                              packages.find((p) => p.id === dayItem.selectedPackageId) ||
                              packages[0];
                            handleUpdateBookingDay(dayItem.id, {
                              packageMode: 'BUILTIN',
                              selectedPackageId: found ? found.id : '',
                              packageBaseRate: found ? found.price : dayItem.packageBaseRate,
                            });
                          }}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                            dayItem.packageMode === 'BUILTIN'
                              ? 'bg-slate-900 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Pre-Defined Package
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateBookingDay(dayItem.id, {
                              packageMode: 'CUSTOM',
                              customPackageName:
                                dayItem.customPackageName ||
                                `${dayItem.eventType} Customized Package`,
                            })
                          }
                          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                            dayItem.packageMode === 'CUSTOM'
                              ? 'bg-amber-400 text-slate-950 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Customized Package (Cam + Crew Tier)
                        </button>
                      </div>
                    </div>

                    {/* ==================== OPTION A: PRE-DEFINED PACKAGE FOR DAY {idx + 1} ==================== */}
                    {dayItem.packageMode === 'BUILTIN' && (
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Select Pre-Defined Studio Package for Day {idx + 1} ({dayItem.eventType})
                            </label>
                            <select
                              value={dayItem.selectedPackageId}
                              onChange={(e) => {
                                const pId = e.target.value;
                                const found = packages.find((p) => p.id === pId);
                                handleUpdateBookingDay(dayItem.id, {
                                  selectedPackageId: pId,
                                  packageBaseRate: found ? found.price : dayItem.packageBaseRate,
                                });
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                            >
                              {packages.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} — {formatPKR(p.price)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Day {idx + 1} Package Price (PKR)
                            </label>
                            <input
                              type="number"
                              value={dayItem.packageBaseRate}
                              onChange={(e) =>
                                handleUpdateBookingDay(dayItem.id, {
                                  packageBaseRate: Number(e.target.value),
                                })
                              }
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ==================== OPTION B: CUSTOMIZED PACKAGE FOR DAY {idx + 1} (COMBINED CAM + CREW TIER) ==================== */}
                    {dayItem.packageMode === 'CUSTOM' && (
                      <div className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200/90 space-y-3.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <Camera className="w-3.5 h-3.5 text-amber-700" />
                              <span>
                                Day {idx + 1} ({dayItem.eventType}) — Select Combined Camera + Crew Tier
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600">
                              Combined rate includes both Camera &amp; Photographer/Videographer Crew per camera for Day {idx + 1}.
                            </p>
                          </div>

                          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 shrink-0">
                            <label className="text-xs font-bold text-slate-800">
                              Day {idx + 1} Cameras (with Crew):
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={dayItem.cameraCount}
                              onChange={(e) =>
                                handleDayCameraCountChange(dayItem.id, Number(e.target.value))
                              }
                              className="w-14 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono font-extrabold text-slate-900 text-center"
                            />
                          </div>
                        </div>

                         {/* 3 Combined Camera + Crew Tier Cards (10k / 15k / 20k per cam per day) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {COMBINED_TIER_OPTIONS.map((opt) => {
                            const isSelectedTier = dayItem.cameraCategory === opt.camTier;
                            const tierDaySubtotal = dayItem.cameraCount * opt.ratePerCamPerDay;
                            return (
                              <button
                                key={opt.camTier}
                                type="button"
                                onClick={() =>
                                  handleUpdateBookingDay(dayItem.id, {
                                    cameraCategory: opt.camTier,
                                    crewCategory: opt.crewTier,
                                    tierSlots:
                                      dayItem.tierSlots && dayItem.tierSlots.length === 1
                                        ? [
                                            {
                                              ...dayItem.tierSlots[0],
                                              cameraCategory: opt.camTier,
                                              crewCategory: opt.crewTier,
                                            },
                                          ]
                                        : dayItem.tierSlots,
                                  })
                                }
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                  isSelectedTier
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-amber-400'
                                    : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-extrabold">{opt.title}</span>
                                  {isSelectedTier && (
                                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  )}
                                </div>
                                <div
                                  className={`text-xs font-mono font-extrabold mt-1 ${
                                    isSelectedTier ? 'text-amber-400' : 'text-amber-800'
                                  }`}
                                >
                                  {opt.badge}
                                </div>
                                <div
                                  className={`text-[10px] mt-1 ${
                                    isSelectedTier ? 'text-slate-300' : 'text-slate-500'
                                  }`}
                                >
                                  {opt.subtitle}
                                </div>
                                <div
                                  className={`mt-2 pt-1.5 border-t text-[11px] font-mono font-bold ${
                                    isSelectedTier
                                      ? 'border-slate-700 text-emerald-300'
                                      : 'border-slate-100 text-slate-700'
                                  }`}
                                >
                                  {dayItem.cameraCount} Cam × {formatPKR(opt.ratePerCamPerDay)} ={' '}
                                  {formatPKR(tierDaySubtotal)}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Per-Slot Role Breakdown (Photographers, Videographers, Drones) & Mixed-Tier Support on Same Day */}
                        {Array.isArray(dayItem.tierSlots) && dayItem.tierSlots.length > 0 && (
                          <div className="space-y-2 pt-1">
                            {dayItem.tierSlots.map((slot, sIdx) => {
                              const slotCalc = calculateTierSlotSummary(slot);
                              return (
                                <div
                                  key={slot.id}
                                  className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-2"
                                >
                                  <div className="flex items-center justify-between gap-2 text-xs">
                                    <span className="font-bold text-slate-800">
                                      {dayItem.tierSlots!.length > 1
                                        ? `Tier Slot #${sIdx + 1} (Mixed Tier on Day ${idx + 1})`
                                        : `Day ${idx + 1} Role Breakdown (Photographers / Videographers / Drone)`}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-amber-700">
                                        {slotCalc.formulaText}
                                      </span>
                                      {dayItem.tierSlots!.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nextSlots = dayItem.tierSlots!.filter(
                                              (s) => s.id !== slot.id
                                            );
                                            const totalUnits = nextSlots.reduce(
                                              (acc, s) =>
                                                acc + s.photographers + s.videographers + s.drones,
                                              0
                                            );
                                            handleUpdateBookingDay(dayItem.id, {
                                              tierSlots: nextSlots,
                                              cameraCount: Math.max(1, totalUnits),
                                            });
                                          }}
                                          className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                                        >
                                          Remove Slot
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                    <div>
                                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                        Category + Crew Tier
                                      </label>
                                      <select
                                        value={slot.cameraCategory}
                                        onChange={(e) => {
                                          const newCat = e.target.value as CameraCategoryTier;
                                          const nextSlots = dayItem.tierSlots!.map((s) =>
                                            s.id === slot.id
                                              ? {
                                                  ...s,
                                                  cameraCategory: newCat,
                                                  crewCategory: mapCameraTierToCrewTier(newCat),
                                                }
                                              : s
                                          );
                                          handleUpdateBookingDay(dayItem.id, {
                                            tierSlots: nextSlots,
                                            cameraCategory: nextSlots[0].cameraCategory,
                                            crewCategory: nextSlots[0].crewCategory,
                                          });
                                        }}
                                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-semibold text-slate-900"
                                      >
                                        <option value="CAT_1">Cat 1 + Tier 1 (10k/cam)</option>
                                        <option value="CAT_2">Cat 2 + Tier 2 (15k/cam)</option>
                                        <option value="CAT_3">Cat 3 + Tier 3 (20k/cam)</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                        Photographers
                                      </label>
                                      <input
                                        type="number"
                                        min={0}
                                        value={slot.photographers}
                                        onChange={(e) => {
                                          const val = Math.max(0, Number(e.target.value || 0));
                                          const nextSlots = dayItem.tierSlots!.map((s) =>
                                            s.id === slot.id ? { ...s, photographers: val } : s
                                          );
                                          const totalUnits = nextSlots.reduce(
                                            (acc, s) =>
                                              acc + s.photographers + s.videographers + s.drones,
                                            0
                                          );
                                          handleUpdateBookingDay(dayItem.id, {
                                            tierSlots: nextSlots,
                                            cameraCount: Math.max(1, totalUnits),
                                          });
                                        }}
                                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono text-center"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                        Videographers
                                      </label>
                                      <input
                                        type="number"
                                        min={0}
                                        value={slot.videographers}
                                        onChange={(e) => {
                                          const val = Math.max(0, Number(e.target.value || 0));
                                          const nextSlots = dayItem.tierSlots!.map((s) =>
                                            s.id === slot.id ? { ...s, videographers: val } : s
                                          );
                                          const totalUnits = nextSlots.reduce(
                                            (acc, s) =>
                                              acc + s.photographers + s.videographers + s.drones,
                                            0
                                          );
                                          handleUpdateBookingDay(dayItem.id, {
                                            tierSlots: nextSlots,
                                            cameraCount: Math.max(1, totalUnits),
                                          });
                                        }}
                                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono text-center"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                                        Drone Cameras
                                      </label>
                                      <input
                                        type="number"
                                        min={0}
                                        value={slot.drones}
                                        onChange={(e) => {
                                          const val = Math.max(0, Number(e.target.value || 0));
                                          const nextSlots = dayItem.tierSlots!.map((s) =>
                                            s.id === slot.id ? { ...s, drones: val } : s
                                          );
                                          const totalUnits = nextSlots.reduce(
                                            (acc, s) =>
                                              acc + s.photographers + s.videographers + s.drones,
                                            0
                                          );
                                          handleUpdateBookingDay(dayItem.id, {
                                            tierSlots: nextSlots,
                                            cameraCount: Math.max(1, totalUnits),
                                          });
                                        }}
                                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono text-center"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            <button
                              type="button"
                              onClick={() => {
                                const nextSlots: DayTierSlot[] = [
                                  ...(dayItem.tierSlots || []),
                                  {
                                    id: `${dayItem.id}-slot-${Date.now()}`,
                                    cameraCategory: 'CAT_1',
                                    crewCategory: 'CREW_CAT_1',
                                    photographers: 0,
                                    videographers: 1,
                                    drones: 0,
                                  },
                                ];
                                const totalUnits = nextSlots.reduce(
                                  (acc, s) => acc + s.photographers + s.videographers + s.drones,
                                  0
                                );
                                handleUpdateBookingDay(dayItem.id, {
                                  tierSlots: nextSlots,
                                  cameraCount: Math.max(1, totalUnits),
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-amber-500 bg-white hover:bg-amber-50 text-[11px] font-bold text-amber-900 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>
                                + Add Mixed Tier Slot on Day {idx + 1} (e.g. 1P+1V @20k + 1V @10k)
                              </span>
                            </button>
                          </div>
                        )}

                        {/* Live Calculation Bar for Day {idx + 1} Customized Package */}
                        <div className="p-2.5 rounded-lg bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                          <div>
                            <span className="text-slate-400">Day {idx + 1} Formula: </span>
                            <strong className="text-amber-300">
                              {dayItem.cameraCount} Camera(s) × {formatPKR(combinedRate)} (
                              {dayItem.cameraCategory.replace('CAT_', 'Category ')} Cam + Tier{' '}
                              {dayItem.cameraCategory.replace('CAT_', '')} Crew)
                            </strong>
                            {dayItem.extraCustomAmount > 0 && (
                              <span className="text-emerald-300">
                                {' '}
                                + {formatPKR(dayItem.extraCustomAmount)} Extra
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-extrabold text-amber-400">
                            = {formatPKR(dayCost)}
                          </div>
                        </div>

                        {/* Optional Custom Package Name, Deliverables & Extra Add-on for Day {idx + 1} */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Day {idx + 1} Custom Package Title
                            </label>
                            <input
                              type="text"
                              value={dayItem.customPackageName}
                              onChange={(e) =>
                                handleUpdateBookingDay(dayItem.id, {
                                  customPackageName: e.target.value,
                                })
                              }
                              placeholder={`e.g. ${dayItem.eventType} Custom Package`}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Deliverables (Album / Video / Drone)
                            </label>
                            <input
                              type="text"
                              value={dayItem.customPackageDeliverables}
                              onChange={(e) =>
                                handleUpdateBookingDay(dayItem.id, {
                                  customPackageDeliverables: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Extra Deliverable / Album Fee (PKR)
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={dayItem.extraCustomAmount}
                              onChange={(e) =>
                                handleUpdateBookingDay(dayItem.id, {
                                  extraCustomAmount: Number(e.target.value),
                                })
                              }
                              placeholder="0"
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ==================== PER-DAY CAMERA INVENTORY & CREW ASSIGNMENT FOR DAY {idx + 1} ==================== */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Camera Inventory Picker for Day {idx + 1} */}
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-700">
                          <span className="font-bold inline-flex items-center gap-1">
                            <Camera className="w-3 h-3 text-amber-600" />
                            <span>Day {idx + 1} Cameras from Inventory</span>
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {dayItem.assignedCameraIds.length} selected
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {cameraInventory.map((cam) => {
                            const busyTitle = busyEqMap.get(cam.id);
                            const isMaint =
                              cam.status === 'Maintenance' || cam.status === 'Damaged';
                            const isUnavailable = Boolean(busyTitle) || isMaint;
                            const isSelected = dayItem.assignedCameraIds.includes(cam.id);
                            return (
                              <button
                                key={cam.id}
                                type="button"
                                disabled={isUnavailable}
                                onClick={() => handleToggleDayCamera(dayItem.id, cam.id, busyTitle)}
                                className={`px-2 py-1 rounded text-[10px] font-semibold border inline-flex items-center gap-1 transition-all ${
                                  isUnavailable
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                    : isSelected
                                    ? 'bg-slate-900 border-slate-900 text-white cursor-pointer'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400 cursor-pointer'
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 text-amber-400" />}
                                <span>{cam.name}</span>
                                {busyTitle && (
                                  <span className="text-[9px] text-rose-500">(Booked)</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Crew / Boys Picker for Day {idx + 1} */}
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-700">
                          <span className="font-bold inline-flex items-center gap-1">
                            <Users className="w-3 h-3 text-amber-600" />
                            <span>Day {idx + 1} Photographers / Video Crew</span>
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {dayItem.assignedCrewIds.length} assigned
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                          {activeTeamRoster.map((tm) => {
                            const busyTitle = busyCrewMap.get(tm.id);
                            const isUnavailable = Boolean(busyTitle);
                            const isSelected = dayItem.assignedCrewIds.includes(tm.id);
                            return (
                              <button
                                key={tm.id}
                                type="button"
                                disabled={isUnavailable}
                                onClick={() => handleToggleDayCrew(dayItem.id, tm.id, busyTitle)}
                                className={`px-2 py-1 rounded text-[10px] font-semibold border inline-flex items-center gap-1 transition-all ${
                                  isUnavailable
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                    : isSelected
                                    ? 'bg-slate-900 border-slate-900 text-white cursor-pointer'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400 cursor-pointer'
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 text-amber-400" />}
                                <span>
                                  {tm.name} ({tm.role})
                                </span>
                                {busyTitle && (
                                  <span className="text-[9px] text-rose-500">(Booked)</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* OVERALL DYNAMIC PRICING SUMMARY CARD */}
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold tracking-wide">
                    Day-by-Day Combined Camera + Crew Tier &amp; Package Pricing Summary
                  </span>
                </div>
                <span className="text-[11px] font-mono text-amber-300">
                  Cat 1 + Tier 1 = 10k · Cat 2 + Tier 2 = 15k · Cat 3 + Tier 3 = 20k / cam / day
                </span>
              </div>

              {/* Per-Day Breakdown List */}
              <div className="space-y-1.5">
                {pricingSummary.dayBreakdowns.map((dbItem) => (
                  <div
                    key={dbItem.dayNumber}
                    className="px-3 py-2 rounded-lg bg-slate-800/90 border border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs font-mono"
                  >
                    <div>
                      <span className="text-amber-400 font-bold">
                        Day {dbItem.dayNumber} ({dbItem.eventType} · {formatDate(dbItem.date)}):
                      </span>{' '}
                      <span className="text-slate-200">{dbItem.formulaLabel}</span>
                    </div>
                    <span className="font-extrabold text-white">{formatPKR(dbItem.cost)}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    Advance Deposit Paid (PKR)
                  </label>
                  <input
                    type="number"
                    value={advancePaid}
                    onChange={(e) => setAdvancePaid(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    Special Discount (PKR)
                  </label>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    Remaining Balance
                  </label>
                  <div className="px-3 py-1.5 bg-slate-800/60 border border-slate-700 rounded-lg text-xs font-mono font-bold text-amber-300">
                    {formatPKR(Math.max(0, pricingSummary.totalCost - Number(advancePaid || 0)))}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-amber-400 text-slate-950 flex flex-col justify-center">
                  <div className="text-[10px] font-bold uppercase leading-none">
                    Total Booking Cost
                  </div>
                  <div className="text-base font-mono font-extrabold mt-0.5 leading-tight">
                    {formatPKR(pricingSummary.totalCost)}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Controls */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dates &amp; Timing</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Confirming & Locking Inventory...'
                    : `Confirm Booking (${formatPKR(pricingSummary.totalCost)})`}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
