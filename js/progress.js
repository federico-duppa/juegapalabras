// Progreso compartido: estrellas, niveles, medallas, colección de palabras y
// racha diaria. Guardado en el celular. Todos los juegos suman al mismo progreso.

const Progress = (() => {
  const KEY = "jp_progress";

  // Niveles por cantidad de palabras resueltas (estrellas).
  const LEVELS = [
    { min: 0,   name: "Semillita",  emoji: "🌱" },
    { min: 5,   name: "Aprendiz",   emoji: "🐣" },
    { min: 15,  name: "Explorador", emoji: "🦊" },
    { min: 30,  name: "Sabio",      emoji: "🦉" },
    { min: 50,  name: "Experto",    emoji: "🚀" },
    { min: 80,  name: "Campeón",    emoji: "🦸" },
    { min: 120, name: "Maestro",    emoji: "👑" },
  ];

  // Medallas (logros). `cond(d)` decide si está ganada según los datos.
  const MEDALS = [
    { id: "first",    emoji: "🥉", name: "¡Primera palabra!", desc: "Resuelve tu primera palabra",        cond: (d) => d.stars >= 1 },
    { id: "ten",      emoji: "🥈", name: "Diez palabras",     desc: "Resuelve 10 palabras",                cond: (d) => d.stars >= 10 },
    { id: "twenty5",  emoji: "🥇", name: "Veinticinco",       desc: "Resuelve 25 palabras",                cond: (d) => d.stars >= 25 },
    { id: "fifty",    emoji: "🏆", name: "¡Cincuenta!",       desc: "Resuelve 50 palabras",                cond: (d) => d.stars >= 50 },
    { id: "hundred",  emoji: "💯", name: "¡Cien palabras!",   desc: "Resuelve 100 palabras",               cond: (d) => d.stars >= 100 },
    { id: "streak5",  emoji: "🔥", name: "En racha",          desc: "Logra una racha de 5",                cond: (d) => d.best >= 5 },
    { id: "streak10", emoji: "⚡", name: "¡Imparable!",       desc: "Logra una racha de 10",               cond: (d) => d.best >= 10 },
    { id: "both",     emoji: "🎮", name: "Multijugador",      desc: "Juega los cuatro juegos",             cond: (d) => Object.keys(d.byGame).length >= 4 },
    { id: "guesser",  emoji: "📝", name: "Adivinador",        desc: "Resuelve 20 en Adivina la Palabra",   cond: (d) => (d.byGame["word-guesser"] || 0) >= 20 },
    { id: "letters",  emoji: "🔤", name: "Cazaletras",        desc: "Resuelve 20 en Letra Perdida",        cond: (d) => (d.byGame["letra-perdida"] || 0) >= 20 },
    { id: "memoria",  emoji: "🧠", name: "Memorión",          desc: "Resuelve 20 en Memoria de Palabras",  cond: (d) => (d.byGame["memoria"] || 0) >= 20 },
    { id: "ordena",   emoji: "🔀", name: "Ordenapalabras",    desc: "Resuelve 20 en Ordena las Letras",    cond: (d) => (d.byGame["ordena"] || 0) >= 20 },
    { id: "collect1", emoji: "📒", name: "Coleccionista",     desc: "Junta 30 palabras distintas",         cond: (d) => d.words.length >= 30 },
    { id: "collect2", emoji: "📚", name: "Bibliotecario",     desc: "Junta 70 palabras distintas",         cond: (d) => d.words.length >= 70 },
    { id: "daily3",   emoji: "📅", name: "Tres días",         desc: "Juega 3 días seguidos",               cond: (d) => d.daily.best >= 3 },
    { id: "daily7",   emoji: "🗓️", name: "Semana completa",   desc: "Juega 7 días seguidos",               cond: (d) => d.daily.best >= 7 },
  ];

  let data = { stars: 0, best: 0, byGame: {}, medals: [], words: [], daily: { streak: 0, last: null, best: 0 } };

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
      data = {
        stars: raw.stars || 0,
        best: raw.best || 0,
        byGame: raw.byGame || {},
        medals: raw.medals || [],
        words: Array.isArray(raw.words) ? raw.words : [],
        daily: (raw.daily && typeof raw.daily === "object")
          ? { streak: raw.daily.streak || 0, last: raw.daily.last || null, best: raw.daily.best || 0 }
          : { streak: 0, last: null, best: 0 },
      };
    } catch (e) {
      data = { stars: 0, best: 0, byGame: {}, medals: [], words: [], daily: { streak: 0, last: null, best: 0 } };
    }
    return data;
  }

  function save() { localStorage.setItem(KEY, JSON.stringify(data)); }

  // —— Fechas (para la racha diaria) ——
  function todayStr(d) {
    d = d || new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${dd}`;
  }
  function dayDiff(a, b) {
    const pa = a.split("-").map(Number), pb = b.split("-").map(Number);
    const da = Date.UTC(pa[0], pa[1] - 1, pa[2]);
    const db = Date.UTC(pb[0], pb[1] - 1, pb[2]);
    return Math.round((db - da) / 86400000);
  }

  function levelFor(stars) {
    let idx = 0;
    for (let i = 0; i < LEVELS.length; i++) if (stars >= LEVELS[i].min) idx = i;
    const cur = LEVELS[idx];
    const next = LEVELS[idx + 1] || null;
    const base = cur.min;
    const span = next ? next.min - base : 1;
    const into = Math.min(span, stars - base);
    return {
      idx, name: cur.name, emoji: cur.emoji,
      stars, isMax: !next,
      toNext: next ? next.min - stars : 0,
      nextName: next ? next.name : null,
      progress: next ? into / span : 1,
    };
  }

  function checkMedals() {
    const earned = MEDALS.filter((m) => m.cond(data)).map((m) => m.id);
    const fresh = earned.filter((id) => !data.medals.includes(id));
    data.medals = earned;
    return fresh.map((id) => MEDALS.find((m) => m.id === id));
  }

  return {
    load,
    raw() { return data; },
    stars() { return data.stars; },
    bestStreak() { return data.best; },
    level() { return levelFor(data.stars); },

    // —— Colección de palabras ——
    words() { return data.words.slice(); },
    wordCount() { return data.words.length; },
    hasWord(w) { return data.words.includes(w); },

    // —— Racha diaria ——
    daily() { return { ...data.daily }; },
    // Llamar al abrir la app: actualiza la racha diaria según la fecha de hoy.
    touchDaily() {
      const today = todayStr();
      if (data.daily.last === today) return data.daily;
      const diff = data.daily.last ? dayDiff(data.daily.last, today) : null;
      data.daily.streak = (diff === 1) ? data.daily.streak + 1 : 1;
      data.daily.last = today;
      if (data.daily.streak > data.daily.best) data.daily.best = data.daily.streak;
      checkMedals();
      save();
      return data.daily;
    },

    // —— Medallas ——
    medals() {
      return MEDALS.map((m) => ({
        id: m.id, emoji: m.emoji, name: m.name, desc: m.desc,
        earned: data.medals.includes(m.id),
      }));
    },
    medalsEarnedCount() { return data.medals.length; },
    medalsTotal() { return MEDALS.length; },

    // Suma estrellas extra (p. ej. premio del cofre), sin palabra ni juego.
    addBonusStars(n) {
      const before = levelFor(data.stars).idx;
      data.stars += n;
      const after = levelFor(data.stars).idx;
      const newMedals = checkMedals();
      save();
      return { leveledUp: after > before, level: levelFor(data.stars), newMedals };
    },

    // Registra una palabra resuelta. Devuelve novedades para festejar.
    solve(game, currentStreak, word) {
      const before = levelFor(data.stars).idx;
      data.stars += 1;
      data.byGame[game] = (data.byGame[game] || 0) + 1;
      if (word && !data.words.includes(word)) data.words.push(word); // colección (sin repetir)
      if (currentStreak > data.best) data.best = currentStreak;
      const after = levelFor(data.stars).idx;
      const newMedals = checkMedals();
      save();
      return {
        stars: data.stars,
        leveledUp: after > before,
        level: levelFor(data.stars),
        newMedals,
      };
    },
  };
})();
