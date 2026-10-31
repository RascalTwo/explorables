// #57 · Phone Home — flight time plus 0.5 s per satellite, and satellites are legs minus one.
// A route of n distances has n legs and only n-1 satellites between them: the first leg
// leaves YOU, the last one arrives HOME, and neither of those is a satellite. So
//   time = sum(route) / 300000  +  (route.length - 1) * 0.5
// then rounded to four decimals with the trailing zeros dropped. Three readings go wrong:
//   - "each satellite adds 0.5 s" is route.length - 1, not route.length. Charge a delay per
//     LEG and every answer is 0.5 s too high; the demo prints that wrong figure beside the
//     right one for every input. The official set catches it on every case.
//   - "rounded to 4 decimals, trailing zeros removed" is two steps: toFixed(4) is a STRING
//     ("2.5000"), and the unary + turns it back into a number (2.5). Skip the + and chai's
//     loose assert.equal (==) still says "2.5000" == 2.5, so the grader cannot see it; the
//     return type is wrong all the same, and the gallery's strict check does catch it.
//   - a one-element route is a legal input with zero satellites: [300000] is 1, not 1.5. The
//     official tests never go below two legs, so [300000] is ours.
// ONE approach, deliberately. Summing the legs in a loop, in a reduce or one leg at a time is
// the same arithmetic spelled four ways, and the work is O(n) either way with nothing on
// screen to compare (CONTRIBUTING Tier 3 §1-§3), so a second tab would be a strawman.
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

const SPEED = 300000; // km per second
const DELAY = 0.5; // seconds per satellite passed through

// The 6 official freeCodeCamp cases in the grader's order, then one of ours.
//   1 [300000, 300000]       2.5      one satellite; "2.5000" loses its zeros
//   2 [384400, 384400]       3.0627   Earth-Moon distance twice; 2.56266... rounds UP
//   3 [54600000, 54600000]   364.5    Earth-Mars scale; travel dwarfs the 0.5 s delay
//   4 [1000000, 500000000, 1000000]  1674.3333   two satellites; one huge leg; 1673.333... rounds DOWN
//   5 [10000, 21339, ...]    2.4086   four satellites; the DELAYS are 2 s of the 2.4 s total
//   6 [802101, 725994, ...]  21.1597  four satellites and real travel; both terms matter
//   7 [300000]               ours     no satellites at all: 1, not 1.5
const ROUTES: { route: number[]; want?: number }[] = [
  { route: [300000, 300000], want: 2.5 },
  { route: [384400, 384400], want: 3.0627 },
  { route: [54600000, 54600000], want: 364.5 },
  { route: [1000000, 500000000, 1000000], want: 1674.3333 },
  { route: [10000, 21339, 50000, 31243, 10000], want: 2.4086 },
  { route: [802101, 725994, 112808, 3625770, 481239], want: 21.1597 },
  { route: [300000] },
];
const OFFICIAL = 6; // ROUTES[0..5] are freeCodeCamp's; the rest are ours.

const sendMessage = (route: number[]) =>
  +(route.reduce((s, d) => s + d, 0) / SPEED + (route.length - 1) * DELAY).toFixed(4);

// The wrong reading, scored on the same route so the demo can show it.
const perLeg = (route: number[]) =>
  +(route.reduce((s, d) => s + d, 0) / SPEED + route.length * DELAY).toFixed(4);

