// Analítica anónima y agregada (wrapper provider-agnóstico sobre Umami Cloud).
// - Anónima: solo conteos de eventos con dimensiones acotadas (juego, categoría).
//   Nunca PII, ni la palabra individual.
// - Respeta Do Not Track / Global Privacy Control (no-op total).
// - No-op si no está configurada o si no estamos en el host publicado (mata localhost).
// - Nunca lanza errores al juego (todo en try/catch). No bloquea nada.
const Analytics = (() => {
  const C = (typeof ANALYTICS_CONFIG !== "undefined") ? ANALYTICS_CONFIG : {};
  let mode = "off";     // "off" | "debug" | "live"
  let ready = false;    // proveedor cargado
  let failed = false;   // el script no cargó
  let started = false;  // init() ya corrió
  let queue = [];       // eventos disparados antes de cargar el proveedor
  let wordCat = null;   // mapa palabra -> categoría (lazy)

  function privacyOptOut() {
    try {
      return navigator.doNotTrack === "1" || window.doNotTrack === "1" ||
        navigator.msDoNotTrack === "1" || navigator.globalPrivacyControl === true;
    } catch (e) { return false; }
  }

  function send(name, props) {
    try { if (window.umami && window.umami.track) window.umami.track(name, props || {}); } catch (e) { /* swallow */ }
  }
  function flush() { ready = true; while (queue.length) { const [n, p] = queue.shift(); send(n, p); } }

  function injectUmami() {
    try {
      if (window.umami) { ready = true; return; }
      const s = document.createElement("script");
      s.async = true;
      s.src = C.scriptUrl;
      s.setAttribute("data-website-id", C.siteId);
      s.onload = flush;
      s.onerror = () => { failed = true; };
      document.head.appendChild(s);
    } catch (e) { failed = true; }
  }

  return {
    // Decide si la analítica está activa e inyecta el proveedor. Llamar 1 vez por página.
    init() {
      try {
        if (started) return; started = true;
        if (privacyOptOut()) { mode = "off"; return; }
        if (!C.provider || !C.scriptUrl || !C.siteId) { mode = "off"; return; }
        if (C.debug) { mode = "debug"; return; }                 // local: log, no envía
        if (location.hostname !== C.allowedHost) { mode = "off"; return; } // mata localhost
        mode = "live";
        injectUmami();
      } catch (e) { mode = "off"; }
    },

    // Registra un evento. props = objeto plano de valores cortos.
    track(name, props) {
      try {
        if (mode === "debug") { console.log("[analytics]", name, props || {}); return; }
        if (mode !== "live" || failed) return;
        if (ready) send(name, props); else queue.push([name, props]);
      } catch (e) { /* swallow */ }
    },

    pageview() { /* Umami auto-trackea pageviews al cargar; shim por simetría */ },

    // Palabra -> categoría (sin enviar la palabra). Devuelve la key o "?".
    catOf(word) {
      try {
        if (!wordCat && typeof WORDS !== "undefined") {
          wordCat = Object.fromEntries(WORDS.map((o) => [o.w, o.c]));
        }
        return (wordCat && wordCat[word]) || "?";
      } catch (e) { return "?"; }
    },
  };
})();
