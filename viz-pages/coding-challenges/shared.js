// shared.js — the thin membrane every challenge module shares.
//
// THE CONTRACT (deliberately tiny — everything else is freedom):
//   A challenge file default-exports an object:
//     { n, id, title, dates, statement, variants: [ variant, ... ] }
//   A variant:
//     { name, tone?, cost?, approach?, code?, mount(host) }
//
//   • mount(host) receives an EMPTY <div> and may do ANYTHING — build DOM, SVG,
//     <canvas>, inject its own <style>, pull a CDN module. The scaffold never
//     dictates what a demo looks like; it only supplies the tab, the problem
//     statement, and (when variants.length > 1) the basic↔optimized toggle.
//   • tone: "brute" | "opt" | "" — only tints the toggle pill + cost badge.
//   • cost: a short complexity string shown above the demo ("O(n²)", "O(4ⁿ)"…).
//   • approach/code: optional right-rail prose + TS source. Omit them and the
//     rail collapses — a demo that wants the whole width just leaves them out.
//
// Adding a challenge = drop one file in challenges/ + one import line in
// registry.js. No build step (the /viz single-file exporter bundles siblings).
//
// code is a template literal, so escape a literal backtick as \` and a literal
// ${ as \${ (most solutions need neither).

import { $, $$, esc, saveHash, loadHash } from "/_kit/viz.js";
import { PATTERNS, spotFor, patternFor } from "./patterns.js";
export { $, $$, esc };

// Build an element in one call. el("div","cls","<b>hi</b>")
export function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

// Tiny TS-ish highlighter — single scan (regex passes corrupt their own markup).
export function hl(src) {
  const KW = new Set("type interface function const let var return if else for of in while case switch break continue new typeof instanceof true false null undefined void unknown any number string boolean never Record Array Set Map Math JSON Object Partial extends as import export default from".split(" "));
  let out = "", i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") { let j = src.indexOf("\n", i); if (j < 0) j = src.length; out += `<span class="cm">${esc(src.slice(i, j))}</span>`; i = j; continue; }
    if (c === '"' || c === "'" || c === "`") { let j = i + 1; while (j < src.length && src[j] !== c) { if (src[j] === "\\") j++; j++; } j++; out += `<span class="st">${esc(src.slice(i, j))}</span>`; i = j; continue; }
    if (/[A-Za-z_$]/.test(c)) { let j = i; while (j < src.length && /[A-Za-z0-9_$]/.test(src[j])) j++; const w = src.slice(i, j); out += KW.has(w) ? `<span class="kw">${w}</span>` : esc(w); i = j; continue; }
    if (/[0-9]/.test(c)) { let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++; out += `<span class="nu">${src.slice(i, j)}</span>`; i = j; continue; }
    out += esc(c); i++;
  }
  return out;
}

// A challenge MAY use this to render its code block, or ignore it and roll its own.
export const codeBlock = (src) => `<pre class="code">${hl(src.replace(/^\n/, "").replace(/\s+$/, ""))}</pre>`;

// Every module states its own `dates: ["YYYY-MM-DD", ...]` — one entry per day
// the module covers (a normal daily has one; #295 merges a six-part series).
// Nothing is computed from the challenge number; the link is a substitution.
const fccDailyUrl = (iso) =>
  `https://www.freecodecamp.org/learn/daily-coding-challenge/${iso}`;

// The "original problem" link: an explicit url wins, else the FIRST day's daily.
const originalUrl = (c, src) => c.url || (src === "fcc" && c.dates?.length ? fccDailyUrl(c.dates[0]) : null);

// The eyebrow's trailing link(s). One day → a single "original ↗". A merged
// multi-day series → one numbered link per day, so every part is reachable.
const originalLinks = (c, src) => {
  if (c.url || src !== "fcc" || !c.dates?.length) {
    const u = originalUrl(c, src);
    return u ? ` · <a class="orig" href="${esc(u)}" target="_blank" rel="noopener">original&nbsp;↗</a>` : "";
  }
  if (c.dates.length === 1)
    return ` · <a class="orig" href="${esc(fccDailyUrl(c.dates[0]))}" target="_blank" rel="noopener">original&nbsp;↗</a>`;
  const parts = c.dates.map((d, i) =>
    `<a class="orig" href="${esc(fccDailyUrl(d))}" target="_blank" rel="noopener" title="Part ${i + 1} — ${esc(d)}">${i + 1}</a>`
  ).join(" ");
  return ` · <span class="origs">originals&nbsp;↗ ${parts}</span>`;
};

