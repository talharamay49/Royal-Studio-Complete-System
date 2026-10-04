"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Global NProgress-style top viewport loading bar component.
 * Provides immediate visual feedback at the top of the screen during route transitions.
 */
export default function TopLoadingBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const prevPathRef = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startBar = () => {
    clearTimers();
    setVisible(true);
    setProgress(25);

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) return prev;
        return prev + Math.max(2, (85 - prev) * 0.2);
      });
    }, 180);

    // Safety auto-complete if navigation stays on same URL or hash
    timerRef.current = setTimeout(() => {
      completeBar();
    }, 3500);
  };

  const completeBar = () => {
    clearTimers();
    setProgress(100);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 260);
  };

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      completeBar();
    }
  }, [pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const target = anchor.getAttribute("target");
      if (!href || target === "_blank" || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) {
          return;
        }
        startBar();
      } catch {
        // Ignore invalid URLs
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      clearTimers();
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      role="progressbar"
      aria-label="Page loading progress"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="pointer-events-none fixed top-0 left-0 right-0 z-[150] h-[3px] overflow-hidden"
    >
      <div
        className="h-full bg-gradient-to-r from-[#C9A24D] via-[#E5C97B] to-[#C9A24D] shadow-[0_0_12px_rgba(201,162,77,0.9)] transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}
