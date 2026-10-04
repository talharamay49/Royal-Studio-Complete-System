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
import SectionErrorBoundary from "@/components/shared/SectionErrorBoundary";
import { pageKeywords, siteConfig } from "@/lib/data";
import {
  getCanonical,
  getReviewsSchema,
  getWeddingEventsSchema,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: `${siteConfig.name} | Luxury Wedding Photography Pakistan`,
  description: siteConfig.description,
  keywords: [pageKeywords.home.primary, ...pageKeywords.home.secondary],
  alternates: getCanonical("/"),
  openGraph: {
    title: `${siteConfig.name} | We Capture Your Memories`,
    description: siteConfig.description,
    images: [
      {
        url: "/portfolio/couple-03-walima-laugh.jpg",
        width: 1280,
        height: 720,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    images: ["/portfolio/couple-03-walima-laugh.jpg"],
  },
};

export default function HomePage() {
  const homeStructuredData = [
    ...getReviewsSchema(),
    ...getWeddingEventsSchema(),
  ];

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeStructuredData) }}
      />
      <SectionErrorBoundary sectionName="Hero Showcase">
        <Hero />
      </SectionErrorBoundary>
      <SectionErrorBoundary sectionName="About Royal Studio">
        <AboutPreview />
      </SectionErrorBoundary>
      <SectionErrorBoundary sectionName="Services Overview">
        <ServicesPreview />
      </SectionErrorBoundary>
      <SectionErrorBoundary sectionName="Featured Portfolio">
        <PortfolioGrid limit={9} />
      </SectionErrorBoundary>
      <SectionErrorBoundary sectionName="Featured Wedding Film">
        <FeaturedFilm />
      </SectionErrorBoundary>
      <SectionErrorBoundary sectionName="Wedding Process">
        <WeddingProcess />
      </SectionErrorBoundary>
      <SectionErrorBoundary sectionName="Client Testimonials">
        <Testimonials />
      </SectionErrorBoundary>
      <SectionErrorBoundary sectionName="Studio Statistics">
        <Statistics />
      </SectionErrorBoundary>
      <SectionErrorBoundary sectionName="Frequently Asked Questions">
        <FAQ />
      </SectionErrorBoundary>
      <SectionErrorBoundary sectionName="Booking Call to Action">
        <ContactCTA />
      </SectionErrorBoundary>
    </main>
  );
}
