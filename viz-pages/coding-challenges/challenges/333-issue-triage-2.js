// #333 · Issue Triage 2 — a label rules engine, drawn as a firing cascade.
// One title + a set of current labels fall through a mutually-exclusive rule
// ladder (seed rules when unlabelled, triage rules when labelled), then an
// independent "security → critical" append runs in BOTH branches.
import { el, esc, mountDebugger } from "../shared.js";

// The canonical solution — the visualization's triage() below mirrors it exactly
// while also recording which rule fired.
// Correctness: this function produces the official expected output for all 9 of
// freeCodeCamp's test cases. Coverage: all 9 are selectable as PRESETS below.
// (These are separate claims — passing a case and shipping it as a preset are not
// the same thing, and this module was briefly correct on 9 but only shipped 8.)
function triage(title, labels) {
  const t = title.toLowerCase();
  const has = (s) => t.includes(s);
  const out = labels.slice();
  const drop = (l) => { const i = out.indexOf(l); if (i >= 0) out.splice(i, 1); };
  const rows = { seedBug: "na", seedEnh: "na", gfi: "na", roadmap: "na", help: "na", critical: "na" };
  const branch = out.length === 0 ? "empty" : "has";

  if (out.length === 0) {
    if (has("error") || has("bug")) { rows.seedBug = "fired"; out.push("bug", "needs triage"); }
    else {
      rows.seedBug = "skip";
      if (has("feature") || has("add")) { rows.seedEnh = "fired"; out.push("enhancement", "discussing"); }
      else rows.seedEnh = "skip";
    }
  } else if (out.includes("needs triage") && (has("simple") || has("easy"))) {
    rows.gfi = "fired"; drop("needs triage"); out.push("good first issue");
  } else if (out.includes("discussing") && (has("planned") || has("next"))) {
    rows.gfi = "skip"; rows.roadmap = "fired"; drop("discussing"); out.push("on the roadmap");
  } else if (out.includes("needs triage") || out.includes("discussing")) {
    rows.gfi = "skip"; rows.roadmap = "skip"; rows.help = "fired";
    drop(out.includes("needs triage") ? "needs triage" : "discussing"); out.push("help wanted");
  } else {
    rows.gfi = "skip"; rows.roadmap = "skip"; rows.help = "skip";
  }

  if (has("security")) { rows.critical = "fired"; out.push("critical"); }
  else rows.critical = "skip";
  return { out, rows, branch };
}

