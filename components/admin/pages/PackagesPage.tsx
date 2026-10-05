import React, { useState, useMemo } from 'react';
import {
  Plus,
  CheckCircle,
  Users,
  Camera,
  Trash2,
  Edit,
  Clock,
  Sparkles,
  Calculator,
  Layers,
  Copy,
} from 'lucide-react';
import { useStudioData } from '../context/StudioDataContext';
import { useAuth } from '../context/AuthContext';
import { formatPKR } from '../utils/calculations';
import {
  UNIFIED_TIER_LIST,
  UNIFIED_PRICING_TIERS,
  calculateUnifiedMultiDayPricing,
  createDefaultThreeDayWeddingConfig,
  createMixedTierMehndiExampleConfig,
  mapCameraTierToCrewTier,
  type CameraCategoryTier,
  type CustomDayConfiguration,
  type DayTierSlot,
} from '@/lib/pricing/unifiedPricing';
import { Modal } from '../components/common/Modal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { Package, EventCategory } from '../types';

interface PackagesPageProps {
  navigate: (path: string) => void;
}

const CEREMONY_OPTIONS = [
  'Mehndi / Mayoun',
  'Barat',
  'Walima',
  'Nikah',
  'Engagement',
  'Bridal & Couple Shoot',
  'Qawali Night',
];

