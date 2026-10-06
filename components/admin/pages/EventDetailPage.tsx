import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Users,
  Camera,
  Video,
  Plane,
  Layers,
  FileText,
  CreditCard,
  Plus,
  Trash2,
  Edit,
  RotateCw,
  Sparkles,
  Download,
  AlertTriangle,
  CheckCircle,
  Copy,
  UserCheck,
  ChevronRight,
  Phone,
  Mail,
  ShieldCheck,
  ArrowLeft,
  Eye,
  MessageCircle,
  ExternalLink,
  Sliders,
  QrCode,
} from 'lucide-react';
import ProposalQrShareModal from '@/components/proposal/ProposalQrShareModal';
import { useStudioData } from '../context/StudioDataContext';
import { useAuth } from '../context/AuthContext';
import { formatPKR, formatDate } from '../utils/calculations';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import {
  generateInvoicePDF,
  generateQuotationPDF,
  generateCallSheetPDF,
  buildWhatsAppCallSheetText,
} from '../utils/pdfGenerator';
import { BrandedDocumentView } from '../components/billing/BrandedDocumentView';
import {
  UNIFIED_TIER_LIST,
  mapCameraTierToCrewTier,
  resolveCategoryTierRate,
  getEquipmentCrewSpecForService,
} from '@/lib/pricing/unifiedPricing';
import {
  Event,
  EventDaySchedule,
  DayServiceSlot,
  CameraCategoryTier,
  TimingMode,
  EventTeamAssignment,
  EventEquipmentAssignment,
  EventExpense,
  EventTask,
  Payment,
  Invoice,
  Quotation,
  TeamRole,
  ExpenseCategory,
  TaskPriority,
  TaskStatus,
  PaymentMethod,
  EventCategory,
  WeddingSubtype,
  EventStatus
} from '../types';

interface EventDetailPageProps {
  eventId: string;
  navigate: (path: string) => void;
  initialEdit?: boolean;
}

