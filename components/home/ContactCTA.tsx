"use client";

import Link from "next/link";
import { Phone } from "lucide-react";
import { siteConfig } from "@/lib/data";
import { usePublicStudioProfile, usePublicWebsiteCMS } from "@/components/shared/StudioProfileContext";
import SectionHeading from "@/components/shared/SectionHeading";
import AnimatedSection from "@/components/shared/AnimatedSection";
import WhatsAppButton from "@/components/shared/WhatsAppButton";
import { Button } from "@/components/ui/button";

export default function ContactCTA() {
  const profile = usePublicStudioProfile();
  const { websiteCustomization } = usePublicWebsiteCMS();
  const vis = websiteCustomization?.sectionVisibility;
  const secCfg = websiteCustomization?.sections;

  if (vis && vis.showContactCta === false) {
    return null;
  }

  const primaryPhone = profile?.publicContactNumber || profile?.phone || siteConfig.phones[0];
  const label = secCfg?.ctaLabel || "Get in Touch";
  const title = secCfg?.ctaTitle || "Let's Capture Your Love Story";
  const description =
    secCfg?.ctaDescription ||
    `Check availability for your wedding date. We serve ${profile?.city || "Burewala"}, Lahore, Multan, and weddings across Pakistan.`;
  const primaryButtonText = secCfg?.ctaPrimaryButtonText || "Send Inquiry";

  return (
    <section className="section-padding bg-surface">
      <div className="mx-auto max-w-4xl text-center">
        <AnimatedSection>
          <SectionHeading
            label={label}
            title={title}
            description={description}
          />
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild variant="accent" size="lg">
              <Link href="/contact">{primaryButtonText}</Link>
            </Button>
            <WhatsAppButton />
            <Button asChild variant="outline" size="lg">
              <a href={`tel:${primaryPhone.replace(/[^0-9+]/g, "")}`}>
                <Phone size={16} />
                <span>Call {primaryPhone}</span>
              </a>
            </Button>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
