// #360 · Spoken Duration — drop the zero units first, and the join stops being positional.
// ONE approach: divmod is three lines and no one gets it wrong. The whole problem
// is the English list join, and it is hard only *because* the zeros are dropped
// first — after the drop you may hold 3, 2, 1 or 0 parts, so the comma and the
// "and" can't be attached to "hours" or to "minutes". They belong to positions in
// whatever list survived. Watch case 5 (14455) or case 8 (3601): knock minutes to
// zero in the demo and the comma disappears without anything else moving.
import { el, esc, mountDebugger } from "../shared.js";

// ── the solution, shared by the demo and the trace ───────────────────────────
const UNITS = ["hour", "minute", "second"];
const DIVS = [3600, 60, 1];
// The three counts, largest unit first. Each is "how many whole X are left once
// the bigger units have taken their share".
const splitUnits = (secs) => [Math.floor(secs / 3600), Math.floor(secs / 60) % 60, secs % 60];
// Singular/plural is a per-unit decision made from that unit's own count.
const phrase = (n, unit) => `${n} ${unit}${n === 1 ? "" : "s"}`;
// Drop FIRST. This is the line that makes the join interesting.
const partsOf = (secs) => splitUnits(secs).map((n, i) => [n, UNITS[i]]).filter(([n]) => n > 0).map(([n, u]) => phrase(n, u));
const joinParts = (parts) =>
  parts.length === 0 ? "0 seconds"
    : parts.length === 1 ? parts[0]
      : parts.slice(0, -1).join(", ") + " and " + parts.at(-1);
const spoken = (secs) => joinParts(partsOf(secs));

