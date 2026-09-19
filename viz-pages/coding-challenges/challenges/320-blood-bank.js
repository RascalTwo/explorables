// #320 · Blood Bank — how many patients can be served under scarcity.
// Same input, two serving strategies:
//   • NAIVE — serve patients in the ORDER REQUESTED, each taking its own type
//     then O. Flexible AB patients hoard scarce A/B units → some later patient
//     goes unserved.
//   • OPT   — greedy: serve the most-constrained type first (O, A, B, AB), so
//     every scarce unit is reserved for the patient with no alternative.
// Flip the Approach toggle on case 2 to see 4 of 5 vs 5 of 5 on identical input.
//
// CAVEAT (verified in node): the NAIVE strategy passes ALL SIX of freeCodeCamp's
// official tests. The official set never distinguishes the two strategies — the
// only input where they disagree is our INVENTED case 2. So "wrong" here means
// wrong in general, not wrong by the grader.
import { el, mountDebugger } from "../shared.js";

const TYPES = ["O", "A", "B", "AB"];
const donorsFor = { O: ["O"], A: ["A", "O"], B: ["B", "O"], AB: ["AB", "A", "B", "O"] };

// Same inputs for both variants. Provenance: cases 1, 3, 4, 5, 6, 7 are
// freeCodeCamp's OFFICIAL six, verbatim and in the published order. Case 2 is
// INVENTED and load-bearing — the only input where the strategies split
// (naive 4/5 vs greedy 5/5), verified by computing both.
const cases = [
  [["O", "A", "B", "AB"], ["O", "A", "B", "AB"]],                      // official 1 → 4 of 4
  [["O", "A", "A", "B", "B"], ["AB", "AB", "O", "AB", "A"]],           // ← INVENTED: strategies differ here
  [["A", "A", "B", "B", "AB"], ["O", "A", "B", "B", "B"]],             // official 2 → 3 of 5
  [["O", "A", "B", "AB"], ["AB", "AB", "AB", "AB", "AB"]],             // official 3 → 4 of 5
  [["O", "O", "O", "O", "O"], ["O", "A", "B", "AB"]],                  // official 4 → 4 of 4
  [["A", "O", "B", "AB", "B", "AB", "O", "A", "A"], ["O", "A", "B", "AB", "A", "B", "A", "A", "B", "A", "B"]], // official 5 → 8 of 11
  [["O", "B", "AB", "AB", "O", "A", "A", "AB", "O", "B", "B", "AB", "A", "B", "AB"], ["O", "A", "B", "B", "A", "B", "AB", "A", "B", "A", "O", "AB", "AB", "O"]], // official 6 → 13 of 14
];

// Serve either in greedy type-order or in the given request order.
// Returns the donor used per patient index (or null), plus the served count.
function serve(bank, patients, mode) {
  const stock = { O: 0, A: 0, B: 0, AB: 0 }; bank.forEach((t) => stock[t]++);
  const used = { O: 0, A: 0, B: 0, AB: 0 };
  const result = patients.map(() => null);
  const order = mode === "greedy"
    ? TYPES.flatMap((t) => patients.map((p, i) => [p, i]).filter((x) => x[0] === t))
    : patients.map((p, i) => [p, i]);
  let served = 0;
  for (const [p, i] of order) {
    const donor = donorsFor[p].find((d) => stock[d] - used[d] > 0);
    if (donor) { used[donor]++; served++; result[i] = donor; }
    else result[i] = null;
  }
  return { stock, used, result, served };
}

