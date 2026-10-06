"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  Printer,
  Download,
  X,
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  CreditCard,
  ShieldCheck,
  FileText,
} from "lucide-react";
import {
  CAMERA_CATEGORY_RATES,
  CREW_CATEGORY_RATES,
} from "@/components/admin/utils/calculations";
import { getEquipmentCrewSpecForService } from "@/lib/pricing/unifiedPricing";
import type {
  Event,
  Client,
  Quotation,
  EventDaySchedule,
  AdminProfile,
} from "@/components/admin/types";

interface AddonItem {
  id: string;
  label: string;
  shortLabel: string;
  price: number;
  category: string;
}

interface MilestoneItem {
  stage: string;
  description: string;
  dueDate: string;
  amount: number;
  isPaid: boolean;
}

interface ProposalPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadPDF: () => void;
  event: Event;
  client: Client;
  quotation: Quotation;
  daySchedules: EventDaySchedule[];
  profile: AdminProfile;
  addonCatalog: AddonItem[];
  selectedAddons: string[];
  daysTotal: number;
  addonsTotal: number;
  discountAmount: number;
  taxAmount: number;
  liveGrandTotal: number;
  paidAmount: number;
  remainingBalance: number;
  milestones: MilestoneItem[];
  isApproved: boolean;
  signatureName: string;
  clientNotes: string;
}

function formatPKR(amount: number): string {
  return `PKR ${Math.round(amount || 0).toLocaleString("en-PK")}`;
}