const fmt = (n: number) => n.toLocaleString("en-US");
const label = (r: number[]) => `[${r.join(", ")}]`;

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .ph-wrap { display:flex; flex-direction:column; gap:12px; }
    .ph-bar { display:flex; height:30px; border-radius:8px; overflow:hidden; border:1px solid var(--border); background:var(--panel-2); }
    .ph-bar i { display:block; height:100%; min-width:2px; }
    .ph-bar .leg { background:color-mix(in srgb, var(--c1) 55%, transparent); border-right:1px solid var(--panel); }
    .ph-bar .sat { background:color-mix(in srgb, var(--warn) 70%, transparent); border-right:1px solid var(--panel); }
    .ph-key { font:11px var(--mono); color:var(--muted); display:flex; flex-wrap:wrap; gap:12px; }
    .ph-key .leg { color:var(--c1); } .ph-key .sat { color:var(--warn); }
    .ph-row .k { min-width:92px; }
    .ph-row .exp { flex:1; }
    .ph-row .v { font-weight:700; }
    .ph-warn { font:12px var(--sans); color:var(--danger); border:1px solid var(--danger); border-radius:8px; padding:5px 10px; background:color-mix(in srgb, var(--danger) 10%, transparent); }
  `,
    ),
  );
}

// "300000, 300000" -> [300000, 300000]; anything that is not a non-negative number is dropped.
function parse(s: string): number[] {
  return s
    .split(/[\s,[\]]+/u)
    .filter((t) => t !== "")
    .map(Number)
    .filter((n) => Number.isFinite(n) && n >= 0);
}

function mount(host: HTMLElement) {
  ensureStyle();

  const ctl = el("div", "controls");
  const inp = el("input");
  inp.type = "text";
  inp.value = label(ROUTES[0]!.route).slice(1, -1);
  inp.style.width = "340px";
  ctl.append(el("span", "ctl-label", "route (km) ="), inp);

  const pre = el("div", "controls");
  ROUTES.forEach((c, i) => {
    const b = el("button", "chip", esc(label(c.route)));
    b.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    b.addEventListener("click", () => {
      inp.value = c.route.join(", ");
      render();
    });
    pre.append(b);
  });

  const out = el("div");
  host.append(ctl, pre, out);
  inp.addEventListener("input", () => render());
  render();

  function render() {
    const route = parse(inp.value);
    out.innerHTML = "";
    if (route.length === 0) {
      out.append(el("div", "note", "Type one or more distances in km, separated by commas."));
      return;
    }
    const sats = route.length - 1;
    const travel = route.reduce((s, d) => s + d, 0) / SPEED;
    const delay = sats * DELAY;
    const raw = travel + delay;
    const fixed = raw.toFixed(4);
    const result = sendMessage(route);
    const wrong = perLeg(route);
    const want = ROUTES.find((c) => c.route.join() === route.join())?.want;

    const wrap = el("div", "ph-wrap");

    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${want === undefined || want === result ? "ok" : "no"}`,
        `sendMessage(${esc(label(route))}) → ${result}`,
      ),
      el(
        "span",
        "more",
        want === undefined
          ? `${route.length} leg${route.length === 1 ? "" : "s"} · ${sats} satellite${sats === 1 ? "" : "s"}`
          : `${route.length} legs · ${sats} satellite${sats === 1 ? "" : "s"} · matches freeCodeCamp's expected ${want}`,
      ),
    );
    wrap.append(line);

    // The timeline: each leg's flight time, with a delay slot at every satellite BETWEEN legs.
    const bar = el("div", "ph-bar");
    route.forEach((d, i) => {
      const t = d / SPEED;
      const leg = Object.assign(el("i", "leg"), {
        title: `leg ${i + 1}: ${fmt(d)} km = ${+t.toFixed(4)} s`,
      });
      leg.style.width = `${(t / raw) * 100}%`;
      bar.append(leg);
      if (i < sats) {
        const sat = Object.assign(el("i", "sat"), { title: `satellite ${i + 1}: +0.5 s` });
        sat.style.width = `${(DELAY / raw) * 100}%`;
        bar.append(sat);
      }
    });
    wrap.append(bar);
    wrap.append(
      el(
        "div",
        "ph-key",
        `<span class="leg">■ flight time (km ÷ 300 000)</span><span class="sat">■ satellite delay (0.5 s each)</span>`,
      ),
    );

    const rows: [string, string, string][] = [
      [
        "travel",
        `${+travel.toFixed(4)} s`,
        `${fmt(route.reduce((s, d) => s + d, 0))} km ÷ 300 000 km/s`,
      ],
      ["delay", `${delay} s`, `${sats} satellite${sats === 1 ? "" : "s"} × 0.5 s — legs minus one`],
      ["raw total", String(raw), "the double as JavaScript holds it"],
      ["toFixed(4)", `"${fixed}"`, "a STRING, rounded to four places"],
      ["+", String(result), "back to a number; trailing zeros fall away"],
    ];
    const tbl = el("div");
    rows.forEach(([k, v, why]) =>
      tbl.append(
        el(
          "div",
          "srow ph-row",
          `<span class="k">${k}</span><span class="v mono">${esc(v)}</span><span class="exp">${why}</span>`,
        ),
      ),
    );
    wrap.append(tbl);

    wrap.append(
      el(
        "div",
        "ph-warn",
        `Charge a delay per <b>leg</b> (${route.length} × 0.5) and this reads <b>${wrong}</b>, not <b>${result}</b> — the first leg leaves you and the last arrives home, so neither passes through a satellite.`,
      ),
    );

    wrap.append(el("div", "note", noteFor(route, sats, travel, delay, fixed, result)));
    out.append(wrap);
  }
}

