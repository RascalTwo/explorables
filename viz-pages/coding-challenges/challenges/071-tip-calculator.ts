// #71 · Tip Calculator — whole cents, one Math.round; float dollars misround half-cent ties.
// Parse "$N.NN" into integer cents, take cents * pct / 100 for 15, 20 and the custom percent, round each
// to a whole cent, then format back with (tip / 100).toFixed(2). Rounding happens exactly once, on a
// number that is a true half-cent when it is a tie.
// The trap is doing the multiplication in float dollars: (0.30 * 15 / 100) is really 0.04499999..., and
// .toFixed(2) rounds what is stored, so it prints "$0.04" where the cents version prints "$0.05".
// The three official cases do NOT catch this (their products are not near a half-cent in float), so
// every one passes with the float version too. "$0.30" at 15% is ours, and the red row shows it.
// ONE approach, deliberately. Float-dollars-plus-toFixed is not a second approach, it is the same
// formula with a rounding bug, and a variant that answers a case wrongly cannot ship (CONTRIBUTING
// Tier 1 §3). Click "$0.30 15%" and read the red row.
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// The 3 official freeCodeCamp cases in the grader's order, then one of ours.
//   "$0.30 15%" - ours. 30 * 15 / 100 is exactly 4.5 cents, a tie, and the float-dollar version
//     lands just under it and rounds down. No official case is near a tie.
const CASES = ["$10.00 25%", "$89.67 26%", "$19.85 9%", "$0.30 15%"];
const OFFICIAL = 3; // CASES[0..2] are freeCodeCamp's; the rest are ours.
const EXPECTED: Record<string, string[]> = {
  "$10.00 25%": ["$1.50", "$2.00", "$2.50"],
  "$89.67 26%": ["$13.45", "$17.93", "$23.31"],
  "$19.85 9%": ["$2.98", "$3.97", "$1.79"],
};

