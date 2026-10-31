// #81 · Nth Prime — count primes as you meet them; the choice is how to spot a composite.
// Two approaches, each paired with its own line-by-line step-through debugger:
//   • BRUTE — walk m = 2, 3, 4… and test each by dividing by EVERY d from 2 to m − 1. A composite
//             stops at its first divisor, but a prime is divided by every number below it: confirming
//             p costs p − 2 divisions, and everything past √p could never have divided it.
//   • OPT   — a sieve of Eratosthenes. Never ask "is m prime?"; cross out the multiples of each prime
//             instead, and whatever is still standing when the scan reaches it is prime.
//             The sieve needs a ceiling, and the nth prime is below n(ln n + ln ln n) for n ≥ 6
//             (Rosser's bound); under 6 the logs misbehave, so 15 is used outright.
// These are different mental models (test each number vs. cross out the multiples), not one test with a
// line changed. The gap is on screen as an op counter: for n = 1000 the divide-by-all test does about
// 3.7 million divisions where the sieve does about 23 thousand crossings and scans. It is a real
// asymptotic win, not a constant factor.
// Both pass all 5 official tests, so the official set never tells them apart; the cost gap is ours to show.
// Flip the Approach toggle on n = 16 (or 1000) to see the same answer reached with a very different bill.
import { el, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// Demo input: any n from 1 to 3000 (brute at 3000 is still tens of millions of divisions, instant enough).
//   5, 10, 16, 99, 1000   the 5 official freeCodeCamp cases, in the grader's order
//   1                     ours: the smallest n; the sieve's first prime is its answer, before any crossing
//   6                     ours: the first n that uses the n(ln n + ln ln n) ceiling instead of the flat 15
// The step-throughs trim 99 and 1000 (hundreds of thousands of steps for the brute one) and keep the rest;
// both trimmed cases are reachable in the demo above.
const DEMO_PRESETS = [5, 10, 16, 99, 1000, 1, 6];
const DEMO_OFFICIAL: Record<number, number> = { 5: 11, 10: 29, 16: 53, 99: 523, 1000: 7919 };
const DEMO_MAX = 3000;
const STEP_CASES = [5, 10, 16, 1]; // 1-3 official, 4 ours
const STEP_OFFICIAL = 3;

// The sieve's ceiling: Rosser's bound for n >= 6, a flat 15 below that (p5 = 11, so 15 is plenty).
const ceiling = (n: number) => (n < 6 ? 15 : Math.ceil(n * (Math.log(n) + Math.log(Math.log(n)))));

interface BruteRun {
  answer: number;
  divs: number; // every m % d evaluated
  cost: number[]; // cost[m] = divisions spent on m
  spf: number[]; // spf[m] = the divisor that stopped m (0 = prime)
}
function bruteRun(n: number): BruteRun {
  const cost: number[] = [];
  const spf: number[] = [];
  let count = 0;
  let m = 1;
  let divs = 0;
  while (count < n) {
    m++;
    let found = 0;
    let spent = 0;
    for (let d = 2; d < m; d++) {
      divs++;
      spent++;
      if (m % d === 0) {
        found = d;
        break;
      }
    }
    cost[m] = spent;
    spf[m] = found;
    if (found === 0) count++;
  }
  return { answer: m, divs, cost, spf };
}

interface SieveRun {
  answer: number;
  limit: number;
  crossings: number; // composite[j] = true writes
  scans: number; // composite[i] reads
  by: number[]; // by[j] = the prime that first crossed j out
}
function sieveRun(n: number): SieveRun {
  const limit = ceiling(n);
  const composite: boolean[] = Array.from({ length: limit + 1 }, () => false);
  const by: number[] = [];
  let count = 0;
  let crossings = 0;
  let scans = 0;
  for (let i = 2; i <= limit; i++) {
    scans++;
    if (composite[i]) continue;
    if (++count === n) return { answer: i, limit, crossings, scans, by };
    for (let j = i * i; j <= limit; j += i) {
      if (!composite[j]) by[j] = i;
      composite[j] = true;
      crossings++;
    }
  }
  return { answer: -1, limit, crossings, scans, by };
}

const fmt = (x: number) => x.toLocaleString("en-US");

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .np-wrap { display:flex; flex-direction:column; gap:12px; }
    .np-grid { display:flex; flex-wrap:wrap; gap:4px; }
    .np-c { min-width:42px; padding:3px 4px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); font:12px var(--mono); text-align:center; line-height:1.25; }
    .np-c small { display:block; font-size:10px; opacity:.8; }
    .np-c.p { border-color:var(--good); background:color-mix(in srgb, var(--good) 14%, transparent); color:var(--good); font-weight:700; }
    .np-c.nth { outline:2px solid var(--warn); outline-offset:1px; }
    .np-c.x { opacity:.55; }
    .np-vs { font:12px var(--mono); color:var(--muted); }
    .np-vs b { color:var(--text); }
  `,
    ),
  );
}

// One number input plus the preset chips, shared by both demos. Calls render(n) on every change.
function controls(host: HTMLElement, render: (n: number, out: HTMLElement) => void) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input");
  inp.type = "number";
  inp.min = "1";
  inp.max = String(DEMO_MAX);
  inp.value = "16";
  inp.style.width = "90px";
  ctl.append(el("span", "ctl-label", "n ="), inp, el("span", "ctl-label", `1–${DEMO_MAX}`));
  const pre = el("div", "controls");
  DEMO_PRESETS.forEach((v) => {
    const b = el("button", "chip", String(v));
    b.title = DEMO_OFFICIAL[v] !== undefined ? "official freeCodeCamp case" : "ours";
    b.addEventListener("click", () => {
      inp.value = String(v);
      go();
    });
    pre.append(b);
  });
  const out = el("div");
  host.append(ctl, pre, out);
  inp.addEventListener("input", go);
  go();
  function go() {
    const n = Math.max(1, Math.min(DEMO_MAX, Math.floor(Number(inp.value)) || 1));
    out.innerHTML = "";
    render(n, out);
  }
}

const GRID_MAX = 150;
function badge(n: number, answer: number) {
  const want = DEMO_OFFICIAL[n];
  const ok = want === undefined || want === answer;
  const line = el("div", "result-line");
  line.append(el("span", `badge ${ok ? "ok" : "no"}`, `nthPrime(${n}) → ${answer}`));
  if (want !== undefined)
    line.append(el("span", "more", `matches freeCodeCamp's expected ${want}`));
  return line;
}

