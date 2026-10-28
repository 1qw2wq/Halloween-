/* ==========================================================================
   A NIGHT OF FRIGHTS & DELIGHTS — main.js
   Behaviour: countdown, copy-address, surprise modal, nav, calendar download.
   Depends on window.HallowFX from animations.js (optional — degrades safely).
   ========================================================================== */

(function () {
  'use strict';

  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));
  const pad = (n) => String(n).padStart(2, '0');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FX = window.HallowFX || { confetti: () => {}, burst: () => {} };
  // js/audio.js is optional too — a silent page must still work.
  const SFX = window.HallowSfx || { play: () => {} };

  const PARTY = {
    day: 31,
    hour: 15,
    minute: 0,
    address: '杭州市富阳区九龙大道108号野风山城锦庐13-7',
    title: 'A Night of Frights & Delights — Halloween Party'
  };

  /* ------------------------------------------------------------------ *
   * 1. COUNTDOWN → October 31st, 15:00 (local time)
   * ------------------------------------------------------------------ */
  const Countdown = (() => {
    const root = $('#countdown');
    if (!root) return;

    const nodes = {
      days: $('[data-unit="days"]', root),
      hours: $('[data-unit="hours"]', root),
      minutes: $('[data-unit="minutes"]', root),
      seconds: $('[data-unit="seconds"]', root)
    };

    function nextOccurrence() {
      const now = new Date();
      let year = now.getFullYear();
      let target = new Date(year, 9, PARTY.day, PARTY.hour, PARTY.minute, 0, 0); // month index 9 = October
      if (target.getTime() <= now.getTime()) {
        year += 1;
        target = new Date(year, 9, PARTY.day, PARTY.hour, PARTY.minute, 0, 0);
      }
      return target;
    }

    const target = nextOccurrence();
    const previous = {};
    let intervalId = null;

    function setUnit(key, value) {
      const node = nodes[key];
      if (!node) return;
      const text = pad(value);
      if (node.textContent === text) return;
      node.textContent = text;
      if (key === 'seconds' && !reduceMotion) {
        node.classList.remove('is-tick');
        void node.offsetWidth;
        node.classList.add('is-tick');
      }
      previous[key] = value;
    }

    function tick() {
      const diff = target.getTime() - Date.now();

      if (diff <= 0) {
        setUnit('days', 0);
        setUnit('hours', 0);
        setUnit('minutes', 0);
        setUnit('seconds', 0);
        root.setAttribute('aria-label', 'The haunting has begun. Happy Halloween!');
        const until = $('.countdown__until', root);
        if (until) until.innerHTML = 'The veil is open — <strong>the haunt has begun</strong>';
        if (intervalId) clearInterval(intervalId);
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      setUnit('days', Math.floor(totalSeconds / 86400));
      setUnit('hours', Math.floor((totalSeconds % 86400) / 3600));
      setUnit('minutes', Math.floor((totalSeconds % 3600) / 60));
      setUnit('seconds', totalSeconds % 60);

      root.setAttribute(
        'aria-label',
        `${nodes.days.textContent} days, ${nodes.hours.textContent} hours, ` +
        `${nodes.minutes.textContent} minutes until the party on October 31st at 15:00`
      );
    }

    tick();
    intervalId = window.setInterval(tick, 1000);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) tick();
    });

    return { target };
  })();

  /* ------------------------------------------------------------------ *
   * 2. TOAST
   * ------------------------------------------------------------------ */
  const Toast = (() => {
    const el = $('#toast');
    if (!el) return { show() {} };
    const msg = $('.toast__msg', el);
    const icon = $('.toast__icon', el);
    let timer = null;

    function show(message, emoji) {
      if (msg) msg.textContent = message;
      if (icon && emoji) icon.textContent = emoji;
      el.classList.add('is-visible');
      SFX.play('chime');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => el.classList.remove('is-visible'), 3200);
    }

    return { show };
  })();

  /* Expose the toast so other modules (the cauldron milestones) can use it */
  window.HallowFX = window.HallowFX || {};
  window.HallowFX.toast = Toast.show;

  /* ------------------------------------------------------------------ *
   * 3. COPY ADDRESS
   * ------------------------------------------------------------------ */
  const CopyAddress = (() => {
    const button = $('#copyAddressBtn');
    const addressEl = $('#addressText');
    if (!button) return;

    const address = (button.dataset.address || (addressEl && addressEl.textContent) || PARTY.address).trim();
    const label = $('.btn__label', button) || button;
    const originalLabel = label.textContent;
    let resetTimer = null;

    async function writeToClipboard(text) {
      // Preferred: async Clipboard API (rejects gracefully to the legacy path)
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch (err) {
          /* fall through to the legacy path */
        }
      }
      // Legacy fallback (works on http:// and older browsers)
      try {
        const field = document.createElement('textarea');
        field.value = text;
        field.setAttribute('readonly', '');
        field.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0;';
        document.body.appendChild(field);
        field.select();
        field.setSelectionRange(0, field.value.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(field);
        return ok;
      } catch (err) {
        return false;
      }
    }

    function celebrate(buttonEl) {
      buttonEl.classList.add('is-copied');
      label.textContent = 'Copied! 🦇';
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        buttonEl.classList.remove('is-copied');
        label.textContent = originalLabel;
      }, 2600);
    }

    button.addEventListener('click', async () => {
      const ok = await writeToClipboard(address);

      if (ok) {
        Toast.show('Address copied to clipboard! 🦇', '✦');
        celebrate(button);
        if (!reduceMotion) {
          const rect = button.getBoundingClientRect();
          FX.confetti({
            count: 22,
            originX: (rect.left + rect.width / 2) / window.innerWidth,
            originY: (rect.top + rect.height / 2) / window.innerHeight,
            emojis: ['🦇', '🕸️', '🎃', '✨'],
            spread: 0.7
          });
        }
      } else {
        Toast.show('Could not copy — address: ' + address, '!');
        if (addressEl) {
          const range = document.createRange();
          range.selectNodeContents(addressEl);
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      }
    });
  })();

  /* ------------------------------------------------------------------ *
   * 4. THE SURPRISE MODAL
   * ------------------------------------------------------------------ */
  const Surprise = (() => {
    const modal = $('#surprise');
    if (!modal) return { open() {} };

    const card = $('.surprise__card', modal);
    const portrait = $('.surprise__img', modal);
    const lightning = $('#lightning');
    const triggers = $$('[data-open-surprise]');
    const closers = $$('[data-close-surprise]', modal);
    const closeBtn = $('#surpriseClose');
    let lastFocused = null;
    let openTimer = null;
    let isAnimating = false;
    let pending = false; // reveal scheduled but not yet on screen (lightning flash)

    /* The surprise has two faces. One is drawn at random for every visit, and
       never the same one twice in a row — so repeat guests get a fresh scare. */
    const PORTRAITS = [
      {
        src: '/assets/surprise.jpg',
        alt: "A gleefully unsettling glitched portrait — the haunt's doorman",
        position: 'center 32%'
      },
      {
        src: '/assets/surprise-2.jpg',
        alt: "A leering, long-nosed ghoul hunched over a laptop in a parked car — the haunt's chauffeur",
        position: '64% 20%'
      }
    ];

    let lastPortrait = -1;

    function choosePortrait() {
      if (!portrait) return;
      let index = Math.floor(Math.random() * PORTRAITS.length);
      if (PORTRAITS.length > 1 && index === lastPortrait) {
        index = (index + 1) % PORTRAITS.length;
      }
      lastPortrait = index;

      const pick = PORTRAITS[index];
      if (portrait.getAttribute('src') !== pick.src) portrait.setAttribute('src', pick.src);
      portrait.setAttribute('alt', pick.alt);
      portrait.style.objectPosition = pick.position;
      modal.dataset.portrait = String(index + 1);
    }

    /* Warm the pool while the page is idle so the swap never stalls the reveal. */
    function preloadPortraits() {
      PORTRAITS.forEach((item) => {
        const img = new Image();
        img.decoding = 'async';
        img.src = item.src;
      });
    }
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(preloadPortraits, { timeout: 3000 });
    } else {
      window.setTimeout(preloadPortraits, 1600);
    }

    const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

    function lockScroll(lock) {
      document.body.classList.toggle('is-locked', lock);
      if (lock) {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) document.body.style.paddingRight = scrollbarWidth + 'px';
      } else {
        document.body.style.paddingRight = '';
      }
    }

    function zap() {
      SFX.play('thunder');
      if (!lightning || reduceMotion) return;
      lightning.classList.remove('is-zap');
      void lightning.offsetWidth;
      lightning.classList.add('is-zap');
      window.setTimeout(() => lightning.classList.remove('is-zap'), 1200);

      document.body.classList.remove('is-shaking');
      void document.body.offsetWidth;
      document.body.classList.add('is-shaking');
      window.setTimeout(() => document.body.classList.remove('is-shaking'), 700);
    }

    function throwConfetti() {
      if (reduceMotion) return;
      FX.confetti({ count: 58, originX: 0.5, originY: 0.5, spread: 1.1 });
      window.setTimeout(() => FX.confetti({ count: 38, originX: 0.2, originY: 0.62, spread: 0.85 }), 220);
      window.setTimeout(() => FX.confetti({ count: 38, originX: 0.8, originY: 0.62, spread: 0.85 }), 380);
      window.setTimeout(() => FX.confetti({ count: 26, originX: 0.5, originY: 0.3, spread: 0.65 }), 900);
    }

    function open(trigger) {
      if (isAnimating || pending || modal.classList.contains('is-open')) return;
      isAnimating = true;
      pending = true;
      lastFocused = trigger || document.activeElement;

      choosePortrait();
      zap();
      if (!reduceMotion) {
        FX.burst(window.innerWidth / 2, window.innerHeight / 2, {
          count: 70,
          colors: [
            { r: 255, g: 31, b: 75 },
            { r: 255, g: 117, b: 24 },
            { r: 200, g: 120, b: 255 }
          ]
        });
      }

      window.clearTimeout(openTimer);
      openTimer = window.setTimeout(() => {
        pending = false;
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        lockScroll(true);
        if (closeBtn) closeBtn.focus({ preventScroll: true });
        isAnimating = false;
        SFX.play('scare');
        throwConfetti();
      }, reduceMotion ? 0 : 240);
    }

    function close() {
      // ✕ or Esc during the lightning flash cancels the reveal entirely rather
      // than letting the queued timer pop the panel open afterwards.
      if (modal.classList.contains('is-open') || pending) SFX.play('whoosh');
      const wasPending = pending;
      window.clearTimeout(openTimer);
      pending = false;
      isAnimating = false;

      if (!modal.classList.contains('is-open')) {
        if (wasPending && lastFocused && typeof lastFocused.focus === 'function') {
          lastFocused.focus({ preventScroll: true });
        }
        return;
      }
      modal.classList.remove('is-open');

      // Move focus back before hiding the dialog from assistive tech
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus({ preventScroll: true });
      }
      modal.setAttribute('aria-hidden', 'true');
      lockScroll(false);
      isAnimating = false;
    }

    triggers.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        open(btn);
      });
    });

    closers.forEach((el) => el.addEventListener('click', close));

    document.addEventListener('keydown', (e) => {
      // Esc is valid even while the reveal is still pending, so the flash can
      // be interrupted; the focus trap only applies once the panel is visible.
      if (e.key === 'Escape' && (modal.classList.contains('is-open') || pending)) {
        e.preventDefault();
        close();
        return;
      }
      if (!modal.classList.contains('is-open')) return;

      // Focus trap
      if (e.key === 'Tab' && card) {
        const items = $$(FOCUSABLE, card).filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    return { open, close };
  })();

  /* ------------------------------------------------------------------ *
   * 5. SAVE THE DATE → generates an .ics calendar file client-side
   * ------------------------------------------------------------------ */
  (() => {
    const btn = $('#saveDateBtn');
    if (!btn) return;

    function icsDate(date) {
      // Floating local time (no Z) so the party stays at 15:00 wherever it's opened
      return (
        date.getFullYear().toString() +
        pad(date.getMonth() + 1) +
        pad(date.getDate()) +
        'T' + pad(date.getHours()) + pad(date.getMinutes()) + '00'
      );
    }

    function buildIcs() {
      const now = new Date();
      let year = now.getFullYear();
      let start = new Date(year, 9, PARTY.day, PARTY.hour, PARTY.minute, 0, 0);
      if (start.getTime() < now.getTime()) {
        year += 1;
        start = new Date(year, 9, PARTY.day, PARTY.hour, PARTY.minute, 0, 0);
      }
      const end = new Date(start.getTime() + 7 * 60 * 60 * 1000);
      const stamp = new Date();

      const description =
        "A Night of Frights & Delights. Witches' Kitchen, Pumpkin Pie Crafting, " +
        'Haunted Game Night. Costumes encouraged but optional. Enter if you dare.';

      return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Frights and Delights//Halloween Invitation//EN',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        'UID:frights-delights-' + year + '@halloween.invite',
        'DTSTAMP:' + icsDate(stamp),
        'DTSTART:' + icsDate(start),
        'DTEND:' + icsDate(end),
        'SUMMARY:' + PARTY.title.replace(/,/g, '\\,'),
        'DESCRIPTION:' + description,
        'LOCATION:' + PARTY.address,
        'BEGIN:VALARM',
        'TRIGGER:-PT2H',
        'ACTION:DISPLAY',
        'DESCRIPTION:Put on your costume — the haunt begins in 2 hours',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');
    }

    btn.addEventListener('click', () => {
      try {
        const blob = new Blob([buildIcs()], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'frights-and-delights.ics';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.setTimeout(() => URL.revokeObjectURL(url), 1500);
        Toast.show('Calendar invite saved — see you there!', '✦');
      } catch (err) {
        Toast.show('Save it the old way: Oct 31, 15:00', '✦');
      }
    });
  })();

  /* ------------------------------------------------------------------ *
   * 6. MOBILE NAV
   * ------------------------------------------------------------------ */
  (() => {
    const toggle = $('#navToggle');
    const menu = $('#mobileMenu');
    const header = $('.site-header');
    if (!toggle || !menu) return;

    /* The sticky header shrinks on scroll and sits below the top bar at rest, so
       anchor the dropdown to the header's live bottom edge instead of guessing. */
    function positionMenu() {
      if (!header) return;
      const bottom = Math.round(header.getBoundingClientRect().bottom);
      menu.style.top = Math.max(0, bottom + 8) + 'px';
    }

    function setOpen(open) {
      if (open) positionMenu();
      toggle.classList.toggle('is-open', open);
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.setAttribute('aria-hidden', String(!open));
    }

    toggle.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));
    $$('a', menu).forEach((link) => link.addEventListener('click', () => setOpen(false)));

    document.addEventListener('click', (e) => {
      if (!menu.classList.contains('is-open')) return;
      if (!menu.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 860) setOpen(false);
      else if (menu.classList.contains('is-open')) positionMenu();
    }, { passive: true });

    window.addEventListener('scroll', () => {
      if (menu.classList.contains('is-open')) positionMenu();
    }, { passive: true });
  })();

  /* ------------------------------------------------------------------ *
   * 7. POINTER SOUNDS — one delegated pair of listeners for the whole page
   * ------------------------------------------------------------------ */
  (() => {
    // The modal's own buttons have their own cues (thunder, sting, whoosh);
    // the mute button plays its own tick inside js/audio.js.
    const QUIET = '#soundToggle, [data-close-surprise], [data-open-surprise]';

    document.addEventListener('click', (e) => {
      const el = e.target.closest('.btn, .site-nav a, .mobile-menu a, .nav-toggle, .brand');
      if (!el || el.matches(QUIET) || el.closest(QUIET)) return;
      SFX.play('click');
    });

    // Hover ticks only where a real pointer exists, and never in a swarm.
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      let lastAt = 0;
      let lastEl = null;

      document.addEventListener('pointerover', (e) => {
        const el = e.target.closest('a, button');
        if (!el || el === lastEl) return;
        if (el.matches(QUIET)) return;
        const now = window.performance ? performance.now() : Date.now();
        if (now - lastAt < 90) return;
        lastAt = now;
        lastEl = el;
        SFX.play('hover');
      });
    }
  })();

  /* ------------------------------------------------------------------ *
   * 8. ODDS & ENDS
   * ------------------------------------------------------------------ */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Safety net: if the animation module never ran, reveal the content anyway
  // so the invitation is never left invisible.
  window.setTimeout(() => {
    if (!document.querySelector('.reveal.is-visible')) {
      $$('.reveal').forEach((el) => el.classList.add('is-visible'));
    }
  }, 2200);
})();
