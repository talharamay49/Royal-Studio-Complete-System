"use client";

import PageHeader from "@/components/layout/PageHeader";
import AnimatedSection from "@/components/shared/AnimatedSection";
import { weddingFilms as defaultWeddingFilms } from "@/lib/data";
import { usePublicWebsiteCMS } from "@/components/shared/StudioProfileContext";

export default function PublicWeddingFilmsContent() {
  const { websiteCustomization } = usePublicWebsiteCMS();
  const filmsCfg = websiteCustomization?.films;

  const pageTitle = filmsCfg?.pageTitle || "Wedding Films";
  const pageDescription =
    filmsCfg?.pageDescription ||
    "Cinematic storytelling that preserves the music, vows, and emotions of your celebration.";
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

      <section className="section-padding bg-surface">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-2">
            {filmsList.map((film, i) => (
              <AnimatedSection key={film.id || i} delay={i * 0.08}>
                <div className="overflow-hidden rounded-[12px] border border-border shadow-premium">
                  <div className="relative aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${film.youtubeId}?rel=0`}
                      title={film.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-5">
                    <h2 className="font-display text-xl text-primary">{film.title}</h2>
                    <p className="mt-1 text-sm text-text-muted">
                      {film.location} · {film.duration}
                    </p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