// Out-of-contract text is coerced to a price and a whole percent 0..100 so the demo never shows NaN.
function parse(s: string): { price: string; pct: number } {
  const nums = s.match(/\d+(?:\.\d+)?/gu) ?? [];
  const p = Number(nums[0] ?? 0);
  const pct = Math.min(100, Math.floor(Number(nums[1] ?? 0)));
  return { price: `$${p.toFixed(2)}`, pct };
}
const centsOf = (price: string) => Math.round(Number(price.slice(1)) * 100);
const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
const tipCents = (cents: number, pct: number) => Math.round((cents * pct) / 100);
function calc(price: string, pct: number) {
  const cents = centsOf(price);
  return [15, 20, pct].map((r) => fmt(tipCents(cents, r)));
}
// The tempting version: dollars as a float, toFixed on the product.
const floaty = (price: string, pct: number) =>
  [15, 20, pct].map((r) => `$${((Number(price.slice(1)) * r) / 100).toFixed(2)}`);

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .tp-wrap { display:flex; flex-direction:column; gap:12px; }
    .tp-row { display:grid; grid-template-columns:70px 1fr 1fr 1fr; gap:6px; align-items:center; font:12px var(--mono); }
    .tp-row > div { padding:6px 10px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .tp-row b { color:var(--text); }
    .tp-row .hd { background:none; border:none; padding:0 4px; }
    .tp-row .out { border-color:var(--good); }
    .tp-row .out b { color:var(--good); }
    .tp-row .hot { border-color:var(--danger); color:var(--danger); }
    .tp-row .hot b { color:var(--danger); }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();
  let price = "$10.00";
  let pct = 25;

  const ctl = el("div", "controls");
  const pin = el("input");
  pin.type = "text";
  pin.style.width = "90px";
  pin.value = price;
  const tin = el("input");
  tin.type = "text";
  tin.style.width = "60px";
  tin.value = `${pct}%`;
  ctl.append(el("span", "ctl-label", "price ="), pin, el("span", "ctl-label", "custom tip ="), tin);

  // Chips come off CASES, so a case added there can never go unreachable here.
  const pre = el("div", "controls");
  CASES.forEach((v, i) => {
    const c = el("button", "chip", esc(v));
    c.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    c.addEventListener("click", () => {
      const p = parse(v);
      price = p.price;
      pct = p.pct;
      pin.value = price;
      tin.value = `${pct}%`;
      render();
    });
    pre.append(c);
  });

  const out = el("div");
  host.append(ctl, pre, out);
  const onInput = () => {
    const p = parse(`${pin.value} ${tin.value}`);
    price = p.price;
    pct = p.pct;
    render();
  };
  pin.addEventListener("input", onInput);
  tin.addEventListener("input", onInput);
  render();

  function render() {
    out.replaceChildren();
    const cents = centsOf(price);
    const rates = [15, 20, pct];
    const result = calc(price, pct);
    const naive = floaty(price, pct);
    const want = EXPECTED[`${price} ${pct}%`];
    const wrap = el("div", "tp-wrap");

    const line = el("div", "result-line");
    const ok = want === undefined || want.join() === result.join();
    line.append(
      el(
        "span",
        `badge ${ok ? "ok" : "no"}`,
        `calculateTips("${price}", "${pct}%") → ${esc(JSON.stringify(result))}`,
      ),
    );
    if (want) line.append(el("span", "more", "matches freeCodeCamp's expected array"));
    wrap.append(line);

    const head = el("div", "tp-row");
    head.append(
      el("div", "hd", ""),
      el("div", "hd", `exact cents (${cents} × pct / 100)`),
      el("div", "hd", "Math.round → tip"),
      el("div", "hd", "float dollars .toFixed"),
    );
    wrap.append(head);
    rates.forEach((r, i) => {
      const exact = (cents * r) / 100;
      const bad = naive[i] !== result[i];
      const row = el("div", "tp-row");
      row.append(
        el("div", "hd", `<b>${r}%</b>`),
        el("div", "", `<b>${exact}</b>${Number.isInteger(exact) ? "" : " (tie or fraction)"}`),
        el("div", "out", `<b>${result[i]}</b>`),
        el("div", bad ? "hot" : "", `<b>${naive[i]}</b>${bad ? " ✗" : ""}`),
      );
      wrap.append(row);
    });

    wrap.append(el("div", "note", noteFor(cents, rates, result, naive)));
    out.append(wrap);
  }
}

// What did THIS input exercise?
function noteFor(cents: number, rates: number[], result: string[], naive: string[]) {
  const bad = rates.map((_, i) => i).filter((i) => naive[i] !== result[i]);
  if (bad.length > 0)
    return `A float-dollar product is stored just under a half-cent tie: <b>${rates[bad[0]!]}%</b> of ${cents} cents is exactly <b>${(cents * rates[bad[0]!]!) / 100}</b>, which <code class='inl'>Math.round</code> takes up to <b>${result[bad[0]!]}</b>, while <code class='inl'>.toFixed(2)</code> on dollars prints <b>${naive[bad[0]!]}</b>. No official case does this.`;
  const frac = rates.some((r) => !Number.isInteger((cents * r) / 100));
  if (frac)
    return `Some products are not whole cents, so <code class='inl'>Math.round</code> picks the nearest one. Here the float version happens to agree, because none of them sits on a half-cent tie. Try <b>$0.30 15%</b> to see one that does.`;
  return `Every product is already a whole number of cents, so rounding changes nothing. The cents form is still the safe default: the integer product is exact, and the only division left is by 100.`;
}

// ── STEP — cents, rates, round, format ───────────────────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">calculateTips</span>(<span class="tok" data-t="arg">mealPrice, customTip</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> cents = <span class="tok" data-t="cents"><span class="fn">Math.round</span>(<span class="fn">parseFloat</span>(mealPrice.<span class="fn">slice</span>(1)) * 100)</span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">const</span> custom = <span class="tok" data-t="custom"><span class="fn">parseInt</span>(customTip)</span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">const</span> rates = <span class="tok" data-t="rates">[15, 20, custom]</span>;`,
  },
  {
    ln: 5,
    html: `  <span class="k">return</span> <span class="tok" data-t="map">rates.<span class="fn">map</span>((pct) =&gt; {</span>`,
  },
  {
    ln: 6,
    html: `    <span class="k">const</span> tip = <span class="tok" data-t="tip"><span class="fn">Math.round</span>((cents * pct) / 100)</span>;`,
  },
  {
    ln: 7,
    html: `    <span class="k">return</span> <span class="tok" data-t="fmt"><span class="st">\`$\${(tip / 100).toFixed(2)}\`</span></span>;`,
  },
  { ln: 8, html: `  });` },
  { ln: 9, html: `}` },
];

