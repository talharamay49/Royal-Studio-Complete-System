export type CameraCategoryTier = 'CAT_1' | 'CAT_2' | 'CAT_3';
export type CrewCategoryTier = 'CREW_CAT_1' | 'CREW_CAT_2' | 'CREW_CAT_3';
export type EventServiceType = 'Photographer' | 'Videographer' | 'Drone';

export interface CombinedPricingTierInfo {
  cameraCategory: CameraCategoryTier;
  crewCategory: CrewCategoryTier;
  tierNumber: 1 | 2 | 3;
  label: string;
  shortLabel: string;
  badgeText: string;
  ratePerCamPerDay: number;
  cameraHalfRate: number;
  crewHalfRate: number;
  description: string;
}

/**
 * Unified Category + Tier Pricing Table:
 * - Category 1 Camera + Tier 1 Crew = PKR 10,000 / camera / day
 * - Category 2 Camera + Tier 2 Crew = PKR 15,000 / camera / day
 * - Category 3 Camera + Tier 3 Crew = PKR 20,000 / camera / day
 */
export const UNIFIED_PRICING_TIERS: Record<CameraCategoryTier, CombinedPricingTierInfo> = {
  CAT_1: {
    cameraCategory: 'CAT_1',
    crewCategory: 'CREW_CAT_1',
    tierNumber: 1,
    label: 'Category 1 Camera + Tier 1 Crew',
    shortLabel: 'Cat 1 + Tier 1 (10k/cam)',
    badgeText: 'PKR 10,000 / cam / day',
    ratePerCamPerDay: 10000,
    cameraHalfRate: 5000,
    crewHalfRate: 5000,
    description: 'Standard 4K Mirrorless Camera + Tier 1 Photographer/Videographer (PKR 10,000 per camera/day)',
  },
  CAT_2: {
    cameraCategory: 'CAT_2',
    crewCategory: 'CREW_CAT_2',
    tierNumber: 2,
    label: 'Category 2 Camera + Tier 2 Crew',
    shortLabel: 'Cat 2 + Tier 2 (15k/cam)',
    badgeText: 'PKR 15,000 / cam / day',
    ratePerCamPerDay: 15000,
    cameraHalfRate: 7500,
    crewHalfRate: 7500,
    description: 'Pro Full-Frame Cinema Camera + Tier 2 Senior Photographer/Videographer (PKR 15,000 per camera/day)',
  },
  CAT_3: {
    cameraCategory: 'CAT_3',
    crewCategory: 'CREW_CAT_3',
    tierNumber: 3,
    label: 'Category 3 Camera + Tier 3 Crew',
    shortLabel: 'Cat 3 + Tier 3 (20k/cam)',
    badgeText: 'PKR 20,000 / cam / day',
    ratePerCamPerDay: 20000,
    cameraHalfRate: 10000,
    crewHalfRate: 10000,
    description: 'Flagship 8K Cinema Rig + Tier 3 Master DOP / Lead Photographer (PKR 20,000 per camera/day)',
  },
};

export const UNIFIED_TIER_LIST: CombinedPricingTierInfo[] = [
  UNIFIED_PRICING_TIERS.CAT_1,
  UNIFIED_PRICING_TIERS.CAT_2,
  UNIFIED_PRICING_TIERS.CAT_3,
];

/**
 * Resolves the per-camera/day rate for a selected Camera Category and Crew Tier.
 */
export function resolveCategoryTierRate(
  cameraCategory: CameraCategoryTier = 'CAT_2',
  crewCategory?: CrewCategoryTier
): number {
  const camInfo = UNIFIED_PRICING_TIERS[cameraCategory] || UNIFIED_PRICING_TIERS.CAT_2;
  if (!crewCategory || crewCategory === camInfo.crewCategory) {
    return camInfo.ratePerCamPerDay;
  }
  const crewHalfMap: Record<CrewCategoryTier, number> = {
    CREW_CAT_1: 5000,
    CREW_CAT_2: 7500,
    CREW_CAT_3: 10000,
  };
  return camInfo.cameraHalfRate + (crewHalfMap[crewCategory] ?? camInfo.crewHalfRate);
}

