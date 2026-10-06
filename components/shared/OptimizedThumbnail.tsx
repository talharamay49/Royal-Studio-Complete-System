"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ROYAL_BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { cn } from "@/lib/utils";

export type ThumbnailAspectRatio = "square" | "tall" | "wide" | "portrait" | "video";

export interface OptimizedThumbnailProps {
  src: string;
  alt: string;
  aspect?: ThumbnailAspectRatio;
  focalPoint?: "center" | "top" | "bottom";
  priority?: boolean;
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
 * Custom image optimization wrapper that dynamically handles aspect-ratio cropping
 * for thumbnails while preserving Next.js `placeholder="blur"` blur-up placeholders
 * for consistent visual quality across mobile, tablet, and 4K displays.
 */
export default function OptimizedThumbnail({
  src,
  alt,
  aspect = "wide",
  focalPoint = "center",
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  blurDataURL = ROYAL_BLUR_DATA_URL,
  zoomOnHover = true,
  className,
  imageClassName,
  children,
}: OptimizedThumbnailProps) {
  const [hasError, setHasError] = useState(false);
  const resolvedSrc = hasError ? "/portfolio/bridal-03-outdoor-tree.jpg" : src;
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
          referrerPolicy="no-referrer"
          className={cn(
            "h-full w-full object-cover transition-transform duration-700",
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
          priority={priority}
          loading={priority ? undefined : "lazy"}
          placeholder="blur"
          blurDataURL={blurDataURL}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          sizes={sizes}
          className={cn(
            "object-cover transition-transform duration-700",
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
