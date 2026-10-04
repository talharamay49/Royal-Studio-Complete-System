"use client";

import { useState } from "react";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  Copy,
  Check,
  Instagram,
  Facebook,
  Youtube,
  ExternalLink,
} from "lucide-react";
import AnimatedSection from "@/components/shared/AnimatedSection";
import WhatsAppButton from "@/components/shared/WhatsAppButton";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/data";
import { usePublicStudioProfile } from "@/components/shared/StudioProfileContext";

const DEFAULT_PUBLIC_HOURS = [
  { day: "Monday", isOpen: true, openTime: "10:00 AM", closeTime: "09:00 PM", isClosed: false },
  { day: "Tuesday", isOpen: true, openTime: "10:00 AM", closeTime: "09:00 PM", isClosed: false },
  { day: "Wednesday", isOpen: true, openTime: "10:00 AM", closeTime: "09:00 PM", isClosed: false },
  { day: "Thursday", isOpen: true, openTime: "10:00 AM", closeTime: "09:00 PM", isClosed: false },
  { day: "Friday", isOpen: true, openTime: "10:00 AM", closeTime: "09:00 PM", isClosed: false },
  { day: "Saturday", isOpen: true, openTime: "10:00 AM", closeTime: "10:00 PM", isClosed: false },
  { day: "Sunday", isOpen: true, openTime: "12:00 PM", closeTime: "08:00 PM", isClosed: false },
];