export function mapCameraTierToCrewTier(cameraCategory: CameraCategoryTier): CrewCategoryTier {
  if (cameraCategory === 'CAT_1') return 'CREW_CAT_1';
  if (cameraCategory === 'CAT_3') return 'CREW_CAT_3';
  return 'CREW_CAT_2';
}

export function getEquipmentCrewSpecForService(
  serviceType: EventServiceType,
  cameraCategory: CameraCategoryTier
): { equipmentSpec: string; crewSpec: string } {
  const tierNum = cameraCategory === 'CAT_1' ? 1 : cameraCategory === 'CAT_3' ? 3 : 2;
  if (serviceType === 'Photographer') {
    const eqMap: Record<number, string> = {
      1: 'Cat 1 Standard 4K Mirrorless Still Body',
      2: 'Cat 2 Pro Full-Frame Mirrorless Camera',
      3: 'Cat 3 Flagship Medium/Full-Frame Master Camera',
    };
    const crewMap: Record<number, string> = {
      1: 'Tier 1 Candid/Traditional Photographer',
      2: 'Tier 2 Senior Editorial Photographer',
      3: 'Tier 3 Master Lead Director of Photography',
    };
    return { equipmentSpec: eqMap[tierNum], crewSpec: crewMap[tierNum] };
  }
  if (serviceType === 'Videographer') {
    const eqMap: Record<number, string> = {
      1: 'Cat 1 4K Gimbal Video Rig',
      2: 'Cat 2 Pro Full-Frame 4K/60p Cinema Rig',
      3: 'Cat 3 Flagship 8K Cinema Line Rig + Prime Lenses',
    };
    const crewMap: Record<number, string> = {
      1: 'Tier 1 Event Videographer',
      2: 'Tier 2 Senior Cinematographer',
      3: 'Tier 3 Master Cinema DOP',
    };
    return { equipmentSpec: eqMap[tierNum], crewSpec: crewMap[tierNum] };
  }
  // Drone
  const eqMap: Record<number, string> = {
    1: 'Cat 1 Standard 4K Aerial Drone',
    2: 'Cat 2 Pro 4K/60p Cinema Aerial Drone',
    3: 'Cat 3 Flagship 5.1K/8K Cinema Drone + Dual Control',
  };
  const crewMap: Record<number, string> = {
    1: 'Tier 1 Drone Operator',
    2: 'Tier 2 Senior Aerial Pilot',
    3: 'Tier 3 Master Aerial Cinematographer',
  };
  return { equipmentSpec: eqMap[tierNum], crewSpec: crewMap[tierNum] };
}

/**
 * Explicit Per-Day Selected Service Item (Photographer, Videographer, Drone)
 * with its associated Category + Tier price and crew/equipment count.
 */
export interface DayServiceSelectionItem {
  id: string;
  serviceType: EventServiceType; // 'Photographer' | 'Videographer' | 'Drone'
  cameraCategory: CameraCategoryTier; // 'CAT_1' | 'CAT_2' | 'CAT_3'
  crewCategory: CrewCategoryTier; // 'CREW_CAT_1' | 'CREW_CAT_2' | 'CREW_CAT_3'
  quantity: number; // Number of cameras/crew for this service line
  tierPricePerUnit?: number; // Automatically resolved from cameraCategory + crewCategory (10k/15k/20k)
}

export interface CalculatedServiceLineItem {
  id: string;
  serviceType: EventServiceType;
  cameraCategory: CameraCategoryTier;
  crewCategory: CrewCategoryTier;
  tierNumber: 1 | 2 | 3;
  tierLabel: string;
  shortTierLabel: string;
  equipmentSpec: string;
  crewSpec: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  formulaText: string;
}

/**
 * Represents a single Tier Slot within an Event Day.
 */
export interface DayTierSlot {
  id: string;
  cameraCategory: CameraCategoryTier;
  crewCategory: CrewCategoryTier;
  photographers: number;
  videographers: number;
  drones: number;
}

export type DayConfigurationMode = 'CUSTOM_TIER' | 'PREBUILT_PACKAGE';

