import {
  Event,
  EventDaySchedule,
  EventExpense,
  EventTeamAssignment,
  EventEquipmentAssignment,
  Payment,
  InvoiceStatus,
  CameraCategoryTier,
  CrewCategoryTier,
  TimingMode,
} from '../types';
import {
  UNIFIED_PRICING_TIERS,
  UNIFIED_TIER_LIST,
  resolveCategoryTierRate,
  mapCameraTierToCrewTier,
  calculateServiceLineItem,
  calculateTierSlotSummary,
  calculateDaySummary,
  calculateUnifiedMultiDayPricing,
  createEventDayWithServices,
  createDefaultThreeDayWeddingConfig,
  createMixedTierMehndiExampleConfig,
  syncServicesToTierSlots,
  convertTierSlotsToServices,
  type EventServiceType,
  type DayServiceSelectionItem,
  type CalculatedServiceLineItem,
  type DayTierSlot,
  type CustomDayConfiguration,
  type CalculatedTierSlotSummary,
  type CalculatedDaySummary,
  type CalculatedMultiDayQuote,
} from '@/lib/pricing/unifiedPricing';

export {
  UNIFIED_PRICING_TIERS,
  UNIFIED_TIER_LIST,
  resolveCategoryTierRate,
  mapCameraTierToCrewTier,
  calculateServiceLineItem,
  calculateTierSlotSummary,
  calculateDaySummary,
  calculateUnifiedMultiDayPricing,
  createEventDayWithServices,
  createDefaultThreeDayWeddingConfig,
  createMixedTierMehndiExampleConfig,
  syncServicesToTierSlots,
  convertTierSlotsToServices,
  type EventServiceType,
  type DayServiceSelectionItem,
  type CalculatedServiceLineItem,
  type DayTierSlot,
  type CustomDayConfiguration,
  type CalculatedTierSlotSummary,
  type CalculatedDaySummary,
  type CalculatedMultiDayQuote,
};

export const CAMERA_CATEGORY_RATES: Record<
  CameraCategoryTier,
  {
    id: CameraCategoryTier;
    crewTier: CrewCategoryTier;
    label: string;
    shortLabel: string;
    ratePerDay: number;
    description: string;
  }
> = {
  CAT_1: {
    id: 'CAT_1',
    crewTier: 'CREW_CAT_1',
    label: 'Category 1 Camera + Tier 1 Crew (Combined)',
    shortLabel: 'Cat 1 Cam + Tier 1 Crew (PKR 10k/cam/day)',
    ratePerDay: 10000,
    description: 'Combined: Standard 4K Camera + Tier 1 Photographer/Videographer (PKR 10,000/day)',
  },
  CAT_2: {
    id: 'CAT_2',
    crewTier: 'CREW_CAT_2',
    label: 'Category 2 Camera + Tier 2 Crew (Combined)',
    shortLabel: 'Cat 2 Cam + Tier 2 Crew (PKR 15k/cam/day)',
    ratePerDay: 15000,
    description: 'Combined: Pro Full-Frame Cinema Camera + Tier 2 Senior Operator (PKR 15,000/day)',
  },
  CAT_3: {
    id: 'CAT_3',
    crewTier: 'CREW_CAT_3',
    label: 'Category 3 Camera + Tier 3 Crew (Combined)',
    shortLabel: 'Cat 3 Cam + Tier 3 Crew (PKR 20k/cam/day)',
    ratePerDay: 20000,
    description: 'Combined: Flagship 8K Cinema Rig + Tier 3 Master DOP/Director (PKR 20,000/day)',
  },
};

export const CREW_CATEGORY_RATES: Record<
  CrewCategoryTier,
  { id: CrewCategoryTier; label: string; shortLabel: string; ratePerDay: number; description: string }
