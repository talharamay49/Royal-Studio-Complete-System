import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { aboutHighlights, siteConfig } from "@/lib/data";
import SectionHeading from "@/components/shared/SectionHeading";
import AnimatedSection from "@/components/shared/AnimatedSection";
import { Button } from "@/components/ui/button";

export default function AboutPreview() {
  return (
    <section className="section-padding bg-surface">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <AnimatedSection>
            <SectionHeading
              align="left"
              label="About Royal Studio"
              title="Timeless Visual Stories Since 2018"
              description={`Founded by ${siteConfig.founders.join(" & ")}, Royal Studio has documented more than 3000 weddings across Pakistan with creativity, professionalism, and cinematic excellence.`}
            />
            <ul className="mb-8 grid gap-3 sm:grid-cols-2">
              {aboutHighlights.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-text-muted">
                  <Check size={16} className="shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild variant="outline">
              <Link href="/about">Our Story</Link>
            </Button>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <div className="relative">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[12px] shadow-premium-lg">
                <Image
                  src="/team/co-founders.webp"
                  alt="Royal Studio founders and team"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 hidden rounded-[12px] border border-border bg-surface p-5 shadow-premium-lg md:block">
                <p className="font-display text-3xl text-accent">3000+</p>
                <p className="text-xs tracking-widest uppercase text-text-muted">
                  Weddings Captured
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
