import type { Metadata } from "next";
import Image from "next/image";
import { Check } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import SectionHeading from "@/components/shared/SectionHeading";
import AnimatedSection from "@/components/shared/AnimatedSection";
import { aboutHighlights, pageKeywords, siteConfig } from "@/lib/data";
import { getCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About Us",
  description: `Learn about Royal Studio — luxury wedding photography in Burewala, Pakistan. Founded in ${siteConfig.established} by ${siteConfig.founders.join(" & ")}. 3000+ weddings documented.`,
  keywords: [pageKeywords.about.primary, ...pageKeywords.about.secondary],
  alternates: getCanonical("/about"),
  openGraph: {
    title: "About Royal Studio",
    description: `Founded in ${siteConfig.established} by ${siteConfig.founders.join(" & ")} — the team behind 3000+ Pakistani weddings.`,
    images: [{ url: "/team/co-founders.webp", width: 1080, height: 1350, alt: "Royal Studio co-founders" }],
  },
  twitter: {
    images: ["/team/co-founders.webp"],
  },
};

const founderPhotos: Record<string, string> = {
  "Muhammad Ramzan": "/team/muhammad-ramzan.webp",
  "Talha Ramay": "/team/talha-ramay.webp",
};

export default function AboutPage() {
  return (
    <main>
      <PageHeader
        title="Our Story"
        description="Luxury wedding photography and cinematic filmmaking — preserving emotions, traditions, and unforgettable memories since 2018."
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
                label="Royal Studio"
                title="Crafting Timeless Visual Legacies"
              />
              <div className="space-y-5 text-text-muted leading-relaxed">
                <p>
                  Royal Studio is a luxury wedding photography and cinematic filmmaking
                  company founded in {siteConfig.established} by{" "}
                  {siteConfig.founders.join(" and ")}. Based in Burewala, Pakistan,
                  we specialize in creating timeless visual stories that preserve
                  emotions, traditions, and unforgettable memories.
                </p>
                <p>
                  Our experienced team of 10–15 professionals has documented more than
                  3000 weddings across Pakistan — from intimate Nikah ceremonies to
                  grand multi-day celebrations spanning Mehndi, Barat, and Walima.
                </p>
                <p>
                  We serve couples in Burewala, Vehari, Multan, Sahiwal, Faisalabad,
                  Lahore, Bahawalnagar, Bahawalpur, Islamabad, and destination weddings
                  across the country.
                </p>
              </div>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {aboutHighlights.map((item) => (
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
                  <Image
                    src="/team/co-founders.webp"
                    alt="Royal Studio co-founders together"
                    fill
                    className="object-cover"
                    sizes="50vw"
                  />
                </div>
                <div className="absolute -bottom-8 -left-8 hidden aspect-[4/5] w-40 overflow-hidden rounded-[12px] border-4 border-surface shadow-premium-lg sm:block md:w-48">
                  <Image
                    src="/team/team.webp"
                    alt="Muhammad Ramzan and Talha Ramay at a Royal Studio branded event"
                    fill
                    className="object-cover"
                    sizes="192px"
                  />
                </div>
              </div>
            </AnimatedSection>
          </div>

          <AnimatedSection className="mt-24 sm:mt-16">
            <SectionHeading
              label="Founders"
              title="Meet the Visionaries"
              description="The creative force behind 3000+ weddings and countless cinematic love stories."
            />
            <div className="grid gap-8 md:grid-cols-2">
              {siteConfig.founders.map((founder) => (
                <div
                  key={founder}
                  className="rounded-[12px] border border-border bg-background p-8 text-center shadow-premium"
                >
                  <div className="relative mx-auto mb-4 h-20 w-20 overflow-hidden rounded-full shadow-premium">
                    <Image
                      src={founderPhotos[founder]}
                      alt={founder}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <h3 className="font-display text-2xl text-primary">{founder}</h3>
                  <p className="mt-1 text-sm text-accent">Co-Founder</p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>
    </main>
  );
}
