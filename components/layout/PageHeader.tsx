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
        "relative flex min-h-[42vh] sm:min-h-[45vh] items-end pt-24 overflow-hidden",
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

      <div className="relative z-10 mx-auto w-full max-w-7xl 2xl:max-w-[1600px] px-4 sm:px-6 pb-12 sm:pb-16 md:px-12">
        <BreadcrumbNav
          items={breadcrumbs}
          variant={dark ? "hero" : "surface"}
          className="mb-4"
        />
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl break-words">
          {title}
        </h1>
        {description && (
          <p className="mt-3 sm:mt-4 max-w-2xl text-sm sm:text-base text-secondary/70 md:text-lg leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
