import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";
import AnimatedSection from "@/components/shared/AnimatedSection";
import InquiryForm from "@/components/forms/InquiryForm";
import ContactInfoBlock from "@/components/contact/ContactInfoBlock";
import SectionErrorBoundary from "@/components/shared/SectionErrorBoundary";
import { pageKeywords, siteConfig } from "@/lib/data";
import {
  getCanonical,
  getReviewsSchema,
  getWeddingEventsSchema,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contact & Event Booking",
  description:
    "Contact Royal Studio for luxury wedding photography in Burewala, Lahore, and across Pakistan. Call 0308-4877073 or complete our streamlined event booking workflow.",
  keywords: [pageKeywords.contact.primary, ...pageKeywords.contact.secondary],
  alternates: getCanonical("/contact"),
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: "en_PK",
    title: "Contact Royal Studio — Event & Wedding Booking",
    description:
      "Check availability for your wedding date and reserve your luxury photography & filmmaking package with Royal Studio in Burewala, Lahore, and across Pakistan.",
    url: `${siteConfig.url}/contact`,
    images: [
      {
        url: "/portfolio/walima-01-couple-portrait.jpg",
        width: 1200,
        height: 800,
        alt: "Contact Royal Studio — Luxury Wedding Photography & Filmmaking",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Royal Studio — Event & Wedding Booking",
    description:
      "Check availability for your wedding date and reserve your luxury photography & filmmaking package with Royal Studio.",
    images: ["/portfolio/walima-01-couple-portrait.jpg"],
  },
};

export default function ContactPage() {
  const contactSchemas = [
    ...getWeddingEventsSchema(),
    ...getReviewsSchema().slice(0, 4),
  ];

  return (
    <main className="w-full max-w-full overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchemas) }}
      />
      <PageHeader
        title="Contact & Event Booking"
        description="Check availability for your celebration date and customize your Royal Studio coverage."
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Contact", url: "/contact" },
        ]}
      />

      <section className="@container/contact w-full max-w-full overflow-x-hidden bg-surface px-4 py-14 sm:px-6 sm:py-20 md:px-12 md:py-28 lg:px-20 lg:py-32">
        <div className="mx-auto w-full max-w-7xl 2xl:max-w-[1600px]">
          <div className="flex flex-col @5xl/contact:flex-row lg:flex-row items-stretch lg:items-start gap-10 lg:gap-14 2xl:gap-20 w-full max-w-full min-w-0">
            <div className="w-full @5xl/contact:w-[42%] lg:w-[42%] lg:shrink-0 min-w-0 max-w-full">
              <SectionErrorBoundary sectionName="Studio Contact Details">
                <ContactInfoBlock />
              </SectionErrorBoundary>
            </div>

            <div className="w-full @5xl/contact:flex-1 lg:flex-1 min-w-0 max-w-full">
              <SectionErrorBoundary sectionName="Event Booking Form">
                <AnimatedSection delay={0.1} className="w-full max-w-full min-w-0">
                  <div className="w-full max-w-full overflow-hidden rounded-2xl border border-border bg-background p-4 sm:p-8 2xl:p-10 shadow-premium">
                    <InquiryForm />
                  </div>
                </AnimatedSection>
              </SectionErrorBoundary>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
