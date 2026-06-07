// ===== Ordena las Letras — lógica =====
// Se muestran SOLO las letras de la palabra, cada una en su lugar del teclado
// QWERTY, y el chico las toca en orden para armar la palabra. Refuerza ortografía.

// MAYÚSCULAS sin tildes, conserva la Ñ.
function norm(s) {
  return Array.from(s.toUpperCase())
    .map((ch) => (ch === "Ñ" ? "Ñ" : ch.normalize("NFD").replace(/[̀-ͯ]/g, "")))
    .join("");
}
function baseChar(ch) { return norm(ch); }

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Rampa suave: cortas primero. Usa el tema elegido (o todas si quedara vacío).
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
const NUDGES = ["¡Casi! Mira el orden 🤔", "¡Probá de nuevo! 💪", "¡Ups! Fíjate bien 👀", "¡No pasa nada, sigue! 🌈"];

const State = {
  deck: [],
  i: 0,
  current: null,
  base: [],         // palabra en letras base (sin tilde)
  letters: [],      // [{ch}|null] por casillero
  streak: 0,
  solved: false,
};

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
  State.base.forEach((_, idx) => {
    const d = document.createElement("div");
    d.className = "slot";
    const cell = State.letters[idx];
    if (cell) {
      d.textContent = cell.ch;
      d.classList.add("filled");
      if (State.solved) d.classList.add("correct");
    }
    slots.appendChild(d);
  });
}

// Teclado con SOLO las letras de la palabra, en posición QWERTY.
function buildKeyboard() {
  const letterSet = new Set(State.base);
  const kb = el("keyboard");
  kb.innerHTML = "";
  const spacer = () => { const s = document.createElement("div"); s.className = "key spacer"; return s; };

  QWERTY_ROWS.forEach((row, ri) => {
    const r = document.createElement("div");
    r.className = "krow";
    row.forEach((ch) => {
      if (letterSet.has(ch)) {
        const b = document.createElement("button");
        b.className = "key";
        b.textContent = ch;
        b.addEventListener("click", () => typeLetter(ch));
        r.appendChild(b);
      } else {
        r.appendChild(spacer());
      }
    });
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

function firstEmpty() { return State.letters.findIndex((c) => c === null); }

function typeLetter(ch) {
  if (State.solved) return;
  Sound.unlock();
  const idx = firstEmpty();
  if (idx === -1) return;
  State.letters[idx] = { ch: baseChar(ch) };
  Sound.tap();
  renderSlots();
  saveSession();
  if (firstEmpty() === -1) check();
}

function deleteLetter() {
  if (State.solved) return;
  for (let i = State.letters.length - 1; i >= 0; i--) {
    if (State.letters[i]) {
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
  State.letters[idx] = { ch: State.base[idx] };
  Sound.hint();
  renderSlots();
  saveSession();
  if (firstEmpty() === -1) check();
}

function check() {
  const typed = State.letters.map((c) => c.ch).join("");
  if (typed === State.base.join("")) win();
  else lose();
}

function win() {
  State.solved = true;
  State.streak += 1;
  const res = Progress.solve("ordena", State.streak, State.current.w);
  renderSlots();
  renderStats();
  saveSession();
  Speech.say(State.current.w, !Sound.isMuted());
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
  setTimeout(() => {
    State.letters = State.base.map(() => null);
    renderSlots();
    saveSession();
  }, 500);
}

function showCelebration(res, milestone) {
  el("ov-emoji").textContent = State.current.e;
  el("ov-word").textContent = State.current.w;
  el("ov-praise").textContent = milestone
    ? `¡Racha de ${State.streak}! 🏆`
    : PRAISES[Math.floor(Math.random() * PRAISES.length)];
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

// ——— Sesión ———
const SKEY = "jp_sess_ordena";

function saveSession() {
  try {
    localStorage.setItem(SKEY, JSON.stringify({
      theme: Theme.get(),
      deckWords: State.deck.map((d) => d.w),
      pos: State.i - 1,
      streak: State.streak,
      letters: State.letters,
      solved: State.solved,
    }));
  } catch (e) { /* sin storage */ }
}

function restoreSession() {
  let s;
  try { s = JSON.parse(localStorage.getItem(SKEY) || "null"); } catch (e) { return false; }
  if (!s || !Array.isArray(s.deckWords) || s.deckWords.length === 0) return false;
  if (s.theme !== Theme.get()) return false;
  const map = new Map(WORDS.map((o) => [o.w, o]));
  const deck = s.deckWords.map((w) => map.get(w)).filter(Boolean);
  if (deck.length === 0) return false;

  let pos = typeof s.pos === "number" ? s.pos : 0;
  if (s.solved) pos += 1;
  State.deck = deck;
  if (pos >= deck.length) { State.deck = buildDeck(); pos = 0; }

  State.current = State.deck[pos];
  State.i = pos + 1;
  State.streak = s.streak || 0;
  State.base = Array.from(norm(State.current.w));
  State.solved = false;
  State.letters = (!s.solved && Array.isArray(s.letters) && s.letters.length === State.base.length)
    ? s.letters
    : State.base.map(() => null);

  el("message").textContent = "";
  renderClue();
  buildKeyboard();
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
  State.base = Array.from(norm(State.current.w));
  State.letters = State.base.map(() => null);
  State.solved = false;
  el("message").textContent = "";
  renderClue();
  buildKeyboard();
  renderSlots();
  renderStats();
  saveSession();
}

// Teclado físico
function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (el("overlay").classList.contains("show")) {
    if (e.key === "Enter" || e.key === " ") { continueGame(); e.preventDefault(); }
    return;
  }
  if (e.key === "Backspace") { deleteLetter(); pressFeedback("⌫"); e.preventDefault(); return; }
  if (e.key.length !== 1) return;
  const base = norm(e.key);
  if (/^[A-ZÑ]$/.test(base) && new Set(State.base).has(base)) {
    typeLetter(base);
    pressFeedback(base);
  }
}

function setupMute() {
  const btn = el("mute");
  btn.textContent = Sound.isMuted() ? "🔇" : "🔊";
  btn.addEventListener("click", () => {
    const m = Sound.toggleMute();
    btn.textContent = m ? "🔇" : "🔊";
    Sound.unlock();
  });
}

function init() {
  Progress.load();
  Progress.touchDaily();
  setupMute();
  el("hint-btn").addEventListener("click", giveHint);
  el("continue-btn").addEventListener("click", continueGame);
  document.addEventListener("keydown", onKey);
  if (!restoreSession()) {
    State.deck = buildDeck();
    State.i = 0;
    nextWord();
  }
}

document.addEventListener("DOMContentLoaded", init);
