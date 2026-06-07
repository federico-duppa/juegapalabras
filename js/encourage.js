// Mensajes alentadores hablados. Cada cierto número de festejos (entre 4 y 7,
// elegido al azar para que no sea monótono) una voz dice algo lindo: "¡Muy bueno!",
// "¡Excelente!", "¡Seguí así!". El conteo se guarda en el celular y es COMPARTIDO
// entre todos los juegos, así en el Modo Aventura la cadena se siente continua.
const Encourage = (() => {
  const KEY = "jp_encourage";
  const PHRASES = [
    "¡Muy bueno!", "¡Excelente!", "¡Seguí así!", "¡Vas genial!",
    "¡Qué crack!", "¡Sos un campeón!", "¡Increíble!", "¡Lo estás haciendo genial!",
    "¡Imparable!", "¡Bravo!",
  ];

  // Próximo umbral: entre 4 y 7 festejos.
  function nextThreshold() { return 4 + Math.floor(Math.random() * 4); }

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "{}");
      return { count: s.count || 0, threshold: s.threshold || nextThreshold() };
    } catch (e) { return { count: 0, threshold: nextThreshold() }; }
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* sin storage */ } }

  return {
    // Llamar cuando aparece la imagen de festejo (una palabra/ronda resuelta).
    // `enabled=false` (mute) no habla, pero igual cuenta.
    onCelebrate(enabled = true) {
      const s = load();
      s.count += 1;
      if (s.count >= s.threshold) {
        if (enabled && typeof Speech !== "undefined") {
          const phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
          Speech.cheer(phrase, true); // encola: suena DESPUÉS de leer la palabra
        }
        s.count = 0;
        s.threshold = nextThreshold();
      }
      save(s);
    },
  };
})();
