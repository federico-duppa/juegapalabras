// Resalta el botón de pista si el jugador pasa un rato sin tocar nada,
// para que pueda destrabarse si está con dudas. Cualquier toque/tecla lo reinicia.
const IdleHint = (() => {
  let timer = null, btn = null, ms = 8000, active = false, bound = false;

  function glow() { if (active && btn && !btn.disabled) btn.classList.add("glow"); }

  function reset() {
    if (btn) btn.classList.remove("glow");
    clearTimeout(timer);
    if (active) timer = setTimeout(glow, ms);
  }

  function bind() {
    if (bound) return;
    bound = true;
    ["keydown", "pointerdown", "touchstart", "click"].forEach((ev) =>
      document.addEventListener(ev, reset, { passive: true }));
  }

  return {
    // button = botón de pista; idleMs = segundos de inactividad (en ms)
    start(button, idleMs) { btn = button; ms = idleMs || 8000; active = true; bind(); reset(); },
    resume() { active = true; reset(); },   // al empezar una palabra nueva
    stop() { active = false; clearTimeout(timer); if (btn) btn.classList.remove("glow"); }, // al acertar
  };
})();
