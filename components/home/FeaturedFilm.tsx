"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Youtube,
  Instagram,
  Facebook,
  Share2,
  ExternalLink,
  Film,
  Play,
  MapPin,
  Clock,
  Heart,
  Eye,
  Sparkles,
} from "lucide-react";
import {
  featuredFilm,
  weddingFilms as defaultWeddingFilms,
  extractYoutubeId,
  siteConfig,
} from "@/lib/data";
import { usePublicWebsiteCMS } from "@/components/shared/StudioProfileContext";
import SectionHeading from "@/components/shared/SectionHeading";
import AnimatedSection from "@/components/shared/AnimatedSection";
import type { SocialPlatformId } from "@/types";

export default function FeaturedFilm() {
  const { websiteCustomization, socialMediaPosts, connectedSocialAccounts } =
    usePublicWebsiteCMS();
  const vis = websiteCustomization?.sectionVisibility;
  const filmsCfg = websiteCustomization?.films;

  const defaultYoutubeId = extractYoutubeId(
    filmsCfg?.featuredYoutubeId || featuredFilm.youtubeId
  );
  const defaultFilmTitle = filmsCfg?.featuredFilmTitle || featuredFilm.title;
  const defaultDescription =
    filmsCfg?.featuredDescription || featuredFilm.description;
  const channelHandle =
    filmsCfg?.connectedYoutubeChannelHandle || "@royalstudio089";
  const channelUrl =
    filmsCfg?.connectedYoutubeChannelUrl || siteConfig.social.youtube;

  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  // Merge CMS Wedding Films with Admin-selected social media video posts (selectedForWeddingFilms)
  const curatedFilms = useMemo(() => {
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
      thumbnailUrl: string;
      permalink: string;
    }[] = [];

    const seenYtIds = new Set<string>();

    // 1. Add base CMS weddingFilms enriched with matched social post metadata
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
        thumbnailUrl:
          f.thumbnailUrl ||
          matchedPost?.image ||
          `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
        permalink:
          f.permalink ||
          matchedPost?.permalink ||
          `https://www.youtube.com/watch?v=${ytId}`,
      });
    }

    // 2. Add any additional social video posts where selectedForWeddingFilms === true
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
        thumbnailUrl:
          post.image || `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
        permalink: post.permalink || `https://www.youtube.com/watch?v=${ytId}`,
      });
    }

    return merged;
  }, [filmsCfg, socialMediaPosts, connectedSocialAccounts, channelHandle]);

  if (vis && vis.showFeaturedFilm === false) {
    return null;
  }

  const label = filmsCfg?.featuredLabel || "Featured Film & Wedding Cinema";
  const sectionTitle =
    filmsCfg?.featuredSectionTitle || "Cinematic Wedding Stories";

  const activeFilmItem = curatedFilms.find(
    (f) => f.youtubeId === (selectedVideoId || defaultYoutubeId)
  );
  const activeYoutubeId = selectedVideoId || defaultYoutubeId;
  const activeTitle = activeFilmItem?.title || defaultFilmTitle;
  const activeDesc = activeFilmItem?.description || defaultDescription;

  const renderPlatformIcon = (platform: SocialPlatformId) => {
    if (platform === "youtube") return <Youtube size={13} className="text-red-500" />;
    if (platform === "instagram") return <Instagram size={13} className="text-pink-400" />;
    if (platform === "facebook") return <Facebook size={13} className="text-blue-400" />;
    return <Share2 size={13} className="text-accent" />;
  };

  return (
    <section className="section-padding bg-primary text-secondary">
      <div className="mx-auto max-w-7xl">
        <AnimatedSection>
          <SectionHeading
            dark
            label={label}
            title={sectionTitle}
            description={defaultDescription}
          />
        </AnimatedSection>

        {/* Main 4K Showreel & Active Film Cinema Player */}
        <AnimatedSection delay={0.1}>
          <div className="overflow-hidden rounded-[12px] border border-secondary/15 bg-black shadow-premium-lg">
            <div className="relative aspect-video w-full bg-black">
              <iframe
                key={activeYoutubeId}
                src={`https://www.youtube.com/embed/${activeYoutubeId}?rel=0`}
                title={activeTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
                loading="lazy"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col justify-between gap-4 border-b border-secondary/10 pb-6 lg:flex-row lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-accent/15 px-2.5 py-0.5 text-[11px] font-semibold tracking-wider uppercase text-accent">
                  <Sparkles size={11} />
                  <span>
                    {activeYoutubeId === defaultYoutubeId
                      ? "Featured Showreel"
                      : "Now Playing"}
                  </span>
                </span>
                {activeFilmItem && (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-secondary/15 bg-secondary/5 px-2.5 py-0.5 text-[11px] text-secondary/80">
                    {renderPlatformIcon(activeFilmItem.sourcePlatform)}
                    <span>{activeFilmItem.channelHandle}</span>
                  </span>
                )}
                {activeFilmItem?.location && (
                  <span className="inline-flex items-center gap-1 text-xs text-secondary/70">
                    <MapPin size={12} className="text-accent" />
                    <span>{activeFilmItem.location}</span>
                  </span>
                )}
              </div>
              <p className="mt-2 font-display text-2xl text-accent">
                {activeTitle}
              </p>
              {activeDesc && (
                <p className="mt-1 max-w-3xl text-xs text-secondary/75 line-clamp-2">
                  {activeDesc}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-secondary/20 bg-secondary/5 px-3.5 py-2 text-xs text-secondary/85 transition-colors hover:border-accent hover:text-accent"
              >
                <Youtube size={14} className="text-red-500" />
                <span>YouTube ({channelHandle})</span>
                <ExternalLink size={12} />
              </a>
              <Link
                href="/wedding-films"
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-primary transition-opacity hover:opacity-90"
              >
                <Film size={13} />
                <span>Watch All {curatedFilms.length} Wedding Films</span>
              </Link>
            </div>
          </div>
        </AnimatedSection>

        {/* Synced & Selected Wedding Films Playlist Grid inside the Wedding Film Section */}
        {curatedFilms.length > 0 && (
          <AnimatedSection delay={0.18}>
            <div className="mt-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Film size={15} className="text-accent" />
                  <h3 className="font-display text-xl text-secondary">
                    Selected Wedding Films &amp; Connected Social Reels ({curatedFilms.length})
                  </h3>
                </div>
                <span className="text-xs text-secondary/60">
                  Click any film below to play in the 4K cinema player
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {curatedFilms.slice(0, 6).map((film) => {
                  const isCurrent = activeYoutubeId === film.youtubeId;
                  return (
                    <button
                      key={film.id}
                      type="button"
                      onClick={() => setSelectedVideoId(film.youtubeId)}
                      className={`group flex flex-col justify-between overflow-hidden rounded-xl border text-left transition-all cursor-pointer ${
                        isCurrent
                          ? "border-accent bg-secondary/10 ring-1 ring-accent"
                          : "border-secondary/15 bg-secondary/5 hover:border-accent/60 hover:bg-secondary/10"
                      }`}
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-black">
                        <img
                          src={`https://i.ytimg.com/vi/${film.youtubeId}/hqdefault.jpg`}
                          alt={film.title}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/35 transition-colors group-hover:bg-black/20">
                          <span
                            className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-transform group-hover:scale-110 ${
                              isCurrent
                                ? "bg-accent text-primary"
                                : "bg-black/80 text-accent ring-1 ring-accent/60"
                            }`}
                          >
                            <Play size={16} className="fill-current ml-0.5" />
                          </span>
                        </div>

                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded bg-black/80 px-2 py-0.5 text-[10px] font-medium text-secondary backdrop-blur-xs">
                            {renderPlatformIcon(film.sourcePlatform)}
                            <span>{film.channelHandle}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 rounded bg-black/80 px-2 py-0.5 text-[10px] font-mono text-accent">
                            <Clock size={10} />
                            <span>{film.duration}</span>
                          </span>
                        </div>

                        {isCurrent && (
                          <div className="absolute bottom-2 left-2.5">
                            <span className="rounded bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                              ● Playing Now
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-3.5">
                        <h4 className="font-display text-base text-secondary group-hover:text-accent transition-colors line-clamp-1">
                          {film.title}
                        </h4>
                        {film.description && (
                          <p className="mt-1 text-[11px] text-secondary/65 line-clamp-1">
                            {film.description}
                          </p>
                        )}
                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-secondary/10 pt-2 text-[11px] text-secondary/70">
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={11} className="text-accent" />
                            <span>{film.location}</span>
                          </span>
                          <div className="flex items-center gap-2.5">
                            {film.likesCount ? (
                              <span className="inline-flex items-center gap-1">
                                <Heart size={11} className="text-accent" />
                                <span>{film.likesCount.toLocaleString()}</span>
                              </span>
                            ) : null}
                            {film.viewsCount ? (
                              <span className="inline-flex items-center gap-1">
                                <Eye size={11} className="text-accent" />
                                <span>{film.viewsCount}</span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </AnimatedSection>
        )}
      </div>
    </section>
  );
}