// Small, fixed inventory + request sets for the two SERVING step-throughs. Scenario
// 1 is crafted so the strategies split (request-order 4/5 vs greedy 5/5); scenario 2
// is a tiny all-served case. Kept short so the traces stay a modest length.
const SCN = [
  { bank: ["O", "A", "A", "B", "B"], patients: ["AB", "AB", "O", "AB", "A"] }, // splits 4 vs 5
  { bank: ["O", "A", "B"], patients: ["A", "O", "AB"] },                       // small, both 3/3
];
const stockLine = (s) => `O${s.O} · A${s.A} · B${s.B} · AB${s.AB}`;

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .bb-flow { font:11px var(--mono); color:var(--muted); margin-top:2px; }
    .pt.given { position:relative; }
  `));
}

const opBadge = (cls, n, label) =>
  `<span class="opcount ${cls}"><span class="n">${n}</span> ${label}</span>`;

// mode: "greedy" (opt) or "given" (naive)
function makeMount(mode, defaultCase) {
  return function (host) {
    ensureStyle();
    host.append(el("div", "ctl-label", "Compatibility: AB←anyone · A←A,O · B←B,O · O←O only"));
    const ctl = el("div", "controls");
    const out = el("div");
    host.append(ctl, out);
    let idx = defaultCase;

    cases.forEach((c, i) => {
      const b = el("button", "chip" + (i === idx ? " on" : ""), `case ${i + 1}`);
      b.onclick = () => { idx = i; [...ctl.children].forEach((x, j) => x.classList.toggle("on", j === i)); render(); };
      ctl.append(b);
    });

    function render() {
      const [bank, patients] = cases[idx];
      const { stock, used, result, served } = serve(bank, patients, mode);
      // For contrast, also compute the other strategy's served count.
      const other = serve(bank, patients, mode === "greedy" ? "given" : "greedy").served;
      out.innerHTML = "";

      out.append(el("div", "result-line",
        opBadge(mode === "greedy" ? "cool" : "hot", `${served}`, `of ${patients.length} patients served`)));

      // inventory
      const inv = el("div", "panel");
      inv.innerHTML = `<div class="muted" style="margin-bottom:6px">Bank inventory (faded = spent):</div>`;
      const iu = el("div", "units");
      TYPES.forEach((t) => { for (let k = 0; k < stock[t]; k++) iu.append(el("span", "unit bt-" + t + (k < used[t] ? " used" : ""), t)); });
      inv.append(iu); out.append(inv);

      // patients — always rendered in the GIVEN request order so flipping the
      // Approach keeps every patient in place; only served/unserved changes.
      const pp = el("div", "panel");
      pp.innerHTML = `<div class="muted" style="margin-bottom:6px">Patients ${mode === "greedy"
        ? "(served most-constrained type first: O → A → B → AB):"
        : "(served in the order requested — left to right):"}</div>`;
      const pu = el("div", "units");
      patients.forEach((p, i) => {
        const d = result[i];
        pu.append(el("span", "pt " + (d ? "served" : "unserved"), p + (d ? " ←" + d : " ✗")));
      });
      pp.append(pu); out.append(pp);

      if (mode === "greedy") {
        out.append(el("div", "note", "O is the universal donor, so it's the scarcest useful resource. Serve O-patients (who can ONLY take O) first, let A/B patients exhaust their own type before dipping into O, and let AB-patients — who accept anything — mop up the leftovers last." +
          (served !== other ? ` <b>On this case the greedy order serves ${served}; the request-order naive serves only ${other}.</b>` : "")));
      } else {
        out.append(el("div", "note", "Serving in request order lets flexible AB patients (who accept anything) grab scarce A/B units first, starving constrained patients later in the list — and once O is spent, an O-patient can't be served at all." +
          (served !== other ? ` <b>Here that costs one patient: ${served} of ${patients.length}, versus the greedy ${other}. Flip to Optimized on the same input.</b>` : " On this input the order happens not to matter — try case 2.")));
      }
    }
    render();
  };
}

const NAIVE_CODE = `// Naive: serve patients in the ORDER REQUESTED. Each takes its own type,
// then falls back to O. No prioritisation of the most-constrained patients,
// so flexible AB patients can drain A/B (and O) before O-only patients arrive.
function triageBlood(bank: string[], patients: string[]): string {
  const stock: Record<string, number> = { O: 0, A: 0, B: 0, AB: 0 };
  for (const t of bank) stock[t]++;

  const donorsFor: Record<string, string[]> = {
    O:  ["O"],
    A:  ["A", "O"],
    B:  ["B", "O"],
    AB: ["AB", "A", "B", "O"],
  };

  let served = 0;
  for (const type of patients) {              // whatever order they arrive in
    const donor = donorsFor[type].find(d => stock[d] > 0);
    if (donor) { stock[donor]--; served++; }
  }
  return served + " of " + patients.length + " patients served";
}`;

const OPT_CODE = `// Greedy: serve the most-constrained type first (O, then A, B, AB), and let
// each patient take its OWN type before dipping into the universal O supply.
function triageBlood(bank: string[], patients: string[]): string {
  const stock: Record<string, number> = { O: 0, A: 0, B: 0, AB: 0 };
  for (const t of bank) stock[t]++;

  const donorsFor: Record<string, string[]> = {
    O:  ["O"],                 // hardest to satisfy -> goes first
    A:  ["A", "O"],
    B:  ["B", "O"],
    AB: ["AB", "A", "B", "O"], // easiest -> spends leftovers last
  };

  let served = 0;
  for (const type of ["O", "A", "B", "AB"]) {
    for (const _ of patients.filter(p => p === type)) {
      const donor = donorsFor[type].find(d => stock[d] > 0);
      if (donor) { stock[donor]--; served++; }
    }
  }
  return served + " of " + patients.length + " patients served";
}`;

// ── STEP — the ONE rule that underlies the whole donorsFor table, decomposed to
// antigens and stepped through the shared debugger. A donor is only safe if EVERY
// antigen it carries (A, B, and the Rh/D antigen) is one the recipient already has.
// This exact rule reproduces donorsFor above for ABO, and adds the Rh dimension so
// O− (universal donor) and AB+ (universal recipient) fall out of it.
const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">canDonate</span>(<span class="tok" data-t="donor">donor</span>, <span class="tok" data-t="recip">recipient</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> dA  = <span class="tok" data-t="dA">donor.<span class="fn">includes</span>(<span class="st">"A"</span>)</span>;      <span class="k">// donor carries A antigen?</span>` },
  { ln: 3,  html: `  <span class="k">const</span> dB  = <span class="tok" data-t="dB">donor.<span class="fn">includes</span>(<span class="st">"B"</span>)</span>;      <span class="k">// donor carries B antigen?</span>` },
  { ln: 4,  html: `  <span class="k">const</span> dRh = <span class="tok" data-t="dRh">donor.<span class="fn">includes</span>(<span class="st">"+"</span>)</span>;      <span class="k">// donor Rh-positive (D antigen)?</span>` },
  { ln: 5,  html: `  <span class="k">const</span> rA  = <span class="tok" data-t="rA">recipient.<span class="fn">includes</span>(<span class="st">"A"</span>)</span>;` },
  { ln: 6,  html: `  <span class="k">const</span> rB  = <span class="tok" data-t="rB">recipient.<span class="fn">includes</span>(<span class="st">"B"</span>)</span>;` },
  { ln: 7,  html: `  <span class="k">const</span> rRh = <span class="tok" data-t="rRh">recipient.<span class="fn">includes</span>(<span class="st">"+"</span>)</span>;` },
  { ln: 8,  html: `  <span class="k">const</span> okA  = <span class="tok" data-t="okA">!dA  || rA</span>;    <span class="k">// A antigen safe unless recipient lacks it</span>` },
  { ln: 9,  html: `  <span class="k">const</span> okB  = <span class="tok" data-t="okB">!dB  || rB</span>;` },
  { ln: 10, html: `  <span class="k">const</span> okRh = <span class="tok" data-t="okRh">!dRh || rRh</span>;` },
  { ln: 11, html: `  <span class="k">return</span> <span class="tok" data-t="ret">okA &amp;&amp; okB &amp;&amp; okRh</span>;` },
  { ln: 12, html: `}` },
];

