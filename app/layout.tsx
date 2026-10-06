import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageTransitionWrapper from "@/components/layout/PageTransitionWrapper";
import TopLoadingBar from "@/components/layout/TopLoadingBar";
import FloatingWhatsAppButton from "@/components/shared/FloatingWhatsAppButton";
import RoyalChatbotWidget from "@/components/shared/RoyalChatbotWidget";
import { StudioProfileProvider } from "@/components/shared/StudioProfileContext";
import { pageKeywords, siteConfig } from "@/lib/data";
import { getLocalBusinessSchema, getWebsiteSchema } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | Luxury Wedding Photography Pakistan`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [pageKeywords.home.primary, ...pageKeywords.home.secondary],
  authors: [{ name: siteConfig.founders.join(", ") }],
  openGraph: {
    type: "website",
    locale: "en_PK",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} | We Capture Your Memories`,
    description: siteConfig.description,
    images: [{ url: "/RoyalLogo.png", width: 1200, height: 630, alt: siteConfig.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: ["/RoyalLogo.png"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: siteConfig.url },
};

const jsonLd = [getLocalBusinessSchema(), getWebsiteSchema()];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-background text-text antialiased">
        <StudioProfileProvider>
          <TopLoadingBar />
          <Navbar />
          <PageTransitionWrapper>{children}</PageTransitionWrapper>
          <FloatingWhatsAppButton />
          <RoyalChatbotWidget />
          <Footer />
        </StudioProfileProvider>
      </body>
    </html>
  );
}
