export type PortfolioCategory =
  | "all"
  | "nikah"
  | "mehndi"
  | "barat"
  | "walima"
  | "bridal"
  | "couple"
  | "fashion"
  | "corporate"
  | "indoor"
  | "outdoor"
  | "boys"
  | "groom"
  | "bride"
  | "birthday"
  | "expo";

export interface PortfolioItem {
  id: number;
  title: string;
  category: Exclude<PortfolioCategory, "all">;
  image: string;
  aspect: "tall" | "wide" | "square";
  location?: string;
  visible?: boolean;
  sourcePlatform?: "upload" | "instagram" | "facebook" | "tiktok" | "youtube";
  socialPermalink?: string;
  socialHandle?: string;
  socialSource?: SocialPlatformId;
  socialPostUrl?: string;
  socialPostId?: string;
  exif?: {
    camera?: string;
    lens?: string;
    aperture?: string;
    shutter?: string;
    iso?: string;
  };
}

export type SocialPlatformId = "instagram" | "facebook" | "tiktok" | "youtube";

export interface ConnectedSocialAccount {
  id: string;
  platform: SocialPlatformId;
  handle: string;
  profileUrl: string;
  connected: boolean;
  autoSyncToGallery?: boolean;
  accessTokenHint?: string;
  lastSyncedAt?: string;
  followersLabel?: string;
}

export interface SocialMediaPostItem {
  id: string;
  platform: SocialPlatformId;
  accountHandle: string;
  title: string;
  caption: string;
  image: string;
  permalink: string;
  postedAt: string;
  location?: string;
  likesCount?: number;
  category: Exclude<PortfolioCategory, "all">;
  aspect: "tall" | "wide" | "square";
  selectedForPortfolio: boolean;
}

export interface WebsiteCustomizationConfig {
  sectionVisibility: {
    showHero: boolean;
    showAboutPreview: boolean;
    showServicesPreview: boolean;
    showPortfolioSection: boolean;
    showFeaturedFilm: boolean;
    showWeddingProcess: boolean;
    showTestimonials: boolean;
    showStatistics: boolean;
    showFaq: boolean;
    showContactCta: boolean;
    showFloatingWhatsapp?: boolean;
    homePortfolioLimit: number;
  };
  hero: {
    eyebrowText: string;
    headline: string;
    subheadline: string;
    youtubeVideoId: string;
    showBackgroundVideo: boolean;
    posterImage: string;
    overlayOpacity: number;
    primaryCtaLabel: string;
    primaryCtaHref: string;
    secondaryCtaLabel: string;
    secondaryCtaHref: string;
    showFloatingStats: boolean;
    floatingStats: { value: string; label: string }[];
  };
  about: {
    pageTitle: string;
    pageDescription: string;
    homeLabel: string;
    homeTitle: string;
    homeDescription: string;
    homeCtaLabel: string;
    storyLabel: string;
    storyHeading: string;
    storyParagraphs: string[];
    highlights: string[];
    mainImage: string;
    secondaryImage: string;
    badgeValue: string;
    badgeLabel: string;
    foundersLabel: string;
    foundersTitle: string;
    foundersDescription: string;
    founders: {
      name: string;
      role: string;
      image: string;
      bio?: string;
    }[];
  };
  films: {
    featuredLabel: string;
    featuredSectionTitle: string;
    featuredFilmTitle: string;
    featuredYoutubeId: string;
    featuredDescription: string;
    pageTitle: string;
    pageDescription: string;
    weddingFilms: {
      id: number;
      title: string;
      youtubeId: string;
      location: string;
      duration: string;
    }[];
  };
  sections: {
    servicesLabel: string;
    servicesTitle: string;
    servicesDescription: string;
    homeServices: {
      id: string;
      title: string;
      description: string;
      icon: string;
    }[];
    portfolioLabel: string;
    portfolioTitle: string;
    portfolioDescription: string;
    processLabel: string;
    processTitle: string;
    processDescription: string;
    weddingProcess: {
      step: number;
      title: string;
      description: string;
    }[];
    statistics: {
      value: string;
      label: string;
    }[];
    faqLabel: string;
    faqTitle: string;
    faqDescription: string;
    faqItems: {
      question: string;
      answer: string;
    }[];
    ctaLabel: string;
    ctaTitle: string;
    ctaDescription: string;
    ctaPrimaryButtonText: string;
  };
  navigation: {
    navLinks: {
      label: string;
      href: string;
      visible: boolean;
    }[];
    headerCtaLabel: string;
    headerCtaHref: string;
    citiesServed: string[];
    footerTagline: string;
    footerSubtext: string;
    showCitiesInFooter: boolean;
    showSocialLinksInFooter: boolean;
  };
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  dateISO: string;
  category: string;
  content: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  event: string;
  location?: string;
}

export interface Service {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  deliverables: string[];
  process: string[];
  equipment: string[];
  faq: { question: string; answer: string }[];
  icon: string;
}

export interface PricingPackage {
  id: string;
  name: string;
  price: string;
  priceNote?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

export interface LeadSubmission {
  brideName: string;
  groomName: string;
  phone: string;
  email: string;
  weddingDate: string;
  venue: string;
  city: string;
  services: string;
  budget: string;
  message: string;
}