// Five donor → recipient pairs: two compatible (incl. the O− universal donor and
// the AB+ universal recipient), and three that fail on the A, Rh, and A rules.
const CASES = [
  ["O-", "A+"],
  ["A+", "AB+"],
  ["B+", "A+"],
  ["A+", "A-"],
  ["AB+", "O-"],
];
const CASE_NOTE = [
  `Case 1 — <b>O−</b> donating to <b>A+</b>. O− is the <b>universal donor</b>: it carries no A, no B, and no Rh antigen, so it has nothing that could clash.`,
  `Case 2 — <b>A+</b> donating to <b>AB+</b>. AB+ is the <b>universal recipient</b>: it already carries every antigen, so it accepts any donor.`,
  `Case 3 — <b>B+</b> donating to <b>A+</b>. The Rh factors match, but the ABO groups clash — watch the B-antigen rule fail.`,
  `Case 4 — <b>A+</b> donating to <b>A−</b>. The ABO groups match perfectly; the mismatch is purely Rh.`,
  `Case 5 — <b>AB+</b> donating to <b>O−</b>. AB+ is a superb <i>recipient</i> but a poor <i>donor</i> — it hands both A and B antigens to someone who has neither.`,
];

// Instrumented run → generic debugger steps. One straight-line call frame; each
// const comes into scope (appears in vars) exactly at the line that declares it.
function trace(k) {
  const idx = Math.max(0, Math.min(CASES.length - 1, (k | 0) - 1));
  const [donor, recipient] = CASES[idx];
  const steps = [];
  const vars = {};
  const S = (line, note, x = {}) => steps.push({
    line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
    frames: [{ title: "canDonate", vars: { ...vars }, changed: x.changed || [], ret: x.ret }],
  });

  vars.donor = donor; vars.recipient = recipient;
  S(1, `${CASE_NOTE[idx]} The single rule: a donor is safe only if <b>every antigen it carries</b> is one the recipient already has.`,
    { focus: "donor", changed: ["donor", "recipient"] });

  const dA = donor.includes("A"); vars.dA = String(dA);
  S(2, `Break the donor's type into antigens. Does <b>${donor}</b> carry the <b>A</b> antigen? → <b>${dA}</b>.`,
    { focus: "dA", changed: ["dA"], eval: { expr: `${donor} has A antigen`, val: dA } });
  const dB = donor.includes("B"); vars.dB = String(dB);
  S(3, `Does <b>${donor}</b> carry the <b>B</b> antigen? → <b>${dB}</b>.`,
    { focus: "dB", changed: ["dB"], eval: { expr: `${donor} has B antigen`, val: dB } });
  const dRh = donor.includes("+"); vars.dRh = String(dRh);
  S(4, `Is <b>${donor}</b> Rh-positive — does it carry the Rh (D) antigen? → <b>${dRh}</b>.`,
    { focus: "dRh", changed: ["dRh"], eval: { expr: `${donor} is Rh+`, val: dRh } });

  const rA = recipient.includes("A"); vars.rA = String(rA);
  S(5, `Now the recipient. Does <b>${recipient}</b> already carry the <b>A</b> antigen? → <b>${rA}</b>.`,
    { focus: "rA", changed: ["rA"], eval: { expr: `${recipient} has A antigen`, val: rA } });
  const rB = recipient.includes("B"); vars.rB = String(rB);
  S(6, `Does <b>${recipient}</b> already carry the <b>B</b> antigen? → <b>${rB}</b>.`,
    { focus: "rB", changed: ["rB"], eval: { expr: `${recipient} has B antigen`, val: rB } });
  const rRh = recipient.includes("+"); vars.rRh = String(rRh);
  S(7, `Is <b>${recipient}</b> Rh-positive? → <b>${rRh}</b>.`,
    { focus: "rRh", changed: ["rRh"], eval: { expr: `${recipient} is Rh+`, val: rRh } });

  const okA = !dA || rA; vars.okA = String(okA);
  S(8, `<b>A rule.</b> The donor's A antigen is safe only if the recipient also has A — <i>or</i> the donor has no A to give. <b>!${dA} || ${rA} = ${okA}</b>.`,
    { focus: "okA", changed: ["okA"], eval: { expr: `!dA || rA`, val: okA } });
  const okB = !dB || rB; vars.okB = String(okB);
  S(9, `<b>B rule.</b> The same test for the B antigen. <b>!${dB} || ${rB} = ${okB}</b>.`,
    { focus: "okB", changed: ["okB"], eval: { expr: `!dB || rB`, val: okB } });
  const okRh = !dRh || rRh; vars.okRh = String(okRh);
  S(10, `<b>Rh rule.</b> An Rh+ donor may only give to an Rh+ recipient; an Rh− donor is fine either way. <b>!${dRh} || ${rRh} = ${okRh}</b>.`,
    { focus: "okRh", changed: ["okRh"], eval: { expr: `!dRh || rRh`, val: okRh } });

  const ok = okA && okB && okRh;
  S(11, `Compatible only if <b>all three</b> rules hold at once: <b>${okA} && ${okB} && ${okRh} = ${ok}</b>. So ${donor} <b>${ok ? "can" : "cannot"}</b> donate to ${recipient}.`,
    { focus: "ret", eval: { expr: `okA && okB && okRh`, val: ok }, done: true,
      result: ok ? `true — ${donor} → ${recipient} ✓` : `false — ${donor} → ${recipient} ✗` });

  return steps;
}

