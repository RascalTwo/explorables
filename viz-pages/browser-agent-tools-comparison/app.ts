export {};
// ---------- matrix data ----------
// pill: g=good w=warn b=bad n=neutral ; text + optional small note
type Pill = "g" | "w" | "b" | "n";
interface Cell {
  p: Pill;
  t: string;
  s?: string;
}
interface Row {
  label: string;
  diff?: boolean;
  cells: Cell[];
}
interface Opt {
  l: string;
  w: [number, number, number];
  note?: string;
}
interface Question {
  q: string;
  opts: Opt[];
}
const ROWS: Row[] = [
  {
    label: "Model / vendor lock-in",
    diff: true,
    cells: [
      { p: "b", t: "ChatGPT / Codex only" },
      { p: "b", t: "Direct Anthropic plan only", s: "not via Bedrock / Vertex / Foundry" },
      { p: "g", t: "None", s: "any model, any MCP client" },
    ],
  },
  {
    label: "Where the browser runs",
    diff: true,
    cells: [
      { p: "w", t: "Your real signed-in Chrome" },
      { p: "w", t: "Your real Chrome / Edge" },
      {
        p: "g",
        t: "Its own Playwright browser",
        s: "isolated by default; persistent / extension mode optional",
      },
    ],
  },
  {
    label: "Browsers supported",
    diff: true,
    cells: [
      { p: "w", t: "Chrome only" },
      { p: "w", t: "Chrome + Edge", s: "no Brave/Arc, no WSL" },
      { p: "g", t: "Chromium · Firefox · WebKit · Chrome channels" },
    ],
  },
  {
    label: "Setup effort",
    cells: [
      { p: "g", t: "Low", s: "Plugins menu → add Chrome plugin" },
      { p: "g", t: "Low", s: "install ext (≥1.0.36) + claude --chrome / /chrome" },
      { p: "w", t: "Medium", s: "npx @playwright/mcp@latest in MCP config; 50+ flags" },
    ],
  },
  {
    label: "Cost / token overhead",
    diff: true,
    cells: [
      { p: "g", t: "Bundled w/ ChatGPT plan", s: "temp. Free/Go; 2× usage promo → May 31 2026" },
      { p: "g", t: "Bundled w/ direct Anthropic plan" },
      {
        p: "w",
        t: "$0 (Apache-2.0)",
        s: "but ~13.7K tokens/req of tool defs — leaner peers exist",
      },
    ],
  },
  {
    label: "Page → model channel",
    cells: [
      { p: "n", t: "DOM + screenshots" },
      { p: "n", t: "DOM + screenshots + computer tool" },
      { p: "g", t: "Accessibility tree first", s: '"no vision models"; vision opt-in' },
    ],
  },
  {
    label: "Built-in guardrails",
    diff: true,
    cells: [
      {
        p: "w",
        t: "Per-domain approval, history confirmation, blocklist",
        s: '"treat pages as untrusted"',
      },
      {
        p: "g",
        t: "Strongest defaults",
        s: "category blocklist (banks/crypto/adult…), per-domain JS approval, purchase confirmation, no CAPTCHA-solving, no autonomous mode",
      },
      {
        p: "b",
        t: '"Not a security boundary"',
        s: "host/origin allowlists & isolated profiles only — category/action gating is the client's job",
      },
    ],
  },
  {
    label: "Disclosed 2026 vulns",
    diff: true,
    cells: [
      { p: "g", t: "None found" },
      { p: "w", t: "ShadowPrompt + ClaudeBleed", s: "both patched" },
      { p: "g", t: "None tool-specific", s: "general MCP-server caveats apply" },
    ],
  },
  {
    label: "Testing features",
    diff: true,
    cells: [
      { p: "b", t: "Not surfaced" },
      { p: "w", t: "Not surfaced", s: "GIF recording yes" },
      { p: "g", t: "First-class", s: "network mock · tracing · video · assertions" },
    ],
  },
  {
    label: "Self-host / CI",
    cells: [
      { p: "b", t: "No" },
      { p: "b", t: "No" },
      { p: "g", t: "Yes", s: "Docker · HTTP/SSE · headless" },
    ],
  },
  {
    label: "Best at",
    cells: [
      { p: "n", t: '"I live in ChatGPT — operate my logged-in SaaS + test my app"' },
      {
        p: "n",
        t: '"I live in Claude Code/VS Code — debug→fix loop + authenticated apps, conservative defaults"',
      },
      {
        p: "n",
        t: '"Portable, self-hosted, model-agnostic browser tool; rigorous web testing; custom agents"',
      },
    ],
  },
];

