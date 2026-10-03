import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";
import PortfolioGrid from "@/components/portfolio/PortfolioGrid";
import { pageKeywords } from "@/lib/data";
import { getCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "Explore Royal Studio's luxury wedding photography portfolio — Nikah, Mehndi, Barat, Walima, bridal portraits, fashion, and corporate work across Pakistan.",
  keywords: [pageKeywords.portfolio.primary, ...pageKeywords.portfolio.secondary],
  alternates: getCanonical("/portfolio"),
  openGraph: {
    title: "Royal Studio Portfolio",
    description: "A curated collection of weddings, celebrations, and editorial work from across Pakistan.",
    images: [{ url: "/portfolio/bridal-03-outdoor-tree.jpg", width: 1280, height: 1600, alt: "Royal Studio bridal portrait" }],
  },
  twitter: {
    images: ["/portfolio/bridal-03-outdoor-tree.jpg"],
  },
};

export default function PortfolioPage() {
  return (
    <main>
      <PageHeader
        title="Portfolio"
        description="A curated collection of weddings, celebrations, and editorial work from across Pakistan."
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Portfolio", url: "/portfolio" },
        ]}
      />
      <PortfolioGrid showHeading={false} showViewAll={false} />
    </main>
  );
}
