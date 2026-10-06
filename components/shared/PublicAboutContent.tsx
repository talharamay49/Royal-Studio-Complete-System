"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import SectionHeading from "@/components/shared/SectionHeading";
import AnimatedSection from "@/components/shared/AnimatedSection";
import { aboutHighlights, siteConfig } from "@/lib/data";
import { usePublicWebsiteCMS } from "@/components/shared/StudioProfileContext";
import { ROYAL_BLUR_DATA_URL } from "@/lib/blur-placeholder";

const defaultFounderPhotos: Record<string, string> = {
  "Muhammad Ramzan": "/team/muhammad-ramzan.webp",
  "Talha Ramay": "/team/talha-ramay.webp",
};

export default function PublicAboutContent() {
  const { websiteCustomization } = usePublicWebsiteCMS();
  const aboutCfg = websiteCustomization?.about;

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
  const mainImage = aboutCfg?.mainImage || "/team/co-founders.webp";
  const secondaryImage = aboutCfg?.secondaryImage || "/team/team.webp";
  const foundersLabel = aboutCfg?.foundersLabel || "Founders";
  const foundersTitle = aboutCfg?.foundersTitle || "Meet the Visionaries";
  const foundersDescription =
    aboutCfg?.foundersDescription ||
    "The creative force behind 3000+ weddings and countless cinematic love stories.";
  const foundersList =
    aboutCfg?.founders && aboutCfg.founders.length > 0
      ? aboutCfg.founders
      : siteConfig.founders.map((name) => ({
          name,
          role: "Co-Founder",
          image: defaultFounderPhotos[name] || "/team/muhammad-ramzan.webp",
          bio: "",
        }));

  return (
    <>
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "About", url: "/about" },
        ]}
      />

      <section className="section-padding bg-surface">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-16 lg:grid-cols-2">
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
              <div className="relative">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[12px] shadow-premium-lg">
                  {mainImage.startsWith("data:") ? (
                    <img
                      src={mainImage}
                      alt="Royal Studio co-founders together"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Image
                      src={mainImage}
                      alt="Royal Studio co-founders together"
                      fill
                      placeholder="blur"
                      blurDataURL={ROYAL_BLUR_DATA_URL}
                      referrerPolicy="no-referrer"
                      className="object-cover"
                      sizes="50vw"
                    />
                  )}
                </div>
                <div className="absolute -bottom-8 -left-8 hidden aspect-[4/5] w-40 overflow-hidden rounded-[12px] border-4 border-surface shadow-premium-lg sm:block md:w-48">
                  {secondaryImage.startsWith("data:") ? (
                    <img
                      src={secondaryImage}
                      alt="Royal Studio team"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Image
                      src={secondaryImage}
                      alt="Muhammad Ramzan and Talha Ramay at a Royal Studio branded event"
                      fill
                      placeholder="blur"
                      blurDataURL={ROYAL_BLUR_DATA_URL}
                      referrerPolicy="no-referrer"
                      className="object-cover"
                      sizes="192px"
                    />
                  )}
                </div>
              </div>
            </AnimatedSection>
          </div>

          <AnimatedSection className="mt-24 sm:mt-16">
            <SectionHeading
              label={foundersLabel}
              title={foundersTitle}
              description={foundersDescription}
            />
            <div className="grid gap-8 md:grid-cols-2">
              {foundersList.map((founder, idx) => {
                const imgSrc =
                  founder.image ||
                  defaultFounderPhotos[founder.name] ||
                  "/team/muhammad-ramzan.webp";
                return (
                  <div
                    key={`${founder.name}-${idx}`}
                    className="rounded-[12px] border border-border bg-background p-8 text-center shadow-premium"
                  >
                    <div className="relative mx-auto mb-4 h-20 w-20 overflow-hidden rounded-full shadow-premium">
                      {imgSrc.startsWith("data:") ? (
                        <img
                          src={imgSrc}
                          alt={founder.name}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Image
                          src={imgSrc}
                          alt={founder.name}
                          fill
                          placeholder="blur"
                          blurDataURL={ROYAL_BLUR_DATA_URL}
                          referrerPolicy="no-referrer"
                          className="object-cover"
                          sizes="80px"
                        />
                      )}
                    </div>
                    <h3 className="font-display text-2xl text-primary">{founder.name}</h3>
                    <p className="mt-1 text-sm text-accent">{founder.role || "Co-Founder"}</p>
                    {founder.bio && (
                      <p className="mt-3 text-xs leading-relaxed text-text-muted max-w-md mx-auto">
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
