/// <reference lib="webworker" />
import { defaultHandler, NavigationRoute, registerRoute } from "serwist";
import { CacheExpiration, CacheableResponsePlugin } from "serwist";
import type { PrecacheEntry } from "serwist";
import { Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope;

const revision = crypto.getRandomValues(new Uint8Array(16)).toString();

const precacheAndRoute = (entries: PrecacheEntry[]) =>
  entries.map((entry) =>
    typeof entry === "string" ? { url: entry, revision } : entry
  );

const serwist = new Serwist({
  precacheEntries: precacheAndRoute([
    { url: "/", revision },
    { url: "/offline", revision },
  ]),
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request }) => request.destination === "image",
      handler: defaultHandler,
      options: {
        cacheName: "images",
        expiration: new CacheExpiration("images", {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
        cacheableResponse: new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      },
    },
    {
      matcher: ({ request }) =>
        request.destination === "style" ||
        request.destination === "script" ||
        request.destination === "font",
      handler: defaultHandler,
      options: {
        cacheName: "static-resources",
        expiration: new CacheExpiration("static-resources", {
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        }),
        cacheableResponse: new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      },
    },
  ],
});

const navigationRoute = new NavigationRoute(serwist.handleFetch.bind(serwist), {
  denylist: [/^\/api\//],
});

serwist.registerRoute(navigationRoute);

serwist.addEventListeners();
