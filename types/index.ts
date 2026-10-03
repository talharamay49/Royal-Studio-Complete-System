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
  exif?: {
    camera?: string;
    lens?: string;
    aperture?: string;
    shutter?: string;
    iso?: string;
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
