import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import AnimatedSection from "@/components/shared/AnimatedSection";
import { blogPosts, pageKeywords } from "@/lib/data";
import { getCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Royal Studio blog — wedding planning tips, photography guides, bridal advice, and behind-the-scenes stories from Pakistan's luxury wedding photographers.",
  keywords: [pageKeywords.blog.primary, ...pageKeywords.blog.secondary],
  alternates: getCanonical("/blog"),
  openGraph: {
    title: "Royal Studio Journal",
    description: "Wedding planning tips, photography guides, bridal advice, and behind-the-scenes stories.",
    images: [{ url: "/portfolio/walima-03-venue-aerial.jpg", width: 1280, height: 720, alt: "Royal Studio wedding venue" }],
  },
  twitter: {
    images: ["/portfolio/walima-03-venue-aerial.jpg"],
  },
};

export default function BlogPage() {
  return (
    <main>
      <PageHeader
        title="Journal"
        description="Wedding planning, photography tips, bridal guides, and behind-the-scenes stories."
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
        ]}
      />

      <section className="section-padding bg-surface">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {blogPosts.map((post, i) => (
              <AnimatedSection key={post.slug} delay={i * 0.06}>
                <article className="group overflow-hidden rounded-[12px] border border-border bg-background shadow-premium transition-shadow hover:shadow-premium-lg">
                  <Link href={`/blog/${post.slug}`}>
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="33vw"
                      />
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-3 text-xs text-text-muted">
                        <span className="text-accent">{post.category}</span>
                        <span>·</span>
                        <time>{post.date}</time>
                      </div>
                      <h2 className="mt-2 font-display text-xl text-primary transition-colors group-hover:text-accent">
                        {post.title}
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-text-muted">
                        {post.excerpt}
                      </p>
                    </div>
                  </Link>
                </article>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
