// ===== Encuentra el Error — lógica =====
// Mostramos el emoji y la palabra con UN error de ortografía (una letra cambiada
// por otra parecida según la fonética). El chico toca la letra equivocada; al
// acertar, la ficha se da vuelta y muestra la letra correcta. Practica ortografía.

// MAYÚSCULAS sin tildes, conserva la Ñ. El juego trabaja sobre la forma sin tilde
// (la tilde no es parte del acertijo); la ortografía correcta con tilde se muestra
// al acertar (State.current.w).
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

// ——— Generador del error ortográfico ———
// Cambia UNA letra por otra parecida, en 3 niveles de preferencia:
//   1) clásicos del español (b/v, s/z/c, g/j — c/s/z y g/j solo antes de E/I)
//   2) fonéticos de chicos (p/b, t/d, r/l, m/n)
//   3) cambio de vocal (último recurso, para palabras sin consonante confundible)
// Reglas: la letra-error debe quedar ÚNICA en la palabra (ficha inequívoca) y el
// resultado no puede ser una palabra fea. Verificado sobre las 134 palabras.
const SWAP1_ANY = { B: ["V"], V: ["B"], S: ["Z"], Z: ["S"] };
const SWAP1_EI  = { C: ["S", "Z"], S: ["C"], Z: ["C"], G: ["J"], J: ["G"] };
const SWAP2_ANY = { P: ["B"], B: ["P"], T: ["D"], D: ["T"], R: ["L"], L: ["R"], M: ["N"], N: ["M"] };
const VOWELS = ["A", "E", "I", "O", "U"];
const BAD_WORDS = new Set(["CACA", "CULO", "TETA", "PENE", "PEDO", "PIPI", "POPO", "CAGA", "MEA", "PIS", "ANO", "TONTO", "FEO", "MOCO", "TETE", "CULA"]);

function candFor(ch, tier) {
  const out = [];
  ch.forEach((c, i) => {
    const next = ch[i + 1];
    const ei = next === "E" || next === "I";
    const opts = [];
    if (tier === 1) { if (SWAP1_ANY[c]) opts.push(...SWAP1_ANY[c]); if (ei && SWAP1_EI[c]) opts.push(...SWAP1_EI[c]); }
    if (tier === 2) { if (SWAP2_ANY[c]) opts.push(...SWAP2_ANY[c]); }
    if (tier === 3) { if (VOWELS.includes(c)) opts.push(...VOWELS.filter((v) => v !== c)); }
    opts.forEach((r) => { if (r !== c) out.push({ idx: i, repl: r }); });
  });
  return out;
}

// Devuelve { display, idx, correct } o null (no debería ser null con estas palabras).
function makeError(correctNorm) {
  const ch = Array.from(correctNorm);
  for (const tier of [1, 2, 3]) {
    const cands = shuffle(candFor(ch, tier));
    for (const cand of cands) {
      const wrong = ch.slice();
      wrong[cand.idx] = cand.repl;
      const wstr = wrong.join("");
      if (wstr === correctNorm) continue;
      if (BAD_WORDS.has(wstr)) continue;
      if (wrong.filter((x) => x === cand.repl).length !== 1) continue; // ficha-error única
      return { display: wstr, idx: cand.idx, correct: ch[cand.idx] };
    }
  }
  return null;
}

const PRAISES = ["¡Muy bien!", "¡Genial!", "¡Excelente!", "¡Buenísimo!", "¡Lo lograste!", "¡Eres un crack!", "¡Increíble!"];
const NUDGES = ["¡Esa está bien! Mira de nuevo 🤔", "¡Esa letra va! Busca otra 👀", "¡Sigue buscando! 💪", "¡Casi! ¿Cuál suena raro? 🌈"];

