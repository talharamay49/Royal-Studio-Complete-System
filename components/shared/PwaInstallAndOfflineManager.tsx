"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Download,
  WifiOff,
  Wifi,
  X,
  Share,
  PlusSquare,
  Smartphone,
  FileText,
  Heart,
  RefreshCw,
  CheckCircle2,
  Calendar,
  MapPin,
  ArrowRight,
  Clock,
  CloudOff,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import {
  getAllOfflineProposals,
  getAllOfflineGalleries,
  getAllOfflineFavoritePhotos,
  getBackgroundSyncQueue,
  flushBackgroundSyncQueue,
  warmAllSavedProposalsAndGalleries,
  saveOfflineGallery,
  enqueueBackgroundSync,
  getCustomerPortalSession,
  type SavedOfflineProposalRecord,
  type SavedOfflineGalleryRecord,
  type OfflineFavoritePhotoWithEvent,
  type OfflineSyncQueueItem,
} from "@/lib/pwa/offlineVault";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

function formatPKR(amount: number): string {
  return `PKR ${Math.round(amount || 0).toLocaleString("en-PK")}`;
}

export default function PwaInstallAndOfflineManager() {
  const pathname = usePathname();
  const isPrivateClientRoute = Boolean(
    pathname &&
      (pathname.startsWith("/client-portal") ||
        pathname.startsWith("/proposal") ||
        pathname.startsWith("/gallery"))
  );
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Offline Vault & Background Sync States
  const [showOfflineVault, setShowOfflineVault] = useState(false);
  const [vaultTab, setVaultTab] = useState<"PROPOSALS" | "FAVORITES" | "SYNC">(
    "PROPOSALS"
  );
  const [savedProposals, setSavedProposals] = useState<
    SavedOfflineProposalRecord[]
  >([]);
  const [savedGalleries, setSavedGalleries] = useState<
    SavedOfflineGalleryRecord[]
  >([]);
  const [favoritePhotos, setFavoritePhotos] = useState<
    OfflineFavoritePhotoWithEvent[]
  >([]);
  const [syncQueue, setSyncQueue] = useState<OfflineSyncQueueItem[]>([]);
  const [selectedProposalDetail, setSelectedProposalDetail] =
    useState<SavedOfflineProposalRecord | null>(null);
  const [isSyncingVault, setIsSyncingVault] = useState(false);
  const [syncBannerNotice, setSyncBannerNotice] = useState<string | null>(null);
  const [editingOfflineNoteKey, setEditingOfflineNoteKey] = useState<
    string | null
  >(null);
  const [offlineNoteDraft, setOfflineNoteDraft] = useState<string>("");

  const refreshVaultState = useCallback(async () => {
    try {
      const session = getCustomerPortalSession();
      if (!session?.identifier || !session?.pin) {
        setSavedProposals([]);
        setSavedGalleries([]);
        setFavoritePhotos([]);
        setSyncQueue([]);
        return;
      }
      const [props, gals, favs, queue] = await Promise.all([
        getAllOfflineProposals(),
        getAllOfflineGalleries(),
        getAllOfflineFavoritePhotos(),
        getBackgroundSyncQueue(),
      ]);
      setSavedProposals(props);
      setSavedGalleries(gals);
      setFavoritePhotos(favs);
      setSyncQueue(queue.filter((i) => i.status === "PENDING"));
    } catch {
      // Ignore read errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);
    void refreshVaultState();

    // Auto-warm offline vault only for authenticated customer sessions
    const activeSession = getCustomerPortalSession();
    if (activeSession?.identifier && activeSession?.pin) {
      getAllOfflineProposals()
        .then((existing) => {
          if (
            existing.length === 0 &&
            navigator.onLine &&
            !sessionStorage.getItem("rs_offline_vault_warmed")
          ) {
            sessionStorage.setItem("rs_offline_vault_warmed", "1");
            warmAllSavedProposalsAndGalleries()
              .then(() => refreshVaultState())
              .catch(() => {});
          }
        })
        .catch(() => {});
    }

    const handleOnline = async () => {
      setIsOnline(true);
      const res = await flushBackgroundSyncQueue();
      await refreshVaultState();
      if (res.syncedCount > 0) {
        setSyncBannerNotice(
          `Back Online — Synced ${res.syncedCount} offline change(s) to Royal Studio ERP`
        );
      }
      setTimeout(() => {
        setShowOfflineBanner(false);
        setSyncBannerNotice(null);
      }, 4500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineBanner(true);
      void refreshVaultState();
    };

    const handleVaultUpdated = () => {
      void refreshVaultState();
    };

    const handleOpenVault = (e: Event) => {
      const custom = e as CustomEvent<{
        tab?: "PROPOSALS" | "FAVORITES" | "SYNC";
      }>;
      if (custom.detail?.tab) {
        setVaultTab(custom.detail.tab);
      }
      void refreshVaultState();
      setShowOfflineVault(true);
    };

    const handleSyncCompleted = (e: Event) => {
      const custom = e as CustomEvent<{ syncedCount: number }>;
      if (custom.detail?.syncedCount) {
        setSyncBannerNotice(
          `Background Sync Complete — ${custom.detail.syncedCount} queued update(s) synced`
        );
        setTimeout(() => setSyncBannerNotice(null), 4000);
      }
      void refreshVaultState();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(
      "royal-studio-offline-vault-updated",
      handleVaultUpdated
    );
    window.addEventListener("royal-studio-open-offline-vault", handleOpenVault);
    window.addEventListener(
      "royal-studio-sync-completed",
      handleSyncCompleted
    );

    const allowedCaches = [
      "royal-studio-pwa-v6",
      "royal-studio-offline-data-v2",
      "royal-studio-offline-images-v2",
      "royal-studio-static-assets-v2",
    ];
    if ("caches" in window) {
      caches
        .keys()
        .then((keys) => {
          keys.forEach((key) => {
            if (!allowedCaches.includes(key)) {
              caches.delete(key);
            }
          });
        })
        .catch(() => {});
    }

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "SW_BACKGROUND_SYNC_TRIGGER") {
        flushBackgroundSyncQueue()
          .then(() => refreshVaultState())
          .catch(() => {});
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleSwMessage);
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((reg) => {
          reg.update().catch(() => {});
          if (reg.waiting) {
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
          }
        })
        .catch(() => {
          // Ignore registration error in restricted preview environments
        });
    }

    // Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isIPadOrIPhone =
      /iPad|iPhone|iPod/.test(ua) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)"
    ).matches;
    if (isIPadOrIPhone && !isStandalone) {
      setIsIOS(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const dismissed = sessionStorage.getItem("rs_pwa_banner_dismissed");
      if (!dismissed && !isStandalone) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const handleTriggerInstall = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
      } else {
        setShowIOSGuide(true);
      }
    };
    window.addEventListener("royal-studio-install-pwa", handleTriggerInstall);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "royal-studio-offline-vault-updated",
        handleVaultUpdated
      );
      window.removeEventListener(
        "royal-studio-open-offline-vault",
        handleOpenVault
      );
      window.removeEventListener(
        "royal-studio-sync-completed",
        handleSyncCompleted
      );
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener(
        "royal-studio-install-pwa",
        handleTriggerInstall
      );
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleSwMessage);
      }
    };
  }, [deferredPrompt, refreshVaultState]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setShowIOSGuide(true);
      return;
    }
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

  const handleManualVaultSync = async () => {
    setIsSyncingVault(true);
    try {
      if (navigator.onLine) {
        const flushed = await flushBackgroundSyncQueue();
        const warmed = await warmAllSavedProposalsAndGalleries();
        await refreshVaultState();
        setSyncBannerNotice(
          `Offline Vault Updated — ${warmed.proposalsSaved || savedProposals.length} Proposals & ${warmed.favoritesCount} Gallery Favorites cached${
            flushed.syncedCount > 0 ? ` (${flushed.syncedCount} changes synced)` : ""
          }`
        );
        setTimeout(() => setSyncBannerNotice(null), 4000);
      } else {
        await refreshVaultState();
      }
    } finally {
      setIsSyncingVault(false);
    }
  };

  const handleSaveOfflineFavoriteNote = async (
    item: OfflineFavoritePhotoWithEvent,
    noteText: string
  ) => {
    const cleanNote = noteText.trim();
    const matchGal = savedGalleries.find((g) => g.eventId === item.eventId);
    if (!matchGal) return;

    const updatedPhotos = (matchGal.payload.proofingGallery.photos || []).map(
      (p) =>
        p.id === item.photo.id
          ? {
              ...p,
              retouchingNote: cleanNote,
              isSelectedForAlbum: true,
            }
          : p
    );

    await saveOfflineGallery(item.eventId, {
      ...matchGal.payload,
      proofingGallery: {
        ...matchGal.payload.proofingGallery,
        photos: updatedPhotos,
      },
    });

    if (navigator.onLine) {
      try {
        await fetch(`/api/gallery/${encodeURIComponent(item.eventId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "UPDATE_RETOUCH_NOTE",
            photoId: item.photo.id,
            retouchingNote: cleanNote,
          }),
        });
      } catch {
        await enqueueBackgroundSync({
          type: "UPDATE_RETOUCH_NOTE",
          endpoint: `/api/gallery/${encodeURIComponent(item.eventId)}`,
          method: "POST",
          body: {
            action: "UPDATE_RETOUCH_NOTE",
            photoId: item.photo.id,
            retouchingNote: cleanNote,
          },
          label: `Retouching note on "${item.photo.title}" (${item.eventTitle})`,
          eventId: item.eventId,
        });
      }
    } else {
      await enqueueBackgroundSync({
        type: "UPDATE_RETOUCH_NOTE",
        endpoint: `/api/gallery/${encodeURIComponent(item.eventId)}`,
        method: "POST",
        body: {
          action: "UPDATE_RETOUCH_NOTE",
          photoId: item.photo.id,
          retouchingNote: cleanNote,
        },
        label: `Retouching note on "${item.photo.title}" (${item.eventTitle})`,
        eventId: item.eventId,
      });
    }

    setEditingOfflineNoteKey(null);
    await refreshVaultState();
  };

  return (
    <>
      {/* Offline & Background Sync Top Status Bar — Strictly for Private Client Portal Routes */}
      {isPrivateClientRoute && (!isOnline || showOfflineBanner || syncBannerNotice) && (
        <div
          className={`fixed top-0 left-0 right-0 z-[100] px-4 py-2 text-xs font-bold flex flex-wrap items-center justify-center gap-3 shadow-md transition-colors ${
            isOnline
              ? "bg-emerald-600 text-white"
              : "bg-amber-500 text-slate-950"
          }`}
        >
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5 shrink-0" />
              <span>
                {syncBannerNotice ||
                  "Back Online — Saved Proposals, Gallery Favorites & Field Crew Checklists Synced"}
              </span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              <span>
                Offline Mode Active — {savedProposals.length} Saved Proposals &amp;{" "}
                {favoritePhotos.length} Gallery Favorites Available Offline
                {syncQueue.length > 0
                  ? ` (${syncQueue.length} change(s) queued for Background Sync)`
                  : ""}
              </span>
              <button
                type="button"
                onClick={() => setShowOfflineVault(true)}
                className="px-2.5 py-1 rounded-lg bg-slate-950 text-[#D4AF37] text-[11px] font-bold hover:opacity-90 cursor-pointer"
              >
                Open Offline Vault
              </button>
            </>
          )}
        </div>
      )}

      {/* Install PWA Floating Prompt (when browser fires beforeinstallprompt) */}
      {showInstallBanner && (
        <div className="fixed bottom-20 left-5 z-50 max-w-sm bg-[#111111] text-white border border-[#D4AF37]/40 rounded-2xl p-4 shadow-2xl flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-[#F5F0E6]">
              Install Royal Studio App
            </div>
            <p className="text-[11px] text-[#9E978E] mt-0.5 leading-relaxed">
              Install as a native app for offline saved proposals, gallery favorites, and field crew run-sheets.
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-3 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#E5C453] text-[#0A0A0A] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Install App</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowInstallBanner(false);
                  sessionStorage.setItem("rs_pwa_banner_dismissed", "1");
                }}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#9E978E] text-[11px] font-medium cursor-pointer"
              >
                Later
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowInstallBanner(false)}
            className="text-[#9E978E] hover:text-white p-1"
            aria-label="Close install banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Offline Vault Modal: Strictly for Authenticated Client Portal Routes */}
      {isPrivateClientRoute && showOfflineVault && (
        <div
          className="fixed inset-0 z-[115] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => {
            setShowOfflineVault(false);
            setSelectedProposalDetail(null);
          }}
        >
          <div
            className="bg-[#11131A] border border-[#D4AF37]/40 rounded-3xl max-w-4xl w-full max-h-[88vh] flex flex-col text-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 bg-[#151822]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0">
                  {isOnline ? (
                    <Sparkles className="w-5 h-5" />
                  ) : (
                    <CloudOff className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-serif font-bold text-[#F5F0E6]">
                      PWA Offline Vault &amp; Background Sync
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        isOnline
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {isOnline ? "Online & Synced" : "Offline Ready"}
                    </span>
                  </div>
                  <p className="text-xs text-[#9E978E]">
                    Access your saved wedding proposals and hearted gallery favorites even without an internet connection.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualVaultSync}
                  disabled={isSyncingVault}
                  className="px-3.5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#e3be42] text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      isSyncingVault ? "animate-spin" : ""
                    }`}
                  />
                  <span>
                    {isSyncingVault
                      ? "Caching & Syncing..."
                      : isOnline
                      ? "Save All & Sync Now"
                      : "Refresh Offline View"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowOfflineVault(false);
                    setSelectedProposalDetail(null);
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#9E978E] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Segmented Tab Bar */}
            <div className="px-6 py-3 bg-[#0D0F15] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setVaultTab("PROPOSALS");
                    setSelectedProposalDetail(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    vaultTab === "PROPOSALS"
                      ? "bg-[#D4AF37] text-slate-950"
                      : "text-zinc-300 hover:text-white"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Saved Proposals ({savedProposals.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVaultTab("FAVORITES");
                    setSelectedProposalDetail(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    vaultTab === "FAVORITES"
                      ? "bg-[#D4AF37] text-slate-950"
                      : "text-zinc-300 hover:text-white"
                  }`}
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span>Gallery Favorites ({favoritePhotos.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVaultTab("SYNC");
                    setSelectedProposalDetail(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    vaultTab === "SYNC"
                      ? "bg-[#D4AF37] text-slate-950"
                      : "text-zinc-300 hover:text-white"
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Background Sync Queue ({syncQueue.length})</span>
                </button>
              </div>

              <div className="text-[11px] text-zinc-400">
                Service Worker Cache &amp; IndexedDB Vault Active
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {vaultTab === "PROPOSALS" && !selectedProposalDetail && (
                <>
                  {savedProposals.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                      <FileText className="w-10 h-10 text-[#D4AF37] mx-auto opacity-80" />
                      <h3 className="text-base font-bold text-white">
                        No Proposals Saved Offline Yet
                      </h3>
                      <p className="text-xs text-zinc-400 max-w-md mx-auto">
                        Open any wedding proposal or click the button below to pre-cache your interactive proposals for offline viewing.
                      </p>
                      {isOnline && (
                        <button
                          type="button"
                          onClick={handleManualVaultSync}
                          className="px-4 py-2 rounded-xl bg-[#D4AF37] text-slate-950 text-xs font-bold cursor-pointer"
                        >
                          Pre-Cache Proposals for Offline Viewing
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {savedProposals.map((prop) => (
                        <div
                          key={prop.proposalId}
                          className="rounded-2xl border border-white/10 bg-[#171A24] p-5 flex flex-col justify-between gap-4 hover:border-[#D4AF37]/50 transition-all"
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between text-xs text-zinc-400">
                              <span className="font-mono font-bold text-[#D4AF37]">
                                {prop.quotationNumber}
                              </span>
                              <span>·</span>
                              <span className="text-emerald-400 font-semibold">
                                {prop.status}
                              </span>
                              <span>·</span>
                              <span>Saved Offline</span>
                            </div>

                            <h3 className="text-lg font-serif font-bold text-white">
                              {prop.title}
                            </h3>

                            <div className="space-y-1 text-xs text-zinc-300">
                              <div>
                                Client:{" "}
                                <strong className="text-white">
                                  {prop.clientName}
                                </strong>
                              </div>
                              <div className="flex items-center gap-1.5 text-zinc-400">
                                <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                                <span>{prop.eventDate}</span>
                                <span>·</span>
                                <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                                <span>
                                  {prop.venue}, {prop.city}
                                </span>
                              </div>
                              <div className="pt-1 font-mono text-sm font-bold text-[#D4AF37]">
                                Total Package: {formatPKR(prop.packagePrice)}
                              </div>
                              {prop.selectedAddons.length > 0 && (
                                <div className="text-[11px] text-zinc-400">
                                  Add-Ons: {prop.selectedAddons.join(" · ")}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedProposalDetail(prop)}
                              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer"
                            >
                              Quick Offline Preview
                            </button>
                            <Link
                              href={`/proposal/${encodeURIComponent(
                                prop.quotationId || prop.proposalId
                              )}`}
                              onClick={() => setShowOfflineVault(false)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#D4AF37] text-slate-950 text-xs font-bold"
                            >
                              <span>Open Proposal</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Inline Offline Proposal Detail Inspector */}
              {vaultTab === "PROPOSALS" && selectedProposalDetail && (
                <div className="space-y-5 bg-[#171A24] border border-[#D4AF37]/30 rounded-2xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <div className="text-xs text-[#D4AF37] font-mono font-bold">
                        {selectedProposalDetail.quotationNumber} · Offline Saved Snapshot
                      </div>
                      <h3 className="text-xl font-serif font-bold text-white mt-0.5">
                        {selectedProposalDetail.title}
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Prepared for {selectedProposalDetail.clientName} ·{" "}
                        {selectedProposalDetail.venue},{" "}
                        {selectedProposalDetail.city}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedProposalDetail(null)}
                        className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-semibold text-zinc-200 cursor-pointer"
                      >
                        ← Back to Saved List
                      </button>
                      <Link
                        href={`/proposal/${encodeURIComponent(
                          selectedProposalDetail.quotationId ||
                            selectedProposalDetail.proposalId
                        )}`}
                        onClick={() => setShowOfflineVault(false)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#D4AF37] text-slate-950 text-xs font-bold"
                      >
                        Open Interactive Proposal Page
                      </Link>
                    </div>
                  </div>

                  {/* Day-by-Day Schedule */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-[#D4AF37]">
                      01. Multi-Day Coverage &amp; Equipment Breakdown
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(selectedProposalDetail.payload.daySchedules || []).map(
                        (d) => (
                          <div
                            key={d.id}
                            className="p-3.5 rounded-xl bg-black/30 border border-white/10 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between font-bold text-white">
                              <span>
                                Day {d.dayNumber}: {d.eventType}
                              </span>
                              <span className="font-mono text-[#D4AF37]">
                                {formatPKR(d.customPrice)}
                              </span>
                            </div>
                            <div className="text-zinc-400">
                              {d.date} · {d.venue}
                            </div>
                            <div className="text-[11px] text-zinc-300">
                              {d.notes ||
                                `${d.photographersCount || 2} Photographers, ${
                                  d.cinematographersCount || 2
                                } Cinematographers${
                                  d.droneIncluded ? ", 4K Drone" : ""
                                }`}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Selected Add-Ons & Total */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1 text-xs">
                      <div className="text-zinc-400">
                        Selected Luxury Add-Ons:
                      </div>
                      <div className="text-white font-semibold">
                        {selectedProposalDetail.selectedAddons.length > 0
                          ? selectedProposalDetail.selectedAddons.join(" · ")
                          : "Standard Bespoke Coverage Package"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-zinc-400">
                        Proposal Total
                      </div>
                      <div className="text-lg font-mono font-bold text-[#D4AF37]">
                        {formatPKR(selectedProposalDetail.packagePrice)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Saved Gallery Favorites */}
              {vaultTab === "FAVORITES" && (
                <>
                  {favoritePhotos.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                      <Heart className="w-10 h-10 text-rose-400 mx-auto opacity-80" />
                      <h3 className="text-base font-bold text-white">
                        No Gallery Favorites Cached Yet
                      </h3>
                      <p className="text-xs text-zinc-400 max-w-md mx-auto">
                        Heart your favorite wedding frames in any proofing gallery or click below to cache your galleries for offline viewing.
                      </p>
                      {isOnline && (
                        <button
                          type="button"
                          onClick={handleManualVaultSync}
                          className="px-4 py-2 rounded-xl bg-[#D4AF37] text-slate-950 text-xs font-bold cursor-pointer"
                        >
                          Sync &amp; Cache Gallery Favorites
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                        <span>
                          Showing{" "}
                          <strong className="text-white">
                            {favoritePhotos.length}
                          </strong>{" "}
                          hearted album favorites across{" "}
                          <strong className="text-white">
                            {savedGalleries.length}
                          </strong>{" "}
                          saved wedding galleries.
                        </span>
                        <Link
                          href="/gallery"
                          onClick={() => setShowOfflineVault(false)}
                          className="text-[#D4AF37] hover:underline font-semibold"
                        >
                          Open Full Galleries Hub →
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {favoritePhotos.map((item) => {
                          const uniqueKey = `${item.eventId}-${item.photo.id}`;
                          const isEditingNote =
                            editingOfflineNoteKey === uniqueKey;
                          return (
                            <div
                              key={uniqueKey}
                              className="rounded-2xl border border-white/10 bg-[#171A24] overflow-hidden flex flex-col justify-between"
                            >
                              <div className="relative aspect-4/3 bg-black">
                                <img
                                  src={item.photo.url}
                                  alt={item.photo.title}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-rose-600/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
                                  <Heart className="w-3 h-3 fill-white" />
                                  <span>Album Favorite</span>
                                </div>
                              </div>

                              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                                <div className="space-y-1">
                                  <div className="text-[11px] text-zinc-400">
                                    {item.eventTitle} · {item.photo.dayLabel}
                                  </div>
                                  <div className="text-xs font-bold text-white">
                                    {item.photo.title}
                                  </div>
                                  {item.photo.retouchingNote && !isEditingNote && (
                                    <div className="text-[11px] text-[#D4AF37] bg-black/30 p-2 rounded-lg border border-[#D4AF37]/20">
                                      Note: &ldquo;{item.photo.retouchingNote}&rdquo;
                                    </div>
                                  )}
                                </div>

                                {isEditingNote ? (
                                  <div className="space-y-2 pt-2">
                                    <input
                                      type="text"
                                      value={offlineNoteDraft}
                                      onChange={(e) =>
                                        setOfflineNoteDraft(e.target.value)
                                      }
                                      placeholder="Add offline retouching note..."
                                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                                    />
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSaveOfflineFavoriteNote(
                                            item,
                                            offlineNoteDraft
                                          )
                                        }
                                        className="px-2.5 py-1 rounded-lg bg-[#D4AF37] text-slate-950 text-[11px] font-bold cursor-pointer"
                                      >
                                        Save (Auto-Sync)
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditingOfflineNoteKey(null)
                                        }
                                        className="px-2 py-1 rounded-lg bg-white/10 text-zinc-300 text-[11px] cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingOfflineNoteKey(uniqueKey);
                                        setOfflineNoteDraft(
                                          item.photo.retouchingNote || ""
                                        );
                                      }}
                                      className="inline-flex items-center gap-1 text-zinc-300 hover:text-[#D4AF37] cursor-pointer"
                                    >
                                      <MessageSquare className="w-3 h-3" />
                                      <span>
                                        {item.photo.retouchingNote
                                          ? "Edit Note"
                                          : "Add Note"}
                                      </span>
                                    </button>
                                    <Link
                                      href={`/gallery/${encodeURIComponent(
                                        item.eventId
                                      )}?unlocked=1`}
                                      onClick={() => setShowOfflineVault(false)}
                                      className="text-[#D4AF37] font-semibold hover:underline"
                                    >
                                      Open Gallery →
                                    </Link>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Tab 3: Background Sync Queue */}
              {vaultTab === "SYNC" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#171A24] border border-white/10 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>
                          Service Worker Background Sync (
                          <code className="text-[#D4AF37]">
                            royal-studio-bg-sync
                          </code>
                          )
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Any photo favorites, retouching notes, or proposal add-on changes made while offline are stored in IndexedDB and synced automatically as soon as your connection returns.
                      </p>
                    </div>
                    {syncQueue.length > 0 && isOnline && (
                      <button
                        type="button"
                        onClick={handleManualVaultSync}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold cursor-pointer"
                      >
                        Flush Queue Now
                      </button>
                    )}
                  </div>

                  {syncQueue.length === 0 ? (
                    <div className="text-center py-10 text-xs text-zinc-400">
                      All offline gallery favorites, retouching notes, and proposal selections are up to date with Royal Studio ERP.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {syncQueue.map((q) => (
                        <div
                          key={q.id}
                          className="p-3.5 rounded-xl bg-black/40 border border-amber-500/30 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-white">{q.label}</div>
                            <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>
                                Queued at{" "}
                                {new Date(q.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                            Pending Background Sync
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Universal PWA / iOS / Desktop Install Instructions Modal */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="bg-[#111111] border border-[#D4AF37]/40 rounded-2xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F5F0E6]">
                    Install Royal Studio PWA &amp; Offline Vault
                  </h3>
                  <p className="text-[11px] text-[#9E978E]">
                    Works on iOS, Android, macOS &amp; Windows
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#9E978E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#D5CFC5]">
              <p>
                Royal Studio is configured as a Progressive Web App (PWA) with Service Worker caching and Background Sync for saved wedding proposals, gallery favorites, and field crew run-sheets.
              </p>

              {isIOS ? (
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="font-bold text-[#D4AF37]">
                    On iPhone / iPad (Safari):
                  </div>
                  <div className="flex items-center gap-2">
                    <Share className="w-4 h-4 text-[#D4AF37] shrink-0" />
                    <span>
                      1. Tap the <strong>Share</strong> button in Safari&apos;s bottom bar.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PlusSquare className="w-4 h-4 text-[#D4AF37] shrink-0" />
                    <span>
                      2. Scroll down and tap <strong>Add to Home Screen</strong>.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="font-bold text-[#D4AF37]">
                    How to Install on Your Device:
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    • <strong>Chrome / Edge (Desktop &amp; Android):</strong>{" "}
                    Click the <strong>Install App</strong> icon in the browser address bar or open the browser menu (⋮) and select{" "}
                    <strong>Install Royal Studio</strong>.
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    • <strong>iOS Safari:</strong> Tap <strong>Share</strong> →{" "}
                    <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowIOSGuide(false);
                  setShowOfflineVault(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold cursor-pointer"
              >
                Open Offline Vault
              </button>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0A0A0A] text-xs font-bold cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
