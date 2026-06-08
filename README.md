# 🎈 JuegaPalabras

Sitio de **juegos web para celular** (vertical) que ayuda a chicos de ~8 años a
mejorar vocabulario y ortografía en español, jugando con emojis.

Hecho con **HTML/CSS/JS puro**: sin build, sin dependencias, anda offline.
Optimizado 100% para smartphone en posición vertical.

## Cómo probarlo

```bash
# desde la carpeta del proyecto
python3 -m http.server 8137
```

Después abrí en el celular (misma red) o en el navegador:
`http://localhost:8137/`

> Tip para verlo como celular en la compu: abrí las DevTools del navegador
> (F12) y activá el modo dispositivo (Ctrl/Cmd+Shift+M).
>
> En la compu podés **jugar con el teclado físico**: escribí las letras (acepta
> vocales con tilde y `ñ`), `Backspace` borra y `Enter`/`Espacio` pasa a la
> siguiente palabra o ronda. La tecla en pantalla se ilumina al usarla.

## Juegos

| Juego | Estado | Qué practica |
|-------|--------|--------------|
| 🧭 Modo Aventura | ✅ Listo | Va rotando entre los cuatro juegos (uno tras otro) para que no se estanque en un solo estilo |
| 🐶 ¡Adivina la Palabra! | ✅ Listo | Vocabulario + ortografía (escribir la palabra del emoji) |
| 🔀 Ordena las Letras | ✅ Listo | Ortografía (tocar las letras de la palabra en orden, en posición QWERTY) |
| 🎯 Letra Perdida | ✅ Listo | Ortografía (elegir la letra que falta entre 4 opciones) |
| 🔤 Memoria de Palabras | ✅ Listo | Lectura + asociación; tablero que crece 2×2→3×5, con 🎁 cofre sorpresa al centro |
| 🔍 Encuentra el Error | ✅ Listo | Ortografía/fonética: la palabra tiene una letra mal (b/v, s/z/c, g/j…); toca la equivocada y se da vuelta mostrando la correcta |
| 🖼️ ¿Cuál es? | ✅ Listo | Lectura/comprensión: lee la palabra y toca el dibujo correcto entre 4 emojis |

**377 palabras en 13 categorías**: animales, comida, naturaleza, transporte, cuerpo,
colores, ropa, casa, profesiones, deportes, instrumentos, cosas y fantasía. (Animales y
Comida son las más grandes; Colores queda chica porque hay pocos emojis de color distintos.)

## Temas (elegir categoría)

En el hub hay un **selector de tema**: jugar con todas las palabras (🌈 Todos) o
enfocarse en una categoría (solo animales, solo colores, etc.). El tema elegido se
guarda (`jp_theme`) y lo respetan los cuatro juegos. Si un tema tiene pocas palabras,
los juegos hacen fallback a todas.

## Progreso, niveles, medallas, álbum y racha

- **Estrellas ⭐**: una por palabra resuelta. Los cuatro juegos suman al **mismo
  progreso** (`localStorage` clave `jp_progress`).
- **Niveles**: 🌱 Semillita → 🐣 Aprendiz → 🦊 Explorador → 🦉 Sabio → 🚀 Experto →
  🦸 Campeón → 👑 Maestro. Barra de progreso en el hub.
- **Medallas** (16 logros): palabras totales, rachas, jugar los 4 juegos, 20 en cada
  juego, colección (30/70 palabras) y racha diaria (3/7 días). En `medallas.html`.
- **Álbum de stickers** (`album.html`): cada palabra aprendida desbloquea su emoji,
  agrupado por categoría. Muestra "X de 134".
- **Racha diaria 🔥**: jugar días seguidos suma; se ve en el hub.
- **Mascota Búho 🦉**: saluda en el hub con mensajes según el progreso.
- **Voz al acertar**: lee la palabra en voz alta (Web Speech API). Respeta 🔇.
- **Anuncio al entrar a un juego**: una voz dice qué hacer ("Adivina la palabra",
  "Encuentra el error"…). Si el navegador bloquea el audio sin gesto, lo dice al
  primer toque.
- **Mensajes alentadores hablados**: cada 4–7 festejos, una voz dice algo lindo
  ("¡Muy bueno!", "¡Excelente!", "¡Seguí así!"). El conteo es compartido entre juegos.
- **Continuar la partida**: cada juego guarda su sesión (`jp_sess_<juego>`). Si el
  chico sale y vuelve, retoma donde estaba (misma palabra, racha y tablero).

## Privacidad

