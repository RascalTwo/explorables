// #346 · Piggy Bank — total in cents; "$D.CC" is a formatting step, not arithmetic.
// Two things to get right, and neither is the addition. A coin key may be MISSING
// rather than zero, so every lookup needs a default. And the remainder has to be
// two characters wide: 5 cents is "$0.05", not "$0.5", and 100 cents is "$1.00",
// not "$1.0". padStart is doing real work there — freeCodeCamp only tests the
// remainder 0 at $0.00, so a missing pad passes the official suite and still ships
// a money bug. Both invented presets exist to make that visible.
import { el, esc, mountDebugger } from "../shared.js";

// The table IS the spec — the prompt hands it over as a table, so transcribe it as
// data rather than re-encoding it as a chain of ifs. Insertion order also fixes the
// order the demo and the trace walk the coins in.
const VALUE = { pennies: 1, nickels: 5, dimes: 10, quarters: 25 };
const COINS = Object.keys(VALUE);

// Cases 1–5 are freeCodeCamp's official tests in the order the grader lists them —
// note case 3 omits `pennies` entirely and case 4 is the empty bank. Cases 6–7 are
// invented and cover the only formatting branch the official set never reaches: a
// remainder that needs padding. 5 cents renders "$0.05" (a missing pad gives
// "$0.5") and 400 cents renders "$1.00" (a missing pad gives "$1.0"). Every
// official case happens to have a two-digit remainder or a zero total, so both
// bugs survive the grader untouched.
const CASES = [
  { coins: { pennies: 3, nickels: 5, dimes: 2, quarters: 6 },     label: "$1.98" },
  { coins: { pennies: 1, nickels: 1, dimes: 1, quarters: 1 },     label: "one of each" },
  { coins: { nickels: 8, dimes: 6, quarters: 5 },                 label: "no pennies key" },
  { coins: {},                                                    label: "empty bank" },
  { coins: { pennies: 146, nickels: 11, dimes: 0, quarters: 19 }, label: "$6.76" },
  { coins: { nickels: 1 },                                        label: "1 nickel · pad" },
  { coins: { quarters: 4 },                                       label: "4 quarters · pad" },
];

