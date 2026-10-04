"use client";

import Link from "next/link";
import AnimatedSection from "@/components/shared/AnimatedSection";
import OptimizedThumbnail from "@/components/shared/OptimizedThumbnail";
import { PublicBlogGridSkeleton } from "@/components/shared/SkeletonScreens";
import { usePublicWebsiteCMS } from "@/components/shared/StudioProfileContext";

export default function PublicBlogGrid() {
  const { blogPosts, isLoading } = usePublicWebsiteCMS();

  if (isLoading) {
    return <PublicBlogGridSkeleton count={3} />;
  }

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[1600px]">
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {blogPosts.map((post, i) => (
          <AnimatedSection key={post.slug} delay={i * 0.06}>
            <article className="group overflow-hidden rounded-[12px] border border-border bg-background shadow-premium transition-shadow hover:shadow-premium-lg">
              <Link href={`/blog/${post.slug}`}>
                <OptimizedThumbnail
                  src={post.image}
                  alt={post.title}
                  aspect="wide"
                  priority={i < 2}
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
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
