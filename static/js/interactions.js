/* ==========================================================================
   interactions.js — micro interactions. All of them respond to the pointer;
   none of them run on their own.
   ========================================================================== */

(function () {
  'use strict';

  const U = window.AM;
  const fine = !U.device.touch && !U.device.reduced;

  /* ------------------------------------------------------------- magnetic */

  function magnetic() {
    if (!fine) return;
    document.querySelectorAll('[data-magnetic]').forEach(btn => {
      const xTo = gsap.quickTo(btn, 'x', { duration: 0.45, ease: 'power3' });
      const yTo = gsap.quickTo(btn, 'y', { duration: 0.45, ease: 'power3' });

      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.22);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.32);
      });
      btn.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* --------------------------------------------------------- project tilt */

  function tilt() {
    if (!fine) return;
    document.querySelectorAll('[data-tilt]').forEach(card => {
      const rx = gsap.quickTo(card, 'rotateX', { duration: 0.6, ease: 'power3' });
      const ry = gsap.quickTo(card, 'rotateY', { duration: 0.6, ease: 'power3' });
      const z = gsap.quickTo(card, 'z', { duration: 0.6, ease: 'power3' });

      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        rx((0.5 - py) * 3.2);
        ry((px - 0.5) * 4);
        z(18);
        // feeds the radial sheen
        card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', () => { rx(0); ry(0); z(0); });
    });
  }

  /* ------------------------------------------------------------ skill drift */

  function pills() {
    if (!fine) return;
    document.querySelectorAll('[data-pill]').forEach(pill => {
      const xTo = gsap.quickTo(pill, 'x', { duration: 0.5, ease: 'power3' });
      const yTo = gsap.quickTo(pill, 'y', { duration: 0.5, ease: 'power3' });
      pill.addEventListener('pointermove', e => {
        const r = pill.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.16);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
      });
      pill.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* ------------------------------------------------------------ mobile nav */

  function mobileNav() {
    const nav = document.getElementById('nav');
    const burger = document.getElementById('nav-burger');
    if (!nav || !burger) return;

    const close = () => {
      nav.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Open menu');
    };

    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });

    nav.querySelectorAll('.nav__links a').forEach(a => a.addEventListener('click', close));
    window.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  function initInteractions() {
    magnetic();
    tilt();
    pills();
    mobileNav();
    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
  }

  window.AM.initInteractions = initInteractions;
})();
