"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Instagram,
  Facebook,
  Youtube,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { navLinks, siteConfig } from "@/lib/data";
import { usePublicStudioProfile } from "@/components/shared/StudioProfileContext";
import Logo from "./Logo";

function TiktokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M16.6 5.82c-1.02-.9-1.6-2.19-1.6-3.57h-3.16v13.3c0 1.6-1.3 2.9-2.9 2.9a2.9 2.9 0 0 1 0-5.8c.28 0 .55.04.8.11V9.4a6.06 6.06 0 0 0-.8-.05c-3.36 0-6.08 2.72-6.08 6.08S6.34 21.5 9.7 21.5s6.08-2.72 6.08-6.08V8.7a8.7 8.7 0 0 0 5.08 1.63V7.17a4.85 4.85 0 0 1-4.26-1.35Z" />
    </svg>
  );
}

export default function Footer() {
  const pathname = usePathname();
  const profile = usePublicStudioProfile();

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const studioName = profile?.publicStudioName || profile?.studioName || siteConfig.name;
  const description = profile?.description || profile?.tagline || siteConfig.description;
  const displayAddress = profile?.publicDisplayAddress || profile?.address || siteConfig.address.full;
  const googleMapsUrl = profile?.googleMapsUrl || siteConfig.social.maps;
  const email = profile?.email || siteConfig.email;
  const phones = [
    profile?.publicContactNumber || profile?.phone || siteConfig.phones[0],
    profile?.phone2 || siteConfig.phones[1],
  ].filter(Boolean) as string[];

  const socials = [
    { icon: Instagram, href: profile?.instagram || siteConfig.social.instagram, label: "Instagram" },
    { icon: Facebook, href: profile?.facebook || siteConfig.social.facebook, label: "Facebook" },
    { icon: Youtube, href: profile?.youtube || siteConfig.social.youtube, label: "YouTube" },
    { icon: TiktokIcon, href: profile?.tiktok || siteConfig.social.tiktok, label: "TikTok" },
  ].filter((s) => Boolean(s.href));

  return (
    <footer className="border-t border-border bg-surface">
      <div className="section-padding pb-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <Logo variant="footer" className="mb-6" />
              <p className="text-sm leading-relaxed text-text-muted">
                {description}
              </p>
              <div className="mt-6 flex gap-3">
                {socials.map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-text-muted transition-all hover:border-accent hover:text-accent"
                  >
                    <Icon size={18} />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-4 font-display text-lg text-primary">Quick Links</h4>
              <ul className="space-y-2">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-muted transition-colors hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-display text-lg text-primary">Contact</h4>
              <ul className="space-y-3 text-sm text-text-muted">
                <li className="flex items-start gap-2">
                  <Phone size={16} className="mt-0.5 shrink-0 text-accent" />
                  <div>
                    {phones.map((phone) => (
                      <a
                        key={phone}
                        href={`tel:${phone.replace(/[^0-9+]/g, "")}`}
                        className="block hover:text-accent"
                      >
                        {phone}
                      </a>
                    ))}
                  </div>
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={16} className="shrink-0 text-accent" />
                  <a
                    href={`mailto:${email}`}
                    className="hover:text-accent"
                  >
                    {email}
                  </a>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-accent" />
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
            </div>

            <div>
              <h4 className="mb-4 font-display text-lg text-primary">Cities Served</h4>
              <ul className="flex flex-wrap gap-2">
                {siteConfig.citiesServed.slice(0, 8).map((city) => (
                  <li
                    key={city}
                    className="rounded-full border border-border px-3 py-1 text-xs text-text-muted"
                  >
                    {city}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 text-center md:flex-row md:px-12 md:text-left">
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} {studioName}. Founded by{" "}
            {siteConfig.founders.join(" & ")}. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-text-muted">
            <span>Wedding Photographer {profile?.city || "Burewala"} · Luxury Wedding Photography Pakistan</span>
            <span>·</span>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
            >
              <ShieldCheck size={14} />
              Studio Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
