"use client";

import {
  Camera,
  Film,
  Sparkles,
  Shirt,
  Building2,
  Package,
  type LucideIcon,
} from "lucide-react";
import AnimatedSection from "@/components/shared/AnimatedSection";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { usePublicWebsiteCMS } from "@/components/shared/StudioProfileContext";

const iconMap: Record<string, LucideIcon> = {
  camera: Camera,
  film: Film,
  sparkles: Sparkles,
  shirt: Shirt,
  building: Building2,
  package: Package,
};

export default function PublicServicesList() {
  const { detailedServices } = usePublicWebsiteCMS();

  return (
    <div className="mx-auto max-w-7xl space-y-24">
      {detailedServices.map((service, i) => {
        const Icon = iconMap[service.icon] || Camera;
        return (
          <AnimatedSection key={service.id} delay={i * 0.05}>
            <div id={service.id} className="scroll-mt-28">
              <div className="mb-8 flex items-center gap-4">
                <div className="rounded-xl bg-accent/10 p-3 text-accent">
                  <Icon size={28} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-display text-3xl text-primary md:text-4xl">
                    {service.title}
                  </h2>
                  <p className="text-text-muted">{service.shortDescription}</p>
                </div>
              </div>

              <p className="mb-8 max-w-3xl text-text-muted leading-relaxed">
                {service.description}
              </p>

              <div className="grid gap-8 md:grid-cols-3">
                <div className="rounded-[12px] border border-border bg-background p-6">
                  <h3 className="mb-3 font-display text-lg text-primary">Deliverables</h3>
                  <ul className="space-y-2 text-sm text-text-muted">
                    {service.deliverables.map((d, idx) => (
                      <li key={`${service.id}-del-${idx}`}>· {d}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[12px] border border-border bg-background p-6">
                  <h3 className="mb-3 font-display text-lg text-primary">Process</h3>
                  <ul className="space-y-2 text-sm text-text-muted">
                    {service.process.map((p, idx) => (
                      <li key={`${service.id}-proc-${idx}`}>· {p}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[12px] border border-border bg-background p-6">
                  <h3 className="mb-3 font-display text-lg text-primary">Equipment</h3>
                  <ul className="space-y-2 text-sm text-text-muted">
                    {service.equipment.map((e, idx) => (
                      <li key={`${service.id}-eq-${idx}`}>· {e}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {service.faq && service.faq.length > 0 && (
                <div className="mt-8 max-w-2xl">
                  <Accordion type="single" collapsible>
                    {service.faq.map((item, j) => (
                      <AccordionItem key={j} value={`${service.id}-${j}`}>
                        <AccordionTrigger>{item.question}</AccordionTrigger>
                        <AccordionContent>{item.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}
            </div>
          </AnimatedSection>
        );
      })}
    </div>
  );
}
