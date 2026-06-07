// Tema elegido (una categoría o "all"). Compartido por todos los juegos.
// Si un tema tiene pocas palabras, los juegos hacen fallback a todas.
const Theme = {
  KEY: "jp_theme",

  get() {
    const t = localStorage.getItem(this.KEY) || "all";
    return (t === "all" || CAT_MAP[t]) ? t : "all";
  },
  set(k) { localStorage.setItem(this.KEY, k); },

  // Palabras del tema actual (o todas si es "all").
  words() {
    const t = this.get();
    return t === "all" ? WORDS.slice() : WORDS.filter((w) => w.c === t);
  },

  // Etiqueta linda para mostrar.
  label() {
    const t = this.get();
    return t === "all" ? "🌈 Todos los temas" : (CAT_MAP[t].emoji + " " + CAT_MAP[t].label);
  },
};
