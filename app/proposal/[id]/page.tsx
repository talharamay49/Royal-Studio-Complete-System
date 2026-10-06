"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Download,
  MessageCircle,
  Calendar,
  MapPin,
  Clock,
  Camera,
  Video,
  Plane,
  ShieldCheck,
  FileCheck,
  Copy,
  Check,
  ArrowLeft,
  CreditCard,
  AlertCircle,
  Printer,
  History,
  Info,
  Eye,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  Film,
  QrCode,
} from "lucide-react";
import QRCode from "qrcode";
import { generateQuotationPDF } from "@/components/admin/utils/pdfGenerator";
import ProposalPrintPreviewModal from "@/components/proposal/ProposalPrintPreviewModal";
import ProposalQrShareModal from "@/components/proposal/ProposalQrShareModal";
import {
  CAMERA_CATEGORY_RATES,
  CREW_CATEGORY_RATES,
} from "@/components/admin/utils/calculations";
import { getEquipmentCrewSpecForService } from "@/lib/pricing/unifiedPricing";
import type {
  Event,
  Client,
  Quotation,
  Invoice,
  EventDaySchedule,
  Payment,
  AdminProfile,
} from "@/components/admin/types";

interface AddonItem {
  id: string;
  label: string;
  shortLabel: string;
  price: number;
  category: string;
}

interface ProposalData {
  event: Event;
  client: Client;
  quotation: Quotation;
  invoice: Invoice | null;
  daySchedules: EventDaySchedule[];
  payments: Payment[];
  profile: AdminProfile;
  addonCatalog: AddonItem[];
}

function formatPKR(amount: number): string {
  return `PKR ${Math.round(amount || 0).toLocaleString("en-PK")}`;
}

