"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, MessageCircle } from "lucide-react";

interface SectionErrorBoundaryProps {
  children: React.ReactNode;
  sectionName?: string;
  className?: string;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Granular Section Error Boundary with user-friendly recovery UI.
 * Isolates component failures so the rest of the page continues rendering smoothly.
 */
export default class SectionErrorBoundary extends React.Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: "",
    };
  }

  static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || "Unable to load this section right now.",
    };
  }

  componentDidCatch(error: Error) {
    if (typeof window !== "undefined") {
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
          // Ignore storage error
        }
      }
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="region"
          aria-label={`${this.props.sectionName || "Section"} recovery panel`}
          className={
            this.props.className ||
            "mx-auto my-8 max-w-2xl rounded-2xl border border-border bg-surface p-6 sm:p-8 text-center shadow-premium"
          }
        >
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent">
            <AlertTriangle size={20} />
          </div>
          <h3 className="font-display text-xl sm:text-2xl text-primary">
            {this.props.sectionName
              ? `${this.props.sectionName} Temporarily Unavailable`
              : "Section Temporarily Unavailable"}
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-text-muted max-w-md mx-auto leading-relaxed">
            We encountered a minor issue displaying this section. You can retry loading it or reach our booking desk directly.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#111111] transition-all hover:bg-accent-light cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Retry Section</span>
            </button>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-primary transition-all hover:border-accent hover:text-accent"
            >
              <MessageCircle size={14} className="text-accent" />
              <span>Contact Studio</span>
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
