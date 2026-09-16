/* ==========================================================================
   cursor.js — desktop only. A dot that tracks exactly, and a ring that lags
   behind it, reacting to what is under the pointer.
   ========================================================================== */

(function () {
  'use strict';

  const U = window.AM;

  function initCursor() {
    if (U.device.touch || U.device.mobile) return null;

    const el = document.getElementById('cursor');
    if (!el) return null;
    const dot = el.querySelector('.cursor__dot');
    const ring = el.querySelector('.cursor__ring');
    document.body.classList.add('has-cursor');

    const setDotX = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
    const setDotY = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
    const setRingX = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' });
    const setRingY = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' });

    const onMove = e => {
      setDotX(e.clientX); setDotY(e.clientY);
      setRingX(e.clientX); setRingY(e.clientY);
    };
    window.addEventListener('mousemove', onMove, { passive: true });

    /* state by target, delegated so it survives DOM changes */
    const hoverSel = 'a, button, [data-magnetic], .pill';
    const viewSel = '.project';

    document.addEventListener('pointerover', e => {
      if (e.target.closest(viewSel)) el.classList.add('is-view');
      else if (e.target.closest(hoverSel)) el.classList.add('is-hover');
    });
    document.addEventListener('pointerout', e => {
      if (e.target.closest(viewSel)) el.classList.remove('is-view');
      if (e.target.closest(hoverSel)) el.classList.remove('is-hover');
    });

    // keyboard users get the native cursor back the moment they tab
    window.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        document.body.classList.remove('has-cursor');
        window.removeEventListener('mousemove', onMove);
      }
    }, { once: true });

    return el;
  }

  window.AM.initCursor = initCursor;
})();
