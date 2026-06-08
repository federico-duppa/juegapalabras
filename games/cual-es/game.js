// ===== ¿Cuál es? — lógica =====
// Mostramos la PALABRA (texto) y el chico elige el DIBUJO correcto entre 4 emojis.
// Es el sentido inverso a los otros juegos: practica LECTURA y comprensión.
// La palabra se lee en voz alta SOLO al acertar (si la dijéramos al cargar, un chico
// que no lee podría adivinar de oído).

// MAYÚSCULAS sin tildes, conserva la Ñ. Se usa para mostrar la palabra-pista (la
// ortografía con tilde se muestra al ganar, en State.current.w).
function norm(s) {
  return Array.from(s.toUpperCase())
    .map((ch) => (ch === "Ñ" ? "Ñ" : ch.normalize("NFD").replace(/[̀-ͯ]/g, "")))
    .join("");
}

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

// Las 4 opciones: el correcto + 3 distractores. Preferimos la MISMA categoría (así
// hay que leer de verdad, no adivinar por el tipo de dibujo) y deduplicamos por emoji
// para que las 4 imágenes sean distintas. Si faltaran, se completa con cualquier palabra.
function buildOptions(cur) {
  const sameCat = WORDS.filter((w) => w.c === cur.c && w.e !== cur.e);
  const anyOther = WORDS.filter((w) => w.e !== cur.e);
  const seen = new Set([cur.e]);
  const picks = [cur];
  for (const src of [shuffle(sameCat.slice()), shuffle(anyOther.slice())]) {
    for (const w of src) {
      if (picks.length >= 4) break;
      if (!seen.has(w.e)) { seen.add(w.e); picks.push(w); }
    }
    if (picks.length >= 4) break;
  }
  return shuffle(picks);
}

const PRAISES = ["¡Muy bien!", "¡Genial!", "¡Excelente!", "¡Buenísimo!", "¡Lo lograste!", "¡Eres un crack!", "¡Increíble!"];
const NUDGES = ["¡Ese no! Mira de nuevo 🤔", "¡Casi! ¿Cuál será? 👀", "¡Sigue, tú puedes! 💪", "¡Uy! Lee otra vez 🌈"];

const State = {
  deck: [],
  i: 0,
  current: null,    // {w,e,c}
  options: [],      // 4 word-objects {w,e,c} en orden de pantalla
  correctW: "",     // palabra correcta (su emoji es el dibujo a buscar)
  solved: false,
  streak: 0,
  sentHint: false,
  sentWrong: false,
};

const el = (id) => document.getElementById(id);

function renderStats() {
  el("stars").textContent = "⭐ " + Progress.stars();
  el("streak").textContent = "🔥 " + State.streak;
}

// La pista es la PALABRA (texto). ⚠️ NUNCA el emoji: el emoji es la respuesta.
function renderClue() {
  el("word-clue").textContent = norm(State.current.w);
}

function renderGrid() {
  const wrap = el("grid");
  wrap.innerHTML = "";
  State.options.forEach((opt) => {
    const b = document.createElement("button");
    b.className = "cell";
    b.textContent = opt.e;
    b.dataset.w = opt.w;
    b.setAttribute("aria-label", "opción");
    b.addEventListener("click", () => choose(opt, b));
    wrap.appendChild(b);
  });
}

function cellButtons() {
  return Array.from(el("grid").querySelectorAll(".cell"));
}

// ——— Sesión ———
const SKEY = "jp_sess_cual-es";

function saveSession() {
  try {
    localStorage.setItem(SKEY, JSON.stringify({
      theme: Theme.get(),
      deckWords: State.deck.map((d) => d.w),
      pos: State.i - 1,
      streak: State.streak,
      optionWords: State.options.map((o) => o.w),
      correctW: State.correctW,
      solved: State.solved,
    }));
  } catch (e) { /* sin storage */ }
}

function restoreSession() {
  let s;
  try { s = JSON.parse(localStorage.getItem(SKEY) || "null"); } catch (e) { return false; }
  if (!s || !Array.isArray(s.deckWords) || s.deckWords.length === 0) return false;
  if (s.theme !== Theme.get()) return false; // cambió el tema
  const map = new Map(WORDS.map((o) => [o.w, o]));
  const deck = s.deckWords.map((w) => map.get(w)).filter(Boolean);
  if (deck.length === 0) return false;

  let pos = typeof s.pos === "number" ? s.pos : 0;
  if (s.solved) pos += 1; // ya había acertado esa palabra
  State.deck = deck;
  if (pos >= deck.length) { State.deck = buildDeck(); pos = 0; }

  State.current = State.deck[pos];
  State.i = pos + 1;
  State.streak = s.streak || 0;
  State.solved = false;
  State.sentHint = false;
  State.sentWrong = false;
  State.correctW = State.current.w;

  // Mismo acertijo si seguía válido (4 opciones mapeables, con el correcto, 4 emojis
  // distintos); si no, uno nuevo.
  let options = null;
  if (!s.solved && Array.isArray(s.optionWords) && s.optionWords.length === 4
      && s.correctW === State.current.w) {
    const objs = s.optionWords.map((w) => map.get(w)).filter(Boolean);
    const emojis = new Set(objs.map((o) => o.e));
    if (objs.length === 4 && emojis.size === 4 && objs.some((o) => o.w === State.current.w)) {
      options = objs;
    }
  }
  State.options = options || buildOptions(State.current);

  el("message").textContent = "";
  renderClue();
  renderGrid();
  renderStats();
  saveSession();
  return true;
}

