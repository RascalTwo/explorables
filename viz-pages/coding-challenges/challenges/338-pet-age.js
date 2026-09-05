// #338 · Pet Age Calculator — a lookup table beats a seven-branch if/else.
// One approach. The whole challenge is "turn a printed table into data": the
// conversion table becomes an object, the pet name is the key, and the answer is
// one index + one multiply. The demo computes all seven rows at once so the
// table stays visible as a *table*, not as control flow.
import { el, mountDebugger } from "../shared.js";

// The official conversion table, in freeCodeCamp's own row order.
// "guinea pig" carries a space, which is exactly why the table has to be an
// object literal with a quoted key — `PET_YEARS.guinea pig` isn't syntax.
const PETS = [
  ["dog", 7], ["cat", 6], ["rabbit", 8], ["hamster", 30],
  ["guinea pig", 12], ["goldfish", 6], ["bird", 5],
];
const PET_YEARS = Object.fromEntries(PETS);

// A miss reads back as `undefined`; `?? 0` is what stops `age * undefined`
// from quietly becoming NaN. See the "parrot" and "Dog" step-through cases.
const petYears = (pet, age) => age * (PET_YEARS[pet] ?? 0);

const AGE_MAX = 25;

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .pa-wrap { margin-top:12px; max-width:720px; }
    .pa-ctl { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin:14px 0 6px; }
    .pa-slider { flex:1; min-width:200px; accent-color:var(--accent); }
    .pa-num { width:74px; }
    .pa-eq { display:flex; align-items:baseline; gap:14px; flex-wrap:wrap; margin:14px 0 4px; }
    .pa-call { font:13px var(--mono); color:var(--muted); }
    .pa-call b { color:var(--text); }
    .pa-big { font:800 34px var(--mono); color:var(--accent); font-variant-numeric:tabular-nums; }
    .pa-unit { font:700 11px var(--sans); letter-spacing:.07em; text-transform:uppercase; color:var(--muted); }
    .pa-blocks { display:flex; gap:4px; flex-wrap:wrap; margin:10px 0 2px; min-height:40px; align-items:flex-end; }
    .pa-blk { min-width:34px; padding:4px 6px; border-radius:6px; border:1px solid var(--border);
              background:var(--panel-2); text-align:center; }
    .pa-blk b { display:block; font:800 13px var(--mono); color:var(--text); }
    .pa-blk span { display:block; font:9.5px var(--mono); color:var(--muted); }
    .pa-blk.last { border-color:var(--accent); background:color-mix(in srgb,var(--accent) 14%,transparent); }
    .pa-blk.last b { color:var(--accent); }
    .pa-tbl { margin-top:18px; border:1px solid var(--border); border-radius:10px; overflow:hidden; }
    .pa-row { display:grid; grid-template-columns:minmax(0,1fr) 64px 92px; align-items:center; gap:10px;
              padding:7px 12px; cursor:pointer; border-top:1px solid var(--border); }
    .pa-row:first-child { border-top:0; }
    .pa-row:hover { background:var(--panel-2); }
    .pa-row.on { background:color-mix(in srgb,var(--accent) 13%,transparent); }
    .pa-key { font:700 13px var(--mono); color:var(--muted); }
    .pa-row.on .pa-key { color:var(--accent); }
    .pa-mul { font:13px var(--mono); color:var(--muted); text-align:right; }
    .pa-out { font:800 15px var(--mono); color:var(--text); text-align:right; font-variant-numeric:tabular-nums; }
    .pa-head { display:grid; grid-template-columns:minmax(0,1fr) 64px 92px; gap:10px; padding:6px 12px;
               background:var(--panel-2); font:700 9.5px var(--sans); letter-spacing:.08em;
               text-transform:uppercase; color:var(--muted); }
    .pa-head span:not(:first-child) { text-align:right; }
  `));
}

function mount(host) {
  ensureStyle();
  let pet = "dog", age = 5;

  const chips = el("div", "controls");
  const chipEls = {};
  PETS.forEach(([name]) => {
    const c = el("button", "chip" + (name === pet ? " on" : ""), name);
    c.onclick = () => { pet = name; render(); };
    chipEls[name] = c; chips.append(c);
  });

  const ctl = el("div", "pa-ctl");
  const num = el("input", "pa-num"); num.type = "number"; num.min = 0; num.max = AGE_MAX; num.value = age;
  const slider = el("input", "pa-slider"); slider.type = "range"; slider.min = 0; slider.max = AGE_MAX; slider.value = age;
  const setAge = (v) => { age = Math.max(0, Math.min(AGE_MAX, Math.floor(v) || 0)); render(); };
  num.oninput = () => setAge(+num.value);
  slider.oninput = () => setAge(+slider.value);
  ctl.append(el("span", "ctl-label", "human years ="), num, slider);

  const eq = el("div", "pa-eq");
  const call = el("div", "pa-call");
  const big = el("div", "pa-big");
  eq.append(call, big, el("span", "pa-unit", "pet years"));

  const blocks = el("div", "pa-blocks");

  const tbl = el("div", "pa-tbl");
  tbl.append(el("div", "pa-head", "<span>key</span><span>×</span><span>result</span>"));
  const rowEls = {};
  PETS.forEach(([name]) => {
    const row = el("div", "pa-row");
    row.onclick = () => { pet = name; render(); };
    rowEls[name] = row; tbl.append(row);
  });

  const wrap = el("div", "pa-wrap");
  wrap.append(chips, ctl, eq, blocks, tbl);
  host.append(
    el("div", "note", "Pick a pet and drag the age. Every row is recomputed at the same age, so the table stays readable as <b>data</b> — the code never branches on which pet it is."),
    wrap,
  );
  render();

  function render() {
    const mult = PET_YEARS[pet];
    const total = petYears(pet, age);

    if (+num.value !== age) num.value = age;
    slider.value = age;

    call.innerHTML = `<b>petYears("${pet}", ${age})</b> → ${age} × ${mult} =`;
    big.textContent = String(total);

    blocks.innerHTML = "";
    if (age === 0) {
      blocks.append(el("span", "muted", "Zero human years is zero pet years — the multiply still runs, it just has nothing to scale."));
    } else {
      for (let y = 1; y <= age; y++) {
        blocks.append(el("div", "pa-blk" + (y === age ? " last" : ""), `<b>${y * mult}</b><span>yr ${y}</span>`));
      }
    }

    PETS.forEach(([name, m]) => {
      const on = name === pet;
      rowEls[name].className = "pa-row" + (on ? " on" : "");
      rowEls[name].innerHTML =
        `<span class="pa-key">"${name}"</span><span class="pa-mul">×${m}</span><span class="pa-out">${age * m}</span>`;
      chipEls[name].classList.toggle("on", on);
    });
  }
}

const CODE = `// The conversion table is DATA, not control flow. One entry per pet; adding
// an animal is a new line in the object, never a new branch in the function.
const PET_YEARS: Record<string, number> = {
  dog: 7, cat: 6, rabbit: 8, hamster: 30,
  "guinea pig": 12, goldfish: 6, bird: 5,   // quoted: the key has a space
};