// Cases 1–7 are freeCodeCamp's official set, in the order the grader lists them;
// each lands on a different shape (3 parts with the hour singular / the minute
// singular / the second singular, 2 parts with the hours dropped, 2 parts with
// the MINUTES dropped, 1 part plural, 1 part singular). 8 and 9 are ours:
//   8 — 3601 → "1 hour and 1 second". Same hole in the middle as official case 5,
//       but with both survivors SINGULAR, which case 5 (plural/plural) can't show.
//       It is the smallest input where a position-based join — "comma after the
//       hours" — prints the tell-tale "1 hour, and 1 second".
//   9 — 0 → nothing survives the drop at all. freeCodeCamp never tests it, so the
//       wording is a decision of ours rather than the challenge's; see the note.
const CASES = [3723, 7295, 8521, 435, 14455, 72000, 1, 3601, 0];
const MAX_SECS = 86399; // 23:59:59 — one second short of a day, and it spans every official case

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .sd-units { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; margin:16px 0 0; }
    @media (max-width:560px){ .sd-units { grid-template-columns:1fr; } }
    .sd-cell { border:1px solid var(--border); border-radius:10px; background:var(--panel-2); padding:9px 12px 9px; }
    .sd-cell.zero { border-style:dashed; background:transparent; opacity:.5; }
    .sd-u { font:700 10px var(--sans); letter-spacing:.08em; text-transform:uppercase; color:var(--muted); }
    .sd-expr { font:11px var(--mono); color:var(--muted); margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .sd-n { font:800 27px var(--mono); font-variant-numeric:tabular-nums; line-height:1.15; margin-top:1px; }
    .sd-cell.zero .sd-n { color:var(--muted); }
    .sd-say { font:700 13px var(--mono); color:var(--good); margin-top:2px; min-height:19px; }
    .sd-cell.zero .sd-say { color:var(--muted); font-weight:600; font-style:italic; }
    .sd-step { display:flex; gap:5px; margin-top:9px; }
    .sd-parts { display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-top:16px; min-height:30px; }
    .sd-part { font:700 13px var(--mono); padding:4px 9px; border-radius:7px;
               border:1px solid var(--good); color:var(--good); background:color-mix(in srgb, var(--good) 12%, transparent); }
    .sd-gone { font:600 12.5px var(--mono); color:var(--muted); text-decoration:line-through; padding:4px 2px; }
    .sd-line { font:800 19px var(--mono); margin:14px 0 2px; line-height:1.55; word-break:break-word; }
    .sd-w { color:var(--good); }
    .sd-sep { border-radius:4px; padding:0 3px; font-weight:900; }
    .sd-sep.comma { color:var(--warn); background:color-mix(in srgb, var(--warn) 20%, transparent); }
    .sd-sep.and { color:var(--accent); background:color-mix(in srgb, var(--accent) 20%, transparent); }
    .sd-rule { font:12.5px var(--mono); color:var(--muted); margin-top:11px; line-height:1.75; }
    .sd-rule b { color:var(--text); }
    .sd-rule .hit { color:var(--accent); font-weight:700; }
    .sd-rule .amber { color:var(--warn); font-weight:700; }
  `));
}

// The sentence with its punctuation called out: the comma is amber, the "and" is
// accent, so you can see them appear and disappear as units are dropped.
function sentenceHtml(parts) {
  if (!parts.length) return `<span class="muted">nothing survived — </span><span class="sd-w">0 seconds</span>`;
  const w = parts.map((p) => `<span class="sd-w">${esc(p)}</span>`);
  if (w.length === 1) return w[0];
  return w.slice(0, -1).join(`<span class="sd-sep comma">,</span> `) +
    ` <span class="sd-sep and">and</span> ` + w.at(-1);
}

function mount(host) {
  ensureStyle();

  let secs = CASES[0];

  const num = el("input"); num.type = "number"; num.min = 0; num.max = MAX_SECS; num.style.width = "110px";
  const slider = el("input"); slider.type = "range"; slider.min = 0; slider.max = MAX_SECS; slider.step = 1;
  slider.style.flex = "1"; slider.style.minWidth = "180px"; slider.style.accentColor = "var(--accent)";

  const ctl = el("div", "controls");
  ctl.append(el("span", "ctl-label", "seconds ="), num, slider);

  const pre = el("div", "controls");
  CASES.forEach((c, i) => {
    const chip = el("button", "chip", c + (i < 7 ? "" : " ✎"));
    chip.title = `${c} → "${spoken(c)}"`;
    chip.onclick = () => set(c);
    pre.append(chip);
  });

  const out = el("div");
  host.append(
    el("div", "note", 'Set any number of seconds — type it, drag the slider, or nudge one unit at a time with the <b>−</b>/<b>+</b> buttons under it. The chips are freeCodeCamp\'s seven official cases plus two of ours (✎). <b>The interaction to try:</b> load <code class="inl">3723</code> and knock <b>minutes</b> down to zero. The minute cell greys out, the parts list drops to two — and the comma vanishes on its own, because it never belonged to "hours" in the first place.'),
    ctl, pre, out,
  );

  const clamp = (v) => Math.max(0, Math.min(MAX_SECS, Math.floor(Number.isFinite(v) ? v : 0)));
  function set(v) { secs = clamp(v); num.value = secs; slider.value = secs; render(); }
  num.oninput = () => set(+num.value);
  slider.oninput = () => set(+slider.value);
  set(secs);

  function render() {
    const counts = splitUnits(secs);
    const parts = partsOf(secs);
    out.innerHTML = "";

    // ── the divmod, one cell per unit; a zero cell greys out and says so ──
    const cells = el("div", "sd-units");
    counts.forEach((n, i) => {
      const cell = el("div", "sd-cell" + (n === 0 ? " zero" : ""));
      cell.append(
        el("div", "sd-u", UNITS[i] + "s"),
        el("div", "sd-expr", i === 0 ? "floor(s / 3600)" : i === 1 ? "floor(s / 60) % 60" : "s % 60"),
        el("div", "sd-n", String(n)),
        el("div", "sd-say", n === 0 ? "skipped" : `“${phrase(n, UNITS[i])}”`),
      );
      const step = el("div", "sd-step");
      const minus = el("button", "chip", "−");
      const plus = el("button", "chip", "+");
      minus.disabled = n === 0;
      minus.onclick = () => set(secs - DIVS[i]);
      plus.onclick = () => set(secs + DIVS[i]);
      step.append(minus, plus);
      cell.append(step);
      cells.append(cell);
    });
    out.append(cells);

    // ── what survived the drop, in order ──
    const row = el("div", "sd-parts");
    counts.forEach((n, i) => {
      row.append(n === 0
        ? el("span", "sd-gone", UNITS[i] + "s")
        : el("span", "sd-part", phrase(n, UNITS[i])));
    });
    row.append(el("span", "tag", `parts.length = ${parts.length}`));
    out.append(row);

    // ── the assembled sentence, punctuation highlighted ──
    out.append(el("div", "sd-line", sentenceHtml(parts)));
    out.append(el("div", "result-line",
      `<span class="muted mono">getSpokenDuration(${secs}) =</span>` +
      `<span class="num right">"${esc(spoken(secs))}"</span>`));

    // ── which arm of the join fired, and why that arm ──
    const k = parts.length;
    const rule = el("div", "sd-rule");
    rule.innerHTML =
      (k >= 3
        ? `<span class="hit">${k} parts</span> → <b>slice(0, -1)</b> is <b>[${parts.slice(0, -1).map((p) => `"${esc(p)}"`).join(", ")}]</b>, and <b>join(", ")</b> puts a <span class="amber">comma</span> in each gap between them. Then one <span class="hit">and</span> in front of the last.`
        : k === 2
          ? `<span class="hit">2 parts</span> → the same expression, with nothing special about it: <b>slice(0, -1)</b> holds a <b>single</b> item, and a one-item <b>join(", ")</b> has no gap to put a comma in. The <span class="hit">and</span> is all that's left.`
          : k === 1
            ? `<span class="hit">1 part</span> → returned untouched. There is no second part, so there is no separator to place — and the guard is what stops <b>slice(0, -1)</b> from handing <b>join</b> an empty list.`
            : `<span class="hit">0 parts</span> → only <b>0</b> does this. "Skip any zero values" taken literally leaves an empty string, which is not a spoken duration; freeCodeCamp publishes no test for this input, so <b>"0 seconds"</b> is our call, not the grader's.`) +
      (counts[0] > 0 && counts[1] === 0 && counts[2] > 0
        ? `<br><span class="amber">Minutes are missing from the middle.</span> Code that writes its comma after the <b>hours</b> — because they're hours — would say <b>"${esc(phrase(counts[0], "hour"))}, and ${esc(phrase(counts[2], "second"))}"</b>. The punctuation belongs to a <i>position in the surviving list</i>, and that list is two long now.`
        : "") +
      (counts.some((n) => n === 1)
        ? `<br>A count of <b>1</b> drops the <b>"s"</b> — decided from that unit's own number, so <b>"${esc(spoken(secs))}"</b> can mix singular and plural freely.`
        : "");
    out.append(rule);
  }
}

