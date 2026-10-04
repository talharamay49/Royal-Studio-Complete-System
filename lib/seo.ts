import type {
  BlogPost,
  PortfolioItem,
  PricingPackage,
  Service,
  Testimonial,
} from "@/types";
import {
  googleRating,
  pricingPackages as defaultPricingPackages,
  siteConfig,
  testimonials as defaultTestimonials,
  weddingFilms,
} from "./data";

export function getBaseUrl(): string {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl && envUrl.startsWith("http")) {
    return envUrl.replace(/\/$/, "");
  }
  return siteConfig.url;
}

/**
 * Generates Schema.org Review structured data from verified client testimonials.
 */
export function getReviewsSchema(reviews: Testimonial[] = defaultTestimonials) {
  const baseUrl = getBaseUrl();
  return reviews.map((t, index) => ({
    "@context": "https://schema.org",
    "@type": "Review",
    "@id": `${baseUrl}/#review-${index + 1}`,
    author: {
      "@type": "Person",
      name: t.author,
    },
    reviewBody: t.quote,
    name: `${t.author} — ${t.event}`,
    reviewRating: {
      "@type": "Rating",
      ratingValue: "5",
      bestRating: "5",
      worstRating: "1",
    },
    itemReviewed: {
      "@type": "LocalBusiness",
      "@id": `${baseUrl}/#organization`,
      name: siteConfig.name,
    },
  }));
}

/**
 * Generates Schema.org Event structured data for Royal Studio's wedding photography
 * & consultation booking events (Nikah, Mehndi, Barat & Walima coverage).
 */
export function getWeddingEventsSchema(packages: PricingPackage[] = defaultPricingPackages) {
  const baseUrl = getBaseUrl();
  const minPrice =
    packages.length > 0
      ? Number(packages[0].price.replace(/[^\d]/g, "")) || 50000
      : 50000;

  const events = [
    {
      id: "wedding-season-booking",
      name: `${siteConfig.name} Luxury Wedding Photography & Film Booking Season`,
      description:
        "Book multi-day Pakistani wedding photography, 4K drone aerials, and cinematic filmmaking for Nikah, Mehndi, Barat, and Walima celebrations across Burewala, Lahore, Multan, and Islamabad.",
      startDate: "2026-10-01T10:00:00+05:00",
      endDate: "2027-04-30T22:00:00+05:00",
      image: `${baseUrl}/portfolio/barat-01-royal-entry.jpg`,
    },
    {
      id: "bridal-consultation-showcase",
      name: `${siteConfig.name} Bridal & Couple Portrait Consultation Showcase`,
      description:
        "Private in-studio and online bridal & couple portrait consultation, album viewing, and bespoke wedding package planning at Royal Studio Burewala.",
      startDate: "2026-10-05T11:00:00+05:00",
      endDate: "2027-03-31T21:00:00+05:00",
      image: `${baseUrl}/portfolio/bridal-03-outdoor-tree.jpg`,
    },
  ];

  return events.map((ev) => ({
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${baseUrl}/contact#${ev.id}`,
    name: ev.name,
    description: ev.description,
    startDate: ev.startDate,
    endDate: ev.endDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode",
    image: [ev.image],
    location: {
      "@type": "Place",
      name: `${siteConfig.name} Flagship Studio`,
      address: {
        "@type": "PostalAddress",
        streetAddress: siteConfig.address.line1,
        addressLocality: siteConfig.address.city,
        postalCode: siteConfig.address.postal,
        addressCountry: "PK",
      },
    },
    organizer: {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      name: siteConfig.name,
      url: baseUrl,
    },
    performer: siteConfig.founders.map((founder) => ({
      "@type": "Person",
      name: founder,
    })),
    offers: {
      "@type": "Offer",
      url: `${baseUrl}/contact`,
      price: String(minPrice),
      priceCurrency: "PKR",
      availability: "https://schema.org/InStock",
      validFrom: "2026-01-01T00:00:00+05:00",
    },
  }));
}

export function getLocalBusinessSchema() {
  const baseUrl = getBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${baseUrl}/#organization`,
    name: siteConfig.name,
    description: siteConfig.description,
    url: baseUrl,
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
    image: `${baseUrl}/logo.png`,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: String(googleRating.score),
      reviewCount: String(googleRating.reviewCount),
      bestRating: "5",
      worstRating: "1",
    },
    review: getReviewsSchema(defaultTestimonials.slice(0, 6)),
  };
}

export function getWebsiteSchema() {
  const baseUrl = getBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: baseUrl,
    description: siteConfig.description,
    publisher: { "@id": `${baseUrl}/#organization` },
  };
}

