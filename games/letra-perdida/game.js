// ===== Letra Perdida — lógica =====
// Mostramos el emoji y la palabra con UNA letra faltante. El chico elige
// la letra correcta entre 4 opciones. Practica ortografía.

const ALPHABET = Array.from("ABCDEFGHIJKLMNÑOPQRSTUVWXYZ");

// MAYÚSCULAS, sin tildes, conserva la Ñ. (̀-ͯ = marcas de acento)
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

// Rampa suave: palabras cortas primero. Usa el tema elegido (o todas si quedara vacío).
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
const NUDGES = ["¡Casi! Mira de nuevo 🤔", "¡Esa no! Prueba otra 💪", "¡Uy! Fíjate bien 👀", "¡Sigue, tú puedes! 🌈"];

const State = {
  deck: [],
  i: 0,
  current: null,    // {w,e,c}
  base: [],         // palabra en letras base (sin tilde)
  blankIdx: 0,
  correct: "",
  options: [],
  solved: false,
  streak: 0,
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

function renderWord() {
  const wrap = el("word");
  wrap.innerHTML = "";
  State.base.forEach((ch, idx) => {
    const d = document.createElement("div");
    d.className = "tile";
    if (idx === State.blankIdx && !State.solved) {
      d.classList.add("blank");
      d.textContent = "?";
    } else {
      d.textContent = ch;
      if (idx === State.blankIdx && State.solved) d.classList.add("correct");
    }
    wrap.appendChild(d);
  });
}

// Dibuja el teclado QWERTY pero SOLO muestra las letras ofrecidas; las demás
// posiciones quedan como huecos vacíos para conservar el lugar del QWERTY.
function renderOptions() {
  const wrap = el("options");
  wrap.innerHTML = "";
  QWERTY_ROWS.forEach((row) => {
    const r = document.createElement("div");
    r.className = "orow";
    row.forEach((ch) => {
      if (State.options.includes(ch)) {
        const b = document.createElement("button");
        b.className = "opt";
        b.textContent = ch;
        b.dataset.letter = ch;
        b.addEventListener("click", () => choose(ch, b));
        r.appendChild(b);
      } else {
        const s = document.createElement("div");
        s.className = "opt spacer";
        r.appendChild(s);
      }
    });
    wrap.appendChild(r);
  });
}

function optionButtons() {
  return Array.from(el("options").querySelectorAll(".opt[data-letter]"));
}

// ——— Sesión: guardar la partida para continuar al volver ———
const SKEY = "jp_sess_letra-perdida";

function saveSession() {
  try {
    localStorage.setItem(SKEY, JSON.stringify({
      theme: Theme.get(),
      deckWords: State.deck.map((d) => d.w),
      pos: State.i - 1,
      streak: State.streak,
      blankIdx: State.blankIdx,
      options: State.options,
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
  if (s.solved) pos += 1; // ya había ganado esa palabra
  State.deck = deck;
  if (pos >= deck.length) { State.deck = buildDeck(); pos = 0; }

  State.current = State.deck[pos];
  State.i = pos + 1;
  State.streak = s.streak || 0;
  State.base = Array.from(norm(State.current.w));
  State.solved = false;

  // Mismo acertijo si seguíamos en esa palabra; si no, uno nuevo.
  if (!s.solved && typeof s.blankIdx === "number" && s.blankIdx < State.base.length
      && Array.isArray(s.options) && s.options.length === 4) {
    State.blankIdx = s.blankIdx;
    State.options = s.options;
  } else {
    State.blankIdx = Math.floor(Math.random() * State.base.length);
    const pool = shuffle(ALPHABET.filter((l) => l !== State.base[State.blankIdx]));
    State.options = shuffle([State.base[State.blankIdx], pool[0], pool[1], pool[2]]);
  }
  State.correct = State.base[State.blankIdx];

  el("message").textContent = "";
  renderClue();
  renderWord();
  renderOptions();
  renderStats();
  saveSession();
  return true;
}

function newWord() {
  if (State.i >= State.deck.length) {
    State.deck = buildDeck();
    State.i = 0;
  }
  State.current = State.deck[State.i++];
  State.base = Array.from(norm(State.current.w));
  State.blankIdx = Math.floor(Math.random() * State.base.length);
  State.correct = State.base[State.blankIdx];
  State.solved = false;

  // Opciones: la correcta + 3 distractoras distintas.
  const pool = shuffle(ALPHABET.filter((l) => l !== State.correct));
  State.options = shuffle([State.correct, pool[0], pool[1], pool[2]]);

  el("message").textContent = "";
  renderClue();
  renderWord();
  renderOptions();
  renderStats();
  saveSession();
}

function choose(letter, btn) {
  if (State.solved) return;
  Sound.unlock();
  if (letter === State.correct) {
    win();
  } else {
    Sound.wrong();
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
  // 50/50: deshabilita dos opciones incorrectas que sigan activas.
  const wrong = optionButtons().filter(
    (b) => b.dataset.letter !== State.correct && !b.disabled
  );
  shuffle(wrong).slice(0, 2).forEach((b) => {
    b.disabled = true;
    b.classList.add("wrong");
  });
  Sound.hint();
}

function win() {
  State.solved = true;
  State.streak += 1;
  const res = Progress.solve("letra-perdida", State.streak, State.current.w);
  renderWord();
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
  newWord();
}

// Teclado físico (cómodo para jugar/probar en la compu)
function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  // Con el festejo abierto, Enter o Espacio pasan a la siguiente.
  if (el("overlay").classList.contains("show")) {
    if (e.key === "Enter" || e.key === " ") { continueGame(); e.preventDefault(); }
    return;
  }

  if (e.key.length !== 1) return;
  const k = norm(e.key); // MAYÚSCULA sin tilde; conserva la Ñ
  if (!/^[A-ZÑ]$/.test(k)) return;
  const btn = optionButtons().find((b) => b.dataset.letter === k && !b.disabled);
  if (btn) {
    btn.classList.add("pressed");
    setTimeout(() => btn.classList.remove("pressed"), 130);
    choose(k, btn);
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
    newWord();
  }
}

document.addEventListener("DOMContentLoaded", init);
