// ===== Memoria de Palabras — lógica =====
// Tablero de cartas: mitad emojis, mitad palabras. Hay que emparejar cada emoji
// con su palabra. El tablero crece por niveles (2x2 → 3x5). En el 3x5 (impar) la
// carta del centro es un 🎁 cofre que se abre al completar la ronda y da premio.

// Niveles de tablero (crecen al completar rondas).
const TIERS = [
  { cols: 2, rows: 2 }, // 2 pares
  { cols: 2, rows: 3 }, // 3 pares
  { cols: 2, rows: 4 }, // 4 pares (lo clásico)
  { cols: 3, rows: 4 }, // 6 pares
  { cols: 3, rows: 5 }, // 7 pares + cofre central
];
const LVL_KEY = "jp_memoria_level";

function tierInfo(t) {
  const cells = t.cols * t.rows;
  const hasCenter = cells % 2 === 1;
  return {
    cols: t.cols, rows: t.rows, cells, hasCenter,
    pairs: Math.floor(cells / 2),
    centerIndex: hasCenter ? (cells - 1) / 2 : -1,
  };
}
function getLevel() {
  const n = parseInt(localStorage.getItem(LVL_KEY) || "0", 10) || 0;
  return Math.max(0, Math.min(n, TIERS.length - 1));
}
function setLevel(n) { localStorage.setItem(LVL_KEY, String(Math.max(0, Math.min(n, TIERS.length - 1)))); }

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Palabras cortas del tema (fallback a todas si el tema tiene menos de 4).
function memoriaPool() {
  const themed = Theme.words().filter((x) => Array.from(x.w).length <= 7);
  if (themed.length >= 4) return themed;
  return WORDS.filter((x) => Array.from(x.w).length <= 7);
}

// Tier efectivo: el nivel deseado, bajado hasta que haya suficientes palabras.
function effectiveTier() {
  const avail = memoriaPool().length;
  let idx = getLevel();
  while (idx > 0 && tierInfo(TIERS[idx]).pairs > avail) idx--;
  return tierInfo(TIERS[idx]);
}

const State = {
  cards: [],
  firstPick: null,
  busy: false,
  matched: 0,
  pairsTarget: 0,
  cols: 2, rows: 2, hasCenter: false, centerIndex: -1,
  streak: 0,
  roundBonus: { leveledUp: false, level: null, medals: [] },
};

const el = (id) => document.getElementById(id);

function renderStats() {
  el("stars").textContent = "⭐ " + Progress.stars();
  el("streak").textContent = "🔥 " + State.streak;
}

function newRound() {
  const t = effectiveTier();
  State.cols = t.cols; State.rows = t.rows;
  State.hasCenter = t.hasCenter; State.centerIndex = t.centerIndex;
  State.pairsTarget = t.pairs;

  const picks = shuffle(memoriaPool()).slice(0, t.pairs);
  const pairCards = [];
  picks.forEach((p) => {
    pairCards.push({ word: p.w, type: "emoji", content: p.e, matched: false });
    pairCards.push({ word: p.w, type: "word", content: p.w, matched: false });
  });
  shuffle(pairCards);

  // Armar el tablero; si hay centro, poner el cofre justo en el medio.
  const cards = [];
  let pi = 0;
  for (let i = 0; i < t.cells; i++) {
    if (t.hasCenter && i === t.centerIndex) cards.push({ type: "chest", content: "🎁", matched: false, opened: false });
    else cards.push(pairCards[pi++]);
  }

  State.cards = cards;
  State.firstPick = null;
  State.busy = false;
  State.matched = 0;
  State.roundBonus = { leveledUp: false, level: null, medals: [] };
  el("message").textContent = "";
  renderBoard();
  renderStats();
  saveSession();
}

function renderBoard() {
  const board = el("board");
  board.style.gridTemplateColumns = `repeat(${State.cols}, 1fr)`;
  board.innerHTML = "";
  State.cards.forEach((c, idx) => {
    if (c.type === "chest") {
      const d = document.createElement("div");
      d.className = "card chest" + (c.opened ? " opened" : "");
      d.innerHTML = `<div class="chestface">${c.opened ? "🎉" : "🎁"}</div>`;
      board.appendChild(d);
      return;
    }
    const card = document.createElement("button");
    card.className = "card" + (c.type === "word" ? " is-word" : "");
    if (c.matched) card.classList.add("flipped", "matched");
    card.dataset.idx = idx;
    card.innerHTML = `
      <div class="inner">
        <div class="face back">?</div>
        <div class="face front">${c.content}</div>
      </div>`;
    card.addEventListener("click", () => flip(idx));
    board.appendChild(card);
  });
}

function cardEl(idx) { return el("board").children[idx]; }

function flip(idx) {
  if (State.busy) return;
  const c = State.cards[idx];
  if (!c || c.type === "chest" || c.matched) return;
  if (idx === State.firstPick) return;
  Sound.unlock();

  cardEl(idx).classList.add("flipped");

  if (State.firstPick === null) {
    State.firstPick = idx;
    Sound.tap();
    return;
  }

  const a = State.cards[State.firstPick];
  const b = State.cards[idx];
  if (a.word === b.word) matchPair(State.firstPick, idx);
  else missPair(State.firstPick, idx);
}

