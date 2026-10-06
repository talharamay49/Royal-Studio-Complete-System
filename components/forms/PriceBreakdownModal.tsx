"use client";

import React from "react";
import {
  Calculator,
  X,
  Camera,
  Video,
  Plane,
  CheckCircle2,
  Calendar,
  Layers,
  MessageCircle,
} from "lucide-react";
import { type CalculatedMultiDayQuote } from "@/lib/pricing/unifiedPricing";
import { Button } from "@/components/ui/button";

export function buildWhatsAppQuoteUrl(
  quote: CalculatedMultiDayQuote,
  selectedAddons: string[],
  weddingDate?: string,
  city?: string,
  studioWhatsapp = "923084877073"
): string {
  const cleanNumber = studioWhatsapp.replace(/[^0-9]/g, "");
  const formattedWa = cleanNumber.startsWith("92")
    ? cleanNumber
    : `92${cleanNumber.replace(/^0/, "")}`;

  const dayLines = quote.days.map((day) => {
    if (day.mode === "PREBUILT_PACKAGE") {
      return `• *Day ${day.dayNumber} (${day.eventFunction}):* ${
        day.packageName || "Studio Package"
      } = PKR ${day.daySubtotal.toLocaleString("en-PK")}`;
    }
    const items = day.serviceLineItems
      .map(
        (li) =>
          `   - ${li.quantity}x ${li.serviceType} (Cat ${li.tierNumber} + Tier ${
            li.tierNumber
          } @ PKR ${li.unitPrice.toLocaleString("en-PK")}) = PKR ${li.lineTotal.toLocaleString(
            "en-PK"
          )}`
      )
      .join("\n");
    return `• *Day ${day.dayNumber} — ${day.eventFunction}*${
      day.date ? ` (${day.date})` : ""
    }\n${items}\n   *Day ${day.dayNumber} Subtotal:* PKR ${day.daySubtotal.toLocaleString(
      "en-PK"
    )}`;
  });

  const messageLines = [
    `*ROYAL STUDIO — CUSTOM EVENT QUOTE SUMMARY*`,
    weddingDate ? `Primary Date: ${weddingDate}` : "",
    city ? `City: ${city}` : "",
    `Configured Events: ${quote.daysCount} Day(s) · ${quote.totalCameraUnitsAcrossDays} Total Units`,
    ``,
    `*Day-by-Day Equipment & Crew Breakdown:*`,
    ...dayLines,
    selectedAddons.length > 0
      ? `\n*Luxury Add-Ons:* ${selectedAddons.join(", ")} (+PKR ${quote.addonsTotal.toLocaleString(
          "en-PK"
        )})`
      : "",
    ``,
    `*FINAL GRAND TOTAL: PKR ${quote.grandTotal.toLocaleString("en-PK")}*`,
    `Please confirm date availability and next steps to lock this booking.`,
  ].filter(Boolean);

  return `https://wa.me/${formattedWa}?text=${encodeURIComponent(
    messageLines.join("\n")
  )}`;
}

interface PriceBreakdownTableProps {
  quote: CalculatedMultiDayQuote;
  selectedAddons: string[];
  compact?: boolean;
  onOpenModal?: () => void;
  weddingDate?: string;
  city?: string;
  studioWhatsapp?: string;
}

