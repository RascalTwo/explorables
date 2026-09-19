// #305 · Idea Rankings — the sort key isn't in the data, and part of it is the name's length.
// The recipe is two multiplications and a sort. What makes it worth a module is the
// second multiplication: after the PERT three-point estimate
//   (optimistic + 4 * realistic + pessimistic) / 6
// the spec multiplies by the LENGTH OF THE IDEA'S NAME. That is absurd — renaming a
// ticket cannot make it take longer — and it is also the spec, so it ships as written.
// It is not decoration either: it is what decides the ranking. On freeCodeCamp's own
// case 5 it swaps two ideas relative to their raw estimates, and on the invented
// "exact reversal" case it turns the ranking completely upside down.
//
// ONE approach, which is the normal outcome (CONTRIBUTING Tier 3). There is no
// wasteful act to name here — the work is one pass, one sort, one pass, and the only
// alternatives are *wrong* rather than slower. So the three ways to get it wrong ship
// as a comparison readout inside the demo, not as a second graded tab:
//   scored.sort()                 → objects stringify to "[object Object]", nothing moves
//   expected.sort()               → numbers compared as TEXT, 180 lands before 26.67
//   (a, b) => a.mean - b.mean     → the name-length factor quietly dropped
// Two graded variants must never disagree on the answer, and all three of those do.
//
// Ties: none of the five official cases produces one, so the grader never constrains
// tie order. Case 7 is invented to produce an exact 72 = 72, and the module relies on
// Array.prototype.sort being STABLE (required since ES2019) to keep the tied pair in
// input order. That reliance is stated rather than left implicit, because a derived
// key collides far more often than raw data does.
import { el, esc, mountDebugger } from "../shared.js";

// ── The solution itself, split so the demo, the comparison rows and the trace all
// share it and cannot drift. ──
const meanOf = (o, r, p) => (o + 4 * r + p) / 6;
const expectedOf = (name, o, r, p) => meanOf(o, r, p) * name.length;
// 67.83333333333334 is true but unreadable; the ordering never depends on the tail.
const fmt = (x) => Number(x.toFixed(2));

// Cases 1–5 are freeCodeCamp's five official tests, in the order the grader lists
// them. Cases 6–9 are invented. Cases 1–8 each land on a different branch or outcome;
// case 9 is the one deliberate exception, and says so:
//   1  ranking matches the raw estimates       → the control; here the multiplier changes nothing
//   2  a 9-char name against a 31-char one     → the widest length spread in the official set
//   3  four ideas, expecteds 180 / 26.67 / …   → a bare .sort() on the numbers breaks HERE (text order)
//   4  the biggest estimates in the set, and the LONGEST name still ranks first → length isn't destiny
//   5  official proof the multiplier matters   → "Analyze user patterns" (mean 10.5) beats
//                                                "Optimize continuous integration" (mean 8.67)
//                                                only because it is 21 chars against 31
//   6  invented: the expected ranking is the EXACT REVERSE of the raw-estimate ranking
//   7  invented: an exact TIE (6 × 12 = 4 × 18 = 72) → only stability decides the order
//   8  invented: a single idea                 → the comparator is never called at all
//   9  invented: optimistic == realistic == pessimistic. Called out as the exception to
//      the rule above: this one is a DEGENERATE-INPUT CONTROL, not a distinct branch.
//      There is no o === r === p path in the code and nothing here is skipped — it takes
//      the identical route through meanOf, expectedOf and the sort as every other case.
//      It earns its chip by making the weighting visible: with no spread, (e + 4e + e)/6
//      collapses to e exactly, which shows the 4 and the /6 are a weighted average rather
//      than a fudge factor. Read it as the reference input the other eight are measured
//      against, not as a ninth path.
const CASES = [
  { label: "agrees with estimates", ideas: [["Add logging", 2, 5, 15], ["SEO optimization", 4, 8, 20], ["Fix bug", 1, 3, 5]] },
  { label: "9 vs 31 chars", ideas: [["Dark mode", 1, 3, 8], ["Real-time collaboration feature", 6, 12, 20], ["Add tooltip", 1, 2, 4]] },
  { label: "text-sort trap", ideas: [["Update user profile page", 3, 7, 14], ["Add pagination", 2, 5, 10], ["Add tags", 2, 3, 6], ["Fix login bug", 1, 4, 8]] },
  { label: "longest name first", ideas: [["Migrate database", 14, 25, 40], ["Add chat assistant", 8, 15, 24], ["Redesign onboarding flow", 3, 7, 13], ["Add language support", 6, 11, 18]] },
  { label: "length flips two", ideas: [["Add email notifications", 3, 7, 10], ["Migrate deployment flow", 6, 10, 16], ["Add push notifications", 2, 6, 10], ["Optimize continuous integration", 5, 8, 15], ["Analyze user patterns", 5, 10, 18], ["Create onboarding curriculum", 6, 15, 25]] },
  { label: "exact reversal", ideas: [["Fix typo", 4, 5, 6], ["Add dark mode", 3, 4, 5], ["Rewrite the entire billing engine", 1, 2, 3]] },
  { label: "exact tie", ideas: [["Add API keys", 3, 6, 9], ["Rotate API secrets", 2, 4, 6], ["Fix flaky test", 1, 2, 3]] },
  { label: "one idea", ideas: [["Ship it", 1, 2, 3]] },
  { label: "no spread", ideas: [["Bump deps", 1, 1, 1], ["Rename a variable", 2, 2, 2], ["Delete dead code", 3, 3, 3]] },
];

