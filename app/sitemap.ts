import type { MetadataRoute } from "next";
import {
  blogPosts as defaultBlogPosts,
  portfolioItems as defaultPortfolioItems,
  portfolioCategories,
} from "@/lib/data";
import { getBaseUrl } from "@/lib/seo";
import { dbInstance } from "@/lib/admin/db";

/**
 * Dynamically generates an XML sitemap (/sitemap.xml) based on static pages,
 * live blog articles (/blog/[slug]), portfolio categories, and portfolio items
 * to maximize search engine crawling and indexing.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const db = dbInstance.getData();

  const liveBlogPosts =
    db.cms?.blogPosts && db.cms.blogPosts.length > 0
      ? db.cms.blogPosts
      : defaultBlogPosts;

  const livePortfolioItems =
    db.cms?.portfolioItems && db.cms.portfolioItems.length > 0
      ? db.cms.portfolioItems
      : defaultPortfolioItems;

  const now = new Date();

  // 1. Core Static Pages
  const staticPages: MetadataRoute.Sitemap = [
    { path: "", priority: 1.0, changeFrequency: "weekly" as const },
    { path: "/portfolio", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/services", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/pricing", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/wedding-films", priority: 0.85, changeFrequency: "weekly" as const },
    { path: "/about", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/blog", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/contact", priority: 0.85, changeFrequency: "monthly" as const },
  ].map((entry) => ({
    url: `${baseUrl}${entry.path}`,
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));

  // 2. Dynamic Blog Article Routes (/blog/[slug])
  const blogPages: MetadataRoute.Sitemap = liveBlogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.dateISO ? new Date(post.dateISO) : now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
    images: post.image?.startsWith("/")
      ? [`${baseUrl}${post.image}`]
      : post.image?.startsWith("http")
      ? [post.image]
      : undefined,
  }));

  // 3. Dynamic Portfolio Category Filter Routes & Image Sitemap Entries
  const portfolioCategoryPages: MetadataRoute.Sitemap = portfolioCategories
    .filter((cat) => cat.id !== "all")
    .map((cat) => {
      const catImages = livePortfolioItems
        .filter((item) => item.category === cat.id && item.image?.startsWith("/"))
        .map((item) => `${baseUrl}${item.image}`);

      return {
        url: `${baseUrl}/portfolio?category=${encodeURIComponent(cat.id)}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.75,
        images: catImages.length > 0 ? catImages : undefined,
      };
    });

  // 4. Individual Portfolio Item Deep-Link Entries
  const portfolioItemPages: MetadataRoute.Sitemap = livePortfolioItems.map((item) => ({
    url: `${baseUrl}/portfolio?item=${item.id}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.65,
    images: item.image?.startsWith("/")
      ? [`${baseUrl}${item.image}`]
      : item.image?.startsWith("http")
      ? [item.image]
      : undefined,
  }));

  return [
    ...staticPages,
    ...blogPages,
    ...portfolioCategoryPages,
    ...portfolioItemPages,
  ];
}