// Eyebrow label, derived so it can never disagree with the dates themselves:
// one date → "Jul 11"; a run of days → "Jun 1–6". A module may override with an
// explicit `difficulty` (LeetCode has no daily date to show).
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayLabel = (iso, withMonth = true) => {
  const [y, m, d] = iso.split("-").map(Number);
  return withMonth ? `${MON[m - 1]} ${d}` : String(d);
};
const dateLabel = (c) => {
  if (c.difficulty) return c.difficulty;
  const ds = c.dates || [];
  if (!ds.length) return "";
  if (ds.length === 1) return dayLabel(ds[0]);
  const first = ds[0], last = ds[ds.length - 1];
  const sameMonth = first.slice(0, 7) === last.slice(0, 7);
  return `${dayLabel(first)}–${dayLabel(last, !sameMonth)}`;
};

// ── The gallery scaffold ──────────────────────────────────────────────────
// Renders tabs + one <section> per challenge, each with a variant toggle. Owns
// only chrome + wiring; the interesting pixels come from each variant's mount().
export function mountGallery(challenges, tabsEl, mainEl) {
  const hash = loadHash();
  let active = challenges.some(c => c.id === hash.tab) ? hash.tab : challenges[0].id;
  const vsel = Object.fromEntries(challenges.map(c => [c.id, 0]));
  if (hash.tab && hash.v != null && vsel[hash.tab] != null) vsel[hash.tab] = hash.v;
  let activePattern = null;

  challenges.forEach((c, i) => {
    // source drives the visual distinction between fCC dailies and LeetCode problems.
    const src = c.source || "fcc";
    const pat = patternFor(c), spot = spotFor(c);
    const srcShort = src === "leetcode" ? "LC" : "fCC";
    const srcName = src === "leetcode" ? "LeetCode" : "freeCodeCamp";
    const tab = el("button", "tab", `<span class="srcbadge src-${src}">${srcShort}</span><span class="n">${c.n ?? i + 1}</span>${esc(c.title)}`);
    tab.dataset.id = c.id;
    tab.dataset.source = src;
    tab.onclick = () => select(c.id);
    tabsEl.append(tab);

    // A module that merges a multi-day series has an "original" per day, so link
    // them all — "originals: 1 2 3 4 5 6" — rather than silently dropping five of
    // six behind a single link to day one.
    const orig = originalLinks(c, src);
    const sec = el("section", "problem");
    sec.dataset.id = c.id;
    sec.innerHTML =
      `<div class="eyebrow"><span class="srcpill src-${src}">${srcName}</span> · ${esc(dateLabel(c))}${c.n ? ` · #${c.n}` : ""} · <button class="pat-link" data-pat="${esc(pat)}" title="Filter to ${esc(pat)} problems">${esc(pat)}</button>${orig}</div>` +
      `<h2 class="ptitle">${esc(c.title)}</h2>` +
      `<div class="statement">${c.statement}</div>` +
      (spot ? `<div class="spot"><span class="spot-k">How to spot it</span><span class="spot-b">${spot}</span></div>` : "") +
      `<div class="variant-bar"></div>` +
      `<div class="layout"><div class="demo-col"><div class="demo-head"></div><div class="demo"></div></div><aside></aside></div>`;
    mainEl.append(sec);

    const bar = $(".variant-bar", sec);
    if (c.variants.length > 1) {
      bar.append(el("span", "vlab", "Approach"));
      const sw = el("div", "vswitch");
      c.variants.forEach((v, vi) => {
        const pill = el("button", "vpill " + (v.tone || "") + (vi === vsel[c.id] ? " on" : ""), `<span class="dot"></span>${esc(v.name)}`);
        pill.onclick = () => {
          vsel[c.id] = vi;
          [...sw.children].forEach((p, pi) => p.classList.toggle("on", pi === vi));
          renderVariant(c, sec);
          persist();
        };
        sw.append(pill);
      });
      bar.append(sw);
      const arrow = c.variants.length === 2 ? " → " : " · ";
      bar.append(el("span", "vstep", c.variants.map(v => esc(v.name)).join(arrow)));
    } else {
      bar.style.display = "none";
    }
    renderVariant(c, sec);
  });

  // ── Pattern filter / index bar ────────────────────────────────────────────
  // Lists every pattern present (with counts); clicking one narrows the tabs to
  // that family and reveals its "tell" — the signal that points to the technique.
  const patCounts = {};
  challenges.forEach(c => { const p = patternFor(c); patCounts[p] = (patCounts[p] || 0) + 1; });
  const patNames = Object.keys(patCounts).sort((a, b) => ((PATTERNS[a] && PATTERNS[a].order) || 99) - ((PATTERNS[b] && PATTERNS[b].order) || 99));
  const patBar = el("div", "patternbar");
  const patChips = el("div", "pat-chips");
  const patTell = el("div", "pat-tell"); patTell.style.display = "none";
  const mkChip = (name, count, isAll) => {
    const chip = el("button", "pat-chip" + (isAll ? " on" : ""), `${esc(name)}<span class="pc">${count}</span>`);
    chip.dataset.pat = isAll ? "" : name;
    if (!isAll && PATTERNS[name]) chip.title = PATTERNS[name].tell.replace(/<[^>]+>/g, "");
    chip.onclick = () => setPattern(isAll ? null : name);
    return chip;
  };
  patChips.append(mkChip("All", challenges.length, true));
  patNames.forEach(p => patChips.append(mkChip(p, patCounts[p], false)));
  patBar.append(el("span", "pat-lead", "Recognise the pattern"), patChips, patTell);
  tabsEl.before(patBar);

  // clicking the pattern label in a problem's eyebrow filters to that family
  mainEl.addEventListener("click", (e) => {
    const link = e.target.closest(".pat-link");
    if (!link) return;
    setPattern(link.dataset.pat || null);
    patBar.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  function setPattern(name) {
    activePattern = name;
    [...patChips.children].forEach(ch => ch.classList.toggle("on", (ch.dataset.pat || "") === (name || "")));
    patTell.innerHTML = name && PATTERNS[name] ? `<b>${esc(name)} —</b> ${PATTERNS[name].tell}` : "";
    patTell.style.display = name ? "block" : "none";
    applyFilter();
    persist();
  }
  function applyFilter() {
    const tabs = [...tabsEl.querySelectorAll(".tab")];
    tabs.forEach(t => {
      const c = challenges.find(x => x.id === t.dataset.id);
      t.style.display = (!activePattern || patternFor(c) === activePattern) ? "" : "none";
    });
    const activeTab = tabs.find(t => t.dataset.id === active);
    if (activeTab && activeTab.style.display === "none") {
      const firstVisible = tabs.find(t => t.style.display !== "none");
      if (firstVisible) select(firstVisible.dataset.id);
    }
  }
  function persist() { saveHash({ tab: active, v: vsel[active], pat: activePattern || undefined }); }

  function renderVariant(c, sec) {
    const v = c.variants[vsel[c.id]];
    $(".demo-head", sec).innerHTML = v.cost ? `<span class="cost ${v.tone || ""}">${esc(v.cost)}</span>` : "";
    const demo = $(".demo", sec);
    demo.innerHTML = "";
    try { v.mount(demo); }
    catch (err) { demo.innerHTML = `<div class="note" style="border-color:var(--danger);color:var(--danger)">demo error: ${esc(err.message)}</div>`; console.error(`[${c.id}]`, err); }
    $("aside", sec).innerHTML =
      (v.approach ? `<div class="approach"><h3>How it works</h3><p>${v.approach}</p></div>` : "") +
      (v.code ? `<h3>Solution · TypeScript</h3>${codeBlock(v.code)}` : "");
  }

  function select(id) {
    active = id;
    $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.id === id));
    $$("section.problem").forEach(s => s.classList.toggle("active", s.dataset.id === id));
    persist();
  }
  select(active);
  if (hash.pat && patNames.includes(hash.pat)) setPattern(hash.pat);
}

