"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  WifiOff,
  Wifi,
  RefreshCw,
  CheckCircle2,
  Clock,
  HardDrive,
  AlertTriangle,
} from "lucide-react";
import {
  getBackgroundSyncQueue,
  flushBackgroundSyncQueue,
  getAllOfflineProposals,
  getAllOfflineFavoritePhotos,
  type OfflineSyncQueueItem,
} from "@/lib/pwa/offlineVault";

interface ClientPortalOfflineStatusBannerProps {
  /** Optional context label (e.g. "Client Portal", "Interactive Proposal", "Proofing Gallery") */
  contextLabel?: string;
  /** Whether to show a compact ready bar even when online with 0 queued actions */
  showCompactOnlineIndicator?: boolean;
}

export default function ClientPortalOfflineStatusBanner({
  contextLabel = "Client Portal",
  showCompactOnlineIndicator = true,
}: ClientPortalOfflineStatusBannerProps) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingQueue, setPendingQueue] = useState<OfflineSyncQueueItem[]>([]);
  const [cachedProposalsCount, setCachedProposalsCount] = useState<number>(0);
  const [cachedFavoritesCount, setCachedFavoritesCount] = useState<number>(0);
  const [lastCachedActionNotice, setLastCachedActionNotice] = useState<
    string | null
  >(null);
  const [syncSuccessNotice, setSyncSuccessNotice] = useState<string | null>(
    null
  );
  const [isFlushing, setIsFlushing] = useState<boolean>(false);

  const refreshQueueAndVaultStats = useCallback(async () => {
    try {
      const [queue, proposals, favorites] = await Promise.all([
        getBackgroundSyncQueue(),
        getAllOfflineProposals(),
        getAllOfflineFavoritePhotos(),
      ]);
      setPendingQueue(queue.filter((item) => item.status === "PENDING"));
      setCachedProposalsCount(proposals.length);
      setCachedFavoritesCount(favorites.length);
    } catch {
      // Ignore IndexedDB read errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(window.navigator.onLine);
    void refreshQueueAndVaultStats();

    const handleOnline = async () => {
      setIsOnline(true);
      setLastCachedActionNotice(null);
      setIsFlushing(true);
      try {
        if (
          "serviceWorker" in navigator &&
          navigator.serviceWorker.controller
        ) {
          navigator.serviceWorker.controller.postMessage({
            type: "TRIGGER_BACKGROUND_SYNC",
          });
        }
        const res = await flushBackgroundSyncQueue();
        await refreshQueueAndVaultStats();
        if (res.syncedCount > 0) {
          setSyncSuccessNotice(
            `Connection Restored — ${res.syncedCount} locally cached action(s) (notes, favorites & proposal updates) synced to Royal Studio server.`
          );
          setTimeout(() => setSyncSuccessNotice(null), 6000);
        }
      } finally {
        setIsFlushing(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      void refreshQueueAndVaultStats();
    };

    const handleOfflineActionQueued = (e: Event) => {
      const custom = e as CustomEvent<{
        item?: OfflineSyncQueueItem;
        pendingCount?: number;
      }>;
      const label =
        custom.detail?.item?.label ||
        "Your action (saving notes / favorite toggle / proposal update)";
      setLastCachedActionNotice(
        `Cached Locally (Not Yet Synced to Server): ${label} — queued in Workbox Background Sync.`
      );
      void refreshQueueAndVaultStats();
    };

    const handleVaultUpdated = () => {
      void refreshQueueAndVaultStats();
    };

    const handleSyncCompleted = (e: Event) => {
      const custom = e as CustomEvent<{ syncedCount: number }>;
      if (custom.detail?.syncedCount) {
        setLastCachedActionNotice(null);
        setSyncSuccessNotice(
          `Workbox Background Sync Complete — ${custom.detail.syncedCount} locally cached update(s) synced to the server.`
        );
        setTimeout(() => setSyncSuccessNotice(null), 5500);
      }
      void refreshQueueAndVaultStats();
    };

    const handleSwMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.type === "WORKBOX_BACKGROUND_SYNC_QUEUED") {
        setLastCachedActionNotice(
          "Action cached locally in Workbox Background Sync queue — will automatically sync when internet connection returns."
        );
        void refreshQueueAndVaultStats();
      } else if (event.data.type === "SW_BACKGROUND_SYNC_TRIGGER") {
        void flushBackgroundSyncQueue().then(() => refreshQueueAndVaultStats());
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(
      "royal-studio-offline-action-queued",
      handleOfflineActionQueued
    );
    window.addEventListener(
      "royal-studio-offline-vault-updated",
      handleVaultUpdated
    );
    window.addEventListener(
      "royal-studio-sync-completed",
      handleSyncCompleted
    );
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleSwMessage);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "royal-studio-offline-action-queued",
        handleOfflineActionQueued
      );
      window.removeEventListener(
        "royal-studio-offline-vault-updated",
        handleVaultUpdated
      );
      window.removeEventListener(
        "royal-studio-sync-completed",
        handleSyncCompleted
      );
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleSwMessage);
      }
    };
  }, [refreshQueueAndVaultStats]);

  const handleManualSyncNow = async () => {
    if (!window.navigator.onLine) return;
    setIsFlushing(true);
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "TRIGGER_BACKGROUND_SYNC",
        });
      }
      const res = await flushBackgroundSyncQueue();
      await refreshQueueAndVaultStats();
      setLastCachedActionNotice(null);
      if (res.syncedCount > 0) {
        setSyncSuccessNotice(
          `Synced ${res.syncedCount} locally cached action(s) to the Royal Studio server.`
        );
        setTimeout(() => setSyncSuccessNotice(null), 5000);
      }
    } finally {
      setIsFlushing(false);
    }
  };

  // 1. Offline or Pending Local Actions Banner (High Visibility)
  if (!isOnline || pendingQueue.length > 0 || lastCachedActionNotice) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`rounded-2xl border p-4 shadow-premium transition-all ${
          !isOnline
            ? "bg-amber-500/15 border-amber-500/40 text-amber-950 dark:text-amber-100"
            : "bg-accent/15 border-accent/40 text-primary"
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                !isOnline
                  ? "bg-amber-500 text-slate-950"
                  : "bg-accent text-[#111111]"
              }`}
            >
              {!isOnline ? (
                <WifiOff className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {!isOnline
                    ? `Offline Status (${contextLabel} · Local Cache Active)`
                    : `${pendingQueue.length} Locally Cached Action(s) Queued for Server Sync`}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-black/15 dark:bg-white/10 text-[10px] font-mono font-bold">
                  navigator.onLine: {String(isOnline)}
                </span>
              </div>

              <p className="text-xs leading-relaxed opacity-90">
                {!isOnline
                  ? "You are currently offline. Your actions (such as saving retouching notes, toggling gallery favorites, or updating proposal add-ons) are being cached locally on your device instead of immediately syncing to the server. Workbox Background Sync will automatically re-sync all changes as soon as your internet connection returns."
                  : lastCachedActionNotice ||
                    "You have locally cached actions waiting to be synchronized with the Royal Studio server."}
              </p>

              {pendingQueue.length > 0 && (
                <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] font-mono">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>
                    Latest Queued Action:{" "}
                    <strong>
                      {pendingQueue[pendingQueue.length - 1]?.label}
                    </strong>{" "}
                    ({pendingQueue.length} total pending in Workbox queue)
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isOnline && pendingQueue.length > 0 && (
              <button
                type="button"
                onClick={handleManualSyncNow}
                disabled={isFlushing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isFlushing ? "animate-spin" : ""}`}
                />
                <span>
                  {isFlushing ? "Syncing to Server..." : "Sync Now to Server"}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("royal-studio-open-offline-vault", {
                    detail: {
                      tab: pendingQueue.length > 0 ? "SYNC" : "PROPOSALS",
                    },
                  })
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-white/10 text-xs font-bold transition-colors cursor-pointer"
            >
              <HardDrive className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>
                View Offline Vault &amp; Queue ({pendingQueue.length})
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Just Synced Confirmation Banner
  if (syncSuccessNotice) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 p-3.5 text-xs text-emerald-700 dark:text-emerald-300 flex flex-wrap items-center justify-between gap-3 shadow-xs"
      >
        <div className="flex items-center gap-2.5 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{syncSuccessNotice}</span>
        </div>
        <button
          type="button"
          onClick={() => setSyncSuccessNotice(null)}
          className="text-[11px] font-bold underline cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    );
  }

  // 3. Compact Online & Aggressive Cache Ready Bar inside Authenticated Client Portal
  if (!showCompactOnlineIndicator) return null;

  return (
    <div className="rounded-xl border border-border bg-surface/80 px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2 text-text-muted">
        <Wifi className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span>
          <strong className="text-primary">{contextLabel} Online</strong> ·
          Workbox Aggressive Offline Cache Active (
          <strong className="text-primary">{cachedProposalsCount}</strong>{" "}
          Proposal{cachedProposalsCount === 1 ? "" : "s"} &amp;{" "}
          <strong className="text-primary">{cachedFavoritesCount}</strong>{" "}
          Gallery Favorite{cachedFavoritesCount === 1 ? "" : "s"} cached
          locally)
        </span>
      </div>
      <span className="text-[11px] text-text-muted font-mono">
        Offline Notes &amp; Favorites Auto-Queue Enabled
      </span>
    </div>
  );
}
