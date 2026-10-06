"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, Play, Heart, Eye, ExternalLink, Youtube, Instagram, Facebook, Share2 } from "lucide-react";
import { portfolioCategories, extractYoutubeId } from "@/lib/data";
import { usePublicWebsiteCMS } from "@/components/shared/StudioProfileContext";
import type { PortfolioCategory, PortfolioItem } from "@/types";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import SectionHeading from "@/components/shared/SectionHeading";
import AnimatedSection from "@/components/shared/AnimatedSection";
import OptimizedThumbnail from "@/components/shared/OptimizedThumbnail";
import { PortfolioGridSkeleton } from "@/components/shared/SkeletonScreens";
import { Button } from "@/components/ui/button";
import { ROYAL_BLUR_DATA_URL } from "@/lib/blur-placeholder";

interface PortfolioGridProps {
  limit?: number;
  showHeading?: boolean;
  showViewAll?: boolean;
}

export default function PortfolioGrid({
  limit,
  showHeading = true,
  showViewAll = true,
}: PortfolioGridProps) {
  const { portfolioItems, websiteCustomization, isLoading } = usePublicWebsiteCMS();
  const [activeFilter, setActiveFilter] = useState<PortfolioCategory>("all");
  const [mediaFilter, setMediaFilter] = useState<"all" | "image" | "video">("all");
  const [lightbox, setLightbox] = useState<PortfolioItem | null>(null);
  const effectiveLimit =
    showHeading && websiteCustomization?.sectionVisibility?.homePortfolioLimit
      ? websiteCustomization.sectionVisibility.homePortfolioLimit
      : limit;
  const [visibleCount, setVisibleCount] = useState(effectiveLimit ?? 9);

  const portfolioLabel = websiteCustomization?.sections?.portfolioLabel || "Portfolio";
  const portfolioTitle = websiteCustomization?.sections?.portfolioTitle || "Stories We've Told";
  const portfolioDescription =
    websiteCustomization?.sections?.portfolioDescription ||
    "Nikah, Mehndi, Barat, Walima, and beyond — explore our curated wedding gallery.";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get("category") as PortfolioCategory | null;
      if (catParam && portfolioCategories.some((c) => c.id === catParam)) {
        setActiveFilter(catParam);
      }
    }
  }, []);

  if (showHeading && websiteCustomization?.sectionVisibility?.showPortfolioSection === false) {
    return null;
  }

  if (isLoading) {
    return (
      <section
        id={showHeading ? undefined : "portfolio"}
        className={showHeading ? "section-padding bg-surface" : ""}
      >
        <div className="mx-auto max-w-7xl 2xl:max-w-[1600px]">
          <PortfolioGridSkeleton count={limit ?? 6} />
        </div>
      </section>
    );
  }

  const activeCategoryLabel =
    portfolioCategories.find((c) => c.id === activeFilter)?.label || "All Works";

  const hasVideosInPortfolio = portfolioItems.some((item) => item.mediaType === "video");

  const filtered = portfolioItems.filter((item) => {
    if (item.visible === false) return false;
    const catMatch = activeFilter === "all" || item.category === activeFilter;
    const typeMatch =
      mediaFilter === "all" ||
      (mediaFilter === "video" ? item.mediaType === "video" : item.mediaType !== "video");
    return catMatch && typeMatch;
  });

  const displayed = effectiveLimit
    ? filtered.slice(0, effectiveLimit)
    : filtered.slice(0, visibleCount);

  const hasMore = !effectiveLimit && visibleCount < filtered.length;

  const renderPlatformBadge = (platform?: PortfolioItem["sourcePlatform"]) => {
    if (!platform || platform === "upload") return null;
    if (platform === "youtube") return <Youtube size={12} className="text-red-400" />;
    if (platform === "instagram") return <Instagram size={12} className="text-pink-400" />;
    if (platform === "facebook") return <Facebook size={12} className="text-blue-400" />;
    return <Share2 size={12} className="text-accent" />;
  };

  return (
    <section
      id={showHeading ? undefined : "portfolio"}
      className={showHeading ? "section-padding bg-surface" : ""}
    >
      <div className="mx-auto max-w-7xl 2xl:max-w-[1600px]">
        {showHeading ? (
          <AnimatedSection>
            <SectionHeading
              label={portfolioLabel}
              title={portfolioTitle}
              description={portfolioDescription}
            />
          </AnimatedSection>
        ) : activeFilter !== "all" ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <BreadcrumbNav
              variant="surface"
              items={[
                { name: "Home", url: "/" },
                { name: "Portfolio", url: "/portfolio" },
                {
                  name: activeCategoryLabel,
                  url: `/portfolio?category=${activeFilter}`,
                },
              ]}
            />
            <span className="text-xs font-medium text-text-muted">
              Showing {displayed.length} of {filtered.length} works
            </span>
          </div>
        ) : (
          <h2 className="sr-only">Portfolio Gallery</h2>
        )}

        <AnimatedSection>
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            {portfolioCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveFilter(cat.id);
                  setVisibleCount(limit ?? 9);
                }}
                className={`rounded-full px-4 py-2 text-xs font-medium tracking-widest uppercase transition-all duration-300 cursor-pointer ${
                  activeFilter === cat.id
                    ? "bg-primary text-secondary"
                    : "border border-border bg-surface text-text-muted hover:border-accent hover:text-accent"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {hasVideosInPortfolio && (
            <div className="mb-8 flex justify-center gap-2">
              {(
                [
                  { id: "all", label: "All Media" },
                  { id: "image", label: "Photos" },
                  { id: "video", label: "Videos & Films" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMediaFilter(tab.id)}
                  className={`rounded-full px-3.5 py-1 text-[11px] font-medium tracking-wider uppercase transition-all cursor-pointer ${
                    mediaFilter === tab.id
                      ? "bg-accent text-primary font-semibold"
                      : "border border-border/70 bg-background text-text-muted hover:border-accent"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </AnimatedSection>

        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-border bg-background px-6 py-20 text-center">
            <Camera size={32} className="mb-4 text-accent/60" strokeWidth={1.5} />
            <h3 className="font-display text-2xl text-primary">
              {portfolioCategories.find((cat) => cat.id === activeFilter)?.label}{" "}
              Stories Are on the Way
            </h3>
            <p className="mt-2 max-w-md text-sm text-text-muted">
              We&apos;re adding new work to this category soon. In the meantime,
              browse our full portfolio or reach out to see recent{" "}
              {portfolioCategories.find((cat) => cat.id === activeFilter)?.label.toLowerCase()}{" "}
              coverage.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setActiveFilter("all");
                  setMediaFilter("all");
                }}
              >
                View Full Portfolio
              </Button>
              <Button asChild variant="accent">
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div
            key={`${activeFilter}-${mediaFilter}`}
            className="columns-1 gap-4 sm:columns-2 lg:columns-3 2xl:columns-4"
          >
            {displayed.map((item, i) => {
              const isVideo = item.mediaType === "video";
              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, delay: i * 0.03 }}
                  onClick={() => setLightbox(item)}
                  className="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-[12px] cursor-pointer text-left"
                >
                  <OptimizedThumbnail
                    src={item.image}
                    alt={item.title}
                    aspect={
                      item.aspect === "tall"
                        ? "tall"
                        : item.aspect === "wide"
                        ? "wide"
                        : "square"
                    }
                    priority={i < 3}
                    blurDataURL={ROYAL_BLUR_DATA_URL}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
                  >
                    {/* Persistent Video Play Button & Connected Profile Pill */}
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/80 text-accent shadow-lg ring-2 ring-accent/60 transition-transform duration-300 group-hover:scale-110">
                          <Play size={20} className="fill-accent ml-0.5" />
                        </span>
                      </div>
                    )}

                    {(isVideo || (item.sourcePlatform && item.sourcePlatform !== "upload")) && (
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                        {item.sourcePlatform && item.sourcePlatform !== "upload" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/85 px-2.5 py-1 text-[10px] font-medium tracking-wider text-secondary backdrop-blur-xs">
                            {renderPlatformBadge(item.sourcePlatform)}
                            <span>{item.socialHandle || item.sourcePlatform}</span>
                          </span>
                        ) : (
                          <span />
                        )}
                        {isVideo && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-600/90 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase text-white backdrop-blur-xs">
                            <Play size={9} className="fill-white" />
                            <span>{item.duration || "Video"}</span>
                          </span>
                        )}
                      </div>
                    )}

                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary/70 p-4 text-center opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                      <h3 className="font-display text-xl text-secondary">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-xs tracking-widest uppercase text-accent">
                        {item.category} {isVideo ? "· Film" : ""}
                      </p>
                      {item.location && (
                        <p className="mt-1 text-xs text-secondary/75">
                          {item.location}
                        </p>
                      )}
                      {(item.likesCount || item.viewsCount) && (
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-secondary/80">
                          {item.likesCount ? (
                            <span className="inline-flex items-center gap-1">
                              <Heart size={11} className="text-accent" />
                              {item.likesCount.toLocaleString()}
                            </span>
                          ) : null}
                          {item.viewsCount ? (
                            <span className="inline-flex items-center gap-1">
                              <Eye size={11} className="text-accent" />
                              {item.viewsCount.toLocaleString()} views
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </OptimizedThumbnail>
                </motion.button>
              );
            })}
          </div>
        )}

        {hasMore && (
          <div className="mt-10 text-center">
            <Button
              variant="outline"
              onClick={() => setVisibleCount((c) => c + 6)}
            >
              Load More
            </Button>
          </div>
        )}

        {showViewAll && limit && (
          <div className="mt-12 text-center">
            <Button asChild variant="outline">
              <Link href="/portfolio">View Full Portfolio</Link>
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/95 p-4 backdrop-blur-sm"
            onClick={() => setLightbox(null)}
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-6 right-6 z-10 text-secondary hover:text-accent cursor-pointer"
              aria-label="Close"
            >
              <X size={28} />
            </button>
            <motion.div
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.92 }}
              className="relative max-h-[88vh] w-full max-w-5xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[12px] bg-black">
                {lightbox.mediaType === "video" && lightbox.videoUrl ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYoutubeId(
                      lightbox.videoUrl
                    )}?autoplay=1&rel=0`}
                    title={lightbox.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                ) : lightbox.image.startsWith("data:") ||
                  (/^https?:\/\//i.test(lightbox.image) &&
                    !lightbox.image.includes("picsum.photos") &&
                    !lightbox.image.includes("ytimg.com") &&
                    !lightbox.image.includes("youtube.com")) ? (
                  <img
                    src={lightbox.image}
                    alt={lightbox.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Image
                    src={lightbox.image}
                    alt={lightbox.title}
                    fill
                    placeholder="blur"
                    blurDataURL={ROYAL_BLUR_DATA_URL}
                    referrerPolicy="no-referrer"
                    className="object-contain"
                    sizes="90vw"
                  />
                )}
              </div>
              <div className="mt-4 text-center text-secondary">
                <h3 className="font-display text-2xl">{lightbox.title}</h3>
                <p className="mt-1 text-sm tracking-widest uppercase text-accent">
                  {lightbox.category}
                  {lightbox.location ? ` · ${lightbox.location}` : ""}
                </p>
                {lightbox.caption && (
                  <p className="mx-auto mt-2 max-w-2xl text-xs text-secondary/75">
                    {lightbox.caption}
                  </p>
                )}
                {lightbox.sourcePlatform && lightbox.sourcePlatform !== "upload" && (
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-secondary/80">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1">
                      {renderPlatformBadge(lightbox.sourcePlatform)}
                      <span>
                        Connected {lightbox.sourcePlatform} ·{" "}
                        {lightbox.socialHandle || "@royalstudio089"}
                      </span>
                    </span>
                    {lightbox.likesCount ? (
                      <span className="inline-flex items-center gap-1">
                        <Heart size={12} className="text-accent" />
                        {lightbox.likesCount.toLocaleString()} likes
                      </span>
                    ) : null}
                    {lightbox.viewsCount ? (
                      <span className="inline-flex items-center gap-1">
                        <Eye size={12} className="text-accent" />
                        {lightbox.viewsCount.toLocaleString()} views
                      </span>
                    ) : null}
                    {lightbox.socialPostUrl && (
                      <a
                        href={lightbox.socialPostUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:underline"
                      >
                        <span>View on {lightbox.sourcePlatform}</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                )}
                {lightbox.exif && (
                  <p className="mt-2 text-xs text-secondary/60">
                    {lightbox.exif.camera} · {lightbox.exif.lens} ·{" "}
                    {lightbox.exif.aperture} · {lightbox.exif.shutter} · ISO{" "}
                    {lightbox.exif.iso}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