// The solution itself — shared by the demo and the trace so they cannot drift.
const totalCents = (coins) => COINS.reduce((c, k) => c + (coins[k] ?? 0) * VALUE[k], 0);
const format = (cents) => "$" + Math.floor(cents / 100) + "." + String(cents % 100).padStart(2, "0");

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .pb-jar { display:grid; gap:8px; margin:4px 0 2px; }
    .pb-coin { display:grid; grid-template-columns:86px 112px minmax(30px,1fr) auto auto; align-items:center; gap:12px; }
    .pb-name { font:700 12.5px var(--mono); color:var(--text); }
    .pb-name.absent { color:var(--muted); font-weight:400; font-style:italic; }
    .pb-step { display:flex; align-items:center; gap:5px; }
    .pb-step button { width:26px; height:26px; border-radius:6px; cursor:pointer; font:700 14px var(--sans);
                      background:var(--panel-2); border:1px solid var(--border); color:var(--text); }
    .pb-step button:hover { border-color:var(--accent); }
    .pb-step input { width:56px; }
    .pb-fill { height:10px; border-radius:5px; background:color-mix(in srgb, var(--accent) 55%, transparent); min-width:2px; }
    .pb-sub { font:12px var(--mono); color:var(--muted); white-space:nowrap; }
    .pb-sub b { color:var(--text); }
    .pb-out { display:flex; align-items:baseline; gap:1px; margin:16px 0 2px; }
    .pb-t { font:800 30px var(--mono); padding:3px 5px; border-radius:7px; color:var(--text); }
    .pb-t.sym { color:var(--muted); font-size:24px; }
    .pb-t.pad { background:color-mix(in srgb, var(--warn) 22%, transparent); color:var(--warn); }
    .pb-meta { font:12.5px var(--mono); color:var(--muted); margin-top:8px; }
    .pb-meta b { color:var(--text); }
  `));
}

function mount(host) {
  ensureStyle();
  // `null` means the key is absent from the object, which is a different thing
  // from 0 — the demo has to be able to express both, because the grader does.
  let coins = { ...CASES[0].coins };

  const pre = el("div", "controls");
  CASES.forEach((c) => {
    const chip = el("button", "chip", esc(c.label));
    chip.onclick = () => { coins = { ...c.coins }; render(); };
    pre.append(chip);
  });

  const jar = el("div", "pb-jar");
  const out = el("div");
  host.append(
    el("div", "note", "Step each coin count yourself, or hit <b>×</b> to remove the key from the object entirely — an absent key is not the same as a zero, and the grader passes both. Watch the cents digits: whenever the remainder drops below 10, the highlighted zero is <code class='inl'>padStart</code> earning its place."),
    pre, jar, out,
  );
  render();

  function render() {
    jar.innerHTML = "";
    COINS.forEach((k) => {
      const present = coins[k] != null;
      const n = present ? coins[k] : 0;
      const row = el("div", "pb-coin");
      row.append(el("div", "pb-name" + (present ? "" : " absent"), present ? esc(k) : esc(k) + " —"));

      const step = el("div", "pb-step");
      const dec = el("button", null, "−"), inc = el("button", null, "+");
      const num = el("input"); num.type = "number"; num.min = 0; num.value = n;
      dec.onclick = () => { coins[k] = Math.max(0, n - 1); render(); };
      inc.onclick = () => { coins[k] = n + 1; render(); };
      num.oninput = () => { coins[k] = Math.max(0, Math.round(+num.value) || 0); render(); };
      step.append(dec, num, inc);
      row.append(step);

      const bar = el("div", "pb-fill");
      bar.style.width = Math.min(100, (n * VALUE[k] / Math.max(1, totalCents(coins))) * 100) + "%";
      row.append(bar);

      row.append(el("div", "pb-sub", `<b>${n}</b> × ${VALUE[k]}¢ = <b>${n * VALUE[k]}</b>¢`));

      const kill = el("button", "chip", present ? "×" : "add key");
      kill.title = present ? "delete this key from the object" : "add this key back";
      kill.onclick = () => { if (present) delete coins[k]; else coins[k] = 0; render(); };
      row.append(kill);

      jar.append(row);
    });

    const cents = totalCents(coins);
    const dollars = Math.floor(cents / 100), rem = cents % 100;
    const padded = String(rem).padStart(2, "0");
    const wasPadded = String(rem).length < 2;

    out.innerHTML = "";
    const line = el("div", "pb-out");
    line.append(el("span", "pb-t sym", "$"), el("span", "pb-t", String(dollars)), el("span", "pb-t sym", "."));
    if (wasPadded) {
      line.append(el("span", "pb-t pad", "0"), el("span", "pb-t", String(rem)));
    } else {
      line.append(el("span", "pb-t", padded));
    }
    out.append(line);

    out.append(el("div", "pb-meta",
      `${COINS.map((k) => `${coins[k] ?? 0}×${VALUE[k]}`).join(" + ")} = <b>${cents}</b>¢ &nbsp;·&nbsp; ` +
      `floor(${cents} / 100) = <b>${dollars}</b> &nbsp;·&nbsp; ${cents} % 100 = <b>${rem}</b> → padStart(2, "0") → <b>"${padded}"</b>`));

    const missing = COINS.filter((k) => coins[k] == null);
    out.append(el("div", "note", wasPadded
      ? `The remainder is <b>${rem}</b>, a single character. Without <code class='inl'>padStart(2, "0")</code> this renders <b>"$${dollars}.${rem}"</b> — ${rem === 0 ? "a dollar amount with one decimal place" : `which reads as ${rem * 10} cents, ten times the real value`}. freeCodeCamp never tests a remainder below 10 except at a total of zero, so this bug ships green.`
      : `The remainder is <b>${rem}</b>, already two characters, so <code class='inl'>padStart</code> passes it through untouched. That is exactly why the bug is easy to miss — most inputs never exercise it.${missing.length ? ` Meanwhile <b>${missing.join(", ")}</b> ${missing.length === 1 ? "is" : "are"} absent from the object entirely, and <code class='inl'>?? 0</code> is what keeps the sum from becoming <code class='inl'>NaN</code>.` : ""}`));
  }
}

// ── STEP — the accumulation, then the two formatting decisions ───────────────
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">piggyBank</span>(<span class="tok" data-t="params">coins</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="table">VALUE = { pennies: <span class="nu">1</span>, nickels: <span class="nu">5</span>, dimes: <span class="nu">10</span>, quarters: <span class="nu">25</span> }</span>;` },
  { ln: 3, html: `  <span class="k">let</span> <span class="tok" data-t="init">cents = <span class="nu">0</span></span>;` },
  { ln: 4, html: `  <span class="k">for</span> (<span class="k">const</span> coin <span class="k">in</span> VALUE) {` },
  { ln: 5, html: `    <span class="tok" data-t="add">cents += (coins[coin] ?? <span class="nu">0</span>) * VALUE[coin]</span>;` },
  { ln: 6, html: `  }` },
  { ln: 7, html: `  <span class="k">const</span> <span class="tok" data-t="dollars">dollars = Math.<span class="fn">floor</span>(cents / <span class="nu">100</span>)</span>;` },
  { ln: 8, html: `  <span class="k">const</span> <span class="tok" data-t="rest">rest = <span class="fn">String</span>(cents % <span class="nu">100</span>).<span class="fn">padStart</span>(<span class="nu">2</span>, <span class="st">"0"</span>)</span>;` },
  { ln: 9, html: `  <span class="k">return</span> <span class="tok" data-t="ret"><span class="st">"$"</span> + dollars + <span class="st">"."</span> + rest</span>;` },
  { ln: 10, html: `}` },
];

