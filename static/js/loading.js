/* ==========================================================================
   loading.js — the signature sequence.

   One GSAP master timeline owns the whole story: darkness → wave → gathering
   → portrait formation → brand → horizontal transition → hero. The portrait
   is a single fixed element that is FLIP-animated into the hero slot, so the
   same photograph really does travel into the homepage.

   Nothing here fades a "loading screen" out. The intro *becomes* the page.
   ========================================================================== */

(function () {
  'use strict';

  const U = window.AM;

  function Intro() {
    this.tl = null;
    this.wave = null;
    this.field = null;
    this.done = false;
  }

  /* -------------------------------------------------------------- helpers */

  /** Where the hero portrait sits, as a fraction of viewport height. */
  function heroAnchor(slot) {
    const r = slot.getBoundingClientRect();
    return U.clamp((r.top + r.height / 2) / window.innerHeight, 0.2, 0.8);
  }

  /** FLIP delta from the centre stage to the hero slot. */
  function flipDelta(stage, slot) {
    const s = stage.getBoundingClientRect();
    const h = slot.getBoundingClientRect();
    return {
      dx: (h.left + h.width / 2) - (s.left + s.width / 2),
      dy: (h.top + h.height / 2) - (s.top + s.height / 2),
      scale: h.width / s.width
    };
  }

  function loadImage(img) {
    if (img.complete && img.naturalWidth) return Promise.resolve(img);
    return new Promise(res => {
      img.addEventListener('load', () => res(img), { once: true });
      img.addEventListener('error', () => res(null), { once: true });
    });
  }

  /* ------------------------------------------------------------- reduced */

  Intro.prototype.reducedIntro = function (el, onDone) {
    // An elegant, cheap reveal: no particle storm, no long wait.
    gsap.set(el.stage, { display: 'none' });
    gsap.set(el.introCopy, { display: 'none' });
    gsap.set(el.skip, { display: 'none' });
    gsap.set([el.heroPortrait, el.slotRing, el.slotGlow], { opacity: 1 });

    this.wave.heroY = heroAnchor(el.slot);
    this.wave.opacity = 0.3;
    this.wave.ampMul = 0.8;
    this.wave.setMode('flow');
    this.wave.start();

    const tl = gsap.timeline({
      onComplete: () => {
        document.body.classList.remove('is-loading');
        onDone && onDone();
      }
    });
    tl.to(el.site, { opacity: 1, duration: 0.5 })
      .to(el.heroText, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06 }, 0.1)
      .to([el.nav, el.heroScroll, el.heroAside], { opacity: 1, duration: 0.4 }, 0.2);
    this.tl = tl;
  };

  /* ---------------------------------------------------------------- start */

  Intro.prototype.start = function (onDone) {
    const el = {
      stage: document.getElementById('portrait-stage'),
      stageRing: document.querySelector('.stage__ring'),
      stageGlow: document.querySelector('.stage__glow'),
      portrait: document.getElementById('portrait-image'),
      introCopy: document.getElementById('intro-copy'),
      nameEl: document.querySelector('.intro__name'),
      nameLines: document.querySelectorAll('.intro__name .line__inner'),
      brandBits: document.querySelectorAll('.intro__brand span, .intro__brand i'),
      skip: document.getElementById('skip-intro'),
      core: document.getElementById('intro-core'),
      site: document.getElementById('site'),
      nav: document.getElementById('nav'),
      slot: document.getElementById('hero-slot'),
      slotRing: document.querySelector('.hero__portrait-slot .slot__ring'),
      slotGlow: document.querySelector('.hero__portrait-slot .slot__glow'),
      heroPortrait: document.getElementById('hero-portrait'),
      heroScroll: document.querySelector('.hero__scroll'),
      heroAside: document.querySelector('.hero__aside'),
      heroText: [
        '.hero__eyebrow', '.hero__hi', '.hero__first', '.hero__last',
        '.hero__role', '.hero__desc', '.hero__actions', '.hero__socials'
      ].map(s => document.querySelector(s)).filter(Boolean)
    };

    /* hero copy waits off-stage so the reveal can happen around the portrait */
    gsap.set(el.heroText, { opacity: 0, y: 26 });

    this.field = new U.ParticleField(document.getElementById('particle-canvas'));
    this.wave = new U.WaveSystem(document.getElementById('wave-canvas'), {
      onEmit: (x, y) => { if (Math.random() < 0.35) this.field.spark(x, y, 1); }
    });

    if (U.device.reduced) {
      this.reducedIntro(el, onDone);
      return;
    }

    const field = this.field;
    const wave = this.wave;
    field.start();
    wave.start();

    loadImage(el.portrait).then(img => {
      if (img) field.buildPortrait(img, el.stage.offsetWidth);
      this.build(el, onDone);
    });
  };

  /* ------------------------------------------------------- master timeline */

  Intro.prototype.build = function (el, onDone) {
    const field = this.field;
    const wave = this.wave;
    let flip = null;   // resolved lazily, at the moment of travel

    const tl = gsap.timeline({
      defaults: { ease: 'power2.out' },
      onComplete: () => {
        this.done = true;
        document.body.classList.remove('is-loading');
        el.introCopy.style.display = 'none';
        el.stage.style.display = 'none';
        el.skip.style.display = 'none';
        field.releasePortrait();
        onDone && onDone(wave, field);
      }
    });
    this.tl = tl;

    /* ---- 01 darkness: dust you almost don't notice ---------------------- */
    tl.to(field, { ambientAlpha: 1, duration: 1.1, ease: 'sine.out' }, 0)
      .to(el.core, { opacity: 0.12, duration: 1.2 }, 0)
      .to(el.skip, { opacity: 1, duration: 0.6 }, 0.9);

    /* ---- 02 the wave enters from above ---------------------------------- */
    tl.add(() => wave.setMode('enter'), 0.55)
      .to(wave, { opacity: 1, duration: 1.1, ease: 'sine.inOut' }, 0.55);

    /* ---- 03 gathering at the centre ------------------------------------- */
    tl.add('gather', 1.85)
      .add(() => wave.setMode('orbit'), 'gather')
      .to(field, { gather: 1, duration: 1.4, ease: 'power2.inOut' }, 'gather')
      .to(field, { portraitAlpha: 1, duration: 0.7 }, 'gather')
      .to(el.core, { opacity: 0.55, scale: 1, duration: 1.3, ease: 'power2.out' }, 'gather')
      .to(el.stageGlow, { opacity: 0.7, duration: 1.1 }, 'gather+=0.3')
      .add(() => {
        // a burst of sparks as the light concentrates
        for (let i = 0; i < 26; i++) {
          field.spark(field.cx + U.rand(-70, 70), field.cy + U.rand(-70, 70), 1);
        }
      }, 'gather+=0.8');

    /* ---- 04 the photograph assembles itself ----------------------------- */
    tl.add('form', 2.95)
      .to(field, { form: 1, duration: 1.6, ease: 'power2.inOut' }, 'form')
      .to(el.core, { opacity: 0.8, duration: 0.8 }, 'form+=0.4')
      // particles hand over to the real photo: a radial window opens while the
      // blur resolves — never a plain opacity fade
      .to(el.portrait, { opacity: 1, duration: 0.6 }, 'form+=0.75')
      .fromTo(el.portrait, { '--reveal': 0 }, {
        '--reveal': 100, duration: 1.4, ease: 'power2.inOut'
      }, 'form+=0.75')
      .to(el.portrait, {
        filter: 'blur(0px) brightness(1) saturate(1)',
        scale: 1,
        duration: 1.5,
        ease: 'power3.out'
      }, 'form+=0.75')
      .to(el.stageRing, { opacity: 1, duration: 1.0 }, 'form+=1.0')
      .to(field, { portraitAlpha: 0.22, duration: 0.9 }, 'form+=1.35')
      .to(wave, { opacity: 0.72, duration: 0.9 }, 'form+=1.35');

    /* ---- 05 brand reveal ------------------------------------------------ */
    tl.add('name', 4.75)
      .to(el.nameLines, {
        y: '0%', filter: 'blur(0px)', duration: 1.15,
        stagger: 0.13, ease: 'expo.out'
      }, 'name')
      .fromTo(el.nameEl, { letterSpacing: '0.2em' }, {
        letterSpacing: '0.06em', duration: 1.4, ease: 'power3.out'
      }, 'name')
      .to(el.brandBits, {
        opacity: 1, filter: 'blur(0px)', duration: 0.7,
        stagger: 0.045, ease: 'power2.out'
      }, 'name+=0.75');

    /* ---- 06 the transition: wave stretches, portrait travels ------------ */
    tl.add('transition', 5.95)
      .add(() => {
        wave.heroY = heroAnchor(el.slot);
        wave.setMode('flow');
        flip = flipDelta(el.stage, el.slot);
      }, 'transition')
      .to(wave, { ampMul: 1.4, flowSpeed: 2.1, opacity: 0.95, duration: 1.2 }, 'transition')
      .to(field, { disperse: 1, portraitAlpha: 0, duration: 1.1, ease: 'power1.in' }, 'transition')
      .to(el.introCopy, {
        opacity: 0, y: -26, filter: 'blur(8px)', duration: 0.85, ease: 'power2.in'
      }, 'transition')
      .to(el.core, { opacity: 0.2, scale: 1.7, duration: 1.4 }, 'transition')
      .to(el.site, { opacity: 1, duration: 0.9, ease: 'sine.out' }, 'transition+=0.05')

      /* the portrait flies into the hero */
      .to(el.stage, {
        x: () => flip.dx,
        y: () => flip.dy,
        scale: () => flip.scale,
        duration: 1.45,
        ease: 'power3.inOut'
      }, 'transition+=0.15')

      /* homepage builds around the moving portrait */
      .to(el.nav, { opacity: 1, duration: 0.7 }, 'transition+=0.5')
      .to(el.heroText, {
        opacity: 1, y: 0, duration: 0.9, stagger: 0.075, ease: 'power3.out'
      }, 'transition+=0.55')
      .to([el.heroAside, el.heroScroll], { opacity: 1, duration: 0.8 }, 'transition+=1.2');

    /* ---- 07 hand-off: the hero owns the portrait now -------------------- */
    tl.add('land', 7.45)
      .to([el.heroPortrait, el.slotRing, el.slotGlow], { opacity: 1, duration: 0.45 }, 'land')
      .to(el.stage, { opacity: 0, duration: 0.4 }, 'land+=0.08')
      .to(wave, { opacity: 0.4, ampMul: 1, flowSpeed: 1, duration: 1.6 }, 'land')
      .to(field, { ambientAlpha: 0.55, duration: 1.2 }, 'land')
      .to(el.skip, { opacity: 0, duration: 0.3 }, 'land');

    // Slightly compress the whole thing; quality over exact timestamps.
    tl.timeScale(1.18);

    /* skip: jump to the transition and run it out fast, so it still resolves
       into the hero instead of cutting */
    el.skip.addEventListener('click', () => {
      if (this.done) return;
      if (tl.time() < tl.labels.transition) tl.seek('transition');
      tl.timeScale(3);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !this.done) el.skip.click();
    });
  };

  window.AM.Intro = Intro;
})();