function matchPair(i, j) {
  State.cards[i].matched = true;
  State.cards[j].matched = true;
  cardEl(i).classList.add("matched");
  cardEl(j).classList.add("matched");
  State.firstPick = null;
  State.matched += 1;
  State.streak += 1;

  const res = Progress.solve("memoria", State.streak, State.cards[i].word);
  if (res.leveledUp) { State.roundBonus.leveledUp = true; State.roundBonus.level = res.level; }
  State.roundBonus.medals.push(...res.newMedals);
  renderStats();
  saveSession();

  Sound.correct();
  Speech.say(State.cards[i].word, !Sound.isMuted());
  const r = cardEl(j).getBoundingClientRect();
  Confetti.burst(r.left + r.width / 2, r.top + r.height / 2);

  if (State.matched === State.pairsTarget) {
    State.busy = true;
    setTimeout(roundComplete, 650);
  }
}

function missPair(i, j) {
  State.busy = true;
  State.streak = 0;
  renderStats();
  saveSession();
  Sound.wrong();
  el("message").textContent = "¡Casi! Probemos otra vez 🤔";
  setTimeout(() => {
    cardEl(i).classList.remove("flipped");
    cardEl(j).classList.remove("flipped");
    State.firstPick = null;
    State.busy = false;
    el("message").textContent = "";
  }, 850);
}

function roundComplete() {
  let chestMsg = "";
  // Abrir el cofre del centro (si lo hay) y dar premio.
  if (State.hasCenter && State.centerIndex >= 0 && State.cards[State.centerIndex]) {
    State.cards[State.centerIndex].opened = true;
    renderBoard();
    const bonus = 2 + Math.floor(Math.random() * 3); // 2 a 4 estrellas
    const cres = Progress.addBonusStars(bonus);
    if (cres.leveledUp) { State.roundBonus.leveledUp = true; State.roundBonus.level = cres.level; }
    State.roundBonus.medals.push(...cres.newMedals);
    chestMsg = `🎁 ¡Cofre abierto! +${bonus} ⭐`;
    renderStats();
  }

  // Subir el nivel del tablero para la próxima ronda.
  setLevel(getLevel() + 1);

  Confetti.burst();
  setTimeout(() => Confetti.burst(window.innerWidth * 0.3, window.innerHeight * 0.3), 220);
  Sound.levelUp();

  el("ov-emoji").textContent = State.hasCenter ? "🎁" : "🎉";
  el("ov-word").textContent = "¡Ronda completa!";
  el("ov-praise").textContent = chestMsg || `Encontraste ${State.pairsTarget} pares 🧠`;
  const parts = [];
  if (State.roundBonus.leveledUp)
    parts.push(`<div class="lvl-up">¡Subiste a ${State.roundBonus.level.emoji} ${State.roundBonus.level.name}!</div>`);
  State.roundBonus.medals.forEach((m) =>
    parts.push(`<div class="medal-win">${m.emoji} Nueva medalla: ${m.name}</div>`));
  el("ov-bonus").innerHTML = parts.join("");
  el("overlay").classList.add("show");
  saveSession();
}

function continueGame() {
  el("overlay").classList.remove("show");
  newRound();
}

// ——— Sesión ———
const SKEY = "jp_sess_memoria";

function saveSession() {
  try {
    localStorage.setItem(SKEY, JSON.stringify({
      theme: Theme.get(),
      cols: State.cols, rows: State.rows, hasCenter: State.hasCenter,
      centerIndex: State.centerIndex, pairsTarget: State.pairsTarget,
      cards: State.cards.map((c) => c.type === "chest"
        ? { type: "chest", content: c.content, matched: false, opened: !!c.opened }
        : { word: c.word, type: c.type, content: c.content, matched: c.matched }),
      streak: State.streak,
      bonus: State.roundBonus,
    }));
  } catch (e) { /* sin storage */ }
}

function restoreSession() {
  let s;
  try { s = JSON.parse(localStorage.getItem(SKEY) || "null"); } catch (e) { return false; }
  if (!s || !Array.isArray(s.cards) || s.cards.length === 0) return false;
  if (s.theme !== Theme.get()) return false;
  // Ronda terminada (todos los pares hechos): empezar una nueva.
  const pairsDone = s.cards.filter((c) => c.type !== "chest").every((c) => c.matched);
  if (pairsDone) return false;

  State.cards = s.cards.map((c) => c.type === "chest"
    ? { type: "chest", content: c.content || "🎁", matched: false, opened: !!c.opened }
    : { word: c.word, type: c.type, content: c.content, matched: !!c.matched });
  State.cols = s.cols || 2; State.rows = s.rows || 2;
  State.hasCenter = !!s.hasCenter; State.centerIndex = typeof s.centerIndex === "number" ? s.centerIndex : -1;
  State.pairsTarget = s.pairsTarget || State.cards.filter((c) => c.type !== "chest").length / 2;
  State.firstPick = null;
  State.busy = false;
  State.matched = State.cards.filter((c) => c.type !== "chest" && c.matched).length / 2;
  State.streak = s.streak || 0;
  State.roundBonus = (s.bonus && typeof s.bonus === "object")
    ? { leveledUp: !!s.bonus.leveledUp, level: s.bonus.level || null, medals: Array.isArray(s.bonus.medals) ? s.bonus.medals : [] }
    : { leveledUp: false, level: null, medals: [] };
  el("message").textContent = "";
  renderBoard();
  renderStats();
  saveSession();
  return true;
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

// Teclado físico: con el festejo abierto, Enter o Espacio pasan a otra ronda.
function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (el("overlay").classList.contains("show") && (e.key === "Enter" || e.key === " ")) {
    continueGame();
    e.preventDefault();
  }
}

function init() {
  Progress.load();
  Progress.touchDaily();
  setupMute();
  el("continue-btn").addEventListener("click", continueGame);
  document.addEventListener("keydown", onKey);
  if (!restoreSession()) newRound();
}

document.addEventListener("DOMContentLoaded", init);
