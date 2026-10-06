import type { Metadata } from "next";
import PublicAboutContent from "@/components/shared/PublicAboutContent";
import { pageKeywords, siteConfig } from "@/lib/data";
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

export default function AboutPage() {
  return (
    <main>
      <PublicAboutContent />
    </main>
  );
}
