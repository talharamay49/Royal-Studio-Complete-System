"use client";

import React, { useState, useMemo, type FormEvent } from "react";
import Link from "next/link";
import {
  Check,
  Sparkles,
  Sliders,
  Calendar,
  MapPin,
  Send,
  CheckCircle2,
  MessageCircle,
  ArrowRight,
  Plus,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import AnimatedSection from "@/components/shared/AnimatedSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  usePublicStudioProfile,
  usePublicWebsiteCMS,
} from "@/components/shared/StudioProfileContext";
import { cn } from "@/lib/utils";

const WEDDING_FUNCTIONS = [
  { id: "Nikah", label: "Nikah Ceremony" },
  { id: "Mehndi", label: "Mehndi / Mayoun" },
  { id: "Barat", label: "Barat Reception" },
  { id: "Walima", label: "Walima Banquet" },
  { id: "Bridal Shoot", label: "Signature Bridal & Couple Shoot" },
];

const LUXURY_ADDONS = [
  { id: "drone", label: "4K Drone Aerial Coverage", price: 25000 },
  { id: "sde", label: "Same-Day Edit (SDE) Highlight Reel", price: 30000 },
  { id: "album", label: "Extra Italian Flushmount Album", price: 35000 },
  { id: "photographer", label: "Additional Senior Photographer", price: 20000 },
  { id: "smd", label: "Live SMD / LED Wall Feed", price: 25000 },
];

function parseNumericPrice(priceStr: string): number {
  const digits = Number(String(priceStr || "").replace(/[^\d]/g, ""));
  return digits > 0 ? digits : 120000;
}