// ── STEP — the same function with filter/map unrolled into one for..of ───────
// The solution's `.filter().map()` is written out as an explicit loop here so the
// DROP has a line of its own (line 9) and the reader can watch `parts` grow — or
// not — one unit at a time. `units` becomes a struct as soon as line 2 runs and
// stays for the whole call; `parts` appears at line 7; `n` and `unit` are bound
// by the for..of header, so they live only inside the body and only while the
// loop is actually running (the `inLoop` flag drops them again on the exit step).
const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">getSpokenDuration</span>(<span class="tok" data-t="seconds">seconds</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> <span class="tok" data-t="units">units</span> = [` },
  { ln: 3,  html: `    [<span class="tok" data-t="h">Math.<span class="fn">floor</span>(seconds / <span class="st">3600</span>)</span>, <span class="st">"hour"</span>],` },
  { ln: 4,  html: `    [<span class="tok" data-t="m">Math.<span class="fn">floor</span>(seconds / <span class="st">60</span>) % <span class="st">60</span></span>, <span class="st">"minute"</span>],` },
  { ln: 5,  html: `    [<span class="tok" data-t="s">seconds % <span class="st">60</span></span>, <span class="st">"second"</span>],` },
  { ln: 6,  html: `  ];` },
  { ln: 7,  html: `  <span class="k">const</span> <span class="tok" data-t="parts">parts = []</span>;` },
  { ln: 8,  html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="pair">[n, unit]</span> <span class="k">of</span> units) {` },
  { ln: 9,  html: `    <span class="k">if</span> (<span class="tok" data-t="drop">n === <span class="st">0</span></span>) <span class="k">continue</span>;  <span class="cm">// "skip any zero values"</span>` },
  { ln: 10, html: `    parts.<span class="fn">push</span>(<span class="tok" data-t="push">\`\${n} \${unit}\${n === <span class="st">1</span> ? <span class="st">""</span> : <span class="st">"s"</span>}\`</span>);` },
  { ln: 11, html: `  }` },
  { ln: 12, html: `  <span class="k">if</span> (<span class="tok" data-t="zero">parts.length === <span class="st">0</span></span>) <span class="k">return</span> <span class="st">"0 seconds"</span>;` },
  { ln: 13, html: `  <span class="k">if</span> (<span class="tok" data-t="one">parts.length === <span class="st">1</span></span>) <span class="k">return</span> parts[<span class="st">0</span>];` },
  { ln: 14, html: `  <span class="k">return</span> <span class="tok" data-t="head">parts.<span class="fn">slice</span>(<span class="st">0</span>, -<span class="st">1</span>).<span class="fn">join</span>(<span class="st">", "</span>)</span> + <span class="tok" data-t="and"><span class="st">" and "</span> + parts.<span class="fn">at</span>(-<span class="st">1</span>)</span>;` },
  { ln: 15, html: `}` },
];

