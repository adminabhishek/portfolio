/* ==========================================================================
   utils.js — shared helpers. Loaded first, so it also flips the `js` flag
   that unlocks the animated states in animations.css.
   ========================================================================== */

document.documentElement.classList.add('js');

window.AM = (function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const narrow = window.innerWidth < 760;
  const cores = navigator.hardwareConcurrency || 4;

  /* Three tiers keep the canvases honest on weaker hardware. */
  let tier = 'high';
  if (narrow || touch) tier = 'low';
  else if (window.innerWidth < 1200 || cores <= 4) tier = 'mid';

  const device = {
    reduced,
    touch,
    mobile: narrow || touch,
    tier,
    // particle budget for the portrait formation
    portraitParticles: tier === 'high' ? 3200 : tier === 'mid' ? 1900 : 950,
    ambientParticles: tier === 'high' ? 130 : tier === 'mid' ? 90 : 50,
    strands: tier === 'high' ? 7 : tier === 'mid' ? 6 : 4,
    trail: tier === 'high' ? 58 : tier === 'mid' ? 46 : 30,
    glow: tier !== 'low',
    dprCap: tier === 'high' ? 2 : 1.5
  };

  /* ---------------------------------------------------------------- canvas */

  const resizers = [];
  let resizeQueued = false;

  function onResize(fn) {
    resizers.push(fn);
  }

  window.addEventListener('resize', function () {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(function () {
      resizeQueued = false;
      for (let i = 0; i < resizers.length; i++) resizers[i]();
    });
  }, { passive: true });

  /**
   * Sizes a canvas to the viewport in CSS pixels and scales the context by
   * the (capped) device pixel ratio, so all drawing code can stay in CSS px.
   */
  function fitCanvas(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, device.dprCap);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h, dpr };
  }

  /* ------------------------------------------------------------------ math */

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /** Cheap, deterministic, smooth-ish noise. Good enough for turbulence. */
  function noise(x, y) {
    return (
      Math.sin(x * 1.31 + y * 0.77) * 0.5 +
      Math.sin(x * 0.53 - y * 1.19 + 2.1) * 0.3 +
      Math.sin(x * 2.17 + y * 0.31 + 4.7) * 0.2
    );
  }

  /**
   * Draws an image into a rect with object-fit: cover semantics.
   * posX/posY mirror CSS object-position (0–1).
   */
  function drawCover(ctx, img, x, y, w, h, posX, posY) {
    const ir = img.naturalWidth / img.naturalHeight;
    const rr = w / h;
    let sw, sh, sx, sy;
    if (ir > rr) {
      sh = img.naturalHeight;
      sw = sh * rr;
      sx = (img.naturalWidth - sw) * posX;
      sy = 0;
    } else {
      sw = img.naturalWidth;
      sh = sw / rr;
      sx = 0;
      sy = (img.naturalHeight - sh) * posY;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  return { device, fitCanvas, onResize, clamp, lerp, rand, easeOut, easeInOut, noise, drawCover };
})();
