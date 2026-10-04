"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-xl bg-border/60 dark:bg-border/40",
        className
      )}
    />
  );
}

/**
 * Skeleton Screen for PortfolioGrid during data fetching.
 */
export function PortfolioGridSkeleton({ count = 6 }: { count?: number }) {
  const aspects = [
    "aspect-[3/4]",
    "aspect-[16/10]",
    "aspect-square",
    "aspect-[3/4]",
    "aspect-square",
    "aspect-[16/10]",
  ];

  return (
    <div
      role="status"
      aria-label="Loading portfolio gallery"
      className="space-y-10"
    >
      {/* Category Filter Pills Skeleton */}
      <div className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: 7 }).map((_, idx) => (
          <SkeletonPulse
            key={`cat-skel-${idx}`}
            className="h-9 w-24 rounded-full"
          />
        ))}
      </div>

      {/* Masonry Columns Skeleton */}
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 2xl:columns-4">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={`port-skel-${idx}`}
            className="mb-4 break-inside-avoid overflow-hidden rounded-[12px] border border-border bg-background p-2"
          >
            <SkeletonPulse
              className={cn(
                "w-full rounded-[10px]",
                aspects[idx % aspects.length]
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton Screen for PublicBlogGrid during data fetching.
 */
export function PublicBlogGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading blog articles"
      className="mx-auto max-w-7xl"
    >
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={`blog-skel-${idx}`}
            className="overflow-hidden rounded-[12px] border border-border bg-background shadow-premium"
          >
            <SkeletonPulse className="aspect-[16/10] w-full rounded-none" />
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <SkeletonPulse className="h-3.5 w-24 rounded-md" />
                <SkeletonPulse className="h-3.5 w-20 rounded-md" />
              </div>
              <SkeletonPulse className="h-6 w-5/6 rounded-md" />
              <SkeletonPulse className="h-4 w-full rounded-md" />
              <SkeletonPulse className="h-4 w-4/5 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton Screen for PublicServicesList during data fetching.
 */
export function PublicServicesListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading studio services"
      className="mx-auto max-w-7xl space-y-16"
    >
      {/* Jump Navigation Bar Skeleton */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 rounded-2xl border border-border bg-background p-4 shadow-premium">
        {Array.from({ length: 6 }).map((_, idx) => (
          <SkeletonPulse
            key={`srv-jump-skel-${idx}`}
            className="h-8 w-32 rounded-xl"
          />
        ))}
      </div>

      {/* Detailed Service Cards Skeleton */}
      <div className="space-y-16">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={`srv-card-skel-${idx}`}
            className="rounded-2xl border border-border bg-background/50 p-6 sm:p-10 shadow-premium space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <SkeletonPulse className="h-14 w-14 rounded-xl" />
                <div className="space-y-2">
                  <SkeletonPulse className="h-8 w-56 rounded-lg" />
                  <SkeletonPulse className="h-4 w-40 rounded-md" />
                </div>
              </div>
              <div className="flex gap-2">
                <SkeletonPulse className="h-9 w-36 rounded-xl" />
                <SkeletonPulse className="h-9 w-32 rounded-xl" />
              </div>
            </div>

            <div className="space-y-2 max-w-3xl">
              <SkeletonPulse className="h-4 w-full rounded-md" />
              <SkeletonPulse className="h-4 w-5/6 rounded-md" />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {Array.from({ length: 3 }).map((__, colIdx) => (
                <div
                  key={`srv-col-${idx}-${colIdx}`}
                  className="rounded-[12px] border border-border bg-surface p-6 space-y-3"
                >
                  <SkeletonPulse className="h-5 w-32 rounded-md" />
                  <SkeletonPulse className="h-3.5 w-full rounded-md" />
                  <SkeletonPulse className="h-3.5 w-4/5 rounded-md" />
                  <SkeletonPulse className="h-3.5 w-3/4 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