// All 9 official freeCodeCamp cases — no invented scenarios. The last entry is the
// feature-side counterpart of the "app crashes with error" + labels case: it takes
// the help-wanted fall-through WITHOUT the security append, so that rule is finally
// visible in isolation ("improve security" fires both at once and masks it).
const PRESETS = [
  { t: "app crashes with error", l: [] },
  { t: "add dark mode", l: [] },
  { t: "xss security bug", l: [] },
  { t: "security vulnerability in auth", l: [] },
  { t: "app crashes with error", l: ["bug", "needs triage"] },
  { t: "easy a11y fix", l: ["bug", "needs triage"] },
  { t: "planned api migration", l: ["enhancement", "discussing"] },
  { t: "improve security", l: ["enhancement", "discussing"] },
  { t: "add dark mode", l: ["enhancement", "discussing"] },
];
const PALETTE = ["bug", "needs triage", "enhancement", "discussing"];

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .tr-wrap { max-width:640px; }
    .tr-lab { font:700 10.5px var(--sans); letter-spacing:.08em; text-transform:uppercase; color:var(--muted); margin:16px 0 7px; }
    .tr-chips { display:flex; gap:6px; flex-wrap:wrap; align-items:center; min-height:30px; }
    .tr-chip { font:700 12px var(--mono); padding:5px 10px; border-radius:999px; border:1px solid var(--border); background:var(--panel-2); color:var(--text); }
    .tr-chip.added { border-color:var(--good); background:color-mix(in srgb,var(--good) 18%,transparent); color:var(--good); }
    .tr-chip.removed { border-color:var(--danger); color:var(--danger); text-decoration:line-through; opacity:.7; background:color-mix(in srgb,var(--danger) 10%,transparent); }
    .tr-empty { font:12px var(--mono); color:var(--muted); font-style:italic; }
    .tr-group { border:1px solid var(--border); border-radius:11px; padding:9px 12px; margin-bottom:8px; transition:opacity .2s; }
    .tr-group.dim { opacity:.4; }
    .tr-ghead { font:700 10px var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin-bottom:7px; }
    .tr-group.on .tr-ghead { color:var(--accent); }
    .tr-rule { display:flex; align-items:center; gap:9px; padding:5px 0; font:12.5px var(--mono); color:var(--muted); }
    .tr-rule + .tr-rule { border-top:1px dashed color-mix(in srgb,var(--border) 60%,transparent); }
    .tr-mark { width:18px; text-align:center; font-weight:800; flex:none; }
    .tr-rule.fired { color:var(--text); }
    .tr-rule.fired .tr-mark { color:var(--good); }
    .tr-rule.skip .tr-mark { color:var(--danger); opacity:.65; }
    .tr-rule.na { opacity:.5; }
    .tr-rule.na .tr-mark { color:var(--muted); }
    .tr-rule b { color:var(--text); } .tr-rule.na b { color:var(--muted); }
    .tr-call { font:12.5px var(--mono); color:var(--muted); margin:2px 0 6px; word-break:break-word; }
    .tr-call b { color:var(--accent); }
  `));
}

function chipRow(labels, host) {
  host.innerHTML = "";
  if (!labels.length) { host.append(el("span", "tr-empty", "(no labels)")); return; }
  labels.forEach((l) => host.append(el("span", "tr-chip", esc(l))));
}

function mount(host) {
  ensureStyle();
  let title = "app crashes with error";
  let labels = [];

  const wrap = el("div", "tr-wrap");

  // title input
  const tc = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = title; inp.style.width = "300px";
  tc.append(el("span", "ctl-label", "title"), inp);

  // editable current-labels toggles
  const lc = el("div", "controls");
  lc.append(el("span", "ctl-label", "current labels"));
  const toggles = {};
  PALETTE.forEach((l) => {
    const c = el("button", "chip", esc(l));
    c.onclick = () => { labels = labels.includes(l) ? labels.filter((x) => x !== l) : [...labels, l]; sync(); };
    toggles[l] = c; lc.append(c);
  });

  // preset scenarios
  const pc = el("div", "controls");
  pc.append(el("span", "ctl-label", "scenarios"));
  PRESETS.forEach((p) => {
    const short = p.l.length ? `${p.t.split(" ")[0]}… +${p.l.length}` : `${p.t.split(" ")[0]}… ∅`;
    const c = el("button", "chip", esc(short));
    c.title = `triageIssue("${p.t}", [${p.l.map((x) => `"${x}"`).join(", ")}])`;
    c.onclick = () => { title = p.t; labels = p.l.slice(); inp.value = title; sync(); };
    pc.append(c);
  });

  const call = el("div", "tr-call");
  const curHost = el("div", "tr-chips");
  const cascade = el("div");
  const resHost = el("div", "tr-chips");

  wrap.append(tc, lc, pc, call,
    el("div", "tr-lab", "Current labels"), curHost,
    el("div", "tr-lab", "Rule cascade"), cascade,
    el("div", "tr-lab", "Resulting labels"), resHost);
  host.append(wrap);

  inp.oninput = () => { title = inp.value; sync(); };
  sync();

  function ruleEl(status, txt) {
    const mark = status === "fired" ? "✓" : status === "skip" ? "✗" : "·";
    const r = el("div", "tr-rule " + status);
    r.append(el("span", "tr-mark", mark), el("span", null, txt));
    return r;
  }

  function sync() {
    PALETTE.forEach((l) => toggles[l].classList.toggle("on", labels.includes(l)));
    const { out, rows, branch } = triage(title, labels);
    call.innerHTML = `<b>triageIssue</b>(<span style="color:var(--text)">"${esc(title)}"</span>, [${labels.map((x) => `"${esc(x)}"`).join(", ")}])`;
    chipRow(labels, curHost);

    cascade.innerHTML = "";
    const seed = el("div", "tr-group" + (branch === "empty" ? " on" : " dim"));
    seed.append(el("div", "tr-ghead", "No labels → seeding rules"));
    seed.append(ruleEl(rows.seedBug, `title has <b>"error"/"bug"</b> → +bug, +needs triage`));
    seed.append(ruleEl(rows.seedEnh, `title has <b>"feature"/"add"</b> → +enhancement, +discussing`));

    const tri = el("div", "tr-group" + (branch === "has" ? " on" : " dim"));
    tri.append(el("div", "tr-ghead", "Has labels → triage rules"));
    tri.append(ruleEl(rows.gfi, `<b>needs triage</b> & title has <b>"simple"/"easy"</b> → −needs triage, +good first issue`));
    tri.append(ruleEl(rows.roadmap, `<b>discussing</b> & title has <b>"planned"/"next"</b> → −discussing, +on the roadmap`));
    tri.append(ruleEl(rows.help, `else <b>needs triage</b>/<b>discussing</b> present → remove it, +help wanted`));

    const always = el("div", "tr-group" + (rows.critical === "fired" ? " on" : ""));
    always.append(el("div", "tr-ghead", "Always (both branches)"));
    always.append(ruleEl(rows.critical, `title has <b>"security"</b> → +critical`));

    cascade.append(seed, tri, always);

    // before → after: keep originals in place, strike removed, append added green
    resHost.innerHTML = "";
    if (!out.length && !labels.length) { resHost.append(el("span", "tr-empty", "(no labels)")); return; }
    labels.forEach((l) => resHost.append(el("span", "tr-chip" + (out.includes(l) ? "" : " removed"), esc(l))));
    out.forEach((l) => { if (!labels.includes(l)) resHost.append(el("span", "tr-chip added", "+ " + esc(l))); });
  }
}

const CODE = `function triageIssue(title: string, labels: string[]): string[] {
  const t = title.toLowerCase();
  const has = (s: string) => t.includes(s);
  const out = [...labels];
  const drop = (l: string) => { const i = out.indexOf(l); if (i >= 0) out.splice(i, 1); };

  if (out.length === 0) {
    if (has("error") || has("bug")) out.push("bug", "needs triage");
    else if (has("feature") || has("add")) out.push("enhancement", "discussing");
  } else if (out.includes("needs triage") && (has("simple") || has("easy"))) {
    drop("needs triage"); out.push("good first issue");
  } else if (out.includes("discussing") && (has("planned") || has("next"))) {
    drop("discussing"); out.push("on the roadmap");
  } else if (out.includes("needs triage") || out.includes("discussing")) {
    drop(out.includes("needs triage") ? "needs triage" : "discussing");
    out.push("help wanted");
  }

  if (has("security")) out.push("critical");
  return out;
}`;

// ── STEP — the rules engine, line-by-line in the shared debugger ──────────────
// Input is a (title, labels) pair, so we curate cases and pick one by index like
// song-mood. `out` is shown as an evolving array struct; each rule that fires
// mutates it (removals splice, additions push with the newest box highlighted).
// Every case here is official. Curated for trace variety — one per rule in the
// cascade. The last entry is the plain help-wanted fall-through with NO security
// append, so the step-through shows that rule alone; case 5 ("improve security")
// fires help-wanted AND critical together, which hides what each one did.
// The 2 official cases not stepped here ("xss security bug", "app crashes with
// error" + labels) are both reachable as PRESETS on the solution tab.
const CASES = [
  { title: "app crashes with error", labels: [], note: "unlabelled bug → seed" },
  { title: "add dark mode", labels: [], note: "unlabelled feature → seed" },
  { title: "easy a11y fix", labels: ["bug", "needs triage"], note: "easy → good first issue" },
  { title: "planned api migration", labels: ["enhancement", "discussing"], note: "planned → roadmap" },
  { title: "improve security", labels: ["enhancement", "discussing"], note: "stale + security" },
  { title: "security vulnerability in auth", labels: [], note: "no seed, just critical" },
  { title: "add dark mode", labels: ["enhancement", "discussing"], note: "stale, no security → help wanted alone" },
];

const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">triageIssue</span>(<span class="tok" data-t="param">title, labels</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> t = title.<span class="fn">toLowerCase</span>();` },
  { ln: 3, html: `  <span class="k">const</span> out = [...labels];` },
  { ln: 4, html: `  <span class="k">if</span> (<span class="tok" data-t="empty">out.length === 0</span>) {` },
  { ln: 5, html: `    <span class="k">if</span> (<span class="tok" data-t="eb">has("error") || has("bug")</span>) out.<span class="fn">push</span>("bug","needs triage");` },
  { ln: 6, html: `    <span class="k">else if</span> (<span class="tok" data-t="fa">has("feature") || has("add")</span>) out.<span class="fn">push</span>("enhancement","discussing");` },
  { ln: 7, html: `  } <span class="k">else if</span> (<span class="tok" data-t="gfi">out.has("needs triage") &amp;&amp; has("simple"/"easy")</span>) {` },
  { ln: 8, html: `    <span class="fn">drop</span>("needs triage"); out.<span class="fn">push</span>("good first issue");` },
  { ln: 9, html: `  } <span class="k">else if</span> (<span class="tok" data-t="rm">out.has("discussing") &amp;&amp; has("planned"/"next")</span>) {` },
  { ln: 10, html: `    <span class="fn">drop</span>("discussing"); out.<span class="fn">push</span>("on the roadmap");` },
  { ln: 11, html: `  } <span class="k">else if</span> (<span class="tok" data-t="hw">out.has("needs triage") || out.has("discussing")</span>) {` },
  { ln: 12, html: `    <span class="fn">drop</span>(...); out.<span class="fn">push</span>("help wanted");` },
  { ln: 13, html: `  }` },
  { ln: 14, html: `  <span class="k">if</span> (<span class="tok" data-t="sec">has("security")</span>) out.<span class="fn">push</span>("critical");` },
  { ln: 15, html: `  <span class="k">return</span> out;` },
  { ln: 16, html: `}` },
];

