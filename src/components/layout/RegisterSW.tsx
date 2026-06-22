"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "development") {
      navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.all(
          registrations
            .filter((registration) => registration.active?.scriptURL.endsWith("/sw.js"))
            .map((registration) => registration.unregister()),
        ),
      );
      caches.keys().then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith("finwise-")).map((key) => caches.delete(key))),
      );
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
