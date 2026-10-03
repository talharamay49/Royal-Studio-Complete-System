import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";
import PublicServicesList from "@/components/shared/PublicServicesList";
import { detailedServices, pageKeywords } from "@/lib/data";
import { getCanonical, getServiceSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Royal Studio services — wedding photography, cinematic films, bridal editorials, fashion campaigns, corporate events, and product photography in Pakistan.",
  keywords: [pageKeywords.services.primary, ...pageKeywords.services.secondary],
  alternates: getCanonical("/services"),
  openGraph: {
    title: "Royal Studio Services",
    description: "Comprehensive luxury photography and filmmaking for weddings, brands, and events.",
    images: [{ url: "/portfolio/walima-04-grand-venue.jpg", width: 1280, height: 720, alt: "Royal Studio wedding venue coverage" }],
  },
  twitter: {
    images: ["/portfolio/walima-04-grand-venue.jpg"],
  },
};

export default function ServicesPage() {
  const schema = detailedServices.map((service) => getServiceSchema(service, service.id));

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <PageHeader
        title="Services"
        description="Comprehensive luxury photography and filmmaking for weddings, brands, and events."
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Services", url: "/services" },
        ]}
      />

      <section className="section-padding bg-surface">
        <PublicServicesList />
      </section>
    </main>
  );
}