export function getBreadcrumbSchema(items: { name: string; url: string }[]) {
  const baseUrl = getBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${baseUrl}${item.url}`,
    })),
  };
}

/** Canonical URL helper — every page should pass its own path so each route
 * gets a distinct canonical instead of inheriting the root layout's. */
export function getCanonical(path: string) {
  const baseUrl = getBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return { canonical: `${baseUrl}${normalizedPath}` };
}

/** Pre-cached high-resolution asset URLs for OpenGraph & Twitter cards across routes */
export const PRE_CACHED_SOCIAL_ASSETS: Record<string, string> = {
  default: "/portfolio/bridal-03-outdoor-tree.jpg",
  portfolio: "/portfolio/bridal-03-outdoor-tree.jpg",
  bridal: "/portfolio/bridal-01-crimson-lehenga.jpg",
  barat: "/portfolio/barat-01-royal-entry.jpg",
  walima: "/portfolio/walima-04-grand-venue.jpg",
  mehndi: "/portfolio/mehndi-01-vibrant-dance.jpg",
  couple: "/portfolio/couple-04-annum-ali-walima.jpg",
  services: "/portfolio/walima-04-grand-venue.jpg",
  pricing: "/portfolio/indoor-01-floral-ceiling-decor.jpg",
  contact: "/portfolio/couple-04-annum-ali-walima.jpg",
  blog: "/portfolio/bridal-03-outdoor-tree.jpg",
};

function escapeSvgXml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generates a base64-encoded SVG social card placeholder (`data:image/svg+xml;base64,...`)
 * with Royal Studio's Obsidian & Champagne Gold branding for dynamic routes.
 */
export function generateDynamicSocialCardBase64(options: {
  title: string;
  subtitle?: string;
  category?: string;
  location?: string;
}): string {
  const safeTitle = escapeSvgXml(options.title.slice(0, 68));
  const safeSubtitle = escapeSvgXml(
    (options.subtitle || siteConfig.tagline || "We Capture Your Memories").slice(0, 90)
  );
  const safeCategory = escapeSvgXml((options.category || "ROYAL STUDIO").toUpperCase());
  const safeLocation = escapeSvgXml(options.location || "Burewala · Lahore · Pakistan");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0d0d0d"/>
        <stop offset="100%" stop-color="#1a1712"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect x="36" y="36" width="1128" height="558" rx="16" fill="none" stroke="#c9a76a" stroke-opacity="0.45" stroke-width="2"/>
    <text x="84" y="130" fill="#c9a76a" font-family="Georgia, serif" font-size="20" letter-spacing="6">${safeCategory}</text>
    <text x="84" y="290" fill="#f5f2eb" font-family="Georgia, serif" font-size="52" font-weight="bold">${safeTitle}</text>
    <text x="84" y="365" fill="#d4b87a" font-family="sans-serif" font-size="24">${safeSubtitle}</text>
    <text x="84" y="530" fill="#9e988e" font-family="sans-serif" font-size="18" letter-spacing="3">${safeLocation}</text>
  </svg>`;

  const base64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(svg, "utf-8").toString("base64")
      : typeof btoa !== "undefined"
      ? btoa(svg)
      : "";
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Helper function to inject dynamically generated OpenGraph and Twitter images
 * into SEO metadata for all dynamic routes, using pre-cached asset URLs and
 * base64-encoded SVG social card placeholders.
 */
export function injectSocialImageMetadata(options: {
  title: string;
  description: string;
  path: string;
  imageUrl?: string;
  category?: string;
  location?: string;
  type?: "website" | "article";
  width?: number;
  height?: number;
  useBase64Fallback?: boolean;
}) {
  const baseUrl = getBaseUrl();
  const normalizedPath = options.path.startsWith("/") ? options.path : `/${options.path}`;
  const canonicalUrl = `${baseUrl}${normalizedPath}`;

  const categoryKey = (options.category || "").toLowerCase();
  const preCachedPath =
    options.imageUrl ||
    PRE_CACHED_SOCIAL_ASSETS[categoryKey] ||
    PRE_CACHED_SOCIAL_ASSETS.default;

  const resolvedAssetUrl = preCachedPath.startsWith("http")
    ? preCachedPath
    : preCachedPath.startsWith("data:")
    ? preCachedPath
    : `${baseUrl}${preCachedPath.startsWith("/") ? preCachedPath : `/${preCachedPath}`}`;

  const base64Placeholder = generateDynamicSocialCardBase64({
    title: options.title,
    subtitle: options.description,
    category: options.category || siteConfig.name,
    location: options.location || `${siteConfig.address.city}, Pakistan`,
  });

  const primaryImageUrl = options.useBase64Fallback ? base64Placeholder : resolvedAssetUrl;
  const width = options.width || 1280;
  const height = options.height || 720;

  return {
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: options.type || "website",
      locale: "en_PK",
      url: canonicalUrl,
      siteName: siteConfig.name,
      title: options.title,
      description: options.description,
      images: [
        {
          url: primaryImageUrl,
          width,
          height,
          alt: options.title,
        },
        {
          url: base64Placeholder,
          width: 1200,
          height: 630,
          alt: `${options.title} — ${siteConfig.name} Card`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: options.title,
      description: options.description,
      images: [primaryImageUrl],
    },
    other: {
      "og:image:placeholder": base64Placeholder,
    },
  };
}

/** Individual Service node matched to the section's id={service.id} anchor on /services. */
export function getServiceSchema(service: Service, anchor: string) {
  const baseUrl = getBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${baseUrl}/services#${anchor}`,
    name: service.title,
    serviceType: service.title,
    description: service.description,
    category: "Luxury Photography & Filmmaking",
    provider: {
      "@type": "ProfessionalService",
      "@id": `${baseUrl}/#organization`,
      name: siteConfig.name,
      url: baseUrl,
      telephone: siteConfig.phones[0],
      address: {
        "@type": "PostalAddress",
        streetAddress: siteConfig.address.line1,
        addressLocality: siteConfig.address.city,
        postalCode: siteConfig.address.postal,
        addressCountry: "PK",
      },
    },
    areaServed: siteConfig.citiesServed.map((city) => ({
      "@type": "City",
      name: city,
    })),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${service.title} Deliverables`,
      itemListElement: (service.deliverables || []).map((deliverable, idx) => ({
        "@type": "Offer",
        position: idx + 1,
        itemOffered: {
          "@type": "Service",
          name: deliverable,
        },
      })),
    },
    url: `${baseUrl}/services#${anchor}`,
  };
}

/** Comprehensive @graph JSON-LD structured data for the Services page (/services). */
export function getServicesPageGraphSchema(services: Service[]) {
  const baseUrl = getBaseUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      getBreadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Services", url: "/services" },
      ]),
      {
        "@type": "ItemList",
        "@id": `${baseUrl}/services#catalog`,
        name: `${siteConfig.name} Luxury Photography & Filmmaking Services`,
        description:
          "Comprehensive wedding photography, cinematic filmmaking, bridal portraiture, fashion editorials, corporate coverage, and commercial product photography across Pakistan.",
        numberOfItems: services.length,
        itemListElement: services.map((service, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${baseUrl}/services#${service.id}`,
          name: service.title,
          item: getServiceSchema(service, service.id),
        })),
      },
      ...services.map((service) => getServiceSchema(service, service.id)),
    ],
  };
}