function mountBrute(host: HTMLElement) {
  controls(host, (n, out) => {
    const r = bruteRun(n);
    const s = sieveRun(n);
    const wrap = el("div", "np-wrap");
    wrap.append(badge(n, r.answer));
    const grid = el("div", "np-grid");
    for (let m = 2; m <= Math.min(r.answer, GRID_MAX + 1); m++) {
      const prime = r.spf[m] === 0;
      const b = el(
        "div",
        `np-c${prime ? " p" : " x"}${m === r.answer ? " nth" : ""}`,
        `${m}<small>${r.cost[m]} ÷</small>`,
      );
      b.title = prime
        ? `${m} is prime: ${r.cost[m]} divisions, none divided it`
        : `${m} = ${r.spf[m]} × ${m / r.spf[m]!}: stopped after ${r.cost[m]} division${r.cost[m] === 1 ? "" : "s"}`;
      grid.append(b);
    }
    wrap.append(
      el(
        "div",
        "muted",
        `Each number from 2, with the divisions spent on it${r.answer > GRID_MAX + 1 ? ` (first ${GRID_MAX} shown)` : ""}:`,
      ),
      grid,
      el(
        "div",
        "np-vs",
        `<span class="opcount hot"><span class="n">${fmt(r.divs)}</span> divisions</span> · the sieve would do <b>${fmt(s.crossings + s.scans)}</b> crossings and scans for the same answer`,
      ),
      el("div", "note", bruteNote(n, r)),
    );
    out.append(wrap);
  });
}