// What did THIS route exercise? Each branch names a different thing to get wrong.
function noteFor(
  route: number[],
  sats: number,
  travel: number,
  delay: number,
  fixed: string,
  result: number,
) {
  if (sats === 0)
    return `One distance means <b>no satellites</b>: you transmit straight to home, so the delay term is <code class='inl'>(1 - 1) * 0.5 = 0</code> and the answer is the flight time alone, <b>${result}</b>. This is the input that tells <code class='inl'>length - 1</code> from "half a second per leg" — the latter says 1.5. The official cases all have at least two legs, so this one is ours.`;
  if (travel < delay)
    return `The <b>delays dominate</b>: ${sats} satellites cost <b>${delay} s</b> and the whole flight only <b>${+travel.toFixed(4)} s</b>. At short range the 0.5 s per hop is the answer, and getting the count of satellites off by one moves the result by a fifth of itself. The bar shows it — the amber slots are wider than the blue legs.`;
  if (fixed.endsWith("0") && String(result) !== fixed)
    return `<code class='inl'>toFixed(4)</code> returns the <i>string</i> <code class='inl'>"${fixed}"</code> — it pads to four places, it does not trim. The requirement "trailing zeros removed" is the unary <code class='inl'>+</code>: <code class='inl'>+"${fixed}"</code> is <b>${result}</b>, a number, and a number has no notion of trailing zeros. Return the string and the grader's loose <code class='inl'>assert.equal</code> would still pass on this input, but you would be returning the wrong type.`;
  if (travel > delay * 20)
    return `Travel is <b>${+travel.toFixed(4)} s</b> against a delay of only <b>${delay} s</b>, so the satellites barely register on the bar. The count still has to be right — it is 0.5 s of ${result} — but here the problem is really a division, and the rounding is where the digits go: raw <code class='inl'>${esc(String(travel + delay))}</code> becomes <b>${result}</b>.`;
  return `<b>${route.length}</b> legs, <b>${sats}</b> satellites: travel is <b>${+travel.toFixed(4)} s</b>, delay is <b>${delay} s</b>, and the raw total <code class='inl'>${esc(String(travel + delay))}</code> is rounded to <b>${result}</b>. Both terms matter here, which is why the sum of the legs is divided <i>once</i> at the end rather than rounded leg by leg — rounding each leg to four places would let the errors pile up.`;
}

// ── STEP — a sum, a count, a total, a round ────────────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">sendMessage</span>(<span class="tok" data-t="arg">route</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> travel = <span class="tok" data-t="travel">route.<span class="fn">reduce</span>((s, d) =&gt; s + d, 0) / 300000</span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">const</span> delay = <span class="tok" data-t="delay">(route.length - 1) * 0.5</span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">const</span> total = <span class="tok" data-t="total">travel + delay</span>;`,
  },
  {
    ln: 5,
    html: `  <span class="k">return</span> <span class="tok" data-t="plus">+</span><span class="tok" data-t="fixed">total.<span class="fn">toFixed</span>(4)</span>;`,
  },
  { ln: 6, html: `}` },
];

