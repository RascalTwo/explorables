// #313 · Rental Cost — the deadline is an instant, not a duration: 12:00 UTC, day + tier.
// The reflex is `(returned - rented) / days`, and it is wrong twice over: the base price is flat
// (returning early buys nothing back) and lateness is measured from a fixed wall-clock moment, so
// the checkout TIME barely matters while the checkout DAY decides everything. Build the due
// timestamp first, subtract second.
//
// ONE APPROACH, on purpose. There is no wasteful act to name here — the whole function is three
// derivations and a subtraction, so a "loop the days forward" variant would be the same mental
// model spelled longer, and at 1/3/7 days its cost gap is invisible on screen. CONTRIBUTING's
// third test (the gap must be VISIBLE) fails, so this ships as `Solution` + `Step through`.
//
// UTC IS DELIBERATE, AND IT IS LOAD-BEARING. Every accessor below is `Date.parse`, `Date.UTC` or a
// `getUTC*`. Swap in the local-time twins — `getDate()` + `new Date(y, m, d, 12)` — and the same
// code scores 6/6 in TZ=UTC, 5/6 in Pacific/Auckland and 4/6 in America/Denver or Asia/Kolkata.
// A snippet that passes on the author's machine and fails on the reader's is the worst possible
// bug to publish, so the timezone is pinned rather than inherited.
import { el, esc, mountDebugger } from "../shared.js";

// Prices in CENTS. Money is counted in the smallest unit and the decimal point is a formatting
// step, so no rounding decision ever enters the arithmetic — 2.99 + 359 * 0.99 in floats is
// 358.40000000000003, and only `toFixed` hides that.
const PRICING = {
  1: { base: 499, late: 399 },
  3: { base: 399, late: 299 },
  7: { base: 299, late: 99 },
};
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const MIN = 60 * 1000;

// The graded function itself, shared by the demo, the scoreboard and the trace so the three can
// never drift apart. Byte-for-byte the logic of the `code` block below.
const dueInstant = (rentedMs, tier) => {
  const s = new Date(rentedMs);
  return Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate() + tier, 12);
};
function price(rentedMs, returnedMs, tier) {
  const { base, late } = PRICING[tier];
  const due = dueInstant(rentedMs, tier);
  const overdue = returnedMs - due;
  const lateDays = overdue > 0 ? Math.ceil(overdue / DAY) : 0;
  const cents = base + lateDays * late;
  return { due, overdue, lateDays, base, late, cents, text: money(cents) };
}

const money = (cents) => "$" + (cents / 100).toFixed(2);