// Order helpers used by the comparison card. Each is a real one-line mistake except
// the last, which is what the module returns.
const decorate = (ideas) => ideas.map(([name, o, r, p]) => ({ name, mean: meanOf(o, r, p), len: name.length, expected: expectedOf(name, o, r, p) }));
const byNoComparator = (s) => s.slice();                                        // "[object Object]" everywhere → all ties → unchanged
const byText = (s) => s.slice().sort((a, b) => (String(a.expected) < String(b.expected) ? -1 : String(a.expected) > String(b.expected) ? 1 : 0));
const byMean = (s) => s.slice().sort((a, b) => a.mean - b.mean);                // the × name.length factor dropped
const byExpected = (s) => s.slice().sort((a, b) => a.expected - b.expected);    // the answer
const names = (s) => s.map((x) => x.name);
const same = (a, b) => JSON.stringify(names(a)) === JSON.stringify(names(b));

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .idr-card { border:1px solid var(--border); border-radius:12px; overflow:hidden; background:var(--panel); }
    .idr-row { display:grid; grid-template-columns:24px minmax(110px,1.6fr) 46px repeat(3, minmax(50px,.8fr)) 84px 26px;
               align-items:center; gap:9px; padding:7px 11px; }
    .idr-row + .idr-row { border-top:1px solid var(--border); }
    .idr-row.idr-head { background:var(--panel-2); font:700 9.5px var(--sans); letter-spacing:.07em;
                        text-transform:uppercase; color:var(--muted); padding:8px 11px; }
    .idr-rn { font:700 12px var(--mono); color:var(--muted); }
    .idr-row input[type=text] { width:100%; min-width:0; }
    .idr-row input[type=range] { width:100%; min-width:0; accent-color:var(--accent); height:16px; }
    .idr-len { font:800 12px var(--mono); color:var(--warn); white-space:nowrap; }
    .idr-est { display:flex; flex-direction:column; gap:1px; }
    .idr-est .v { font:700 11px var(--mono); color:var(--muted); font-variant-numeric:tabular-nums; }
    .idr-exp { font:800 15px var(--mono); color:var(--accent); font-variant-numeric:tabular-nums; text-align:right; }
    .idr-x { width:24px; height:24px; border-radius:6px; cursor:pointer; font:700 12px var(--sans);
             background:var(--panel-2); border:1px solid var(--border); color:var(--muted); }
    .idr-x:hover:not(:disabled) { border-color:var(--danger); color:var(--danger); }
    .idr-x:disabled { opacity:.3; cursor:default; }

    .idr-rank { border:1px solid var(--border); border-radius:12px; overflow:hidden; margin:12px 0 0; }
    .idr-brow { display:grid; grid-template-columns:26px minmax(90px,180px) minmax(0,1fr) 74px;
                align-items:center; gap:10px; padding:8px 12px; }
    .idr-brow + .idr-brow { border-top:1px solid var(--border); }
    .idr-brow.idr-tie { background:color-mix(in srgb, var(--warn) 8%, transparent); }
    .idr-pos { font:800 12px var(--mono); color:var(--muted); }
    .idr-nm { font:700 12.5px var(--mono); color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .idr-sub { font:10.5px var(--mono); color:var(--muted); }
    .idr-sub .cw { color:var(--warn); }
    .idr-track { position:relative; height:19px; }
    .idr-bar { position:absolute; top:0; left:0; height:19px; border-radius:5px;
               background:color-mix(in srgb, var(--accent) 20%, transparent);
               border:1px solid color-mix(in srgb, var(--accent) 55%, var(--border));
               transition:width .22s ease; }
    .idr-mean { position:absolute; top:0; left:0; height:19px; min-width:2px; border-radius:5px 0 0 5px;
                background:color-mix(in srgb, var(--warn) 45%, transparent);
                border-right:1px solid var(--warn); transition:width .22s ease; }
    .idr-bnum { font:800 14px var(--mono); color:var(--accent); text-align:right; font-variant-numeric:tabular-nums; }

    .idr-cmp { border:1px solid var(--border); border-radius:12px; overflow:hidden; margin:12px 0 0; }
    .idr-c { display:grid; grid-template-columns:minmax(0,215px) auto minmax(0,1fr); align-items:baseline;
             gap:12px; padding:9px 12px; font:11.5px var(--mono); }
    .idr-c + .idr-c { border-top:1px solid var(--border); }
    .idr-lab { font:700 9px var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--muted); white-space:nowrap; }
    .idr-ord { color:var(--muted); overflow:hidden; text-overflow:ellipsis; }
    .idr-c.bad .idr-lab { color:var(--danger); }
    .idr-c.bad .idr-ord { color:var(--danger); }
    .idr-c.ship { background:color-mix(in srgb, var(--accent) 8%, transparent); }
    .idr-c.ship .idr-lab, .idr-c.ship .idr-ord { color:var(--accent); }
  `));
}

// ── DEMO — an editable idea table over a live ranking. Renaming an idea changes no
// estimate at all and still moves its bar, which is the one thing about this spec a
// reader is likely to misread. ──
function mount(host) {
  ensureStyle();
  // Opens on the invented "exact reversal" case: every raw estimate says one order and
  // every expected time says the opposite, so the multiplier cannot be read as noise.
  let ideas = CASES[5].ideas.map(([name, o, r, p]) => ({ name, o, r, p }));

  const pre = el("div", "controls");
  CASES.forEach((c) => {
    const chip = el("button", "chip", esc(c.label));
    chip.onclick = () => { ideas = c.ideas.map(([name, o, r, p]) => ({ name, o, r, p })); build(); };
    pre.append(chip);
  });

  const card = el("div", "idr-card");
  const addBar = el("div", "controls");
  const add = el("button", "chip", "+ add idea");
  add.onclick = () => { ideas.push({ name: "New idea", o: 2, r: 4, p: 8 }); build(); };
  addBar.append(add);
  const out = el("div");

  host.append(
    el("div", "note", "<b>Rename an idea</b> and watch its bar grow one notch per character — no estimate changed. Drag the three sliders to move the PERT mean. The amber stub inside each bar is the mean <i>before</i> the multiplier; the rest of the bar is the name."),
    pre, card, addBar, out,
  );
  build();

  // The table DOM is rebuilt only when the SHAPE changes (preset, add, remove) —
  // typing in a name must not tear down the input the caret is sitting in.
  function build() {
    card.innerHTML = "";
    const head = el("div", "idr-row idr-head");
    ["#", "idea name", "chars", "optim.", "realis.", "pessim.", "expected", ""].forEach((h) => head.append(el("div", null, h)));
    card.append(head);

    ideas.forEach((idea, i) => {
      const row = el("div", "idr-row");
      row.append(el("div", "idr-rn", String(i + 1)));

      const nm = el("input"); nm.type = "text"; nm.value = idea.name;
      nm.oninput = () => { idea.name = nm.value; refresh(); };
      row.append(nm);

      const len = el("div", "idr-len", `× ${idea.name.length}`);
      row.append(len);

      ["o", "r", "p"].forEach((k) => {
        const cell = el("div", "idr-est");
        const v = el("div", "v", String(idea[k]));
        const sl = el("input"); sl.type = "range"; sl.min = 1; sl.max = 40; sl.step = 1; sl.value = idea[k];
        sl.oninput = () => { idea[k] = +sl.value; v.textContent = sl.value; refresh(); };
        cell.append(v, sl);
        row.append(cell);
      });

      const exp = el("div", "idr-exp", String(fmt(expectedOf(idea.name, idea.o, idea.r, idea.p))));
      row.append(exp);

      const kill = el("button", "idr-x", "×");
      kill.title = "drop this idea";
      kill.disabled = ideas.length <= 1;
      kill.onclick = () => { ideas.splice(i, 1); build(); };
      row.append(kill);

      card.append(row);
      row.__sync = () => {
        len.textContent = `× ${idea.name.length}`;
        exp.textContent = String(fmt(expectedOf(idea.name, idea.o, idea.r, idea.p)));
      };
    });
    refresh();
  }

  // Everything downstream of the inputs. Recomputed on every keystroke and drag.
  function refresh() {
    [...card.querySelectorAll(".idr-row")].forEach((r) => r.__sync && r.__sync());

    const scored = decorate(ideas.map((i) => [i.name, i.o, i.r, i.p]));
    const sorted = byExpected(scored);
    const max = Math.max(...sorted.map((s) => s.expected), 1);

    out.innerHTML = "";
    const rank = el("div", "idr-rank");
    sorted.forEach((s, i) => {
      const tie = sorted.some((o, j) => j !== i && o.expected === s.expected);
      const row = el("div", "idr-brow" + (tie ? " idr-tie" : ""));
      row.append(el("div", "idr-pos", String(i + 1)));
      row.append(el("div", null,
        `<div class="idr-nm">${esc(s.name)}</div>` +
        `<div class="idr-sub">${fmt(s.mean)} <span class="cw">× ${s.len} chars</span>${tie ? " · tie" : ""}</div>`));
      const track = el("div", "idr-track");
      // Clear the name entirely and length is 0, so expected is 0 — a legal input
      // that would otherwise put NaN in a width.
      track.innerHTML =
        `<div class="idr-bar" style="width:${(s.expected / max) * 100}%">` +
        `<div class="idr-mean" style="width:${s.expected ? (s.mean / s.expected) * 100 : 0}%"></div></div>`;
      row.append(track, el("div", "idr-bnum", String(fmt(s.expected))));
      rank.append(row);
    });
    out.append(rank);

    // Three ways to lose, one way to win — the missing-comparator bug belongs here
    // rather than in a graded tab, because it returns a wrong order (Tier 1 §3).
    const noCmp = byNoComparator(scored), text = byText(scored), mean = byMean(scored);
    const cmp = el("div", "idr-cmp");
    const row = (cls, expr, tag, list) => {
      const r = el("div", "idr-c " + cls);
      r.append(el("div", null, esc(expr)), el("div", "idr-lab", tag),
               el("div", "idr-ord", esc(names(list).join(" · "))));
      cmp.append(r);
    };
    row(same(noCmp, sorted) ? "" : "bad", "scored.sort()", same(noCmp, sorted) ? "unchanged — but right" : "unchanged — wrong", noCmp);
    row(same(text, sorted) ? "" : "bad", "expected.sort()", same(text, sorted) ? "text order — agrees" : "text order — wrong", text);
    row(same(mean, sorted) ? "" : "bad", "(a,b) => a.mean - b.mean", same(mean, sorted) ? "no × length — agrees" : "no × length — wrong", mean);
    row("ship", "(a,b) => a.expected - b.expected", "returned", sorted);
    out.append(cmp);

    out.append(el("div", "result-line", `<span class="tag">returns</span> <span class="mono">[${esc(names(sorted).map((n) => `"${n}"`).join(", "))}]</span>`));

    const flipped = !same(mean, sorted);
    const ties = sorted.filter((s, i) => sorted.some((o, j) => j !== i && o.expected === s.expected));
    out.append(el("div", "note", flipped
      ? `The name-length factor <b>changed the answer</b> here. By the estimates alone the order would be <b>${esc(names(mean).join(" · "))}</b>; multiplying each mean by its name's character count gives <b>${esc(names(sorted).join(" · "))}</b>. Nothing about the work changed — only the labels.`
      : `On this input the multiplier does <b>not</b> reorder anything: the estimate ranking and the expected ranking agree. That is the dangerous shape — the factor is invisible until name lengths and estimates disagree. Try <b>exact reversal</b> or <b>length flips two</b>.`));

    if (ties.length) {
      out.append(el("div", "note", `<b>${esc(ties[0].name)}</b> and <b>${esc(ties[1].name)}</b> both come out at <b>${fmt(ties[0].expected)}</b> — ${fmt(ties[0].mean)} × ${ties[0].len} against ${fmt(ties[1].mean)} × ${ties[1].len}. The comparator returns <b>0</b>, which is not "either order": <code class='inl'>Array.prototype.sort</code> has been required to be <b>stable</b> since ES2019, so the two keep the order they were listed in. A derived key like this one collides far more readily than raw data, so it is worth knowing you are relying on that.`));
    }

    if (!same(text, sorted)) {
      out.append(el("div", "note", `Had you sorted the expected times themselves with a bare <code class='inl'>.sort()</code>, they would be compared as <b>text</b> — <code class='inl'>"${fmt(sorted[sorted.length - 1].expected)}"</code> before <code class='inl'>"${fmt(sorted[0].expected)}"</code> when the first digit is smaller. Sorting objects with no comparator is quieter still: every element stringifies to <code class='inl'>"[object Object]"</code>, every comparison is a tie, and the array comes back untouched.`));
    }
  }
}

