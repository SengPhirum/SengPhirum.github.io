/* ==========================================================================
   knowledge.js — the profile knowledge base.
   Everything PhirumBot can say lives here. Each entry is a retrievable chunk:
   `answer` is written to be read aloud as-is by the instant engine, and is
   also what gets injected as context when the local LLM is running.
   Editing this file is the only thing needed to teach the assistant something.
   ========================================================================== */
(function (global) {
  "use strict";

  const links = {
    knetraDocs: { label: "KNetraHub docs", url: "https://sengphirum.github.io/KNetraHub/documentation" },
    knetraRepo: { label: "KNetraHub repo", url: "https://github.com/SengPhirum/KNetraHub" },
    aiccDocs:   { label: "PLXY AICC docs", url: "https://sengphirum.github.io/PLXY_AICC/" },
    aiccRepo:   { label: "PLXY AICC repo", url: "https://github.com/SengPhirum/PLXY_AICC" },
    dgDocs:     { label: "DrowsyGuard docs", url: "https://sengphirum.github.io/PLXY_DrowsyGuard/" },
    dgRepo:     { label: "DrowsyGuard repo", url: "https://github.com/SengPhirum/PLXY_DrowsyGuard" },
    github:     { label: "GitHub", url: "https://github.com/SengPhirum" },
    linkedin:   { label: "LinkedIn", url: "https://www.linkedin.com/in/phirum-seng/" },
    email:      { label: "Email", url: "mailto:sengphirum143@gmail.com" }
  };

  const profile = {
    name: "Phirum Seng",
    alt: "Seng Phirum",
    location: "Phnom Penh, Cambodia",
    role: "Banking professional and hands-on technologist",
    email: "sengphirum143@gmail.com",
    site: "https://sengphirum.github.io/",
    github: "SengPhirum"
  };

  /* Featured projects — also used by the quick navigator and the project grid. */
  const projects = [
    {
      id: "knetrahub",
      repo: "KNetraHub",
      name: "KNetraHub",
      kind: "Self-hosted infrastructure operations portal",
      anchor: "#p-knetrahub",
      docs: links.knetraDocs.url,
      code: links.knetraRepo.url,
      stack: ["Nuxt 4", "Vue 3", "Nuxt UI 4", "Tailwind v4", "PostgreSQL", "TimescaleDB", "Docker Swarm", "Keycloak"]
    },
    {
      id: "aicc",
      repo: "PLXY_AICC",
      name: "PLXY AI Call Center",
      kind: "Enterprise AI call centre between a telco SIP trunk and a 3CX PBX",
      anchor: "#p-aicc",
      docs: links.aiccDocs.url,
      code: links.aiccRepo.url,
      stack: ["Spring Boot 4", "Java 25", "Nuxt 4", "Vue Flow", "FreeSWITCH 1.10", "PostgreSQL 18", "Docker Swarm"]
    },
    {
      id: "drowsyguard",
      repo: "PLXY_DrowsyGuard",
      name: "DrowsyGuard MCU",
      kind: "Camera-based driver drowsiness detection on an ESP32-S3",
      anchor: "#p-drowsyguard",
      docs: links.dgDocs.url,
      code: links.dgRepo.url,
      stack: ["ESP-IDF", "ESP-DL", "C++", "Python", "PyTorch", "ONNX", "OpenCV YuNet"]
    }
  ];

  /* Retrievable knowledge. `tags` are matched with extra weight. */
  const entries = [
    {
      id: "identity",
      title: "Who Phirum is",
      tags: ["who", "about", "phirum", "seng", "yourself", "background", "bio", "introduce", "profile", "person"],
      answer: "Phirum Seng is a banking professional and hands-on technologist based in Phnom Penh, Cambodia. His work sits where finance meets technology — banking systems, AI and computer vision, infrastructure and data, and useful digital products. He founded and authored KNetraHub, designed and built the PLXY AI Call Center, and runs DrowsyGuard MCU as an embedded computer-vision research project.",
      links: [links.github, links.linkedin]
    },
    {
      id: "approach",
      title: "How Phirum approaches the work",
      tags: ["approach", "philosophy", "principles", "values", "method", "how", "style", "mindset"],
      answer: "Three principles run through the work. **Business grounded** — customer needs, operational realities and measurable value come before novelty. **Verified, not asserted** — test gates run in CI on every change, end-to-end suites boot the real services, and QA totals are regenerated from the reports rather than typed by hand. **Honest about limits** — every project states what it has *not* proven, whether that is carrier certification, real-driver validation, or load and soak testing."
    },
    {
      id: "banking",
      title: "The banking side",
      tags: ["banking", "finance", "bank", "financial", "domain", "industry", "career", "job", "work"],
      answer: "Banking is the domain Phirum works in and the discipline he brings to engineering: reconciliation, auditability, and a low tolerance for processes nobody can explain. That shows up directly in the software — KNetraHub keeps one tamper-aware audit trail across every module, and the PLXY AI Call Center enforces per-tenant row-level security in the database rather than trusting the application layer."
    },

    /* ---------------------------- KNetraHub ---------------------------- */
    {
      id: "knetra-overview",
      title: "KNetraHub — what it is",
      tags: ["knetrahub", "knetra", "hub", "dockhub", "portal", "infrastructure", "self-hosted", "operations", "netra"],
      answer: "KNetraHub — *Khmer Netra Hub* — is self-hosted infrastructure operations behind one login, one theme and one audit trail. It is a single Nuxt application: a portal shell (login, launcher, sidebar, permissions, settings, notifications, shared audit) in front of a growing suite of independent operations subsystems. Each subsystem is a Nuxt layer that merges into one in-process build, so there are no micro-frontends, no iframes and no module-federation remotes to run — one image, one login, one deploy. It was formerly called DockHub.",
      links: [links.knetraDocs, links.knetraRepo]
    },
    {
      id: "knetra-apps",
      title: "KNetraHub — the app suite",
      tags: ["apps", "modules", "suite", "docker", "monitoring", "pam", "ipam", "work", "database", "dbmanager", "librenms", "clickup", "phpipam", "cloudbeaver", "features"],
      answer: "Six operations apps live in the suite, each in its own layer with its own isolated database, gated independently by Keycloak realm roles and toggled per deployment: **Docker (Dock)** — a Swarm console for nodes, services, stacks, tasks, networks, secrets and Git-versioned stack deploys with one-click rollback. **Monitoring** — a clean-room LibreNMS equivalent with registry-driven discovery and polling, a durable job queue, and SNMP trap and syslog receivers; no simulated data. **Work** — a clean-room ClickUp equivalent: spaces, folders, lists, tasks with subtasks and dependencies, List/Board/Table views, docs, comments and time tracking. **Privileged Access (PAM)** — a cryptographic credential vault with envelope encryption and online key rotation, safes, approvals, brokered recorded sessions, JIT and break-glass. **IP Management** — phpIPAM-style IPAM with subnets, VLANs, VRFs, racks, circuits, NAT and a request/approval workflow. **Database Manager** — a CloudBeaver-equivalent workspace with governed connections, a SQL editor with server-enforced limits, and read-only production policies.",
      links: [links.knetraDocs]
    },
    {
      id: "knetra-arch",
      title: "KNetraHub — architecture",
      tags: ["architecture", "layers", "nuxt", "design", "scale", "scaling", "scalable", "scalability", "horizontal", "replicas", "redis", "broker", "queue", "database", "isolation", "performance", "how does it work"],
      answer: "The portal core plus Nuxt layers merge into one in-process build. Every app owns a **dedicated database**, so disabling an app stops its work but retains its data, and backup or restore always targets exactly one database. It **scales horizontally at any replica count** — coordination is the database itself through advisory locks, lease-based job queues and `LISTEN`/`NOTIFY` fan-out, with no Redis and no message broker in the picture. Sessions are stateless, so rolling updates are zero-downtime.",
      links: [links.knetraDocs]
    },
    {
      id: "knetra-security",
      title: "KNetraHub — security",
      tags: ["security", "encryption", "aes", "keycloak", "rbac", "roles", "audit", "ldap", "oidc", "sso", "vault", "secrets"],
      answer: "Authentication covers local accounts, LDAP/AD and OIDC SSO, with a global portal role for administration and per-app viewer/operator/manager/admin tiers mapped live in Settings without a redeploy. Server-side middleware enforces those tiers on every API route. Everything sensitive is **AES-256-GCM encrypted at rest** — LDAP bind password, OIDC client secret, registry auth, GitLab token, alert channels, SNMP credentials — and the PAM vault adds envelope encryption under a versioned master key. A tamper-aware, per-actor audit log spans every module.",
      links: [links.knetraDocs]
    },
    {
      id: "knetra-stack",
      title: "KNetraHub — stack",
      tags: ["stack", "tech", "technology", "tools", "built with", "framework", "pnpm", "vitest", "playwright", "timescaledb", "languages", "libraries"],
      answer: "Nuxt 4 (Nitro + Vue 3) with Nuxt UI 4, Tailwind CSS v4 and `@vite-pwa/nuxt`. Data is PostgreSQL with TimescaleDB, database-per-module, raw parameterised SQL and no ORM. Auth and crypto use `jose`, `bcryptjs` and `ldapts`. Infrastructure protocols come from `dockerode`, `net-snmp`, `ping` and `ssh2`. The UI uses Chart.js, `@xterm/xterm` terminals and `grid-layout-plus` dashboards. Tooling is pnpm 11, Vitest, Playwright for Smart QA, and GitHub Actions publishing the docs to GitHub Pages.",
      links: [links.knetraRepo]
    },

    /* ------------------------------ AICC ------------------------------- */
    {
      id: "aicc-overview",
      title: "PLXY AI Call Center — what it is",
      tags: ["aicc", "plxy", "call center", "callcenter", "callbot", "telephony", "voice", "3cx", "telco", "sip", "call centre"],
      answer: "The PLXY AI Call Center is an enterprise AI call centre sitting between the **Cambodia Telco SIP trunk** and the **3CX PBX** agent pool. It is built as five separated projects plus a shared library: a Nuxt studio for visual scenario editing, campaigns and admin; a Spring Boot control-plane API; a scenario-engine worker that executes scenario graphs per call behind an AI provider SPI; a voice gateway that manages FreeSWITCH over the Event Socket; and FreeSWITCH itself as the software telephony engine. The sixth piece, the scenario schema, is a library rather than a service — the API validates against it and the worker executes it, so neither can silently disagree about what a document means.",
      links: [links.aiccDocs, links.aiccRepo]
    },
    {
      id: "aicc-flow",
      title: "PLXY AICC — how a call flows",
      tags: ["flow", "call flow", "freeswitch", "esl", "transfer", "dtmf", "scenario", "worker", "gateway", "rtp", "path"],
      answer: "A call parks on FreeSWITCH with a DNIS; the gateway opens a worker session over WebSocket; the worker resolves tenant and published scenario from the API by that DNIS, renders TTS into a shared media spool, and the gateway plays it with `uuid_broadcast`. The caller presses a key, a MENU node selects the transfer branch, and the gateway issues `uuid_transfer` to the 3CX extension. On hangup the worker reports the result and the API persists the outcome and the path taken through the scenario graph.",
      links: [links.aiccDocs]
    },
    {
      id: "aicc-qa",
      title: "PLXY AICC — quality gates",
      tags: ["qa", "tests", "testing", "quality", "checks", "ci", "844", "coverage", "e2e", "defects", "reliability", "numbers", "results", "failures", "campaign", "how many", "passing", "verified"],
      answer: "The last full QA campaign, dated **2026-08-09, ran 844 automated checks with 0 failures**. Current totals are regenerated from the gates' own JUnit reports at the end of every verify run, never typed by hand. Each project's own suite tests it against stubs of its neighbours; the cross-service `e2e_qa.sh` is the only place the services actually meet — it boots the real API, worker and gateway against a real PostgreSQL 18, with an independent fake FreeSWITCH implementation standing in for the telephony engine. That campaign found **two real defects that every project's own green suite had missed**: inbound call outcomes were being silently discarded, and the studio's admin page called endpoints the API never implemented. Both are fixed and regression-tested, and all six suites run in CI on every pull request.",
      links: [links.aiccDocs]
    },
    {
      id: "aicc-security",
      title: "PLXY AICC — tenancy and access",
      tags: ["tenant", "tenancy", "multi-tenant", "row level security", "rls", "isolation", "roles", "authorisation", "authorization", "permissions", "rbac", "login", "accounts"],
      answer: "Authorisation is a three-role model — `STUDIO_ADMIN`, `STUDIO_PROJECT` and `STUDIO_MONITORING` — and a user may hold any combination of them; the roles combine as a union, so the most permissive one wins. Isolation is enforced in the database itself rather than trusted to the application layer: **PostgreSQL 18 with per-tenant row-level security**. The two seeded accounts are break-glass credentials and are forced to change their password on first use, with real accounts expected to hold the two narrower roles.",
      links: [links.aiccDocs]
    },
    {
      id: "aicc-deploy",
      title: "PLXY AICC — deployment",
      tags: ["deploy", "deployment", "swarm", "docker", "dmz", "secrets", "prod", "staging", "environments", "firewall"],
      answer: "Deployment is Docker Swarm, split into two stacks so the telephony half can sit on a DMZ host of its own: the callbot stack (API, worker, UI, PostgreSQL) on the internal cluster, and the gateway stack (app plus media) on the DMZ. They deploy to **separate Swarms** on purpose — joining the DMZ host to the internal cluster would need Swarm's control and data planes open across the boundary, so instead exactly three ports cross it and every cross-stack address is explicit configuration. Every credential is a Swarm secret; nothing sensitive passes through the environment. Three environments share the same stack files: dev, staging and prod, with staging generating its secrets exactly as production does but keeping them separate.",
      links: [links.aiccDocs]
    },
    {
      id: "aicc-limits",
      title: "PLXY AICC — what it does not prove",
      tags: ["limits", "limitations", "honest", "caveats", "not proven", "risks", "production"],
      answer: "The repository is explicit about its boundaries. What the test campaign does **not** prove: FreeSWITCH itself, SIP/RTP interoperability with a real carrier and a real 3CX, real ASR/LLM/TTS providers, and load or soak behaviour. Carrier onboarding and certification, 3CX trunk provisioning, TLS/SRTP hardening, legal and compliance review, and AI-provider contracts are external steps the repository documents but can never self-certify. The bundled AI provider is a deterministic simulator; real providers plug into the worker's SPI."
    },

    /* --------------------------- DrowsyGuard ---------------------------- */
    {
      id: "dg-overview",
      title: "DrowsyGuard — what it is",
      tags: ["drowsyguard", "drowsy", "drowsiness", "driver", "sleep", "fatigue", "vehicle", "car", "esp32", "mcu", "retrofit"],
      answer: "DrowsyGuard MCU is a low-cost, camera-based driver drowsiness detector designed for **retrofit into older vehicles**. It runs on an ESP32-S3-WROOM-1 N16R8 with an OV3660 camera and a MAX98357A I2S class-D amplifier driving a small speaker. There is deliberately **no display** — the board serves a live MJPEG preview and all of its telemetry over its own Wi-Fi access point, so you join `DrowsyGuard-XXXXXX` and open the page on a phone. It is a research prototype, not a certified automotive safety device.",
      links: [links.dgDocs, links.dgRepo]
    },
    {
      id: "dg-method",
      title: "DrowsyGuard — how drowsiness is measured",
      tags: ["perclos", "eye", "eyes", "blink", "yawn", "nod", "detection", "approach", "cnn", "model", "risk", "fusion", "sneeze"],
      answer: "Risk is measured from **eyelid closure over time**, not from a whole-face classifier — a face model trained on the DDD dataset learned to recognise *drivers* rather than drowsiness, whereas eye closure is the mechanism itself and is far cheaper on device (the model input is a 32×32 eye patch). The pipeline runs camera → YuNet face detection with five landmarks → crop both eyes → per-eye P(closed) → PERCLOS, with face geometry giving jaw drop, head pitch and roll. Four cues fuse into the risk score: **PERCLOS at 0.55, long and slow blinks at 0.20, yawning at 0.15, head nodding at 0.10**, each measured against a rolling per-driver baseline so face shape and camera angle cancel out. Sneezes are detected specifically so they can be *suppressed* — a sneeze slams the eyes shut for about a second, which a naive detector would score as a microsleep.",
      links: [links.dgDocs]
    },
    {
      id: "dg-model",
      title: "DrowsyGuard — the model on device",
      tags: ["model", "int8", "quantized", "espdl", "parameters", "inference", "latency", "speed", "onnx", "size", "openvino"],
      answer: "The base eye model is `open-closed-eye-0001` from the OpenVINO Model Zoo — **11.3k parameters, 0.0014 GFLOPs, 46 KB**, which is realistic for an ESP32-S3 at INT8, and inference is measured at about **0.9 ms per frame for both eyes**. The desktop toolkit trains, evaluates, exports to ONNX and quantises to `.espdl` for ESP-DL. The known limitation is stated plainly: that model was trained on the MRL *infrared* eye dataset and does not transfer to DDD's visible-light crops, where the eye region is only about 45 px and blurry — it reaches only AUC 0.62 there against a claimed 95.84% in-domain. Fine-tuning on visible-light eye-state labels is the open task.",
      links: [links.dgRepo]
    },
    {
      id: "dg-data",
      title: "DrowsyGuard — data discipline",
      tags: ["dataset", "ddd", "split", "subject", "leak", "training", "thesis", "accuracy", "data"],
      answer: "The thesis principle is subject-independent train, validation and test splits, never leaking neighbouring frames from the same driver across splits. DDD ships as two flat class folders, but subject identity is recoverable — the alphabetic filename prefix is the subject and case is the label — so the importer rebuilds the subject layout, yielding 28 subjects and 41,793 images. Training on the raw folders directly would put the same face, and adjacent frames of one video, in both train and test. That is exactly why published DDD accuracies near 99% are usually not comparable to a subject-independent number."
    },
    {
      id: "dg-build",
      title: "DrowsyGuard — the hardware build",
      tags: ["hardware", "build", "wiring", "wires", "camera", "speaker", "amplifier", "ov3660", "assembly", "parts", "cost"],
      answer: "The whole build is **seven wires**: five to the MAX98357A amplifier and two to the 4 ohm / 3 W speaker. The OV3660 camera is a ribbon into the board's DVP/FPC connector, and the preview is a web page, so neither needs any wiring. The documentation includes a full assembly tutorial covering all four purchased components, a wiring table, eleven labelled diagrams, first power-on, per-component tests and troubleshooting. A `plxy.sh` task runner wraps build, flash, monitor, Wi-Fi help and a toolchain doctor.",
      links: [links.dgDocs]
    },

    /* ------------------------------ Meta -------------------------------- */
    {
      id: "projects-list",
      title: "The flagship projects",
      tags: ["projects", "portfolio", "work", "flagship", "achievements", "built", "list", "showcase", "best"],
      answer: "Three flagship systems, each with its own live documentation site: **KNetraHub**, a self-hosted infrastructure operations portal; the **PLXY AI Call Center**, enterprise AI telephony between a Cambodia Telco SIP trunk and a 3CX PBX; and **DrowsyGuard MCU**, camera-based driver drowsiness detection on an ESP32-S3. Beyond those, every public repository on GitHub is listed live in the Projects section of this page.",
      links: [links.knetraDocs, links.aiccDocs, links.dgDocs]
    },
    {
      id: "other-work",
      title: "Other public repositories",
      tags: ["repos", "repositories", "other", "github", "more", "everything else", "public"],
      answer: "The Projects section loads every public repository straight from the GitHub API and groups it by focus area, so it is always current. Alongside the three flagship systems there is work on Khmer-language AI, Wi-Fi human mapping, driver-drowsiness experiments in Python, Flutter apps, and Docker tooling. You can search, filter by tag or language, and sort by recency or stars right on the page.",
      links: [links.github]
    },
    {
      id: "contact",
      title: "Getting in touch",
      tags: ["contact", "email", "hire", "reach", "collaborate", "collaboration", "partnership", "available", "connect", "talk", "message"],
      answer: "Phirum is open to thoughtful business collaboration — product partnerships, pilot deployments, enterprise integrations, and applied AI or infrastructure work. The fastest route is email at **sengphirum143@gmail.com**; LinkedIn and GitHub both work too.",
      links: [links.email, links.linkedin, links.github]
    },
    {
      id: "assistant",
      title: "About this assistant",
      tags: ["you", "bot", "assistant", "llm", "ai", "chatbot", "how do you work", "privacy", "webgpu", "model", "local"],
      answer: "I am PhirumBot, and I run entirely inside your browser. **Instant mode** is a retrieval engine over a hand-written knowledge base about Phirum and his projects — no download, no network call, works offline. **Neural LLM mode** downloads a small open-weight model (SmolLM2 360M, Llama 3.2 1B or Qwen2.5 0.5B) through WebLLM and runs it on your GPU with WebGPU, using the same knowledge base as context. Either way nothing you type is sent anywhere, and the model is cached by your browser so a second visit is instant. My avatar is drawn as vector art from Phirum's likeness — the glasses, hair and navy jacket do the resembling — so it stays sharp at any size."
    },
    {
      id: "site",
      title: "About this site",
      tags: ["site", "website", "page", "built", "source", "made", "this"],
      answer: "This page is hand-written HTML, CSS and vanilla JavaScript with no framework and no build step. Repositories are fetched live from the GitHub API, the project visuals are inline animated SVG, and every animation is disabled automatically when your system asks for reduced motion. Press Ctrl+K (⌘K on a Mac) anywhere to open the quick navigator.",
      links: [links.github]
    }
  ];

  const suggestions = [
    "What is KNetraHub?",
    "How does DrowsyGuard detect drowsiness?",
    "What are the QA numbers for the AI Call Center?",
    "What is your tech stack?",
    "How do I get in touch?",
    "How does this chatbot work?"
  ];

  const greeting = "Hi — I am **PhirumBot**, running fully inside your browser. Ask me about Phirum's flagship systems (KNetraHub, the PLXY AI Call Center, DrowsyGuard MCU), the stack behind them, or how to get in touch.";

  const fallback = "I only know what is in Phirum's profile knowledge base, and I could not find a good match for that. Try asking about **KNetraHub**, the **PLXY AI Call Center**, **DrowsyGuard MCU**, his approach to building, or how to **contact** him.";

  global.PHIRUM = { profile, projects, entries, suggestions, greeting, fallback, links };
})(window);
