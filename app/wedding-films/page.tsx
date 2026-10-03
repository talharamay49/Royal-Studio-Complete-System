import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";
import AnimatedSection from "@/components/shared/AnimatedSection";
import { heroVideoId, pageKeywords, weddingFilms } from "@/lib/data";
import { getCanonical, getVideoObjectSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Wedding Films",
  description:
    "Cinematic wedding films by Royal Studio — luxury filmmaking across Pakistan. Feature-length and highlight films with drone coverage.",
  keywords: [pageKeywords.weddingFilms.primary, ...pageKeywords.weddingFilms.secondary],
  alternates: getCanonical("/wedding-films"),
  openGraph: {
    title: "Royal Studio Wedding Films",
    description: "Cinematic storytelling that preserves the music, vows, and emotions of your celebration.",
    images: [{ url: `https://img.youtube.com/vi/${heroVideoId}/maxresdefault.jpg`, width: 1920, height: 1080, alt: "Royal Studio cinematic wedding film" }],
  },
  twitter: {
    images: [`https://img.youtube.com/vi/${heroVideoId}/maxresdefault.jpg`],
  },
};

export default function WeddingFilmsPage() {
  const schema = weddingFilms.map((film) => getVideoObjectSchema(film));

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <PageHeader
        title="Wedding Films"
        description="Cinematic storytelling that preserves the music, vows, and emotions of your celebration."
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Wedding Films", url: "/wedding-films" },
        ]}
      />

      <section className="section-padding bg-surface">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-2">
            {weddingFilms.map((film, i) => (
              <AnimatedSection key={film.id} delay={i * 0.08}>
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
    </main>
  );
}
