"use client";

import { statistics as defaultStats } from "@/lib/data";
import { usePublicWebsiteCMS } from "@/components/shared/StudioProfileContext";
import AnimatedSection from "@/components/shared/AnimatedSection";

export default function Statistics() {
  const { websiteCustomization } = usePublicWebsiteCMS();
  const vis = websiteCustomization?.sectionVisibility;
  const secCfg = websiteCustomization?.sections;

  if (vis && vis.showStatistics === false) {
    return null;
  }

  const statsList =
    secCfg?.statistics && secCfg.statistics.length > 0
      ? secCfg.statistics
      : defaultStats;

  return (
    <section className="border-y border-border bg-primary py-16 text-secondary md:py-20">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          {statsList.map((stat, i) => (
            <AnimatedSection key={`${stat.label}-${i}`} delay={i * 0.05}>
              <div className="text-center">
                <p className="font-display text-2xl text-accent md:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-[10px] tracking-widest uppercase text-secondary/60 md:text-xs">
                  {stat.label}
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