// ── STEP — decorate, sort, undecorate, with the two multiplications on separate
// steps so the second one cannot be skimmed past. The destructured row bindings live
// on lines 2–4 only, which is exactly their real scope: they belong to the map
// callback and are gone by the time sort() runs. Both `scored` and `names` are gated
// the same way, so each appears when its line creates it and then stays. ──
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">analyzeIdeas</span>(<span class="tok" data-t="param">ideas</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> scored = ideas.<span class="tok" data-t="map"><span class="fn">map</span>(([name, optimistic, realistic, pessimistic])</span> =&gt; ({` },
  { ln: 3, html: `    name,` },
  { ln: 4, html: `    expected: <span class="tok" data-t="pert">((optimistic + <span class="nu">4</span> * realistic + pessimistic) / <span class="nu">6</span>)</span> * <span class="tok" data-t="len">name.length</span>,` },
  { ln: 5, html: `  }));` },
  { ln: 6, html: `  scored.<span class="fn">sort</span>((a, b) =&gt; <span class="tok" data-t="cmp">a.expected - b.expected</span>);` },
  { ln: 7, html: `  <span class="k">return</span> scored.<span class="fn">map</span>((idea) =&gt; <span class="tok" data-t="pluck">idea.name</span>);` },
  { ln: 8, html: `}` },
];

