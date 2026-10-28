/* ==========================================================================
   A NIGHT OF FRIGHTS & DELIGHTS — animations.js

   Performance model
   -----------------
   · Every glowing dot is a PRE-RENDERED sprite (one small canvas per colour)
     blitted with drawImage — no gradients are created per particle per frame.
   · One render loop for ambient dust; it is frame-capped (30fps, 24 on slow
     devices) because the dust drifts slowly and nobody can tell the difference.
   · DPR is capped at 1.5 (1 on low-end/mobile) — a 3x retina canvas costs ~9x
     the fill rate for a barely visible gain on soft dust.
   · The custom cursor uses CSS transforms + a CSS transition for the trailing
     ring, so it needs no render loop at all.
   · Confetti glyphs are rasterised once and blitted, not re-laid-out per frame.
   · A watchdog samples frame times and permanently steps quality down if the
     device is struggling.
   · Everything pauses when the tab is hidden.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------- helpers ------------------------------- */
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));
  const rand = (min, max) => min + Math.random() * (max - min);
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mqMobile = window.matchMedia('(max-width: 760px)');
  const mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');

  const rippleLayer = $('#rippleLayer');
  const reduceMotion = mqReduce.matches;
  const finePointer = mqFine.matches;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  const lowEnd = mqMobile.matches || cores <= 4 || memory <= 4;

  /* Pre-render a soft radial dot once, then blit it everywhere. */
  function makeGlowSprite(rgb, size) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`);
    grad.addColorStop(0.35, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.45)`);
    grad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
  }

  /* ======================================================================
     1. AMBIENT DUST — sprite-blitted, frame-capped, self-throttling
     ====================================================================== */
  const Dust = (() => {
    const canvas = $('#particleCanvas');
    if (!canvas) return { burst() {} };

    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return { burst() {} };

    const COLORS = [
      [232, 214, 180], // bone
      [212, 160, 108], // candle amber
      [198, 96, 92],   // red ash
      [164, 174, 200]  // moonlight
    ];
    const SPRITES = COLORS.map((c) => makeGlowSprite(c, 32));

    let width = 0;
    let height = 0;
    let particles = [];
    let bursts = [];
    let rafId = null;
    let running = false;

    // Quality knobs (degrade if the device struggles)
    let quality = lowEnd ? 0.55 : 1;
    let targetFps = lowEnd ? 24 : 30;
    let dprCap = lowEnd ? 1 : 1.5;
    let frameBudget = 1000 / targetFps;
    let lastDraw = 0;
    let slowFrames = 0;

    function countFor(area) {
      const base = clamp(Math.round(area / 42000), 14, 54);
      return Math.max(8, Math.round(base * quality));
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function makeParticle(seeded) {
      const spriteIndex = randInt(0, SPRITES.length - 1);
      const depth = rand(0.45, 1);
      return {
        x: rand(0, width),
        y: seeded ? rand(0, height) : height + rand(0, 40),
        vx: rand(-0.1, 0.1),
        vy: -rand(0.07, 0.28) * depth,
        radius: rand(1.4, 4.2) * depth,
        sprite: SPRITES[spriteIndex],
        alpha: rand(0.1, 0.4) * depth,
        flicker: rand(0.002, 0.008),
        phase: rand(0, Math.PI * 2),
        sway: rand(0.001, 0.004)
      };
    }

    function populate() {
      const target = countFor(width * height);
      particles = Array.from({ length: target }, () => makeParticle(true));
    }

    function draw(now) {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.phase += p.sway;
        p.x += p.vx + Math.sin(p.phase) * 0.25;
        p.y += p.vy;
        p.alpha += Math.sin(p.phase * 1.6) * p.flicker;

        if (p.y < -24 || p.x < -40 || p.x > width + 40) {
          particles[i] = makeParticle(false);
          continue;
        }
        if (p.alpha < 0.04) p.alpha = 0.04;
        if (p.alpha > 0.45) p.alpha = 0.45;

        ctx.globalAlpha = p.alpha;
        const d = p.radius * 2;
        ctx.drawImage(p.sprite, p.x - p.radius, p.y - p.radius, d, d);
      }

      // Cauldron bursts share the same sprites
      if (bursts.length) {
        for (let i = bursts.length - 1; i >= 0; i--) {
          const b = bursts[i];
          b.x += b.vx;
          b.y += b.vy;
          b.vx *= 0.972;
          b.vy = b.vy * 0.972 + b.gravity;
          b.life -= b.decay;
          if (b.life <= 0) {
            bursts.splice(i, 1);
            continue;
          }
          ctx.globalAlpha = clamp(b.life, 0, 1) * b.alpha;
          const d = b.radius * b.life * 2;
          ctx.drawImage(b.sprite, b.x - d / 2, b.y - d / 2, d, d);
        }
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      // Watchdog: if we are consistently behind, drop quality once
      if (lastDraw) {
        const delta = now - lastDraw;
        if (delta > frameBudget * 2.4) slowFrames++;
        else if (slowFrames > 0) slowFrames--;

        if (slowFrames > 60 && quality > 0.35) {
          quality *= 0.6;
          targetFps = Math.max(18, targetFps - 8);
          frameBudget = 1000 / targetFps;
          slowFrames = 0;
          populate();
        }
      }
      lastDraw = now;
    }

    function loop(now) {
      if (!running) return;
      rafId = requestAnimationFrame(loop);
      if (now - (loop._last || 0) < frameBudget) return;
      loop._last = now;
      draw(now);
    }

    function start() {
      resize();
      populate();
      if (reduceMotion) {
        // Paint one static frame so the ambience still exists
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'lighter';
        particles.forEach((p) => {
          ctx.globalAlpha = p.alpha;
          const d = p.radius * 2;
          ctx.drawImage(p.sprite, p.x - p.radius, p.y - p.radius, d, d);
        });
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        return;
      }
      if (rafId) cancelAnimationFrame(rafId);
      running = true;
      lastDraw = 0;
      rafId = requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    }

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        populate();
      }, 240);
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (reduceMotion) return;
      if (document.hidden) stop();
      else start();
    });

    /* Radial burst of embers (cauldron). Reuses dust sprites. */
    function burst(x, y, opts = {}) {
      const count = Math.round((opts.count || 40) * (lowEnd ? 0.6 : 1));
      for (let i = 0; i < count; i++) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(1.4, 7);
        bursts.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - rand(0.3, 2),
          gravity: rand(-0.03, 0.06),
          radius: rand(1.6, 4.4),
          sprite: SPRITES[randInt(0, SPRITES.length - 1)],
          alpha: rand(0.55, 1),
          life: 1,
          decay: rand(0.01, 0.024)
        });
      }
      if (!running && !reduceMotion) start();
    }

    start();
    return { burst, resize: start, stop };
  })();

  /* ======================================================================
     2. DRIFTING BATS & MIST — CSS-driven, intentionally sparse
     ====================================================================== */
  (() => {
    const layer = $('#floatingLayer');
    if (!layer || reduceMotion) return;

    const SVG = {
      bat: `
        <svg viewBox="0 0 120 54" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path d="M60 18c2.4-4.6 5.6-7.4 9.2-7.4 2 0 3.6.9 4.6 2.6 3-4.8 8.4-8.6 14.6-10.4-1.2 3.6-1.4 6.8-.6 9.6 2.4-1.8 5.4-2.6 8.6-2.6-3.4 3-5.6 6.6-6.2 10.8-.8 6.6-7.4 12.4-15.4 13.6-3.4.5-6.2-.6-8.4-3-2.2 2.4-5 3.5-8.4 3-8-1.2-14.6-7-15.4-13.6-.6-4.2-2.8-7.8-6.2-10.8 3.2 0 6.2.8 8.6 2.6.8-2.8.6-6-.6-9.6 6.2 1.8 11.6 5.6 14.6 10.4 1-1.7 2.6-2.6 4.6-2.6 3.6 0 6.8 2.8 9.2 7.4z"/>
          <path d="M54.4 6.2C55.4 2.8 57.4.6 60 0c2.6.6 4.6 2.8 5.6 6.2-1.8-.8-3.6-1.2-5.6-1.2s-3.8.4-5.6 1.2z"/>
        </svg>`,
      mist: `
        <svg viewBox="0 0 240 90" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="mGal" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="rgba(180,190,215,0.42)"/>
              <stop offset="60%" stop-color="rgba(160,170,200,0.14)"/>
              <stop offset="100%" stop-color="rgba(160,170,200,0)"/>
            </radialGradient>
          </defs>
          <ellipse cx="120" cy="45" rx="118" ry="42" fill="url(#mGal)"/>
        </svg>`
    };

    const KINDS = [
      { kind: 'bat', count: lowEnd ? 2 : 4, size: [26, 60], opacity: [0.14, 0.32], duration: [46, 84], top: [8, 46] },
      { kind: 'mist', count: lowEnd ? 1 : 3, size: [240, 400], opacity: [0.08, 0.18], duration: [70, 120], top: [30, 82] }
    ];

    const frag = document.createDocumentFragment();
    KINDS.forEach((group) => {
      for (let i = 0; i < group.count; i++) {
        const el = document.createElement('div');
        el.className = `sprite sprite--${group.kind}`;
        el.setAttribute('aria-hidden', 'true');

        const size = rand(group.size[0], group.size[1]);
        const duration = rand(group.duration[0], group.duration[1]);
        el.style.cssText =
          `width:${size}px;top:${rand(group.top[0], group.top[1]).toFixed(1)}vh;left:0;` +
          `animation-duration:${duration.toFixed(1)}s;animation-delay:${(-rand(0, duration)).toFixed(1)}s;` +
          `--o:${rand(group.opacity[0], group.opacity[1]).toFixed(2)};--s:${rand(0.85, 1.2).toFixed(2)}`;

        const inner = document.createElement('div');
        inner.className = 'sprite__inner';
        inner.innerHTML = SVG[group.kind];
        inner.style.animationDuration = rand(4.5, 9).toFixed(1) + 's';
        inner.style.animationDelay = (-rand(0, 4)).toFixed(1) + 's';

        el.appendChild(inner);
        frag.appendChild(el);
      }
    });
    layer.appendChild(frag);
  })();

  /* ======================================================================
     3. CUSTOM CURSOR — DOM only, no render loop.
     The dot uses CSS transitions; the ring "lags" via a longer transition.
     ====================================================================== */
  (() => {
    if (!finePointer || reduceMotion) return;

    const dot = $('#cursorEmber');
    const ring = $('#cursorTrail');
    if (!dot) return;

    document.body.classList.add('has-custom-cursor');
    let queued = false;
    let px = 0;
    let py = 0;
    let shown = false;

    function paint() {
      queued = false;
      const t = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`;
      dot.style.transform = t;
      if (ring) ring.style.transform = t;
    }

    window.addEventListener('pointermove', (e) => {
      px = e.clientX;
      py = e.clientY;
      if (!shown) {
        shown = true;
        dot.classList.add('is-active');
        if (ring) ring.classList.add('is-active');
      }
      if (!queued) {
        queued = true;
        requestAnimationFrame(paint);
      }
    }, { passive: true });

    const HOVER = 'a, button, [role="button"], input, textarea, .plate, .dress__list li';
    document.addEventListener('pointerover', (e) => {
      if (e.target.closest(HOVER)) dot.classList.add('is-hover');
    }, { passive: true });
    document.addEventListener('pointerout', (e) => {
      if (e.target.closest(HOVER)) dot.classList.remove('is-hover');
    }, { passive: true });

    document.addEventListener('pointerleave', () => {
      dot.style.opacity = '0';
      if (ring) ring.style.opacity = '0';
    });
    document.addEventListener('pointerenter', () => {
      dot.style.opacity = '';
      if (ring) ring.style.opacity = '';
    });
  })();

  /* ======================================================================
     4. THE CAULDRON — a layered spell on every stir
     All effects are ephemeral DOM nodes or canvas blits, created on demand and
     removed on animationend. No persistent render loop, nothing to leak.
     ====================================================================== */
  const Cauldron = (() => {
    const button = $('#cauldronBtn');
    const world = $('#brewWorld');
    const sparkHost = $('#cauldronSparks');
    if (!button || !world) return { stirs: 0 };

    const INCANTATIONS = [
      'double, double',
      'eye of newt',
      'toil and trouble',
      'fire burn',
      'cauldron bubble',
      'something wicked',
      'wool of bat',
      'tongue of dog',
      'adders fork',
      'bubble, bubble'
    ];

    const MILESTONES = {
      3: 'The brew stirs itself now.',
      7: 'Excellent. The dead are listening.',
      13: 'Thirteen stirs. You have been noticed.'
    };

    let stirs = 0;
    let lastCharm = '';

    /* main.js owns the toast; it registers itself on HallowFX after this file
       loads, so look it up at call time rather than closing over it. */
    const notify = (message, glyph) => {
      const fx = window.HallowFX;
      if (fx && typeof fx.toast === 'function') fx.toast(message, glyph);
    };

    const pick = (arr) => arr[randInt(0, arr.length - 1)];

    function addTemp(parent, el, ms) {
      parent.appendChild(el);
      const cleanup = () => el.remove();
      el.addEventListener('animationend', cleanup, { once: true });
      // safety net in case the animation is cancelled or the tab is hidden
      window.setTimeout(cleanup, ms);
      return el;
    }

    /* Sparks flung from the button itself */
    function burstSparks(count) {
      if (!sparkHost || reduceMotion) return;
      for (let i = 0; i < count; i++) {
        const s = document.createElement('i');
        const angle = rand(-Math.PI * 0.95, -Math.PI * 0.05);
        const dist = rand(24, 62);
        s.style.setProperty('--tx', (Math.cos(angle) * dist).toFixed(1) + 'px');
        s.style.setProperty('--ty', (Math.sin(angle) * dist).toFixed(1) + 'px');
        s.style.animationDelay = rand(0, 0.08).toFixed(2) + 's';
        addTemp(sparkHost, s, 1400);
      }
    }

    /* Embers that rise out of the pot and across the page */
    function riseEmbers(x, y, count) {
      if (reduceMotion) return;
      for (let i = 0; i < count; i++) {
        const e = document.createElement('span');
        e.className = 'brew-ember';
        const size = rand(4, 11);
        e.style.left = x + rand(-26, 26) + 'px';
        e.style.top = y + 'px';
        e.style.setProperty('--size', size.toFixed(1) + 'px');
        e.style.setProperty('--dx', rand(-90, 70).toFixed(0) + 'px');
        e.style.setProperty('--dy', -rand(120, 360).toFixed(0) + 'px');
        e.style.setProperty('--dur', rand(1.8, 3.4).toFixed(2) + 's');
        e.style.animationDelay = rand(0, 0.28).toFixed(2) + 's';
        addTemp(world, e, 4200);
      }
    }

    /* Soft ghost wisps drifting upward */
    function wisps(x, y, count) {
      if (reduceMotion) return;
      for (let i = 0; i < count; i++) {
        const w = document.createElement('span');
        w.className = 'brew-wisp';
        const size = rand(80, 190);
        w.style.left = x - size / 2 + rand(-30, 30) + 'px';
        w.style.top = y - size / 2 + 'px';
        w.style.setProperty('--size', size.toFixed(0) + 'px');
        w.style.setProperty('--dx', rand(-70, 70).toFixed(0) + 'px');
        w.style.setProperty('--dy', -rand(120, 260).toFixed(0) + 'px');
        w.style.setProperty('--dur', rand(2.8, 4.4).toFixed(2) + 's');
        w.style.animationDelay = rand(0, 0.3).toFixed(2) + 's';
        addTemp(world, w, 5200);
      }
    }

    /* A handwritten incantation floats up from the pot */
    function charm(x, y) {
      if (reduceMotion) return;
      let words = pick(INCANTATIONS);
      if (words === lastCharm) words = pick(INCANTATIONS);
      lastCharm = words;

      const c = document.createElement('span');
      c.className = 'brew-charm';
      c.textContent = words;
      c.setAttribute('aria-hidden', 'true');
      c.style.left = clamp(x + rand(-40, 40), 90, window.innerWidth - 90) + 'px';
      c.style.top = y - rand(18, 46) + 'px';
      c.style.setProperty('--dur', rand(2.2, 3).toFixed(2) + 's');
      addTemp(world, c, 3600);
    }

    /* Whole-page warm flash, anchored to the button */
    function flash(x, y) {
      if (reduceMotion) return;
      const f = document.createElement('div');
      f.className = 'brew-flash';
      f.style.setProperty('--fx', ((x / window.innerWidth) * 100).toFixed(1) + '%');
      f.style.setProperty('--fy', ((y / window.innerHeight) * 100).toFixed(1) + '%');
      addTemp(world, f, 1200);
    }

    button.addEventListener('click', (e) => {
      stirs += 1;
      const rect = button.getBoundingClientRect();
      const cx = e.clientX || rect.left + rect.width / 2;
      const cy = e.clientY || rect.top + rect.height / 2;
      const potX = rect.left + rect.width / 2;
      const potY = rect.top + rect.height * 0.42;

      // pot animation restart
      button.classList.remove('is-stirring');
      void button.offsetWidth;
      button.classList.add('is-stirring');
      window.setTimeout(() => button.classList.remove('is-stirring'), 900);

      // density scales with device capability
      const scale = lowEnd ? 0.55 : 1;
      const milestone = MILESTONES[stirs] || null;
      const big = stirs % 3 === 0;

      // The brew answers in sound as well as light (js/audio.js, if present).
      const sfx = window.HallowSfx;
      if (sfx) sfx.play('stir', { big, stirs });

      burstSparks(Math.round((big ? 16 : 10) * scale));
      riseEmbers(potX, potY, Math.round((big ? 16 : 10) * scale));
      wisps(potX, potY, lowEnd ? 1 : big ? 3 : 2);
      flash(cx, cy);
      Dust.burst(cx, cy, { count: big ? 54 : 34 });

      // ripples across the viewport
      const rings = lowEnd ? 2 : 3;
      for (let i = 0; i < rings; i++) {
        window.setTimeout(() => {
          const ring = document.createElement('span');
          ring.className = 'ripple' + (i % 2 ? ' ripple--alt' : '');
          ring.style.left = cx + 'px';
          ring.style.top = cy + 'px';
          addTemp(rippleLayer, ring, 1900);
        }, i * 120);
      }

      // incantation, or a milestone line instead
      window.setTimeout(() => charm(potX, potY), 120);
      if (milestone) {
        window.setTimeout(() => {
          notify(milestone, '✦');
          if (sfx) sfx.play('sparkle');
        }, 420);
        Confetti.spawn({ count: 26, originX: potX / window.innerWidth, originY: potY / window.innerHeight, spread: 0.8 });
      }

      // haptics where supported
      if (navigator.vibrate) { try { navigator.vibrate(big ? [10, 40, 14] : 12); } catch (err) { /* ignore */ } }

      button.setAttribute('aria-label', `Stir the cauldron again (stirred ${stirs} times)`);
    });

    return { get stirs() { return stirs; } };
  })();

  /* ======================================================================
     5. REVEALS · SCROLL PROGRESS · STICKY HEADER · HERO PARALLAX · NAV STATE
     ====================================================================== */
  (() => {
    const revealEls = $$('.reveal');

    if ('IntersectionObserver' in window && !reduceMotion) {
      const groups = new Map();
      revealEls.forEach((el) => {
        const parent = el.parentElement;
        const index = groups.get(parent) || 0;
        el.style.transitionDelay = Math.min(index * 80, 360) + 'ms';
        groups.set(parent, index + 1);
      });

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
          window.setTimeout(() => { entry.target.style.transitionDelay = '0ms'; }, 1200);
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });

      revealEls.forEach((el) => observer.observe(el));
    } else {
      revealEls.forEach((el) => el.classList.add('is-visible'));
    }

    /* Active nav link */
    const navLinks = $$('.site-nav a[href^="#"]');
    const sections = navLinks
      .map((a) => document.querySelector(a.getAttribute('href')))
      .filter(Boolean);

    if (navLinks.length && sections.length && 'IntersectionObserver' in window) {
      const navObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = '#' + entry.target.id;
          navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === id));
        });
      }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
      sections.forEach((s) => navObserver.observe(s));
    }

    const bar = $('#scrollBar');
    const header = $('.site-header');
    const heroImg = $('.hero__img');
    const heroSection = $('.hero');
    let ticking = false;
    let lastY = 0;

    function onScroll() {
      ticking = false;
      const y = window.scrollY || document.documentElement.scrollTop;
      const docH = document.documentElement.scrollHeight - window.innerHeight;

      if (bar) bar.style.width = clamp((y / (docH || 1)) * 100, 0, 100) + '%';

      const stuck = y > 24;
      if (header && header.classList.contains('is-stuck') !== stuck) {
        header.classList.toggle('is-stuck', stuck);
      }

      // Parallax only while the hero is on screen, and only on capable devices
      if (heroImg && heroSection && !reduceMotion && !lowEnd) {
        const heroBottom = heroSection.offsetHeight;
        if (y <= heroBottom) {
          heroImg.style.transform = y > 4
            ? `scale(1.06) translate3d(0, ${(y * 0.12).toFixed(1)}px, 0)`
            : '';
        }
      }
      lastY = y;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    }, { passive: true });

    onScroll();
  })();

  /* ======================================================================
     6. EMOJI CONFETTI — rasterised once, blitted per frame
     ====================================================================== */
  const Confetti = (() => {
    const GLYPH_SIZE = 64;
    const cache = new Map();
    let canvas = null;
    let ctx = null;
    let particles = [];
    let rafId = null;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    function glyphSprite(glyph) {
      if (cache.has(glyph)) return cache.get(glyph);
      const c = document.createElement('canvas');
      c.width = c.height = GLYPH_SIZE;
      const g = c.getContext('2d');
      if (!g) return null;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `${GLYPH_SIZE * 0.82}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      g.fillText(glyph, GLYPH_SIZE / 2, GLYPH_SIZE / 2 + 2);
      cache.set(glyph, c);
      return c;
    }

    function ensureCanvas() {
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'confetti-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.appendChild(canvas);
        ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
        if (!ctx) {
          canvas.remove();
          canvas = null;
          return false;
        }
      }
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }

    function spawn(options = {}) {
      const {
        count = 56,
        originX = 0.5,
        originY = 0.42,
        emojis = ['🦇', '🎃', '👻', '💀', '🕷️', '🍬'],
        spread = 1
      } = options;

      if (!ensureCanvas()) return;
      const ox = window.innerWidth * originX;
      const oy = window.innerHeight * originY;
      const total = Math.round(count * (lowEnd ? 0.55 : 1));

      for (let i = 0; i < total; i++) {
        const glyph = emojis[randInt(0, emojis.length - 1)];
        const sprite = glyphSprite(glyph);
        if (!sprite) continue;
        const angle = rand(-Math.PI * 0.92, -Math.PI * 0.08);
        const speed = rand(6, 16) * spread;
        particles.push({
          x: ox + rand(-32, 32),
          y: oy + rand(-24, 24),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          gravity: rand(0.17, 0.3),
          drag: rand(0.986, 0.996),
          size: rand(15, 32),
          rot: rand(0, Math.PI * 2),
          vrot: rand(-0.15, 0.15),
          sprite,
          life: 1,
          decay: rand(0.0035, 0.0072),
          wobble: rand(0, Math.PI * 2),
          wobbleSpeed: rand(0.02, 0.06)
        });
      }

      if (particles.length > 220) particles = particles.slice(-220);
      if (!rafId) rafId = requestAnimationFrame(render);
    }

    function render() {
      if (!ctx || !canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.wobble += p.wobbleSpeed;
        p.vy += p.gravity;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.x += p.vx + Math.sin(p.wobble) * 1.1;
        p.y += p.vy;
        p.rot += p.vrot;
        p.life -= p.decay;

        if (p.life <= 0 || p.y > h + 100) {
          particles.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = clamp(p.life * 1.6, 0, 1);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.drawImage(p.sprite, -p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }

      ctx.globalAlpha = 1;

      if (particles.length) {
        rafId = requestAnimationFrame(render);
      } else {
        cancelAnimationFrame(rafId);
        rafId = null;
        ctx.clearRect(0, 0, w, h);
      }
    }

    window.addEventListener('resize', () => {
      if (canvas && particles.length) ensureCanvas();
    }, { passive: true });

    return { spawn };
  })();

  /* ======================================================================
     PUBLIC API
     ====================================================================== */
  window.HallowFX = {
    confetti: Confetti.spawn,
    burst: Dust.burst,
    reducedMotion: reduceMotion,
    lowEnd,
    emojis: ['🦇', '🎃', '👻', '💀']
  };
})();