export function PriceBreakdownTable({
  quote,
  selectedAddons,
  compact = false,
  onOpenModal,
  weddingDate,
  city,
  studioWhatsapp,
}: PriceBreakdownTableProps) {
  const whatsappQuoteUrl = buildWhatsAppQuoteUrl(
    quote,
    selectedAddons,
    weddingDate,
    city,
    studioWhatsapp
  );

  return (
    <div className="rounded-2xl border border-accent/50 bg-surface p-4 sm:p-6 space-y-4 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3.5">
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Calculator size={18} />
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent block">
              Real-Time Equipment &amp; Crew Pricing Engine
            </span>
            <h4 className="font-display text-lg sm:text-xl text-primary">
              Detailed Event Price Breakdown
            </h4>
            <p className="text-xs text-text-muted">
              {quote.daysCount} Event Day{quote.daysCount === 1 ? "" : "s"} ·{" "}
              {quote.totalPhotographersAcrossDays} Photographer
              {quote.totalPhotographersAcrossDays === 1 ? "" : "s"} ·{" "}
              {quote.totalVideographersAcrossDays} Videographer
              {quote.totalVideographersAcrossDays === 1 ? "" : "s"} ·{" "}
              {quote.totalDronesAcrossDays} Drone
              {quote.totalDronesAcrossDays === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5">
          <a
            href={whatsappQuoteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-bold text-white transition-colors whitespace-nowrap"
          >
            <MessageCircle size={13} />
            <span>Send Quote to WhatsApp</span>
          </a>
          {onOpenModal && (
            <button
              type="button"
              onClick={onOpenModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-accent/60 bg-background px-3 py-2 text-xs font-semibold text-primary hover:bg-accent hover:text-[#111111] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Layers size={13} />
              <span>Open Full Price Breakdown Modal</span>
            </button>
          )}
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-widest text-text-muted block">
              Final Grand Total
            </span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-accent tabular-nums">
              PKR {quote.grandTotal.toLocaleString("en-PK")}
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Calculation Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-background">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-surface/80 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              <th className="py-2.5 px-3">Event Day</th>
              <th className="py-2.5 px-3">Service (Equipment &amp; Crew)</th>
              <th className="py-2.5 px-3">Category / Tier</th>
              <th className="py-2.5 px-3 text-right">Rate / Unit</th>
              <th className="py-2.5 px-3 text-center">Qty</th>
              <th className="py-2.5 px-3 text-right">Line Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {quote.days.map((day) => {
              if (day.mode === "PREBUILT_PACKAGE") {
                return (
                  <tr key={day.dayId} className="hover:bg-surface/40">
                    <td className="py-3 px-3 font-semibold text-primary whitespace-nowrap">
                      Day {day.dayNumber} · {day.eventFunction}
                    </td>
                    <td className="py-3 px-3 text-primary">
                      {day.packageName || "Pre-Built Studio Package"}
                    </td>
                    <td className="py-3 px-3 text-text-muted">Pre-Built Package</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-text-muted">
                      PKR {day.daySubtotal.toLocaleString("en-PK")}
                    </td>
                    <td className="py-3 px-3 text-center font-mono tabular-nums font-semibold text-primary">
                      1
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-primary">
                      PKR {day.daySubtotal.toLocaleString("en-PK")}
                    </td>
                  </tr>
                );
              }

              const lines = day.serviceLineItems;
              if (lines.length === 0) {
                return (
                  <tr key={day.dayId}>
                    <td className="py-2.5 px-3 font-semibold text-primary">
                      Day {day.dayNumber} · {day.eventFunction}
                    </td>
                    <td colSpan={4} className="py-2.5 px-3 text-text-muted italic">
                      No services assigned to this event day yet
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-text-muted">
                      PKR 0
                    </td>
                  </tr>
                );
              }

              return (
                <React.Fragment key={day.dayId}>
                  {lines.map((line, lineIdx) => (
                    <tr key={line.id} className="hover:bg-surface/40">
                      <td className="py-2.5 px-3 align-top">
                        {lineIdx === 0 ? (
                          <div>
                            <span className="font-semibold text-primary block">
                              Day {day.dayNumber} · {day.eventFunction}
                            </span>
                            {day.date && (
                              <span className="text-[11px] text-text-muted font-mono">
                                {day.date}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-text-muted pl-2">
                            ↳ Day {day.dayNumber} ({day.eventFunction})
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 align-top">
                        <div className="font-semibold text-primary flex items-center gap-1.5">
                          {line.serviceType === "Photographer" && (
                            <Camera size={13} className="text-accent shrink-0" />
                          )}
                          {line.serviceType === "Videographer" && (
                            <Video size={13} className="text-accent shrink-0" />
                          )}
                          {line.serviceType === "Drone" && (
                            <Plane size={13} className="text-accent shrink-0" />
                          )}
                          <span>{line.serviceType}</span>
                        </div>
                        {!compact && (
                          <div className="text-[11px] text-text-muted mt-0.5">
                            {line.equipmentSpec} · {line.crewSpec}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 align-top">
                        <span className="font-medium text-primary">
                          Cat {line.tierNumber} + Tier {line.tierNumber}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 align-top text-right font-mono tabular-nums text-primary">
                        PKR {line.unitPrice.toLocaleString("en-PK")}
                      </td>
                      <td className="py-2.5 px-3 align-top text-center font-mono tabular-nums font-semibold text-primary">
                        {line.quantity}
                      </td>
                      <td className="py-2.5 px-3 align-top text-right font-mono tabular-nums font-semibold text-primary">
                        PKR {line.lineTotal.toLocaleString("en-PK")}
                      </td>
                    </tr>
                  ))}
                  {/* Per-Day Subtotal Row */}
                  <tr className="bg-surface/60 border-t border-border/60">
                    <td
                      colSpan={4}
                      className="py-2 px-3 text-[11px] font-semibold text-text-muted"
                    >
                      Day {day.dayNumber} ({day.eventFunction}) Subtotal —{" "}
                      {day.totalCameraUnits} Unit{day.totalCameraUnits === 1 ? "" : "s"} (
                      {day.headlineSummary})
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-[11px] font-bold text-primary tabular-nums">
                      {day.totalCameraUnits}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-xs font-bold text-accent tabular-nums">
                      PKR {day.daySubtotal.toLocaleString("en-PK")}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}

            {quote.addonsTotal > 0 && (
              <tr className="bg-surface/40">
                <td className="py-2.5 px-3 font-semibold text-primary">
                  Luxury Add-Ons
                </td>
                <td colSpan={4} className="py-2.5 px-3 text-text-muted">
                  {selectedAddons.join(" · ")}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-primary">
                  + PKR {quote.addonsTotal.toLocaleString("en-PK")}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-accent/50 bg-surface">
              <td colSpan={4} className="py-3 px-3 font-bold text-primary text-xs sm:text-sm">
                Final Grand Total ({quote.daysCount} Event Day
                {quote.daysCount === 1 ? "" : "s"})
              </td>
              <td className="py-3 px-3 text-center font-mono font-bold text-primary tabular-nums">
                {quote.totalCameraUnitsAcrossDays} Units
              </td>
              <td className="py-3 px-3 text-right font-mono text-sm sm:text-base font-bold text-accent tabular-nums">
                PKR {quote.grandTotal.toLocaleString("en-PK")}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

interface PriceBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: CalculatedMultiDayQuote;
  selectedAddons: string[];
  weddingDate?: string;
  city?: string;
  studioWhatsapp?: string;
}

export function PriceBreakdownModal({
  isOpen,
  onClose,
  quote,
  selectedAddons,
  weddingDate,
  city,
  studioWhatsapp,
}: PriceBreakdownModalProps) {
  if (!isOpen) return null;

  const whatsappQuoteUrl = buildWhatsAppQuoteUrl(
    quote,
    selectedAddons,
    weddingDate,
    city,
    studioWhatsapp
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Detailed Event Price Breakdown"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-background p-5 sm:p-7 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent block">
              Itemized Wedding &amp; Event Quote
            </span>
            <h3 className="font-display text-2xl sm:text-3xl text-primary">
              Complete Price Breakdown Table
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
              {weddingDate && (
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} className="text-accent" />
                  Primary Date: {weddingDate}
                </span>
              )}
              {city && <span>· City: {city}</span>}
              <span>
                · {quote.daysCount} Configured Event{quote.daysCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Price Breakdown Modal"
            className="rounded-xl border border-border bg-surface p-2 text-text-muted hover:border-accent hover:text-primary transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Full Calculation Table */}
        <PriceBreakdownTable
          quote={quote}
          selectedAddons={selectedAddons}
          compact={false}
          weddingDate={weddingDate}
          city={city}
          studioWhatsapp={studioWhatsapp}
        />

        {/* Tier Rate Key & Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border">
          <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 size={13} className="text-accent" />
              Cat 1 + Tier 1 = PKR 10,000/cam/day
            </span>
            <span>·</span>
            <span>Cat 2 + Tier 2 = PKR 15,000/cam/day</span>
            <span>·</span>
            <span>Cat 3 + Tier 3 = PKR 20,000/cam/day</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button asChild variant="whatsapp">
              <a
                href={whatsappQuoteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={15} />
                <span>Send My Custom Quote to WhatsApp</span>
              </a>
            </Button>
            <Button type="button" variant="accent" onClick={onClose}>
              Done Reviewing Breakdown
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
