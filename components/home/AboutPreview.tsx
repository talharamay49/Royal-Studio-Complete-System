"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { aboutHighlights, siteConfig, resolveAboutImageSrc } from "@/lib/data";
import { usePublicWebsiteCMS } from "@/components/shared/StudioProfileContext";
import { ROYAL_BLUR_DATA_URL } from "@/lib/blur-placeholder";
import SectionHeading from "@/components/shared/SectionHeading";
import AnimatedSection from "@/components/shared/AnimatedSection";
import { Button } from "@/components/ui/button";

export default function AboutPreview() {
  const { websiteCustomization } = usePublicWebsiteCMS();
  const vis = websiteCustomization?.sectionVisibility;
  const aboutCfg = websiteCustomization?.about;
  const [imgError, setImgError] = useState(false);

  if (vis && vis.showAboutPreview === false) {
    return null;
  }

  const label = aboutCfg?.homeLabel || "About Royal Studio";
  const title = aboutCfg?.homeTitle || "Timeless Visual Stories Since 2018";
  const description =
    aboutCfg?.homeDescription ||
    `Founded by ${siteConfig.founders.join(" & ")}, Royal Studio has documented more than 3000 weddings across Pakistan with creativity, professionalism, and cinematic excellence.`;
  const highlights =
    aboutCfg?.highlights && aboutCfg.highlights.length > 0
      ? aboutCfg.highlights
      : aboutHighlights;
  const mainImage = imgError
    ? "/team/co-founders.webp"
    : resolveAboutImageSrc(aboutCfg?.mainImage, "/team/co-founders.webp");
  const badgeValue = aboutCfg?.badgeValue || "3000+";
  const badgeLabel = aboutCfg?.badgeLabel || "Weddings Captured";
  const ctaLabel = aboutCfg?.homeCtaLabel || "Our Story";

  return (
    <section className="section-padding bg-surface">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <AnimatedSection>
            <SectionHeading
              align="left"
              label={label}
              title={title}
              description={description}
            />
            <ul className="mb-8 grid gap-3 sm:grid-cols-2">
              {highlights.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-text-muted">
                  <Check size={16} className="shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild variant="outline">
              <Link href="/about">{ctaLabel}</Link>
            </Button>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <div className="relative">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[12px] shadow-premium-lg">
                {mainImage.startsWith("data:") ||
                (/^https?:\/\//i.test(mainImage) &&
                  !mainImage.includes("picsum.photos") &&
                  !mainImage.includes("ytimg.com") &&
                  !mainImage.includes("youtube.com")) ? (
                  <img
                    src={mainImage}
                    alt="Royal Studio founders and team"
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <Image
                    src={mainImage}
                    alt="Royal Studio founders and team"
                    fill
                    placeholder="blur"
                    blurDataURL={ROYAL_BLUR_DATA_URL}
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="object-cover object-top"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                )}
              </div>
              <div className="absolute -bottom-4 -left-4 hidden rounded-[12px] border border-border bg-surface p-5 shadow-premium-lg md:block">
                <p className="font-display text-3xl text-accent">{badgeValue}</p>
                <p className="text-xs tracking-widest uppercase text-text-muted">
                  {badgeLabel}
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
