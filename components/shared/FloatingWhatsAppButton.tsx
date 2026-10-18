"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, ExternalLink, PhoneCall, MoveVertical, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { siteConfig } from "@/lib/data";
import { usePublicStudioProfile, usePublicWebsiteCMS } from "@/components/shared/StudioProfileContext";

const WA_Y_STORAGE_KEY = "royal_whatsapp_y_pos_v3";
const DEFAULT_WA_BOTTOM = 76;

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function toWhatsAppUrl(phoneStr: string, studioName: string, lineLabel: string): string {
  const digits = phoneStr.replace(/[^0-9]/g, "");
  const cleanWa = digits.startsWith("92") ? digits : `92${digits.replace(/^0/, "")}`;
  const message = `Hi ${studioName} (${lineLabel}), I'd like to inquire about wedding photography and check availability.`;
  return `https://wa.me/${cleanWa}?text=${encodeURIComponent(message)}`;
}

/**
 * Right-side aligned Floating WhatsApp Button (stacked above the Royal Chatbot button)
 * Movable strictly along the Y-axis (vertical rail on the right edge only).
 */
export default function FloatingWhatsAppButton() {
  const pathname = usePathname();
  const profile = usePublicStudioProfile();
  const { websiteCustomization } = usePublicWebsiteCMS();
  const [isOpen, setIsOpen] = useState(false);
  const [bottomY, setBottomY] = useState<number>(DEFAULT_WA_BOTTOM);
  const [viewportHeight, setViewportHeight] = useState<number>(800);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    moved: boolean;
    startY: number;
    startBottom: number;
  }>({
    active: false,
    moved: false,
    startY: 0,
    startBottom: DEFAULT_WA_BOTTOM,
  });

  const clampBottomToViewport = useCallback((rawBottom: number) => {
    if (typeof window === "undefined") return DEFAULT_WA_BOTTOM;
    const minBottom = 16;
    const maxBottom = Math.max(minBottom, window.innerHeight - 84);
    return clamp(rawBottom, minBottom, maxBottom);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setViewportHeight(window.innerHeight);
    try {
      window.localStorage.removeItem("royal_whatsapp_floating_pos_v1");
      window.localStorage.removeItem("royal_whatsapp_floating_pos_v2");
      const saved = window.localStorage.getItem(WA_Y_STORAGE_KEY);
      if (saved) {
        const parsed = Number(saved);
        if (!Number.isNaN(parsed)) {
          setBottomY(clampBottomToViewport(parsed));
        }
      }
    } catch {
      // Ignore storage error
    }

    const handleResize = () => {
      setViewportHeight(window.innerHeight);
      setBottomY((prev) => clampBottomToViewport(prev));
    };
    const handleRailSync = (e: Event) => {
      const ce = e as CustomEvent<{ source: string; bottomY: number }>;
      if (ce.detail?.source === "chatbot" && typeof ce.detail.bottomY === "number") {
        const syncedBottom = clampBottomToViewport(ce.detail.bottomY + 60);
        setBottomY(syncedBottom);
        try {
          window.localStorage.setItem(WA_Y_STORAGE_KEY, String(syncedBottom));
        } catch {
          // Ignore
        }
      }
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("royalstudio:floating-rail-sync", handleRailSync);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("royalstudio:floating-rail-sync", handleRailSync);
    };
  }, [clampBottomToViewport]);

  const handleResetY = () => {
    setBottomY(DEFAULT_WA_BOTTOM);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(WA_Y_STORAGE_KEY);
        window.dispatchEvent(
          new CustomEvent("royalstudio:floating-rail-sync", {
            detail: { source: "whatsapp", bottomY: DEFAULT_WA_BOTTOM },
          })
        );
      } catch {
        // Ignore
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      active: true,
      moved: false,
      startY: e.clientY,
      startBottom: bottomY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStateRef.current.active) return;
    const dy = e.clientY - dragStateRef.current.startY;
    if (Math.abs(dy) > 4) {
      dragStateRef.current.moved = true;
    }
    if (dragStateRef.current.moved) {
      const nextBottom = clampBottomToViewport(Math.max(76, dragStateRef.current.startBottom - dy));
      setBottomY(nextBottom);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("royalstudio:floating-rail-sync", {
            detail: { source: "whatsapp", bottomY: nextBottom },
          })
        );
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStateRef.current.active) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    const wasMoved = dragStateRef.current.moved;
    dragStateRef.current.active = false;
    if (wasMoved && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(WA_Y_STORAGE_KEY, String(bottomY));
      } catch {
        // Ignore
      }
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/client-portal") ||
    pathname?.startsWith("/portal") ||
    pathname?.startsWith("/proposal") ||
    pathname?.startsWith("/gallery") ||
    websiteCustomization?.sectionVisibility?.showFloatingWhatsapp === false
  ) {
    return null;
  }

  const studioName =
    profile?.publicStudioName || profile?.studioName || siteConfig.name;

  const primaryPhone =
    profile?.publicWhatsappNumber ||
    profile?.publicContactNumber ||
    profile?.whatsapp ||
    profile?.phone ||
    siteConfig.phones[0] ||
    "0308-4877073";

  const secondaryPhone =
    profile?.phone2 || siteConfig.phones[1] || "0303-2213806";

  const lines = [
    {
      id: "primary",
      label: "Primary Booking Line",
      number: primaryPhone,
      href: toWhatsAppUrl(primaryPhone, studioName, "Primary Line"),
    },
    ...(secondaryPhone && secondaryPhone !== primaryPhone
      ? [
          {
            id: "secondary",
            label: "Secondary Studio Line",
            number: secondaryPhone,
            href: toWhatsAppUrl(secondaryPhone, studioName, "Secondary Line"),
          },
        ]
      : []),
  ];

  const popupBottom = clamp(bottomY + 56, 16, Math.max(16, viewportHeight - 220));

  return (
    <div ref={containerRef} className="no-print">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            style={{ bottom: `${popupBottom}px` }}
            className="fixed right-4 sm:right-5 z-50 w-72 sm:w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-surface text-text shadow-premium-lg select-none"
          >
            <div className="flex items-center justify-between bg-[#25D366] px-4 py-3 text-white">
              <div className="flex items-center gap-2.5 min-w-0">
                <MessageCircle className="h-4 w-4 shrink-0 fill-white/20" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold leading-tight">
                    {studioName} WhatsApp
                  </p>
                  <p className="truncate text-[10px] text-white/90">
                    Drag up/down along edge · Tap to chat
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {bottomY !== DEFAULT_WA_BOTTOM && (
                  <button
                    type="button"
                    onClick={handleResetY}
                    title="Reset vertical position"
                    className="rounded-full p-1 text-white/85 hover:bg-black/15 hover:text-white cursor-pointer"
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close WhatsApp menu"
                  className="rounded-full p-1 text-white/85 hover:bg-black/15 hover:text-white cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="p-3 space-y-2 bg-surface">
              {lines.map((line) => (
                <a
                  key={line.id}
                  href={line.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center justify-between gap-2 rounded-xl border border-border bg-background/80 px-3 py-2.5 transition-all hover:border-[#25D366] hover:bg-[#25D366]/10"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#25D366]/15 text-[#25D366]">
                      <PhoneCall size={14} />
                    </span>
                    <div className="min-w-0">
                      <span className="block truncate text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                        {line.label}
                      </span>
                      <span className="block truncate text-xs font-bold text-primary group-hover:text-[#25D366] transition-colors">
                        {line.number}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#25D366] px-2.5 py-1 text-[10px] font-bold text-white shrink-0">
                    <span>Chat</span>
                    <ExternalLink size={10} />
                  </span>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right-Edge Anchored, Y-Axis Only Movable WhatsApp Button */}
      <div
        style={{
          bottom: `${bottomY}px`,
          touchAction: "none",
        }}
        className="fixed right-4 sm:right-5 z-40 select-none"
      >
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={() => {
            if (dragStateRef.current.moved) return;
            setIsOpen((prev) => !prev);
          }}
          aria-expanded={isOpen}
          aria-label={`Open ${studioName} WhatsApp options (Drag vertically to adjust height)`}
          title={`WhatsApp ${studioName} — Drag up/down along right edge`}
          className="group flex h-12 w-12 sm:h-11 sm:w-auto items-center justify-center sm:gap-2 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white sm:px-3.5 shadow-[0_10px_28px_rgba(37,211,102,0.35)] border border-white/25 transition-colors duration-200 cursor-ns-resize"
        >
          <span className="relative flex h-5 w-5 items-center justify-center shrink-0">
            {isOpen ? (
              <X className="h-[18px] w-[18px]" />
            ) : (
              <MessageCircle className="h-[18px] w-[18px] fill-white/15" />
            )}
          </span>
          <span className="hidden sm:inline-block text-xs font-bold tracking-wide whitespace-nowrap">
            WhatsApp
          </span>
          <MoveVertical className="hidden sm:inline-block w-3 h-3 text-white/75 opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
    </div>
  );
}
