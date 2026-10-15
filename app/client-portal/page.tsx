"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Calendar,
  MapPin,
  Clock,
  CreditCard,
  FileText,
  Download,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Heart,
  Lock,
  User as UserIcon,
  Save,
  Copy,
  Check,
  Upload,
  Camera,
  Users,
  ShieldCheck,
  BookOpen,
  MessageCircle,
  Search,
  Eye,
  X,
  Plus,
  Edit3,
  FileCheck,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Sliders,
  ArrowRight,
  HardDrive,
  FolderOpen,
  Video,
  Play,
} from "lucide-react";
import { formatPKR, formatDate } from "@/components/admin/utils/calculations";
import {
  generateInvoicePDF,
  generateQuotationPDF,
} from "@/components/admin/utils/pdfGenerator";
import {
  saveOfflinePortalData,
  getOfflinePortalData,
  enqueueBackgroundSync,
  getCustomerPortalSession,
  setCustomerPortalSession,
  clearCustomerPortalSession,
} from "@/lib/pwa/offlineVault";
import ClientPortalOfflineStatusBanner from "@/components/client-portal/ClientPortalOfflineStatusBanner";
import type {
  Client,
  Event,
  EventDaySchedule,
  Quotation,
  Invoice,
  Payment,
  EventTask,
  AdminProfile,
  PaymentMethod,
  ProofingPhotoItem,
} from "@/components/admin/types";

type PortalTab =
  | "CELEBRATION"
  | "MEDIA_VAULT"
  | "PROOFING"
  | "PAYMENTS"
  | "CONTRACT"
  | "PROFILE";

interface CelebrationDirectoryItem {
  eventId: string;
  clientId: string;
  quotationId: string;
  quotationNumber: string;
  invoiceNumber: string;
  title: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  category: string;
  eventDate: string;
  venue: string;
  city: string;
  status: string;
  packagePrice: number;
  totalClientPayments: number;
  remainingBalance: number;
  pinCode: string;
  totalProofs: number;
  favoritesCount: number;
}

interface AddonCatalogItem {
  id: string;
  label: string;
  shortLabel: string;
  price: number;
  category: string;
}

interface PortalPayload {
  celebrationDirectory: CelebrationDirectoryItem[];
  activeEventId: string;
  activeClient: Client | null;
  clientEvents: Event[];
  daySchedules: EventDaySchedule[];
  quotations: Quotation[];
  invoices: Invoice[];
  payments: Payment[];
  tasks: EventTask[];
  crewAssignments: {
    id: string;
    eventId: string;
    name: string;
    role: string;
    specialization: string;
  }[];
  addonCatalog: AddonCatalogItem[];
  profile: AdminProfile;
}

