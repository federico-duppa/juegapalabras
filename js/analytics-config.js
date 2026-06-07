// Versión de la app (se muestra en el footer y se adjunta a los eventos de analítica).
// Subila en cada release para correlacionar métricas entre versiones.
const APP_VERSION = "1.1.0";

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
