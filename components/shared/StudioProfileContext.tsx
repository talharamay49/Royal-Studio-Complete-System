"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type { AdminProfile, StudioThemeConfig } from "@/components/admin/types";
import type {
  PortfolioItem,
  PricingPackage,
  Service,
  Testimonial,
  BlogPost,
  WebsiteCustomizationConfig,
  ConnectedSocialAccount,
  SocialMediaPostItem,
} from "@/types";
import { erpDatabase } from "@/components/admin/services/databaseService";
import {
  siteConfig,
  portfolioItems as defaultPortfolioItems,
  pricingPackages as defaultPricingPackages,
  detailedServices as defaultDetailedServices,
  testimonials as defaultTestimonials,
  blogPosts as defaultBlogPosts,
  defaultWebsiteCustomization,
  defaultConnectedSocialAccounts,
  defaultSocialMediaPosts,
} from "@/lib/data";

export interface PublicWebsiteCMS {
  portfolioItems: PortfolioItem[];
  pricingPackages: PricingPackage[];
  detailedServices: Service[];
  testimonials: Testimonial[];
  blogPosts: BlogPost[];
  websiteCustomization: WebsiteCustomizationConfig;
  connectedSocialAccounts: ConnectedSocialAccount[];
  socialMediaPosts: SocialMediaPostItem[];
  isLoading?: boolean;
}

export interface ThemePresetDefinition {
  id: string;
  name: string;
  subtitle: string;
  config: Omit<StudioThemeConfig, "mode" | "applyToPublicWebsite">;
}

export const DEFAULT_STUDIO_THEME: StudioThemeConfig = {
  mode: "light",
  presetId: "royal-champagne",
  accentColor: "#c9a76a",
  accentLight: "#d4b87a",
  accentDark: "#b08f4f",
  primaryColor: "#111111",
  backgroundLight: "#f8f8f8",
  surfaceLight: "#ffffff",
  backgroundDark: "#0d0d0d",
  surfaceDark: "#161616",
  sidebarStyle: "obsidian",
  headingFont: "Cormorant Garamond",
  bodyFont: "Inter",
  borderRadius: "editorial",
  borderRadiusPx: 12,
  applyToPublicWebsite: true,
};

export const STUDIO_THEME_PRESETS: ThemePresetDefinition[] = [
  {
    id: "royal-champagne",
    name: "Royal Champagne Gold",
    subtitle: "Signature Royal Studio editorial gold & obsidian",
    config: {
      presetId: "royal-champagne",
      accentColor: "#c9a76a",
      accentLight: "#d4b87a",
      accentDark: "#b08f4f",
      primaryColor: "#111111",
      backgroundLight: "#f8f8f8",
      surfaceLight: "#ffffff",
      backgroundDark: "#0d0d0d",
      surfaceDark: "#161616",
      sidebarStyle: "obsidian",
      headingFont: "Cormorant Garamond",
      bodyFont: "Inter",
      borderRadius: "editorial",
      borderRadiusPx: 12,
    },
  },
  {
    id: "imperial-emerald",
    name: "Imperial Emerald & Gold",
    subtitle: "Regal heritage emerald with warm ivory & deep forest",
    config: {
      presetId: "imperial-emerald",
      accentColor: "#2a7b5c",
      accentLight: "#3b9975",
      accentDark: "#1e5c44",
      primaryColor: "#0f241c",
      backgroundLight: "#f5f8f6",
      surfaceLight: "#ffffff",
      backgroundDark: "#091410",
      surfaceDark: "#11221b",
      sidebarStyle: "obsidian",
      headingFont: "Cormorant Garamond",
      bodyFont: "Inter",
      borderRadius: "editorial",
      borderRadiusPx: 12,
    },
  },
  {
    id: "velvet-burgundy",
    name: "Velvet Rose & Burgundy",
    subtitle: "Romantic bridal crimson with warm alabaster tones",
    config: {
      presetId: "velvet-burgundy",
      accentColor: "#a3485b",
      accentLight: "#bd5d71",
      accentDark: "#823444",
      primaryColor: "#211014",
      backgroundLight: "#faf6f7",
      surfaceLight: "#ffffff",
      backgroundDark: "#130b0d",
      surfaceDark: "#1f1216",
      sidebarStyle: "obsidian",
      headingFont: "Cormorant Garamond",
      bodyFont: "Inter",
      borderRadius: "editorial",
      borderRadiusPx: 12,
    },
  },
  {
    id: "sapphire-editorial",
    name: "Royal Sapphire Editorial",
    subtitle: "Architectural midnight blue & crisp gallery white",
    config: {
      presetId: "sapphire-editorial",
      accentColor: "#3b6e9c",
      accentLight: "#5289ba",
      accentDark: "#2a5278",
      primaryColor: "#0f1b29",
      backgroundLight: "#f5f7fa",
      surfaceLight: "#ffffff",
      backgroundDark: "#0a1017",
      surfaceDark: "#121c28",
      sidebarStyle: "obsidian",
      headingFont: "Cormorant Garamond",
      bodyFont: "Inter",
      borderRadius: "editorial",
      borderRadiusPx: 12,
    },
  },
  {
    id: "obsidian-monochrome",
    name: "Obsidian Platinum",
    subtitle: "Fine-art cinema monochrome with warm titanium accents",
    config: {
      presetId: "obsidian-monochrome",
      accentColor: "#8f8577",
      accentLight: "#a89e8f",
      accentDark: "#6e6559",
      primaryColor: "#121212",
      backgroundLight: "#f7f7f5",
      surfaceLight: "#ffffff",
      backgroundDark: "#0a0a0a",
      surfaceDark: "#141414",
      sidebarStyle: "obsidian",
      headingFont: "Cormorant Garamond",
      bodyFont: "Inter",
      borderRadius: "sharp",
      borderRadiusPx: 2,
    },
  },
];

