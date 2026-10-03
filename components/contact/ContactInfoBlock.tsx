"use client";

import Link from "next/link";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import AnimatedSection from "@/components/shared/AnimatedSection";
import WhatsAppButton from "@/components/shared/WhatsAppButton";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/data";
import { usePublicStudioProfile } from "@/components/shared/StudioProfileContext";

export default function ContactInfoBlock() {
  const profile = usePublicStudioProfile();
  const studioName = profile?.publicStudioName || profile?.studioName || siteConfig.name;
  const email = profile?.bookingEmail || profile?.email || siteConfig.email;
  const displayAddress = profile?.publicDisplayAddress || profile?.address || siteConfig.address.full;
  const googleMapsUrl = profile?.googleMapsUrl || siteConfig.social.maps;
  const phones = [
    profile?.publicContactNumber || profile?.phone || siteConfig.phones[0],
    profile?.phone2 || siteConfig.phones[1],
  ].filter(Boolean) as string[];

  return (
    <AnimatedSection>
      <h2 className="font-display text-3xl text-primary">Get in Touch</h2>
      <p className="mt-4 text-text-muted leading-relaxed">
        Ready to book {studioName} for your wedding? Fill out the inquiry form
        or reach us directly via phone, WhatsApp, or email.
      </p>

      <ul className="mt-8 space-y-4">
        {phones.map((phone) => (
          <li key={phone} className="flex items-center gap-3 text-text-muted">
            <Phone size={18} className="shrink-0 text-accent" />
            <a href={`tel:${phone.replace(/[^0-9+]/g, "")}`} className="hover:text-accent">
              {phone}
            </a>
          </li>
        ))}
        <li className="flex items-center gap-3 text-text-muted">
          <Mail size={18} className="shrink-0 text-accent" />
          <a href={`mailto:${email}`} className="hover:text-accent">
            {email}
          </a>
        </li>
        <li className="flex items-start gap-3 text-text-muted">
          <MapPin size={18} className="mt-0.5 shrink-0 text-accent" />
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent"
          >
            {displayAddress}
          </a>
        </li>
      </ul>

      {profile?.showBusinessHoursPublicly && profile?.businessHours && profile.businessHours.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-background/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Clock size={14} className="text-accent" />
            <span>Studio Business Hours</span>
          </div>
          <div className="grid grid-cols-1 gap-1 text-xs text-text-muted sm:grid-cols-2">
            {profile.businessHours.map((bh) => (
              <div key={bh.day} className="flex justify-between pr-2">
                <span className="font-medium text-primary">{bh.day}:</span>
                <span>{bh.isClosed ? "Closed" : `${bh.openTime} – ${bh.closeTime}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <WhatsAppButton />
        {phones.map((phone) => (
          <Button key={phone} asChild variant="outline">
            <Link href={`tel:${phone.replace(/[^0-9+]/g, "")}`}>
              <Phone size={16} />
              Call {phone}
            </Link>
          </Button>
        ))}
      </div>

      <div className="mt-10 overflow-hidden rounded-[12px] border border-border shadow-premium">
        <iframe
          src="https://maps.google.com/maps?q=Royal+Studio,+Al+Jannat+Town+Entrance,+Canal+Bungalow+Road,+Burewala,+Pakistan&z=16&output=embed"
          width="100%"
          height="280"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`${studioName} Location`}
        />
        <div className="p-4 text-center">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent hover:underline"
          >
            Open in Google Maps →
          </a>
        </div>
      </div>
    </AnimatedSection>
  );
}