JuegaPalabras **no recopila ningún dato**: sin analítica, sin cookies, sin cuentas, sin
datos personales y sin pedidos a servidores de terceros. El progreso del jugador se guarda
**solo en el dispositivo** (`localStorage`, claves `jp_*`) y nunca se transmite.

- La analítica (Umami) fue **eliminada**. `js/analytics.js` quedó como un no-op (no carga
  nada ni envía nada) para no romper las llamadas existentes; `js/analytics-config.js` ya
  solo guarda `APP_VERSION` y `HEART_EMOJI` (versión + color del corazón del footer).
- Esto vale tanto para la **web** como para la futura **app** (Play): Data Safety = "no se
  recopilan datos", lo que simplifica el cumplimiento para una app dirigida a niños.

## Instalable (PWA) y compartir

- **Instalable**: `manifest.json` + `sw.js` (service worker) + íconos hacen que se pueda
  "Instalar app" en Android/Chrome y "Agregar a inicio" en iPhone, con su ícono y
  pantalla completa. Funciona **offline** tras la primera carga (precache del app shell).
  - ⚠️ En cada deploy hay que **subir `CACHE_VERSION` en `sw.js`** (junto con `APP_VERSION`)
    para que los usuarios con la app instalada reciban la actualización.
- **Previews al compartir**: cada página tiene Open Graph / Twitter Card, así el link
  muestra una tarjeta linda (`og-image.png`) en WhatsApp/iMessage/etc.
- **Íconos**: `favicon.png`, `apple-touch-icon.png`, `icons/icon-192.png`, `icons/icon-512.png`.
  Se generan renderizando con headless Chrome (globo 🎈 sobre degradado); para regenerarlos,
  ver el patrón en el historial (plantillas `_icon.html`/`_og.html` + screenshot por tamaño).

## Estructura

```
index.html               → Hub: mascota, nivel, álbum, racha, selector de tema, juegos
medallas.html            → Medallero: nivel, progreso y medallas
album.html               → Álbum de stickers (palabras desbloqueadas por categoría)
css/main.css             → Estilos compartidos (mobile-first vertical)
js/sound.js              → Sonidos por código (Web Audio, sin archivos)
js/confetti.js           → Confeti en canvas, liviano
js/speech.js             → Voz en español (lee la palabra al acertar)
js/progress.js           → Estrellas + niveles + medallas + colección + racha diaria
js/words.js              → 134 palabras + emoji + categoría; CATEGORIES (compartido)
js/theme.js              → Tema elegido (categoría o "todos") + filtrado
js/qwerty.js             → Layout QWERTY compartido
js/idle.js               → Brillo de la pista por inactividad (+ señal "se trabó")
js/analytics.js          → Wrapper de analítica anónima (Umami), provider-agnóstico
js/analytics-config.js   → Config de analítica + APP_VERSION (website-id; vacío = desactivado)
manifest.json            → Manifest PWA (instalable, rutas relativas para el subpath)
sw.js                    → Service worker (precache app shell; subir CACHE_VERSION por deploy)
icons/ + *.png           → Íconos (192/512), apple-touch-icon, favicon, og-image (compartir)
games/word-guesser/      → "¡Adivina la Palabra!"  (index.html, style.css, game.js)
games/ordena/            → "Ordena las Letras"     (index.html, style.css, game.js)
games/letra-perdida/     → "Letra Perdida"         (index.html, style.css, game.js)
games/memoria/           → "Memoria de Palabras"   (index.html, style.css, game.js)
```

## Decisiones de diseño

- **Español neutro/latino** en palabras y mensajes de ánimo.
- **Tildes opcionales**: la palabra se escribe sin necesidad de acento, pero al
  acertar se muestra la ortografía correcta (con tilde). La `Ñ` sí cuenta.
- **Sin castigos**: si se equivoca, sonido suave + mensaje alentador y reintenta.
- **Rampa de dificultad**: arranca con palabras cortas y va subiendo.
- **Pista**: revela una letra cuando el chico se traba.
- **Estrellas ⭐ y racha 🔥** para enganchar (las estrellas se guardan en el celu).

## Sumar palabras

Editá `js/words.js` (la usan los cuatro juegos) y agregá objetos:

```js
{ w: "MARIPOSA", e: "🦋", c: "animales" },
```

`w` = palabra (con tilde si corresponde), `e` = emoji-pista, `c` = categoría (debe
ser una `key` de `CATEGORIES`). No repitas la misma palabra en dos categorías. Para
una categoría nueva, agregala también a `CATEGORIES` (con `label` y `emoji`); para que
Memoria funcione, conviene que tenga al menos 4 palabras de ≤7 letras.
