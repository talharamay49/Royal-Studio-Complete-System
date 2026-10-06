"use client";

import { useEffect } from "react";

/**
 * Global Scrollbar Visibility Manager
 * Ensures scrollbars across the entire application (both window and nested
 * scrollable containers) are only visible while actively scrolling and hide
 * automatically with a transparent track/thumb when idle.
 */
export default function ScrollbarVisibilityManager() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    let rootTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const elementTimeouts = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

    const markScrolling = (event?: Event) => {
      const htmlEl = document.documentElement;
      htmlEl.classList.add("is-scrolling");

      if (rootTimeoutId) {
        clearTimeout(rootTimeoutId);
      }
      rootTimeoutId = setTimeout(() => {
        htmlEl.classList.remove("is-scrolling");
      }, 750);

      const target = event?.target;
      if (target instanceof HTMLElement && target !== htmlEl && target !== document.body) {
        target.classList.add("is-scrolling");
        const prevTimer = elementTimeouts.get(target);
        if (prevTimer) {
          clearTimeout(prevTimer);
        }
        const timer = setTimeout(() => {
          target.classList.remove("is-scrolling");
          elementTimeouts.delete(target);
        }, 750);
        elementTimeouts.set(target, timer);
      }
    };

    const onScroll = (e: Event) => markScrolling(e);
    const onWheel = (e: Event) => markScrolling(e);
    const onTouchMove = (e: Event) => markScrolling(e);

    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("wheel", onWheel, { passive: true, capture: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true, capture: true });

    return () => {
      if (rootTimeoutId) clearTimeout(rootTimeoutId);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("touchmove", onTouchMove, { capture: true });
      document.documentElement.classList.remove("is-scrolling");
    };
  }, []);

  return null;
}
