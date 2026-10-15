"use client";

import { useState, useMemo } from "react";
import {
  Youtube,
  Instagram,
  Facebook,
  Share2,
  ExternalLink,
  MapPin,
  Clock,
  Sparkles,
  Heart,
  Eye,
  MessageCircle,
  Play,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import AnimatedSection from "@/components/shared/AnimatedSection";
import {
  weddingFilms as defaultWeddingFilms,
  featuredFilm as defaultFeaturedFilm,
  extractYoutubeId,
  siteConfig,
} from "@/lib/data";
import { usePublicWebsiteCMS } from "@/components/shared/StudioProfileContext";
import type { SocialPlatformId } from "@/types";

export default function PublicWeddingFilmsContent() {
  const { websiteCustomization, socialMediaPosts, connectedSocialAccounts } =
    usePublicWebsiteCMS();
  const filmsCfg = websiteCustomization?.films;

  const pageTitle = filmsCfg?.pageTitle || "Wedding Films";
  const pageDescription =
    filmsCfg?.pageDescription ||
    "Cinematic storytelling that preserves the music, vows, and emotions of your celebration.";
  const defaultFeaturedYoutubeId = extractYoutubeId(
    filmsCfg?.featuredYoutubeId || defaultFeaturedFilm.youtubeId
  );
  const featuredFilmTitle =
    filmsCfg?.featuredFilmTitle || defaultFeaturedFilm.title;
  const featuredDescription =
    filmsCfg?.featuredDescription || defaultFeaturedFilm.description;
  const channelHandle =
    filmsCfg?.connectedYoutubeChannelHandle || "@royalstudio089";
  const channelUrl =
    filmsCfg?.connectedYoutubeChannelUrl || siteConfig.social.youtube;

  const [platformFilter, setPlatformFilter] = useState<
    "all" | SocialPlatformId
  >("all");
  const [activeShowreelId, setActiveShowreelId] = useState<string | null>(null);

  // Merge CMS weddingFilms with Admin-selected social media video posts (selectedForWeddingFilms)
  const filmsList = useMemo(() => {
    const connectedPlatformSet = new Set(
      (connectedSocialAccounts || [])
        .filter((a) => a.connected !== false)
        .map((a) => a.platform)
    );
    const socialList = socialMediaPosts || [];
    const baseList =
      filmsCfg?.weddingFilms && filmsCfg.weddingFilms.length > 0
        ? filmsCfg.weddingFilms
        : defaultWeddingFilms;

    const merged: {
      id: string | number;
      title: string;
      youtubeId: string;
      location: string;
      duration: string;
      description?: string;
      channelHandle: string;
      sourcePlatform: SocialPlatformId;
      likesCount?: number;
      commentsCount?: number;
      viewsCount?: string;
      publishedAt?: string;
      permalink: string;
    }[] = [];

    const seenYtIds = new Set<string>();

    for (const f of baseList) {
      const ytId = extractYoutubeId(f.youtubeId);
      if (!ytId || seenYtIds.has(ytId)) continue;
      seenYtIds.add(ytId);

      const matchedPost = socialList.find(
        (sp) =>
          (f.sourceSocialPostId && sp.id === f.sourceSocialPostId) ||
          sp.youtubeId === ytId
      );

      merged.push({
        id: f.id || ytId,
        title: f.title,
        youtubeId: ytId,
        location: f.location || matchedPost?.location || "Burewala",
        duration: f.duration || matchedPost?.duration || "2:15",
        description: f.description || matchedPost?.caption,
        channelHandle:
          f.channelHandle || matchedPost?.accountHandle || channelHandle,
        sourcePlatform: f.sourcePlatform || matchedPost?.platform || "youtube",
        likesCount: f.likesCount ?? matchedPost?.likesCount,
        commentsCount: f.commentsCount ?? matchedPost?.commentsCount,
        viewsCount: f.viewsCount || matchedPost?.viewsCount,
        publishedAt: f.publishedAt || matchedPost?.postedAt,
        permalink:
          f.permalink ||
          matchedPost?.permalink ||
          `https://www.youtube.com/watch?v=${ytId}`,
      });
    }

    for (const post of socialList) {
      if (!post.selectedForWeddingFilms) continue;
      if (connectedPlatformSet.size > 0 && !connectedPlatformSet.has(post.platform)) {
        continue;
      }
      const isVid = post.mediaType === "video" || Boolean(post.youtubeId);
      if (!isVid) continue;
      const ytId = post.youtubeId || extractYoutubeId(post.permalink);
      if (!ytId || seenYtIds.has(ytId)) continue;
      seenYtIds.add(ytId);

      merged.push({
        id: post.id,
        title: post.title,
        youtubeId: ytId,
        location: post.location || "Burewala",
        duration: post.duration || "1:30",
        description: post.caption,
        channelHandle: post.accountHandle || channelHandle,
        sourcePlatform: post.platform,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        viewsCount: post.viewsCount,
        publishedAt: post.postedAt,
        permalink: post.permalink || `https://www.youtube.com/watch?v=${ytId}`,
      });
    }

    return merged;
  }, [filmsCfg, socialMediaPosts, connectedSocialAccounts, channelHandle]);

  const filteredFilms = useMemo(() => {
    if (platformFilter === "all") return filmsList;
    return filmsList.filter((f) => f.sourcePlatform === platformFilter);
  }, [filmsList, platformFilter]);

  const currentFeaturedId = activeShowreelId || defaultFeaturedYoutubeId;
  const currentFeaturedFilm = filmsList.find(
    (f) => f.youtubeId === currentFeaturedId
  );

  const renderPlatformBadge = (platform: SocialPlatformId) => {
    if (platform === "youtube")
      return <Youtube size={13} className="text-red-500" />;
    if (platform === "instagram")
      return <Instagram size={13} className="text-pink-500" />;
    if (platform === "facebook")
      return <Facebook size={13} className="text-blue-500" />;
    return <Share2 size={13} className="text-accent" />;
  };

  return (
    <>
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Wedding Films", url: "/wedding-films" },
        ]}
      />

      {/* Featured Showreel & Connected YouTube Channel Showcase */}
      <section className="section-padding bg-primary text-secondary">
        <div className="mx-auto max-w-7xl">
          <AnimatedSection>
            <div className="mb-8 flex flex-col justify-between gap-4 border-b border-secondary/15 pb-6 md:flex-row md:items-end">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-accent">
                  <Sparkles size={13} />
                  {activeShowreelId
                    ? "Now Playing Selected Film"
                    : filmsCfg?.featuredLabel || "Featured Showreel"}
                </span>
                <h2 className="mt-2 font-display text-3xl text-secondary md:text-4xl">
                  {currentFeaturedFilm?.title || featuredFilmTitle}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-secondary/75">
                  {currentFeaturedFilm?.description || featuredDescription}
                </p>
              </div>
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 self-start rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent hover:text-primary md:self-auto"
              >
                <Youtube size={16} className="text-red-500" />
                <span>Connected YouTube: {channelHandle}</span>
                <ExternalLink size={13} />
              </a>
            </div>

            <div className="overflow-hidden rounded-[12px] border border-secondary/15 bg-black shadow-premium-lg">
              <div className="relative aspect-video w-full">
                <iframe
                  key={currentFeaturedId}
                  src={`https://www.youtube.com/embed/${currentFeaturedId}?rel=0`}
                  title={currentFeaturedFilm?.title || featuredFilmTitle}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                  loading="lazy"
                />
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Linked YouTube & Connected Social Wedding Films Grid */}
      <section className="section-padding bg-surface">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col justify-between gap-4 border-b border-border pb-6 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                Curated Film Archive &amp; Connected Social Feeds
              </p>
              <h2 className="mt-1 font-display text-3xl text-primary">
                Signature Wedding Highlights ({filteredFilms.length})
              </h2>
            </div>

            {/* Platform Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: "all", label: `All Films (${filmsList.length})` },
                  { id: "youtube", label: "YouTube 4K" },
                  { id: "instagram", label: "Instagram Reels" },
                  { id: "facebook", label: "Facebook Films" },
                  { id: "tiktok", label: "TikTok Reels" },
                ] as const
              ).map((tab) => {
                const count =
                  tab.id === "all"
                    ? filmsList.length
                    : filmsList.filter((f) => f.sourcePlatform === tab.id).length;
                if (tab.id !== "all" && count === 0) return null;
                const active = platformFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPlatformFilter(tab.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                      active
                        ? "bg-primary text-secondary shadow-2xs"
                        : "border border-border bg-background text-text-muted hover:border-accent hover:text-primary"
                    }`}
                  >
                    {tab.id !== "all" && renderPlatformBadge(tab.id)}
                    <span>{tab.label}</span>
                    {tab.id !== "all" && (
                      <span className="text-[10px] opacity-75">({count})</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {filteredFilms.map((film, i) => {
              const ytId = extractYoutubeId(film.youtubeId);
              return (
                <AnimatedSection key={film.id || i} delay={i * 0.06}>
                  <div className="flex h-full flex-col justify-between overflow-hidden rounded-[12px] border border-border bg-background shadow-premium transition-all hover:border-accent/50">
                    <div>
                      <div className="relative aspect-video bg-black">
                        <iframe
                          src={`https://www.youtube.com/embed/${ytId}?rel=0`}
                          title={film.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 h-full w-full"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-5">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-0.5 text-[11px] font-medium text-primary">
                            {renderPlatformBadge(film.sourcePlatform)}
                            <span>{film.channelHandle}</span>
                          </span>
                          <div className="flex items-center gap-3 text-xs text-text-muted">
                            {film.location && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin size={12} className="text-accent" />
                                {film.location}
                              </span>
                            )}
                            {film.duration && (
                              <span className="inline-flex items-center gap-1 font-mono">
                                <Clock size={12} className="text-accent" />
                                {film.duration}
                              </span>
                            )}
                          </div>
                        </div>

                        <h3 className="font-display text-xl text-primary">
                          {film.title}
                        </h3>
                        {film.description && (
                          <p className="mt-1.5 text-xs leading-relaxed text-text-muted line-clamp-2">
                            {film.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-surface/50 px-5 py-3">
                      <div className="flex items-center gap-3 text-xs text-text-muted">
                        {film.likesCount ? (
                          <span className="inline-flex items-center gap-1">
                            <Heart size={12} className="text-accent" />
                            <span>{film.likesCount.toLocaleString()}</span>
                          </span>
                        ) : null}
                        {film.commentsCount ? (
                          <span className="inline-flex items-center gap-1">
                            <MessageCircle size={12} className="text-accent" />
                            <span>{film.commentsCount}</span>
                          </span>
                        ) : null}
                        {film.viewsCount ? (
                          <span className="inline-flex items-center gap-1">
                            <Eye size={12} className="text-accent" />
                            <span>{film.viewsCount} views</span>
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveShowreelId(ytId);
                            if (typeof window !== "undefined") {
                              window.scrollTo({ top: 220, behavior: "smooth" });
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-primary cursor-pointer"
                        >
                          <Play size={11} className="fill-current" />
                          <span>Play in Theater</span>
                        </button>
                        <a
                          href={film.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-text-muted transition-colors hover:border-accent hover:text-accent"
                        >
                          {renderPlatformBadge(film.sourcePlatform)}
                          <span>Open</span>
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