function bruteNote(n: number, r: BruteRun) {
  const p = r.answer;
  const cap = Math.floor(Math.sqrt(p));
  if (n === 1)
    return `The first prime is <b>2</b>, and it is free: the inner loop <code class='inl'>d &lt; 2</code> never runs, so nothing divides it and it counts at once. Every later prime pays for the wait.`;
  return `The ${n}th prime is <b>${p}</b>. To confirm it, the test divides by every d from 2 to ${p - 1}: <b>${p - 2}</b> divisions, though only d up to √${p} ≈ ${cap} could ever have divided it. Composites are cheap (each stops at its first divisor, so even numbers cost 1), but each prime is paid for in full, and primes are exactly what we are counting. Grand total <b>${fmt(r.divs)}</b>.`;
}

function mountSieve(host: HTMLElement) {
  controls(host, (n, out) => {
    const r = sieveRun(n);
    const b = bruteRun(n);
    const wrap = el("div", "np-wrap");
    wrap.append(badge(n, r.answer));
    const grid = el("div", "np-grid");
    for (let m = 2; m <= Math.min(r.answer, GRID_MAX + 1); m++) {
      const crossed = r.by[m] !== undefined;
      const cell = el(
        "div",
        `np-c${crossed ? " x" : " p"}${m === r.answer ? " nth" : ""}`,
        `${m}<small>${crossed ? `× ${r.by[m]}` : "prime"}</small>`,
      );
      cell.title = crossed
        ? `${m} was crossed out by ${r.by[m]}, never divided`
        : `${m} was still standing when the scan reached it`;
      grid.append(cell);
    }
    wrap.append(
      el(
        "div",
        "muted",
        `Each number from 2, with the prime that crossed it out${r.answer > GRID_MAX + 1 ? ` (first ${GRID_MAX} shown)` : ""}:`,
      ),
      grid,
      el(
        "div",
        "np-vs",
        `<span class="opcount cool"><span class="n">${fmt(r.crossings + r.scans)}</span> ops</span> · ${fmt(r.crossings)} crossings + ${fmt(r.scans)} scans on a ceiling of ${fmt(r.limit)} · divide-by-all would do <b>${fmt(b.divs)}</b> divisions`,
      ),
      el("div", "note", sieveNote(n, r)),
    );
    out.append(wrap);
  });
}

function sieveNote(n: number, r: SieveRun) {
  const bound =
    n < 6
      ? `With n &lt; 6 the bound <code class='inl'>n(ln n + ln ln n)</code> is unusable (ln ln 1 is not a number), so the ceiling is a flat <b>15</b>, safely past the 5th prime, 11.`
      : `The ceiling is <code class='inl'>ceil(${n} · (ln ${n} + ln ln ${n}))</code> = <b>${fmt(r.limit)}</b>, a guaranteed upper bound on the ${n}th prime (it needs n ≥ 6). The answer ${r.answer} sits well under it.`;
  return `${bound} Nothing is ever divided: each prime crosses out its multiples starting at its own square (smaller multiples already fell to a smaller prime), and the scan simply counts what is still standing. We return the instant the count reaches ${n}, so the sieve past <b>${r.answer}</b> is never finished.`;
}

// ── STEP — shared plumbing ────────────────────────────────────────────────
type X = {
  focus?: string;
  changed?: string[];
  eval?: { expr: string; val: boolean };
  done?: boolean;
};

const caseN = (idx: number) => STEP_CASES[Math.max(1, Math.min(STEP_CASES.length, idx)) - 1]!;
const stepHint = `1–${STEP_CASES.length}: n = ${STEP_CASES.slice(0, STEP_OFFICIAL).join(", ")} official, ${STEP_CASES.slice(STEP_OFFICIAL).join(", ")} ours`;
const stepInput = {
  label: "case =",
  value: 3,
  min: 1,
  max: STEP_CASES.length,
  presets: STEP_CASES.map((_, i) => i + 1),
  hint: stepHint,
};