const fallbackProfile: AdminProfile = {
  studioName: siteConfig.name,
  tagline: siteConfig.tagline,
  description: siteConfig.description,
  logo: "/RoyalLogo.png",
  primaryLogo: "/RoyalLogo.png",
  websiteLogo: "/RoyalLogo.png",
  documentLogo: "/RoyalLogo.png",
  documentBackground: "/01.jpg",
  quotationBackground: "/01.jpg",
  invoiceBackground: "/01.jpg",
  receiptBackground: "/01.jpg",
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
  showPublicPriceBreakdown: false,
  themeConfig: DEFAULT_STUDIO_THEME,
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
  websiteCustomization: defaultWebsiteCustomization,
  connectedSocialAccounts: defaultConnectedSocialAccounts,
  socialMediaPosts: defaultSocialMediaPosts,
};

export interface StudioThemeContextValue {
  themeConfig: StudioThemeConfig;
  resolvedMode: "light" | "dark";
  isSavingTheme: boolean;
  toggleThemeMode: () => void;
  setThemeMode: (mode: "light" | "dark" | "system") => void;
  previewThemeConfig: (partial: Partial<StudioThemeConfig>) => void;
  saveThemePreferences: (partial: Partial<StudioThemeConfig>) => Promise<StudioThemeConfig>;
}

const THEME_SYNC_CHANNEL = "royal_studio_theme_sync_v1";