// ── STEP (request order) — walk the NAIVE serving loop, paired with "Request order".
// Iterate patients left-to-right; for each, scan the CURRENT remaining stock for a
// compatible unit, serve (decrement + count) or reject, narrating the running
// inventory and served tally. Ends 4/5 on scenario 1 — one short of greedy.
const SRC_NAIVE = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">triageBlood</span>(bank, patients) {` },
  { ln: 2,  html: `  <span class="k">const</span> stock = <span class="fn">tally</span>(bank);  <span class="cm">// remaining units per type</span>` },
  { ln: 3,  html: `  <span class="k">let</span> served = 0;` },
  { ln: 4,  html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="loop">p</span> <span class="k">of</span> patients) {  <span class="cm">// in the order requested</span>` },
  { ln: 5,  html: `    <span class="k">const</span> donor = <span class="tok" data-t="find">donorsFor[p].<span class="fn">find</span>(d =&gt; stock[d] &gt; 0)</span>;` },
  { ln: 6,  html: `    <span class="k">if</span> (donor) { <span class="tok" data-t="serve">stock[donor]--; served++;</span> }  <span class="cm">// serve</span>` },
  { ln: 7,  html: `    <span class="k">else</span> { <span class="tok" data-t="reject">/* unserved */</span> }  <span class="cm">// reject</span>` },
  { ln: 8,  html: `  }` },
  { ln: 9,  html: `  <span class="k">return</span> served;` },
  { ln: 10, html: `}` },
];

