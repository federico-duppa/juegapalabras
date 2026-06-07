// Versión de la app (se adjunta a los eventos de analítica; en el tooltip del corazón).
// Subila en cada release para correlacionar métricas entre versiones.
const APP_VERSION = "1.6.0";

// El COLOR del corazón del footer cambia en cada release: sirve para saber a simple
// vista qué versión estás viendo en el navegador (sin testear algo no publicado).
// Rotación sugerida: 💜 → 💙 → 💚 → 💛 → 🧡 → ❤️ → 🤍 → 🖤 → (volver a 💜)
const HEART_EMOJI = "🧡"; // v1.6.0

// Configuración de analítica (Umami Cloud). El website-id es público (va en el HTML
// del sitio estático), no es un secreto. Para DESACTIVAR todo: dejá scriptUrl/siteId
// vacíos (el sitio sigue funcionando igual, en no-op).
const ANALYTICS_CONFIG = {
  provider: "umami",                                  // "umami" | "" (vacío = no-op)
  scriptUrl: "https://cloud.umami.is/script.js",
  siteId: "733a3483-3543-443c-bf82-26783486acc8",
  allowedHost: "federico-duppa.github.io",            // solo emite desde el sitio publicado
  respectDoNotTrack: false,                           // false = trackea siempre; true = respeta DNT/GPC
  debug: false,                                       // true = log en consola, NO envía
};
