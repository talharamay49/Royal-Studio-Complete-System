import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
import { blogPosts as defaultBlogPosts } from "@/lib/data";
import { ROYAL_BLUR_DATA_URL } from "@/lib/blur-placeholder";
import {
  getBlogPostingSchema,
  getBreadcrumbSchema,
  injectSocialImageMetadata,
} from "@/lib/seo";
import { dbInstance } from "@/lib/admin/db";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const db = dbInstance.getData();
  const posts =
    db.cms?.blogPosts && db.cms.blogPosts.length > 0
      ? db.cms.blogPosts
      : defaultBlogPosts;
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const db = dbInstance.getData();
  const posts =
    db.cms?.blogPosts && db.cms.blogPosts.length > 0
      ? db.cms.blogPosts
      : defaultBlogPosts;
  const post = posts.find((p) => p.slug === slug);
  if (!post) return { title: "Post Not Found" };

  const socialMeta = injectSocialImageMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    imageUrl: post.image,
    category: post.category || "blog",
    type: "article",
  });

  return {
    title: post.title,
    description: post.excerpt,
    keywords: [post.category, post.title, "Royal Studio wedding blog", "Pakistan wedding photography"],
    ...socialMeta,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const db = dbInstance.getData();
  const posts =
    db.cms?.blogPosts && db.cms.blogPosts.length > 0
      ? db.cms.blogPosts
      : defaultBlogPosts;
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  const schema = [
    getBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Blog", url: "/blog" },
      { name: post.title, url: `/blog/${post.slug}` },
    ]),
    getBlogPostingSchema(post),
  ];

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <article className="pt-24">
        <div className="relative h-[50vh] min-h-[320px]">
          <Image
            src={post.image}
            alt={post.title}
            fill
            priority
            placeholder="blur"
            blurDataURL={ROYAL_BLUR_DATA_URL}
            referrerPolicy="no-referrer"
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-primary/50" />
          <div className="absolute inset-0 flex items-end">
            <div className="mx-auto w-full max-w-3xl 2xl:max-w-4xl px-4 sm:px-6 pb-12 md:px-12">
              <BreadcrumbNav
                items={[
                  { name: "Home", url: "/" },
                  { name: "Journal & Blog", url: "/blog" },
                  { name: post.title, url: `/blog/${post.slug}` },
                ]}
                variant="hero"
                className="mb-3"
              />
              <p className="text-xs tracking-widest uppercase text-accent">
                {post.category} · {post.date}
              </p>
              <h1 className="mt-2 font-display text-3xl sm:text-4xl text-secondary md:text-5xl">
                {post.title}
              </h1>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-3xl 2xl:max-w-4xl px-6 py-16 md:px-12">
          <p className="text-lg leading-relaxed text-text-muted">{post.excerpt}</p>
          <div className="prose prose-neutral mt-8 max-w-none space-y-5">
            {post.content.split("\n\n").map((paragraph, i) => (
              <p key={i} className="leading-relaxed text-text">
                {paragraph.split(/(\*\*.+?\*\*)/g).map((chunk, j) =>
                  chunk.startsWith("**") && chunk.endsWith("**") ? (
                    <strong key={j} className="text-primary">
                      {chunk.slice(2, -2)}
                    </strong>
                  ) : (
                    chunk
                  )
                )}
              </p>
            ))}
          </div>
          <Link
            href="/blog"
            className="mt-10 inline-block text-sm font-medium tracking-widest uppercase text-accent hover:underline"
          >
            ← Back to Blog
          </Link>
        </div>
      </article>
    </main>
  );
}