const PILLLBL: Record<Pill, string> = { g: "good", w: "ok", b: "weak", n: "—" };
function pillEl(p: Pill) {
  if (p === "n") return "";
  const cls = ({ g: "p-good", w: "p-warn", b: "p-bad", n: "p-neu" } as Record<Pill, string>)[p];
  return `<span class="pill ${cls}">${PILLLBL[p]}</span>`;
}

const tbl = document.querySelector("#matrix")!;
let thead = `<thead><tr><th>Dimension</th><th class="c-codex">Codex Chrome ext.</th><th class="c-claude">Claude Code + Chrome</th><th class="c-pw">Playwright MCP</th></tr></thead>`;
let tb = "<tbody>";
for (const r of ROWS) {
  tb += `<tr class="${r.diff ? "diff-row" : ""}"><td class="rowlabel">${r.label}</td>`;
  for (const c of r.cells) {
    tb += `<td>${pillEl(c.p)}${c.t}${c.s ? `<small>${c.s}</small>` : ""}</td>`;
  }
  tb += `</tr>`;
}
tb += "</tbody>";
tbl.innerHTML = thead + tb;

// ---------- decision helper ----------
// each option contributes weighted points per answer. idx: 0=Codex 1=Claude 2=PW
const QUESTIONS: Question[] = [
  {
    q: "Which agent do you already pay for / use daily?",
    opts: [
      { l: "ChatGPT / Codex", w: [3, 0, 0] },
      { l: "Claude (direct plan: Pro/Max/Team/Ent)", w: [0, 3, 0] },
      { l: "Claude via Bedrock / Vertex / Foundry only", w: [0, -2, 2] },
      { l: "Mix / neither / building a product", w: [0, 0, 2] },
    ],
  },
  {
    q: "How much do you care about avoiding vendor lock-in?",
    opts: [
      { l: "A lot — must be model/platform agnostic", w: [-2, -2, 4] },
      { l: "Somewhat", w: [0, 0, 1] },
      { l: "Don't care", w: [1, 1, 0] },
    ],
  },
  {
    q: "Do you need to self-host / run in CI / headless?",
    opts: [
      { l: "Yes", w: [-3, -3, 4] },
      { l: "No — interactive dev only", w: [1, 1, 0] },
    ],
  },
  {
    q: "How important are testing features (network mocking, tracing, video, assertions)?",
    opts: [
      { l: "Core to what I'm doing", w: [-1, -1, 3] },
      { l: "Nice to have", w: [0, 0, 1] },
      { l: "Not needed", w: [1, 1, 0] },
    ],
  },
  {
    q: "How conservative does the default security posture need to be?",
    opts: [
      { l: "Very — regulated / sensitive, want strong defaults out of the box", w: [0, 3, -1] },
      { l: "I'll configure guardrails myself", w: [0, 0, 2] },
      { l: "Average", w: [1, 1, 1] },
    ],
  },
  {
    q: "Token / context budget of the agent?",
    opts: [
      {
        l: "Tight — minimize tool overhead",
        w: [1, 1, -2],
        note: "…and consider browser-use / agent-browser / Playwright CLI instead of Playwright MCP",
      },
      { l: "Comfortable", w: [0, 0, 1] },
    ],
  },
  {
    q: "Do you need to drive your already-logged-in browser session (Gmail, Salesforce, internal SSO)?",
    opts: [
      {
        l: "Yes, that's the whole point",
        w: [2, 2, 0],
        note: "…Playwright MCP can do it too via persistent/extension mode, but it's not the default",
      },
      { l: "No / isolated browser is fine or preferred", w: [0, 0, 2] },
    ],
  },
  {
    q: "Which engine do you need?",
    opts: [
      { l: "Firefox or WebKit/Safari coverage required", w: [-3, -3, 3] },
      { l: "Chromium-family is fine", w: [1, 1, 0] },
    ],
  },
];

