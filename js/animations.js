/* ==========================================================================
   A NIGHT OF FRIGHTS & DELIGHTS — animations.js
   Everything that moves: ambient particles, floating sprites, custom cursor,
   cauldron magic, spotlight cards, scroll reveals, emoji confetti.

   Exposes a tiny shared API on window.HallowFX so main.js can trigger magic.
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
     1. AMBIENT PARTICLE FIELD (embers, spores, dust)
     ====================================================================== */
  const ParticleField = (() => {
    const canvas = $('#particleCanvas');
    if (!canvas) return { burst() {} };

    const ctx = canvas.getContext('2d');
    if (!ctx) return { burst() {} };

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles = [];
    let bursts = [];
    let rafId = null;
    let running = true;

    const PALETTE = [
      { r: 255, g: 117, b: 24 },  // pumpkin ember
      { r: 255, g: 180, b: 80 },  // warm spark
      { r: 57, g: 255, b: 20 },   // toxic spore
      { r: 170, g: 120, b: 255 }, // purple mist mote
    ];

    function sizeCanvas() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function makeParticle(seeded = false) {
      const palette = PALETTE[randInt(0, PALETTE.length - 1)];
      const depth = rand(0.35, 1);
      return {
        x: rand(0, width),
        y: seeded ? rand(0, height) : height + rand(0, 80),
        vx: rand(-0.18, 0.18),
        vy: -rand(0.16, 0.62) * depth,
        radius: rand(0.6, 2.1) * depth + 0.3,
        color: palette,
        alpha: rand(0.35, 0.9) * depth,
        flicker: rand(0.004, 0.02),
        phase: rand(0, Math.PI * 2),
        sway: rand(0.002, 0.008),
        life: 1
      };
    }

    function populate() {
      const target = clamp(Math.round((width * height) / 20000), 34, 110);
      particles = Array.from({ length: target }, () => makeParticle(true));
    }

    function drawParticle(p) {
      const glow = p.radius * 5;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);
      grad.addColorStop(0, `rgba(${p.color.r},${p.color.g},${p.color.b},${p.alpha})`);
      grad.addColorStop(0.35, `rgba(${p.color.r},${p.color.g},${p.color.b},${p.alpha * 0.35})`);
      grad.addColorStop(1, `rgba(${p.color.r},${p.color.g},${p.color.b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255,255,255,${p.alpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.4, p.radius * 0.45), 0, Math.PI * 2);
      ctx.fill();
    }

    function drawBurstParticle(b) {
      const a = clamp(b.life, 0, 1) * b.alpha;
      ctx.fillStyle = `rgba(${b.color.r},${b.color.g},${b.color.b},${a})`;
      ctx.beginPath();
      ctx.arc(b.x, b.y, Math.max(0.5, b.radius * b.life), 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(${b.color.r},${b.color.g},${b.color.b},${a * 0.35})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 5, b.y - b.vy * 5);
      ctx.stroke();
    }

    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      for (const p of particles) {
        p.phase += p.sway;
        p.x += p.vx + Math.sin(p.phase) * 0.45;
        p.y += p.vy;
        p.alpha += Math.sin(p.phase * 1.7) * p.flicker;
        p.alpha = clamp(p.alpha, 0.12, 0.95);

        if (p.y < -30 || p.x < -60 || p.x > width + 60) {
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
        // Still render one static frame so the ambience exists, just frozen.
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

    /* Public: radial burst of magical particles (used by the cauldron) */
    function burst(x, y, opts = {}) {
      const count = opts.count || 46;
      const colors = opts.colors || PALETTE;
      for (let i = 0; i < count; i++) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(1.6, 8.5);
        const color = colors[randInt(0, colors.length - 1)];
        bursts.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - rand(0.4, 2.2),
          gravity: rand(-0.035, 0.06),
          radius: rand(1.4, 4.2),
          color,
          alpha: rand(0.55, 1),
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
     2. FLOATING SPRITES — bats, ghosts, mini jack-o'-lanterns
     ====================================================================== */
  const SpriteLayer = (() => {
    const layer = $('#floatingLayer');
    if (!layer) return;

    const SVG = {
      bat: `
        <svg viewBox="0 0 100 46" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path d="M50 20c3-5 7-8 11-8 2 0 4 1 5 3 3-5 8-9 14-11-1 4-1 7 0 10 2-2 5-3 8-3-3 3-5 7-5 11 0 8-9 13-16 13-4 0-7-2-9-5-2 3-5 5-8 5s-6-2-8-5c-2 3-5 5-9 5-7 0-16-5-16-13 0-4-2-8-5-11 3 0 6 1 8 3 1-3 1-6 0-10 6 2 11 6 14 11 1-2 3-3 5-3 4 0 8 3 11 8z"/>
          <path d="M44 8c1-4 3-7 6-8 3 1 5 4 6 8-2-1-4-1.5-6-1.5S46 7 44 8z"/>
        </svg>`,
      ghost: `
        <svg viewBox="0 0 64 80" xmlns="http://www.w3.org/2000/svg">
          <path d="M32 4C16 4 6 17 6 33v40c0 3 3 5 6 3l5-4 5 5c1 1 3 1 4 0l5-5 5 5c1 1 3 1 4 0l5-5 5 5c1 1 3 1 4 0l4-4c3 2 6 0 6-3V33C58 17 48 4 32 4z" fill="rgba(232,240,255,0.9)"/>
          <ellipse cx="23" cy="33" rx="4.6" ry="6" fill="#0a0512"/>
          <ellipse cx="41" cy="33" rx="4.6" ry="6" fill="#0a0512"/>
          <ellipse cx="32" cy="47" rx="4.4" ry="3.4" fill="#0a0512" opacity=".85"/>
        </svg>`,
      pumpkin: `
        <svg viewBox="0 0 72 70" xmlns="http://www.w3.org/2000/svg">
          <path d="M36 12c1-5 4-8 8-9-1 4-1 7 0 10" stroke="#3f7a2a" stroke-width="3.4" fill="none" stroke-linecap="round"/>
          <ellipse cx="36" cy="42" rx="30" ry="24" fill="#e85d0b"/>
          <ellipse cx="36" cy="42" rx="18" ry="24" fill="#ff7518" opacity=".85"/>
          <ellipse cx="36" cy="42" rx="7" ry="24" fill="#ffa45c" opacity=".45"/>
          <path d="M22 38l7 8-9 1z" fill="#2a0d05"/>
          <path d="M50 38l-7 8 9 1z" fill="#2a0d05"/>
          <path d="M24 53c4 4 20 4 24 0-3 5-8 6-12 6s-9-1-12-6z" fill="#2a0d05"/>
        </svg>`
    };

    const KINDS = [
      { kind: 'bat', count: window.innerWidth < 700 ? 3 : 6, size: [34, 96], opacity: [0.35, 0.8], duration: [30, 58], top: [6, 60] },
      { kind: 'ghost', count: window.innerWidth < 700 ? 2 : 4, size: [34, 66], opacity: [0.16, 0.34], duration: [42, 78], top: [10, 84] },
      { kind: 'pumpkin', count: window.innerWidth < 700 ? 2 : 4, size: [22, 46], opacity: [0.3, 0.55], duration: [38, 70], top: [40, 92] }
    ];

    if (reduceMotion) return;

    KINDS.forEach((group) => {
      for (let i = 0; i < group.count; i++) {
        const el = document.createElement('div');
        el.className = `sprite sprite--${group.kind}`;
        el.setAttribute('aria-hidden', 'true');

        const size = rand(group.size[0], group.size[1]);
        const duration = rand(group.duration[0], group.duration[1]);
        el.style.width = size + 'px';
        el.style.height = 'auto';
        el.style.top = rand(group.top[0], group.top[1]) + 'vh';
        el.style.left = '0';
        el.style.animationDuration = duration.toFixed(1) + 's';
        el.style.animationDelay = (-rand(0, duration)).toFixed(1) + 's';
        el.style.setProperty('--o', rand(group.opacity[0], group.opacity[1]).toFixed(2));
        el.style.setProperty('--s', rand(0.8, 1.15).toFixed(2));

        const inner = document.createElement('div');
        inner.className = 'sprite__inner';
        inner.innerHTML = SVG[group.kind];
        inner.style.animationDuration = rand(3.4, 7.2).toFixed(1) + 's';
        inner.style.animationDelay = (-rand(0, 4)).toFixed(1) + 's';

        el.appendChild(inner);
        layer.appendChild(el);
      }
    });
  })();

  /* ======================================================================
     3. CUSTOM CURSOR — glowing ember + ghost trail canvas
     ====================================================================== */
  (() => {
    if (!finePointer || reduceMotion) return;

    const ember = $('#cursorEmber');
    const trailEl = $('#cursorTrail');
    if (!ember) return;

    document.body.classList.add('has-custom-cursor');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let emberX = mouseX;
    let emberY = mouseY;
    let ghostX = mouseX;
    let ghostY = mouseY;
    let hasMoved = false;

    /* Ghost trail canvas (sits above content, below modals' buttons) */
    const trailCanvas = document.createElement('canvas');
    trailCanvas.className = 'cursor-canvas';
    trailCanvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(trailCanvas);
    const tctx = trailCanvas.getContext('2d');
    if (!tctx) { trailCanvas.remove(); return; }

    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    function sizeTrail() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      trailCanvas.width = Math.floor(window.innerWidth * dpr);
      trailCanvas.height = Math.floor(window.innerHeight * dpr);
      trailCanvas.style.width = window.innerWidth + 'px';
      trailCanvas.style.height = window.innerHeight + 'px';
      tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    sizeTrail();
    window.addEventListener('resize', sizeTrail);

    const trailParticles = [];
    let lastSpawn = 0;

    window.addEventListener('pointermove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!hasMoved) {
        hasMoved = true;
        emberX = mouseX;
        emberY = mouseY;
        ghostX = mouseX;
        ghostY = mouseY;
        ember.classList.add('is-active');
        if (trailEl) trailEl.classList.add('is-active');
      }

      const now = performance.now();
      if (now - lastSpawn > 42) {
        lastSpawn = now;
        trailParticles.push({
          x: mouseX + rand(-5, 5),
          y: mouseY + rand(-5, 5),
          vy: rand(-0.42, -0.1),
          vx: rand(-0.22, 0.22),
          size: rand(9, 19),
          rot: rand(-0.5, 0.5),
          rotSpeed: rand(-0.02, 0.02),
          life: 1,
          decay: rand(0.012, 0.026),
          hue: Math.random() > 0.75 ? '57,255,20' : '255,180,120'
        });
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

    /* Grow the ember over anything interactive */
    const HOVER_SELECTOR = 'a, button, [role="button"], .ritual-card, input, textarea, .aside-card, .dress-card__chips li';
    document.addEventListener('pointerover', (e) => {
      if (e.target.closest(HOVER_SELECTOR)) ember.classList.add('is-hover');
    });
    document.addEventListener('pointerout', (e) => {
      if (e.target.closest(HOVER_SELECTOR)) ember.classList.remove('is-hover');
    });

    document.addEventListener('pointerdown', () => ember.classList.add('is-hover'));
    document.addEventListener('pointerup', () => ember.classList.remove('is-hover'));

    function loop() {
      emberX += (mouseX - emberX) * 0.34;
      emberY += (mouseY - emberY) * 0.34;
      ghostX += (mouseX - ghostX) * 0.085;
      ghostY += (mouseY - ghostY) * 0.085;

      ember.style.transform = `translate3d(${emberX}px, ${emberY}px, 0) translate(-50%, -50%)`;
      if (trailEl) {
        trailEl.style.transform = `translate3d(${ghostX}px, ${ghostY}px, 0) translate(-50%, -50%)`;
      }

      tctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = trailParticles.length - 1; i >= 0; i--) {
        const p = trailParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotSpeed;
        p.life -= p.decay;
        if (p.life <= 0) {
          trailParticles.splice(i, 1);
          continue;
        }
        const alpha = p.life * 0.5;
        tctx.save();
        tctx.translate(p.x, p.y);
        tctx.rotate(p.rot);
        tctx.globalCompositeOperation = 'lighter';
        const g = tctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
        g.addColorStop(0, `rgba(${p.hue},${alpha})`);
        g.addColorStop(0.5, `rgba(${p.hue},${alpha * 0.35})`);
        g.addColorStop(1, `rgba(${p.hue},0)`);
        tctx.fillStyle = g;
        tctx.beginPath();
        tctx.arc(0, 0, p.size, 0, Math.PI * 2);
        tctx.fill();
        tctx.restore();
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  })();

  /* ======================================================================
     4. CAULDRON GADGET — ripples + magical burst
     ====================================================================== */
  (() => {
    const cauldron = $('#cauldronBtn');
    const rippleLayer = $('#rippleLayer');
    if (!cauldron || !rippleLayer) return;

    const TOXIC = [
      { r: 57, g: 255, b: 20 },
      { r: 160, g: 255, b: 120 },
      { r: 255, g: 117, b: 24 },
      { r: 200, g: 120, b: 255 }
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

      ParticleField.burst(cx, cy, { count: 54, colors: TOXIC });

      // Concentric eerie ripples across the viewport
      const rings = 3;
      for (let i = 0; i < rings; i++) {
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
     5. SPOTLIGHT CARDS — cursor-tracked neon glow
     ====================================================================== */
  (() => {
    if (!finePointer) return;
    const targets = $$('[data-spotlight]');

    targets.forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width) * 100 + '%');
        card.style.setProperty('--my', ((e.clientY - rect.top) / rect.height) * 100 + '%');
      }, { passive: true });

      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--mx', '50%');
        card.style.setProperty('--my', '0%');
      });
    });
  })();

  /* ======================================================================
     6. SCROLL REVEALS + PROGRESS BAR + STICKY HEADER + HERO PARALLAX
     ====================================================================== */
  (() => {
    const revealEls = $$('.reveal');

    if ('IntersectionObserver' in window && !reduceMotion) {
      // Stagger siblings that enter together
      const groups = new Map();
      revealEls.forEach((el) => {
        const parent = el.parentElement;
        const index = groups.get(parent) || 0;
        el.style.transitionDelay = Math.min(index * 90, 420) + 'ms';
        groups.set(parent, index + 1);
      });

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
            // Release the stagger delay so hover transitions stay instant
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
          heroImg.style.transform = `scale(1.08) translate3d(0, ${(scrollTop * 0.14).toFixed(1)}px, 0)`;
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
     7. EMOJI CONFETTI — explodes 🦇 🎃 👻 💀 across the screen
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
        count = 64,
        originX = 0.5,
        originY = 0.42,
        emojis = ['🦇', '🎃', '👻', '💀', '🕷️', '🍬'],
        spread = 1
      } = options;

      ensureCanvas();
      const ox = window.innerWidth * originX;
      const oy = window.innerHeight * originY;

      for (let i = 0; i < count; i++) {
        const angle = rand(-Math.PI * 0.92, -Math.PI * 0.08);
        const speed = rand(6, 17) * spread;
        particles.push({
          x: ox + rand(-40, 40),
          y: oy + rand(-30, 30),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          gravity: rand(0.16, 0.3),
          drag: rand(0.985, 0.996),
          size: rand(16, 38),
          rot: rand(0, Math.PI * 2),
          vrot: rand(-0.16, 0.16),
          glyph: emojis[randInt(0, emojis.length - 1)],
          life: 1,
          decay: rand(0.0035, 0.0075),
          wobble: rand(0, Math.PI * 2),
          wobbleSpeed: rand(0.02, 0.06)
        });
      }

      if (!rafId) {
        rafId = requestAnimationFrame(render);
      }
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
    emojis: ['🦇', '🎃', '👻', '💀', '🕷️', '🍬']
  };
})();
