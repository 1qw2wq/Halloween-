# 🎃 A Night of Frights &amp; Delights

A spooky-luxury Halloween party invitation — dark obsidian, neon pumpkin, eerie green,
ambient fog, floating ghosts, and one very rude surprise.

Pure static HTML/CSS/JS. **No build step, no npm install, no backend.**

---

## ✨ Live locally

Any static server works:

```bash
# Python
python3 -m http.server 8000

# or Node
npx serve .
```

Then open <http://localhost:8000>.

> The clipboard "Copy Address" button uses the async Clipboard API and falls back to
> `document.execCommand('copy')`, so it works on `localhost`, `https://`, and `file://`.

---

## 📁 Project structure

```
├── index.html          # Semantic layout + modal markup
├── css/
│   └── style.css       # Theme tokens, glass/gothic cards, keyframes, responsive rules
├── js/
│   ├── animations.js   # Canvas particles, floating sprites, custom cursor, confetti
│   └── main.js         # Countdown, copy-to-clipboard, surprise modal, calendar file
└── assets/
    ├── haunt.jpg       # Hero backdrop (haunted mansion + moon)
    └── surprise.jpg    # The "YOU'RE TRAPPED!" portrait
```

---

## 🎃 The party

| | |
|---|---|
| **When** | October 31st · 18:00 (live countdown) |
| **Where** | 杭州市富阳区九龙大道108号野风山城锦庐13-7 |
| **Rituals** | Witches' Kitchen · Pumpkin Pie Crafting · Haunted Game Night |
| **Dress code** | Costumes welcome &amp; encouraged — **not mandatory** |

---

## 🕯️ What's interactive

- **Live countdown** — counts to the next Oct 31 · 18:00 in the visitor's local timezone.
- **Copy Address** — one tap copies the full address; toast confirms with a bat 🦇.
- **"I Dare to Enter" / "Accept Invitation"** — red lightning flash, screen shake, then the
  surprise modal drops in: glitch portrait, animated *YOU'RE TRAPPED! 🎃*, and an
  exploding 🦇 🎃 👻 💀 emoji-confetti burst. Escape with `✕`, the backdrop, or the Esc key.
- **Save the date** — generates a real `.ics` calendar invite (with a 2-hour reminder)
  entirely in the browser.
- **Floating cauldron** — click it for concentric neon ripples and a particle burst.
- **Ambient layers** — rising embers/spores, drifting fog, bats, ghosts and mini
  jack-o'-lanterns crossing the screen.
- **Custom cursor** — a glowing ember with a ghostly ember trail (desktop only).
- **Neon cards** — cursor-tracked spotlight glow and lift on hover.

---

## ♿ Accessibility &amp; performance notes

- `prefers-reduced-motion` disables particles, sprites, shakes, confetti and parallax.
- The modal traps focus, restores focus to the trigger, closes on `Esc`, and locks scroll.
- Decorative art is `aria-hidden`; the countdown is a labelled live region.
- Images are preloaded/dimensioned to avoid layout shift; the particle canvas caps DPR at 2.

---

## 🛠️ Customising

- **Date/time** — `js/main.js` → `const PARTY = { day: 31, hour: 18, minute: 0, … }`.
- **Address** — update the `<address>` text and the `data-address` attribute on
  `#copyAddressBtn` in `index.html` (keep them identical).
- **Colours &amp; fonts** — edit the token block at the top of `css/style.css`.
- **Images** — drop replacements into `assets/` with the same filenames.