const state: (number | null)[] = QUESTIONS.map(() => null);
const qsEl = document.querySelector("#qs")!;
QUESTIONS.forEach((Q, qi) => {
  const d = document.createElement("div");
  d.className = "q";
  let html = `<div class="qt">${qi + 1}. ${Q.q}</div><div class="opts">`;
  Q.opts.forEach((o, oi) => {
    html += `<span class="opt" data-q="${qi}" data-o="${oi}">${o.l}</span>`;
  });
  html += `</div>`;
  d.innerHTML = html;
  qsEl.append(d);
});

const META = [
  {
    nm: "Codex Chrome ext.",
    color: "var(--codex)",
    pick: "Use the Codex Chrome extension — bundled, zero-config via the Plugins menu, built for operating your logged-in SaaS + testing your web app. Keep its allowlist tight; deny browser-history access unless a task needs it.",
  },
  {
    nm: "Claude Code + Chrome",
    color: "var(--claude)",
    pick: "Use <code>claude --chrome</code> (or <code>/chrome</code>). Strongest default guardrails of the three. Don't enable Chrome \"by default\" unless you need it — it inflates context. On Bedrock/Vertex/Foundry only? You'll need a separate claude.ai account or go agnostic.",
  },
  {
    nm: "Playwright MCP",
    color: "var(--pw)",
    pick: "Use Playwright MCP. Default to <b>isolated</b> profiles; only use persistent/extension mode when a task truly needs your logged-in state. Set <code>--allowed-hosts</code>/<code>--blocked-origins</code> aggressively, keep file access workspace-scoped — remember it's <b>not a security boundary</b>, so put auth/approval logic in the client.",
  },
];

function recompute() {
  const sc = [0, 0, 0];
  const notes = new Set<string>();
  state.forEach((oi, qi) => {
    if (oi === null) return;
    const o = QUESTIONS[qi]!.opts[oi]!;
    o.w.forEach((v, k) => {
      sc[k]! += v;
    });
    if (o.note) notes.add(o.note);
  });
  const answered = state.filter((x) => x !== null).length;
  // render bars
  const min = Math.min(...sc, 0),
    max = Math.max(...sc, 1);
  const span = Math.max(max - min, 1);
  const sb = META.map((m, i) => {
    const pct = Math.round(((sc[i]! - min) / span) * 100);
    return `<div class="sb"><div class="nm" style="color:${m.color}">${m.nm}</div><div class="track"><div class="fill" style="width:${pct}%;background:${m.color}"></div></div><div style="font-size:.72rem;color:var(--faint);margin-top:4px">score ${sc[i]! > 0 ? "+" : ""}${sc[i]!}</div></div>`;
  }).join("");
  document.querySelector("#scores")!.innerHTML = sb;
  const res = document.querySelector("#result")!;
  if (answered === 0) {
    res.innerHTML = "Pick some answers above…";
    return;
  }
  const best = sc.indexOf(Math.max(...sc));
  const tie = sc.filter((v) => v === sc[best]).length > 1;
  let html = `<div class="winner" style="color:${META[best]!.color}">→ ${tie ? "(close call) " : ""}${META[best]!.nm}</div><div>${META[best]!.pick}</div>`;
  if (notes.size > 0)
    html += `<div style="margin-top:10px;font-size:.82rem;color:var(--dim)">${[...notes].map((n) => "↳ " + n).join("<br>")}</div>`;
  if (answered < QUESTIONS.length)
    html += `<div style="margin-top:10px;font-size:.78rem;color:var(--faint)">(${answered}/${QUESTIONS.length} answered — answer the rest to sharpen it)</div>`;
  res.innerHTML = html;
}
qsEl.addEventListener("click", (e) => {
  const t = e.target instanceof Element ? e.target.closest<HTMLElement>(".opt") : null;
  if (!t) return;
  const qi = +t.dataset["q"]!,
    oi = +t.dataset["o"]!;
  state[qi] = state[qi] === oi ? null : oi;
  [...qsEl.querySelectorAll<HTMLElement>(`.opt[data-q="${qi}"]`)].forEach((el) => {
    el.classList.toggle("sel", +el.dataset["o"]! === state[qi]);
  });
  recompute();
});
document.querySelector("#reset")!.addEventListener("click", () => {
  state.fill(null);
  [...qsEl.querySelectorAll(".opt")].forEach((el) => el.classList.remove("sel"));
  recompute();
});
recompute();