// Struct boxes must stay readable, and the debugger's panel is narrow.
const short = (s) => (s.length > 15 ? s.slice(0, 14) + "…" : s);

function trace(caseIndex) {
  const k = Math.max(1, Math.min(CASES.length, caseIndex | 0));
  const { ideas } = CASES[k - 1];
  const steps = [];

  const scored = [];        // built on line 2–5, then reordered in place on line 6
  const out = [];           // built on line 7
  let row = null;           // the map callback's destructured bindings — lines 2–4 only
  let sorted = false;

  const S = (line, note, x = {}) => {
    const vars = { ideas: `${ideas.length} row${ideas.length === 1 ? "" : "s"}` };
    // Scope by omission: name/optimistic/realistic/pessimistic exist only inside the
    // map callback, so they appear on lines 2–4 and vanish for the sort and the return.
    if (row && line >= 2 && line <= 4) {
      vars.name = `"${row.name}"`;
      vars.optimistic = row.o; vars.realistic = row.r; vars.pessimistic = row.p;
    }
    const structs = [];
    if (line >= 2) structs.push({ label: sorted ? "scored (sorted)" : "scored", items: scored.map((s) => `${short(s.name)} ${fmt(s.expected)}`), newest: !!x.newest });
    if (line >= 7) structs.push({ label: "names", items: out.map(short), newest: !!x.pluck });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `analyzeIdeas(${ideas.length} ideas)`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `The answer is a ranking by <b>expected time</b> — and no row of <code class='inl'>ideas</code> contains that number. It has to be computed for every idea <b>before</b> anything can be sorted, which is why the first thing that happens is a <code class='inl'>map</code>, not a <code class='inl'>sort</code>.`, { focus: "param" });

  // ── decorate ──
  let saidPert = false, saidLen = false;
  ideas.forEach(([name, o, r, p], i) => {
    row = { name, o, r, p };
    S(2, `Row ${i + 1} destructures into four bindings: <b>name = "${esc(name)}"</b>, and the three estimates <b>${o} / ${r} / ${p}</b> days. ${i === 0
      ? `Destructuring in the parameter list is why the body never says <code class='inl'>idea[1]</code> — positional data gets names at the boundary, once, instead of at every use.`
      : `The previous row's four bindings are gone: each call gets its own, which is why the panel replaces them rather than adding to them.`}`,
      { focus: "map", changed: ["name", "optimistic", "realistic", "pessimistic"] });

    const m = meanOf(o, r, p);
    S(4, `PERT: <b>(${o} + 4 × ${r} + ${p}) / 6 = ${fmt(m)}</b> days.${saidPert ? "" : ` It is a <b>weighted</b> average, not a plain one — the realistic estimate counts four times, so the optimistic and pessimistic ends only nudge the result. That is the whole point of a three-point estimate: the extremes inform it without dominating it.`}${o === r && r === p ? ` Here all three estimates are <b>${o}</b>, so the weighting has nothing to weigh and the mean is just <b>${o}</b>.` : ""}`,
      { focus: "pert" });
    saidPert = true;

    const exp = expectedOf(name, o, r, p);
    scored.push({ name, mean: m, expected: exp });
    S(4, `Now multiply by <b>name.length</b> — the number of <b>characters in the title</b>, spaces included: <b>${fmt(m)} × ${name.length} = ${fmt(exp)}</b>.${saidLen ? "" : ` Read that again, because it is not a typo in the spec: <b>renaming this idea would change its estimate</b>. It is nonsense as project management and it is load-bearing as code — this product, not the ${fmt(m)}, is what the sort will order on.`}`,
      { focus: "len", newest: true });
    saidLen = true;
    row = null;
  });

  // ── sort ──
  S(6, `Every idea now carries its key. <code class='inl'>sort</code> is handed a comparator that returns a <b>number</b>: negative keeps <b>a</b> first, positive moves <b>b</b> first, zero means "equal". Leaving it out is not a shortcut — <code class='inl'>scored.sort()</code> would convert each object to the string <code class='inl'>"[object Object]"</code>, find every pair equal, and hand the array back in exactly the order it arrived.`,
    { focus: "cmp" });

  scored.sort((a, b) => a.expected - b.expected);
  sorted = true;
  S(6, `Sorted ascending by <code class='inl'>expected</code>: <b>${scored.map((s) => esc(s.name)).join(" · ")}</b>. Note the subtraction — <code class='inl'>a.expected - b.expected</code> is a number, whereas <code class='inl'>a.expected &gt; b.expected</code> is a <b>boolean</b>, and a boolean comparator collapses to 0 and 1 with no way to say "a first".`,
    { focus: "cmp" });

  if (scored.length < 2) {
    S(6, `One idea, so the comparator is <b>never called</b>. A single-element array is already sorted and <code class='inl'>sort</code> knows it — worth remembering when a comparator has a bug that a one-row test can never reach.`, { focus: "cmp" });
  } else {
    for (let i = 0; i + 1 < scored.length; i++) {
      const a = scored[i], b = scored[i + 1];
      const d = a.expected - b.expected;
      S(6, d === 0
        ? `<b>${esc(a.name)}</b> and <b>${esc(b.name)}</b> tie at <b>${fmt(a.expected)}</b> — ${fmt(a.mean)} × ${a.name.length} against ${fmt(b.mean)} × ${b.name.length}. The comparator returns <b>0</b>, so sort learns nothing and leaves them as it found them. That is a <b>guarantee</b>, not luck: <code class='inl'>Array.prototype.sort</code> has been required to be <b>stable</b> since ES2019, so the tie resolves to <b>input order</b>.`
        : `<b>${esc(a.name)}</b> before <b>${esc(b.name)}</b>: <b>${fmt(a.expected)} − ${fmt(b.expected)}</b> is negative, so the comparator says "leave a first". ${a.mean > b.mean ? `Note this pair — <b>${esc(a.name)}</b> has the <b>bigger</b> estimate (${fmt(a.mean)} against ${fmt(b.mean)}) and still ranks ahead, purely because its name is ${a.name.length} characters against ${b.name.length}.` : ""}`,
        { focus: "cmp", eval: { expr: `${fmt(a.expected)} - ${fmt(b.expected)}`, val: fmt(d) } });
    }
  }

  // ── undecorate ──
  scored.forEach((s, i) => {
    out.push(s.name);
    S(7, i === 0
      ? `The key was scaffolding. <code class='inl'>map</code> pulls <b>.name</b> back off each pair and drops the <code class='inl'>expected</code> that did all the work — the caller asked for names, and <b>${fmt(s.expected)}</b> has already served its purpose by putting this one first.`
      : i === 1
        ? `<b>"${esc(s.name)}"</b>, dropping <b>${fmt(s.expected)}</b>. The order is already decided, so this pass must only <i>strip a field</i> — any sorting, filtering or re-deriving here would be a second chance to get the ranking wrong.`
        : `<b>"${esc(s.name)}"</b> — its <b>${fmt(s.expected)}</b> goes with it.`,
      { focus: "pluck", pluck: true });
  });

  S(7, `<b>Return</b> the ${out.length} name${out.length === 1 ? "" : "s"}, shortest expected time first.`,
    { focus: "pluck", done: true, result: `[${out.map((n) => `"${n}"`).join(", ")}]`, ret: { value: `${out.length} names` } });

  return steps;
}

