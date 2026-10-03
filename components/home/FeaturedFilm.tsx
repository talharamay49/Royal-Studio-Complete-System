import { featuredFilm } from "@/lib/data";
import SectionHeading from "@/components/shared/SectionHeading";
import AnimatedSection from "@/components/shared/AnimatedSection";

export default function FeaturedFilm() {
  return (
    <section className="section-padding bg-primary text-secondary">
      <div className="mx-auto max-w-7xl">
        <AnimatedSection>
          <SectionHeading
            dark
            label="Featured Film"
            title="Cinematic Wedding Stories"
            description={featuredFilm.description}
          />
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <div className="overflow-hidden rounded-[12px] shadow-premium-lg">
            <div className="relative aspect-video w-full">
              <iframe
                src={`https://www.youtube.com/embed/${featuredFilm.youtubeId}?rel=0`}
                title={featuredFilm.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
                loading="lazy"
              />
            </div>
          </div>
          <p className="mt-4 text-center font-display text-xl text-accent">
            {featuredFilm.title}
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
