import type { Metadata } from "next";
import Hero from "@/components/home/Hero";
import AboutPreview from "@/components/home/AboutPreview";
import ServicesPreview from "@/components/home/ServicesPreview";
import PortfolioGrid from "@/components/portfolio/PortfolioGrid";
import FeaturedFilm from "@/components/home/FeaturedFilm";
import WeddingProcess from "@/components/home/WeddingProcess";
import Testimonials from "@/components/home/Testimonials";
import Statistics from "@/components/home/Statistics";
import FAQ from "@/components/home/FAQ";
import ContactCTA from "@/components/home/ContactCTA";
import { pageKeywords, siteConfig } from "@/lib/data";
import { getCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: `${siteConfig.name} | Luxury Wedding Photography Pakistan`,
  description: siteConfig.description,
  keywords: [pageKeywords.home.primary, ...pageKeywords.home.secondary],
  alternates: getCanonical("/"),
  openGraph: {
    title: `${siteConfig.name} | We Capture Your Memories`,
    description: siteConfig.description,
    images: [{ url: "/portfolio/couple-03-walima-laugh.jpg", width: 1280, height: 720, alt: siteConfig.name }],
  },
  twitter: {
    images: ["/portfolio/couple-03-walima-laugh.jpg"],
  },
};

export default function HomePage() {
  return (
    <main>
      <Hero />
      <AboutPreview />
      <ServicesPreview />
      <PortfolioGrid limit={9} />
      <FeaturedFilm />
      <WeddingProcess />
      <Testimonials />
      <Statistics />
      <FAQ />
      <ContactCTA />
    </main>
  );
}