// ── STEP: divide by every d ───────────────────────────────────────────────
const SRC_BRUTE = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">nthPrime</span>(<span class="tok" data-t="arg">n</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">let</span> <span class="tok" data-t="init">count = 0, m = 1</span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">while</span> (<span class="tok" data-t="wcond">count &lt; n</span>) {`,
  },
  { ln: 4, html: `    <span class="tok" data-t="inc">m++</span>;` },
  {
    ln: 5,
    html: `    <span class="k">let</span> <span class="tok" data-t="flag">prime = true</span>;`,
  },
  {
    ln: 6,
    html: `    <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="dloop">d = 2; d &lt; m</span>; d++) {`,
  },
  {
    ln: 7,
    html: `      <span class="k">if</span> (<span class="tok" data-t="test">m % d === 0</span>)`,
  },
  {
    ln: 8,
    html: `        { <span class="tok" data-t="hit">prime = false; <span class="k">break</span></span>; }`,
  },
  { ln: 9, html: `    }` },
  {
    ln: 10,
    html: `    <span class="k">if</span> (<span class="tok" data-t="count">prime</span>) count++;`,
  },
  { ln: 11, html: `  }` },
  { ln: 12, html: `  <span class="k">return</span> <span class="tok" data-t="ret">m</span>;` },
  { ln: 13, html: `}` },
];

function traceBrute(idx: number) {
  const n = caseN(idx);
  const steps: DbgStep[] = [];
  const primes: number[] = [];
  let count = 0;
  let m = 1;
  let prime = true;
  let d = 0;
  let divs = 0;
  let active = false; // inside the for loop

  const S = (line: number, note: string, x: X = {}) => {
    // A name appears in the panel only once the line that declares it has run.
    const vars: Record<string, unknown> = { n };
    if (line >= 2) {
      vars["count"] = count;
      vars["m"] = m;
    }
    if (line >= 5 && line <= 10) vars["prime"] = prime;
    if (active && line >= 6 && line <= 9) vars["d"] = d;
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.done ? String(m) : undefined,
      frames: [
        {
          title: `nthPrime(${n})`,
          vars,
          changed: x.changed ?? [],
          structs:
            line >= 2 ? [{ label: "primes found", items: primes.slice(), newest: true }] : [],
          ret: x.done ? { value: m } : undefined,
        },
      ],
    });
  };

  S(
    1,
    `Find the <b>${n}th</b> prime. There is no formula for it, so the plan is to walk the integers upward, test each one, and stop when the ${n}th prime is counted.`,
    { focus: "arg" },
  );
  S(
    2,
    `<code class='inl'>count</code> is how many primes we have met; <code class='inl'>m</code> is the number being tried. Starting at 1 means the first <code class='inl'>m++</code> lands on 2, the smallest prime.`,
    {
      focus: "init",
      changed: ["count", "m"],
    },
  );
  for (;;) {
    S(
      3,
      `<code class='inl'>${count} &lt; ${n}</code> is ${count < n}. ${count < n ? `Still short of the ${n}th prime, so try the next number.` : `All ${n} primes counted; <code class='inl'>m</code> is the last one found.`}`,
      {
        focus: "wcond",
        eval: { expr: `count ${count} < n ${n}`, val: count < n },
      },
    );
    if (count >= n) break;
    m++;
    S(4, `Move to <b>${m}</b>.`, { focus: "inc", changed: ["m"] });
    prime = true;
    active = false;
    S(
      5,
      `Assume <b>${m}</b> is prime until a divisor proves otherwise. The flag is reset for every new number.`,
      {
        focus: "flag",
        changed: ["prime"],
      },
    );
    let found = 0;
    for (d = 2; d < m; d++) {
      active = true;
      divs++;
      const hit = m % d === 0;
      const first = d === 2;
      S(
        7,
        `${first ? `The loop runs d = 2 … ${m - 1}. ` : ""}<code class='inl'>${m} % ${d}</code> = ${m % d}, ${hit ? `so <b>${d}</b> divides ${m} and it is composite.` : `not zero, so ${d} is not a factor. The test has no way to know that nothing past √${m} ≈ ${Math.floor(Math.sqrt(m))} can matter, so it keeps going.`}`,
        { focus: "test", eval: { expr: `${m} % ${d} === 0`, val: hit }, changed: ["d"] },
      );
      if (hit) {
        found = d;
        prime = false;
        S(
          8,
          `One divisor is enough. Mark <b>${m}</b> composite and <code class='inl'>break</code>: the remaining d up to ${m - 1} are skipped. This is why composites are cheap here.`,
          {
            focus: "hit",
            changed: ["prime"],
          },
        );
        break;
      }
    }
    if (found === 0) {
      active = false;
      S(
        6,
        m === 2
          ? `<code class='inl'>d = 2; d &lt; 2</code> is false at once, so the loop body never runs and 2 is prime with <b>0</b> divisions.`
          : `The loop ran out: d reached ${m}. Nothing divided <b>${m}</b>, so it is prime, and confirming that took all <b>${m - 2}</b> divisions.`,
        { focus: "dloop" },
      );
    }
    active = false;
    if (found === 0) {
      count++;
      primes.push(m);
    }
    S(
      10,
      found === 0
        ? `<code class='inl'>prime</code> is still true, so <b>${m}</b> is prime number ${count}. Count it.`
        : `<code class='inl'>prime</code> is false, so ${m} adds nothing to the count.`,
      {
        focus: "count",
        changed: found === 0 ? ["count"] : [],
        eval: { expr: `prime = ${found === 0}`, val: found === 0 },
      },
    );
  }
  S(
    12,
    `Return <b>${m}</b>, the ${n}th prime. Total cost: <b>${fmt(divs)}</b> divisions. Compare it with the sieve's trace on this same case.`,
    {
      focus: "ret",
      done: true,
    },
  );
  return steps;
}

