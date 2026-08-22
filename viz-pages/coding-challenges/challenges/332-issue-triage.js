// #332 · Issue Triage — age since last post + message content → leave/bump/close.
// One decision runs two conditionals: the 7-day age gate, then a "bump" substring
// test. The Solution draws an age gauge against the 7-day line + a lit decision tree.
import { el, esc, mountDebugger } from "../shared.js";

const DAY = 86_400_000;
const WEEK = 7 * DAY; // 604800000 ms

function triageIssue(ms, message) {
  const days = ms / DAY;
  if (days < 7) return "leave it";
  if (message.toLowerCase().includes("bump")) return "close it";
  return "bump it";
}

const DECIDE = {
  "leave it": { color: "var(--good)", why: "fresh — someone posted within the week" },
  "bump it":  { color: "var(--warn)", why: "stale, nobody has nudged it yet" },
  "close it": { color: "var(--danger)", why: "stale and already bumped — time to close" },
};

// All six official messages, in official-case order.
const MSG_PRESETS = ["Lets fix it", "still waiting", "bump", "Bumping this", "Do we still want this?", "I'll make a PR"];

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .tr-wrap { max-width:640px; margin-top:12px; }
    .tr-row { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin:14px 0 4px; }
    .tr-slider { flex:1; min-width:220px; accent-color:var(--accent); }
    .tr-days { font:800 22px var(--mono); color:var(--accent); white-space:nowrap; }
    .tr-days small { font:600 12px var(--sans); color:var(--muted); }
    .tr-msg { width:100%; box-sizing:border-box; font:14px var(--mono); padding:9px 11px;
              border:1px solid var(--border); border-radius:9px; background:var(--panel-2); color:var(--text); }
    .tr-gauge { position:relative; height:44px; border-radius:10px; border:1px solid var(--border);
                background:var(--panel-2); overflow:hidden; margin:16px 0 6px; }
    .tr-fill { position:absolute; top:0; bottom:0; left:0; opacity:.85; transition:width .18s, background .18s; }
    .tr-thresh { position:absolute; top:-4px; bottom:-4px; width:2px; background:var(--text); z-index:3; }
    .tr-thresh span { position:absolute; top:-18px; left:50%; transform:translateX(-50%); white-space:nowrap;
                      font:700 10px var(--sans); color:var(--text); letter-spacing:.03em; }
    .tr-ticks { position:relative; height:16px; font:10px var(--mono); color:var(--muted); margin-bottom:20px; }
    .tr-tick { position:absolute; transform:translateX(-50%); }
    .tr-bump { display:inline-flex; align-items:center; gap:7px; font:700 12px var(--sans); padding:5px 11px;
               border-radius:20px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .tr-bump.yes { color:var(--danger); border-color:color-mix(in srgb,var(--danger) 50%,var(--border)); }
    .tr-badge { display:inline-flex; align-items:baseline; gap:9px; font:800 26px var(--sans);
                padding:8px 18px; border-radius:12px; border:2px solid; margin:14px 0 6px; }
    .tr-badge small { font:600 12px var(--sans); color:var(--muted); }
    .tr-tree { display:flex; flex-direction:column; gap:6px; margin-top:14px; }
    .tr-node { border:1px solid var(--border); border-radius:9px; background:var(--panel); padding:9px 13px;
               font:700 13px var(--mono); color:var(--muted); opacity:.5; transition:opacity .18s, border-color .18s; }
    .tr-node.on { opacity:1; color:var(--text); border-color:var(--accent);
                  box-shadow:0 0 0 1px color-mix(in srgb,var(--accent) 30%,transparent); }
    .tr-node .ans { float:right; font:700 12px var(--sans); }
    .tr-leaves { display:flex; gap:8px; padding-left:18px; flex-wrap:wrap; }
    .tr-leaf { border:1px solid var(--border); border-radius:8px; padding:6px 12px; font:800 13px var(--mono);
               color:var(--muted); background:var(--panel-2); opacity:.4; transition:opacity .18s; }
    .tr-leaf.taken { opacity:1; }
  `));
}

function mount(host) {
  ensureStyle();
  let days = 10, message = "still waiting";
  const MAXD = 21;

  const wrap = el("div", "tr-wrap");

  // day slider + preset chips
  const row = el("div", "tr-row");
  const slider = el("input", "tr-slider"); slider.type = "range"; slider.min = 0; slider.max = MAXD; slider.step = 1; slider.value = days;
  const daysEl = el("div", "tr-days");
  slider.oninput = () => { days = +slider.value; render(); };
  row.append(daysEl, slider);
  const dayPresets = el("div", "controls");
  [1, 4, 7, 10, 14].forEach((d) => { const c = el("button", "chip", d + "d"); c.onclick = () => { days = d; slider.value = d; render(); }; dayPresets.append(c); });

  // gauge
  const gauge = el("div", "tr-gauge");
  const fill = el("div", "tr-fill");
  const thresh = el("div", "tr-thresh", `<span>7-day line</span>`);
  thresh.style.left = (7 / MAXD * 100) + "%";
  gauge.append(fill, thresh);
  const ticks = el("div", "tr-ticks");
  [0, 7, 14, 21].forEach((t) => { const tk = el("div", "tr-tick", t + "d"); tk.style.left = (t / MAXD * 100) + "%"; ticks.append(tk); });

  // message input + presets
  const msgInp = el("input", "tr-msg"); msgInp.type = "text"; msgInp.value = message; msgInp.placeholder = "last message on the issue…";
  msgInp.oninput = () => { message = msgInp.value; render(); };
  const msgPresets = el("div", "controls");
  MSG_PRESETS.forEach((m) => { const c = el("button", "chip", `"${m}"`); c.onclick = () => { message = m; msgInp.value = m; render(); }; msgPresets.append(c); });

  const out = el("div");
  wrap.append(row, dayPresets, gauge, ticks, el("div", "ctl-label", "last message on the issue"), msgInp, msgPresets, out);
  host.append(wrap);

  function render() {
    const ms = days * DAY;
    const hasBump = message.toLowerCase().includes("bump");
    const decision = triageIssue(ms, message);
    const meta = DECIDE[decision];
    const ageOK = days < 7; // "fresh"

    daysEl.innerHTML = `${days}<small> day${days === 1 ? "" : "s"} old</small>`;
    fill.style.width = Math.min(days / MAXD * 100, 100) + "%";
    fill.style.background = meta.color;

    out.innerHTML = `
      <div class="tr-row">
        <span class="tr-bump ${hasBump ? "yes" : ""}">${hasBump ? "✓ contains “bump”" : "no “bump” in message"}</span>
      </div>
      <div class="tr-badge" style="border-color:${meta.color};color:${meta.color}">
        ${esc(decision)} <small>${meta.why}</small>
      </div>
      <div class="tr-tree">
        <div class="tr-node on">age &lt; 7 days?<span class="ans" style="color:${ageOK ? "var(--good)" : "var(--danger)"}">${ageOK ? "yes" : "no"}</span></div>
        <div class="tr-leaves"><div class="tr-leaf ${ageOK ? "taken" : ""}" style="${ageOK ? "color:var(--good);border-color:var(--good)" : ""}">→ leave it</div></div>
        <div class="tr-node ${ageOK ? "" : "on"}">contains “bump”?<span class="ans" style="color:${ageOK ? "var(--muted)" : hasBump ? "var(--danger)" : "var(--warn)"}">${ageOK ? "—" : hasBump ? "yes" : "no"}</span></div>
        <div class="tr-leaves">
          <div class="tr-leaf ${!ageOK && hasBump ? "taken" : ""}" style="${!ageOK && hasBump ? "color:var(--danger);border-color:var(--danger)" : ""}">→ close it</div>
          <div class="tr-leaf ${!ageOK && !hasBump ? "taken" : ""}" style="${!ageOK && !hasBump ? "color:var(--warn);border-color:var(--warn)" : ""}">→ bump it</div>
        </div>
      </div>`;
  }
  render();
}

const CODE = `function triageIssue(ms: number, message: string): string {
  const days = ms / 86_400_000;          // ms → days
  if (days < 7) return "leave it";       // still fresh
  if (message.toLowerCase().includes("bump"))
    return "close it";                   // stale + already bumped
  return "bump it";                      // stale, needs a nudge
}`;

// ── STEP — triageIssue line-by-line. The input is an (ms, message) pair, so we
// curate the given test cases and pick one by index, like the song-mood debugger.
const CASES = [
  { ms: 86400000,   msg: "Lets fix it",            note: "1 day old → stays" },
  { ms: 1209600000, msg: "still waiting",          note: "14 days, no bump → nudge" },
  { ms: 864000000,  msg: "bump",                   note: "10 days, already bumped → close" },
  { ms: 604800000,  msg: "Do we still want this?", note: "exactly 7 days, no bump" },
  { ms: 604800000,  msg: "Bumping this",           note: "exactly 7 days, “Bumping” matches" },
  { ms: 345600000,  msg: "I'll make a PR",         note: "4 days old → stays" },
];

const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">triageIssue</span>(<span class="tok" data-t="param">ms, message</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> days = <span class="tok" data-t="days">ms / 86400000</span>;` },
  { ln: 3, html: `  <span class="k">if</span> (<span class="tok" data-t="age">days &lt; 7</span>) <span class="k">return</span> <span class="st">"leave it"</span>;` },
  { ln: 4, html: `  <span class="k">const</span> hasBump = <span class="tok" data-t="bump">message.toLowerCase().includes(<span class="st">"bump"</span>)</span>;` },
  { ln: 5, html: `  <span class="k">if</span> (<span class="tok" data-t="hb">hasBump</span>) <span class="k">return</span> <span class="st">"close it"</span>;` },
  { ln: 6, html: `  <span class="k">return</span> <span class="st">"bump it"</span>;` },
  { ln: 7, html: `}` },
];

