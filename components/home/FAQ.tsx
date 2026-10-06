"use client";

import { faqItems as defaultFaqItems } from "@/lib/data";
import { usePublicWebsiteCMS } from "@/components/shared/StudioProfileContext";
import SectionHeading from "@/components/shared/SectionHeading";
import AnimatedSection from "@/components/shared/AnimatedSection";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQ() {
  const { websiteCustomization } = usePublicWebsiteCMS();
  const vis = websiteCustomization?.sectionVisibility;
  const secCfg = websiteCustomization?.sections;

  if (vis && vis.showFaq === false) {
    return null;
  }

  const label = secCfg?.faqLabel || "FAQ";
  const title = secCfg?.faqTitle || "Frequently Asked Questions";
  const description =
    secCfg?.faqDescription ||
    "Everything you need to know about booking Royal Studio for your wedding.";
  const items =
    secCfg?.faqItems && secCfg.faqItems.length > 0
      ? secCfg.faqItems
      : defaultFaqItems;

  return (
    <section className="section-padding bg-background">
      <div className="mx-auto max-w-3xl">
        <AnimatedSection>
          <SectionHeading
            label={label}
            title={title}
            description={description}
          />
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <Accordion type="single" collapsible className="w-full">
            {items.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent>{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </AnimatedSection>
      </div>
    </section>
  );
}
