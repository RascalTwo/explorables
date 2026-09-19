// #312 · Streaming Cost — four prices and one discount; the whole problem is WHERE you round.
// Every price ends in .99, so the subtotal is already a lie the moment it is a double:
// 3.99 + 5.99 + 12.99 + 19.99 is 42.959999999999993747, not 42.96. That part is harmless —
// one rounding at the end lands on the right cent anyway. What is NOT harmless is rounding
// the LINES: 19.99 × 0.75 is 14.9925, and a cart of three of them is $44.97 if you round each
// line and $44.98 if you round once at the end. freeCodeCamp's own case 4 is exactly that cart,
// so the grader itself rules on the question — round ONCE, on the discounted total.
// ONE approach, and the divergence is precisely why: two graded variants may never disagree on
// an answer (CONTRIBUTING Tier 3), and on case 4 these two do. The per-line alternative ships as
// a comparison row inside the demo, not as a second tab.
// The other half is the return type: the spec says the format "$D.CC", so the answer is a
// STRING with a dollar sign on the front. toFixed(2) is the right call here — not the trap it
// is on #359, where the grader wanted a number.
import { el, esc, mountDebugger } from "../shared.js";

// The official price table, transcribed from the statement's 2×2 grid. Rows are the
// format, columns the type — the same two axes the cart items carry, so the lookup is
// PRICES[item.format][item.type] and there is no branch anywhere in the function.
const PRICES = {
  "HD": { rent: 3.99, buy: 12.99 },
  "4K": { rent: 5.99, buy: 19.99 },
};
// The tiers, in the statement's order. `off` is the fraction taken OFF, so the multiplier
// applied to the subtotal is (1 - off).
const TIERS = [
  { id: "none", off: 0, label: "full price" },
  { id: "basic", off: 0.1, label: "10% off" },
  { id: "premium", off: 0.25, label: "25% off" },
];
const DISCOUNTS = Object.fromEntries(TIERS.map((t) => [t.id, t.off]));
const FORMATS = Object.keys(PRICES);        // ["HD", "4K"]
const TYPES = Object.keys(PRICES.HD);       // ["rent", "buy"]

// The solution itself, split so the demo, the trace and the comparison row all share it
// and cannot drift from each other.
const priceOf = (item) => PRICES[item.format][item.type];
const subtotalOf = (cart) => cart.reduce((sum, item) => sum + priceOf(item), 0);
const rawTotal = (cart, tier) => subtotalOf(cart) * (1 - DISCOUNTS[tier]);
const roundAtEnd = (cart, tier) => "$" + rawTotal(cart, tier).toFixed(2);
// What most people write instead: discount and round each LINE, then add the cents up.
// Every price ends in .99, so every discounted line ends in a fraction of a cent that this
// throws away — and the shortfall compounds one line at a time.
const roundPerLine = (cart, tier) =>
  "$" + cart.reduce((sum, item) => sum + Math.round(priceOf(item) * (1 - DISCOUNTS[tier]) * 100) / 100, 0).toFixed(2);

// A double's shortest printable form is a summary, not the value. 53.946 is really
// 53.945999999999997954 — and showing that is the entire point of this module, so anything
// that renders a running total needs both. The `\.?` in the strip is load-bearing:
// toPrecision(20) pads a whole dollar amount out to "1.0000000000000000000", and
// removing only the zeros leaves a dangling "1." — which never equals String(1), so
// every exact whole-dollar total would be reported as drifting when it does not.
const isExact = (x) => !Number.isFinite(x) || x === 0 || x.toPrecision(20).replace(/\.?0+$/, "") === String(x);
const full = (x) => (x === 0 ? "0" : x.toPrecision(20));

