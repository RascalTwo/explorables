// #348 · Loan Calculator — round for display only; carry the balance at full precision.
// The spec says "return each remaining balance rounded to the nearest dollar", and the
// trap is reading that as "round the balance". Round what you PUSH and keep the real
// number in the loop, or next month's interest is charged on a figure that never
// existed. On the official 50%/$10 case, rounding the carried balance produces an
// 11-month schedule where the right answer is 15. The other half is the loop test:
// it asks whether `balance > 0`, not whether the last pushed dollar figure was 0 —
// that same case posts a displayed 0 while $0.20 is still owed, then runs one more.
import { el, esc, mountDebugger } from "../shared.js";

// Cases 1–5 are freeCodeCamp's official tests in the order the grader lists them.
// They cover 0% interest, a clean payoff, the pathological 50%/$1 case, and a
// 33-month run. Cases 6–7 are invented: 6 is a high rate where interest eats two
// thirds of the first payment, so the "principal" bar is visibly the smaller half;
// 7 is 0% with a payment that does NOT divide the loan, so the final clamp has to
// swallow a partial month — official case 1 divides evenly and never exercises it.
const CASES = [
  { loan: 1000,  rate: 0,   pay: 200,  label: "0% · even split" },
  { loan: 1000,  rate: 5,   pay: 200,  label: "5% · $1000" },
  { loan: 10,    rate: 50,  pay: 1,    label: "50% · $10" },
  { loan: 5500,  rate: 8,   pay: 400,  label: "8% · $5500" },
  { loan: 50000, rate: 5.2, pay: 1650, label: "5.2% · 33 months" },
  { loan: 500,   rate: 24,  pay: 30,   label: "24% · interest-heavy" },
  { loan: 100,   rate: 0,   pay: 30,   label: "0% · partial last" },
];

const GUARD = 600;   // demo-only stop: a payment below the monthly interest never terminates

// The solution itself — shared by the demo and the trace so they cannot drift.
// The guard is not in the shipped `code`: the problem promises the loan is paid
// off, but a slider can't, and a UI must not hang.
function schedule(loanAmount, annualRate, monthlyPayment) {
  const monthlyRate = annualRate / 100 / 12;
  const out = [Math.round(loanAmount)];
  const rows = [];
  let balance = loanAmount, guard = 0;
  while (balance > 0 && guard++ < GUARD) {
    const interest = balance * monthlyRate;
    const before = balance;
    balance = balance + interest - monthlyPayment;
    // On the last month the payment overshoots, so only part of it is principal.
    const principal = Math.min(monthlyPayment - interest, before);
    rows.push({ interest, principal, balance });
    out.push(balance > 0 ? Math.round(balance) : 0);
  }
  return { out, rows, ran: guard, capped: guard >= GUARD };
}

// The same loop with the ROUNDED balance carried forward — the bug this module is
// about. Kept here so the demo can show both on identical input rather than assert
// a difference in prose.
function scheduleRoundedCarry(loanAmount, annualRate, monthlyPayment) {
  const monthlyRate = annualRate / 100 / 12;
  const out = [Math.round(loanAmount)];
  let balance = Math.round(loanAmount), guard = 0;
  while (balance > 0 && guard++ < GUARD) {
    balance = Math.round(balance * (1 + monthlyRate) - monthlyPayment);
    out.push(balance > 0 ? balance : 0);
  }
  return out;
}

