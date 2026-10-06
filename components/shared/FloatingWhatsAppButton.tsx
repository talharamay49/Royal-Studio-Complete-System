"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, ExternalLink, PhoneCall, Move, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { siteConfig } from "@/lib/data";
import { usePublicStudioProfile, usePublicWebsiteCMS } from "@/components/shared/StudioProfileContext";

const WA_POS_STORAGE_KEY = "royal_whatsapp_floating_pos_v2";

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
 * Compact, responsive, viewport-clamped moveable Floating WhatsApp Button
 * that never moves outside the screen on mobile or desktop.
 */
export default function FloatingWhatsAppButton() {
  const pathname = usePathname();
  const profile = usePublicStudioProfile();
  const { websiteCustomization } = usePublicWebsiteCMS();
  const [isOpen, setIsOpen] = useState(false);
  // Position from bottom-left in px, strictly clamped inside the viewport
  const [pos, setPos] = useState<{ left: number; bottom: number }>({
    left: 16,
    bottom: 16,
  });
  const [viewport, setViewport] = useState<{ width: number; height: number }>({
    width: 1200,
    height: 800,
  });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    startLeft: number;
    startBottom: number;
  }>({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    startLeft: 16,
    startBottom: 16,
  });

  const clampPositionToViewport = (rawLeft: number, rawBottom: number) => {
    if (typeof window === "undefined") return { left: 16, bottom: 16 };
    const btnW = buttonRef.current?.offsetWidth || 44;
    const btnH = buttonRef.current?.offsetHeight || 44;
    const margin = 12;
    const topSafeMargin = 72;
    const maxLeft = Math.max(margin, window.innerWidth - btnW - margin);
    const maxBottom = Math.max(margin, window.innerHeight - btnH - topSafeMargin);
    return {
      left: clamp(rawLeft, margin, maxLeft),
      bottom: clamp(rawBottom, margin, maxBottom),
    };
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    setViewport({ width: window.innerWidth, height: window.innerHeight });
    try {
      // Remove legacy unconstrained key if present
      window.localStorage.removeItem("royal_whatsapp_floating_pos_v1");
      const saved = window.localStorage.getItem(WA_POS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.left === "number" && typeof parsed?.bottom === "number") {
          setPos(clampPositionToViewport(parsed.left, parsed.bottom));
        }
      }
    } catch {
      // Ignore storage read error
    }

    const handleResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      setPos((prev) => clampPositionToViewport(prev.left, prev.bottom));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleResetPosition = () => {
    const def = { left: 16, bottom: 16 };
    setPos(def);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(WA_POS_STORAGE_KEY);
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
      startX: e.clientX,
      startY: e.clientY,
      startLeft: pos.left,
      startBottom: pos.bottom,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStateRef.current.active) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragStateRef.current.moved = true;
    }
    if (dragStateRef.current.moved) {
      const next = clampPositionToViewport(
        dragStateRef.current.startLeft + dx,
        dragStateRef.current.startBottom - dy
      );
      setPos(next);
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
        window.localStorage.setItem(WA_POS_STORAGE_KEY, JSON.stringify(pos));
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

  const btnHeight = buttonRef.current?.offsetHeight || 44;
  const popupWidth = Math.min(288, Math.max(240, viewport.width - 24));
  const popupLeft = clamp(
    pos.left,
    12,
    Math.max(12, viewport.width - popupWidth - 12)
  );
  const rawPopupBottom = pos.bottom + btnHeight + 10;
  const maxPopupBottom = Math.max(12, viewport.height - 210);
  const popupBottom = clamp(rawPopupBottom, 12, maxPopupBottom);

  return (
    <div ref={containerRef} className="no-print">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            style={{
              left: `${popupLeft}px`,
              bottom: `${popupBottom}px`,
              width: `${popupWidth}px`,
            }}
            className="fixed z-50 overflow-hidden rounded-2xl border border-border bg-surface text-text shadow-premium-lg select-none"
          >
            <div className="flex items-center justify-between bg-[#25D366] px-3.5 py-2.5 text-white">
              <div className="flex items-center gap-2 min-w-0">
                <MessageCircle className="h-4 w-4 shrink-0 fill-white/20" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold leading-tight">
                    {studioName} WhatsApp
                  </p>
                  <p className="truncate text-[10px] text-white/85">
                    Drag button to move · Tap a line to chat
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {(pos.left !== 16 || pos.bottom !== 16) && (
                  <button
                    type="button"
                    onClick={handleResetPosition}
                    title="Reset button position"
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

            <div className="p-2.5 space-y-2 bg-surface">
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
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#25D366] px-2 py-1 text-[10px] font-bold text-white shrink-0">
                    <span>Send</span>
                    <ExternalLink size={10} />
                  </span>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{
          left: `${pos.left}px`,
          bottom: `${pos.bottom}px`,
          touchAction: "none",
        }}
        className="fixed z-40 select-none"
      >
        <button
          ref={buttonRef}
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
          aria-label={`Open ${studioName} WhatsApp options (Drag to move)`}
          title={`WhatsApp ${studioName} — Drag to move within screen`}
          className="group flex h-10 w-10 sm:h-auto sm:w-auto items-center justify-center sm:gap-2 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white sm:px-3.5 sm:py-2.5 shadow-lg border border-white/25 transition-colors duration-200 cursor-grab active:cursor-grabbing"
        >
          <span className="relative flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center shrink-0">
            {isOpen ? (
              <X className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            ) : (
              <MessageCircle className="h-4 w-4 sm:h-[18px] sm:w-[18px] fill-white/15" />
            )}
          </span>
          <span className="hidden sm:inline-block text-xs font-semibold tracking-wide whitespace-nowrap">
            WhatsApp
          </span>
          <Move className="hidden sm:inline-block w-3 h-3 text-white/70 opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
    </div>
  );
}
