// #68 · Credit Card Masker — star every digit but the last four; leave separators alone.
// The statement fixes the shape: four groups of four digits joined by single spaces or single
// hyphens, so the card is always 19 characters and the last four digits are always the last
// four CHARACTERS. That turns "keep the last four digits" into a cut at length - 4:
//   mask = card.slice(0, cut).replace(/\d/gu, "*") + card.slice(cut)      cut = length - 4
// Two readings go wrong:
//   - `replace(/\d/gu, "*")` on the whole card masks the last four too. The cut is what keeps
//     them; the demo prints that over-masked figure beside the right one for every input.
//   - "leave the remaining characters unchanged" includes the separator. Replacing every
//     character but the last four (`"*".repeat(...)`) eats the spaces and hyphens, so the
//     replace targets digits only, `\d`, and the format is preserved by what it leaves alone.
// The last four are never converted to a number, so leading zeros survive: "0010" stays "0010".
// ONE approach, deliberately. A lookahead regex (a digit with four more digits after it), a
// split-and-join per group and a loop over characters are the same pass spelled differently,
// O(19) with nothing on screen to compare (CONTRIBUTING Tier 3 §1-§3). A second tab would
// be a strawman.
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// The 4 official freeCodeCamp cases in the grader's order, then one of ours.
//   1 4012-8888-8888-1881   hyphen separators
//   2 5105 1051 0510 5100   space separators
//   3 6011 1111 1111 1117   space separators; repeated digits so you can't tell which 1s are kept
//   4 2223-0000-4845-0010   hyphens; the kept group has leading zeros
//   5 0000 0000 0000 0000   ours: nothing distinguishes masked from kept except position
const CARDS = [
  "4012-8888-8888-1881",
  "5105 1051 0510 5100",
  "6011 1111 1111 1117",
  "2223-0000-4845-0010",
  "0000 0000 0000 0000",
];
const OFFICIAL = 4; // CARDS[0..3] are freeCodeCamp's; the rest are ours.
const EXPECTED = [
  "****-****-****-1881",
  "**** **** **** 5100",
  "**** **** **** 1117",
  "****-****-****-0010",
];

const mask = (card: string) => {
  const cut = card.length - 4;
  return card.slice(0, cut).replaceAll(/\d/gu, "*") + card.slice(cut);
};