function traceNaive(k) {
  const idx = Math.max(0, Math.min(SCN.length - 1, (k | 0) - 1));
  const { bank, patients } = SCN[idx];
  const stock = { O: 0, A: 0, B: 0, AB: 0 }; bank.forEach((t) => stock[t]++);
  const other = serve(bank, patients, "greedy").served; // greedy result on same input, for contrast
  const steps = [];
  let served = 0; const servedLabels = [];
  let curP = null, curDonor = null;
  const frame = (opt = {}) => {
    const vars = { stock: stockLine(stock), served };
    if (curP !== null) vars.p = curP;
    if (curDonor !== null) vars.donor = curDonor;
    return { title: "triageBlood", vars, changed: opt.changed || [],
      structs: [{ label: "served", items: servedLabels.slice(), newest: !!opt.resNew }] };
  };
  const S = (line, note, x = {}) => steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result, frames: [frame(x)] });

  S(1, `Serve in <b>request order</b>. Bank holds <b>${bank.join(", ")}</b>; patients ask for <b>${patients.join(", ")}</b> — handled strictly left to right.`, {});
  S(2, `Tally the bank into remaining stock: <b>${stockLine(stock)}</b>.`, { changed: ["stock"] });
  S(3, `Nobody served yet — <b>served = 0</b>.`, { changed: ["served"] });
  patients.forEach((p, i) => {
    curP = p; curDonor = null;
    S(4, `Request <b>${i + 1} of ${patients.length}</b>: patient needs <b>${p}</b>. Compatible donors, best-first: <b>${donorsFor[p].join(" → ")}</b>.`, { focus: "loop", changed: ["p"] });
    const donor = donorsFor[p].find((d) => stock[d] > 0);
    curDonor = donor || "none";
    S(5, donor
      ? `Scan stock <b>${stockLine(stock)}</b> for a compatible unit — first match is <b>${donor}</b>.`
      : `Scan stock <b>${stockLine(stock)}</b> — <b>no compatible unit left</b> for a ${p} patient.`,
      { focus: "find", changed: ["donor"], eval: { expr: `compatible unit for ${p}?`, val: !!donor } });
    if (donor) {
      stock[donor]--; served++; servedLabels.push(`${p}←${donor}`);
      S(6, `Serve: spend one <b>${donor}</b> unit → stock <b>${stockLine(stock)}</b>, <b>served → ${served}</b>.`, { focus: "serve", changed: ["stock", "served"], resNew: true });
    } else {
      S(7, `Reject: this <b>${p}</b> patient goes <b>unserved</b>. served stays <b>${served}</b>.`, { focus: "reject" });
    }
  });
  curP = null; curDonor = null;
  S(9, `All ${patients.length} requests handled — <b>return ${served} of ${patients.length}</b>.` +
    (other !== served
      ? ` The greedy order serves <b>${other}</b> on this exact input — request order leaves <b>${other - served}</b> patient${other - served === 1 ? "" : "s"} unhelped.`
      : ` (On this input the order doesn't change the outcome — try scenario 1.)`),
    { done: true, result: `${served} of ${patients.length}` });
  return steps;
}