export function applyThemeCssVariables(
  config: StudioThemeConfig,
  resolvedMode: "light" | "dark"
): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const isDark = resolvedMode === "dark";

  // Standard Tailwind CSS dark class strategy
  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.setAttribute("data-theme", resolvedMode);
  root.setAttribute("data-sidebar-style", config.sidebarStyle || "obsidian");
  root.setAttribute("data-radius", config.borderRadius || "editorial");

  const accent = config.accentColor || DEFAULT_STUDIO_THEME.accentColor;
  const accentLight = config.accentLight || DEFAULT_STUDIO_THEME.accentLight;
  const accentDark = config.accentDark || DEFAULT_STUDIO_THEME.accentDark;

  const bg = isDark
    ? config.backgroundDark || DEFAULT_STUDIO_THEME.backgroundDark
    : config.backgroundLight || DEFAULT_STUDIO_THEME.backgroundLight;
  const surface = isDark
    ? config.surfaceDark || DEFAULT_STUDIO_THEME.surfaceDark
    : config.surfaceLight || DEFAULT_STUDIO_THEME.surfaceLight;
  const primary = isDark
    ? "#f5f2eb"
    : config.primaryColor || DEFAULT_STUDIO_THEME.primaryColor;
  const secondary = isDark ? "#161616" : "#ffffff";
  const text = isDark ? "#e8e4dc" : "#222222";
  const textMuted = isDark ? "#9e988e" : "#666666";
  const border = isDark ? "#282623" : "#e5e2dc";

  root.style.setProperty("--color-accent", accent);
  root.style.setProperty("--color-accent-light", accentLight);
  root.style.setProperty("--color-accent-dark", accentDark);
  root.style.setProperty("--color-primary", primary);
  root.style.setProperty("--color-secondary", secondary);
  root.style.setProperty("--color-background", bg);
  root.style.setProperty("--color-surface", surface);
  root.style.setProperty("--color-text", text);
  root.style.setProperty("--color-text-muted", textMuted);
  root.style.setProperty("--color-border", border);

  // Font Variables
  const headingFontMap: Record<string, string> = {
    "Cormorant Garamond": '"Cormorant Garamond", Georgia, serif',
    "Playfair Display": '"Playfair Display", "Cormorant Garamond", Georgia, serif',
    Cinzel: '"Cinzel", "Cormorant Garamond", Georgia, serif',
    Inter: '"Inter", ui-sans-serif, system-ui, sans-serif',
  };
  const bodyFontMap: Record<string, string> = {
    Inter: '"Inter", ui-sans-serif, system-ui, sans-serif',
    Poppins: '"Poppins", "Inter", ui-sans-serif, system-ui, sans-serif',
  };

  root.style.setProperty(
    "--font-display",
    headingFontMap[config.headingFont] || headingFontMap["Cormorant Garamond"]
  );
  root.style.setProperty(
    "--font-sans",
    bodyFontMap[config.bodyFont] || bodyFontMap["Inter"]
  );

  const radiusMap: Record<string, number> = {
    sharp: 2,
    editorial: 12,
    rounded: 18,
  };
  const resolvedPx =
    typeof config.borderRadiusPx === "number"
      ? config.borderRadiusPx
      : radiusMap[config.borderRadius] ?? 12;

  root.style.setProperty("--studio-radius", `${resolvedPx}px`);
}

const StudioProfileContext = createContext<AdminProfile>(fallbackProfile);
const PublicCMSContext = createContext<PublicWebsiteCMS>(fallbackCMS);
const StudioThemeContext = createContext<StudioThemeContextValue>({
  themeConfig: DEFAULT_STUDIO_THEME,
  resolvedMode: "light",
  isSavingTheme: false,
  toggleThemeMode: () => {},
  setThemeMode: () => {},
  previewThemeConfig: () => {},
  saveThemePreferences: async () => DEFAULT_STUDIO_THEME,
});

