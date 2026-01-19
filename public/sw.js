self.addEventListener("install", (_event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (_event) => {
  self.clients.claim();
});

self.addEventListener("fetch", () => {});
