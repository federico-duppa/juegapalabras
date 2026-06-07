// Layout QWERTY (español, con Ñ) compartido por los juegos que muestran letras.
// Cada fila es un array de letras. Las filas se alinean a 10 columnas; cuando
// un juego no ofrece una letra, deja su lugar vacío (un espacio) en vez de la tecla.
const QWERTY_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ñ"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

// Cantidad de columnas de referencia (la fila más larga) para alinear todo.
const QWERTY_COLS = 10;
