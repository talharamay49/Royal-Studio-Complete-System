"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { AdminProfile } from "@/components/admin/types";
import type { PortfolioItem, PricingPackage, Service, Testimonial, BlogPost } from "@/types";
import {
  siteConfig,
  portfolioItems as defaultPortfolioItems,
  pricingPackages as defaultPricingPackages,
  detailedServices as defaultDetailedServices,
  testimonials as defaultTestimonials,
  blogPosts as defaultBlogPosts,
} from "@/lib/data";

export interface PublicWebsiteCMS {
  portfolioItems: PortfolioItem[];
  pricingPackages: PricingPackage[];
  detailedServices: Service[];
  testimonials: Testimonial[];
  blogPosts: BlogPost[];
}

const fallbackProfile: AdminProfile = {
  studioName: siteConfig.name,
  tagline: siteConfig.tagline,
  description: siteConfig.description,
  logo: "/RoyalLogo.png",
  primaryLogo: "/RoyalLogo.png",
  websiteLogo: "/RoyalLogo.png",
  documentLogo: "/RoyalLogo.png",
  documentBackground: "/image.png",
  quotationBackground: "/image.png",
  invoiceBackground: "/image.png",
  receiptBackground: "/image.png",
  address: siteConfig.address.full,
  addressLine1: siteConfig.address.line1,
  addressLine2: siteConfig.address.line2,
  city: siteConfig.address.city,
  district: "Burewala",
  province: "Punjab",
  country: siteConfig.address.country,
  postalCode: siteConfig.address.postal,
  googleMapsUrl: siteConfig.social.maps,
  publicDisplayAddress: siteConfig.address.full,
  phone: siteConfig.phones[0],
  phone2: siteConfig.phones[1],
  whatsapp: siteConfig.whatsapp,
  publicContactNumber: siteConfig.phones[0],
  publicWhatsappNumber: siteConfig.whatsapp,
  email: siteConfig.email,
  website: siteConfig.url,
  facebook: siteConfig.social.facebook,
  instagram: siteConfig.social.instagram,
  youtube: siteConfig.social.youtube,
  tiktok: siteConfig.social.tiktok,
  currency: "PKR",
  currencySymbol: "PKR",
  taxRate: 0,
  quotationPrefix: "RS-QUO-",
  invoicePrefix: "RS-INV-",
  paymentTerms: "50% advance upon booking confirmation.",
  bankName: "Meezan Bank",
  accountTitle: "Royal Studio",
  accountNumber: "0102-0105582910",
  iban: "PK44MEZN0001020105582910",
  notificationPreferences: {
    overdueInvoices: true,
    urgentTasks: true,
    equipmentMaintenance: true,
    lowAvailability: true,
  },
};

const fallbackCMS: PublicWebsiteCMS = {
  portfolioItems: defaultPortfolioItems,
  pricingPackages: defaultPricingPackages,
  detailedServices: defaultDetailedServices,
  testimonials: defaultTestimonials,
  blogPosts: defaultBlogPosts,
};

const StudioProfileContext = createContext<AdminProfile>(fallbackProfile);
const PublicCMSContext = createContext<PublicWebsiteCMS>(fallbackCMS);

export function StudioProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<AdminProfile>(fallbackProfile);
  const [cms, setCms] = useState<PublicWebsiteCMS>(fallbackCMS);

  useEffect(() => {
    let mounted = true;
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted && data && data.studioName) {
          setProfile((prev) => ({ ...prev, ...data }));
        }
      })
      .catch(() => {
        // Fallback to default siteConfig
      });

    fetch("/api/cms")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted && data) {
          setCms({
            portfolioItems:
              Array.isArray(data.portfolioItems) && data.portfolioItems.length > 0
                ? data.portfolioItems
                : defaultPortfolioItems,
            pricingPackages:
              Array.isArray(data.pricingPackages) && data.pricingPackages.length > 0
                ? data.pricingPackages
                : defaultPricingPackages,
            detailedServices:
              Array.isArray(data.detailedServices) && data.detailedServices.length > 0
                ? data.detailedServices
                : defaultDetailedServices,
            testimonials:
              Array.isArray(data.testimonials) && data.testimonials.length > 0
                ? data.testimonials
                : defaultTestimonials,
            blogPosts:
              Array.isArray(data.blogPosts) && data.blogPosts.length > 0
                ? data.blogPosts
                : defaultBlogPosts,
          });
        }
      })
      .catch(() => {
        // Fallback to default CMS data
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <StudioProfileContext.Provider value={profile}>
      <PublicCMSContext.Provider value={cms}>
        {children}
      </PublicCMSContext.Provider>
    </StudioProfileContext.Provider>
  );
}

export function usePublicStudioProfile(): AdminProfile {
  return useContext(StudioProfileContext);
}

export function usePublicWebsiteCMS(): PublicWebsiteCMS {
  return useContext(PublicCMSContext);
}
