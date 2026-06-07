// ===== Adiviná la Palabra — lógica =====

// Normaliza para comparar: MAYÚSCULAS y sin tildes, PERO conserva la Ñ.
// Recorre letra por letra: a la Ñ la deja igual, al resto le saca el acento.
function norm(s) {
  return Array.from(s.toUpperCase())
    .map((ch) =>
      ch === "Ñ" ? "Ñ" : ch.normalize("NFD").replace(/[̀-ͯ]/g, "")
    )
    .join("");
}

// Quita la tilde de UNA letra (para mostrar en el casillero lo que hay que tocar).
function baseChar(ch) {
  return norm(ch);
}

// Mezcla in-place (Fisher–Yates)
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Baraja con rampa suave: primero las palabras cortas, mezclando las de igual largo.
// Usa el tema elegido (o todas las palabras si el tema quedara vacío).
function buildDeck() {
  const pool = Theme.words().length ? Theme.words() : WORDS;
  const byLen = {};
  pool.forEach((x) => {
    const n = Array.from(x.w).length;
    (byLen[n] ||= []).push(x);
  });
  const deck = [];
  Object.keys(byLen).map(Number).sort((a, b) => a - b)
    .forEach((n) => shuffle(byLen[n]).forEach((x) => deck.push(x)));
  return deck;
}

const PRAISES = ["¡Muy bien!", "¡Genial!", "¡Excelente!", "¡Buenísimo!", "¡Lo lograste!", "¡Eres un crack!", "¡Increíble!"];
const NUDGES = ["¡Casi! Intenta de nuevo 💪", "¡Vas bien! Inténtalo otra vez 😊", "¡Ups! Mira el emoji 🤔", "¡No pasa nada, sigue! 🌈"];

const State = {
  deck: [],
  i: 0,
  current: null,
  letters: [],   // [{ch, hint}|null] por posición
  streak: 0,
  solved: false,
};

// ——— Render ———
const el = (id) => document.getElementById(id);

function renderStats() {
  el("stars").textContent = "⭐ " + Progress.stars();
  el("streak").textContent = "🔥 " + State.streak;
}

function renderClue() {
  el("emoji").textContent = State.current.e;
  el("cat").textContent = CAT_LABEL[State.current.c] || "✨";
}

function renderSlots(extraClass = "") {
  const slots = el("slots");
  slots.className = "slots " + extraClass;
  slots.innerHTML = "";
  const answer = Array.from(State.current.w);
  answer.forEach((_, idx) => {
    const d = document.createElement("div");
    d.className = "slot";
    const cell = State.letters[idx];
    if (cell) {
      d.textContent = cell.ch;
      d.classList.add("filled");
      if (cell.hint) d.classList.add("hint");
      if (State.solved) d.classList.add("correct");
    }
    slots.appendChild(d);
  });
}

function buildKeyboard() {
  const kb = el("keyboard");
  kb.innerHTML = "";

  function spacer() {
    const s = document.createElement("div");
    s.className = "key spacer";
    return s;
  }

  QWERTY_ROWS.forEach((row, ri) => {
    const r = document.createElement("div");
    r.className = "krow";
    row.forEach((ch) => {
      const b = document.createElement("button");
      b.className = "key";
      b.textContent = ch;
      b.addEventListener("click", () => typeLetter(ch));
      r.appendChild(b);
    });
    // Última fila: rellena hasta 10 columnas y pone "borrar" a la derecha.
    if (ri === QWERTY_ROWS.length - 1) {
      while (r.children.length < QWERTY_COLS - 1) r.appendChild(spacer());
      const back = document.createElement("button");
      back.className = "key";
      back.textContent = "⌫";
      back.setAttribute("aria-label", "Borrar");
      back.addEventListener("click", deleteLetter);
      r.appendChild(back);
    }
    kb.appendChild(r);
  });
}

// ——— Juego ———
// ——— Sesión: guardar la partida para continuar al volver ———
const SKEY = "jp_sess_word-guesser";

function saveSession() {
  try {
    localStorage.setItem(SKEY, JSON.stringify({
      theme: Theme.get(),                     // tema con el que se armó el mazo
      deckWords: State.deck.map((d) => d.w),  // orden del mazo
      pos: State.i - 1,                       // índice de la palabra actual
      streak: State.streak,
      letters: State.letters,                 // lo que ya escribió
      solved: State.solved,
    }));
  } catch (e) { /* sin storage: no pasa nada */ }
}

function restoreSession() {
  let s;
  try { s = JSON.parse(localStorage.getItem(SKEY) || "null"); } catch (e) { return false; }
  if (!s || !Array.isArray(s.deckWords) || s.deckWords.length === 0) return false;
  if (s.theme !== Theme.get()) return false; // cambió el tema: empezar de cero
  const map = new Map(WORDS.map((o) => [o.w, o]));
  const deck = s.deckWords.map((w) => map.get(w)).filter(Boolean);
  if (deck.length === 0) return false;

  let pos = typeof s.pos === "number" ? s.pos : 0;
  if (s.solved) pos += 1; // ya había ganado esa palabra: seguir con la siguiente
  State.deck = deck;
  if (pos >= deck.length) { State.deck = buildDeck(); pos = 0; }

  State.current = State.deck[pos];
  State.i = pos + 1;       // como si nextWord ya hubiera avanzado
  State.streak = s.streak || 0;
  State.solved = false;
  const len = Array.from(State.current.w).length;
  State.letters = (!s.solved && Array.isArray(s.letters) && s.letters.length === len)
    ? s.letters
    : Array.from(State.current.w).map(() => null);

  el("message").textContent = "";
  renderClue();
  renderSlots();
  renderStats();
  saveSession();
  return true;
}

