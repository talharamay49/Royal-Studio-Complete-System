"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { heroPoster, heroVideoId, siteConfig } from "@/lib/data";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-primary">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroPoster})` }}
      />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${heroVideoId}?autoplay=1&mute=1&loop=1&playlist=${heroVideoId}&controls=0&showinfo=0&modestbranding=1&playsinline=1&iv_load_policy=3&rel=0&disablekb=1`}
          title="Royal Studio wedding film"
          allow="autoplay; encrypted-media"
          className="h-full w-full"
        />
      </div>

      <div className="absolute inset-0 bg-primary/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-primary/30" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-5 text-xs font-medium tracking-[0.35em] uppercase text-accent">
            {siteConfig.name} · Since {siteConfig.established}
          </p>

          <h1 className="font-display text-4xl leading-[1.15] text-secondary md:text-6xl lg:text-7xl">
            Every Love Story Deserves to Be Remembered Beautifully
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-secondary/80 md:text-xl">
            Luxury Wedding Photography & Cinematic Films Across Pakistan.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild variant="accent" size="lg">
              <Link href="/contact">Check Availability</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-secondary/30 bg-transparent text-secondary hover:bg-secondary/10 hover:text-secondary"
            >
              <Link href="/portfolio">View Portfolio</Link>
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Floating stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 z-10 flex w-[calc(100%-3rem)] max-w-3xl -translate-x-1/2 flex-wrap justify-center gap-4 md:bottom-12 md:gap-6"
      >
        {[
          { value: siteConfig.stats.weddings, label: "Weddings" },
          { value: `Since ${siteConfig.established}`, label: "Established" },
          { value: siteConfig.stats.team, label: "Member Team" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass-dark rounded-xl px-5 py-3 text-center md:px-8 md:py-4"
          >
            <p className="font-display text-xl text-accent md:text-2xl">
              {stat.value}
            </p>
            <p className="text-[10px] tracking-widest uppercase text-secondary/70 md:text-xs">
              {stat.label}
            </p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