export default function ContactInfoBlock() {
  const profile = usePublicStudioProfile();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const studioName = profile?.publicStudioName || profile?.studioName || siteConfig.name;
  const email = profile?.bookingEmail || profile?.email || siteConfig.email;
  const supportEmail =
    profile?.supportEmail && profile.supportEmail !== email ? profile.supportEmail : null;
  const displayAddress =
    profile?.publicDisplayAddress || profile?.address || siteConfig.address.full;
  const googleMapsUrl = profile?.googleMapsUrl || siteConfig.social.maps;

  const phones = Array.from(
    new Set(
      [
        profile?.publicContactNumber || profile?.phone || siteConfig.phones[0],
        profile?.phone2 || siteConfig.phones[1],
      ].filter(Boolean)
    )
  ) as string[];

  const rawWa = (
    profile?.publicWhatsappNumber ||
    profile?.whatsapp ||
    phones[0] ||
    "0308-4877073"
  ).replace(/[^0-9]/g, "");
  const cleanWa = rawWa.startsWith("92") ? rawWa : `92${rawWa.replace(/^0/, "")}`;
  const whatsappDisplay = profile?.publicWhatsappNumber || profile?.whatsapp || phones[0] || "0308-4877073";
  const whatsappUrl = `https://wa.me/${cleanWa}?text=${encodeURIComponent(
    `Hi ${studioName}, I'd like to inquire about wedding photography and check availability.`
  )}`;

  const businessHours =
    profile?.businessHours && profile.businessHours.length > 0
      ? profile.businessHours
      : DEFAULT_PUBLIC_HOURS;
  const showHours = profile?.showBusinessHoursPublicly !== false;

  const mapEmbedQuery = encodeURIComponent(`${studioName}, ${displayAddress}`);
  const mapEmbedSrc = `https://maps.google.com/maps?q=${mapEmbedQuery}&z=16&output=embed`;

  const socials = [
    { icon: Instagram, href: profile?.instagram || siteConfig.social.instagram, label: "Instagram" },
    { icon: Facebook, href: profile?.facebook || siteConfig.social.facebook, label: "Facebook" },
    { icon: Youtube, href: profile?.youtube || siteConfig.social.youtube, label: "YouTube" },
  ].filter((s) => Boolean(s.href));

  function copyToClipboard(key: string, text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  }

  return (
    <AnimatedSection className="w-full max-w-full min-w-0 overflow-hidden">
      <span className="block text-xs font-semibold tracking-[0.2em] uppercase text-accent">
        Direct Studio Concierge
      </span>
      <h2 className="mt-2 font-display text-2xl sm:text-3xl md:text-4xl text-primary break-words">
        Get in Touch with {studioName}
      </h2>
      <p className="mt-3 text-sm sm:text-base text-text-muted leading-relaxed break-words">
        Ready to reserve {studioName} for your celebration? Complete the wedding inquiry form or connect directly with our Burewala studio desk via phone, WhatsApp, or email.
      </p>

      {/* Contact Cards List */}
      <div className="mt-6 sm:mt-7 space-y-3 w-full max-w-full">
        {phones.map((phone, idx) => (
          <div
            key={phone}
            className="flex items-center justify-between gap-2 sm:gap-3 rounded-xl border border-border bg-background/70 px-3 sm:px-4 py-3 transition-colors hover:border-accent/50 w-full max-w-full"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Phone size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold tracking-wider uppercase text-text-muted truncate">
                  {idx === 0 ? "Primary Booking Line" : "Secondary Studio Line"}
                </div>
                <a
                  href={`tel:${phone.replace(/[^0-9+]/g, "")}`}
                  className="block truncate text-sm font-semibold text-primary hover:text-accent transition-colors"
                >
                  {phone}
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(`phone-${idx}`, phone)}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 sm:px-2.5 py-1.5 text-[11px] font-medium text-text-muted hover:border-accent hover:text-accent transition-colors cursor-pointer shrink-0"
              title="Copy phone number"
            >
              {copiedKey === `phone-${idx}` ? (
                <>
                  <Check size={12} className="text-accent" />
                  <span className="text-accent">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        ))}

        {/* WhatsApp Direct Lines (Primary & Secondary) */}
        {phones.map((phone, idx) => {
          const digits = phone.replace(/[^0-9]/g, "");
          const cleanLineWa = digits.startsWith("92") ? digits : `92${digits.replace(/^0/, "")}`;
          const lineWaUrl = `https://wa.me/${cleanLineWa}?text=${encodeURIComponent(
            `Hi ${studioName}, I'd like to inquire about wedding photography and check availability.`
          )}`;
          return (
            <div
              key={`wa-${phone}`}
              className="flex items-center justify-between gap-2 sm:gap-3 rounded-xl border border-border bg-background/70 px-3 sm:px-4 py-3 transition-colors hover:border-accent/50 w-full max-w-full"
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-[#25D366]/15 text-[#25D366]">
                  <MessageCircle size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold tracking-wider uppercase text-text-muted truncate">
                    {idx === 0 ? "Primary WhatsApp Concierge" : "Secondary WhatsApp Line"}
                  </div>
                  <a
                    href={lineWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm font-semibold text-primary hover:text-accent transition-colors"
                  >
                    {phone}
                  </a>
                </div>
              </div>
              <a
                href={lineWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 px-2 sm:px-2.5 py-1.5 text-[11px] font-semibold text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors shrink-0"
              >
                <span>Chat</span>
                <ExternalLink size={11} />
              </a>
            </div>
          );
        })}

        {/* Email Line */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 rounded-xl border border-border bg-background/70 px-3 sm:px-4 py-3 transition-colors hover:border-accent/50 w-full max-w-full">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Mail size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold tracking-wider uppercase text-text-muted truncate">
                Official Booking Email
              </div>
              <a
                href={`mailto:${email}`}
                className="block truncate text-sm font-semibold text-primary hover:text-accent transition-colors"
              >
                {email}
              </a>
              {supportEmail && (
                <a
                  href={`mailto:${supportEmail}`}
                  className="block truncate text-xs text-text-muted hover:text-accent transition-colors"
                >
                  {supportEmail}
                </a>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard("email", email)}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 sm:px-2.5 py-1.5 text-[11px] font-medium text-text-muted hover:border-accent hover:text-accent transition-colors cursor-pointer shrink-0"
            title="Copy email address"
          >
            {copiedKey === "email" ? (
              <>
                <Check size={12} className="text-accent" />
                <span className="text-accent">Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Studio Address */}
        <div className="flex items-start justify-between gap-2 sm:gap-3 rounded-xl border border-border bg-background/70 px-3 sm:px-4 py-3.5 transition-colors hover:border-accent/50 w-full max-w-full">
          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="mt-0.5 flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <MapPin size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold tracking-wider uppercase text-text-muted truncate">
                Studio Flagship Address ({profile?.city || "Burewala"})
              </div>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 block text-sm font-medium text-primary hover:text-accent transition-colors leading-snug break-words"
              >
                {displayAddress}
              </a>
            </div>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard("address", displayAddress)}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 sm:px-2.5 py-1.5 text-[11px] font-medium text-text-muted hover:border-accent hover:text-accent transition-colors cursor-pointer shrink-0"
            title="Copy address"
          >
            {copiedKey === "address" ? (
              <>
                <Check size={12} className="text-accent" />
                <span className="text-accent">Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Studio Business Hours */}
      {showHours && businessHours.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-background/70 p-4">
          <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Clock size={14} className="text-accent" />
            <span>Studio Business Hours</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5 text-xs text-text-muted sm:grid-cols-2">
            {businessHours.map((bh) => (
              <div key={bh.day} className="flex justify-between pr-2">
                <span className="font-medium text-primary">{bh.day}:</span>
                <span>{bh.isClosed ? "Closed" : `${bh.openTime} – ${bh.closeTime}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons & Socials */}
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <WhatsAppButton />
        {phones.map((phone) => (
          <Button key={phone} asChild variant="outline">
            <a href={`tel:${phone.replace(/[^0-9+]/g, "")}`}>
              <Phone size={16} />
              <span>Call {phone}</span>
            </a>
          </Button>
        ))}
        {socials.map(({ icon: Icon, href, label }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-text-muted transition-all hover:border-accent hover:text-accent"
          >
            <Icon size={18} />
          </a>
        ))}
      </div>

      {/* Interactive Google Maps Embed */}
      <div className="mt-8 overflow-hidden rounded-xl border border-border bg-background shadow-premium">
        <iframe
          src={mapEmbedSrc}
          width="100%"
          height="260"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`${studioName} Location`}
        />
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface text-xs">
          <span className="text-text-muted truncate pr-3">{displayAddress}</span>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-accent hover:underline shrink-0"
          >
            <span>Open in Google Maps</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </AnimatedSection>
  );
}