export const PackagesPage: React.FC<PackagesPageProps> = () => {
  const { packages, createPackage, updatePackage, deletePackage, addToast } = useStudioData();
  const { isAdmin } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<string | null>(null);

  // Interactive Multi-Day & Mixed-Tier Custom Package Configurator State
  const [showBuilder, setShowBuilder] = useState<boolean>(true);
  const [customBuilderTitle, setCustomBuilderTitle] = useState<string>(
    'Custom 3-Day Wedding (Mehndi + Barat + Walima)'
  );
  const [builderDays, setBuilderDays] = useState<CustomDayConfiguration[]>(() =>
    createDefaultThreeDayWeddingConfig()
  );
  const [builderExtraDeliverablesFee, setBuilderExtraDeliverablesFee] = useState<number>(0);

  // Modal Form State (with Unified Category + Tier Auto-Calculation)
  const [name, setName] = useState('');
  const [category, setCategory] = useState<EventCategory>('Wedding');
  const [description, setDescription] = useState('');
  const [pricingMode, setPricingMode] = useState<'DYNAMIC_TIER' | 'MANUAL'>('DYNAMIC_TIER');
  const [selectedTier, setSelectedTier] = useState<CameraCategoryTier>('CAT_3');
  const [coverageDaysCount, setCoverageDaysCount] = useState<number>(1);
  const [extraAlbumFee, setExtraAlbumFee] = useState<number>(0);
  const [price, setPrice] = useState(100000);
  const [duration, setDuration] = useState('1 Day (Full Coverage)');
  const [requiredPhotographers, setRequiredPhotographers] = useState(2);
  const [requiredVideographers, setRequiredVideographers] = useState(2);
  const [requiredDroneOperators, setRequiredDroneOperators] = useState(1);
  const [requiredAssistants, setRequiredAssistants] = useState(1);
  const [includedServicesStr, setIncludedServicesStr] = useState('');
  const [deliverablesStr, setDeliverablesStr] = useState('');

  // Live Unified Multi-Day Calculation for the Interactive Builder
  const builderQuote = useMemo(() => {
    return calculateUnifiedMultiDayPricing({
      days: builderDays,
      customAddonsTotal: builderExtraDeliverablesFee,
    });
  }, [builderDays, builderExtraDeliverablesFee]);

  // Live Modal Dynamic Calculation based on Category + Tier (10k / 15k / 20k per cam/day)
  const modalDynamicCalculation = useMemo(() => {
    const tierInfo = UNIFIED_PRICING_TIERS[selectedTier] || UNIFIED_PRICING_TIERS.CAT_2;
    const totalCameraUnits =
      Math.max(0, Number(requiredPhotographers || 0)) +
      Math.max(0, Number(requiredVideographers || 0)) +
      Math.max(0, Number(requiredDroneOperators || 0));
    const days = Math.max(1, Number(coverageDaysCount || 1));
    const dailyCost = totalCameraUnits * tierInfo.ratePerCamPerDay;
    const extra = Math.max(0, Number(extraAlbumFee || 0));
    const total = dailyCost * days + extra;
    return {
      tierInfo,
      totalCameraUnits,
      days,
      dailyCost,
      extra,
      total,
    };
  }, [
    selectedTier,
    requiredPhotographers,
    requiredVideographers,
    requiredDroneOperators,
    coverageDaysCount,
    extraAlbumFee,
  ]);

  const effectiveModalPrice =
    pricingMode === 'DYNAMIC_TIER' ? modalDynamicCalculation.total : price;

  // Builder Day & Tier Slot Handlers
  const updateBuilderDay = (dayId: string, patch: Partial<CustomDayConfiguration>) => {
    setBuilderDays((prev) =>
      prev.map((d) => (d.id === dayId ? { ...d, ...patch } : d))
    );
  };

  const updateBuilderTierSlot = (
    dayId: string,
    slotId: string,
    patch: Partial<DayTierSlot>
  ) => {
    setBuilderDays((prev) =>
      prev.map((d) => {
        if (d.id !== dayId) return d;
        return {
          ...d,
          tierSlots: d.tierSlots.map((s) => {
            if (s.id !== slotId) return s;
            const next = { ...s, ...patch };
            if (patch.cameraCategory) {
              next.crewCategory = mapCameraTierToCrewTier(patch.cameraCategory);
            }
            return next;
          }),
        };
      })
    );
  };

  const addBuilderTierSlot = (dayId: string) => {
    setBuilderDays((prev) =>
      prev.map((d) => {
        if (d.id !== dayId) return d;
        return {
          ...d,
          tierSlots: [
            ...d.tierSlots,
            {
              id: `${dayId}-slot-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              cameraCategory: 'CAT_1',
              crewCategory: 'CREW_CAT_1',
              photographers: 0,
              videographers: 1,
              drones: 0,
            },
          ],
        };
      })
    );
  };

  const removeBuilderTierSlot = (dayId: string, slotId: string) => {
    setBuilderDays((prev) =>
      prev.map((d) => {
        if (d.id !== dayId || d.tierSlots.length <= 1) return d;
        return {
          ...d,
          tierSlots: d.tierSlots.filter((s) => s.id !== slotId),
        };
      })
    );
  };

  const addBuilderDay = () => {
    setBuilderDays((prev) => {
      const nextNum = prev.length + 1;
      return [
        ...prev,
        {
          id: `bday-${nextNum}-${Date.now()}`,
          dayNumber: nextNum,
          eventFunction: CEREMONY_OPTIONS[(nextNum - 1) % CEREMONY_OPTIONS.length],
          mode: 'CUSTOM_TIER',
          tierSlots: [
            {
              id: `bday-${nextNum}-slot-1`,
              cameraCategory: 'CAT_2',
              crewCategory: 'CREW_CAT_2',
              photographers: 1,
              videographers: 1,
              drones: 0,
            },
          ],
          extraDeliverableFee: 0,
        },
      ];
    });
  };

  const removeBuilderDay = (dayId: string) => {
    setBuilderDays((prev) => {
      if (prev.length <= 1) return prev;
      return prev
        .filter((d) => d.id !== dayId)
        .map((d, idx) => ({ ...d, dayNumber: idx + 1 }));
    });
  };

  const copyBuilderDay1ToAll = () => {
    setBuilderDays((prev) => {
      if (prev.length <= 1) return prev;
      const d1 = prev[0];
      return prev.map((d, idx) => {
        if (idx === 0) return d;
        return {
          ...d,
          mode: d1.mode,
          tierSlots: d1.tierSlots.map((s, sIdx) => ({
            ...s,
            id: `${d.id}-copy-${sIdx}`,
          })),
        };
      });
    });
  };

  const handleSaveBuilderAsPackage = async () => {
    const title = customBuilderTitle.trim() || `Custom ${builderQuote.daysCount}-Day Package`;
    const maxPhotos = Math.max(
      1,
      ...builderQuote.days.map((d) => d.totalPhotographers)
    );
    const maxVideos = Math.max(
      1,
      ...builderQuote.days.map((d) => d.totalVideographers)
    );
    const maxDrones = Math.max(
      0,
      ...builderQuote.days.map((d) => d.totalDrones)
    );
    const dayLines = builderQuote.days.map(
      (d) =>
        `Day ${d.dayNumber} (${d.eventFunction}): ${d.headlineSummary} — ${formatPKR(d.daySubtotal)}`
    );

    await createPackage({
      name: title,
      category: 'Wedding',
      description: dayLines.join(' | '),
      price: builderQuote.grandTotal,
      duration: `${builderQuote.daysCount} Day${builderQuote.daysCount > 1 ? 's' : ''}`,
      requiredPhotographers: maxPhotos,
      requiredVideographers: maxVideos,
      requiredDroneOperators: maxDrones,
      requiredAssistants: 1,
      includedServices: dayLines,
      deliverables: [
        ...dayLines,
        'All High-Resolution Edited Photos',
        'Full 4K Cinematic Highlights & Full Event Film',
      ],
      isActive: true,
    });
    addToast(`Saved "${title}" (${formatPKR(builderQuote.grandTotal)}) to Studio Packages!`, 'success');
  };

  const handleOpenCreate = () => {
    setEditingPackage(null);
    setName('');
    setCategory('Wedding');
    setDescription('');
    setPricingMode('DYNAMIC_TIER');
    setSelectedTier('CAT_3');
    setCoverageDaysCount(1);
    setExtraAlbumFee(0);
    setPrice(100000);
    setDuration('1 Day (Full Coverage)');
    setRequiredPhotographers(2);
    setRequiredVideographers(2);
    setRequiredDroneOperators(1);
    setRequiredAssistants(1);
    setIncludedServicesStr('2 Candid Photographers\n2 4K Cinema Videographers\n1 4K Aerial Drone');
    setDeliverablesStr('1 Luxury Storybook Album\n1 4K Highlight Reel (5 mins)\nAll edited photos on USB');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pkg: Package) => {
    setEditingPackage(pkg);
    setName(pkg.name);
    setCategory(pkg.category);
    setDescription(pkg.description);
    setPricingMode('MANUAL');
    setPrice(pkg.price);
    setDuration(pkg.duration);
    setRequiredPhotographers(pkg.requiredPhotographers);
    setRequiredVideographers(pkg.requiredVideographers);
    setRequiredDroneOperators(pkg.requiredDroneOperators);
    setRequiredAssistants(pkg.requiredAssistants);
    setIncludedServicesStr((pkg.includedServices || []).join('\n'));
    setDeliverablesStr((pkg.deliverables || []).join('\n'));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      addToast('Package name is required', 'error');
      return;
    }

    const inc = includedServicesStr.split('\n').map((s) => s.trim()).filter(Boolean);
    const del = deliverablesStr.split('\n').map((s) => s.trim()).filter(Boolean);
    const finalPrice = Number(effectiveModalPrice);

    if (editingPackage) {
      await updatePackage(editingPackage.id, {
        name,
        category,
        description,
        price: finalPrice,
        duration,
        requiredPhotographers: Number(requiredPhotographers),
        requiredVideographers: Number(requiredVideographers),
        requiredDroneOperators: Number(requiredDroneOperators),
        requiredAssistants: Number(requiredAssistants),
        includedServices: inc,
        deliverables: del,
      });
    } else {
      await createPackage({
        name,
        category,
        description,
        price: finalPrice,
        duration,
        requiredPhotographers: Number(requiredPhotographers),
        requiredVideographers: Number(requiredVideographers),
        requiredDroneOperators: Number(requiredDroneOperators),
        requiredAssistants: Number(requiredAssistants),
        includedServices: inc,
        deliverables: del,
        isActive: true,
      });
    }
    setIsModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!packageToDelete) return;
    await deletePackage(packageToDelete);
    setPackageToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Service Packages &amp; Unified Tier Pricing
          </h2>
          <p className="text-xs text-gray-500">
            Unified Category + Crew Tier pricing (Cat 1+Tier 1 = 10k/cam, Cat 2+Tier 2 = 15k/cam, Cat 3+Tier 3 = 20k/cam) &amp; multi-day custom package builder.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBuilder((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Calculator className="w-4 h-4 text-amber-600" />
            <span>
              {showBuilder
                ? 'Hide Custom Day & Mixed-Tier Builder'
                : 'Open Custom Day & Mixed-Tier Builder'}
            </span>
          </button>
          {isAdmin && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Package</span>
            </button>
          )}
        </div>
      </div>

      {/* UNIFIED CATEGORY + TIER MULTI-DAY & MIXED-TIER BUILDER */}
      {showBuilder && (
        <div className="p-5 bg-white rounded-2xl border border-amber-300 shadow-xs space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-200 pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Unified Pricing Engine · Per-Day &amp; Mixed-Tier Configurator
              </span>
              <h3 className="text-base font-black text-gray-900 mt-0.5">
                Custom Day Configuration (Day 1 Mehndi · Day 2 Barat · Day 3 Walima)
              </h3>
              <p className="text-xs text-gray-500">
                Configure different Camera + Crew tiers per day, or mix multiple tiers on the same day (e.g. 1P+1V @ 20k + 1V @ 10k on Mehndi).
              </p>
            </div>

            {/* Quick Scenario Loaders matching exact customer scenarios */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCustomBuilderTitle(
                    '3-Day Custom (Mehndi 15k · Barat 20k+Drone · Walima 20k)'
                  );
                  setBuilderDays(createDefaultThreeDayWeddingConfig());
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-gray-50 hover:border-amber-500 hover:bg-amber-50 text-xs font-semibold text-gray-800 transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>Scenario 1: Mehndi (15k) + Barat (20k+Drone) + Walima (20k)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomBuilderTitle(
                    'Mixed-Tier Mehndi (1P+1V @20k + 1V @10k) + Barat & Walima'
                  );
                  setBuilderDays(createMixedTierMehndiExampleConfig());
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-gray-50 hover:border-amber-500 hover:bg-amber-50 text-xs font-semibold text-gray-800 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Scenario 2: Mixed Mehndi (1P+1V @20k + 1V @10k)</span>
              </button>
            </div>
          </div>

          {/* Unified Rate Reference Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {UNIFIED_TIER_LIST.map((tier) => (
              <div
                key={tier.cameraCategory}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200"
              >
                <div>
                  <div className="text-xs font-bold text-gray-900">{tier.label}</div>
                  <div className="text-[11px] text-gray-500">{tier.description}</div>
                </div>
                <span className="font-mono text-xs font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg shrink-0 tabular-nums">
                  {formatPKR(tier.ratePerCamPerDay)}/cam
                </span>
              </div>
            ))}
          </div>

          {/* Day Cards */}
          <div className="space-y-4">
            {builderDays.map((day, dIdx) => {
              const dayCalc = builderQuote.days[dIdx];
              return (
                <div
                  key={day.id}
                  className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold">
                        Day {day.dayNumber}
                      </span>
                      <select
                        value={day.eventFunction}
                        onChange={(e) =>
                          updateBuilderDay(day.id, { eventFunction: e.target.value })
                        }
                        className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-900"
                      >
                        {CEREMONY_OPTIONS.map((fn) => (
                          <option key={fn} value={fn}>
                            {fn}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-gray-500">
                        {dayCalc?.headlineSummary}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-black text-gray-900 tabular-nums">
                        Day {day.dayNumber}: {formatPKR(dayCalc?.daySubtotal || 0)}
                      </span>
                      {builderDays.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBuilderDay(day.id)}
                          className="p-1 text-gray-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Remove Day"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tier Slots inside this Day */}
                  <div className="space-y-2.5">
                    {day.tierSlots.map((slot, sIdx) => {
                      const slotCalc = dayCalc?.slotSummaries[sIdx];
                      return (
                        <div
                          key={slot.id}
                          className="p-3 bg-white rounded-xl border border-gray-200 space-y-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                              <Camera className="w-3.5 h-3.5 text-amber-600" />
                              <span>
                                {day.tierSlots.length > 1
                                  ? `Tier Slot #${sIdx + 1} (Same-Day Mixed Tier)`
                                  : `Day ${day.dayNumber} Camera + Crew Tier`}
                              </span>
                            </span>
                            <div className="flex items-center gap-2">
                              {slotCalc && (
                                <span className="font-mono text-xs font-bold text-amber-700 tabular-nums">
                                  {slotCalc.formulaText}
                                </span>
                              )}
                              {day.tierSlots.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeBuilderTierSlot(day.id, slot.id)}
                                  className="text-xs text-rose-600 hover:underline cursor-pointer"
                                >
                                  Remove Slot
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-6 gap-2.5 items-center">
                            {/* Category + Tier Dropdown / Selector */}
                            <div className="md:col-span-3">
                              <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                                Combined Category + Crew Tier
                              </label>
                              <select
                                value={slot.cameraCategory}
                                onChange={(e) =>
                                  updateBuilderTierSlot(day.id, slot.id, {
                                    cameraCategory: e.target.value as CameraCategoryTier,
                                  })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-xs font-semibold text-gray-900"
                              >
                                {UNIFIED_TIER_LIST.map((t) => (
                                  <option key={t.cameraCategory} value={t.cameraCategory}>
                                    {t.label} — {formatPKR(t.ratePerCamPerDay)}/cam/day
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Photographers */}
                            <div>
                              <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                                Photographers
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={slot.photographers}
                                onChange={(e) =>
                                  updateBuilderTierSlot(day.id, slot.id, {
                                    photographers: Math.max(0, Number(e.target.value || 0)),
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-mono text-center tabular-nums"
                              />
                            </div>

                            {/* Videographers */}
                            <div>
                              <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                                Videographers
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={slot.videographers}
                                onChange={(e) =>
                                  updateBuilderTierSlot(day.id, slot.id, {
                                    videographers: Math.max(0, Number(e.target.value || 0)),
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-mono text-center tabular-nums"
                              />
                            </div>

                            {/* Drone */}
                            <div>
                              <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                                Drone Cameras
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={slot.drones}
                                onChange={(e) =>
                                  updateBuilderTierSlot(day.id, slot.id, {
                                    drones: Math.max(0, Number(e.target.value || 0)),
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-mono text-center tabular-nums"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => addBuilderTierSlot(day.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-amber-500 bg-amber-50/60 hover:bg-amber-100 text-amber-900 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        + Add Mixed Tier Slot to Day {day.dayNumber} (e.g. combine 20k &amp; 10k cameras on same day)
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Builder Footer: Actions & Live Total */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-3 border-t border-gray-200">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={addBuilderDay}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Event Day</span>
              </button>
              {builderDays.length > 1 && (
                <button
                  type="button"
                  onClick={copyBuilderDay1ToAll}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Day 1 to All Days</span>
                </button>
              )}
              <div className="flex items-center gap-2 ml-2">
                <label className="text-xs font-semibold text-gray-600">
                  Extra Album/Deliverables (PKR):
                </label>
                <input
                  type="number"
                  min={0}
                  step={5000}
                  value={builderExtraDeliverablesFee}
                  onChange={(e) =>
                    setBuilderExtraDeliverablesFee(Math.max(0, Number(e.target.value || 0)))
                  }
                  className="w-28 px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Unified Dynamic Total ({builderQuote.daysCount} Days ·{' '}
                  {builderQuote.totalCameraUnitsAcrossDays} Camera Units)
                </div>
                <div className="text-xl font-black text-gray-900 font-mono tabular-nums">
                  {formatPKR(builderQuote.grandTotal)}
                </div>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customBuilderTitle}
                    onChange={(e) => setCustomBuilderTitle(e.target.value)}
                    placeholder="Custom Package Name"
                    className="px-3 py-2 rounded-xl border border-gray-300 text-xs w-56"
                  />
                  <button
                    type="button"
                    onClick={handleSaveBuilderAsPackage}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer"
                  >
                    Save to Studio Packages
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Package Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-all space-y-5"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900">
                    {pkg.category}
                  </span>
                  <h3 className="text-lg font-black text-gray-900 mt-1">{pkg.name}</h3>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(pkg)}
                      className="p-1 text-gray-400 hover:text-gray-700 rounded"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setPackageToDelete(pkg.id);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="p-1 text-gray-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-baseline gap-1 text-2xl font-black text-gray-900 font-mono tabular-nums">
                {formatPKR(pkg.price)}
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>Duration: {pkg.duration}</span>
              </div>
              <p className="text-xs text-gray-600">{pkg.description}</p>

              {/* Required Crew Quota */}
              <div className="p-3 bg-gray-50 rounded-xl space-y-1.5 border border-gray-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-amber-600" />
                  <span>Required Crew Deployment</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-800">
                  <div>
                    Photographers: <strong>{pkg.requiredPhotographers}</strong>
                  </div>
                  <div>
                    Videographers: <strong>{pkg.requiredVideographers}</strong>
                  </div>
                  <div>
                    Drone Pilots: <strong>{pkg.requiredDroneOperators}</strong>
                  </div>
                  <div>
                    Tech Assistants: <strong>{pkg.requiredAssistants}</strong>
                  </div>
                </div>
              </div>

              {/* Deliverables */}
              {pkg.deliverables && pkg.deliverables.length > 0 && (
                <div className="space-y-1 text-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Deliverables Handover
                  </div>
                  <ul className="space-y-1 text-gray-600">
                    {pkg.deliverables.map((del, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{del}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPackage ? 'Edit Service Package' : 'New Studio Package Template'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Package Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Barat 20k Tier Package (2P + 2V + 1 Drone)"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EventCategory)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              >
                <option value="Wedding">Wedding</option>
                <option value="Nikah">Nikah</option>
                <option value="Engagement">Engagement</option>
                <option value="Corporate">Corporate</option>
                <option value="Birthday">Birthday</option>
                <option value="Concert">Concert</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Pricing Mode Toggle: Unified Category + Tier Auto-Calc vs Manual Price */}
          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900">
                Package Pricing Mode
              </span>
              <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setPricingMode('DYNAMIC_TIER')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                    pricingMode === 'DYNAMIC_TIER'
                      ? 'bg-slate-900 text-white'
                      : 'text-gray-600'
                  }`}
                >
                  Category + Tier Dynamic (10k/15k/20k)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrice(effectiveModalPrice);
                    setPricingMode('MANUAL');
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                    pricingMode === 'MANUAL'
                      ? 'bg-slate-900 text-white'
                      : 'text-gray-600'
                  }`}
                >
                  Manual Price Override
                </button>
              </div>
            </div>

            {pricingMode === 'DYNAMIC_TIER' ? (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                    Camera + Crew Tier
                  </label>
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value as CameraCategoryTier)}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold"
                  >
                    {UNIFIED_TIER_LIST.map((t) => (
                      <option key={t.cameraCategory} value={t.cameraCategory}>
                        Cat {t.tierNumber} + Tier {t.tierNumber} ({t.ratePerCamPerDay / 1000}k/cam)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                    Coverage Days
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={coverageDaysCount}
                    onChange={(e) => {
                      const d = Math.max(1, Number(e.target.value || 1));
                      setCoverageDaysCount(d);
                      setDuration(`${d} Day${d > 1 ? 's' : ''} Coverage`);
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                    Album / Extra Fee (PKR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={extraAlbumFee}
                    onChange={(e) => setExtraAlbumFee(Math.max(0, Number(e.target.value || 0)))}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Package Price (PKR) *
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    min="0"
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 3 Days or 8 Hours"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-amber-200 text-xs">
              <span className="text-gray-600">
                {pricingMode === 'DYNAMIC_TIER'
                  ? `${modalDynamicCalculation.totalCameraUnits} Cam Units (${requiredPhotographers}P + ${requiredVideographers}V + ${requiredDroneOperators}D) × ${formatPKR(modalDynamicCalculation.tierInfo.ratePerCamPerDay)} × ${modalDynamicCalculation.days} Day(s)`
                  : 'Manual Fixed Package Rate'}
              </span>
              <span className="font-mono font-black text-sm text-gray-900 tabular-nums">
                Total: {formatPKR(effectiveModalPrice)}
              </span>
            </div>
          </div>

          {/* Required Crew Counters */}
          <div className="p-3 bg-gray-50 rounded-xl space-y-2 border border-gray-200">
            <div className="text-xs font-bold text-gray-800">
              Required Camera &amp; Crew Units (Drives Dynamic Tier Price)
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                  Photographers
                </label>
                <input
                  type="number"
                  value={requiredPhotographers}
                  onChange={(e) => setRequiredPhotographers(Number(e.target.value))}
                  min="0"
                  className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-xs text-center font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                  Videographers
                </label>
                <input
                  type="number"
                  value={requiredVideographers}
                  onChange={(e) => setRequiredVideographers(Number(e.target.value))}
                  min="0"
                  className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-xs text-center font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                  Drone Pilots
                </label>
                <input
                  type="number"
                  value={requiredDroneOperators}
                  onChange={(e) => setRequiredDroneOperators(Number(e.target.value))}
                  min="0"
                  className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-xs text-center font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-600 mb-1">
                  Assistants
                </label>
                <input
                  type="number"
                  value={requiredAssistants}
                  onChange={(e) => setRequiredAssistants(Number(e.target.value))}
                  min="0"
                  className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-xs text-center font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Deliverables (one per line)
            </label>
            <textarea
              value={deliverablesStr}
              onChange={(e) => setDeliverablesStr(e.target.value)}
              rows={3}
              placeholder="Luxury Leather Bound Storybook&#10;4K Cinematic Film&#10;Teasers within 48 hours"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 text-white font-bold rounded-lg text-xs"
            >
              Save Package ({formatPKR(effectiveModalPrice)})
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Package Template?"
        message="Are you sure you want to delete this package template from the studio system?"
      />
    </div>
  );
};
