"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Search,
  X,
  Camera,
  FileText,
  Sparkles,
  Tag,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePublicWebsiteCMS } from "@/components/shared/StudioProfileContext";
import { cn } from "@/lib/utils";

type SearchFilterTab = "all" | "portfolio" | "services" | "blog" | "packages";

interface SearchResultItem {
  id: string;
  type: "portfolio" | "services" | "blog" | "packages";
  title: string;
  subtitle: string;
  badge: string;
  href: string;
  image?: string;
}

export default function GlobalSearchModal({
  scrolled = false,
}: {
  scrolled?: boolean;
}) {
  const { portfolioItems, detailedServices, blogPosts, pricingPackages } =
    usePublicWebsiteCMS();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchFilterTab>("all");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Keyboard shortcut Cmd+K / Ctrl+K & Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const allResults = useMemo<SearchResultItem[]>(() => {
    const q = query.trim().toLowerCase();

    const portfolioResults: SearchResultItem[] = portfolioItems
      .filter((item) => {
        if (!q) return true;
        return (
          item.title.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.location || "").toLowerCase().includes(q) ||
          (item.exif?.camera || "").toLowerCase().includes(q)
        );
      })
      .map((item) => ({
        id: `port-${item.id}`,
        type: "portfolio",
        title: item.title,
        subtitle: `${item.category.toUpperCase()} · ${item.location || "Burewala"}`,
        badge: "Portfolio",
        href: `/portfolio?category=${encodeURIComponent(item.category)}`,
        image: item.image,
      }));

    const serviceResults: SearchResultItem[] = detailedServices
      .filter((srv) => {
        if (!q) return true;
        return (
          srv.title.toLowerCase().includes(q) ||
          srv.shortDescription.toLowerCase().includes(q) ||
          srv.description.toLowerCase().includes(q) ||
          (srv.deliverables || []).some((d) => d.toLowerCase().includes(q))
        );
      })
      .map((srv) => ({
        id: `srv-${srv.id}`,
        type: "services",
        title: srv.title,
        subtitle: srv.shortDescription,
        badge: "Service",
        href: `/services#${srv.id}`,
      }));

    const blogResults: SearchResultItem[] = blogPosts
      .filter((post) => {
        if (!q) return true;
        return (
          post.title.toLowerCase().includes(q) ||
          post.category.toLowerCase().includes(q) ||
          post.excerpt.toLowerCase().includes(q) ||
          post.content.toLowerCase().includes(q)
        );
      })
      .map((post) => ({
        id: `blog-${post.slug}`,
        type: "blog",
        title: post.title,
        subtitle: `${post.category} · ${post.date}`,
        badge: "Journal",
        href: `/blog/${post.slug}`,
        image: post.image,
      }));

    const packageResults: SearchResultItem[] = pricingPackages
      .filter((pkg) => {
        if (!q) return true;
        return (
          pkg.name.toLowerCase().includes(q) ||
          pkg.price.toLowerCase().includes(q) ||
          pkg.description.toLowerCase().includes(q) ||
          (pkg.features || []).some((f) => f.toLowerCase().includes(q))
        );
      })
      .map((pkg) => ({
        id: `pkg-${pkg.id}`,
        type: "packages",
        title: `${pkg.name} Package (${pkg.price})`,
        subtitle: pkg.description,
        badge: "Pricing",
        href: `/pricing#packages`,
      }));

    const combined = [
      ...serviceResults,
      ...portfolioResults,
      ...blogResults,
      ...packageResults,
    ];

    if (activeTab === "all") {
      return q ? combined.slice(0, 18) : combined.slice(0, 10);
    }
    return combined.filter((item) => item.type === activeTab).slice(0, 18);
  }, [query, activeTab, portfolioItems, detailedServices, blogPosts, pricingPackages]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Search portfolio, services, and journal"
        title="Search (Ctrl+K)"
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
          scrolled
            ? "border-border bg-surface/80 text-primary hover:border-accent hover:text-accent"
            : "border-white/25 bg-black/30 text-white hover:border-accent hover:text-accent"
        )}
      >
        <Search size={14} />
        <span className="hidden xl:inline">Search</span>
        <kbd className="hidden xl:inline-block rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono opacity-75">
          ⌘K
        </kbd>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-start justify-center bg-black/75 p-3 sm:p-6 pt-16 sm:pt-24 backdrop-blur-xs"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -12 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface text-text shadow-premium-lg"
            >
              {/* Search Input Bar */}
              <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
                <Search size={18} className="text-accent shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search portfolio (bridal, barat, walima), services, packages, or blog..."
                  className="w-full bg-transparent text-sm text-primary placeholder:text-text-muted focus:outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="rounded-lg p-1 text-text-muted hover:text-primary cursor-pointer"
                    aria-label="Clear search query"
                  >
                    <X size={15} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted hover:border-accent hover:text-accent cursor-pointer shrink-0"
                >
                  ESC
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border bg-background/60 px-4 py-2.5 no-scrollbar">
                {(
                  [
                    { id: "all", label: "All Results" },
                    { id: "portfolio", label: "Portfolio" },
                    { id: "services", label: "Services" },
                    { id: "blog", label: "Journal / Blog" },
                    { id: "packages", label: "Packages" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer",
                      activeTab === tab.id
                        ? "bg-accent text-[#111111]"
                        : "text-text-muted hover:text-primary"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Results List */}
              <div className="max-h-[60vh] overflow-y-auto divide-y divide-border/60 p-2">
                {allResults.length === 0 ? (
                  <div className="py-12 px-4 text-center space-y-2">
                    <p className="font-display text-xl text-primary">
                      No matching results for &ldquo;{query}&rdquo;
                    </p>
                    <p className="text-xs text-text-muted">
                      Try searching for Bridal, Barat, Walima, Drone, Burewala, or Royal Signature.
                    </p>
                  </div>
                ) : (
                  allResults.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="group flex items-center justify-between gap-3 rounded-xl p-3 transition-colors hover:bg-background"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.image ? (
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-background">
                            <img
                              src={item.image}
                              alt={item.title}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                            {item.type === "services" ? (
                              <Sparkles size={18} />
                            ) : item.type === "blog" ? (
                              <FileText size={18} />
                            ) : item.type === "packages" ? (
                              <Tag size={18} />
                            ) : (
                              <Camera size={18} />
                            )}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
                              {item.badge}
                            </span>
                            <h4 className="truncate text-sm font-semibold text-primary group-hover:text-accent transition-colors">
                              {item.title}
                            </h4>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-text-muted">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>
                      <ArrowRight
                        size={15}
                        className="shrink-0 text-text-muted group-hover:translate-x-0.5 group-hover:text-accent transition-all"
                      />
                    </Link>
                  ))
                )}
              </div>

              {/* Footer Quick Links */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background px-4 py-2.5 text-[11px] text-text-muted">
                <span className="flex items-center gap-1">
                  <MapPin size={12} className="text-accent" />
                  Royal Studio · Burewala, Lahore &amp; Nationwide
                </span>
                <div className="flex items-center gap-3">
                  <Link
                    href="/portfolio"
                    onClick={() => setIsOpen(false)}
                    className="hover:text-accent font-medium"
                  >
                    Full Portfolio →
                  </Link>
                  <Link
                    href="/contact#inquiry-form"
                    onClick={() => setIsOpen(false)}
                    className="text-accent font-semibold hover:underline"
                  >
                    Book Event →
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
