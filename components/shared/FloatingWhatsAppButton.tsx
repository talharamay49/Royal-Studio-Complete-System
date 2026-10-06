"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, ExternalLink, PhoneCall } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { siteConfig } from "@/lib/data";
import { usePublicStudioProfile, usePublicWebsiteCMS } from "@/components/shared/StudioProfileContext";

function toWhatsAppUrl(phoneStr: string, studioName: string, lineLabel: string): string {
  const digits = phoneStr.replace(/[^0-9]/g, "");
  const cleanWa = digits.startsWith("92") ? digits : `92${digits.replace(/^0/, "")}`;
  const message = `Hi ${studioName} (${lineLabel}), I'd like to inquire about wedding photography and check availability.`;
  return `https://wa.me/${cleanWa}?text=${encodeURIComponent(message)}`;
}

/**
 * Strictly corner-anchored Floating WhatsApp Button (Bottom-Left)
 * Aligned on the exact same horizontal baseline (bottom-5 / 20px) as the bottom-right Royal Chatbot button.
 */
export default function FloatingWhatsAppButton() {
  const pathname = usePathname();
  const profile = usePublicStudioProfile();
  const { websiteCustomization } = usePublicWebsiteCMS();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem("royal_whatsapp_floating_pos_v1");
      window.localStorage.removeItem("royal_whatsapp_floating_pos_v2");
    } catch {
      // Ignore storage cleanup error
    }
  }, []);

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

  return (
    <div ref={containerRef} className="no-print">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-20 left-5 z-50 w-72 sm:w-80 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-2xl border border-border bg-surface text-text shadow-premium-lg select-none"
          >
            <div className="flex items-center justify-between bg-[#25D366] px-4 py-3 text-white">
              <div className="flex items-center gap-2.5 min-w-0">
                <MessageCircle className="h-4 w-4 shrink-0 fill-white/20" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold leading-tight">
                    {studioName} WhatsApp
                  </p>
                  <p className="truncate text-[10px] text-white/90">
                    Instant Booking &amp; Availability Desk
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close WhatsApp menu"
                className="rounded-full p-1 text-white/85 hover:bg-black/15 hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
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

      {/* Strictly Corner-Aligned Bottom-Left WhatsApp Button */}
      <div className="fixed bottom-5 left-5 z-40 select-none">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-label={`Open ${studioName} WhatsApp options`}
          title={`WhatsApp ${studioName}`}
          className="group flex h-12 w-12 sm:h-12 sm:w-auto items-center justify-center sm:gap-2.5 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white sm:px-4 shadow-[0_10px_28px_rgba(37,211,102,0.35)] border border-white/25 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
        >
          <span className="relative flex h-5 w-5 items-center justify-center shrink-0">
            {isOpen ? (
              <X className="h-[18px] w-[18px]" />
            ) : (
              <MessageCircle className="h-[18px] w-[18px] fill-white/15" />
            )}
          </span>
          <span className="hidden sm:inline-block text-xs font-bold tracking-wide whitespace-nowrap">
            WhatsApp Us
          </span>
        </button>
      </div>
    </div>
  );
}