function ClientPortalInner() {
  const searchParams = useSearchParams();
  const initialEventOnlyParam = searchParams?.get("eventId") || "";
  const initialEventIdParam =
    searchParams?.get("email") ||
    searchParams?.get("phone") ||
    searchParams?.get("clientId") ||
    initialEventOnlyParam ||
    "";
  const initialPinParam =
    searchParams?.get("password") || searchParams?.get("pin") || "";
  const initialTabParam = (searchParams?.get("tab") || "").toUpperCase();

  const [data, setData] = useState<PortalPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authIdentifier, setAuthIdentifier] = useState<string>(initialEventIdParam);
  const [authPin, setAuthPin] = useState<string>(initialPinParam);
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>("");
  const [verifyingAuth, setVerifyingAuth] = useState<boolean>(false);
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventOnlyParam);
  const [lookupInput, setLookupInput] = useState<string>("");
  const [activeTab, setActiveTab] = useState<PortalTab>(
    initialTabParam === "MEDIA_VAULT" ||
      initialTabParam === "PROOFING" ||
      initialTabParam === "PAYMENTS" ||
      initialTabParam === "CONTRACT" ||
      initialTabParam === "PROFILE"
      ? (initialTabParam as PortalTab)
      : "CELEBRATION"
  );
  const [selectedUnlistedVideoId, setSelectedUnlistedVideoId] = useState<string>("QF3BmojTrKQ");
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Schedule & Add-On interactive editing states
  const [isEditingSchedule, setIsEditingSchedule] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDate, setEditDate] = useState<string>("");
  const [editVenue, setEditVenue] = useState<string>("");
  const [editCity, setEditCity] = useState<string>("");
  const [editStartTime, setEditStartTime] = useState<string>("18:00");
  const [editEndTime, setEditEndTime] = useState<string>("23:00");
  const [editClientNotes, setEditClientNotes] = useState<string>("");
  const [savingSchedule, setSavingSchedule] = useState<boolean>(false);

  // Add Celebration Day Modal State
  const [showAddDayForm, setShowAddDayForm] = useState<boolean>(false);
  const [newDayType, setNewDayType] = useState<string>("Mehndi / Mayoun");
  const [newDayDate, setNewDayDate] = useState<string>("");
  const [newDayVenue, setNewDayVenue] = useState<string>("");
  const [newDayDrone, setNewDayDrone] = useState<boolean>(true);

  // Add-ons state
  const [savingAddons, setSavingAddons] = useState<boolean>(false);

  // Proofing Gallery interactive state
  const [proofingFilter, setProofingFilter] = useState<"ALL" | "FAVORITES" | "NOTES">("ALL");
  const [proofingDayFilter, setProofingDayFilter] = useState<string>("ALL");
  const [proofingCategoryFilter, setProofingCategoryFilter] = useState<string>("ALL");
  const [proofingSearch, setProofingSearch] = useState<string>("");
  const [editingNotePhotoId, setEditingNotePhotoId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>("");
  const [lightboxPhotoId, setLightboxPhotoId] = useState<string | null>(null);
  const [showAddFrameForm, setShowAddFrameForm] = useState<boolean>(false);
  const [customFrameTitle, setCustomFrameTitle] = useState<string>("");
  const [customFrameUrl, setCustomFrameUrl] = useState<string>("");
  const [customFrameDay, setCustomFrameDay] = useState<string>("Day 2 · Barat");
  const [customFrameCategory, setCustomFrameCategory] = useState<string>("Couple Portrait");
  const [albumSubmissionNote, setAlbumSubmissionNote] = useState<string>("");
  const [submittingAlbum, setSubmittingAlbum] = useState<boolean>(false);

  // Payment / Deposit Receipt Upload state
  const [depositMethod, setDepositMethod] = useState<PaymentMethod>("Bank Transfer");
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositReference, setDepositReference] = useState<string>("");
  const [depositSenderTitle, setDepositSenderTitle] = useState<string>("");
  const [depositReceiptDataUrl, setDepositReceiptDataUrl] = useState<string>("");
  const [depositFileName, setDepositFileName] = useState<string>("");
  const [depositNotes, setDepositNotes] = useState<string>("");
  const [uploadingDeposit, setUploadingDeposit] = useState<boolean>(false);
  const [previewReceiptImage, setPreviewReceiptImage] = useState<string | null>(null);

  // Digital Contract Approval state
  const [signatureName, setSignatureName] = useState<string>("");
  const [contractNotes, setContractNotes] = useState<string>("");
  const [approvingContract, setApprovingContract] = useState<boolean>(false);

  // Client Profile state
  const [profileName, setProfileName] = useState<string>("");
  const [profilePhone, setProfilePhone] = useState<string>("");
  const [profileWhatsapp, setProfileWhatsapp] = useState<string>("");
  const [profileEmail, setProfileEmail] = useState<string>("");
  const [profileCity, setProfileCity] = useState<string>("");
  const [profileAddress, setProfileAddress] = useState<string>("");
  const [profileNotes, setProfileNotes] = useState<string>("");
  const [profileNewPassword, setProfileNewPassword] = useState<string>("");
  const [showCurrentPortalPass, setShowCurrentPortalPass] = useState<boolean>(false);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  const showToast = useCallback((text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  }, []);

  const fetchPortalData = useCallback(
    async (opts?: {
      eventId?: string;
      identifier?: string;
      pin?: string;
      q?: string;
    }) => {
      const savedSession = getCustomerPortalSession();
      const effectiveIdentifier =
        opts?.identifier ||
        opts?.q ||
        savedSession?.identifier ||
        opts?.eventId ||
        savedSession?.eventId ||
        "";
      const effectivePin = opts?.pin || savedSession?.pin || "";

      if (!effectiveIdentifier || !effectivePin) {
        setIsAuthenticated(false);
        setLoading(false);
        return false;
      }

      try {
        const params = new URLSearchParams();
        params.set("identifier", effectiveIdentifier);
        if (opts?.eventId) params.set("eventId", opts.eventId);
        params.set("pin", effectivePin);
        const res = await fetch(`/api/client-portal?${params.toString()}`);
        const json = await res.json();
        if (res.ok && json?.authenticated) {
          setData(json);
          setIsAuthenticated(true);
          setAuthIdentifier(effectiveIdentifier);
          setAuthPin(effectivePin);
          setAuthError("");
          if (json.activeEventId) {
            setSelectedEventId(json.activeEventId);
          }
          setCustomerPortalSession({
            identifier: effectiveIdentifier,
            eventId: json.activeEventId || effectiveIdentifier,
            clientId: json.activeClient?.id,
            quotationId: json.quotations?.[0]?.id,
            pin: effectivePin,
            clientName: json.activeClient?.name,
            eventTitle: json.clientEvents?.[0]?.title,
            verifiedAt: new Date().toISOString(),
          });
          void saveOfflinePortalData(json);
          return true;
        }
        if (
          res.status === 400 ||
          res.status === 401 ||
          res.status === 403 ||
          res.status === 404
        ) {
          setIsAuthenticated(false);
          setAuthError(
            json?.error ||
              "Invalid login credentials. Each client can only access their own account."
          );
          return false;
        }
        throw new Error("Offline");
      } catch {
        const cached = await getOfflinePortalData(
          opts?.eventId || effectiveIdentifier
        );
        if (cached && cached.authenticated) {
          setData(cached as PortalPayload);
          setIsAuthenticated(true);
          setAuthIdentifier(effectiveIdentifier);
          setAuthPin(effectivePin);
          if (cached.activeEventId) {
            setSelectedEventId(cached.activeEventId);
          }
          showToast(
            "Loaded your private celebration, proposal & gallery favorites from Offline Vault."
          );
          return true;
        } else {
          setAuthError("Could not verify credentials while offline.");
          return false;
        }
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    const savedSession = getCustomerPortalSession();
    const matchesSavedSession =
      savedSession?.identifier &&
      savedSession?.pin &&
      (!initialEventIdParam ||
        initialEventIdParam.toLowerCase() ===
          savedSession.identifier.toLowerCase() ||
        initialEventIdParam.toLowerCase() ===
          (savedSession.eventId || "").toLowerCase() ||
        initialEventIdParam.toLowerCase() ===
          (savedSession.clientId || "").toLowerCase());

    if (initialEventIdParam && initialPinParam) {
      if (!matchesSavedSession) {
        clearCustomerPortalSession();
      }
      void fetchPortalData({
        identifier: initialEventIdParam,
        eventId: initialEventOnlyParam || undefined,
        pin: initialPinParam,
      });
    } else if (matchesSavedSession && savedSession) {
      void fetchPortalData({
        identifier: savedSession.identifier,
        eventId: initialEventOnlyParam || savedSession.eventId,
        pin: savedSession.pin,
      });
    } else {
      if (initialEventIdParam) {
        clearCustomerPortalSession();
        setData(null);
        setAuthIdentifier(initialEventIdParam);
        setAuthPin("");
      }
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, [fetchPortalData, initialEventIdParam, initialEventOnlyParam, initialPinParam]);

  const activeEvent = useMemo(() => {
    if (!data) return null;
    return (
      data.clientEvents.find((e) => e.id === selectedEventId) ||
      data.clientEvents[0] ||
      null
    );
  }, [data, selectedEventId]);

  const activeClient = data?.activeClient || null;
  const profile = data?.profile;

  // Synchronize form states when activeEvent or activeClient changes
  useEffect(() => {
    if (activeEvent) {
      setEditTitle(activeEvent.title || "");
      setEditDate(activeEvent.eventDate || "");
      setEditVenue(activeEvent.venue || "");
      setEditCity(activeEvent.city || "Burewala");
      setEditStartTime(activeEvent.startTime || "18:00");
      setEditEndTime(activeEvent.endTime || "23:00");
      setEditClientNotes(activeEvent.notes || "");
      setNewDayDate(activeEvent.eventDate || "");
      setNewDayVenue(activeEvent.venue || "");
      setAlbumSubmissionNote(
        activeEvent.proofingGallery?.clientSubmissionNote || ""
      );
      const suggestedAdvance = Math.max(
        25000,
        Math.round(Number(activeEvent.packagePrice || 0) * 0.3)
      );
      setDepositAmount(
        activeEvent.remainingBalance > 0
          ? Math.min(activeEvent.remainingBalance, suggestedAdvance)
          : suggestedAdvance
      );
      setSignatureName(
        activeEvent.approvedByClient || activeClient?.name || ""
      );
      setContractNotes(activeEvent.notes || "");
    }
  }, [activeEvent?.id, activeClient?.name]);

  useEffect(() => {
    if (activeClient) {
      setProfileName(activeClient.name || "");
      setProfilePhone(activeClient.phone || "");
      setProfileWhatsapp(activeClient.whatsapp || activeClient.phone || "");
      setProfileEmail(activeClient.email || "");
      setProfileCity(activeClient.city || profile?.city || "Burewala");
      setProfileAddress(activeClient.address || "");
      setProfileNotes(activeClient.notes || "");
      setDepositSenderTitle(activeClient.name || "");
    }
  }, [activeClient?.id, profile?.city]);

  const evtDays = useMemo(() => {
    if (!data || !activeEvent) return [];
    return data.daySchedules
      .filter((d) => d.eventId === activeEvent.id)
      .sort((a, b) => a.dayNumber - b.dayNumber);
  }, [data, activeEvent]);

  const evtQuotation = useMemo(
    () =>
      data?.quotations.find(
        (q) =>
          q.eventId === activeEvent?.id ||
          (!q.eventId && q.clientId === activeClient?.id)
      ) || null,
    [data, activeEvent, activeClient]
  );

  const evtInvoice = useMemo(
    () =>
      data?.invoices.find(
        (i) =>
          i.eventId === activeEvent?.id ||
          (!i.eventId && i.clientId === activeClient?.id)
      ) || null,
    [data, activeEvent, activeClient]
  );

  const evtPayments = useMemo(() => {
    if (!data) return [];
    const raw = data.payments.filter(
      (p) =>
        p.eventId === activeEvent?.id ||
        ((!p.eventId || data.clientEvents.length === 1) &&
          p.clientId === activeClient?.id)
    );
    const seen = new Set<string>();
    return raw.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [data, activeEvent, activeClient]);

  const evtTasks = useMemo(
    () => data?.tasks.filter((t) => t.eventId === activeEvent?.id) || [],
    [data, activeEvent]
  );

  const evtCrew = useMemo(
    () => data?.crewAssignments.filter((c) => c.eventId === activeEvent?.id) || [],
    [data, activeEvent]
  );

  const proofingGallery = activeEvent?.proofingGallery;
  const proofingPhotos: ProofingPhotoItem[] = proofingGallery?.photos || [];
  const favoritePhotosCount = useMemo(
    () => proofingPhotos.filter((p) => p.isSelectedForAlbum).length,
    [proofingPhotos]
  );
  const notesPhotosCount = useMemo(
    () =>
      proofingPhotos.filter(
        (p) => p.retouchingNote && p.retouchingNote.trim().length > 0
      ).length,
    [proofingPhotos]
  );

  const uniqueProofingDays = useMemo(
    () => Array.from(new Set(proofingPhotos.map((p) => p.dayLabel).filter(Boolean))),
    [proofingPhotos]
  );
  const uniqueProofingCategories = useMemo(
    () => Array.from(new Set(proofingPhotos.map((p) => p.category).filter(Boolean))),
    [proofingPhotos]
  );

  const filteredProofingPhotos = useMemo(() => {
    return proofingPhotos.filter((p) => {
      if (proofingFilter === "FAVORITES" && !p.isSelectedForAlbum) return false;
      if (
        proofingFilter === "NOTES" &&
        (!p.retouchingNote || !p.retouchingNote.trim())
      ) {
        return false;
      }
      if (proofingDayFilter !== "ALL" && p.dayLabel !== proofingDayFilter) {
        return false;
      }
      if (
        proofingCategoryFilter !== "ALL" &&
        p.category !== proofingCategoryFilter
      ) {
        return false;
      }
      if (proofingSearch.trim()) {
        const q = proofingSearch.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.retouchingNote || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [
    proofingPhotos,
    proofingFilter,
    proofingDayFilter,
    proofingCategoryFilter,
    proofingSearch,
  ]);

  const activeLightboxPhoto = useMemo(
    () => proofingPhotos.find((p) => p.id === lightboxPhotoId) || null,
    [proofingPhotos, lightboxPhotoId]
  );

  const handleCopyText = (key: string, value: string) => {
    if (typeof window === "undefined" || !value) return;
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const handleCustomerLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authIdentifier.trim() || !authPin.trim()) {
      setAuthError("Please enter your registered Email or Phone Number and your Account Password.");
      return;
    }
    setVerifyingAuth(true);
    setAuthError("");
    const ok = await fetchPortalData({
      identifier: authIdentifier.trim(),
      pin: authPin.trim(),
    });
    setVerifyingAuth(false);
    if (ok) {
      showToast("Signed in to your private Client Portal account!");
    }
  };

  const handleLockAndSignOut = () => {
    clearCustomerPortalSession();
    setIsAuthenticated(false);
    setData(null);
    setAuthPin("");
    setAuthError("");
  };

  const handleSwitchCelebration = async (eventId: string) => {
    setSelectedEventId(eventId);
    await fetchPortalData({
      identifier: activeClient?.email || activeClient?.phone || authIdentifier,
      eventId,
      pin: authPin,
    });
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent || !data) return;
    setSavingSchedule(true);

    const payloadBody = {
      action: "UPDATE_EVENT_SCHEDULE",
      eventId: activeEvent.id,
      pin: authPin,
      title: editTitle,
      eventDate: editDate,
      venue: editVenue,
      city: editCity,
      startTime: editStartTime,
      endTime: editEndTime,
      clientNotes: editClientNotes,
    };

    const applyOptimisticSchedule = async () => {
      const nextEvents = data.clientEvents.map((ev) =>
        ev.id === activeEvent.id
          ? {
              ...ev,
              title: editTitle,
              eventDate: editDate,
              venue: editVenue,
              city: editCity,
              startTime: editStartTime,
              endTime: editEndTime,
              clientApprovalNotes: editClientNotes,
            }
          : ev
      );
      const nextData: PortalPayload = { ...data, clientEvents: nextEvents };
      setData(nextData);
      await saveOfflinePortalData(nextData);
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await applyOptimisticSchedule();
      await enqueueBackgroundSync({
        type: "UPDATE_PROPOSAL_ADDONS",
        endpoint: "/api/client-portal",
        method: "POST",
        body: payloadBody,
        label: `Saved event schedule & client notes for ${editTitle}`,
        eventId: activeEvent.id,
      });
      setIsEditingSchedule(false);
      setSavingSchedule(false);
      showToast("Schedule & notes cached locally — queued for Background Sync!");
      return;
    }

    try {
      const res = await fetch("/api/client-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        await fetchPortalData({
          identifier: activeClient?.email || activeClient?.phone || authIdentifier,
          eventId: activeEvent.id,
          pin: authPin,
        });
        setIsEditingSchedule(false);
        showToast("Celebration schedule & venue details updated!");
      } else if (json?.offlineQueued) {
        await applyOptimisticSchedule();
        await enqueueBackgroundSync({
          type: "UPDATE_PROPOSAL_ADDONS",
          endpoint: "/api/client-portal",
          method: "POST",
          body: payloadBody,
          label: `Saved event schedule & client notes for ${editTitle}`,
          eventId: activeEvent.id,
        });
        setIsEditingSchedule(false);
        showToast("Schedule & notes cached locally — queued for Background Sync!");
      } else {
        showToast(json.error || "Could not update schedule.", "error");
      }
    } catch {
      await applyOptimisticSchedule();
      await enqueueBackgroundSync({
        type: "UPDATE_PROPOSAL_ADDONS",
        endpoint: "/api/client-portal",
        method: "POST",
        body: payloadBody,
        label: `Saved event schedule & client notes for ${editTitle}`,
        eventId: activeEvent.id,
      });
      setIsEditingSchedule(false);
      showToast("Schedule & notes cached locally — queued for Background Sync!");
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleAddCelebrationDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent) return;
    setSavingSchedule(true);
    try {
      const res = await fetch("/api/client-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_EVENT_SCHEDULE",
          eventId: activeEvent.id,
          pin: authPin,
          addDay: {
            eventType: newDayType,
            date: newDayDate || activeEvent.eventDate,
            venue: newDayVenue || activeEvent.venue,
            droneIncluded: newDayDrone,
            customPrice: 45000,
          },
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        await fetchPortalData({
          identifier: activeClient?.email || activeClient?.phone || authIdentifier,
          eventId: activeEvent.id,
          pin: authPin,
        });
        setShowAddDayForm(false);
        showToast(`Added ${newDayType} coverage day (+PKR 45,000) to your celebration!`);
      } else {
        showToast(json.error || "Failed to add celebration day.", "error");
      }
    } catch {
      showToast("Network error while adding day.", "error");
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleToggleAddon = async (addonLabel: string) => {
    if (!activeEvent || !data || savingAddons) return;
    const current = activeEvent.selectedAddons || [];
    const nextAddons = current.includes(addonLabel)
      ? current.filter((a) => a !== addonLabel)
      : [...current, addonLabel];

    const payloadBody = {
      action: "TOGGLE_EVENT_ADDONS",
      eventId: activeEvent.id,
      pin: authPin,
      selectedAddons: nextAddons,
    };

    const applyOptimisticAddons = async () => {
      const nextEvents = data.clientEvents.map((ev) =>
        ev.id === activeEvent.id
          ? {
              ...ev,
              selectedAddons: nextAddons,
            }
          : ev
      );
      const nextData: PortalPayload = { ...data, clientEvents: nextEvents };
      setData(nextData);
      await saveOfflinePortalData(nextData);
    };

    setSavingAddons(true);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await applyOptimisticAddons();
      await enqueueBackgroundSync({
        type: "UPDATE_PROPOSAL_ADDONS",
        endpoint: "/api/client-portal",
        method: "POST",
        body: payloadBody,
        label: `Updated proposal add-on "${addonLabel}" in ${activeEvent.title}`,
        eventId: activeEvent.id,
      });
      setSavingAddons(false);
      showToast("Proposal add-on cached locally — queued for Background Sync!");
      return;
    }

    try {
      const res = await fetch("/api/client-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        await fetchPortalData({
          identifier: activeClient?.email || activeClient?.phone || authIdentifier,
          eventId: activeEvent.id,
          pin: authPin,
        });
        showToast("Luxury add-ons updated and synced with your quotation!");
      } else if (json?.offlineQueued) {
        await applyOptimisticAddons();
        await enqueueBackgroundSync({
          type: "UPDATE_PROPOSAL_ADDONS",
          endpoint: "/api/client-portal",
          method: "POST",
          body: payloadBody,
          label: `Updated proposal add-on "${addonLabel}" in ${activeEvent.title}`,
          eventId: activeEvent.id,
        });
        showToast("Proposal add-on cached locally — queued for Background Sync!");
      }
    } catch {
      await applyOptimisticAddons();
      await enqueueBackgroundSync({
        type: "UPDATE_PROPOSAL_ADDONS",
        endpoint: "/api/client-portal",
        method: "POST",
        body: payloadBody,
        label: `Updated proposal add-on "${addonLabel}" in ${activeEvent.title}`,
        eventId: activeEvent.id,
      });
      showToast("Proposal add-on cached locally — queued for Background Sync!");
    } finally {
      setSavingAddons(false);
    }
  };

  // Proofing Gallery Actions (using /api/gallery/[eventId])
  const handleTogglePhotoFavorite = async (photoId: string) => {
    if (!activeEvent || !data) return;

    // Optimistic local & offline vault update
    const updatedPhotos = proofingPhotos.map((p) =>
      p.id === photoId
        ? { ...p, isSelectedForAlbum: !p.isSelectedForAlbum }
        : p
    );
    const targetPhoto = updatedPhotos.find((p) => p.id === photoId);
    const nextEvents = data.clientEvents.map((e) =>
      e.id === activeEvent.id && e.proofingGallery
        ? {
            ...e,
            proofingGallery: {
              ...e.proofingGallery,
              photos: updatedPhotos,
            },
          }
        : e
    );
    const nextData: PortalPayload = { ...data, clientEvents: nextEvents };
    setData(nextData);
    await saveOfflinePortalData(nextData);

    const syncActionLabel = `${targetPhoto?.isSelectedForAlbum ? "Hearted" : "Unhearted"} favorite photo "${targetPhoto?.title || photoId}" in ${activeEvent.title}`;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueBackgroundSync({
        type: "TOGGLE_PHOTO_SELECTION",
        endpoint: `/api/gallery/${encodeURIComponent(activeEvent.id)}`,
        method: "POST",
        body: {
          action: "TOGGLE_SELECT",
          photoId,
        },
        label: syncActionLabel,
        eventId: activeEvent.id,
      });
      showToast("Favorite cached locally — queued for Workbox Background Sync!");
      return;
    }

    try {
      const res = await fetch(
        `/api/gallery/${encodeURIComponent(activeEvent.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "TOGGLE_SELECT",
            photoId,
          }),
        }
      );
      const json = await res.json().catch(() => null);
      if (json?.offlineQueued || !navigator.onLine) {
        await enqueueBackgroundSync({
          type: "TOGGLE_PHOTO_SELECTION",
          endpoint: `/api/gallery/${encodeURIComponent(activeEvent.id)}`,
          method: "POST",
          body: {
            action: "TOGGLE_SELECT",
            photoId,
          },
          label: syncActionLabel,
          eventId: activeEvent.id,
        });
        showToast("Favorite cached locally — queued for Workbox Background Sync!");
      }
    } catch {
      await enqueueBackgroundSync({
        type: "TOGGLE_PHOTO_SELECTION",
        endpoint: `/api/gallery/${encodeURIComponent(activeEvent.id)}`,
        method: "POST",
        body: {
          action: "TOGGLE_SELECT",
          photoId,
        },
        label: syncActionLabel,
        eventId: activeEvent.id,
      });
      showToast("Favorite saved to Offline Vault — queued for Background Sync!");
    }
  };

  const handleSavePhotoNote = async (photoId: string, noteText: string) => {
    if (!activeEvent || !data) return;

    const updatedPhotos = proofingPhotos.map((p) =>
      p.id === photoId
        ? { ...p, retouchingNote: noteText, isSelectedForAlbum: true }
        : p
    );
    const targetPhoto = updatedPhotos.find((p) => p.id === photoId);
    const nextEvents = data.clientEvents.map((e) =>
      e.id === activeEvent.id && e.proofingGallery
        ? {
            ...e,
            proofingGallery: {
              ...e.proofingGallery,
              photos: updatedPhotos,
            },
          }
        : e
    );
    const nextData: PortalPayload = { ...data, clientEvents: nextEvents };
    setData(nextData);
    setEditingNotePhotoId(null);
    await saveOfflinePortalData(nextData);

    const syncNoteLabel = `Saved retouching note on "${targetPhoto?.title || photoId}" in ${activeEvent.title}`;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueBackgroundSync({
        type: "UPDATE_RETOUCH_NOTE",
        endpoint: `/api/gallery/${encodeURIComponent(activeEvent.id)}`,
        method: "POST",
        body: {
          action: "SAVE_NOTE",
          photoId,
          retouchingNote: noteText,
        },
        label: syncNoteLabel,
        eventId: activeEvent.id,
      });
      showToast("Note cached locally — queued for Workbox Background Sync!");
      return;
    }

    try {
      const res = await fetch(
        `/api/gallery/${encodeURIComponent(activeEvent.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "SAVE_NOTE",
            photoId,
            retouchingNote: noteText,
          }),
        }
      );
      const json = await res.json().catch(() => null);
      if (json?.offlineQueued) {
        await enqueueBackgroundSync({
          type: "UPDATE_RETOUCH_NOTE",
          endpoint: `/api/gallery/${encodeURIComponent(activeEvent.id)}`,
          method: "POST",
          body: {
            action: "SAVE_NOTE",
            photoId,
            retouchingNote: noteText,
          },
          label: syncNoteLabel,
          eventId: activeEvent.id,
        });
        showToast("Note cached locally — queued for Workbox Background Sync!");
      } else if (res.ok) {
        showToast("Retouching note saved for post-production editors!");
      }
    } catch {
      await enqueueBackgroundSync({
        type: "UPDATE_RETOUCH_NOTE",
        endpoint: `/api/gallery/${encodeURIComponent(activeEvent.id)}`,
        method: "POST",
        body: {
          action: "SAVE_NOTE",
          photoId,
          retouchingNote: noteText,
        },
        label: syncNoteLabel,
        eventId: activeEvent.id,
      });
      showToast("Note saved to Offline Vault — queued for Background Sync!");
    }
  };

  const handleAddCustomProofingFrame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent || !customFrameTitle.trim() || !customFrameUrl.trim()) return;
    try {
      const res = await fetch(
        `/api/gallery/${encodeURIComponent(activeEvent.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ADD_PHOTO",
            title: customFrameTitle.trim(),
            url: customFrameUrl.trim(),
            dayLabel: customFrameDay,
            category: customFrameCategory,
          }),
        }
      );
      if (res.ok) {
        setCustomFrameTitle("");
        setCustomFrameUrl("");
        setShowAddFrameForm(false);
        await fetchPortalData({
          identifier: authIdentifier,
          eventId: activeEvent.id,
          pin: authPin,
        });
        showToast("Frame added to your Proofing Gallery & marked as Album Favorite!");
      }
    } catch {
      showToast("Failed to add frame.", "error");
    }
  };

  const handleSubmitAlbumSelection = async () => {
    if (!activeEvent) return;
    setSubmittingAlbum(true);
    try {
      const res = await fetch(
        `/api/gallery/${encodeURIComponent(activeEvent.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "SUBMIT_FINAL_SELECTION",
            clientSubmissionNote: albumSubmissionNote,
          }),
        }
      );
      if (res.ok) {
        await fetchPortalData({
          identifier: authIdentifier,
          eventId: activeEvent.id,
          pin: authPin,
        });
        showToast(
          `Final Luxury Album Selection (${favoritePhotosCount} favorites) submitted to Royal Studio Post-Production!`
        );
      }
    } catch {
      showToast("Could not submit album selection.", "error");
    } finally {
      setSubmittingAlbum(false);
    }
  };

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDepositFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setDepositReceiptDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDepositUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent) return;
    if (!depositAmount || depositAmount <= 0) {
      showToast("Please enter a valid deposit amount in PKR.", "error");
      return;
    }
    if (!depositReference.trim()) {
      showToast("Please enter your Bank / RAAST / Wallet transaction reference.", "error");
      return;
    }
    setUploadingDeposit(true);
    try {
      const res = await fetch("/api/client-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPLOAD_DEPOSIT_RECEIPT",
          eventId: activeEvent.id,
          pin: authPin,
          amount: depositAmount,
          method: depositMethod,
          reference: depositReference.trim(),
          senderAccountTitle: depositSenderTitle.trim(),
          receiptImageUrl: depositReceiptDataUrl || undefined,
          notes: depositNotes.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setDepositReference("");
        setDepositReceiptDataUrl("");
        setDepositFileName("");
        setDepositNotes("");
        await fetchPortalData({
          identifier: activeClient?.email || activeClient?.phone || authIdentifier,
          eventId: activeEvent.id,
          pin: authPin,
        });
        showToast(json.message || "Deposit receipt submitted for verification!");
      } else {
        showToast(json.error || "Could not upload deposit receipt.", "error");
      }
    } catch {
      showToast("Network error while uploading deposit receipt.", "error");
    } finally {
      setUploadingDeposit(false);
    }
  };

  const handleApproveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent || !data) return;
    if (!signatureName.trim()) {
      showToast("Please type your full name to sign and approve.", "error");
      return;
    }
    setApprovingContract(true);

    const payloadBody = {
      action: "APPROVE_PROPOSAL",
      eventId: activeEvent.id,
      pin: authPin,
      signatureName: signatureName.trim(),
      clientNotes: contractNotes.trim(),
    };

    const applyOptimisticApproval = async () => {
      const nowIso = new Date().toISOString();
      const nextEvents = data.clientEvents.map((ev) =>
        ev.id === activeEvent.id
          ? {
              ...ev,
              approvedByClient: signatureName.trim(),
              approvedAt: nowIso,
              clientApprovalNotes: contractNotes.trim(),
            }
          : ev
      );
      const nextData: PortalPayload = { ...data, clientEvents: nextEvents };
      setData(nextData);
      await saveOfflinePortalData(nextData);
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await applyOptimisticApproval();
      await enqueueBackgroundSync({
        type: "UPDATE_PROPOSAL_ADDONS",
        endpoint: "/api/client-portal",
        method: "POST",
        body: payloadBody,
        label: `Signed proposal & saved contract notes for ${activeEvent.title}`,
        eventId: activeEvent.id,
      });
      setApprovingContract(false);
      showToast("Proposal approval & notes cached locally — queued for Background Sync!");
      return;
    }

    try {
      const res = await fetch("/api/client-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        await fetchPortalData({
          identifier: activeClient?.email || activeClient?.phone || authIdentifier,
          eventId: activeEvent.id,
          pin: authPin,
        });
        showToast(json.message || "Proposal digitally signed and approved!");
      } else if (json?.offlineQueued) {
        await applyOptimisticApproval();
        await enqueueBackgroundSync({
          type: "UPDATE_PROPOSAL_ADDONS",
          endpoint: "/api/client-portal",
          method: "POST",
          body: payloadBody,
          label: `Signed proposal & saved contract notes for ${activeEvent.title}`,
          eventId: activeEvent.id,
        });
        showToast("Proposal approval & notes cached locally — queued for Background Sync!");
      } else {
        showToast(json.error || "Failed to approve proposal.", "error");
      }
    } catch {
      await applyOptimisticApproval();
      await enqueueBackgroundSync({
        type: "UPDATE_PROPOSAL_ADDONS",
        endpoint: "/api/client-portal",
        method: "POST",
        body: payloadBody,
        label: `Signed proposal & saved contract notes for ${activeEvent.title}`,
        eventId: activeEvent.id,
      });
      showToast("Proposal approval & notes cached locally — queued for Background Sync!");
    } finally {
      setApprovingContract(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent || !activeClient || !data) return;
    if (profileNewPassword.trim() && profileNewPassword.trim().length < 4) {
      showToast("New password must be at least 4 characters.", "error");
      return;
    }
    setSavingProfile(true);

    const cleanNewPass = profileNewPassword.trim();
    const payloadBody = {
      action: "UPDATE_CLIENT_PROFILE",
      eventId: activeEvent.id,
      clientId: activeClient.id,
      pin: authPin,
      name: profileName,
      phone: profilePhone,
      whatsapp: profileWhatsapp,
      email: profileEmail,
      city: profileCity,
      address: profileAddress,
      notes: profileNotes,
      ...(cleanNewPass ? { newPassword: cleanNewPass } : {}),
    };

    const applyOptimisticProfile = async () => {
      const nextData: PortalPayload = {
        ...data,
        activeClient: {
          ...activeClient,
          name: profileName,
          phone: profilePhone,
          whatsapp: profileWhatsapp,
          email: profileEmail,
          city: profileCity,
          address: profileAddress,
          notes: profileNotes,
        },
      };
      setData(nextData);
      await saveOfflinePortalData(nextData);
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await applyOptimisticProfile();
      await enqueueBackgroundSync({
        type: "UPDATE_PROPOSAL_ADDONS",
        endpoint: "/api/client-portal",
        method: "POST",
        body: payloadBody,
        label: `Saved client profile & delivery notes for ${profileName}`,
        eventId: activeEvent.id,
      });
      setSavingProfile(false);
      showToast("Profile & notes cached locally — queued for Background Sync!");
      return;
    }

    try {
      const res = await fetch("/api/client-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const nextIdentifier =
          profileEmail.trim() || profilePhone.trim() || authIdentifier;
        const effectivePass = json.updatedPassword || cleanNewPass || authPin;
        if (cleanNewPass) {
          setProfileNewPassword("");
        }
        await fetchPortalData({
          identifier: nextIdentifier,
          eventId: activeEvent.id,
          pin: effectivePass,
        });
        showToast("Your client profile & delivery preferences have been saved!");
      } else if (json?.offlineQueued) {
        await applyOptimisticProfile();
        await enqueueBackgroundSync({
          type: "UPDATE_PROPOSAL_ADDONS",
          endpoint: "/api/client-portal",
          method: "POST",
          body: payloadBody,
          label: `Saved client profile & delivery notes for ${profileName}`,
          eventId: activeEvent.id,
        });
        showToast("Profile & notes cached locally — queued for Background Sync!");
      } else {
        showToast(json.error || "Could not update profile.", "error");
      }
    } catch {
      await applyOptimisticProfile();
      await enqueueBackgroundSync({
        type: "UPDATE_PROPOSAL_ADDONS",
        endpoint: "/api/client-portal",
        method: "POST",
        body: payloadBody,
        label: `Saved client profile & delivery notes for ${profileName}`,
        eventId: activeEvent.id,
      });
      showToast("Profile & notes cached locally — queued for Background Sync!");
    } finally {
      setSavingProfile(false);
    }
  };

  const studioWhatsapp = (
    profile?.publicWhatsappNumber ||
    profile?.whatsapp ||
    profile?.phone ||
    "03084877073"
  ).replace(/[^0-9]/g, "");
  const formattedWa = studioWhatsapp.startsWith("92")
    ? studioWhatsapp
    : `92${studioWhatsapp.replace(/^0/, "")}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-20 px-4 sm:px-6 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto" />
          <p className="font-display text-xl text-primary">
            Verifying Private Client Portal Credentials...
          </p>
        </div>
      </div>
    );
  }

  // STRICT PER-CUSTOMER AUTHENTICATION GATE: No customer can see any other customer's event data
  if (!isAuthenticated || !data || !activeEvent) {
    return (
      <main className="min-h-screen bg-background pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <ClientPortalOfflineStatusBanner
            contextLabel="Client Portal Login"
            showCompactOnlineIndicator={false}
          />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Private Customer Portal Login Card */}
            <div className="lg:col-span-7 rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-premium space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-accent">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Exclusive Client Account Sign In · No PIN Required</span>
                </div>
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary">
                  Client Portal Sign In
                </h1>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                  Sign in with your <strong className="text-primary">Registered Email or Phone Number</strong>{" "}
                  and the <strong className="text-primary">Account Password</strong> generated for your profile by Royal Studio Admin. Only you can access your bookings, proofing gallery, and invoices.
                </p>
              </div>

              <form onSubmit={handleCustomerLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-primary mb-1.5">
                    1. Registered Email or Phone Number
                  </label>
                  <input
                    type="text"
                    value={authIdentifier}
                    onChange={(e) => setAuthIdentifier(e.target.value)}
                    placeholder="e.g. client@email.com or 0300-8411223"
                    required
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-primary">
                      2. Account Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      className="text-[11px] font-semibold text-accent hover:underline cursor-pointer"
                    >
                      {showLoginPassword ? "Hide Password" : "Show Password"}
                    </button>
                  </div>
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    value={authPin}
                    onChange={(e) => setAuthPin(e.target.value)}
                    placeholder="Enter your password (e.g. RS#4829 or RS@1223)"
                    required
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-mono text-primary focus:outline-none focus:border-accent"
                  />
                  <p className="mt-1.5 text-[11px] text-text-muted">
                    Generated for your Client Profile in the Studio Admin Clients section and shared via WhatsApp.
                  </p>
                </div>

                {authError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={verifyingAuth}
                  className="w-full py-3.5 rounded-xl bg-accent hover:opacity-90 text-[#111111] font-bold text-xs uppercase tracking-wider transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {verifyingAuth
                      ? "Signing In to Your Account..."
                      : "Sign In to My Client Account"}
                  </span>
                </button>
              </form>

              <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
                <span>Need a new quote or forgot your password?</span>
                <div className="flex items-center gap-3">
                  <Link
                    href="/contact#inquiry-form"
                    className="font-semibold text-accent hover:underline"
                  >
                    Book New Event →
                  </Link>
                  <span>·</span>
                  <Link
                    href="/admin"
                    className="font-semibold text-primary hover:text-accent"
                  >
                    Studio Admin Login →
                  </Link>
                </div>
              </div>
            </div>

            {/* Right: Simple Explanation of Unified Client Profile & Password Logic */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-3xl border border-border bg-surface p-6 space-y-4 shadow-premium">
                <div className="flex items-center gap-2 text-xs font-bold text-accent">
                  <Sparkles className="w-4 h-4" />
                  <span>Simple &amp; Unified Client Account Workflow</span>
                </div>

                <div className="space-y-3 text-xs text-text-muted leading-relaxed">
                  <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                    <div className="font-bold text-primary">
                      Step 1: Managed Under Your Client Profile (/admin → Clients)
                    </div>
                    <p>
                      Studio Admin manages your entire account in <Link href="/admin" className="text-accent underline">/admin</Link> → <strong>Clients</strong>: generates your <strong>Login Password</strong> (just like staff), uploads your <strong>Proofing Gallery Photos</strong>, and links your <strong>Google Drive &amp; 4K Films</strong> in one place.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                    <div className="font-bold text-primary">
                      Step 2: Password Sign-In (No PIN Required)
                    </div>
                    <p>
                      Admin sends your login invite via WhatsApp. Sign in exclusively at <code>/client-portal</code> using your registered <strong>Email or Phone Number + Password</strong>.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                    <div className="font-bold text-primary">
                      Step 3: Strict Account Isolation
                    </div>
                    <p>
                      Once signed in, only you can view and manage your celebration schedule, curate your Proofing Gallery album favorites, stream your 4K wedding films, access your 15GB Google Drive folder, and download your invoices.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border space-y-2 text-xs text-text-muted">
                  <div className="font-bold text-primary">
                    Need Your Login Password?
                  </div>
                  <p>
                    Contact Royal Studio Concierge on WhatsApp (<strong>0308-4877073</strong>) from your registered phone number to receive your login password.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pt-24 pb-24 px-4 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 max-w-md rounded-2xl border border-accent/50 bg-surface px-4 py-3 shadow-premium-lg flex items-center gap-3">
          <CheckCircle2
            className={`w-5 h-5 shrink-0 ${
              toastMessage.type === "error" ? "text-rose-500" : "text-emerald-500"
            }`}
          />
          <span className="text-xs font-semibold text-primary">
            {toastMessage.text}
          </span>
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-6">
        {/* Global Offline Status & Workbox Local Caching Banner */}
        <ClientPortalOfflineStatusBanner contextLabel="Client Portal" />

        {/* Top Bar: Authenticated Customer Session Status & Privacy Lock */}
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-premium flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-500 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Private Session Verified: {activeClient?.name}</span>
            </span>

            {(data?.celebrationDirectory || []).length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">My Events:</span>
                <select
                  value={activeEvent?.id || ""}
                  onChange={(e) => handleSwitchCelebration(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-primary focus:outline-none focus:border-accent"
                >
                  {(data?.celebrationDirectory || []).map((item) => (
                    <option key={item.eventId} value={item.eventId}>
                      {item.title} ({item.city})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("royal-studio-open-offline-vault", {
                    detail: { tab: "PROPOSALS" },
                  })
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-accent/40 bg-accent/10 hover:bg-accent/20 text-xs font-bold text-accent transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Offline Vault &amp; Sync</span>
            </button>
            <button
              type="button"
              onClick={handleLockAndSignOut}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold text-rose-500 transition-colors cursor-pointer"
              title="Sign out and lock private customer portal"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock &amp; Sign Out</span>
            </button>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-background hover:border-accent text-xs font-semibold text-text-muted hover:text-primary transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-accent" />
              <span>Studio ERP Login</span>
            </Link>
          </div>
        </div>

        {/* Luxury Client Portal Hero Header */}
        {activeEvent && (
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#121216] via-[#191920] to-[#121216] text-[#F5F2EB] border border-[#D4AF37]/35 shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] font-display font-bold text-2xl shrink-0">
                {(activeClient?.name || "R").charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest">
                    <Sparkles className="w-3 h-3" />
                    <span>
                      {profile?.studioName || "Royal Studio"} · Interactive Client Portal
                    </span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                    Status: {activeEvent.status}
                  </span>
                  {activeEvent.approvedByClient && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                      ✓ Signed by {activeEvent.approvedByClient}
                    </span>
                  )}
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  {activeEvent.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#A39E93]">
                  <span>Client: <strong className="text-white">{activeClient?.name}</strong></span>
                  <span>·</span>
                  <span>Date: <strong className="text-white">{formatDate(activeEvent.eventDate)}</strong></span>
                  <span>·</span>
                  <span>Venue: <strong className="text-white">{activeEvent.venue}, {activeEvent.city}</strong></span>
                  <span>·</span>
                  <span>Account: <strong className="text-[#D4AF37]">{activeClient?.email || activeClient?.phone}</strong></span>
                </div>
              </div>
            </div>

            {/* Interactive Tab Navigation Bar */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#0D0D0F]/90 border border-white/10 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("CELEBRATION")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "CELEBRATION"
                    ? "bg-[#D4AF37] text-[#111111] shadow-xs"
                    : "text-[#A39E93] hover:text-white"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Celebration &amp; Add-Ons</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("MEDIA_VAULT")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "MEDIA_VAULT"
                    ? "bg-[#D4AF37] text-[#111111] shadow-xs"
                    : "text-[#A39E93] hover:text-white"
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>4K Films &amp; 15GB Drive Vault</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("PROOFING")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "PROOFING"
                    ? "bg-[#D4AF37] text-[#111111] shadow-xs"
                    : "text-[#A39E93] hover:text-white"
                }`}
              >
                <Heart className="w-3.5 h-3.5" />
                <span>
                  Proofing Gallery ({favoritePhotosCount}/{proofingPhotos.length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("PAYMENTS")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "PAYMENTS"
                    ? "bg-[#D4AF37] text-[#111111] shadow-xs"
                    : "text-[#A39E93] hover:text-white"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Payments &amp; Deposit Upload</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("CONTRACT")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "CONTRACT"
                    ? "bg-[#D4AF37] text-[#111111] shadow-xs"
                    : "text-[#A39E93] hover:text-white"
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Digital Contract</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("PROFILE")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "PROFILE"
                    ? "bg-[#D4AF37] text-[#111111] shadow-xs"
                    : "text-[#A39E93] hover:text-white"
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>My Profile</span>
              </button>
            </div>
          </div>
        )}

        {/* KPI Cards Row */}
        {activeEvent && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-surface rounded-2xl border border-border shadow-xs">
              <div className="flex items-center justify-between text-text-muted text-xs font-semibold uppercase tracking-wider mb-1.5">
                <span>Total Package &amp; Add-Ons</span>
                <Calendar className="w-4 h-4 text-accent" />
              </div>
              <div className="font-mono text-2xl font-bold text-primary">
                {formatPKR(activeEvent.packagePrice)}
              </div>
              <div className="text-[11px] text-text-muted mt-1">
                {evtDays.length || activeEvent.daysCount || 1} Celebration Day(s) ·{" "}
                {(activeEvent.selectedAddons || []).length} Luxury Add-Ons
              </div>
            </div>

            <div className="p-5 bg-surface rounded-2xl border border-border shadow-xs">
              <div className="flex items-center justify-between text-text-muted text-xs font-semibold uppercase tracking-wider mb-1.5">
                <span>Verified Amount Paid</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatPKR(activeEvent.totalClientPayments)}
              </div>
              <div className="text-[11px] text-text-muted mt-1">
                Remaining Balance:{" "}
                <strong className="font-mono text-amber-500">
                  {formatPKR(activeEvent.remainingBalance)}
                </strong>
              </div>
            </div>

            <div
              onClick={() => setActiveTab("PROOFING")}
              className="p-5 bg-surface rounded-2xl border border-border hover:border-rose-500/50 shadow-xs cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between text-text-muted text-xs font-semibold uppercase tracking-wider mb-1.5">
                <span>Album Favorite Proofs</span>
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              </div>
              <div className="font-mono text-2xl font-bold text-rose-500">
                {favoritePhotosCount} / {proofingPhotos.length} Frames
              </div>
              <div className="text-[11px] text-text-muted mt-1">
                {notesPhotosCount} Retouching Notes · Click to curate album →
              </div>
            </div>

            <div className="p-5 bg-surface rounded-2xl border border-border shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-text-muted text-xs font-semibold uppercase tracking-wider mb-1">
                <span>Direct Studio Producer</span>
                <MessageCircle className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-[11px] text-text-muted leading-snug">
                Instant WhatsApp support for schedule, crew, or album design.
              </p>
              <a
                href={`https://wa.me/${formattedWa}?text=${encodeURIComponent(
                  `Assalam-o-Alaikum ${profile?.studioName || "Royal Studio"}, I am viewing my Client Portal for "${activeEvent.title}" (${activeClient?.name}) and would like to discuss my celebration.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp Studio Concierge</span>
              </a>
            </div>
          </div>
        )}

        {/* ===================== TAB 1: CELEBRATION SCHEDULE & ADD-ONS ===================== */}
        {activeTab === "CELEBRATION" && activeEvent && (
          <div className="space-y-6">
            {/* Event Overview & Action Bar */}
            <div className="bg-surface rounded-2xl border border-border p-6 sm:p-7 space-y-6 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
                    Booking &amp; Coverage Control Center
                  </span>
                  <h2 className="font-display text-2xl font-bold text-primary mt-0.5">
                    {activeEvent.title} — Schedule &amp; Production Details
                  </h2>
                  <p className="text-xs text-text-muted mt-1">
                    Review your multi-day timeline, customize luxury add-ons, or download official PDF documents.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingSchedule((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-background hover:border-accent text-xs font-semibold text-primary cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-accent" />
                    <span>{isEditingSchedule ? "Cancel Edit" : "Edit Date / Venue"}</span>
                  </button>

                  <Link
                    href={`/proposal/${encodeURIComponent(evtQuotation?.id || activeEvent.id)}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent hover:opacity-90 text-[#111111] text-xs font-bold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Full Interactive Proposal</span>
                  </Link>

                  {evtQuotation && activeClient && profile && (
                    <button
                      type="button"
                      onClick={() =>
                        generateQuotationPDF(
                          evtQuotation,
                          activeEvent,
                          activeClient,
                          profile,
                          evtDays
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background hover:border-accent text-xs font-semibold text-primary cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-accent" />
                      <span>Quotation PDF</span>
                    </button>
                  )}

                  {evtInvoice && activeClient && profile && (
                    <button
                      type="button"
                      onClick={() =>
                        generateInvoicePDF(
                          evtInvoice,
                          activeEvent,
                          activeClient,
                          profile,
                          evtDays,
                          evtPayments
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background hover:border-accent text-xs font-semibold text-primary cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-accent" />
                      <span>Invoice PDF</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Inline Schedule & Venue Editor */}
              {isEditingSchedule && (
                <form
                  onSubmit={handleSaveSchedule}
                  className="p-5 rounded-2xl bg-background border border-accent/40 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-primary">
                      Update Celebration Date, Venue &amp; Timing
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsEditingSchedule(false)}
                      className="text-xs text-text-muted hover:text-primary cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-primary mb-1">
                        Celebration Title
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-primary"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-primary mb-1">
                        Primary Event Date
                      </label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-primary"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-primary mb-1">
                        Venue / Marquee Name
                      </label>
                      <input
                        type="text"
                        value={editVenue}
                        onChange={(e) => setEditVenue(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-primary"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-primary mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-primary"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-primary mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={editStartTime}
                        onChange={(e) => setEditStartTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-primary"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-primary mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={editEndTime}
                        onChange={(e) => setEditEndTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-primary"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="submit"
                      disabled={savingSchedule}
                      className="px-4 py-2 rounded-xl bg-accent text-[#111111] text-xs font-bold cursor-pointer"
                    >
                      {savingSchedule ? "Saving Changes..." : "Save Schedule Updates"}
                    </button>
                  </div>
                </form>
              )}

              {/* Multi-Day Celebration Coverage Schedule */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                    <span>
                      Multi-Day Celebration Coverage Schedule ({evtDays.length || 1} Days)
                    </span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddDayForm((prev) => !prev)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Celebration Function / Day</span>
                  </button>
                </div>

                {showAddDayForm && (
                  <form
                    onSubmit={handleAddCelebrationDay}
                    className="p-4 rounded-xl bg-background border border-accent/40 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-xs"
                  >
                    <div>
                      <label className="block font-semibold text-primary mb-1">
                        Function Name
                      </label>
                      <select
                        value={newDayType}
                        onChange={(e) => setNewDayType(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-primary"
                      >
                        <option value="Nikah Ceremony">Nikah Ceremony</option>
                        <option value="Mehndi / Mayoun">Mehndi / Mayoun</option>
                        <option value="Barat Reception">Barat Reception</option>
                        <option value="Walima Banquet">Walima Banquet</option>
                        <option value="Qawali / Dholki Night">Qawali / Dholki Night</option>
                        <option value="Bridal & Couple Shoot">Bridal &amp; Couple Shoot</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-primary mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={newDayDate}
                        onChange={(e) => setNewDayDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-primary"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-primary mb-1">
                        Venue
                      </label>
                      <input
                        type="text"
                        value={newDayVenue}
                        onChange={(e) => setNewDayVenue(e.target.value)}
                        placeholder="Venue or Hall"
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-primary"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={savingSchedule}
                        className="w-full py-2 px-3 rounded-lg bg-accent text-[#111111] font-bold cursor-pointer"
                      >
                        + Add Function
                      </button>
                    </div>
                  </form>
                )}

                {evtDays.length === 0 ? (
                  <div className="p-4 rounded-xl bg-background border border-border text-xs text-text-muted">
                    Primary Event Coverage: <strong className="text-primary">{activeEvent.title}</strong> on{" "}
                    <strong className="text-primary">{formatDate(activeEvent.eventDate)}</strong> at{" "}
                    <strong className="text-primary">{activeEvent.venue}, {activeEvent.city}</strong> ({activeEvent.startTime} – {activeEvent.endTime}).
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {evtDays.map((day) => (
                      <div
                        key={day.id}
                        className="p-4 rounded-xl bg-background border border-border space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-primary">
                            Day {day.dayNumber}: {day.eventType}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-accent">
                            {formatPKR(day.customPrice)}
                          </span>
                        </div>
                        <div className="text-text-muted space-y-1 text-[11px]">
                          <div>📅 {formatDate(day.date)}</div>
                          <div>
                            ⏰ {day.startTime} – {day.endTime} (Crew Call: {day.callTime})
                          </div>
                          <div>📍 {day.venue}</div>
                          <div className="pt-1 text-primary font-medium">
                            🎥 {day.photographersCount ?? 1} Photo ·{" "}
                            {day.cinematographersCount ?? 1} Cinema
                            {day.droneIncluded ? " · 4K Drone Unit" : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Interactive Luxury Add-Ons Configurator */}
              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-accent" />
                      <span>Customize Luxury Production Add-Ons</span>
                    </h3>
                    <p className="text-[11px] text-text-muted">
                      Click any add-on below to include or remove it from your celebration package in real time.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(data?.addonCatalog || []).map((addon) => {
                    const isSelected = (activeEvent.selectedAddons || []).some(
                      (a) => a.toLowerCase() === addon.label.toLowerCase()
                    );
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        disabled={savingAddons}
                        onClick={() => handleToggleAddon(addon.label)}
                        className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? "border-accent bg-accent/10 shadow-xs"
                            : "border-border bg-background hover:border-accent/50"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-primary truncate">
                            {addon.label}
                          </div>
                          <div className="text-[11px] font-mono text-accent font-semibold mt-0.5">
                            + {formatPKR(addon.price)}
                          </div>
                        </div>
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-accent text-[#111111]"
                              : "border border-border text-transparent"
                          }`}
                        >
                          <Check className="w-3 h-3" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assigned Production Crew & Deliverable Pipeline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-accent" />
                    <span>Assigned Studio Production Crew ({evtCrew.length})</span>
                  </h4>
                  {evtCrew.length === 0 ? (
                    <div className="p-3.5 rounded-xl bg-background border border-border text-xs text-text-muted">
                      Senior photographers, cinematographers &amp; drone pilot are reserved for your celebration dates.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {evtCrew.map((c) => (
                        <div
                          key={c.id}
                          className="px-3 py-2 rounded-xl bg-background border border-border text-xs flex items-center gap-2"
                        >
                          <Camera className="w-3.5 h-3.5 text-accent shrink-0" />
                          <div>
                            <div className="font-bold text-primary">{c.name}</div>
                            <div className="text-[10px] text-text-muted">{c.role}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span>Post-Production &amp; Deliverables Tracker</span>
                  </h4>
                  {evtTasks.length === 0 ? (
                    <div className="p-3.5 rounded-xl bg-background border border-border text-xs text-text-muted">
                      Deliverable milestones (Raw Backup, AI Culling, Signature Color Grading, 4K Highlight Film &amp; Luxury Album) are active.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {evtTasks.map((t) => (
                        <div
                          key={t.id}
                          className="p-2.5 rounded-xl bg-background border border-border flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="font-semibold text-primary truncate">
                            {t.title}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              t.status === "Completed"
                                ? "bg-emerald-500/15 text-emerald-500"
                                : t.status === "In Progress"
                                ? "bg-amber-500/15 text-amber-500"
                                : "bg-white/10 text-text-muted"
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 3: INTERACTIVE PHOTO PROOFING GALLERY ===================== */}
        {activeTab === "PROOFING" && activeEvent && (
          <div className="space-y-6">
            {/* Proofing Header & Final Submission Controls */}
            <div className="bg-surface rounded-2xl border border-border p-6 space-y-4 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500">
                    Interactive Luxury Album Curation
                  </span>
                  <h2 className="font-display text-2xl font-bold text-primary flex items-center gap-2 mt-0.5">
                    <BookOpen className="w-5 h-5 text-accent" />
                    <span>{activeEvent.title} — Photo Proofing Gallery</span>
                  </h2>
                  <p className="text-xs text-text-muted mt-1">
                    Click the Heart button on any photograph to select it for your handcrafted Luxury Album, add retouching instructions, and submit to our editors.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddFrameForm((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-background hover:border-accent text-xs font-semibold text-primary cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-accent" />
                    <span>Add Reference Photo</span>
                  </button>

                  <button
                    type="button"
                    disabled={submittingAlbum}
                    onClick={handleSubmitAlbumSelection}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:opacity-95 text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    <Heart className="w-3.5 h-3.5 fill-white" />
                    <span>
                      {submittingAlbum
                        ? "Submitting Selection..."
                        : proofingGallery?.selectionStatus === "Submitted"
                        ? `Update Album Selection (${favoritePhotosCount})`
                        : `Submit Album Favorites (${favoritePhotosCount})`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Album Selection Target Progress & Designer Instructions */}
              <div className="p-3.5 rounded-xl bg-background border border-border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      proofingGallery?.selectionStatus === "Submitted"
                        ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                    }`}
                  >
                    Status: {proofingGallery?.selectionStatus || "Open"}
                  </span>
                  <span className="text-text-muted">
                    Recommended Album Target:{" "}
                    <strong className="text-primary font-mono">
                      {proofingGallery?.minAlbumSelection || 100} –{" "}
                      {proofingGallery?.maxAlbumSelection || 150} Photos
                    </strong>
                  </span>
                </div>
                <div className="flex-1 max-w-md">
                  <input
                    type="text"
                    value={albumSubmissionNote}
                    onChange={(e) => setAlbumSubmissionNote(e.target.value)}
                    placeholder="Optional note for Album Designer (e.g. Velvet Emerald Cover)..."
                    className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-primary"
                  />
                </div>
              </div>

              {/* Add Reference Frame Form */}
              {showAddFrameForm && (
                <form
                  onSubmit={handleAddCustomProofingFrame}
                  className="p-4 rounded-xl bg-background border border-accent/40 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-xs"
                >
                  <div>
                    <label className="block font-semibold text-primary mb-1">
                      Frame Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={customFrameTitle}
                      onChange={(e) => setCustomFrameTitle(e.target.value)}
                      placeholder="e.g. Royal Stage Couple Portrait"
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-primary"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-primary mb-1">
                      Image URL *
                    </label>
                    <input
                      type="url"
                      required
                      value={customFrameUrl}
                      onChange={(e) => setCustomFrameUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-primary"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-primary mb-1">
                      Category
                    </label>
                    <select
                      value={customFrameCategory}
                      onChange={(e) => setCustomFrameCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-primary"
                    >
                      <option value="Couple Portrait">Couple Portrait</option>
                      <option value="Bridal Portrait">Bridal Portrait</option>
                      <option value="Family & Guests">Family &amp; Guests</option>
                      <option value="Decor & Venue">Decor &amp; Venue</option>
                      <option value="Mehndi Candid">Mehndi Candid</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="py-2 px-4 rounded-lg bg-accent text-[#111111] font-bold cursor-pointer"
                  >
                    + Add to Gallery
                  </button>
                </form>
              )}

              {/* Filter & Search Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setProofingFilter("ALL")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      proofingFilter === "ALL"
                        ? "bg-accent text-[#111111]"
                        : "bg-background text-text-muted hover:text-primary border border-border"
                    }`}
                  >
                    All Frames ({proofingPhotos.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setProofingFilter("FAVORITES")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                      proofingFilter === "FAVORITES"
                        ? "bg-rose-500 text-white"
                        : "bg-background text-text-muted hover:text-primary border border-border"
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5 fill-current" />
                    <span>Album Favorites ({favoritePhotosCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProofingFilter("NOTES")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      proofingFilter === "NOTES"
                        ? "bg-emerald-500 text-white"
                        : "bg-background text-text-muted hover:text-primary border border-border"
                    }`}
                  >
                    With Edit Notes ({notesPhotosCount})
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={proofingDayFilter}
                    onChange={(e) => setProofingDayFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-background border border-border text-xs text-primary"
                  >
                    <option value="ALL">All Wedding Days</option>
                    {uniqueProofingDays.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>

                  <select
                    value={proofingCategoryFilter}
                    onChange={(e) => setProofingCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-background border border-border text-xs text-primary"
                  >
                    <option value="ALL">All Categories</option>
                    {uniqueProofingCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <div className="relative w-48 sm:w-56">
                    <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={proofingSearch}
                      onChange={(e) => setProofingSearch(e.target.value)}
                      placeholder="Search frame or note..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-background border border-border text-xs text-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Proofing Gallery Grid with Visually Distinct Favorite Heart Badge Overlays */}
            {filteredProofingPhotos.length === 0 ? (
              <div className="bg-surface rounded-2xl border border-border p-10 text-center space-y-3">
                <Heart className="w-8 h-8 text-rose-500/60 mx-auto" />
                <div className="text-sm font-bold text-primary">
                  No frames match your current gallery filters
                </div>
                <p className="text-xs text-text-muted max-w-md mx-auto">
                  Try switching back to All Frames or clearing your day, category, or search filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setProofingFilter("ALL");
                    setProofingDayFilter("ALL");
                    setProofingCategoryFilter("ALL");
                    setProofingSearch("");
                  }}
                  className="px-4 py-2 rounded-xl bg-accent text-[#111111] text-xs font-bold cursor-pointer"
                >
                  Reset Gallery Filters
                </button>
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProofingPhotos.map((photo, index) => {
                const isSelected = Boolean(photo.isSelectedForAlbum);
                const hasNote = Boolean(
                  photo.retouchingNote && photo.retouchingNote.trim()
                );
                const isEditingNote = editingNotePhotoId === photo.id;

                return (
                  <div
                    key={photo.id}
                    className={`group rounded-2xl overflow-hidden bg-surface border transition-all flex flex-col ${
                      isSelected
                        ? "border-rose-500 ring-2 ring-rose-500/40 shadow-lg"
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    <div className="relative aspect-[4/3] bg-black overflow-hidden">
                      <img
                        src={photo.url}
                        alt={photo.title}
                        loading={index < 6 ? "eager" : "lazy"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/35 pointer-events-none" />

                      {/* Visually Distinct 'Favorite' Heart Badge Overlay on Selected Album Images */}
                      {isSelected && (
                        <>
                          <div className="absolute inset-0 ring-2 ring-inset ring-rose-500/80 bg-rose-500/[0.06] pointer-events-none z-10" />
                          <div
                            aria-label="Favorite — Selected for Luxury Album"
                            className="absolute bottom-12 right-3 z-20 pointer-events-none flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white shadow-[0_6px_20px_rgba(244,63,94,0.65)] border border-white/35"
                          >
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-rose-600 shadow-xs">
                              <Heart className="w-3 h-3 fill-rose-600 text-rose-600" />
                            </span>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider drop-shadow-xs">
                              Album Favorite
                            </span>
                          </div>
                        </>
                      )}

                      {/* Top Bar Controls */}
                      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-bold text-white border border-white/10">
                          {photo.dayLabel} · #{index + 1}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setLightboxPhotoId(photo.id)}
                            className="p-2 rounded-xl bg-black/70 hover:bg-black text-white border border-white/15 backdrop-blur-md transition-colors cursor-pointer"
                            title="Inspect Fullscreen"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTogglePhotoFavorite(photo.id)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                              isSelected
                                ? "bg-rose-500 text-white border border-rose-300/50"
                                : "bg-black/75 hover:bg-rose-500/20 text-white border border-white/15"
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

                      {/* Bottom Caption Overlay */}
                      <div className="absolute bottom-3 left-3 right-3 z-20">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                          {photo.category}
                        </div>
                        <h4 className="text-sm font-bold text-white leading-snug truncate">
                          {photo.title}
                        </h4>
                      </div>
                    </div>

                    {/* Retouching Note Footer */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between gap-2 bg-surface">
                      {isEditingNote ? (
                        <div className="space-y-2">
                          <textarea
                            rows={2}
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            placeholder="Add skin retouching, color grading, or album spread instruction..."
                            className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-primary"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingNotePhotoId(null)}
                              className="px-2.5 py-1 rounded-lg border border-border text-[11px] text-text-muted cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSavePhotoNote(photo.id, noteDraft)}
                              className="px-3 py-1 rounded-lg bg-accent text-[#111111] text-[11px] font-bold cursor-pointer"
                            >
                              Save Note
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs text-text-muted truncate">
                            {hasNote ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                Note: &ldquo;{photo.retouchingNote}&rdquo;
                              </span>
                            ) : (
                              <span>No retouching note added</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNotePhotoId(photo.id);
                              setNoteDraft(photo.retouchingNote || "");
                            }}
                            className="text-[11px] font-bold text-accent hover:underline shrink-0 cursor-pointer"
                          >
                            {hasNote ? "Edit Note" : "+ Edit Note"}
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
        )}

        {/* ===================== TAB 4: PAYMENTS, INVOICES & DEPOSIT UPLOAD ===================== */}
        {activeTab === "PAYMENTS" && activeEvent && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-6">
              {/* Official Studio Payment Channels */}
              <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-primary flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-accent" />
                    <span>Official Studio Payment Channels</span>
                  </h3>
                  <p className="text-xs text-text-muted">
                    Copy any official account or IBAN below, complete your transfer, and submit your receipt on the right.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-4 rounded-xl bg-background border border-border space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                        {profile?.bankName || "Meezan Bank Limited"}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(
                            "iban",
                            profile?.iban || "PK36MEZN0002010105829144"
                          )
                        }
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent/15 text-accent text-[10px] font-bold cursor-pointer"
                      >
                        {copiedKey === "iban" ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedKey === "iban" ? "Copied IBAN" : "Copy IBAN"}</span>
                      </button>
                    </div>
                    <div className="font-bold text-primary">
                      {profile?.accountTitle || "Royal Studio (Muhammad Ramzan)"}
                    </div>
                    <div className="font-mono text-[11px] text-text-muted break-all">
                      IBAN: {profile?.iban || "PK36MEZN0002010105829144"}
                    </div>
                    <div className="font-mono text-[11px] text-text-muted">
                      Account #: {profile?.accountNumber || "0201-0105829144"}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-background border border-border space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                        JazzCash · EasyPaisa · RAAST
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText("wallet", profile?.phone || "0308-4877073")
                        }
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 text-[10px] font-bold cursor-pointer"
                      >
                        {copiedKey === "wallet" ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedKey === "wallet" ? "Copied #" : "Copy Number"}</span>
                      </button>
                    </div>
                    <div className="font-bold text-primary">
                      {profile?.accountTitle || "Muhammad Ramzan / Royal Studio"}
                    </div>
                    <div className="font-mono text-[11px] text-emerald-500">
                      JazzCash / RAAST ID: {profile?.phone || "0308-4877073"}
                    </div>
                    <div className="font-mono text-[11px] text-text-muted">
                      EasyPaisa: {profile?.phone2 || profile?.phone || "0303-2213806"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment History Ledger */}
              <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-primary">
                      Payment &amp; Deposit Receipt Ledger ({evtPayments.length})
                    </h3>
                    <p className="text-xs text-text-muted">
                      All recorded payments and uploaded transfer receipts for {activeEvent.title}.
                    </p>
                  </div>
                </div>

                {evtPayments.length === 0 ? (
                  <div className="p-6 rounded-xl bg-background border border-border text-center text-xs text-text-muted">
                    No payments recorded for this celebration yet. Use the form on the right to submit your deposit receipt.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {evtPayments.map((p) => {
                      const vStatus = p.verificationStatus || "Verified";
                      return (
                        <div
                          key={p.id}
                          className="p-4 rounded-xl bg-background border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-sm text-primary">
                                {formatPKR(p.amount)}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-surface border border-border text-[10px] font-semibold text-primary">
                                {p.method}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  vStatus === "Pending Verification"
                                    ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                                    : vStatus === "Rejected"
                                    ? "bg-rose-500/20 text-rose-500 border border-rose-500/30"
                                    : "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                                }`}
                              >
                                {vStatus}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-text-muted">
                              Date: {formatDate(p.paymentDate)} · Ref: {p.reference || "N/A"}
                              {p.senderAccountTitle ? ` · Sender: ${p.senderAccountTitle}` : ""}
                            </div>
                          </div>

                          {p.receiptImageUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewReceiptImage(p.receiptImageUrl || null)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:border-accent text-[11px] font-semibold text-primary cursor-pointer shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5 text-accent" />
                              <span>View Receipt</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Upload Deposit Receipt Form */}
            <div className="lg:col-span-5">
              <form
                onSubmit={handleDepositUpload}
                className="bg-surface rounded-2xl border border-accent/40 p-6 space-y-4 shadow-xs"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-accent block">
                    Instant Finance Sync
                  </span>
                  <h3 className="font-display text-xl font-bold text-primary">
                    Upload Deposit Receipt
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Submit your Bank / RAAST / JazzCash / EasyPaisa transfer reference and screenshot for verification.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">
                      Transfer Channel *
                    </label>
                    <select
                      value={depositMethod}
                      onChange={(e) => setDepositMethod(e.target.value as PaymentMethod)}
                      className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-xs text-primary"
                    >
                      <option value="Bank Transfer">Bank Transfer (IBAN)</option>
                      <option value="RAAST">RAAST Instant ID</option>
                      <option value="JazzCash">JazzCash Wallet</option>
                      <option value="EasyPaisa">EasyPaisa Wallet</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">
                      Amount Paid (PKR) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={depositAmount || ""}
                      onChange={(e) => setDepositAmount(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-xs font-mono text-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Transaction Reference / TID *
                  </label>
                  <input
                    type="text"
                    required
                    value={depositReference}
                    onChange={(e) => setDepositReference(e.target.value)}
                    placeholder="e.g. TXN-9482710 or RAAST Ref #"
                    className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-xs font-mono text-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Sender Account Title
                  </label>
                  <input
                    type="text"
                    value={depositSenderTitle}
                    onChange={(e) => setDepositSenderTitle(e.target.value)}
                    placeholder={activeClient?.name || "Account Holder Name"}
                    className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-xs text-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Transfer Screenshot (Optional Image)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptFileChange}
                    className="w-full text-xs text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-accent/20 file:text-accent hover:file:bg-accent/30 cursor-pointer"
                  />
                  {depositFileName && (
                    <div className="mt-1 text-[11px] text-emerald-500 font-mono">
                      Attached: {depositFileName}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Notes for Studio Finance
                  </label>
                  <input
                    type="text"
                    value={depositNotes}
                    onChange={(e) => setDepositNotes(e.target.value)}
                    placeholder="e.g. 30% Booking Advance Deposit"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploadingDeposit}
                  className="w-full py-3 rounded-xl bg-accent hover:opacity-95 text-[#111111] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>
                    {uploadingDeposit
                      ? "Submitting Deposit Receipt..."
                      : "Submit Deposit Receipt"}
                  </span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ===================== TAB 4: DIGITAL CONTRACT & PROPOSAL APPROVAL ===================== */}
        {activeTab === "CONTRACT" && activeEvent && (
          <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
                  Digital Agreement &amp; Signature
                </span>
                <h2 className="font-display text-2xl font-bold text-primary mt-0.5">
                  {activeEvent.title} — Official Booking Agreement
                </h2>
                <p className="text-xs text-text-muted mt-1">
                  Review your package terms and sign digitally to lock your celebration dates and production crew.
                </p>
              </div>
              <Link
                href={`/proposal/${encodeURIComponent(evtQuotation?.id || activeEvent.id)}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-[#111111] text-xs font-bold shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Full Printable Proposal</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-4 text-xs text-text-muted leading-relaxed">
                <div className="p-4 rounded-xl bg-background border border-border space-y-2">
                  <h4 className="font-bold text-primary uppercase tracking-wider text-[11px]">
                    1. Studio Terms &amp; Deliverable Guarantee
                  </h4>
                  <p>
                    {profile?.defaultTermsAndConditions ||
                      "30% advance deposit required upon confirmation to lock dates, camera crew, and flagship Sony Cinema & G-Master equipment. 60% due upon event completion; 10% upon final luxury album and 4K master film delivery."}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-background border border-border space-y-2">
                  <h4 className="font-bold text-primary uppercase tracking-wider text-[11px]">
                    2. Coverage &amp; Financial Summary
                  </h4>
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span>Celebration Package &amp; Multi-Day Coverage:</span>
                    <strong className="font-mono text-primary">
                      {formatPKR(activeEvent.packagePrice)}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span>Selected Luxury Add-Ons:</span>
                    <strong className="text-primary">
                      {(activeEvent.selectedAddons || []).join(", ") || "Standard Inclusion"}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span>Linked Quotation Status:</span>
                    <strong className="font-mono text-primary">
                      {evtQuotation?.quotationNumber || `RS-QUO-${activeEvent.id.slice(-4).toUpperCase()}`} ·{" "}
                      <span className="text-emerald-500">
                        {evtQuotation?.status || (activeEvent.approvedByClient ? "APPROVED" : "SENT")}
                      </span>
                    </strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Current Approval Status:</span>
                    <strong className="text-emerald-500">
                      {activeEvent.approvedByClient
                        ? `Digitally Signed by ${activeEvent.approvedByClient}`
                        : "Awaiting Client Digital Signature"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <form
                  onSubmit={handleApproveContract}
                  className="p-6 rounded-2xl bg-background border border-accent/40 space-y-4"
                >
                  <h3 className="font-display text-xl font-bold text-primary">
                    Digital Client Signature
                  </h3>
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">
                      Type Full Name (Digital Signature) *
                    </label>
                    <input
                      type="text"
                      required
                      value={signatureName}
                      onChange={(e) => setSignatureName(e.target.value)}
                      placeholder="e.g. Tariq Mehmood"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-sm font-display italic text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">
                      Special Instructions or Contract Notes
                    </label>
                    <textarea
                      rows={3}
                      value={contractNotes}
                      onChange={(e) => setContractNotes(e.target.value)}
                      placeholder="Any special requests for the production team..."
                      className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-xs text-primary"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={approvingContract}
                    className="w-full py-3 rounded-xl bg-accent hover:opacity-95 text-[#111111] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>
                      {approvingContract
                        ? "Recording Digital Signature..."
                        : activeEvent.approvedByClient
                        ? "Update Digital Signature & Approval"
                        : "Digitally Sign & Approve Booking"}
                    </span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB: UNIFIED MEDIA DELIVERY (YOUTUBE UNLISTED + 15GB GOOGLE DRIVE) ===================== */}
        {activeTab === "MEDIA_VAULT" && activeEvent && (
          <div className="space-y-6">
            {(() => {
              const md = activeEvent.mediaDelivery;
              const videos =
                md?.unlistedVideos && md.unlistedVideos.length > 0
                  ? md.unlistedVideos
                  : md?.unlistedYoutubeVideos && md.unlistedYoutubeVideos.length > 0
                  ? md.unlistedYoutubeVideos
                  : [
                      {
                        id: "yt-default-1",
                        title: `${activeEvent.title} — Official 4K Wedding Highlight Teaser`,
                        videoType: "Teaser" as const,
                        youtubeId: "QF3BmojTrKQ",
                        youtubeUrl: "https://www.youtube.com/watch?v=QF3BmojTrKQ",
                        duration: "03:37",
                        resolution: "4K UHD" as const,
                        privacyStatus: "Unlisted" as const,
                        uploadedAt: activeEvent.eventDate,
                      },
                      {
                        id: "yt-default-2",
                        title: `${activeEvent.title} — Vibrant Mehndi Night Full Coverage Reel`,
                        videoType: "Mehndi Coverage" as const,
                        youtubeId: "UgG6hsk5AU8",
                        youtubeUrl: "https://www.youtube.com/watch?v=UgG6hsk5AU8",
                        duration: "28:26",
                        resolution: "4K UHD" as const,
                        privacyStatus: "Unlisted" as const,
                        uploadedAt: activeEvent.eventDate,
                      },
                      {
                        id: "yt-default-3",
                        title: `${activeEvent.title} — Barat Procession & Royal Nikah Cinema Film`,
                        videoType: "Barat Coverage" as const,
                        youtubeId: "wF_5efX_Kwo",
                        youtubeUrl: "https://www.youtube.com/watch?v=wF_5efX_Kwo",
                        duration: "42:15",
                        resolution: "4K UHD" as const,
                        privacyStatus: "Unlisted" as const,
                        uploadedAt: activeEvent.eventDate,
                      },
                      {
                        id: "yt-default-4",
                        title: `${activeEvent.title} — Walima Reception & Aerial Drone Finale`,
                        videoType: "Walima Coverage" as const,
                        youtubeId: "IHpGkLHnmpU",
                        youtubeUrl: "https://www.youtube.com/watch?v=IHpGkLHnmpU",
                        duration: "36:50",
                        resolution: "4K UHD" as const,
                        privacyStatus: "Unlisted" as const,
                        uploadedAt: activeEvent.eventDate,
                      },
                    ];

              const currentVid =
                videos.find((v) => v.youtubeId === selectedUnlistedVideoId) || videos[0];
              const playlistIdsCsv = videos.map((v) => v.youtubeId).join(",");
              const embedSrc = `https://www.youtube.com/embed/${currentVid.youtubeId}?playlist=${playlistIdsCsv}&rel=0&modestbranding=1`;
              const playlistUrl =
                md?.youtubePlaylistUrl ||
                activeClient?.youtubePlaylistUrl ||
                `https://www.youtube.com/watch?v=${currentVid.youtubeId}`;
              const driveFolderUrl =
                md?.driveFolderUrl ||
                activeClient?.googleDriveFolderUrl ||
                "https://drive.google.com/drive/folders/1RS_Vault";
              const subfolders = md?.driveSubfolders || [];
              const totalGb = md?.totalDataVolumeGb || 13.1;
              const totalPhotos = md?.totalHighResPhotos || 2420;

              return (
                <>
                  {/* 1. YouTube Unlisted Video & Playlist Cinema Streaming Theater */}
                  <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7 shadow-xs space-y-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-rose-500 font-semibold">
                          <Video className="w-4 h-4" />
                          <span>YouTube Unlisted Video &amp; Playlist Streaming</span>
                          <span>·</span>
                          <span>4K UHD Master Delivery</span>
                        </div>
                        <h2 className="font-display text-2xl font-bold text-primary mt-0.5">
                          {md?.youtubePlaylistTitle ||
                            `${activeEvent.title} — Official Unlisted Wedding Films Playlist`}
                        </h2>
                        <p className="text-xs text-text-muted mt-1">
                          All teasers, multi-day highlights, and full coverage reels are hosted as private Unlisted YouTube videos exclusively linked to your profile.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={playlistUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open Unlisted Playlist on YouTube</span>
                        </a>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Embedded 4K YouTube Cinema Player */}
                      <div className="lg:col-span-8 space-y-3">
                        <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-border shadow-lg">
                          <iframe
                            key={currentVid.youtubeId}
                            src={embedSrc}
                            title={currentVid.title}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl bg-background border border-border">
                          <div>
                            <div className="text-sm font-bold text-primary">
                              {currentVid.title}
                            </div>
                            <div className="text-xs text-text-muted font-mono">
                              {currentVid.videoType} · Duration: {currentVid.duration} ·{" "}
                              {currentVid.resolution} · Privacy: {currentVid.privacyStatus}
                            </div>
                          </div>
                          <a
                            href={currentVid.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:border-accent text-xs font-semibold text-primary"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-accent" />
                            <span>Watch Direct Unlisted Link</span>
                          </a>
                        </div>
                      </div>

                      {/* Unlisted Playlist Reel Selector */}
                      <div className="lg:col-span-4 space-y-2.5">
                        <div className="text-xs font-bold text-primary flex items-center justify-between">
                          <span>Unlisted Playlist Reels ({videos.length})</span>
                          <span className="text-[11px] font-mono text-text-muted">
                            Click to Stream
                          </span>
                        </div>
                        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                          {videos.map((vid, idx) => {
                            const active = vid.youtubeId === currentVid.youtubeId;
                            return (
                              <button
                                key={vid.id}
                                type="button"
                                onClick={() => setSelectedUnlistedVideoId(vid.youtubeId)}
                                className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                                  active
                                    ? "border-accent bg-accent/10 shadow-xs"
                                    : "border-border bg-background hover:border-accent/50"
                                }`}
                              >
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                                    active
                                      ? "bg-accent text-[#111111]"
                                      : "bg-surface text-text-muted border border-border"
                                  }`}
                                >
                                  {active ? (
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                  ) : (
                                    idx + 1
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-bold text-primary line-clamp-2">
                                    {vid.title}
                                  </div>
                                  <div className="text-[11px] text-text-muted font-mono mt-1">
                                    {vid.videoType} · {vid.duration} · {vid.resolution}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Dedicated Google Drive High-Resolution Photo & Raw Assets Vault (~10GB–15GB) */}
                  <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7 shadow-xs space-y-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-emerald-500 font-semibold">
                          <HardDrive className="w-4 h-4" />
                          <span>Dedicated Google Drive Photo &amp; Raw Archive</span>
                          <span>·</span>
                          <span>{totalGb} GB High-Resolution Master Vault</span>
                        </div>
                        <h2 className="font-display text-2xl font-bold text-primary mt-0.5">
                          {md?.driveFolderName ||
                            `Royal Studio · ${activeEvent.title} (${totalGb} GB Photo Archive)`}
                        </h2>
                        <p className="text-xs text-text-muted mt-1">
                          Access and download your full-resolution 300 DPI retouched galleries, uncompressed camera RAW files, and print-ready storybook album spreads directly from your dedicated Google Drive folder.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={driveFolderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                        >
                          <FolderOpen className="w-4 h-4" />
                          <span>Open Complete Google Drive Folder ({totalGb} GB)</span>
                        </a>
                      </div>
                    </div>

                    {/* Storage Summary Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-background border border-border">
                        <div className="text-xs text-text-muted">Total Transferred Volume</div>
                        <div className="font-mono text-xl font-bold text-primary mt-0.5">
                          {totalGb} GB / {md?.freeTierQuotaGb || 15} GB
                        </div>
                        <div className="text-[11px] text-emerald-500 mt-0.5">
                          100% High-Resolution Uncompressed Quality
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-background border border-border">
                        <div className="text-xs text-text-muted">Total Master Files &amp; Photos</div>
                        <div className="font-mono text-xl font-bold text-primary mt-0.5">
                          {totalPhotos.toLocaleString()} Files
                        </div>
                        <div className="text-[11px] text-text-muted mt-0.5">
                          Edited JPEGs + RAW Masters + Album Spreads
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-background border border-border">
                        <div className="text-xs text-text-muted">Delivery Status</div>
                        <div className="text-xl font-bold text-emerald-500 mt-0.5">
                          {md?.approvalStatus || "Approved & Provisioned"}
                        </div>
                        <div className="text-[11px] text-text-muted mt-0.5">
                          Direct High-Speed Cloud Download Enabled
                        </div>
                      </div>
                    </div>

                    {/* Subfolders List */}
                    {subfolders.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {subfolders.map((folder) => (
                          <div
                            key={folder.id}
                            className="p-4 rounded-xl bg-background border border-border flex flex-col justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-emerald-500 font-semibold">
                                <span className="inline-flex items-center gap-1">
                                  <FolderOpen className="w-3.5 h-3.5" />
                                  <span>{folder.transferStatus}</span>
                                </span>
                                <span className="font-mono">{folder.sizeGb} GB</span>
                              </div>
                              <div className="text-sm font-bold text-primary">
                                {folder.folderName}
                              </div>
                              <div className="text-xs text-text-muted font-mono">
                                {folder.fileCount.toLocaleString()} High-Res Files
                              </div>
                            </div>
                            <a
                              href={folder.folderUrl || driveFolderUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-2 px-3 rounded-lg border border-border hover:border-accent text-xs font-bold text-primary flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-accent" />
                              <span>Open Folder in Google Drive</span>
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ===================== TAB 6: CLIENT PROFILE & DELIVERY PREFERENCES ===================== */}
        {activeTab === "PROFILE" && activeClient && (
          <form
            onSubmit={handleSaveProfile}
            className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-xs space-y-6"
          >
            <div>
              <h3 className="text-base font-bold text-primary flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-accent" />
                <span>My Client Profile &amp; Courier Album Delivery Address</span>
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Keep your contact details and residential address updated for luxury wooden USB box and album handover.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1.5">
                  Full Name / Couple Name *
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1.5">
                  Primary Phone Number
                </label>
                <input
                  type="text"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1.5">
                  WhatsApp Number
                </label>
                <input
                  type="text"
                  value={profileWhatsapp}
                  onChange={(e) => setProfileWhatsapp(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={profileCity}
                  onChange={(e) => setProfileCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1.5">
                  Album Delivery / Residential Address
                </label>
                <input
                  type="text"
                  value={profileAddress}
                  onChange={(e) => setProfileAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-primary mb-1.5">
                  Special Family Preferences &amp; Notes
                </label>
                <textarea
                  rows={2}
                  value={profileNotes}
                  onChange={(e) => setProfileNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-primary"
                />
              </div>

              <div className="sm:col-span-2 p-5 rounded-2xl bg-background border border-accent/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Portal Security &amp; Password</span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      View your current Client Portal login credentials or update your password directly. Your active session stays synchronized automatically.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                        Active Login Email / Portal ID
                      </div>
                      <div className="font-mono font-bold text-primary truncate mt-0.5">
                        {profileEmail || activeClient.email || activeClient.phone}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          "portal-login-id",
                          profileEmail || activeClient.email || activeClient.phone || ""
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-border hover:border-accent text-[11px] font-bold text-primary shrink-0 cursor-pointer"
                    >
                      {copiedKey === "portal-login-id" ? "Copied" : "Copy ID"}
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                        Current Portal Password
                      </div>
                      <div className="font-mono font-bold text-accent truncate mt-0.5">
                        {showCurrentPortalPass ? authPin : "••••••••"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowCurrentPortalPass((prev) => !prev)}
                        className="px-2.5 py-1.5 rounded-lg border border-border hover:border-accent text-[11px] font-semibold text-text-muted hover:text-primary cursor-pointer"
                      >
                        {showCurrentPortalPass ? "Hide" : "Show"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyText("portal-login-pass", authPin)}
                        className="px-2.5 py-1.5 rounded-lg border border-border hover:border-accent text-[11px] font-bold text-primary cursor-pointer"
                      >
                        {copiedKey === "portal-login-pass" ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-primary">
                    Set New Client Portal Password (Optional — Leave blank to keep current password)
                  </label>
                  <input
                    type="text"
                    minLength={4}
                    value={profileNewPassword}
                    onChange={(e) => setProfileNewPassword(e.target.value)}
                    placeholder="Enter a new password (min 4 characters) to update your login"
                    className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-xs font-mono text-primary"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mr-1">
                      Suggested Passwords:
                    </span>
                    {(() => {
                      const digits = (profilePhone || activeClient.phone || "").replace(/[^0-9]/g, "");
                      const last4 = digits.slice(-4) || "2026";
                      const firstToken =
                        (profileName || activeClient.name || "Client")
                          .trim()
                          .split(/\s+/)[0]
                          ?.replace(/[^a-zA-Z0-9]/g, "") || "Client";
                      const capName =
                        firstToken.charAt(0).toUpperCase() +
                        firstToken.slice(1).toLowerCase();
                      const suggestions = [
                        `RS@${last4}`,
                        `${capName}@${last4}`,
                        `Royal@${last4}`,
                      ];
                      return suggestions.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setProfileNewPassword(sug)}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-colors cursor-pointer ${
                            profileNewPassword === sug
                              ? "border-accent bg-accent/15 text-accent font-bold"
                              : "border-border bg-surface text-text-muted hover:text-primary hover:border-accent/50"
                          }`}
                        >
                          {sug}
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent hover:opacity-90 text-[#111111] text-xs font-bold cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{savingProfile ? "Saving..." : "Save Profile Changes"}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Fullscreen Proofing Photo Lightbox Modal */}
      {activeLightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxPhotoId(null)}
        >
          <div
            className="max-w-4xl w-full bg-[#12141D] border border-white/15 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[16/10] bg-black flex items-center justify-center">
              <img
                src={activeLightboxPhoto.url}
                alt={activeLightboxPhoto.title}
                className="max-h-full max-w-full object-contain"
              />
              {activeLightboxPhoto.isSelectedForAlbum && (
                <div className="absolute top-4 left-4 flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full bg-gradient-to-r from-rose-600 to-amber-500 text-white text-xs font-bold shadow-lg">
                  <Heart className="w-3.5 h-3.5 fill-white" />
                  <span>Album Favorite</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setLightboxPhotoId(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/70 text-white hover:bg-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                  {activeLightboxPhoto.dayLabel} · {activeLightboxPhoto.category}
                </div>
                <h4 className="text-base font-bold text-white">
                  {activeLightboxPhoto.title}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTogglePhotoFavorite(activeLightboxPhoto.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                    activeLightboxPhoto.isSelectedForAlbum
                      ? "bg-rose-500 text-white"
                      : "bg-white/10 text-white hover:bg-rose-500/30"
                  }`}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      activeLightboxPhoto.isSelectedForAlbum ? "fill-white" : ""
                    }`}
                  />
                  <span>
                    {activeLightboxPhoto.isSelectedForAlbum
                      ? "Selected for Album"
                      : "Select as Album Favorite"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Image Lightbox Modal */}
      {previewReceiptImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewReceiptImage(null)}
        >
          <div
            className="max-w-lg w-full bg-surface border border-border rounded-2xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                Uploaded Deposit Receipt Screenshot
              </h4>
              <button
                type="button"
                onClick={() => setPreviewReceiptImage(null)}
                className="p-1 rounded-lg text-text-muted hover:text-primary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewReceiptImage}
              alt="Deposit Receipt"
              className="w-full max-h-[70vh] object-contain rounded-xl bg-black"
            />
          </div>
        </div>
      )}
    </main>
  );
}

export default function PublicClientPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background pt-28 pb-20 px-4 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      }
    >
      <ClientPortalInner />
    </Suspense>
  );
}