function trace(idx: number) {
  const route = ROUTES[Math.max(1, Math.min(ROUTES.length, idx)) - 1]!.route;
  const sats = route.length - 1;
  const sum = route.reduce((s, d) => s + d, 0);
  const travel = sum / SPEED;
  const delay = sats * DELAY;
  const total = travel + delay;
  const fixed = total.toFixed(4);
  const result = +fixed;
  const steps: DbgStep[] = [];
  const have: Record<string, unknown> = {};

  const S = (
    line: number,
    note: string,
    x: {
      focus?: string;
      changed?: string[];
      done?: boolean;
      result?: string;
      ret?: { value: string };
    } = {},
  ) => {
    // A name appears in the panel only once the line that declares it has run.
    const vars: Record<string, unknown> = { route: label(route) };
    ["travel", "delay", "total"].forEach((k, i) => {
      if (line >= i + 2) vars[k] = have[k];
    });
    steps.push({
      line,
      note,
      focus: x.focus,
      done: x.done,
      result: x.result,
      frames: [
        {
          title: `sendMessage(${label(route)})`,
          vars,
          changed: x.changed ?? [],
          // route is a parameter, so it is in scope from line 1 and stays.
          structs: [{ label: "route (km)", items: route.map(fmt) }],
          ret: x.ret,
        },
      ],
    });
  };

  S(
    1,
    `<b>${route.length}</b> distance${route.length === 1 ? "" : "s"}, so ${route.length} leg${route.length === 1 ? "" : "s"} of the trip. Two quantities make the answer: how long the signal is <i>in flight</i> (all legs, at one speed) and how long it <i>waits</i> (once per satellite). They add, and neither depends on the other. Keep one question in mind: how many satellites is that?`,
    { focus: "arg" },
  );

  have["travel"] = travel;
  S(
    2,
    `Add every leg first — <b>${fmt(sum)} km</b> — and divide by the speed <i>once</i>: <b>${travel}</b> s. Time is distance over speed and the speed is the same on every leg, so there is no reason to divide leg by leg, and dividing late means there is exactly one place for floating-point error to enter before the final rounding.`,
    { focus: "travel", changed: ["travel"] },
  );

  have["delay"] = delay;
  S(
    3,
    sats === 0
      ? `<code class='inl'>route.length - 1</code> is <b>0</b>: a single leg goes from you straight to home with no satellite in between, so the delay is <b>0</b>. "Each satellite the message passes through" counts satellites, and there are none. This is the input that tells <code class='inl'>- 1</code> from a flat "half a second per distance", which would say 0.5.`
      : `<b>${route.length}</b> distances but only <b>${sats}</b> satellite${sats === 1 ? "" : "s"}: the first leg starts at <i>you</i> and the last ends at <i>home</i>, and neither endpoint is a satellite. Every satellite sits <i>between</i> two legs, so the count is legs minus one, and the delay is <b>${sats} × 0.5 = ${delay}</b> s. Use <code class='inl'>route.length</code> and every answer is 0.5 s too high.`,
    { focus: "delay", changed: ["delay"] },
  );

  have["total"] = total;
  S(
    4,
    `<b>${travel} + ${delay} = ${total}</b>. Now it is just a number with too many digits, and ${
      travel < delay
        ? `<i>delay</i> is the larger share here (${delay} s of ${+total.toFixed(4)}), so the satellites decide the answer`
        : `<i>flight time</i> is the larger share here, so the distances decide the answer`
    }. Nothing is rounded yet, on purpose: rounding the two terms separately and then adding them can land one in the last place away from rounding the sum.`,
    { focus: "total", changed: ["total"] },
  );

  S(
    5,
    `<code class='inl'>total.toFixed(4)</code> is the <b>string</b> <code class='inl'>"${fixed}"</code>. It rounds to four places and <i>pads</i> to four places, so ${
      fixed.endsWith("0")
        ? `the trailing zero${fixed.endsWith("00") ? "s are" : " is"} still there — the requirement said to remove ${fixed.endsWith("00") ? "them" : "it"}, and a string cannot do that`
        : `nothing is padded here, but it is still a string, not the number the grader compares against`
    }. The <code class='inl'>+</code> in front has not run yet.`,
    { focus: "fixed" },
  );

  S(
    5,
    `<b>Return ${result}.</b> The unary <code class='inl'>+</code> turns <code class='inl'>"${fixed}"</code> into the number ${result}, and a number is printed without trailing zeros — that is how "trailing zeros removed" is met without any string trimming.`,
    {
      focus: "plus",
      done: true,
      result: String(result),
      ret: { value: String(result) },
    },
  );
  return steps;
}