// ── STEP (most-constrained first) — walk the GREEDY serving loop, paired with
// "Most-constrained first". Visit patients in type order O → A → B → AB (scarce/
// inflexible first) instead of request order, on the SAME inventory + requests.
// Ends 5/5 on scenario 1 — beating the request order by reserving each scarce unit.
const SRC_GREEDY = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">triageBlood</span>(bank, patients) {` },
  { ln: 2,  html: `  <span class="k">const</span> stock = <span class="fn">tally</span>(bank);  <span class="cm">// remaining units per type</span>` },
  { ln: 3,  html: `  <span class="k">let</span> served = 0;` },
  { ln: 4,  html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="typeloop">type</span> <span class="k">of</span> [<span class="st">"O"</span>, <span class="st">"A"</span>, <span class="st">"B"</span>, <span class="st">"AB"</span>]) {  <span class="cm">// most-constrained first</span>` },
  { ln: 5,  html: `    <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="loop">p</span> <span class="k">of</span> patients.<span class="fn">filter</span>(x =&gt; x === type)) {` },
  { ln: 6,  html: `      <span class="k">const</span> donor = <span class="tok" data-t="find">donorsFor[p].<span class="fn">find</span>(d =&gt; stock[d] &gt; 0)</span>;` },
  { ln: 7,  html: `      <span class="k">if</span> (donor) { <span class="tok" data-t="serve">stock[donor]--; served++;</span> }  <span class="cm">// serve</span>` },
  { ln: 8,  html: `      <span class="k">else</span> { <span class="tok" data-t="reject">/* unserved */</span> }  <span class="cm">// reject</span>` },
  { ln: 9,  html: `    }` },
  { ln: 10, html: `  }` },
  { ln: 11, html: `  <span class="k">return</span> served;` },
  { ln: 12, html: `}` },
];

function traceGreedy(k) {
  const idx = Math.max(0, Math.min(SCN.length - 1, (k | 0) - 1));
  const { bank, patients } = SCN[idx];
  const stock = { O: 0, A: 0, B: 0, AB: 0 }; bank.forEach((t) => stock[t]++);
  const other = serve(bank, patients, "given").served; // naive result on same input, for contrast
  const steps = [];
  let served = 0; const servedLabels = [];
  let curType = null, curP = null, curDonor = null;
  const frame = (opt = {}) => {
    const vars = { stock: stockLine(stock), served };
    if (curType !== null) vars.type = curType;
    if (curP !== null) vars.p = curP;
    if (curDonor !== null) vars.donor = curDonor;
    return { title: "triageBlood", vars, changed: opt.changed || [],
      structs: [{ label: "served", items: servedLabels.slice(), newest: !!opt.resNew }] };
  };
  const S = (line, note, x = {}) => steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result, frames: [frame(x)] });

  S(1, `Serve <b>most-constrained first</b>. Same bank <b>${bank.join(", ")}</b> and patients <b>${patients.join(", ")}</b> — but visited in type order O → A → B → AB, not request order.`, {});
  S(2, `Tally the bank into remaining stock: <b>${stockLine(stock)}</b>.`, { changed: ["stock"] });
  S(3, `Nobody served yet — <b>served = 0</b>.`, { changed: ["served"] });
  for (const type of TYPES) {
    curType = type; curP = null; curDonor = null;
    const group = patients.filter((p) => p === type);
    S(4, group.length
      ? `Most-constrained type still pending: <b>${type}</b> — <b>${group.length}</b> patient${group.length === 1 ? "" : "s"} asked for ${type}.`
      : `Type <b>${type}</b>: no patients requested it — skip.`,
      { focus: "typeloop", changed: ["type"] });
    for (const p of group) {
      curP = p; curDonor = null;
      S(5, `Handle a <b>${type}</b> patient. Compatible donors, best-first: <b>${donorsFor[p].join(" → ")}</b>.`, { focus: "loop", changed: ["p"] });
      const donor = donorsFor[p].find((d) => stock[d] > 0);
      curDonor = donor || "none";
      S(6, donor
        ? `Scan stock <b>${stockLine(stock)}</b> — first compatible unit is <b>${donor}</b>.`
        : `Scan stock <b>${stockLine(stock)}</b> — <b>no compatible unit</b> for ${p}.`,
        { focus: "find", changed: ["donor"], eval: { expr: `compatible unit for ${p}?`, val: !!donor } });
      if (donor) {
        stock[donor]--; served++; servedLabels.push(`${p}←${donor}`);
        S(7, `Serve: spend one <b>${donor}</b> unit → stock <b>${stockLine(stock)}</b>, <b>served → ${served}</b>.`, { focus: "serve", changed: ["stock", "served"], resNew: true });
      } else {
        S(8, `Reject: this <b>${p}</b> patient goes <b>unserved</b>.`, { focus: "reject" });
      }
    }
  }
  curType = null; curP = null; curDonor = null;
  S(11, `Every type handled — <b>return ${served} of ${patients.length}</b>.` +
    (other !== served
      ? ` Request order managed only <b>${other}</b> on the same input: reserving each scarce unit for the patient with no alternative saved <b>${served - other}</b>.`
      : ` (On this input the order doesn't change the outcome.)`),
    { done: true, result: `${served} of ${patients.length}` });
  return steps;
}

