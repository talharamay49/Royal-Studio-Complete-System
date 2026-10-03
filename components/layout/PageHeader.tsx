import Link from "next/link";
import { getBreadcrumbSchema } from "@/lib/seo";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: { name: string; url: string }[];
  dark?: boolean;
  className?: string;
}

export default function PageHeader({
  title,
  description,
  breadcrumbs,
  dark = true,
  className,
}: PageHeaderProps) {
  const schema = breadcrumbs ? getBreadcrumbSchema(breadcrumbs) : null;

  return (
    <section
      className={cn(
        "relative flex min-h-[45vh] items-end pt-24",
        dark ? "bg-primary text-secondary" : "bg-background text-primary",
        className
      )}
    >
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}
      <div className="absolute inset-0 bg-[url('/portfolio/mehndi-01-chishtiya-taj-palace.jpg')] bg-cover bg-center opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-primary/40" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 md:px-12">
        {breadcrumbs && (
          <nav className="mb-4 text-xs tracking-widest uppercase text-secondary/60">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.url}>
                {i > 0 && <span className="mx-2">/</span>}
                {i === breadcrumbs.length - 1 ? (
                  <span className="text-accent">{crumb.name}</span>
                ) : (
                  <Link href={crumb.url} className="hover:text-accent">
                    {crumb.name}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl">{title}</h1>
        {description && (
          <p className="mt-4 max-w-2xl text-base text-secondary/70 md:text-lg">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