/** CollectionPage / ImageGallery JSON-LD structured data for the Portfolio page (/portfolio). */
export function getPortfolioPageSchema(items: PortfolioItem[]) {
  const baseUrl = getBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${baseUrl}/portfolio#collection`,
    name: `${siteConfig.name} Luxury Wedding & Editorial Portfolio`,
    url: `${baseUrl}/portfolio`,
    description:
      "Curated gallery of Pakistani wedding photography, Nikah, Mehndi, Barat, Walima, bridal portraits, and commercial fashion editorials by Royal Studio.",
    isPartOf: { "@id": `${baseUrl}/#organization` },
    mainEntity: {
      "@type": "ImageGallery",
      name: `${siteConfig.name} Featured Works`,
      numberOfItems: items.length,
      image: items.slice(0, 12).map((item) => ({
        "@type": "ImageObject",
        name: item.title,
        contentUrl: `${baseUrl}${item.image}`,
        contentLocation: item.location || siteConfig.address.city,
        description: `${item.title} (${item.category}) photographed in ${item.location || siteConfig.address.city} by ${siteConfig.name}.`,
      })),
    },
  };
}

function parsePkrPrice(priceStr: string): number {
  return Number(priceStr.replace(/[^\d]/g, ""));
}

/** OfferCatalog for /pricing — encodes the real "Starting from" / "Up to"
 * copy exactly as authored, with no invented numbers. */
export function getOfferCatalogSchema(packages: PricingPackage[]) {
  const baseUrl = getBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    "@id": `${baseUrl}/pricing#offers`,
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
  const baseUrl = getBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: [`${baseUrl}${post.image}`],
    datePublished: post.dateISO,
    dateModified: post.dateISO,
    author: { "@type": "Organization", "@id": `${baseUrl}/#organization`, name: siteConfig.name },
    publisher: {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      name: siteConfig.name,
      logo: { "@type": "ImageObject", url: `${baseUrl}/logo.png` },
    },
    mainEntityOfPage: `${baseUrl}/blog/${post.slug}`,
  };
}
