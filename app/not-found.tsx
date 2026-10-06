import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[75vh] flex-col items-center justify-center bg-surface px-6 py-24 text-center">
      <p className="text-xs font-semibold tracking-[0.3em] uppercase text-accent">
        404 · Page Not Found
      </p>
      <h1 className="mt-3 font-display text-4xl text-primary sm:text-5xl">
        This Frame Couldn&apos;t Be Found
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-text-muted">
        The page you are looking for may have been moved or no longer exists.
        Explore our wedding portfolio or return to the Royal Studio homepage.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Button asChild variant="accent">
          <Link href="/">Back to Home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/portfolio">Explore Portfolio</Link>
        </Button>
      </div>
    </main>
  );
}
