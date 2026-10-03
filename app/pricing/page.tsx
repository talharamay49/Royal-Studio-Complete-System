import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import AnimatedSection from "@/components/shared/AnimatedSection";
import { Button } from "@/components/ui/button";
import { pageKeywords, pricingPackages } from "@/lib/data";
import { getCanonical, getOfferCatalogSchema } from "@/lib/seo";
import { cn } from "@/lib/utils";

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
          <div className="grid gap-8 lg:grid-cols-3">
            {pricingPackages.map((pkg, i) => (
              <AnimatedSection key={pkg.id} delay={i * 0.08}>
                <div
                  className={cn(
                    "flex h-full flex-col rounded-[12px] border p-8 shadow-premium transition-all",
                    pkg.highlighted
                      ? "border-accent bg-primary text-secondary shadow-premium-lg"
                      : "border-border bg-background"
                  )}
                >
                  {pkg.highlighted && (
                    <span className="mb-4 inline-block w-fit rounded-full bg-accent px-3 py-1 text-xs font-medium tracking-widest uppercase text-primary">
                      Most Popular
                    </span>
                  )}
                  <h2 className="font-display text-2xl">{pkg.name}</h2>
                  <p className="mt-1 text-sm opacity-70">{pkg.priceNote}</p>
                  <p className="mt-2 font-display text-3xl text-accent">{pkg.price}</p>
                  <p className="mt-4 text-sm leading-relaxed opacity-80">
                    {pkg.description}
                  </p>
                  <ul className="mt-6 flex-1 space-y-3">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check
                          size={16}
                          className={cn(
                            "mt-0.5 shrink-0",
                            pkg.highlighted ? "text-accent" : "text-accent"
                          )}
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    variant={pkg.highlighted ? "accent" : "outline"}
                    className="mt-8 w-full"
                  >
                    <Link href="/contact">Request Quote</Link>
                  </Button>
                </div>
              </AnimatedSection>
            ))}
          </div>

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