function trace(caseIndex) {
  const k = Math.max(1, Math.min(CASES.length, caseIndex | 0));
  const { coins } = CASES[k - 1];
  const steps = [];
  let cents = 0, coin = null;
  const dollars = Math.floor(totalCents(coins) / 100);
  const rem = totalCents(coins) % 100;
  const rest = String(rem).padStart(2, "0");

  const shown = () => COINS.map((c) => `${c.slice(0, 1)}:${coins[c] ?? "—"}`);
  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 3) vars.cents = cents;
    if (line >= 4 && line <= 6 && coin) vars.coin = coin;      // the for-in binding
    if (line >= 8) vars.dollars = dollars;                     // declared on line 7
    if (line >= 9) vars.rest = `"${rest}"`;                    // declared on line 8
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `piggyBank(${JSON.stringify(coins)})`, vars, changed: x.changed || [],
                 structs: [{ label: "coins", items: shown() }], ret: x.ret }],
    });
  };

  const keys = Object.keys(coins);
  S(1, `The bank arrives as <b>${JSON.stringify(coins)}</b> — ${keys.length === 0 ? "no keys at all" : `${keys.length} of the 4 coin keys`}. The struct below writes an absent key as <b>—</b>: it is <i>not</i> the same as 0, and reading it gives <code class='inl'>undefined</code>.`,
    { focus: "params" });

  S(2, `The prompt hands you this as a table, so keep it as one. Iterating <b>VALUE</b> rather than <code class='inl'>coins</code> is the quiet decision here — it means a missing key is simply a lookup that returns nothing, instead of a case you have to remember to handle.`,
    { focus: "table" });

  S(3, `Accumulate in <b>whole cents</b>. Every coin is an integer number of them, so the running total is exact — no rounding decision exists to get wrong, because there are no fractions anywhere in the sum.`,
    { focus: "init", changed: ["cents"] });

  for (const c of COINS) {
    coin = c;
    const raw = coins[c];
    const n = raw ?? 0;
    const before = cents;
    cents += n * VALUE[c];
    S(5, raw == null
      ? `<b>coins.${c}</b> is <code class='inl'>undefined</code> — the key isn't there. <code class='inl'>?? 0</code> substitutes <b>0</b>, so this contributes nothing and the total stays <b>${cents}</b>. Without it the multiply yields <code class='inl'>NaN</code>, which then spreads: every later addition returns <code class='inl'>NaN</code> too, and the function ends up returning <code class='inl'>"$NaN.NaN"</code>.`
      : `<b>${n} ${c}</b> × ${VALUE[c]}¢ = <b>${n * VALUE[c]}</b>¢. Total ${before} → <b>${cents}</b>.${raw === 0 ? " The key is present and zero — indistinguishable from absent once <code class='inl'>?? 0</code> has run, which is the point." : ""}`,
      { focus: "add", changed: ["cents", "coin"] });
  }
  coin = null;

  S(7, `<b>floor(${cents} / 100) = ${dollars}</b> — integer division peels off the dollars. <code class='inl'>Math.floor</code>, not <code class='inl'>Math.round</code>: 198 cents is one dollar and change, never two.`,
    { focus: "dollars", changed: ["dollars"] });

  S(8, `<b>${cents} % 100 = ${rem}</b>, then padded to <b>"${rest}"</b>. ${rem >= 10
    ? `Already two digits, so <code class='inl'>padStart</code> does nothing here — and that is precisely why it gets left out. Run the <b>1 nickel</b> case to see it matter.`
    : `Here it earns its keep: without the pad this is <b>"${rem}"</b>, and the return would read <b>"$${dollars}.${rem}"</b> — ${rem === 0 ? "one decimal place instead of two" : `which any reader parses as ${rem * 10} cents`}. A cents field is <i>two characters wide by definition</i>; the number 5 and the string "05" are different things and only one of them is money.`}`,
    { focus: "rest", changed: ["rest"] });

  S(9, `Concatenate: <b>"$" + ${dollars} + "." + "${rest}"</b> = <b>"${format(cents)}"</b>. The arithmetic was all integer; the only place a decimal point exists is in this string.`,
    { focus: "ret", done: true, result: `"${format(cents)}"`, ret: { value: `"${format(cents)}"` } });

  return steps;
}

