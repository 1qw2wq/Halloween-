# 🎃 A Night of Frights &amp; Delights

A Halloween party invitation styled like a Victorian theatre playbill — midnight ink,
blood-red rules, velvet curtains, candlelit photography and a jump-scare.

Hand-written **static HTML, CSS and vanilla JS**. No build step, no dependencies, no
backend, no framework.

| | |
|---|---|
| **Event** | October 31st · 18:00 (live countdown) |
| **Venue** | 杭州市富阳区九龙大道108号野风山城锦庐13-7 |
| **Stack** | HTML + CSS + vanilla JS · three self-hosted variable fonts · one dust `<canvas>` |
| **Host** | Vercel — static, zero-config, served from the repo root |
| **Weight** | ≈ 1.27 MB on disk · ≈ 28 KB of gzipped HTML + CSS + JS |

---

## Contents

1. [Run it locally](#-run-it-locally)
2. [Project structure](#-project-structure)
3. [Deploy on Vercel](#-deploy-on-vercel)
4. [Design language](#-design-language)
5. [Typography](#-typography)
6. [Responsive &amp; mobile](#-responsive--mobile)
7. [Performance](#-performance)
8. [The party &amp; what's interactive](#-the-party)
9. [Accessibility &amp; browser support](#-accessibility--browser-support)
10. [Customising](#-customising)
11. [Project status &amp; credits](#-project-status--credits)

---

## ✨ Run it locally

Nothing to install — every file is shipped as authored.

```bash
# any static server works
python3 -m http.server 8000
# or
npx serve .
```

Then open <http://localhost:8000>.

To preview with Vercel's own routing rules (clean URLs, headers, rewrites):

```bash
npm i -g vercel
vercel dev
```

> **Clipboard note:** "Copy Address" uses the async Clipboard API and falls back to
> `document.execCommand('copy')`. It works on `localhost`, `https://` and `file://`; on a
> plain-`http` origin the fallback path keeps it functional.

---

## 📁 Project structure

```
/
├── index.html              # Semantic markup, sections, surprise modal
├── 404.html                # "Lost in the Dark" — auto-served for unknown paths
├── css/
│   ├── style.css           # Tokens, @font-face, plates, frames, keyframes, responsive
│   └── no-js.css           # Only loaded via <noscript>, keeps content visible without JS
├── js/
│   ├── animations.js       # Dust canvas, bats & mist, cursor, ember burst, confetti
│   └── main.js             # Countdown, clipboard, surprise modal, .ics, nav
├── assets/
│   ├── hero-haunt.jpg      # Curtained moonlit manor (hero + RSVP backdrop)
│   ├── haunt.jpg           # Moonlit mansion with the pumpkin path
│   ├── ritual-kitchen.jpg  # Witches' Kitchen plate
│   ├── ritual-pie.jpg      # Pumpkin Pie Crafting plate
│   ├── ritual-games.jpg    # Haunted Game Night plate
│   ├── velvet.jpg          # Crushed-velvet texture (dress-code panel)
│   ├── surprise.jpg        # The "YOU'RE TRAPPED!" portrait
│   ├── og-image.jpg        # 1200×630 social preview card
│   ├── favicon.ico         # 16/32/48/64 multi-size
│   ├── favicon-32.png · apple-touch-icon.png
│   └── fonts/              # 4 subset variable woff2 files (140 KB)
├── vercel.json             # Routing, headers, CSP, cache policy
├── site.webmanifest        # Installable metadata
├── robots.txt · sitemap.xml
├── .vercelignore · .gitignore
└── README.md
```

---

## 🚀 Deploy on Vercel

### It deploys from the repo root — nothing goes in a subfolder

There is **no `public/`, `dist/` or `build/`**. `vercel.json` deliberately sets no
`buildCommand`, `outputDirectory`, `rootDirectory` or `framework`, so Vercel treats the
repository root as the static output:

| Request | Served |
|---|---|
| `/` | `index.html` |
| `/404` | `404.html` (via `cleanUrls`; `/404.html` 308-redirects to `/404`) |
| `/anything-else` | `404.html` with a **404** status |
| `/css/style.css`, `/js/*.js`, `/assets/*` | served as-is |
| `/favicon.ico` | rewritten to `/assets/favicon.ico` |

All references in the HTML are root-relative (`/assets/…`, `/css/…`, `/js/…`), which is what
makes clean URLs and the custom 404 work from any route.

In the dashboard the correct settings are: **Framework Preset `Other`**, **Root Directory
blank**, **Build Command empty**, **Output Directory blank with Override disabled**. The
build log should say *Static* — never a framework build.

### ⚠️ Which branch is production?

Production tracks the **Git branch** configured for the project. As of this commit the site
exists only on `arena/8bb2c439-halloween`, and **`main` contains just this README** — so if
the project tracks `main`, the production URL will 404 until the pull request is merged.

Fix it in one of three ways:

1. **Merge the pull request into `main`** (intended path) → production deploys the site.
2. Use the **preview URL** Vercel already generated for the branch.
3. Temporarily set **Settings → Git → Production Branch** to
   `arena/8bb2c439-halloween`.

### Deploy

**Dashboard:** *Add New → Project → Import repository* → confirm the settings above →
**Deploy**. Every push to the production branch redeploys; every other branch and PR gets
its own preview URL.

**CLI:**

```bash
vercel          # preview deployment
vercel --prod   # production deployment
```

### Cache &amp; security headers (already configured)

| Path | Policy |
|---|---|
| `/assets/fonts/*` | `font/woff2` + `max-age=2592000, stale-while-revalidate=604800` |
| `/assets/*` | `max-age=86400, stale-while-revalidate=604800` |
| `/css/*`, `/js/*` | `max-age=600, stale-while-revalidate=86400` |
| `/index.html`, `/404.html` | `max-age=0, must-revalidate` |
| all routes | CSP (`'self'` only), `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS, COOP |

The CSP needs no `unsafe-inline`: there are no inline `<script>`, `<style>` or `style=""`
attributes. `frame-ancestors *` is intentional so the invite can be embedded in a preview
iframe. Vercel serves HTTPS and Brotli by default; the clipboard API needs that secure
context.

### After the first deploy

Swap the placeholder domain `https://halloween-frights.vercel.app` for your real one in:

- `index.html` → `og:url`, `og:image`, `twitter:image`
- `robots.txt` → `Sitemap:`
- `sitemap.xml` → `<loc>`

(Or attach the custom domain first and simply replace that string.)

### Checklist

- [x] No build command, no dependencies, no server code
- [x] Root-relative asset paths; clean URLs and custom 404 verified
- [x] HTTPS (clipboard requires a secure context)
- [x] CSP `self`-only, no inline scripts or styles
- [x] Custom 404, multi-size favicon, Apple touch icon, 1200×630 OG card
- [x] `node_modules/`, `.vercel/` and env files excluded from the bundle
- [ ] Domain placeholders replaced with the production URL
- [ ] Pull request merged so `main` (production) actually has the site

---

## 🎨 Design language

| Token | Role |
|---|---|
| `#08080b` | Ink — page ground |
| `#b3121f` / `#d8202b` | Blood — rules, stamps, the primary CTA |
| `#ece5d6` | Bone — type and hairlines |
| `#c9a227` | Brass — occasional accents |

Deliberately absent: rounded cards, glassmorphism, drop-shadowed pills and neon glows.
Frames are square with engraved inner rules, buttons are rectangles or clipped blocks, and
a fine SVG film grain sits over the scene so nothing reads as a flat web gradient.

---

## 🔤 Typography

Three **variable** woff2 families, self-hosted from `/assets/fonts`, subset to Latin-1 plus
typographic punctuation. No Google Fonts request and no render-blocking third-party hop.

| File | Axis | Size |
|---|---|---|
| `playfair-display-var.woff2` | 400–900 | 29.2 KB |
| `lora-var.woff2` | 400–700 | 31.1 KB |
| `lora-italic-var.woff2` | 400–700 italic | 34.0 KB |
| `caveat-var.woff2` | pinned at 500 | 46.0 KB |

Total **140.3 KB** of fonts, of which the two preloaded faces are 60.3 KB.

| Face | Used for |
|---|---|
| **Playfair Display** | Playbill headlines, buttons, countdown, wordmark |
| **Lora** | Body copy, ledgers, small-caps labels, captions |
| **Caveat** | Handwritten margin notes and the script ampersand |

The two above-the-fold faces are `<link rel="preload">`ed, every face declares
`unicode-range`, all use `font-display: swap`, and `font-synthesis-weight: none` stops the
browser faking weights the variable files already contain.

---

## 📱 Responsive &amp; mobile

- **Breakpoints:** `1080` (ticket + haunt stack) · `960` (plates → horizontal panels) ·
  `860` (nav collapses, header becomes opaque) · `720` (phone) · `420` (small phone), plus
  `orientation: landscape` phones and short-viewport rules.
- **Safe areas:** `viewport-fit=cover` with `env(safe-area-inset-*)` on the header,
  sections, floating cauldron, toast and the footer's bottom clearance.
- **No overflow:** the masthead is set on two intentional lines and headline sizes were
  checked against the real Playfair advance widths, so the widest line fits from
  **320 px** up.
- **Touch:** 44 px minimum targets (48 px buttons), hover-only transforms disabled under
  `@media (hover: none)`, ledger and ticket layouts reflow to single columns.
- **Cheap on phones:** header and modal drop `backdrop-filter` below 860 px, grain switches
  to normal blending, and the particle/cursor layers scale down or disable themselves.

---

## ⚡ Performance

### Particles

The first version allocated a radial gradient for every particle on every frame — the
single most expensive thing on the page. It now behaves like this:

| Before | After |
|---|---|
| `createRadialGradient()` per particle per frame (≈2,400/s) | **4 gradients total**, baked once into sprite canvases |
| Gradient fill per particle | `drawImage()` blits of a shared sprite |
| DPR 2 canvas (4× fill rate) | DPR capped at **1.5** (1 on low-end) |
| Uncapped 60 fps ambient loop | **30 fps** cap (24 on low-end) |
| Second rAF loop clearing a full-screen cursor canvas | **No loop** — cursor is DOM + a CSS transition |
| Emoji confetti re-laid-out with `fillText` every frame | Glyphs **rasterised once**, then blitted |
| `filter: blur(38px)` on a full-viewport layer | Removed; gradients are pre-softened |
| — | Frame-time **watchdog** steps quality down automatically |

The loop pauses on `visibilitychange`, canvas resizing is debounced, and all scroll/pointer
listeners are passive.

### Payload

| Asset | Raw | Gzipped |
|---|---|---|
| `index.html` | 19.5 KB | 5.3 KB |
| `css/style.css` | 52.2 KB | 11.6 KB |
| `js/animations.js` + `js/main.js` | 38.3 KB | 11.1 KB |
| Fonts (4 × woff2) | 140.3 KB | — |
| 6 photographs (hero eager, rest lazy) | 0.84 MB | — |
| Velvet texture + OG card | 0.11 MB | — |
| **Total** | **≈ 1.27 MB** | **≈ 28 KB of text** |

Images are dimensioned in markup (no layout shift), the hero is preloaded with
`fetchpriority="high"`, and every other photograph is `loading="lazy"`.

---

## 🎃 The party

| | |
|---|---|
| **When** | October 31st · 18:00 (live countdown, local timezone) |
| **Where** | 杭州市富阳区九龙大道108号野风山城锦庐13-7 |
| **Rituals** | Witches' Kitchen · Pumpkin Pie Crafting · Haunted Game Night |
| **Dress code** | Costumes welcome &amp; encouraged — **not mandatory** |

### What's interactive

- **Live countdown** — counts to the next Oct 31 · 18:00 and switches to "the haunt has
  begun" once it passes.
- **Copy Address** — one tap copies the address; a toast confirms with a bat 🦇.
- **"I Dare to Enter" / "Accept Invitation"** — red lightning flash, screen shake, then the
  framed surprise panel: glitch portrait, *YOU'RE TRAPPED! 🎃*, and an exploding
  🦇 🎃 👻 💀 confetti burst. Dismiss with `✕`, the backdrop or `Esc`.
- **Save the date** — generates a real `.ics` invite (with a 2-hour reminder) in-browser.
- **Floating cauldron** — ink ripples and an ember burst on click.
- **Ambient layers** — dust motes catching candlelight, drifting mist, sparse bat silhouettes.
- **Custom cursor** — a fine point with a slow trailing ring (desktop only).
- **Plates** — ritual cards lift, their numeral stamps fill blood red, photographs enlarge
  very slowly on hover.
- **Nav** — active-section indicator, sticky header, mobile dropdown anchored to the
  header's measured edge.

---

## ♿ Accessibility &amp; browser support

- `prefers-reduced-motion` disables dust, sprites, shake, confetti, parallax and the
  scroll-reveal transitions.
- The modal traps focus, restores it to the trigger, closes on `Esc`, and locks background
  scroll; content self-reveals if JavaScript fails.
- Decorative art is `aria-hidden`; the countdown is a labelled live region; the layout uses
  one `h1` with a logical heading order.
- Modern evergreen browsers are the target (CSS custom properties, `clamp()`,
  `aspect-ratio`, `IntersectionObserver`, variable fonts). `text-wrap: balance/pretty`,
  `desynchronized` canvases and `backdrop-filter` degrade silently where unsupported.
- **How it was verified:** behaviour (countdown maths, clipboard payload, modal open/close,
  focus trap, `Esc`, scroll lock, nav, cauldron) is covered by a jsdom harness that also
  instruments the canvas to assert zero per-frame gradient allocations. Layout, mobile
  reflow and font metrics were checked statically (real font advance widths, asset and CSS
  audits) — the build sandbox has no browser, so there are no screenshot regressions yet.
- **Without JavaScript** the invitation still reads as a complete static page: a
  `<noscript>` stylesheet (`css/no-js.css`) reveals all scroll-revealed content, hides the
  inert cauldron and countdown digits, and dims the JS-only buttons. The date line, address,
  rituals and dress code are all plain markup.

---

## 🛠️ Customising

| What | Where |
|---|---|
| **Date / time** | `js/main.js` → `const PARTY = { day: 31, hour: 18, minute: 0, … }` |
| **Address** | the `<address>` text **and** `data-address` on `#copyAddressBtn` in `index.html` (keep them identical) |
| **Colours, fonts, spacing** | token block at the top of `css/style.css` |
| **Photography** | replace files in `assets/` — the layout crops to 4:5 (plates), 16:9 (hero) and 1:1 (modal) automatically |
| **Copy** | lives in `index.html`, except the toast messages, the "Copied!" button label, the countdown's post-deadline line, and the `.ics` summary/description in `js/main.js` |
| **Social card** | replace `assets/og-image.jpg` (1200×630) |

---

## 📌 Project status &amp; credits

- Active work happens on **`arena/8bb2c439-halloween`**, tracked by **pull request #1** into
  `main`. Merge it before expecting the production URL to serve the site.
- **Images:** the photography was generated for this invitation; `assets/surprise.jpg` is the
  host's own portrait, cropped and optimised for the jump-scare.
- **Fonts:** Playfair Display, Lora and Caveat are licensed under the **SIL Open Font
  License 1.1**; the woff2 files here are Latin subsets built from the `@fontsource`
  packages and may be redistributed under the same licence.
- **Content:** a private party invitation — personal, non-commercial use. No licence is
  granted for reuse as a template beyond that.