// The wrong reading, scored on the same card so the demo can show it.
const maskAll = (card: string) => card.replaceAll(/\d/gu, "*");

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .cm-wrap { display:flex; flex-direction:column; gap:12px; }
    .cm-row { display:flex; flex-wrap:wrap; gap:3px; align-items:center; }
    .cm-row .k { min-width:62px; font:11px var(--mono); color:var(--muted); }
    .cm-c { width:24px; height:32px; display:flex; align-items:center; justify-content:center; font:15px var(--mono); border-radius:6px; border:1px solid var(--border); background:var(--panel-2); }
    .cm-c.sep { border-style:dashed; color:var(--muted); }
    .cm-c.star { border-color:var(--accent); background:color-mix(in srgb, var(--accent) 14%, transparent); color:var(--accent); }
    .cm-c.keep { border-color:var(--good); background:color-mix(in srgb, var(--good) 14%, transparent); }
    .cm-c.cut { margin-left:7px; }
    .cm-warn { font:12px var(--sans); color:var(--danger); border:1px solid var(--danger); border-radius:8px; padding:5px 10px; background:color-mix(in srgb, var(--danger) 10%, transparent); }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();

  const ctl = el("div", "controls");
  const inp = el("input");
  inp.type = "text";
  inp.value = CARDS[0]!;
  inp.style.width = "240px";
  ctl.append(el("span", "ctl-label", "card ="), inp);

  const pre = el("div", "controls");
  CARDS.forEach((c, i) => {
    const b = el("button", "chip", esc(c));
    b.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    b.addEventListener("click", () => {
      inp.value = c;
      render();
    });
    pre.append(b);
  });

  const out = el("div");
  host.append(ctl, pre, out);
  inp.addEventListener("input", () => render());
  render();

  function render() {
    const card = inp.value;
    out.innerHTML = "";
    if (card.length < 4) {
      out.append(
        el(
          "div",
          "note",
          "Type a card number: four groups of four digits, joined by spaces or hyphens.",
        ),
      );
      return;
    }
    const cut = card.length - 4;
    const result = mask(card);
    const idx = CARDS.indexOf(card);
    const want = idx >= 0 && idx < OFFICIAL ? EXPECTED[idx] : undefined;
    const wrong = maskAll(card);

    const wrap = el("div", "cm-wrap");

    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${want === undefined || want === result ? "ok" : "no"}`,
        `mask("${esc(card)}") → "${esc(result)}"`,
      ),
      el(
        "span",
        "more",
        want === undefined
          ? `cut at ${cut} · ${
              card
                .slice(0, cut)
                .split("")
                .filter((ch) => /\d/u.test(ch)).length
            } digits starred`
          : `cut at ${cut} · matches freeCodeCamp's expected "${esc(want)}"`,
      ),
    );
    wrap.append(line);

    // Two rows of cells: what went in, what came out. The kept tail is the last four characters.
    const cells = (s: string, cls: (ch: string, i: number) => string) =>
      s
        .split("")
        .map((ch, i) => `<span class="cm-c ${cls(ch, i)}">${esc(ch)}</span>`)
        .join("");
    const rowOf = (k: string, html: string) =>
      el("div", "cm-row", `<span class="k">${k}</span>${html}`);
    wrap.append(
      rowOf(
        "card",
        cells(card, (ch, i) =>
          i >= cut ? `keep${i === cut ? " cut" : ""}` : /\d/u.test(ch) ? "" : "sep",
        ),
      ),
      rowOf(
        "mask",
        cells(result, (ch, i) =>
          i >= cut ? `keep${i === cut ? " cut" : ""}` : ch === "*" ? "star" : "sep",
        ),
      ),
    );

    wrap.append(
      el(
        "div",
        "cm-warn",
        `Run <code class="inl">replace(/\\d/g, "*")</code> on the whole card and this reads <b>"${esc(wrong)}"</b>, not <b>"${esc(result)}"</b> — the cut at length &minus; 4 is what keeps the last four digits out of the replace.`,
      ),
    );
    wrap.append(el("div", "note", noteFor(card, result)));
    out.append(wrap);
  }
}

// What did THIS card exercise? Each branch names a different thing to get wrong.
function noteFor(card: string, result: string) {
  const tail = card.slice(-4);
  if (card.replaceAll(/\D/gu, "") === "0".repeat(16))
    return `Sixteen zeros: nothing but <b>position</b> tells the starred digits from the kept ones. The cut at index <b>${card.length - 4}</b> does the deciding, not the digit's value, and the tail <b>"${esc(tail)}"</b> stays a string, never a number.`;
  if (tail.startsWith("0"))
    return `The kept group <b>"${esc(tail)}"</b> starts with a zero. It is sliced off as text and glued back as text, so the zeros survive; convert it to a number and <code class="inl">0010</code> would become <code class="inl">10</code>.`;
  if (card.includes("-"))
    return `The <b>hyphens</b> are not digits, so <code class="inl">/\\d/g</code> walks past them and they come through unchanged: <b>"${esc(result)}"</b>. Masking every character before the cut would turn them into stars and wreck the format.`;
  return `The <b>spaces</b> are not digits, so <code class="inl">/\\d/g</code> leaves them in place and only the twelve digits before the cut become stars: <b>"${esc(result)}"</b>. The last four are never touched, however much they repeat the digits before them.`;
}

// ── STEP — a cut, a masked head, a joined tail ─────────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">mask</span>(<span class="tok" data-t="arg">card</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> cut = <span class="tok" data-t="cut">card.length - 4</span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">const</span> head = <span class="tok" data-t="head">card.<span class="fn">slice</span>(0, cut).<span class="fn">replace</span>(/\\d/g, <span class="s">"*"</span>)</span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">return</span> <span class="tok" data-t="ret">head + card.<span class="fn">slice</span>(cut)</span>;`,
  },
  { ln: 5, html: `}` },
];

