"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  X,
  Play,
  Heart,
  Eye,
  ExternalLink,
  Youtube,
  Instagram,
  Facebook,
  Share2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  LayoutGrid,
  Columns3,
} from "lucide-react";
import {
  portfolioCategories,
  weddingFilms,
  extractYoutubeId,
  resolveAboutImageSrc,
} from "@/lib/data";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [layoutMode, setLayoutMode] = useState<"masonry" | "grid">("masonry");
  const [lightbox, setLightbox] = useState<PortfolioItem | null>(null);
  const [lightboxImgError, setLightboxImgError] = useState(false);

  const effectiveLimit =
    showHeading && websiteCustomization?.sectionVisibility?.homePortfolioLimit
      ? websiteCustomization.sectionVisibility.homePortfolioLimit
      : limit;
  const [visibleCount, setVisibleCount] = useState(effectiveLimit ?? 16);

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

  // Merge CMS portfolio items with curated 4K Wedding Films so the "Films" filter and categories are rich
  const visiblePortfolioItems = useMemo(() => {
    const baseItems = portfolioItems.filter((item) => item.visible !== false);
    const existingIds = new Set(baseItems.map((i) => i.id));
    const existingYoutubeIds = new Set(
      baseItems
        .filter((i) => i.videoUrl)
        .map((i) => extractYoutubeId(i.videoUrl))
    );

    const filmItems: PortfolioItem[] = weddingFilms
      .filter(
        (film) =>
          !existingIds.has(9000 + Number(film.id)) &&
          !existingYoutubeIds.has(film.youtubeId)
      )
      .map((film, idx) => {
        const titleLower = film.title.toLowerCase();
        let cat: Exclude<PortfolioCategory, "all"> = "barat";
        if (titleLower.includes("mehndi") || titleLower.includes("mayoun")) {
          cat = "mehndi";
        } else if (titleLower.includes("walima")) {
          cat = "walima";
        } else if (titleLower.includes("nikah")) {
          cat = "nikah";
        } else if (titleLower.includes("groom")) {
          cat = "groom";
        }
        return {
          id: 9000 + (Number(film.id) || idx + 1),
          title: film.title,
          category: cat,
          image: `https://i.ytimg.com/vi/${film.youtubeId}/hqdefault.jpg`,
          aspect: "wide",
          location: film.location,
          mediaType: "video",
          videoUrl: `https://www.youtube.com/watch?v=${film.youtubeId}`,
          duration: film.duration,
          sourcePlatform: "youtube",
          socialHandle: "@royalstudio089",
          visible: true,
        };
      });

    return [...baseItems, ...filmItems];
  }, [portfolioItems]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: visiblePortfolioItems.length };
    for (const item of visiblePortfolioItems) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }, [visiblePortfolioItems]);

  // Show categories that have items (or are currently selected) to keep the filter bar clean & uncluttered
  const displayedCategories = useMemo(() => {
    return portfolioCategories.filter(
      (cat) =>
        cat.id === "all" ||
        (categoryCounts[cat.id] ?? 0) > 0 ||
        activeFilter === cat.id
    );
  }, [categoryCounts, activeFilter]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return visiblePortfolioItems.filter((item) => {
      const catMatch = activeFilter === "all" || item.category === activeFilter;
      const typeMatch =
        mediaFilter === "all" ||
        (mediaFilter === "video" ? item.mediaType === "video" : item.mediaType !== "video");
      const queryMatch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.location && item.location.toLowerCase().includes(q)) ||
        (item.caption && item.caption.toLowerCase().includes(q));
      return catMatch && typeMatch && queryMatch;
    });
  }, [visiblePortfolioItems, activeFilter, mediaFilter, searchQuery]);

  const displayed = effectiveLimit
    ? filtered.slice(0, effectiveLimit)
    : filtered.slice(0, visibleCount);

  const hasMore = !effectiveLimit && visibleCount < filtered.length;

  const handleNavigateLightbox = useCallback(
    (direction: "prev" | "next") => {
      if (!lightbox || filtered.length <= 1) return;
      const currentIdx = filtered.findIndex((item) => item.id === lightbox.id);
      if (currentIdx === -1) return;
      const nextIdx =
        direction === "next"
          ? (currentIdx + 1) % filtered.length
          : (currentIdx - 1 + filtered.length) % filtered.length;
      setLightboxImgError(false);
      setLightbox(filtered[nextIdx]);
    },
    [lightbox, filtered]
  );

  useEffect(() => {
    if (!lightbox) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") handleNavigateLightbox("next");
      if (e.key === "ArrowLeft") handleNavigateLightbox("prev");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightbox, handleNavigateLightbox]);

  if (showHeading && websiteCustomization?.sectionVisibility?.showPortfolioSection === false) {
    return null;
  }

  const sectionSpacingClass = showHeading
    ? "section-padding bg-surface"
    : "px-4 py-12 sm:px-6 sm:py-16 md:px-12 md:py-20 lg:px-20 bg-surface";

  if (isLoading) {
    return (
      <section id={showHeading ? undefined : "portfolio"} className={sectionSpacingClass}>
        <div className="mx-auto max-w-7xl 2xl:max-w-[1600px]">
          <PortfolioGridSkeleton count={limit ?? 6} />
        </div>
      </section>
    );
  }

  const activeCategoryLabel =
    portfolioCategories.find((c) => c.id === activeFilter)?.label || "All Works";

  const hasVideosInPortfolio = visiblePortfolioItems.some((item) => item.mediaType === "video");

  const renderPlatformBadge = (platform?: PortfolioItem["sourcePlatform"]) => {
    if (!platform || platform === "upload") return null;
    if (platform === "youtube") return <Youtube size={12} className="text-red-400" />;
    if (platform === "instagram") return <Instagram size={12} className="text-pink-400" />;
    if (platform === "facebook") return <Facebook size={12} className="text-blue-400" />;
    return <Share2 size={12} className="text-accent" />;
  };

  return (
    <section id={showHeading ? undefined : "portfolio"} className={sectionSpacingClass}>
      <div className="mx-auto max-w-7xl 2xl:max-w-[1600px]">
        {showHeading ? (
          <AnimatedSection>
            <SectionHeading
              label={portfolioLabel}
              title={portfolioTitle}
              description={portfolioDescription}
            />
          </AnimatedSection>
        ) : (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <BreadcrumbNav
              variant="surface"
              items={
                activeFilter !== "all"
                  ? [
                      { name: "Home", url: "/" },
                      { name: "Portfolio", url: "/portfolio" },
                      {
                        name: activeCategoryLabel,
                        url: `/portfolio?category=${activeFilter}`,
                      },
                    ]
                  : [
                      { name: "Home", url: "/" },
                      { name: "Portfolio", url: "/portfolio" },
                    ]
              }
            />
            <div className="flex items-center gap-3 text-xs font-medium text-text-muted">
              <span>
                Showing <strong className="text-primary">{displayed.length}</strong> of{" "}
                <strong className="text-primary">{filtered.length}</strong> works
              </span>
              {(activeFilter !== "all" || mediaFilter !== "all" || searchQuery.trim() !== "") && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter("all");
                    setMediaFilter("all");
                    setSearchQuery("");
                    setVisibleCount(limit ?? 16);
                  }}
                  className="inline-flex items-center gap-1 text-accent hover:underline cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Unified Editorial Filter, Search & Layout Control Bar */}
        <AnimatedSection>
          <div className="mb-8 rounded-2xl border border-border bg-background/90 p-3.5 sm:p-4 shadow-2xs space-y-3">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0 xl:flex-wrap no-scrollbar">
                {displayedCategories.map((cat) => {
                  const count = categoryCounts[cat.id] ?? 0;
                  const isActive = activeFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setActiveFilter(cat.id);
                        setVisibleCount(limit ?? 16);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium tracking-wider uppercase whitespace-nowrap transition-all duration-200 cursor-pointer ${
                        isActive
                          ? "bg-primary text-secondary shadow-xs"
                          : "border border-border/80 bg-surface text-text-muted hover:border-accent hover:text-primary"
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                          isActive
                            ? "bg-accent text-[#111111] font-bold"
                            : "bg-background text-text-muted"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Right Controls: Search + Media Type + Layout Mode */}
              <div className="flex flex-wrap items-center justify-between xl:justify-end gap-2 border-t xl:border-t-0 border-border pt-2.5 xl:pt-0 shrink-0">
                {!showHeading && (
                  <div className="relative flex-1 sm:flex-initial sm:w-52">
                    <Search
                      size={13}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search venue, city, style..."
                      className="w-full rounded-lg border border-border/80 bg-surface pl-8 pr-7 py-1.5 text-xs text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        aria-label="Clear search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                )}

                {hasVideosInPortfolio && (
                  <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-surface p-0.5">
                    {(
                      [
                        { id: "all", label: "All Media" },
                        { id: "image", label: "Photos" },
                        { id: "video", label: "4K Films" },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setMediaFilter(tab.id)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-medium tracking-wider uppercase transition-all cursor-pointer ${
                          mediaFilter === tab.id
                            ? "bg-accent text-[#111111] font-semibold shadow-2xs"
                            : "text-text-muted hover:text-primary"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Masonry vs Uniform Grid Switcher */}
                <div
                  className="hidden sm:flex items-center gap-0.5 rounded-lg border border-border/80 bg-surface p-0.5"
                  role="group"
                  aria-label="Gallery layout mode"
                >
                  <button
                    type="button"
                    onClick={() => setLayoutMode("masonry")}
                    title="Editorial Masonry (True Aspect Ratio)"
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all cursor-pointer ${
                      layoutMode === "masonry"
                        ? "bg-primary text-secondary"
                        : "text-text-muted hover:text-primary"
                    }`}
                  >
                    <Columns3 size={13} />
                    <span className="hidden md:inline">Masonry</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutMode("grid")}
                    title="Uniform Cinema Grid"
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all cursor-pointer ${
                      layoutMode === "grid"
                        ? "bg-primary text-secondary"
                        : "text-text-muted hover:text-primary"
                    }`}
                  >
                    <LayoutGrid size={13} />
                    <span className="hidden md:inline">Grid</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background px-6 py-20 text-center">
            <Camera size={32} className="mb-4 text-accent/60" strokeWidth={1.5} />
            <h3 className="font-display text-2xl text-primary">
              {searchQuery.trim()
                ? `No matches for "${searchQuery}"`
                : `${portfolioCategories.find((cat) => cat.id === activeFilter)?.label || "Selected"} Stories Are on the Way`}
            </h3>
            <p className="mt-2 max-w-md text-sm text-text-muted">
              We&apos;re curating new work for this selection. Reset filters to explore our
              complete gallery of weddings, bridal portraits, and 4K cinema films.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setActiveFilter("all");
                  setMediaFilter("all");
                  setSearchQuery("");
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
            key={`${activeFilter}-${mediaFilter}-${layoutMode}`}
            className={
              layoutMode === "masonry"
                ? "columns-1 sm:columns-2 lg:columns-3 2xl:columns-4 gap-6 space-y-6"
                : "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
            }
          >
            {displayed.map((item, i) => {
              const isVideo = item.mediaType === "video";
              const cardAspect =
                layoutMode === "masonry"
                  ? isVideo
                    ? "wide"
                    : item.aspect || "tall"
                  : "wide";
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.3) }}
                  onClick={() => {
                    setLightboxImgError(false);
                    setLightbox(item);
                  }}
                  className={`group relative flex w-full flex-col overflow-hidden rounded-xl border border-border/70 bg-background text-left shadow-premium transition-all duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-premium-lg cursor-pointer ${
                    layoutMode === "masonry" ? "break-inside-avoid mb-6" : ""
                  }`}
                >
                  <OptimizedThumbnail
                    src={item.image}
                    alt={item.title}
                    aspect={cardAspect}
                    focalPoint={
                      item.aspect === "tall" ||
                      item.category === "bridal" ||
                      item.category === "bride" ||
                      item.category === "groom"
                        ? "top"
                        : "center"
                    }
                    quality={92}
                    priority={i < 6}
                    blurDataURL={ROYAL_BLUR_DATA_URL}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
                  >
                    {/* Persistent Video Play Button */}
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#111111]/85 text-accent shadow-lg ring-2 ring-accent/70 transition-transform duration-300 group-hover:scale-110">
                          <Play size={20} className="fill-accent ml-0.5" />
                        </span>
                      </div>
                    )}

                    {/* Top Platform & Video Badges */}
                    {(isVideo || (item.sourcePlatform && item.sourcePlatform !== "upload")) && (
                      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-2 pointer-events-none">
                        {item.sourcePlatform && item.sourcePlatform !== "upload" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-[#111111]/85 px-2.5 py-1 text-[10px] font-medium tracking-wider text-[#f5f2eb] backdrop-blur-xs">
                            {renderPlatformBadge(item.sourcePlatform)}
                            <span>{item.socialHandle || item.sourcePlatform}</span>
                          </span>
                        ) : (
                          <span />
                        )}
                        {isVideo && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-red-600/90 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase text-white backdrop-blur-xs">
                            <Play size={9} className="fill-white" />
                            <span>{item.duration || "4K Film"}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Permanent Legible Editorial Bottom Gradient Overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#111111]/95 via-[#111111]/55 to-transparent p-4 pt-12 text-[#f5f2eb] transition-all duration-300">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-accent">
                          {item.category} {isVideo ? "· 4K Film" : ""}
                        </span>
                        {(item.likesCount || item.viewsCount) && (
                          <div className="flex items-center gap-2.5 text-[10px] text-[#f5f2eb]/80">
                            {item.likesCount ? (
                              <span className="inline-flex items-center gap-1">
                                <Heart size={10} className="text-accent" />
                                {item.likesCount.toLocaleString()}
                              </span>
                            ) : null}
                            {item.viewsCount ? (
                              <span className="inline-flex items-center gap-1">
                                <Eye size={10} className="text-accent" />
                                {item.viewsCount.toLocaleString()}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                      <h3 className="mt-1 font-display text-lg sm:text-xl leading-snug text-[#f5f2eb] group-hover:text-accent transition-colors line-clamp-1">
                        {item.title}
                      </h3>
                      {item.location && (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#f5f2eb]/75 line-clamp-1">
                          <MapPin size={11} className="text-accent shrink-0" />
                          <span>{item.location}</span>
                        </p>
                      )}
                    </div>
                  </OptimizedThumbnail>
                </motion.button>
              );
            })}
          </div>
        )}

        {hasMore && (
          <div className="mt-12 text-center">
            <Button
              variant="outline"
              onClick={() => setVisibleCount((c) => c + 8)}
              className="px-8"
            >
              Load More Works ({filtered.length - displayed.length} remaining)
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

      {/* Interactive Lightbox Modal with Prev/Next Navigation */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111111]/95 p-3 sm:p-6 backdrop-blur-md"
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-[#f5f2eb] hover:border-accent hover:text-accent transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={22} />
            </button>

            {filtered.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigateLightbox("prev");
                  }}
                  className="absolute left-2 sm:left-5 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-[#f5f2eb] hover:border-accent hover:text-accent transition-colors cursor-pointer"
                  aria-label="Previous work"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigateLightbox("next");
                  }}
                  className="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-[#f5f2eb] hover:border-accent hover:text-accent transition-colors cursor-pointer"
                  aria-label="Next work"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-y-auto no-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black">
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
                ) : (() => {
                    const lightboxSrc = lightboxImgError
                      ? "/portfolio/bridal-03-outdoor-tree.jpg"
                      : resolveAboutImageSrc(lightbox.image, "/portfolio/bridal-03-outdoor-tree.jpg");
                    const isRaw =
                      lightboxSrc.startsWith("data:") ||
                      (/^https?:\/\//i.test(lightboxSrc) &&
                        !lightboxSrc.includes("picsum.photos") &&
                        !lightboxSrc.includes("ytimg.com") &&
                        !lightboxSrc.includes("youtube.com"));
                    return isRaw ? (
                      <img
                        src={lightboxSrc}
                        alt={lightbox.title}
                        referrerPolicy="no-referrer"
                        onError={() => setLightboxImgError(true)}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Image
                        src={lightboxSrc}
                        alt={lightbox.title}
                        fill
                        quality={95}
                        priority
                        placeholder="blur"
                        blurDataURL={ROYAL_BLUR_DATA_URL}
                        referrerPolicy="no-referrer"
                        onError={() => setLightboxImgError(true)}
                        className="portfolio-hd-img object-contain"
                        sizes="100vw"
                      />
                    );
                  })()}
              </div>
              <div className="mt-4 px-2 text-center text-[#f5f2eb]">
                <h3 className="font-display text-xl sm:text-2xl">{lightbox.title}</h3>
                <p className="mt-1 text-xs sm:text-sm tracking-widest uppercase text-accent">
                  {lightbox.category}
                  {lightbox.location ? ` · ${lightbox.location}` : ""}
                </p>
                {lightbox.caption && (
                  <p className="mx-auto mt-2 max-w-2xl text-xs text-[#f5f2eb]/75">
                    {lightbox.caption}
                  </p>
                )}
                {lightbox.sourcePlatform && lightbox.sourcePlatform !== "upload" && (
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-[#f5f2eb]/80">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3 py-1">
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
                  <p className="mt-2 text-xs text-[#f5f2eb]/60">
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
