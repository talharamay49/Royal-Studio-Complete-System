import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import AnimatedSection from "@/components/shared/AnimatedSection";
import PublicPricingGrid from "@/components/shared/PublicPricingGrid";
import { Button } from "@/components/ui/button";
import { pageKeywords, pricingPackages } from "@/lib/data";
import { getCanonical, getOfferCatalogSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Royal Studio wedding photography packages — Essential from PKR 50,000, Premium, and Royal Signature up to PKR 300,000. Request a custom quote.",
  keywords: [pageKeywords.pricing.primary, ...pageKeywords.pricing.secondary],
  alternates: getCanonical("/pricing"),
  openGraph: {
    title: "Royal Studio Pricing",
    description: "Luxury wedding photography packages — Essential from PKR 50,000, Premium, and Royal Signature up to PKR 300,000.",
    images: [{ url: "/portfolio/indoor-01-floral-ceiling-decor.jpg", width: 1280, height: 720, alt: "Royal Studio luxury event decor" }],
  },
  twitter: {
    images: ["/portfolio/indoor-01-floral-ceiling-decor.jpg"],
  },
};

export default function PricingPage() {
  const schema = getOfferCatalogSchema(pricingPackages);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <PageHeader
        title="Pricing"
        description="Luxury packages designed for every celebration. Custom quotes available for multi-day and destination weddings."
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Pricing", url: "/pricing" },
        ]}
      />

      <section className="section-padding bg-surface">
        <div className="mx-auto max-w-7xl">
          <PublicPricingGrid />

          <AnimatedSection className="mt-16 text-center">
            <p className="text-text-muted">
              Need a custom package for destination weddings or multi-day events?
            </p>
            <Button asChild variant="accent" className="mt-4">
              <Link href="/contact">Request Custom Quote</Link>
            </Button>
          </AnimatedSection>
        </div>
      </section>
    </main>
  );
}
