/* ==========================================================================
   A NIGHT OF FRIGHTS & DELIGHTS — animations.js
   Canvas dust field, drifting bats & mist, restrained custom cursor,
   cauldron magic, scroll reveals, emoji confetti.

   Exposes window.HallowFX for main.js.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------- helpers ------------------------------- */
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));
  const rand = (min, max) => min + Math.random() * (max - min);
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ======================================================================
     1. AMBIENT DUST / ASH FIELD
     Restrained: fine motes catching candlelight, not a neon particle show.
     ====================================================================== */
  const ParticleField = (() => {
    const canvas = $('#particleCanvas');
    if (!canvas) return { burst() {} };

    const ctx = canvas.getContext('2d');
    if (!ctx) return { burst() {} };

    let width = 0;
    let height = 0;
    let particles = [];
    let bursts = [];
    let rafId = null;
    let running = true;

    const PALETTE = [
      { r: 232, g: 214, b: 180 }, // bone dust
      { r: 210, g: 160, b: 110 }, // candle amber
      { r: 200, g: 90, b: 90 },   // faint red ash
      { r: 165, g: 175, b: 200 }  // cold moonlight
    ];

    function sizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function makeParticle(seeded = false) {
      const color = PALETTE[randInt(0, PALETTE.length - 1)];
      const depth = rand(0.4, 1);
      return {
        x: rand(0, width),
        y: seeded ? rand(0, height) : height + rand(0, 60),
        vx: rand(-0.12, 0.12),
        vy: -rand(0.08, 0.34) * depth,
        radius: rand(0.4, 1.3) * depth + 0.25,
        color,
        alpha: rand(0.1, 0.42) * depth,
        flicker: rand(0.002, 0.01),
        phase: rand(0, Math.PI * 2),
        sway: rand(0.001, 0.005)
      };
    }

    function populate() {
      const target = clamp(Math.round((width * height) / 34000), 22, 70);
      particles = Array.from({ length: target }, () => makeParticle(true));
    }

    function drawParticle(p) {
      const reach = p.radius * 3.2;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, reach);
      grad.addColorStop(0, `rgba(${p.color.r},${p.color.g},${p.color.b},${p.alpha})`);
      grad.addColorStop(1, `rgba(${p.color.r},${p.color.g},${p.color.b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, reach, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawBurstParticle(b) {
      const a = clamp(b.life, 0, 1) * b.alpha;
      ctx.fillStyle = `rgba(${b.color.r},${b.color.g},${b.color.b},${a})`;
      ctx.beginPath();
      ctx.arc(b.x, b.y, Math.max(0.5, b.radius * b.life), 0, Math.PI * 2);
      ctx.fill();
    }

    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      for (const p of particles) {
        p.phase += p.sway;
        p.x += p.vx + Math.sin(p.phase) * 0.3;
        p.y += p.vy;
        p.alpha += Math.sin(p.phase * 1.6) * p.flicker;
        p.alpha = clamp(p.alpha, 0.05, 0.5);

        if (p.y < -30 || p.x < -50 || p.x > width + 50) {
          Object.assign(p, makeParticle(false));
        }
        drawParticle(p);
      }

      bursts = bursts.filter((b) => {
        b.x += b.vx;
        b.y += b.vy;
        b.vx *= 0.975;
        b.vy = b.vy * 0.975 + b.gravity;
        b.life -= b.decay;
        if (b.life <= 0) return false;
        drawBurstParticle(b);
        return true;
      });

      ctx.globalCompositeOperation = 'source-over';
      rafId = requestAnimationFrame(frame);
    }

    function start() {
      sizeCanvas();
      populate();
      if (reduceMotion) {
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'lighter';
        particles.forEach(drawParticle);
        ctx.globalCompositeOperation = 'source-over';
        return;
      }
      if (rafId) cancelAnimationFrame(rafId);
      running = true;
      frame();
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(start, 220);
    });

    document.addEventListener('visibilitychange', () => {
      if (reduceMotion) return;
      if (document.hidden) {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
      } else if (!rafId || !running) {
        running = true;
        frame();
      }
    });

    /* Radial burst — used by the cauldron */
    function burst(x, y, opts = {}) {
      const count = opts.count || 46;
      const colors = opts.colors || PALETTE;
      for (let i = 0; i < count; i++) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(1.6, 8);
        const color = colors[randInt(0, colors.length - 1)];
        bursts.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - rand(0.4, 2),
          gravity: rand(-0.03, 0.06),
          radius: rand(1.1, 3.4),
          color,
          alpha: rand(0.5, 1),
          life: 1,
          decay: rand(0.008, 0.022)
        });
      }
      if (!running && !reduceMotion) {
        running = true;
        frame();
      }
    }

    start();
    return { burst, resize: start };
  })();

  /* ======================================================================
     2. DRIFTING BATS & MIST — sparse, silhouetted, cinematic
     ====================================================================== */
  const SpriteLayer = (() => {
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
              <stop offset="0%" stop-color="rgba(180,190,215,0.5)"/>
              <stop offset="60%" stop-color="rgba(160,170,200,0.18)"/>
              <stop offset="100%" stop-color="rgba(160,170,200,0)"/>
            </radialGradient>
          </defs>
          <ellipse cx="120" cy="45" rx="118" ry="42" fill="url(#mGal)"/>
        </svg>`
    };

    const KINDS = [
      { kind: 'bat', count: window.innerWidth < 760 ? 2 : 4, size: [26, 64], opacity: [0.14, 0.34], duration: [46, 84], top: [8, 46] },
      { kind: 'mist', count: window.innerWidth < 760 ? 2 : 3, size: [240, 420], opacity: [0.1, 0.2], duration: [70, 120], top: [30, 82] }
    ];

    KINDS.forEach((group) => {
      for (let i = 0; i < group.count; i++) {
        const el = document.createElement('div');
        el.className = `sprite sprite--${group.kind}`;
        el.setAttribute('aria-hidden', 'true');

        const size = rand(group.size[0], group.size[1]);
        const duration = rand(group.duration[0], group.duration[1]);
        el.style.width = size + 'px';
        el.style.top = rand(group.top[0], group.top[1]) + 'vh';
        el.style.left = '0';
        el.style.animationDuration = duration.toFixed(1) + 's';
        el.style.animationDelay = (-rand(0, duration)).toFixed(1) + 's';
        el.style.setProperty('--o', rand(group.opacity[0], group.opacity[1]).toFixed(2));
        el.style.setProperty('--s', rand(0.85, 1.2).toFixed(2));

        const inner = document.createElement('div');
        inner.className = 'sprite__inner';
        inner.innerHTML = SVG[group.kind];
        inner.style.animationDuration = rand(4.5, 9).toFixed(1) + 's';
        inner.style.animationDelay = (-rand(0, 4)).toFixed(1) + 's';

        el.appendChild(inner);
        layer.appendChild(el);
      }
    });
  })();

  /* ======================================================================
     3. CUSTOM CURSOR — a fine point and a slow ring, no glow
     ====================================================================== */
  (() => {
    if (!finePointer || reduceMotion) return;

    const ember = $('#cursorEmber');
    const trailEl = $('#cursorTrail');
    if (!ember) return;

    document.body.classList.add('has-custom-cursor');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let dotX = mouseX;
    let dotY = mouseY;
    let ringX = mouseX;
    let ringY = mouseY;
    let hasMoved = false;

    window.addEventListener('pointermove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!hasMoved) {
        hasMoved = true;
        dotX = ringX = mouseX;
        dotY = ringY = mouseY;
        ember.classList.add('is-active');
        if (trailEl) trailEl.classList.add('is-active');
      }
    }, { passive: true });

    document.addEventListener('pointerleave', () => {
      ember.style.opacity = '0';
      if (trailEl) trailEl.style.opacity = '0';
    });
    document.addEventListener('pointerenter', () => {
      ember.style.opacity = '';
      if (trailEl) trailEl.style.opacity = '';
    });

    const HOVER_SELECTOR = 'a, button, [role="button"], input, textarea, .plate, .dress__list li';
    document.addEventListener('pointerover', (e) => {
      if (e.target.closest(HOVER_SELECTOR)) ember.classList.add('is-hover');
    });
    document.addEventListener('pointerout', (e) => {
      if (e.target.closest(HOVER_SELECTOR)) ember.classList.remove('is-hover');
    });

    function loop() {
      dotX += (mouseX - dotX) * 0.42;
      dotY += (mouseY - dotY) * 0.42;
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;

      ember.style.transform = `translate3d(${dotX}px, ${dotY}px, 0) translate(-50%, -50%)`;
      if (trailEl) {
        trailEl.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  })();

  /* ======================================================================
     4. CAULDRON GADGET — ink ripples + ember burst
     ====================================================================== */
  (() => {
    const cauldron = $('#cauldronBtn');
    const rippleLayer = $('#rippleLayer');
    if (!cauldron || !rippleLayer) return;

    const EMBERS = [
      { r: 255, g: 120, b: 60 },
      { r: 220, g: 60, b: 50 },
      { r: 236, g: 229, b: 214 },
      { r: 201, g: 162, b: 39 }
    ];

    let stirCount = 0;

    cauldron.addEventListener('click', (e) => {
      stirCount += 1;
      const rect = cauldron.getBoundingClientRect();
      const cx = e.clientX || rect.left + rect.width / 2;
      const cy = e.clientY || rect.top + rect.height / 2;

      cauldron.classList.remove('is-stirring');
      void cauldron.offsetWidth;
      cauldron.classList.add('is-stirring');

      ParticleField.burst(cx, cy, { count: 44, colors: EMBERS });

      for (let i = 0; i < 3; i++) {
        window.setTimeout(() => {
          const ring = document.createElement('span');
          ring.className = 'ripple' + (i % 2 ? ' ripple--alt' : '');
          ring.style.left = cx + 'px';
          ring.style.top = cy + 'px';
          rippleLayer.appendChild(ring);
          window.setTimeout(() => ring.remove(), 1600);
        }, i * 130);
      }

      cauldron.setAttribute('aria-label', `Stir the cauldron again (stirred ${stirCount} times)`);
    });
  })();

  /* ======================================================================
     5. SCROLL REVEALS + PROGRESS + STICKY HEADER + HERO PARALLAX
     ====================================================================== */
  (() => {
    const revealEls = $$('.reveal');

    if ('IntersectionObserver' in window && !reduceMotion) {
      const groups = new Map();
      revealEls.forEach((el) => {
        const parent = el.parentElement;
        const index = groups.get(parent) || 0;
        el.style.transitionDelay = Math.min(index * 90, 400) + 'ms';
        groups.set(parent, index + 1);
      });

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
            window.setTimeout(() => { entry.target.style.transitionDelay = '0ms'; }, 1300);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

      revealEls.forEach((el) => observer.observe(el));
    } else {
      revealEls.forEach((el) => el.classList.add('is-visible'));
    }

    const bar = $('#scrollBar');
    const header = $('.site-header');
    const heroImg = $('.hero__img');
    let ticking = false;

    function onScroll() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;

      if (bar) bar.style.width = clamp((scrollTop / (docHeight || 1)) * 100, 0, 100) + '%';
      if (header) header.classList.toggle('is-stuck', scrollTop > 24);

      if (heroImg && !reduceMotion && scrollTop < window.innerHeight * 1.2) {
        if (scrollTop > 4) {
          heroImg.style.transform = `scale(1.06) translate3d(0, ${(scrollTop * 0.12).toFixed(1)}px, 0)`;
        } else {
          heroImg.style.transform = '';
        }
      }
      ticking = false;
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
     6. EMOJI CONFETTI — 🦇 🎃 👻 💀
     ====================================================================== */
  const Confetti = (() => {
    let canvas = null;
    let ctx = null;
    let particles = [];
    let rafId = null;

    function ensureCanvas() {
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'confetti-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.appendChild(canvas);
        ctx = canvas.getContext('2d');
        if (!ctx) {
          canvas.remove();
          canvas = null;
          return;
        }
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(options = {}) {
      const {
        count = 56,
        originX = 0.5,
        originY = 0.42,
        emojis = ['🦇', '🎃', '👻', '💀', '🕷️', '🍬'],
        spread = 1
      } = options;

      ensureCanvas();
      if (!ctx) return;

      const ox = window.innerWidth * originX;
      const oy = window.innerHeight * originY;

      for (let i = 0; i < count; i++) {
        const angle = rand(-Math.PI * 0.92, -Math.PI * 0.08);
        const speed = rand(6, 16) * spread;
        particles.push({
          x: ox + rand(-36, 36),
          y: oy + rand(-26, 26),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          gravity: rand(0.16, 0.3),
          drag: rand(0.985, 0.996),
          size: rand(15, 34),
          rot: rand(0, Math.PI * 2),
          vrot: rand(-0.16, 0.16),
          glyph: emojis[randInt(0, emojis.length - 1)],
          life: 1,
          decay: rand(0.0035, 0.0075),
          wobble: rand(0, Math.PI * 2),
          wobbleSpeed: rand(0.02, 0.06)
        });
      }

      if (!rafId) rafId = requestAnimationFrame(render);
    }

    function render() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

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

        if (p.life <= 0 || p.y > window.innerHeight + 120) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = clamp(p.life * 1.6, 0, 1);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.font = `${p.size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        ctx.fillText(p.glyph, 0, 0);
        ctx.restore();
      }

      if (particles.length) {
        rafId = requestAnimationFrame(render);
      } else {
        cancelAnimationFrame(rafId);
        rafId = null;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    }

    window.addEventListener('resize', () => {
      if (canvas && particles.length) ensureCanvas();
    });

    return { spawn };
  })();

  /* ======================================================================
     PUBLIC API
     ====================================================================== */
  window.HallowFX = {
    confetti: Confetti.spawn,
    burst: ParticleField.burst,
    reducedMotion: reduceMotion,
    emojis: ['🦇', '🎃', '👻', '💀']
  };
})();