function trace(input: string) {
  const { price, pct: custom } = parse(input);
  const customTip = `${custom}%`;
  const cents = centsOf(price);
  const rates = [15, 20, custom];
  const steps: DbgStep[] = [];
  const outs: string[] = [];

  const S = (
    line: number,
    note: string,
    x: {
      focus?: string;
      changed?: string[];
      cb?: { pct: number; tip?: number };
      eval?: { expr: string; val: boolean };
      done?: boolean;
      result?: string;
      ret?: { value: string };
    } = {},
  ) => {
    // A name appears in the panel only once the line that declares it has run.
    const vars: Record<string, unknown> = { mealPrice: `"${price}"`, customTip: `"${customTip}"` };
    if (line >= 2) vars["cents"] = cents; // `const cents` is line 2
    if (line >= 3) vars["custom"] = custom; // `const custom` is line 3
    if (line >= 4) vars["rates"] = `[${rates.join(", ")}]`; // `const rates` is line 4
    const structs: { label: string; items: (string | number)[]; newest?: boolean }[] = [];
    if (line >= 4) structs.push({ label: "rates", items: rates });
    if (outs.length > 0) structs.push({ label: "results so far", items: [...outs], newest: true });
    const frames: DbgStep["frames"] = [
      {
        title: `calculateTips("${price}", "${customTip}")`,
        vars,
        changed: x.cb ? [] : (x.changed ?? []),
        structs,
        ret: x.cb ? undefined : x.ret,
      },
    ];
    if (x.cb) {
      const cv: Record<string, unknown> = { pct: x.cb.pct };
      if (x.cb.tip !== undefined) cv["tip"] = x.cb.tip; // `const tip` is line 6
      frames.push({
        title: `(pct = ${x.cb.pct}) =>`,
        vars: cv,
        changed: x.changed ?? [],
        structs: [],
        ret: x.ret,
      });
    }
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.result,
      frames,
    });
  };

  S(
    1,
    `Two strings in: the price <b>"${price}"</b> and the custom percent <b>"${customTip}"</b>. Output is an array of three money strings. The plan is to turn the price into whole cents once, and do every later step on integers.`,
    { focus: "arg" },
  );
  S(
    2,
    `<code class='inl'>slice(1)</code> drops the "$", <code class='inl'>parseFloat</code> reads <b>${price.slice(1)}</b>, and <code class='inl'>* 100</code> gives ${Number(price.slice(1)) * 100}. <code class='inl'>Math.round</code> snaps that to <b>${cents}</b> cents, because dollars times 100 can come out as 1984.9999999999998 and an integer is what we want to hold.`,
    { focus: "cents", changed: ["cents"] },
  );
  S(
    3,
    `<code class='inl'>parseInt("${customTip}")</code> stops at the "%" and returns <b>${custom}</b>. The statement guarantees the "N%" shape, so there is nothing to validate.`,
    { focus: "custom", changed: ["custom"] },
  );
  S(
    4,
    `All three tips follow the same formula, so the two fixed rates and the custom one go in one array: <b>[${rates.join(", ")}]</b>. The output order (15, 20, custom) is the order of this array.`,
    { focus: "rates", changed: ["rates"] },
  );
  S(
    5,
    `<code class='inl'>map</code> runs the callback once per rate and keeps the results in that order, which is exactly the order the statement asks for.`,
    {
      focus: "map",
    },
  );

  rates.forEach((r) => {
    const prod = (cents * r) / 100;
    const tip = tipCents(cents, r);
    S(
      6,
      `<b>${cents} × ${r} / 100 = ${prod}</b> cents${Number.isInteger(prod) ? ", already whole" : ""}. <code class='inl'>Math.round</code> gives <b>${tip}</b>. This is the only rounding in the function, and it acts on an exact value${prod % 1 === 0.5 ? ` that is a true half-cent tie, so it rounds up. Float dollars would have stored it just under .5 and rounded down` : ""}.`,
      {
        focus: "tip",
        changed: ["tip"],
        cb: { pct: r, tip },
        eval: { expr: `${prod} is a tie`, val: prod % 1 === 0.5 },
      },
    );
    const s = fmt(tip);
    outs.push(s);
    S(
      7,
      `<code class='inl'>${tip} / 100</code> is ${tip / 100}; <code class='inl'>toFixed(2)</code> pads it to two places, so $0.50 does not print as "$0.5". Returns <b>"${s}"</b> for ${r}%.`,
      { focus: "fmt", cb: { pct: r, tip }, ret: { value: `"${s}"` } },
    );
  });

  const res = JSON.stringify(outs);
  S(
    8,
    `All three callbacks are done and <code class='inl'>map</code> collects the strings in order.`,
    {},
  );
  S(
    9,
    `<b>Return ${res}.</b> Nothing here depended on a float being exact, only on integers and one explicit round.`,
    {
      done: true,
      result: res,
      ret: { value: res },
    },
  );

  return steps;
}

