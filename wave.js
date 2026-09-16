/* ==========================================================================
   wave.js — the visual identity.

   Multiple light strands, each a head travelling along a rule plus a decaying
   trail drawn as layered strokes (wide glow → mid body → thin white core).
   That layering is what reads as liquid light rather than an SVG line.

   Modes, in story order:
     enter  — heads fall in from above the viewport, curving toward centre
     orbit  — heads wrap the centre, concentrating the light
     flow   — heads stretch out horizontally; this is what survives into the
              hero as background decoration (same canvas, never re-created)

   Mode switches never reset a trail, so the motion is continuous.
   ========================================================================== */

(function () {
  'use strict';

  const U = window.AM;

  const PALETTE = [
    ['rgba(76,125,255,', 'rgba(160,200,255,'],
    ['rgba(139,92,246,', 'rgba(205,190,255,'],
    ['rgba(95,216,255,', 'rgba(220,245,255,'],
    ['rgba(58,90,235,', 'rgba(150,180,255,']
  ];

  function WaveSystem(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    const fit = U.fitCanvas(canvas);
    this.ctx = fit.ctx;
    this.w = fit.w;
    this.h = fit.h;

    this.mode = 'idle';
    this.time = 0;

    /* tweenable state (GSAP drives these) */
    this.opacity = 0;
    this.ampMul = 1;
    this.flowSpeed = 1;
    this.heroY = 0.5;     // vertical anchor for flow mode, as a fraction of h
    this.centerPull = 1;

    this.onEmit = opts.onEmit || null;
    this.maxTrail = U.device.trail;
    this.strands = [];
    this.build(U.device.strands);

    this.running = false;
    this._raf = null;
    this._last = 0;

    this._resize = () => {
      const f = U.fitCanvas(canvas);
      this.ctx = f.ctx;
      this.w = f.w;
      this.h = f.h;
    };
    U.onResize(this._resize);
  }

  WaveSystem.prototype.build = function (count) {
    this.strands.length = 0;
    for (let i = 0; i < count; i++) {
      const lane = (i / (count - 1) - 0.5) * 2;   // -1 … 1 across the screen
      this.strands.push({
        trail: [],
        p: -i * 0.09,                             // staggered entry
        lane,
        startX: this.w * (0.5 + lane * 0.42) + U.rand(-40, 40),
        phase: U.rand(0, Math.PI * 2),
        freq: U.rand(1.6, 3.4),
        amp: U.rand(60, 190),
        speed: U.rand(0.85, 1.25),
        width: U.rand(1.6, 4.2),
        color: PALETTE[i % PALETTE.length],
        ang: 0,
        rad: 0,
        orbitSpeed: U.rand(0.8, 1.6) * (i % 2 ? 1 : -1),
        fx: 0,
        oy: 0,                                    // offset that decays on mode change
        laneY: lane * U.rand(30, 120),
        head: { x: 0, y: -200 }
      });
    }
  };

  WaveSystem.prototype.setMode = function (mode) {
    if (this.mode === mode) return;
    const prev = this.mode;
    this.mode = mode;

    for (let i = 0; i < this.strands.length; i++) {
      const s = this.strands[i];
      if (mode === 'orbit' && prev !== 'orbit') {
        // adopt current head position as the orbit seat → no jump
        const dx = s.head.x - this.w / 2;
        const dy = s.head.y - this.h / 2;
        s.ang = Math.atan2(dy, dx);
        s.rad = Math.max(Math.hypot(dx, dy), 60);
        s.targetRad = this.h * U.rand(0.1, 0.2);
      }
      if (mode === 'flow' && prev !== 'flow') {
        s.fx = s.head.x;
        s.oy = s.head.y - this.flowY(s, s.fx);
      }
    }
  };

  /** The sine path a strand follows in flow mode. */
  WaveSystem.prototype.flowY = function (s, x) {
    return (
      this.h * this.heroY +
      s.laneY +
      Math.sin(x * 0.0042 + s.phase) * s.amp * 0.55 * this.ampMul +
      Math.sin(x * 0.0011 - s.phase) * s.amp * 0.3 * this.ampMul
    );
  };

  WaveSystem.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    const loop = now => {
      if (!this.running) return;
      const dt = Math.min((now - this._last) / 16.667, 3);
      this._last = now;
      this.time += dt * 0.016;
      this.step(dt);
      this.draw();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  };

  WaveSystem.prototype.stop = function () {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  };

  WaveSystem.prototype.step = function (dt) {
    const cx = this.w / 2;
    const cy = this.h / 2;
    const t = this.time;

    for (let i = 0; i < this.strands.length; i++) {
      const s = this.strands[i];
      let x = s.head.x;
      let y = s.head.y;

      if (this.mode === 'enter') {
        s.p = Math.min(s.p + 0.0135 * s.speed * dt, 1);
        const p = Math.max(s.p, 0);
        const e = U.easeInOut(p);
        // horizontal: starts wide, curves toward the centre
        const wobble = Math.sin(p * Math.PI * s.freq + s.phase) * s.amp * (1 - p * 0.72);
        x = U.lerp(s.startX, cx + s.lane * 26 * this.centerPull, e) + wobble;
        // vertical: enters from above the fold and settles on the centre
        y = U.lerp(-this.h * 0.25, cy, U.easeOut(p));
        // turbulence
        x += U.noise(p * 3 + s.phase, t * 0.8) * 26 * (1 - p * 0.5);
        y += U.noise(p * 2.4 + s.phase + 5, t * 0.6) * 14;
      } else if (this.mode === 'orbit') {
        s.rad += (s.targetRad - s.rad) * 0.035 * dt;
        s.ang += s.orbitSpeed * 0.035 * dt;
        const r = s.rad * (1 + 0.12 * Math.sin(t * 2.1 + s.phase));
        x = cx + Math.cos(s.ang) * r * 1.18;
        y = cy + Math.sin(s.ang) * r * 0.94;
        x += U.noise(s.ang, t) * 10;
        y += U.noise(s.ang + 2, t) * 8;
      } else if (this.mode === 'flow') {
        s.fx += (5.2 + s.speed * 2.4) * this.flowSpeed * dt;
        if (s.fx > this.w + 240) {
          s.fx = -240;
          s.trail.length = 0;
        }
        s.oy *= Math.pow(0.94, dt);      // ease off the hand-off offset
        x = s.fx;
        y = this.flowY(s, s.fx) + s.oy + U.noise(s.fx * 0.004, t * 0.5) * 12 * this.ampMul;
      } else {
        continue;
      }

      s.head.x = x;
      s.head.y = y;
      s.trail.push(x, y);
      const max = this.maxTrail * 2;
      if (s.trail.length > max) s.trail.splice(0, s.trail.length - max);

      // sparks along the brightest part of the flow
      if (this.onEmit && this.opacity > 0.25 && Math.random() < 0.12) {
        this.onEmit(x, y);
      }
    }
  };

  WaveSystem.prototype.draw = function () {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    if (this.opacity <= 0.002) return;

    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const glow = U.device.glow;

    for (let i = 0; i < this.strands.length; i++) {
      const s = this.strands[i];
      const n = s.trail.length;
      if (n < 6) continue;

      const tailX = s.trail[0], tailY = s.trail[1];
      const headX = s.trail[n - 2], headY = s.trail[n - 1];

      // one path, reused for the three passes
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      for (let k = 2; k < n - 2; k += 2) {
        const mx = (s.trail[k] + s.trail[k + 2]) / 2;
        const my = (s.trail[k + 1] + s.trail[k + 3]) / 2;
        ctx.quadraticCurveTo(s.trail[k], s.trail[k + 1], mx, my);
      }
      ctx.lineTo(headX, headY);

      const grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
      const base = s.color[0];
      const bright = s.color[1];
      grad.addColorStop(0, base + '0)');
      grad.addColorStop(0.45, base + (0.22 * this.opacity).toFixed(3) + ')');
      grad.addColorStop(1, bright + (0.85 * this.opacity).toFixed(3) + ')');

      // 1 — wide atmospheric glow
      ctx.strokeStyle = grad;
      ctx.lineWidth = s.width * 5.2;
      ctx.globalAlpha = 0.16 * this.opacity;
      if (glow) {
        ctx.shadowBlur = 26;
        ctx.shadowColor = base + '0.5)';
      }
      ctx.stroke();

      // 2 — body
      ctx.lineWidth = s.width * 1.9;
      ctx.globalAlpha = 0.5 * this.opacity;
      if (glow) ctx.shadowBlur = 12;
      ctx.stroke();

      // 3 — thin white core, the "liquid light"
      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(s.width * 0.45, 0.7);
      ctx.globalAlpha = 0.9 * this.opacity;
      ctx.strokeStyle = 'rgba(238,246,255,0.9)';
      ctx.stroke();

      // head bloom
      if (glow) {
        const r = s.width * 7;
        const rg = ctx.createRadialGradient(headX, headY, 0, headX, headY, r);
        rg.addColorStop(0, 'rgba(255,255,255,0.55)');
        rg.addColorStop(0.35, bright + '0.28)');
        rg.addColorStop(1, base + '0)');
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(headX, headY, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';
  };

  window.AM.WaveSystem = WaveSystem;
})();
