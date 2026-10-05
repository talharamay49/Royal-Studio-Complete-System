"use client";

import { useState, useEffect, useMemo, type FormEvent } from "react";
import {
  Send,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  RotateCcw,
  Calendar,
  MapPin,
  Sparkles,
  Check,
  ArrowRight,
  ArrowLeft,
  Sliders,
  Plus,
  Trash2,
  Camera,
  Video,
  Plane,
  Copy,
  Layers,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  usePublicStudioProfile,
  usePublicWebsiteCMS,
} from "@/components/shared/StudioProfileContext";
import {
  UNIFIED_TIER_LIST,
  LUXURY_ADDON_CATALOG,
  calculateUnifiedMultiDayPricing,
  createEventDayWithServices,
  createDefaultThreeDayWeddingConfig,
  createMixedTierMehndiExampleConfig,
  mapCameraTierToCrewTier,
  resolveCategoryTierRate,
  syncServicesToTierSlots,
  getEquipmentCrewSpecForService,
  type CameraCategoryTier,
  type EventServiceType,
  type DayServiceSelectionItem,
  type CustomDayConfiguration,
} from "@/lib/pricing/unifiedPricing";
import {
  PriceBreakdownTable,
  PriceBreakdownModal,
} from "@/components/forms/PriceBreakdownModal";
import { cn } from "@/lib/utils";

const EVENT_FUNCTIONS_OPTIONS = [
  "Mehndi / Mayoun",
  "Barat",
  "Walima",
  "Nikkah",
  "Mayun",
  "Dholki / Qawali Night",
  "Engagement",
  "Bridal & Couple Portraits",
  "Commercial / Brand Shoot",
];

const QUICK_ADD_EVENT_PRESETS = [
  { label: "+ Add Nikkah", eventName: "Nikkah", defaultTier: "CAT_2" as CameraCategoryTier },
  { label: "+ Add Mayun", eventName: "Mayun", defaultTier: "CAT_1" as CameraCategoryTier },
  { label: "+ Add Mehndi", eventName: "Mehndi / Mayoun", defaultTier: "CAT_2" as CameraCategoryTier },
  { label: "+ Add Barat", eventName: "Barat", defaultTier: "CAT_3" as CameraCategoryTier },
  { label: "+ Add Walima", eventName: "Walima", defaultTier: "CAT_3" as CameraCategoryTier },
];

const ADDON_OPTIONS = LUXURY_ADDON_CATALOG.map((a) => a.label);

function parseNumericPackagePrice(priceStr: string): number {
  const digits = Number(String(priceStr || "").replace(/[^\d]/g, ""));
  return digits > 0 ? digits : 100000;
}

interface InquirySuccessPayload {
  referenceId: string;
  clientName: string;
  weddingDate: string;
  city: string;
  packageInterest: string;
  functions: string[];
  addons: string[];
  estimatedTotal: number;
  dayBreakdownSummary: string[];
  whatsappUrl: string;
}