// ── STEP: sieve ───────────────────────────────────────────────────────────
const SRC_SIEVE = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">nthPrime</span>(<span class="tok" data-t="arg">n</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> <span class="tok" data-t="limit">limit = n &lt; 6 ? 15 : Math.<span class="fn">ceil</span>(n * (Math.<span class="fn">log</span>(n) + Math.<span class="fn">log</span>(Math.<span class="fn">log</span>(n))))</span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">const</span> <span class="tok" data-t="comp">composite = <span class="k">new</span> <span class="fn">Array</span>(limit + 1).<span class="fn">fill</span>(false)</span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">let</span> <span class="tok" data-t="count">count = 0</span>;`,
  },
  {
    ln: 5,
    html: `  <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="iloop">i = 2; i &lt;= limit</span>; i++) {`,
  },
  {
    ln: 6,
    html: `    <span class="k">if</span> (<span class="tok" data-t="skip">composite[i]</span>) <span class="k">continue</span>;`,
  },
  {
    ln: 7,
    html: `    <span class="k">if</span> (<span class="tok" data-t="found">++count === n</span>) <span class="k">return</span> i;`,
  },
  {
    ln: 8,
    html: `    <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="cross">j = i * i; j &lt;= limit; j += i</span>) composite[j] = true;`,
  },
  { ln: 9, html: `  }` },
  { ln: 10, html: `  <span class="k">return</span> -1;` },
  { ln: 11, html: `}` },
];

