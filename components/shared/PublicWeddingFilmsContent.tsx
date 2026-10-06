"use client";

import { Youtube, ExternalLink, MapPin, Clock, Sparkles } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import AnimatedSection from "@/components/shared/AnimatedSection";
import {
  weddingFilms as defaultWeddingFilms,
  featuredFilm as defaultFeaturedFilm,
  extractYoutubeId,
  siteConfig,
} from "@/lib/data";
import { usePublicWebsiteCMS } from "@/components/shared/StudioProfileContext";

export default function PublicWeddingFilmsContent() {
  const { websiteCustomization } = usePublicWebsiteCMS();
  const filmsCfg = websiteCustomization?.films;

  const pageTitle = filmsCfg?.pageTitle || "Wedding Films";
  const pageDescription =
    filmsCfg?.pageDescription ||
    "Cinematic storytelling that preserves the music, vows, and emotions of your celebration.";
  const featuredYoutubeId = extractYoutubeId(
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

  const filmsList =
    filmsCfg?.weddingFilms && filmsCfg.weddingFilms.length > 0
      ? filmsCfg.weddingFilms
      : defaultWeddingFilms;

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
                  {filmsCfg?.featuredLabel || "Featured Showreel"}
                </span>
                <h2 className="mt-2 font-display text-3xl text-secondary md:text-4xl">
                  {featuredFilmTitle}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-secondary/75">
                  {featuredDescription}
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
                  src={`https://www.youtube.com/embed/${featuredYoutubeId}?rel=0`}
                  title={featuredFilmTitle}
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

      {/* Linked YouTube Wedding Films Grid */}
      <section className="section-padding bg-surface">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                Curated Film Archive
              </p>
              <h2 className="mt-1 font-display text-3xl text-primary">
                Signature Wedding Highlights
              </h2>
            </div>
            <p className="text-xs text-text-muted">
              Showing {filmsList.length} linked films from {channelHandle}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {filmsList.map((film, i) => {
              const ytId = extractYoutubeId(film.youtubeId);
              return (
                <AnimatedSection key={film.id || i} delay={i * 0.08}>
                  <div className="overflow-hidden rounded-[12px] border border-border bg-background shadow-premium transition-all hover:border-accent/50">
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
                    <div className="flex items-start justify-between gap-4 p-5">
                      <div>
                        <h3 className="font-display text-xl text-primary">
                          {film.title}
                        </h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                          {film.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={12} className="text-accent" />
                              {film.location}
                            </span>
                          )}
                          {film.duration && (
                            <span className="inline-flex items-center gap-1">
                              <Clock size={12} className="text-accent" />
                              {film.duration}
                            </span>
                          )}
                        </div>
                      </div>
                      <a
                        href={`https://www.youtube.com/watch?v=${ytId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-accent hover:text-accent"
                      >
                        <Youtube size={13} className="text-red-500" />
                        <span>Watch</span>
                        <ExternalLink size={11} />
                      </a>
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
