import type { Metadata } from "next";
import PublicWeddingFilmsContent from "@/components/shared/PublicWeddingFilmsContent";
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
      <PublicWeddingFilmsContent />
    </main>
  );
}