const q = (s) => `"${s}"`;

function trace(caseIndex) {
  const k = Math.max(1, Math.min(CASES.length, caseIndex | 0));
  const secs = CASES[k - 1];
  const counts = splitUnits(secs);
  const steps = [];

  const units = [];      // grows one pair per line as 3, 4 and 5 run
  const parts = [];
  let n, unit, inLoop = false;

  // Scope by omission, gated on the line that brings each name into being.
  // `n` and `unit` are the for..of bindings: lines 8–10, and only while the loop
  // body is live. `units` and `parts` are function-scoped consts, so once their
  // declaration line has run they stay in the panel for the rest of the call.
  const S = (line, note, x = {}) => {
    const vars = { seconds: secs };
    if (inLoop && line >= 8 && line <= 10) { vars.n = n; vars.unit = q(unit); }
    const structs = [];
    if (line >= 2) structs.push({ label: "units", items: units.slice(), newest: !!x.unitNew });
    if (line >= 7) structs.push({ label: "parts", items: parts.map(q), newest: !!x.pushed });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `getSpokenDuration(${secs})`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Say <b>${secs}</b> seconds out loud. The division is the easy half — what the answer will <i>look</i> like isn't decided here, it's decided by how many units survive line 9.`, { focus: "seconds" });

  S(2, `<b>units</b> holds <b>[count, word]</b> pairs rather than three loose numbers. The count and its word have to travel together, because the plural is read off the count and nothing downstream could recover <code class='inl'>"hour"</code> from a bare <b>${counts[0]}</b>.`, { focus: "units" });

  units.push(`[${counts[0]}, "hour"]`);
  S(3, `<b>floor(${secs} / 3600) = ${counts[0]}</b> — whole hours only. The fraction thrown away here isn't lost; it's exactly what the next two lines are made of.`, { focus: "h", unitNew: true });

  units.push(`[${counts[1]}, "minute"]`);
  S(4, `<b>floor(${secs} / 60)</b> is <b>${Math.floor(secs / 60)}</b> — <i>every</i> minute in the input, including the ones already spoken as hours. <code class='inl'>% 60</code> hands back only the <b>${counts[1]}</b> that no hour has claimed.`, { focus: "m", unitNew: true });

  units.push(`[${counts[2]}, "second"]`);
  S(5, `<b>${secs} % 60 = ${counts[2]}</b> — the remainder once whole minutes are taken out. ${counts[0]}×3600 + ${counts[1]}×60 + ${counts[2]} = <b>${secs}</b>, so nothing has been invented or dropped yet.`, { focus: "s", unitNew: true });

  S(7, `<b>parts</b> starts empty. It is deliberately a <i>list</i> and not three variables: after the next loop its <b>length</b> — not which units are in it — is the only thing the punctuation will be allowed to look at.`, { focus: "parts" });

  counts.forEach((cnt, i) => {
    inLoop = true;
    n = cnt; unit = UNITS[i];
    S(8, `Unit ${i + 1} of 3: <b>n = ${n}</b>, <b>unit = ${q(unit)}</b>. Each pair is offered to the same two lines, so no unit gets a rule of its own.`, { focus: "pair", changed: ["n", "unit"] });

    S(9, n === 0
      ? `<b>${n} === 0</b>, so <code class='inl'>continue</code> — the spec says "skip any zero values". <b>This is the line that makes the join hard.</b> Dropping <b>${unit}s</b> <i>now</i>, before a single comma exists, means everything after it slides up a position — so no punctuation can ever be pinned to "the ${unit === "second" ? "last" : unit} slot".`
      : `<b>${n} === 0</b> is false, so <b>${unit}s</b> is worth saying and the loop falls through to the push.`,
      { focus: "drop", eval: { expr: `n (${n}) === 0`, val: n === 0 } });

    if (n === 0) return;

    parts.push(phrase(n, unit));
    S(10, `Push <b>${q(phrase(n, unit))}</b>. The plural is settled from <b>this pair's own count</b>: <code class='inl'>${n} === 1</code> is <b>${n === 1}</b>, so ${n === 1 ? `no <code class='inl'>"s"</code>` : `an <code class='inl'>"s"</code>`}. The other units get no vote — which is why <code class='inl'>"2 hours, 1 minute and 35 seconds"</code> is allowed to mix the two.`,
      { focus: "push", pushed: true });
  });

  inLoop = false;
  const kept = parts.length;
  S(8, `All three pairs have been offered, so the <code class='inl'>for…of</code> ends and <b>n</b> / <b>unit</b> leave scope — that's why they vanish from the frame. <b>parts</b> kept <b>${kept}</b> of 3, and from here the hour/minute/second identity is <i>gone</i>: only order and count remain.`,
    { focus: "pair", eval: { expr: "another pair?", val: false } });

  S(12, kept === 0
    ? `<b>parts.length === 0</b> → <b>true</b>. Every unit was zero, which only happens for an input of <b>0</b>. Taken literally, "skip the zeros" leaves an empty string — not a spoken duration. freeCodeCamp publishes no test for this input, so <b>"0 seconds"</b> is a choice we're making, not one the grader forced.`
    : `<b>parts.length === 0</b> → <b>false</b>. Something survived, so the empty case doesn't apply. This guard exists only for <b>0</b>.`,
    { focus: "zero", eval: { expr: `parts.length (${kept}) === 0`, val: kept === 0 } });

  if (kept === 0) {
    S(12, `<b>Return "0 seconds"</b>.`, { focus: "zero", done: true, result: "0 seconds", ret: { value: "0 seconds" } });
    return steps;
  }

  S(13, kept === 1
    ? `<b>parts.length === 1</b> → <b>true</b>. One part means there is no gap between parts, so there is nothing to punctuate — return it exactly as built. This guard is also what keeps line 14 from calling <code class='inl'>join</code> on an <i>empty</i> head and gluing a stray <code class='inl'>" and "</code> to the front.`
    : `<b>parts.length === 1</b> → <b>false</b> — there are <b>${kept}</b> parts, so a separator is genuinely needed and line 14 gets to run.`,
    { focus: "one", eval: { expr: `parts.length (${kept}) === 1`, val: kept === 1 } });

  if (kept === 1) {
    S(13, `<b>Return ${q(parts[0])}</b> — the single surviving unit, unpunctuated.`, { focus: "one", done: true, result: parts[0], ret: { value: parts[0] } });
    return steps;
  }

  const head = parts.slice(0, -1);
  S(14, `<code class='inl'>slice(0, -1)</code> takes everything but the last part: <b>[${head.map(q).join(", ")}]</b>. <code class='inl'>join(", ")</code> then fills the gaps <i>between</i> those — ${head.length === 1
    ? `and with a single item there are no gaps, so it emits <b>${q(head[0])}</b> with <b>no comma at all</b>. That is why two parts need no branch of their own.`
    : `${head.length - 1} gap${head.length - 1 === 1 ? "" : "s"}, so <b>${head.length - 1}</b> comma${head.length - 1 === 1 ? "" : "s"}: <b>${q(head.join(", "))}</b>.`}`,
    { focus: "head" });

  const answer = joinParts(parts);
  S(14, `Then <code class='inl'>" and "</code> exactly once, in front of <b>${q(parts.at(-1))}</b> — the last part, whichever unit that turned out to be. <b>Return ${q(answer)}</b>.`,
    { focus: "and", done: true, result: answer, ret: { value: answer } });

  return steps;
}