const money = (x) => "$" + x.toFixed(2);

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .ln-tbl { display:grid; grid-template-columns:34px 1fr 88px 88px 92px; gap:3px 10px;
              align-items:center; margin:8px 0 2px; max-height:300px; overflow:auto; }
    .ln-h { font:700 9.5px var(--sans); letter-spacing:.06em; text-transform:uppercase;
            color:var(--muted); position:sticky; top:0; background:var(--panel); padding:3px 0; }
    .ln-m { font:11.5px var(--mono); color:var(--muted); text-align:right; }
    .ln-split { display:flex; height:13px; border-radius:4px; overflow:hidden; min-width:2px; }
    .ln-int { background:color-mix(in srgb, var(--danger) 62%, transparent); }
    .ln-pri { background:color-mix(in srgb, var(--good) 62%, transparent); }
    .ln-num { font:12px var(--mono); color:var(--text); text-align:right; font-variant-numeric:tabular-nums; }
    .ln-num.dim { color:var(--muted); }
    .ln-num.zero { color:var(--warn); font-weight:800; }
    .ln-leg { display:flex; gap:16px; flex-wrap:wrap; font:12px var(--sans); color:var(--muted); margin:12px 0 2px; }
    .ln-leg i { display:inline-block; width:11px; height:11px; border-radius:3px; margin-right:5px; vertical-align:-1px; }
    .ln-arr { font:12.5px var(--mono); word-break:break-all; margin-top:4px; }
    .ln-arr .d { color:var(--danger); font-weight:800; }
    .ln-arr .s { color:var(--muted); }
  `));
}

function mount(host) {
  ensureStyle();
  let { loan, rate, pay } = CASES[1];

  const pre = el("div", "controls");
  CASES.forEach((c) => {
    const chip = el("button", "chip", esc(c.label));
    chip.onclick = () => { loan = c.loan; rate = c.rate; pay = c.pay; sync(); render(); };
    pre.append(chip);
  });

  const ctl = el("div", "controls");
  const mk = (label, get, set, step) => {
    const inp = el("input"); inp.type = "number"; inp.step = step; inp.min = 0;
    inp.style.width = "104px"; inp.value = get();
    inp.oninput = () => { set(Math.max(0, +inp.value || 0)); render(); };
    ctl.append(el("span", "ctl-label", label), inp);
    return inp;
  };
  const loanIn = mk("loan =", () => loan, (v) => { loan = v; }, 100);
  const rateIn = mk("annual rate % =", () => rate, (v) => { rate = v; }, 0.5);
  const payIn = mk("monthly payment =", () => pay, (v) => { pay = v; }, 10);
  const sync = () => { loanIn.value = loan; rateIn.value = rate; payIn.value = pay; };

  const out = el("div");
  host.append(
    el("div", "note", "Change any of the three. Lower the payment toward the first month's interest and watch the schedule stretch — below it, the balance grows every month and the loan is never repaid at all. The red half of each bar is interest, which buys down nothing."),
    pre, ctl, out,
  );
  render();

  function render() {
    out.innerHTML = "";
    if (!(loan > 0) || !(pay > 0)) { out.append(el("div", "note", "A loan and a payment both need to be greater than zero.")); return; }

    const monthlyRate = rate / 100 / 12;
    const firstInterest = loan * monthlyRate;
    if (pay <= firstInterest) {
      out.append(el("div", "result-line",
        `<span class="badge no">never repaid</span><span class="muted mono">month 1 interest is ${money(firstInterest)}</span>`));
      out.append(el("div", "note",
        `A payment of <b>${money(pay)}</b> doesn't cover the <b>${money(firstInterest)}</b> of interest the first month accrues, so the balance <i>rises</i> and <code class='inl'>while (balance &gt; 0)</code> never ends. The problem guarantees the loan is paid off, so the shipped solution takes it at its word — but nothing in the code enforces it, and this is the input that turns the function into a hang.`));
      return;
    }

    const { out: arr, rows, capped } = schedule(loan, rate, pay);
    const naive = scheduleRoundedCarry(loan, rate, pay);
    const maxBal = Math.max(loan, 1);

    const tbl = el("div", "ln-tbl");
    ["", "interest / principal", "interest", "principal", "balance"].forEach((h) => tbl.append(el("div", "ln-h", h)));
    rows.forEach((r, i) => {
      tbl.append(el("div", "ln-m", String(i + 1)));
      const split = el("div", "ln-split");
      const iw = Math.max(0, Math.min(100, (r.interest / pay) * 100));
      const int = el("div", "ln-int"); int.style.width = iw + "%";
      const pri = el("div", "ln-pri"); pri.style.width = (100 - iw) + "%";
      split.append(int, pri);
      split.style.width = Math.max(2, (Math.max(r.balance, 0) / maxBal) * 100) + "%";
      tbl.append(split);
      tbl.append(el("div", "ln-num dim", money(r.interest)));
      tbl.append(el("div", "ln-num dim", money(r.principal)));
      const shown = r.balance > 0 ? Math.round(r.balance) : 0;
      tbl.append(el("div", "ln-num" + (shown === 0 && r.balance > 0 ? " zero" : ""),
        `$${shown}${shown === 0 && r.balance > 0 ? ` (${money(r.balance)})` : ""}`));
    });
    out.append(tbl);

    out.append(el("div", "ln-leg",
      `<span><i class="ln-int"></i>interest — buys down nothing</span>` +
      `<span><i class="ln-pri"></i>principal</span>` +
      `<span><i style="background:var(--warn)"></i>displayed $0 while money is still owed</span>`));

    const totalInterest = rows.reduce((s, r) => s + r.interest, 0);
    out.append(el("div", "result-line",
      `<span class="badge ok">${arr.length} entries</span>` +
      `<span class="opcount"><span class="n">${rows.length}</span> payments</span>` +
      `<span class="opcount hot"><span class="n">${money(totalInterest)}</span> paid in interest</span>`));
    if (capped) out.append(el("div", "note", `Stopped at the demo's ${GUARD}-month guard.`));

    // The whole thesis, on identical input: same loop, but carrying the ROUNDED
    // balance instead of the real one.
    const firstDiff = arr.findIndex((v, i) => naive[i] !== v);
    const cells = arr.map((v, i) => naive[i] === v
      ? `<span class="s">${v}</span>`
      : `<span class="d">${v}</span>`).join(", ");
    out.append(el("div", "ln-arr", `<b>correct</b> → [${cells}]`));
    out.append(el("div", "ln-arr", `<span class="s">rounded carry</span> → [${naive.join(", ")}]`));
    out.append(el("div", "note", firstDiff === -1
      ? `On this input both versions agree — the sub-dollar remainders never accumulate enough to move a rounded figure. That is exactly what makes the bug dangerous: it is invisible on most inputs. Try the <b>50% · $10</b> case, where the correct schedule runs 15 entries and the rounded one stops at 11.`
      : `They part company at index <b>${firstDiff}</b>: <b>${arr[firstDiff]}</b> against <b>${naive[firstDiff]}</b>${arr.length !== naive.length ? `, and end up different <i>lengths</i> — ${arr.length} entries against ${naive.length}, meaning the two disagree about how many months the loan even takes` : `, then re-converge`}. Rounding the carried balance throws away a few cents every month, and the interest for the next month is then charged on a number that was never owed.`));
  }
}