export interface CustomDayConfiguration {
  id: string;
  dayNumber: number;
  eventFunction: string; // e.g. 'Mehndi / Mayoun', 'Barat', 'Walima', 'Nikah', 'Mayun'
  date?: string;
  mode: DayConfigurationMode;
  // Used when mode === 'PREBUILT_PACKAGE'
  selectedPackageId?: string;
  selectedPackageName?: string;
  selectedPackagePrice?: number;
  // Explicit array of selected services (Photographer, Videographer, Drone) with tier prices
  services?: DayServiceSelectionItem[];
  // Used when mode === 'CUSTOM_TIER' (compatible with slot-based views)
  tierSlots: DayTierSlot[];
  extraDeliverableFee?: number;
  notes?: string;
}

export interface CalculatedTierSlotSummary {
  slotId: string;
  cameraCategory: CameraCategoryTier;
  crewCategory: CrewCategoryTier;
  tierLabel: string;
  shortTierLabel: string;
  ratePerCam: number;
  photographers: number;
  videographers: number;
  drones: number;
  totalUnits: number;
  subtotal: number;
  rolesSummaryText: string;
  formulaText: string;
}

export interface CalculatedDaySummary {
  dayId: string;
  dayNumber: number;
  eventFunction: string;
  date?: string;
  mode: DayConfigurationMode;
  packageName?: string;
  serviceLineItems: CalculatedServiceLineItem[];
  slotSummaries: CalculatedTierSlotSummary[];
  totalPhotographers: number;
  totalVideographers: number;
  totalDrones: number;
  totalCameraUnits: number;
  extraDeliverableFee: number;
  daySubtotal: number;
  headlineSummary: string;
}

export interface CalculatedMultiDayQuote {
  days: CalculatedDaySummary[];
  daysCount: number;
  totalPhotographersAcrossDays: number;
  totalVideographersAcrossDays: number;
  totalDronesAcrossDays: number;
  totalCameraUnitsAcrossDays: number;
  daysSubtotal: number;
  addonsTotal: number;
  discount: number;
  grandTotal: number;
}

export const LUXURY_ADDON_CATALOG: Array<{
  id: string;
  label: string;
  price: number;
}> = [
  { id: 'drone', label: '4K Drone Aerial Coverage', price: 20000 },
  { id: 'sde', label: 'Same-Day Edit (SDE) Highlight Reel', price: 25000 },
  { id: 'album', label: 'Extra Italian Flushmount Album', price: 30000 },
  { id: 'photographer', label: 'Additional Senior Photographer', price: 15000 },
  { id: 'smd', label: 'Live SMD / LED Wall Feed', price: 20000 },
];

export function getAddonPriceByLabel(labelOrId: string): number {
  const norm = (labelOrId || '').trim().toLowerCase();
  const found = LUXURY_ADDON_CATALOG.find(
    (a) => a.id.toLowerCase() === norm || a.label.toLowerCase() === norm
  );
  return found ? found.price : 20000;
}

/**
 * Converts a DayTierSlot array into an explicit DayServiceSelectionItem array
 * so both representations stay 100% synchronized.
 */
export function convertTierSlotsToServices(slots: DayTierSlot[]): DayServiceSelectionItem[] {
  const items: DayServiceSelectionItem[] = [];
  (slots || []).forEach((slot, idx) => {
    const camCat = slot.cameraCategory || 'CAT_2';
    const crewCat = slot.crewCategory || mapCameraTierToCrewTier(camCat);
    const unitPrice = resolveCategoryTierRate(camCat, crewCat);

    if (slot.photographers > 0) {
      items.push({
        id: `${slot.id}-photo-${idx}`,
        serviceType: 'Photographer',
        cameraCategory: camCat,
        crewCategory: crewCat,
        quantity: slot.photographers,
        tierPricePerUnit: unitPrice,
      });
    }
    if (slot.videographers > 0) {
      items.push({
        id: `${slot.id}-video-${idx}`,
        serviceType: 'Videographer',
        cameraCategory: camCat,
        crewCategory: crewCat,
        quantity: slot.videographers,
        tierPricePerUnit: unitPrice,
      });
    }
    if (slot.drones > 0) {
      items.push({
        id: `${slot.id}-drone-${idx}`,
        serviceType: 'Drone',
        cameraCategory: camCat,
        crewCategory: crewCat,
        quantity: slot.drones,
        tierPricePerUnit: unitPrice,
      });
    }
  });
  return items;
}