const State = {
  deck: [],
  i: 0,
  current: null,    // {w,e,c}
  display: [],      // letras mostradas (con el error)
  errorIdx: -1,     // posición de la letra equivocada
  correct: "",      // letra correcta de esa posición
  solved: false,
  streak: 0,
  wrongDone: false, // ya se marcó racha rota en esta palabra
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

// Las fichas se muestran EN EL ORDEN DE LA PALABRA (no en QWERTY): acá las letras
// SON la palabra a revisar, no opciones sueltas para elegir. Cada ficha tiene
// frente (letra mostrada) y dorso (letra correcta) para el giro al acertar.
function renderTiles() {
  const wrap = el("word");
  wrap.innerHTML = "";
  State.display.forEach((ch, idx) => {
    const isErr = idx === State.errorIdx;
    const b = document.createElement("button");
    b.className = "tile";
    if (isErr && State.solved) b.classList.add("flipped");
    b.dataset.idx = String(idx);
    b.innerHTML =
      `<span class="inner">` +
        `<span class="face front">${ch}</span>` +
        `<span class="face back">${isErr ? State.correct : ch}</span>` +
      `</span>`;
    b.addEventListener("click", () => choose(idx, b));
    wrap.appendChild(b);
  });
}

// ——— Sesión ———
const SKEY = "jp_sess_encuentra-error";

function saveSession() {
  try {
    localStorage.setItem(SKEY, JSON.stringify({
      theme: Theme.get(),
      deckWords: State.deck.map((d) => d.w),
      pos: State.i - 1,
      streak: State.streak,
      display: State.display.join(""),
      errorIdx: State.errorIdx,
      correct: State.correct,
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
  State.wrongDone = false;

  // Mismo acertijo si seguíamos en esa palabra; si no, uno nuevo.
  const correctNorm = norm(State.current.w);
  if (!s.solved && typeof s.display === "string" && s.display.length === correctNorm.length
      && typeof s.errorIdx === "number" && s.display !== correctNorm) {
    State.display = Array.from(s.display);
    State.errorIdx = s.errorIdx;
    State.correct = s.correct || correctNorm[s.errorIdx];
  } else {
    setPuzzle(State.current);
  }

  el("message").textContent = "";
  renderClue();
  renderTiles();
  renderStats();
  saveSession();
  return true;
}

// Arma el acertijo (error) para una palabra. Si por algún motivo no se pudiera
// generar, devuelve false para que el llamador pase a la siguiente.
function setPuzzle(wordObj) {
  const correctNorm = norm(wordObj.w);
  const err = makeError(correctNorm);
  if (!err) return false;
  State.display = Array.from(err.display);
  State.errorIdx = err.idx;
  State.correct = err.correct;
  return true;
}

function newWord() {
  // Avanza hasta encontrar una palabra con error generable (con estas palabras,
  // siempre la primera; el bucle es solo una red de seguridad).
  let guard = 0;
  do {
    if (State.i >= State.deck.length) { State.deck = buildDeck(); State.i = 0; }
    State.current = State.deck[State.i++];
    guard++;
  } while (!setPuzzle(State.current) && guard < State.deck.length + 1);

  State.solved = false;
  State.wrongDone = false;
  State.sentHint = false;
  el("message").textContent = "";
  renderClue();
  renderTiles();
  renderStats();
  saveSession();
  IdleHint.resume();
}

function choose(idx, btn) {
  if (State.solved) return;
  Sound.unlock();
  if (idx === State.errorIdx) {
    win();
  } else {
    // Tocó una letra que estaba bien: la marca como correcta y la deja fuera.
    Sound.wrong();
    if (!State.wrongDone) {
      State.wrongDone = true;
      State.streak = 0;
      renderStats();
      Analytics.track("wrong_attempt", { game: "encuentra-error" });
    }
    btn.classList.add("ok");
    btn.disabled = true;
    el("message").textContent = NUDGES[Math.floor(Math.random() * NUDGES.length)];
    saveSession();
  }
}

function giveHint() {
  if (State.solved) return;
  Sound.unlock();
  if (!State.sentHint) { State.sentHint = true; Analytics.track("hint_used", { game: "encuentra-error" }); }
  // Marca como "está bien" una letra correcta al azar (que no sea el error ni esté ya marcada).
  const tiles = Array.from(el("word").querySelectorAll(".tile"));
  const ok = tiles.filter((t) => Number(t.dataset.idx) !== State.errorIdx && !t.disabled);
  if (ok.length <= 1) { Sound.hint(); return; } // dejá al menos una opción además del error
  const pick = ok[Math.floor(Math.random() * ok.length)];
  pick.classList.add("ok");
  pick.disabled = true;
  Sound.hint();
}

function win() {
  State.solved = true;
  IdleHint.stop();
  State.streak += 1;
  const res = Progress.solve("encuentra-error", State.streak, State.current.w);
  renderStats();
  saveSession();

  // Gira la ficha del error para mostrar la letra correcta.
  const tile = el("word").querySelector(`.tile[data-idx="${State.errorIdx}"]`);
  if (tile) { tile.classList.add("flipped"); tile.disabled = true; }

  Speech.say(State.current.w, !Sound.isMuted()); // lee la palabra correcta
  Encourage.onCelebrate(!Sound.isMuted());        // cada 4-7 festejos, frase alentadora
  const milestone = State.streak > 0 && State.streak % 5 === 0;
  const big = milestone || res.leveledUp || res.newMedals.length > 0;
  if (big) Sound.levelUp(); else Sound.correct();
  Confetti.burst();
  if (big) setTimeout(() => Confetti.burst(window.innerWidth * 0.3, window.innerHeight * 0.3), 250);
  setTimeout(() => showCelebration(res, milestone), 550);
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

// Teclado físico (cómodo para probar en la compu): tipear la letra equivocada.
function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (el("overlay").classList.contains("show")) {
    if (e.key === "Enter" || e.key === " ") { continueGame(); e.preventDefault(); }
    return;
  }
  if (e.key.length !== 1) return;
  const k = norm(e.key);
  if (!/^[A-ZÑ]$/.test(k)) return;
  // Toca la primera ficha (no resuelta) cuya letra mostrada coincida.
  const tiles = Array.from(el("word").querySelectorAll(".tile"));
  const t = tiles.find((x) => !x.disabled && State.display[Number(x.dataset.idx)] === k);
  if (t) { t.classList.add("pressed"); setTimeout(() => t.classList.remove("pressed"), 130); choose(Number(t.dataset.idx), t); }
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
  Analytics.track("game_open", { game: "encuentra-error" });
  Speech.announce("Encuentra el error", !Sound.isMuted()); // dice qué hacer al entrar
  setupMute();
  el("hint-btn").addEventListener("click", giveHint);
  el("continue-btn").addEventListener("click", continueGame);
  document.addEventListener("keydown", onKey);
  IdleHint.start(el("hint-btn"), 8000, "encuentra-error"); // brilla la pista tras 8s
  if (!restoreSession()) {
    State.deck = buildDeck();
    State.i = 0;
    newWord();
  }
}

document.addEventListener("DOMContentLoaded", init);
