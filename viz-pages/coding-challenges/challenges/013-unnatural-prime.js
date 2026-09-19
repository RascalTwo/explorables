// #13 · Unnatural Prime — normalise the sign first, then it is ordinary primality.
// The word "negative prime" sounds like a new rule to encode; it isn't. Take the
// absolute value on the way in and every later line is the textbook test, with the
// sign never mentioned again.
// • BRUTE / divide by every d from 2 up to m − 1 — most of those divisors sit past
//   the point where a factor could still be new.
// • OPT   / stop at √m and skip the evens — a divisor above √m always has a partner
//   below it, so passing √m proves there was never anything to find.
// Flip the Approach toggle on 199 to see 197 divisions against 6 on identical input.
import { el, mountDebugger } from "../shared.js";

// The nine official freeCodeCamp cases first, in the grader's order, then two of
// ours. 2 is the only even prime and the only input where "skip the evens" needs a
// special case at all; 199 is the divergence input — prime, and far enough out that
// the brute's 197 divisions against the optimum's 6 is a gap you can see rather than
// one you have to be told about. Everything official stays under |100|.
const OFFICIAL = [1, -1, 19, -23, 0, 97, -61, 99, -44];
const PRESETS = [...OFFICIAL, 2, 199];

// The two approaches, instrumented. Both answer identically on every input — the
// only thing that differs is how many divisors they had to look at to get there.
function brute(n) {
  const m = Math.abs(n);
  const tested = [];
  if (m < 2) return { m, ok: false, tested, hit: null, why: "below 2" };
  for (let d = 2; d < m; d++) {
    tested.push(d);
    if (m % d === 0) return { m, ok: false, tested, hit: d, why: "factor" };
  }
  return { m, ok: true, tested, hit: null, why: "no factor" };
}