// ── Cases ────────────────────────────────────────────────────────────────────
// Cases 1–6 are freeCodeCamp's six official tests, in the order the grader lists them.
// Cases 7–8 are invented. Each one lands somewhere different:
//   1  one HD rental, no tier   → the multiplier is 1; nothing is discounted and nothing rounds
//   2  one HD buy, premium      → 9.7425, the first real rounding decision, and it goes DOWN
//   3  two rentals + a buy      → a repeated line, and 18.873 — a third decimal that is not a tie
//   4  three 4K buys, premium   → 44.9775: per-LINE rounding gives $44.97 and FAILS the grader
//   5  all four table cells     → the subtotal double is 42.959999999999994 with no discount at all
//   6  the same cart, basic     → same cart, tier changed: 38.663999999999994 → $38.66
//   7  empty cart, premium      → invented: reduce needs its 0 seed, and 0 × 0.75 is still 0
//   8  six mixed lines, basic   → invented: the module's thesis, $53.95 against a per-line $53.94
// Case 4 is the one the official set already rules on. Case 8 is ours, and it makes the same
// point at a DIFFERENT tier and a bigger cart, where the shortfall is six tenths of a cent
// accumulated one line at a time rather than a single 3/4-cent slice.
const CASES = [
  { cart: ["HD rent"], tier: "none", label: "1 · no tier" },
  { cart: ["HD buy"], tier: "premium", label: "2 · 25% off one" },
  { cart: ["HD rent", "HD rent", "HD buy"], tier: "basic", label: "3 · repeats" },
  { cart: ["4K buy", "4K buy", "4K buy"], tier: "premium", label: "4 · per-line fails" },
  { cart: ["HD rent", "4K rent", "HD buy", "4K buy"], tier: "none", label: "5 · all four cells" },
  { cart: ["HD rent", "4K rent", "HD buy", "4K buy"], tier: "basic", label: "6 · same cart, basic" },
  { cart: [], tier: "premium", label: "7 · empty cart" },
  { cart: ["HD rent", "HD rent", "4K rent", "HD buy", "HD buy", "4K buy"], tier: "basic", label: "8 · six lines split" },
];
// Cases are written as "FORMAT type" strings so the array above reads like a receipt.
const toCart = (rows) => rows.map((r) => ({ format: r.split(" ")[0], type: r.split(" ")[1] }));

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .stc-card { border:1px solid var(--border); border-radius:12px; overflow:hidden; background:var(--panel); margin:4px 0 0; }
    .stc-row { display:grid; grid-template-columns:26px minmax(84px,auto) minmax(96px,auto) 62px minmax(0,1fr) 28px;
               align-items:center; gap:10px; padding:7px 12px; }
    .stc-row + .stc-row { border-top:1px solid var(--border); }
    .stc-row.stc-head { background:var(--panel-2); font:700 10px var(--sans); letter-spacing:.08em;
                        text-transform:uppercase; color:var(--muted); padding:8px 12px; }
    .stc-n { font:700 12px var(--mono); color:var(--muted); }
    .stc-seg { display:flex; gap:4px; }
    .stc-seg .chip { padding:3px 9px; font-size:11.5px; }
    .stc-p { font:800 13px var(--mono); color:var(--text); font-variant-numeric:tabular-nums; text-align:right; }
    .stc-cut { font:11.5px var(--mono); color:var(--muted); font-variant-numeric:tabular-nums; }
    .stc-cut b { color:var(--text); }
    .stc-cut s { color:var(--danger); text-decoration-color:var(--danger); opacity:.85; }
    .stc-x { width:26px; height:26px; border-radius:6px; cursor:pointer; font:700 13px var(--sans);
             background:var(--panel-2); border:1px solid var(--border); color:var(--muted); }
    .stc-x:hover { border-color:var(--danger); color:var(--danger); }
    .stc-empty { padding:16px 12px; font:12.5px var(--mono); color:var(--muted); text-align:center; }
    .stc-sum { font:13px var(--mono); color:var(--muted); margin:14px 0 3px; word-break:break-word; }
    .stc-sum b { color:var(--text); font-size:15px; }
    .stc-bits { font:11.5px var(--mono); color:var(--muted); opacity:.72; word-break:break-all; margin:1px 0 2px; }
    .stc-bits em { color:var(--warn); font-style:normal; }
    .stc-cmp { border:1px solid var(--border); border-radius:12px; overflow:hidden; margin:12px 0 0; }
    .stc-c { display:grid; grid-template-columns:minmax(0,1fr) auto auto; align-items:center; gap:14px;
             padding:11px 13px; font:12.5px var(--mono); }
    .stc-c + .stc-c { border-top:1px solid var(--border); }
    .stc-c .stc-v { font:800 22px var(--mono); font-variant-numeric:tabular-nums; }
    .stc-lab { font:700 9.5px var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--muted); white-space:nowrap; }
    .stc-c.ship { background:color-mix(in srgb, var(--accent) 8%, transparent); }
    .stc-c.ship .stc-v, .stc-c.ship .stc-lab { color:var(--accent); }
    .stc-c.other .stc-v { color:var(--muted); }
    .stc-c.other.split .stc-v, .stc-c.other.split .stc-lab { color:var(--danger); }
  `));
}

function mount(host) {
  ensureStyle();
  // Open on case 5 — every cell of the price table, no discount, and a subtotal that already
  // prints as 42.959999999999994. The reader arrives with the raw double on screen and has to
  // *choose* a tier to reach the divergence, rather than landing in it.
  let cart = toCart(CASES[4].cart);
  let tier = CASES[4].tier;

  const pre = el("div", "controls");
  CASES.forEach((c) => {
    const chip = el("button", "chip", esc(c.label));
    chip.onclick = () => { cart = toCart(c.cart); tier = c.tier; render(); };
    pre.append(chip);
  });

  const tierBar = el("div", "controls");
  tierBar.append(el("span", "ctl-label", "subscription ="));
  const tierEls = {};
  TIERS.forEach((t) => {
    const chip = el("button", "chip", `${t.id} · ${t.label}`);
    chip.onclick = () => { tier = t.id; render(); };
    tierEls[t.id] = chip; tierBar.append(chip);
  });

  const card = el("div", "stc-card");
  const addBar = el("div", "controls");
  const add = el("button", "chip", "+ add a movie");
  add.onclick = () => { cart = [...cart, { format: "HD", type: "rent" }]; render(); };
  addBar.append(add);
  const out = el("div");

  host.append(
    el("div", "note", "Flip any line between <b>HD/4K</b> and <b>rent/buy</b>, add or drop movies, change the tier. The subtotal is printed twice — once the way JavaScript summarises it and once at <b>full precision</b> — so you can watch the crumbs that <code class='inl'>.toFixed(2)</code> is about to sweep up."),
    pre, tierBar, card, addBar, out,
  );
  render();

  function render() {
    const off = DISCOUNTS[tier];
    TIERS.forEach((t) => tierEls[t.id].classList.toggle("on", t.id === tier));

    card.innerHTML = "";
    const head = el("div", "stc-row stc-head");
    head.append(el("div", null, "#"), el("div", null, "format"), el("div", null, "type"),
      el("div", null, "price"), el("div", null, off ? `line × ${1 - off}` : "no discount"), el("div", null, ""));
    card.append(head);

    if (!cart.length) {
      card.append(el("div", "stc-empty", "empty cart — nothing to price"));
    }
    cart.forEach((item, i) => {
      const row = el("div", "stc-row");
      row.append(el("div", "stc-n", String(i + 1)));

      const fseg = el("div", "stc-seg");
      FORMATS.forEach((f) => {
        const b = el("button", "chip" + (item.format === f ? " on" : ""), f);
        b.onclick = () => { item.format = f; render(); };
        fseg.append(b);
      });
      const tseg = el("div", "stc-seg");
      TYPES.forEach((ty) => {
        const b = el("button", "chip" + (item.type === ty ? " on" : ""), ty);
        b.onclick = () => { item.type = ty; render(); };
        tseg.append(b);
      });
      row.append(fseg, tseg);

      const p = priceOf(item);
      row.append(el("div", "stc-p", "$" + p.toFixed(2)));

      // The per-line column is the alternative made visible: what this line WOULD be worth
      // if it were discounted and rounded on its own, and what that rounding throws away.
      const cut = p * (1 - off);
      const cutRounded = Math.round(cut * 100) / 100;
      const lost = cut - cutRounded;
      row.append(el("div", "stc-cut", off === 0
        ? `<b>$${p.toFixed(2)}</b> — unchanged`
        : `${cut} → <b>$${cutRounded.toFixed(2)}</b> <s>${(lost * 100).toFixed(1)}¢</s>`));

      const kill = el("button", "stc-x", "×");
      kill.title = "drop this movie";
      kill.onclick = () => { cart = cart.filter((_, j) => j !== i); render(); };
      row.append(kill);
      card.append(row);
    });

    const sub = subtotalOf(cart);
    const raw = rawTotal(cart, tier);
    const ship = roundAtEnd(cart, tier);
    const perLine = roundPerLine(cart, tier);
    const split = ship !== perLine;

    out.innerHTML = "";
    out.append(el("div", "stc-sum", cart.length
      ? `${cart.map((it) => priceOf(it).toFixed(2)).join(" + ")} &nbsp;=&nbsp; <b>${sub}</b>`
      : `reduce over 0 lines returns its seed &nbsp;=&nbsp; <b>0</b>`));
    if (!isExact(sub))
      out.append(el("div", "stc-bits", `the subtotal double actually holds <em>${full(sub)}</em> — the decimal above is a summary`));

    out.append(el("div", "stc-sum",
      `<b>${sub}</b> &nbsp;×&nbsp; (1 &minus; ${off}) &nbsp;=&nbsp; <b>${raw}</b>`));
    if (!isExact(raw))
      out.append(el("div", "stc-bits", `and the discounted double holds <em>${full(raw)}</em> — this is the number <code class='inl'>toFixed(2)</code> is handed`));

    const cmp = el("div", "stc-cmp");
    const rowOf = (cls, expr, tag, val) => {
      const r = el("div", "stc-c " + cls);
      r.append(el("div", null, expr), el("div", "stc-lab", tag), el("div", "stc-v", val));
      return r;
    };
    cmp.append(rowOf("ship", `"$" + total.toFixed(2)`, "returned", ship));
    cmp.append(rowOf("other" + (split ? " split" : ""), "round each line, then add", split ? "disagrees" : "agrees", perLine));
    out.append(cmp);

    const shortfall = (raw - Number(perLine.slice(1))) * 100;   // in cents
    out.append(el("div", "note", split
      ? `Every price ends in <b>.99</b>, so every discounted line ends in a fraction of a cent — and rounding the line throws that fraction away <i>before</i> it can add up with the others. Across ${cart.length} line${cart.length === 1 ? "" : "s"} the shortfall reaches <b>${shortfall.toFixed(2)}¢</b>, which is enough to move the last cent: <b>${ship}</b> against <b>${perLine}</b>. Nothing here is a judgement call — freeCodeCamp's <b>case 4</b> (three 4K buys on premium) is a cart where per-line rounding returns $44.97 and <i>fails the grader</i>. <b>Round once, at the end.</b>`
      : off === 0
        ? `No discount, so no line has a fraction of a cent to lose and the two agree trivially. Pick <b>basic</b> or <b>premium</b> and the question becomes real — the crumbs only exist once something is multiplied by 0.9 or 0.75.`
        : `They agree <i>here</i> — the discarded fractions happen to be too small to move the last cent on this cart. That is exactly why the bug survives: most carts never reach the boundary. Try <b>4 · per-line fails</b> (official) or <b>8 · six lines split</b>.`));

    out.append(el("div", "note", `The return type is fixed by the spec's <code class='inl'>"$D.CC"</code>: a <b>string</b>, dollar sign included. <code class='inl'>total.toFixed(2)</code> already returns <code class='inl'>"${raw.toFixed(2)}"</code>, so the whole answer is <code class='inl'>"$" + that</code> — <b>${ship}</b>. Wrapping it in <code class='inl'>Number()</code> would fail all six assertions, and so would returning <code class='inl'>${raw}</code> unrounded.`));
  }
}

