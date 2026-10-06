import BreadcrumbNav from "@/components/layout/BreadcrumbNav";
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
        "no-print relative flex min-h-[38vh] sm:min-h-[44vh] items-end pt-24 overflow-hidden",
        dark ? "bg-[#111111] text-[#f5f2eb]" : "bg-background text-primary",
        className
      )}
    >
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}
      <div className="absolute inset-0 bg-[url('/portfolio/mehndi-01-chishtiya-taj-palace.jpg')] bg-cover bg-center opacity-25" />
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t",
          dark
            ? "from-[#111111] via-[#111111]/80 to-[#111111]/40"
            : "from-background via-background/80 to-background/40"
        )}
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl 2xl:max-w-[1600px] px-4 sm:px-6 pb-12 sm:pb-16 md:px-12 lg:px-20">
        <BreadcrumbNav
          items={breadcrumbs}
          variant={dark ? "hero" : "surface"}
          className="mb-4"
        />
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl break-words">
          {title}
        </h1>
        {description && (
          <p
            className={cn(
              "mt-3 sm:mt-4 max-w-2xl text-sm sm:text-base md:text-lg leading-relaxed",
              dark ? "text-[#f5f2eb]/75" : "text-text-muted"
            )}
          >
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
