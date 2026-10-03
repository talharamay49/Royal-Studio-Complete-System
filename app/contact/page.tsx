import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";
import AnimatedSection from "@/components/shared/AnimatedSection";
import InquiryForm from "@/components/forms/InquiryForm";
import ContactInfoBlock from "@/components/contact/ContactInfoBlock";
import { pageKeywords } from "@/lib/data";
import { getCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Royal Studio for luxury wedding photography in Burewala, Pakistan. Call 0308-4877073 or send a wedding inquiry.",
  keywords: [pageKeywords.contact.primary, ...pageKeywords.contact.secondary],
  alternates: getCanonical("/contact"),
  openGraph: {
    title: "Contact Royal Studio",
    description: "Check availability for your wedding date and send us your inquiry.",
    images: [{ url: "/portfolio/couple-04-annum-ali-walima.jpg", width: 1280, height: 720, alt: "Royal Studio wedding couple" }],
  },
  twitter: {
    images: ["/portfolio/couple-04-annum-ali-walima.jpg"],
  },
};

export default function ContactPage() {
  return (
    <main>
      <PageHeader
        title="Contact Us"
        description="Check availability for your wedding date. We'd love to hear about your celebration."
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Contact", url: "/contact" },
        ]}
      />

      <section className="section-padding bg-surface">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-16 lg:grid-cols-2">
            <ContactInfoBlock />

            <AnimatedSection delay={0.1}>
              <div className="rounded-[12px] border border-border bg-background p-8 shadow-premium">
                <h3 className="mb-6 font-display text-2xl text-primary">
                  Wedding Inquiry Form
                </h3>
                <InquiryForm />
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>
    </main>
  );
}
