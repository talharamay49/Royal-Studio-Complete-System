"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { googleRating, testimonials } from "@/lib/data";
import SectionHeading from "@/components/shared/SectionHeading";
import AnimatedSection from "@/components/shared/AnimatedSection";

export default function Testimonials() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="section-padding bg-surface">
      <div className="mx-auto max-w-7xl">
        <AnimatedSection>
          <SectionHeading
            label="Testimonials"
            title="Loved by Couples Across Pakistan"
          />
          <div className="-mt-8 mb-12 flex items-center justify-center gap-2 md:-mt-12">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className="fill-accent text-accent"
                />
              ))}
            </div>
            <p className="text-sm text-text-muted">
              <span className="font-medium text-primary">{googleRating.score}</span>{" "}
              from {googleRating.reviewCount} Google reviews
            </p>
          </div>
        </AnimatedSection>

        <div className="relative mx-auto max-w-4xl">
          <Quote className="absolute -top-2 left-0 text-accent/20" size={56} strokeWidth={1} />

          <div className="min-h-[220px] px-4 text-center md:px-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.45 }}
              >
                <blockquote className="font-display text-xl leading-relaxed text-primary italic md:text-2xl">
                  &ldquo;{testimonials[current].quote}&rdquo;
                </blockquote>
                <div className="mt-8">
                  <p className="text-sm font-medium text-accent">
                    {testimonials[current].author}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {testimonials[current].event}
                    {testimonials[current].location && ` · ${testimonials[current].location}`}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-8 flex items-center justify-center gap-5">
            <button
              onClick={() =>
                setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length)
              }
              className="rounded-full border border-border p-2 text-text-muted transition-colors hover:border-accent hover:text-accent"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === current ? "w-6 bg-accent" : "w-1.5 bg-border"
                  }`}
                  aria-label={`Testimonial ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={() => setCurrent((c) => (c + 1) % testimonials.length)}
              className="rounded-full border border-border p-2 text-text-muted transition-colors hover:border-accent hover:text-accent"
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
