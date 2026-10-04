"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

/**
 * Framer Motion route transition wrapper for RootLayout.
 * Smoothly fades pages in when navigating between routes across the portfolio
 * and automatically recovers from stale Next.js/Turbopack chunk reloads.
 */
export default function PageTransitionWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    const handleChunkError = (message: string) => {
      if (
        message.includes("Failed to load chunk") ||
        message.includes("ChunkLoadError") ||
        message.includes("Loading chunk")
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
    };

    const onError = (event: ErrorEvent) => {
      const msg = String(event?.message || event?.error?.message || "");
      handleChunkError(msg);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = String(event?.reason?.message || event?.reason || "");
      handleChunkError(msg);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  if (pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
