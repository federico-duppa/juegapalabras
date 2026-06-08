// Versión de la app + color del corazón del footer.
// (Este archivo se llamaba "analytics-config" pero la analítica fue eliminada; ahora
// solo guarda la versión. Se mantiene el nombre para no tocar los <script> de cada página.)
//
// En cada deploy subí APP_VERSION y CACHE_VERSION (sw.js) en lockstep, y rotá el color
// del corazón (sirve para saber a simple vista qué versión estás viendo):
//   💜 → 💙 → 💚 → 💛 → 🧡 → ❤️ → 🤍 → 🖤 → (volver a 💜)
const APP_VERSION = "1.11.1";
const HEART_EMOJI = "💚"; // v1.11.1
