# Phirum Seng — personal site

A fast, single-page personal profile at [sengphirum.github.io](https://sengphirum.github.io/),
built with semantic HTML, modern CSS, and vanilla JavaScript. No framework, no package install,
no build step.

## Highlights

- **Headline work section** — the two flagship systems, [KNetraHub](https://sengphirum.github.io/KNetraHub/documentation)
  and the [PLXY AI Call Center](https://sengphirum.github.io/PLXY_AICC/), joined by the
  [DrowsyGuard MCU](https://sengphirum.github.io/PLXY_DrowsyGuard/) IoT concept and the
  [Claude Usage Monitor](https://sengphirum.github.io/PLXY_ClaudeMonitor/) studio tool — the first
  three with an animated, hand-drawn SVG diagram of how they actually work, and the Claude Usage
  Monitor with a shot of its executive dashboard running in demo mode
- **Live GitHub portfolio** — every public repository loaded from the GitHub API, grouped by
  focus area, with category filters, search, sorting, and a grid/list toggle
- **PhirumBot**, an assistant that runs entirely in the visitor's browser (see below)
- **Quick navigator** on <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd> — jump to any section,
  project, or action; fuzzy matching includes every loaded repository
- Light and dark themes, remembered per visitor and applied before first paint
- Scroll-reveal animation, a kinetic headline, magnetic buttons, pointer-tracked card glow,
  animated counters, a section rail, and a scroll-progress bar
- Fully responsive, no horizontal scroll at any width, and every animation is disabled under
  `prefers-reduced-motion`. With scripting off, all content still renders.

## PhirumBot

Two engines, both local to the browser — nothing typed into the assistant is ever sent anywhere.

| Engine | What it does | Cost to the visitor |
| --- | --- | --- |
| **Instant** (default) | BM25-style retrieval over a hand-written profile knowledge base | Nothing to download; works offline |
| **Neural LLM** (opt-in) | A small open-weight model via [WebLLM](https://github.com/mlc-ai/web-llm) on WebGPU, grounded on the same retrieved passages | One 376 MB–945 MB model download, then cached by the browser |

Offered models are SmolLM2 360M, Llama 3.2 1B and Qwen 2.5 0.5B. If WebGPU is unavailable or the
model fails to start, the assistant says so plainly and falls back to Instant mode.

The bot's avatar is inline vector art drawn from Phirum's likeness — the glasses, hair and navy
jacket carry the resemblance, and the headset reads as "assistant". It is drawn rather than
filtered from the photograph so that it stays sharp and legible at 20px, where a posterised
photo turns to mud.

### Teaching it something new

Everything the assistant can say lives in [`assets/js/knowledge.js`](assets/js/knowledge.js).
Add an entry with a `title`, `tags`, `answer` (Markdown-lite) and optional `links`; the retrieval
index, the neural engine's grounding context, and the source chips all pick it up automatically.

## Layout

```
index.html                 markup, SVG sprite, and the generated bot avatar
assets/css/site.css        design tokens, both themes, layout, motion
assets/js/knowledge.js     the profile knowledge base — edit this to teach the bot
assets/js/site.js          theme, motion, scroll behaviour, GitHub grid, quick navigator
assets/js/assistant.js     retrieval engine, WebLLM engine, chat UI
profile-professional.webp  portrait used in the hero (1400w) and -1000.webp (1000w)
```

`assets/js/site.js` holds two lists worth knowing about: `EXCLUDED`, a pattern for repositories
kept off the site (coursework and this repository itself), and `FEATURED`/`TAGLINES`, which badge
the headline repositories and supply a description when GitHub has none.

**After editing any stylesheet or script, bump the `?v=` token** on the asset URLs in
`index.html` and on `ASSISTANT_SRC` in `assets/js/site.js`. GitHub Pages serves those files
with a ten-minute cache lifetime, so a returning visitor can otherwise keep running the old CSS
or JS well after the change went live — which looks exactly like the deploy having failed. Changing the token gives the browser a URL it has
never seen, so the new file is fetched the moment the new HTML arrives.

## Performance

The page is deliberately cheap to render, and a few things that look like style
choices are really budget choices. Undoing one will cost frame rate on a phone.

- **No animated blur.** The aurora behind the page is three drifting radial
  gradients. It used to sit under `filter: blur(70px)`, which meant the browser
  re-blurred a viewport-sized layer on every frame of a 34-second animation —
  by a wide margin the most expensive thing on the page. The gradients fade out
  on their own, so the blur only cost.
- **Decorative animation stops off screen.** The SVG diagrams and the marquee
  are declared `animation-play-state: paused` and released by an `.is-live`
  class that `site.js` toggles from an IntersectionObserver, so four cards'
  worth of dashes, pulses and orbits are not repainting below the fold.
- **Geometry is measured outside the scroll handler.** Reading `offsetTop`
  inside it — after the same frame had written classes and custom properties —
  forced a synchronous layout on every scrolled frame. `measure()` is the only
  place that reads layout, and it runs on resize and once the page settles.
- **The phone gets a lighter page.** Under 900px the paper grain, the header's
  backdrop blur and the aurora's animation all switch off. They are texture and
  polish on a desktop; on a phone they are a full-viewport composite per frame.
- **PhirumBot loads on demand.** `assistant.js` is fetched on the first request
  to open the assistant, and speculatively once the browser goes idle, so the
  engine costs nothing before first paint.
- **Fonts do not block the first paint.** The Google Fonts stylesheet is
  requested as `media="print"` and promoted on load, with a `<noscript>`
  fallback. The families ask only for the axis ranges the design uses.

Verified with Chromium under 4× CPU throttling at an iPhone viewport: layout
during scroll fell from 4.1 s to 0.45 s, main-thread blocking from 860 ms to
289 ms, and long tasks from 29 to 3.

## Local preview

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