// ── UTC formatting, hand-rolled ───────────────────────────────────────────────
// toLocaleString would render these instants in the reader's own timezone, which is exactly the
// confusion this challenge is about. Everything on screen is sliced out of the ISO string instead.
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const iso = (ms) => new Date(ms).toISOString();
const stamp = (ms) => {
  const d = new Date(ms);
  const hh = String(d.getUTCHours()).padStart(2, "0"), mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${MON[d.getUTCMonth()]} ${d.getUTCDate()} · ${hh}:${mm}`;
};
const stampY = (ms) => {
  const d = new Date(ms);
  return `${MON[d.getUTCMonth()]} ${d.getUTCDate()} ${d.getUTCFullYear()} · ${iso(ms).slice(11, 16)}`;
};
// A magnitude, spelled out in the units the fee rule cares about.
const span = (ms) => {
  const a = Math.abs(ms);
  const d = Math.floor(a / DAY), h = Math.floor((a % DAY) / HOUR), m = Math.round((a % HOUR) / MIN);
  return [d ? `${d}d` : "", h ? `${h}h` : "", m || (!d && !h) ? `${m}m` : ""].filter(Boolean).join(" ");
};
// Signed lateness, with the exactly-on-the-deadline case spelled as a bare 0 rather than "+0m" —
// the boundary deserves to read as an exact hit, not as a rounding.
const signed = (ms) => (ms === 0 ? "0" : (ms > 0 ? "+" : "−") + span(ms));

// Cases 1–6 are freeCodeCamp's official set, verbatim and in the grader's order. They pin down
// every rule the statement leaves ambiguous: #1 back before noon on the due day (on time), #2 a
// return 30 minutes into the second late day billed as TWO days (so the fee is per STARTED day,
// not per elapsed one), #3 a same-day return still charged the full base (early is NOT refunded),
// #4 the same started-day rule on tier 3, #5 a return at exactly 12:00:00.000 UTC costing nothing
// (the boundary is INCLUSIVE — on time), #6 a year-long overrun that fixes the fee as linear.
// Cases 7–8 are invented, because the official set leaves two branches untested:
//   7 — the twin of case 5, sixty seconds later. Same rental, +$0.99. This is the whole module.
//   8 — a checkout on June 28 with tier 7, so `getUTCDate() + tier` is day 35 of a 30-day month.
//       Nothing official ever rolls the due date out of its month, and it is the one place a
//       hand-rolled "+7 days" would need special-casing that Date.UTC does for free.
const CASES = [
  { tier: 1, out: "2026-06-18T18:30:00Z", back: "2026-06-19T10:30:00Z", want: "$4.99",   chip: "1d · on time",     why: "back 1h 30m before the deadline" },
  { tier: 1, out: "2026-06-18T14:30:00Z", back: "2026-06-20T12:30:00Z", want: "$12.97",  chip: "1d · 2 days late", why: "24h 30m over → 2 started days" },
  { tier: 3, out: "2026-06-18T10:15:00Z", back: "2026-06-18T19:45:00Z", want: "$3.99",   chip: "3d · returned early", why: "back the same day — no refund" },
  { tier: 3, out: "2026-06-18T15:20:00Z", back: "2026-06-23T08:10:00Z", want: "$9.97",   chip: "3d · 2 days late", why: "44h 10m over → 2 started days" },
  { tier: 7, out: "2026-06-18T12:00:00Z", back: "2026-06-25T12:00:00Z", want: "$2.99",   chip: "7d · exactly at 12:00", why: "the boundary — on time, $0 late" },
  { tier: 7, out: "2026-06-18T08:00:00Z", back: "2027-06-18T14:00:00Z", want: "$358.40", chip: "7d · a year over",  why: "358d 2h over → 359 started days" },
  { tier: 7, out: "2026-06-18T12:00:00Z", back: "2026-06-25T12:01:00Z", want: "$3.98",   chip: "7d · one minute late", why: "60 seconds over → a whole day" },
  { tier: 7, out: "2026-06-28T09:00:00Z", back: "2026-07-05T11:59:00Z", want: "$2.99",   chip: "7d · June 28 + 7",  why: "day 35 of June → July 5" },
];
const OFFICIAL = 6;          // cases 1..6 are the grader's; 7..8 are ours
const OPEN_ON = 4;           // index of the exactly-at-12:00 case — the demo opens on the boundary

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .rnt-tl { margin:16px 0 4px; user-select:none; }
    .rnt-axis { position:relative; height:15px; font:10px var(--mono); color:var(--muted); }
    .rnt-axis span { position:absolute; top:0; padding-left:4px; border-left:1px solid var(--border); white-space:nowrap; }
    .rnt-track { position:relative; height:64px; border:1px solid var(--border); border-radius:10px;
                 background:var(--panel-2); overflow:hidden; cursor:ew-resize; touch-action:none; }
    .rnt-track:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
    .rnt-band { position:absolute; top:0; bottom:0; }
    .rnt-band.ok { background:color-mix(in srgb, var(--good) 15%, transparent); }
    .rnt-band.late { background:color-mix(in srgb, var(--danger) 17%, transparent);
                     box-shadow:inset 1px 0 0 color-mix(in srgb, var(--danger) 55%, transparent); }
    .rnt-band.late.tail { background:color-mix(in srgb, var(--danger) 30%, transparent); }
    .rnt-band i { position:absolute; left:4px; top:24px; font:700 9.5px var(--mono); font-style:normal;
                  color:var(--danger); white-space:nowrap; }
    .rnt-pin { position:absolute; top:0; bottom:0; width:0; }
    .rnt-pin b { position:absolute; font:700 9.5px var(--sans); white-space:nowrap; letter-spacing:.03em; }
    .rnt-pin.due { border-left:2px solid var(--warn); }
    .rnt-pin.due b { color:var(--warn); top:3px; left:5px; }
    .rnt-pin.due.flip b { left:auto; right:5px; }
    .rnt-pin.out { border-left:2px dashed var(--muted); }
    .rnt-pin.out b { color:var(--muted); bottom:3px; left:5px; }
    .rnt-pin.ret { border-left:2px solid var(--accent); }
    .rnt-pin.ret b { color:var(--accent); bottom:3px; left:11px; }
    .rnt-pin.ret.flip b { left:auto; right:11px; }
    .rnt-grip { position:absolute; top:50%; left:0; width:15px; height:15px; margin:-8px 0 0 -8px;
                border-radius:50%; background:var(--accent); border:2px solid var(--bg);
                box-shadow:0 0 0 1px var(--accent); cursor:grab; }
    .rnt-eq { font:12.5px var(--mono); color:var(--muted); margin:6px 0 2px; }
    .rnt-eq b { color:var(--text); } .rnt-eq .win { color:var(--good); } .rnt-eq .no { color:var(--danger); }
    .rnt-eq .due { color:var(--warn); white-space:nowrap; }
    .rnt-lbl { font:700 10px var(--sans); letter-spacing:.07em; text-transform:uppercase;
               color:var(--muted); margin:14px 0 5px; }
    .rnt-price tr.on td { color:var(--text); border-color:var(--accent); }
    .rnt-price td { color:var(--muted); }
    .rnt-why { color:var(--muted); font:11.5px var(--mono); }
  `));
}

