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
  nav: { width: 200, height: 56, imgClass: "h-9 w-auto sm:h-10 md:h-11" },
  footer: { width: 220, height: 62, imgClass: "h-11 w-auto md:h-12" },
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
        "inline-block shrink-0 overflow-hidden rounded-lg shadow-premium transition-transform duration-300 hover:scale-[1.02]",
        className
      )}
    >
      {isDataUri ? (
        <img
          src={logoSrc}
          alt={`${studioName} — ${tagline}`}
          width={width}
          height={height}
          className={imgClass}
        />
      ) : (
        <Image
          src={logoSrc}
          alt={`${studioName} — ${tagline}`}
          width={width}
          height={height}
          className={imgClass}
          priority={variant === "nav"}
        />
      )}
    </Link>
  );
}
