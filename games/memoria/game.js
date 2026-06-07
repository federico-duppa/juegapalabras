// ===== Memoria de Palabras — lógica =====
// Tablero de cartas: la mitad son emojis y la mitad son palabras.
// Hay que emparejar cada emoji con su palabra escrita. Practica lectura.

const PAIRS_PER_ROUND = 4; // 8 cartas por ronda

// Para que las palabras entren bien en la carta, usamos las no tan largas.
// Respeta el tema elegido; si el tema tiene menos de 4 cortas, usa todas.
function memoriaPool() {
  const themed = Theme.words().filter((x) => Array.from(x.w).length <= 7);
  if (themed.length >= PAIRS_PER_ROUND) return themed;
  return WORDS.filter((x) => Array.from(x.w).length <= 7);
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const State = {
  cards: [],        // {word, type:'emoji'|'word', content, matched}
  firstPick: null,  // índice de la primera carta dada vuelta
  busy: false,      // bloquea toques mientras se resuelve un par
  matched: 0,       // pares encontrados en la ronda
  streak: 0,        // pares seguidos sin error
  roundBonus: { leveledUp: false, level: null, medals: [] },
};

const el = (id) => document.getElementById(id);

function renderStats() {
  el("stars").textContent = "⭐ " + Progress.stars();
  el("streak").textContent = "🔥 " + State.streak;
}

// ——— Sesión: guardar la ronda para continuar al volver ———
const SKEY = "jp_sess_memoria";

function saveSession() {
  try {
    localStorage.setItem(SKEY, JSON.stringify({
      theme: Theme.get(),
      cards: State.cards.map((c) => ({ word: c.word, type: c.type, content: c.content, matched: c.matched })),
      streak: State.streak,
      bonus: State.roundBonus,
    }));
  } catch (e) { /* sin storage */ }
}

function restoreSession() {
  let s;
  try { s = JSON.parse(localStorage.getItem(SKEY) || "null"); } catch (e) { return false; }
  if (!s || !Array.isArray(s.cards) || s.cards.length === 0) return false;
  if (s.theme !== Theme.get()) return false; // cambió el tema
  if (s.cards.every((c) => c.matched)) return false; // ronda completa: empezar otra

  State.cards = s.cards.map((c) => ({ word: c.word, type: c.type, content: c.content, matched: !!c.matched }));
  State.firstPick = null;
  State.busy = false;
  State.matched = State.cards.filter((c) => c.matched).length / 2; // pares hallados
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

function newRound() {
  const picks = shuffle(memoriaPool()).slice(0, PAIRS_PER_ROUND);
  const cards = [];
  picks.forEach((p) => {
    cards.push({ word: p.w, type: "emoji", content: p.e, matched: false });
    cards.push({ word: p.w, type: "word", content: p.w, matched: false });
  });
  State.cards = shuffle(cards);
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
  board.innerHTML = "";
  State.cards.forEach((c, idx) => {
    const card = document.createElement("button");
    card.className = "card" + (c.type === "word" ? " is-word" : "");
    if (c.matched) card.classList.add("flipped", "matched"); // ya emparejada (al restaurar)
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

function cardEl(idx) {
  return el("board").children[idx];
}

function flip(idx) {
  if (State.busy) return;
  const c = State.cards[idx];
  if (c.matched) return;
  if (idx === State.firstPick) return; // ya está dada vuelta
  Sound.unlock();

  cardEl(idx).classList.add("flipped");

  if (State.firstPick === null) {
    State.firstPick = idx;
    Sound.tap();
    return;
  }

  // Segunda carta: comparar
  const a = State.cards[State.firstPick];
  const b = State.cards[idx];
  if (a.word === b.word) {
    matchPair(State.firstPick, idx);
  } else {
    missPair(State.firstPick, idx);
  }
}

function matchPair(i, j) {
  State.cards[i].matched = true;
  State.cards[j].matched = true;
  cardEl(i).classList.add("matched");
  cardEl(j).classList.add("matched");
  State.firstPick = null;
  State.matched += 1;
  State.streak += 1;

  // Suma al progreso (sin overlay; guardamos novedades para el final de ronda)
  const res = Progress.solve("memoria", State.streak, State.cards[i].word);
  if (res.leveledUp) { State.roundBonus.leveledUp = true; State.roundBonus.level = res.level; }
  State.roundBonus.medals.push(...res.newMedals);
  renderStats();
  saveSession();

  Sound.correct();
  Speech.say(State.cards[i].word, !Sound.isMuted());
  // confeti chiquito en la carta
  const r = cardEl(j).getBoundingClientRect();
  Confetti.burst(r.left + r.width / 2, r.top + r.height / 2);

  if (State.matched === PAIRS_PER_ROUND) {
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
  Confetti.burst();
  setTimeout(() => Confetti.burst(window.innerWidth * 0.3, window.innerHeight * 0.3), 220);
  Sound.levelUp();

  el("ov-emoji").textContent = "🎉";
  el("ov-word").textContent = "¡Ronda completa!";
  el("ov-praise").textContent = `Encontraste ${PAIRS_PER_ROUND} pares 🧠`;
  const parts = [];
  if (State.roundBonus.leveledUp)
    parts.push(`<div class="lvl-up">¡Subiste a ${State.roundBonus.level.emoji} ${State.roundBonus.level.name}!</div>`);
  State.roundBonus.medals.forEach((m) =>
    parts.push(`<div class="medal-win">${m.emoji} Nueva medalla: ${m.name}</div>`));
  el("ov-bonus").innerHTML = parts.join("");
  el("overlay").classList.add("show");
}

function continueGame() {
  el("overlay").classList.remove("show");
  newRound();
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
