  import { arrowMarkers, connect, side, labelBox } from "/_kit/viz.js";

  type Node = { t: string; x: number; y: number; w: number; h: number };
  type Step = { from?: string; to?: string; self?: string; label: string; dashed?: boolean };

  const APPS = ["Chatbot", "Classifier", "Inbox agent", "RAG API"];
  const PROVIDERS = ["Llama (on-prem)", "Embeddings", "Rerank", "Cloud (GPT…)"];
  const AY = [16, 88, 160, 232];           // row tops for the 4 app/provider boxes
  const BW = 96, BH = 46;                   // box size
  const LX = 8, RX = 460 - BW - 8;          // left / right columns

  const box = (n: Node, cls = "") =>
    `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="9" ` +
    `fill="var(--panel-2)" stroke="${cls || 'var(--border)'}"/>`;

  const markers = arrowMarkers({
    "ah-danger": "var(--danger)",
    "ah-accent": "var(--accent)",
    "ah-good": "var(--good)",
  });

  const apps = APPS.map((t, i) => ({ t, x: LX, y: AY[i]!, w: BW, h: BH }));
  const provs = PROVIDERS.map((t, i) => ({ t, x: RX, y: AY[i]!, w: BW, h: BH }));

  // BEFORE — full mesh, every app to every provider
  {
    let lines = "", boxes = "";
    for (const a of apps) for (const p of provs) {
      const s = side(a, "right"), e = side(p, "left");
      lines += `<path d="M ${s.x} ${s.y} L ${e.x} ${e.y}" stroke="var(--danger)" ` +
        `stroke-width="1" opacity="0.5" marker-end="url(#ah-danger)" fill="none"/>`;
    }
    for (const n of [...apps, ...provs]) boxes += box(n) + labelBox(n, n.t);
    document.getElementById("svg-before")!.innerHTML = markers + lines + boxes;
  }

  // AFTER — everything through one gateway
  {
    const gw = { t: "LiteLLM", x: 460/2 - 64, y: 116, w: 128, h: 66 };
    let lines = "", boxes = "";
    for (const a of apps)
      lines += `<path d="${connect(a, gw)}" stroke="var(--accent)" stroke-width="1.6" ` +
        `marker-end="url(#ah-accent)" fill="none"/>`;
    for (const p of provs)
      lines += `<path d="${connect(gw, p)}" stroke="var(--good)" stroke-width="1.6" ` +
        `marker-end="url(#ah-good)" fill="none"/>`;
    for (const n of [...apps, ...provs]) boxes += box(n) + labelBox(n, n.t);
    const gwBox =
      `<rect x="${gw.x}" y="${gw.y}" width="${gw.w}" height="${gw.h}" rx="11" ` +
      `fill="color-mix(in srgb, var(--accent) 18%, var(--panel))" stroke="var(--accent)" stroke-width="2"/>` +
      labelBox(gw, `<span style="font-size:13px">${gw.t}</span><br><span style="font-weight:500;color:var(--muted);font-size:9.5px">one /v1 endpoint</span>`);
    document.getElementById("svg-after")!.innerHTML = markers + lines + boxes + gwBox;
  }

  // CAPABILITIES
  const CAPS: [string, string][] = [
    ["One endpoint", "OpenAI-compatible <code>/v1</code> for every model — on-prem or cloud, same client."],
    ["Virtual keys &amp; budgets", "Per-app keys with TPM / RPM / USD caps and alerting when they're hit."],
    ["Routing &amp; fallback", "Model allowlists per key, provider-aware failover when a backend is down."],
    ["Swap models freely", "Change the backend in one place — no app code or redeploy."],
    ["Observability", "Traces, latency, and spend per request (Phoenix / OpenTelemetry)."],
    ["Guardrails", "Content-safety and policy hooks on the request/response path."],
    ["Auth", "OAuth2 resource server — your IdP's JWT becomes the caller's identity."],
    ["SIEM logging", "OCSF security events streamed to your logging pipeline (Cribl)."],
    ["Multi-modal", "Chat, vision, embeddings, rerank, speech-to-text, TTS, image-gen."],
  ];
  document.getElementById("caps")!.innerHTML = CAPS
    .map(([b, p]) => `<div class="cap"><b>${b}</b><p>${p}</p></div>`).join("");

  // OAUTH SEQUENCE DIAGRAM (inside the modal)
  {
    const W = 720;
    const ACTORS = [
      { id: "app",   t: "Your app",          x: 70,  c: "var(--c1)" },
      { id: "idp",   t: "Identity provider", x: 270, c: "var(--c4)" },
      { id: "gw",    t: "LiteLLM gateway",   x: 470, c: "var(--accent)" },
      { id: "model", t: "Model backend",     x: 660, c: "var(--c5)" },
    ];
    const ax = Object.fromEntries(ACTORS.map(a => [a.id, a.x]));
    const STEPS: Step[] = [
      { from: "app", to: "idp", label: "1 · get token (client creds)" },
      { from: "idp", to: "app", label: "2 · access token (JWT)", dashed: true },
      { from: "app", to: "gw",  label: "3 · call /v1 + Bearer JWT" },
      { self: "gw",  label: "4 · verify signature · map claim → identity · apply budget &amp; allowlist" },
      { from: "gw",  to: "model", label: "5 · forward request" },
      { from: "model", to: "gw",  label: "6 · completion", dashed: true },
      { from: "gw",  to: "app",   label: "7 · response", dashed: true },
    ];

    const markers = arrowMarkers({ "ah-fwd": "var(--accent)", "ah-ret": "var(--muted)" });
    let body = "", cur = 78;
    for (const s of STEPS) {
      if (s.self) {
        const b = { x: ax[s.self]! - 130, y: cur - 4, w: 260, h: 40 };
        body += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="7" ` +
          `fill="color-mix(in srgb, var(--accent) 14%, var(--panel))" stroke="var(--accent)"/>` +
          labelBox(b, `<span style="font-size:9.5px">${s.label}</span>`);
        cur += 56;
        continue;
      }
      const x1 = ax[s.from!]!, x2 = ax[s.to!]!, m = s.dashed ? "ah-ret" : "ah-fwd";
      body += `<path d="M ${x1} ${cur} L ${x2} ${cur}" stroke="${s.dashed ? 'var(--muted)' : 'var(--accent)'}" ` +
        `stroke-width="1.4"${s.dashed ? ' stroke-dasharray="5 4"' : ''} marker-end="url(#${m})" fill="none"/>` +
        `<text class="seq-lbl" x="${(x1 + x2) / 2}" y="${cur - 6}" text-anchor="middle">${s.label}</text>`;
      cur += 42;
    }
    const bottom = cur + 4;
    let heads = "";
    for (const a of ACTORS) {
      const h = { x: a.x - 60, y: 6, w: 120, h: 38 };
      heads += `<line x1="${a.x}" y1="44" x2="${a.x}" y2="${bottom}" stroke="var(--border)" stroke-dasharray="3 4"/>` +
        `<rect x="${h.x}" y="${h.y}" width="${h.w}" height="${h.h}" rx="8" fill="var(--panel-2)" stroke="${a.c}"/>` +
        labelBox(h, `<span style="font-weight:650">${a.t}</span>`);
    }
    const svg = document.getElementById("svg-oauth")!;
    svg.setAttribute("viewBox", `0 0 ${W} ${bottom + 8}`);
    svg.innerHTML = markers + heads + body;
  }

  // MODAL wiring — open/close, backdrop, Esc, deep-link via #oauth
  {
    const modal = document.getElementById("oauth-modal")!;
    const open = () => { modal.hidden = false; if (location.hash !== "#oauth") location.hash = "oauth"; };
    const close = () => { modal.hidden = true; if (location.hash === "#oauth") history.replaceState(null, "", location.pathname); };
    document.getElementById("oauth-open")!.addEventListener("click", open);
    document.getElementById("oauth-open")!.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    document.getElementById("oauth-close")!.addEventListener("click", close);
    modal.addEventListener("click", e => { if (e.target === modal) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) close(); });
    if (location.hash === "#oauth") open();
  }