> = {
  CREW_CAT_1: {
    id: 'CREW_CAT_1',
    label: 'Tier 1 Crew + Category 1 Camera (Combined)',
    shortLabel: 'Tier 1 + Cat 1 (PKR 10k/day)',
    ratePerDay: 10000,
    description: 'Included in combined PKR 10,000/day per camera + Tier 1 operator rate',
  },
  CREW_CAT_2: {
    id: 'CREW_CAT_2',
    label: 'Tier 2 Crew + Category 2 Camera (Combined)',
    shortLabel: 'Tier 2 + Cat 2 (PKR 15k/day)',
    ratePerDay: 15000,
    description: 'Included in combined PKR 15,000/day per camera + Tier 2 senior operator rate',
  },
  CREW_CAT_3: {
    id: 'CREW_CAT_3',
    label: 'Tier 3 Crew + Category 3 Camera (Combined)',
    shortLabel: 'Tier 3 + Cat 3 (PKR 20k/day)',
    ratePerDay: 20000,
    description: 'Included in combined PKR 20,000/day per camera + Tier 3 master operator rate',
  },
};

export function parseTimeToMinutes(timeStr: string): number {
  const [hStr, mStr] = (timeStr || '12:00').split(':');
  const h = Math.max(0, Math.min(23, parseInt(hStr || '12', 10) || 0));
  const m = Math.max(0, Math.min(59, parseInt(mStr || '0', 10) || 0));
  return h * 60 + m;
}