function opt(n) {
  const m = Math.abs(n);
  const tested = [];
  if (m < 2) return { m, ok: false, tested, hit: null, why: "below 2" };
  if (m % 2 === 0) return { m, ok: m === 2, tested: [2], hit: m === 2 ? null : 2, why: m === 2 ? "is 2" : "even" };
  for (let d = 3; d * d <= m; d += 2) {
    tested.push(d);
    if (m % d === 0) return { m, ok: false, tested, hit: d, why: "factor" };
  }
  return { m, ok: true, tested, hit: null, why: "passed √m" };
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .up-wrap { display:flex; flex-direction:column; gap:12px; }
    .up-abs { font:13px var(--mono); color:var(--muted); }
    .up-abs b { color:var(--text); }
    .up-abs .sign { color:var(--warn); font-weight:800; }
    .up-legend { display:flex; gap:14px; flex-wrap:wrap; font:11.5px var(--sans); color:var(--muted); align-items:center; }
    .up-legend i { display:inline-block; width:11px; height:11px; border-radius:3px; margin-right:5px; vertical-align:-1px; border:1px solid var(--border); }
    .up-sqrt { font:12px var(--mono); color:var(--warn); }
  `));
}

// One shared demo body; `run` is whichever approach this variant is showing.
// Both render the SAME divisor range 2…m−1, so the difference between the two
// tabs is literally which cells lit up — not a different picture.
const MAX_CELLS = 150;

function makeMount(run, mode) {
  return function mount(host) {
    ensureStyle();
    const ctl = el("div", "controls");
    const inp = el("input"); inp.type = "number"; inp.value = "97"; inp.style.width = "110px";
    ctl.append(el("span", "ctl-label", "n ="), inp);
    const pre = el("div", "controls");
    PRESETS.forEach((v) => { const c = el("button", "chip", String(v)); c.onclick = () => { inp.value = String(v); render(); }; pre.append(c); });
    const out = el("div");
    host.append(ctl, pre, out);
    inp.oninput = render;
    render();

    function render() {
      const n = Math.trunc(+inp.value);
      out.innerHTML = "";
      if (!Number.isFinite(n)) { out.append(el("div", "note", "Enter an integer — the sign is allowed and is the whole point.")); return; }
      const r = run(n);
      const wrap = el("div", "up-wrap");

      wrap.append(el("div", "result-line",
        `<span class="badge ${r.ok ? "ok" : "no"}">isUnnaturalPrime(${n}) → ${r.ok}</span>` +
        `<span class="opcount ${mode === "brute" ? "hot" : "cool"}"><span class="n">${r.tested.length.toLocaleString("en-US")}</span> divisions</span>`));

      wrap.append(el("div", "up-abs",
        `Math.abs(<b>${n}</b>) = <b>${r.m}</b>${n < 0 ? ` — the <span class="sign">−</span> is gone before any divisor is tried, so “negative prime” never needs a rule of its own.` : " — already positive, so abs() changes nothing here."}`));

      if (r.m >= 2) {
        const sq = Math.floor(Math.sqrt(r.m));
        const testedSet = new Set(r.tested);
        const sweep = el("div", "sweep");
        const shown = Math.min(r.m - 1, MAX_CELLS + 1);
        for (let d = 2; d < shown + 1; d++) {
          let cls = "dv";
          if (d === r.hit) cls = "dv hit";
          else if (testedSet.has(d)) cls = "dv tested";
          else if (mode === "opt" && d > sq) cls = "dv past";
          else cls = "dv skipped";
          sweep.append(el("div", cls, String(d)));
        }
        if (r.m - 1 > shown) sweep.append(el("span", "more", `+${(r.m - 1 - shown).toLocaleString("en-US")} more`));
        wrap.append(sweep);
        wrap.append(el("div", "up-legend",
          `<span><i style="background:var(--panel-2)"></i>never divided</span>` +
          `<span><i style="background:var(--panel-2);border-color:var(--text)"></i>divided</span>` +
          `<span><i style="background:var(--good);border-color:var(--good)"></i>factor found</span>` +
          (mode === "opt" ? `<span><i style="border-color:var(--warn)"></i>past √${r.m} ≈ ${sq}</span>` : "")));
      }

      wrap.append(el("div", "note", noteFor(n, r, mode)));
      out.append(wrap);
    }
  };
}

// The note is the pedagogy — it has to say WHY this input came out the way it did,
// not restate the boolean the badge already shows.
function noteFor(n, r, mode) {
  const sq = Math.floor(Math.sqrt(r.m));
  if (r.why === "below 2") return `<b>${r.m}</b> is below 2, so it is out before any division runs. That single guard is what disposes of <b>0</b>, <b>1</b> and <b>−1</b> — the three inputs the official set spends a third of its cases on.`;
  if (r.why === "even") return `<b>${r.m}</b> is even and isn't 2, so <code class='inl'>m % 2 === 0</code> settles it in one test. Halving the search space costs one line and one special case — and <b>2</b> is that special case, the only even number this rule must let through.`;
  if (r.why === "is 2") return `<b>2</b> is the one even prime, which is why the even check returns <code class='inl'>m === 2</code> rather than a flat <code class='inl'>false</code>. Get this wrong and every other case still passes.`;
  if (r.why === "factor") return `The first factor is <b>${r.hit}</b>, and ${r.m} = ${r.hit} × ${r.m / r.hit}. Both approaches stop the instant they find it — the early return is why a composite is cheap to reject and a <b>prime</b> is the expensive case, since only a prime makes you exhaust the whole range.`;
  if (mode === "opt") return `Nothing divided <b>${r.m}</b> up to √${r.m} ≈ <b>${sq}</b>, so it is prime — and there is no need to look further. Any divisor above √m has a partner below it (if <code class='inl'>m = a × b</code> and <code class='inl'>a > √m</code> then <code class='inl'>b < √m</code>), so passing √m proves the range above it was never going to hold anything new.`;
  return `<b>${r.m}</b> survived all <b>${r.tested.length.toLocaleString("en-US")}</b> divisions, so it is prime. Only <b>${sq - 1}</b> of them could ever have found anything: past √${r.m} ≈ <b>${sq}</b>, every candidate divisor is the larger half of a pair whose smaller half was already tried and rejected. Flip to <b>Stop at √n</b> to see the same answer from the divisions that matter.`;
}