function nextWord() {
  if (State.i >= State.deck.length) {
    State.deck = buildDeck();
    State.i = 0;
  }
  State.current = State.deck[State.i++];
  State.letters = Array.from(State.current.w).map(() => null);
  State.solved = false;
  el("message").textContent = "";
  renderClue();
  renderSlots();
  renderStats();
  saveSession();
  IdleHint.resume();
}

function firstEmpty() {
  return State.letters.findIndex((c) => c === null);
}

function typeLetter(ch) {
  if (State.solved) return;
  Sound.unlock();
  const idx = firstEmpty();
  if (idx === -1) return;
  State.letters[idx] = { ch: baseChar(ch), hint: false };
  Sound.tap();
  renderSlots();
  saveSession();
  if (firstEmpty() === -1) check();
}

function deleteLetter() {
  if (State.solved) return;
  // borra la última letra que no sea pista
  for (let i = State.letters.length - 1; i >= 0; i--) {
    if (State.letters[i] && !State.letters[i].hint) {
      State.letters[i] = null;
      Sound.back();
      renderSlots();
      saveSession();
      return;
    }
  }
}

function giveHint() {
  if (State.solved) return;
  Sound.unlock();
  const idx = firstEmpty();
  if (idx === -1) return;
  const answer = Array.from(State.current.w);
  State.letters[idx] = { ch: baseChar(answer[idx]), hint: true };
  Sound.hint();
  renderSlots();
  saveSession();
  if (firstEmpty() === -1) check();
}

function check() {
  const typed = State.letters.map((c) => c.ch).join("");
  if (norm(typed) === norm(State.current.w)) {
    win();
  } else {
    lose();
  }
}

function win() {
  State.solved = true;
  State.streak += 1;
  IdleHint.stop();
  const res = Progress.solve("word-guesser", State.streak, State.current.w);
  renderSlots();           // pinta verde
  renderStats();
  saveSession();           // guarda como resuelta (al volver, sigue con la próxima)
  Speech.say(State.current.w, !Sound.isMuted()); // lee la palabra en voz alta
  const milestone = State.streak > 0 && State.streak % 5 === 0;
  const big = milestone || res.leveledUp || res.newMedals.length > 0;
  if (big) Sound.levelUp(); else Sound.correct();
  Confetti.burst();
  if (big) setTimeout(() => Confetti.burst(window.innerWidth * 0.3, window.innerHeight * 0.3), 250);
  setTimeout(() => showCelebration(res, milestone), 450);
}

function lose() {
  Sound.wrong();
  State.streak = 0;
  renderStats();
  renderSlots("shake");
  el("message").textContent = NUDGES[Math.floor(Math.random() * NUDGES.length)];
  saveSession();
  // borra lo que escribió (deja las pistas) para reintentar
  setTimeout(() => {
    State.letters = State.letters.map((c) => (c && c.hint ? c : null));
    renderSlots();
    saveSession();
  }, 500);
}

function showCelebration(res, milestone) {
  el("ov-emoji").textContent = State.current.e;
  el("ov-word").textContent = State.current.w; // muestra la ortografía correcta (con tilde)
  el("ov-praise").textContent = milestone
    ? `¡Racha de ${State.streak}! 🏆`
    : PRAISES[Math.floor(Math.random() * PRAISES.length)];
  // Bonus: subida de nivel y medallas nuevas
  const parts = [];
  if (res.leveledUp) parts.push(`<div class="lvl-up">¡Subiste a ${res.level.emoji} ${res.level.name}!</div>`);
  res.newMedals.forEach((m) => parts.push(`<div class="medal-win">${m.emoji} Nueva medalla: ${m.name}</div>`));
  el("ov-bonus").innerHTML = parts.join("");
  el("overlay").classList.add("show");
}

function continueGame() {
  el("overlay").classList.remove("show");
  nextWord();
}

// Resalta brevemente la tecla en pantalla cuando se usa el teclado físico.
function pressFeedback(label) {
  const keys = el("keyboard").querySelectorAll(".key");
  for (const k of keys) {
    if (k.textContent === label) {
      k.classList.add("pressed");
      setTimeout(() => k.classList.remove("pressed"), 130);
      break;
    }
  }
}

// Teclado físico (cómodo para jugar/probar en la compu)
function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  // Con el festejo abierto, Enter o Espacio pasan a la siguiente.
  if (el("overlay").classList.contains("show")) {
    if (e.key === "Enter" || e.key === " ") { continueGame(); e.preventDefault(); }
    return;
  }

  if (e.key === "Backspace") { deleteLetter(); pressFeedback("⌫"); e.preventDefault(); return; }
  if (e.key.length !== 1) return;

  const base = norm(e.key); // MAYÚSCULA sin tilde; conserva la Ñ
  if (/^[A-ZÑ]$/.test(base)) {
    typeLetter(base);
    pressFeedback(base);
  }
}

// Mute
function setupMute() {
  const btn = el("mute");
  btn.textContent = Sound.isMuted() ? "🔇" : "🔊";
  btn.addEventListener("click", () => {
    const m = Sound.toggleMute();
    btn.textContent = m ? "🔇" : "🔊";
    Sound.unlock();
  });
}

// ——— Init ———
function init() {
  Progress.load();
  Progress.touchDaily();
  buildKeyboard();
  setupMute();
  el("hint-btn").addEventListener("click", giveHint);
  el("continue-btn").addEventListener("click", continueGame);
  document.addEventListener("keydown", onKey);
  IdleHint.start(el("hint-btn"), 8000); // brilla la pista tras 8s sin tocar nada
  // Continuar la partida anterior si existe; si no, empezar de cero.
  if (!restoreSession()) {
    State.deck = buildDeck();
    State.i = 0;
    nextWord();
  }
}

document.addEventListener("DOMContentLoaded", init);