// ── The pricing table, with the live tier highlighted ─────────────────────────
const priceTable = (tier) =>
  `<table class="cmp rnt-price"><thead><tr><th>tier</th><th>base</th><th>late fee / day</th></tr></thead><tbody>` +
  [1, 3, 7].map((t) => `<tr class="${t === tier ? "on" : ""}"><td>${t} day${t === 1 ? "" : "s"}</td>` +
    `<td>${money(PRICING[t].base)}</td><td>${money(PRICING[t].late)}</td></tr>`).join("") +
  `</tbody></table>`;

// ── The demo ──────────────────────────────────────────────────────────────────
// A timeline: checkout on the left, the computed due instant flagged at 12:00 UTC, and a return
// marker you drag. The late region is drawn as one BLOCK PER BILLED DAY, so `Math.ceil` stops
// being an incantation — the marker parked one minute inside block 2 has visibly bought block 2.
function mount(host) {
  ensureStyle();

  let tier = CASES[OPEN_ON].tier;
  let outMs = Date.parse(CASES[OPEN_ON].out);
  let backMs = Date.parse(CASES[OPEN_ON].back);

  // ── controls ──
  const tierRow = el("div", "controls");
  tierRow.append(el("span", "ctl-label", "tier ="));
  const tierChips = [1, 3, 7].map((t) => {
    const c = el("button", "chip", `${t} day${t === 1 ? "" : "s"}`);
    c.onclick = () => { tier = t; clampReturn(); render(); };
    tierRow.append(c);
    return c;
  });

  const whenRow = el("div", "controls");
  const dIn = el("input"); dIn.type = "date"; dIn.style.width = "150px";
  const tIn = el("input"); tIn.type = "time"; tIn.style.width = "104px";
  whenRow.append(el("span", "ctl-label", "checked out ="), dIn, tIn, el("span", "ctl-label", "UTC"));
  // The two inputs are read as UTC by hand — `type="datetime-local"` would hand back the reader's
  // wall clock, which is the very mistake the module is about.
  const readOut = () => {
    const ms = Date.parse(`${dIn.value || "2026-06-18"}T${(tIn.value || "00:00").slice(0, 5)}:00Z`);
    if (!Number.isNaN(ms)) { const delta = ms - outMs; outMs = ms; backMs += delta; }
    clampReturn(); render();
  };
  dIn.onchange = readOut; tIn.onchange = readOut;

  const caseRow = el("div", "controls");
  CASES.forEach((c, i) => {
    const chip = el("button", "chip", esc(c.chip));
    chip.title = `${c.out} → ${c.back}, tier ${c.tier} → ${c.want}` + (i < OFFICIAL ? " (official)" : " (invented)");
    chip.onclick = () => { tier = c.tier; outMs = Date.parse(c.out); backMs = Date.parse(c.back); render(); };
    caseRow.append(chip);
  });

  const axis = el("div", "rnt-axis");
  const track = el("div", "rnt-track");
  track.tabIndex = 0;
  const tl = el("div", "rnt-tl"); tl.append(axis, track);
  const out = el("div");

  host.append(
    tierRow, whenRow, caseRow,
    el("div", "note", "Drag the blue return marker along the track. Nothing happens to the price until it crosses the amber <b>12:00 UTC</b> flag — then the fee jumps a whole day at a time. The marker snaps onto the flag when you get close, so the exactly-on-the-deadline case is reachable by hand; arrow keys nudge it a minute at a time (hold <b>Shift</b> for an hour)."),
    tl, out);

  // ── domain ──
  // Always shows at least three late days past the deadline, so there is somewhere to drag TO,
  // and stretches to swallow the return marker when a case parks it a year out.
  const geom = () => {
    const due = dueInstant(outMs, tier);
    const end = Math.max(due + 3 * DAY, backMs + 0.1 * DAY);
    const pad = (end - outMs) * 0.05;
    return { due, t0: outMs - pad, t1: end + pad };
  };
  const pct = (t) => { const { t0, t1 } = geom(); return ((t - t0) / (t1 - t0)) * 100; };
  const clampReturn = () => { backMs = Math.max(outMs, backMs); };

  // ── dragging ──
  const at = (clientX) => {
    const r = track.getBoundingClientRect();
    const { t0, t1 } = geom();
    const t = t0 + ((clientX - r.left) / r.width) * (t1 - t0);
    const { due } = geom();
    // Magnetic snap onto the deadline: without it a mouse can never land on 12:00:00.000, which
    // is the one instant the challenge asks you to get right.
    if (Math.abs(t - due) < (t1 - t0) * 0.008) return due;
    return Math.max(outMs, Math.round(t / MIN) * MIN);
  };
  const drag = (e) => { backMs = at(e.clientX); render(); };
  track.onpointerdown = (e) => { track.setPointerCapture(e.pointerId); drag(e); };
  track.onpointermove = (e) => { if (track.hasPointerCapture(e.pointerId)) drag(e); };
  track.onkeydown = (e) => {
    const step = e.shiftKey ? HOUR : MIN;
    if (e.key === "ArrowRight") backMs += step;
    else if (e.key === "ArrowLeft") backMs = Math.max(outMs, backMs - step);
    else return;
    e.preventDefault(); render();
  };

  // ── one absolutely-positioned marker ──
  const pin = (cls, t, label) => {
    const x = pct(t);
    const p = el("div", `rnt-pin ${cls}` + (x > 68 ? " flip" : ""), `<b>${label}</b>`);
    p.style.left = x + "%";
    return p;
  };

  function render() {
    const { due, t0, t1 } = geom();
    const r = price(outMs, backMs, tier);
    tierChips.forEach((c, i) => c.classList.toggle("on", [1, 3, 7][i] === tier));
    dIn.value = iso(outMs).slice(0, 10);
    tIn.value = iso(outMs).slice(11, 16);

    // ── axis: one tick per UTC midnight, but only while they are legible ──
    axis.innerHTML = "";
    const days = Math.ceil((t1 - t0) / DAY);
    if (days <= 16) {
      for (let m = Math.ceil(t0 / DAY) * DAY; m < t1; m += DAY) {
        const s = el("span", null, `${MON[new Date(m).getUTCMonth()]} ${new Date(m).getUTCDate()}`);
        s.style.left = pct(m) + "%";
        axis.append(s);
      }
    } else {
      const s = el("span", null, `${days} days · UTC midnights hidden`);
      s.style.left = "0"; s.style.borderLeft = "none"; s.style.paddingLeft = "0";
      axis.append(s);
    }

    // ── track ──
    track.innerHTML = "";
    const band = (cls, a, b, label) => {
      const d = el("div", `rnt-band ${cls}`, label ? `<i>${label}</i>` : "");
      d.style.left = pct(a) + "%"; d.style.width = Math.max(0, pct(b) - pct(a)) + "%";
      track.append(d);
    };
    band("ok", outMs, Math.min(backMs, due));
    if (r.lateDays > 24) {
      // 359 blocks would be noise; collapse to one bar and say the number outright.
      band("late tail", due, backMs, `${r.lateDays} × ${money(r.late)} = ${money(r.lateDays * r.late)}`);
    } else {
      for (let k = 1; k <= r.lateDays; k++)
        band("late" + (k === r.lateDays ? " tail" : ""), due + (k - 1) * DAY, due + k * DAY, `day ${k} · +${money(r.late)}`);
    }
    track.append(pin("out", outMs, "checked out"));
    track.append(pin("due", due, `⚑ due ${stamp(due)} UTC`));
    const ret = pin("ret", backMs, `returned ${stamp(backMs)}`);
    ret.append(el("div", "rnt-grip"));
    track.append(ret);

    // ── the arithmetic, spelled out ──
    out.innerHTML = "";
    const late = r.overdue > 0;
    out.append(el("div", "rnt-eq",
      `<b>${stampY(outMs)}</b> + <b>${tier}</b> day${tier === 1 ? "" : "s"} → the last day of the period is ` +
      `<b>${MON[new Date(due).getUTCMonth()]} ${new Date(due).getUTCDate()}</b>, so ` +
      `due = <span class="due">${iso(due).replace(".000Z", "Z")}</span>`));
    out.append(el("div", "rnt-eq", late
      ? `returned <span class="no">${span(r.overdue)} after</span> the deadline → ` +
        `<code class='inl'>Math.ceil(${(r.overdue / DAY).toFixed(4)})</code> = <b class="no">${r.lateDays}</b> billed day${r.lateDays === 1 ? "" : "s"}` +
        (r.overdue <= DAY ? ` — <b>any</b> part of a day is a whole day` : "")
      : r.overdue === 0
        ? `returned at <span class="win">exactly</span> the deadline. <code class='inl'>overdue &gt; 0</code> is <b class="win">false</b>, so <b>0</b> late days — the boundary is <b>inclusive</b>.`
        : `returned <span class="win">${span(r.overdue)} early</span>. The base price is <b>flat</b>: <code class='inl'>overdue</code> is negative, the fee branch never runs, and nothing is refunded.`));
    out.append(el("div", "rnt-eq",
      `${money(r.base)} <span class="muted">base</span> + <b>${r.lateDays}</b> × ${money(r.late)} ` +
      `<span class="muted">late</span> = <b>${r.text}</b>`));

    const hit = CASES.findIndex((c) => c.tier === tier && Date.parse(c.out) === outMs && Date.parse(c.back) === backMs);
    out.append(el("div", "result-line",
      `<span class="badge ok">${r.text}</span>` +
      `<span class="opcount ${late ? "hot" : ""}"><span class="n">${r.lateDays}</span> late day${r.lateDays === 1 ? "" : "s"}</span>` +
      (hit >= 0 ? `<span class="tag">${hit < OFFICIAL ? `official case ${hit + 1}` : `invented case ${hit + 1}`} · expects ${CASES[hit].want}</span>` : "")));

    out.append(el("div", "rnt-lbl", "Pricing"), el("div", null, priceTable(tier)), scoreboard());
  }

  // Every case, priced by the same function the grader runs. Six official, two invented.
  function scoreboard() {
    const box = el("div");
    const rows = CASES.map((c) => ({ c, got: price(Date.parse(c.out), Date.parse(c.back), c.tier).text }));
    const pass = rows.filter((x) => x.got === x.c.want).length;
    box.append(el("div", "rnt-lbl", `Test cases · ${pass} of ${rows.length} passing (${OFFICIAL} official, ${CASES.length - OFFICIAL} invented)`));
    box.append(el("div", "srow head",
      `<span class="mark"></span><span class="k">case</span><span class="exp">expected</span><span class="got">got</span>`));
    rows.forEach((x, i) => {
      box.append(el("div", "srow" + (x.got === x.c.want ? "" : " bad"),
        `<span class="mark">${x.got === x.c.want ? "✓" : "✗"}</span>` +
        `<span class="k">${esc(x.c.chip)}</span>` +
        `<span class="exp">${esc(x.c.want)}</span>` +
        `<span class="got">${esc(x.got)}</span>` +
        `<span class="rnt-why">${i < OFFICIAL ? "" : "invented — "}${esc(x.c.why)}</span>`));
    });
    return box;
  }

  render();
}

