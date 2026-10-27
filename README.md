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
├── 404.html            # Styled not-found page
├── vercel.json         # Clean URLs, headers, caching (deployment ready)
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
    ├── surprise.jpg         # The "YOU'RE TRAPPED!" portrait
    ├── og-image.jpg         # 1200×630 social preview card
    ├── favicon.ico / .png, apple-touch-icon.png
    └── fonts/               # Self-hosted variable woff2 (152 KB, latin subset)
```

---

## 🚀 Deploy to Vercel

This is a **zero-config static site** — Vercel detects plain HTML and ships it with no build
step. Everything needed is already in the repo:

| File | Purpose |
|---|---|
| `vercel.json` | Clean URLs, `/favicon.ico` rewrite, security headers (CSP), cache policy |
| `404.html` | Styled "Lost in the Dark" not-found page (Vercel serves it automatically) |
| `robots.txt` · `sitemap.xml` | Crawler hints |
| `site.webmanifest` | Installable-app metadata + icons |
| `.vercelignore` | Keeps the deploy bundle to page assets only |
| `.gitignore` | Excludes `node_modules/`, `.vercel/`, local env files |

### Option A — dashboard (recommended)

1. Push this branch and merge the pull request into `main`.
2. In Vercel: **Add New → Project → Import** the `1qw2wq/Halloween-` repository.
3. Framework preset **Other**, Build Command **empty**, Output Directory **empty** (root).
4. **Deploy**. Every later push to `main` redeploys; pull requests get preview URLs.

### Option B — CLI

```bash
npm i -g vercel
vercel            # preview deployment
vercel --prod     # production deployment
```

### After the first deploy

Replace the placeholder domain `https://halloween-frights.vercel.app` in four places so
link previews and crawlers point at your real URL (or just attach the custom domain and
swap the string):

- `index.html` → `og:url`, `og:image`, `twitter:image`
- `robots.txt` → `Sitemap:`
- `sitemap.xml` → `<loc>`

### Deploy checklist

- [x] No build command, no dependencies, no server code
- [x] All asset paths root-relative (`/assets/…`, `/css/…`, `/js/…`) so clean URLs and
      `404.html` resolve correctly
- [x] HTTPS by default on Vercel — the clipboard API requires a secure context
- [x] CSP allows only `self` (fonts are self-hosted); no inline scripts or styles to whitelist
- [x] `frame-ancestors *` so the invitation can still be embedded in a preview iframe
- [x] Custom 404, favicon (`.ico` + PNG + Apple touch icon), 1200×630 OG image
- [x] Total deploy weight ≈ 1.3 MB


---

## 🎨 Design language

| Token | Role |
|---|---|
| `#08080b` | Ink — page ground |
| `#b3121f` / `#d8202b` | Blood — rules, stamps, the primary CTA |
| `#ece5d6` | Bone — type and hairlines |
| `#c9a227` | Brass — occasional accents |
| **Playfair Display** | Playbill headlines — a high-contrast didone, 700–900 |
| **Lora** | Body copy, ledgers, small caps labels and captions |
| **Caveat** | Handwritten margin notes, the script ampersand |

Deliberately absent: rounded cards, glassmorphism, drop-shadowed pills and neon glows.
Frames are square, buttons are rectangles or clipped blocks, and every surface carries a
fine film grain so nothing looks like a flat web gradient.

---

## 🔤 Type

Self-hosted **variable** woff2 files (no Google Fonts request, no render-blocking
third-party hop), subset to Latin‑1 + typographic punctuation and served from `/assets/fonts`:

| File | Weight axis | Size |
|---|---|---|
| `playfair-display-var.woff2` | 400–900 | 29 KB |
| `lora-var.woff2` | 400–700 | 31 KB |
| `lora-italic-var.woff2` | 400–700 italic | 34 KB |
| `caveat-var.woff2` | pinned at 500 | 46 KB |

The two above-the-fold faces are `<link rel="preload">`ed, everything uses
`font-display: swap`, and `font-synthesis-weight: none` stops the browser faking
weights the variable fonts already provide.

## 📱 Mobile

- Breakpoint system: **1080** (ticket/haunt stack) · **960** (plates → panels) ·
  **860** (nav collapses, header goes opaque) · **720** (phone) · **420** (small phone)
  plus landscape-phone and short-viewport rules.
- `viewport-fit=cover` with `env(safe-area-inset-*)` on the header, sections, cauldron
  and toast, so nothing hides under a notch or home indicator.
- The masthead is set on two intentional lines; headline sizes were checked against real
  Playfair advance widths so the widest line fits from **320 px** up without overflow.
- 44 px minimum tap targets (`48 px` for buttons), hover-only effects disabled under
  `@media (hover: none)`, ledger and ticket layouts reflow to single columns.

## ⚡ Particle performance

The first version re-created a radial gradient for every particle on every frame — the
single biggest cost in the whole page. It now works like this:

| Before | After |
|---|---|
| `createRadialGradient()` per particle per frame (~2,400/s) | **4 gradients total**, baked once into sprite canvases |
| Gradient fill per particle | `drawImage()` blits of one shared sprite |
| DPR 2 canvas (4× the fill rate) | DPR capped at **1.5** (1 on low-end/mobile) |
| Uncapped 60 fps ambient loop | **30 fps** cap (24 on low-end) — dust drifts, nobody notices |
| Second rAF loop clearing a full-screen cursor canvas | **No loop at all**: cursor is DOM + a CSS transition |
| Emoji confetti laid out with `fillText` per particle per frame | Glyphs **rasterised once**, then blitted |
| `filter: blur(38px)` on a full-viewport fixed layer | Pre-softened gradients, no filter |
| — | **Watchdog** samples frame times and steps quality down automatically |

Everything pauses on `visibilitychange`, the canvas is capped and resized on a debounce,
and listeners are passive.

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