function traceSieve(idx: number) {
  const n = caseN(idx);
  const limit = ceiling(n);
  const steps: DbgStep[] = [];
  const crossed: number[] = [];
  const primes: number[] = [];
  const isComp = new Set<number>();
  let count = 0;
  let i = 0;
  let j = 0;
  let ops = 0;
  let crosses = 0;
  let inI = false;
  let inJ = false;
  let answer = 0;

  const S = (line: number, note: string, x: X = {}) => {
    const vars: Record<string, unknown> = { n };
    if (line >= 2) vars["limit"] = limit;
    if (line >= 4) vars["count"] = count;
    if (inI && line >= 5 && line <= 8) vars["i"] = i;
    if (inJ && line === 8) vars["j"] = j;
    const structs = [];
    if (line >= 3)
      structs.push({
        label: "crossed out",
        items: crossed.toSorted((a, b) => a - b),
        newest: false,
      });
    if (line >= 4) structs.push({ label: "primes found", items: primes.slice(), newest: true });
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.done ? String(answer) : undefined,
      frames: [
        {
          title: `nthPrime(${n})`,
          vars,
          changed: x.changed ?? [],
          structs,
          ret: x.done ? { value: answer } : undefined,
        },
      ],
    });
  };

  S(
    1,
    `Find the <b>${n}th</b> prime. Instead of testing numbers one by one, cross out every multiple of each prime and let the survivors announce themselves in order.`,
    { focus: "arg" },
  );
  S(
    2,
    n < 6
      ? `A sieve needs a ceiling, and n = ${n} is under 6, where <code class='inl'>ln ln n</code> is unusable (ln ln 1 is not a number). Use a flat <b>15</b>: the 5th prime is 11, so 15 is more than enough.`
      : `A sieve needs a ceiling that is certain to contain the ${n}th prime. For n ≥ 6 it is below <code class='inl'>n(ln n + ln ln n)</code> (Rosser's bound), so <code class='inl'>limit</code> = <b>${fmt(limit)}</b>. Generous, but a safe bound beats a guessed one.`,
    { focus: "limit", changed: ["limit"] },
  );
  S(
    3,
    `One flag per number up to ${fmt(limit)}, all false: nothing is known to be composite yet. This table is the whole memory of the algorithm.`,
    { focus: "comp" },
  );
  S(4, `<code class='inl'>count</code> will tally primes as the scan meets them.`, {
    focus: "count",
    changed: ["count"],
  });
  for (i = 2; i <= limit; i++) {
    inI = true;
    inJ = false;
    ops++;
    if (i === 2)
      S(5, `The scan visits 2, 3, 4… up to ${fmt(limit)}, once each.`, {
        focus: "iloop",
        changed: ["i"],
      });
    const comp = isComp.has(i);
    S(
      6,
      comp
        ? `<b>${i}</b> is flagged: some smaller prime already crossed it out, so it is composite and was never divided. <code class='inl'>continue</code> skips it.`
        : `<b>${i}</b> is not flagged. Every smaller prime has already crossed out its multiples, and none reached ${i}, so ${i} is prime.`,
      {
        focus: "skip",
        eval: { expr: `composite[${i}]`, val: comp },
        changed: i === 2 ? [] : ["i"],
      },
    );
    if (comp) continue;
    count++;
    primes.push(i);
    const isNth = count === n;
    S(
      7,
      isNth
        ? `<code class='inl'>++count</code> makes it <b>${count}</b>, which equals n: ${i} is the ${n}th prime. Return it now, without finishing the sieve.`
        : `<code class='inl'>++count</code> makes it ${count}; ${n - count} more to find, so keep going.`,
      { focus: "found", changed: ["count"], eval: { expr: `${count} === ${n}`, val: isNth } },
    );
    if (isNth) {
      answer = i;
      S(
        7,
        `Return <b>${i}</b>. Total cost: <b>${fmt(ops)}</b> scans and <b>${fmt(crosses)}</b> crossings. Compare it with the divide-by-all trace on this same case.`,
        { focus: "found", done: true },
      );
      return steps;
    }
    inJ = i * i <= limit;
    if (!inJ) {
      S(
        8,
        `${i} · ${i} = ${i * i} is past the ceiling ${fmt(limit)}, so the crossing loop has nothing to do. (Every multiple of ${i} below ${i * i} already fell to a smaller prime.)`,
        { focus: "cross" },
      );
      continue;
    }
    for (j = i * i; j <= limit; j += i) {
      crosses++;
      const fresh = !isComp.has(j);
      isComp.add(j);
      if (fresh) crossed.push(j);
      S(
        8,
        j === i * i
          ? `Cross out multiples of <b>${i}</b>, starting at ${i} · ${i} = <b>${j}</b>: anything smaller, like ${i} · 2, already fell to a smaller prime. Flag ${j}.`
          : `Flag ${j} = ${j - i} + ${i}. ${fresh ? "" : "Already crossed by a smaller prime; flagging it again is harmless."}`,
        { focus: "cross", changed: ["j"] },
      );
    }
    inJ = false;
  }
  S(
    10,
    `Ran past the ceiling without reaching ${n} primes (the bound guarantees this never happens).`,
    { focus: "arg", done: true },
  );
  return steps;
}

