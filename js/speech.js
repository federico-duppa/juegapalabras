// Lee texto en voz alta en español (Web Speech API).
// Refuerza la pronunciación cuando el chico acierta. Respeta el silencio (mute).

const Speech = (() => {
  const synth = window.speechSynthesis;
  let voice = null;

  function pickVoice() {
    if (!synth) return;
    const voices = synth.getVoices();
    // Preferimos una voz en español (es-ES, es-MX, es-US, es-AR, etc.)
    voice =
      voices.find((v) => /^es(-|_|$)/i.test(v.lang) && /female|mujer|mónica|paulina|google/i.test(v.name)) ||
      voices.find((v) => /^es(-|_|$)/i.test(v.lang)) ||
      null;
  }

  if (synth) {
    pickVoice();
    // Las voces a veces cargan tarde:
    synth.addEventListener?.("voiceschanged", pickVoice);
  }

  return {
    supported() { return !!synth; },

    // Dice una palabra/frase. `enabled=false` (p. ej. mute) la silencia.
    say(text, enabled = true) {
      if (!synth || !enabled) return;
      try {
        synth.cancel(); // corta lo anterior para que no se encime
        speak(text);
      } catch (e) {
        /* si la voz no está disponible, no pasa nada */
      }
    },

    // Encola una frase SIN cortar lo que se está diciendo: así un mensaje
    // alentador suena DESPUÉS de leer la palabra, no encima.
    cheer(text, enabled = true) {
      if (!synth || !enabled) return;
      try { speak(text); } catch (e) { /* sin voz: no pasa nada */ }
    },

    // Anuncio al ENTRAR a un juego ("Adivina la palabra", "Encuentra el error"...).
    // El audio en celulares suele necesitar un gesto: si al cargar la página queda
    // bloqueado, lo decimos en el primer toque del usuario (una sola vez).
    announce(text, enabled = true) {
      if (!synth || !enabled) return;
      let started = false;
      try {
        synth.cancel();
        const u = makeUtter(text);
        u.onstart = () => { started = true; };
        synth.speak(u);
      } catch (e) { /* nada */ }
      const onGesture = () => {
        if (!started && synth && !synth.speaking) {
          try { synth.cancel(); synth.speak(makeUtter(text)); } catch (e) { /* nada */ }
        }
      };
      try { document.addEventListener("pointerdown", onGesture, { once: true }); } catch (e) { /* nada */ }
    },
  };

  function makeUtter(text) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = (voice && voice.lang) || "es-ES";
    if (voice) u.voice = voice;
    u.rate = 0.9;   // un poquito lento, para chicos
    u.pitch = 1.1;  // tono alegre
    u.volume = 1;
    return u;
  }
  function speak(text) { synth.speak(makeUtter(text)); }
})();