// ── STEP — one iteration per month ───────────────────────────────────────────
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">getLoanSchedule</span>(<span class="tok" data-t="params">loanAmount, annualRate, monthlyPayment</span>) {` },
  { ln: 2, html: `  <span class="k">const</span> <span class="tok" data-t="rate">monthlyRate = annualRate / <span class="nu">100</span> / <span class="nu">12</span></span>;` },
  { ln: 3, html: `  <span class="k">const</span> <span class="tok" data-t="seed">schedule = [Math.<span class="fn">round</span>(loanAmount)]</span>;` },
  { ln: 4, html: `  <span class="k">let</span> <span class="tok" data-t="bal">balance = loanAmount</span>;` },
  { ln: 5, html: `  <span class="k">while</span> (<span class="tok" data-t="cond">balance &gt; <span class="nu">0</span></span>) {` },
  { ln: 6, html: `    <span class="tok" data-t="accrue">balance = balance * (<span class="nu">1</span> + monthlyRate) - monthlyPayment</span>;` },
  { ln: 7, html: `    <span class="tok" data-t="push">schedule.<span class="fn">push</span>(balance &gt; <span class="nu">0</span> ? Math.<span class="fn">round</span>(balance) : <span class="nu">0</span>)</span>;` },
  { ln: 8, html: `  }` },
  { ln: 9, html: `  <span class="k">return</span> <span class="tok" data-t="ret">schedule</span>;` },
  { ln: 10, html: `}` },
];