/**
 * Converts an explicit DayServiceSelectionItem array into DayTierSlot[] grouped by tier.
 */
export function syncServicesToTierSlots(
  dayId: string,
  services: DayServiceSelectionItem[]
): DayTierSlot[] {
  const grouped = new Map<CameraCategoryTier, DayTierSlot>();
  (services || []).forEach((srv, idx) => {
    const qty = Math.max(0, Number(srv.quantity || 0));
    if (qty <= 0) return;
    const cat = srv.cameraCategory || 'CAT_2';
    const existing = grouped.get(cat) || {
      id: `${dayId}-slot-${cat}-${idx}`,
      cameraCategory: cat,
      crewCategory: mapCameraTierToCrewTier(cat),
      photographers: 0,
      videographers: 0,
      drones: 0,
    };
    if (srv.serviceType === 'Photographer') {
      existing.photographers += qty;
    } else if (srv.serviceType === 'Videographer') {
      existing.videographers += qty;
    } else if (srv.serviceType === 'Drone') {
      existing.drones += qty;
    }
    grouped.set(cat, existing);
  });

  if (grouped.size === 0) {
    return [
      {
        id: `${dayId}-slot-empty`,
        cameraCategory: 'CAT_2',
        crewCategory: 'CREW_CAT_2',
        photographers: 0,
        videographers: 0,
        drones: 0,
      },
    ];
  }
  return Array.from(grouped.values());
}

export function calculateServiceLineItem(
  item: DayServiceSelectionItem
): CalculatedServiceLineItem {
  const camCat = item.cameraCategory || 'CAT_2';
  const crewCat = item.crewCategory || mapCameraTierToCrewTier(camCat);
  const tierInfo = UNIFIED_PRICING_TIERS[camCat] || UNIFIED_PRICING_TIERS.CAT_2;
  const unitPrice = resolveCategoryTierRate(camCat, crewCat);
  const quantity = Math.max(0, Number(item.quantity || 0));
  const lineTotal = quantity * unitPrice;
  const { equipmentSpec, crewSpec } = getEquipmentCrewSpecForService(item.serviceType, camCat);
  const rateInK = `${Math.round(unitPrice / 1000)}k`;
  const pluralLabel =
    quantity === 1 ? item.serviceType : `${item.serviceType}s`;

  return {
    id: item.id,
    serviceType: item.serviceType,
    cameraCategory: camCat,
    crewCategory: crewCat,
    tierNumber: tierInfo.tierNumber,
    tierLabel: tierInfo.label,
    shortTierLabel: tierInfo.shortLabel,
    equipmentSpec,
    crewSpec,
    quantity,
    unitPrice,
    lineTotal,
    formulaText: `${quantity} ${pluralLabel} × PKR ${rateInK} (${tierInfo.shortLabel}) = PKR ${lineTotal.toLocaleString('en-PK')}`,
  };
}

