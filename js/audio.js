/* ==========================================================================
   A NIGHT OF FRIGHTS & DELIGHTS — audio.js
   Sound effects, synthesized at runtime with the Web Audio API.

   There is not a single .mp3 or .ogg in this project: every knock, thunder
   crack, cauldron gurgle and scare sting is generated from oscillators and
   shaped noise, so the whole soundscape costs 0 bytes to download, needs no
   licence, fits the 'self'-only CSP, and works offline.

   Browsers will not start audio until the visitor interacts with the page,
   so the context is created on the first pointerdown / keydown (see unlock).
   A mute toggle in the header persists the choice in localStorage.
   ========================================================================== */

(function () {
  'use strict';

  const root = document.documentElement;
  const toggleBtn = document.getElementById('soundToggle');

  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) {
    root.classList.add('no-audio');
    window.HallowSfx = {
      play() {},
      unlock() {},
      toggle() {},
      enabled: false,
      ready: false
    };
    return;
  }

  /* The header shows the toggle as soon as we know the browser can do this. */
  root.classList.add('audio-ready');

  const STORE_KEY = 'hallow:sound';
  const MAX_VOICES = 64; // a runaway loop must not melt the audio thread
  const BASE_GAIN = 0.85;

  /* ------------------------------------------------------------------ *
   * Preference
   * ------------------------------------------------------------------ */
  let enabled = readPref();

  function readPref() {
    try {
      return window.localStorage.getItem(STORE_KEY) !== 'off';
    } catch (err) {
      return true;
    }
  }

  function savePref() {
    try {
      window.localStorage.setItem(STORE_KEY, enabled ? 'on' : 'off');
    } catch (err) {
      /* private mode — the choice just will not be remembered */
    }
  }

  /* ------------------------------------------------------------------ *
   * Context, master chain and reverb
   * ------------------------------------------------------------------ */
  let ctx = null;
  let master = null;
  let verbIn = null;
  let noiseBuffer = null;
  let voices = 0;

  function build() {
    try {
      ctx = new AudioCtor({ latencyHint: 'interactive' });
    } catch (err) {
      try {
        ctx = new AudioCtor();
      } catch (err2) {
        root.classList.remove('audio-ready');
        root.classList.add('no-audio');
        return;
      }
    }

    // A compressor keeps the thunder crack from clipping the scare sting.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 20;
    comp.ratio.value = 7;
    comp.attack.value = 0.004;
    comp.release.value = 0.3;

    master = ctx.createGain();
    master.gain.value = BASE_GAIN;
    master.connect(comp).connect(ctx.destination);

    // One shared plate reverb, fed by the cues that want air around them.
    const verb = ctx.createConvolver();
    verb.buffer = impulse(1.9, 3);
    const wet = ctx.createGain();
    wet.gain.value = 0.42;
    verbIn = ctx.createGain();
    verbIn.gain.value = 1;
    verbIn.connect(verb).connect(wet).connect(master);

    noiseBuffer = makeNoise(2.4);
  }

  /* Dark, decaying stereo noise — a cheap plate for the sting and bells. */
  function impulse(seconds, decay) {
    const rate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(rate * seconds));
    const buffer = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        last = last * 0.62 + white * 0.38; // one-pole lowpass, so not hissy
        data[i] = last * Math.pow(1 - i / length, decay);
      }
    }
    return buffer;
  }

  function makeNoise(seconds) {
    const rate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(rate * seconds));
    const buffer = ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function track(source, lifetime) {
    voices += 1;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      voices -= 1;
    };
    source.addEventListener('ended', release);
    // Backstop: a node stopped early, or one whose context was suspended, may
    // never fire 'ended'. Without this the voice budget would leak away and
    // quietly silence the page for the rest of the visit.
    window.setTimeout(release, lifetime || 5000);
  }

  const clampFreq = (value) => Math.max(20, Math.min(18000, value));

  /* ------------------------------------------------------------------ *
   * Building blocks
   * ------------------------------------------------------------------ */

  /* A pitched tone with an exponential envelope. */
  function tone(when, opts) {
    const {
      type = 'sine',
      from,
      to = from,
      dur = 0.2,
      attack = 0.006,
      peak = 0.1,
      send = 0,
      filter = null
    } = opts;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(clampFreq(from), when);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(clampFreq(to), when + dur);

    let node = osc;
    if (filter) {
      const biquad = ctx.createBiquadFilter();
      biquad.type = filter.type || 'lowpass';
      biquad.frequency.value = filter.freq || 1200;
      biquad.Q.value = filter.q || 0.8;
      node = node.connect(biquad);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(peak, when + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + attack + dur);
    node.connect(gain).connect(master);
    if (send > 0) gain.connect(verbIn);

    osc.start(when);
    osc.stop(when + attack + dur + 0.04);
    track(osc);
    return osc;
  }

  /* A burst of filtered noise — the skeleton of knocks, wind and thunder. */
  function noise(when, opts) {
    const {
      dur = 0.12,
      attack = 0.004,
      peak = 0.1,
      type = 'bandpass',
      from = 1200,
      to = from,
      q = 1,
      send = 0,
      pan = 0
    } = opts;

    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;

    const biquad = ctx.createBiquadFilter();
    biquad.type = type;
    biquad.Q.value = q;
    biquad.frequency.setValueAtTime(clampFreq(from), when);
    if (to !== from) biquad.frequency.exponentialRampToValueAtTime(clampFreq(to), when + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(peak, when + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + attack + dur);

    let out = src.connect(biquad).connect(gain);
    if (pan && typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      out = out.connect(panner);
    }
    out.connect(master);
    if (send > 0) gain.connect(verbIn);

    src.start(when, Math.random() * 1.4);
    src.stop(when + attack + dur + 0.05);
    track(src);
    return src;
  }

  /* ------------------------------------------------------------------ *
   * The cue sheet
   * ------------------------------------------------------------------ */
  const BANK = {
    /* A dry wooden knock — buttons, links, the menu. */
    click(when) {
      tone(when, { type: 'triangle', from: 208, to: 116, dur: 0.13, peak: 0.085 });
      tone(when, { type: 'sine', from: 1720, to: 1180, dur: 0.045, peak: 0.028 });
      noise(when, { dur: 0.05, from: 1500, q: 2.6, peak: 0.07 });
    },

    /* Barely-there breath on hover, so the page feels alive but not chatty. */
    hover(when) {
      noise(when, { dur: 0.055, from: 2600, to: 1900, q: 3.4, peak: 0.022 });
    },

    /* The lightning flash: a crack, a sub thump and a long rumble. */
    thunder(when) {
      noise(when, { dur: 0.16, type: 'highpass', from: 1100, peak: 0.34, pan: -0.15 });
      noise(when + 0.005, {
        dur: 1.5,
        type: 'lowpass',
        from: 1900,
        to: 80,
        q: 0.9,
        attack: 0.012,
        peak: 0.4,
        send: 0.5,
        pan: 0.1
      });
      tone(when, { type: 'sine', from: 72, to: 33, dur: 0.9, attack: 0.008, peak: 0.3 });
      tone(when + 0.02, { type: 'sawtooth', from: 58, to: 40, dur: 0.55, peak: 0.06, filter: { type: 'lowpass', freq: 220 } });
    },

    /* The reveal: a shriek over a minor-second cluster, then a ghost tail. */
    scare(when) {
      // shriek — a saw gliding up and back down, wobbled by a fast LFO
      const shriek = ctx.createOscillator();
      shriek.type = 'sawtooth';
      shriek.frequency.setValueAtTime(clampFreq(760), when);
      shriek.frequency.exponentialRampToValueAtTime(clampFreq(1560), when + 0.16);
      shriek.frequency.exponentialRampToValueAtTime(clampFreq(520), when + 0.62);

      const wobble = ctx.createOscillator();
      wobble.type = 'sine';
      wobble.frequency.value = 23;
      const wobbleDepth = ctx.createGain();
      wobbleDepth.gain.value = 42;
      wobble.connect(wobbleDepth).connect(shriek.frequency);

      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 1450;
      band.Q.value = 1.1;

      const shriekGain = ctx.createGain();
      shriekGain.gain.setValueAtTime(0.0001, when);
      shriekGain.gain.exponentialRampToValueAtTime(0.13, when + 0.03);
      shriekGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.72);

      shriek.connect(band).connect(shriekGain).connect(master);
      shriekGain.connect(verbIn);
      shriek.start(when);
      shriek.stop(when + 0.78);
      wobble.start(when);
      wobble.stop(when + 0.78);
      track(shriek);

      // dissonant cluster: B2 / C3 / E3 — a minor second grinding on a fourth
      [123.47, 130.81, 164.81].forEach((freq, i) => {
        tone(when + i * 0.012, {
          type: 'sawtooth',
          from: freq,
          to: freq * 0.99,
          dur: 1.15,
          attack: 0.014,
          peak: 0.075,
          send: 0.55,
          filter: { type: 'lowpass', freq: 1700, q: 0.7 }
        });
      });

      // the ghost leaving the room
      noise(when + 0.18, {
        dur: 1.05,
        from: 2400,
        to: 260,
        q: 1.3,
        attack: 0.09,
        peak: 0.085,
        send: 0.6,
        pan: 0.25
      });
    },

    /* Closing the door behind you. */
    whoosh(when) {
      noise(when, { dur: 0.42, from: 1100, to: 200, q: 0.9, attack: 0.05, peak: 0.1, send: 0.3 });
      tone(when, { type: 'sine', from: 300, to: 110, dur: 0.34, attack: 0.03, peak: 0.05 });
    },

    /* Toast: a small bell, two struck partials plus a shimmer. */
    chime(when) {
      [
        [1318.5, 0.055, 0.62],
        [1975.5, 0.04, 0.46],
        [2637, 0.02, 0.3]
      ].forEach(([freq, peak, dur]) => {
        tone(when, { from: freq, dur, attack: 0.004, peak, send: 0.45 });
      });
    },

    /* Milestone: a rising four-note arpeggio, E minor. */
    sparkle(when) {
      [659.25, 783.99, 987.77, 1318.5].forEach((freq, i) => {
        tone(when + i * 0.085, { from: freq, dur: 0.55, attack: 0.006, peak: 0.055, send: 0.6 });
      });
      noise(when, { dur: 0.5, type: 'highpass', from: 5200, peak: 0.02, send: 0.4 });
    },

    /* The cauldron: a plop, a gurgle and a handful of rising bubbles. */
    stir(when, opts) {
      const big = !!(opts && opts.big);
      const stirs = (opts && opts.stirs) || 1;
      const lift = Math.min(1.55, 1 + stirs * 0.035); // the brew gets livelier
      const density = big ? 9 : 6;

      // the pot swallowing something
      tone(when, { type: 'sine', from: 150 * lift, to: 54, dur: 0.22, attack: 0.005, peak: 0.17 });
      noise(when, { dur: 0.5, type: 'lowpass', from: 620, to: 260, q: 1.4, attack: 0.02, peak: 0.075, send: 0.2 });

      // bubbles surfacing, each a different size
      for (let i = 0; i < density; i++) {
        const at = when + 0.05 + Math.random() * (big ? 0.62 : 0.42);
        const base = (180 + Math.random() * 320) * lift;
        tone(at, {
          from: base,
          to: base * (1.5 + Math.random() * 0.9),
          dur: 0.055 + Math.random() * 0.06,
          attack: 0.004,
          peak: 0.05 + Math.random() * 0.03,
          send: 0.15
        });
      }

      // a low boiling hiss under it all
      noise(when + 0.04, {
        dur: big ? 1.05 : 0.7,
        from: 900,
        to: 520,
        q: 0.8,
        attack: 0.16,
        peak: 0.032,
        send: 0.25
      });
    },

    /* Muting / unmuting. */
    tick(when) {
      tone(when, { from: 880, to: 660, dur: 0.07, attack: 0.003, peak: 0.05 });
    }
  };

  /* ------------------------------------------------------------------ *
   * Public surface
   * ------------------------------------------------------------------ */
  function unlock() {
    if (!enabled) return;
    if (!ctx) build();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function play(name, options) {
    if (!ctx || !enabled) return; // never create a context outside a gesture
    if (document.hidden) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (voices > MAX_VOICES) return;

    const cue = BANK[name];
    if (!cue) return;
    try {
      cue(ctx.currentTime + 0.004, options || {});
    } catch (err) {
      /* an effect must never be able to break the page */
    }
  }

  function render() {
    if (!toggleBtn) return;
    toggleBtn.setAttribute('aria-pressed', String(enabled));
    toggleBtn.classList.toggle('is-on', enabled);
    toggleBtn.classList.toggle('is-off', !enabled);
    toggleBtn.setAttribute(
      'aria-label',
      enabled ? 'Mute sound effects' : 'Unmute sound effects'
    );
    toggleBtn.title = enabled ? 'Sound on' : 'Sound off';
  }

  function setEnabled(next) {
    enabled = !!next;
    if (master) master.gain.value = enabled ? BASE_GAIN : 0;
    savePref();
    render();
  }

  function toggle() {
    setEnabled(!enabled);
    if (enabled) {
      unlock();
      play('tick');
    }
  }

  window.HallowSfx = {
    play,
    unlock,
    toggle,
    setEnabled,
    get enabled() {
      return enabled;
    },
    get ready() {
      return !!ctx;
    }
  };

  /* ------------------------------------------------------------------ *
   * Wiring
   * ------------------------------------------------------------------ */
  render();

  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggle();
    });
  }

  // First gesture opens the audio device. The capture phase means it beats
  // the click handlers, so the very first click already has sound.
  ['pointerdown', 'touchstart', 'keydown'].forEach((type) => {
    document.addEventListener(type, unlock, { capture: true, passive: true });
  });

  // A tab returning from the background resumes cleanly rather than silently.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !ctx || !enabled) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  });
})();
