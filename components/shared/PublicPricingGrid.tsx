"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import AnimatedSection from "@/components/shared/AnimatedSection";
import { Button } from "@/components/ui/button";
import { usePublicWebsiteCMS } from "@/components/shared/StudioProfileContext";
import { cn } from "@/lib/utils";

export default function PublicPricingGrid() {
  const { pricingPackages } = usePublicWebsiteCMS();

  return (
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
              {pkg.features.map((feature, idx) => (
                <li key={`${pkg.id}-feat-${idx}`} className="flex items-start gap-2 text-sm">
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
  );
}
