"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbNavProps {
  items?: BreadcrumbItem[];
  variant?: "hero" | "surface";
  className?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  portfolio: "Portfolio",
  services: "Services",
  blog: "Journal & Blog",
  pricing: "Pricing & Packages",
  "wedding-films": "Wedding Films",
  about: "About Studio",
  contact: "Contact & Booking",
};

/**
 * Dynamic, semantic Breadcrumb Navigation component (<nav aria-label="Breadcrumb">)
 * with Schema.org BreadcrumbList microdata for SEO crawlability and zero hydration mismatch.
 */
export default function BreadcrumbNav({
  items,
  variant = "hero",
  className,
}: BreadcrumbNavProps) {
  const pathname = usePathname();

  const resolvedItems: BreadcrumbItem[] = React.useMemo(() => {
    if (items && items.length > 0) {
      return items;
    }
    const segments = (pathname || "/")
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean);

    const dynamicCrumbs: BreadcrumbItem[] = [{ name: "Home", url: "/" }];
    let accPath = "";
    segments.forEach((seg) => {
      accPath += `/${seg}`;
      const label =
        ROUTE_LABELS[seg] ||
        seg
          .replace(/-/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());
      dynamicCrumbs.push({ name: label, url: accPath });
    });
    return dynamicCrumbs;
  }, [items, pathname]);

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("w-full overflow-x-auto no-scrollbar", className)}
    >
      <ol
        itemScope
        itemType="https://schema.org/BreadcrumbList"
        className={cn(
          "flex flex-wrap items-center gap-1.5 text-xs tracking-widest uppercase",
          variant === "hero" ? "text-secondary/70" : "text-text-muted"
        )}
      >
        {resolvedItems.map((crumb, index) => {
          const isLast = index === resolvedItems.length - 1;
          return (
            <li
              key={`${crumb.url}-${index}`}
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
              className="inline-flex items-center gap-1.5"
            >
              {index > 0 && (
                <ChevronRight
                  size={13}
                  aria-hidden="true"
                  className={cn(
                    "shrink-0",
                    variant === "hero" ? "text-secondary/40" : "text-text-muted/60"
                  )}
                />
              )}
              {isLast ? (
                <span
                  itemProp="name"
                  aria-current="page"
                  className="font-semibold text-accent truncate max-w-[220px] sm:max-w-none"
                >
                  {crumb.name}
                </span>
              ) : (
                <Link
                  href={crumb.url}
                  itemProp="item"
                  className={cn(
                    "inline-flex items-center gap-1 transition-colors hover:text-accent",
                    variant === "hero" ? "text-secondary/75" : "text-text-muted"
                  )}
                >
                  {index === 0 && <Home size={12} className="text-accent shrink-0" />}
                  <span itemProp="name">{crumb.name}</span>
                </Link>
              )}
              <meta itemProp="position" content={String(index + 1)} />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
