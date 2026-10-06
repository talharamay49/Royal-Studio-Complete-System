import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";
import PortfolioGrid from "@/components/portfolio/PortfolioGrid";
import SectionErrorBoundary from "@/components/shared/SectionErrorBoundary";
import { pageKeywords, portfolioItems as defaultPortfolioItems, siteConfig } from "@/lib/data";
import {
  getPortfolioPageSchema,
  injectSocialImageMetadata,
} from "@/lib/seo";
import { dbInstance } from "@/lib/admin/db";

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string; city?: string }>;
}): Promise<Metadata> {
  const resolvedParams = searchParams ? await searchParams : {};
  const activeCategory = resolvedParams?.category;
  const activeCity = resolvedParams?.city;

  const db = await dbInstance.ensureHydrated();
  const liveItems =
    db.cms?.portfolioItems && db.cms.portfolioItems.length > 0
      ? db.cms.portfolioItems
      : defaultPortfolioItems;
  const studioName = db.profile?.publicStudioName || db.profile?.studioName || siteConfig.name;
  const primaryCity = db.profile?.city || siteConfig.address.city;

  // Build dynamic keywords from live portfolio categories, locations, and SEO keywords
  const dynamicCategories = Array.from(
    new Set(liveItems.map((item) => item.category).filter(Boolean))
  );
  const dynamicLocations = Array.from(
    new Set(liveItems.map((item) => item.location).filter(Boolean))
  );

  const dynamicKeywords = Array.from(
    new Set([
      pageKeywords.portfolio.primary,
      ...pageKeywords.portfolio.secondary,
      ...dynamicCategories.map((cat) => `${cat} photography ${primaryCity}`),
      ...dynamicCategories.map((cat) => `luxury ${cat} photographer Pakistan`),
      ...dynamicLocations.map((loc) => `wedding photographer ${loc}`),
      ...(activeCategory ? [`${activeCategory} portfolio ${studioName}`] : []),
      ...(activeCity ? [`${activeCity} wedding photography portfolio`] : []),
    ])
  );

  const canonicalPath = activeCategory
    ? `/portfolio?category=${encodeURIComponent(activeCategory)}`
    : "/portfolio";

  const titlePrefix = activeCategory
    ? `${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Photography Portfolio`
    : "Luxury Wedding & Editorial Portfolio";

  const descriptionText = `Explore ${studioName}'s curated wedding photography and filmmaking portfolio (${liveItems.length}+ works) — Nikah, Mehndi, Barat, Walima, bridal portraits, fashion, and corporate photography across ${dynamicLocations.slice(0, 4).join(", ") || "Pakistan"}.`;

  const matchedItem = activeCategory
    ? liveItems.find((item) => item.category === activeCategory)
    : liveItems[0];

  const socialMeta = injectSocialImageMetadata({
    title: `${titlePrefix} — ${studioName}`,
    description: descriptionText,
    path: canonicalPath,
    imageUrl: matchedItem?.image || "/portfolio/bridal-03-outdoor-tree.jpg",
    category: activeCategory || "portfolio",
    location: activeCity || primaryCity,
    width: 1280,
    height: 1600,
  });

  return {
    title: `${titlePrefix} | ${studioName}`,
    description: descriptionText,
    keywords: dynamicKeywords,
    ...socialMeta,
  };
}

export default async function PortfolioPage() {
  const db = await dbInstance.ensureHydrated();
  const liveItems =
    db.cms?.portfolioItems && db.cms.portfolioItems.length > 0
      ? db.cms.portfolioItems
      : defaultPortfolioItems;
  const schema = getPortfolioPageSchema(liveItems);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <PageHeader
        title="Portfolio"
        description="A curated collection of weddings, celebrations, and editorial work from across Pakistan."
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Portfolio", url: "/portfolio" },
        ]}
      />
      <SectionErrorBoundary sectionName="Portfolio Gallery">
        <PortfolioGrid showHeading={false} showViewAll={false} />
      </SectionErrorBoundary>
    </main>
  );
}