function trace(caseIndex) {
  const k = Math.max(1, Math.min(CASES.length, caseIndex | 0));
  const { loan, rate, pay } = CASES[k - 1];
  const monthlyRate = rate / 100 / 12;
  const steps = [];
  const out = [];
  let balance = null, month = 0;

  const S = (line, note, x = {}) => {
    const vars = {};
    if (line >= 3) vars.monthlyRate = monthlyRate.toFixed(7);
    if (line >= 5 && balance != null) vars.balance = balance.toFixed(4);
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `getLoanSchedule(${loan}, ${rate}, ${pay})`, vars, changed: x.changed || [],
                 structs: [{ label: "schedule", items: out.slice(), newest: !!x.pushed }], ret: x.ret }],
    });
  };

  S(1, `Borrow <b>$${loan}</b> at <b>${rate}%</b> a year, paying <b>$${pay}</b> a month. The answer is one entry per month, so this is a straight simulation — there is no closed form to jump to, because the question asks for every intermediate balance, not just the count.`,
    { focus: "params" });

  S(2, `<b>${rate} / 100 / 12 = ${monthlyRate.toFixed(7)}</b>. The spec spells this out rather than leaving it to you — a "annual rate" divided twelve ways, not compounded twelve ways.`,
    { focus: "rate", changed: ["monthlyRate"] });

  out.push(Math.round(loan));
  S(3, `The array is <b>seeded</b> with the loan itself: the spec says the first element is always the loan amount. It is a starting position, not a payment result — every later entry comes out of the loop.`,
    { focus: "seed", pushed: true });

  balance = loan;
  S(4, `<b>balance</b> is the number that must never be rounded. The array holds whole dollars for the caller; this variable holds what is actually owed, to the cent and beyond.`,
    { focus: "bal", changed: ["balance"] });

  while (balance > 0 && month < GUARD) {
    month++;
    S(5, `<b>${balance.toFixed(4)} &gt; 0</b> → still owing, so another month runs. Note the test is on the <i>real</i> balance${out[out.length - 1] === 0 && balance > 0 ? ` — and this is the case that proves it matters, because the last figure pushed was <b>0</b> while <b>${money(balance)}</b> is genuinely still outstanding. Testing the displayed number would have stopped a month early.` : `, not on the last number pushed.`}`,
      { focus: "cond", eval: { expr: `balance (${balance.toFixed(4)}) > 0`, val: true } });

    const interest = balance * monthlyRate;
    const before = balance;
    balance = balance * (1 + monthlyRate) - pay;
    S(6, `Month <b>${month}</b>: interest of <b>${money(interest)}</b> accrues on ${money(before)}, then the <b>$${pay}</b> payment comes off. ${money(before)} + ${money(interest)} − $${pay} = <b>${money(balance)}</b>. ${interest > pay / 2 ? `More than half the payment went to interest — only <b>${money(pay - interest)}</b> of it touched the debt.` : `<b>${money(Math.min(pay, pay - interest))}</b> of the payment bought down the debt.`}`,
      { focus: "accrue", changed: ["balance"] });

    const shown = balance > 0 ? Math.round(balance) : 0;
    out.push(shown);
    S(7, `Push <b>${shown}</b>. ${balance <= 0
      ? `The balance went negative — the last payment was larger than what was left — so the spec's "the last element will always be 0" is honoured explicitly rather than by publishing an overpayment.`
      : shown === 0
        ? `Rounded to <b>0</b> for display, but <b>${money(balance)}</b> is still owed and <code class='inl'>balance</code> keeps every digit of it. If this rounded figure were written back into <code class='inl'>balance</code>, the loan would be declared paid here and the schedule would come up a month short.`
        : `The rounding happens <i>inside the push</i> and nowhere else — <code class='inl'>balance</code> is untouched and still ${money(balance)}. Round it in place instead and next month charges interest on ${shown}, a figure nobody owes.`}`,
      { focus: "push", pushed: true });
  }

  S(5, `<b>${balance.toFixed(4)} &gt; 0</b> is false — the debt is cleared. ${month} payment${month === 1 ? "" : "s"}, ${out.length} entries.`,
    { focus: "cond", eval: { expr: `balance (${balance.toFixed(4)}) > 0`, val: false } });

  const shortArr = out.length > 12 ? `[${out.slice(0, 6).join(", ")}, …, ${out.slice(-3).join(", ")}]` : `[${out.join(", ")}]`;
  S(9, `Return <b>${shortArr}</b> — the loan amount first, a zero last, exactly as promised.`,
    { focus: "ret", done: true, result: shortArr, ret: { value: shortArr } });

  return steps;
}

export default {
  n: 348, id: "loan", title: "Loan Calculator", dates: ["2026-07-24"],
  statement: `Given a loan amount, an annual interest rate percentage and a fixed monthly payment, return the remaining balance after each payment until the loan is paid off. Each month, interest accrues at <code class="inl">(annual rate / 100) / 12</code> and then the payment is subtracted. Round each balance to the nearest dollar. <span class="rule">The first element is always the loan amount and the last is always 0. Example: <code class="inl">getLoanSchedule(1000, 5, 200)</code> → <b>[1000, 804, 608, 410, 212, 13, 0]</b>.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(months)",
      approach: `Nothing to optimise — the caller asked for every intermediate balance, so every month has to happen. What the problem is really testing is <b>where the rounding goes</b>.<br><br>"Return each remaining balance rounded to the nearest dollar" describes the <i>output</i>, not the state. Round inside the <code class='inl'>push</code> and leave <code class='inl'>balance</code> at full precision; round the balance itself and each month charges interest on a figure nobody owes, with the error compounding. On the official <b>50% / $10</b> case that difference is not subtle — the correct schedule is 15 entries, the rounded-carry one is 11.<br><br>The loop condition is the same idea again: it tests <code class='inl'>balance &gt; 0</code>, not the last number pushed. That case posts a displayed <b>0</b> while 20¢ is still outstanding, and then runs one more month — which is why the expected array ends in <code class='inl'>… 1, 0, 0</code>. Finally, the last payment overshoots into the negative, so the push clamps to <code class='inl'>0</code> rather than publishing an overpayment.`,
      code: `// Round for DISPLAY only. \`balance\` keeps full precision all the way
// through, because next month's interest is charged on what is really
// owed — not on the whole dollars the caller happens to see.
function getLoanSchedule(
  loanAmount: number,
  annualRate: number,
  monthlyPayment: number,
): number[] {
  const monthlyRate = annualRate / 100 / 12;
  const schedule = [Math.round(loanAmount)]; // the spec seeds it with the loan

  let balance = loanAmount;
  while (balance > 0) {                      // the REAL balance, not the pushed one
    balance = balance * (1 + monthlyRate) - monthlyPayment;
    schedule.push(balance > 0 ? Math.round(balance) : 0); // clamp the overshoot
  }
  return schedule;
}`,
      mount,
    },
    {
      name: "Step through", cost: "one iteration per month",
      approach: `Run the <b>50% · $10</b> case and watch two lines specifically. On <b>line 7</b>, near the end, the pushed figure rounds to <b>0</b> while <code class='inl'>balance</code> still reads 0.1986 — the display and the state disagree, and only one of them is the truth. Then <b>line 5</b> tests the real balance, keeps going, and produces the second zero the expected array ends with. The <b>24% · interest-heavy</b> case is the one to watch on line 6, where two thirds of each early payment vanishes into interest. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 3, min: 1, max: CASES.length,
                 presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick a test case` },
      }),
    },
  ],
};