export default {
  n: 81,
  id: "nth-prime",
  title: "Nth Prime",
  dates: ["2025-10-30"],
  statement: `A prime number is a positive integer greater than 1 that is divisible only by 1 and itself. The first five prime numbers are <code class="inl">2</code>, <code class="inl">3</code>, <code class="inl">5</code>, <code class="inl">7</code>, and <code class="inl">11</code>. Given a positive integer <code class="inl">n</code>, return the <code class="inl">n</code>th prime number. <span class="rule">Example: <code class="inl">nthPrime(5)</code> → <code class="inl">11</code>.</span>`,
  variants: [
    {
      name: "Divide by every d",
      tone: "brute",
      cost: "O(p²) — p − 2 divisions per prime",
      approach: `Walk m = 2, 3, 4… and test each by dividing by every d from 2 to m − 1; count the survivors until the nth. A composite stops at its first divisor, so it is cheap. A prime is divided by <b>everything below it</b>, and primes are what we are counting: confirming <code class='inl'>p</code> costs <code class='inl'>p − 2</code> divisions, though nothing past √p could ever have divided it. The red counter shows the bill. It passes all five official cases (the grader never times it), so the cost gap here is ours to show: try <b>16</b>, then <b>1000</b>. Cases <b>1</b> and <b>6</b> are ours. Type any n up to ${DEMO_MAX}.`,
      code: `// Test every m by dividing by every d below it; count the primes met.
function nthPrime(n: number): number {
  let count = 0;
  let m = 1;
  while (count < n) {
    m++;
    let prime = true;
    for (let d = 2; d < m; d++) {
      if (m % d === 0) { prime = false; break; }   // a prime survives all m - 2 tries
    }
    if (prime) count++;
  }
  return m;
}`,
      mount: mountBrute,
    },
    {
      name: "Step: divide by every d",
      tone: "brute",
      cost: "line-by-line",
      approach: `A debugger for the divide-by-all test. Step through a few numbers and watch each composite stop at its first divisor while each prime walks the whole way up to m − 1. The default case is <b>3</b> (n = 16, the divergence case): it spends about 400 divisions to find 53, where the sieve's trace on the same case does about a quarter of that. Cases 1–3 are official (n = 5, 10, 16); case 4 (n = 1) is ours. n = 99 and n = 1000 are trimmed here (hundreds of thousands of steps) but reachable in the demo tab. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, { source: SRC_BRUTE, trace: traceBrute, input: stepInput }),
    },
    {
      name: "Sieve of Eratosthenes",
      tone: "opt",
      cost: "O(L log log L) — L ≈ n ln n",
      approach: `Stop testing numbers; cross them out. Each prime crosses out its multiples starting at its own square, and the scan counts whatever is still standing. A composite is never divided at all. The catch is a sieve needs a ceiling: the nth prime is below <code class='inl'>n(ln n + ln ln n)</code> for n ≥ 6, and a flat 15 covers n &lt; 6. It returns the moment the count hits n, so the sieve past the answer is never finished. Same answers, same five official cases, a fraction of the work: the blue counter against the red one on <b>16</b> and <b>1000</b>. Case <b>1</b> returns before a single crossing; case <b>6</b> is the first to use the log ceiling.`,
      code: `// Cross out multiples of each prime; the nth survivor the scan meets is the answer.
function nthPrime(n: number): number {
  const limit = n < 6 ? 15 : Math.ceil(n * (Math.log(n) + Math.log(Math.log(n))));
  const composite: boolean[] = new Array<boolean>(limit + 1).fill(false);
  let count = 0;
  for (let i = 2; i <= limit; i++) {
    if (composite[i]) continue;                            // crossed out by a smaller prime
    if (++count === n) return i;
    for (let j = i * i; j <= limit; j += i) composite[j] = true;   // smaller multiples already fell
  }
  return -1;
}`,
      mount: mountSieve,
    },
    {
      name: "Step: sieve",
      tone: "opt",
      cost: "line-by-line",
      approach: `The same input as the divide-by-all trace, run as a sieve. Watch the <b>crossed out</b> list grow as each prime flags its multiples, and the scan skip them without a single division. On the default case <b>3</b> (n = 16) it finds 53 in a quarter of the steps. Case <b>4</b> (n = 1) returns on line 7 before the crossing loop ever runs. Cases 1–3 are official; n = 99 and n = 1000 are trimmed here but reachable in the demo tab. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, { source: SRC_SIEVE, trace: traceSieve, input: stepInput }),
    },
  ],
} satisfies Challenge;