function trace(caseIndex) {
  const idx = Math.max(0, Math.min(CASES.length - 1, (caseIndex | 0) - 1));
  const c = CASES[idx];
  const { title } = c;
  const t = title.toLowerCase();
  const has = (s) => t.includes(s);
  let out = c.labels.slice();
  const drop = (l) => { const i = out.indexOf(l); if (i >= 0) out.splice(i, 1); };
  const steps = [];
  const S = (line, note, x = {}) => {
    const vars = { title: `"${title}"` };
    if (line >= 2) vars.t = `"${t}"`;
    const structs = line >= 3 ? [{ label: "out", items: out.slice(), newest: !!x.newest }] : [];
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: "triageIssue", vars, changed: x.changed || [], structs }] });
  };

  S(1, `<b>triageIssue("${title}", [${c.labels.map((l) => `"${l}"`).join(", ")}])</b> — ${c.note}.`, { focus: "param" });
  S(2, `Lowercase the title into <b>t</b> so every keyword test is case-insensitive.`, { changed: ["t"] });
  S(3, `Copy the current labels into <b>out</b> — ${c.labels.length ? `${c.labels.length} to start` : "empty"}.`, { changed: ["out"] });

  const empty = out.length === 0;
  S(4, `Is <b>out</b> empty? → <b>${empty}</b>. ${empty ? "Unlabelled — use the SEEDING rules." : "Already labelled — use the TRIAGE rules."}`,
    { focus: "empty", eval: { expr: "out.length === 0", val: empty } });

  if (empty) {
    const eb = has("error") || has("bug");
    S(5, `title has <b>"error"</b> or <b>"bug"</b>? → <b>${eb}</b>.`, { focus: "eb", eval: { expr: `has("error") || has("bug")`, val: eb } });
    if (eb) { out.push("bug", "needs triage"); S(5, `Seed a bug report: push <b>bug</b> + <b>needs triage</b>.`, { changed: ["out"], newest: true }); }
    else {
      const fa = has("feature") || has("add");
      S(6, `else — title has <b>"feature"</b> or <b>"add"</b>? → <b>${fa}</b>.`, { focus: "fa", eval: { expr: `has("feature") || has("add")`, val: fa } });
      if (fa) { out.push("enhancement", "discussing"); S(6, `Seed a feature: push <b>enhancement</b> + <b>discussing</b>.`, { changed: ["out"], newest: true }); }
      else S(6, `Neither keyword group matched — <b>out</b> stays empty.`, {});
    }
  } else {
    const gfi = out.includes("needs triage") && (has("simple") || has("easy"));
    S(7, `Has <b>needs triage</b> AND title says <b>"simple"/"easy"</b>? → <b>${gfi}</b>.`, { focus: "gfi", eval: { expr: `needs triage & simple|easy`, val: gfi } });
    if (gfi) {
      drop("needs triage"); S(8, `Remove <b>needs triage</b>.`, { changed: ["out"] });
      out.push("good first issue"); S(8, `Add <b>good first issue</b> — a friendly starter.`, { changed: ["out"], newest: true });
    } else {
      const rm = out.includes("discussing") && (has("planned") || has("next"));
      S(9, `else — has <b>discussing</b> AND title says <b>"planned"/"next"</b>? → <b>${rm}</b>.`, { focus: "rm", eval: { expr: `discussing & planned|next`, val: rm } });
      if (rm) {
        drop("discussing"); S(10, `Remove <b>discussing</b>.`, { changed: ["out"] });
        out.push("on the roadmap"); S(10, `Add <b>on the roadmap</b> — it's scheduled.`, { changed: ["out"], newest: true });
      } else {
        const hw = out.includes("needs triage") || out.includes("discussing");
        S(11, `else — is <b>needs triage</b> or <b>discussing</b> still present? → <b>${hw}</b>.`, { focus: "hw", eval: { expr: `needs triage || discussing`, val: hw } });
        if (hw) {
          const which = out.includes("needs triage") ? "needs triage" : "discussing";
          drop(which); S(12, `Stalled — remove <b>${which}</b>.`, { changed: ["out"] });
          out.push("help wanted"); S(12, `Add <b>help wanted</b> to invite contributors.`, { changed: ["out"], newest: true });
        }
      }
    }
  }

  const sec = has("security");
  S(14, `Independent of the branch above: title has <b>"security"</b>? → <b>${sec}</b>.`, { focus: "sec", eval: { expr: `has("security")`, val: sec } });
  if (sec) { out.push("critical"); S(14, `Security issue — always append <b>critical</b>.`, { changed: ["out"], newest: true }); }

  S(15, `Done. <b>Return</b> the updated labels.`, { done: true, result: `[${out.map((l) => `"${l}"`).join(", ")}]` });
  return steps;
}