// ── mountDebugger — a reusable "step through the code" engine ────────────────
// A challenge supplies its OWN instrumented run (a bespoke trace() — there is no
// generic JS interpreter here, on purpose: hand-written traces give real narration
// and exact scope). This engine owns everything reusable: the code viewer + line
// cursor + sub-token spotlight, the call-STACK panel (many frames for recursion,
// one for a loop), the condition/return panels, and the Step/Back/scrubber/Auto
// transport. Scope is expressed by the trace: a variable that's out of scope is
// simply absent from its frame's vars, so it vanishes from the panel.
//
//   cfg.source : [{ ln, html }]           source lines; html may carry <span class="tok" data-t="…">
//   cfg.trace  : (input) => Step[]         instrumented run
//   cfg.input  : { label, value, min, max, presets, hint }
//   Step = { line, focus?, note,
//            frames: [{ title, vars:{k:v}, changed?:[k], structs?:[{label,items,newest?}], ret?:{value} }],
//            eval?: { expr, val }, done?, result? }   // frames: bottom→top, last = active
let dbgStyled = false;
function ensureDbgStyle() {
  if (dbgStyled) return; dbgStyled = true;
  document.head.append(el("style", null, `
    .dbg { display:grid; grid-template-columns:minmax(0,1fr); gap:14px; }
    @media (min-width:760px){ .dbg { grid-template-columns:minmax(300px,1.1fr) minmax(250px,.9fr); align-items:start; } }
    .dbg-code { background:#0a0e14; border:1px solid var(--border); border-radius:10px; padding:10px 0; font:12.5px/1.75 var(--mono); overflow:auto; max-height:360px; }
    .dbg-line { display:grid; grid-template-columns:34px 1fr; align-items:baseline; white-space:pre; padding-right:10px; }
    .dbg-gutter { color:var(--muted); opacity:.45; text-align:right; padding-right:10px; user-select:none; }
    .dbg-line.on { background:color-mix(in srgb, var(--accent) 16%, transparent); }
    .dbg-line.on .dbg-gutter { color:var(--accent); opacity:1; }
    .dbg-line.on .dbg-gutter::after { content:"▸"; margin-left:2px; }
    .dbg-code .k { color:#ff7b72; } .dbg-code .fn { color:#d2a8ff; } .dbg-code .st { color:#a5d6ff; }
    .tok { border-radius:3px; padding:0 2px; }
    .dbg-line.on .tok.hot { background:var(--warn); color:#0a0e14; font-weight:700; }
    .dbg-state { display:flex; flex-direction:column; gap:9px; }
    .dbg-stack { display:flex; flex-direction:column; gap:6px; }
    .dbg-stack-lbl { font:700 10px var(--sans); letter-spacing:.07em; text-transform:uppercase; color:var(--muted); }
    .dbg-frame { border:1px solid var(--border); border-radius:10px; background:var(--panel); padding:8px 11px; }
    .dbg-frame.caller { opacity:.5; }
    .dbg-frame.active { border-color:var(--accent); box-shadow:0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent); }
    .dbg-frame.ret { border-color:var(--good); box-shadow:0 0 0 1px color-mix(in srgb, var(--good) 30%, transparent); }
    .dbg-frame h4 { margin:0; font:700 12px var(--mono); color:var(--text); display:flex; justify-content:space-between; gap:8px; align-items:baseline; }
    .dbg-frame h4 .tag2 { font:700 9.5px var(--sans); letter-spacing:.05em; text-transform:uppercase; color:var(--muted); white-space:nowrap; }
    .dbg-frame.active h4 { color:var(--accent); }
    .dbg-frame.ret h4 .tag2 { color:var(--good); }
    .dbg-vars { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
    .dbg-var { min-width:48px; border:1px solid var(--border); border-radius:7px; padding:4px 9px; background:var(--panel-2); }
    .dbg-var .lbl { font:700 10.5px var(--mono); color:var(--accent); }
    .dbg-var .val { font:800 17px var(--mono); font-variant-numeric:tabular-nums; color:var(--text); max-width:150px; overflow:hidden; text-overflow:ellipsis; }
    .dbg-var.flash { animation:dbgflash .65s ease; }
    @keyframes dbgflash { 0%{ background:var(--warn); } 100%{ background:var(--panel-2);} }
    .dbg-slbl { font:700 10.5px var(--mono); color:var(--accent); margin:8px 0 4px; }
    .dbg-items { display:flex; gap:5px; flex-wrap:wrap; align-items:center; min-height:28px; }
    .dbg-box { min-width:28px; height:28px; padding:0 7px; display:flex; align-items:center; justify-content:center; font:800 13px var(--mono); border-radius:6px; background:color-mix(in srgb, var(--good) 15%, transparent); border:1px solid var(--good); color:var(--good); }
    .dbg-box.newest { animation:dbgpop .45s cubic-bezier(.2,1.4,.4,1); }
    @keyframes dbgpop { 0%{ transform:scale(.3); opacity:0;} 100%{ transform:scale(1); opacity:1;} }
    .dbg-eval { font:13px var(--mono); }
    .dbg-eval .r-t { color:var(--good); font-weight:800; } .dbg-eval .r-f { color:var(--danger); font-weight:800; }
    .dbg-out { font:800 16px var(--mono); color:var(--good); }
    .dbg-narr { border-left:2px solid var(--accent); padding:7px 0 7px 12px; color:var(--text); font-size:13px; line-height:1.5; min-height:40px; }
    .dbg-ctl { display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin:12px 0 4px; }
    .dbg-btn { font:700 12px var(--sans); background:var(--panel-2); border:1px solid var(--border); border-radius:8px; padding:7px 12px; cursor:pointer; color:var(--text); }
    .dbg-btn:hover:not(:disabled){ border-color:var(--accent); }
    .dbg-btn.primary { background:var(--accent); color:var(--bg); border-color:var(--accent); }
    .dbg-btn:disabled { opacity:.3; cursor:default; }
    .dbg-scrub { flex:1; min-width:110px; accent-color:var(--accent); }
    .dbg-count { font:700 12px var(--mono); color:var(--muted); white-space:nowrap; }
  `));
}

