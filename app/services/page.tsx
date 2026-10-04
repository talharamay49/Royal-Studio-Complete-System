import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";
import PublicServicesList from "@/components/shared/PublicServicesList";
import SectionErrorBoundary from "@/components/shared/SectionErrorBoundary";
import { detailedServices, pageKeywords, siteConfig } from "@/lib/data";
import {
  getServicesPageGraphSchema,
  injectSocialImageMetadata,
} from "@/lib/seo";
import { dbInstance } from "@/lib/admin/db";

export async function generateMetadata(): Promise<Metadata> {
  const db = dbInstance.getData();
  const liveServices =
    db.cms?.detailedServices && db.cms.detailedServices.length > 0
      ? db.cms.detailedServices
      : detailedServices;
  const studioName = db.profile?.publicStudioName || db.profile?.studioName || siteConfig.name;
  const city = db.profile?.city || siteConfig.address.city;
  const descriptionText = `${studioName} services — luxury wedding photography, 4K cinematic films, bridal editorials, fashion campaigns, corporate events, and product photography in ${city} and across Pakistan.`;

  const dynamicServiceKeywords = Array.from(
    new Set([
      pageKeywords.services.primary,
      ...pageKeywords.services.secondary,
      ...liveServices.map((s) => `${s.title.toLowerCase()} ${city.toLowerCase()}`),
      ...liveServices.map((s) => `${s.title.toLowerCase()} Pakistan`),
    ])
  );

  const socialMeta = injectSocialImageMetadata({
    title: `${studioName} — Luxury Photography & Filmmaking Services`,
    description: descriptionText,
    path: "/services",
    category: "services",
    location: `${city}, Pakistan`,
  });

  return {
    title: `Luxury Photography & Filmmaking Services | ${studioName}`,
    description: descriptionText,
    keywords: dynamicServiceKeywords,
    ...socialMeta,
  };
}

export default function ServicesPage() {
  const db = dbInstance.getData();
  const liveServices =
    db.cms?.detailedServices && db.cms.detailedServices.length > 0
      ? db.cms.detailedServices
      : detailedServices;
  const schema = getServicesPageGraphSchema(liveServices);

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
        <SectionErrorBoundary sectionName="Photography & Filmmaking Services">
          <PublicServicesList />
        </SectionErrorBoundary>
      </section>
    </main>
  );
}
