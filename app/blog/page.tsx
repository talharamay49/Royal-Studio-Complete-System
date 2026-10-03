import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";
import PublicBlogGrid from "@/components/shared/PublicBlogGrid";
import { pageKeywords } from "@/lib/data";
import { getCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Royal Studio blog — wedding planning tips, photography guides, bridal advice, and behind-the-scenes stories from Pakistan's luxury wedding photographers.",
  keywords: [pageKeywords.blog.primary, ...pageKeywords.blog.secondary],
  alternates: getCanonical("/blog"),
  openGraph: {
    title: "Royal Studio Journal",
    description: "Wedding planning tips, photography guides, bridal advice, and behind-the-scenes stories.",
    images: [{ url: "/portfolio/walima-03-venue-aerial.jpg", width: 1280, height: 720, alt: "Royal Studio wedding venue" }],
  },
  twitter: {
    images: ["/portfolio/walima-03-venue-aerial.jpg"],
  },
};

export default function BlogPage() {
  return (
    <main>
      <PageHeader
        title="Journal"
        description="Wedding planning, photography tips, bridal guides, and behind-the-scenes stories."
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
        ]}
      />

      <section className="section-padding bg-surface">
        <PublicBlogGrid />
      </section>
    </main>
  );
}