export function mountDebugger(host, cfg) {
  ensureDbgStyle();
  if (host.__dbgTimer) { clearInterval(host.__dbgTimer); host.__dbgTimer = null; } // cancel a prior mount's autoplay
  const inC = cfg.input || {};

  const isText = inC.type === "text"; // ponytail: opt-in string input; numeric path below unchanged
  const ctlTop = el("div", "controls");
  const inp = el("input"); inp.type = isText ? "text" : "number"; inp.value = inC.value ?? (isText ? "" : 0);
  if (!isText) { if (inC.min != null) inp.min = inC.min; if (inC.max != null) inp.max = inC.max; }
  inp.style.width = isText ? "220px" : "90px";
  ctlTop.append(el("span", "ctl-label", inC.label || "input ="), inp);
  if (inC.hint) ctlTop.append(el("span", "ctl-label", "(" + inC.hint + ")"));
  const presets = el("div", "controls");
  (inC.presets || []).forEach((v) => { const c = el("button", "chip", String(v)); c.onclick = () => { inp.value = v; load(); }; presets.append(c); });

  const ctl = el("div", "dbg-ctl");
  const bReset = el("button", "dbg-btn", "⏮ Reset"), bBack = el("button", "dbg-btn", "◀ Back"),
        bStep = el("button", "dbg-btn primary", "Step ▶"), bPlay = el("button", "dbg-btn", "▶ Auto");
  const scrub = el("input"); scrub.type = "range"; scrub.min = 0; scrub.value = 0; scrub.className = "dbg-scrub";
  const count = el("span", "dbg-count", "");
  ctl.append(bReset, bBack, bStep, bPlay, scrub, count);

  const narr = el("div", "dbg-narr");
  const grid = el("div", "dbg");
  const codeEl = el("div", "dbg-code"), stateEl = el("div", "dbg-state");
  grid.append(codeEl, stateEl);
  host.append(ctlTop, presets, ctl, narr, grid);

  cfg.source.forEach((s) => {
    const row = el("div", "dbg-line"); row.dataset.ln = s.ln;
    row.innerHTML = `<span class="dbg-gutter">${s.ln}</span><span>${s.html}</span>`;
    codeEl.append(row);
  });
  const lineEls = [...codeEl.querySelectorAll(".dbg-line")];

  let steps = [], i = 0;
  function load() {
    let v;
    if (isText) { v = String(inp.value); }
    else {
      v = Math.floor(+inp.value); if (isNaN(v)) v = inC.value ?? 0;
      if (inC.min != null) v = Math.max(inC.min, v); if (inC.max != null) v = Math.min(inC.max, v);
      inp.value = v;
    }
    steps = cfg.trace(v); i = 0; scrub.max = Math.max(0, steps.length - 1); stop(); render();
  }
  function render() {
    const st = steps[i];
    lineEls.forEach((r) => {
      const on = +r.dataset.ln === st.line;
      r.classList.toggle("on", on);
      r.querySelectorAll(".tok").forEach((t) => t.classList.toggle("hot", on && t.dataset.t === st.focus));
    });
    const cur = codeEl.querySelector(".dbg-line.on"); if (cur) cur.scrollIntoView({ block: "nearest" });
    narr.innerHTML = st.note;

    stateEl.innerHTML = "";
    const frames = st.frames || [];
    const stack = el("div", "dbg-stack");
    stack.append(el("div", "dbg-stack-lbl", `Call stack · ${frames.length} frame${frames.length === 1 ? "" : "s"}`));
    [...frames].reverse().forEach((fr, ri) => {
      const active = ri === 0;
      const card = el("div", "dbg-frame" + (fr.ret ? " ret" : active ? " active" : " caller"));
      card.append(el("h4", null, `<span>${esc(fr.title)}</span><span class="tag2">${fr.ret ? "⏎ returns " + esc(String(fr.ret.value)) : active ? "running" : "waiting"}</span>`));
      const changed = new Set(fr.changed || []);
      if (fr.vars && Object.keys(fr.vars).length) {
        const vars = el("div", "dbg-vars");
        for (const [k, v] of Object.entries(fr.vars)) {
          vars.append(el("div", "dbg-var" + (changed.has(k) ? " flash" : ""), `<div class="lbl">${esc(k)}</div><div class="val">${esc(String(v))}</div>`));
        }
        card.append(vars);
      }
      (fr.structs || []).forEach((s) => {
        card.append(el("div", "dbg-slbl", `${esc(s.label)}[${s.items.length}]`));
        const box = el("div", "dbg-items");
        if (!s.items.length) box.append(el("span", "muted", "(empty)"));
        s.items.forEach((it, ii) => box.append(el("div", "dbg-box" + (s.newest && ii === s.items.length - 1 ? " newest" : ""), esc(String(it)))));
        card.append(box);
      });
      stack.append(card);
    });
    stateEl.append(stack);

    if (st.eval) stateEl.append(el("div", "dbg-frame dbg-eval", `<h4><span>Evaluating the condition</span></h4><div style="margin-top:7px">${esc(st.eval.expr)} &nbsp;→&nbsp; <span class="r-${st.eval.val ? "t" : "f"}">${st.eval.val}</span></div>`));
    if (st.done) stateEl.append(el("div", "dbg-frame", `<h4><span>Return value</span></h4><div class="dbg-out" style="margin-top:7px">${esc(String(st.result))}</div>`));

    scrub.value = i; count.textContent = `step ${i + 1} / ${steps.length}`;
    bBack.disabled = bReset.disabled = i === 0; bStep.disabled = i === steps.length - 1;
  }
  function go(j) { i = Math.max(0, Math.min(steps.length - 1, j)); render(); if (i === steps.length - 1) stop(); }
  function stop() { if (host.__dbgTimer) { clearInterval(host.__dbgTimer); host.__dbgTimer = null; } bPlay.classList.remove("primary"); bPlay.textContent = "▶ Auto"; }
  function play() {
    if (host.__dbgTimer) { stop(); return; }
    if (i === steps.length - 1) go(0);
    bPlay.classList.add("primary"); bPlay.textContent = "❚❚ Pause";
    host.__dbgTimer = setInterval(() => { if (!host.isConnected || i >= steps.length - 1) { stop(); return; } go(i + 1); }, 760);
  }
  bStep.onclick = () => go(i + 1); bBack.onclick = () => { stop(); go(i - 1); };
  bReset.onclick = () => { stop(); go(0); }; bPlay.onclick = play;
  scrub.oninput = () => { stop(); go(+scrub.value); };
  inp.onchange = load; inp.onkeydown = (e) => { if (e.key === "Enter") load(); };
  load();
}
