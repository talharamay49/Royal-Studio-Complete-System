import React, { useState, useMemo, useEffect } from 'react';
import {
  UserPlus,
  Search,
  Calendar,
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
  MapPin,
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
  CREW_CATEGORY_RATES,
  enforceDayTimeWindow,
  calculateDynamicBookingPricing,
  formatPKR,
  formatDate,
} from '../../utils/calculations';

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
}

const BOOKING_ADDONS = [
  { id: 'addon-drone', name: '4K Drone Aerial Coverage', price: 25000 },
  { id: 'addon-sde', name: 'Same-Day Edit (SDE) Highlight Reel', price: 30000 },
  { id: 'addon-gimbal', name: 'Ronin 4D / Crane Cinema Rig', price: 20000 },
  { id: 'addon-album', name: 'Luxury Italian Acrylic Album', price: 35000 },
];

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

  // Step 2: Event Details, Multi-Day Toggle & Per-Date Timing (DM 5-Hr vs Night Time)
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<EventCategory>('Wedding');
  const [weddingSubtype, setWeddingSubtype] = useState<WeddingSubtype>('Barat');
  const [venue, setVenue] = useState<string>('');
  const [city, setCity] = useState<string>('Burewala');
  const [notes, setNotes] = useState<string>('');
  const [isMultiDay, setIsMultiDay] = useState<boolean>(false);
  const [bookingDays, setBookingDays] = useState<BookingDayInput[]>([]);

  // Step 3: Camera Inventory, Camera Categories, Crew Categories & Package/Custom Pricing
  const [cameraCategory, setCameraCategory] = useState<CameraCategoryTier>('CAT_2');
  const [cameraCount, setCameraCount] = useState<number>(2);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);

  const [crewCategory, setCrewCategory] = useState<CrewCategoryTier>('CREW_CAT_2');
  const [crewCount, setCrewCount] = useState<number>(2);
  const [selectedCrewIds, setSelectedCrewIds] = useState<string[]>([]);

  const [packageMode, setPackageMode] = useState<'BUILTIN' | 'CUSTOM' | 'NONE'>('BUILTIN');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [packageBaseRate, setPackageBaseRate] = useState<number>(0);
  const [customPackageName, setCustomPackageName] = useState<string>('');
  const [customPackageDeliverables, setCustomPackageDeliverables] = useState<string>(
    '8K Master Highlight Film, Full Editorial Portrait Gallery, Luxury Print Release'
  );
  const [saveCustomToLibrary, setSaveCustomToLibrary] = useState<boolean>(true);

  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [advancePaid, setAdvancePaid] = useState<number>(50000);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize state whenever modal opens for a calendar date/slot
  useEffect(() => {
    if (!isOpen) return;
    const startH = parseInt((initialStartTime || '18:00').split(':')[0] || '18', 10);
    const defaultTimingMode: TimingMode = startH >= 8 && startH <= 16 ? 'DAY_TIME' : 'NIGHT_TIME';
    const rawStart =
      defaultTimingMode === 'DAY_TIME'
        ? `${String(startH).padStart(2, '0')}:00`
        : initialStartTime || '18:00';
    const rawEnd =
      defaultTimingMode === 'DAY_TIME'
        ? `${String(Math.min(23, startH + 5)).padStart(2, '0')}:00`
        : `${String(Math.min(23, startH + 5)).padStart(2, '0')}:00`;
    const enforced = enforceDayTimeWindow(rawStart, rawEnd, defaultTimingMode);

    setStep(1);
    setCustomerSearch('');
    setIsQuickAddClient(false);
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }

    setIsMultiDay(false);
    setBookingDays([
      {
        id: 'day-1',
        date: initialDate,
        eventType: 'Barat',
        venue: '',
        timingMode: defaultTimingMode,
        startTime: enforced.startTime,
        endTime: enforced.endTime,
        durationHours: enforced.durationHours,
        notes: '',
      },
    ]);

    const firstPkg = packages[0];
    if (firstPkg) {
      setSelectedPackageId(firstPkg.id);
      setPackageBaseRate(firstPkg.price);
      setPackageMode('BUILTIN');
    } else {
      setPackageMode('NONE');
      setPackageBaseRate(0);
    }

    setCameraCategory('CAT_2');
    setCrewCategory('CREW_CAT_2');
    setSelectedAddOnIds([]);
    setDiscount(0);
  }, [isOpen, initialDate, initialStartTime, clients, packages]);

  // Compute busy equipment and busy crew across all selected bookingDays
  const activeDatesSet = useMemo(() => {
    return new Set(bookingDays.map((d) => d.date).filter(Boolean));
  }, [bookingDays]);

  const { busyEquipmentMap, busyCrewMap } = useMemo(() => {
    const overlappingEventIds = new Set<string>();
    const eventTitleById = new Map<string, string>();

    events.forEach((evt) => {
      if (evt.status === 'Cancelled') return;
      eventTitleById.set(evt.id, evt.title);
      if (activeDatesSet.has(evt.eventDate)) {
        overlappingEventIds.add(evt.id);
      }
    });

    daySchedules.forEach((ds) => {
      if (activeDatesSet.has(ds.date)) {
        const parentEvt = events.find((e) => e.id === ds.eventId);
        if (parentEvt && parentEvt.status !== 'Cancelled') {
          overlappingEventIds.add(ds.eventId);
          eventTitleById.set(ds.eventId, parentEvt.title);
        }
      }
    });

    const eqMap = new Map<string, string>();
    equipmentAssignments.forEach((ea) => {
      if (overlappingEventIds.has(ea.eventId) && !ea.isCheckedIn) {
        eqMap.set(ea.equipmentId, eventTitleById.get(ea.eventId) || 'Booked Event');
      }
    });

    const crewMap = new Map<string, string>();
    teamAssignments.forEach((ta) => {
      if (overlappingEventIds.has(ta.eventId) && ta.assignmentStatus !== 'Cancelled') {
        crewMap.set(ta.teamMemberId, eventTitleById.get(ta.eventId) || 'Booked Event');
      }
    });

    return { busyEquipmentMap: eqMap, busyCrewMap: crewMap };
  }, [events, daySchedules, equipmentAssignments, teamAssignments, activeDatesSet]);

  // Camera inventory items & available cameras
  const cameraInventory = useMemo(() => {
    return equipment.filter((eq) => eq.category === 'Camera');
  }, [equipment]);

  const supportGearInventory = useMemo(() => {
    return equipment.filter((eq) => eq.category !== 'Camera');
  }, [equipment]);

  const availableCameras = useMemo(() => {
    return cameraInventory.filter(
      (cam) => cam.status !== 'Maintenance' && cam.status !== 'Damaged' && !busyEquipmentMap.has(cam.id)
    );
  }, [cameraInventory, busyEquipmentMap]);

  const availableTeamMembers = useMemo(() => {
    return teamMembers.filter(
      (tm) =>
        tm.isActive &&
        tm.availabilityStatus !== 'On Leave' &&
        tm.availabilityStatus !== 'Inactive' &&
        !busyCrewMap.has(tm.id)
    );
  }, [teamMembers, busyCrewMap]);

  // Auto-select available cameras and crew when dates change
  useEffect(() => {
    if (!isOpen) return;
    const defaultCams = availableCameras.slice(0, 2).map((c) => c.id);
    setSelectedEquipmentIds(defaultCams);
    setCameraCount(Math.max(1, defaultCams.length));

    const defaultCrew = availableTeamMembers.slice(0, 2).map((m) => m.id);
    setSelectedCrewIds(defaultCrew);
    setCrewCount(Math.max(1, defaultCrew.length));
  }, [isOpen, initialDate]);

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

  // Add-ons total
  const addOnsTotal = useMemo(() => {
    return BOOKING_ADDONS.filter((a) => selectedAddOnIds.includes(a.id)).reduce(
      (acc, a) => acc + a.price,
      0
    );
  }, [selectedAddOnIds]);

  // Dynamic Pricing Formula Calculation
  const pricingSummary = useMemo(() => {
    const camRate = CAMERA_CATEGORY_RATES[cameraCategory].ratePerDay;
    const crewRate = CREW_CATEGORY_RATES[crewCategory].ratePerDay;
    const daysCount = Math.max(1, bookingDays.length);
    const effectivePkgRate = packageMode === 'NONE' ? 0 : packageBaseRate;

    return calculateDynamicBookingPricing({
      cameraCount,
      cameraCategoryRate: camRate,
      crewCount,
      crewCategoryRate: crewRate,
      daysCount,
      packageBaseRate: effectivePkgRate,
      addOnsTotal,
      discount,
    });
  }, [
    cameraCount,
    cameraCategory,
    crewCount,
    crewCategory,
    bookingDays.length,
    packageMode,
    packageBaseRate,
    addOnsTotal,
    discount,
  ]);

  // Step 1 Handlers
  const handleSelectExistingCustomer = (client: Client) => {
    setSelectedClientId(client.id);
    setCity(client.city || 'Burewala');
    if (!title.trim()) {
      setTitle(`${client.name} — ${category} Coverage`);
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
        setTitle(`${created.name} — ${category} Coverage`);
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

  // Step 2 Multi-Day & Timing Mode Handlers
  const handleToggleMultiDay = (multi: boolean) => {
    setIsMultiDay(multi);
    if (!multi && bookingDays.length > 1) {
      setBookingDays([bookingDays[0]]);
    } else if (multi && bookingDays.length === 1) {
      const firstDay = bookingDays[0];
      const secondDate = addDaysToDateStr(firstDay.date, 1);
      setBookingDays([
        { ...firstDay, eventType: 'Mehndi / Day 1' },
        {
          id: `day-${Date.now()}`,
          date: secondDate,
          eventType: 'Barat / Day 2',
          venue: firstDay.venue || venue,
          timingMode: 'NIGHT_TIME',
          startTime: '18:00',
          endTime: '23:00',
          durationHours: 5,
          notes: '',
        },
      ]);
    }
  };

  const handleAddBookingDay = () => {
    const lastDay = bookingDays[bookingDays.length - 1];
    const nextDate = lastDay ? addDaysToDateStr(lastDay.date, 1) : initialDate;
    const dayIdx = bookingDays.length + 1;
    const defaultSubtypes = ['Mehndi', 'Barat', 'Walima', 'Nikah', 'Mayun'];
    setIsMultiDay(true);
    setBookingDays((prev) => [
      ...prev,
      {
        id: `day-${Date.now()}-${dayIdx}`,
        date: nextDate,
        eventType: defaultSubtypes[(dayIdx - 1) % defaultSubtypes.length] || `Day ${dayIdx}`,
        venue: venue || lastDay?.venue || '',
        timingMode: 'NIGHT_TIME',
        startTime: '18:00',
        endTime: '23:00',
        durationHours: 5,
        notes: '',
      },
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
        return updated;
      })
    );
  };

  // Step 3 Camera & Crew Selection Handlers
  const handleToggleCameraSelection = (camId: string) => {
    if (busyEquipmentMap.has(camId)) {
      addToast(
        `Camera is already reserved for "${busyEquipmentMap.get(camId)}" on the selected date(s).`,
        'warning'
      );
      return;
    }
    setSelectedEquipmentIds((prev) => {
      const exists = prev.includes(camId);
      const next = exists ? prev.filter((id) => id !== camId) : [...prev, camId];
      const selectedCamsCount = next.filter((id) =>
        cameraInventory.some((c) => c.id === id)
      ).length;
      setCameraCount(selectedCamsCount);
      return next;
    });
  };

  const handleCameraCountChange = (nextCount: number) => {
    const clamped = Math.max(0, Math.min(20, nextCount));
    setCameraCount(clamped);
    // Sync selected cameras from available inventory up to clamped count
    const nonCameraIds = selectedEquipmentIds.filter(
      (id) => !cameraInventory.some((c) => c.id === id)
    );
    const autoPickedCams = availableCameras.slice(0, clamped).map((c) => c.id);
    setSelectedEquipmentIds([...autoPickedCams, ...nonCameraIds]);
  };

  const handleToggleCrewSelection = (memberId: string) => {
    if (busyCrewMap.has(memberId)) {
      addToast(
        `Team member is already assigned to "${busyCrewMap.get(memberId)}" on the selected date(s).`,
        'warning'
      );
      return;
    }
    setSelectedCrewIds((prev) => {
      const exists = prev.includes(memberId);
      const next = exists ? prev.filter((id) => id !== memberId) : [...prev, memberId];
      setCrewCount(next.length);
      return next;
    });
  };

  const handleCrewCountChange = (nextCount: number) => {
    const clamped = Math.max(0, Math.min(30, nextCount));
    setCrewCount(clamped);
    const autoPickedCrew = availableTeamMembers.slice(0, clamped).map((m) => m.id);
    setSelectedCrewIds(autoPickedCrew);
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

    const resolvedTitle =
      title.trim() ||
      `${selectedCustomer?.name || 'Client'} — ${
        isMultiDay ? `${bookingDays.length}-Day ${category}` : `${category} Coverage`
      }`;

    setIsSubmitting(true);
    try {
      const chosenAddOns = BOOKING_ADDONS.filter((a) => selectedAddOnIds.includes(a.id));
      const addOnText =
        chosenAddOns.length > 0
          ? `Add-Ons: ${chosenAddOns.map((a) => a.name).join(', ')}`
          : '';
      const combinedNotes = [notes.trim(), addOnText].filter(Boolean).join(' | ');

      const customPackagePayload =
        packageMode === 'CUSTOM' && customPackageName.trim() && saveCustomToLibrary
          ? {
              name: customPackageName.trim(),
              category,
              price: packageBaseRate,
              description: `Custom ${isMultiDay ? `${bookingDays.length}-Day` : 'Single-Day'} package (${CAMERA_CATEGORY_RATES[cameraCategory].shortLabel}, ${CREW_CATEGORY_RATES[crewCategory].shortLabel})`,
              requiredPhotographers: Math.max(1, Math.ceil(crewCount / 2)),
              requiredVideographers: Math.max(1, Math.floor(crewCount / 2)),
              includedServices: customPackageDeliverables
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
              deliverables: customPackageDeliverables
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            }
          : undefined;

      await createEvent({
        clientId: selectedClientId,
        title: resolvedTitle,
        category,
        weddingSubtype: category === 'Wedding' ? weddingSubtype : undefined,
        packageId: packageMode === 'BUILTIN' ? selectedPackageId || undefined : undefined,
        customPackageName:
          packageMode === 'CUSTOM' ? customPackageName.trim() || 'Custom Event Package' : undefined,
        packageBasePrice: packageMode === 'NONE' ? 0 : packageBaseRate,
        customPackageToCreate: customPackagePayload,
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
        notes: combinedNotes,
        isMultiDay: isMultiDay || bookingDays.length > 1,
        daySchedulesInput: bookingDays.map((d, idx) => ({
          dayNumber: idx + 1,
          date: d.date,
          eventType: d.eventType || `Day ${idx + 1}`,
          venue: d.venue.trim() || venue.trim() || city.trim() || 'Burewala',
          timingMode: d.timingMode,
          startTime: d.startTime,
          endTime: d.endTime,
          durationHours: d.durationHours,
          notes: d.notes,
        })),
        cameraCategory,
        cameraCount,
        cameraRatePerDay: CAMERA_CATEGORY_RATES[cameraCategory].ratePerDay,
        crewCategory,
        crewCount,
        crewRatePerDay: CREW_CATEGORY_RATES[crewCategory].ratePerDay,
        addOnsTotal,
        autoAllocateResources: true,
        selectedEquipmentIds,
        selectedCrewIds,
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
              title: '2. Dates & DM/Night Timing',
              sub: `${bookingDays.length} Day(s) · ${
                bookingDays[0]?.timingMode === 'DAY_TIME' ? 'Day Time (5h DM)' : 'Night Time'
              }`,
            },
            {
              num: 3 as const,
              title: '3. Gear, Crew & Pricing',
              sub: `${cameraCount} Cam · ${crewCount} Crew · ${formatPKR(
                pricingSummary.totalCost
              )}`,
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
                            setTitle(`${found.name} — ${category} Coverage`);
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

            {/* Event Core Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Royal Wedding Barat & Walima Coverage"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Event Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as EventCategory)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                >
                  <option value="Wedding">Wedding</option>
                  <option value="Nikah">Nikah</option>
                  <option value="Engagement">Engagement</option>
                  <option value="Bridal Shower">Bridal Shower</option>
                  <option value="Corporate">Corporate</option>
                  <option value="Birthday">Birthday</option>
                  <option value="Concert">Concert</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {category === 'Wedding' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Wedding Function
                  </label>
                  <select
                    value={weddingSubtype}
                    onChange={(e) => setWeddingSubtype(e.target.value as WeddingSubtype)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
                  >
                    <option value="Barat">Barat</option>
                    <option value="Walima">Walima</option>
                    <option value="Mehndi">Mehndi</option>
                    <option value="Nikah">Nikah</option>
                    <option value="Engagement">Engagement</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}
              <div className={category === 'Wedding' ? '' : 'sm:col-span-2'}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Venue / Hall Location
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
                    Event Duration &amp; Per-Date Time Slot Configuration
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Configure Single Day or Multi-Day schedules. Selecting{' '}
                    <strong>Day Time (DM)</strong> strictly enforces a 5-hour window per date.
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

              {/* Per-Date Schedule Cards */}
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {bookingDays.map((dayItem, index) => {
                  const isDayTime = dayItem.timingMode === 'DAY_TIME';
                  const presets = isDayTime ? DAY_TIME_PRESETS : NIGHT_TIME_PRESETS;
                  return (
                    <div
                      key={dayItem.id}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[11px] font-mono font-bold">
                            Day {index + 1}
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

                      {/* Date, Sub-Event Name, Start Time, End Time */}
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
                            Function / Label
                          </label>
                          <input
                            type="text"
                            value={dayItem.eventType}
                            onChange={(e) =>
                              handleUpdateBookingDay(dayItem.id, { eventType: e.target.value })
                            }
                            placeholder="e.g. Mehndi / Barat"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
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
                          Quick Slots:
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
                <span>Next: Camera Inventory, Crew &amp; Pricing</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ===================== STEP 3: INVENTORY, CREW CATEGORIES, PACKAGES & DYNAMIC PRICING ===================== */}
        {step === 3 && (
          <form onSubmit={handleConfirmBooking} className="space-y-4">
            {/* 1. CAMERA CATEGORIES & CAMERA INVENTORY AVAILABILITY LINKAGE */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-amber-600" />
                    <span>Camera Categories &amp; Per-Day Inventory Linkage</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Select camera tier rate and assign available cameras from inventory (double-booking prevented across {bookingDays.length} day(s)).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-700">Cameras Count:</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={cameraCount}
                    onChange={(e) => handleCameraCountChange(Number(e.target.value))}
                    className="w-16 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 text-center"
                  />
                </div>
              </div>

              {/* Camera Category Rate Cards (PKR 10k / 15k / 20k per day) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(['CAT_1', 'CAT_2', 'CAT_3'] as CameraCategoryTier[]).map((tierKey) => {
                  const tier = CAMERA_CATEGORY_RATES[tierKey];
                  const active = cameraCategory === tierKey;
                  return (
                    <button
                      key={tierKey}
                      type="button"
                      onClick={() => setCameraCategory(tierKey)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">
                          {tierKey.replace('CAT_', 'Category ')}
                        </span>
                        <span
                          className={`text-xs font-mono font-extrabold ${
                            active ? 'text-amber-400' : 'text-slate-900'
                          }`}
                        >
                          {formatPKR(tier.ratePerDay)}/day
                        </span>
                      </div>
                      <div
                        className={`text-[11px] mt-1 line-clamp-1 ${
                          active ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {tier.description}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Camera Inventory Units Selection */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span className="font-semibold">
                    Studio Camera Inventory ({availableCameras.length} available on selected dates)
                  </span>
                  <span className="font-mono font-semibold text-slate-900">
                    Camera Subtotal: {cameraCount} × {formatPKR(CAMERA_CATEGORY_RATES[cameraCategory].ratePerDay)} × {bookingDays.length}d ={' '}
                    {formatPKR(pricingSummary.cameraDailyCost * bookingDays.length)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {cameraInventory.map((cam) => {
                    const busyEventTitle = busyEquipmentMap.get(cam.id);
                    const isMaintenance =
                      cam.status === 'Maintenance' || cam.status === 'Damaged';
                    const isUnavailable = Boolean(busyEventTitle) || isMaintenance;
                    const isSelected = selectedEquipmentIds.includes(cam.id);

                    return (
                      <button
                        key={cam.id}
                        type="button"
                        disabled={isUnavailable}
                        onClick={() => handleToggleCameraSelection(cam.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border inline-flex items-center gap-1.5 transition-all ${
                          isUnavailable
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            : isSelected
                            ? 'bg-amber-400/25 border-amber-600 text-slate-950 cursor-pointer'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400 cursor-pointer'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-amber-800" />}
                        <span>{cam.name}</span>
                        {busyEventTitle && (
                          <span className="text-[10px] text-rose-600 font-normal">
                            (Booked: {busyEventTitle})
                          </span>
                        )}
                        {isMaintenance && (
                          <span className="text-[10px] text-amber-700 font-normal">
                            ({cam.status})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 2. STAFF & CREW CATEGORIES (PHOTOGRAPHERS / VIDEOGRAPHERS / BOYS) WITH PER-DAY CHARGES */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-600" />
                    <span>Staff &amp; Crew Categories (Photographers / Videographers / Boys)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Select crew tier rate per day and assign available studio staff across {bookingDays.length} day(s).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-700">Crew / Boys Count:</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={crewCount}
                    onChange={(e) => handleCrewCountChange(Number(e.target.value))}
                    className="w-16 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 text-center"
                  />
                </div>
              </div>

              {/* Crew Category Rate Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(['CREW_CAT_1', 'CREW_CAT_2', 'CREW_CAT_3'] as CrewCategoryTier[]).map(
                  (cTierKey) => {
                    const cTier = CREW_CATEGORY_RATES[cTierKey];
                    const active = crewCategory === cTierKey;
                    return (
                      <button
                        key={cTierKey}
                        type="button"
                        onClick={() => setCrewCategory(cTierKey)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{cTier.shortLabel.split('(')[0]}</span>
                          <span
                            className={`text-xs font-mono font-extrabold ${
                              active ? 'text-amber-400' : 'text-slate-900'
                            }`}
                          >
                            {formatPKR(cTier.ratePerDay)}/day
                          </span>
                        </div>
                        <div
                          className={`text-[11px] mt-1 line-clamp-1 ${
                            active ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {cTier.description}
                        </div>
                      </button>
                    );
                  }
                )}
              </div>

              {/* Roster Staff Selection */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span className="font-semibold">
                    Assign Studio Photographers, Videographers &amp; Crew Boys ({availableTeamMembers.length} available)
                  </span>
                  <span className="font-mono font-semibold text-slate-900">
                    Crew Subtotal: {crewCount} × {formatPKR(CREW_CATEGORY_RATES[crewCategory].ratePerDay)} × {bookingDays.length}d ={' '}
                    {formatPKR(pricingSummary.crewDailyCost * bookingDays.length)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {teamMembers
                    .filter((tm) => tm.isActive)
                    .map((tm) => {
                      const busyEvt = busyCrewMap.get(tm.id);
                      const onLeave = tm.availabilityStatus === 'On Leave';
                      const isUnavailable = Boolean(busyEvt) || onLeave;
                      const isSelected = selectedCrewIds.includes(tm.id);

                      return (
                        <button
                          key={tm.id}
                          type="button"
                          disabled={isUnavailable}
                          onClick={() => handleToggleCrewSelection(tm.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border inline-flex items-center gap-1.5 transition-all ${
                            isUnavailable
                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                              : isSelected
                              ? 'bg-slate-900 border-slate-900 text-white cursor-pointer'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400 cursor-pointer'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-amber-400" />}
                          <span>
                            {tm.name} · {tm.role}
                          </span>
                          {busyEvt && (
                            <span className="text-[10px] text-rose-500 font-normal">
                              (Booked)
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* 3. BUILT-IN PACKAGE SELECTION OR CUSTOM PACKAGE CREATION ON THE FLY */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <PackageIcon className="w-4 h-4 text-amber-600" />
                  <span>Built-in Package or On-the-Fly Custom Package Creation</span>
                </div>

                <div className="inline-flex items-center p-0.5 bg-white border border-slate-300 rounded-lg">
                  {(
                    [
                      { id: 'BUILTIN', label: 'Built-in Package' },
                      { id: 'CUSTOM', label: '+ Create Custom Package' },
                      { id: 'NONE', label: 'Resource-Only (No Base Pkg)' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setPackageMode(tab.id);
                        if (tab.id === 'NONE') {
                          setPackageBaseRate(0);
                        } else if (tab.id === 'BUILTIN') {
                          const found =
                            packages.find((p) => p.id === selectedPackageId) || packages[0];
                          if (found) {
                            setSelectedPackageId(found.id);
                            setPackageBaseRate(found.price);
                          }
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                        packageMode === tab.id
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {packageMode === 'BUILTIN' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Select Studio Package
                    </label>
                    <select
                      value={selectedPackageId}
                      onChange={(e) => {
                        const pId = e.target.value;
                        setSelectedPackageId(pId);
                        const found = packages.find((p) => p.id === pId);
                        if (found) {
                          setPackageBaseRate(found.price);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                    >
                      {packages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({formatPKR(p.price)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Package Base Rate (PKR)
                    </label>
                    <input
                      type="number"
                      value={packageBaseRate}
                      onChange={(e) => setPackageBaseRate(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>
              )}

              {packageMode === 'CUSTOM' && (
                <div className="space-y-2.5 bg-white p-3 rounded-lg border border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        New Custom Package Name *
                      </label>
                      <input
                        type="text"
                        value={customPackageName}
                        onChange={(e) => setCustomPackageName(e.target.value)}
                        placeholder="e.g. Royal 8K Multi-Day Bespoke Signature"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Custom Package Base Rate (PKR)
                      </label>
                      <input
                        type="number"
                        value={packageBaseRate}
                        onChange={(e) => setPackageBaseRate(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Custom Deliverables &amp; Services (Comma separated)
                    </label>
                    <input
                      type="text"
                      value={customPackageDeliverables}
                      onChange={(e) => setCustomPackageDeliverables(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
                    />
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveCustomToLibrary}
                      onChange={(e) => setSaveCustomToLibrary(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span>Save this custom package to Studio Packages library for future bookings</span>
                  </label>
                </div>
              )}
            </div>

            {/* 4. DYNAMIC PRICING FORMULA & FINANCIAL SUMMARY */}
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold tracking-wide">
                    Dynamic Multi-Day Resource &amp; Package Pricing Formula
                  </span>
                </div>
                <span className="text-[11px] font-mono text-amber-300">
                  Total = [(Cameras × Rate) + (Crew × Rate)] × Days + Base Package
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-slate-800/90 border border-slate-700">
                  <div className="text-[10px] text-slate-400">
                    Cameras ({cameraCount} × {formatPKR(CAMERA_CATEGORY_RATES[cameraCategory].ratePerDay)} × {bookingDays.length}d)
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {formatPKR(pricingSummary.cameraDailyCost * bookingDays.length)}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-800/90 border border-slate-700">
                  <div className="text-[10px] text-slate-400">
                    Staff/Crew ({crewCount} × {formatPKR(CREW_CATEGORY_RATES[crewCategory].ratePerDay)} × {bookingDays.length}d)
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {formatPKR(pricingSummary.crewDailyCost * bookingDays.length)}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-800/90 border border-slate-700">
                  <div className="text-[10px] text-slate-400">Package Base Rate</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {formatPKR(pricingSummary.packageBaseRate)}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-amber-400 text-slate-950">
                  <div className="text-[10px] font-bold uppercase">Calculated Total Cost</div>
                  <div className="text-base font-extrabold mt-0.5">
                    {formatPKR(pricingSummary.totalCost)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    Advance Deposit Received (PKR)
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
                    Remaining Balance Due
                  </label>
                  <div className="px-3 py-1.5 bg-slate-800/60 border border-slate-700 rounded-lg text-xs font-mono font-bold text-amber-300">
                    {formatPKR(Math.max(0, pricingSummary.totalCost - Number(advancePaid || 0)))}
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
