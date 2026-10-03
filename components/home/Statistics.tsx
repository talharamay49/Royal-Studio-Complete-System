import { statistics } from "@/lib/data";
import AnimatedSection from "@/components/shared/AnimatedSection";

export default function Statistics() {
  return (
    <section className="border-y border-border bg-primary py-16 text-secondary md:py-20">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          {statistics.map((stat, i) => (
            <AnimatedSection key={stat.label} delay={i * 0.05}>
              <div className="text-center">
                <p className="font-display text-2xl text-accent md:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-[10px] tracking-widest uppercase text-secondary/60 md:text-xs">
                  {stat.label}
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