export default {
  n: 346, id: "piggy", title: "Piggy Bank", dates: ["2026-07-22"],
  statement: `Given an object representing a piggy bank, return the total value as a string formatted <code class="inl">"$D.CC"</code>. The object may contain any of <b>pennies</b> ($0.01), <b>nickels</b> ($0.05), <b>dimes</b> ($0.10) and <b>quarters</b> ($0.25) — <span class="rule">any of them may be missing entirely. Example: <code class="inl">piggyBank({ pennies: 3, nickels: 5, dimes: 2, quarters: 6 })</code> → <b>"$1.98"</b>; <code class="inl">piggyBank({})</code> → <b>"$0.00"</b>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(1) — 4 coins",
      approach: `Count in <b>cents</b> and the money problem disappears: every coin is a whole number of them, so the total is an exact integer and no rounding decision ever comes up. Dollars are then a pure formatting step — <code class='inl'>Math.floor(cents / 100)</code> and <code class='inl'>cents % 100</code>.<br><br>Two details carry the weight. Loop over the <b>value table</b>, not over the input, so a missing key is just a lookup that returns <code class='inl'>undefined</code> — <code class='inl'>?? 0</code> absorbs it, where a bare multiply would produce <code class='inl'>NaN</code> and poison the whole sum. And <code class='inl'>padStart(2, "0")</code> is not decoration: a cents field is two characters wide by definition, so 5 must render <b>"05"</b>. freeCodeCamp only ever tests a sub-10 remainder at a total of zero, so dropping the pad passes the grader and still prints <b>"$0.5"</b> for a nickel.`,
      code: `// Integers all the way, then format once. Iterate the VALUE table rather
// than the input so an absent coin key is simply a lookup that misses.
function piggyBank(coins: Record<string, number>): string {
  const VALUE: Record<string, number> = {
    pennies: 1, nickels: 5, dimes: 10, quarters: 25,
  };

  let cents = 0;
  for (const coin in VALUE) {
    cents += (coins[coin] ?? 0) * VALUE[coin]; // ?? 0 — a missing key is not NaN
  }

  const dollars = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, "0"); // 5 → "05", not "5"
  return "$" + dollars + "." + rest;
}`,
      mount,
    },
    {
      name: "Step through", cost: "line-by-line",
      approach: `Nine lines, and the two that matter are both at the end. Run the <b>no pennies key</b> case and watch line 5 hit an <code class='inl'>undefined</code> that <code class='inl'>?? 0</code> quietly absorbs. Then run <b>1 nickel</b> and <b>4 quarters</b> and watch line 8: the remainders are 5 and 0, both single characters, and <code class='inl'>padStart</code> is the only thing standing between them and <b>"$0.5"</b> / <b>"$1.0"</b>. Neither shape appears anywhere in the official suite. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 6, min: 1, max: CASES.length,
                 presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick a test case` },
      }),
    },
  ],
};
