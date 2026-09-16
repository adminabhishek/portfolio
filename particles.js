/* ==========================================================================
   particles.js — one canvas, two populations.

   1. ambient   : barely-there dust that exists before anything happens
   2. portrait  : particles sampled from the real photograph. They arrive with
                  the wave, swirl around the centre, then spring onto their
                  pixel targets so the photo is literally assembled.

   Everything the intro timeline needs to drive is a plain number on the
   instance (gather, form, portraitAlpha, disperse), so GSAP can tween it.
   ========================================================================== */

(function () {
  'use strict';

  const U = window.AM;

  function ParticleField(canvas) {
    this.canvas = canvas;
    const fit = U.fitCanvas(canvas);
    this.ctx = fit.ctx;
    this.w = fit.w;
    this.h = fit.h;

    this.ambient = [];
    this.portrait = [];
    this.sparks = [];

    /* tweenable state */
    this.ambientAlpha = 0;   // dust visibility
    this.gather = 0;         // 0 = drifting in, 1 = tight swirl at centre
    this.form = 0;           // 0 = swirl, 1 = locked on photo pixels
    this.portraitAlpha = 0;  // particle photo visibility
    this.disperse = 0;       // 0 = held, 1 = blown apart

    this.time = 0;
    this.running = false;
    this._raf = null;
    this._last = 0;

    this.cx = this.w / 2;
    this.cy = this.h / 2;

    this._resize = () => {
      const f = U.fitCanvas(canvas);
      this.ctx = f.ctx;
      this.w = f.w;
      this.h = f.h;
      this.cx = this.w / 2;
      this.cy = this.h / 2;
    };
    U.onResize(this._resize);

    this.seedAmbient(U.device.ambientParticles);
  }

  /* ------------------------------------------------------------- ambient */

  ParticleField.prototype.seedAmbient = function (count) {
    this.ambient.length = 0;
    for (let i = 0; i < count; i++) {
      this.ambient.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        z: U.rand(0.3, 1),            // depth → size + speed
        vx: U.rand(-0.06, 0.06),
        vy: U.rand(-0.16, -0.03),
        a: U.rand(0.15, 0.7),
        tw: U.rand(0, Math.PI * 2)    // twinkle phase
      });
    }
  };

  /* ------------------------------------------------------------ portrait */

  /**
   * Samples the photo into particle targets, matching the exact on-screen
   * crop of the portrait circle (cover, object-position 50% 6%).
   * @param {HTMLImageElement} img
   * @param {number} size  diameter of the portrait circle in CSS px
   */
  ParticleField.prototype.buildPortrait = function (img, size) {
    const budget = U.device.portraitParticles;
    const res = Math.min(size, 420);                 // sampling resolution
    const off = document.createElement('canvas');
    off.width = off.height = res;
    const octx = off.getContext('2d');

    // circular crop, same framing as the DOM portrait
    octx.save();
    octx.beginPath();
    octx.arc(res / 2, res / 2, res / 2, 0, Math.PI * 2);
    octx.clip();
    U.drawCover(octx, img, 0, 0, res, res, 0.5, 0.06);
    octx.restore();

    let data;
    try {
      data = octx.getImageData(0, 0, res, res).data;
    } catch (err) {
      // cross-origin image: skip the particle portrait, keep the rest of the intro
      return 0;
    }
    const candidates = [];
    const step = 2;
    for (let y = 0; y < res; y += step) {
      for (let x = 0; x < res; x += step) {
        const i = (y * res + x) * 4;
        const a = data[i + 3];
        if (a < 40) continue;
        const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
        candidates.push(x, y, lum, a / 255);
      }
    }

    const total = candidates.length / 4;
    const keep = Math.min(budget, total);
    const stride = total / keep;
    const scale = size / res;
    const half = size / 2;

    this.portrait.length = 0;
    for (let k = 0; k < keep; k++) {
      const i = Math.floor(k * stride) * 4;
      const lum = candidates[i + 2];
      const alpha = candidates[i + 3];

      // target, relative to the portrait centre (the stage never moves while
      // particles are alive, so centre-relative is enough)
      const tx = candidates[i] * scale - half;
      const ty = candidates[i + 1] * scale - half;

      // swirl seat: where this particle waits during the gathering phase
      const ang = Math.random() * Math.PI * 2;
      const rad = half * U.rand(0.55, 1.5);

      this.portrait.push({
        tx, ty,
        ang,
        rad,
        spin: U.rand(0.25, 0.75) * (Math.random() < 0.5 ? -1 : 1),
        // entry position: above the fold, spread wide, like the wave brought them
        x: this.cx + U.rand(-0.42, 0.42) * this.w,
        y: -U.rand(0.05, 0.9) * this.h,
        vx: 0, vy: U.rand(0.4, 1.6),
        lum,
        alpha,
        size: lum > 0.72 ? U.rand(1.1, 2.1) : U.rand(0.7, 1.5),
        delay: Math.random() * 0.45,          // staggers the lock-on
        k: U.rand(0.055, 0.115),              // spring stiffness
        dx: U.rand(-1, 1), dy: U.rand(-1, 1)  // disperse direction
      });
    }
    return this.portrait.length;
  };

  /* --------------------------------------------------------------- sparks */

  ParticleField.prototype.spark = function (x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = U.rand(0.4, 2.4);
      this.sparks.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 1,
        decay: U.rand(0.012, 0.03),
        size: U.rand(0.8, 1.9)
      });
    }
  };

  /* ------------------------------------------------------------ main loop */

  ParticleField.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    const loop = now => {
      if (!this.running) return;
      const dt = Math.min((now - this._last) / 16.667, 3); // frames, capped
      this._last = now;
      this.time += dt * 0.016;
      this.step(dt);
      this.draw();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  };

  ParticleField.prototype.stop = function () {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  };

  /** Drops the heavy population once the photo has taken over. */
  ParticleField.prototype.releasePortrait = function () {
    this.portrait.length = 0;
    this.sparks.length = 0;
  };

  ParticleField.prototype.step = function (dt) {
    const t = this.time;

    /* ambient dust */
    for (let i = 0; i < this.ambient.length; i++) {
      const p = this.ambient[i];
      p.x += (p.vx + U.noise(p.x * 0.002, t * 0.4) * 0.12) * p.z * dt;
      p.y += p.vy * p.z * dt;
      if (p.y < -10) { p.y = this.h + 10; p.x = Math.random() * this.w; }
      if (p.x < -10) p.x = this.w + 10;
      if (p.x > this.w + 10) p.x = -10;
    }

    /* portrait particles */
    const g = this.gather;
    const f = this.form;
    const d = this.disperse;
    const cx = this.cx;
    const cy = this.cy;

    for (let i = 0; i < this.portrait.length; i++) {
      const p = this.portrait[i];

      if (d > 0) {
        // blown outward as the wave takes the photo sideways
        p.x += (p.dx * 5 + 6) * d * dt;
        p.y += p.dy * 3.2 * d * dt;
        continue;
      }

      // swirl seat, tightening as `gather` rises
      p.ang += p.spin * 0.02 * dt * (1.6 - g);
      const r = p.rad * U.lerp(2.5, 1, g);
      const sx = cx + Math.cos(p.ang) * r;
      const sy = cy + Math.sin(p.ang) * r * 0.92;

      // per-particle lock-on progress
      const local = U.clamp((f - p.delay) / (1 - p.delay), 0, 1);
      const e = U.easeInOut(local);

      const gx = U.lerp(sx, cx + p.tx, e);
      const gy = U.lerp(sy, cy + p.ty, e);

      // spring + turbulence; turbulence fades out as the photo resolves
      const turb = (1 - e) * 0.9;
      const nx = U.noise(p.x * 0.006, t * 0.7) * turb;
      const ny = U.noise(p.y * 0.006 + 3.3, t * 0.7) * turb;

      const pull = p.k * U.lerp(0.35 + g * 0.5, 1.5, e);
      p.vx += (gx - p.x) * pull + nx;
      p.vy += (gy - p.y) * pull + ny;

      // drift downward while still arriving
      if (g < 0.2) p.vy += 0.12 * (1 - g);

      const damp = U.lerp(0.9, 0.76, e);
      p.vx *= damp;
      p.vy *= damp;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    /* sparks */
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.96;
      s.vy = s.vy * 0.96 - 0.02 * dt;
      s.life -= s.decay * dt;
      if (s.life <= 0) this.sparks.splice(i, 1);
    }
  };

  ParticleField.prototype.draw = function () {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = 'lighter';

    /* dust */
    if (this.ambientAlpha > 0.001) {
      for (let i = 0; i < this.ambient.length; i++) {
        const p = this.ambient[i];
        const tw = 0.6 + 0.4 * Math.sin(this.time * 2 + p.tw);
        ctx.globalAlpha = p.a * tw * this.ambientAlpha * 0.55;
        ctx.fillStyle = i % 5 === 0 ? '#9ad4ff' : '#7f9cff';
        const s = p.z * 1.5;
        ctx.fillRect(p.x, p.y, s, s);
      }
    }

    /* the photograph, as particles */
    if (this.portraitAlpha > 0.001 && this.portrait.length) {
      const pa = this.portraitAlpha;
      const glow = U.device.glow;
      for (let i = 0; i < this.portrait.length; i++) {
        const p = this.portrait[i];
        const local = U.clamp((this.form - p.delay) / (1 - p.delay), 0, 1);
        ctx.globalAlpha = p.alpha * pa * (0.28 + 0.72 * local) * (1 - this.disperse * 0.85);

        // cold blue while it is still energy, warmer and whiter as it resolves
        if (p.lum > 0.66) {
          ctx.fillStyle = local > 0.6 ? '#eaf2ff' : '#bcd8ff';
        } else if (p.lum > 0.3) {
          ctx.fillStyle = '#6f9bff';
        } else {
          ctx.fillStyle = '#5b5fe0';
        }
        const s = p.size * (1 + (1 - local) * 0.5);
        ctx.fillRect(p.x, p.y, s, s);

        if (glow && p.lum > 0.86 && i % 11 === 0) {
          ctx.globalAlpha *= 0.35;
          ctx.fillRect(p.x - 1, p.y - 1, s + 2, s + 2);
        }
      }
    }

    /* sparks */
    for (let i = 0; i < this.sparks.length; i++) {
      const s = this.sparks[i];
      ctx.globalAlpha = s.life * 0.9;
      ctx.fillStyle = '#dff1ff';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  window.AM.ParticleField = ParticleField;
})();
