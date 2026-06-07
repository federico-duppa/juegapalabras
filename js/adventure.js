// Modo Aventura: en vez de quedarse en un solo juego, el chico va rotando entre
// los distintos juegos. Cada vez que resuelve y toca "Siguiente", salta al próximo
// juego de la rotación. Así no se estanca y la partida se siente más dinámica.
//
// Reusa los juegos tal cual: lo único que cambia es que, con la aventura activa,
// el botón "Siguiente" del festejo lleva a OTRO juego en lugar de a otra ronda.
//
// Ciclo de vida del flag (clave): el menú SIEMPRE apaga la aventura al cargar, y la
// tarjeta de aventura la prende justo antes de navegar. Así, llegar al menú por
// cualquier vía (botón Menú, botón Atrás de Android, reabrir la app) termina la
// aventura, y tocar un juego puntual nunca se comporta como aventura por error.
const Adventure = (() => {
  const KEY = "jp_adventure";       // "1" mientras está activa
  const POS = "jp_adventure_pos";   // índice actual dentro de SEQ
  const SEQ = ["word-guesser", "letra-perdida", "ordena", "encuentra-error", "memoria"];

  function getPos() {
    try { return parseInt(localStorage.getItem(POS) || "0", 10) || 0; } catch (e) { return 0; }
  }
  function setPos(n) {
    try { localStorage.setItem(POS, String(((n % SEQ.length) + SEQ.length) % SEQ.length)); } catch (e) { /* sin storage */ }
  }

  // Ruta relativa al juego según dónde estemos: desde un juego es "../<x>/", desde
  // el menú es "games/<x>/". (El sitio vive en un subpath, todo es relativo.)
  function gameUrl(game) {
    const inGame = /\/games\//.test(location.pathname);
    return (inGame ? "../" : "games/") + game + "/index.html";
  }

  return {
    active() {
      try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; }
    },

    // Apaga la aventura (llamado por el menú al cargar).
    stop() { try { localStorage.removeItem(KEY); } catch (e) { /* sin storage */ } },

    // Arranca la aventura desde un juego al azar y navega hacia él.
    // Se llama desde el menú (la tarjeta de Modo Aventura).
    start() {
      const pos = Math.floor(Math.random() * SEQ.length);
      try { localStorage.setItem(KEY, "1"); } catch (e) { /* sin storage */ }
      setPos(pos);
      location.href = gameUrl(SEQ[pos]);
    },

    // Avanza al próximo juego de la rotación y navega. Se llama desde el botón
    // "Siguiente" de cada juego cuando la aventura está activa.
    go() {
      const next = getPos() + 1;
      setPos(next);
      location.href = gameUrl(SEQ[((next % SEQ.length) + SEQ.length) % SEQ.length]);
    },
  };
})();

// En las páginas de juego: si la aventura está activa, marca la UI (borde, badge y
// texto del botón) para que se note que estás en la aventura.
document.addEventListener("DOMContentLoaded", () => {
  if (!/\/games\//.test(location.pathname)) return; // el menú maneja su propio flag
  if (!Adventure.active()) return;
  document.body.classList.add("adventure");
  const cont = document.getElementById("continue-btn");
  if (cont) cont.textContent = "Siguiente juego 🎲";
  const h1 = document.querySelector(".topbar h1");
  if (h1 && !h1.querySelector(".adv-badge")) {
    const b = document.createElement("span");
    b.className = "adv-badge";
    b.textContent = "🧭";
    b.title = "Modo Aventura";
    h1.appendChild(b);
  }
});
