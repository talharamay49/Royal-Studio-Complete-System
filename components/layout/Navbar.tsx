"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowUp } from "lucide-react";
import { navLinks as defaultNavLinks } from "@/lib/data";
import { usePublicWebsiteCMS } from "@/components/shared/StudioProfileContext";
import Logo from "./Logo";
import GlobalSearchModal from "./GlobalSearchModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export default function Navbar() {
  const pathname = usePathname();
  const { websiteCustomization } = usePublicWebsiteCMS();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navCfg = websiteCustomization?.navigation;
  const activeNavLinks =
    navCfg?.navLinks && navCfg.navLinks.length > 0
      ? navCfg.navLinks.filter((l) => l.visible !== false)
      : defaultNavLinks;
  const headerCtaLabel = navCfg?.headerCtaLabel || "Check Availability";
  const headerCtaHref = navCfg?.headerCtaHref || "/contact#inquiry-form";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Smooth scroll on route change or hash anchor navigation
  useEffect(() => {
    if (typeof window === "undefined" || pathname?.startsWith("/admin")) return;

    const hash = window.location.hash?.replace("#", "");
    if (hash) {
      const timer = setTimeout(() => {
        const target = document.getElementById(hash);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 80);
      return () => clearTimeout(timer);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [pathname]);

  // Global smooth-scroll delegation for any in-page anchor links on the public website
  useEffect(() => {
    if (typeof document === "undefined" || pathname?.startsWith("/admin")) return;

    const handleAnchorClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.includes("#")) return;

      const [rawPath, hash] = href.split("#");
      if (!hash) return;

      const normalizedTargetPath = rawPath ? rawPath.split("?")[0] : pathname;
      if (!rawPath || normalizedTargetPath === pathname) {
        const el = document.getElementById(hash);
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          window.history.replaceState(null, "", href);
          setMobileOpen(false);
        }
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, [pathname]);

  const handleNavLinkClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      setMobileOpen(false);
      const [targetPath, hash] = href.split("#");
      if (targetPath === pathname) {
        if (hash) {
          const el = document.getElementById(hash);
          if (el) {
            e.preventDefault();
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        } else {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    },
    [pathname]
  );

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed top-0 right-0 left-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-surface/95 backdrop-blur-xl border-b border-border shadow-[0_8px_30px_rgba(0,0,0,0.12)] py-2.5"
            : "bg-gradient-to-b from-black/80 via-black/45 to-transparent py-4"
        )}
      >
        <nav className="mx-auto flex max-w-7xl 2xl:max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          {/* Left Zone: Brand Logo */}
          <div className="flex items-center shrink-0">
            <Logo />
          </div>

          {/* Center Zone: Crisp Single-Line Editorial Navigation */}
          <ul className="hidden xl:flex items-center justify-center gap-6 2xl:gap-8">
            {activeNavLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname === link.href || pathname?.startsWith(`${link.href}/`);
              return (
                <li key={link.href} className="shrink-0">
                  <Link
                    href={link.href}
                    onClick={(e) => handleNavLinkClick(e, link.href)}
                    className={cn(
                      "relative py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase whitespace-nowrap transition-colors duration-200",
                      isActive
                        ? "text-accent"
                        : scrolled
                        ? "text-primary/85 hover:text-accent"
                        : "text-white/90 hover:text-accent"
                    )}
                  >
                    {link.label}
                    {isActive && (
                      <motion.span
                        layoutId="navbar-active-indicator"
                        className="absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-accent"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Right Zone: Search, Theme, Client Portal & Primary Booking CTA */}
          <div className="flex items-center gap-2 shrink-0">
            <GlobalSearchModal scrolled={scrolled} />

            <ThemeToggle
              variant="icon"
              className={cn(
                "h-9 w-9 rounded-full shrink-0",
                scrolled
                  ? "border-border bg-surface/90 text-primary hover:border-accent hover:text-accent"
                  : "border-white/20 bg-black/40 text-white hover:border-accent hover:text-accent"
              )}
            />

            <Link
              href="/admin"
              className={cn(
                "hidden md:inline-flex h-9 items-center justify-center rounded-full border px-3.5 text-[11px] font-semibold tracking-[0.14em] uppercase whitespace-nowrap transition-all shrink-0",
                scrolled
                  ? "border-border bg-surface/90 text-primary hover:border-accent hover:text-accent"
                  : "border-white/25 bg-black/40 text-white hover:border-accent hover:text-accent"
              )}
              title="Client Portal & Studio Login"
            >
              <span>Client Portal</span>
            </Link>

            <Button
              asChild
              variant="accent"
              size="sm"
              className="hidden sm:inline-flex h-9 rounded-full px-4 text-[11px] font-bold tracking-[0.14em] uppercase whitespace-nowrap shrink-0 shadow-sm"
            >
              <Link
                href={headerCtaHref}
                onClick={(e) => handleNavLinkClick(e, headerCtaHref)}
              >
                {headerCtaLabel}
              </Link>
            </Button>

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className={cn(
                "relative z-50 inline-flex h-9 w-9 items-center justify-center rounded-full border xl:hidden transition-colors cursor-pointer shrink-0",
                scrolled || mobileOpen
                  ? "border-border bg-surface/90 text-primary hover:border-accent"
                  : "border-white/20 bg-black/40 text-white hover:border-accent"
              )}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center overflow-y-auto bg-surface/98 backdrop-blur-xl px-6 py-24 xl:hidden"
          >
            <ul className="flex flex-col items-center gap-5">
              {activeNavLinks.map((link, i) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    href={link.href}
                    onClick={(e) => handleNavLinkClick(e, link.href)}
                    className={cn(
                      "font-display text-2xl sm:text-3xl tracking-wide transition-colors hover:text-accent",
                      pathname === link.href ? "text-accent font-semibold" : "text-primary"
                    )}
                  >
                    {link.label}
                  </Link>
                </motion.li>
              ))}
              <motion.li
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: activeNavLinks.length * 0.04 }}
                className="flex flex-col items-center gap-3 pt-4 w-full max-w-xs border-t border-border mt-2"
              >
                <Button asChild variant="accent" className="w-full rounded-full">
                  <Link
                    href={headerCtaHref}
                    onClick={(e) => handleNavLinkClick(e, headerCtaHref)}
                  >
                    {headerCtaLabel}
                  </Link>
                </Button>
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex w-full items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-xs font-semibold tracking-widest uppercase text-primary hover:border-accent hover:text-accent transition-colors"
                >
                  Client &amp; Studio Portal
                </Link>
              </motion.li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smooth Back-to-Top Floating Button — Strictly Aligned Above Bottom-Left WhatsApp Button */}
      <AnimatePresence>
        {scrolled && (
          <motion.button
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 12 }}
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Smooth scroll to top"
            title="Scroll to top"
            className="no-print fixed bottom-20 left-5 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/95 text-primary shadow-premium backdrop-blur-md transition-all hover:border-accent hover:text-accent cursor-pointer"
          >
            <ArrowUp size={16} />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