export default {
  n: 57,
  id: "phone-home",
  title: "Space Week Day 3: Phone Home",
  dates: ["2025-10-06"],
  statement: `Given an array of distances in km — you to the first satellite, satellite to satellite, last satellite to your home planet — return how many seconds a message takes to arrive. It travels at <b>300,000 km/s</b>, and each satellite it <b>passes through</b> adds a <b>0.5 s</b> delay. Return a number rounded to <b>4 decimal places</b> with trailing zeros removed. <span class="rule">Example: <code class="inl">sendMessage([300000, 300000])</code> → <code class="inl">2.5</code> — the two legs take 1 s each, and the one satellite between them adds 0.5 s. That is 2 legs but only <b>1</b> satellite: the first leg leaves you and the last arrives home.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(n) — one pass",
      approach: `Time is distance over speed, plus a wait at each satellite, so the code is one sum, one count and one rounding. The sum is divided by <code class='inl'>300000</code> once, since every leg flies at the same speed. The count is the part that goes wrong: <b>a route of n distances has n legs but only n-1 satellites</b>, because the first leg starts at you and the last ends at home, so the delay is <code class='inl'>(route.length - 1) * 0.5</code>. Use <code class='inl'>route.length</code> and every answer is 0.5 s high; the red line under each demo prints that wrong figure for the route on screen. <code class='inl'>[300000]</code> is ours and the one that separates the two readings hardest: with no satellite at all the answer is 1, not 1.5. The last requirement is two steps hiding in one sentence. <code class='inl'>toFixed(4)</code> rounds and pads but returns a <b>string</b> (<code class='inl'>"2.5000"</code>); the unary <code class='inl'>+</code> turns it back into a number, and a number has no trailing zeros to remove. Type any comma-separated route, or click a case: the first six are freeCodeCamp's, whose answers range from 2.4 s (delays dominate) to 1674 s (one huge leg dominates).`,
      code: `// Flight time over all legs, plus 0.5 s per satellite — and satellites are legs minus one.
function sendMessage(route: number[]): number {
  const travel = route.reduce((s, d) => s + d, 0) / 300000;   // one division, all legs
  const delay = (route.length - 1) * 0.5;                     // first leg leaves you, last arrives home
  const total = travel + delay;
  return +total.toFixed(4);   // toFixed -> "2.5000" (a string); unary + -> 2.5
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "sum, count, round",
      approach: `The function one quantity per line, with <code class='inl'>travel</code>, <code class='inl'>delay</code> and <code class='inl'>total</code> appearing in the panel only once their line has run, and the route held as an array the whole time. Start on <b>case 1</b>, <code class='inl'>[300000, 300000]</code>, where the two legs make <i>one</i> satellite and the string <code class='inl'>"2.5000"</code> loses its zeros on the last line. <b>Case 5</b> is the delay-dominated one: four satellites cost 2 s of the 2.4 s total. <b>Case 4</b> rounds down off a repeating third. <b>Case 7</b>, <code class='inl'>[300000]</code>, is ours — zero satellites, so line 3 evaluates to 0. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            label: "case =",
            value: 1,
            min: 1,
            max: ROUTES.length,
            presets: ROUTES.map((_, i) => i + 1),
            hint: `1–${ROUTES.length}: 1–${OFFICIAL} official, ${ROUTES.length} ours`,
          },
        }),
    },
  ],
} satisfies Challenge;
