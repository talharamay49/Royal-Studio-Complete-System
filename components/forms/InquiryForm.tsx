"use client";

import { useState, useEffect, type FormEvent } from "react";
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  usePublicStudioProfile,
  usePublicWebsiteCMS,
} from "@/components/shared/StudioProfileContext";
import { cn } from "@/lib/utils";

const EVENT_FUNCTIONS_OPTIONS = [
  "Nikah",
  "Mehndi / Mayoun",
  "Barat",
  "Walima",
  "Bridal & Couple Portraits",
  "Commercial / Brand Shoot",
];

const ADDON_OPTIONS = [
  "4K Drone Aerial Coverage",
  "Same-Day Edit (SDE) Highlight Reel",
  "Extra Italian Flushmount Album",
  "Additional Senior Photographer",
  "Live SMD / LED Wall Feed",
];

interface InquirySuccessPayload {
  referenceId: string;
  clientName: string;
  weddingDate: string;
  city: string;
  packageInterest: string;
  functions: string[];
  addons: string[];
  whatsappUrl: string;
}

export default function InquiryForm() {
  const profile = usePublicStudioProfile();
  const { pricingPackages } = usePublicWebsiteCMS();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showAllStepsAtOnce, setShowAllStepsAtOnce] = useState<boolean>(false);

  const [brideName, setBrideName] = useState("");
  const [groomName, setGroomName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [email, setEmail] = useState("");
  const [eventType, setEventType] = useState("Wedding");
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>(["Barat", "Walima"]);
  const [weddingDate, setWeddingDate] = useState("");
  const [eventDaysCount, setEventDaysCount] = useState("2 Days");
  const [guestCount, setGuestCount] = useState("200 – 500 Guests");
  const [city, setCity] = useState("Burewala");
  const [venue, setVenue] = useState("");
  const [services, setServices] = useState("Full Royal Signature");
  const [packageInterest, setPackageInterest] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmation, setConfirmation] = useState<InquirySuccessPayload | null>(null);

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
    if (!value.trim()) return true; // Optional unless provided
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
      errors.phone = "Please enter a valid 10–15 digit phone number (e.g. 0308-4877073 or +923084877073).";
    }
    if (whatsappNumber.trim() && !validatePhoneValue(whatsappNumber)) {
      errors.whatsappNumber = "Please enter a valid WhatsApp number (10–15 digits) or leave blank.";
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

      if (pkgParam) setPackageInterest(pkgParam);
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
          functions: selectedFunctions,
          weddingDate,
          eventDaysCount,
          guestCount,
          city: city.trim() || "Burewala",
          venue: venue.trim(),
          services,
          packageInterest: packageInterest || "Custom Quote",
          addons: selectedAddons,
          budget,
          message: message.trim(),
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
          packageInterest: packageInterest || "Custom Quote",
          functions: selectedFunctions,
          addons: selectedAddons,
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
            Your event booking request has been synced to the{" "}
            <strong className="text-primary">
              {profile?.publicStudioName || profile?.studioName || "Royal Studio"}
            </strong>{" "}
            production desk. Our team will contact you within 24 hours.
          </p>
        </div>

        <div className="mx-auto max-w-md rounded-xl border border-border bg-background p-4 text-left text-xs space-y-2.5">
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
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Package &amp; Coverage:</span>
            <span className="font-semibold text-accent">
              {confirmation.packageInterest} · {services}
            </span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <span className="text-text-muted shrink-0">Functions:</span>
            <span className="font-medium text-primary text-right">
              {confirmation.functions.join(", ")}
            </span>
          </div>
          {confirmation.addons.length > 0 && (
            <div className="flex items-start justify-between gap-2">
              <span className="text-text-muted shrink-0">Add-Ons:</span>
              <span className="font-medium text-primary text-right">
                {confirmation.addons.join(", ")}
              </span>
            </div>
          )}
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
                { num: 2, title: "2. Package & Add-Ons" },
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
                <option value="Engagement">Nikah / Engagement</option>
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
                onChange={(e) => setEventDaysCount(e.target.value)}
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
                <span>Continue to Package &amp; Add-Ons</span>
                <ArrowRight size={15} />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Package Selection, Services & Add-Ons */}
      {(showAllStepsAtOnce || step === 2) && (
        <div className="space-y-4">
          {showAllStepsAtOnce && (
            <div className="text-xs font-semibold tracking-widest uppercase text-accent border-b border-border pb-2">
              2. Package Selection, Services &amp; Add-Ons
            </div>
          )}

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <label
                htmlFor="packageInterest"
                className="mb-1.5 block text-xs font-medium tracking-widest uppercase text-text-muted"
              >
                Preferred Package
              </label>
              <Select
                id="packageInterest"
                name="packageInterest"
                value={packageInterest}
                onChange={(e) => setPackageInterest(e.target.value)}
              >
                <option value="">Custom Bespoke Quote</option>
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
                <option value="Full Royal Signature">Full Royal Signature (Photo + Film + Drone)</option>
                <option value="Photo + Film Package">Wedding Photography + Cinematic Film</option>
                <option value="Wedding Photography">Wedding Photography Only</option>
                <option value="Cinematic Films">Cinematic Wedding Films Only</option>
                <option value="Bridal & Couple Shoot">Bridal &amp; Couple Signature Portraits</option>
                <option value="Drone & Crane Coverage">4K Drone &amp; Crane Aerial Coverage</option>
                <option value="Commercial / Brand Shoot">Commercial / Fashion / Corporate Shoot</option>
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
                <option value="">Select budget range</option>
                <option value="PKR 50,000 – 100,000">PKR 50,000 – 100,000</option>
                <option value="PKR 100,000 – 200,000">PKR 100,000 – 200,000</option>
                <option value="PKR 200,000 – 300,000">PKR 200,000 – 300,000</option>
                <option value="PKR 300,000+">PKR 300,000+</option>
                {budget &&
                  ![
                    "",
                    "PKR 50,000 – 100,000",
                    "PKR 100,000 – 200,000",
                    "PKR 200,000 – 300,000",
                    "PKR 300,000+",
                  ].includes(budget) && <option value={budget}>{budget}</option>}
              </Select>
            </div>
          </div>

          {/* Optional Add-Ons Checkboxes */}
          <div>
            <label className="mb-2 block text-xs font-medium tracking-widest uppercase text-text-muted">
              Optional Luxury Add-Ons
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
                      brideName: "Please enter the Bride or primary client full name (min 2 characters).",
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
                  <span>Complete Event Booking Inquiry</span>
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
