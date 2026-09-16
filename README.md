# Abhishek Maurya — portfolio

A single-page Flask site built around one continuous opening sequence: a wave of
light falls in from above, gathers at the centre, assembles a photograph out of
particles, reveals the name, then stretches sideways and carries that same
photograph into the hero. There is no separate "loading screen" that fades out —
the intro becomes the page.

Flask + Jinja2, vanilla JS, GSAP as the animation engine, Lenis for scrolling,
two `<canvas>` layers for the wave and the particles. No frameworks, no UI kit.

## Run it

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Then open http://127.0.0.1:5000.

GSAP, ScrollTrigger, Lenis and Lucide load from CDNs, so the first run needs a
network connection.

## Your photo

`static/images/profile.webp` is the portrait, and `app.py` points at it with a
single constant:

```python
PROFILE_IMAGE = "images/profile.webp"
```

To swap it, drop a new file into `static/images/` and change that line —
`profile.jpg`, `profile.png`, anything the browser can decode. One rule matters:
**a transparent or clean background gives a far better particle formation**, since
every opaque pixel becomes a particle. A square-ish head-and-shoulders crop lands
best in the circular frame; the crop is `object-fit: cover` at
`object-position: 50% 6%`, and `particles.js` reproduces that same crop on the
canvas so the hand-off from particles to photo lines up exactly.

`static/images/profile.png` is the full-quality original, kept as a source file.

Drop a `static/files/resume.pdf` in and the "Download Resume" button starts
working (it 404s until then).

## Structure

```
portfolio/
├── app.py                  Flask routes + all site content in one CONTENT dict
├── requirements.txt
├── templates/index.html    the whole page: intro layers, then #site
├── static/
│   ├── css/main.css        design tokens, layout, every section
│   ├── css/animations.css  motion states, no-JS fallback, reduced motion
│   ├── js/utils.js         device tiers, canvas fitting, math helpers
│   ├── js/particles.js     ambient dust + the portrait particle system
│   ├── js/wave.js          the multi-strand fluid wave
│   ├── js/loading.js       the master timeline and the portrait hand-off
│   ├── js/scroll.js        Lenis, ScrollTrigger reveals, counters, timeline
│   ├── js/cursor.js        desktop cursor
│   ├── js/interactions.js  magnetic buttons, card tilt, mobile nav
│   ├── js/main.js          boot order
│   └── images/
└── tools/build_preview.py  flattens everything into one shareable .html
```

Editing copy, projects, skills or stats means editing `CONTENT` in `app.py`. The
template is structural; it holds no content of its own.

## How the signature transition works

The portrait is **one DOM element** (`#portrait-stage`), fixed at the centre of the
viewport. It is never duplicated.

1. `particles.js` samples the photo into ~1–3k particles (budget depends on the
   device tier) and gives each one a pixel target inside the circle.
2. The wave enters (`wave.js`, mode `enter`), then wraps the centre (`orbit`).
   Particles spring from a loose swirl onto their targets.
3. The real `<img>` takes over through a radial mask that opens outward while a
   26px blur resolves to zero — not an opacity fade. The particles disperse
   underneath it.
4. At the transition, `loading.js` measures the hero portrait slot and FLIPs the
   stage into it (`x`, `y`, `scale`), while the wave switches to `flow` mode and
   stretches horizontally at the hero's vertical anchor. The homepage fades up
   and the hero copy staggers in *around* the moving portrait.
5. When the two circles overlap exactly, the hero's own `<img>` crossfades in and
   the stage hides. Same crop, same position, so there is no visible cut.

The wave canvas is never re-created: the strands that brought the portrait in are
the same strands that remain in the hero background, and ScrollTrigger quietly
lowers their opacity as you scroll past the hero.

Timeline labels in `loading.js` — `gather`, `form`, `name`, `transition`, `land` —
are the places to adjust pacing. The whole thing runs at `timeScale(1.18)`, about
6.5 seconds. "Skip intro" (or Escape) seeks to `transition` and plays it out at 3x
so it still resolves into the hero instead of cutting.

## Performance and accessibility

- Device tiers in `utils.js` scale particle count, strand count, trail length,
  canvas DPR and shadow-blur glow. Phones get a genuinely lighter sequence, not
  the desktop one at a smaller size.
- Only `transform`, `opacity` and `filter` are animated. Canvases pause on
  `visibilitychange`; timelines, rAF loops and ScrollTriggers are torn down on
  `pagehide`.
- `prefers-reduced-motion: reduce` skips the particle sequence entirely and runs a
  short, plain reveal instead; scroll reveals become static.
- With JavaScript disabled the cinematic layer is hidden by
  `html:not(.js)` rules and the full page renders as ordinary content.
- Semantic landmarks, visible focus rings, labelled icon links, and the custom
  cursor releases the native one as soon as you press Tab.

## One-file preview

```bash
python tools/build_preview.py
```

Writes `dist/portfolio.html` with the CSS, JS and portrait inlined — handy for
drag-and-drop hosts or sending someone a look at the intro without a Python
server.