export const EventDetailPage: React.FC<EventDetailPageProps> = ({ eventId, navigate, initialEdit = false }) => {
  const {
    events,
    clients,
    daySchedules,
    packages,
    teamMembers,
    teamAssignments,
    equipment,
    equipmentAssignments,
    eventExpenses,
    invoices,
    payments,
    quotations,
    tasks,
    profile,
    updateEvent,
    deleteEvent,
    recalculateEvent,
    autoAssignCrew,
    createDaySchedule,
    updateDaySchedule,
    deleteDaySchedule,
    createTeamAssignment,
    deleteTeamAssignment,
    assignEquipment,
    deleteEquipmentAssignment,
    createExpense,
    deleteExpense,
    createTask,
    updateTask,
    deleteTask,
    createPayment,
    createInvoice,
    createQuotation,
    addToast
  } = useStudioData();

  const { isAdmin } = useAuth();
  const [isProposalQrOpen, setIsProposalQrOpen] = useState(false);
  const [showAdminPriceBreakdown, setShowAdminPriceBreakdown] = useState(false);

  const event = events.find(e => e.id === eventId);
  const client = clients.find(c => c.id === event?.clientId);
  const eventDaySchedules = daySchedules.filter(d => d.eventId === eventId);
  const eventCrew = teamAssignments.filter(t => t.eventId === eventId);
  const eventEquip = equipmentAssignments.filter(eq => eq.eventId === eventId);
  const eventExp = eventExpenses.filter(ex => ex.eventId === eventId);
  const eventTasks = tasks.filter(t => t.eventId === eventId);
  const eventPayments = payments.filter(p => p.eventId === eventId);
  const eventInvoices = invoices.filter(i => i.eventId === eventId);
  const eventQuotations = quotations.filter(q => q.eventId === eventId);
  const selectedPackage = packages.find(p => p.id === event?.packageId);

  // Active Tab for Main Area
  const [activeTab, setActiveTab] = useState<'schedule' | 'crew' | 'equipment' | 'expenses' | 'tasks' | 'billing'>('schedule');

  // Modals state
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [isCrewModalOpen, setIsCrewModalOpen] = useState(false);
  const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(initialEdit);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<'INVOICE' | 'QUOTATION' | 'RECEIPT' | 'EVENT_SUMMARY' | null>(null);

  // Edit Day Schedule state & modal
  const [isEditDayModalOpen, setIsEditDayModalOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<EventDaySchedule | null>(null);
  const [editDayNumber, setEditDayNumber] = useState(1);
  const [editDayDate, setEditDayDate] = useState('');
  const [editDayType, setEditDayType] = useState('Barat');
  const [editDayVenue, setEditDayVenue] = useState('');
  const [editDayTimingMode, setEditDayTimingMode] = useState<TimingMode>('NIGHT_TIME');
  const [editDayStartTime, setEditDayStartTime] = useState('18:00');
  const [editDayEndTime, setEditDayEndTime] = useState('23:30');
  const [editDayCallTime, setEditDayCallTime] = useState('16:30');
  const [editDayDressCode, setEditDayDressCode] = useState('Formal');
  const [editDayNotes, setEditDayNotes] = useState('');
  const [editDayCustomPrice, setEditDayCustomPrice] = useState(100000);
  const [editDayServices, setEditDayServices] = useState<DayServiceSlot[]>([]);
  const [isSavingDay, setIsSavingDay] = useState(false);

  // Day Schedule form (for adding new day)
  const [dayNumber, setDayNumber] = useState(eventDaySchedules.length + 1);
  const [dayDate, setDayDate] = useState(event?.eventDate || new Date().toISOString().split('T')[0]);
  const [dayType, setDayType] = useState('Barat');
  const [dayVenue, setDayVenue] = useState(event?.venue || '');
  const [dayTimingMode, setDayTimingMode] = useState<TimingMode>('NIGHT_TIME');
  const [dayStartTime, setDayStartTime] = useState('18:00');
  const [dayEndTime, setDayEndTime] = useState('23:30');
  const [dayCallTime, setDayCallTime] = useState('16:30');
  const [dayDressCode, setDayDressCode] = useState('Formal');
  const [dayNotes, setDayNotes] = useState('');
  const [dayCustomPrice, setDayCustomPrice] = useState(60000);
  const [dayServices, setDayServices] = useState<DayServiceSlot[]>([
    {
      id: 'new-srv-photo',
      serviceType: 'Photographer',
      cameraCategory: 'CAT_2',
      crewCategory: 'CREW_CAT_2',
      quantity: 2,
      tierPricePerUnit: 15000,
    },
    {
      id: 'new-srv-video',
      serviceType: 'Videographer',
      cameraCategory: 'CAT_2',
      crewCategory: 'CREW_CAT_2',
      quantity: 2,
      tierPricePerUnit: 15000,
    },
  ]);

  // Crew Form
  const [crewMemberId, setCrewMemberId] = useState('');
  const [crewRole, setCrewRole] = useState<TeamRole>('Photographer');
  const [crewHours, setCrewHours] = useState(8);
  const [crewRate, setCrewRate] = useState(12000);

  // Equipment Form
  const [equipId, setEquipId] = useState('');
  const [equipQty, setEquipQty] = useState(1);
  const [equipRate, setEquipRate] = useState(4000);

  // Expense Form
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Fuel');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState(5000);

  // Task Form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDueDate, setTaskDueDate] = useState(event?.eventDate || new Date().toISOString().split('T')[0]);
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('Normal');
  const [taskDesc, setTaskDesc] = useState('');

  // Payment Form
  const [paymentAmount, setPaymentAmount] = useState(event?.remainingBalance || 50000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Full Edit Event Form States
  const [editClientId, setEditClientId] = useState(event?.clientId || '');
  const [editTitle, setEditTitle] = useState(event?.title || '');
  const [editCategory, setEditCategory] = useState<EventCategory>(event?.category || 'Wedding');
  const [editWeddingSubtype, setEditWeddingSubtype] = useState<WeddingSubtype>(event?.weddingSubtype || 'Barat');
  const [editPackageId, setEditPackageId] = useState(event?.packageId || '');
  const [editPrice, setEditPrice] = useState(event?.packagePrice || 0);
  const [editDate, setEditDate] = useState(event?.eventDate || '');
  const [editStartTime, setEditStartTime] = useState(event?.startTime || '18:00');
  const [editEndTime, setEditEndTime] = useState(event?.endTime || '23:30');
  const [editVenue, setEditVenue] = useState(event?.venue || '');
  const [editCity, setEditCity] = useState(event?.city || 'Lahore');
  const [editStatus, setEditStatus] = useState<EventStatus>(event?.status || 'Confirmed');
  const [editDiscount, setEditDiscount] = useState<number>(event?.discount || 0);
  const [editTax, setEditTax] = useState<number>(event?.tax || 0);
  const [editIsMultiDay, setEditIsMultiDay] = useState<boolean>(!!event?.isMultiDay);
  const [editNotes, setEditNotes] = useState(event?.notes || '');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const populateEditForm = () => {
    if (!event) return;
    setEditClientId(event.clientId);
    setEditTitle(event.title);
    setEditCategory(event.category);
    setEditWeddingSubtype(event.weddingSubtype || 'Barat');
    setEditPackageId(event.packageId || '');
    setEditPrice(event.packagePrice);
    setEditDate(event.eventDate);
    setEditStartTime(event.startTime || '18:00');
    setEditEndTime(event.endTime || '23:30');
    setEditVenue(event.venue || '');
    setEditCity(event.city || 'Lahore');
    setEditStatus(event.status);
    setEditDiscount(event.discount || 0);
    setEditTax(event.tax || 0);
    setEditIsMultiDay(!!event.isMultiDay);
    setEditNotes(event.notes || '');
  };

  React.useEffect(() => {
    if (event) {
      populateEditForm();
    }
  }, [event?.id, initialEdit]);

  const buildDefaultServicesFromDay = (day: EventDaySchedule): DayServiceSlot[] => {
    if (Array.isArray(day.services) && day.services.length > 0) {
      return day.services.map((s) => ({ ...s }));
    }
    const camCat: CameraCategoryTier = day.cameraCategory || 'CAT_2';
    const crewCat = mapCameraTierToCrewTier(camCat);
    const rate = resolveCategoryTierRate(camCat, crewCat);
    const pCount = day.photographersCount ?? 1;
    const vCount = day.cinematographersCount ?? 1;
    const hasDrone = Boolean(day.droneIncluded);

    const built: DayServiceSlot[] = [];
    if (pCount > 0) {
      built.push({
        id: `${day.id}-photo`,
        serviceType: 'Photographer',
        cameraCategory: camCat,
        crewCategory: crewCat,
        quantity: pCount,
        tierPricePerUnit: rate,
      });
    }
    if (vCount > 0) {
      built.push({
        id: `${day.id}-video`,
        serviceType: 'Videographer',
        cameraCategory: camCat,
        crewCategory: crewCat,
        quantity: vCount,
        tierPricePerUnit: rate,
      });
    }
    if (hasDrone) {
      built.push({
        id: `${day.id}-drone`,
        serviceType: 'Drone',
        cameraCategory: camCat,
        crewCategory: crewCat,
        quantity: 1,
        tierPricePerUnit: rate,
      });
    }
    if (built.length === 0) {
      built.push({
        id: `${day.id}-default`,
        serviceType: 'Photographer',
        cameraCategory: camCat,
        crewCategory: crewCat,
        quantity: 1,
        tierPricePerUnit: rate,
      });
    }
    return built;
  };

  const computeServiceSlotsSummary = (slots: DayServiceSlot[]) => {
    const subtotal = slots.reduce(
      (sum, s) => sum + Math.max(0, s.quantity) * (s.tierPricePerUnit || 0),
      0
    );
    const photographersCount = slots
      .filter((s) => s.serviceType === 'Photographer')
      .reduce((sum, s) => sum + s.quantity, 0);
    const cinematographersCount = slots
      .filter((s) => s.serviceType === 'Videographer')
      .reduce((sum, s) => sum + s.quantity, 0);
    const dronesCount = slots
      .filter((s) => s.serviceType === 'Drone')
      .reduce((sum, s) => sum + s.quantity, 0);
    const totalUnits = photographersCount + cinematographersCount + dronesCount;
    const primaryCat: CameraCategoryTier = slots[0]?.cameraCategory || 'CAT_2';
    const primaryCrewCat = mapCameraTierToCrewTier(primaryCat);
    const summaryText = slots
      .map(
        (s) =>
          `${s.quantity}x ${s.serviceType} (${s.cameraCategory.replace(
            'CAT_',
            'Cat '
          )} @ PKR ${(s.tierPricePerUnit / 1000).toFixed(0)}k)`
      )
      .join(' + ');

    return {
      subtotal,
      photographersCount,
      cinematographersCount,
      droneIncluded: dronesCount > 0,
      totalUnits,
      primaryCat,
      primaryCrewCat,
      summaryText,
    };
  };

  const openEditDayModal = (day: EventDaySchedule) => {
    setEditingDay(day);
    setEditDayNumber(day.dayNumber);
    setEditDayDate(day.date);
    setEditDayType(day.eventType);
    setEditDayVenue(day.venue);
    setEditDayTimingMode(day.timingMode || 'NIGHT_TIME');
    setEditDayStartTime(day.startTime);
    setEditDayEndTime(day.endTime);
    setEditDayCallTime(day.callTime);
    setEditDayDressCode(day.dressCode || '');
    setEditDayNotes(day.notes || '');
    setEditDayCustomPrice(day.customPrice);
    setEditDayServices(buildDefaultServicesFromDay(day));
    setIsEditDayModalOpen(true);
  };

  const applyServiceSlotsPreset = (
    target: 'ADD' | 'EDIT',
    preset: 'TIER_1_2CAM' | 'TIER_2_2CAM' | 'TIER_3_4CAM' | 'TIER_3_5CAM_DRONE' | 'MIXED_MEHNDI'
  ) => {
    const prefix = `slot-${Date.now()}`;
    let nextSlots: DayServiceSlot[] = [];
    if (preset === 'TIER_1_2CAM') {
      nextSlots = [
        { id: `${prefix}-1`, serviceType: 'Photographer', cameraCategory: 'CAT_1', crewCategory: 'CREW_CAT_1', quantity: 1, tierPricePerUnit: 10000 },
        { id: `${prefix}-2`, serviceType: 'Videographer', cameraCategory: 'CAT_1', crewCategory: 'CREW_CAT_1', quantity: 1, tierPricePerUnit: 10000 },
      ];
    } else if (preset === 'TIER_2_2CAM') {
      nextSlots = [
        { id: `${prefix}-1`, serviceType: 'Photographer', cameraCategory: 'CAT_2', crewCategory: 'CREW_CAT_2', quantity: 1, tierPricePerUnit: 15000 },
        { id: `${prefix}-2`, serviceType: 'Videographer', cameraCategory: 'CAT_2', crewCategory: 'CREW_CAT_2', quantity: 1, tierPricePerUnit: 15000 },
      ];
    } else if (preset === 'TIER_3_4CAM') {
      nextSlots = [
        { id: `${prefix}-1`, serviceType: 'Photographer', cameraCategory: 'CAT_3', crewCategory: 'CREW_CAT_3', quantity: 2, tierPricePerUnit: 20000 },
        { id: `${prefix}-2`, serviceType: 'Videographer', cameraCategory: 'CAT_3', crewCategory: 'CREW_CAT_3', quantity: 2, tierPricePerUnit: 20000 },
      ];
    } else if (preset === 'TIER_3_5CAM_DRONE') {
      nextSlots = [
        { id: `${prefix}-1`, serviceType: 'Photographer', cameraCategory: 'CAT_3', crewCategory: 'CREW_CAT_3', quantity: 2, tierPricePerUnit: 20000 },
        { id: `${prefix}-2`, serviceType: 'Videographer', cameraCategory: 'CAT_3', crewCategory: 'CREW_CAT_3', quantity: 2, tierPricePerUnit: 20000 },
        { id: `${prefix}-3`, serviceType: 'Drone', cameraCategory: 'CAT_3', crewCategory: 'CREW_CAT_3', quantity: 1, tierPricePerUnit: 20000 },
      ];
    } else {
      nextSlots = [
        { id: `${prefix}-1`, serviceType: 'Photographer', cameraCategory: 'CAT_3', crewCategory: 'CREW_CAT_3', quantity: 1, tierPricePerUnit: 20000 },
        { id: `${prefix}-2`, serviceType: 'Videographer', cameraCategory: 'CAT_3', crewCategory: 'CREW_CAT_3', quantity: 1, tierPricePerUnit: 20000 },
        { id: `${prefix}-3`, serviceType: 'Videographer', cameraCategory: 'CAT_1', crewCategory: 'CREW_CAT_1', quantity: 1, tierPricePerUnit: 10000 },
      ];
    }

    const calc = computeServiceSlotsSummary(nextSlots);
    if (target === 'EDIT') {
      setEditDayServices(nextSlots);
      setEditDayCustomPrice(calc.subtotal);
      setEditDayNotes(calc.summaryText);
    } else {
      setDayServices(nextSlots);
      setDayCustomPrice(calc.subtotal);
      setDayNotes(calc.summaryText);
    }
  };

  const handleUpdateDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDay) return;
    setIsSavingDay(true);
    try {
      const calc = computeServiceSlotsSummary(editDayServices);
      await updateDaySchedule(editingDay.id, {
        dayNumber: Number(editDayNumber),
        date: editDayDate,
        eventType: editDayType,
        venue: editDayVenue,
        timingMode: editDayTimingMode,
        startTime: editDayStartTime,
        endTime: editDayEndTime,
        callTime: editDayCallTime,
        dressCode: editDayDressCode,
        notes: editDayNotes || calc.summaryText,
        customPrice: Number(editDayCustomPrice),
        cameraCategory: calc.primaryCat,
        crewCategory: calc.primaryCrewCat,
        cameraCount: calc.totalUnits,
        crewCount: calc.totalUnits,
        photographersCount: calc.photographersCount,
        cinematographersCount: calc.cinematographersCount,
        droneIncluded: calc.droneIncluded,
        services: editDayServices,
      });
      setIsEditDayModalOpen(false);
      addToast('Day schedule & service slots updated. Event & Invoice recalculated.');
    } catch (err: any) {
      addToast(err.message || 'Failed to update day schedule', 'error');
    } finally {
      setIsSavingDay(false);
    }
  };

  // Real-time Crew & Equipment Double-Booking Conflict Detector (Date + Shift DAY_TIME vs NIGHT_TIME)
  const detectedConflicts = useMemo(() => {
    if (!event) return { crewConflicts: [], gearConflicts: [] };
    const otherActiveEvents = events.filter(
      (e) => e.id !== event.id && e.status !== 'Cancelled'
    );
    const otherActiveEventMap = new Map(otherActiveEvents.map((e) => [e.id, e]));

    // Determine shift for a given event + date
    const getShiftForEventDate = (evtId: string, dateStr: string): TimingMode => {
      const matchingDay = daySchedules.find(
        (ds) => ds.eventId === evtId && ds.date === dateStr
      );
      if (matchingDay?.timingMode) return matchingDay.timingMode;
      const evtObj = events.find((e) => e.id === evtId);
      return evtObj?.timingMode || 'NIGHT_TIME';
    };

    const crewConflicts: Array<{
      assignmentId: string;
      memberName: string;
      role: string;
      date: string;
      shift: TimingMode;
      conflictingEventId: string;
      conflictingEventTitle: string;
    }> = [];

    eventCrew.forEach((myAssignment) => {
      if (myAssignment.assignmentStatus === 'Cancelled') return;
      const myShift = getShiftForEventDate(event.id, myAssignment.date);

      teamAssignments.forEach((otherAssignment) => {
        if (
          otherAssignment.id === myAssignment.id ||
          otherAssignment.eventId === event.id ||
          otherAssignment.assignmentStatus === 'Cancelled'
        ) {
          return;
        }
        const otherEvt = otherActiveEventMap.get(otherAssignment.eventId);
        if (!otherEvt) return;

        if (
          otherAssignment.teamMemberId === myAssignment.teamMemberId &&
          otherAssignment.date === myAssignment.date
        ) {
          const otherShift = getShiftForEventDate(
            otherAssignment.eventId,
            otherAssignment.date
          );
          if (myShift === otherShift) {
            const mem = teamMembers.find((m) => m.id === myAssignment.teamMemberId);
            crewConflicts.push({
              assignmentId: myAssignment.id,
              memberName: mem?.name || 'Crew Member',
              role: myAssignment.role,
              date: myAssignment.date,
              shift: myShift,
              conflictingEventId: otherEvt.id,
              conflictingEventTitle: otherEvt.title,
            });
          }
        }
      });
    });

    // Equipment Double-Booking on overlapping dates & shifts
    const myDatesWithShift =
      eventDaySchedules.length > 0
        ? eventDaySchedules.map((d) => ({
            date: d.date,
            shift: d.timingMode || ('NIGHT_TIME' as TimingMode),
          }))
        : [
            {
              date: event.eventDate,
              shift: event.timingMode || ('NIGHT_TIME' as TimingMode),
            },
          ];

    const gearConflicts: Array<{
      assignmentId: string;
      equipmentName: string;
      date: string;
      shift: TimingMode;
      assignedTotal: number;
      availableStock: number;
      conflictingEventTitle: string;
    }> = [];

    eventEquip.forEach((myEq) => {
      if (myEq.isCheckedIn) return;
      const eqItem = equipment.find((eq) => eq.id === myEq.equipmentId);
      if (!eqItem) return;

      myDatesWithShift.forEach(({ date, shift }) => {
        const overlappingOtherAssignments = equipmentAssignments.filter((otherEq) => {
          if (otherEq.eventId === event.id || otherEq.isCheckedIn) return false;
          if (otherEq.equipmentId !== myEq.equipmentId) return false;
          const otherEvt = otherActiveEventMap.get(otherEq.eventId);
          if (!otherEvt) return false;
          const otherDays = daySchedules.filter((ds) => ds.eventId === otherEvt.id);
          const hasMatchingDateAndShift =
            otherDays.length > 0
              ? otherDays.some(
                  (od) =>
                    od.date === date && (od.timingMode || 'NIGHT_TIME') === shift
                )
              : otherEvt.eventDate === date &&
                (otherEvt.timingMode || 'NIGHT_TIME') === shift;
          return hasMatchingDateAndShift;
        });

        if (overlappingOtherAssignments.length > 0) {
          const otherQty = overlappingOtherAssignments.reduce(
            (s, a) => s + a.quantity,
            0
          );
          if (myEq.quantity + otherQty > eqItem.quantity) {
            const firstOtherEvt = otherActiveEventMap.get(
              overlappingOtherAssignments[0].eventId
            );
            gearConflicts.push({
              assignmentId: myEq.id,
              equipmentName: eqItem.name,
              date,
              shift,
              assignedTotal: myEq.quantity + otherQty,
              availableStock: eqItem.quantity,
              conflictingEventTitle: firstOtherEvt?.title || 'Another Event',
            });
          }
        }
      });
    });

    return { crewConflicts, gearConflicts };
  }, [
    event,
    events,
    daySchedules,
    eventDaySchedules,
    eventCrew,
    teamAssignments,
    teamMembers,
    eventEquip,
    equipmentAssignments,
    equipment,
  ]);

  // 3-Stage Payment Milestone Schedule (30% Advance on Booking, 60% on Event End Day, 10% on Album Delivery)
  const paymentMilestones = useMemo(() => {
    if (!event) return [];
    const totalContract = Math.max(0, Number(event.packagePrice || 0));
    const paidSoFar = Math.max(0, Number(event.totalClientPayments || 0));

    const m1Amount = Math.round(totalContract * 0.3);
    const m2Amount = Math.round(totalContract * 0.6);
    const m3Amount = Math.max(0, totalContract - m1Amount - m2Amount);

    const bookingDateStr =
      event.createdDate?.split('T')[0] || event.eventDate;
    const endDayDateStr =
      eventDaySchedules.length > 0
        ? eventDaySchedules[eventDaySchedules.length - 1].date
        : event.eventDate;

    let deliveryDateStr = endDayDateStr;
    const parsedEnd = new Date(`${endDayDateStr}T12:00:00`);
    if (!isNaN(parsedEnd.getTime())) {
      parsedEnd.setDate(parsedEnd.getDate() + 30);
      deliveryDateStr = parsedEnd.toISOString().split('T')[0];
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const buildMilestone = (
      id: string,
      title: string,
      percentLabel: string,
      amount: number,
      cumulativeThresholdBefore: number,
      dueDate: string,
      stageNote: string
    ) => {
      const covered = Math.max(
        0,
        Math.min(amount, paidSoFar - cumulativeThresholdBefore)
      );
      const remaining = Math.max(0, amount - covered);
      const isPaid = remaining <= 0 && amount > 0;
      const isPartial = covered > 0 && remaining > 0;
      const isOverdue = !isPaid && dueDate < todayStr;

      const rawWa = (client?.whatsapp || client?.phone || '').replace(
        /[^0-9]/g,
        ''
      );
      const cleanClientWa = rawWa
        ? rawWa.startsWith('92')
          ? rawWa
          : `92${rawWa.replace(/^0/, '')}`
        : '';

      const bankInfo = profile?.bankName
        ? `\n*Bank Details:* ${profile.bankName} — ${profile.accountTitle} (A/C: ${profile.accountNumber})`
        : '';

      const reminderMessage = [
        `Assalam-o-Alaikum *${client?.name || 'Valued Client'}*,`,
        `Warm regards from *${profile?.studioName || 'Royal Studio'}*!`,
        ``,
        `This is a polite payment milestone reminder for your booking *${event.title}*:`,
        `• *Milestone:* ${title} (${percentLabel})`,
        `• *Milestone Due Date:* ${formatDate(dueDate)}`,
        `• *Amount Due for this Milestone:* ${formatPKR(remaining)}`,
        `• *Total Contract Paid So Far:* ${formatPKR(paidSoFar)} / ${formatPKR(totalContract)}`,
        bankInfo,
        ``,
        `You can also view your live proposal & payment schedule here: ${
          typeof window !== 'undefined' ? window.location.origin : ''
        }/proposal/${event.id}`,
      ]
        .filter(Boolean)
        .join('\n');

      const whatsappReminderUrl = cleanClientWa
        ? `https://wa.me/${cleanClientWa}?text=${encodeURIComponent(
            reminderMessage
          )}`
        : `https://wa.me/?text=${encodeURIComponent(reminderMessage)}`;

      return {
        id,
        title,
        percentLabel,
        amount,
        covered,
        remaining,
        dueDate,
        stageNote,
        status: isPaid
          ? ('Paid' as const)
          : isOverdue
          ? ('Overdue' as const)
          : isPartial
          ? ('Partial' as const)
          : ('Pending' as const),
        whatsappReminderUrl,
      };
    };

    return [
      buildMilestone(
        'm1',
        'Advance on Booking',
        '30%',
        m1Amount,
        0,
        bookingDateStr,
        'Locks celebration dates & senior crew dispatch'
      ),
      buildMilestone(
        'm2',
        'Event End Day Settlement',
        '60%',
        m2Amount,
        m1Amount,
        endDayDateStr,
        'Due on final shoot day completion'
      ),
      buildMilestone(
        'm3',
        'Final Album & Film Delivery',
        '10%',
        m3Amount,
        m1Amount + m2Amount,
        deliveryDateStr,
        'Due upon handover of luxury album & master films'
      ),
    ];
  }, [event, eventDaySchedules, client, profile]);

  if (!event) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
        <h3 className="text-base font-bold text-gray-900">Event Not Found</h3>
        <p className="text-xs text-gray-500 mt-1">This event might have been deleted.</p>
        <button
          onClick={() => navigate('/events')}
          className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
        >
          Back to Events
        </button>
      </div>
    );
  }

  // Handlers
  const handleRecalculate = async () => {
    await recalculateEvent(event.id);
  };

  const handleAutoAssign = async () => {
    await autoAssignCrew(event.id);
  };

  const handleAddDay = async (e: React.FormEvent) => {
    e.preventDefault();
    const calc = computeServiceSlotsSummary(dayServices);
    await createDaySchedule({
      eventId: event.id,
      dayNumber: Number(dayNumber),
      date: dayDate,
      eventType: dayType,
      venue: dayVenue,
      timingMode: dayTimingMode,
      startTime: dayStartTime,
      endTime: dayEndTime,
      callTime: dayCallTime,
      dressCode: dayDressCode,
      notes: dayNotes || calc.summaryText,
      customPrice: Number(dayCustomPrice),
      cameraCategory: calc.primaryCat,
      crewCategory: calc.primaryCrewCat,
      cameraCount: calc.totalUnits,
      crewCount: calc.totalUnits,
      photographersCount: calc.photographersCount,
      cinematographersCount: calc.cinematographersCount,
      droneIncluded: calc.droneIncluded,
      services: dayServices,
    });
    setIsDayModalOpen(false);
  };

  const handleAddCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crewMemberId) {
      addToast('Please select a team member', 'error');
      return;
    }
    await createTeamAssignment({
      eventId: event.id,
      teamMemberId: crewMemberId,
      role: crewRole,
      date: event.eventDate,
      hours: Number(crewHours),
      rate: Number(crewRate),
      cost: Number(crewRate),
      assignmentStatus: 'Confirmed'
    });
    setIsCrewModalOpen(false);
  };

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipId) {
      addToast('Please select equipment', 'error');
      return;
    }
    await assignEquipment({
      eventId: event.id,
      equipmentId: equipId,
      quantity: Number(equipQty),
      rentalRate: Number(equipRate),
      rentalCost: Number(equipQty) * Number(equipRate)
    });
    setIsEquipModalOpen(false);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    await createExpense({
      eventId: event.id,
      category: expCategory,
      description: expDesc,
      amount: Number(expAmount),
      date: event.eventDate
    });
    setIsExpenseModalOpen(false);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle) return;
    await createTask({
      eventId: event.id,
      title: taskTitle,
      assigneeId: taskAssignee || undefined,
      dueDate: taskDueDate,
      priority: taskPriority,
      description: taskDesc
    });
    setIsTaskModalOpen(false);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPayment({
      eventId: event.id,
      amount: Number(paymentAmount),
      method: paymentMethod,
      reference: paymentRef,
      notes: paymentNotes
    });
    setIsPaymentModalOpen(false);
  };

  const handleCreateInvoice = async () => {
    await createInvoice({
      clientId: event.clientId,
      eventId: event.id,
      dueDate: event.eventDate,
      subtotal: event.packagePrice,
      discount: event.discount,
      tax: event.tax,
      paymentTerms: profile?.paymentTerms,
      notes: `Invoice for ${event.title}`
    });
  };

  const handleGenerateInvoicePDF = () => {
    const inv = eventInvoices[0] || {
      id: 'inv-temp',
      invoiceNumber: `RS-INV-${Date.now().toString().slice(-4)}`,
      clientId: event.clientId,
      eventId: event.id,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: event.eventDate,
      subtotal: event.packagePrice,
      discount: event.discount,
      tax: event.tax,
      total: event.packagePrice - event.discount + event.tax,
      paidAmount: event.totalClientPayments,
      remainingAmount: event.remainingBalance,
      paymentTerms: profile?.paymentTerms || '',
      notes: '',
      status: event.remainingBalance === 0 ? 'Paid' : 'Partially Paid',
      createdBy: 'Royal Studio'
    };

    if (client && profile) {
      generateInvoicePDF(inv, event, client, profile, eventDaySchedules, eventPayments);
      addToast('Invoice PDF downloaded successfully.');
    }
  };

  const handleGenerateQuotationPDF = () => {
    const quo = eventQuotations[0] || {
      id: 'quo-temp',
      quotationNumber: `RS-QUO-${Date.now().toString().slice(-4)}`,
      clientId: event.clientId,
      eventId: event.id,
      issueDate: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: event.packagePrice,
      discount: event.discount,
      tax: event.tax,
      total: event.packagePrice - event.discount + event.tax,
      paymentTerms: profile?.paymentTerms || '',
      notes: '',
      createdBy: 'Royal Studio'
    };

    if (client && profile) {
      generateQuotationPDF(quo, event, client, profile, eventDaySchedules);
      addToast('Quotation PDF downloaded successfully.');
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClientId || !editTitle || !editDate) {
      addToast('Client, Title, and Date are required.', 'error');
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateEvent(event.id, {
        clientId: editClientId,
        title: editTitle,
        category: editCategory,
        weddingSubtype: editCategory === 'Wedding' ? editWeddingSubtype : undefined,
        packageId: editPackageId || undefined,
        packagePrice: Number(editPrice),
        eventDate: editDate,
        startTime: editStartTime,
        endTime: editEndTime,
        venue: editVenue,
        city: editCity,
        status: editStatus,
        discount: Number(editDiscount || 0),
        tax: Number(editTax || 0),
        isMultiDay: editIsMultiDay,
        notes: editNotes
      });
      setIsEditEventModalOpen(false);
      addToast('Event parameters updated successfully.');
    } catch (err: any) {
      addToast(err.message || 'Failed to update event', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteConfirm = async () => {
    await deleteEvent(event.id);
    navigate('/events');
  };

  const renderServiceSlotEditor = (target: 'ADD' | 'EDIT') => {
    const slots = target === 'EDIT' ? editDayServices : dayServices;
    const setSlots = target === 'EDIT' ? setEditDayServices : setDayServices;
    const setPrice = target === 'EDIT' ? setEditDayCustomPrice : setDayCustomPrice;
    const setNotes = target === 'EDIT' ? setEditDayNotes : setDayNotes;
    const summary = computeServiceSlotsSummary(slots);

    const syncSlotsAndPrice = (next: DayServiceSlot[]) => {
      setSlots(next);
      const nextCalc = computeServiceSlotsSummary(next);
      setPrice(nextCalc.subtotal);
      setNotes(nextCalc.summaryText);
    };

    const addSlot = () => {
      const next: DayServiceSlot[] = [
        ...slots,
        {
          id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          serviceType: 'Photographer',
          cameraCategory: 'CAT_2',
          crewCategory: 'CREW_CAT_2',
          quantity: 1,
          tierPricePerUnit: 15000,
        },
      ];
      syncSlotsAndPrice(next);
    };

    const updateSlot = (slotId: string, patch: Partial<DayServiceSlot>) => {
      const next = slots.map((s) => {
        if (s.id !== slotId) return s;
        const updated = { ...s, ...patch };
        if (patch.cameraCategory) {
          updated.crewCategory = mapCameraTierToCrewTier(patch.cameraCategory);
          updated.tierPricePerUnit = resolveCategoryTierRate(
            patch.cameraCategory,
            updated.crewCategory
          );
        }
        return updated;
      });
      syncSlotsAndPrice(next);
    };

    const removeSlot = (slotId: string) => {
      if (slots.length <= 1) return;
      const next = slots.filter((s) => s.id !== slotId);
      syncSlotsAndPrice(next);
    };

    return (
      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
              Per-Day Service & Tier Slot Builder
            </div>
            <p className="text-[11px] text-slate-500">
              Configure Photographers, Videographers, and Drone slots — automatically recalculates Day Price & Event Invoice
            </p>
          </div>
          <button
            type="button"
            onClick={addSlot}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold cursor-pointer"
          >
            <Plus className="w-3 h-3 text-amber-400" /> Add Service Slot
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
            Presets:
          </span>
          <button
            type="button"
            onClick={() => applyServiceSlotsPreset(target, 'TIER_1_2CAM')}
            className="px-2 py-0.5 rounded bg-white border border-slate-200 hover:border-amber-400 text-[10px] font-semibold text-slate-700 cursor-pointer"
          >
            2 Cam Tier 1 (PKR 20k)
          </button>
          <button
            type="button"
            onClick={() => applyServiceSlotsPreset(target, 'TIER_2_2CAM')}
            className="px-2 py-0.5 rounded bg-white border border-slate-200 hover:border-amber-400 text-[10px] font-semibold text-slate-700 cursor-pointer"
          >
            2 Cam Tier 2 (PKR 30k)
          </button>
          <button
            type="button"
            onClick={() => applyServiceSlotsPreset(target, 'TIER_3_4CAM')}
            className="px-2 py-0.5 rounded bg-white border border-slate-200 hover:border-amber-400 text-[10px] font-semibold text-slate-700 cursor-pointer"
          >
            4 Cam Tier 3 (PKR 80k)
          </button>
          <button
            type="button"
            onClick={() => applyServiceSlotsPreset(target, 'TIER_3_5CAM_DRONE')}
            className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 hover:border-amber-400 text-[10px] font-bold text-amber-900 cursor-pointer"
          >
            4 Cam + Drone Tier 3 (PKR 100k)
          </button>
          <button
            type="button"
            onClick={() => applyServiceSlotsPreset(target, 'MIXED_MEHNDI')}
            className="px-2 py-0.5 rounded bg-white border border-slate-200 hover:border-amber-400 text-[10px] font-semibold text-slate-700 cursor-pointer"
          >
            Mixed Mehndi (PKR 50k)
          </button>
        </div>

        {/* Service Slots Rows */}
        <div className="space-y-2">
          {slots.map((slot) => {
            const spec = getEquipmentCrewSpecForService(slot.serviceType, slot.cameraCategory);
            const lineSubtotal = slot.quantity * slot.tierPricePerUnit;
            return (
              <div
                key={slot.id}
                className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                  <select
                    value={slot.serviceType}
                    onChange={(e) =>
                      updateSlot(slot.id, {
                        serviceType: e.target.value as 'Photographer' | 'Videographer' | 'Drone',
                      })
                    }
                    className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-900"
                  >
                    <option value="Photographer">📸 Photographer</option>
                    <option value="Videographer">🎥 Videographer</option>
                    <option value="Drone">🚁 Drone Pilot & Aerial</option>
                  </select>

                  <select
                    value={slot.cameraCategory}
                    onChange={(e) =>
                      updateSlot(slot.id, {
                        cameraCategory: e.target.value as CameraCategoryTier,
                      })
                    }
                    className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-900"
                  >
                    {UNIFIED_TIER_LIST.map((t) => (
                      <option key={t.cameraCategory} value={t.cameraCategory}>
                        {t.shortLabel} — PKR {t.ratePerCamPerDay.toLocaleString()}/unit
                      </option>
                    ))}
                  </select>

                  <div className="sm:col-span-2 text-[10px] text-slate-500 flex flex-wrap items-center gap-2">
                    <span>
                      <strong>Gear:</strong> {spec.equipmentSpec}
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Crew:</strong> {spec.crewSpec}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2">
                  <div className="inline-flex items-center border border-gray-300 rounded-lg bg-gray-50">
                    <button
                      type="button"
                      onClick={() =>
                        updateSlot(slot.id, { quantity: Math.max(1, slot.quantity - 1) })
                      }
                      className="px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-200 rounded-l-lg cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-2.5 py-1 text-xs font-mono font-bold text-gray-900">
                      {slot.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateSlot(slot.id, { quantity: Math.min(10, slot.quantity + 1) })
                      }
                      className="px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-200 rounded-r-lg cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right min-w-[82px]">
                    <div className="text-xs font-mono font-bold text-amber-700">
                      {formatPKR(lineSubtotal)}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {slot.quantity} × {(slot.tierPricePerUnit / 1000).toFixed(0)}k
                    </div>
                  </div>

                  {slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSlot(slot.id)}
                      className="p-1 text-gray-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                      title="Remove Slot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Footer */}
        <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-slate-600 flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-800">
              {summary.photographersCount} Photo • {summary.cinematographersCount} Video
              {summary.droneIncluded ? ' • Drone Included' : ''}
            </span>
          </div>
          <div className="font-mono font-bold text-slate-900">
            Calculated Day Total: <span className="text-amber-700">{formatPKR(summary.subtotal)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <button
            onClick={() => navigate('/events')}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">{event.title}</h2>
              <StatusBadge status={event.status} />
              <select
                value={event.status}
                onChange={async (e) => {
                  const newStatus = e.target.value as EventStatus;
                  try {
                    await updateEvent(event.id, { status: newStatus });
                    addToast(`Event status updated to "${newStatus}"`);
                  } catch (err: any) {
                    addToast(err.message || 'Failed to update status', 'error');
                  }
                }}
                className="text-xs font-semibold px-2 py-1 rounded-lg border border-gray-300 bg-white text-gray-800 hover:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs cursor-pointer"
                title="Quick Change Event Status"
              >
                <option value="Inquiry">Inquiry</option>
                <option value="Quotation Sent">Quotation Sent</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Shoot Scheduled">Shoot Scheduled</option>
                <option value="Shoot Done">Shoot Done</option>
                <option value="Editing">Editing</option>
                <option value="Delivered">Delivered</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2 mt-0.5">
              <span>{formatDate(event.eventDate)}</span>
              <span>•</span>
              <span>{event.venue}</span>
              <span>•</span>
              <span className="font-semibold text-amber-700">{client?.name}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsProposalQrOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-900 font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer"
            title="Send Digital Proposal to Customer via Shareable Link & Scannable QR Code"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-400" />
            <span>Proposal Link &amp; QR</span>
          </button>

          <button
            onClick={() => {
              const url = `${window.location.origin}/proposal/${event.id}`;
              navigator.clipboard.writeText(url);
              addToast('Interactive Client Proposal link copied to clipboard!');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer"
            title="Copy Shareable Interactive Client Proposal & Online Approval Link"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-700" />
            <span>Copy Proposal Link</span>
          </button>

          <a
            href={`/proposal/${event.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
            title="Open Interactive Client Proposal Page (/proposal/[id])"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Client Proposal</span>
          </a>

          <button
            onClick={() => {
              populateEditForm();
              setIsEditEventModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
            title="Edit Event Parameters"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Event</span>
          </button>

          <button
            onClick={handleRecalculate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-xs"
            title="Recalculate all financials from crew, gear, and expense line items"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Recalculate</span>
          </button>

          <button
            onClick={() => setPreviewDoc('EVENT_SUMMARY')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 hover:bg-slate-200 transition-colors shadow-2xs cursor-pointer"
            title="Preview Official Branded Event Dossier on image.png stationery"
          >
            <Eye className="w-3.5 h-3.5 text-slate-700" />
            <span>Event Doc</span>
          </button>

          <button
            onClick={() => setPreviewDoc('QUOTATION')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-900 hover:bg-blue-100 transition-colors shadow-2xs cursor-pointer"
            title="Preview Branded Quotation Template"
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>Quotation</span>
          </button>

          <button
            onClick={handleGenerateQuotationPDF}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-xs cursor-pointer"
            title="Download Quotation PDF"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>PDF</span>
          </button>

          <button
            onClick={() => setPreviewDoc('INVOICE')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-lg text-xs font-bold text-amber-950 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
            title="Preview Official Branded Invoice Template"
          >
            <Eye className="w-3.5 h-3.5 text-amber-700" />
            <span>Invoice</span>
          </button>

          <button
            onClick={handleGenerateInvoicePDF}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
            title="Download Invoice PDF"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>PDF</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete Event"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Real-Time Crew & Equipment Double-Booking Conflict Alert Banner */}
      {(detectedConflicts.crewConflicts.length > 0 ||
        detectedConflicts.gearConflicts.length > 0) && (
        <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="p-2 rounded-lg bg-rose-600 text-white shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-rose-950">
                  Real-Time Crew & Camera Double-Booking Alert ({detectedConflicts.crewConflicts.length + detectedConflicts.gearConflicts.length} Conflict{detectedConflicts.crewConflicts.length + detectedConflicts.gearConflicts.length > 1 ? 's' : ''} Detected)
                </h3>
                <p className="text-xs text-rose-700">
                  Assigned production crew or camera bodies overlap with another active event on the same date and shift (DAY_TIME vs. NIGHT_TIME).
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab(detectedConflicts.crewConflicts.length > 0 ? 'crew' : 'equipment')}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              Resolve in {detectedConflicts.crewConflicts.length > 0 ? 'Crew Tab' : 'Gear Tab'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {detectedConflicts.crewConflicts.map((c, idx) => (
              <div
                key={`${c.assignmentId}-${idx}`}
                className="p-3 bg-white rounded-lg border border-rose-200 flex items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="font-bold text-gray-900 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-rose-600" />
                    <span>{c.memberName}</span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                      {c.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-600 mt-0.5">
                    Double-booked on <strong>{formatDate(c.date)}</strong> (
                    <span className="font-mono font-bold text-rose-700">
                      {c.shift === 'DAY_TIME' ? 'DAY_TIME Shift' : 'NIGHT_TIME Shift'}
                    </span>
                    ) with{' '}
                    <button
                      onClick={() => navigate(`/events/${c.conflictingEventId}`)}
                      className="font-bold text-rose-700 underline hover:text-rose-900 cursor-pointer"
                    >
                      {c.conflictingEventTitle}
                    </button>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => deleteTeamAssignment(c.assignmentId)}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer"
                  >
                    Unassign
                  </button>
                )}
              </div>
            ))}

            {detectedConflicts.gearConflicts.map((g, idx) => (
              <div
                key={`${g.assignmentId}-${idx}`}
                className="p-3 bg-white rounded-lg border border-rose-200 flex items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="font-bold text-gray-900 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-rose-600" />
                    <span>{g.equipmentName}</span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                      {g.assignedTotal} Booked / {g.availableStock} In Stock
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-600 mt-0.5">
                    Over-allocated on <strong>{formatDate(g.date)}</strong> (
                    <span className="font-mono font-bold text-rose-700">
                      {g.shift === 'DAY_TIME' ? 'DAY_TIME Shift' : 'NIGHT_TIME Shift'}
                    </span>
                    ) with <strong>{g.conflictingEventTitle}</strong>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => deleteEquipmentAssignment(g.assignmentId)}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer"
                  >
                    Release
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Client Online Proposal Approval Banner (if digitally approved) */}
      {event.approvedByClient && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-900">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Client Digitally Approved Proposal:</strong> Signed online by{' '}
              <span className="underline font-bold">{event.approvedByClient}</span>
              {event.approvedAt ? ` on ${formatDate(event.approvedAt.split('T')[0])}` : ''}
            </span>
          </div>
          <a
            href={`/proposal/${event.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
          >
            <span>View Signed Proposal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Main Grid: Left Area (Tabs & Panels) + Right Area (Sticky Financial Summary) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Area (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client & Event Info Card */}
          <div className="p-5 bg-white rounded-xl border border-gray-100 shadow-xs flex flex-col md:flex-row justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase text-gray-400">Client Information</div>
              <div className="text-base font-bold text-gray-900">{client?.name}</div>
              <div className="text-xs text-gray-600 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" /> {client?.phone}
                </span>
                {client?.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-gray-400" /> {client?.email}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">{client?.address}, {client?.city}</div>
            </div>

            <div className="space-y-1 md:text-right border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-6">
              <div className="text-xs font-bold uppercase text-gray-400">Package Scope</div>
              <div className="text-sm font-bold text-gray-900">{selectedPackage?.name || 'Custom Coverage'}</div>
              <div className="text-xs text-gray-500">
                Duration: {selectedPackage?.duration || '1 Day'} • Category: {event.category}
              </div>
              <button
                onClick={() => {
                  populateEditForm();
                  setIsEditEventModalOpen(true);
                }}
                className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 md:justify-end mt-1 cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" /> Edit Event Parameters
              </button>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-gray-200 gap-2 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`pb-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'schedule'
                  ? 'border-amber-500 text-amber-600 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              Multi-Day Schedules ({eventDaySchedules.length})
            </button>
            <button
              onClick={() => setActiveTab('crew')}
              className={`pb-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'crew'
                  ? 'border-amber-500 text-amber-600 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              Assigned Crew ({eventCrew.length})
            </button>
            <button
              onClick={() => setActiveTab('equipment')}
              className={`pb-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'equipment'
                  ? 'border-amber-500 text-amber-600 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              Gear & Equipment ({eventEquip.length})
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`pb-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'expenses'
                  ? 'border-amber-500 text-amber-600 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              Field Expenses ({eventExp.length})
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`pb-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'tasks'
                  ? 'border-amber-500 text-amber-600 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              Post-Production Tasks ({eventTasks.length})
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`pb-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'billing'
                  ? 'border-amber-500 text-amber-600 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              Invoices & Payments ({eventPayments.length})
            </button>
          </div>

          {/* TAB 1: SCHEDULE PANEL */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Event Day Schedules</h3>
                  <p className="text-xs text-gray-500">
                    If individual day prices are set, Event Package Price automatically equals the SUM of all day prices.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {eventDaySchedules.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAdminPriceBreakdown((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-amber-700" />
                      <span>
                        {showAdminPriceBreakdown
                          ? 'Hide Detailed Event Price Breakdown'
                          : 'View Detailed Event Price Breakdown'}
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsDayModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Day Schedule</span>
                  </button>
                </div>
              </div>

              {showAdminPriceBreakdown && eventDaySchedules.length > 0 && (
                <div className="rounded-xl border border-amber-300 bg-white p-4 space-y-3 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 block">
                        Admin Real-Time Equipment &amp; Crew Pricing Engine
                      </span>
                      <h4 className="text-sm font-extrabold text-gray-900">
                        Detailed Event Price Breakdown ({eventDaySchedules.length} Day{eventDaySchedules.length === 1 ? '' : 's'})
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                        Final Grand Total
                      </span>
                      <span className="font-mono text-base font-black text-amber-700">
                        {formatPKR(event.packagePrice)}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold uppercase text-gray-500">
                          <th className="py-2 px-3">Event Day</th>
                          <th className="py-2 px-3">Service (Equipment &amp; Crew)</th>
                          <th className="py-2 px-3">Category / Tier</th>
                          <th className="py-2 px-3 text-right">Rate / Unit</th>
                          <th className="py-2 px-3 text-center">Qty</th>
                          <th className="py-2 px-3 text-right">Line Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {eventDaySchedules.map((day) => {
                          const slots = buildDefaultServicesFromDay(day);
                          return (
                            <React.Fragment key={day.id}>
                              {slots.map((s, idx) => {
                                const spec = getEquipmentCrewSpecForService(
                                  s.serviceType,
                                  s.cameraCategory
                                );
                                const lineTotal =
                                  (s.tierPricePerUnit || 0) * (s.quantity || 1);
                                return (
                                  <tr key={s.id || idx} className="hover:bg-amber-50/30">
                                    <td className="py-2 px-3 font-bold text-gray-900">
                                      {idx === 0
                                        ? `Day ${day.dayNumber} · ${day.eventType} (${day.date})`
                                        : `↳ Day ${day.dayNumber} (${day.eventType})`}
                                    </td>
                                    <td className="py-2 px-3">
                                      <div className="font-semibold text-gray-900">
                                        {s.serviceType}
                                      </div>
                                      <div className="text-[10px] text-gray-500">
                                        {spec.equipmentSpec} · {spec.crewSpec}
                                      </div>
                                    </td>
                                    <td className="py-2 px-3 text-gray-700 font-semibold">
                                      {s.cameraCategory.replace('CAT_', 'Cat ')} +{' '}
                                      {s.crewCategory.replace('CREW_CAT_', 'Tier ')}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono">
                                      {formatPKR(s.tierPricePerUnit || 0)}
                                    </td>
                                    <td className="py-2 px-3 text-center font-mono font-bold">
                                      {s.quantity}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                                      {formatPKR(lineTotal)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {eventDaySchedules.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-gray-100">
                  <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No multi-day schedules added yet.</p>
                  <button
                    onClick={() => setIsDayModalOpen(true)}
                    className="mt-3 text-xs font-bold text-amber-600 hover:underline"
                  >
                    + Add Day 1 Schedule
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {eventDaySchedules.map((day) => {
                    const daySlots = buildDefaultServicesFromDay(day);
                    const shiftMode = day.timingMode || 'NIGHT_TIME';
                    return (
                      <div
                        key={day.id}
                        className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs space-y-3 relative group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900">
                              Day {day.dayNumber}: {day.eventType}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                shiftMode === 'DAY_TIME'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-indigo-100 text-indigo-800'
                              }`}
                            >
                              {shiftMode === 'DAY_TIME' ? '☀️ DAY_TIME (5h)' : '🌙 NIGHT_TIME'}
                            </span>
                          </div>
                          <div className="text-xs font-mono font-bold text-gray-900">
                            {formatPKR(day.customPrice)}
                          </div>
                        </div>

                        <div className="text-xs space-y-1 text-gray-600">
                          <div className="font-semibold text-gray-900 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" /> {day.venue}
                            </span>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                `${day.venue || ''} ${event.city || ''}`.trim()
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                            >
                              Map Pin <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" /> {formatDate(day.date)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span>Shoot: {day.startTime} - {day.endTime}</span>
                            <span className="text-amber-700 font-medium">(Call: {day.callTime})</span>
                          </div>
                          {day.dressCode && (
                            <div className="text-[11px] text-gray-500">
                              <strong>Dress Code:</strong> {day.dressCode}
                            </div>
                          )}
                        </div>

                        {/* Itemized Per-Day Service & Tier Slots */}
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <span>Configured Service & Tier Slots</span>
                            <button
                              onClick={() => openEditDayModal(day)}
                              className="text-amber-700 hover:text-amber-900 underline cursor-pointer"
                            >
                              Customize Slots
                            </button>
                          </div>
                          <div className="space-y-1">
                            {daySlots.map((slot) => {
                              const spec = getEquipmentCrewSpecForService(
                                slot.serviceType,
                                slot.cameraCategory
                              );
                              return (
                                <div
                                  key={slot.id}
                                  className="flex items-center justify-between text-[11px] bg-white px-2 py-1 rounded border border-slate-100"
                                >
                                  <div>
                                    <span className="font-bold text-slate-800">
                                      {slot.quantity}× {slot.serviceType}
                                    </span>{' '}
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 font-semibold">
                                      {slot.cameraCategory.replace('CAT_', 'Cat ')}
                                    </span>
                                    <div className="text-[10px] text-slate-400">
                                      {spec.equipmentSpec} • {spec.crewSpec}
                                    </div>
                                  </div>
                                  <span className="font-mono font-bold text-slate-700">
                                    {formatPKR(slot.quantity * slot.tierPricePerUnit)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Automated Crew Call Sheets (PDF & WhatsApp) + Edit Day Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                if (profile) {
                                  generateCallSheetPDF(
                                    day,
                                    event,
                                    client,
                                    profile,
                                    eventCrew,
                                    teamMembers,
                                    eventEquip,
                                    equipment
                                  );
                                  addToast(`Day ${day.dayNumber} Call Sheet PDF downloaded.`);
                                }
                              }}
                              className="text-[11px] text-slate-800 hover:text-slate-950 font-bold flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                              title="Download Daily Production Call Sheet PDF for Crew"
                            >
                              <Download className="w-3 h-3 text-slate-700" />
                              <span>Call Sheet PDF</span>
                            </button>

                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(
                                buildWhatsAppCallSheetText(
                                  day,
                                  event,
                                  client,
                                  profile,
                                  eventCrew,
                                  teamMembers,
                                  eventEquip,
                                  equipment
                                )
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                              title="Share Daily Call Sheet with Production Team on WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600" />
                              <span>WhatsApp Crew</span>
                            </a>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openEditDayModal(day)}
                              className="text-xs text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200 cursor-pointer shadow-2xs"
                              title="Edit Day Schedule & Per-Day Service Slots"
                            >
                              <Edit className="w-3 h-3 text-amber-600" />
                              <span>Edit Slots & Day</span>
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => deleteDaySchedule(day.id)}
                                className="text-gray-400 hover:text-rose-600 transition-colors p-1 rounded hover:bg-rose-50 cursor-pointer"
                                title="Remove Day"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREW PANEL */}
          {activeTab === 'crew' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Assigned Production Crew</h3>
                  <p className="text-xs text-gray-500">
                    Lead photographers, cinematographers, drone pilots, and lighting techs
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleAutoAssign}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-slate-950 rounded-lg text-xs font-bold hover:bg-amber-400 transition-colors cursor-pointer shadow-xs"
                    title="Automatically assigns available team members based on package requirements"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Assign Crew</span>
                  </button>
                  <button
                    onClick={() => setIsCrewModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Assign Member</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[520px]">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="py-2.5 px-3">Team Member</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Cost Rate</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {eventCrew.map(assignment => {
                      const member = teamMembers.find(m => m.id === assignment.teamMemberId);
                      return (
                        <tr key={assignment.id} className="hover:bg-gray-50/50">
                          <td className="py-3 px-3 font-semibold text-gray-900">
                            <div>{member?.name || 'Crew Member'}</div>
                            <div className="text-[10px] text-gray-400">{member?.phone}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-[10px] font-medium">
                              {assignment.role}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-600">{formatDate(assignment.date)}</td>
                          <td className="py-3 px-3 font-mono font-bold text-gray-900">
                            {formatPKR(assignment.cost)}
                          </td>
                          <td className="py-3 px-3">
                            <StatusBadge status={assignment.assignmentStatus} size="sm" />
                          </td>
                          <td className="py-3 px-3 text-right">
                            {isAdmin && (
                              <button
                                onClick={() => deleteTeamAssignment(assignment.id)}
                                className="text-gray-400 hover:text-rose-600 transition-colors p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: EQUIPMENT PANEL */}
          {activeTab === 'equipment' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Assigned Equipment & Cameras</h3>
                  <p className="text-xs text-gray-500">
                    Gear check-out and conflict detection prevents double booking
                  </p>
                </div>
                <button
                  onClick={() => setIsEquipModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Assign Gear</span>
                </button>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[520px]">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="py-2.5 px-3">Equipment</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Qty</th>
                      <th className="py-2.5 px-3">Rental Cost</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {eventEquip.map(assignment => {
                      const item = equipment.find(eq => eq.id === assignment.equipmentId);
                      return (
                        <tr key={assignment.id} className="hover:bg-gray-50/50">
                          <td className="py-3 px-3 font-semibold text-gray-900">
                            <div>{item?.name}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{item?.serialNumber}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px]">
                              {item?.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold">{assignment.quantity}</td>
                          <td className="py-3 px-3 font-mono font-bold text-gray-900">
                            {formatPKR(assignment.rentalCost)}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${assignment.isCheckedOut ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                              {assignment.isCheckedOut ? 'Checked Out' : 'Ready'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {isAdmin && (
                              <button
                                onClick={() => deleteEquipmentAssignment(assignment.id)}
                                className="text-gray-400 hover:text-rose-600 transition-colors p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: EXPENSES PANEL */}
          {activeTab === 'expenses' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Event Field Expenses</h3>
                  <p className="text-xs text-gray-500">
                    Fuel, catering, parking, logistics — directly deducted from Net Profit
                  </p>
                </div>
                <button
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Expense</span>
                </button>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[480px]">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Paid By</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {eventExp.map(exp => (
                      <tr key={exp.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-3 font-semibold text-gray-900">
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-[10px]">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-700">{exp.description}</td>
                        <td className="py-3 px-3 text-gray-500">{exp.paidBy}</td>
                        <td className="py-3 px-3 font-mono font-bold text-rose-600">
                          {formatPKR(exp.amount)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isAdmin && (
                            <button
                              onClick={() => deleteExpense(exp.id)}
                              className="text-gray-400 hover:text-rose-600 transition-colors p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: TASKS PANEL */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Post-Production Pipeline</h3>
                  <p className="text-xs text-gray-500">
                    Editing, photo retouching, highlight reels, and album deliveries
                  </p>
                </div>
                <button
                  onClick={() => setIsTaskModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Task</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {eventTasks.map(task => {
                  const assignee = teamMembers.find(m => m.id === task.assigneeId);
                  return (
                    <div
                      key={task.id}
                      className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-gray-900">{task.title}</span>
                        <StatusBadge status={task.priority} size="sm" />
                      </div>
                      <p className="text-[11px] text-gray-500">{task.description}</p>
                      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-100">
                        <span>Assignee: <strong>{assignee?.name || 'Unassigned'}</strong></span>
                        <span>Due: {formatDate(task.dueDate)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <select
                          value={task.status}
                          onChange={e => updateTask(task.id, { status: e.target.value as TaskStatus })}
                          className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-[11px] font-medium"
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Review">Review</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                        {isAdmin && (
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="text-gray-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: BILLING & PAYMENTS */}
          {activeTab === 'billing' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Client Payments & Invoices</h3>
                  <p className="text-xs text-gray-500">Verified transaction receipts and invoice generation</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setPreviewDoc('QUOTATION')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-900 hover:bg-blue-100 shadow-xs cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span>View Quotation Template</span>
                  </button>
                  <button
                    onClick={() => setPreviewDoc('INVOICE')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-lg text-xs font-bold text-amber-950 hover:bg-amber-100 shadow-xs cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-700" />
                    <span>View Invoice Template</span>
                  </button>
                  <button
                    onClick={handleCreateInvoice}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-xs cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Create Invoice</span>
                  </button>
                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 cursor-pointer shadow-xs"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Record Payment</span>
                  </button>
                </div>
              </div>

              {/* 3-Stage Payment Milestone Schedule & WhatsApp Reminders */}
              <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                      Installment & Payment Milestone Schedule (30% / 60% / 10%)
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Track booking advance, event completion settlement, and album delivery balance with one-click WhatsApp reminders
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-700">
                    Paid: {formatPKR(event.totalClientPayments)} / {formatPKR(event.packagePrice)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {paymentMilestones.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded-xl border space-y-2 ${
                        m.status === 'Paid'
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : m.status === 'Overdue'
                          ? 'bg-rose-50/60 border-rose-200'
                          : 'bg-gray-50/70 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-gray-900">
                          {m.percentLabel} — {m.title}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : m.status === 'Overdue'
                              ? 'bg-rose-100 text-rose-800'
                              : m.status === 'Partial'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>

                      <div className="text-sm font-mono font-black text-gray-900">
                        {formatPKR(m.amount)}
                      </div>

                      <div className="text-[11px] text-gray-500 space-y-0.5">
                        <div>Due: <strong>{formatDate(m.dueDate)}</strong></div>
                        <div>Covered: <strong className="text-emerald-700">{formatPKR(m.covered)}</strong> • Balance: <strong className="text-amber-700">{formatPKR(m.remaining)}</strong></div>
                      </div>

                      {m.remaining > 0 && (
                        <div className="pt-2 border-t border-gray-200/70 flex items-center gap-1.5">
                          <a
                            href={m.whatsappReminderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                            title="Send WhatsApp Milestone Payment Reminder to Client"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp Reminder</span>
                          </a>
                          <button
                            onClick={() => {
                              setPaymentAmount(m.remaining);
                              setPaymentNotes(`Milestone: ${m.title} (${m.percentLabel})`);
                              setIsPaymentModalOpen(true);
                            }}
                            className="py-1.5 px-2.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-lg text-[11px] font-bold cursor-pointer"
                            title="Record Payment for this Milestone"
                          >
                            Record
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Payments List */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[480px]">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="py-2.5 px-3">Receipt / Ref</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {eventPayments.map(pay => (
                      <tr key={pay.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-3 font-semibold text-gray-900">{pay.paymentId}</td>
                        <td className="py-3 px-3 text-gray-600">{formatDate(pay.paymentDate)}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-[10px]">
                            {pay.method}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-600">
                          {formatPKR(pay.amount)}
                        </td>
                        <td className="py-3 px-3 text-gray-500">{pay.notes || pay.reference || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Sticky Financial Summary Card (Section 34) */}
        <div className="space-y-6">
          <div className="sticky top-20 bg-white rounded-2xl border border-gray-200 shadow-lg p-6 space-y-5">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Studio Operational Room
              </div>
              <h3 className="text-base font-bold text-gray-900 mt-0.5">
                Financial Summary
              </h3>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center text-gray-600">
                <span>Contract Package Price:</span>
                <span className="font-mono font-bold text-gray-900 text-sm">
                  {formatPKR(event.packagePrice)}
                </span>
              </div>

              <div className="flex justify-between items-center text-gray-600">
                <span>Staff & Crew Cost:</span>
                <span className="font-mono text-rose-600">
                  - {formatPKR(event.staffCost)}
                </span>
              </div>

              <div className="flex justify-between items-center text-gray-600">
                <span>Equipment Rental Cost:</span>
                <span className="font-mono text-rose-600">
                  - {formatPKR(event.rentalCost)}
                </span>
              </div>

              <div className="flex justify-between items-center text-gray-600">
                <span>Other Field Expenses:</span>
                <span className="font-mono text-rose-600">
                  - {formatPKR(event.eventExpenses)}
                </span>
              </div>

              <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                <span className="font-bold text-gray-900">Net Event Profit:</span>
                <span className={`font-mono text-base font-black ${event.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatPKR(event.netProfit)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Net Margin:</span>
                <span className={`font-bold ${event.netMargin >= 30 ? 'text-emerald-600' : event.netMargin >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {event.netMargin.toFixed(1)}%
                </span>
              </div>

              <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-gray-600">
                <span>Advance / Paid:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {formatPKR(event.totalClientPayments)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">Remaining Balance:</span>
                <span className="font-mono font-bold text-amber-700 text-sm">
                  {formatPKR(event.remainingBalance)}
                </span>
              </div>
            </div>

            {/* Compact Milestone Reminders in Sidebar */}
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Payment Milestones (30% / 60% / 10%)
              </div>
              <div className="space-y-1.5">
                {paymentMilestones.map((m) => (
                  <div
                    key={m.id}
                    className="p-2 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-between gap-2 text-[11px]"
                  >
                    <div>
                      <div className="font-bold text-gray-800">
                        {m.percentLabel} {m.title}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {m.status === 'Paid' ? (
                          <span className="text-emerald-600 font-bold">Paid in Full</span>
                        ) : (
                          <span>
                            Due: {formatPKR(m.remaining)} ({formatDate(m.dueDate)})
                          </span>
                        )}
                      </div>
                    </div>
                    {m.remaining > 0 ? (
                      <a
                        href={m.whatsappReminderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded font-bold flex items-center gap-1 whitespace-nowrap"
                        title="Send WhatsApp Payment Reminder"
                      >
                        <MessageCircle className="w-3 h-3 text-emerald-600" />
                        <span>Remind</span>
                      </a>
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions List */}
            <div className="pt-4 border-t border-gray-100 space-y-2">
              <button
                onClick={() => {
                  populateEditForm();
                  setIsEditEventModalOpen(true);
                }}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Event Details</span>
              </button>

              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Record Advance / Payment</span>
              </button>

              <button
                onClick={handleAutoAssign}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Assign Required Crew</span>
              </button>

              <button
                onClick={() => setPreviewDoc('INVOICE')}
                className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-amber-700" />
                <span>View Branded Invoice Template</span>
              </button>

              <button
                onClick={() => setPreviewDoc('QUOTATION')}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span>View Branded Quotation Template</span>
              </button>

              <button
                onClick={handleGenerateInvoicePDF}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Download Verified Invoice (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: ADD DAY SCHEDULE */}
      <Modal
        isOpen={isDayModalOpen}
        onClose={() => setIsDayModalOpen(false)}
        title="Add Event Day Schedule & Service Slots"
        maxWidth="2xl"
      >
        <form onSubmit={handleAddDay} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Day Number</label>
              <input
                type="number"
                value={dayNumber}
                onChange={e => setDayNumber(Number(e.target.value))}
                min="1"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Event Type</label>
              <input
                type="text"
                value={dayType}
                onChange={e => setDayType(e.target.value)}
                placeholder="Mehndi / Barat / Walima"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Shift Mode</label>
              <select
                value={dayTimingMode}
                onChange={e => setDayTimingMode(e.target.value as TimingMode)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold"
              >
                <option value="NIGHT_TIME">🌙 NIGHT_TIME</option>
                <option value="DAY_TIME">☀️ DAY_TIME (5h Window)</option>
              </select>
            </div>
          </div>

          {/* Visual Per-Day Service & Tier Slot Builder */}
          {renderServiceSlotEditor('ADD')}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={dayDate}
                onChange={e => setDayDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Custom Day Price (PKR)</label>
              <input
                type="number"
                value={dayCustomPrice}
                onChange={e => setDayCustomPrice(Number(e.target.value))}
                min="0"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Venue</label>
            <input
              type="text"
              value={dayVenue}
              onChange={e => setDayVenue(e.target.value)}
              placeholder="e.g. Royal Palm Fairways Hall"
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Call Time</label>
              <input
                type="time"
                value={dayCallTime}
                onChange={e => setDayCallTime(e.target.value)}
                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={dayStartTime}
                onChange={e => setDayStartTime(e.target.value)}
                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={dayEndTime}
                onChange={e => setDayEndTime(e.target.value)}
                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Dress Code</label>
            <input
              type="text"
              value={dayDressCode}
              onChange={e => setDayDressCode(e.target.value)}
              placeholder="e.g. Traditional Mustard & Green"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
            <textarea
              value={dayNotes}
              onChange={e => setDayNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDayModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs"
            >
              Save Schedule
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDIT DAY SCHEDULE */}
      <Modal
        isOpen={isEditDayModalOpen}
        onClose={() => setIsEditDayModalOpen(false)}
        title={`Edit Day ${editDayNumber} Schedule & Service Slots: ${editDayType}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleUpdateDay} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Day Number</label>
              <input
                type="number"
                value={editDayNumber}
                onChange={e => setEditDayNumber(Number(e.target.value))}
                min="1"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Event Type</label>
              <input
                type="text"
                value={editDayType}
                onChange={e => setEditDayType(e.target.value)}
                placeholder="Mehndi / Barat / Walima"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Shift Mode</label>
              <select
                value={editDayTimingMode}
                onChange={e => setEditDayTimingMode(e.target.value as TimingMode)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold"
              >
                <option value="NIGHT_TIME">🌙 NIGHT_TIME</option>
                <option value="DAY_TIME">☀️ DAY_TIME (5h Window)</option>
              </select>
            </div>
          </div>

          {/* Visual Per-Day Service & Tier Slot Builder */}
          {renderServiceSlotEditor('EDIT')}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={editDayDate}
                onChange={e => setEditDayDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Custom Day Price (PKR)</label>
              <input
                type="number"
                value={editDayCustomPrice}
                onChange={e => setEditDayCustomPrice(Number(e.target.value))}
                min="0"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Venue</label>
            <input
              type="text"
              value={editDayVenue}
              onChange={e => setEditDayVenue(e.target.value)}
              placeholder="e.g. Royal Palm Fairways Hall"
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Call Time</label>
              <input
                type="time"
                value={editDayCallTime}
                onChange={e => setEditDayCallTime(e.target.value)}
                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={editDayStartTime}
                onChange={e => setEditDayStartTime(e.target.value)}
                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={editDayEndTime}
                onChange={e => setEditDayEndTime(e.target.value)}
                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Dress Code</label>
            <input
              type="text"
              value={editDayDressCode}
              onChange={e => setEditDayDressCode(e.target.value)}
              placeholder="e.g. Traditional Mustard & Green"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
            <textarea
              value={editDayNotes}
              onChange={e => setEditDayNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditDayModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingDay}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs cursor-pointer shadow-xs"
            >
              {isSavingDay ? 'Saving Changes...' : 'Save Day Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ASSIGN CREW */}
      <Modal
        isOpen={isCrewModalOpen}
        onClose={() => setIsCrewModalOpen(false)}
        title="Assign Production Crew Member"
      >
        <form onSubmit={handleAddCrew} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Team Member *</label>
            <select
              value={crewMemberId}
              onChange={e => {
                const id = e.target.value;
                setCrewMemberId(id);
                const mem = teamMembers.find(m => m.id === id);
                if (mem) {
                  setCrewRole(mem.role);
                  setCrewRate(mem.eventRate);
                }
              }}
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            >
              <option value="">-- Choose Crew Member --</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role} - Rate: {formatPKR(m.eventRate)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Role</label>
              <select
                value={crewRole}
                onChange={e => setCrewRole(e.target.value as TeamRole)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              >
                <option value="Photographer">Photographer</option>
                <option value="Videographer">Videographer</option>
                <option value="Drone Operator">Drone Operator</option>
                <option value="Editor">Editor</option>
                <option value="Assistant">Assistant</option>
                <option value="Album Designer">Album Designer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Event Cost / Fee (PKR)</label>
              <input
                type="number"
                value={crewRate}
                onChange={e => setCrewRate(Number(e.target.value))}
                min="0"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCrewModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 text-white font-bold rounded-lg text-xs"
            >
              Assign Crew
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ASSIGN EQUIPMENT */}
      <Modal
        isOpen={isEquipModalOpen}
        onClose={() => setIsEquipModalOpen(false)}
        title="Assign Equipment (with Conflict Detection)"
      >
        <form onSubmit={handleAddEquipment} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Select Equipment *</label>
            <select
              value={equipId}
              onChange={e => {
                const id = e.target.value;
                setEquipId(id);
                const item = equipment.find(eq => eq.id === id);
                if (item) {
                  setEquipRate(item.rentalRate);
                }
              }}
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            >
              <option value="">-- Choose Equipment --</option>
              {equipment.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} (Available: {eq.quantity}, Rate: {formatPKR(eq.rentalRate)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                value={equipQty}
                onChange={e => setEquipQty(Number(e.target.value))}
                min="1"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Rental Rate (PKR)</label>
              <input
                type="number"
                value={equipRate}
                onChange={e => setEquipRate(Number(e.target.value))}
                min="0"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEquipModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 text-white font-bold rounded-lg text-xs"
            >
              Assign Gear
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADD EXPENSE */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Record Event Field Expense"
      >
        <form onSubmit={handleAddExpense} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Expense Category</label>
              <select
                value={expCategory}
                onChange={e => setExpCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              >
                <option value="Fuel">Fuel</option>
                <option value="Catering">Catering</option>
                <option value="Travel">Travel</option>
                <option value="Labour">Labour</option>
                <option value="Accommodation">Accommodation</option>
                <option value="Parking">Parking</option>
                <option value="Miscellaneous">Miscellaneous</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Amount (PKR) *</label>
              <input
                type="number"
                value={expAmount}
                onChange={e => setExpAmount(Number(e.target.value))}
                min="1"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Description *</label>
            <input
              type="text"
              value={expDesc}
              onChange={e => setExpDesc(e.target.value)}
              placeholder="e.g. PSO Fuel for van & crew meal"
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-rose-600 text-white font-bold rounded-lg text-xs"
            >
              Save Expense
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADD TASK */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Add Post-Production Task"
      >
        <form onSubmit={handleAddTask} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Task Title *</label>
            <input
              type="text"
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              placeholder="e.g. DaVinci Color Grade & Instagram Reel"
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Assignee</label>
              <select
                value={taskAssignee}
                onChange={e => setTaskAssignee(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              >
                <option value="">-- Unassigned --</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Priority</label>
              <select
                value={taskPriority}
                onChange={e => setTaskPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              >
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              value={taskDueDate}
              onChange={e => setTaskDueDate(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Task Description</label>
            <textarea
              value={taskDesc}
              onChange={e => setTaskDesc(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsTaskModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 text-white font-bold rounded-lg text-xs"
            >
              Create Task
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: RECORD PAYMENT */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Client Payment / Advance Deposit"
      >
        <form onSubmit={handleAddPayment} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Amount (PKR) *</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={e => setPaymentAmount(Number(e.target.value))}
                min="1"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="JazzCash">JazzCash</option>
                <option value="EasyPaisa">EasyPaisa</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Reference / Bank Transaction ID</label>
            <input
              type="text"
              value={paymentRef}
              onChange={e => setPaymentRef(e.target.value)}
              placeholder="e.g. TXN-MEEZ-88192"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              value={paymentNotes}
              onChange={e => setPaymentNotes(e.target.value)}
              placeholder="Received via Meezan online portal"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs"
            >
              Confirm Payment
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDIT EVENT DETAILS */}
      <Modal
        isOpen={isEditEventModalOpen}
        onClose={() => setIsEditEventModalOpen(false)}
        title="Edit Event Parameters"
        maxWidth="2xl"
      >
        <form onSubmit={handleUpdateEvent} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Client *</label>
              <select
                value={editClientId}
                onChange={e => setEditClientId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone} - {c.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Event Category *</label>
              <select
                value={editCategory}
                onChange={e => setEditCategory(e.target.value as EventCategory)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              >
                <option value="Wedding">Wedding</option>
                <option value="Birthday">Birthday</option>
                <option value="Nikah">Nikah</option>
                <option value="Corporate">Corporate</option>
                <option value="Concert">Concert</option>
                <option value="Engagement">Engagement</option>
                <option value="Bridal Shower">Bridal Shower</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Wedding Subtype */}
            {editCategory === 'Wedding' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Wedding Subtype</label>
                <select
                  value={editWeddingSubtype}
                  onChange={e => setEditWeddingSubtype(e.target.value as WeddingSubtype)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                >
                  <option value="Barat">Barat</option>
                  <option value="Mehndi">Mehndi</option>
                  <option value="Walima">Walima</option>
                  <option value="Nikah">Nikah</option>
                  <option value="Engagement">Engagement</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}

            {/* Package */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Package Template</label>
              <select
                value={editPackageId}
                onChange={e => {
                  const id = e.target.value;
                  setEditPackageId(id);
                  const pkg = packages.find(p => p.id === id);
                  if (pkg) setEditPrice(pkg.price);
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              >
                <option value="">-- Custom / None --</option>
                {packages.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {formatPKR(p.price)}
                  </option>
                ))}
              </select>
            </div>

            {/* Agreed Price */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Contract Package Price (PKR) *</label>
              <input
                type="number"
                value={editPrice}
                onChange={e => setEditPrice(Number(e.target.value))}
                min="0"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
              <select
                value={editStatus}
                onChange={e => setEditStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              >
                <option value="Inquiry">Inquiry</option>
                <option value="Quotation Sent">Quotation Sent</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Shoot Scheduled">Shoot Scheduled</option>
                <option value="Shoot Done">Shoot Done</option>
                <option value="Editing">Editing</option>
                <option value="Delivered">Delivered</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Event Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Event Date *</label>
              <input
                type="date"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            {/* Timings */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={editStartTime}
                  onChange={e => setEditStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={editEndTime}
                  onChange={e => setEditEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Venue & City */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Venue</label>
              <input
                type="text"
                value={editVenue}
                onChange={e => setEditVenue(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={editCity}
                onChange={e => setEditCity(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            {/* Discount & Tax */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Discount (PKR)</label>
                <input
                  type="number"
                  value={editDiscount}
                  onChange={e => setEditDiscount(Number(e.target.value))}
                  min="0"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tax (PKR)</label>
                <input
                  type="number"
                  value={editTax}
                  onChange={e => setEditTax(Number(e.target.value))}
                  min="0"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            {/* Multi-Day Toggle */}
            <div className="flex items-center gap-3 pt-5">
              <input
                type="checkbox"
                id="editDetailIsMultiDay"
                checked={editIsMultiDay}
                onChange={e => setEditIsMultiDay(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded-xs border-gray-300 focus:ring-amber-500"
              />
              <label htmlFor="editDetailIsMultiDay" className="text-xs font-semibold text-gray-900 cursor-pointer">
                Multi-Day Event System
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Instructions</label>
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditEventModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingEdit}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
            >
              {isSavingEdit ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRMATION: DELETE EVENT */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete this Event?"
        message="This action will permanently delete this event, its day schedules, team assignments, equipment bookings, and expense records. This action cannot be undone."
      />

      {/* BRANDED INVOICE & QUOTATION OFFICIAL TEMPLATE MODAL */}
      {previewDoc && client && profile && (
        <BrandedDocumentView
          type={previewDoc}
          invoice={eventInvoices[0] || {
            id: 'inv-preview',
            invoiceNumber: `RS-INV-${event.id.slice(-4).toUpperCase()}`,
            clientId: event.clientId,
            eventId: event.id,
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: event.eventDate,
            subtotal: event.packagePrice,
            discount: event.discount || 0,
            tax: event.tax || 0,
            total: event.packagePrice - (event.discount || 0) + (event.tax || 0),
            paidAmount: event.totalClientPayments || 0,
            remainingAmount: event.remainingBalance || 0,
            paymentTerms: profile?.paymentTerms || 'Bank Transfer / Cash / JazzCash',
            notes: `Invoice for ${event.title}`,
            status: event.remainingBalance === 0 ? 'Paid' : (event.totalClientPayments > 0 ? 'Partially Paid' : 'Unpaid'),
            createdBy: 'Royal Studio'
          }}
          quotation={eventQuotations[0] || {
            id: 'quo-preview',
            quotationNumber: `RS-QUO-${event.id.slice(-4).toUpperCase()}`,
            clientId: event.clientId,
            eventId: event.id,
            issueDate: new Date().toISOString().split('T')[0],
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            subtotal: event.packagePrice,
            discount: event.discount || 0,
            tax: event.tax || 0,
            total: event.packagePrice - (event.discount || 0) + (event.tax || 0),
            paymentTerms: profile?.paymentTerms || '50% advance to confirm booking',
            notes: `Official quotation proposal for ${event.title}`,
            createdBy: 'Royal Studio'
          }}
          event={event}
          client={client}
          profile={profile}
          daySchedules={eventDaySchedules}
          payments={eventPayments}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      <ProposalQrShareModal
        isOpen={isProposalQrOpen}
        onClose={() => setIsProposalQrOpen(false)}
        proposalUrl={
          typeof window !== 'undefined'
            ? `${window.location.origin}/proposal/${event.id}`
            : `/proposal/${event.id}`
        }
        quotationNumber={
          eventQuotations[0]?.quotationNumber ||
          `RS-QUO-${event.id.slice(-4).toUpperCase()}`
        }
        eventTitle={event.title}
        eventDate={event.eventDate}
        clientName={client?.name || 'Valued Client'}
        clientPhone={client?.whatsapp || client?.phone}
        studioName={profile?.studioName || 'Royal Studio'}
        totalAmountText={formatPKR(
          event.packagePrice - (event.discount || 0) + (event.tax || 0)
        )}
      />
    </div>
  );
};
