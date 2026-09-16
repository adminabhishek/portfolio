/* ==========================================================================
   scroll.js — Lenis + ScrollTrigger.

   Reveals are deliberately sparse: section headers, stats, skill groups,
   project rows, timeline entries. Everything else stays still.
   ========================================================================== */

(function () {
  'use strict';

  const U = window.AM;

  function Scroll() {
    this.lenis = null;
    this.ready = false;
  }

  /* ---------------------------------------------------------------- lenis */

  Scroll.prototype.initLenis = function () {
    if (U.device.reduced || typeof Lenis === 'undefined') return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6
    });
    this.lenis = lenis;

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // anchor links go through Lenis so they share the same easing
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -70, duration: 1.3 });
      });
    });
  };

  /* --------------------------------------------------------------- reveals */

  Scroll.prototype.initReveals = function () {
    if (U.device.reduced) {
      gsap.set('[data-reveal], .stat, .pill, .entry, .project',
        { opacity: 1, y: 0, scale: 1, clearProps: 'transform' });
      document.querySelectorAll('[data-entry]').forEach(e => e.classList.add('is-live'));
      return;
    }

    /* One batched trigger for all the ordinary reveals: headers, prose,
       facts, interests. Batching keeps the ScrollTrigger count low. */
    ScrollTrigger.batch('[data-reveal]:not(.stat)', {
      start: 'top 86%',
      once: true,
      onEnter: batch => gsap.to(batch, {
        opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out'
      })
    });

    /* stats: sequential, alongside their counters */
    if (document.getElementById('stats')) {
      gsap.to('.stat', {
        opacity: 1, y: 0, duration: 0.8, stagger: 0.09, ease: 'power3.out',
        scrollTrigger: { trigger: '#stats', start: 'top 80%', once: true }
      });
    }

    /* skills arrive in groups, not as one wall */
    document.querySelectorAll('[data-skill-group]').forEach(group => {
      gsap.to(group.querySelectorAll('.pill'), {
        opacity: 1, y: 0, duration: 0.6, stagger: 0.035, ease: 'power2.out',
        scrollTrigger: { trigger: group, start: 'top 85%', once: true }
      });
    });

    /* project rows with a touch of depth */
    document.querySelectorAll('.project').forEach(card => {
      gsap.fromTo(card,
        { opacity: 0, y: 40, scale: 0.985 },
        {
          opacity: 1, y: 0, scale: 1, duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 88%', once: true }
        });
    });
  };

  /* -------------------------------------------------------------- counters */

  Scroll.prototype.initCounters = function () {
    document.querySelectorAll('[data-count]').forEach(node => {
      const end = parseFloat(node.dataset.count);
      const suffix = node.dataset.suffix || '';
      const obj = { v: 0 };
      gsap.to(obj, {
        v: end,
        duration: U.device.reduced ? 0.01 : 1.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: node, start: 'top 88%', once: true },
        onUpdate: () => { node.textContent = Math.round(obj.v) + suffix; }
      });
    });
  };

  /* -------------------------------------------------------------- timeline */

  Scroll.prototype.initTimeline = function () {
    const track = document.querySelector('.timeline__progress');
    const timeline = document.getElementById('timeline');
    if (!track || !timeline) return;

    if (U.device.reduced) {
      gsap.set(track, { scaleY: 1 });
      return;
    }

    gsap.to(track, {
      scaleY: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: timeline,
        start: 'top 72%',
        end: 'bottom 72%',
        scrub: 0.6
      }
    });

    document.querySelectorAll('[data-entry]').forEach(entry => {
      gsap.to(entry, {
        opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: {
          trigger: entry,
          start: 'top 82%',
          once: true,
          onEnter: () => entry.classList.add('is-live')
        }
      });
    });
  };

  /* ------------------------------------------------ ambient scroll response */

  /**
   * The wave that arrived with the intro keeps living in the hero, then quietly
   * steps back as the reader moves on. It never restarts.
   */
  Scroll.prototype.initAmbient = function (wave, field) {
    const nav = document.getElementById('nav');

    ScrollTrigger.create({
      start: 60,
      onEnter: () => nav.classList.add('is-stuck'),
      onLeaveBack: () => nav.classList.remove('is-stuck')
    });

    if (wave) {
      ScrollTrigger.create({
        trigger: '.hero',
        start: 'bottom 90%',
        end: 'bottom top',
        onUpdate: self => {
          const k = 1 - self.progress;
          wave.opacity = 0.06 + 0.34 * k;
          wave.ampMul = 0.6 + 0.4 * k;
        }
      });
    }

    if (field) {
      // dust thins out in the dense middle of the page, returns for contact
      ScrollTrigger.create({
        trigger: '.section--contact',
        start: 'top 70%',
        onEnter: () => gsap.to(field, { ambientAlpha: 0.85, duration: 1.2 }),
        onLeaveBack: () => gsap.to(field, { ambientAlpha: 0.5, duration: 1.2 })
      });
    }

    /* contact horizon drifts slightly — the only parallax on the page */
    const horizon = document.querySelector('.contact__horizon');
    if (horizon && !U.device.reduced) {
      gsap.fromTo(horizon, { y: 60 }, {
        y: -30, ease: 'none',
        scrollTrigger: { trigger: '.section--contact', start: 'top bottom', end: 'bottom bottom', scrub: true }
      });
    }

    /* hero portrait gets a gentle lift as you leave it */
    if (!U.device.reduced) {
      gsap.to('.hero__visual', {
        y: -50, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    }
  };

  /* ------------------------------------------------------------ nav state */

  Scroll.prototype.initNavState = function () {
    const links = Array.from(document.querySelectorAll('[data-nav]'));
    const indicator = document.querySelector('.nav__indicator');

    const place = link => {
      if (!indicator || !link) return;
      gsap.to(indicator, {
        x: link.offsetLeft,
        width: link.offsetWidth,
        opacity: 1,
        duration: 0.5,
        ease: 'power3.out'
      });
    };

    const setActive = id => {
      links.forEach(l => l.classList.toggle('is-active', l.dataset.nav === id));
      place(links.find(l => l.dataset.nav === id));
    };

    links.forEach(link => {
      const section = document.getElementById(link.dataset.nav);
      if (!section) return;
      ScrollTrigger.create({
        trigger: section,
        start: 'top 45%',
        end: 'bottom 45%',
        onToggle: self => { if (self.isActive) setActive(link.dataset.nav); }
      });
    });

    setActive('home');
    U.onResize(() => place(links.find(l => l.classList.contains('is-active'))));
  };

  Scroll.prototype.init = function (wave, field) {
    gsap.registerPlugin(ScrollTrigger);
    this.initLenis();
    this.initReveals();
    this.initCounters();
    this.initTimeline();
    this.initAmbient(wave, field);
    this.initNavState();
    this.ready = true;
    ScrollTrigger.refresh();
    U.onResize(() => ScrollTrigger.refresh());
  };

  window.AM.Scroll = Scroll;
})();