function trace(caseIndex) {
  const idx = Math.max(0, Math.min(CASES.length - 1, (caseIndex | 0) - 1));
  const { ms, msg } = CASES[idx];
  const steps = [];
  let days, hasBump;
  const S = (line, note, x = {}) => {
    const vars = { ms, message: `"${msg}"` };
    if (line >= 2) vars.days = days;
    if (line >= 4) vars.hasBump = String(hasBump);
    steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: "triageIssue", vars, changed: x.changed || [], structs: [], ret: x.ret }] });
  };

  S(1, `Case ${idx + 1} — <b>triageIssue(${ms}, "${esc(msg)}")</b>. ${ms} ms since the last post, deciding what to do with the issue.`,
    { focus: "param", changed: ["ms", "message"] });

  days = ms / DAY;
  S(2, `Convert ms → days: <b>${ms} / 86400000 = ${days}</b> day${days === 1 ? "" : "s"}.`,
    { focus: "days", changed: ["days"] });

  const fresh = days < 7;
  S(3, `Is it fresh? <b>${days} &lt; 7</b> → <b>${fresh}</b>.${fresh ? " Someone posted within the week — leave it." : " A week or more has passed."}`,
    { focus: "age", eval: { expr: `${days} < 7`, val: fresh } });
  if (fresh) {
    S(3, `Fresh — <b>return "leave it"</b>.`, { focus: "age", ret: { value: `"leave it"` }, done: true, result: "leave it" });
    return steps;
  }

  hasBump = msg.toLowerCase().includes("bump");
  S(4, `Stale. Does the message contain <b>"bump"</b> (case-insensitive)? Lowercase <b>"${esc(msg.toLowerCase())}"</b> → <b>${hasBump}</b>.`,
    { focus: "bump", changed: ["hasBump"] });

  S(5, `Check <b>hasBump</b> → <b>${hasBump}</b>.${hasBump ? " Already bumped — close it." : " Never bumped — it just needs a nudge."}`,
    { focus: "hb", eval: { expr: `hasBump`, val: hasBump } });
  if (hasBump) {
    S(5, `Bumped already — <b>return "close it"</b>.`, { focus: "hb", ret: { value: `"close it"` }, done: true, result: "close it" });
    return steps;
  }

  S(6, `Stale but never bumped — <b>return "bump it"</b>.`, { focus: null, ret: { value: `"bump it"` }, done: true, result: "bump it" });
  return steps;
}