export default function ProposalPrintPreviewModal({
  isOpen,
  onClose,
  onDownloadPDF,
  event,
  client,
  quotation,
  daySchedules,
  profile,
  addonCatalog,
  selectedAddons,
  daysTotal,
  addonsTotal,
  discountAmount,
  taxAmount,
  liveGrandTotal,
  paidAmount,
  remainingBalance,
  milestones,
  isApproved,
  signatureName,
  clientNotes,
}: ProposalPrintPreviewModalProps) {
  const [showUnselectedAddons, setShowUnselectedAddons] = useState(false);
  const [printQrDataUrl, setPrintQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    const url = `${window.location.origin}/proposal/${encodeURIComponent(event.id)}`;
    QRCode.toDataURL(url, {
      width: 140,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((dataUrl) => setPrintQrDataUrl(dataUrl))
      .catch(() => {});
  }, [isOpen, event.id]);

  if (!isOpen) return null;

  const selectedAddonItems = addonCatalog.filter((a) =>
    selectedAddons.some((sel) => sel.toLowerCase() === a.label.toLowerCase())
  );

  const unselectedAddonItems = addonCatalog.filter(
    (a) => !selectedAddons.some((sel) => sel.toLowerCase() === a.label.toLowerCase())
  );

  const handleTriggerPrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm overflow-y-auto print:static print:bg-white print:overflow-visible"
      role="dialog"
      aria-modal="true"
      aria-label="A4 Print Preview Modal"
    >
      {/* Print-specific global rule so only the A4 sheet prints cleanly */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body * {
            visibility: hidden;
          }
          #proposal-a4-print-root,
          #proposal-a4-print-root * {
            visibility: visible;
          }
          #proposal-a4-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
        }
      `}</style>

      {/* Sticky Top Control Bar (Hidden when printing) */}
      <div className="sticky top-0 z-20 bg-[#121216]/95 border-b border-white/15 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#F5F2EB] flex items-center gap-2">
              <span>A4 Print Preview — Official Client Record</span>
              <span className="px-2 py-0.5 rounded bg-white/10 font-mono text-[10px] text-[#D4AF37]">
                {quotation.quotationNumber}
              </span>
            </div>
            <p className="text-[11px] text-[#A39E93]">
              Formatted for standard A4 paper (210mm × 297mm) · Includes day-by-day quote, add-on schedule &amp; payment milestones
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="inline-flex items-center gap-1.5 text-xs text-[#A39E93] hover:text-[#F5F2EB] cursor-pointer mr-2">
            <input
              type="checkbox"
              checked={showUnselectedAddons}
              onChange={(e) => setShowUnselectedAddons(e.target.checked)}
              className="rounded border-white/20"
            />
            <span>Show Optional Unselected Add-Ons</span>
          </label>

          <button
            type="button"
            onClick={handleTriggerPrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D4AF37] hover:opacity-90 text-[#111111] text-xs font-bold transition-opacity cursor-pointer shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print A4 Client Record</span>
          </button>

          <button
            type="button"
            onClick={onDownloadPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-[#F5F2EB] text-xs font-semibold transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* Main A4 Sheet Container */}
      <div className="py-8 px-3 sm:px-6 print:p-0">
        <div
          id="proposal-a4-print-root"
          className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white text-slate-900 rounded-sm shadow-2xl border border-slate-200 p-6 sm:p-10 md:p-12 space-y-6 print:border-0 print:shadow-none print:p-0"
        >
          {/* 1. Studio Letterhead Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 pb-5">
            <div className="flex items-start gap-3.5">
              <img
                src={profile.logo || "/RoyalLogo.png"}
                alt={profile.studioName || "Royal Studio"}
                className="w-14 h-14 object-contain rounded-lg border border-slate-200 p-1 bg-slate-950"
              />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-700">
                  WE CAPTURE YOUR MEMORIES
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {profile.studioName || "Royal Studio"}
                </h1>
                <div className="text-[11px] text-slate-600 mt-0.5 space-y-0.5">
                  <p>{profile.address || "Main Multan Road, Burewala, Punjab, Pakistan"}</p>
                  <p>
                    Tel: {profile.phone || "0308-4877073"}{" "}
                    {profile.phone2 ? ` / ${profile.phone2}` : ""} · Email:{" "}
                    {profile.email || "shakesurger@gmail.com"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 sm:justify-end">
              {printQrDataUrl && (
                <div className="border border-slate-200 rounded-lg p-1.5 bg-white text-center shrink-0">
                  <img
                    src={printQrDataUrl}
                    alt="Scan to view & accept digital proposal"
                    className="w-14 h-14 object-contain mx-auto"
                  />
                  <div className="text-[8px] font-bold uppercase tracking-wider text-slate-600 mt-0.5">
                    Scan Proposal
                  </div>
                </div>
              )}

              <div className="sm:text-right space-y-1">
                <span className="inline-block px-2.5 py-0.5 rounded bg-slate-900 text-amber-400 text-[10px] font-bold uppercase tracking-widest">
                  Official Proposal Record
                </span>
                <div className="text-sm font-mono font-bold text-slate-900 pt-0.5">
                  Ref: {quotation.quotationNumber}
                </div>
                <div className="text-[11px] text-slate-600">
                  Issued: {quotation.issueDate} · Valid Until: {quotation.validUntil}
                </div>
                <div className="pt-0.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isApproved
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-amber-100 text-amber-900 border border-amber-300"
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {isApproved ? "Digitally Approved & Confirmed" : event.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 1b. Compact Visual Lifecycle Timeline (Pending -> Approved -> Confirmed) */}
          {(() => {
            const isConfirmedStage =
              event.status === "Confirmed" ||
              event.status === "Shoot Scheduled" ||
              event.status === "Shoot Done" ||
              event.status === "Editing" ||
              event.status === "Delivered" ||
              event.status === "Completed";
            const isApprovedStage =
              Boolean(event.approvedByClient) ||
              isApproved ||
              isConfirmedStage;
            const stage: "PENDING" | "APPROVED" | "CONFIRMED" = isConfirmedStage
              ? "CONFIRMED"
              : isApprovedStage
              ? "APPROVED"
              : "PENDING";

            return (
              <div className="grid grid-cols-3 gap-2 text-[10px] border border-slate-200 rounded-lg p-2 bg-slate-50/60">
                <div
                  className={`rounded px-2.5 py-1.5 flex items-center justify-between border ${
                    stage === "PENDING"
                      ? "bg-amber-50 border-amber-400 text-slate-900 font-bold"
                      : "bg-emerald-50/70 border-emerald-200 text-emerald-900 font-semibold"
                  }`}
                >
                  <span>1. Pending (Issued)</span>
                  <span className="uppercase text-[9px]">
                    {stage === "PENDING" ? "Current" : "Done"}
                  </span>
                </div>
                <div
                  className={`rounded px-2.5 py-1.5 flex items-center justify-between border ${
                    stage === "APPROVED"
                      ? "bg-amber-50 border-amber-400 text-slate-900 font-bold"
                      : stage === "CONFIRMED"
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-900 font-semibold"
                      : "bg-white border-slate-200 text-slate-400"
                  }`}
                >
                  <span>2. Approved (Signed)</span>
                  <span className="uppercase text-[9px]">
                    {stage === "APPROVED"
                      ? "Current"
                      : stage === "CONFIRMED"
                      ? "Done"
                      : "Pending"}
                  </span>
                </div>
                <div
                  className={`rounded px-2.5 py-1.5 flex items-center justify-between border ${
                    stage === "CONFIRMED"
                      ? "bg-emerald-100 border-emerald-400 text-emerald-950 font-bold"
                      : "bg-white border-slate-200 text-slate-400"
                  }`}
                >
                  <span>3. Confirmed (Locked)</span>
                  <span className="uppercase text-[9px]">
                    {stage === "CONFIRMED" ? "Confirmed" : "Upcoming"}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* 2. Client & Event Summary Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs">
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Prepared For Client
              </div>
              <div className="text-sm font-bold text-slate-900">{client.name}</div>
              <div className="text-slate-600">Phone / WhatsApp: {client.phone}</div>
              {client.email && <div className="text-slate-600">Email: {client.email}</div>}
              {client.address && (
                <div className="text-slate-600">Address: {client.address}</div>
              )}
            </div>

            <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Celebration &amp; Event Details
              </div>
              <div className="text-sm font-bold text-slate-900">{event.title}</div>
              <div className="text-slate-600 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>
                  Primary Date: <strong>{event.eventDate}</strong> ({daySchedules.length || 1}{" "}
                  {daySchedules.length === 1 ? "Day" : "Days"} Scheduled)
                </span>
              </div>
              <div className="text-slate-600 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>
                  Venue: {event.venue}, {event.city}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Day-by-Day Quote & Production Crew Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-300 pb-1.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 block">
                  Section 01
                </span>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                  Day-by-Day Production Quote &amp; Crew Allocation
                </h2>
              </div>
              <div className="text-xs font-mono font-bold text-slate-800">
                Days Subtotal: {formatPKR(daysTotal)}
              </div>
            </div>

            {daySchedules.length > 0 ? (
              <div className="space-y-3">
                {daySchedules.map((day) => {
                  const camCat = day.cameraCategory || "CAT_2";
                  const crewCat = day.crewCategory || "CREW_CAT_2";
                  const structuredServices = day.services || [];

                  return (
                    <div
                      key={day.id}
                      className="border border-slate-200 rounded-lg overflow-hidden break-inside-avoid"
                    >
                      <div className="bg-slate-100 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-bold text-slate-900">
                            Day {day.dayNumber}: {day.eventType}
                          </span>
                          <span className="text-slate-400">|</span>
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <Calendar className="w-3 h-3 text-amber-700" />
                            {day.date}
                          </span>
                          <span className="text-slate-400">|</span>
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <Clock className="w-3 h-3 text-amber-700" />
                            {day.startTime} – {day.endTime} (Call: {day.callTime})
                          </span>
                          <span className="text-slate-400">|</span>
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <MapPin className="w-3 h-3 text-amber-700" />
                            {day.venue}
                          </span>
                        </div>
                        <div className="font-mono text-xs font-bold text-slate-900">
                          {formatPKR(day.customPrice)}
                        </div>
                      </div>

                      {structuredServices.length > 0 ? (
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-50 text-slate-500 uppercase text-[9px] border-b border-slate-200">
                            <tr>
                              <th className="py-1.5 px-3">Role</th>
                              <th className="py-1.5 px-3">Camera &amp; Crew Tier Specification</th>
                              <th className="py-1.5 px-3 text-center">Qty</th>
                              <th className="py-1.5 px-3 text-right">Unit Rate</th>
                              <th className="py-1.5 px-3 text-right">Line Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {structuredServices.map((srv) => {
                              const spec = getEquipmentCrewSpecForService(
                                srv.serviceType,
                                srv.cameraCategory
                              );
                              return (
                                <tr key={srv.id}>
                                  <td className="py-1.5 px-3 font-semibold text-slate-900">
                                    {srv.serviceType}
                                  </td>
                                  <td className="py-1.5 px-3 text-slate-600">
                                    <span className="font-semibold text-slate-800">
                                      {CAMERA_CATEGORY_RATES[srv.cameraCategory]?.shortLabel} +{" "}
                                      {CREW_CATEGORY_RATES[srv.crewCategory]?.shortLabel}
                                    </span>{" "}
                                    — {spec.equipmentSpec}
                                  </td>
                                  <td className="py-1.5 px-3 text-center font-mono font-bold text-slate-900">
                                    {srv.quantity}
                                  </td>
                                  <td className="py-1.5 px-3 text-right font-mono text-slate-600">
                                    {formatPKR(srv.tierPricePerUnit)}
                                  </td>
                                  <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                                    {formatPKR(srv.quantity * srv.tierPricePerUnit)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className="px-3.5 py-2 text-[11px] text-slate-700 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            Assigned Crew:{" "}
                            <strong>
                              {day.photographersCount ?? 1} Photographer(s),{" "}
                              {day.cinematographersCount ?? 1} Videographer(s)
                              {day.droneIncluded ? " + 1 Drone Aerial Unit" : ""}
                            </strong>{" "}
                            ({CAMERA_CATEGORY_RATES[camCat]?.shortLabel} +{" "}
                            {CREW_CATEGORY_RATES[crewCat]?.shortLabel})
                          </div>
                          {day.notes && <div className="italic text-slate-500">{day.notes}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg p-3.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">
                    {event.title} — Complete Studio Production Coverage
                  </div>
                  {event.notes && <div className="text-slate-600 mt-0.5">{event.notes}</div>}
                </div>
                <div className="font-mono font-bold text-slate-900">{formatPKR(daysTotal)}</div>
              </div>
            )}
          </div>

          {/* 4. Add-On Deliverables List */}
          <div className="space-y-2.5 break-inside-avoid">
            <div className="flex items-center justify-between border-b border-slate-300 pb-1.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 block">
                  Section 02
                </span>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                  Selected Luxury Add-Ons &amp; Deliverables ({selectedAddonItems.length})
                </h2>
              </div>
              <div className="text-xs font-mono font-bold text-slate-800">
                Add-Ons Subtotal: {formatPKR(addonsTotal)}
              </div>
            </div>

            {selectedAddonItems.length > 0 ? (
              <table className="w-full text-left text-[11px] border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[9px] border-b border-slate-200">
                  <tr>
                    <th className="py-1.5 px-3">Deliverable / Add-On Item</th>
                    <th className="py-1.5 px-3">Category</th>
                    <th className="py-1.5 px-3 text-center">Status</th>
                    <th className="py-1.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedAddonItems.map((addon) => (
                    <tr key={addon.id}>
                      <td className="py-1.5 px-3 font-semibold text-slate-900">
                        {addon.shortLabel || addon.label}
                      </td>
                      <td className="py-1.5 px-3 text-slate-600 uppercase text-[10px]">
                        {addon.category}
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold">
                          Included
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatPKR(addon.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-500">
                No optional add-on deliverables selected. Standard package coverage applies.
              </div>
            )}

            {showUnselectedAddons && unselectedAddonItems.length > 0 && (
              <div className="pt-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Optional Available Upgrades (Not Currently Selected)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px]">
                  {unselectedAddonItems.map((item) => (
                    <div
                      key={item.id}
                      className="border border-dashed border-slate-300 rounded px-2.5 py-1.5 flex items-center justify-between text-slate-600"
                    >
                      <span className="truncate pr-2">{item.shortLabel}</span>
                      <span className="font-mono font-semibold shrink-0">
                        +{formatPKR(item.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 5. Payment Milestone Schedule & Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-1 break-inside-avoid">
            {/* Left 7 Cols: Payment Schedule & Bank Info */}
            <div className="md:col-span-7 space-y-3">
              <div className="border-b border-slate-300 pb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 block">
                  Section 03
                </span>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                  Payment Schedule (30% / 60% / 10% Milestones)
                </h2>
              </div>

              <table className="w-full text-left text-[11px] border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[9px] border-b border-slate-200">
                  <tr>
                    <th className="py-1.5 px-3">Installment Stage</th>
                    <th className="py-1.5 px-3">Due Date / Status</th>
                    <th className="py-1.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {milestones.map((m, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900">{m.stage}</div>
                        <div className="text-[10px] text-slate-500">{m.description}</div>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.isPaid
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {m.isPaid ? "Completed" : `Due: ${m.dueDate}`}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {formatPKR(m.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {profile.bankName && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] space-y-0.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                    <span>Official Studio Bank Transfer Coordinates</span>
                  </div>
                  <div className="text-slate-700">
                    Bank: <strong>{profile.bankName}</strong> · Account Title:{" "}
                    <strong>{profile.accountTitle}</strong>
                  </div>
                  <div className="text-slate-600 font-mono">
                    Account #: {profile.accountNumber}
                    {profile.iban ? ` · IBAN: ${profile.iban}` : ""}
                  </div>
                </div>
              )}
            </div>

            {/* Right 5 Cols: Grand Total Summary Box */}
            <div className="md:col-span-5 flex flex-col justify-between border border-slate-300 rounded-lg p-4 bg-slate-50/70 space-y-4">
              <div className="space-y-2.5">
                <div className="border-b border-slate-300 pb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 block">
                    Section 04
                  </span>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                    Financial Summary
                  </h2>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Day-by-Day Coverage</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatPKR(daysTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Selected Add-Ons ({selectedAddonItems.length})</span>
                    <span className="font-mono font-semibold text-slate-900">
                      + {formatPKR(addonsTotal)}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Studio Special Discount</span>
                      <span className="font-mono">- {formatPKR(discountAmount)}</span>
                    </div>
                  )}
                  {taxAmount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Applicable Tax</span>
                      <span className="font-mono">+ {formatPKR(taxAmount)}</span>
                    </div>
                  )}

                  <div className="border-t-2 border-slate-900 pt-2 mt-2 flex justify-between items-baseline">
                    <span className="font-bold text-slate-900 uppercase text-xs">
                      Final Proposal Total
                    </span>
                    <span className="font-mono text-base font-bold text-slate-900">
                      {formatPKR(liveGrandTotal)}
                    </span>
                  </div>

                  <div className="flex justify-between text-emerald-700 pt-1">
                    <span>Advance / Payments Received</span>
                    <span className="font-mono font-semibold">{formatPKR(paidAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1.5">
                    <span>Remaining Balance</span>
                    <span className="font-mono">{formatPKR(remainingBalance)}</span>
                  </div>
                </div>
              </div>

              {(clientNotes || quotation.notes) && (
                <div className="text-[10px] text-slate-600 border-t border-slate-200 pt-2 space-y-1">
                  {clientNotes && (
                    <div>
                      <strong>Client Notes:</strong> {clientNotes}
                    </div>
                  )}
                  {quotation.notes && (
                    <div>
                      <strong>Studio Terms:</strong> {quotation.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 6. Signatures & Record Footer */}
          <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs break-inside-avoid">
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Client Acceptance &amp; Record Sign-Off
              </div>
              <div className="h-10 border-b border-slate-400 flex items-end pb-1 font-serif italic text-base text-slate-900">
                {event.approvedByClient || signatureName || client.name}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Authorized Client Signature</span>
                <span>
                  {event.approvedAt
                    ? `Signed: ${new Date(event.approvedAt).toLocaleDateString("en-GB")}`
                    : `Date: ${new Date().toLocaleDateString("en-GB")}`}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                For {profile.studioName || "Royal Studio"} Management
              </div>
              <div className="h-10 border-b border-slate-400 flex items-end justify-between pb-1">
                <span className="font-serif italic text-base text-slate-900">
                  {profile.studioName || "Royal Studio"} — Production Desk
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Studio Record
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Creative Director / Booking Manager</span>
                <span>Ref: {quotation.quotationNumber}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