export function calculateTierSlotSummary(slot: DayTierSlot): CalculatedTierSlotSummary {
  const camCat = slot.cameraCategory || 'CAT_2';
  const crewCat = slot.crewCategory || mapCameraTierToCrewTier(camCat);
  const tierInfo = UNIFIED_PRICING_TIERS[camCat] || UNIFIED_PRICING_TIERS.CAT_2;
  const ratePerCam = resolveCategoryTierRate(camCat, crewCat);

  const photographers = Math.max(0, Number(slot.photographers || 0));
  const videographers = Math.max(0, Number(slot.videographers || 0));
  const drones = Math.max(0, Number(slot.drones || 0));
  const totalUnits = photographers + videographers + drones;
  const subtotal = totalUnits * ratePerCam;

  const roleParts: string[] = [];
  if (photographers > 0) {
    roleParts.push(`${photographers} Photo${photographers > 1 ? 's' : ''}`);
  }
  if (videographers > 0) {
    roleParts.push(`${videographers} Video${videographers > 1 ? 's' : ''}`);
  }
  if (drones > 0) {
    roleParts.push(`${drones} Drone${drones > 1 ? 's' : ''}`);
  }
  const rolesSummaryText = roleParts.length > 0 ? roleParts.join(' + ') : '0 Cameras';
  const rateInK = `${Math.round(ratePerCam / 1000)}k`;
  const formulaText = `${rolesSummaryText} (${totalUnits} Cam${totalUnits === 1 ? '' : 's'} × PKR ${rateInK}) = PKR ${subtotal.toLocaleString('en-PK')}`;

  return {
    slotId: slot.id,
    cameraCategory: camCat,
    crewCategory: crewCat,
    tierLabel: tierInfo.label,
    shortTierLabel: tierInfo.shortLabel,
    ratePerCam,
    photographers,
    videographers,
    drones,
    totalUnits,
    subtotal,
    rolesSummaryText,
    formulaText,
  };
}

export function calculateDaySummary(day: CustomDayConfiguration): CalculatedDaySummary {
  if (day.mode === 'PREBUILT_PACKAGE') {
    const pkgPrice = Math.max(0, Number(day.selectedPackagePrice || 0));
    const extra = Math.max(0, Number(day.extraDeliverableFee || 0));
    const daySubtotal = pkgPrice + extra;
    return {
      dayId: day.id,
      dayNumber: day.dayNumber,
      eventFunction: day.eventFunction || `Day ${day.dayNumber}`,
      date: day.date,
      mode: 'PREBUILT_PACKAGE',
      packageName: day.selectedPackageName || 'Pre-Built Studio Package',
      serviceLineItems: [],
      slotSummaries: [],
      totalPhotographers: 0,
      totalVideographers: 0,
      totalDrones: 0,
      totalCameraUnits: 0,
      extraDeliverableFee: extra,
      daySubtotal,
      headlineSummary: `${day.selectedPackageName || 'Studio Package'} — PKR ${daySubtotal.toLocaleString('en-PK')}`,
    };
  }

  // Resolve explicit services list or derive from tierSlots
  const rawServices: DayServiceSelectionItem[] =
    Array.isArray(day.services) && day.services.length > 0
      ? day.services
      : convertTierSlotsToServices(
          Array.isArray(day.tierSlots) && day.tierSlots.length > 0
            ? day.tierSlots
            : [
                {
                  id: `${day.id}-slot-1`,
                  cameraCategory: 'CAT_2',
                  crewCategory: 'CREW_CAT_2',
                  photographers: 1,
                  videographers: 1,
                  drones: 0,
                },
              ]
        );

  const serviceLineItems = rawServices
    .map(calculateServiceLineItem)
    .filter((item) => item.quantity > 0);

  const derivedSlots = syncServicesToTierSlots(day.id, rawServices);
  const slotSummaries = derivedSlots.map(calculateTierSlotSummary);

  const totalPhotographers = serviceLineItems
    .filter((s) => s.serviceType === 'Photographer')
    .reduce((acc, s) => acc + s.quantity, 0);
  const totalVideographers = serviceLineItems
    .filter((s) => s.serviceType === 'Videographer')
    .reduce((acc, s) => acc + s.quantity, 0);
  const totalDrones = serviceLineItems
    .filter((s) => s.serviceType === 'Drone')
    .reduce((acc, s) => acc + s.quantity, 0);

  const totalCameraUnits = totalPhotographers + totalVideographers + totalDrones;
  const servicesSubtotal = serviceLineItems.reduce((acc, s) => acc + s.lineTotal, 0);
  const extraDeliverableFee = Math.max(0, Number(day.extraDeliverableFee || 0));
  const daySubtotal = servicesSubtotal + extraDeliverableFee;

  const headlineSummary =
    serviceLineItems.length > 0
      ? serviceLineItems
          .map(
            (s) =>
              `${s.quantity} ${s.serviceType}${s.quantity > 1 ? 's' : ''} @ ${Math.round(
                s.unitPrice / 1000
              )}k`
          )
          .join(' + ')
      : 'No Services Selected';

  return {
    dayId: day.id,
    dayNumber: day.dayNumber,
    eventFunction: day.eventFunction || `Day ${day.dayNumber}`,
    date: day.date,
    mode: 'CUSTOM_TIER',
    serviceLineItems,
    slotSummaries,
    totalPhotographers,
    totalVideographers,
    totalDrones,
    totalCameraUnits,
    extraDeliverableFee,
    daySubtotal,
    headlineSummary,
  };
}

