"use client";

import Link from "next/link";
import {
  Camera,
  Film,
  Sparkles,
  Shirt,
  Building2,
  Package,
  ArrowRight,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import AnimatedSection from "@/components/shared/AnimatedSection";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PublicServicesListSkeleton } from "@/components/shared/SkeletonScreens";
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
  const { detailedServices, isLoading } = usePublicWebsiteCMS();

  if (isLoading) {
    return <PublicServicesListSkeleton count={3} />;
  }

  function handleSmoothJump(e: React.MouseEvent<HTMLAnchorElement>, targetId: string) {
    e.preventDefault();
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", `#${targetId}`);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-16">
      {/* Smooth-Scroll Quick Service Navigation Bar */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 rounded-2xl border border-border bg-background p-4 shadow-premium">
        <span className="mr-2 text-xs font-semibold tracking-widest uppercase text-accent">
          Jump to Service:
        </span>
        {detailedServices.map((service) => (
          <a
            key={`jump-${service.id}`}
            href={`#${service.id}`}
            onClick={(e) => handleSmoothJump(e, service.id)}
            className="rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-medium text-primary transition-all hover:border-accent hover:text-accent"
          >
            {service.title}
          </a>
        ))}
      </div>

      <div className="space-y-24">
        {detailedServices.map((service, i) => {
          const Icon = iconMap[service.icon] || Camera;
          return (
            <AnimatedSection key={service.id} delay={i * 0.05}>
              <div
                id={service.id}
                className="scroll-mt-28 rounded-2xl border border-border bg-background/50 p-6 sm:p-10 shadow-premium"
              >
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-accent/15 p-3.5 text-accent">
                      <Icon size={28} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="font-display text-3xl text-primary md:text-4xl">
                        {service.title}
                      </h2>
                      <p className="text-sm text-text-muted">{service.shortDescription}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <Button asChild variant="accent" size="sm">
                      <Link
                        href={`/contact?service=${encodeURIComponent(service.title)}#inquiry-form`}
                      >
                        <span>Book {service.title}</span>
                        <ArrowRight size={14} />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/pricing#packages">Compare Packages</Link>
                    </Button>
                  </div>
                </div>

                <p className="mb-8 max-w-3xl text-text-muted leading-relaxed">
                  {service.description}
                </p>

                <div className="grid gap-6 md:grid-cols-3">
                  <div className="rounded-[12px] border border-border bg-surface p-6">
                    <h3 className="mb-3 font-display text-lg text-primary flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-accent" />
                      <span>Deliverables</span>
                    </h3>
                    <ul className="space-y-2 text-sm text-text-muted">
                      {service.deliverables.map((d, idx) => (
                        <li key={`${service.id}-del-${idx}`}>· {d}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-[12px] border border-border bg-surface p-6">
                    <h3 className="mb-3 font-display text-lg text-primary">Our Process</h3>
                    <ul className="space-y-2 text-sm text-text-muted">
                      {service.process.map((p, idx) => (
                        <li key={`${service.id}-proc-${idx}`}>· {p}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-[12px] border border-border bg-surface p-6">
                    <h3 className="mb-3 font-display text-lg text-primary">Flagship Equipment</h3>
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
    </div>
  );
}
