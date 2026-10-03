"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { AdminProfile } from "@/components/admin/types";
import { siteConfig } from "@/lib/data";

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

const StudioProfileContext = createContext<AdminProfile>(fallbackProfile);

export function StudioProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<AdminProfile>(fallbackProfile);

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
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <StudioProfileContext.Provider value={profile}>
      {children}
    </StudioProfileContext.Provider>
  );
}

export function usePublicStudioProfile(): AdminProfile {
  return useContext(StudioProfileContext);
}