export default {
  n: 320, id: "blood", title: "Blood Bank", dates: ["2026-06-26"],
  statement: `Given bank inventory and patient requests (blood types, duplicates = quantity), return how many patients can be served. <code>AB</code> receives from anyone; <code>A</code> from A/O; <code>B</code> from B/O; <code>O</code> from O only. <span class="rule">O is the universal donor — and the scarce one.</span>`,
  // Grouped by approach: each serving strategy is [intuition viz] → [step through],
  // tone-paired (request-order brute pair, then greedy opt pair). Both step-throughs
  // walk the SAME serving process on the same small input and reach DIFFERENT served
  // counts — the whole point. A neutral rule step-through closes the set.
  variants: [
    {
      name: "Request order", tone: "brute", cost: "wrong order",
      approach: `Serve patients first-come-first-served, each taking its own type then O. It looks reasonable, but a flexible AB patient early in the list can burn a scarce A/B/O unit that a constrained patient needs later. <b>Case 2: 4 of 5.</b>`,
      code: NAIVE_CODE, mount: makeMount("given", 1),
    },
    {
      name: "Step: serve in order", tone: "brute", cost: "line-by-line",
      approach: `A debugger for the request-order serve — step patients <b>left to right</b>, and for each one scan the <b>current</b> remaining stock for a compatible unit, then serve (decrement + count) or reject. Watch a flexible AB patient spend a scarce unit early, so a constrained patient later gets <b>rejected</b>. Ends <b>4 of 5</b> on scenario 1 — one short of the greedy order on identical input. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_NAIVE, trace: traceNaive, input: { label: "scenario =", value: 1, min: 1, max: SCN.length, presets: SCN.map((_, i) => i + 1), hint: "1 splits (4 vs 5) · 2 tiny (3 of 3)" } }),
    },
    {
      name: "Most-constrained first", tone: "opt", cost: "greedy",
      approach: `Serve the hardest-to-satisfy patients first (O, who accept only O), let A/B spend their own type before O, and let AB — who accept anything — mop up the leftovers. Every scarce unit is reserved for whoever has no alternative. <b>Case 2: 5 of 5.</b>`,
      code: OPT_CODE, mount: makeMount("greedy", 1),
    },
    {
      name: "Step: serve greedily", tone: "opt", cost: "line-by-line",
      approach: `A debugger for the greedy serve — same inventory and requests, but visited in type order <b>O → A → B → AB</b> (scarcest/least-flexible first). Each patient still checks the <b>current</b> stock and serves or rejects, but reserving units for whoever has no alternative <b>saves the patient the request order dropped</b>. Ends <b>5 of 5</b> on scenario 1. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_GREEDY, trace: traceGreedy, input: { label: "scenario =", value: 1, min: 1, max: SCN.length, presets: SCN.map((_, i) => i + 1), hint: "1 splits (4 vs 5) · 2 tiny (3 of 3)" } }),
    },
    {
      name: "Step: compatibility rule", cost: "the antigen rule",
      approach: `A debugger for the single compatibility rule behind the whole table — a donor is safe only if <b>every antigen it carries</b> (A, B, and the Rh/D antigen) is one the recipient already has. Step each rule to the final <code class='inl'>canDonate?</code> verdict and watch why <b>O−</b> gives to anyone and <b>AB+</b> takes from anyone. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { label: "case =", value: 1, min: 1, max: CASES.length, presets: CASES.map((_, i) => i + 1), hint: "1–5: pick a donor→recipient pair" } }),
    },
  ],
};
