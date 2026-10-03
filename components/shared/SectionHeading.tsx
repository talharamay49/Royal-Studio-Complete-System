import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  label?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  dark?: boolean;
}

export default function SectionHeading({
  label,
  title,
  description,
  align = "center",
  className,
  dark = false,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-12 md:mb-16",
        align === "center" && "mx-auto max-w-3xl text-center",
        className
      )}
    >
      {label && (
        <p
          className={cn(
            "mb-3 text-xs font-medium tracking-[0.3em] uppercase",
            dark ? "text-accent" : "text-accent"
          )}
        >
          {label}
        </p>
      )}
      <h2
        className={cn(
          "font-display text-4xl leading-tight md:text-5xl lg:text-6xl",
          dark ? "text-secondary" : "text-primary"
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "mt-4 text-base leading-relaxed md:text-lg",
            dark ? "text-secondary/70" : "text-text-muted"
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
