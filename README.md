# 🎃 A Night of Frights &amp; Delights

A Halloween party invitation styled like a Victorian theatre playbill — midnight ink,
blood-red rules, velvet curtains and candlelit photography.

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
│   └── style.css       # Design tokens, plates, playbill frames, keyframes, responsive
├── js/
│   ├── animations.js   # Dust canvas, drifting bats & mist, cursor, ember burst, confetti
│   └── main.js         # Countdown, copy-to-clipboard, surprise modal, calendar file
└── assets/
    ├── hero-haunt.jpg       # Curtained, moonlit manor (hero + RSVP backdrop)
    ├── haunt.jpg            # Moonlit mansion with the pumpkin path
    ├── ritual-kitchen.jpg   # Witches' Kitchen plate
    ├── ritual-pie.jpg       # Pumpkin Pie Crafting plate
    ├── ritual-games.jpg     # Haunted Game Night plate
    ├── velvet.jpg           # Crushed-velvet texture (dress-code panel)
    └── surprise.jpg         # The "YOU'RE TRAPPED!" portrait
```

---

## 🎨 Design language

| Token | Role |
|---|---|
| `#08080b` | Ink — page ground |
| `#b3121f` / `#d8202b` | Blood — rules, stamps, the primary CTA |
| `#ece5d6` | Bone — type and hairlines |
| `#c9a227` | Brass — occasional accents |
| **Bebas Neue** | Playbill headlines, always uppercase and tight |
| **Lora** | Body copy, ledgers and captions |
| **Caveat** | Handwritten margin notes |

Deliberately absent: rounded cards, glassmorphism, drop-shadowed pills and neon glows.
Frames are square, buttons are rectangles or clipped blocks, and every surface carries a
fine film grain so nothing looks like a flat web gradient.

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

- **Live countdown** — counts to the next Oct 31 · 18:00 in the visitor's local timezone,
  set as a hairline ledger strip rather than a floating pill.
- **Copy Address** — one tap copies the full address; a toast confirms with a bat 🦇.
- **"I Dare to Enter" / "Accept Invitation"** — red lightning flash, screen shake, then a
  framed surprise panel: glitch portrait, *YOU'RE TRAPPED! 🎃*, and an exploding
  🦇 🎃 👻 💀 emoji-confetti burst. Escape with `✕`, the backdrop, or the Esc key.
- **Save the date** — generates a real `.ics` calendar invite (with a 2-hour reminder)
  entirely in the browser.
- **Floating cauldron** — click it for ink ripples and an ember burst.
- **Ambient layers** — fine dust motes catching candlelight, drifting mist, sparse bat
  silhouettes.
- **Custom cursor** — a fine point with a slow trailing ring (desktop only).
- **Plates** — the three ritual cards lift, their numbering stamps fill with blood red, and
  the photographs enlarge very slowly on hover.

---

## ♿ Accessibility &amp; performance notes

- `prefers-reduced-motion` disables dust, sprites, shakes, confetti and parallax.
- The modal traps focus, restores focus to the trigger, closes on `Esc`, and locks scroll.
- Decorative art is `aria-hidden`; the countdown is a labelled live region.
- Images are preloaded/dimensioned to avoid layout shift; the particle canvas caps DPR at 2
  and the whole `assets/` folder stays under 1 MB.

---

## 🛠️ Customising

- **Date/time** — `js/main.js` → `const PARTY = { day: 31, hour: 18, minute: 0, … }`.
- **Address** — update the `<address>` text and the `data-address` attribute on
  `#copyAddressBtn` in `index.html` (keep them identical).
- **Colours &amp; type** — edit the token block at the top of `css/style.css`.
- **Photography** — replace the files in `assets/` with the same filenames; the layout
  crops them to 4:5 (plates) and 16:9 (hero) automatically.
