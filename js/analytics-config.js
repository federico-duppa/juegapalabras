// Configuración de analítica (Umami Cloud). El website-id es público (va en el HTML
// del sitio estático), no es un secreto. Para DESACTIVAR todo: dejá scriptUrl/siteId
// vacíos (el sitio sigue funcionando igual, en no-op).
const ANALYTICS_CONFIG = {
  provider: "umami",                                  // "umami" | "" (vacío = no-op)
  scriptUrl: "https://cloud.umami.is/script.js",
  siteId: "733a3483-3543-443c-bf82-26783486acc8",
  allowedHost: "federico-duppa.github.io",            // solo emite desde el sitio publicado
  debug: false,                                       // true = log en consola, NO envía
};
