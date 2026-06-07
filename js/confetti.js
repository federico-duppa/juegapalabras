// Confeti liviano en canvas, sin dependencias.
// Uso: Confetti.burst()  ->  explosión de papelitos de colores.

const Confetti = (() => {
  let canvas, cctx, pieces = [], raf = null;
  const COLORS = ["#ff5d8f", "#ffd166", "#06d6a0", "#4cc9f0", "#b388ff", "#ff8c42"];

  function setup() {
    if (canvas) return;
    canvas = document.createElement("canvas");
    canvas.id = "confetti-canvas";
    Object.assign(canvas.style, {
      position: "fixed", inset: "0", width: "100%", height: "100%",
      pointerEvents: "none", zIndex: "9999",
    });
    document.body.appendChild(canvas);
    cctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(count, originX, originY) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 7;
      pieces.push({
        x: originX, y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        size: 6 + Math.random() * 8,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        life: 1,
      });
    }
  }

  function tick() {
    cctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((p) => {
      p.vy += 0.18;          // gravedad
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 0.008;
      cctx.save();
      cctx.translate(p.x, p.y);
      cctx.rotate(p.rot);
      cctx.globalAlpha = Math.max(0, p.life);
      cctx.fillStyle = p.color;
      cctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      cctx.restore();
    });
    pieces = pieces.filter((p) => p.life > 0 && p.y < window.innerHeight + 40);
    if (pieces.length > 0) {
      raf = requestAnimationFrame(tick);
    } else {
      cctx.clearRect(0, 0, canvas.width, canvas.height);
      raf = null;
    }
  }

  return {
    burst(x, y) {
      setup();
      const ox = x ?? window.innerWidth / 2;
      const oy = y ?? window.innerHeight / 2.5;
      spawn(90, ox, oy);
      if (!raf) raf = requestAnimationFrame(tick);
    },
  };
})();