// ── STEP — the same loop twice, once per bound ───────────────────────────────
const SRC_BRUTE = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">isUnnaturalPrime</span>(<span class="tok" data-t="param">n</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> m = <span class="tok" data-t="abs">Math.<span class="fn">abs</span>(n)</span>;` },
  { ln: 3, html: `  <span class="k">if</span> (<span class="tok" data-t="small">m &lt; 2</span>) <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 4, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="cond">d = 2; d &lt; m</span>; d++) {` },
  { ln: 5, html: `    <span class="k">if</span> (<span class="tok" data-t="mod">m % d === 0</span>) <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 6, html: `  }` },
  { ln: 7, html: `  <span class="k">return</span> <span class="tok" data-t="ret">true</span>;` },
  { ln: 8, html: `}` },
];

const SRC_OPT = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">isUnnaturalPrime</span>(<span class="tok" data-t="param">n</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> m = <span class="tok" data-t="abs">Math.<span class="fn">abs</span>(n)</span>;` },
  { ln: 3, html: `  <span class="k">if</span> (<span class="tok" data-t="small">m &lt; 2</span>) <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 4, html: `  <span class="k">if</span> (<span class="tok" data-t="even">m % 2 === 0</span>) <span class="k">return</span> m === <span class="nu">2</span>;` },
  { ln: 5, html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="cond">d = 3; d * d &lt;= m</span>; d += <span class="nu">2</span>) {` },
  { ln: 6, html: `    <span class="k">if</span> (<span class="tok" data-t="mod">m % d === 0</span>) <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 7, html: `  }` },
  { ln: 8, html: `  <span class="k">return</span> <span class="tok" data-t="ret">true</span>;` },
  { ln: 9, html: `}` },
];

// The tested-divisor struct would run to hundreds of boxes on a large prime, so it
// keeps a moving tail — the point it makes is "how many, and the last few", not a
// full transcript the state panel could never fit.
const tail = (arr) => (arr.length > 18 ? ["…"].concat(arr.slice(-17)) : arr.slice());

function makeTrace(isOpt) {
  const LN = isOpt ? { even: 4, loop: 5, mod: 6, ret: 8 } : { loop: 4, mod: 5, ret: 7 };
  return function trace(n) {
    const steps = [];
    const tested = [];
    let m, d;
    const S = (line, note, x = {}) => {
      const vars = { n };
      if (line >= 2) vars.m = m;
      if (line >= LN.loop && d !== undefined) vars.d = d;
      const structs = line >= LN.loop ? [{ label: "divisors tried", items: tail(tested), newest: !!x.fresh }] : [];
      steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
        frames: [{ title: `isUnnaturalPrime(${n})`, vars, changed: x.changed || [], structs, ret: x.ret }] });
    };
    const END = (val, note, line) => S(line, note, { focus: val ? "ret" : "mod", done: true, result: String(val), ret: { value: val } });

    S(1, `Decide whether <b>${n}</b> is prime or the negative of a prime. Those read as two separate rules in the statement — the first line collapses them into one.`, { focus: "param" });
    m = Math.abs(n);
    S(2, `<b>Math.abs(${n}) = ${m}</b>. The sign is gone, and with it the whole "negative prime" clause: from here on this is the ordinary question "is ${m} prime?"`, { focus: "abs", changed: ["m"] });

    if (m < 2) {
      S(3, `<b>${m} &lt; 2</b>, so it fails before any divisor is tried. The statement spells this out — <b>1</b> and <b>0</b> are not prime — and it is why <code class='inl'>−1</code> is false too: abs made it 1.`, { focus: "small", eval: { expr: `${m} < 2`, val: true } });
      END(false, `<b>Return false.</b> Three of the nine official cases — 1, −1 and 0 — never reach the loop at all.`, 3);
      return steps;
    }
    S(3, `<b>${m} &lt; 2</b> is false, so there is a real primality question to answer.`, { focus: "small", eval: { expr: `${m} < 2`, val: false } });

    if (isOpt) {
      const even = m % 2 === 0;
      S(4, even
        ? `<b>${m}</b> is even. Every even number above 2 has 2 as a factor, so this settles it in one test — and the return is <code class='inl'>m === 2</code>, not <code class='inl'>false</code>, because <b>2 itself is prime</b>.`
        : `<b>${m}</b> is odd, so 2 is not a factor. Ruling the evens out here is what lets the loop below step by <b>2</b> instead of 1 — half the candidates, gone for one line.`,
        { focus: "even", eval: { expr: `${m} % 2 === 0`, val: even } });
      if (even) {
        END(m === 2, m === 2
          ? `<b>Return true.</b> 2 is the only even prime, and this branch exists entirely for it.`
          : `<b>Return false.</b> <b>${m} = 2 × ${m / 2}</b>, found without entering the loop.`, 4);
        return steps;
      }
    }

    const start = isOpt ? 3 : 2, step = isOpt ? 2 : 1;
    const inBound = (x) => (isOpt ? x * x <= m : x < m);
    for (d = start; ; d += step) {
      const ok = inBound(d);
      S(LN.loop, ok
        ? (isOpt
          ? `<b>d = ${d}</b>, and <b>${d} × ${d} = ${d * d} ≤ ${m}</b> — still inside the half of the range where a <i>new</i> factor could live.`
          : `<b>d = ${d}</b>, still below <b>${m}</b>, so the loop keeps going. This bound tries every candidate right up to m − 1.`)
        : (isOpt
          ? `<b>${d} × ${d} = ${d * d} &gt; ${m}</b> — the loop stops here. Anything above √${m} that divided ${m} would need a partner <i>below</i> √${m}, and every one of those has already been tried.`
          : `<b>d = ${d}</b> reached <b>${m}</b>, so the loop is finally out of candidates. It took ${tested.length.toLocaleString("en-US")} divisions to learn that.`),
        { focus: "cond", changed: ["d"], eval: { expr: isOpt ? `${d} * ${d} <= ${m}` : `${d} < ${m}`, val: ok } });
      if (!ok) break;
      tested.push(d);
      const hit = m % d === 0;
      S(LN.mod, hit
        ? `<b>${m} % ${d} = 0</b> — ${d} divides it, so <b>${m} = ${d} × ${m / d}</b> and the answer is settled. Return immediately; there is nothing a later divisor could add.`
        : `<b>${m} % ${d} = ${m % d}</b> — not a factor. ${isOpt ? `Next candidate is <b>${d + 2}</b>; the even numbers in between were ruled out before the loop started.` : `On to <b>${d + 1}</b>.`}`,
        { focus: "mod", fresh: true, eval: { expr: `${m} % ${d} === 0`, val: hit } });
      if (hit) {
        END(false, `<b>Return false.</b> ${m} is composite — its smallest factor above 1 is <b>${d}</b>.`, LN.mod);
        return steps;
      }
    }
    const sq = Math.floor(Math.sqrt(m));
    S(LN.ret, isOpt
      ? `Nothing divided ${m} at or below √${m} ≈ <b>${sq}</b>, so nothing ever will. <b>Return true</b> — and note it took <b>${tested.length}</b> division${tested.length === 1 ? "" : "s"} to prove it.`
      : `No divisor in <b>2…${m - 1}</b> worked, so ${m} is prime. <b>Return true</b> — after <b>${tested.length.toLocaleString("en-US")}</b> divisions, of which only the first ${Math.max(0, sq - 1)} could ever have found anything.`,
      { focus: "ret", done: true, result: "true", ret: { value: true } });
    return steps;
  };
}

const STEP_INPUT = { label: "n =", value: 97, min: -199, max: 199, presets: PRESETS, hint: "−199…199" };

export default {
  n: 13, id: "unprime", title: "Unnatural Prime", dates: ["2025-08-23"],
  statement: `Given an integer, return <code class="inl">true</code> if it is a prime number <b>or</b> the negative of one. A prime is a positive integer above 1 divisible only by 1 and itself; <code class="inl">0</code> and <code class="inl">1</code> are not prime. <span class="rule">Example: <code class="inl">isUnnaturalPrime(-23)</code> → <code class="inl">true</code>, <code class="inl">isUnnaturalPrime(99)</code> → <code class="inl">false</code>.</span>`,
  variants: [
    {
      name: "Divide by every d", tone: "brute", cost: "O(n) — divisions",
      approach: `Take the absolute value, then ask every number from <b>2 up to m − 1</b> whether it divides m. It is the definition of prime typed out literally, and it is correct — the early return means a composite is rejected the moment its first factor turns up. What it wastes is the <b>prime</b> case, where nothing ever returns early and the loop grinds through the entire range. Watch the divisions counter on <b>199</b>.`,
      code: `// Correct, and the definition read literally: try every possible divisor.