export default {
  n: 305, id: "ideas", title: "Idea Rankings", dates: ["2026-06-11"],
  statement: `Each idea arrives as <code class="inl">[name, optimistic, realistic, pessimistic]</code>, the three estimates in days. Score every idea with the PERT three-point estimate <code class="inl">(optimistic + 4 × realistic + pessimistic) / 6</code>, then <b>multiply by the number of characters in the idea's name</b>. Return the <b>names</b>, sorted by that expected time, shortest first. <span class="rule">Example: <code class="inl">["Fix bug", 1, 3, 5]</code> → (1 + 12 + 5) / 6 = 3, and "Fix bug" is 7 characters, so its expected time is <b>21</b>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n log n)",
      approach: `Three moves. <b>Decorate:</b> the value you sort by is in none of the input rows, so compute it once per idea and carry it alongside the name — computing it inside the comparator would evaluate it O(n log n) times instead of n.<br><br><b>Sort:</b> pass a comparator. <code class='inl'>(a, b) =&gt; a.expected - b.expected</code> returns a <b>number</b>; <code class='inl'>.sort()</code> with nothing in it stringifies every object to <code class='inl'>"[object Object]"</code> and returns the array untouched, and <code class='inl'>a.expected &gt; b.expected</code> returns a <b>boolean</b>, which can never say "a first". Ties return 0 and stay in input order — <code class='inl'>sort</code> has been required to be stable since ES2019, which is a real dependency here because a <i>derived</i> key collides far more often than raw data.<br><br><b>Undecorate:</b> map back down to names.<br><br>And about that formula — <code class='inl'>* name.length</code> is not a typo you should quietly fix. Renaming a ticket cannot make it take longer, but the spec says it does, and it is the factor that decides the ranking: on freeCodeCamp's own last case it lifts <b>Analyze user patterns</b> above <b>Optimize continuous integration</b> despite the larger estimate, because 21 characters beat 31.`,
      code: `// [name, optimistic, realistic, pessimistic] — the sort key is in none of them.
type Idea = [string, number, number, number];

function analyzeIdeas(ideas: Idea[]): string[] {
  // Decorate: compute the key ONCE per idea and carry it next to the name.
  const scored = ideas.map(([name, optimistic, realistic, pessimistic]) => ({
    name,
    // PERT three-point estimate, then the spec's joke: times the NAME's length.
    expected: ((optimistic + 4 * realistic + pessimistic) / 6) * name.length,
  }));

  // Sort: the comparator must return a NUMBER. A bare .sort() would stringify
  // every element to "[object Object]" and leave the array exactly as it found it.
  // Equal keys return 0, and sort has been required to be stable since ES2019,
  // so a tie keeps the two ideas in the order they were listed.
  scored.sort((a, b) => a.expected - b.expected);

  // Undecorate: the key was scaffolding — hand back names only.
  return scored.map((idea) => idea.name);
}`,
      mount,
    },
    {
      name: "Step through", cost: "the derived key",
      approach: `A debugger for the solution. The two multiplications get a step each, so the second one — <code class='inl'>× name.length</code> — cannot be skimmed past.<br><br>Watch <code class='inl'>name</code> and the three estimates <b>appear and disappear</b> row by row: they are the map callback's bindings, so they are gone by the time <code class='inl'>sort</code> runs. The <code class='inl'>scored</code> struct fills one pair at a time, <b>visibly reorders</b> on line 6, and then <code class='inl'>names</code> is drained off it on line 7.<br><br>Line 6 then justifies each adjacent pair in the result: the comparator's <b>sign</b> is what ordering means, and case <b>7</b> is the pair where it returns <b>0</b>. Case <b>6</b> is the one to start on — every single pair there ranks <i>against</i> its raw estimates. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 6, min: 1, max: CASES.length,
                 presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick a test case` },
      }),
    },
  ],
};