export default {
  n: 332, id: "triage", title: "Issue Triage", dates: ["2026-07-08"],
  statement: `Given the milliseconds since the last post on an issue and that last message, decide what to do: if the last message is <b>less than 7 days</b> ago, <code class="inl">"leave it"</code>; if it's <b>7 or more days</b> ago and its text contains <b>"bump"</b> (case-insensitive), <code class="inl">"close it"</code>; otherwise <code class="inl">"bump it"</code>. <span class="rule">Example: <code class="inl">triageIssue(864000000, "bump")</code> → <code class="inl">"close it"</code> (10 days old, already bumped).</span>`,
  variants: [
    { name: "Solution", cost: "O(1) · 2 checks",
      approach: `Convert the millisecond age to days (<code class="inl">ms / 86_400_000</code>). The first gate is the <b>7-day line</b>: anything newer is <code class="inl">"leave it"</code>. Past the line, a single case-insensitive <code class="inl">includes("bump")</code> splits the rest — a message that already says "bump" gets <code class="inl">"close it"</code>, everything else gets <code class="inl">"bump it"</code>. Note 7 days is exactly on the "stale" side (<code class="inl">days &lt; 7</code> is false at 7). Drag the age past the line and type a message to watch the tree relight.`,
      code: CODE, mount },
    { name: "Step through", cost: "line-by-line",
      approach: `A debugger for <code class="inl">triageIssue</code> on each given test case. Watch <b>days = ms / 86400000</b>, the <b>days &lt; 7</b> gate short-circuit to <code class="inl">"leave it"</code>, then the <b>contains "bump"</b> test decide between <code class="inl">"close it"</code> and <code class="inl">"bump it"</code>. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { label: "case =", value: 1, min: 1, max: CASES.length, presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick a case` } }) },
  ],
};
