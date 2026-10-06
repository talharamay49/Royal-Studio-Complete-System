"use client";

import Link from "next/link";
import { Youtube, ExternalLink, Film } from "lucide-react";
import { featuredFilm, extractYoutubeId, siteConfig } from "@/lib/data";
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
  const youtubeId = extractYoutubeId(filmsCfg?.featuredYoutubeId || featuredFilm.youtubeId);
  const filmTitle = filmsCfg?.featuredFilmTitle || featuredFilm.title;
  const channelHandle = filmsCfg?.connectedYoutubeChannelHandle || "@royalstudio089";
  const channelUrl = filmsCfg?.connectedYoutubeChannelUrl || siteConfig.social.youtube;

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
          <div className="overflow-hidden rounded-[12px] border border-secondary/10 shadow-premium-lg">
            <div className="relative aspect-video w-full bg-black">
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
          <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="font-display text-xl text-accent">
              {filmTitle}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-secondary/20 bg-secondary/5 px-3.5 py-1.5 text-xs text-secondary/85 transition-colors hover:border-accent hover:text-accent"
              >
                <Youtube size={14} className="text-red-500" />
                <span>YouTube Channel ({channelHandle})</span>
                <ExternalLink size={12} />
              </a>
              <Link
                href="/wedding-films"
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-primary transition-opacity hover:opacity-90"
              >
                <Film size={13} />
                <span>Watch All Wedding Films</span>
              </Link>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