// ── STEP — a straight line, so the trace is the derivation ────────────────────
const SRC = [
  { ln: 1, html: `<span class="k">const</span> <span class="tok" data-t="pricing">PRICING</span> = { <span class="nu">1</span>: { base: <span class="nu">499</span>, late: <span class="nu">399</span> },` },
  { ln: 2, html: `                  <span class="nu">3</span>: { base: <span class="nu">399</span>, late: <span class="nu">299</span> },` },
  { ln: 3, html: `                  <span class="nu">7</span>: { base: <span class="nu">299</span>, late:  <span class="nu">99</span> } };  <span class="cm">// cents</span>` },
  { ln: 4, html: `<span class="k">const</span> <span class="tok" data-t="day">DAY = <span class="nu">24</span> * <span class="nu">60</span> * <span class="nu">60</span> * <span class="nu">1000</span></span>;` },
  { ln: 5, html: `<span class="k">function</span> <span class="fn">getRentalCost</span>(<span class="tok" data-t="params">rented, returned, tier</span>) {` },
  { ln: 6, html: `  <span class="k">const</span> <span class="tok" data-t="pick">{ base, late } = PRICING[tier]</span>;` },
  { ln: 7, html: `  <span class="k">const</span> <span class="tok" data-t="start">start = <span class="k">new</span> <span class="fn">Date</span>(rented)</span>;` },
  { ln: 8, html: `  <span class="k">const</span> <span class="tok" data-t="dueday">dueDay = start.<span class="fn">getUTCDate</span>() + tier</span>;` },
  { ln: 9, html: `  <span class="k">const</span> <span class="tok" data-t="due">due = Date.<span class="fn">UTC</span>(start.<span class="fn">getUTCFullYear</span>(), start.<span class="fn">getUTCMonth</span>(), dueDay, <span class="nu">12</span>)</span>;` },
  { ln: 10, html: `  <span class="k">const</span> <span class="tok" data-t="over">overdue = Date.<span class="fn">parse</span>(returned) - due</span>;` },
  { ln: 11, html: `  <span class="k">const</span> <span class="tok" data-t="ceil">lateDays = overdue &gt; <span class="nu">0</span> ? Math.<span class="fn">ceil</span>(overdue / DAY) : <span class="nu">0</span></span>;` },
  { ln: 12, html: `  <span class="k">const</span> <span class="tok" data-t="cents">cents = base + lateDays * late</span>;` },
  { ln: 13, html: `  <span class="k">return</span> <span class="tok" data-t="fmt"><span class="st">"$"</span> + (cents / <span class="nu">100</span>).<span class="fn">toFixed</span>(<span class="nu">2</span>)</span>;` },
  { ln: 14, html: `}` },
];

