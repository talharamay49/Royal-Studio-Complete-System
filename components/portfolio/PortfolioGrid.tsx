"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X } from "lucide-react";
import {
  portfolioCategories,
  portfolioItems,
} from "@/lib/data";
import type { PortfolioCategory } from "@/types";
import SectionHeading from "@/components/shared/SectionHeading";
import AnimatedSection from "@/components/shared/AnimatedSection";
import { Button } from "@/components/ui/button";

interface PortfolioGridProps {
  limit?: number;
  showHeading?: boolean;
  showViewAll?: boolean;
}

export default function PortfolioGrid({
  limit,
  showHeading = true,
  showViewAll = true,
}: PortfolioGridProps) {
  const [activeFilter, setActiveFilter] = useState<PortfolioCategory>("all");
  const [lightbox, setLightbox] = useState<
    (typeof portfolioItems)[0] | null
  >(null);
  const [visibleCount, setVisibleCount] = useState(limit ?? 9);

  const filtered =
    activeFilter === "all"
      ? portfolioItems
      : portfolioItems.filter((item) => item.category === activeFilter);

  const displayed = limit
    ? filtered.slice(0, limit)
    : filtered.slice(0, visibleCount);

  const hasMore = !limit && visibleCount < filtered.length;

  return (
    <section
      id={showHeading ? undefined : "portfolio"}
      className={showHeading ? "section-padding bg-surface" : ""}
    >
      <div className="mx-auto max-w-7xl">
        {showHeading ? (
          <AnimatedSection>
            <SectionHeading
              label="Portfolio"
              title="Stories We've Told"
              description="Nikah, Mehndi, Barat, Walima, and beyond — explore our curated wedding gallery."
            />
          </AnimatedSection>
        ) : (
          <h2 className="sr-only">Portfolio Gallery</h2>
        )}

        <AnimatedSection>
          <div className="mb-10 flex flex-wrap justify-center gap-2">
            {portfolioCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveFilter(cat.id);
                  setVisibleCount(limit ?? 9);
                }}
                className={`rounded-full px-4 py-2 text-xs font-medium tracking-widest uppercase transition-all duration-300 ${
                  activeFilter === cat.id
                    ? "bg-primary text-secondary"
                    : "border border-border bg-surface text-text-muted hover:border-accent hover:text-accent"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </AnimatedSection>

        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-border bg-background px-6 py-20 text-center">
            <Camera size={32} className="mb-4 text-accent/60" strokeWidth={1.5} />
            <h3 className="font-display text-2xl text-primary">
              {portfolioCategories.find((cat) => cat.id === activeFilter)?.label}{" "}
              Stories Are on the Way
            </h3>
            <p className="mt-2 max-w-md text-sm text-text-muted">
              We&apos;re adding new work to this category soon. In the meantime,
              browse our full portfolio or reach out to see recent{" "}
              {portfolioCategories.find((cat) => cat.id === activeFilter)?.label.toLowerCase()}{" "}
              coverage.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={() => setActiveFilter("all")}>
                View Full Portfolio
              </Button>
              <Button asChild variant="accent">
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        ) : (
        <div key={activeFilter} className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {displayed.map((item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: i * 0.03 }}
              onClick={() => setLightbox(item)}
              className="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-[12px]"
            >
              <div
                className={`relative overflow-hidden ${
                  item.aspect === "tall"
                    ? "aspect-[3/4]"
                    : item.aspect === "wide"
                      ? "aspect-[16/10]"
                      : "aspect-square"
                }`}
              >
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  loading="lazy"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary/60 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <h3 className="font-display text-xl text-secondary">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs tracking-widest uppercase text-accent">
                    {item.category}
                  </p>
                  {item.location && (
                    <p className="mt-1 text-xs text-secondary/70">
                      {item.location}
                    </p>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
        )}

        {hasMore && (
          <div className="mt-10 text-center">
            <Button
              variant="outline"
              onClick={() => setVisibleCount((c) => c + 6)}
            >
              Load More
            </Button>
          </div>
        )}

        {showViewAll && limit && (
          <div className="mt-12 text-center">
            <Button asChild variant="outline">
              <Link href="/portfolio">View Full Portfolio</Link>
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/95 p-4 backdrop-blur-sm"
            onClick={() => setLightbox(null)}
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-6 right-6 z-10 text-secondary hover:text-accent"
              aria-label="Close"
            >
              <X size={28} />
            </button>
            <motion.div
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.92 }}
              className="relative max-h-[85vh] w-full max-w-5xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[12px]">
                <Image
                  src={lightbox.image}
                  alt={lightbox.title}
                  fill
                  className="object-contain"
                  sizes="90vw"
                />
              </div>
              <div className="mt-4 text-center text-secondary">
                <h3 className="font-display text-2xl">{lightbox.title}</h3>
                <p className="mt-1 text-sm tracking-widest uppercase text-accent">
                  {lightbox.category}
                </p>
                {lightbox.exif && (
                  <p className="mt-2 text-xs text-secondary/60">
                    {lightbox.exif.camera} · {lightbox.exif.lens} ·{" "}
                    {lightbox.exif.aperture} · {lightbox.exif.shutter} · ISO{" "}
                    {lightbox.exif.iso}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
