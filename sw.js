// Service worker de JuegaPalabras: precachea el "app shell" para que ande offline
// y cargue rápido. La versión se bumpea en cada deploy (junto con APP_VERSION) para
// purgar el caché viejo. Salta Umami y Google Fonts (necesitan red / fallan suave).
const CACHE_VERSION = "1.2.0";
const CACHE_NAME = "juegapalabras-" + CACHE_VERSION;

const PRECACHE = [
  "./", "./index.html", "./album.html", "./medallas.html", "./manifest.json",
  "./css/main.css",
  "./js/sound.js", "./js/confetti.js", "./js/speech.js", "./js/progress.js",
  "./js/qwerty.js", "./js/words.js", "./js/theme.js", "./js/idle.js",
  "./js/analytics-config.js", "./js/analytics.js", "./js/sw-register.js",
  "./games/word-guesser/index.html", "./games/word-guesser/style.css", "./games/word-guesser/game.js",
  "./games/ordena/index.html", "./games/ordena/style.css", "./games/ordena/game.js",
  "./games/letra-perdida/index.html", "./games/letra-perdida/style.css", "./games/letra-perdida/game.js",
  "./games/memoria/index.html", "./games/memoria/style.css", "./games/memoria/game.js",
  "./icons/icon-192.png", "./icons/icon-512.png", "./apple-touch-icon.png", "./favicon.png",
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(PRECACHE)).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((n) => (n !== CACHE_NAME ? caches.delete(n) : null))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  // Recursos externos (analítica / fuentes): a la red, sin cachear; si falla, no rompe.
  if (req.url.includes("umami") || req.url.includes("gstatic") || req.url.includes("googleapis")) return;
  // Mismo origen: cache-first con relleno en segundo plano.
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
    })
  );
});
