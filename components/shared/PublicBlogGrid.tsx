"use client";

import Image from "next/image";
import Link from "next/link";
import AnimatedSection from "@/components/shared/AnimatedSection";
import { usePublicWebsiteCMS } from "@/components/shared/StudioProfileContext";

export default function PublicBlogGrid() {
  const { blogPosts } = usePublicWebsiteCMS();

  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {blogPosts.map((post, i) => (
          <AnimatedSection key={post.slug} delay={i * 0.06}>
            <article className="group overflow-hidden rounded-[12px] border border-border bg-background shadow-premium transition-shadow hover:shadow-premium-lg">
              <Link href={`/blog/${post.slug}`}>
                <div className="relative aspect-[16/10] overflow-hidden">
                  {post.image.startsWith("data:") || post.image.startsWith("http") ? (
                    <img
                      src={post.image}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <Image
                      src={post.image}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="33vw"
                    />
                  )}
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
  );
}
