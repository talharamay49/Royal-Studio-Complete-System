"use client";

import Link from "next/link";
import { Phone } from "lucide-react";
import { siteConfig } from "@/lib/data";
import { usePublicStudioProfile } from "@/components/shared/StudioProfileContext";
import SectionHeading from "@/components/shared/SectionHeading";
import AnimatedSection from "@/components/shared/AnimatedSection";
import WhatsAppButton from "@/components/shared/WhatsAppButton";
import { Button } from "@/components/ui/button";

export default function ContactCTA() {
  const profile = usePublicStudioProfile();
  const primaryPhone = profile?.publicContactNumber || profile?.phone || siteConfig.phones[0];

  return (
    <section className="section-padding bg-surface">
      <div className="mx-auto max-w-4xl text-center">
        <AnimatedSection>
          <SectionHeading
            label="Get in Touch"
            title="Let's Capture Your Love Story"
            description={`Check availability for your wedding date. We serve ${profile?.city || "Burewala"}, Lahore, Multan, and weddings across Pakistan.`}
          />
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild variant="accent" size="lg">
              <Link href="/contact">Send Inquiry</Link>
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
