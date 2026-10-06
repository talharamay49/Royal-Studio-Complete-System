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
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed top-0 right-0 left-0 z-50 transition-all duration-500",
          scrolled
            ? "glass border-b border-border shadow-premium"
            : "bg-transparent"
        )}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-12">
          <Logo />

          <ul className="hidden items-center gap-7 lg:flex">
            {activeNavLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={(e) => handleNavLinkClick(e, link.href)}
                    className={cn(
                      "text-xs font-medium tracking-widest uppercase transition-colors duration-300",
                      isActive
                        ? "text-accent font-semibold"
                        : scrolled
                        ? "text-text hover:text-accent"
                        : "text-secondary/90 hover:text-accent"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2 sm:gap-3">
            <GlobalSearchModal scrolled={scrolled} />

            <ThemeToggle
              variant="icon"
              className={cn(
                "rounded-full",
                scrolled
                  ? "border-border bg-surface/80 text-primary hover:border-accent hover:text-accent"
                  : "border-white/25 bg-black/30 text-white hover:border-accent hover:text-accent"
              )}
            />

            <Button
              asChild
              variant="accent"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link
                href={headerCtaHref}
                onClick={(e) => handleNavLinkClick(e, headerCtaHref)}
              >
                {headerCtaLabel}
              </Link>
            </Button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={cn(
                "relative z-50 p-2 lg:hidden transition-colors cursor-pointer",
                scrolled || mobileOpen ? "text-primary" : "text-secondary"
              )}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
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
            className="fixed inset-0 z-40 flex flex-col items-center justify-center overflow-y-auto bg-surface px-6 py-20 lg:hidden"
          >
            <ul className="flex flex-col items-center gap-5 sm:gap-7">
              {activeNavLinks.map((link, i) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={link.href}
                    onClick={(e) => handleNavLinkClick(e, link.href)}
                    className={cn(
                      "font-display text-2xl sm:text-3xl transition-colors hover:text-accent",
                      pathname === link.href ? "text-accent" : "text-primary"
                    )}
                  >
                    {link.label}
                  </Link>
                </motion.li>
              ))}
              <motion.li
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: activeNavLinks.length * 0.05 }}
                className="flex flex-col items-center gap-3 pt-2"
              >
                <Button asChild variant="accent">
                  <Link
                    href={headerCtaHref}
                    onClick={(e) => handleNavLinkClick(e, headerCtaHref)}
                  >
                    {headerCtaLabel}
                  </Link>
                </Button>
                <ThemeToggle className="rounded-full px-4 py-2" />
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="text-xs font-medium tracking-widest uppercase text-text-muted hover:text-accent pt-2"
                >
                  Studio Admin Portal
                </Link>
              </motion.li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smooth Back-to-Top Floating Button */}
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
            className="fixed bottom-6 left-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface/90 text-primary shadow-premium backdrop-blur-md transition-all hover:border-accent hover:text-accent cursor-pointer"
          >
            <ArrowUp size={18} />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