const PRICING_ITEMS = [1, 3, 7].map((t) => `${t}d ${PRICING[t].base}¢ +${PRICING[t].late}¢`);

function trace(caseIndex) {
  const k = Math.max(1, Math.min(CASES.length, caseIndex | 0));
  const c = CASES[k - 1];
  const outMs = Date.parse(c.out), backMs = Date.parse(c.back), tier = c.tier;
  const r = price(outMs, backMs, tier);
  const dueDay = new Date(outMs).getUTCDate() + tier;
  const monthLen = new Date(Date.UTC(new Date(outMs).getUTCFullYear(), new Date(outMs).getUTCMonth() + 1, 0)).getUTCDate();

  const steps = [];
  const S = (line, note, x = {}) => {
    // Scope by omission: a name appears in the panel only once the line that binds it has run,
    // and this function is one straight block, so nothing ever leaves scope again.
    const vars = {};
    if (line >= 6) { vars.base = r.base + "¢"; vars.late = r.late + "¢"; }
    if (line >= 7) vars.start = iso(outMs).replace(".000Z", "Z");
    if (line >= 8) vars.dueDay = dueDay;
    if (line >= 9) vars.due = iso(r.due).replace(".000Z", "Z");
    if (line >= 10) vars.overdue = (r.overdue / HOUR).toFixed(2) + "h";
    if (line >= 11) vars.lateDays = r.lateDays;
    if (line >= 12) vars.cents = r.cents;
    const structs = [];
    // PRICING's `const` statement opens on line 1 and closes on line 3, so it is in scope from
    // the first step onward — and, being a module constant, it never leaves again.
    if (line >= 1) structs.push({ label: "PRICING", items: PRICING_ITEMS });
    if (line >= 9) {
      const items = [`out ${stamp(outMs)}`, `due ${stamp(r.due)}`];
      if (line >= 10) items.push(`back ${stamp(backMs)}`);
      structs.push({ label: "UTC instants", items, newest: !!x.fresh });
    }
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `getRentalCost("${c.out}", "${c.back}", ${tier})`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Three tiers, and the numbers are in <b>cents</b>. That is not fussiness: the answer for the year-long case is <b>2.99 + 359 × 0.99</b>, which in floating point is <b>358.40000000000003</b>. Counting in the smallest unit means the only place a decimal point exists is the final format.`,
    { focus: "pricing" });

  S(4, `A day is <b>86,400,000</b> ms — <i>exactly</i>, every time, because epoch milliseconds are a UTC count with no daylight saving and no leap seconds in them. That is the property the whole solution leans on: once both ends are epoch numbers, "how many days apart" is a division that cannot drift.`,
    { focus: "day" });

  S(5, `Two ISO instants and a tier. The reflex here is <code class='inl'>(returned − rented) / days</code> — and it answers the wrong question. The charge is not about how long the item was held; it is about a <b>deadline</b>, a fixed wall-clock moment the return either beats or doesn't.`,
    { focus: "params" });

  S(6, `Tier <b>${tier}</b> prices at <b>${money(r.base)}</b> base and <b>${money(r.late)}</b> per late day. Note which way the table runs: the <i>longer</i> rental is the <i>cheaper</i> one on both counts, so nothing about the price can be derived from the duration — it has to be looked up.`,
    { focus: "pick", changed: ["base", "late"] });

  S(7, `Parse the checkout instant. The trailing <b>Z</b> makes this unambiguous — it is <b>${iso(outMs).replace(".000Z", "Z")}</b> on every machine on earth. What comes next is where that guarantee is usually thrown away.`,
    { focus: "start", changed: ["start"] });

  S(8, `<code class='inl'>getUTCDate()</code> — <b>not</b> <code class='inl'>getDate()</code>. Read as UTC the checkout day is <b>the ${new Date(outMs).getUTCDate()}th</b>; read in a reader's own timezone it can be the day before or the day after, and every later line inherits that error. Add the tier: the statement says a 1-day rental taken out on March 15 is due on <b>March 16</b>, so the last day of the period is checkout-day <b>+ tier</b>, giving <b>dueDay = ${dueDay}</b>.` +
    (dueDay > monthLen ? ` There is no ${MON[new Date(outMs).getUTCMonth()]} ${dueDay} — this month only has <b>${monthLen}</b> days. Line 9 is about to fix that for free.` : ``),
    { focus: "dueday", changed: ["dueDay"] });

  S(9, `<code class='inl'>Date.UTC(…, dueDay, 12)</code> builds the deadline: <b>12:00 PM UTC</b> on that day. Two things are doing quiet work here. The <b>12</b> is an hour field, so the instant is 12:00:00<b>.000</b> — there is no fuzz to argue about later. And <code class='inl'>Date.UTC</code> <b>normalises</b> an out-of-range day rather than rejecting it${dueDay > monthLen ? `, so <b>${MON[new Date(outMs).getUTCMonth()]} ${dueDay}</b> becomes <b>${MON[new Date(r.due).getUTCMonth()]} ${new Date(r.due).getUTCDate()}</b> with no month-length table anywhere in this function` : ` — which is what will save you when a checkout near month-end pushes dueDay past 30`}. Deadline: <b>${iso(r.due).replace(".000Z", "Z")}</b>.`,
    { focus: "due", changed: ["due"], fresh: true });

  S(10, `Now, and only now, the return time matters. <b>${stampY(backMs)}</b> − <b>${stampY(r.due)}</b> = <b>${signed(r.overdue)}</b>. ${r.overdue > 0
    ? `Positive: the deadline is behind us.`
    : r.overdue === 0
      ? `<b>Exactly zero</b> — the return landed on the deadline to the millisecond.`
      : `Negative: the item came back <b>before</b> the deadline, so this number is about to be thrown away rather than refunded.`} Notice what never entered this subtraction: the checkout <i>time</i>. Only the checkout <b>day</b> did, back on line 8.`,
    { focus: "over", changed: ["overdue"], fresh: true });

  S(11, `The guard first: <code class='inl'>overdue &gt; 0</code> → <b>${r.overdue > 0}</b>. ${r.overdue === 0
    ? `This is the boundary the challenge is built on. <b>Strictly</b> greater, so a return at exactly 12:00:00.000 is <b>on time</b> — one millisecond later and it is not. Officially tested, and a <code class='inl'>&gt;=</code> here fails that case alone.`
    : r.overdue < 0
      ? `An early return takes the <code class='inl'>: 0</code> branch. The base price is <b>flat</b> — there is no per-day rate to prorate, so keeping it for three hours and keeping it for three days cost the same.`
      : `The deadline is behind us, so the ceiling gets to run.`}`,
    { focus: "ceil", eval: { expr: `overdue (${signed(r.overdue)}) > 0`, val: r.overdue > 0 } });

  S(11, r.overdue > 0
    ? `<code class='inl'>Math.ceil(${(r.overdue / DAY).toFixed(4)})</code> = <b>${r.lateDays}</b>. <b>ceil</b>, not <b>round</b> or <b>floor</b>: the fee is charged per <i>started</i> day, so ${r.overdue < DAY
        ? `being over by ${span(r.overdue)} — not a day, not close to one — already costs a full <b>${money(r.late)}</b>.`
        : `the trailing part-day counts as a whole one and this bills <b>${r.lateDays}</b>, where <code class='inl'>Math.floor</code> would have said ${Math.floor(r.overdue / DAY)}.`}`
    : `<b>lateDays = 0</b>. Everything about the return instant is discarded from here on — the rest of the function only knows the tier.`,
    { focus: "ceil", changed: ["lateDays"] });

  S(12, `<b>${r.base}¢ + ${r.lateDays} × ${r.late}¢ = ${r.cents}¢</b>. Integer arithmetic end to end, so this figure is exact rather than nearly right. The fee is <b>linear</b> in late days — no cap, no escalation — which is what the year-long official case exists to pin down.`,
    { focus: "cents", changed: ["cents"] });

  S(13, `Divide by 100 <i>once</i>, at the very end, and <code class='inl'>toFixed(2)</code> pads the cents so <b>$3.9</b> can never be printed for 390¢. Return <b>${r.text}</b>${c.want === r.text ? `, which is what case ${k} expects.` : `.`}`,
    { focus: "fmt", done: true, result: r.text, ret: { value: r.text } });

  return steps;
}