export function calculateUnifiedMultiDayPricing(params: {
  days: CustomDayConfiguration[];
  selectedAddons?: string[];
  customAddonsTotal?: number;
  discount?: number;
}): CalculatedMultiDayQuote {
  const daySummaries = (params.days || []).map(calculateDaySummary);
  const daysSubtotal = daySummaries.reduce((acc, d) => acc + d.daySubtotal, 0);
  const totalPhotographersAcrossDays = daySummaries.reduce(
    (acc, d) => acc + d.totalPhotographers,
    0
  );
  const totalVideographersAcrossDays = daySummaries.reduce(
    (acc, d) => acc + d.totalVideographers,
    0
  );
  const totalDronesAcrossDays = daySummaries.reduce((acc, d) => acc + d.totalDrones, 0);
  const totalCameraUnitsAcrossDays = daySummaries.reduce(
    (acc, d) => acc + d.totalCameraUnits,
    0
  );

  const addonsTotal =
    typeof params.customAddonsTotal === 'number'
      ? Math.max(0, params.customAddonsTotal)
      : (params.selectedAddons || []).reduce((acc, item) => acc + getAddonPriceByLabel(item), 0);

  const discount = Math.max(0, Number(params.discount || 0));
  const grandTotal = Math.max(0, daysSubtotal + addonsTotal - discount);

  return {
    days: daySummaries,
    daysCount: daySummaries.length,
    totalPhotographersAcrossDays,
    totalVideographersAcrossDays,
    totalDronesAcrossDays,
    totalCameraUnitsAcrossDays,
    daysSubtotal,
    addonsTotal,
    discount,
    grandTotal,
  };
}

/**
 * Helper to create a CustomDayConfiguration from an explicit list of services.
 */
export function createEventDayWithServices(params: {
  id: string;
  dayNumber: number;
  eventFunction: string;
  date?: string;
  services: DayServiceSelectionItem[];
}): CustomDayConfiguration {
  return {
    id: params.id,
    dayNumber: params.dayNumber,
    eventFunction: params.eventFunction,
    date: params.date,
    mode: 'CUSTOM_TIER',
    services: params.services,
    tierSlots: syncServicesToTierSlots(params.id, params.services),
    extraDeliverableFee: 0,
  };
}

/**
 * Creates default independent 3-Day Wedding Custom Configuration:
 * - Day 1 (Mehndi): 1 Photographer (15k) + 1 Videographer (15k) = PKR 30,000
 * - Day 2 (Barat): 2 Photographers (20k) + 2 Videographers (20k) + 1 Drone (20k) = PKR 100,000
 * - Day 3 (Walima): 2 Photographers (20k) + 2 Videographers (20k) = PKR 80,000
 */