function trace(idx: number) {
  const card = CARDS[Math.max(1, Math.min(CARDS.length, idx)) - 1]!;
  const cut = card.length - 4;
  const head = card.slice(0, cut).replaceAll(/\d/gu, "*");
  const tail = card.slice(cut);
  const result = head + tail;
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
    const vars: Record<string, unknown> = { card: `"${card}"` };
    ["cut", "head"].forEach((k, i) => {
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
          title: `mask("${card}")`,
          vars,
          changed: x.changed ?? [],
          structs: [{ label: "card", items: card.split("") }],
          ret: x.ret,
        },
      ],
    });
  };

  S(
    1,
    `The card is <b>${card.length}</b> characters: four groups of four digits and three separators (<b>${card.includes("-") ? "hyphens" : "spaces"}</b> here). The statement guarantees that shape, so the last four <i>digits</i> are also the last four <i>characters</i>. That is the whole trick, and it means no counting of digits is needed.`,
    { focus: "arg" },
  );

  have["cut"] = cut;
  S(
    2,
    `<code class='inl'>cut = ${card.length} - 4 = ${cut}</code>. Everything before index <b>${cut}</b> may be masked; everything from it on is kept. Finding the boundary once, as an index, beats testing each character for "am I one of the last four?".`,
    { focus: "cut", changed: ["cut"] },
  );

  have["head"] = head;
  S(
    3,
    `Slice off the front <b>"${card.slice(0, cut)}"</b> and star its digits: <b>"${head}"</b>. The regex is <code class='inl'>/\\d/g</code>, digits only, so the ${card.includes("-") ? "hyphens" : "spaces"} are skipped and the format survives. Mask by character count instead and the separators turn into stars too.`,
    { focus: "head", changed: ["head"] },
  );

  S(
    4,
    `<b>Return "${result}".</b> The tail <b>"${tail}"</b> was never part of the replace; it is sliced from the original and appended as the <i>string</i> it is${
      tail.startsWith("0")
        ? `, so its leading zero${tail.startsWith("00") ? "s" : ""} survive${tail.startsWith("00") ? "" : "s"}`
        : ""
    }.`,
    { focus: "ret", done: true, result, ret: { value: `"${result}"` } },
  );
  return steps;
}

export default {
  n: 68,
  id: "credit-card-masker",
  title: "Credit Card Masker",
  dates: ["2025-10-17"],
  statement: `Given a string of credit card numbers, return a masked version of it. The string holds <b>four sets of four digits</b>, all separated by a single space or a single hyphen (<code class="inl">-</code>). Replace every digit except the last four with an asterisk (<code class="inl">*</code>) and leave the remaining characters unchanged. <span class="rule">Example: <code class="inl">mask("4012-8888-8888-1881")</code> → <code class="inl">"****-****-****-1881"</code> — twelve digits starred, the hyphens and the last four untouched.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(n) — one pass",
      approach: `Because the format is fixed, the last four digits are the last four characters, so the code cuts once at <code class='inl'>length - 4</code>. The front part gets <code class='inl'>replace(/\\d/g, "*")</code>, which stars digits and walks past the spaces or hyphens; the tail is sliced from the original and appended. Two things to hold on to: the regex must target <b>digits</b>, not "every character", or the separators vanish; and the cut is what protects the last four, since a replace over the whole card (the red line under each demo) stars those too. The tail stays a string, so <code class='inl'>0010</code> keeps its zeros. Type any card or click a case: the first four are freeCodeCamp's, covering both separators; the last, all zeros, is ours.`,
      code: `// Star every digit before the last four characters; separators pass through.
function mask(card: string): string {
  const cut = card.length - 4;                       // fixed format: last 4 digits = last 4 chars
  const head = card.slice(0, cut).replace(/\\d/g, "*"); // digits only, so " " and "-" survive
  return head + card.slice(cut);                     // tail stays a string: "0010" keeps its zeros
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "cut, star, join",
      approach: `The function one line at a time, with <code class='inl'>cut</code> and <code class='inl'>head</code> appearing in the panel only once their line has run, and the card shown as an array of characters. Start on <b>case 1</b>, hyphens, to see the separators skipped on line 3. <b>Case 2</b> swaps in spaces, same result shape. <b>Case 4</b> keeps a tail starting with zeros, and <b>case 5</b>, all zeros, is ours. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            label: "case =",
            value: 1,
            min: 1,
            max: CARDS.length,
            presets: CARDS.map((_, i) => i + 1),
            hint: `1–${CARDS.length}: 1–${OFFICIAL} official, ${CARDS.length} ours`,
          },
        }),
    },
  ],
} satisfies Challenge;