export default {
  n: 333, id: "triage2", title: "Issue Triage 2", dates: ["2026-07-09"],
  statement: `Given an issue <b>title</b> and its <b>current labels</b>, return the updated labels. When there are no labels, <i>seed</i>: <code class="inl">"error"/"bug"</code> → bug + needs triage, <code class="inl">"feature"/"add"</code> → enhancement + discussing. When already labelled, <i>triage</i> the first matching rule: needs triage + <code class="inl">"simple"/"easy"</code> → good first issue; discussing + <code class="inl">"planned"/"next"</code> → on the roadmap; otherwise drop needs triage/discussing for help wanted. Finally, any <code class="inl">"security"</code> title also appends critical. <span class="rule">Example: <code class="inl">triageIssue("improve security", ["enhancement","discussing"])</code> → <code class="inl">["enhancement","help wanted","critical"]</code>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(labels)",
      approach: `A cascade of mutually-exclusive rules. The empty-vs-labelled check picks a branch; inside it only the <b>first</b> matching rule fires (so good-first-issue, on-the-roadmap, and help-wanted never stack). Removals splice the old label out and pushes append the new one at the end — which is why order is preserved. The <code class="inl">"security" → critical</code> append is separate: it runs after either branch, so it can land on a seeded list, a triaged list, or an otherwise-empty one. Toggle the current labels and edit the title to watch which branch and rule light up.`,
      code: CODE, mount,
    },
    {
      name: "Step through", cost: "line-by-line",
      approach: `A debugger for the rules engine — run <code class="inl">triageIssue</code> one line at a time on a chosen issue. Watch the <b>empty check</b> pick the seeding vs triage branch, each rule's condition evaluate to true/false, the <b>out</b> array splice/push as a rule fires, and the independent <b>security → critical</b> append run at the end. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { label: "case =", value: 1, min: 1, max: CASES.length, presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick an issue` } }),
    },
  ],
};
