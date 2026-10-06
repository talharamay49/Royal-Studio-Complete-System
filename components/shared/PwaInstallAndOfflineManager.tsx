"use client";

import React, { useEffect, useState } from "react";
import { Download, WifiOff, Wifi, X, Share, PlusSquare, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PwaInstallAndOfflineManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setTimeout(() => setShowOfflineBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineBanner(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Register Service Worker for Offline Field Crew Mode & PWA, purging any legacy caches first
    if ("caches" in window) {
      caches
        .keys()
        .then((keys) => {
          keys.forEach((key) => {
            if (key !== "royal-studio-pwa-v5") {
              caches.delete(key);
            }
          });
        })
        .catch(() => {});
    }

    if ("serviceWorker" in navigator) {
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
    const isIPadOrIPhone = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
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

    // Custom event listener so Topbar or other buttons can trigger PWA install modal
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
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("royal-studio-install-pwa", handleTriggerInstall);
    };
  }, [deferredPrompt]);

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

  return (
    <>
      {/* Offline Field Crew Mode Status Banner */}
      {(!isOnline || showOfflineBanner) && (
        <div
          className={`fixed top-0 left-0 right-0 z-[100] px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors ${
            isOnline
              ? "bg-emerald-600 text-white"
              : "bg-amber-500 text-slate-950"
          }`}
        >
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              <span>Back Online — Field Crew Checklists &amp; Studio ERP Synced</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>
                Offline Field Crew Mode Active — Cached Event Run-Sheets, Shot Lists, Gear Checklists &amp; QR Check-In Ready
              </span>
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
              Install as a native app for offline wedding run-sheets, crew shot lists, and instant client portal access.
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
                    Install Royal Studio PWA &amp; Offline Crew App
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
                Royal Studio is configured as a Progressive Web App (PWA) with offline caching for event run-sheets, shot lists, equipment checklists, and QR check-ins at remote wedding venues.
              </p>

              {isIOS ? (
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="font-bold text-[#D4AF37]">On iPhone / iPad (Safari):</div>
                  <div className="flex items-center gap-2">
                    <Share className="w-4 h-4 text-[#D4AF37] shrink-0" />
                    <span>1. Tap the <strong>Share</strong> button in Safari&apos;s bottom bar.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PlusSquare className="w-4 h-4 text-[#D4AF37] shrink-0" />
                    <span>2. Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="font-bold text-[#D4AF37]">How to Install on Your Device:</div>
                  <p className="text-[11px] leading-relaxed">
                    • <strong>Chrome / Edge (Desktop &amp; Android):</strong> Click the <strong>Install App</strong> icon in the browser address bar or open the browser menu (⋮) and select <strong>Install Royal Studio</strong>.
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    • <strong>iOS Safari:</strong> Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
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
