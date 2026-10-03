import type { BlogPost, PricingPackage, Service } from "@/types";
import { siteConfig, weddingFilms } from "./data";

export function getLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    telephone: siteConfig.phones,
    email: siteConfig.email,
    foundingDate: String(siteConfig.established),
    founders: siteConfig.founders.map((name) => ({ "@type": "Person", name })),
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.address.line1,
      addressLocality: siteConfig.address.city,
      postalCode: siteConfig.address.postal,
      addressCountry: "PK",
    },
    sameAs: [
      siteConfig.social.instagram,
      siteConfig.social.facebook,
      siteConfig.social.youtube,
      siteConfig.social.tiktok,
    ],
    priceRange: "PKR 50000 - PKR 300000",
    areaServed: siteConfig.citiesServed,
    image: `${siteConfig.url}/logo.png`,
  };
}

export function getWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    publisher: { "@id": `${siteConfig.url}/#organization` },
  };
}

export function getBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteConfig.url}${item.url}`,
    })),
  };
}

/** Canonical URL helper — every page should pass its own path so each route
 * gets a distinct canonical instead of inheriting the root layout's. */
export function getCanonical(path: string) {
  return { canonical: `${siteConfig.url}${path}` };
}

/** One Service node per detailedServices entry, matched to the section's
 * existing id={service.id} anchor on /services. */
export function getServiceSchema(service: Service, anchor: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${siteConfig.url}/services#${anchor}`,
    name: service.title,
    serviceType: service.title,
    description: service.description,
    provider: { "@id": `${siteConfig.url}/#organization` },
    areaServed: siteConfig.citiesServed,
    url: `${siteConfig.url}/services#${anchor}`,
  };
}

function parsePkrPrice(priceStr: string): number {
  return Number(priceStr.replace(/[^\d]/g, ""));
}

/** OfferCatalog for /pricing — encodes the real "Starting from" / "Up to"
 * copy exactly as authored, with no invented numbers. */
export function getOfferCatalogSchema(packages: PricingPackage[]) {
  return {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    "@id": `${siteConfig.url}/pricing#offers`,
    name: "Royal Studio Wedding Photography Packages",
    itemListElement: packages.map((pkg) => ({
      "@type": "Offer",
      name: pkg.name,
      itemOffered: { "@type": "Service", name: pkg.name, description: pkg.description },
      priceCurrency: "PKR",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        priceCurrency: "PKR",
        ...(pkg.priceNote === "Up to"
          ? { maxPrice: parsePkrPrice(pkg.price) }
          : { minPrice: parsePkrPrice(pkg.price) }),
      },
    })),
  };
}

function parseMmSsToISO8601(duration: string): string {
  const [minStr, secStr] = duration.split(":");
  const minutes = Number(minStr);
  const seconds = Number(secStr);
  return minutes === 0 ? `PT${seconds}S` : `PT${minutes}M${seconds}S`;
}

/** VideoObject for a weddingFilms entry. uploadDate is intentionally
 * omitted — weddingFilms has no real publish-date field yet, and Google
 * requires uploadDate for rich-result eligibility. Do not fabricate one;
 * once a real publishedDate is sourced per film, add
 * uploadDate: film.publishedDate here. */
export function getVideoObjectSchema(film: (typeof weddingFilms)[number]) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: film.title,
    description: `${film.title} — a cinematic wedding film by Royal Studio, filmed in ${film.location}.`,
    thumbnailUrl: [`https://img.youtube.com/vi/${film.youtubeId}/hqdefault.jpg`],
    embedUrl: `https://www.youtube.com/embed/${film.youtubeId}`,
    duration: parseMmSsToISO8601(film.duration),
  };
}

/** BlogPosting for an individual /blog/[slug] entry. */
export function getBlogPostingSchema(post: BlogPost) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: [`${siteConfig.url}${post.image}`],
    datePublished: post.dateISO,
    dateModified: post.dateISO,
    author: { "@type": "Organization", "@id": `${siteConfig.url}/#organization`, name: siteConfig.name },
    publisher: {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      name: siteConfig.name,
      logo: { "@type": "ImageObject", url: `${siteConfig.url}/logo.png` },
    },
    mainEntityOfPage: `${siteConfig.url}/blog/${post.slug}`,
  };
}

// getAggregateRatingSchema() and getFAQSchema() are intentionally not built:
// Google marks self-hosted aggregateRating/review on the reviewed entity's
// own page ineligible for star rich results regardless of authenticity (the
// 4.9/74 rating already renders visibly in components/home/Testimonials.tsx,
// satisfying content-parity), and Google deprecated FAQ rich results
// site-wide in May 2026. faqItems/service.faq stay as visible content only.