export default function InquiryForm() {
  const profile = usePublicStudioProfile();
  const { pricingPackages } = usePublicWebsiteCMS();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showAllStepsAtOnce, setShowAllStepsAtOnce] = useState<boolean>(false);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState<boolean>(false);

  const [brideName, setBrideName] = useState("");
  const [groomName, setGroomName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [email, setEmail] = useState("");
  const [eventType, setEventType] = useState("Wedding");
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([
    "Mehndi / Mayoun",
    "Barat",
    "Walima",
  ]);
  const [weddingDate, setWeddingDate] = useState("");
  const [eventDaysCount, setEventDaysCount] = useState("3 Days");
  const [guestCount, setGuestCount] = useState("200 – 500 Guests");
  const [city, setCity] = useState("Burewala");
  const [venue, setVenue] = useState("");
  const [services, setServices] = useState("Full Royal Signature");

  // Package Configuration Mode:
  // 'CUSTOM_DAYS' = Custom Event Configuration with per-day equipment & crew services array
  // 'GLOBAL_PACKAGE' = One single pre-built studio package applied to the whole booking
  const [configMode, setConfigMode] = useState<"CUSTOM_DAYS" | "GLOBAL_PACKAGE">(
    "CUSTOM_DAYS"
  );
  const [packageInterest, setPackageInterest] = useState("");
  const [customDays, setCustomDays] = useState<CustomDayConfiguration[]>(() =>
    createDefaultThreeDayWeddingConfig()
  );
  const [newCustomEventName, setNewCustomEventName] = useState<string>("Nikkah");

  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmation, setConfirmation] = useState<InquirySuccessPayload | null>(null);

  // Real-time unified pricing calculation
  const livePricingQuote = useMemo(() => {
    if (configMode === "GLOBAL_PACKAGE" && packageInterest) {
      const matchedPkg = pricingPackages.find((p) => p.name === packageInterest);
      const pkgPrice = matchedPkg ? parseNumericPackagePrice(matchedPkg.price) : 120000;
      const singleGlobalDay: CustomDayConfiguration = {
        id: "global-pkg",
        dayNumber: 1,
        eventFunction: selectedFunctions.join(" + ") || "All Event Days",
        mode: "PREBUILT_PACKAGE",
        selectedPackageName: packageInterest,
        selectedPackagePrice: pkgPrice,
        services: [],
        tierSlots: [],
      };
      return calculateUnifiedMultiDayPricing({
        days: [singleGlobalDay],
        selectedAddons,
      });
    }

    return calculateUnifiedMultiDayPricing({
      days: customDays,
      selectedAddons,
    });
  }, [configMode, packageInterest, pricingPackages, selectedFunctions, customDays, selectedAddons]);

  function clearFieldError(field: string) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validatePhoneValue(value: string): boolean {
    const digits = value.replace(/[^0-9]/g, "");
    return digits.length >= 10 && digits.length <= 15 && /^[+\d\s()-]+$/.test(value.trim());
  }

  function validateEmailValue(value: string): boolean {
    if (!value.trim()) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
  }

  function validateStep1Fields(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!weddingDate) {
      errors.weddingDate = "Please select your preferred primary event date.";
    } else {
      const selected = new Date(`${weddingDate}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (isNaN(selected.getTime())) {
        errors.weddingDate = "Please enter a valid event date.";
      } else if (selected < today) {
        errors.weddingDate = "Event date cannot be in the past.";
      }
    }
    if (!city.trim() || city.trim().length < 2) {
      errors.city = "Please enter the event city (at least 2 characters).";
    }
    if (selectedFunctions.length === 0) {
      errors.functions = "Please select at least one celebration function to cover.";
    }
    return errors;
  }

  function validateStep3Fields(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!brideName.trim() || brideName.trim().length < 2) {
      errors.brideName = "Please enter the Bride or primary client full name (min 2 characters).";
    }
    if (!phone.trim()) {
      errors.phone = "Primary phone number is required (e.g. 0308-4877073).";
    } else if (!validatePhoneValue(phone)) {
      errors.phone =
        "Please enter a valid 10–15 digit phone number (e.g. 0308-4877073 or +923084877073).";
    }
    if (whatsappNumber.trim() && !validatePhoneValue(whatsappNumber)) {
      errors.whatsappNumber =
        "Please enter a valid WhatsApp number (10–15 digits) or leave blank.";
    }
    if (email.trim() && !validateEmailValue(email)) {
      errors.email = "Please enter a valid email address (e.g. name@example.com).";
    }
    return errors;
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const pkgParam = params.get("package");
      const serviceParam = params.get("service");
      const functionsParam = params.get("functions");
      const addonsParam = params.get("addons");
      const estimateParam = params.get("estimate");

      if (pkgParam) {
        setPackageInterest(pkgParam);
      }
      if (serviceParam) setServices(serviceParam);
      if (functionsParam) {
        const parsedFns = functionsParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (parsedFns.length > 0) setSelectedFunctions(parsedFns);
      }
      if (addonsParam) {
        const parsedAddons = addonsParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (parsedAddons.length > 0) setSelectedAddons(parsedAddons);
      }
      if (estimateParam) {
        setBudget(estimateParam);
      }
    }
  }, []);

  // Synchronize Coverage Days dropdown with Custom Days array length when changed
  function handleDaysCountChange(newDaysLabel: string) {
    setEventDaysCount(newDaysLabel);
    const targetCount =
      newDaysLabel === "1 Day"
        ? 1
        : newDaysLabel === "2 Days"
        ? 2
        : newDaysLabel === "3 Days"
        ? 3
        : 4;

    setCustomDays((prev) => {
      if (prev.length === targetCount) return prev;
      if (prev.length > targetCount) {
        return prev.slice(0, targetCount);
      }
      const defaultFunctions = ["Mehndi / Mayoun", "Barat", "Walima", "Nikkah"];
      const next = [...prev];
      while (next.length < targetCount) {
        const dayNum = next.length + 1;
        const defaultTier: CameraCategoryTier = dayNum === 1 ? "CAT_2" : "CAT_3";
        const defaultRate = resolveCategoryTierRate(defaultTier);
        const dayId = `day-${dayNum}-${Date.now()}`;
        next.push(
          createEventDayWithServices({
            id: dayId,
            dayNumber: dayNum,
            eventFunction:
              selectedFunctions[dayNum - 1] ||
              defaultFunctions[dayNum - 1] ||
              `Day ${dayNum} Event`,
            services: [
              {
                id: `${dayId}-photo`,
                serviceType: "Photographer",
                cameraCategory: defaultTier,
                crewCategory: mapCameraTierToCrewTier(defaultTier),
                quantity: dayNum === 1 ? 1 : 2,
                tierPricePerUnit: defaultRate,
              },
              {
                id: `${dayId}-video`,
                serviceType: "Videographer",
                cameraCategory: defaultTier,
                crewCategory: mapCameraTierToCrewTier(defaultTier),
                quantity: dayNum === 1 ? 1 : 2,
                tierPricePerUnit: defaultRate,
              },
            ],
          })
        );
      }
      return next;
    });
  }

  function toggleFunction(fn: string) {
    setSelectedFunctions((prev) =>
      prev.includes(fn)
        ? prev.length > 1
          ? prev.filter((item) => item !== fn)
          : prev
        : [...prev, fn]
    );
  }

  function toggleAddon(addon: string) {
    setSelectedAddons((prev) =>
      prev.includes(addon) ? prev.filter((item) => item !== addon) : [...prev, addon]
    );
  }

  // Custom Event & Service-Level Configuration Handlers
  function updateDayConfig(dayId: string, patch: Partial<CustomDayConfiguration>) {
    setCustomDays((prev) =>
      prev.map((d) => {
        if (d.id !== dayId) return d;
        const updated = { ...d, ...patch };
        if (patch.services) {
          updated.tierSlots = syncServicesToTierSlots(dayId, patch.services);
        }
        return updated;
      })
    );
  }

  function updateDayServiceItem(
    dayId: string,
    serviceId: string,
    patch: Partial<DayServiceSelectionItem>
  ) {
    setCustomDays((prev) =>
      prev.map((d) => {
        if (d.id !== dayId) return d;
        const currentServices = d.services || [];
        const nextServices = currentServices.map((srv) => {
          if (srv.id !== serviceId) return srv;
          const updated = { ...srv, ...patch };
          if (patch.cameraCategory) {
            updated.crewCategory = mapCameraTierToCrewTier(patch.cameraCategory);
            updated.tierPricePerUnit = resolveCategoryTierRate(
              patch.cameraCategory,
              updated.crewCategory
            );
          }
          return updated;
        });
        return {
          ...d,
          services: nextServices,
          tierSlots: syncServicesToTierSlots(dayId, nextServices),
        };
      })
    );
  }

  function addServiceToDay(
    dayId: string,
    serviceType: EventServiceType,
    cameraCategory: CameraCategoryTier = "CAT_2",
    quantity = 1
  ) {
    setCustomDays((prev) =>
      prev.map((d) => {
        if (d.id !== dayId) return d;
        const crewCat = mapCameraTierToCrewTier(cameraCategory);
        const newSrv: DayServiceSelectionItem = {
          id: `${dayId}-${serviceType.toLowerCase()}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 5)}`,
          serviceType,
          cameraCategory,
          crewCategory: crewCat,
          quantity,
          tierPricePerUnit: resolveCategoryTierRate(cameraCategory, crewCat),
        };
        const nextServices = [...(d.services || []), newSrv];
        return {
          ...d,
          mode: "CUSTOM_TIER",
          services: nextServices,
          tierSlots: syncServicesToTierSlots(dayId, nextServices),
        };
      })
    );
  }

  function removeServiceFromDay(dayId: string, serviceId: string) {
    setCustomDays((prev) =>
      prev.map((d) => {
        if (d.id !== dayId) return d;
        const currentServices = d.services || [];
        if (currentServices.length <= 1) return d;
        const nextServices = currentServices.filter((s) => s.id !== serviceId);
        return {
          ...d,
          services: nextServices,
          tierSlots: syncServicesToTierSlots(dayId, nextServices),
        };
      })
    );
  }

  // Assign a Tier-Based Package Preset to a specific day independently
  function applyDayTierPreset(
    dayId: string,
    presetType: "TIER_1_2CAM" | "TIER_2_2CAM" | "TIER_3_4CAM" | "TIER_3_5CAM_DRONE" | "MIXED_MEHNDI"
  ) {
    setCustomDays((prev) =>
      prev.map((d) => {
        if (d.id !== dayId) return d;
        let nextServices: DayServiceSelectionItem[] = [];

        if (presetType === "TIER_1_2CAM") {
          nextServices = [
            {
              id: `${dayId}-p1`,
              serviceType: "Photographer",
              cameraCategory: "CAT_1",
              crewCategory: "CREW_CAT_1",
              quantity: 1,
              tierPricePerUnit: 10000,
            },
            {
              id: `${dayId}-v1`,
              serviceType: "Videographer",
              cameraCategory: "CAT_1",
              crewCategory: "CREW_CAT_1",
              quantity: 1,
              tierPricePerUnit: 10000,
            },
          ];
        } else if (presetType === "TIER_2_2CAM") {
          nextServices = [
            {
              id: `${dayId}-p2`,
              serviceType: "Photographer",
              cameraCategory: "CAT_2",
              crewCategory: "CREW_CAT_2",
              quantity: 1,
              tierPricePerUnit: 15000,
            },
            {
              id: `${dayId}-v2`,
              serviceType: "Videographer",
              cameraCategory: "CAT_2",
              crewCategory: "CREW_CAT_2",
              quantity: 1,
              tierPricePerUnit: 15000,
            },
          ];
        } else if (presetType === "TIER_3_4CAM") {
          nextServices = [
            {
              id: `${dayId}-p3`,
              serviceType: "Photographer",
              cameraCategory: "CAT_3",
              crewCategory: "CREW_CAT_3",
              quantity: 2,
              tierPricePerUnit: 20000,
            },
            {
              id: `${dayId}-v3`,
              serviceType: "Videographer",
              cameraCategory: "CAT_3",
              crewCategory: "CREW_CAT_3",
              quantity: 2,
              tierPricePerUnit: 20000,
            },
          ];
        } else if (presetType === "TIER_3_5CAM_DRONE") {
          nextServices = [
            {
              id: `${dayId}-p3d`,
              serviceType: "Photographer",
              cameraCategory: "CAT_3",
              crewCategory: "CREW_CAT_3",
              quantity: 2,
              tierPricePerUnit: 20000,
            },
            {
              id: `${dayId}-v3d`,
              serviceType: "Videographer",
              cameraCategory: "CAT_3",
              crewCategory: "CREW_CAT_3",
              quantity: 2,
              tierPricePerUnit: 20000,
            },
            {
              id: `${dayId}-d3d`,
              serviceType: "Drone",
              cameraCategory: "CAT_3",
              crewCategory: "CREW_CAT_3",
              quantity: 1,
              tierPricePerUnit: 20000,
            },
          ];
        } else if (presetType === "MIXED_MEHNDI") {
          nextServices = [
            {
              id: `${dayId}-pmix`,
              serviceType: "Photographer",
              cameraCategory: "CAT_3",
              crewCategory: "CREW_CAT_3",
              quantity: 1,
              tierPricePerUnit: 20000,
            },
            {
              id: `${dayId}-vmix20`,
              serviceType: "Videographer",
              cameraCategory: "CAT_3",
              crewCategory: "CREW_CAT_3",
              quantity: 1,
              tierPricePerUnit: 20000,
            },
            {
              id: `${dayId}-vmix10`,
              serviceType: "Videographer",
              cameraCategory: "CAT_1",
              crewCategory: "CREW_CAT_1",
              quantity: 1,
              tierPricePerUnit: 10000,
            },
          ];
        }

        return {
          ...d,
          mode: "CUSTOM_TIER",
          services: nextServices,
          tierSlots: syncServicesToTierSlots(dayId, nextServices),
        };
      })
    );
  }

  function addCustomEventDay(
    customEventTitle?: string,
    defaultTier: CameraCategoryTier = "CAT_2"
  ) {
    setCustomDays((prev) => {
      const nextNum = prev.length + 1;
      const eventTitle =
        customEventTitle ||
        newCustomEventName ||
        EVENT_FUNCTIONS_OPTIONS[(nextNum - 1) % EVENT_FUNCTIONS_OPTIONS.length];
      const dayId = `day-${nextNum}-${Date.now()}`;
      const rate = resolveCategoryTierRate(defaultTier);

      const newDay = createEventDayWithServices({
        id: dayId,
        dayNumber: nextNum,
        eventFunction: eventTitle,
        services: [
          {
            id: `${dayId}-photo`,
            serviceType: "Photographer",
            cameraCategory: defaultTier,
            crewCategory: mapCameraTierToCrewTier(defaultTier),
            quantity: defaultTier === "CAT_3" ? 2 : 1,
            tierPricePerUnit: rate,
          },
          {
            id: `${dayId}-video`,
            serviceType: "Videographer",
            cameraCategory: defaultTier,
            crewCategory: mapCameraTierToCrewTier(defaultTier),
            quantity: defaultTier === "CAT_3" ? 2 : 1,
            tierPricePerUnit: rate,
          },
        ],
      });

      const next = [...prev, newDay];
      setEventDaysCount(
        next.length >= 4 ? "4+ Days" : `${next.length} Day${next.length > 1 ? "s" : ""}`
      );
      if (!selectedFunctions.includes(eventTitle)) {
        setSelectedFunctions((fns) => [...fns, eventTitle]);
      }
      return next;
    });
  }

  function removeCustomEventDay(dayId: string) {
    setCustomDays((prev) => {
      if (prev.length <= 1) return prev;
      const filtered = prev
        .filter((d) => d.id !== dayId)
        .map((d, idx) => ({ ...d, dayNumber: idx + 1 }));
      setEventDaysCount(
        filtered.length >= 4
          ? "4+ Days"
          : `${filtered.length} Day${filtered.length > 1 ? "s" : ""}`
      );
      return filtered;
    });
  }

  function copyDay1ToAllDays() {
    setCustomDays((prev) => {
      if (prev.length <= 1) return prev;
      const day1 = prev[0];
      return prev.map((d, idx) => {
        if (idx === 0) return d;
        const copiedServices = (day1.services || []).map((s, sIdx) => ({
          ...s,
          id: `${d.id}-copied-srv-${sIdx}`,
        }));
        return {
          ...d,
          mode: day1.mode,
          selectedPackageId: day1.selectedPackageId,
          selectedPackageName: day1.selectedPackageName,
          selectedPackagePrice: day1.selectedPackagePrice,
          extraDeliverableFee: day1.extraDeliverableFee,
          services: copiedServices,
          tierSlots: syncServicesToTierSlots(d.id, copiedServices),
        };
      });
    });
  }

  function applyStandardThreeDayPreset() {
    setConfigMode("CUSTOM_DAYS");
    setEventDaysCount("3 Days");
    setSelectedFunctions(["Mehndi / Mayoun", "Barat", "Walima"]);
    setCustomDays(createDefaultThreeDayWeddingConfig());
  }

  function applyMixedTierMehndiPreset() {
    setConfigMode("CUSTOM_DAYS");
    setEventDaysCount("3 Days");
    setSelectedFunctions(["Mehndi / Mayoun", "Barat", "Walima"]);
    setCustomDays(createMixedTierMehndiExampleConfig());
  }

  function handleNextStep(targetStep: 1 | 2 | 3) {
    setErrorMessage("");
    if (targetStep > 1) {
      const step1Errors = validateStep1Fields();
      if (Object.keys(step1Errors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...step1Errors }));
        setStatus("error");
        setErrorMessage(Object.values(step1Errors)[0]);
        return;
      }
    }
    setStatus("idle");
    setStep(targetStep);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage("");

    const step1Errors = validateStep1Fields();
    const step3Errors = validateStep3Fields();
    const allErrors = { ...step1Errors, ...step3Errors };

    if (Object.keys(allErrors).length > 0) {
      setFieldErrors(allErrors);
      setStatus("error");
      setErrorMessage(Object.values(allErrors)[0]);
      if (!showAllStepsAtOnce) {
        if (Object.keys(step1Errors).length > 0) {
          setStep(1);
        } else {
          setStep(3);
        }
      }
      return;
    }

    setFieldErrors({});
    setStatus("loading");

    const dayBreakdownLines = livePricingQuote.days.map(
      (d) =>
        `Day ${d.dayNumber} (${d.eventFunction}): ${d.headlineSummary} = PKR ${d.daySubtotal.toLocaleString("en-PK")}`
    );

    const resolvedPackageSummary =
      configMode === "GLOBAL_PACKAGE" && packageInterest
        ? packageInterest
        : `Custom ${livePricingQuote.daysCount}-Day Event Configuration (PKR ${livePricingQuote.grandTotal.toLocaleString("en-PK")})`;

    const resolvedBudget =
      budget || `PKR ${livePricingQuote.grandTotal.toLocaleString("en-PK")}`;

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brideName: brideName.trim(),
          groomName: groomName.trim(),
          phone: phone.trim(),
          whatsapp: whatsappNumber.trim() || phone.trim(),
          email: email.trim(),
          eventType,
          functions:
            configMode === "CUSTOM_DAYS"
              ? livePricingQuote.days.map((d) => d.eventFunction)
              : selectedFunctions,
          weddingDate,
          eventDaysCount,
          guestCount,
          city: city.trim() || "Burewala",
          venue: venue.trim(),
          services,
          packageInterest: resolvedPackageSummary,
          addons: selectedAddons,
          budget: resolvedBudget,
          calculatedEstimate: livePricingQuote.grandTotal,
          customDaysConfig: customDays,
          dayBreakdownLines,
          message: [
            message.trim(),
            `--- Custom Event Configuration Breakdown ---`,
            ...dayBreakdownLines,
            `Estimated Grand Total: PKR ${livePricingQuote.grandTotal.toLocaleString("en-PK")}`,
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      });

      const result = await res.json().catch(() => ({}));

      if (res.ok && result.success) {
        setConfirmation({
          referenceId: result.referenceId || "RS-INQ",
          clientName:
            result.clientName ||
            (groomName.trim() ? `${brideName.trim()} & ${groomName.trim()}` : brideName.trim()),
          weddingDate,
          city: city.trim() || "Burewala",
          packageInterest: resolvedPackageSummary,
          functions:
            configMode === "CUSTOM_DAYS"
              ? livePricingQuote.days.map((d) => d.eventFunction)
              : selectedFunctions,
          addons: selectedAddons,
          estimatedTotal: livePricingQuote.grandTotal,
          dayBreakdownSummary: dayBreakdownLines,
          whatsappUrl: result.whatsappUrl || "",
        });
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage(
          result?.error ||
            "Could not submit your inquiry right now. Please try again or reach us on WhatsApp."
        );
      }
    } catch {
      setStatus("error");
      setErrorMessage(
        "Network connection issue. Please try again or reach us directly via WhatsApp or phone."
      );
    }
  }

  function handleResetForm() {
    setBrideName("");
    setGroomName("");
    setPhone("");
    setWhatsappNumber("");
    setEmail("");
    setWeddingDate("");
    setVenue("");
    setMessage("");
    setConfirmation(null);
    setErrorMessage("");
    setStep(1);
    setStatus("idle");
  }

  if (status === "success" && confirmation) {
    return (
      <div className="rounded-2xl border border-accent/40 bg-surface p-6 sm:p-8 text-center space-y-5 shadow-premium">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
          <CheckCircle2 size={30} />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3.5 py-1 text-xs font-semibold tracking-widest uppercase text-accent">
            <Sparkles size={13} />
            Booking Request Logged · Ref #{confirmation.referenceId}
          </span>
          <h4 className="font-display text-2xl sm:text-3xl text-primary">
            Thank You, {confirmation.clientName}!
          </h4>
          <p className="text-sm text-text-muted max-w-md mx-auto leading-relaxed">
            Your custom event configuration has been synced to the{" "}
            <strong className="text-primary">
              {profile?.publicStudioName || profile?.studioName || "Royal Studio"}
            </strong>{" "}
            production desk. Our team will contact you within 24 hours.
          </p>
        </div>

        <div className="mx-auto max-w-lg rounded-xl border border-border bg-background p-4 text-left text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-text-muted flex items-center gap-1.5">
              <Calendar size={13} className="text-accent" />
              Event Date &amp; Duration:
            </span>
            <span className="font-semibold text-primary">
              {confirmation.weddingDate} ({eventDaysCount})
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted flex items-center gap-1.5">
              <MapPin size={13} className="text-accent" />
              Location:
            </span>
            <span className="font-semibold text-primary">{confirmation.city}</span>
          </div>
          <div className="border-t border-border pt-2 space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block">
              Day-by-Day Equipment &amp; Crew Configuration:
            </span>
            {confirmation.dayBreakdownSummary.map((line, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs text-primary bg-surface px-2.5 py-1.5 rounded-lg border border-border/60"
              >
                <span>{line}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2.5">
            <span className="font-semibold text-primary">Final Grand Total:</span>
            <span className="font-mono text-sm font-bold text-accent tabular-nums">
              PKR {confirmation.estimatedTotal.toLocaleString("en-PK")}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {confirmation.whatsappUrl && (
            <Button asChild variant="whatsapp" className="w-full sm:w-auto">
              <a
                href={confirmation.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={18} />
                Instant Confirmation on WhatsApp
              </a>
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={handleResetForm}
            className="w-full sm:w-auto"
          >
            <RotateCcw size={15} />
            Submit Another Booking
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      id="inquiry-form"
      onSubmit={handleSubmit}
      className="scroll-mt-28 space-y-6"
      noValidate
    >
      {/* Header & Guided Workflow Step Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-accent">
              Streamlined Event Booking Workflow
            </span>
            <h3 className="font-display text-2xl sm:text-3xl text-primary">
              Reserve Your Celebration Dates
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowAllStepsAtOnce((prev) => !prev)}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-text-muted hover:border-accent hover:text-accent transition-colors cursor-pointer"
          >
            <Sliders size={12} />
            <span>{showAllStepsAtOnce ? "Guided 3-Step Mode" : "View All Steps at Once"}</span>
          </button>
        </div>

        {!showAllStepsAtOnce && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(
              [
                { num: 1, title: "1. Schedule & Venue" },
                { num: 2, title: "2. Custom Event Configuration" },
                { num: 3, title: "3. Client & Confirm" },
              ] as const
            ).map((item) => {
              const isCurrent = step === item.num;
              const isDone = step > item.num;
              return (
                <button
                  key={item.num}
                  type="button"
                  onClick={() => handleNextStep(item.num)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer min-w-0",
                    isCurrent
                      ? "border-accent bg-accent text-[#111111] shadow-xs"
                      : isDone
                      ? "border-accent/50 bg-accent/15 text-primary"
                      : "border-border bg-surface text-text-muted hover:text-primary"
                  )}
                >
                  {isDone && <Check size={13} className="text-accent shrink-0" />}
                  <span className="truncate">{item.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {status === "error" && errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-600 dark:text-red-300"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: Celebration Schedule, Functions & Location */}
      {(showAllStepsAtOnce || step === 1) && (
        <div className="space-y-4">
          {showAllStepsAtOnce && (
            <div className="text-xs font-semibold tracking-widest uppercase text-accent border-b border-border pb-2">
              1. Celebration Schedule, Functions &amp; Location
            </div>
          )}

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <label
                htmlFor="eventType"
                className="mb-1.5 block text-xs font-medium tracking-widest uppercase text-text-muted"
              >
                Celebration Type
              </label>
              <Select
                id="eventType"
                name="eventType"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              >
                <option value="Wedding">Full Wedding Celebration</option>
                <option value="Engagement">Nikkah / Engagement</option>
                <option value="Bridal">Bridal &amp; Couple Editorial</option>
                <option value="Fashion">Fashion / Brand Campaign</option>
                <option value="Corporate">Corporate Event / Summit</option>
                <option value="Birthday">Birthday / Family Milestone</option>
              </Select>
            </div>
            <div>
              <label
                htmlFor="weddingDate"
                className="mb-1.5 block text-xs font-medium tracking-widest uppercase text-text-muted"
              >
                Primary Event Date <span className="text-accent">*</span>
              </label>
              <Input
                id="weddingDate"
                name="weddingDate"
                type="date"
                value={weddingDate}
                onChange={(e) => {
                  setWeddingDate(e.target.value);
                  clearFieldError("weddingDate");
                }}
                aria-invalid={Boolean(fieldErrors.weddingDate)}
                className={cn(
                  fieldErrors.weddingDate && "border-red-500/80 focus-visible:ring-red-500"
                )}
                required
              />
              {fieldErrors.weddingDate && (
                <p className="mt-1 text-[11px] font-medium text-red-500">
                  {fieldErrors.weddingDate}
                </p>
              )}
            </div>
            <div className="sm:col-span-2 xl:col-span-1">
              <label
                htmlFor="eventDaysCount"
                className="mb-1.5 block text-xs font-medium tracking-widest uppercase text-text-muted"
              >
                Total Coverage Days
              </label>
              <Select
                id="eventDaysCount"
                name="eventDaysCount"
                value={eventDaysCount}
                onChange={(e) => handleDaysCountChange(e.target.value)}
              >
                <option value="1 Day">1 Day Coverage</option>
                <option value="2 Days">2 Days (e.g. Barat + Walima)</option>
                <option value="3 Days">3 Days (Mehndi + Barat + Walima)</option>
                <option value="4+ Days">4+ Days Full Royal Week</option>
              </Select>
            </div>
          </div>

          {/* Multi-Select Functions */}
          <div>
            <label className="mb-2 block text-xs font-medium tracking-widest uppercase text-text-muted">
              Select Functions to Cover
            </label>
            <div className="flex flex-wrap gap-2">
              {EVENT_FUNCTIONS_OPTIONS.map((fn) => {
                const active = selectedFunctions.includes(fn);
                return (
                  <button
                    key={fn}
                    type="button"
                    onClick={() => toggleFunction(fn)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all cursor-pointer",
                      active
                        ? "border-accent bg-accent/15 text-primary font-semibold"
                        : "border-border bg-surface text-text-muted hover:border-accent/40 hover:text-primary"
                    )}
                  >
                    {active && <Check size={13} className="text-accent" />}
                    <span>{fn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <label
                htmlFor="city"
                className="mb-1.5 block text-xs font-medium tracking-widest uppercase text-text-muted"
              >
                City <span className="text-accent">*</span>
              </label>
              <Input
                id="city"
                name="city"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  clearFieldError("city");
                }}
                aria-invalid={Boolean(fieldErrors.city)}
                className={cn(
                  fieldErrors.city && "border-red-500/80 focus-visible:ring-red-500"
                )}
                required
                placeholder="Burewala, Lahore, Multan..."
              />
              {fieldErrors.city && (
                <p className="mt-1 text-[11px] font-medium text-red-500">
                  {fieldErrors.city}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="venue"
                className="mb-1.5 block text-xs font-medium tracking-widest uppercase text-text-muted"
              >
                Venue / Marquee / Banquet
              </label>
              <Input
                id="venue"
                name="venue"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Venue or hotel name"
              />
            </div>
            <div className="sm:col-span-2 xl:col-span-1">
              <label
                htmlFor="guestCount"
                className="mb-1.5 block text-xs font-medium tracking-widest uppercase text-text-muted"
              >
                Estimated Guests
              </label>
              <Select
                id="guestCount"
                name="guestCount"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
              >
                <option value="Under 200 Guests">Intimate (Under 200 Guests)</option>
                <option value="200 – 500 Guests">200 – 500 Guests</option>
                <option value="500 – 1,000 Guests">500 – 1,000 Guests</option>
                <option value="1,000+ Guests">Grand Reception (1,000+ Guests)</option>
              </Select>
            </div>
          </div>

          {!showAllStepsAtOnce && (
            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                variant="accent"
                onClick={() => handleNextStep(2)}
                className="w-full sm:w-auto"
              >
                <span>Configure Custom Events &amp; Crew Tiers</span>
                <ArrowRight size={15} />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: CUSTOM EVENT CONFIGURATION & PER-DAY EQUIPMENT/CREW SERVICES */}
      {(showAllStepsAtOnce || step === 2) && (
        <div className="space-y-5">
          {showAllStepsAtOnce && (
            <div className="text-xs font-semibold tracking-widest uppercase text-accent border-b border-border pb-2">
              2. Custom Event Configuration &amp; Per-Day Crew/Equipment Selection
            </div>
          )}

          {/* Header & Mode Switcher */}
          <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-accent block">
                  Custom Event Configuration
                </span>
                <h4 className="font-display text-lg sm:text-xl text-primary">
                  Assign Independent Equipment &amp; Crew Tiers Per Event Day
                </h4>
                <p className="text-xs text-text-muted">
                  Add any celebration event (Mehndi, Barat, Walima, Nikkah, Mayun) and customize Photographer, Videographer &amp; Drone services with independent Category + Tier pricing.
                </p>
              </div>
              <div className="inline-flex rounded-xl border border-border bg-background p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfigMode("CUSTOM_DAYS")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                    configMode === "CUSTOM_DAYS"
                      ? "bg-accent text-[#111111] shadow-xs"
                      : "text-text-muted hover:text-primary"
                  )}
                >
                  Custom Event Configuration
                </button>
                <button
                  type="button"
                  onClick={() => setConfigMode("GLOBAL_PACKAGE")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                    configMode === "GLOBAL_PACKAGE"
                      ? "bg-accent text-[#111111] shadow-xs"
                      : "text-text-muted hover:text-primary"
                  )}
                >
                  Single Global Package
                </button>
              </div>
            </div>

            {/* Unified Pricing Rate Legend */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border/60">
              {UNIFIED_TIER_LIST.map((tier) => (
                <div
                  key={tier.cameraCategory}
                  className="flex items-center justify-between rounded-xl border border-border/80 bg-background px-3 py-2 text-xs"
                >
                  <div>
                    <div className="font-semibold text-primary">
                      Cat {tier.tierNumber} + Tier {tier.tierNumber}
                    </div>
                    <div className="text-[11px] text-text-muted">
                      Camera + Crew Combined
                    </div>
                  </div>
                  <span className="font-mono font-bold text-accent tabular-nums">
                    PKR {(tier.ratePerCamPerDay / 1000).toFixed(0)}k/cam/day
                  </span>
                </div>
              ))}
            </div>
          </div>

          {configMode === "CUSTOM_DAYS" ? (
            <div className="space-y-4">
              {/* "Add Event" Bar (e.g., Add Nikkah, Add Mayun, Add Barat, etc.) & Quick Templates */}
              <div className="rounded-2xl border border-accent/40 bg-surface p-4 space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-primary block">
                      Add Event Day to Your Booking Schedule
                    </span>
                    <span className="text-[11px] text-text-muted">
                      Click any event below (e.g. Nikkah or Mayun) or select from the menu and click &ldquo;Add Event&rdquo;.
                    </span>
                  </div>

                  {/* Select + Add Event Button */}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Select Event Type to Add"
                      value={newCustomEventName}
                      onChange={(e) => setNewCustomEventName(e.target.value)}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-primary"
                    >
                      {EVENT_FUNCTIONS_OPTIONS.map((fn) => (
                        <option key={fn} value={fn}>
                          {fn}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => addCustomEventDay(newCustomEventName, "CAT_2")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-[#111111] hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
                    >
                      <Plus size={14} />
                      <span>Add Event</span>
                    </button>
                  </div>
                </div>

                {/* Quick 1-Click Add Event Buttons (Add Nikkah, Add Mayun, etc.) & Multi-Day Scenario Templates */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {QUICK_ADD_EVENT_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          addCustomEventDay(preset.eventName, preset.defaultTier)
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:border-accent hover:text-accent transition-colors cursor-pointer"
                      >
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={applyStandardThreeDayPreset}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-text-muted hover:border-accent hover:text-primary transition-colors cursor-pointer"
                    >
                      <Layers size={12} className="text-accent" />
                      <span>Load 3-Day (Mehndi 15k · Barat 20k+Drone · Walima 20k)</span>
                    </button>
                    <button
                      type="button"
                      onClick={applyMixedTierMehndiPreset}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-text-muted hover:border-accent hover:text-primary transition-colors cursor-pointer"
                    >
                      <Sparkles size={12} className="text-accent" />
                      <span>Load Mixed-Tier Mehndi (20k + 10k)</span>
                    </button>
                    {customDays.length > 1 && (
                      <button
                        type="button"
                        onClick={copyDay1ToAllDays}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-text-muted hover:border-accent hover:text-primary transition-colors cursor-pointer"
                      >
                        <Copy size={12} />
                        <span>Copy Day 1 to All</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Per-Day Independent Event Configuration Cards */}
              <div className="space-y-4">
                {customDays.map((day, dayIndex) => {
                  const dayCalc = livePricingQuote.days[dayIndex];
                  const dayServices = day.services || [];

                  return (
                    <div
                      key={day.id}
                      className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-4"
                    >
                      {/* Day Card Top Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="inline-flex items-center justify-center rounded-lg bg-accent px-2.5 py-1 text-xs font-bold text-[#111111]">
                            Day {day.dayNumber}
                          </span>
                          <select
                            aria-label={`Day ${day.dayNumber} Event Function`}
                            value={day.eventFunction}
                            onChange={(e) =>
                              updateDayConfig(day.id, { eventFunction: e.target.value })
                            }
                            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-primary"
                          >
                            {EVENT_FUNCTIONS_OPTIONS.map((fn) => (
                              <option key={fn} value={fn}>
                                {fn}
                              </option>
                            ))}
                            <option value={`Day ${day.dayNumber} Celebration`}>
                              Day {day.dayNumber} Celebration
                            </option>
                          </select>

                          {/* Per-Day Mode Switch: Custom Services/Tiers vs Pre-Built Package */}
                          <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                updateDayConfig(day.id, { mode: "CUSTOM_TIER" })
                              }
                              className={cn(
                                "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer",
                                day.mode === "CUSTOM_TIER"
                                  ? "bg-accent text-[#111111]"
                                  : "text-text-muted hover:text-primary"
                              )}
                            >
                              Custom Crew &amp; Tier Services
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const firstPkg = pricingPackages[0];
                                updateDayConfig(day.id, {
                                  mode: "PREBUILT_PACKAGE",
                                  selectedPackageName:
                                    day.selectedPackageName || firstPkg?.name || "Essential",
                                  selectedPackagePrice:
                                    day.selectedPackagePrice ||
                                    (firstPkg ? parseNumericPackagePrice(firstPkg.price) : 50000),
                                });
                              }}
                              className={cn(
                                "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer",
                                day.mode === "PREBUILT_PACKAGE"
                                  ? "bg-accent text-[#111111]"
                                  : "text-text-muted hover:text-primary"
                              )}
                            >
                              Pre-Built Package
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3">
                          <div className="text-right">
                            <span className="text-[10px] uppercase tracking-wider text-text-muted block">
                              Day {day.dayNumber} ({day.eventFunction}) Subtotal
                            </span>
                            <span className="font-mono text-sm font-bold text-accent tabular-nums">
                              PKR {(dayCalc?.daySubtotal || 0).toLocaleString("en-PK")}
                            </span>
                          </div>
                          {customDays.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeCustomEventDay(day.id)}
                              title={`Remove Day ${day.dayNumber}`}
                              className="p-1.5 rounded-lg border border-border text-text-muted hover:text-red-500 hover:border-red-500/40 transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {day.mode === "PREBUILT_PACKAGE" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-text-muted">
                              Select Pre-Built Package for Day {day.dayNumber} ({day.eventFunction})
                            </label>
                            <Select
                              value={day.selectedPackageName || ""}
                              onChange={(e) => {
                                const found = pricingPackages.find(
                                  (p) => p.name === e.target.value
                                );
                                updateDayConfig(day.id, {
                                  selectedPackageName: e.target.value,
                                  selectedPackagePrice: found
                                    ? parseNumericPackagePrice(found.price)
                                    : 60000,
                                });
                              }}
                            >
                              {pricingPackages.map((pkg) => (
                                <option key={pkg.id} value={pkg.name}>
                                  {pkg.name} ({pkg.price})
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-text-muted">
                              Package Day Rate (PKR)
                            </label>
                            <Input
                              type="number"
                              min={0}
                              step={5000}
                              value={day.selectedPackagePrice || 0}
                              onChange={(e) =>
                                updateDayConfig(day.id, {
                                  selectedPackagePrice: Math.max(0, Number(e.target.value || 0)),
                                })
                              }
                              className="font-mono tabular-nums"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Quick Tier-Based Package Presets for this specific day */}
                          <div className="flex flex-wrap items-center gap-1.5 pb-1">
                            <span className="text-[11px] font-semibold text-text-muted mr-1">
                              Quick Day Presets:
                            </span>
                            <button
                              type="button"
                              onClick={() => applyDayTierPreset(day.id, "TIER_1_2CAM")}
                              className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-primary hover:border-accent cursor-pointer"
                            >
                              1P + 1V @ 10k (PKR 20k)
                            </button>
                            <button
                              type="button"
                              onClick={() => applyDayTierPreset(day.id, "TIER_2_2CAM")}
                              className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-primary hover:border-accent cursor-pointer"
                            >
                              1P + 1V @ 15k (PKR 30k)
                            </button>
                            <button
                              type="button"
                              onClick={() => applyDayTierPreset(day.id, "TIER_3_4CAM")}
                              className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-primary hover:border-accent cursor-pointer"
                            >
                              2P + 2V @ 20k (PKR 80k)
                            </button>
                            <button
                              type="button"
                              onClick={() => applyDayTierPreset(day.id, "TIER_3_5CAM_DRONE")}
                              className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-primary hover:border-accent cursor-pointer"
                            >
                              2P + 2V + 1 Drone @ 20k (PKR 100k)
                            </button>
                            <button
                              type="button"
                              onClick={() => applyDayTierPreset(day.id, "MIXED_MEHNDI")}
                              className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-primary hover:border-accent cursor-pointer"
                            >
                              Mixed: 1P+1V @20k + 1V @10k (PKR 50k)
                            </button>
                          </div>

                          {/* Selected Services Array for this Event Day (Photographer, Videographer, Drone) */}
                          <div className="space-y-2.5">
                            {dayServices.map((srv) => {
                              const unitRate = resolveCategoryTierRate(
                                srv.cameraCategory,
                                srv.crewCategory
                              );
                              const lineTotal = Math.max(0, srv.quantity) * unitRate;
                              const { equipmentSpec, crewSpec } =
                                getEquipmentCrewSpecForService(
                                  srv.serviceType,
                                  srv.cameraCategory
                                );

                              return (
                                <div
                                  key={srv.id}
                                  className="rounded-xl border border-border bg-background p-3 space-y-2.5"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
                                    {/* Service Role Selector (Photographer / Videographer / Drone) */}
                                    <div className="md:col-span-3">
                                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                                        Service Role
                                      </label>
                                      <select
                                        value={srv.serviceType}
                                        onChange={(e) =>
                                          updateDayServiceItem(day.id, srv.id, {
                                            serviceType: e.target.value as EventServiceType,
                                          })
                                        }
                                        className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-primary"
                                      >
                                        <option value="Photographer">Photographer</option>
                                        <option value="Videographer">Videographer</option>
                                        <option value="Drone">Drone</option>
                                      </select>
                                    </div>

                                    {/* Equipment Category + Crew Tier Selector */}
                                    <div className="md:col-span-5">
                                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                                        Equipment Category + Crew Tier
                                      </label>
                                      <select
                                        value={srv.cameraCategory}
                                        onChange={(e) =>
                                          updateDayServiceItem(day.id, srv.id, {
                                            cameraCategory: e.target
                                              .value as CameraCategoryTier,
                                          })
                                        }
                                        className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-primary"
                                      >
                                        {UNIFIED_TIER_LIST.map((t) => (
                                          <option
                                            key={t.cameraCategory}
                                            value={t.cameraCategory}
                                          >
                                            Cat {t.tierNumber} + Tier {t.tierNumber} — PKR{" "}
                                            {t.ratePerCamPerDay.toLocaleString("en-PK")}/unit
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Crew / Camera Quantity Counter */}
                                    <div className="md:col-span-2">
                                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                                        Crew / Cam Qty
                                      </label>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateDayServiceItem(day.id, srv.id, {
                                              quantity: Math.max(1, srv.quantity - 1),
                                            })
                                          }
                                          className="h-7 w-7 rounded-lg border border-border bg-surface text-xs font-bold text-primary hover:border-accent cursor-pointer"
                                        >
                                          -
                                        </button>
                                        <span className="w-6 text-center font-mono text-xs font-bold text-primary tabular-nums">
                                          {srv.quantity}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateDayServiceItem(day.id, srv.id, {
                                              quantity: srv.quantity + 1,
                                            })
                                          }
                                          className="h-7 w-7 rounded-lg border border-border bg-surface text-xs font-bold text-primary hover:border-accent cursor-pointer"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>

                                    {/* Line Subtotal & Delete */}
                                    <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-2">
                                      <div className="text-right">
                                        <span className="text-[10px] text-text-muted block">
                                          Subtotal
                                        </span>
                                        <span className="font-mono text-xs font-bold text-accent tabular-nums">
                                          PKR {lineTotal.toLocaleString("en-PK")}
                                        </span>
                                      </div>
                                      {dayServices.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            removeServiceFromDay(day.id, srv.id)
                                          }
                                          title="Remove Service Line"
                                          className="p-1.5 rounded-lg border border-border text-text-muted hover:text-red-500 hover:border-red-500/40 transition-colors cursor-pointer"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Equipment & Crew Spec Subtitle */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50 text-[11px] text-text-muted">
                                    <span>
                                      Equipment: <strong className="text-primary">{equipmentSpec}</strong> · Crew:{" "}
                                      <strong className="text-primary">{crewSpec}</strong>
                                    </span>
                                    <span className="font-mono tabular-nums">
                                      {srv.quantity} × PKR {unitRate.toLocaleString("en-PK")} = PKR{" "}
                                      {lineTotal.toLocaleString("en-PK")}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Add Service Buttons for this Day (Photographer, Videographer, Drone) */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-[11px] font-semibold text-text-muted">
                              Add Service to Day {day.dayNumber}:
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                addServiceToDay(day.id, "Photographer", "CAT_2", 1)
                              }
                              className="inline-flex items-center gap-1 rounded-xl border border-dashed border-accent/60 bg-background px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-accent/15 transition-colors cursor-pointer"
                            >
                              <Camera size={12} className="text-accent" />
                              <span>+ Photographer</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                addServiceToDay(day.id, "Videographer", "CAT_2", 1)
                              }
                              className="inline-flex items-center gap-1 rounded-xl border border-dashed border-accent/60 bg-background px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-accent/15 transition-colors cursor-pointer"
                            >
                              <Video size={12} className="text-accent" />
                              <span>+ Videographer</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                addServiceToDay(day.id, "Drone", "CAT_3", 1)
                              }
                              className="inline-flex items-center gap-1 rounded-xl border border-dashed border-accent/60 bg-background px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-accent/15 transition-colors cursor-pointer"
                            >
                              <Plane size={12} className="text-accent" />
                              <span>+ Drone</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Global Package Mode */
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <label
                  htmlFor="packageInterest"
                  className="mb-1.5 block text-xs font-medium tracking-widest uppercase text-text-muted"
                >
                  Preferred Global Package
                </label>
                <Select
                  id="packageInterest"
                  name="packageInterest"
                  value={packageInterest}
                  onChange={(e) => setPackageInterest(e.target.value)}
                >
                  <option value="">Select Studio Package</option>
                  {pricingPackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.name}>
                      {pkg.name} ({pkg.price})
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label
                  htmlFor="services"
                  className="mb-1.5 block text-xs font-medium tracking-widest uppercase text-text-muted"
                >
                  Primary Coverage <span className="text-accent">*</span>
                </label>
                <Select
                  id="services"
                  name="services"
                  value={services}
                  onChange={(e) => setServices(e.target.value)}
                  required
                >
                  <option value="Full Royal Signature">
                    Full Royal Signature (Photo + Film + Drone)
                  </option>
                  <option value="Photo + Film Package">
                    Wedding Photography + Cinematic Film
                  </option>
                  <option value="Wedding Photography">Wedding Photography Only</option>
                  <option value="Cinematic Films">Cinematic Wedding Films Only</option>
                  <option value="Bridal & Couple Shoot">
                    Bridal &amp; Couple Signature Portraits
                  </option>
                  <option value="Drone & Crane Coverage">
                    4K Drone &amp; Crane Aerial Coverage
                  </option>
                  <option value="Commercial / Brand Shoot">
                    Commercial / Fashion / Corporate Shoot
                  </option>
                </Select>
              </div>

              <div className="sm:col-span-2 xl:col-span-1">
                <label
                  htmlFor="budget"
                  className="mb-1.5 block text-xs font-medium tracking-widest uppercase text-text-muted"
                >
                  Estimated Budget Range
                </label>
                <Select
                  id="budget"
                  name="budget"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                >
                  <option value="">Auto-calculated from selection</option>
                  <option value="PKR 50,000 – 100,000">PKR 50,000 – 100,000</option>
                  <option value="PKR 100,000 – 200,000">PKR 100,000 – 200,000</option>
                  <option value="PKR 200,000 – 300,000">PKR 200,000 – 300,000</option>
                  <option value="PKR 300,000+">PKR 300,000+</option>
                </Select>
              </div>
            </div>
          )}

          {/* Optional Add-Ons Checkboxes */}
          <div>
            <label className="mb-2 block text-xs font-medium tracking-widest uppercase text-text-muted">
              Optional Luxury Add-Ons (Albums, SDE Reel, LED Wall)
            </label>
            <div className="flex flex-wrap gap-2">
              {ADDON_OPTIONS.map((addon) => {
                const active = selectedAddons.includes(addon);
                return (
                  <button
                    key={addon}
                    type="button"
                    onClick={() => toggleAddon(addon)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all cursor-pointer",
                      active
                        ? "border-accent bg-accent/15 text-primary font-semibold"
                        : "border-border bg-surface text-text-muted hover:border-accent/40 hover:text-primary"
                    )}
                  >
                    {active && <Check size={13} className="text-accent" />}
                    <span>{addon}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {!showAllStepsAtOnce && (
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="w-full sm:w-auto"
              >
                <ArrowLeft size={15} />
                <span>Back to Schedule</span>
              </Button>
              <Button
                type="button"
                variant="accent"
                onClick={() => handleNextStep(3)}
                className="w-full sm:w-auto"
              >
                <span>Continue to Client Details</span>
                <ArrowRight size={15} />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* DETAILED PRICE BREAKDOWN COMPONENT + MODAL TRIGGER */}
      <PriceBreakdownTable
        quote={livePricingQuote}
        selectedAddons={selectedAddons}
        compact={false}
        onOpenModal={() => setIsBreakdownModalOpen(true)}
      />

      <PriceBreakdownModal
        isOpen={isBreakdownModalOpen}
        onClose={() => setIsBreakdownModalOpen(false)}
        quote={livePricingQuote}
        selectedAddons={selectedAddons}
        weddingDate={weddingDate}
        city={city}
      />

      {/* STEP 3: Client Contact Details & Submission */}
      {(showAllStepsAtOnce || step === 3) && (
        <div className="space-y-4">
          {showAllStepsAtOnce && (
            <div className="text-xs font-semibold tracking-widest uppercase text-accent border-b border-border pb-2">
              3. Client &amp; Couple Details
            </div>
          )}

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <label
                htmlFor="brideName"
                className="mb-1.5 block text-xs font-medium tracking-widest uppercase text-text-muted"
              >
                Bride / Primary Client Name <span className="text-accent">*</span>
              </label>
              <Input
                id="brideName"
                name="brideName"
                value={brideName}
                onChange={(e) => {
                  setBrideName(e.target.value);
                  clearFieldError("brideName");
                }}
                onBlur={() => {
                  if (!brideName.trim() || brideName.trim().length < 2) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      brideName:
                        "Please enter the Bride or primary client full name (min 2 characters).",
                    }));
                  }
                }}
                aria-invalid={Boolean(fieldErrors.brideName)}
                className={cn(
                  fieldErrors.brideName && "border-red-500/80 focus-visible:ring-red-500"
                )}
                required
                placeholder="Bride or primary client full name"
              />
              {fieldErrors.brideName && (
                <p className="mt-1 text-[11px] font-medium text-red-500">
                  {fieldErrors.brideName}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="groomName"
                className="mb-1.5 block text-xs font-medium tracking-widest uppercase text-text-muted"
              >
                Groom / Partner Name <span className="text-[10px] opacity-70">(Optional)</span>
              </label>
              <Input
                id="groomName"
                name="groomName"
                value={groomName}
                onChange={(e) => setGroomName(e.target.value)}
                placeholder="Groom's full name"
              />
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block text-xs font-medium tracking-widest uppercase text-text-muted"
              >
                Primary Phone <span className="text-accent">*</span>
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  clearFieldError("phone");
                }}
                onBlur={() => {
                  if (!phone.trim()) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      phone: "Primary phone number is required (e.g. 0308-4877073).",
                    }));
                  } else if (!validatePhoneValue(phone)) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      phone: "Please enter a valid 10–15 digit phone number.",
                    }));
                  }
                }}
                aria-invalid={Boolean(fieldErrors.phone)}
                className={cn(
                  fieldErrors.phone && "border-red-500/80 focus-visible:ring-red-500"
                )}
                required
                placeholder="0308-4877073"
              />
              {fieldErrors.phone && (
                <p className="mt-1 text-[11px] font-medium text-red-500">
                  {fieldErrors.phone}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="whatsappNumber"
                className="mb-1.5 block text-xs font-medium tracking-widest uppercase text-text-muted"
              >
                WhatsApp Number
              </label>
              <Input
                id="whatsappNumber"
                name="whatsappNumber"
                type="tel"
                value={whatsappNumber}
                onChange={(e) => {
                  setWhatsappNumber(e.target.value);
                  clearFieldError("whatsappNumber");
                }}
                onBlur={() => {
                  if (whatsappNumber.trim() && !validatePhoneValue(whatsappNumber)) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      whatsappNumber: "Please enter a valid WhatsApp number (10–15 digits).",
                    }));
                  }
                }}
                aria-invalid={Boolean(fieldErrors.whatsappNumber)}
                className={cn(
                  fieldErrors.whatsappNumber && "border-red-500/80 focus-visible:ring-red-500"
                )}
                placeholder="Same as phone if blank"
              />
              {fieldErrors.whatsappNumber && (
                <p className="mt-1 text-[11px] font-medium text-red-500">
                  {fieldErrors.whatsappNumber}
                </p>
              )}
            </div>
            <div className="sm:col-span-2 xl:col-span-1">
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-medium tracking-widest uppercase text-text-muted"
              >
                Email Address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError("email");
                }}
                onBlur={() => {
                  if (email.trim() && !validateEmailValue(email)) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      email: "Please enter a valid email address (e.g. name@example.com).",
                    }));
                  }
                }}
                aria-invalid={Boolean(fieldErrors.email)}
                className={cn(
                  fieldErrors.email && "border-red-500/80 focus-visible:ring-red-500"
                )}
                placeholder="your@email.com"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-[11px] font-medium text-red-500">
                  {fieldErrors.email}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="message"
              className="mb-1.5 block text-xs font-medium tracking-widest uppercase text-text-muted"
            >
              Your Story, Vision &amp; Special Requests
            </label>
            <Textarea
              id="message"
              name="message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us about your celebration timeline, preferred photographic style, album preferences, or any questions..."
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            {!showAllStepsAtOnce && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
                className="w-full sm:w-auto"
              >
                <ArrowLeft size={15} />
                <span>Back</span>
              </Button>
            )}
            <Button
              type="submit"
              variant="accent"
              size="lg"
              className="w-full flex-1"
              disabled={status === "loading"}
            >
              {status === "loading" ? (
                "Submitting Booking Inquiry..."
              ) : (
                <>
                  <span>
                    Complete Booking Inquiry (PKR{" "}
                    {livePricingQuote.grandTotal.toLocaleString("en-PK")})
                  </span>
                  <Send size={16} />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
