"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useStudioTheme } from "./StudioProfileContext";
import { cn } from "@/lib/utils";

export interface ThemeToggleProps {
  variant?: "icon" | "pill" | "sidebar" | "navbar";
  showLabel?: boolean;
  className?: string;
}

/**
 * Synchronized Light / Dark Mode Toggle Component.
 * Uses the standard Tailwind CSS `dark` class strategy on `document.documentElement`
 * and synchronizes theme state across both the Public Portfolio Website and Admin ERP Portal.
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = "pill",
  showLabel = true,
  className,
}) => {
  const { resolvedMode, toggleThemeMode } = useStudioTheme();
  const isDark = resolvedMode === "dark";

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggleThemeMode}
        aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        className={cn(
          "inline-flex items-center justify-center p-2 rounded-lg border border-border bg-surface text-primary hover:border-accent hover:text-accent transition-all cursor-pointer",
          className
        )}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-accent" />
        ) : (
          <Moon className="w-4 h-4 text-accent" />
        )}
      </button>
    );
  }

  if (variant === "sidebar") {
    return (
      <button
        type="button"
        onClick={toggleThemeMode}
        aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        className={cn(
          "flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer",
          className
        )}
      >
        {isDark ? (
          <Sun className="w-3.5 h-3.5 text-accent shrink-0" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-accent shrink-0" />
        )}
        {showLabel && (
          <span className="truncate">{isDark ? "Light Mode" : "Dark Mode"}</span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleThemeMode}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-background hover:bg-accent/15 border border-border hover:border-accent/40 rounded-lg transition-all cursor-pointer",
        className
      )}
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 text-accent shrink-0" />
          {showLabel && <span>Light</span>}
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-accent shrink-0" />
          {showLabel && <span>Dark</span>}
        </>
      )}
    </button>
  );
};

export default ThemeToggle;