export function createDefaultThreeDayWeddingConfig(): CustomDayConfiguration[] {
  return [
    createEventDayWithServices({
      id: 'day-1',
      dayNumber: 1,
      eventFunction: 'Mehndi / Mayoun',
      services: [
        {
          id: 'day-1-srv-photo',
          serviceType: 'Photographer',
          cameraCategory: 'CAT_2',
          crewCategory: 'CREW_CAT_2',
          quantity: 1,
          tierPricePerUnit: 15000,
        },
        {
          id: 'day-1-srv-video',
          serviceType: 'Videographer',
          cameraCategory: 'CAT_2',
          crewCategory: 'CREW_CAT_2',
          quantity: 1,
          tierPricePerUnit: 15000,
        },
      ],
    }),
    createEventDayWithServices({
      id: 'day-2',
      dayNumber: 2,
      eventFunction: 'Barat',
      services: [
        {
          id: 'day-2-srv-photo',
          serviceType: 'Photographer',
          cameraCategory: 'CAT_3',
          crewCategory: 'CREW_CAT_3',
          quantity: 2,
          tierPricePerUnit: 20000,
        },
        {
          id: 'day-2-srv-video',
          serviceType: 'Videographer',
          cameraCategory: 'CAT_3',
          crewCategory: 'CREW_CAT_3',
          quantity: 2,
          tierPricePerUnit: 20000,
        },
        {
          id: 'day-2-srv-drone',
          serviceType: 'Drone',
          cameraCategory: 'CAT_3',
          crewCategory: 'CREW_CAT_3',
          quantity: 1,
          tierPricePerUnit: 20000,
        },
      ],
    }),
    createEventDayWithServices({
      id: 'day-3',
      dayNumber: 3,
      eventFunction: 'Walima',
      services: [
        {
          id: 'day-3-srv-photo',
          serviceType: 'Photographer',
          cameraCategory: 'CAT_3',
          crewCategory: 'CREW_CAT_3',
          quantity: 2,
          tierPricePerUnit: 20000,
        },
        {
          id: 'day-3-srv-video',
          serviceType: 'Videographer',
          cameraCategory: 'CAT_3',
          crewCategory: 'CREW_CAT_3',
          quantity: 2,
          tierPricePerUnit: 20000,
        },
      ],
    }),
  ];
}

/**
 * Preset for Mixed-Tier Single/Multi-Day Setup:
 * e.g., Mehndi with 1 Photographer (20k) + 1 Videographer (20k) + 1 Videographer (10k) on the same day.
 */
export function createMixedTierMehndiExampleConfig(): CustomDayConfiguration[] {
  return [
    createEventDayWithServices({
      id: 'day-1',
      dayNumber: 1,
      eventFunction: 'Mehndi / Mayoun',
      services: [
        {
          id: 'day-1-srv-photo-20k',
          serviceType: 'Photographer',
          cameraCategory: 'CAT_3',
          crewCategory: 'CREW_CAT_3',
          quantity: 1,
          tierPricePerUnit: 20000,
        },
        {
          id: 'day-1-srv-video-20k',
          serviceType: 'Videographer',
          cameraCategory: 'CAT_3',
          crewCategory: 'CREW_CAT_3',
          quantity: 1,
          tierPricePerUnit: 20000,
        },
        {
          id: 'day-1-srv-video-10k',
          serviceType: 'Videographer',
          cameraCategory: 'CAT_1',
          crewCategory: 'CREW_CAT_1',
          quantity: 1,
          tierPricePerUnit: 10000,
        },
      ],
    }),
    createEventDayWithServices({
      id: 'day-2',
      dayNumber: 2,
      eventFunction: 'Barat',
      services: [
        {
          id: 'day-2-srv-photo',
          serviceType: 'Photographer',
          cameraCategory: 'CAT_3',
          crewCategory: 'CREW_CAT_3',
          quantity: 2,
          tierPricePerUnit: 20000,
        },
        {
          id: 'day-2-srv-video',
          serviceType: 'Videographer',
          cameraCategory: 'CAT_3',
          crewCategory: 'CREW_CAT_3',
          quantity: 2,
          tierPricePerUnit: 20000,
        },
        {
          id: 'day-2-srv-drone',
          serviceType: 'Drone',
          cameraCategory: 'CAT_3',
          crewCategory: 'CREW_CAT_3',
          quantity: 1,
          tierPricePerUnit: 20000,
        },
      ],
    }),
    createEventDayWithServices({
      id: 'day-3',
      dayNumber: 3,
      eventFunction: 'Walima',
      services: [
        {
          id: 'day-3-srv-photo',
          serviceType: 'Photographer',
          cameraCategory: 'CAT_3',
          crewCategory: 'CREW_CAT_3',
          quantity: 2,
          tierPricePerUnit: 20000,
        },
        {
          id: 'day-3-srv-video',
          serviceType: 'Videographer',
          cameraCategory: 'CAT_3',
          crewCategory: 'CREW_CAT_3',
          quantity: 2,
          tierPricePerUnit: 20000,
        },
      ],
    }),
  ];
}