// ── The `code` snippet, with both tables interpolated from the constants above, so the
// copy-pasteable solution cannot drift from the data the demo actually prices carts with.
const priceRows = Object.entries(PRICES)
  .map(([f, row]) => `  "${f}": { rent: ${row.rent}, buy: ${row.buy} },`).join("\n");
const tierRows = TIERS
  .map((t) => `  ${t.id}: ${t.off},`.padEnd(20) + `// ${t.label}`).join("\n");

const CODE = `// The statement's 2x2 grid, transcribed as data: row = format, column = type.
// The cart items already carry both axes, so the lookup needs no branch at all.
type Item = { format: "HD" | "4K"; type: "rent" | "buy" };
type Tier = "none" | "basic" | "premium";

const PRICES: Record<Item["format"], Record<Item["type"], number>> = {
${priceRows}
};

// \`off\` is the fraction taken OFF, so the subtotal is scaled by (1 - off).
const DISCOUNTS: Record<Tier, number> = {
${tierRows}
};

function getStreamingBill(cart: Item[], subscription: Tier): string {
  // Sum at FULL precision. These prices all end in .99, so this double is already
  // slightly off — 3.99 + 5.99 + 12.99 + 19.99 is 42.959999999999993747, not 42.96.
  // That is fine: one rounding at the end still lands on the correct cent.
  const subtotal = cart.reduce((sum, item) => sum + PRICES[item.format][item.type], 0);

  // Discount the TOTAL, never the lines. 19.99 * 0.75 is 14.9925; round that per line
  // and three of them come to $44.97 instead of $44.98, which is an official test.
  const total = subtotal * (1 - DISCOUNTS[subscription]);

  // Round exactly once, here. toFixed(2) returns a STRING, and the spec asks for the
  // format "$D.CC" — so the string is the answer, not a number to be re-wrapped.
  return "$" + total.toFixed(2);
}`;

