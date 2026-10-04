"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, Home, AlertTriangle } from "lucide-react";

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const msg = String(error?.message || "");
    if (
      msg.includes("Failed to load chunk") ||
      msg.includes("ChunkLoadError") ||
      msg.includes("Loading chunk")
    ) {
      try {
        const reloadKey = "royalstudio_chunk_reload_ts";
        const lastReload = Number(sessionStorage.getItem(reloadKey) || "0");
        const now = Date.now();
        if (now - lastReload > 10000) {
          sessionStorage.setItem(reloadKey, String(now));
          window.location.reload();
        }
      } catch {
        // Ignore storage errors
      }
    }
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-background text-text">
      <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 text-center shadow-premium space-y-4">
        <div className="w-12 h-12 rounded-full bg-accent/15 text-accent mx-auto flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-primary">
          Something Unexpected Occurred
        </h2>
        <p className="text-xs text-text-muted leading-relaxed">
          {error?.message || "We encountered a temporary issue while rendering this view."}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-light text-[#111111] rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-background hover:bg-surface border border-border text-primary rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
          >
            <Home className="w-3.5 h-3.5 text-accent" />
            <span>Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
