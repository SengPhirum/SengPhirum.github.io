# Phirum Seng — personal site

A fast, single-page personal profile at [sengphirum.github.io](https://sengphirum.github.io/),
built with semantic HTML, modern CSS, and vanilla JavaScript. No framework, no package install,
no build step.

## Highlights

- **Flagship section** for the three headline systems — [KNetraHub](https://sengphirum.github.io/KNetraHub/documentation),
  the [PLXY AI Call Center](https://sengphirum.github.io/PLXY_AICC/), and
  [DrowsyGuard MCU](https://sengphirum.github.io/PLXY_DrowsyGuard/) — each with an animated,
  hand-drawn SVG diagram of how it actually works
- **Live GitHub portfolio** — every public repository loaded from the GitHub API, grouped by
  focus area, with topic/language filters, search, sorting, and a grid/list toggle
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

The bot's avatar is generated from the real portrait at render time: `profile-professional.webp`
is cropped to the face, desaturated, posterised into six bands and remapped onto a blue duotone
ramp by an SVG filter, then dressed with a HUD visor, scanlines and an orbiting ring.

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
profile-professional.webp  portrait; also the source of the bot avatar
```

`assets/js/site.js` holds two lists worth knowing about: `EXCLUDED`, a pattern for repositories
kept off the site, and `FEATURED`/`TAGLINES`, which badge the flagship repositories and supply a
description when GitHub has none.

## Local preview

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
