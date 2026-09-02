/* ==========================================================================
   site.js — theme, motion, scroll behaviour, the GitHub project grid,
   and the Ctrl/⌘+K quick navigator.
   No framework, no build step. Every animation checks prefers-reduced-motion.
   ========================================================================== */
(function () {
  "use strict";

  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer  = window.matchMedia("(pointer: fine)");
  const calm = () => reduceMotion.matches;

  /* ---------------------------------------------------------------- theme */
  const THEME_KEY = "ps-theme";
  const root = document.documentElement;

  function readTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (_) { return null; }
  }
  function applyTheme(value) {
    if (value === "light" || value === "dark") root.setAttribute("data-theme", value);
    else root.removeAttribute("data-theme");
  }
  function currentTheme() {
    const set = root.getAttribute("data-theme");
    if (set === "light" || set === "dark") return set;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  applyTheme(readTheme());

  const themeToggle = $("#theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const next = currentTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
      themeToggle.setAttribute("aria-label", "Switch to " + (next === "dark" ? "light" : "dark") + " theme");
    });
  }

  /* ------------------------------------------------- scroll chrome + spy */
  const header    = $("#site-header");
  const progress  = $("#progress-bar");
  const toTop     = $("#to-top");
  const rail      = $("#section-rail");
  const sections  = $$("[data-section]");
  const navLinks  = $$("#nav-links .nav-link");

  if (rail && sections.length) {
    rail.innerHTML = sections.map(s =>
      `<button type="button" data-target="${s.id}" data-label="${s.dataset.section}" aria-label="Go to ${s.dataset.section}"></button>`
    ).join("");
    rail.addEventListener("click", event => {
      const button = event.target.closest("[data-target]");
      if (!button) return;
      const target = document.getElementById(button.dataset.target);
      if (target) target.scrollIntoView({ behavior: calm() ? "auto" : "smooth", block: "start" });
    });
  }
  const railDots = $$("button", rail || document.createElement("div"));

  /* Geometry is measured here and nowhere else. Reading offsetTop inside the
     scroll handler — after the same frame had already written classes and
     custom properties — forced the browser to redo layout on every single
     scrolled frame, which was the page's largest cost by a wide margin.
     These numbers only change when the viewport or the content does. */
  const portrait = $("#portrait");
  let sectionTops = [];
  let scrollMax = 0;
  let viewportH = window.innerHeight;

  function measure() {
    viewportH = window.innerHeight;
    scrollMax = document.documentElement.scrollHeight - viewportH;
    sectionTops = sections.map(s => s.offsetTop);
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;

      if (progress) progress.style.setProperty("--progress", scrollMax > 0 ? Math.min(y / scrollMax, 1).toFixed(4) : 0);
      if (header) header.classList.toggle("is-stuck", y > 12);
      if (toTop) toTop.classList.toggle("is-on", y > viewportH * 0.8);

      // Scroll spy — the section occupying the upper third of the viewport wins.
      const line = y + viewportH * 0.34;
      let active = sections[0];
      for (let i = 0; i < sections.length; i += 1) if (sectionTops[i] <= line) active = sections[i];
      if (active) {
        railDots.forEach(d => d.classList.toggle("is-active", d.dataset.target === active.id));
        navLinks.forEach(a => a.classList.toggle("is-active", a.getAttribute("href") === "#" + active.id));
      }

      // The reveal sweep is a safety net for targets the observer missed, so it
      // runs once the page settles rather than measuring every frame.
      scheduleSettleSweep();

      if (portrait && !calm()) portrait.style.setProperty("--parallax", Math.max(-26, Math.min(26, y * -0.045)).toFixed(2) + "px");

      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => { measure(); onScroll(); }, { passive: true });
  measure();
  onScroll();

  if (toTop) toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: calm() ? "auto" : "smooth" }));

  /* -------------------------------------------------------------- reveals */
  const pendingReveals = new Set();

  function reveal(node) {
    node.classList.add("is-in");
    pendingReveals.delete(node);
    if (revealObserver) revealObserver.unobserve(node);
  }

  const revealObserver = "IntersectionObserver" in window
    ? new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); });
      }, { rootMargin: "0px 0px -60px 0px", threshold: 0 })
    : null;

  function observeReveals(scope) {
    pendingReveals.forEach(node => {
      if (!node.isConnected) { pendingReveals.delete(node); revealObserver && revealObserver.unobserve(node); }
    });
    const targets = $$("[data-reveal]:not(.is-in)", scope);
    if (!revealObserver || calm()) { targets.forEach(t => t.classList.add("is-in")); return; }
    targets.forEach(t => { pendingReveals.add(t); revealObserver.observe(t); });
  }

  /* Safety net: the observer can miss a target during a fast programmatic
     scroll, and content must never be left at opacity 0. Anything that has
     reached the viewport is revealed on the next scroll frame regardless. */
  function sweepReveals() {
    if (!pendingReveals.size) return;
    const height = window.innerHeight;
    pendingReveals.forEach(node => {
      const box = node.getBoundingClientRect();
      if (box.top < height - 40 && box.bottom > 0) reveal(node);
    });
  }

  /* ...and once more shortly after scrolling stops, for the case where the
     page settles with a target in view and no further scroll event arrives. */
  let settleTimer = null;
  function scheduleSettleSweep() {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => { measure(); sweepReveals(); }, 260);
  }

  observeReveals(document);
  scheduleSettleSweep();

  /* Decorative animation runs only while it is on screen. The SVG diagrams
     and the marquee are declared paused in site.css and released by this
     class, so four cards' worth of dashes, pulses and orbits stop repainting
     the moment they scroll away. */
  const liveTargets = $$(".flagship-visual, .marquee");
  if ("IntersectionObserver" in window && liveTargets.length) {
    const liveObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle("is-live", entry.isIntersecting));
    }, { rootMargin: "120px 0px" });
    liveTargets.forEach(target => liveObserver.observe(target));
  } else {
    liveTargets.forEach(target => target.classList.add("is-live"));
  }

  /* ------------------------------------------------- kinetic headline */
  function wrapRise(node) {
    const shell = document.createElement("span");
    shell.className = "rise";
    const inner = document.createElement("span");
    inner.appendChild(node);
    shell.appendChild(inner);
    return shell;
  }
  $$("[data-rise]").forEach(el => {
    const pieces = [];
    Array.from(el.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/(\s+)/).forEach(token => {
          if (!token) return;
          pieces.push(token.trim() ? wrapRise(document.createTextNode(token)) : document.createTextNode(token));
        });
      } else {
        pieces.push(wrapRise(node.cloneNode(true)));
      }
    });
    el.replaceChildren.apply(el, pieces);
    const words = $$(".rise", el);
    words.forEach((w, i) => w.style.setProperty("--rise-delay", (i * 85) + "ms"));
    requestAnimationFrame(() => words.forEach(w => w.classList.add("is-in")));
  });

  /* ------------------------------------------------------------ counters */
  function runCounter(el) {
    const target = Number(el.dataset.count || 0);
    if (!Number.isFinite(target)) return;
    if (calm()) { el.textContent = target.toLocaleString(); return; }
    const duration = 1200;
    const start = performance.now();
    (function step(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased).toLocaleString();
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }
  const counterObserver = "IntersectionObserver" in window
    ? new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          runCounter(entry.target);
          obs.unobserve(entry.target);
        });
      }, { threshold: 0.4 })
    : null;
  function watchCounters(scope) {
    $$("[data-count]", scope).forEach(el => counterObserver ? counterObserver.observe(el) : runCounter(el));
  }
  watchCounters(document);

  /* ----------------------------------------------- magnetic + tilt + glow */
  if (finePointer.matches && !calm()) {
    document.body.classList.add("has-pointer");

    const spotlight = $(".spotlight");
    if (spotlight) {
      window.addEventListener("pointermove", event => {
        spotlight.style.setProperty("--x", event.clientX + "px");
        spotlight.style.setProperty("--y", event.clientY + "px");
      }, { passive: true });
    }

    /* Both effects below used to call getBoundingClientRect and write styles
       on every pointer event, so a single hover could force dozens of layouts
       a second. The box is now measured once when the pointer arrives and the
       style is written inside an animation frame. */
    $$(".is-magnetic").forEach(el => {
      let box = null, frame = 0, dx = 0, dy = 0;
      const write = () => { frame = 0; el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`; };
      el.addEventListener("pointerenter", () => { box = el.getBoundingClientRect(); }, { passive: true });
      el.addEventListener("pointermove", event => {
        if (!box) box = el.getBoundingClientRect();
        dx = (event.clientX - box.left - box.width / 2) * 0.22;
        dy = (event.clientY - box.top - box.height / 2) * 0.3;
        if (!frame) frame = requestAnimationFrame(write);
      }, { passive: true });
      el.addEventListener("pointerleave", () => {
        box = null;
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        el.style.transform = "";
      }, { passive: true });
    });

    $$(".is-tilt").forEach(el => {
      let box = null, frame = 0, mx = "50%", my = "50%";
      const write = () => { frame = 0; el.style.setProperty("--mx", mx); el.style.setProperty("--my", my); };
      el.addEventListener("pointerenter", () => { box = el.getBoundingClientRect(); }, { passive: true });
      el.addEventListener("pointermove", event => {
        if (!box) box = el.getBoundingClientRect();
        mx = (((event.clientX - box.left) / box.width) * 100).toFixed(1) + "%";
        my = (((event.clientY - box.top) / box.height) * 100).toFixed(1) + "%";
        if (!frame) frame = requestAnimationFrame(write);
      }, { passive: true });
      el.addEventListener("pointerleave", () => { box = null; }, { passive: true });
    });
  }

  /* ---------------------------------------------------------- copy email */
  const copyEmail = $("#copy-email");
  if (copyEmail) {
    copyEmail.addEventListener("click", async () => {
      const label = $("#copy-email-label");
      const address = copyEmail.dataset.email;
      try {
        await navigator.clipboard.writeText(address);
        label.textContent = "Copied ✓";
      } catch (_) {
        label.textContent = address;
      }
      setTimeout(() => { label.textContent = "Copy email"; }, 2200);
    });
  }

  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* PhirumBot's engine is ~21 KB that most visitors never open, so it is no
     longer part of the initial page load. It is fetched on the first request
     to open it, and speculatively once the browser goes idle, so a click
     still feels instant without costing anything before first paint.
     assistant.js binds itself to the "assistant:open" event on init, which is
     why the event is dispatched after the script resolves. */
  const ASSISTANT_SRC = "./assets/js/assistant.js?v=20260829b";
  let assistantLoad = null;

  function loadAssistant() {
    if (!assistantLoad) {
      assistantLoad = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = ASSISTANT_SRC;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    return assistantLoad;
  }

  function openAssistant() {
    loadAssistant()
      .then(() => document.dispatchEvent(new CustomEvent("assistant:open")))
      .catch(() => { assistantLoad = null; });
  }

  $$("[data-open-assistant]").forEach(button => button.addEventListener("click", openAssistant));
  const launcher = $("#assistant-launcher");
  if (launcher) launcher.addEventListener("click", openAssistant);

  const whenIdle = window.requestIdleCallback || (fn => setTimeout(fn, 1));
  setTimeout(() => whenIdle(() => loadAssistant().catch(() => { assistantLoad = null; })), 2500);

  /* ==========================================================================
     GitHub project grid
     ========================================================================== */
  const GITHUB_USER = "SengPhirum";

  /* Coursework repositories and this site's own repository are intentionally
     not part of the portfolio. */
  const EXCLUDED = /^mite19|^sengphirum\.github\.io$/i;

  /* Only repositories labelled "Flagship" join the Flagship systems group;
     the rest keep their badge but are classified by focus area like any
     other repository. */
  const FEATURED = {
    knetrahub:         { label: "Flagship", docs: "https://sengphirum.github.io/KNetraHub/documentation" },
    plxy_aicc:         { label: "Flagship", docs: "https://sengphirum.github.io/PLXY_AICC/" },
    plxy_drowsyguard:  { label: "IoT concept", docs: "https://sengphirum.github.io/PLXY_DrowsyGuard/" },
    /* Private source; listed so the badge and docs link apply if it is ever
       made public. Until then the headline card is its home on this page. */
    plxy_claudemonitor: { label: "Studio tool", docs: "https://sengphirum.github.io/PLXY_ClaudeMonitor/" }
  };

  /* Used only when a repository carries no GitHub description of its own.
     Each line is the project's own README tagline, not a guess. */
  const TAGLINES = {
    knetrahub:         "Khmer Netra Hub — a portal for everything in your infrastructure, one hub at a time.",
    plxy_aicc:         "Enterprise AI call centre between the Cambodia Telco SIP trunk and the 3CX PBX agent pool.",
    plxy_drowsyguard:  "Low-cost, camera-based driver drowsiness detection for retrofit into older vehicles.",
    plxy_claudemonitor: "Windows desktop application for Claude organization owners — adoption monitoring, Weighted Usage Index, low-usage alerts and management reports from official Anthropic APIs."
  };

  const GROUP_ORDER = [
    "Flagship systems",
    "AI & Computer Vision",
    "Infrastructure & Security",
    "Data & Analytics",
    "Web & Mobile",
    "Experiments & Other"
  ];

  const state = { repositories: [], activeTag: "All", query: "", sort: "updated", view: "grid" };

  const escapeHTML = (value) => String(value == null ? "" : value).replace(/[&<>'"]/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]
  ));
  const formatDate = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(date);
  };

  function getGroup(repo) {
    const featured = FEATURED[repo.name.toLowerCase()];
    if (featured && featured.label === "Flagship") return "Flagship systems";
    const text = [repo.name, repo.description, (repo.topics || []).join(" "), repo.language].filter(Boolean).join(" ").toLowerCase();
    if (/(knetraai|khmerai|aicc|prompt|\bllm\b|\bai\b|artificial|vision|image|caption|\bgan\b|drows|machine learning|deep learning|opencv|pytorch|tensorflow|jupyter)/.test(text)) return "AI & Computer Vision";
    if (/(docker|swarm|server|infra|auth|authentik|security|network|wifi|cloud|devops|shortcut|shell|kubernetes)/.test(text)) return "Infrastructure & Security";
    if (/(data|analytics|prediction|mapping|database|\bsql\b|spark|pandas)/.test(text)) return "Data & Analytics";
    if (/(web|app|react|vue|angular|nuxt|javascript|typescript|html|css|php|laravel|website|flutter|dart|kotlin|swift|mmo)/.test(text)) return "Web & Mobile";
    return "Experiments & Other";
  }

  /* Chips on a card describe what the project is made of. The focus area is
     already the group heading directly above, so it is not repeated here. */
  function getTags(repo) {
    return Array.from(new Set((repo.topics || []).concat(repo.language ? [repo.language] : []).filter(Boolean)));
  }

  async function fetchAllRepositories() {
    const all = [];
    for (let page = 1; page <= 10; page += 1) {
      const url = `https://api.github.com/users/${GITHUB_USER}/repos?type=owner&sort=updated&direction=desc&per_page=100&page=${page}`;
      const response = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
      if (!response.ok) throw new Error("GitHub returned " + response.status);
      const batch = await response.json();
      if (!Array.isArray(batch)) throw new Error("Unexpected GitHub response");
      all.push.apply(all, batch);
      if (batch.length < 100) break;
    }
    return all.filter(repo => !repo.private && !repo.fork && !EXCLUDED.test(repo.name));
  }

  /* The filter row is the focus-area taxonomy — what a project is *for* —
     shown in taxonomy order rather than by count. Languages are visible on
     each card and searchable, but they are not categories. */
  function buildFilters() {
    const host = $("#tag-filters");
    if (!host) return;
    const counts = new Map();
    state.repositories.forEach(repo => {
      const group = getGroup(repo);
      counts.set(group, (counts.get(group) || 0) + 1);
    });
    const ordered = GROUP_ORDER.filter(group => counts.has(group))
      .concat(Array.from(counts.keys()).filter(group => GROUP_ORDER.indexOf(group) === -1).sort());
    host.innerHTML = [["All", state.repositories.length]]
      .concat(ordered.map(group => [group, counts.get(group)]))
      .map(([tag, count]) =>
        `<button class="filter${tag === state.activeTag ? " is-active" : ""}" type="button" data-tag="${escapeHTML(tag)}" aria-pressed="${tag === state.activeTag}">${escapeHTML(tag)} <b>${count}</b></button>`
      ).join("");
  }

  function cardTemplate(repo) {
    const key = repo.name.toLowerCase();
    const featured = FEATURED[key];
    const tags = getTags(repo);
    // Rather than repeat boilerplate on every undescribed repository, show
    // nothing at all and let the tags and metadata speak.
    const description = repo.description || TAGLINES[key] || "";
    const homepage = (featured && featured.docs) || repo.homepage || "";
    return `<a class="repo-card" href="${escapeHTML(repo.html_url)}" target="_blank" rel="noopener noreferrer">
      <div class="repo-body">
        <div class="repo-card-top">
          <h4>${escapeHTML(repo.name)}</h4>
          <svg class="repo-arrow" width="18" height="18" aria-hidden="true"><use href="#i-arrow-out"/></svg>
        </div>
        ${description ? `<p class="repo-description">${escapeHTML(description)}</p>` : ""}
        ${tags.length ? `<div class="repo-tags">${tags.slice(0, 4).map(t => `<span class="repo-tag">${escapeHTML(t)}</span>`).join("")}</div>` : ""}
      </div>
      <div class="repo-meta">
        <span>${repo.language ? `<i class="language-dot" aria-hidden="true"></i>${escapeHTML(repo.language)}` : "Code"}</span>
        <span class="repo-star">★ ${repo.stargazers_count}</span>
        <span>${formatDate(repo.pushed_at || repo.updated_at)}</span>
        ${featured ? `<span class="featured-flag"><svg width="10" height="10" aria-hidden="true"><use href="#i-spark"/></svg>${escapeHTML(featured.label)}</span>` : ""}
        ${homepage ? `<span class="featured-flag">docs</span>` : ""}
      </div>
    </a>`;
  }

  function visibleRepositories() {
    const needle = state.query.trim().toLowerCase();
    const list = state.repositories.filter(repo => {
      const group = getGroup(repo);
      if (state.activeTag !== "All" && group !== state.activeTag) return false;
      if (!needle) return true;
      return [repo.name, repo.description, group]
        .concat(getTags(repo))
        .filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
    list.sort((a, b) => {
      if (state.sort === "stars") return b.stargazers_count - a.stargazers_count || new Date(b.pushed_at) - new Date(a.pushed_at);
      if (state.sort === "name") return a.name.localeCompare(b.name);
      return new Date(b.pushed_at || b.updated_at) - new Date(a.pushed_at || a.updated_at);
    });
    return list;
  }

  function renderRepositories() {
    const container = $("#repo-content");
    if (!container) return;
    const repos = visibleRepositories();
    container.setAttribute("aria-busy", "false");
    if (!repos.length) {
      container.innerHTML = `<div class="empty-message">No projects match that filter. Try another tag or search term.</div>`;
      return;
    }
    const grouped = repos.reduce((acc, repo) => {
      const key = getGroup(repo);
      (acc[key] = acc[key] || []).push(repo);
      return acc;
    }, {});
    const known = GROUP_ORDER.filter(g => grouped[g] && grouped[g].length);
    const extra = Object.keys(grouped).filter(g => GROUP_ORDER.indexOf(g) === -1);
    container.innerHTML = known.concat(extra).map(group => `
      <section class="repo-group" data-reveal>
        <div class="group-head"><h3>${escapeHTML(group)}</h3><span class="group-count">${grouped[group].length}</span></div>
        <div class="repo-grid${state.view === "list" ? " is-list" : ""}">${grouped[group].map(cardTemplate).join("")}</div>
      </section>`).join("");
    observeReveals(container);
    scheduleSettleSweep();
  }

  function setStat(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.dataset.count = String(value);
    if (counterObserver) counterObserver.observe(el); else runCounter(el);
  }

  async function initRepositories() {
    const container = $("#repo-content");
    try {
      state.repositories = await fetchAllRepositories();
      buildFilters();
      renderRepositories();
      const stars = state.repositories.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
      const languages = new Set(state.repositories.map(r => r.language).filter(Boolean)).size;
      setStat("repo-count", state.repositories.length);
      setStat("star-count", stars);
      setStat("language-count", languages);
      setStat("proof-repos", state.repositories.length);
      registerRepoCommands(state.repositories);
    } catch (error) {
      if (container) {
        container.setAttribute("aria-busy", "false");
        container.innerHTML = `<div class="repo-status"><div>
          GitHub projects could not be loaded right now.<br>
          <a href="https://github.com/${GITHUB_USER}?tab=repositories" target="_blank" rel="noopener noreferrer">View all repositories on GitHub ↗</a>
        </div></div>`;
      }
      ["repo-count", "star-count", "language-count", "proof-repos"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = "—";
      });
    }
  }

  const tagHost = $("#tag-filters");
  if (tagHost) {
    tagHost.addEventListener("click", event => {
      const button = event.target.closest("[data-tag]");
      if (!button) return;
      state.activeTag = button.dataset.tag;
      buildFilters();
      renderRepositories();
    });
  }
  const searchInput = $("#repo-search");
  if (searchInput) searchInput.addEventListener("input", e => { state.query = e.target.value; renderRepositories(); });
  const sortSelect = $("#repo-sort");
  if (sortSelect) sortSelect.addEventListener("change", e => { state.sort = e.target.value; renderRepositories(); });
  $$(".view-toggle button").forEach(button => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      $$(".view-toggle button").forEach(b => {
        const on = b === button;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });
      renderRepositories();
    });
  });

  initRepositories();

  /* ==========================================================================
     Quick navigator (Ctrl / ⌘ + K)
     ========================================================================== */
  const paletteEl      = $("#palette");
  const paletteInput   = $("#palette-input");
  const paletteResults = $("#palette-results");
  const isMac = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
  const kbd = $("#palette-kbd");
  if (kbd) kbd.textContent = isMac ? "⌘ K" : "Ctrl K";

  let commands = [];
  let cursor = 0;
  let lastFocused = null;

  function icon(name) { return `<span class="pi-icon"><svg aria-hidden="true"><use href="#i-${name}"/></svg></span>`; }

  function baseCommands() {
    const list = [
      { group: "Sections", title: "Home",     hint: "Top of the page",             icon: "arrow-up", run: () => goTo("#top") },
      { group: "Sections", title: "About",    hint: "Approach and principles",     icon: "corner",   run: () => goTo("#about") },
      { group: "Sections", title: "Flagship", hint: "The headline systems",        icon: "spark",    run: () => goTo("#flagship") },
      { group: "Sections", title: "Projects", hint: "Every public repository",     icon: "grid",     run: () => goTo("#work") },
      { group: "Sections", title: "Contact",  hint: "Start a conversation",        icon: "mail",     run: () => goTo("#contact") }
    ];

    (window.PHIRUM ? window.PHIRUM.projects : []).forEach(project => {
      list.push({
        group: "Headline work", title: project.name, hint: project.kind, icon: "spark",
        keywords: project.repo + " " + project.stack.join(" "),
        run: () => goTo(project.anchor)
      });
      list.push({
        group: "Headline work", title: project.name + " — documentation", hint: project.docs.replace(/^https?:\/\//, ""), icon: "book",
        keywords: "docs documentation " + project.repo,
        run: () => window.open(project.docs, "_blank", "noopener")
      });
    });

    list.push(
      { group: "Actions", title: "Ask PhirumBot", hint: "In-browser AI assistant", icon: "spark", keywords: "chat ai bot llm assistant",
        run: openAssistant },
      { group: "Actions", title: "Toggle theme", hint: "Light and dark", icon: "moon", keywords: "dark light appearance colour color",
        run: () => themeToggle && themeToggle.click() },
      { group: "Actions", title: "Copy email address", hint: "sengphirum143@gmail.com", icon: "copy", keywords: "mail contact address",
        run: () => { if (copyEmail) { goTo("#contact"); copyEmail.click(); } } },
      { group: "Actions", title: "Email Phirum", hint: "sengphirum143@gmail.com", icon: "mail", keywords: "contact hire write",
        run: () => { window.location.href = "mailto:sengphirum143@gmail.com"; } },
      { group: "Elsewhere", title: "GitHub", hint: "github.com/SengPhirum", icon: "github", keywords: "code repositories source",
        run: () => window.open("https://github.com/SengPhirum", "_blank", "noopener") },
      { group: "Elsewhere", title: "LinkedIn", hint: "linkedin.com/in/phirum-seng", icon: "linkedin", keywords: "profile network",
        run: () => window.open("https://www.linkedin.com/in/phirum-seng/", "_blank", "noopener") }
    );
    return list;
  }

  function goTo(hash) {
    const target = document.querySelector(hash);
    if (target) target.scrollIntoView({ behavior: calm() ? "auto" : "smooth", block: "start" });
  }

  commands = baseCommands();

  function registerRepoCommands(repositories) {
    const featuredRepos = new Set((window.PHIRUM ? window.PHIRUM.projects : []).map(p => p.repo.toLowerCase()));
    const repoCommands = repositories
      .filter(repo => !featuredRepos.has(repo.name.toLowerCase()))
      .map(repo => ({
        group: "Repositories",
        title: repo.name,
        hint: repo.description || (repo.language ? repo.language + " repository" : "Public repository"),
        icon: "github",
        keywords: [repo.language, (repo.topics || []).join(" ")].filter(Boolean).join(" "),
        run: () => window.open(repo.html_url, "_blank", "noopener")
      }));
    commands = baseCommands().concat(repoCommands);
    if (paletteEl && paletteEl.classList.contains("is-open")) renderPalette();
  }

  function scoreCommand(command, needle) {
    if (!needle) return 1;
    const title = command.title.toLowerCase();
    const haystack = (command.title + " " + (command.hint || "") + " " + (command.keywords || "") + " " + command.group).toLowerCase();
    if (title.startsWith(needle)) return 100;
    if (title.includes(needle)) return 60;
    if (haystack.includes(needle)) return 25;
    // Loose subsequence match, so "knh" still finds "KNetraHub".
    let i = 0;
    for (const ch of title) { if (ch === needle[i]) i += 1; if (i === needle.length) return 10; }
    return 0;
  }

  function renderPalette() {
    if (!paletteResults) return;
    const needle = (paletteInput.value || "").trim().toLowerCase();
    const matches = commands
      .map(command => ({ command, score: scoreCommand(command, needle) }))
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 40)
      .map(entry => entry.command);

    if (!matches.length) {
      paletteResults.innerHTML = `<p class="palette-empty">Nothing matches “${escapeHTML(paletteInput.value)}”.</p>`;
      cursor = 0;
      return;
    }
    cursor = Math.min(cursor, matches.length - 1);
    paletteResults.dataset.count = String(matches.length);

    let html = "";
    let group = null;
    matches.forEach((command, index) => {
      if (command.group !== group) {
        group = command.group;
        html += `<p class="palette-group-label">${escapeHTML(group)}</p>`;
      }
      html += `<button class="palette-item${index === cursor ? " is-cursor" : ""}" type="button" data-index="${index}">
        ${icon(command.icon || "corner")}
        <span class="pi-text"><b>${escapeHTML(command.title)}</b><span>${escapeHTML(command.hint || "")}</span></span>
        <span class="pi-hint">↵</span>
      </button>`;
    });
    paletteResults.innerHTML = html;
    paletteResults._matches = matches;
  }

  function openPalette() {
    if (!paletteEl) return;
    lastFocused = document.activeElement;
    paletteEl.hidden = false;
    requestAnimationFrame(() => paletteEl.classList.add("is-open"));
    paletteInput.value = "";
    cursor = 0;
    renderPalette();
    paletteInput.focus();
  }
  function closePalette() {
    if (!paletteEl) return;
    paletteEl.classList.remove("is-open");
    setTimeout(() => { paletteEl.hidden = true; }, 250);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }
  function runCursor() {
    const matches = paletteResults._matches || [];
    const command = matches[cursor];
    if (!command) return;
    closePalette();
    setTimeout(() => command.run(), 60);
  }
  function moveCursor(delta) {
    const matches = paletteResults._matches || [];
    if (!matches.length) return;
    cursor = (cursor + delta + matches.length) % matches.length;
    renderPalette();
    const active = $(".palette-item.is-cursor", paletteResults);
    if (active) active.scrollIntoView({ block: "nearest" });
  }

  const paletteOpenButton = $("#palette-open");
  if (paletteOpenButton) paletteOpenButton.addEventListener("click", openPalette);
  const paletteCloseButton = $("#palette-close");
  if (paletteCloseButton) paletteCloseButton.addEventListener("click", closePalette);
  if (paletteEl) {
    paletteEl.addEventListener("click", event => { if (event.target === paletteEl) closePalette(); });
    paletteInput.addEventListener("input", () => { cursor = 0; renderPalette(); });
    paletteResults.addEventListener("click", event => {
      const item = event.target.closest("[data-index]");
      if (!item) return;
      cursor = Number(item.dataset.index);
      runCursor();
    });
    paletteEl.addEventListener("keydown", event => {
      if (event.key === "ArrowDown") { event.preventDefault(); moveCursor(1); }
      else if (event.key === "ArrowUp") { event.preventDefault(); moveCursor(-1); }
      else if (event.key === "Enter") { event.preventDefault(); runCursor(); }
      else if (event.key === "Escape") { event.preventDefault(); closePalette(); }
    });
  }

  document.addEventListener("keydown", event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (paletteEl && paletteEl.classList.contains("is-open")) closePalette(); else openPalette();
    }
  });

  /* Expose a small hook so the assistant can reuse navigation. */
  window.PS_SITE = { goTo: goTo, escapeHTML: escapeHTML, calm: calm };
})();
