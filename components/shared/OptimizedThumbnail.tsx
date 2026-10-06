"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ROYAL_BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { resolveAboutImageSrc } from "@/lib/data";
import { cn } from "@/lib/utils";

export type ThumbnailAspectRatio = "square" | "tall" | "wide" | "portrait" | "video";

export interface OptimizedThumbnailProps {
  src: string;
  alt: string;
  aspect?: ThumbnailAspectRatio;
  focalPoint?: "center" | "top" | "bottom";
  priority?: boolean;
  quality?: number;
  sizes?: string;
  blurDataURL?: string;
  zoomOnHover?: boolean;
  className?: string;
  imageClassName?: string;
  children?: React.ReactNode;
}

const ASPECT_CLASS_MAP: Record<ThumbnailAspectRatio, string> = {
  square: "aspect-square",
  tall: "aspect-[3/4]",
  wide: "aspect-[16/10]",
  portrait: "aspect-[4/5]",
  video: "aspect-video",
};

const FOCAL_CLASS_MAP: Record<"center" | "top" | "bottom", string> = {
  center: "object-center",
  top: "object-top",
  bottom: "object-bottom",
};

/**
 * Normalizes remote image URLs to their highest-resolution, optimized variant
 * (e.g., Cloudinary f_auto,q_auto:best, Unsplash w=1920&q=90&auto=format).
 */
export function upgradeToHighResUrl(rawUrl: string): string {
  if (!rawUrl || rawUrl.startsWith("data:") || rawUrl.startsWith("/")) {
    return rawUrl;
  }
  let url = rawUrl.trim();
  if (
    url.includes("res.cloudinary.com") &&
    url.includes("/upload/") &&
    !url.includes("q_auto")
  ) {
    url = url.replace("/upload/", "/upload/f_auto,q_auto:best/");
  }
  if (url.includes("images.unsplash.com")) {
    try {
      const parsed = new URL(url);
      if (
        !parsed.searchParams.has("w") ||
        Number(parsed.searchParams.get("w")) < 1600
      ) {
        parsed.searchParams.set("w", "1920");
      }
      parsed.searchParams.set("q", "90");
      parsed.searchParams.set("auto", "format");
      url = parsed.toString();
    } catch {
      // Ignore malformed URL
    }
  }
  return url;
}

/**
 * Custom image optimization wrapper that dynamically handles aspect-ratio cropping
 * for thumbnails while preserving Next.js `placeholder="blur"` blur-up placeholders
 * and high-resolution AVIF/WebP optimization (`quality={90}`) across mobile, tablet, and 4K displays.
 */
export default function OptimizedThumbnail({
  src,
  alt,
  aspect = "wide",
  focalPoint = "center",
  priority = false,
  quality = 90,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw",
  blurDataURL = ROYAL_BLUR_DATA_URL,
  zoomOnHover = true,
  className,
  imageClassName,
  children,
}: OptimizedThumbnailProps) {
  const [hasError, setHasError] = useState(false);
  const sanitizedSrc = upgradeToHighResUrl(
    resolveAboutImageSrc(src, "/portfolio/bridal-03-outdoor-tree.jpg")
  );
  const resolvedSrc = hasError
    ? "/portfolio/bridal-03-outdoor-tree.jpg"
    : sanitizedSrc;
  const isRawImg =
    resolvedSrc.startsWith("data:") ||
    (/^https?:\/\//i.test(resolvedSrc) &&
      !resolvedSrc.includes("res.cloudinary.com") &&
      !resolvedSrc.includes("storage.googleapis.com") &&
      !resolvedSrc.includes("images.unsplash.com") &&
      !resolvedSrc.includes("picsum.photos") &&
      !resolvedSrc.includes("i.ytimg.com") &&
      !resolvedSrc.includes("img.youtube.com"));

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-primary/10",
        ASPECT_CLASS_MAP[aspect] || ASPECT_CLASS_MAP.wide,
        className
      )}
    >
      {isRawImg ? (
        <img
          src={resolvedSrc}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className={cn(
            "portfolio-hd-img h-full w-full object-cover transition-transform duration-700",
            FOCAL_CLASS_MAP[focalPoint],
            zoomOnHover && "group-hover:scale-105",
            imageClassName
          )}
        />
      ) : (
        <Image
          src={resolvedSrc}
          alt={alt}
          fill
          quality={quality}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          placeholder="blur"
          blurDataURL={blurDataURL}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          sizes={sizes}
          className={cn(
            "portfolio-hd-img object-cover transition-transform duration-700",
            FOCAL_CLASS_MAP[focalPoint],
            zoomOnHover && "group-hover:scale-105",
            imageClassName
          )}
        />
      )}
      {children}
    </div>
  );
}