export default {
  n: 313, id: "rental", title: "Rental Cost", dates: ["2026-06-19"],
  statement: `Given a rental timestamp, a return timestamp (both UTC ISO strings such as <code class="inl">"2026-06-18T18:30:00Z"</code>) and a rental <b>tier</b> of <code class="inl">1</code>, <code class="inl">3</code> or <code class="inl">7</code> days, return the total cost as <code class="inl">"$D.CC"</code>.
  Rentals are due back <b>by 12:00 PM UTC on the last day of the rental period</b> — a 1-day rental checked out at any time on March 15 is due by 12:00 PM UTC on March 16 — and each day past that deadline adds a late fee.
  Pricing: <b>1 day</b> $4.99 + $3.99/day late · <b>3 days</b> $3.99 + $2.99/day late · <b>7 days</b> $2.99 + $0.99/day late.
  <span class="rule">Example: <code class="inl">getRentalCost("2026-06-18T14:30:00Z", "2026-06-20T12:30:00Z", 1)</code> → <b>"$12.97"</b>. Due 2026-06-19 at 12:00 UTC; the return is 24h 30m past it, which bills <b>two</b> days: $4.99 + 2 × $3.99.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(1) — one subtraction",
      approach: `Build the <b>deadline</b>, then compare against it. Everything else is a distraction.<br><br>
      "Due by 12:00 PM UTC on the last day of the rental period" is an <b>instant</b>, not a length: take the checkout <i>day</i>, add the tier (the statement's own example — March 15, tier 1, due March 16 — settles that it is <code class='inl'>+ tier</code> and not <code class='inl'>+ tier − 1</code>), and pin the clock to 12:00. The checkout <b>time</b> then plays no part at all, which is why <code class='inl'>(returned − rented) / days</code> can never be made to work.<br><br>
      Three rules the official tests pin down and the prose leaves open. Late fees are per <b>started</b> day, so <code class='inl'>Math.ceil</code> — 24h 30m over bills two days. The boundary is <b>inclusive</b>: <code class='inl'>overdue &gt; 0</code> is strict, so a return at exactly 12:00:00.000 UTC is on time, and a return sixty seconds later costs a whole day. And an early return is <b>not</b> refunded — the base is flat, so the negative <code class='inl'>overdue</code> is simply discarded.<br><br>
      Two smaller choices. <code class='inl'>Date.UTC</code> normalises an out-of-range day, so a June 28 checkout on tier 7 asks for "June 35" and gets July 5 back with no month-length table in sight. And the money is counted in <b>cents</b>: $2.99 + 359 × $0.99 in floats is 358.40000000000003.<br><br>
      <b>The UTC discipline is the load-bearing part.</b> Swap <code class='inl'>getUTCDate</code>/<code class='inl'>Date.UTC</code> for <code class='inl'>getDate</code>/<code class='inl'>new Date(y, m, d, 12)</code> and the function still scores 6/6 under <code class='inl'>TZ=UTC</code> — then 5/6 in Auckland and 4/6 in Denver. It would pass for you and fail for whoever copies it.`,
      code: `// Prices in CENTS, so no float ever touches the money.
const PRICING: Record<number, { base: number; late: number }> = {
  1: { base: 499, late: 399 },
  3: { base: 399, late: 299 },
  7: { base: 299, late: 99 },
};
const DAY = 24 * 60 * 60 * 1000;

function getRentalCost(rented: string, returned: string, tier: number): string {
  const { base, late } = PRICING[tier];

  // UTC throughout, deliberately: the deadline is a wall-clock instant in UTC,
  // and getDate()/new Date(y, m, d, 12) would read it in the machine's own
  // timezone -- same code, 6/6 in TZ=UTC and 4/6 in America/Denver.
  const start = new Date(rented);
  const dueDay = start.getUTCDate() + tier;   // "the last day of the rental period"
  const due = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), dueDay, 12);

  const overdue = Date.parse(returned) - due;                   // ms past 12:00 UTC
  const lateDays = overdue > 0 ? Math.ceil(overdue / DAY) : 0;  // any part of a day bills a day

  return "$" + ((base + lateDays * late) / 100).toFixed(2);
}`,
      mount,
    },
    {
      name: "Step through", cost: "the due instant",
      approach: `Ten lines, no loop — so the trace is the <b>derivation</b> of the deadline rather than a walk through data. Watch three lines in particular.<br><br>
      <b>Line 8</b> is where the timezone is either kept or lost: <code class='inl'>getUTCDate()</code> against <code class='inl'>getDate()</code>. Load case <b>8</b> and it also asks for <b>June 35</b>, which line 9 quietly turns into July 5.<br><br>
      <b>Line 11</b> is the whole challenge. Run case <b>5</b> — the official one — and the condition panel shows <code class='inl'>overdue &gt; 0</code> evaluating <b>false</b> on a return at exactly 12:00:00.000. Then run case <b>7</b>, the same rental sixty seconds later, and the identical line bills a full day. Case <b>2</b> is the other half of the rule: 24h 30m over, <code class='inl'>Math.ceil</code> → <b>2</b>.<br><br>
      Case <b>3</b> is the early return, where the <code class='inl'>: 0</code> branch throws the return instant away entirely. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace,
        input: { label: "case =", value: 5, min: 1, max: CASES.length,
                 presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: 1–${OFFICIAL} official` },
      }),
    },
  ],
};