export function StudioProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<AdminProfile>(fallbackProfile);
  const [cms, setCms] = useState<PublicWebsiteCMS>({
    ...fallbackCMS,
    isLoading: true,
  });
  const [themeConfig, setThemeConfig] = useState<StudioThemeConfig>(DEFAULT_STUDIO_THEME);
  const [systemDark, setSystemDark] = useState<boolean>(false);
  const [isSavingTheme, setIsSavingTheme] = useState<boolean>(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Detect system dark mode preference
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      setSystemDark(mq.matches);
      const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, []);

  // Cross-tab & cross-view (Admin <-> Public Site) synchronization channel
  useEffect(() => {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const ch = new BroadcastChannel(THEME_SYNC_CHANNEL);
        channelRef.current = ch;
        ch.onmessage = (event) => {
          if (event.data?.type === "THEME_UPDATED" && event.data?.themeConfig) {
            setThemeConfig((prev) => ({ ...prev, ...event.data.themeConfig }));
          }
        };
        return () => {
          ch.close();
          channelRef.current = null;
        };
      } catch {
        // Ignore BroadcastChannel errors
      }
    }
  }, []);

  // Hydrate Studio Profile + Theme Preferences from persistent database service & server API
  useEffect(() => {
    let mounted = true;

    // 1. Hydrate from local persistent IndexedDB store via erpDatabase first for instant reload consistency
    void erpDatabase.hydrateFromLocalStore().then(() => {
      if (!mounted) return;
      const snap = erpDatabase.getSnapshot();
      if (snap.profile) {
        setProfile((prev) => ({ ...prev, ...snap.profile }));
        if (snap.profile.themeConfig) {
          setThemeConfig((prev) => ({ ...prev, ...snap.profile!.themeConfig }));
        }
      }
    });

    // 2. Fetch authoritative profile + themeConfig from server database
    fetch("/api/profile", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted && data && data.studioName) {
          setProfile((prev) => ({ ...prev, ...data }));
          if (data.themeConfig) {
            setThemeConfig((prev) => ({ ...prev, ...data.themeConfig }));
          }
          erpDatabase.setProfile(data);
        }
      })
      .catch(() => {});

    fetch("/api/cms", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted && data) {
          setCms({
            portfolioItems:
              Array.isArray(data.portfolioItems) && data.portfolioItems.length > 0
                ? data.portfolioItems.filter((i: PortfolioItem) => i.visible !== false)
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
            websiteCustomization: data.websiteCustomization
              ? {
                  ...defaultWebsiteCustomization,
                  ...data.websiteCustomization,
                  sectionVisibility: {
                    ...defaultWebsiteCustomization.sectionVisibility,
                    ...(data.websiteCustomization.sectionVisibility || {}),
                  },
                  hero: {
                    ...defaultWebsiteCustomization.hero,
                    ...(data.websiteCustomization.hero || {}),
                  },
                  about: {
                    ...defaultWebsiteCustomization.about,
                    ...(data.websiteCustomization.about || {}),
                  },
                  films: {
                    ...defaultWebsiteCustomization.films,
                    ...(data.websiteCustomization.films || {}),
                  },
                  sections: {
                    ...defaultWebsiteCustomization.sections,
                    ...(data.websiteCustomization.sections || {}),
                  },
                  navigation: {
                    ...defaultWebsiteCustomization.navigation,
                    ...(data.websiteCustomization.navigation || {}),
                  },
                }
              : defaultWebsiteCustomization,
            connectedSocialAccounts:
              Array.isArray(data.connectedSocialAccounts) && data.connectedSocialAccounts.length > 0
                ? data.connectedSocialAccounts
                : defaultConnectedSocialAccounts,
            socialMediaPosts:
              Array.isArray(data.socialMediaPosts) && data.socialMediaPosts.length > 0
                ? data.socialMediaPosts
                : defaultSocialMediaPosts,
            isLoading: false,
          });
        } else if (mounted) {
          setCms((prev) => ({ ...prev, isLoading: false }));
        }
      })
      .catch(() => {
        if (mounted) {
          setCms((prev) => ({ ...prev, isLoading: false }));
        }
      });

    const handleCmsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<any>;
      if (customEvent.detail) {
        const d = customEvent.detail;
        setCms((prev) => ({
          ...prev,
          ...(Array.isArray(d.portfolioItems)
            ? { portfolioItems: d.portfolioItems.filter((i: PortfolioItem) => i.visible !== false) }
            : {}),
          ...(Array.isArray(d.pricingPackages) ? { pricingPackages: d.pricingPackages } : {}),
          ...(Array.isArray(d.detailedServices) ? { detailedServices: d.detailedServices } : {}),
          ...(Array.isArray(d.testimonials) ? { testimonials: d.testimonials } : {}),
          ...(Array.isArray(d.blogPosts) ? { blogPosts: d.blogPosts } : {}),
          ...(d.websiteCustomization
            ? {
                websiteCustomization: {
                  ...defaultWebsiteCustomization,
                  ...prev.websiteCustomization,
                  ...d.websiteCustomization,
                },
              }
            : {}),
          ...(Array.isArray(d.connectedSocialAccounts)
            ? { connectedSocialAccounts: d.connectedSocialAccounts }
            : {}),
          ...(Array.isArray(d.socialMediaPosts) ? { socialMediaPosts: d.socialMediaPosts } : {}),
        }));
      }
    };

    window.addEventListener("royalstudio:cms-updated", handleCmsUpdated);

    const handleProfileUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<AdminProfile>;
      if (customEvent.detail) {
        setProfile((prev) => ({ ...prev, ...customEvent.detail }));
        if (customEvent.detail.themeConfig) {
          setThemeConfig((prev) => ({ ...prev, ...customEvent.detail.themeConfig }));
        }
      }
    };

    window.addEventListener("royalstudio:profile-updated", handleProfileUpdated);
    return () => {
      mounted = false;
      window.removeEventListener("royalstudio:profile-updated", handleProfileUpdated);
      window.removeEventListener("royalstudio:cms-updated", handleCmsUpdated);
    };
  }, []);

  const resolvedMode: "light" | "dark" =
    themeConfig.mode === "system"
      ? systemDark
        ? "dark"
        : "light"
      : themeConfig.mode === "dark"
      ? "dark"
      : "light";

  useEffect(() => {
    applyThemeCssVariables(themeConfig, resolvedMode);
  }, [themeConfig, resolvedMode]);

  const broadcastTheme = useCallback((nextTheme: StudioThemeConfig) => {
    if (channelRef.current) {
      try {
        channelRef.current.postMessage({
          type: "THEME_UPDATED",
          themeConfig: nextTheme,
        });
      } catch {
        // Ignore
      }
    }
  }, []);

  const saveThemePreferences = useCallback(
    async (partial: Partial<StudioThemeConfig>): Promise<StudioThemeConfig> => {
      setIsSavingTheme(true);
      try {
        const merged: StudioThemeConfig = {
          ...themeConfig,
          ...partial,
        };
        setThemeConfig(merged);
        broadcastTheme(merged);
        const persisted = await erpDatabase.saveThemeConfig(merged);
        setThemeConfig((prev) => ({ ...prev, ...persisted }));
        broadcastTheme(persisted);
        return persisted;
      } finally {
        setIsSavingTheme(false);
      }
    },
    [themeConfig, broadcastTheme]
  );

  const toggleThemeMode = useCallback(() => {
    const nextMode: "light" | "dark" = resolvedMode === "dark" ? "light" : "dark";
    const updated: StudioThemeConfig = {
      ...themeConfig,
      mode: nextMode,
    };
    setThemeConfig(updated);
    broadcastTheme(updated);
    void erpDatabase.saveThemeConfig({ mode: nextMode }).catch(() => {});
  }, [resolvedMode, themeConfig, broadcastTheme]);

  const setThemeMode = useCallback(
    (mode: "light" | "dark" | "system") => {
      const updated: StudioThemeConfig = {
        ...themeConfig,
        mode,
      };
      setThemeConfig(updated);
      broadcastTheme(updated);
      void erpDatabase.saveThemeConfig({ mode }).catch(() => {});
    },
    [themeConfig, broadcastTheme]
  );

  const previewThemeConfig = useCallback(
    (partial: Partial<StudioThemeConfig>) => {
      setThemeConfig((prev) => {
        const next = { ...prev, ...partial };
        broadcastTheme(next);
        return next;
      });
    },
    [broadcastTheme]
  );

  return (
    <StudioThemeContext.Provider
      value={{
        themeConfig,
        resolvedMode,
        isSavingTheme,
        toggleThemeMode,
        setThemeMode,
        previewThemeConfig,
        saveThemePreferences,
      }}
    >
      <StudioProfileContext.Provider value={profile}>
        <PublicCMSContext.Provider value={cms}>
          {children}
        </PublicCMSContext.Provider>
      </StudioProfileContext.Provider>
    </StudioThemeContext.Provider>
  );
}

export function usePublicStudioProfile(): AdminProfile {
  return useContext(StudioProfileContext);
}

export function usePublicWebsiteCMS(): PublicWebsiteCMS {
  return useContext(PublicCMSContext);
}

export function useStudioTheme(): StudioThemeContextValue {
  return useContext(StudioThemeContext);
}
