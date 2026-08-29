/* ==========================================================================
   assistant.js — PhirumBot.

   Two engines, both running entirely in the visitor's browser:

   1. Instant  — a BM25-style retrieval engine over the hand-written knowledge
                 base in knowledge.js. No download, no network, works offline.
   2. Neural   — an opt-in small open-weight LLM (SmolLM2 360M / Llama 3.2 1B /
                 Qwen2.5 0.5B) loaded through WebLLM and executed on WebGPU,
                 grounded on the same retrieved passages.

   Nothing typed here is ever sent to a server.
   ========================================================================== */
(function () {
  "use strict";

  const KB = window.PHIRUM;
  if (!KB) return;

  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const el = {
    launcher:    $("#assistant-launcher"),
    panel:       $("#assistant-panel"),
    close:       $("#assistant-close"),
    reset:       $("#assistant-reset"),
    log:         $("#assistant-log"),
    form:        $("#assistant-form"),
    input:       $("#assistant-input"),
    send:        $("#assistant-send"),
    suggestions: $("#assistant-suggestions"),
    state:       $("#assistant-state"),
    engineTabs:  $$(".engine-tabs button"),
    engineNote:  $("#engine-note"),
    neural:      $("#neural-controls"),
    modelSelect: $("#model-select"),
    modelLoad:   $("#model-load"),
    progress:    $("#engine-progress"),
    status:      $("#engine-status")
  };
  if (!el.panel || !el.log) return;

  /* ======================================================== tiny markdown */
  const escapeHTML = value => String(value == null ? "" : value)
    .replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));

  function inlineMd(text) {
    return escapeHTML(text)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/g,
               '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  function renderMd(text) {
    return String(text).trim().split(/\n{2,}/).map(block => {
      const lines = block.split("\n").filter(Boolean);
      if (lines.length && lines.every(line => /^\s*[-*•]\s+/.test(line))) {
        return "<ul>" + lines.map(line => "<li>" + inlineMd(line.replace(/^\s*[-*•]\s+/, "")) + "</li>").join("") + "</ul>";
      }
      return "<p>" + inlineMd(block.replace(/\n/g, " ")) + "</p>";
    }).join("");
  }

  /* ====================================================== retrieval index */
  const STOP = new Set(("a an and are as at be but by can could did do does for from had has have he her him his how i if in into is it its me my of on or our she should so tell that the their them then there these they this to too us was we were what when where which who whom whose why will with would you your about me please give show know like want more much any" ).split(" "));

  function tokenize(text) {
    return String(text)
      .toLowerCase()
      .replace(/[^a-z0-9+#]+/g, " ")
      .split(/\s+/)
      .filter(word => word.length > 1 && !STOP.has(word));
  }

  const docs = KB.entries.map(entry => {
    const tf = new Map();
    const add = (tokens, weight) => tokens.forEach(t => tf.set(t, (tf.get(t) || 0) + weight));
    const titleTokens = tokenize(entry.title);
    const bodyTokens = tokenize(entry.answer);
    add(titleTokens, 3);
    add(bodyTokens, 1);
    // A multi-word tag splits its weight across its tokens, so a generic phrase
    // like "call center" cannot outscore a precise single-word tag like "qa".
    let tagCount = 0;
    entry.tags.forEach(tag => {
      const tokens = tokenize(tag);
      if (!tokens.length) return;
      tagCount += tokens.length;
      add(tokens, 5.5 / Math.sqrt(tokens.length));
    });
    return { entry: entry, tf: tf, len: titleTokens.length + tagCount + bodyTokens.length };
  });

  const df = new Map();
  docs.forEach(doc => new Set(doc.tf.keys()).forEach(t => df.set(t, (df.get(t) || 0) + 1)));
  const N = docs.length;
  const avgLen = docs.reduce((sum, d) => sum + d.len, 0) / Math.max(N, 1);
  const idf = term => Math.log(1 + (N - (df.get(term) || 0) + 0.5) / ((df.get(term) || 0) + 0.5));

  function termWeight(doc, term) {
    if (doc.tf.has(term)) return doc.tf.get(term);
    if (term.length < 4) return 0;
    let best = 0;
    doc.tf.forEach((weight, token) => {
      if (token.startsWith(term) || term.startsWith(token)) best = Math.max(best, weight * 0.65);
    });
    return best;
  }

  function retrieve(query, limit) {
    const terms = tokenize(query);
    if (!terms.length) return [];
    const k1 = 1.4;
    const scored = docs.map(doc => {
      let score = 0;
      terms.forEach(term => {
        const weight = termWeight(doc, term);
        if (!weight) return;
        // idf is raised superlinearly: a rare, specific term ("limitations")
        // should outrank two common ones ("call", "center").
        const rarity = Math.pow(idf(term), 1.6);
        score += rarity * (weight * (k1 + 1)) / (weight + k1 * (0.4 + 0.6 * doc.len / avgLen));
      });
      return { entry: doc.entry, score: score / Math.sqrt(terms.length) };
    });
    return scored.filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, limit || 3);
  }

  const ANCHORS = { knetra: "#p-knetrahub", aicc: "#p-aicc", dg: "#p-drowsyguard" };
  function anchorFor(entry) {
    const key = Object.keys(ANCHORS).find(prefix => entry.id.indexOf(prefix) === 0);
    return key ? ANCHORS[key] : null;
  }

  /* ==================================================== the instant engine */
  const SMALL_TALK = [
    { test: /(\bwho\s+(are|r)\s+(you|u)\b|\bwhat\s+are\s+you\b|\byour\s+name\b|\bare\s+you\s+(a\s+)?(bot|robot|human|real|ai)\b)/i,
      entryId: "assistant" },
    { test: /^\s*(hi|hey|hello|yo|howdy|greetings|good\s+(morning|afternoon|evening))\b/i,
      reply: () => KB.greeting },
    { test: /\b(thanks|thank you|thx|cheers|appreciate it)\b/i,
      reply: () => "Any time. Ask me anything else about Phirum's work — or press **Ctrl + K** to jump straight to a section of the page." },
    { test: /\b(bye|goodbye|see you|cya|good night)\b/i,
      reply: () => "Thanks for stopping by. If something here is useful, **sengphirum143@gmail.com** is the fastest way to reach Phirum." },
    { test: /\b(what can you do|how can you help|help me|what do you know)\b/i,
      reply: () => "I know Phirum's profile and his headline projects in detail. Try:\n\n- What is KNetraHub, and what apps does it ship?\n- How does DrowsyGuard measure drowsiness?\n- What are the QA numbers for the AI Call Center?\n- What does the Claude Usage Monitor do?\n- What is the stack behind all of this?\n- How do I get in touch?" }
  ];

  function entryById(id) { return KB.entries.find(e => e.id === id); }

  function instantAnswer(question) {
    for (const rule of SMALL_TALK) {
      if (!rule.test.test(question)) continue;
      if (rule.entryId) {
        const entry = entryById(rule.entryId);
        if (entry) return { text: entry.answer, sources: entry.links || [], entries: [entry] };
      }
      if (rule.reply) return { text: rule.reply(), sources: [], entries: [] };
    }
    const results = retrieve(question, 3);
    const best = results[0];
    if (!best || best.score < 0.8) {
      return { text: KB.fallback, sources: [], entries: [] };
    }
    let text = best.entry.answer;
    const related = results.slice(1).filter(r => r.score > best.score * 0.42).map(r => r.entry.title);
    if (related.length) {
      text += "\n\nRelated: " + related.map(t => "**" + t + "**").join(" · ") + " — ask and I will go deeper.";
    }
    return { text: text, sources: best.entry.links || [], entries: [best.entry] };
  }

  /* ================================================= the neural (LLM) engine */
  const WEBLLM_URL = "https://esm.run/@mlc-ai/web-llm@0.2.84";
  const MODELS = [
    { id: "SmolLM2-360M-Instruct-q4f16_1-MLC", label: "SmolLM2 360M — ~376 MB (fastest)" },
    { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 1B — ~879 MB (best answers)" },
    { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 0.5B — ~945 MB" }
  ];

  const neural = { engine: null, modelId: null, loading: false, ready: false, webllm: null };

  if (el.modelSelect) {
    el.modelSelect.innerHTML = MODELS.map(m => `<option value="${escapeHTML(m.id)}">${escapeHTML(m.label)}</option>`).join("");
  }

  function setProgress(fraction, message) {
    if (el.progress) {
      el.progress.hidden = fraction == null;
      if (fraction != null) el.progress.firstElementChild.style.setProperty("--p", Math.max(0, Math.min(1, fraction)).toFixed(3));
    }
    if (el.status) {
      el.status.hidden = !message;
      el.status.textContent = message || "";
    }
  }

  function webgpuAvailable() { return typeof navigator !== "undefined" && "gpu" in navigator; }

  async function webgpuUsable() {
    if (!webgpuAvailable()) return false;
    try { return !!(await navigator.gpu.requestAdapter()); } catch (_) { return false; }
  }

  async function loadNeural(modelId) {
    if (neural.loading) return;
    if (!(await webgpuUsable())) {
      setProgress(null, "");
      pushBot("No usable **WebGPU** adapter is available in this browser, so a local model cannot run here. Instant mode still answers everything from the knowledge base — try a recent Chrome, Edge or Safari on hardware with a GPU for the neural engine.", []);
      setEngine("instant");
      return;
    }
    neural.loading = true;
    neural.ready = false;
    if (el.modelLoad) { el.modelLoad.disabled = true; el.modelLoad.textContent = "Loading…"; }
    setProgress(0, "Fetching the model — this is a one-off download, then your browser caches it.");
    try {
      if (!neural.webllm) neural.webllm = await import(/* webpackIgnore: true */ WEBLLM_URL);
      if (neural.engine && neural.modelId !== modelId) {
        try { await neural.engine.unload(); } catch (_) {}
        neural.engine = null;
      }
      if (!neural.engine) {
        neural.engine = await neural.webllm.CreateMLCEngine(modelId, {
          initProgressCallback: report => {
            const fraction = typeof report.progress === "number" ? report.progress : null;
            setProgress(fraction, report.text || "Preparing…");
          }
        });
      }
      neural.modelId = modelId;
      neural.ready = true;
      setProgress(1, "Model ready — running locally on your GPU.");
      setTimeout(() => setProgress(null, "Model ready — running locally on your GPU."), 400);
      updateState();
    } catch (error) {
      neural.ready = false;
      setProgress(null, "");
      pushBot("The local model could not start (" + escapeHTML(String(error && error.message || error)) + "). Instant mode is still answering from the knowledge base.", []);
      setEngine("instant");
    } finally {
      neural.loading = false;
      if (el.modelLoad) { el.modelLoad.disabled = false; el.modelLoad.textContent = neural.ready ? "Reload model" : "Load model"; }
    }
  }

  const CONTEXT_CHARS = 900;

  function buildContext(question) {
    const results = retrieve(question, 2);
    const chosen = results.length ? results : [{ entry: KB.entries[0] }];
    return chosen.map(r => {
      let body = r.entry.answer.replace(/\*\*/g, "").replace(/`/g, "");
      if (body.length > CONTEXT_CHARS) body = body.slice(0, CONTEXT_CHARS).replace(/\s+\S*$/, "") + "…";
      return "### " + r.entry.title + "\n" + body;
    }).join("\n\n");
  }

  function systemPrompt(question) {
    return [
      "You are PhirumBot, the assistant on Phirum Seng's portfolio website.",
      "Answer using ONLY the CONTEXT below. Never invent facts, numbers, dates or links.",
      "If the CONTEXT does not answer the question, say so briefly and suggest asking about KNetraHub, the PLXY AI Call Center, DrowsyGuard MCU, or how to contact Phirum.",
      "Reply in 2 to 4 short sentences of plain prose. Do not use headings. Do not repeat the question.",
      "",
      "CONTEXT:",
      buildContext(question)
    ].join("\n");
  }

  async function neuralAnswer(question, bubble) {
    const history = transcript
      .slice(0, -1)
      .slice(-4)
      .map(m => ({ role: m.role === "bot" ? "assistant" : "user", content: m.text }));
    const messages = [{ role: "system", content: systemPrompt(question) }]
      .concat(history)
      .concat([{ role: "user", content: question }]);

    const stream = await neural.engine.chat.completions.create({
      messages: messages,
      stream: true,
      temperature: 0.35,
      top_p: 0.9,
      max_tokens: 320
    });

    let text = "";
    for await (const chunk of stream) {
      const delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content;
      if (!delta) continue;
      text += delta;
      bubble.innerHTML = renderMd(text);
      scrollLog();
    }
    return text.trim();
  }

  /* ============================================================ transcript */
  const STORE_KEY = "ps-chat";
  let transcript = [];

  function saveTranscript() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(transcript.slice(-24))); } catch (_) {}
  }
  function loadTranscript() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  function scrollLog() { el.log.scrollTop = el.log.scrollHeight; }

  function sourceRow(sources, entries) {
    const chips = (sources || []).map(link =>
      `<a href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(link.label)} ↗</a>`
    );
    (entries || []).forEach(entry => {
      const anchor = anchorFor(entry);
      if (anchor) chips.unshift(`<a href="${anchor}" data-jump="${anchor}">Show on this page</a>`);
    });
    return chips.length ? `<div class="msg-sources">${chips.join("")}</div>` : "";
  }

  function appendMessage(role, html, meta) {
    const wrapper = document.createElement("div");
    wrapper.className = "msg " + role;
    const avatar = role === "bot"
      ? '<svg class="bot-avatar" viewBox="0 0 100 100" aria-hidden="true"><use href="#bot-avatar"/></svg>'
      : "";
    wrapper.innerHTML = avatar + '<div class="msg-bubble">' + html + (meta || "") + "</div>";
    el.log.appendChild(wrapper);
    scrollLog();
    return $(".msg-bubble", wrapper);
  }

  function pushBot(text, sources, entries, persist) {
    appendMessage("bot", renderMd(text), sourceRow(sources, entries));
    if (persist !== false) {
      transcript.push({ role: "bot", text: text, sources: sources || [], entryIds: (entries || []).map(e => e.id) });
      saveTranscript();
    }
  }

  function replayTranscript() {
    el.log.innerHTML = "";
    if (!transcript.length) {
      appendMessage("bot", renderMd(KB.greeting), "");
      return;
    }
    transcript.forEach(message => {
      if (message.role === "user") appendMessage("user", renderMd(message.text), "");
      else {
        const entries = (message.entryIds || []).map(id => KB.entries.find(e => e.id === id)).filter(Boolean);
        appendMessage("bot", renderMd(message.text), sourceRow(message.sources, entries));
      }
    });
  }

  /* ============================================================== the turn */
  let busy = false;

  async function ask(question) {
    const clean = String(question || "").trim();
    if (!clean || busy) return;
    busy = true;
    if (el.send) el.send.disabled = true;

    appendMessage("user", renderMd(clean), "");
    transcript.push({ role: "user", text: clean });
    saveTranscript();

    const thinking = appendMessage("bot", '<span class="typing"><i></i><i></i><i></i></span>', "");

    const retrieved = retrieve(clean, 1);
    const grounding = retrieved.length && retrieved[0].score >= 0.8 ? [retrieved[0].entry] : [];

    try {
      if (engineMode === "neural" && neural.ready) {
        thinking.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
        let text = await neuralAnswer(clean, thinking);
        if (!text) text = instantAnswer(clean).text;
        const sources = grounding.length ? (grounding[0].links || []) : [];
        thinking.innerHTML = renderMd(text) + sourceRow(sources, grounding);
        transcript.push({ role: "bot", text: text, sources: sources, entryIds: grounding.map(e => e.id) });
      } else {
        const result = instantAnswer(clean);
        await new Promise(resolve => setTimeout(resolve, 260));
        thinking.innerHTML = renderMd(result.text) + sourceRow(result.sources, result.entries);
        transcript.push({ role: "bot", text: result.text, sources: result.sources, entryIds: result.entries.map(e => e.id) });
      }
      saveTranscript();
    } catch (error) {
      const result = instantAnswer(clean);
      thinking.innerHTML = renderMd(result.text) + sourceRow(result.sources, result.entries);
      transcript.push({ role: "bot", text: result.text, sources: result.sources, entryIds: result.entries.map(e => e.id) });
      saveTranscript();
    } finally {
      busy = false;
      if (el.send) el.send.disabled = false;
      scrollLog();
    }
  }

  /* ================================================================== wiring */
  let engineMode = "instant";

  function updateState() {
    if (!el.state) return;
    if (engineMode === "neural") {
      el.state.textContent = neural.ready
        ? "Neural · " + (neural.modelId || "").replace(/-q4f16_1-MLC$/, "") + " on WebGPU"
        : "Neural · model not loaded";
    } else {
      el.state.textContent = "Instant mode · offline retrieval";
    }
  }

  function setEngine(mode) {
    engineMode = mode;
    el.engineTabs.forEach(tab => {
      const on = tab.dataset.engine === mode;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-pressed", String(on));
    });
    if (el.neural) el.neural.hidden = mode !== "neural";
    if (el.engineNote) {
      el.engineNote.textContent = mode === "neural"
        ? "A small open-weight model downloads once, then runs on your GPU. Nothing leaves the browser."
        : "Retrieval over Phirum's profile. No download, works offline.";
    }
    if (mode === "neural" && !webgpuAvailable() && el.status) {
      el.status.hidden = false;
      el.status.textContent = "WebGPU is unavailable in this browser — Instant mode still answers everything.";
    }
    updateState();
  }

  el.engineTabs.forEach(tab => tab.addEventListener("click", () => setEngine(tab.dataset.engine)));
  if (el.modelLoad) el.modelLoad.addEventListener("click", () => loadNeural(el.modelSelect.value));

  if (el.suggestions) {
    el.suggestions.innerHTML = KB.suggestions.map(q => `<button type="button">${escapeHTML(q)}</button>`).join("");
    el.suggestions.addEventListener("click", event => {
      const button = event.target.closest("button");
      if (button) ask(button.textContent);
    });
  }

  el.log.addEventListener("click", event => {
    const jump = event.target.closest("[data-jump]");
    if (!jump) return;
    event.preventDefault();
    const target = document.querySelector(jump.dataset.jump);
    if (!target) return;
    closePanel();
    target.scrollIntoView({ behavior: (window.PS_SITE && window.PS_SITE.calm()) ? "auto" : "smooth", block: "start" });
  });

  if (el.form) {
    el.form.addEventListener("submit", event => {
      event.preventDefault();
      const value = el.input.value;
      el.input.value = "";
      el.input.style.height = "auto";
      ask(value);
    });
  }
  if (el.input) {
    el.input.addEventListener("input", () => {
      el.input.style.height = "auto";
      el.input.style.height = Math.min(el.input.scrollHeight, 116) + "px";
    });
    el.input.addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        el.form.requestSubmit();
      }
    });
  }

  function openPanel() {
    el.panel.hidden = false;
    requestAnimationFrame(() => {
      el.panel.classList.add("is-open");
      document.body.classList.add("assistant-open");
    });
    if (el.launcher) el.launcher.setAttribute("aria-expanded", "true");
    setTimeout(() => { if (el.input) el.input.focus(); scrollLog(); }, 260);
  }
  function closePanel() {
    el.panel.classList.remove("is-open");
    document.body.classList.remove("assistant-open");
    if (el.launcher) el.launcher.setAttribute("aria-expanded", "false");
    setTimeout(() => { el.panel.hidden = true; }, 350);
    if (el.launcher) el.launcher.focus();
  }

  if (el.launcher) el.launcher.addEventListener("click", openPanel);
  if (el.close) el.close.addEventListener("click", closePanel);
  document.addEventListener("assistant:open", openPanel);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && el.panel.classList.contains("is-open")) closePanel();
  });

  if (el.reset) {
    el.reset.addEventListener("click", () => {
      transcript = [];
      saveTranscript();
      replayTranscript();
      if (el.input) el.input.focus();
    });
  }

  transcript = loadTranscript();
  replayTranscript();
  setEngine("instant");
})();