function formatDateTimeStamp(isoStr?: string): string {
  if (!isoStr) return "Not recorded yet";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ClientProposalPage() {
  const params = useParams<{ id: string }>();
  const proposalId = params?.id || "";

  const [data, setData] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [savingAddons, setSavingAddons] = useState(false);
  const [addonsSavedNotice, setAddonsSavedNotice] = useState(false);

  const [signatureName, setSignatureName] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [approving, setApproving] = useState(false);
  const [approvalSuccess, setApprovalSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  // Approval History toggle, Confirmation Dialog, QR Share & Interactive Progress states
  const [showApprovalHistory, setShowApprovalHistory] = useState(false);
  const [isConfirmApprovalOpen, setIsConfirmApprovalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [headerQrDataUrl, setHeaderQrDataUrl] = useState<string>("");
  const [inspectedStage, setInspectedStage] = useState<
    "PENDING" | "APPROVED" | "CONFIRMED" | null
  >(null);
  const [hasReviewedTerms, setHasReviewedTerms] = useState(true);
  const [hoveredMilestoneIdx, setHoveredMilestoneIdx] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !proposalId) return;
    const url = `${window.location.origin}/proposal/${encodeURIComponent(proposalId)}`;
    QRCode.toDataURL(url, {
      width: 140,
      margin: 1,
      color: { dark: "#0D0D0F", light: "#FFFFFF" },
    })
      .then((dataUrl) => setHeaderQrDataUrl(dataUrl))
      .catch(() => {});
  }, [proposalId]);

  useEffect(() => {
    if (!proposalId) return;
    setLoading(true);
    fetch(`/api/proposal/${encodeURIComponent(proposalId)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Proposal not found");
        }
        setData(json);
        setSelectedAddons(json.event?.selectedAddons || []);
        setSignatureName(json.event?.approvedByClient || json.client?.name || "");
      })
      .catch((err) => {
        setError(err.message || "Could not load proposal");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [proposalId]);

  const daysTotal = useMemo(() => {
    if (!data) return 0;
    if (data.daySchedules.length > 0) {
      return data.daySchedules.reduce(
        (sum, d) => sum + (Number(d.customPrice) || 0),
        0
      );
    }
    const existingAddonsFee = (data.event.selectedAddons || []).reduce(
      (sum, label) => {
        const match = data.addonCatalog.find(
          (a) => a.label.toLowerCase() === label.toLowerCase()
        );
        return sum + (match ? match.price : 0);
      },
      0
    );
    return Math.max(0, (data.event.packagePrice || 0) - existingAddonsFee);
  }, [data]);

  const addonsTotal = useMemo(() => {
    if (!data) return 0;
    return selectedAddons.reduce((sum, label) => {
      const match = data.addonCatalog.find(
        (a) => a.label.toLowerCase() === label.toLowerCase()
      );
      return sum + (match ? match.price : 0);
    }, 0);
  }, [data, selectedAddons]);

  const discountAmount = Number(data?.event?.discount || 0);
  const taxAmount = Number(data?.event?.tax || 0);
  const liveGrandTotal = Math.max(
    0,
    daysTotal + addonsTotal - discountAmount + taxAmount
  );

  const paidAmount = Number(data?.event?.totalClientPayments || 0);
  const remainingBalance = Math.max(0, liveGrandTotal - paidAmount);

  // 30% Advance, 60% Event End Day, 10% Album Delivery Milestones
  const milestones = useMemo(() => {
    const m1 = Math.round(liveGrandTotal * 0.3);
    const m2 = Math.round(liveGrandTotal * 0.6);
    const m3 = Math.max(0, liveGrandTotal - m1 - m2);

    const lastDayDate =
      data?.daySchedules && data.daySchedules.length > 0
        ? data.daySchedules[data.daySchedules.length - 1].date
        : data?.event?.eventDate || "Event End Day";

    return [
      {
        stage: "1. Booking Advance (30%)",
        description: "Due upon proposal acceptance to lock dates & production crew",
        dueDate: data?.quotation?.issueDate || "Upon Booking",
        amount: m1,
        isPaid: paidAmount >= m1 && m1 > 0,
        workflowBadge: "Pre-Production & Crew Lock",
        tooltipTitle: "Pre-Production, Storyboarding & Date Lock",
        tooltipSummary:
          "Reserves your celebration dates exclusively and assigns your dedicated Category 1/2/3 camera bodies, gimbals, drone unit, and senior production crew.",
        editingStageDetail:
          "Editing Prep: Creates your dedicated color-profile LUTs, custom audio/music moodboard, and multi-day shot schedule.",
        albumStageDetail:
          "Album Design Prep: Registers your selected album tier (Italian Leather / Acrylic Glass) and cover personalization preferences.",
        turnaroundNote: "Unlocked immediately upon 30% booking advance.",
      },
      {
        stage: "2. Event Completion (60%)",
        description: "Due on final celebration shoot day — initiates Editing & Album Design",
        dueDate: lastDayDate,
        amount: m2,
        isPaid: paidAmount >= m1 + m2 && m2 > 0,
        workflowBadge: "Editing & Initial Album Design Stage",
        tooltipTitle: "Master Post-Production, Color Grading & First Album Drafts",
        tooltipSummary:
          "Unlocks full studio post-production immediately after your final event shoot wraps.",
        editingStageDetail:
          "Editing Stage: Dual-NAS raw backup, AI-assisted culling, signature Royal Studio color grading, skin-tone retouching, and 4K cinematic highlight & full-length film editing.",
        albumStageDetail:
          "Album Design Stage: Curation of top 120–250 master stills and creation of your bespoke panoramic spread layouts for digital client proofing.",
        turnaroundNote: "Digital proofs & highlight teaser ready within 2–4 weeks.",
      },
      {
        stage: "3. Final Album & Master Delivery (10%)",
        description: "Due upon handover of graded 4K films & handcrafted luxury albums",
        dueDate: "On Final Delivery",
        amount: m3,
        isPaid: paidAmount >= liveGrandTotal && liveGrandTotal > 0,
        workflowBadge: "Final Album Binding & Master Handover",
        tooltipTitle: "Album Print Production, Binding & Final 4K Master Delivery",
        tooltipSummary:
          "Completed once you approve your digital album spreads and final edited wedding films.",
        editingStageDetail:
          "Editing Finalization: Master 4K/UHD cinema exports, multi-cam audio mastering, and high-resolution JPEG/TIFF archival gallery export.",
        albumStageDetail:
          "Album Design & Binding: Archival lustre/silk print production, flush-mount Italian or Acrylic glass binding, custom presentation box, and final handover.",
        turnaroundNote: "Delivered in bespoke keepsake packaging + cloud gallery.",
      },
    ];
  }, [liveGrandTotal, paidAmount, data]);

  function toggleAddon(label: string) {
    setAddonsSavedNotice(false);
    setSelectedAddons((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  }

  async function handleSaveAddons() {
    if (!data) return;
    setSavingAddons(true);
    setAddonsSavedNotice(false);
    try {
      const res = await fetch(`/api/proposal/${encodeURIComponent(proposalId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_ADDONS",
          selectedAddons,
        }),
      });
      const json = await res.json();
      if (res.ok && json.event) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                event: json.event,
                quotation: json.quotation || prev.quotation,
                invoice: json.invoice || prev.invoice,
              }
            : prev
        );
        setAddonsSavedNotice(true);
      }
    } finally {
      setSavingAddons(false);
    }
  }

  function handleOpenConfirmApprovalModal(e: React.FormEvent) {
    e.preventDefault();
    if (!data || !signatureName.trim()) return;
    setHasReviewedTerms(true);
    setIsConfirmApprovalOpen(true);
  }

  async function handleConfirmAndSubmitApproval() {
    if (!data || !signatureName.trim() || !hasReviewedTerms) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/proposal/${encodeURIComponent(proposalId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPROVE_PROPOSAL",
          clientSignatureName: signatureName.trim(),
          clientNotes: clientNotes.trim(),
          selectedAddons,
        }),
      });
      const json = await res.json();
      if (res.ok && json.event) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                event: json.event,
                quotation: json.quotation || prev.quotation,
                invoice: json.invoice || prev.invoice,
              }
            : prev
        );
        setApprovalSuccess(true);
        setIsConfirmApprovalOpen(false);
        setShowApprovalHistory(true);
      }
    } finally {
      setApproving(false);
    }
  }

  function handleDownloadPDF() {
    if (!data) return;
    const updatedQuotation: Quotation = {
      ...data.quotation,
      subtotal: daysTotal + addonsTotal,
      discount: discountAmount,
      tax: taxAmount,
      total: liveGrandTotal,
    };
    generateQuotationPDF(
      updatedQuotation,
      { ...data.event, packagePrice: liveGrandTotal },
      data.client,
      data.profile,
      data.daySchedules
    );
  }

  function handleCopyShareLink() {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] text-[#F5F2EB] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[#A39E93] tracking-wider uppercase">
            Loading Official Studio Proposal...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0D0D0F] text-[#F5F2EB] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#151519] p-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <h1 className="font-display text-2xl">Proposal Not Found</h1>
          <p className="text-xs text-[#A39E93]">
            {error || "This proposal link may have expired or been updated."}
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4AF37] text-[#111111] text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Create a New Custom Quote</span>
          </Link>
        </div>
      </div>
    );
  }

  const { event, client, quotation, daySchedules, profile, addonCatalog } = data;
  const isConfirmedLifecycle =
    event.status === "Confirmed" ||
    event.status === "Shoot Scheduled" ||
    event.status === "Shoot Done" ||
    event.status === "Editing" ||
    event.status === "Delivered" ||
    event.status === "Completed";

  const hasClientApproval =
    Boolean(event.approvedByClient) ||
    approvalSuccess ||
    isConfirmedLifecycle;

  const isApproved = isConfirmedLifecycle || hasClientApproval;

  // Determine the active lifecycle stage: 'PENDING' | 'APPROVED' | 'CONFIRMED'
  const lifecycleStage: "PENDING" | "APPROVED" | "CONFIRMED" = isConfirmedLifecycle
    ? "CONFIRMED"
    : hasClientApproval
    ? "APPROVED"
    : "PENDING";

  const lifecycleProgressPercent =
    lifecycleStage === "CONFIRMED" ? 100 : lifecycleStage === "APPROVED" ? 66 : 33;

  const rawWa = (
    profile.publicWhatsappNumber ||
    profile.whatsapp ||
    "03084877073"
  ).replace(/[^0-9]/g, "");
  const studioWa = rawWa.startsWith("92") ? rawWa : `92${rawWa.replace(/^0/, "")}`;

  const whatsappSummaryText = [
    `*ROYAL STUDIO — INTERACTIVE PROPOSAL (${quotation.quotationNumber})*`,
    `Client: ${client.name}`,
    `Event: ${event.title}`,
    `Primary Date: ${event.eventDate} · City: ${event.city}`,
    ``,
    `*Day-by-Day Coverage Breakdown:*`,
    ...(daySchedules.length > 0
      ? daySchedules.map(
          (d) =>
            `• Day ${d.dayNumber} (${d.eventType} - ${d.date}): ${
              d.notes || `${d.cameraCount || 2} Cameras`
            } = ${formatPKR(d.customPrice)}`
        )
      : [`• Full Event Coverage = ${formatPKR(daysTotal)}`]),
    ...(selectedAddons.length > 0
      ? [`*Selected Add-Ons:* ${selectedAddons.join(", ")} (${formatPKR(addonsTotal)})`]
      : []),
    ``,
    `*Final Proposal Total: ${formatPKR(liveGrandTotal)}*`,
    `Status: ${isApproved ? "Approved & Confirmed" : event.status}`,
  ].join("\n");

  const whatsappUrl = `https://wa.me/${studioWa}?text=${encodeURIComponent(
    whatsappSummaryText
  )}`;

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-[#F5F2EB] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Top Action Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 text-xs text-[#A39E93] hover:text-[#D4AF37] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Studio</span>
            </Link>
            <span className="text-white/20">·</span>
            <span className="text-xs text-[#A39E93]">
              Proposal Ref:{" "}
              <strong className="text-[#F5F2EB] font-mono">
                {quotation.quotationNumber}
              </strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] text-xs font-bold transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Share Link &amp; QR Code</span>
            </button>

            <button
              type="button"
              onClick={handleCopyShareLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/15 bg-[#151519] hover:border-[#D4AF37] text-xs font-semibold transition-colors cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Proposal Link Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Copy Shareable Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowApprovalHistory((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                showApprovalHistory
                  ? "border-[#D4AF37] bg-[#D4AF37] text-[#111111]"
                  : "border-white/15 bg-[#151519] text-[#F5F2EB] hover:border-[#D4AF37]"
              }`}
            >
              <History className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
              <span>Approval History</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrintPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D4AF37] hover:opacity-90 text-[#111111] text-xs font-bold transition-opacity cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Preview (A4)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF Estimate</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Discuss on WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Hero Proposal Header Card */}
        <div className="rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#17171C] to-[#121216] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
                {profile.studioName || "Royal Studio"} · Official Interactive Proposal
              </div>
              <h1 className="font-display text-2xl sm:text-4xl text-[#F5F2EB]">
                {event.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#A39E93] pt-1">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                  Primary Date: {event.eventDate}
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                  {event.venue}, {event.city}
                </span>
                <span>·</span>
                <span>
                  Prepared for: <strong className="text-[#F5F2EB]">{client.name}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              {/* Scannable QR Code Mini Card for Customer Mobile Review */}
              {headerQrDataUrl && (
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(true)}
                  className="hidden sm:flex items-center gap-2.5 p-2 rounded-xl border border-[#D4AF37]/30 bg-[#0D0D0F]/90 hover:border-[#D4AF37] transition-all text-left cursor-pointer group"
                  title="Click to enlarge QR Code & share proposal link with customer"
                >
                  <img
                    src={headerQrDataUrl}
                    alt="Proposal QR Code"
                    className="w-14 h-14 rounded-lg bg-white p-1 object-contain shrink-0"
                  />
                  <div className="pr-1 space-y-0.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1">
                      <QrCode className="w-3 h-3" />
                      <span>Scan QR</span>
                    </div>
                    <div className="text-[11px] font-semibold text-[#F5F2EB] leading-tight">
                      Review &amp; Accept
                      <br />
                      on Mobile
                    </div>
                  </div>
                </button>
              )}

              <div className="md:text-right space-y-1 shrink-0">
                <div className="text-[11px] uppercase tracking-wider text-[#A39E93]">
                  Proposal Status
                </div>
                <div className="text-sm font-bold text-[#D4AF37]">
                  {lifecycleStage === "CONFIRMED"
                    ? "Digitally Approved & Confirmed"
                    : lifecycleStage === "APPROVED"
                    ? "Client Approved · Pending Lock"
                    : `Pending Review (${event.status})`}
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-bold text-[#F5F2EB] pt-1">
                  {formatPKR(liveGrandTotal)}
                </div>
                <div className="text-[11px] text-[#A39E93]">
                  Valid until {quotation.validUntil}
                </div>
              </div>
            </div>
          </div>

          {/* Visual Lifecycle Progress Timeline (Pending -> Approved -> Confirmed) */}
          <div className="pt-5 border-t border-white/10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
                  Event &amp; Proposal Lifecycle
                </span>
                <span className="text-white/20">·</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    lifecycleStage === "CONFIRMED"
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : lifecycleStage === "APPROVED"
                      ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40"
                      : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      lifecycleStage === "CONFIRMED"
                        ? "bg-emerald-400"
                        : "bg-[#D4AF37] animate-pulse"
                    }`}
                  />
                  <span>
                    {lifecycleStage === "CONFIRMED"
                      ? `Confirmed (${event.status})`
                      : lifecycleStage === "APPROVED"
                      ? "Approved by Client"
                      : "Pending Client Review"}
                  </span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="text-[11px] font-mono text-[#A39E93]">
                  Stage{" "}
                  <strong className="text-[#F5F2EB]">
                    {lifecycleStage === "CONFIRMED"
                      ? "3"
                      : lifecycleStage === "APPROVED"
                      ? "2"
                      : "1"}
                  </strong>{" "}
                  of 3 ({lifecycleProgressPercent}% Complete)
                </div>

                {/* Persistent 'Approval History' Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowApprovalHistory((prev) => !prev)}
                  aria-expanded={showApprovalHistory}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                    showApprovalHistory
                      ? "border-[#D4AF37] bg-[#D4AF37] text-[#111111] shadow-sm"
                      : "border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20"
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Approval History</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                      showApprovalHistory
                        ? "bg-[#111111]/20 text-[#111111]"
                        : "bg-white/10 text-[#F5F2EB]"
                    }`}
                  >
                    {event.approvedAt || isApproved ? "Viewed & Signed" : "Viewed"}
                  </span>
                  {showApprovalHistory ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:border-[#D4AF37] text-[11px] font-semibold text-[#F5F2EB] transition-colors cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>QR Code</span>
                </button>
              </div>
            </div>

            {/* Collapsible Approval History Panel (Displays Viewed & Accepted Timestamps + Signature Name) */}
            {showApprovalHistory && (
              <div className="rounded-xl border border-[#D4AF37]/35 bg-[#0D0D0F]/95 p-4 sm:p-5 space-y-4 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#D4AF37]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">
                      Proposal View &amp; Digital Approval History
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#A39E93] font-mono">
                    Ref: {quotation.quotationNumber}
                  </span>
                </div>

                {/* Primary Viewed & Accepted Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Proposal Viewed Record */}
                  <div className="rounded-xl border border-white/10 bg-[#151519] p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Proposal Viewed by Client</span>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
                        Recorded
                      </span>
                    </div>
                    <div className="text-xs font-bold text-[#F5F2EB]">
                      Viewer / Signature Name:{" "}
                      <span className="text-[#D4AF37]">
                        {event.approvedByClient || signatureName || client.name}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-[#A39E93]">
                      First Viewed: {formatDateTimeStamp(event.proposalFirstViewedAt || new Date().toISOString())}
                    </div>
                    {event.proposalLastViewedAt && (
                      <div className="text-[10px] font-mono text-[#A39E93]/80">
                        Latest Activity: {formatDateTimeStamp(event.proposalLastViewedAt)}
                        {event.proposalViewCount
                          ? ` (${event.proposalViewCount} ${
                              event.proposalViewCount === 1 ? "session" : "sessions"
                            })`
                          : ""}
                      </div>
                    )}
                  </div>

                  {/* Proposal Accepted Record */}
                  <div
                    className={`rounded-xl border p-3.5 space-y-1.5 ${
                      event.approvedAt || isApproved
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-white/10 bg-[#151519]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Proposal Accepted &amp; Signed</span>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          event.approvedAt || isApproved
                            ? "bg-emerald-400 text-slate-950"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {event.approvedAt || isApproved ? "Digitally Signed" : "Awaiting Acceptance"}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-[#F5F2EB]">
                      Digital Signature Name:{" "}
                      <span className="text-emerald-300 font-serif italic text-sm">
                        {event.approvedByClient ||
                          (isApproved ? signatureName || client.name : "Not signed yet")}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-[#A39E93]">
                      Accepted Timestamp:{" "}
                      {event.approvedAt
                        ? formatDateTimeStamp(event.approvedAt)
                        : isApproved
                        ? formatDateTimeStamp(event.updatedDate || event.createdDate)
                        : "Pending client sign-off"}
                    </div>
                  </div>
                </div>

                {/* Detailed Audit Trail List */}
                {event.approvalHistory && event.approvalHistory.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#A39E93]">
                      Chronological Audit Trail
                    </div>
                    <div className="space-y-1.5">
                      {event.approvalHistory.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-3 py-2 rounded-lg bg-[#151519]/90 border border-white/5 text-[11px]"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                entry.action === "ACCEPTED"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : entry.action === "VIEWED"
                                  ? "bg-[#D4AF37]/20 text-[#D4AF37]"
                                  : "bg-white/10 text-[#F5F2EB]"
                              }`}
                            >
                              {entry.action}
                            </span>
                            <span className="text-[#F5F2EB] font-medium">
                              {entry.details}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] font-mono text-[#A39E93] shrink-0">
                            {entry.signatureName && (
                              <span className="text-[#D4AF37]">
                                Signer: {entry.signatureName}
                              </span>
                            )}
                            <span>{formatDateTimeStamp(entry.timestamp)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Interactive Visual Progress Bar with Step Labels & Status Indicator Icons */}
            {(() => {
              const activeInspect = inspectedStage || lifecycleStage;
              const inspectPercent =
                activeInspect === "CONFIRMED"
                  ? 100
                  : activeInspect === "APPROVED"
                  ? 66
                  : 33;

              const steps: {
                id: "PENDING" | "APPROVED" | "CONFIRMED";
                stepNum: string;
                label: string;
                shortStatus: string;
                summary: string;
              }[] = [
                {
                  id: "PENDING",
                  stepNum: "01",
                  label: "Pending",
                  shortStatus:
                    lifecycleStage === "PENDING" ? "Current Stage" : "Completed",
                  summary: `Proposal ${quotation.quotationNumber} issued on ${quotation.issueDate}. Customize add-ons and review day-by-day coverage.`,
                },
                {
                  id: "APPROVED",
                  stepNum: "02",
                  label: "Approved",
                  shortStatus:
                    lifecycleStage === "APPROVED"
                      ? "Current Stage"
                      : lifecycleStage === "CONFIRMED"
                      ? "Completed"
                      : "Awaiting Sign-Off",
                  summary:
                    event.approvedByClient || isApproved
                      ? `Digitally signed & accepted by ${
                          event.approvedByClient || signatureName || client.name
                        }${
                          event.approvedAt
                            ? ` on ${formatDateTimeStamp(event.approvedAt)}`
                            : ""
                        }.`
                      : "Awaiting client digital signature in Section 04 below to approve the quotation scope.",
                },
                {
                  id: "CONFIRMED",
                  stepNum: "03",
                  label: "Confirmed",
                  shortStatus:
                    lifecycleStage === "CONFIRMED" ? "Current Stage" : "Upcoming",
                  summary:
                    lifecycleStage === "CONFIRMED"
                      ? `Booking Confirmed (${event.status}). All ${
                          daySchedules.length || 1
                        } celebration day(s), camera tiers, and senior crew are locked.`
                      : "Unlocks upon digital approval & 30% booking advance to lock your dates in the studio schedule.",
                },
              ];

              return (
                <div className="rounded-xl border border-white/10 bg-[#0D0D0F]/80 p-4 space-y-3">
                  {/* Interactive Stepper Nodes + Progress Track */}
                  <div className="relative pt-1 pb-2">
                    <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          lifecycleStage === "CONFIRMED"
                            ? "bg-gradient-to-r from-[#D4AF37] via-amber-400 to-emerald-400"
                            : "bg-gradient-to-r from-[#D4AF37] to-amber-400"
                        }`}
                        style={{ width: `${inspectPercent}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {steps.map((st) => {
                        const isLiveCurrent = lifecycleStage === st.id;
                        const isReached =
                          st.id === "PENDING" ||
                          (st.id === "APPROVED" &&
                            (lifecycleStage === "APPROVED" ||
                              lifecycleStage === "CONFIRMED")) ||
                          (st.id === "CONFIRMED" && lifecycleStage === "CONFIRMED");
                        const isSelected = activeInspect === st.id;

                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setInspectedStage(st.id)}
                            onMouseEnter={() => setInspectedStage(st.id)}
                            onMouseLeave={() => setInspectedStage(null)}
                            className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? "border-[#D4AF37] bg-[#D4AF37]/15 shadow-sm"
                                : isReached
                                ? "border-emerald-500/30 bg-emerald-500/5 hover:border-[#D4AF37]/50"
                                : "border-white/10 bg-[#151519]/70 opacity-75 hover:opacity-100"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                  isLiveCurrent
                                    ? "bg-[#D4AF37] text-[#111111]"
                                    : isReached
                                    ? "bg-emerald-500 text-slate-950"
                                    : "bg-white/10 text-[#A39E93]"
                                }`}
                              >
                                {st.id === "PENDING" &&
                                  (lifecycleStage !== "PENDING" ? (
                                    <Check className="w-3.5 h-3.5" />
                                  ) : (
                                    <Clock className="w-3.5 h-3.5" />
                                  ))}
                                {st.id === "APPROVED" &&
                                  (lifecycleStage === "CONFIRMED" ? (
                                    <Check className="w-3.5 h-3.5" />
                                  ) : (
                                    <FileCheck className="w-3.5 h-3.5" />
                                  ))}
                                {st.id === "CONFIRMED" && (
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                )}
                              </span>
                              <div className="truncate">
                                <div className="text-xs font-bold text-[#F5F2EB] flex items-center gap-1">
                                  <span>
                                    {st.stepNum}. {st.label}
                                  </span>
                                </div>
                                <div className="text-[10px] text-[#A39E93] truncate">
                                  {st.shortStatus}
                                </div>
                              </div>
                            </div>
                            {isLiveCurrent && (
                              <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Interactive Stage Status Callout Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#151519] border border-white/5 text-xs">
                    <div className="flex items-center gap-2 text-[#F5F2EB]">
                      <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                      <span>
                        {steps.find((s) => s.id === activeInspect)?.summary}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[#D4AF37] shrink-0">
                      Click or hover any step above to inspect
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* 3 Lifecycle Stage Cards: Pending, Approved, Confirmed */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Stage 1: Pending */}
              {(() => {
                const isCurrent = lifecycleStage === "PENDING";
                const isCompleted =
                  lifecycleStage === "APPROVED" || lifecycleStage === "CONFIRMED";
                return (
                  <div
                    className={`rounded-xl border p-3.5 transition-all ${
                      isCurrent
                        ? "border-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_20px_rgba(212,175,55,0.12)]"
                        : isCompleted
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-white/10 bg-[#0D0D0F]/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isCurrent
                              ? "bg-[#D4AF37] text-[#111111]"
                              : isCompleted
                              ? "bg-emerald-500 text-slate-950"
                              : "bg-white/10 text-[#A39E93]"
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">
                          1. Pending
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isCurrent
                            ? "bg-[#D4AF37] text-[#111111]"
                            : "bg-emerald-500/20 text-emerald-300"
                        }`}
                      >
                        {isCurrent ? "Current" : "Completed"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A39E93] leading-relaxed">
                      Proposal issued for client review &amp; interactive add-on customization.
                    </p>
                    <div className="mt-2 pt-2 border-t border-white/5 text-[10px] font-mono text-[#D4AF37]">
                      Issued: {quotation.issueDate}
                    </div>
                  </div>
                );
              })()}

              {/* Stage 2: Approved */}
              {(() => {
                const isCurrent = lifecycleStage === "APPROVED";
                const isCompleted = lifecycleStage === "CONFIRMED";
                const isActiveOrDone = isCurrent || isCompleted;
                return (
                  <div
                    className={`rounded-xl border p-3.5 transition-all ${
                      isCurrent
                        ? "border-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_20px_rgba(212,175,55,0.12)]"
                        : isCompleted
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-white/10 bg-[#0D0D0F]/60 opacity-75"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isCurrent
                              ? "bg-[#D4AF37] text-[#111111]"
                              : isCompleted
                              ? "bg-emerald-500 text-slate-950"
                              : "bg-white/10 text-[#A39E93]"
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <FileCheck className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">
                          2. Approved
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isCurrent
                            ? "bg-[#D4AF37] text-[#111111]"
                            : isCompleted
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-white/10 text-[#A39E93]"
                        }`}
                      >
                        {isCurrent
                          ? "Current"
                          : isCompleted
                          ? "Approved"
                          : "Awaiting Sign-Off"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A39E93] leading-relaxed">
                      Client digital signature &amp; acceptance of day-by-day quote and deliverables.
                    </p>
                    <div className="mt-2 pt-2 border-t border-white/5 text-[10px] font-mono text-[#D4AF37] truncate">
                      {isActiveOrDone
                        ? `Signed: ${event.approvedByClient || signatureName || client.name}`
                        : "Action: Sign in Section 04 below"}
                    </div>
                  </div>
                );
              })()}

              {/* Stage 3: Confirmed */}
              {(() => {
                const isCurrent = lifecycleStage === "CONFIRMED";
                return (
                  <div
                    className={`rounded-xl border p-3.5 transition-all ${
                      isCurrent
                        ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.14)]"
                        : "border-white/10 bg-[#0D0D0F]/60 opacity-75"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isCurrent
                              ? "bg-emerald-500 text-slate-950"
                              : "bg-white/10 text-[#A39E93]"
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">
                          3. Confirmed
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isCurrent
                            ? "bg-emerald-400 text-slate-950"
                            : "bg-white/10 text-[#A39E93]"
                        }`}
                      >
                        {isCurrent ? "Confirmed" : "Upcoming"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A39E93] leading-relaxed">
                      Celebration dates, camera tiers &amp; production crew locked in studio schedule.
                    </p>
                    <div className="mt-2 pt-2 border-t border-white/5 text-[10px] font-mono text-emerald-300">
                      {isCurrent
                        ? `Lifecycle: ${event.status} · ${daySchedules.length || 1} Day(s) Locked`
                        : "Unlocks upon approval & booking lock"}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {isApproved && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-emerald-300">
                    Proposal Digitally Approved &amp; Booking Confirmed
                  </div>
                  <div className="text-emerald-200/80">
                    Signed by{" "}
                    <strong>{event.approvedByClient || client.name}</strong>
                    {event.approvedAt
                      ? ` on ${new Date(event.approvedAt).toLocaleDateString("en-GB")}`
                      : ""}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer shrink-0"
              >
                Download Confirmed Proposal PDF
              </button>
            </div>
          )}
        </div>

        {/* Itemized Day-by-Day Package & Services Breakdown */}
        <div className="rounded-2xl border border-white/10 bg-[#151519] p-6 sm:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37] block">
                Section 01 · Production Coverage
              </span>
              <h2 className="font-display text-xl sm:text-2xl text-[#F5F2EB]">
                Itemized Day-by-Day Equipment &amp; Crew Breakdown
              </h2>
            </div>
            <div className="text-xs text-[#A39E93]">
              {daySchedules.length || 1} Scheduled Celebration{" "}
              {daySchedules.length === 1 ? "Day" : "Days"}
            </div>
          </div>

          {daySchedules.length > 0 ? (
            <div className="space-y-4">
              {daySchedules.map((day) => {
                const camCat = day.cameraCategory || "CAT_2";
                const crewCat = day.crewCategory || "CREW_CAT_2";
                const structuredServices = day.services || [];

                return (
                  <div
                    key={day.id}
                    className="rounded-xl border border-white/10 bg-[#0D0D0F] p-4 sm:p-5 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div>
                        <div className="text-sm font-bold text-[#F5F2EB]">
                          Day {day.dayNumber}: {day.eventType}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#A39E93] mt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#D4AF37]" />
                            {day.date}
                          </span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#D4AF37]" />
                            {day.startTime} – {day.endTime} (Call: {day.callTime})
                          </span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#D4AF37]" />
                            {day.venue}
                          </span>
                        </div>
                      </div>
                      <div className="sm:text-right">
                        <span className="text-[10px] uppercase tracking-wider text-[#A39E93] block">
                          Day {day.dayNumber} Subtotal
                        </span>
                        <span className="font-mono text-base font-bold text-[#D4AF37]">
                          {formatPKR(day.customPrice)}
                        </span>
                      </div>
                    </div>

                    {structuredServices.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="text-[10px] uppercase tracking-wider text-[#A39E93] border-b border-white/10">
                            <tr>
                              <th className="py-2 pr-3">Service Role</th>
                              <th className="py-2 px-3">Equipment &amp; Crew Tier</th>
                              <th className="py-2 px-3 text-center">Qty</th>
                              <th className="py-2 px-3 text-right">Tier Rate</th>
                              <th className="py-2 pl-3 text-right">Line Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {structuredServices.map((srv) => {
                              const spec = getEquipmentCrewSpecForService(
                                srv.serviceType,
                                srv.cameraCategory
                              );
                              return (
                                <tr key={srv.id}>
                                  <td className="py-2.5 pr-3 font-semibold text-[#F5F2EB]">
                                    <span className="inline-flex items-center gap-1.5">
                                      {srv.serviceType === "Photographer" && (
                                        <Camera className="w-3.5 h-3.5 text-[#D4AF37]" />
                                      )}
                                      {srv.serviceType === "Videographer" && (
                                        <Video className="w-3.5 h-3.5 text-[#D4AF37]" />
                                      )}
                                      {srv.serviceType === "Drone" && (
                                        <Plane className="w-3.5 h-3.5 text-[#D4AF37]" />
                                      )}
                                      {srv.serviceType}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-[#A39E93]">
                                    <div className="text-[#F5F2EB] font-medium">
                                      {CAMERA_CATEGORY_RATES[srv.cameraCategory]?.shortLabel} +{" "}
                                      {CREW_CATEGORY_RATES[srv.crewCategory]?.shortLabel}
                                    </div>
                                    <div className="text-[11px]">
                                      {spec.equipmentSpec} · {spec.crewSpec}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono font-bold">
                                    {srv.quantity}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono text-[#A39E93]">
                                    {formatPKR(srv.tierPricePerUnit)}
                                  </td>
                                  <td className="py-2.5 pl-3 text-right font-mono font-bold text-[#F5F2EB]">
                                    {formatPKR(srv.quantity * srv.tierPricePerUnit)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#A39E93]">
                        <div>
                          Coverage:{" "}
                          <strong className="text-[#F5F2EB]">
                            {day.photographersCount ?? 1} Photographer(s),{" "}
                            {day.cinematographersCount ?? 1} Videographer(s)
                            {day.droneIncluded ? " + 1 Drone Aerial Unit" : ""}
                          </strong>{" "}
                          · {CAMERA_CATEGORY_RATES[camCat]?.shortLabel} +{" "}
                          {CREW_CATEGORY_RATES[crewCat]?.shortLabel}
                        </div>
                        {day.notes && <div className="italic">{day.notes}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-[#0D0D0F] p-5 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-[#F5F2EB]">
                  {event.title} — Complete Studio Coverage
                </div>
                <div className="text-xs text-[#A39E93] mt-1">{event.notes}</div>
              </div>
              <div className="font-mono text-base font-bold text-[#D4AF37]">
                {formatPKR(daysTotal)}
              </div>
            </div>
          )}
        </div>

        {/* Section 02: Interactive Optional Add-Ons */}
        <div className="rounded-2xl border border-white/10 bg-[#151519] p-6 sm:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37] block">
                Section 02 · Interactive Customization
              </span>
              <h2 className="font-display text-xl sm:text-2xl text-[#F5F2EB]">
                Toggle Optional Luxury Add-Ons &amp; Deliverables
              </h2>
              <p className="text-xs text-[#A39E93]">
                Customize your proposal in real time by selecting or removing albums, reels, or aerial units.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveAddons}
              disabled={savingAddons}
              className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:opacity-90 text-[#111111] text-xs font-bold transition-opacity cursor-pointer shrink-0"
            >
              {savingAddons ? "Updating Proposal..." : "Save Add-On Selection"}
            </button>
          </div>

          {addonsSavedNotice && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Your add-on preferences have been saved and synced with your studio quotation.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {addonCatalog.map((addon) => {
              const active = selectedAddons.includes(addon.label);
              return (
                <button
                  key={addon.id}
                  type="button"
                  onClick={() => toggleAddon(addon.label)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    active
                      ? "border-[#D4AF37] bg-[#D4AF37]/15 text-[#F5F2EB]"
                      : "border-white/10 bg-[#0D0D0F] text-[#A39E93] hover:border-white/25"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-[#F5F2EB]">
                      {addon.shortLabel}
                    </span>
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                        active
                          ? "border-[#D4AF37] bg-[#D4AF37] text-[#111111]"
                          : "border-white/30"
                      }`}
                    >
                      {active && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                  <div className="font-mono text-xs font-bold text-[#D4AF37]">
                    + {formatPKR(addon.price)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 03: Payment Milestone Schedule & Financial Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-[#151519] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37] block">
                  Section 03 · Installment Plan
                </span>
                <h3 className="font-display text-xl text-[#F5F2EB]">
                  Payment Milestone Schedule (30% / 60% / 10%)
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-2.5 py-1 rounded-lg">
                <Info className="w-3.5 h-3.5" />
                <span>Hover any milestone for Editing &amp; Album Design details</span>
              </span>
            </div>

            <div className="space-y-3">
              {milestones.map((m, idx) => {
                const isTooltipOpen = hoveredMilestoneIdx === idx;
                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredMilestoneIdx(idx)}
                    onMouseLeave={() => setHoveredMilestoneIdx(null)}
                    onFocus={() => setHoveredMilestoneIdx(idx)}
                    onBlur={() => setHoveredMilestoneIdx(null)}
                    tabIndex={0}
                    className="group relative rounded-xl border border-white/10 hover:border-[#D4AF37]/60 bg-[#0D0D0F] p-4 transition-all focus:outline-none focus:border-[#D4AF37]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-[#F5F2EB] flex flex-wrap items-center gap-2">
                          <span>{m.stage}</span>
                          <span className="text-[#A39E93] font-normal">·</span>
                          <span
                            className={
                              m.isPaid ? "text-emerald-400" : "text-[#D4AF37]"
                            }
                          >
                            {m.isPaid ? "Completed" : `Due: ${m.dueDate}`}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-semibold text-[#D4AF37]">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>{m.workflowBadge}</span>
                            <Info className="w-3 h-3 text-[#A39E93] group-hover:text-[#D4AF37]" />
                          </span>
                        </div>
                        <p className="text-[11px] text-[#A39E93]">{m.description}</p>
                      </div>
                      <div className="font-mono text-sm font-bold text-[#F5F2EB] shrink-0">
                        {formatPKR(m.amount)}
                      </div>
                    </div>

                    {/* Interactive Hover-Based Tooltip for Editing & Album Design Stage Summary */}
                    <div
                      role="tooltip"
                      className={`mt-3 pt-3 border-t border-[#D4AF37]/35 bg-gradient-to-b from-[#1A1A22] to-[#141419] rounded-xl p-3.5 text-xs space-y-2.5 shadow-xl transition-all duration-200 ${
                        isTooltipOpen
                          ? "block opacity-100 translate-y-0"
                          : "hidden group-hover:block opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-[#D4AF37] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{m.tooltipTitle}</span>
                        </span>
                        <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded">
                          {m.turnaroundNote}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#F5F2EB] leading-relaxed">
                        {m.tooltipSummary}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        <div className="rounded-lg bg-[#0D0D0F] border border-[#D4AF37]/25 p-2.5 space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1">
                            <Film className="w-3 h-3" />
                            <span>&apos;Editing&apos; Stage Summary</span>
                          </div>
                          <p className="text-[11px] text-[#A39E93] leading-relaxed">
                            {m.editingStageDetail}
                          </p>
                        </div>
                        <div className="rounded-lg bg-[#0D0D0F] border border-[#D4AF37]/25 p-2.5 space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            <span>&apos;Album Design&apos; Stage Summary</span>
                          </div>
                          <p className="text-[11px] text-[#A39E93] leading-relaxed">
                            {m.albumStageDetail}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {profile.bankName && (
              <div className="rounded-xl border border-white/10 bg-[#0D0D0F] p-4 text-xs space-y-1">
                <div className="font-bold text-[#D4AF37] flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Official Bank Transfer Details</span>
                </div>
                <div className="text-[#F5F2EB]">
                  {profile.bankName} — Account Title:{" "}
                  <strong>{profile.accountTitle}</strong>
                </div>
                <div className="text-[#A39E93] font-mono">
                  Account #: {profile.accountNumber}{" "}
                  {profile.iban ? `· IBAN: ${profile.iban}` : ""}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Grand Total & Digital Acceptance */}
          <div className="lg:col-span-5 rounded-2xl border border-[#D4AF37]/40 bg-[#151519] p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37] block">
                  Section 04 · Online Approval
                </span>
                <h3 className="font-display text-xl text-[#F5F2EB]">
                  Proposal Summary &amp; Digital Sign-Off
                </h3>
              </div>

              <div className="space-y-2 text-xs border-b border-white/10 pb-4">
                <div className="flex justify-between text-[#A39E93]">
                  <span>Event Days Coverage Subtotal</span>
                  <span className="font-mono text-[#F5F2EB]">
                    {formatPKR(daysTotal)}
                  </span>
                </div>
                <div className="flex justify-between text-[#A39E93]">
                  <span>Selected Luxury Add-Ons ({selectedAddons.length})</span>
                  <span className="font-mono text-[#F5F2EB]">
                    + {formatPKR(addonsTotal)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Special Studio Discount</span>
                    <span className="font-mono">- {formatPKR(discountAmount)}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between text-[#A39E93]">
                    <span>Applicable Tax</span>
                    <span className="font-mono">+ {formatPKR(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-white/10 text-sm font-bold">
                  <span className="text-[#F5F2EB]">Final Proposal Total</span>
                  <span className="font-mono text-lg text-[#D4AF37]">
                    {formatPKR(liveGrandTotal)}
                  </span>
                </div>
                {paidAmount > 0 && (
                  <div className="flex justify-between text-emerald-400 pt-1">
                    <span>Paid / Advance Received</span>
                    <span className="font-mono">{formatPKR(paidAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#A39E93]">
                  <span>Remaining Balance</span>
                  <span className="font-mono font-bold text-[#F5F2EB]">
                    {formatPKR(remainingBalance)}
                  </span>
                </div>
              </div>

              {isApproved || approvalSuccess ? (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold text-emerald-300">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Digitally Signed &amp; Confirmed</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowApprovalHistory((prev) => !prev)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D4AF37] hover:underline cursor-pointer"
                    >
                      <History className="w-3 h-3" />
                      <span>{showApprovalHistory ? "Hide" : "View"} Approval History</span>
                    </button>
                  </div>
                  <p className="text-emerald-200/80">
                    Thank you, <strong>{event.approvedByClient || signatureName}</strong>.
                    Your event dates and production crew tiers are locked in our studio
                    schedule.
                  </p>
                  {event.approvedAt && (
                    <div className="text-[11px] font-mono text-emerald-300/90 pt-1 border-t border-emerald-500/20">
                      Accepted on {formatDateTimeStamp(event.approvedAt)}
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleOpenConfirmApprovalModal} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#A39E93] mb-1">
                      Digital Signature (Your Full Name) *
                    </label>
                    <input
                      type="text"
                      required
                      value={signatureName}
                      onChange={(e) => setSignatureName(e.target.value)}
                      placeholder="Enter your full name to approve"
                      className="w-full rounded-xl border border-white/15 bg-[#0D0D0F] px-3.5 py-2.5 text-xs text-[#F5F2EB] focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#A39E93] mb-1">
                      Special Notes / Song or Timing Requests (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      placeholder="Any specific notes for our creative directors..."
                      className="w-full rounded-xl border border-white/15 bg-[#0D0D0F] px-3.5 py-2 text-xs text-[#F5F2EB] focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={approving || !signatureName.trim()}
                    className="w-full py-3 rounded-xl bg-[#D4AF37] hover:opacity-90 text-[#111111] font-bold text-xs flex items-center justify-center gap-2 transition-opacity cursor-pointer"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>
                      {approving
                        ? "Confirming Proposal..."
                        : "Digitally Accept & Approve Proposal"}
                    </span>
                  </button>
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setShowApprovalHistory((prev) => !prev)}
                      className="inline-flex items-center gap-1 text-[11px] text-[#A39E93] hover:text-[#D4AF37] cursor-pointer"
                    >
                      <History className="w-3 h-3" />
                      <span>
                        {showApprovalHistory ? "Hide" : "View"} Proposal View &amp; Approval History
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 text-[11px] text-[#A39E93] flex items-center justify-between gap-2">
              <span>{profile.studioName || "Royal Studio"}</span>
              <button
                type="button"
                onClick={() => setIsPrintPreviewOpen(true)}
                className="inline-flex items-center gap-1 text-[#D4AF37] hover:underline font-semibold cursor-pointer"
              >
                <Printer className="w-3 h-3" />
                <span>Open A4 Print Preview</span>
              </button>
              <span>{profile.phone || "0308-4877073"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for 'Digitally Accept & Approve Proposal' */}
      {isConfirmApprovalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Proposal Approval Dialog"
        >
          <div className="w-full max-w-lg rounded-2xl border border-[#D4AF37]/40 bg-[#151519] text-[#F5F2EB] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#111115]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#F5F2EB]">
                    Confirm Digital Proposal Acceptance
                  </h4>
                  <p className="text-[11px] text-[#A39E93]">
                    Please review your final coverage &amp; studio terms before finalizing
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmApprovalOpen(false)}
                className="p-1.5 rounded-lg text-[#A39E93] hover:text-[#F5F2EB] hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Summary of Terms & Investment Being Approved */}
              <div className="rounded-xl border border-white/10 bg-[#0D0D0F] p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#A39E93]">Proposal Reference:</span>
                  <span className="font-mono font-bold text-[#F5F2EB]">
                    {quotation.quotationNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A39E93]">Celebration &amp; Schedule:</span>
                  <span className="font-semibold text-[#F5F2EB]">
                    {event.title} ({daySchedules.length || 1} Day(s))
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A39E93]">Selected Luxury Add-Ons:</span>
                  <span className="font-semibold text-[#F5F2EB]">
                    {selectedAddons.length} item(s) ({formatPKR(addonsTotal)})
                  </span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2 text-sm font-bold">
                  <span className="text-[#F5F2EB]">Final Approved Total:</span>
                  <span className="font-mono text-[#D4AF37]">
                    {formatPKR(liveGrandTotal)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-300">
                  <span>30% Booking Advance Milestone:</span>
                  <span className="font-mono font-bold">
                    {formatPKR(milestones[0]?.amount || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2">
                  <span className="text-[#A39E93]">Digital Signer Name:</span>
                  <span className="font-serif italic text-sm text-[#D4AF37]">
                    {signatureName.trim()}
                  </span>
                </div>
              </div>

              {/* Terms Review Box */}
              <div className="rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/5 p-3.5 space-y-1.5 text-[11px] text-[#A39E93]">
                <div className="font-bold text-[#D4AF37] uppercase tracking-wider text-[10px]">
                  Studio Terms &amp; Production Policy
                </div>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    {quotation.paymentTerms ||
                      profile.paymentTerms ||
                      "30% Advance on Booking, 60% on Event Completion, 10% on Final Album & Film Delivery."}
                  </li>
                  <li>
                    Day-by-day coverage timings, camera categories, and crew allocations are locked per Section 01.
                  </li>
                  <li>
                    Post-production Editing &amp; Album Design commence upon completion of the event milestone schedule.
                  </li>
                </ul>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={hasReviewedTerms}
                  onChange={(e) => setHasReviewedTerms(e.target.checked)}
                  className="mt-0.5 rounded border-white/30 accent-[#D4AF37]"
                />
                <span className="text-[11px] text-[#F5F2EB] leading-relaxed">
                  I confirm that I have reviewed all day-by-day coverage schedules, selected add-ons, payment milestones, and studio terms prior to finalizing my digital approval.
                </span>
              </label>
            </div>

            <div className="px-6 py-4 bg-[#111115] border-t border-white/10 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsConfirmApprovalOpen(false)}
                disabled={approving}
                className="px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#F5F2EB] cursor-pointer"
              >
                Go Back &amp; Review Terms
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSubmitApproval}
                disabled={approving || !hasReviewedTerms}
                className="px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:opacity-90 disabled:opacity-40 text-[#111111] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileCheck className="w-4 h-4" />
                <span>
                  {approving
                    ? "Finalizing Approval..."
                    : "Confirm & Finalize Digital Approval"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ProposalQrShareModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        proposalUrl={
          typeof window !== "undefined"
            ? `${window.location.origin}/proposal/${encodeURIComponent(proposalId)}`
            : `/proposal/${encodeURIComponent(proposalId)}`
        }
        quotationNumber={quotation.quotationNumber}
        eventTitle={event.title}
        eventDate={event.eventDate}
        clientName={client.name}
        clientPhone={client.whatsapp || client.phone}
        studioName={profile.studioName || "Royal Studio"}
        totalAmountText={formatPKR(liveGrandTotal)}
      />

      <ProposalPrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        onDownloadPDF={handleDownloadPDF}
        event={event}
        client={client}
        quotation={quotation}
        daySchedules={daySchedules}
        profile={profile}
        addonCatalog={addonCatalog}
        selectedAddons={selectedAddons}
        daysTotal={daysTotal}
        addonsTotal={addonsTotal}
        discountAmount={discountAmount}
        taxAmount={taxAmount}
        liveGrandTotal={liveGrandTotal}
        paidAmount={paidAmount}
        remainingBalance={remainingBalance}
        milestones={milestones}
        isApproved={isApproved || approvalSuccess}
        signatureName={signatureName}
        clientNotes={clientNotes}
      />
    </div>
  );
}
