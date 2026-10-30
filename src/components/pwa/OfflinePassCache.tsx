"use client";

import { useEffect } from "react";

export function OfflinePassCache({ urls }: { urls: string[] }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || urls.length === 0) {
      return;
    }

    let cancelled = false;

    const cachePages = async () => {
      // The global register component starts the worker on first load. Wait
      // for it to activate (with a timeout so dev/no-SW environments no-op).
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => {
          window.setTimeout(() => resolve(null), 10_000);
        }),
      ]);

      if (!registration || cancelled) {
        return;
      }

      const worker =
        registration.active ?? navigator.serviceWorker.controller ?? null;

      const assets = Array.from(
        document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>(
          "script[src], link[rel='stylesheet'][href], link[rel='preload'][href], link[rel='modulepreload'][href]",
        ),
      )
        .map((element) =>
          element instanceof HTMLScriptElement ? element.src : element.href,
        )
        .filter((url) => url.startsWith(window.location.origin));

      worker?.postMessage({
        type: "CACHE_PAGE",
        urls,
        assets,
      });
    };

    cachePages().catch(() => {
      // Offline caching is best-effort; the page still works normally.
    });

    return () => {
      cancelled = true;
    };
  }, [urls]);

  return null;
}
