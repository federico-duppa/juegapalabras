// Motor de sonidos generado por código (Web Audio API).
// Sin archivos, sin licencias, anda offline. Sonidos alegres para chicos.

const Sound = (() => {
  let ctx = null;
  let muted = false;

  // El audio en celulares necesita un gesto del usuario para "despertar".
  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // Toca una nota simple con envolvente suave (sin clicks feos).
  function note(freq, start, dur, { type = "sine", gain = 0.25 } = {}) {
    const c = ctx;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t0 = c.currentTime + start;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function play(seq) {
    if (muted) return;
    ensure();
    seq();
  }

  // Notas musicales útiles (Hz)
  const N = {
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0,
    A4: 440.0, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25,
    F5: 698.46, G5: 783.99, A5: 880.0, C6: 1046.5,
  };

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; },

    // Toque suave al apretar una letra
    tap() {
      play(() => note(660, 0, 0.08, { type: "triangle", gain: 0.18 }));
    },

    // Borrar
    back() {
      play(() => note(300, 0, 0.09, { type: "sine", gain: 0.18 }));
    },

    // Revelar una pista: chispita
    hint() {
      play(() => {
        note(N.A5, 0, 0.1, { type: "triangle", gain: 0.18 });
        note(N.C6, 0.06, 0.12, { type: "triangle", gain: 0.18 });
      });
    },

    // Error amable (nunca agresivo)
    wrong() {
      play(() => {
        note(N.E4, 0, 0.14, { type: "sine", gain: 0.2 });
        note(N.C4, 0.1, 0.2, { type: "sine", gain: 0.2 });
      });
    },

    // ¡Acertaste! Arpegio alegre ascendente
    correct() {
      play(() => {
        note(N.C5, 0.0, 0.15, { type: "triangle", gain: 0.22 });
        note(N.E5, 0.1, 0.15, { type: "triangle", gain: 0.22 });
        note(N.G5, 0.2, 0.15, { type: "triangle", gain: 0.22 });
        note(N.C6, 0.3, 0.3, { type: "triangle", gain: 0.24 });
      });
    },

    // Ruidito tierno (corazón del footer): chispita juguetona ascendente
    cute() {
      play(() => {
        note(N.E5, 0.0, 0.1, { type: "triangle", gain: 0.2 });
        note(N.A5, 0.07, 0.1, { type: "triangle", gain: 0.2 });
        note(N.C6, 0.14, 0.18, { type: "triangle", gain: 0.22 });
        note(N.E5, 0.0, 0.28, { type: "sine", gain: 0.06 });
      });
    },

    // Subir de nivel / racha: fanfarria un poco más larga
    levelUp() {
      play(() => {
        const s = [N.C5, N.E5, N.G5, N.C6, N.G5, N.C6];
        s.forEach((f, i) => note(f, i * 0.09, 0.18, { type: "triangle", gain: 0.22 }));
        note(N.E5, 0.0, 0.5, { type: "sine", gain: 0.1 });
      });
    },
  };
})();
