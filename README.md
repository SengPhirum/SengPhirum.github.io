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
profile-professional.webp  hero portrait, with -600.webp and -1000.webp for smaller screens
```

`assets/js/site.js` holds two lists worth knowing about: `EXCLUDED`, a pattern for repositories
kept off the site (coursework and this repository itself), and `FEATURED`/`TAGLINES`, which badge
the headline repositories and supply a description when GitHub has none.

**After editing any stylesheet or script, bump the `?v=` token** on the asset URLs in
`index.html` and on `KNOWLEDGE_SRC` / `ASSISTANT_SRC` in `assets/js/site.js`. GitHub Pages serves those files
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
- **Nothing above the fold waits on JavaScript.** The hero used to sit at
  `opacity: 0` until the reveal observer ran, so the browser could not count
  its text as painted until `site.js` had downloaded and executed — Largest
  Contentful Paint landed there. The hero animates from the stylesheet instead
  and moves rather than fades, so it is paintable on the first frame. Keep any
  new above-the-fold element out of the observer-driven reveal.
- **PhirumBot and its knowledge base load on demand.** `knowledge.js` and
  `assistant.js` are ~50 KB serving the quick navigator and the assistant, both
  opened by hand. They are fetched on first use and speculatively once the
  browser goes idle, instead of competing for bandwidth while the hero paints.
  The navigator rebuilds its entries when the knowledge base arrives.
- **Images are cut to the box they are drawn in.** The portrait ships at 600w,
  1000w and 1400w with `sizes` matched to the measured slot, and the header
  avatar is 120px for a 40px mark rather than the 1000px original it was.
- **Fonts do not block the first paint.** The Google Fonts stylesheet is
  requested as `media="print"` and promoted on load, with a `<noscript>`
  fallback. The families ask only for the axis ranges the design uses.

Verified with Chromium under 4× CPU throttling: layout during scroll fell from
4.1 s to 0.45 s, main-thread blocking from 860 ms to 289 ms, and long tasks from
29 to 3. Under Lighthouse's mobile profile as well (slow 4G, 4× CPU, gzipped,
median of three runs), Largest Contentful Paint fell from 1940 ms to 800 ms and
the bytes fetched in the first two seconds from 89 KB to 67 KB.

Two things are deliberately *not* optimised. The stylesheet is still a
render-blocking request: inlining it would save roughly 400 ms of First
Contentful Paint, but the rules that would have to move — responsive and
reduced-motion — cover the hero and the rest of the page alike, and splitting
them wrong shows up as a layout shift in the viewport. And PageSpeed's "use
efficient cache lifetimes" cannot be satisfied here at all: GitHub Pages serves
every asset with a fixed ten-minute `max-age` and offers no way to configure
response headers. Only a custom domain behind a CDN would change it.

## Local preview

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