export default {
  n: 71,
  id: "tip-calculator",
  title: "Tip Calculator",
  dates: ["2025-10-20"],
  statement: `Given the price of your meal and a custom tip percent, return an array with three tip values: 15%, 20%, and the custom amount. Prices are given as <code class="inl">"$N.NN"</code>, custom percents as <code class="inl">"25%"</code>, and amounts are returned in the same <code class="inl">"$N.NN"</code> format, rounded to two decimal places. <span class="rule">Example: <code class="inl">calculateTips("$10.00", "25%")</code> → <code class="inl">["$1.50", "$2.00", "$2.50"]</code>.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(1)",
      approach: `Parse the price into whole <b>cents</b>, compute <code class='inl'>cents * pct / 100</code> for 15, 20 and the custom percent, round each with <code class='inl'>Math.round</code>, and format with <code class='inl'>(tip / 100).toFixed(2)</code>. The integer product is exact, so the one rounding acts on a true value. The tempting alternative multiplies float dollars and calls <code class='inl'>.toFixed(2)</code> on the product; a half-cent tie is then stored just below .5 and rounds the wrong way. <b>All three official cases pass either way</b>, so the grader cannot tell them apart; <b>$0.30 at 15%</b> is ours (exactly 4.5 cents, float prints $0.04, the right answer is $0.05). The demo scores the float version in red on the same input.`,
      code: `// Whole cents in, one Math.round, then format back to dollars.
function calculateTips(mealPrice: string, customTip: string): string[] {
  const cents = Math.round(parseFloat(mealPrice.slice(1)) * 100);
  const custom = parseInt(customTip);
  return [15, 20, custom].map((pct) => {
    const tip = Math.round((cents * pct) / 100);
    return \`$\${(tip / 100).toFixed(2)}\`;
  });
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "line-by-line",
      approach: `Type a price and a percent as "$10.00 25%". <code class='inl'>cents</code>, <code class='inl'>custom</code> and <code class='inl'>rates</code> appear only once their lines have run, and the callback gets its own frame per rate. Start with <b>$10.00 25%</b>, where every product is already whole cents. <b>$89.67 26%</b> and <b>$19.85 9%</b> (both official) have fractions, so line 6's round does real work. <b>$0.30 15%</b> (ours) is a true half-cent tie: watch the eval panel on line 6 go green and the tip round up to 5. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            type: "text",
            label: "price, tip =",
            value: CASES[0]!,
            presets: CASES,
            hint: 'price then percent, e.g. "$10.00 25%"',
          },
        }),
    },
  ],
} satisfies Challenge;
