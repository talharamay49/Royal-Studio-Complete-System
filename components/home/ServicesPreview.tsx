import Link from "next/link";
import {
  Camera,
  Film,
  Sparkles,
  Shirt,
  Building2,
  Plane,
  BookOpen,
  Video,
  type LucideIcon,
} from "lucide-react";
import { homeServices } from "@/lib/data";
import SectionHeading from "@/components/shared/SectionHeading";
import AnimatedSection from "@/components/shared/AnimatedSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const iconMap: Record<string, LucideIcon> = {
  camera: Camera,
  film: Film,
  sparkles: Sparkles,
  shirt: Shirt,
  building: Building2,
  plane: Plane,
  book: BookOpen,
  video: Video,
};

export default function ServicesPreview() {
  return (
    <section className="section-padding bg-background">
      <div className="mx-auto max-w-7xl">
        <AnimatedSection>
          <SectionHeading
            label="Our Services"
            title="Crafted for Every Celebration"
            description="From sacred Nikah ceremonies to cinematic wedding films, we deliver luxury coverage tailored to your vision."
          />
        </AnimatedSection>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {homeServices.map((service, i) => {
            const Icon = iconMap[service.icon];
            return (
              <AnimatedSection key={service.id} delay={i * 0.05}>
                <Card className="group h-full border-border/80 transition-all duration-500 hover:border-accent/40 hover:shadow-premium-lg">
                  <CardContent className="p-6">
                    <div className="mb-4 inline-flex rounded-xl bg-accent/10 p-3 text-accent transition-colors group-hover:bg-accent/15">
                      <Icon size={22} strokeWidth={1.5} />
                    </div>
                    <h3 className="mb-2 font-display text-xl text-primary">
                      {service.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-text-muted">
                      {service.description}
                    </p>
                  </CardContent>
                </Card>
              </AnimatedSection>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Button asChild variant="outline">
            <Link href="/services">View All Services</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
