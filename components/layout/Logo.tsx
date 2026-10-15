"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePublicStudioProfile } from "@/components/shared/StudioProfileContext";

type LogoProps = {
  variant?: "nav" | "footer";
  className?: string;
};

const config = {
  nav: { width: 170, height: 48, imgClass: "h-8 w-auto sm:h-9 md:h-10 object-contain" },
  footer: { width: 220, height: 62, imgClass: "h-11 w-auto md:h-12 object-contain" },
};

export default function Logo({ variant = "nav", className }: LogoProps) {
  const { width, height, imgClass } = config[variant];
  const profile = usePublicStudioProfile();
  const logoSrc = profile?.websiteLogo || profile?.primaryLogo || profile?.logo || "/RoyalLogo.png";
  const studioName = profile?.publicStudioName || profile?.studioName || "Royal Studio";
  const tagline = profile?.tagline || "Luxury wedding photography, cinematic films, and brand shoots.";
  const isDataUri = logoSrc.startsWith("data:") || logoSrc.startsWith("http");

  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex items-center shrink-0 transition-transform duration-300 hover:scale-[1.01]",
        className
      )}
    >
      <span className="inline-flex items-center justify-center bg-transparent p-0">
        {isDataUri ? (
          <img
            src={logoSrc}
            alt={`${studioName} — ${tagline}`}
            width={width}
            height={height}
            className={cn(imgClass, "drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]")}
          />
        ) : (
          <Image
            src={logoSrc}
            alt={`${studioName} — ${tagline}`}
            width={width}
            height={height}
            className={cn(imgClass, "drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]")}
            priority={variant === "nav"}
            referrerPolicy="no-referrer"
          />
        )}
      </span>
    </Link>
  );
}