export default function PublicPricingGrid() {
  const profile = usePublicStudioProfile();
  const { pricingPackages } = usePublicWebsiteCMS();

  const defaultPkgName =
    pricingPackages.find((p) => p.highlighted)?.name ||
    pricingPackages[0]?.name ||
    "Premium";

  const [selectedPackageName, setSelectedPackageName] = useState<string>(defaultPkgName);
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>(["Barat", "Walima"]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>(["drone"]);

  // Express Booking State inside Pricing Page
  const [showExpressForm, setShowExpressForm] = useState<boolean>(false);
  const [brideName, setBrideName] = useState("");
  const [groomName, setGroomName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [city, setCity] = useState("Burewala");
  const [venue, setVenue] = useState("");
  const [notes, setNotes] = useState("");
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [bookingReceipt, setBookingReceipt] = useState<{
    referenceId: string;
    clientName: string;
    whatsappUrl: string;
  } | null>(null);

  const activePackage = useMemo(
    () =>
      pricingPackages.find((p) => p.name === selectedPackageName) ||
      pricingPackages[0],
    [pricingPackages, selectedPackageName]
  );

  const estimatedTotal = useMemo(() => {
    const base = activePackage ? parseNumericPrice(activePackage.price) : 120000;
    const extraFunctionsCount = Math.max(0, selectedFunctions.length - 2);
    const functionsBonus = extraFunctionsCount * 30000;
    const addonsTotal = selectedAddons.reduce((sum, id) => {
      const found = LUXURY_ADDONS.find((a) => a.id === id);
      return sum + (found ? found.price : 0);
    }, 0);
    return base + functionsBonus + addonsTotal;
  }, [activePackage, selectedFunctions, selectedAddons]);

  const selectedAddonLabels = useMemo(
    () =>
      selectedAddons
        .map((id) => LUXURY_ADDONS.find((a) => a.id === id)?.label)
        .filter(Boolean) as string[],
    [selectedAddons]
  );

  function handleSelectPackageCard(pkgName: string, scrollToConfigurator = true) {
    setSelectedPackageName(pkgName);
    if (scrollToConfigurator && typeof document !== "undefined") {
      const el = document.getElementById("package-customizer");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  function toggleFunction(fnId: string) {
    setSelectedFunctions((prev) =>
      prev.includes(fnId)
        ? prev.length > 1
          ? prev.filter((item) => item !== fnId)
          : prev
        : [...prev, fnId]
    );
  }

  function toggleAddon(addonId: string) {
    setSelectedAddons((prev) =>
      prev.includes(addonId)
        ? prev.filter((item) => item !== addonId)
        : [...prev, addonId]
    );
  }

  const contactQueryHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("package", selectedPackageName);
    if (selectedFunctions.length > 0) {
      params.set("functions", selectedFunctions.join(","));
    }
    if (selectedAddonLabels.length > 0) {
      params.set("addons", selectedAddonLabels.join(","));
    }
    params.set("estimate", `PKR ${estimatedTotal.toLocaleString()}`);
    return `/contact?${params.toString()}#inquiry-form`;
  }, [selectedPackageName, selectedFunctions, selectedAddonLabels, estimatedTotal]);

  async function handleExpressBookingSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage("");

    if (!brideName.trim() || !phone.trim() || !weddingDate) {
      setSubmitStatus("error");
      setErrorMessage("Please enter your name, phone/WhatsApp number, and event date.");
      return;
    }

    setSubmitStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brideName: brideName.trim(),
          groomName: groomName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          weddingDate,
          city: city.trim() || "Burewala",
          venue: venue.trim(),
          packageInterest: selectedPackageName,
          services: "Full Royal Signature",
          functions: selectedFunctions,
          addons: selectedAddonLabels,
          budget: `Estimated PKR ${estimatedTotal.toLocaleString()}`,
          message:
            notes.trim() ||
            `Selected ${selectedPackageName} package covering ${selectedFunctions.join(", ")}${
              selectedAddonLabels.length > 0
                ? ` with add-ons: ${selectedAddonLabels.join(", ")}`
                : ""
            }.`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setBookingReceipt({
          referenceId: data.referenceId || "RS-INQ",
          clientName: data.clientName || brideName.trim(),
          whatsappUrl: data.whatsappUrl || "",
        });
        setSubmitStatus("success");
      } else {
        setSubmitStatus("error");
        setErrorMessage(data?.error || "Could not submit your booking request. Please try again.");
      }
    } catch {
      setSubmitStatus("error");
      setErrorMessage("Network error. Please try again or connect on WhatsApp.");
    }
  }

  return (
    <div id="packages" className="scroll-mt-28 space-y-16">
      {/* 1. Interactive Package Tier Cards */}
      <div className="grid gap-8 lg:grid-cols-3">
        {pricingPackages.map((pkg, i) => {
          const isSelected = selectedPackageName === pkg.name;
          return (
            <AnimatedSection key={pkg.id} delay={i * 0.08}>
              <div
                onClick={() => handleSelectPackageCard(pkg.name, false)}
                className={cn(
                  "flex h-full flex-col rounded-2xl border p-8 shadow-premium transition-all duration-300 cursor-pointer",
                  isSelected
                    ? "border-accent ring-2 ring-accent/40 bg-primary text-secondary shadow-premium-lg -translate-y-1"
                    : pkg.highlighted
                    ? "border-accent/60 bg-background hover:border-accent"
                    : "border-border bg-background hover:border-accent/50"
                )}
              >
                <div className="mb-4 flex items-center justify-between gap-2">
                  {pkg.highlighted ? (
                    <span className="inline-block w-fit rounded-full bg-accent px-3 py-1 text-xs font-semibold tracking-widest uppercase text-[#111111]">
                      Most Popular
                    </span>
                  ) : (
                    <span className="text-xs font-medium tracking-widest uppercase opacity-60">
                      Luxury Tier
                    </span>
                  )}
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 border border-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                      <Check size={12} />
                      Selected
                    </span>
                  )}
                </div>

                <h2 className="font-display text-2xl sm:text-3xl">{pkg.name}</h2>
                <p className="mt-1 text-xs uppercase tracking-widest opacity-70">
                  {pkg.priceNote}
                </p>
                <p className="mt-2 font-display text-3xl sm:text-4xl text-accent">
                  {pkg.price}
                </p>
                <p className="mt-4 text-sm leading-relaxed opacity-85">
                  {pkg.description}
                </p>

                <ul className="mt-6 flex-1 space-y-3">
                  {pkg.features.map((feature, idx) => (
                    <li
                      key={`${pkg.id}-feat-${idx}`}
                      className="flex items-start gap-2.5 text-sm"
                    >
                      <Check size={16} className="mt-0.5 shrink-0 text-accent" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 space-y-2.5 pt-4 border-t border-current/10">
                  <Button
                    type="button"
                    variant={isSelected ? "accent" : "outline"}
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPackageCard(pkg.name, true);
                      setShowExpressForm(true);
                    }}
                  >
                    <span>
                      {isSelected ? `Customize & Book ${pkg.name}` : `Select ${pkg.name}`}
                    </span>
                    <ArrowRight size={15} />
                  </Button>

                  <Link
                    href={`/contact?package=${encodeURIComponent(pkg.name)}#inquiry-form`}
                    onClick={(e) => e.stopPropagation()}
                    className="block text-center text-xs font-medium text-accent hover:underline py-1"
                  >
                    Or open full inquiry form with {pkg.name} →
                  </Link>
                </div>
              </div>
            </AnimatedSection>
          );
        })}
      </div>

      {/* 2. Interactive Package Customizer & Express Booking Configurator */}
      <AnimatedSection>
        <div
          id="package-customizer"
          className="scroll-mt-28 rounded-2xl border border-border bg-background p-6 sm:p-10 shadow-premium-lg"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-border">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.2em] uppercase text-accent">
                <Sliders size={14} />
                Interactive Package Builder &amp; Quote Estimator
              </span>
              <h3 className="mt-1 font-display text-2xl sm:text-3xl text-primary">
                Tailor Your {selectedPackageName} Coverage
              </h3>
              <p className="mt-1 text-sm text-text-muted">
                Select your wedding functions and bespoke add-ons to calculate an instant estimate and reserve your dates.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {pricingPackages.map((pkg) => (
                <button
                  key={`pill-${pkg.id}`}
                  type="button"
                  onClick={() => setSelectedPackageName(pkg.name)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                    selectedPackageName === pkg.name
                      ? "bg-accent text-[#111111] border-accent shadow-xs"
                      : "bg-surface text-text-muted border-border hover:border-accent/50 hover:text-primary"
                  )}
                >
                  {pkg.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-12">
            {/* Left 7 Columns: Functions & Add-Ons */}
            <div className="lg:col-span-7 space-y-6">
              {/* Wedding Functions Multi-Select */}
              <div>
                <label className="mb-3 block text-xs font-semibold tracking-widest uppercase text-primary">
                  1. Select Events / Functions to Cover ({selectedFunctions.length} selected)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {WEDDING_FUNCTIONS.map((fn) => {
                    const active = selectedFunctions.includes(fn.id);
                    return (
                      <button
                        key={fn.id}
                        type="button"
                        onClick={() => toggleFunction(fn.id)}
                        className={cn(
                          "flex items-center justify-between px-4 py-3 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer",
                          active
                            ? "border-accent bg-accent/15 text-primary font-semibold"
                            : "border-border bg-surface text-text-muted hover:border-accent/40 hover:text-primary"
                        )}
                      >
                        <span>{fn.label}</span>
                        {active ? (
                          <Check size={15} className="text-accent shrink-0" />
                        ) : (
                          <Plus size={15} className="opacity-50 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Luxury Add-Ons */}
              <div>
                <label className="mb-3 block text-xs font-semibold tracking-widest uppercase text-primary">
                  2. Enhance with Signature Add-Ons
                </label>
                <div className="space-y-2.5">
                  {LUXURY_ADDONS.map((addon) => {
                    const active = selectedAddons.includes(addon.id);
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        onClick={() => toggleAddon(addon.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left text-xs transition-all cursor-pointer",
                          active
                            ? "border-accent bg-accent/15 text-primary font-semibold"
                            : "border-border bg-surface text-text-muted hover:border-accent/40 hover:text-primary"
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "flex h-4 w-4 items-center justify-center rounded border",
                              active
                                ? "border-accent bg-accent text-[#111111]"
                                : "border-border bg-background"
                            )}
                          >
                            {active && <Check size={11} />}
                          </span>
                          <span>{addon.label}</span>
                        </span>
                        <span className="font-mono text-accent">
                          +PKR {addon.price.toLocaleString()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Live Investment Summary & Instant Booking */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-accent/40 bg-surface p-6 shadow-premium space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-accent">
                      Selected Configuration
                    </div>
                    <div className="font-display text-2xl text-primary mt-0.5">
                      {selectedPackageName} Package
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-text-muted">
                      Estimated Total
                    </div>
                    <div className="font-display text-2xl sm:text-3xl font-semibold text-accent">
                      PKR {estimatedTotal.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-text-muted">
                    <span>Events Covered:</span>
                    <span className="font-semibold text-primary text-right">
                      {selectedFunctions.join(", ")}
                    </span>
                  </div>
                  <div className="flex justify-between text-text-muted">
                    <span>Selected Add-Ons:</span>
                    <span className="font-semibold text-primary text-right">
                      {selectedAddonLabels.length > 0
                        ? `${selectedAddonLabels.length} Add-On(s)`
                        : "Standard Package"}
                    </span>
                  </div>
                </div>

                {!showExpressForm && submitStatus !== "success" && (
                  <div className="space-y-2.5 pt-2">
                    <Button
                      type="button"
                      variant="accent"
                      className="w-full"
                      onClick={() => setShowExpressForm(true)}
                    >
                      <Sparkles size={16} />
                      <span>Book This Package Now</span>
                    </Button>

                    <Button asChild variant="outline" className="w-full">
                      <Link href={contactQueryHref}>
                        <span>Open Detailed Inquiry Form</span>
                        <ArrowRight size={15} />
                      </Link>
                    </Button>
                  </div>
                )}

                {/* Inline Express Booking Form */}
                {showExpressForm && submitStatus !== "success" && (
                  <form
                    onSubmit={handleExpressBookingSubmit}
                    className="space-y-3 pt-3 border-t border-border"
                    noValidate
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Express Date Reservation
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowExpressForm(false)}
                        className="text-[11px] text-text-muted hover:text-accent cursor-pointer"
                      >
                        Collapse
                      </button>
                    </div>

                    {submitStatus === "error" && errorMessage && (
                      <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-300">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Input
                        placeholder="Bride / Client Name *"
                        value={brideName}
                        onChange={(e) => setBrideName(e.target.value)}
                        required
                      />
                      <Input
                        placeholder="Groom Name (Optional)"
                        value={groomName}
                        onChange={(e) => setGroomName(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Input
                        type="tel"
                        placeholder="Phone / WhatsApp *"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                      <Input
                        type="email"
                        placeholder="Email (Optional)"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Input
                        type="date"
                        value={weddingDate}
                        onChange={(e) => setWeddingDate(e.target.value)}
                        required
                      />
                      <Input
                        placeholder="City *"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                      />
                    </div>

                    <Input
                      placeholder="Venue / Banquet Hall (Optional)"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                    />

                    <Textarea
                      rows={2}
                      placeholder="Any special notes or event timings..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />

                    <Button
                      type="submit"
                      variant="accent"
                      className="w-full"
                      disabled={submitStatus === "loading"}
                    >
                      {submitStatus === "loading" ? (
                        "Reserving Package..."
                      ) : (
                        <>
                          <span>Confirm Package Inquiry</span>
                          <Send size={15} />
                        </>
                      )}
                    </Button>
                  </form>
                )}

                {/* Express Booking Confirmation Receipt */}
                {submitStatus === "success" && bookingReceipt && (
                  <div className="rounded-xl border border-accent/40 bg-background p-4 text-center space-y-3">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent">
                      <CheckCircle2 size={22} />
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-accent">
                      Ref #{bookingReceipt.referenceId}
                    </div>
                    <h4 className="font-display text-xl text-primary">
                      {selectedPackageName} Package Reserved for Review!
                    </h4>
                    <p className="text-xs text-text-muted leading-relaxed">
                      Thank you, <strong className="text-primary">{bookingReceipt.clientName}</strong>. Our{" "}
                      {profile?.city || "Burewala"} booking team has received your customized package selection.
                    </p>
                    <div className="flex flex-col gap-2 pt-1">
                      {bookingReceipt.whatsappUrl && (
                        <Button asChild variant="whatsapp" size="sm" className="w-full">
                          <a
                            href={bookingReceipt.whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle size={15} />
                            <span>Chat on WhatsApp</span>
                          </a>
                        </Button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSubmitStatus("idle");
                          setBookingReceipt(null);
                          setShowExpressForm(false);
                        }}
                        className="inline-flex items-center justify-center gap-1 text-xs text-text-muted hover:text-accent py-1 cursor-pointer"
                      >
                        <RotateCcw size={12} />
                        <span>Modify Selection</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}
