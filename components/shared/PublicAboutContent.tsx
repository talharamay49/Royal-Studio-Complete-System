"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Camera } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import SectionHeading from "@/components/shared/SectionHeading";
import AnimatedSection from "@/components/shared/AnimatedSection";
import { aboutHighlights, siteConfig, resolveAboutImageSrc } from "@/lib/data";
import { usePublicWebsiteCMS } from "@/components/shared/StudioProfileContext";
import { ROYAL_BLUR_DATA_URL } from "@/lib/blur-placeholder";

const defaultFounderPhotos: Record<string, string> = {
  "Muhammad Ramzan": "/team/muhammad-ramzan.webp",
  "Talha Ramay": "/team/talha-ramay.webp",
};

function resolveFounderFallback(name: string, index: number): string {
  if (defaultFounderPhotos[name]) return defaultFounderPhotos[name];
  if (name.toLowerCase().includes("talha")) return "/team/talha-ramay.webp";
  if (name.toLowerCase().includes("ramzan")) return "/team/muhammad-ramzan.webp";
  return index % 2 === 1 ? "/team/talha-ramay.webp" : "/team/muhammad-ramzan.webp";
}

export default function PublicAboutContent() {
  const { websiteCustomization } = usePublicWebsiteCMS();
  const aboutCfg = websiteCustomization?.about;

  const [mainImgError, setMainImgError] = useState(false);
  const [secondaryImgError, setSecondaryImgError] = useState(false);
  const [founderImgErrors, setFounderImgErrors] = useState<Record<number, boolean>>({});

  const pageTitle = aboutCfg?.pageTitle || "Our Story";
  const pageDescription =
    aboutCfg?.pageDescription ||
    "Luxury wedding photography and cinematic filmmaking — preserving emotions, traditions, and unforgettable memories since 2018.";
  const storyLabel = aboutCfg?.storyLabel || "Royal Studio";
  const storyHeading = aboutCfg?.storyHeading || "Crafting Timeless Visual Legacies";
  const storyParagraphs =
    aboutCfg?.storyParagraphs && aboutCfg.storyParagraphs.length > 0
      ? aboutCfg.storyParagraphs
      : [
          `Royal Studio is a luxury wedding photography and cinematic filmmaking company founded in ${siteConfig.established} by ${siteConfig.founders.join(" and ")}. Based in Burewala, Pakistan, we specialize in creating timeless visual stories that preserve emotions, traditions, and unforgettable memories.`,
          "Our experienced team of 10–15 professionals has documented more than 3000 weddings across Pakistan — from intimate Nikah ceremonies to grand multi-day celebrations spanning Mehndi, Barat, and Walima.",
          "We serve couples in Burewala, Vehari, Multan, Sahiwal, Faisalabad, Lahore, Bahawalnagar, Bahawalpur, Islamabad, and destination weddings across the country.",
        ];
  const highlights =
    aboutCfg?.highlights && aboutCfg.highlights.length > 0
      ? aboutCfg.highlights
      : aboutHighlights;

  const resolvedMainImage = mainImgError
    ? "/team/co-founders.webp"
    : resolveAboutImageSrc(aboutCfg?.mainImage, "/team/co-founders.webp");

  const resolvedSecondaryImage =
    secondaryImgError ||
    aboutCfg?.secondaryImage === "/portfolio/bridal-03-outdoor-tree.jpg"
      ? "/team/team.webp"
      : resolveAboutImageSrc(aboutCfg?.secondaryImage, "/team/team.webp");

  const foundersLabel = aboutCfg?.foundersLabel || "Founders";
  const foundersTitle = aboutCfg?.foundersTitle || "Meet the Visionaries";
  const foundersDescription =
    aboutCfg?.foundersDescription ||
    "The creative force behind 3000+ weddings and countless cinematic love stories.";
  const foundersList =
    aboutCfg?.founders && aboutCfg.founders.length > 0
      ? aboutCfg.founders
      : siteConfig.founders.map((name, idx) => ({
          name,
          role: idx === 0 ? "Co-Founder & Lead Photographer" : "Co-Founder & Creative Director",
          image: resolveFounderFallback(name, idx),
          bio:
            idx === 0
              ? "Master of editorial bridal portraiture, lighting direction, and timeless wedding compositions."
              : "Lead cinematographer and visual storyteller specializing in 4K wedding films and aerial direction.",
        }));

  const isRawUrl = (url: string) =>
    url.startsWith("data:") ||
    (/^https?:\/\//i.test(url) &&
      !url.includes("res.cloudinary.com") &&
      !url.includes("storage.googleapis.com") &&
      !url.includes("images.unsplash.com") &&
      !url.includes("picsum.photos") &&
      !url.includes("ytimg.com") &&
      !url.includes("youtube.com"));

  return (
    <>
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Our Story", url: "/about" },
        ]}
      />

      <section className="section-padding bg-surface">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-12 sm:gap-16 lg:grid-cols-2">
            <AnimatedSection>
              <SectionHeading
                align="left"
                label={storyLabel}
                title={storyHeading}
              />
              <div className="space-y-5 text-text-muted leading-relaxed">
                {storyParagraphs.map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {highlights.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-text-muted">
                    <Check size={16} className="shrink-0 text-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </AnimatedSection>

            <AnimatedSection delay={0.1}>
              <div className="relative pb-8 sm:pb-10 lg:pb-0">
                {/* Main Co-Founders Story Image */}
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border/60 bg-primary/10 shadow-premium-lg">
                  {isRawUrl(resolvedMainImage) ? (
                    <img
                      src={resolvedMainImage}
                      alt="Royal Studio co-founders Muhammad Ramzan and Talha Ramay"
                      referrerPolicy="no-referrer"
                      onError={() => setMainImgError(true)}
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <Image
                      src={resolvedMainImage}
                      alt="Royal Studio co-founders Muhammad Ramzan and Talha Ramay"
                      fill
                      priority
                      quality={92}
                      placeholder="blur"
                      blurDataURL={ROYAL_BLUR_DATA_URL}
                      referrerPolicy="no-referrer"
                      onError={() => setMainImgError(true)}
                      className="portfolio-hd-img object-cover object-top"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-4 sm:p-5 text-white">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-accent">
                      Established {siteConfig.established} · {siteConfig.address.city}
                    </p>
                    <p className="font-display text-lg sm:text-xl">
                      Muhammad Ramzan &amp; Talha Ramay — Co-Founders
                    </p>
                  </div>
                </div>

                {/* Secondary Team Image (Visible on both mobile and desktop) */}
                <div className="absolute -bottom-2 right-3 sm:-bottom-8 sm:-left-8 sm:right-auto aspect-[4/5] w-32 sm:w-44 md:w-52 overflow-hidden rounded-2xl border-4 border-surface bg-primary/10 shadow-premium-lg">
                  {isRawUrl(resolvedSecondaryImage) ? (
                    <img
                      src={resolvedSecondaryImage}
                      alt="Royal Studio production team at event"
                      referrerPolicy="no-referrer"
                      onError={() => setSecondaryImgError(true)}
                      className="h-full w-full object-cover object-center"
                    />
                  ) : (
                    <Image
                      src={resolvedSecondaryImage}
                      alt="Muhammad Ramzan and Talha Ramay at a Royal Studio branded event"
                      fill
                      quality={92}
                      placeholder="blur"
                      blurDataURL={ROYAL_BLUR_DATA_URL}
                      referrerPolicy="no-referrer"
                      onError={() => setSecondaryImgError(true)}
                      className="portfolio-hd-img object-cover object-center"
                      sizes="(max-width: 640px) 256px, 384px"
                    />
                  )}
                </div>
              </div>
            </AnimatedSection>
          </div>

          <AnimatedSection className="mt-20 sm:mt-28">
            <SectionHeading
              label={foundersLabel}
              title={foundersTitle}
              description={foundersDescription}
            />
            <div className="grid gap-8 md:grid-cols-2">
              {foundersList.map((founder, idx) => {
                const fallbackPhoto = resolveFounderFallback(founder.name, idx);
                const imgSrc = founderImgErrors[idx]
                  ? fallbackPhoto
                  : resolveAboutImageSrc(founder.image, fallbackPhoto);

                return (
                  <div
                    key={`${founder.name}-${idx}`}
                    className="group flex flex-col items-center rounded-2xl border border-border bg-background p-6 sm:p-8 text-center shadow-premium transition-all duration-300 hover:border-accent/50"
                  >
                    <div className="relative mx-auto mb-5 h-36 w-36 sm:h-44 sm:w-44 overflow-hidden rounded-full border-2 border-accent/40 bg-primary/10 shadow-premium-lg">
                      {isRawUrl(imgSrc) ? (
                        <img
                          src={imgSrc}
                          alt={founder.name}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFounderImgErrors((prev) => ({ ...prev, [idx]: true }))
                          }
                          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <Image
                          src={imgSrc}
                          alt={founder.name}
                          fill
                          quality={92}
                          placeholder="blur"
                          blurDataURL={ROYAL_BLUR_DATA_URL}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFounderImgErrors((prev) => ({ ...prev, [idx]: true }))
                          }
                          className="portfolio-hd-img object-cover object-top transition-transform duration-500 group-hover:scale-105"
                          sizes="384px"
                        />
                      )}
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium tracking-widest uppercase text-accent mb-1">
                      <Camera size={13} />
                      <span>{founder.role || "Co-Founder"}</span>
                    </div>
                    <h3 className="font-display text-2xl sm:text-3xl text-primary">
                      {founder.name}
                    </h3>
                    {founder.bio && (
                      <p className="mt-3 text-sm leading-relaxed text-text-muted max-w-md mx-auto">
                        {founder.bio}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