function petYears(pet: string, age: number): number {
  // An unknown pet indexes to \`undefined\`, and \`undefined * age\` is NaN —
  // \`?? 0\` turns a silent NaN into an explicit "no conversion known".
  const multiplier = PET_YEARS[pet] ?? 0;
  return age * multiplier;
}`;

// ── STEP — the lookup line-by-line (single call frame) ────────────────────────
// Cases 1–7 are freeCodeCamp's seven official tests, in the grader's own order —
// one per row of the conversion table, so every multiplier is exercised.
// Cases 8–9 are invented, and both probe the *miss* path the official set never
// touches: "parrot" is absent from the table, and "Dog" is present only in
// lowercase — an object key is an exact string match, so capitalisation misses
// just as hard as a wrong animal. Each lands on a different lesson.
const CASES = [
  { pet: "dog", age: 5, why: "the table's first row" },
  { pet: "cat", age: 9, why: "a bigger age, a smaller multiplier" },
  { pet: "rabbit", age: 3, why: "mid-table row" },
  { pet: "hamster", age: 4, why: "the largest multiplier" },
  { pet: "guinea pig", age: 5, why: "the key with a space in it" },
  { pet: "goldfish", age: 2, why: "shares 6 with cat — duplicate values are fine" },
  { pet: "bird", age: 1, why: "the smallest multiplier, age 1" },
  { pet: "parrot", age: 3, why: "invented — no such key" },
  { pet: "Dog", age: 5, why: "invented — right animal, wrong case" },
];

const SRC = [
  { ln: 1, html: `<span class="k">const</span> <span class="tok" data-t="decl">PET_YEARS</span> = {` },
  { ln: 2, html: `  <span class="tok" data-t="rows1">dog: 7, cat: 6, rabbit: 8, hamster: 30</span>,` },
  { ln: 3, html: `  <span class="tok" data-t="rows2"><span class="st">"guinea pig"</span>: 12, goldfish: 6, bird: 5</span>,` },
  { ln: 4, html: `<span class="tok" data-t="seal">}</span>;` },
  { ln: 5, html: `<span class="k">function</span> <span class="fn">petYears</span>(<span class="tok" data-t="params">pet, age</span>) {` },
  { ln: 6, html: `  <span class="k">const</span> multiplier = <span class="tok" data-t="lookup">PET_YEARS[pet]</span> <span class="tok" data-t="fallback">?? 0</span>;` },
  { ln: 7, html: `  <span class="k">return</span> <span class="tok" data-t="mult">age * multiplier</span>;` },
  { ln: 8, html: `}` },
];

// Instrumented run → generic debugger steps. One frame; the PET_YEARS struct is a
// module constant, so it appears the moment line 1 runs and stays visible for the
// rest of the trace (it is still in scope inside the call). `pet`/`age` are
// parameters and only exist from line 5; `multiplier` only from line 6.
function trace(caseIndex) {
  const idx = Math.max(0, Math.min(CASES.length - 1, (caseIndex | 0) - 1));
  const c = CASES[idx];
  const { pet, age } = c;
  const steps = [];
  const entries = PETS.map(([k, m]) => `${k}:${m}`);
  let filled = 0, multiplier, mulBound = false;

  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 5) { vars.pet = `"${pet}"`; vars.age = age; }
    if (line >= 6 && mulBound) vars.multiplier = multiplier;
    const structs = [{ label: "PET_YEARS", items: entries.slice(0, filled), newest: !!x.tableNew }];
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: line >= 5 ? `petYears("${pet}", ${age})` : "module scope", vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Before any call happens, the conversion table is built <b>once</b>, at module load. The printed table in the problem statement becomes a single object — that choice is the entire challenge; everything after it is bookkeeping.`, { focus: "decl" });

  filled = 4;
  S(2, `Four rows land: <b>dog 7, cat 6, rabbit 8, hamster 30</b>. These are unquoted keys because each is a valid identifier — JavaScript quietly stores every one of them as the <b>string</b> <code class='inl'>"dog"</code>, <code class='inl'>"cat"</code>, and so on.`, { focus: "rows1", tableNew: true });

  filled = 7;
  S(3, `Three more, and the odd one out: <code class='inl'>"guinea pig"</code> <b>must</b> be quoted, because a space can't appear in an identifier. That's not a style choice — <code class='inl'>PET_YEARS.guinea pig</code> is a syntax error, which is why the lookup below uses bracket notation for every pet, not just this one.`, { focus: "rows2", tableNew: true });

  S(4, `The table is closed with <b>7 entries</b>. Note what <i>isn't</i> here: no <code class='inl'>if</code>, no <code class='inl'>switch</code>, no comparisons. Seven <code class='inl'>else if</code> branches would encode the same facts but bury them in control flow — adding an eighth pet would mean editing the function instead of adding a line of data.`, { focus: "seal" });

  S(5, `Call <b>petYears("${pet}", ${age})</b> — ${c.why}. The two parameters come into scope: a pet <b>name</b> to look up, and a count of human years to scale. Nothing about the pet is inspected yet.`, { focus: "params", changed: ["pet", "age"] });

  const raw = PET_YEARS[pet];
  const hit = raw !== undefined;
  S(6, hit
    ? `<code class='inl'>PET_YEARS["${pet}"]</code> finds a row and hands back <b>${raw}</b>. The bracket index does an <b>exact string match</b> on the key — no trimming, no case folding, no fuzzy matching. One hash probe, and it costs the same whether the table holds 7 pets or 7,000.`
    : `<code class='inl'>PET_YEARS["${pet}"]</code> finds nothing and evaluates to <b>undefined</b>. ${pet === "Dog"
        ? `The animal is right but the key isn't: the table stores <code class='inl'>"dog"</code>, and <code class='inl'>"Dog" !== "dog"</code>. Exact string match means a capital letter misses just as completely as a wrong species.`
        : `There is no <code class='inl'>"${pet}"</code> row at all. A missing key is not an error in JavaScript — it reads back as <b>undefined</b>, silently.`}`,
    { focus: "lookup", eval: { expr: `"${pet}" in PET_YEARS`, val: hit } });

  multiplier = raw ?? 0; mulBound = true;
  S(6, hit
    ? `<code class='inl'>?? 0</code> only fires on <b>null</b> or <b>undefined</b>, and ${raw} is neither, so <b>multiplier = ${multiplier}</b> passes straight through. Worth noting it is <code class='inl'>??</code> and not <code class='inl'>||</code> — a legitimate multiplier of <b>0</b> would be falsy and <code class='inl'>||</code> would overwrite it.`
    : `<code class='inl'>?? 0</code> catches the undefined and binds <b>multiplier = 0</b>. Without it the next line would compute <code class='inl'>${age} * undefined</code> = <b>NaN</b> — a number-typed answer that is wrong everywhere downstream and throws nothing. Substituting 0 makes "I have no conversion for this pet" an explicit, checkable value.`,
    { focus: "fallback", changed: ["multiplier"] });

  const total = age * multiplier;
  S(7, hit
    ? `One multiply finishes the job: <b>${age} × ${multiplier} = ${total}</b>. The multiplier was never compared against anything — it was <i>retrieved</i>. That's the difference between a table and a branch, and it's why this function has exactly one code path no matter how many pets exist.`
    : `<b>${age} × 0 = 0</b>. The arithmetic is unremarkable; the point is that it produced a real number rather than NaN, because the miss was handled at the lookup instead of leaking into the maths.`,
    { focus: "mult", done: true, result: String(total), ret: { value: total } });

  return steps;
}

export default {
  n: 338, id: "pet-age", title: "Pet Age Calculator", dates: ["2026-07-14"],
  statement: `Given a pet type and an age in human years, return the age in pet years using this conversion table: <code class="inl">dog</code> ×7, <code class="inl">cat</code> ×6, <code class="inl">rabbit</code> ×8, <code class="inl">hamster</code> ×30, <code class="inl">guinea pig</code> ×12, <code class="inl">goldfish</code> ×6, <code class="inl">bird</code> ×5. <span class="rule">Example: <code class="inl">petYears("dog", 5)</code> → <b>35</b>; <code class="inl">petYears("hamster", 4)</code> → <b>120</b>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(1)",
      approach: `The problem hands you a table, so <b>store a table</b>. Each pet becomes a key in one object and the answer is <code class="inl">PET_YEARS[pet] * age</code> — a single hash probe and a single multiply, whatever the pet. The tempting alternative is a chain of seven <code class="inl">if (pet === "dog") …</code> branches; it returns the same numbers, but it encodes the table as <i>control flow</i>, so the data can only be read by tracing execution, an eighth animal means editing the function, and the cost grows with the number of pets instead of staying flat. Two details earn their keep: <code class="inl">"guinea pig"</code> must be a quoted key because a space can't sit in an identifier, and <code class="inl">?? 0</code> catches an unknown pet before <code class="inl">age * undefined</code> turns into a silent <code class="inl">NaN</code>. Drag the age and watch all seven rows rescale at once — the table never stops being a table.`,
      code: CODE, mount,
    },
    {
      name: "Step through", cost: "line-by-line",
      approach: `A debugger for the lookup. It starts <b>before</b> the function, watching the table fill row by row, because that's where the real work of this challenge happens. Then one call: the key is probed (<b>exact</b> string match — case 9 is <code class="inl">"Dog"</code> and misses), <code class="inl">??</code> decides whether a fallback is needed (case 8 is <code class="inl">"parrot"</code>), and one multiply returns. Watch <code class="inl">multiplier</code> appear only once its line has run. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 1, min: 1, max: CASES.length, presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: 1–7 official, 8–9 misses` },
      }),
    },
  ],
};