export default {
  n: 360, id: "duration", title: "Spoken Duration", dates: ["2026-08-05"],
  statement: `Given a number of <b>seconds</b>, return the duration in spoken English. Break it into hours, minutes and seconds, <b>skip any zero values</b>, and use the singular or plural form of each unit. Join the last two survivors with <code class="inl">"and"</code>, and separate earlier ones with commas — <code class="inl">getSpokenDuration(3723)</code> → <b>"1 hour, 2 minutes and 3 seconds"</b>. <span class="rule">The catch: the zeros are dropped <i>before</i> anything is joined, so the punctuation depends on <b>how many</b> units survived, never on which ones they are. <code class="inl">getSpokenDuration(14455)</code> → <b>"4 hours and 55 seconds"</b> — the comma is gone because the minutes are.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(1) — 3 units",
      approach: `Two divisions and a modulo give the three counts; that half is never the problem. <b>Then drop the zeros — and notice that you have just made the join harder.</b> Before the drop the answer had three fixed slots and you could hard-code "comma after hours, <i>and</i> before seconds". After it you might be holding three parts, two, one, or none, and the units left standing may not be adjacent — so the punctuation has to be read off the <i>list</i>, not off the units.<br><br>One expression covers three and two: <code class='inl'>parts.slice(0, -1).join(", ")</code> commas everything except the last part, then <code class='inl'>" and " + parts.at(-1)</code> attaches it. With two parts the head is a single item, and a one-item <code class='inl'>join</code> emits no comma at all — so <code class='inl'>"4 hours and 55 seconds"</code> falls out with no branch. Only <b>one</b> part needs a guard, because there is then no last-versus-rest to speak of. Plurals are decided per unit from that unit's own count, which is what lets <code class='inl'>"2 hours, 1 minute and 35 seconds"</code> mix them.<br><br><b>On zero:</b> freeCodeCamp ships seven tests and none of them is <code class='inl'>0</code>, so the empty-list arm is unguided. "Skip every value" would return <code class='inl'>""</code>; this returns <code class='inl'>"0 seconds"</code> instead, which is a decision of ours and marked as such in the demo.`,
      code: `// Divide the seconds into three units, DROP the zero ones, and only then join.
// Dropping first is what makes the join the interesting half: the surviving
// list can be 3, 2, 1 or 0 long, so the punctuation cannot be pinned to a
// fixed unit — it has to be decided by how many parts are left.
function getSpokenDuration(seconds: number): string {
  const units: [number, string][] = [
    [Math.floor(seconds / 3600), "hour"],
    [Math.floor(seconds / 60) % 60, "minute"],
    [seconds % 60, "second"],
  ];

  // Drop the zeros, and let each survivor pick its own singular/plural. The
  // two decisions are independent: "1 hour, 2 minutes and 3 seconds".
  const parts = units
    .filter(([n]) => n > 0)
    .map(([n, unit]) => \`\${n} \${unit}\${n === 1 ? "" : "s"}\`);

  // Nothing survived — only possible for 0. The grader never asks (skipping
  // every unit would leave an empty string), so this is our choice, not its.
  if (parts.length === 0) return "0 seconds";

  // One survivor: no separator exists to get wrong.
  if (parts.length === 1) return parts[0];

  // Two or more: everything but the last comma-separated, then " and " once.
  // With two parts slice(0, -1) is a single item and join(", ") adds no comma,
  // which is why "4 hours and 55 seconds" needs no branch of its own.
  return parts.slice(0, -1).join(", ") + " and " + parts.at(-1);
}`,
      mount,
    },
    {
      name: "Step through", cost: "drop, then join",
      approach: `The same function with <code class='inl'>.filter().map()</code> unrolled into one <code class='inl'>for..of</code>, so the <b>drop</b> gets a line of its own (line 9) and you can watch <code class='inl'>parts</code> either grow or not, one unit at a time. Case <b>5</b> (<code class='inl'>14455</code>, the default) is the one to step through: the minute pair is skipped on line 9, and by line 14 the head of the list is a <i>single</i> item, so <code class='inl'>join(", ")</code> prints no comma — same expression, different shape. Case <b>8</b> (<code class='inl'>3601</code>) does it with both survivors singular; case <b>9</b> (<code class='inl'>0</code>) empties the list entirely and lands on the one arm freeCodeCamp never tests. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: {
          label: "case =", value: 5, min: 1, max: CASES.length,
          presets: CASES.map((_, i) => i + 1),
          hint: `1–${CASES.length}: 1–7 official, 8–9 ours`,
        },
      }),
    },
  ],
};
