"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  Lock,
  Unlock,
  Sparkles,
  CheckCircle2,
  MessageSquare,
  Camera,
  Calendar,
  MapPin,
  Send,
  Save,
  Filter,
  Search,
  Maximize2,
  X,
  QrCode,
  Copy,
  Check,
  ArrowLeft,
  BookOpen,
  SlidersHorizontal,
  ShieldCheck,
} from "lucide-react";
import QRCode from "qrcode";
import type {
  EventProofingGallery,
  ProofingPhotoItem,
  EventDaySchedule,
} from "@/components/admin/types";

interface GalleryPayload {
  event: {
    id: string;
    title: string;
    category: string;
    weddingSubtype?: string;
    eventDate: string;
    venue: string;
    city: string;
    status: string;
  };
  client: {
    id: string;
    name: string;
    phone: string;
    whatsapp: string;
    city: string;
  };
  daySchedules: EventDaySchedule[];
  proofingGallery: EventProofingGallery;
  profile: {
    studioName: string;
    tagline: string;
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    city: string;
    logo?: string;
    primaryLogo?: string;
  };
}

export default function ProofingGalleryPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params?.eventId || "evt-001";

  const [data, setData] = useState<GalleryPayload | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PIN Protection State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [verifyingPin, setVerifyingPin] = useState(false);

  // Gallery Interactive State
  const [photos, setPhotos] = useState<ProofingPhotoItem[]>([]);
  const [clientSubmissionNote, setClientSubmissionNote] = useState("");
  const [selectionStatus, setSelectionStatus] = useState<
    "Open" | "Submitted" | "Approved"
  >("Open");
  const [submittedAt, setSubmittedAt] = useState<string | undefined>(undefined);

  // Filters
  const [viewFilter, setViewFilter] = useState<"ALL" | "SELECTED" | "WITH_NOTES">("ALL");
  const [dayFilter, setDayFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Active Lightbox & Retouching Note Modal
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [editingNotePhotoId, setEditingNotePhotoId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState("");

  // Saving & Submission State
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadGallery() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/gallery/${encodeURIComponent(eventId)}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Unable to load private proofing gallery");
        }
        if (active) {
          setData(json);
          const gal: EventProofingGallery = json.proofingGallery;
          setPhotos(Array.isArray(gal?.photos) ? gal.photos : []);
          setClientSubmissionNote(gal?.clientSubmissionNote || "");
          setSelectionStatus(gal?.selectionStatus || "Open");
          setSubmittedAt(gal?.submittedAt);

          const queryParams =
            typeof window !== "undefined"
              ? new URLSearchParams(window.location.search)
              : null;
          const urlPin = queryParams?.get("pin");
          const unlockedParam = queryParams?.get("unlocked");
          const savedSessionUnlock =
            typeof window !== "undefined" &&
            sessionStorage.getItem(`rs_gallery_unlocked_${json.event.id}`) === "1";

          if (
            unlockedParam === "1" ||
            savedSessionUnlock ||
            !gal?.pinCode ||
            (urlPin && urlPin === gal.pinCode)
          ) {
            setIsUnlocked(true);
          }
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || "Failed to load gallery");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadGallery();
    return () => {
      active = false;
    };
  }, [eventId]);

  const showBannerToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => {
      setSaveToast((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  async function handleVerifyPin(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setVerifyingPin(true);
    setPinError(null);
    try {
      const res = await fetch(`/api/gallery/${encodeURIComponent(data.event.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY_PIN",
          pin: pinInput.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.valid) {
        setPinError(
          json.error || "Incorrect PIN. Please enter your 4-digit private gallery PIN."
        );
      } else {
        setIsUnlocked(true);
        if (typeof window !== "undefined") {
          sessionStorage.setItem(`rs_gallery_unlocked_${data.event.id}`, "1");
        }
      }
    } catch {
      setPinError("Failed to verify PIN. Please try again.");
    } finally {
      setVerifyingPin(false);
    }
  }

  async function handleToggleHeart(photoId: string) {
    if (!data) return;
    const nextPhotos = photos.map((p) => {
      if (p.id !== photoId) return p;
      const nextSelected = !p.isSelectedForAlbum;
      return {
        ...p,
        isSelectedForAlbum: nextSelected,
        selectedAt: nextSelected ? new Date().toISOString() : undefined,
      };
    });
    setPhotos(nextPhotos);

    try {
      const target = nextPhotos.find((p) => p.id === photoId);
      await fetch(`/api/gallery/${encodeURIComponent(data.event.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_PHOTO_SELECTION",
          photoId,
          isSelected: Boolean(target?.isSelectedForAlbum),
        }),
      });
    } catch {
      // Optimistically persisted in local state
    }
  }

  async function handleSaveRetouchNote(photoId: string, noteText: string) {
    if (!data) return;
    const cleanNote = noteText.trim();
    const nextPhotos = photos.map((p) => {
      if (p.id !== photoId) return p;
      return {
        ...p,
        retouchingNote: cleanNote,
        isSelectedForAlbum: cleanNote ? true : p.isSelectedForAlbum,
        selectedAt:
          cleanNote && !p.isSelectedForAlbum
            ? new Date().toISOString()
            : p.selectedAt,
      };
    });
    setPhotos(nextPhotos);
    setEditingNotePhotoId(null);
    showBannerToast("Retouching note saved & synced with Royal Studio ERP.");

    try {
      await fetch(`/api/gallery/${encodeURIComponent(data.event.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_RETOUCH_NOTE",
          photoId,
          retouchingNote: cleanNote,
        }),
      });
    } catch {
      // Optimistically updated
    }
  }

  async function handleSaveDraftProgress() {
    if (!data) return;
    setIsSavingDraft(true);
    try {
      const res = await fetch(`/api/gallery/${encodeURIComponent(data.event.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_PROGRESS",
          photos,
          clientSubmissionNote,
        }),
      });
      if (res.ok) {
        showBannerToast("Your album photo selection & retouching notes have been saved.");
      }
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleConfirmSubmitSelection(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setIsSubmittingFinal(true);
    try {
      const res = await fetch(`/api/gallery/${encodeURIComponent(data.event.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT_FINAL_SELECTION",
          photos,
          clientSubmissionNote,
        }),
      });
      const json = await res.json();
      if (res.ok && json.proofingGallery) {
        setSelectionStatus(json.proofingGallery.selectionStatus);
        setSubmittedAt(json.proofingGallery.submittedAt);
        setIsSubmitModalOpen(false);
        showBannerToast(
          `Final Luxury Album Selection (${json.selectedCount} frames) submitted directly to Royal Studio ERP!`
        );
      }
    } finally {
      setIsSubmittingFinal(false);
    }
  }

  const selectedCount = useMemo(
    () => photos.filter((p) => p.isSelectedForAlbum).length,
    [photos]
  );

  const notesCount = useMemo(
    () => photos.filter((p) => p.retouchingNote && p.retouchingNote.trim().length > 0).length,
    [photos]
  );

  const uniqueDays = useMemo(() => {
    const set = new Set<string>();
    photos.forEach((p) => {
      if (p.dayLabel) set.add(p.dayLabel);
    });
    return Array.from(set);
  }, [photos]);

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    photos.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [photos]);

  const filteredPhotos = useMemo(() => {
    return photos.filter((p) => {
      if (viewFilter === "SELECTED" && !p.isSelectedForAlbum) return false;
      if (
        viewFilter === "WITH_NOTES" &&
        (!p.retouchingNote || !p.retouchingNote.trim())
      ) {
        return false;
      }
      if (dayFilter !== "ALL" && p.dayLabel !== dayFilter) return false;
      if (categoryFilter !== "ALL" && p.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchCat = p.category.toLowerCase().includes(q);
        const matchNote = (p.retouchingNote || "").toLowerCase().includes(q);
        if (!matchTitle && !matchCat && !matchNote) return false;
      }
      return true;
    });
  }, [photos, viewFilter, dayFilter, categoryFilter, searchQuery]);

  const activePhoto = useMemo(
    () => photos.find((p) => p.id === activePhotoId) || null,
    [photos, activePhotoId]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/gallery/${eventId}`;
    QRCode.toDataURL(url, { width: 220, margin: 1 })
      .then((resUrl) => setQrDataUrl(resUrl))
      .catch(() => {});
  }, [eventId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0C10] text-white flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center mx-auto animate-pulse">
            <Camera className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <p className="text-sm font-medium text-zinc-300 tracking-wide">
            Loading Private Couple Proofing Gallery...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0B0C10] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-8 text-center space-y-4">
          <Lock className="w-10 h-10 text-amber-400 mx-auto" />
          <h1 className="text-xl font-bold">Private Gallery Unavailable</h1>
          <p className="text-xs text-zinc-400">
            {error || "This gallery link may have expired or does not exist."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4AF37] text-slate-950 font-bold text-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Royal Studio
          </Link>
        </div>
      </div>
    );
  }

  const targetMin = data.proofingGallery?.minAlbumSelection || 100;
  const targetMax = data.proofingGallery?.maxAlbumSelection || 150;
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/gallery/${data.event.id}`
      : `/gallery/${data.event.id}`;

  // PIN PROTECTION SCREEN
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#090A0F] text-white flex items-center justify-center p-4 pt-24 pb-16">
        <div className="max-w-md w-full bg-[#12141D] border border-[#D4AF37]/30 rounded-3xl p-8 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-[11px] font-bold uppercase tracking-widest">
              <Lock className="w-3 h-3" /> PIN-Protected Gallery
            </span>
            <span className="text-[11px] text-zinc-400 font-mono">
              {data.event.city}
            </span>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold mb-1">
              {data.profile.studioName} · Private Proofing
            </p>
            <h1 className="text-2xl font-serif font-bold text-white leading-snug">
              {data.event.title}
            </h1>
            <p className="text-xs text-zinc-400 mt-1.5">
              Prepared exclusively for <strong className="text-zinc-200">{data.client.name}</strong>. Enter your 4-digit Gallery Access PIN to heart your favorite wedding photos for the Luxury Storybook Album and leave retouching notes.
            </p>
          </div>

          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Enter Gallery Access PIN
              </label>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="• • • •"
                maxLength={8}
                required
                className="w-full px-4 py-3.5 rounded-xl bg-black/50 border border-zinc-700 focus:border-[#D4AF37] text-center text-xl tracking-[0.5em] font-mono text-white focus:outline-none"
              />
              <p className="mt-2 text-[11px] text-zinc-400 text-center">
                Enter the 4-digit PIN provided in your Royal Studio Client Portal or WhatsApp invitation.
              </p>
            </div>

            {pinError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {pinError}
              </div>
            )}

            <button
              type="submit"
              disabled={verifyingPin}
              className="w-full py-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#e3be42] text-slate-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#D4AF37]/20"
            >
              <Unlock className="w-4 h-4" />
              {verifyingPin ? "Unlocking Private Gallery..." : "Unlock Proofing Gallery"}
            </button>
          </form>

          <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Direct ERP Album Sync</span>
            <Link href="/admin" className="text-zinc-300 hover:text-[#D4AF37]">
              Client Portal Login →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090A0F] text-zinc-100 pt-24 pb-20">
      {/* Top Floating Toast */}
      {saveToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/95 border border-emerald-500/40 text-emerald-200 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Luxury Header & Album Selection Progress Bar */}
        <div className="bg-gradient-to-br from-[#131622] via-[#10121A] to-[#0C0E14] border border-[#D4AF37]/30 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] text-[11px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" /> Private Couple Proofing & Album Selection
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    selectionStatus === "Submitted"
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : selectionStatus === "Approved"
                      ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                      : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  Album Status: {selectionStatus}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
                {data.event.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                  {data.event.eventDate}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                  {data.event.venue}, {data.event.city}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Couple: <strong className="text-zinc-200">{data.client.name}</strong>
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-[#D4AF37]" />
                <span>QR & PIN</span>
              </button>

              <button
                type="button"
                onClick={handleSaveDraftProgress}
                disabled={isSavingDraft}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4 text-amber-400" />
                <span>{isSavingDraft ? "Saving..." : "Save Draft"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#e2be46] text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#D4AF37]/20 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {selectionStatus === "Submitted"
                    ? "Update Final Album Submission"
                    : "Submit Final Album Selection"}
                </span>
              </button>
            </div>
          </div>

          {/* Selection Counter & Target Guide */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-black/40 border border-zinc-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                  Hearted for Luxury Album
                </div>
                <div className="text-2xl font-bold text-white mt-0.5 flex items-baseline gap-2">
                  <span className="text-rose-400">{selectedCount}</span>
                  <span className="text-xs text-zinc-400 font-normal">
                    / {photos.length} Proofs (Target: {targetMin}–{targetMax})
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                <Heart className="w-5 h-5 text-rose-400 fill-rose-400" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-zinc-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                  Frame Retouching Notes
                </div>
                <div className="text-2xl font-bold text-white mt-0.5 flex items-baseline gap-2">
                  <span className="text-[#D4AF37]">{notesCount}</span>
                  <span className="text-xs text-zinc-400 font-normal">
                    Frames with custom editor instructions
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-[#D4AF37]" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-zinc-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                  Admin ERP Sync Status
                </div>
                <div className="text-sm font-bold text-emerald-400 mt-1">
                  {selectionStatus === "Submitted"
                    ? `Submitted on ${submittedAt ? new Date(submittedAt).toLocaleDateString() : "Today"}`
                    : "Live Sync Active — Select & Add Notes"}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  Directly feeds Royal Studio Album Designer queue
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-[#12141D] border border-zinc-800/90 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setViewFilter("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                viewFilter === "ALL"
                  ? "bg-[#D4AF37] text-slate-950"
                  : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              All Proofs ({photos.length})
            </button>
            <button
              type="button"
              onClick={() => setViewFilter("SELECTED")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                viewFilter === "SELECTED"
                  ? "bg-rose-500 text-white"
                  : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              Hearted for Album ({selectedCount})
            </button>
            <button
              type="button"
              onClick={() => setViewFilter("WITH_NOTES")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                viewFilter === "WITH_NOTES"
                  ? "bg-amber-500 text-slate-950"
                  : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              With Retouching Notes ({notesCount})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-200"
            >
              <option value="ALL">All Event Days</option>
              {uniqueDays.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-200"
            >
              <option value="ALL">All Categories</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search frame or note..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>
        </div>

        {/* Photo Proofing Grid */}
        {filteredPhotos.length === 0 ? (
          <div className="bg-[#12141D] border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
            <Filter className="w-8 h-8 text-zinc-500 mx-auto" />
            <p className="text-sm font-semibold text-zinc-300">
              No frames match your current filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setViewFilter("ALL");
                setDayFilter("ALL");
                setCategoryFilter("ALL");
                setSearchQuery("");
              }}
              className="px-4 py-2 rounded-xl bg-zinc-800 text-xs text-[#D4AF37] font-semibold cursor-pointer"
            >
              Reset Gallery Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPhotos.map((photo, index) => {
              const isSelected = Boolean(photo.isSelectedForAlbum);
              const hasNote = Boolean(
                photo.retouchingNote && photo.retouchingNote.trim()
              );
              const isEditingThisNote = editingNotePhotoId === photo.id;

              return (
                <div
                  key={photo.id}
                  className={`group rounded-2xl overflow-hidden bg-[#12141D] border transition-all flex flex-col ${
                    isSelected
                      ? "border-rose-500/70 shadow-lg shadow-rose-950/30"
                      : "border-zinc-800/90 hover:border-zinc-700"
                  }`}
                >
                  {/* Image Container */}
                  <div className="relative aspect-[4/3] bg-zinc-950 overflow-hidden">
                    <img
                      src={photo.url}
                      alt={photo.title}
                      loading={index < 6 ? "eager" : "lazy"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                    {/* Top Bar Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-bold text-zinc-200 border border-white/10">
                        {photo.dayLabel} · #{index + 1}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActivePhotoId(photo.id)}
                          className="p-2 rounded-xl bg-black/70 hover:bg-black text-white border border-white/15 backdrop-blur-md transition-colors cursor-pointer"
                          title="Inspect Fullscreen"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleHeart(photo.id)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                            isSelected
                              ? "bg-rose-500 text-white"
                              : "bg-black/75 hover:bg-rose-500/20 text-zinc-200 border border-white/15"
                          }`}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              isSelected ? "fill-white text-white" : "text-rose-400"
                            }`}
                          />
                          <span>{isSelected ? "Selected" : "Select"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Bottom Overlay Title */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-[#D4AF37] font-bold">
                          {photo.category}
                        </span>
                        <h3 className="text-xs font-bold text-white line-clamp-1">
                          {photo.title}
                        </h3>
                      </div>
                      {photo.cameraUsed && (
                        <span className="text-[10px] text-zinc-400 font-mono shrink-0 bg-black/60 px-2 py-0.5 rounded">
                          {photo.cameraUsed}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Retouching Notes */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                    {isEditingThisNote ? (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                          Retouching / Album Layout Note for Editors
                        </label>
                        <textarea
                          value={tempNoteText}
                          onChange={(e) => setTempNoteText(e.target.value)}
                          rows={2}
                          placeholder="e.g. Use as 2-page spread, soften background lights, or B&W duplicate..."
                          className="w-full px-3 py-2 rounded-xl bg-black/60 border border-[#D4AF37]/50 text-xs text-white focus:outline-none"
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingNotePhotoId(null)}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 text-[11px] text-zinc-300 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleSaveRetouchNote(photo.id, tempNoteText)
                            }
                            className="px-3 py-1 rounded-lg bg-[#D4AF37] text-slate-950 font-bold text-[11px] cursor-pointer"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs text-zinc-400 flex-1">
                          {hasNote ? (
                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-[11px]">
                              <span className="font-bold text-[#D4AF37] block mb-0.5">
                                Retouching Note:
                              </span>
                              “{photo.retouchingNote}”
                            </div>
                          ) : (
                            <span className="text-[11px] text-zinc-500 italic">
                              No retouching note on this frame
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingNotePhotoId(photo.id);
                            setTempNoteText(photo.retouchingNote || "");
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] font-semibold text-zinc-200 flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3 h-3 text-[#D4AF37]" />
                          <span>{hasNote ? "Edit Note" : "Add Note"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FULLSCREEN PHOTO LIGHTBOX MODAL */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-5xl w-full bg-[#12141D] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-2 bg-black flex items-center justify-center relative min-h-[320px] max-h-[75vh]">
              <img
                src={activePhoto.url}
                alt={activePhoto.title}
                className="max-w-full max-h-[75vh] object-contain"
              />
              <button
                type="button"
                onClick={() => setActivePhotoId(null)}
                className="absolute top-4 left-4 p-2.5 rounded-full bg-black/70 text-white hover:bg-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-md bg-[#D4AF37]/15 text-[#D4AF37] text-[10px] font-bold uppercase tracking-wider">
                    {activePhoto.dayLabel} · {activePhoto.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActivePhotoId(null)}
                    className="text-zinc-400 hover:text-white text-xs cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                <h2 className="text-lg font-bold text-white">{activePhoto.title}</h2>

                <div className="p-3 rounded-xl bg-black/40 border border-zinc-800 text-xs text-zinc-400 space-y-1">
                  <div>
                    Camera: <strong className="text-zinc-200">{activePhoto.cameraUsed || "Sony Alpha Flagship"}</strong>
                  </div>
                  <div>
                    Lens: <strong className="text-zinc-200">{activePhoto.lensUsed || "G-Master Prime"}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleHeart(activePhoto.id)}
                  className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activePhoto.isSelectedForAlbum
                      ? "bg-rose-500 text-white"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      activePhoto.isSelectedForAlbum ? "fill-white" : "text-rose-400"
                    }`}
                  />
                  <span>
                    {activePhoto.isSelectedForAlbum
                      ? "Hearted for Luxury Album (Click to Remove)"
                      : "Heart / Select for Luxury Album"}
                  </span>
                </button>

                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-zinc-300">
                    Retouching & Album Spread Note
                  </label>
                  <textarea
                    value={
                      editingNotePhotoId === activePhoto.id
                        ? tempNoteText
                        : activePhoto.retouchingNote || ""
                    }
                    onFocus={() => {
                      if (editingNotePhotoId !== activePhoto.id) {
                        setEditingNotePhotoId(activePhoto.id);
                        setTempNoteText(activePhoto.retouchingNote || "");
                      }
                    }}
                    onChange={(e) => {
                      setEditingNotePhotoId(activePhoto.id);
                      setTempNoteText(e.target.value);
                    }}
                    rows={3}
                    placeholder="Add color grading, skin retouching, or panoramic spread instructions..."
                    className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-zinc-700 focus:border-[#D4AF37] text-xs text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleSaveRetouchNote(
                        activePhoto.id,
                        editingNotePhotoId === activePhoto.id
                          ? tempNoteText
                          : activePhoto.retouchingNote || ""
                      )
                    }
                    className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Save Retouching Note
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-zinc-500 border-t border-zinc-800 pt-3">
                Synced directly with {data.profile.studioName} Post-Production ERP
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FINAL ALBUM SUBMISSION MODAL */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-[#12141D] border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] text-xs font-bold">
                <BookOpen className="w-3.5 h-3.5" /> Final Luxury Album Submission
              </span>
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h2 className="text-xl font-serif font-bold text-white">
                Send Selected Frames to Album Designer
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Your selection of <strong className="text-rose-400">{selectedCount} hearted photos</strong> and{" "}
                <strong className="text-[#D4AF37]">{notesCount} retouching notes</strong> will be locked into{" "}
                {data.profile.studioName}’s Admin ERP and assigned to the Senior Album Designer.
              </p>
            </div>

            <form onSubmit={handleConfirmSubmitSelection} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Album Cover Title, Material & General Instructions
                </label>
                <textarea
                  value={clientSubmissionNote}
                  onChange={(e) => setClientSubmissionNote(e.target.value)}
                  rows={3}
                  placeholder="e.g. Cover Embossing: 'Tariq & Ayesha — 15 Oct 2026', Italian Emerald Velvet cover, chronological day order..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-zinc-700 focus:border-[#D4AF37] text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-700 text-xs font-semibold text-zinc-300 cursor-pointer"
                >
                  Continue Selecting
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFinal || selectedCount === 0}
                  className="px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#e3be42] text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isSubmittingFinal
                      ? "Submitting to Studio ERP..."
                      : `Confirm & Submit (${selectedCount} Photos)`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR & PRIVATE LINK SHARE MODAL */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#12141D] border border-[#D4AF37]/40 rounded-3xl p-6 text-center space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                Private Gallery QR & Access PIN
              </span>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl inline-block mx-auto">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Gallery QR Code"
                  className="w-44 h-44 object-contain"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-xs text-zinc-500">
                  Generating QR...
                </div>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-bold text-white">{data.event.title}</p>
              <p className="text-xs text-zinc-400">
                Gallery PIN:{" "}
                <strong className="text-[#D4AF37] font-mono">
                  {data.proofingGallery.pinCode || "1234"}
                </strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-zinc-700 text-xs text-zinc-300 font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#D4AF37] text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
