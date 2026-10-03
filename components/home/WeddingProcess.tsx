import { weddingProcess } from "@/lib/data";
import SectionHeading from "@/components/shared/SectionHeading";
import AnimatedSection from "@/components/shared/AnimatedSection";

export default function WeddingProcess() {
  return (
    <section className="section-padding bg-background">
      <div className="mx-auto max-w-7xl">
        <AnimatedSection>
          <SectionHeading
            label="Our Process"
            title="Your Journey With Royal Studio"
            description="From first inquiry to final delivery — a seamless, luxury experience at every step."
          />
        </AnimatedSection>

        <div className="relative">
          <div className="absolute top-0 bottom-0 left-6 hidden w-px bg-border md:left-1/2 md:block" />
          <div className="space-y-8">
            {weddingProcess.map((step, i) => (
              <AnimatedSection key={step.step} delay={i * 0.05}>
                <div
                  className={`flex flex-col gap-4 md:flex-row md:items-center ${
                    i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  <div className="flex-1 md:text-right">
                    <div
                      className={`rounded-[12px] border border-border bg-surface p-6 shadow-premium ${
                        i % 2 === 0 ? "md:mr-8" : "md:ml-8 md:text-left"
                      }`}
                    >
                      <span className="text-xs font-medium tracking-widest uppercase text-accent">
                        Step {step.step}
                      </span>
                      <h3 className="mt-1 font-display text-2xl text-primary">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm text-text-muted">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-surface font-display text-lg text-accent md:mx-0">
                    {step.step}
                  </div>
                  <div className="hidden flex-1 md:block" />
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