// ── STEP — build the two tables, sum the cart, discount once, round once ─────
const SRC = [
  { ln: 1, html: `<span class="k">const</span> <span class="tok" data-t="decl">PRICES</span> = {` },
  { ln: 2, html: `  <span class="st">"HD"</span>: { <span class="tok" data-t="hd">rent: 3.99, buy: 12.99</span> },` },
  { ln: 3, html: `  <span class="st">"4K"</span>: { <span class="tok" data-t="k4">rent: 5.99, buy: 19.99</span> },` },
  { ln: 4, html: `<span class="tok" data-t="seal">}</span>;` },
  { ln: 5, html: `<span class="k">const</span> DISCOUNTS = { <span class="tok" data-t="disc">none: 0, basic: 0.1, premium: 0.25</span> };` },
  { ln: 6, html: `<span class="k">function</span> <span class="fn">getStreamingBill</span>(<span class="tok" data-t="params">cart, subscription</span>) {` },
  { ln: 7, html: `  <span class="k">const</span> subtotal = cart.<span class="fn">reduce</span>((sum, item) =&gt; sum + <span class="tok" data-t="lookup">PRICES[item.format][item.type]</span><span class="tok" data-t="seed">, 0</span>);` },
  { ln: 8, html: `  <span class="k">const</span> total = <span class="tok" data-t="mul">subtotal *</span> (1 - <span class="tok" data-t="off">DISCOUNTS[subscription]</span>);` },
  { ln: 9, html: `  <span class="k">return</span> <span class="tok" data-t="dollar"><span class="st">"$"</span> +</span> <span class="tok" data-t="fixed">total.<span class="fn">toFixed</span>(<span class="nu">2</span>)</span>;` },
  { ln: 10, html: `}` },
];

