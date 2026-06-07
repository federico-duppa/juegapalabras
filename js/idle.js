// Resalta el botón de pista si el jugador pasa un rato sin tocar nada, para que
// pueda destrabarse. Cualquier toque/tecla lo reinicia. Además registra (anónimo)
// "got_stuck" una sola vez por palabra cuando el botón llega a brillar.
const IdleHint = (() => {
  let timer = null, btn = null, ms = 8000, active = false, bound = false;
  let game = "", stuckSent = false;

  function track(name, props) {
    try { if (typeof Analytics !== "undefined") Analytics.track(name, props); } catch (e) { /* swallow */ }
  }

  function glow() {
    if (active && btn && !btn.disabled) {
      btn.classList.add("glow");
      if (!stuckSent) { stuckSent = true; track("got_stuck", { game }); }
    }
  }

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
    start(button, idleMs, gameName) { btn = button; ms = idleMs || 8000; game = gameName || ""; active = true; stuckSent = false; bind(); reset(); },
    resume() { active = true; stuckSent = false; reset(); },   // palabra nueva: re-permite got_stuck
    stop() { active = false; clearTimeout(timer); if (btn) btn.classList.remove("glow"); },
  };
})();