function isUnnaturalPrime(n: number): boolean {
  const m = Math.abs(n);              // "negative prime" needs no rule of its own
  if (m < 2) return false;            // 0, 1 and -1 leave here
  for (let d = 2; d < m; d++) {
    if (m % d === 0) return false;    // a factor: composite, stop
  }
  return true;
}`,
      mount: makeMount(brute, "brute"),
    },
    {
      name: "Step: divide by every d", tone: "brute", cost: "every divisor",
      approach: `The literal loop, one division at a time. Run <b>97</b> to watch 95 divisions all come back non-zero, then <b>99</b> — composite, and out on the very first test. The contrast is the lesson: this loop is fast when the answer is <i>false</i> and slowest exactly when it is <i>true</i>. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_BRUTE, trace: makeTrace(false), input: STEP_INPUT }),
    },
    {
      name: "Stop at √n", tone: "opt", cost: "O(√n) — divisions",
      approach: `Factors come in pairs: if <code class='inl'>m = a × b</code> and <code class='inl'>a &gt; √m</code>, then <code class='inl'>b &lt; √m</code> and b was already tried. So the entire range above √m is the <i>second</i> half of pairs already ruled out — reaching it proves there is nothing to find. One extra even check up front halves what is left, at the cost of the one special case that matters: <b>2</b> is prime.`,
      code: `// Same answers, √n of the work: a factor above √m implies one below it.
function isUnnaturalPrime(n: number): boolean {
  const m = Math.abs(n);
  if (m < 2) return false;
  if (m % 2 === 0) return m === 2;    // 2 is the one even prime
  for (let d = 3; d * d <= m; d += 2) {
    if (m % d === 0) return false;
  }
  return true;
}`,
      mount: makeMount(opt, "opt"),
    },
    {
      name: "Step: stop at √n", tone: "opt", cost: "√n divisions",
      approach: `The same walk with two candidates removed: the evens, before the loop, and everything past √m, by the loop condition. On <b>199</b> that is <b>6</b> divisions against the other tab's <b>197</b> — same answer, same input. Then try <b>−44</b>, which never reaches the loop at all. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_OPT, trace: makeTrace(true), input: STEP_INPUT }),
    },
  ],
};
