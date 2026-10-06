"use client";

import { featuredFilm } from "@/lib/data";
import { usePublicWebsiteCMS } from "@/components/shared/StudioProfileContext";
import SectionHeading from "@/components/shared/SectionHeading";
import AnimatedSection from "@/components/shared/AnimatedSection";

export default function FeaturedFilm() {
  const { websiteCustomization } = usePublicWebsiteCMS();
  const vis = websiteCustomization?.sectionVisibility;
  const filmsCfg = websiteCustomization?.films;

  if (vis && vis.showFeaturedFilm === false) {
    return null;
  }

  const label = filmsCfg?.featuredLabel || "Featured Film";
  const sectionTitle = filmsCfg?.featuredSectionTitle || "Cinematic Wedding Stories";
  const description = filmsCfg?.featuredDescription || featuredFilm.description;
  const youtubeId = filmsCfg?.featuredYoutubeId || featuredFilm.youtubeId;
  const filmTitle = filmsCfg?.featuredFilmTitle || featuredFilm.title;

  return (
    <section className="section-padding bg-primary text-secondary">
      <div className="mx-auto max-w-7xl">
        <AnimatedSection>
          <SectionHeading
            dark
            label={label}
            title={sectionTitle}
            description={description}
          />
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <div className="overflow-hidden rounded-[12px] shadow-premium-lg">
            <div className="relative aspect-video w-full">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
                title={filmTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
                loading="lazy"
              />
            </div>
          </div>
          <p className="mt-4 text-center font-display text-xl text-accent">
            {filmTitle}
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