// Instrumented run → generic debugger steps. One frame, no recursion. Scope by omission:
// PRICES fills across lines 1–4 and then stays (it is a module constant, still in scope
// inside the call); DISCOUNTS appears at line 5; the `cart` struct only at line 6 when the
// parameters bind. `sum`/`item` belong to the reduce callback and exist ONLY on line 7 —
// they are gone the moment `subtotal` comes into being, which is the same instant.
function trace(caseIndex) {
  const idx = Math.max(0, Math.min(CASES.length - 1, (caseIndex | 0) - 1));
  const c = CASES[idx];
  const cart = toCart(c.cart), tier = c.tier, off = DISCOUNTS[tier];
  const steps = [];

  let priceRowsIn = 0, discIn = false;        // how much of each table has been built
  let sum = null, item = null;                // the reduce callback's bindings — line 7 only
  let subtotal = null, total = null;

  const priceItems = () => {
    const rows = [];
    if (priceRowsIn >= 1) rows.push("HD rent 3.99", "HD buy 12.99");
    if (priceRowsIn >= 2) rows.push("4K rent 5.99", "4K buy 19.99");
    return rows;
  };

  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 6) { vars.cart = `${cart.length} item${cart.length === 1 ? "" : "s"}`; vars.subscription = `"${tier}"`; }
    if (line === 7 && sum !== null) { vars.sum = sum; if (item) vars.item = `${item.format} ${item.type}`; }
    if (line >= 7 && subtotal !== null) vars.subtotal = subtotal;
    if (line >= 8 && total !== null) vars.total = total;
    const structs = [];
    if (line >= 1) structs.push({ label: "PRICES", items: priceItems(), newest: !!x.tableNew });
    if (discIn) structs.push({ label: "DISCOUNTS", items: TIERS.map((t) => `${t.id}:${t.off}`) });
    if (line >= 6) structs.push({ label: "cart", items: cart.map((it) => `${it.format} ${it.type}`), newest: false });
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: line >= 6 ? `getStreamingBill(cart, "${tier}")` : "module scope", vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `The statement <b>prints you a 2×2 grid</b>, so the first decision is made before any call happens: transcribe it as <b>data</b>, once, at module load. A chain of <code class='inl'>if (format === "HD" && type === "rent")</code> would encode the same four numbers as control flow, where you can only read them by tracing execution.`, { focus: "decl" });

  priceRowsIn = 1;
  S(2, `The HD row lands: <b>rent $3.99, buy $12.99</b>. Both keys are the literal strings the cart items already carry — which is the reason this shape was chosen over four separate constants. Nothing has to be translated between the input and the table.`, { focus: "hd", tableNew: true });

  priceRowsIn = 2;
  S(3, `The 4K row: <b>rent $5.99, buy $19.99</b>. Note the key <code class='inl'>"4K"</code> <b>must</b> be quoted — an identifier cannot start with a digit, so <code class='inl'>PRICES.4K</code> is a syntax error. That is also why the lookup below uses brackets for both axes rather than dot notation for either.`, { focus: "k4", tableNew: true });

  S(4, `Four prices, and every one of them ends in <b>.99</b>. Not a cosmetic detail: <code class='inl'>3.99</code> has no exact binary representation, so each of these is already a hair off before a single sum happens. Everything downstream inherits that, and the last line is where it gets resolved.`, { focus: "seal" });

  discIn = true;
  S(5, `The tiers, as a second table keyed by the subscription string. The values are the fraction taken <b>off</b>, so a tier is applied as <code class='inl'>× (1 − off)</code> — and <code class='inl'>0.1</code> is itself inexact (the double is 0.1000000000000000055511), which is where the crumbs on line 8 come from.`, { focus: "disc" });

  S(6, `Call <b>getStreamingBill</b> with ${cart.length === 0 ? "an <b>empty</b> cart" : `a cart of <b>${cart.length}</b> item${cart.length === 1 ? "" : "s"}`} on the <b>${tier}</b> tier — case ${idx + 1}, <i>${c.label.split(" · ")[1]}</i>. The two parameters bind. ${cart.length === 0
    ? `Nothing has been priced because there is nothing to price — and an empty cart is a perfectly legal one, so the function has to survive it rather than assume a line exists.`
    : `Nothing has been priced yet: the cart is still a list of format/type <i>labels</i>, and no number from the table has been touched.`}`,
    { focus: "params", changed: ["cart", "subscription"] });

  sum = 0;
  S(7, `<b>reduce</b> starts from the explicit seed <b>0</b>. ${cart.length === 0
    ? `That seed is doing real work right now: with no initial value, reduce on an <b>empty</b> array throws <code class='inl'>TypeError: Reduce of empty array with no initial value</code> rather than returning 0. An empty cart is a legal cart.`
    : `Seeding it also makes the empty cart safe — without an initial value reduce would take <code class='inl'>cart[0]</code> as the seed and throw outright on a cart with nothing in it.`}`,
    { focus: "seed", changed: ["sum"] });

  cart.forEach((it, i) => {
    item = it;
    const p = priceOf(it);
    const before = sum;
    sum = sum + p;
    const drift = !isExact(sum)
      ? ` The running total now prints as <b>${sum}</b>, but the double actually holds <b>${full(sum)}</b> — the error is already here, ${cart.length > i + 1 ? "and it is not going to cancel out" : "and this is what gets discounted"}.`
      : ` This one still lands on an exact double, which is luck rather than design.`;
    S(7, `Line ${i + 1} is <b>${it.format} ${it.type}</b>. One bracket pair per axis: <code class='inl'>PRICES["${it.format}"]["${it.type}"]</code> → <b>$${p.toFixed(2)}</b>. Add it: ${before} + ${p} = <b>${sum}</b>.${drift}`,
      { focus: "lookup", changed: ["sum", "item"] });
  });

  subtotal = sum; sum = null; item = null;
  S(7, `reduce hands back <b>${subtotal}</b> and only now does <code class='inl'>subtotal</code> exist — <code class='inl'>sum</code> and <code class='inl'>item</code> belonged to the callback and vanish with it. ${isExact(subtotal)
    ? `This subtotal is exact.`
    : `And it is <b>not</b> the number it prints as: the double is <b>${full(subtotal)}</b>. Resist the urge to round here — the spec rounds the <b>bill</b>, and rounding twice is how you lose a cent.`}`,
    { focus: "seed", changed: ["subtotal"] });

  total = subtotal * (1 - off);
  const perLine = roundPerLine(cart, tier);
  const ship = "$" + total.toFixed(2);
  const split = ship !== perLine;
  S(8, `Apply the tier <b>once</b>, to the whole subtotal: <b>${subtotal} × (1 − ${off}) = ${total}</b>.${off === 0
    ? ` The <b>none</b> tier multiplies by 1, so this line is a no-op — but it still runs, and it is still the only place a discount is allowed to happen.`
    : subtotal === 0
      ? ` Zero scaled by anything is still zero, so the tier has nothing to act on — but the multiply runs regardless, which is why no <code class='inl'>if (cart.length)</code> guard is needed anywhere above.`
      : isExact(total)
        ? ` This product happens to land on an exact double, which is luck rather than design.`
      : ` The double holds <b>${full(total)}</b> — that, not the decimal you just read, is what line 9 is about to round.`}${cart.length && off ? ` <b>This is the line the alternative gets wrong.</b> Discounting inside the reduce would round <b>${cart.length}</b> separate value${cart.length === 1 ? "" : "s"} instead of one.` : ""}`,
    { focus: "off", changed: ["total"] });

  S(9, `<b>toFixed(2)</b> rounds <b>${total}</b> to the nearest cent — exactly <b>once</b>, on the discounted total — giving <b>"${total.toFixed(2)}"</b>. ${split
    ? `Round each line first instead and this cart comes to <b>${perLine}</b>: every discounted line ends in a fraction of a cent, and dropping ${cart.length} of those fractions is enough to move the last digit. freeCodeCamp's <b>case 4</b> is exactly this shape, so the grader itself settles the argument.`
    : cart.length === 0
      ? `There are no lines here, so the two rounding strategies have nothing to disagree <i>about</i> — which is worth seeing, because it means the empty cart cannot tell you which one is right. Load <b>case 4</b> or <b>case 8</b> for that.`
      : `Rounding each line first would also give <b>${perLine}</b> on this cart — which is why the mistake survives: the two only part company once the discarded fractions add up to half a cent. Load <b>case 4</b> or <b>case 8</b> to see them split.`}`,
    { focus: "fixed", eval: { expr: `round-per-line === ${ship}`, val: !split } });

  S(9, `<b>"$" + "${total.toFixed(2)}"</b> → <b>${ship}</b>. The concatenation is not decoration: the spec asks for the format <code class='inl'>"$D.CC"</code> and the grader asserts <code class='inl'>getStreamingBill(…) === "${ship}"</code>. Returning the <b>number</b> ${Number(total.toFixed(2))} fails, and so does <code class='inl'>"${total.toFixed(2)}"</code> without the sign — <code class='inl'>toFixed</code> gave us a string, and here that is the answer rather than the trap.`,
    { focus: "dollar", done: true, result: ship, ret: { value: ship } });

  return steps;
}

export default {
  n: 312, id: "streaming", title: "Streaming Cost", dates: ["2026-06-18"],
  statement: `Given an array of movies in a cart and a subscription tier, return the total cost. Each cart item has a <code class="inl">format</code> (<code class="inl">"HD"</code> or <code class="inl">"4K"</code>) and a <code class="inl">type</code> (<code class="inl">"rent"</code> or <code class="inl">"buy"</code>), priced <b>HD</b> $3.99&nbsp;/&nbsp;$12.99 and <b>4K</b> $5.99&nbsp;/&nbsp;$19.99. The tier discount is <code class="inl">"none"</code> full price, <code class="inl">"basic"</code> 10% off, <code class="inl">"premium"</code> 25% off. Return the total rounded to two decimals in the format <code class="inl">"$D.CC"</code>. <span class="rule">Example: three 4K buys on <code class="inl">"premium"</code> → 3 × $19.99 = $59.97, less 25% = 44.9775 → <b>"$44.98"</b>. Round each line instead and you get $44.97.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n)",
      approach: `The pricing is a <b>lookup, not a branch</b>. The statement prints a 2×2 grid and the cart items already carry both of its axes, so <code class='inl'>PRICES[item.format][item.type]</code> reads a cell directly — four <code class='inl'>if</code>s would encode the same four numbers as control flow for nothing.<br><br>Then the one decision the challenge actually turns on: <b>round once, at the end, on the discounted total.</b> Every price ends in <code class='inl'>.99</code>, so every discounted line ends in a fraction of a cent — <code class='inl'>19.99 × 0.75</code> is <code class='inl'>14.9925</code>. Round the <i>lines</i> and you throw those fractions away one at a time; three 4K buys on premium come to <b>$44.97</b> instead of <b>$44.98</b>. That cart is freeCodeCamp's own case 4, so this one is settled by the grader rather than by taste.<br><br>The big binary-float number is the <i>less</i> dangerous half. <code class='inl'>3.99 + 5.99 + 12.99 + 19.99</code> really is <code class='inl'>42.959999999999993747</code>, and it does not matter — the error is far smaller than half a cent, so a single <code class='inl'>toFixed(2)</code> still lands on the right one. Carry the mess, round it once.<br><br>Finally the return type, which is the opposite of the usual trap: the spec asks for <code class='inl'>"$D.CC"</code>, so the answer is a <b>string</b>. <code class='inl'>toFixed(2)</code> already returns one — just prepend the dollar sign and hand it back.`,
      code: CODE, mount,
    },
    {
      name: "Step through", cost: "the one rounding",
      approach: `A debugger that starts <b>before</b> the function, watching both tables get transcribed — because turning the printed grid into data is where half this challenge is decided. Then one call: <code class='inl'>reduce</code> seeds at <b>0</b> (case 7 is an empty cart, where that seed is the difference between <code class='inl'>0</code> and a <code class='inl'>TypeError</code>) and folds one price in per line. Watch <code class='inl'>sum</code> and <code class='inl'>item</code> vanish at the instant <code class='inl'>subtotal</code> comes into being — they were the callback's, not the function's.<br><br>The steps that matter are 8 and 9. It opens on <b>case 4</b>, the official cart where discounting per line and discounting the total give different bills: <b>$44.98</b> against <b>$44.97</b>. Step through <b>case 6</b> and they agree, which is precisely why the mistake is easy to ship. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 4, min: 1, max: CASES.length,
                 presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: 1–6 official, 7–8 invented` },
      }),
    },
  ],
};