function newWord() {
  if (State.i >= State.deck.length) { State.deck = buildDeck(); State.i = 0; }
  State.current = State.deck[State.i++];
  State.correctW = State.current.w;
  State.options = buildOptions(State.current);
  State.solved = false;
  State.sentHint = false;
  State.sentWrong = false;
  el("message").textContent = "";
  renderClue();
  renderGrid();
  renderStats();
  saveSession();
  IdleHint.resume();
}

function choose(opt, btn) {
  if (State.solved) return;
  Sound.unlock();
  if (opt.w === State.correctW) {
    win();
  } else {
    Sound.wrong();
    if (!State.sentWrong) { State.sentWrong = true; Analytics.track("wrong_attempt", { game: "cual-es" }); }
    State.streak = 0;
    renderStats();
    btn.classList.add("wrong");
    btn.disabled = true;
    el("message").textContent = NUDGES[Math.floor(Math.random() * NUDGES.length)];
    saveSession();
  }
}

function giveHint() {
  if (State.solved) return;
  Sound.unlock();
  if (!State.sentHint) { State.sentHint = true; Analytics.track("hint_used", { game: "cual-es" }); }
  // 50/50: anula hasta 2 opciones incorrectas que sigan activas.
  const wrong = cellButtons().filter((b) => b.dataset.w !== State.correctW && !b.disabled);
  shuffle(wrong).slice(0, 2).forEach((b) => { b.disabled = true; b.classList.add("dim"); });
  Sound.hint();
}

function win() {
  State.solved = true;
  IdleHint.stop();
  State.streak += 1;
  const res = Progress.solve("cual-es", State.streak, State.current.w);
  renderStats();
  saveSession();

  const right = cellButtons().find((b) => b.dataset.w === State.correctW);
  if (right) right.classList.add("correct");
  cellButtons().forEach((b) => { b.disabled = true; });

  Speech.say(State.current.w, !Sound.isMuted()); // lee la palabra SOLO al acertar
  Encourage.onCelebrate(!Sound.isMuted());        // cada 4-7 festejos, frase alentadora
  const milestone = State.streak > 0 && State.streak % 5 === 0;
  const big = milestone || res.leveledUp || res.newMedals.length > 0;
  if (big) Sound.levelUp(); else Sound.correct();
  Confetti.burst();
  if (big) setTimeout(() => Confetti.burst(window.innerWidth * 0.3, window.innerHeight * 0.3), 250);
  setTimeout(() => showCelebration(res, milestone), 500);
}

function showCelebration(res, milestone) {
  el("ov-emoji").textContent = State.current.e;
  el("ov-word").textContent = State.current.w; // ortografía correcta (con tilde)
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
  if (typeof Adventure !== "undefined" && Adventure.active()) { Adventure.go(); return; }
  newWord();
}

// Teclado físico (cómodo para probar en la compu): 1–4 eligen celda; Enter/Espacio
// pasan a la siguiente con el festejo abierto.
function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (el("overlay").classList.contains("show")) {
    if (e.key === "Enter" || e.key === " ") { continueGame(); e.preventDefault(); }
    return;
  }
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 4) {
    const b = cellButtons()[n - 1];
    if (b && !b.disabled) {
      b.classList.add("pressed");
      setTimeout(() => b.classList.remove("pressed"), 130);
      choose(State.options[n - 1], b);
    }
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
  Analytics.init();
  Progress.load();
  Progress.touchDaily();
  Analytics.track("game_open", { game: "cual-es" });
  Speech.announce("Lee la palabra y toca el dibujo correcto", !Sound.isMuted()); // qué hacer al entrar
  setupMute();
  el("hint-btn").addEventListener("click", giveHint);
  el("continue-btn").addEventListener("click", continueGame);
  document.addEventListener("keydown", onKey);
  IdleHint.start(el("hint-btn"), 8000, "cual-es"); // brilla la pista tras 8s
  if (!restoreSession()) {
    State.deck = buildDeck();
    State.i = 0;
    newWord();
  }
}

document.addEventListener("DOMContentLoaded", init);