export function minutesToTimeStr(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Enforces the strict 5-hour Day Time (DM) window constraint when timingMode === 'DAY_TIME'.
 */
export function enforceDayTimeWindow(
  startTime: string,
  endTime: string,
  timingMode: TimingMode
): { startTime: string; endTime: string; durationHours: number; wasClamped: boolean } {
  const startMins = parseTimeToMinutes(startTime);
  let endMins = parseTimeToMinutes(endTime);

  if (timingMode === 'DAY_TIME') {
    const exactFiveHoursMins = Math.min(23 * 60 + 59, startMins + 5 * 60);
    const diffMins = endMins - startMins;
    if (diffMins <= 0 || diffMins > 5 * 60) {
      return {
        startTime: minutesToTimeStr(startMins),
        endTime: minutesToTimeStr(exactFiveHoursMins),
        durationHours: Number(((exactFiveHoursMins - startMins) / 60).toFixed(1)),
        wasClamped: true,
      };
    }
    return {
      startTime: minutesToTimeStr(startMins),
      endTime: minutesToTimeStr(endMins),
      durationHours: Number((diffMins / 60).toFixed(1)),
      wasClamped: false,
    };
  }

  if (endMins <= startMins) {
    endMins = Math.min(23 * 60 + 59, startMins + 5 * 60);
  }
  return {
    startTime: minutesToTimeStr(startMins),
    endTime: minutesToTimeStr(endMins),
    durationHours: Number(((endMins - startMins) / 60).toFixed(1)),
    wasClamped: false,
  };
}

/**
 * Dynamic Booking Pricing Formula (Unified Category + Tier Combined Rate):
 * - Category 1 Camera + Tier 1 Crew = PKR 10,000 / cam / day (5k Camera + 5k Crew)
 * - Category 2 Camera + Tier 2 Crew = PKR 15,000 / cam / day (7.5k Camera + 7.5k Crew)
 * - Category 3 Camera + Tier 3 Crew = PKR 20,000 / cam / day (10k Camera + 10k Crew)
 * Total Cost = [(Number of Cameras * Camera Half-Rate) + (Staff/Crew Count * Crew Half-Rate)] * Number of Days
 *              + Package Base Rate + Add-Ons - Discount
 */
export function calculateDynamicBookingPricing(params: {
  cameraCount: number;
  cameraCategoryRate: number;
  crewCount: number;
  crewCategoryRate: number;
  daysCount: number;
  packageBaseRate?: number;
  addOnsTotal?: number;
  discount?: number;
}): {
  cameraDailyCost: number;
  crewDailyCost: number;
  combinedDailyResourceCost: number;
  multiDayResourceCost: number;
  packageBaseRate: number;
  addOnsTotal: number;
  discount: number;
  totalCost: number;
} {
  const days = Math.max(1, Number(params.daysCount || 1));
  const cams = Math.max(0, Number(params.cameraCount || 0));
  const rawCamRate = Math.max(0, Number(params.cameraCategoryRate || 0));
  const crew = Math.max(0, Number(params.crewCount || 0));
  const rawCrewRate = Math.max(0, Number(params.crewCategoryRate || 0));
  const pkgBase = Math.max(0, Number(params.packageBaseRate || 0));
  const addOns = Math.max(0, Number(params.addOnsTotal || 0));
  const disc = Math.max(0, Number(params.discount || 0));

  // CAMERA_CATEGORY_RATES and CREW_CATEGORY_RATES store the combined rate (10k / 15k / 20k).
  // Each half (camera body + operator crew) represents 50% of the combined rate so 1 Cam + 1 Crew = 10k / 15k / 20k.
  const camHalfRate = rawCamRate >= 10000 && rawCrewRate > 0 ? rawCamRate / 2 : rawCamRate;
  const crewHalfRate = rawCrewRate >= 10000 && rawCamRate > 0 ? rawCrewRate / 2 : rawCrewRate;

  const cameraDailyCost = Math.round(cams * camHalfRate);
  const crewDailyCost = Math.round(crew * crewHalfRate);
  const combinedDailyResourceCost = cameraDailyCost + crewDailyCost;
  const multiDayResourceCost = combinedDailyResourceCost * days;
  const totalCost = Math.max(0, multiDayResourceCost + pkgBase + addOns - disc);

  return {
    cameraDailyCost,
    crewDailyCost,
    combinedDailyResourceCost,
    multiDayResourceCost,
    packageBaseRate: pkgBase,
    addOnsTotal: addOns,
    discount: disc,
    totalCost,
  };
}

export function calculateEventTotals(
  event: Partial<Event>,
  daySchedules: EventDaySchedule[] = [],
  teamAssignments: EventTeamAssignment[] = [],
  equipmentAssignments: EventEquipmentAssignment[] = [],
  expenses: EventExpense[] = [],
  payments: Payment[] = []
): {
  packagePrice: number;
  staffCost: number;
  rentalCost: number;
  eventExpenses: number;
  grossProfit: number;
  netProfit: number;
  netMargin: number;
  totalClientPayments: number;
  remainingBalance: number;
} {
  let packagePrice = Number(event.packagePrice || 0);
  if (event.isMultiDay && daySchedules.length > 0 && packagePrice <= 0) {
    const sumDayPrices = daySchedules.reduce((acc, day) => acc + Number(day.customPrice || 0), 0);
    if (sumDayPrices > 0) {
      packagePrice = sumDayPrices;
    }
  }

  // Calculate staff cost
  const staffCost = teamAssignments.reduce((acc, assignment) => {
    if (assignment.assignmentStatus === 'Cancelled') return acc;
    return acc + Number(assignment.cost || 0);
  }, 0);

  // Calculate rental cost
  const rentalCost = equipmentAssignments.reduce((acc, item) => {
    if (typeof item.rentalCost === 'number' && item.rentalCost > 0) {
      return acc + item.rentalCost;
    }
    return acc + Number(item.quantity || 0) * Number(item.rentalRate || 0);
  }, 0);

  // Calculate event expenses
  const eventExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount || 0), 0);

  // Gross profit & Net profit
  const grossProfit = packagePrice - staffCost - rentalCost;
  const netProfit = grossProfit - eventExpenses;

  // Net margin % (only calculate when package price > 0)
  const netMargin = packagePrice > 0 ? (netProfit / packagePrice) * 100 : 0;

  // Client payments (only Verified or legacy payments count toward paid balance; Pending Verification waits for Admin approval)
  const totalClientPayments = payments
    .filter(
      (p) =>
        p.verificationStatus !== 'Pending Verification' &&
        p.verificationStatus !== 'Rejected'
    )
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const remainingBalance = Math.max(0, packagePrice - totalClientPayments);

  return {
    packagePrice,
    staffCost,
    rentalCost,
    eventExpenses,
    grossProfit,
    netProfit,
    netMargin: Number(netMargin.toFixed(1)),
    totalClientPayments,
    remainingBalance,
  };
}

export function computeInvoiceStatus(
  invoice: { dueDate: string; total: number },
  paidAmount: number
): InvoiceStatus {
  const total = Number(invoice.total || 0);
  const paid = Number(paidAmount || 0);

  if (paid >= total && total > 0) {
    return 'Paid';
  }
  if (paid > 0 && paid < total) {
    return 'Partially Paid';
  }

  const today = new Date().toISOString().split('T')[0];
  if (invoice.dueDate && invoice.dueDate < today && paid < total) {
    return 'Overdue';
  }

  return 'Unpaid';
}

export function formatPKR(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'PKR 0';
  return 'PKR ' + Math.round(amount).toLocaleString('en-PK');
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
