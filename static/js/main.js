/* ==========================================================================
   main.js — boot order.

   The intro owns the first ~6.5 seconds; scroll behaviour only comes online
   once the portrait has landed, so ScrollTrigger measures a settled layout.
   ========================================================================== */

(function () {
  'use strict';

  const U = window.AM;

  function icons() {
    if (window.lucide && typeof lucide.createIcons === 'function') {
      lucide.createIcons({ attrs: { 'stroke-width': 1.6 } });
    }
  }

  function boot() {
    icons();

    if (typeof gsap === 'undefined') {
      // No animation library: show the page and stop pretending.
      document.documentElement.classList.remove('js');
      document.body.classList.remove('is-loading');
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    gsap.config({ force3D: true });

    U.initCursor();
    U.initInteractions();

    const scroll = new U.Scroll();
    const intro = new U.Intro();

    intro.start((wave, field) => {
      scroll.init(wave, field);
    });

    /* Reduced-motion path resolves its own timeline, so wire scroll up anyway
       in case the intro finished without a callback. */
    if (U.device.reduced) {
      setTimeout(() => {
        if (!scroll.ready) scroll.init(intro.wave, intro.field);
      }, 900);
    }

    /* pause canvases when the tab is hidden — no burning frames in the background */
    document.addEventListener('visibilitychange', () => {
      const parts = [intro.wave, intro.field];
      parts.forEach(p => {
        if (!p) return;
        if (document.hidden) p.stop();
        else p.start();
      });
    });

    /* teardown, mostly for dev reloads */
    window.addEventListener('pagehide', () => {
      if (intro.wave) intro.wave.stop();
      if (intro.field) intro.field.stop();
      if (intro.tl) intro.tl.kill();
      ScrollTrigger.getAll().forEach(t => t.kill());
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
