// #51 · Phone Number Formatter — four slices and a template; the only trap is it's a STRING.
// The statement fixes the length at eleven, so the problem is slice positions and
// nothing else: 1 digit, 3, 3, 4. No loop, no regex, no validation to write. What is
// worth noticing is the FIRST official case, "05552340182" -> "+0 (555) 234-0182":
// that leading 0 is a country digit, not padding, and it survives only because the
// parameter is a string. Hand the same digits over as a Number and the 0 is gone —
// ten digits, every slice shifts one place left, and the result is wrong without
// any error. The demo has a toggle that does exactly that.
// ONE approach, deliberately. A regex with four capture groups is the same four
// slices respelled, and a digit-by-digit loop with an if-ladder is the same four
// slices done slowly with no visible cost gap — neither is a second mental model
// (CONTRIBUTING Tier 3 §1-§3), so inventing one would be a strawman.
// Click the Number(...) chip on the leading-zero case to watch every group shift.
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// The 2 official freeCodeCamp cases in the grader's order, then one of ours.
//   "155543547921" — ours, and OUT of contract (the statement promises eleven
//     digits). It is here to show what the slices actually do with a stray digit:
//     the last slice is open-ended (slice(7)), so the extra digit is swallowed by
//     the line number rather than rejected -> "+1 (555) 435-47921".
// The "pass as Number" toggle on the first official case is also ours: it is the
// bug the grader's leading-zero case exists to catch, and no official assertion
// ever passes a number.
const CASES = ["05552340182", "15554354792", "155543547921"];
const OFFICIAL = 2; // CASES[0..1] are freeCodeCamp's; the rest are ours.

// The grader's own answers, so the demo shows a verdict rather than asking you to
// take its word for it. Only the official cases have one.
const EXPECTED: Record<string, string> = {
  "05552340182": "+0 (555) 234-0182",
  "15554354792": "+1 (555) 435-4792",
};

// The same four cuts as the graded function, driven off one table so the demo's
// colour key, digit grid and answer are all read from the same bounds.
const GROUPS = [
  { name: "country", from: 0, to: 1, cls: "c1" },
  { name: "area", from: 1, to: 4, cls: "c2" },
  { name: "prefix", from: 4, to: 7, cls: "c3" },
  { name: "line", from: 7, to: Infinity, cls: "c4" },
];
const format = (n: string) => {
  const [country, area, prefix, line] = GROUPS.map((g) => n.slice(g.from, g.to));
  return `+${country} (${area}) ${prefix}-${line}`;
};

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .pn-wrap { display:flex; flex-direction:column; gap:12px; }
    .pn-digits { display:flex; flex-wrap:wrap; gap:4px; }
    .pn-d { display:flex; flex-direction:column; align-items:center; gap:2px; }
    .pn-d b { font:700 17px var(--mono); min-width:26px; text-align:center; padding:5px 0; border-radius:6px; border:1px solid var(--border); background:var(--panel-2); }
    .pn-d i { font:10px var(--mono); color:var(--muted); font-style:normal; }
    .pn-g0 b { border-color:var(--c1); color:var(--c1); }
    .pn-g1 b { border-color:var(--c2); color:var(--c2); }
    .pn-g2 b { border-color:var(--c3); color:var(--c3); }
    .pn-g3 b { border-color:var(--c4); color:var(--c4); }
    .pn-key { display:flex; flex-wrap:wrap; gap:6px; }
    .pn-key span { font:12px var(--mono); padding:3px 9px; border-radius:7px; border:1px solid var(--border); color:var(--muted); }
    .pn-key .g0 { border-color:var(--c1); } .pn-key .g1 { border-color:var(--c2); }
    .pn-key .g2 { border-color:var(--c3); } .pn-key .g3 { border-color:var(--c4); }
    .pn-key b { color:var(--text); }
    .pn-out { font:700 16px var(--mono); padding:9px 12px; border-radius:9px; border:1px solid var(--border); background:var(--panel-2); white-space:pre; overflow-x:auto; }
    .pn-out .g0 { color:var(--c1); } .pn-out .g1 { color:var(--c2); }
    .pn-out .g2 { color:var(--c3); } .pn-out .g3 { color:var(--c4); }
    .pn-warn { font:12px var(--sans); color:var(--warn); border:1px solid var(--warn); border-radius:8px; padding:5px 10px; background:color-mix(in srgb, var(--warn) 10%, transparent); }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();
  let asNumber = false;

  const ctl = el("div", "controls");
  const inp = el("input");
  inp.type = "text";
  inp.value = CASES[0]!;
  inp.style.width = "230px";
  ctl.append(el("span", "ctl-label", "number ="), inp);

  const pre = el("div", "controls");
  CASES.forEach((v, i) => {
    const c = el("button", "chip", `"${esc(v)}"`);
    c.title =
      i < OFFICIAL ? "official freeCodeCamp case" : "ours (outside the eleven-digit contract)";
    c.addEventListener("click", () => {
      inp.value = v;
      render();
    });
    pre.append(c);
  });

  const mode = el("div", "controls");
  mode.append(el("span", "ctl-label", "pass it as"));
  const modes = [
    ["string (as graded)", "good"],
    ["Number(…) — ours", "bad"],
  ] as const;
  const modeChips = modes.map(([label, tone], i) => {
    const c = el("button", `chip ${tone}`, label);
    c.addEventListener("click", () => {
      asNumber = i === 1;
      render();
    });
    mode.append(c);
    return c;
  });

  const out = el("div");
  host.append(ctl, pre, mode, out);
  inp.addEventListener("input", () => render());
  render();

  function render() {
    modeChips.forEach((c, i) => {
      c.classList.toggle("on", (i === 1) === asNumber);
    });
    const raw = inp.value;
    // A Number round-trip is what a caller who parsed the digits would hand over:
    // it is the one input transformation that silently deletes data.
    const n =
      asNumber && raw.trim() !== "" && !Number.isNaN(Number(raw)) ? String(Number(raw)) : raw;
    const result = format(n);
    const want = EXPECTED[raw];
    const ok = want === undefined ? !asNumber && n.length === 11 : result === want;

    out.innerHTML = "";
    const wrap = el("div", "pn-wrap");

    const line = el("div", "result-line");
    line.append(
      el("span", `badge ${ok ? "ok" : "no"}`, `formatNumber("${esc(n)}") → "${esc(result)}"`),
    );
    if (want !== undefined)
      line.append(
        el(
          "span",
          "more",
          result === want
            ? "matches freeCodeCamp's expected output"
            : `freeCodeCamp expects "${esc(want)}"`,
        ),
      );
    wrap.append(line);

    // Every digit with its index underneath: the whole algorithm is which index
    // falls in which group, so the indices are drawn rather than left to be counted.
    const digits = el("div", "pn-digits");
    Array.from(n).forEach((c, i) => {
      const g = GROUPS.findIndex((x) => i >= x.from && i < x.to);
      digits.append(el("div", `pn-d pn-g${g}`, `<b>${esc(c)}</b><i>${i}</i>`));
    });
    wrap.append(digits);

    wrap.append(
      el(
        "div",
        "pn-key",
        GROUPS.map(
          (g, i) =>
            `<span class="g${i}">${g.name} <b>slice(${g.from}${Number.isFinite(g.to) ? `, ${g.to}` : ""})</b> = "${esc(n.slice(g.from, g.to))}"</span>`,
        ).join(""),
      ),
    );

    const [a, b, c, d] = GROUPS.map(
      (g, i) => `<span class="g${i}">${esc(n.slice(g.from, g.to))}</span>`,
    );
    wrap.append(el("div", "pn-out", `+${a} (${b}) ${c}-${d}`));

    if (n.length !== 11)
      wrap.append(
        el(
          "div",
          "pn-warn",
          `<b>${Array.from(n).length}</b> digits, and the statement promises <b>eleven</b>. Nothing here validates that, because nothing has to: the grader never sends anything else.`,
        ),
      );

    wrap.append(el("div", "note", noteFor(raw, n, asNumber)));
    out.append(wrap);
  }
}

// What did THIS input exercise? Each branch names a different consequence.
function noteFor(raw: string, n: string, asNumber: boolean) {
  if (asNumber && n !== raw)
    return `Passed as a <b>Number</b>, <code class='inl'>"${esc(raw)}"</code> became <code class='inl'>${esc(n)}</code>: the leading ${raw.length - n.length === 1 ? "zero is" : "zeros are"} gone, because a number has no way to remember how it was written. The slices still run, but every index is now one digit short of where the statement thinks it is, so the country code swallows a digit that belonged to the area code and the line number loses its last one — <b>"${esc(format(n))}"</b> against the right <b>"${esc(format(raw))}"</b>. Nothing threw. This is what the official <code class='inl'>"05552340182"</code> is for: <code class='inl'>0</code> is the country digit here, not padding, and a string keeps it.`;
  if (asNumber)
    return `No leading zero on this input, so the Number round-trip happens to give the same digits back and the slices land correctly. That agreement is the danger: the conversion is a no-op on any number that does not start with <code class='inl'>0</code>, so it only shows itself on one that does. Click <code class='inl'>"05552340182"</code>.`;
  if (Array.from(n).length > 11)
    return `A twelfth digit has nowhere to go, so it goes into the <b>line</b> group: the last slice is <code class='inl'>slice(7)</code> with no end, and an open end takes everything left. That is the right choice for an input that is promised to be eleven digits — a fixed <code class='inl'>slice(7, 11)</code> would quietly <i>drop</i> the extra one instead, which hides bad input rather than showing it. Neither is validation; the statement says eleven, so the function does not check.`;
  if (Array.from(n).length < 11)
    return `Short input: the slices past the end return <code class='inl'>""</code> rather than throwing, so the template still prints, with empty groups. That is how <code class='inl'>slice</code> behaves past the end of a string — but it also means a bad length produces a <i>plausible-looking</i> string, not an error.`;
  if (n.startsWith("0"))
    return `The country digit is <b>0</b>, and it stays. The first slice is exactly one character, so <code class='inl'>"0"</code> comes out as <code class='inl'>+0</code> with no special case — there is no rule here about stripping zeros, as there would be for a national trunk prefix. Flip the toggle to <b>Number(…)</b> to see what happens to that zero when the input is a number instead of a string.`;
  return `Eleven digits split <b>1 · 3 · 3 · 4</b>, and every group is a fixed-width slice: ${GROUPS.map((g) => `<code class='inl'>${g.name}</code>`).join(", ")}. The shape of the output is a template, so the code is the template with four holes. The only thing this problem can really test is a leading zero, and that is the first chip.`;
}

// ── STEP — the four slices, one line each ───────────────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">formatNumber</span>(<span class="tok" data-t="arg">number</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> country = <span class="tok" data-t="country">number.<span class="fn">slice</span>(0, 1)</span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">const</span> area = <span class="tok" data-t="area">number.<span class="fn">slice</span>(1, 4)</span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">const</span> prefix = <span class="tok" data-t="prefix">number.<span class="fn">slice</span>(4, 7)</span>;`,
  },
  {
    ln: 5,
    html: `  <span class="k">const</span> line = <span class="tok" data-t="line">number.<span class="fn">slice</span>(7)</span>;`,
  },
  {
    ln: 6,
    html: `  <span class="k">return</span> <span class="tok" data-t="tpl"><span class="st">\`+\${country} (\${area}) \${prefix}-\${line}\`</span></span>;`,
  },
  { ln: 7, html: `}` },
];

const q = (s: string) => JSON.stringify(s);

function trace(rawInput: string) {
  const number = rawInput;
  const steps: DbgStep[] = [];
  const got: Record<string, string> = {};

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
    // A slice appears in the panel only once its own line has run.
    const vars: Record<string, unknown> = { number: q(number) };
    const names = ["country", "area", "prefix", "line"];
    names.forEach((k, i) => {
      if (line >= i + 2 && got[k] !== undefined) vars[k] = q(got[k]);
    });
    steps.push({
      line,
      note,
      focus: x.focus,
      done: x.done,
      result: x.result,
      frames: [
        {
          title: `formatNumber(${q(number)})`,
          vars,
          changed: x.changed ?? [],
          structs: [{ label: "number", items: Array.from(number).map((c, i) => `${i}:${c}`) }],
          ret: x.ret,
        },
      ],
    });
  };

  S(
    1,
    `Eleven digits in, a fixed shape out: <code class='inl'>+D (DDD) DDD-DDDD</code>. Because the width of every group is stated, there is nothing to search for and nothing to loop over — the whole problem is <b>which index each group starts at</b>. The index under each digit below is the thing to watch. Note the parameter is a <b>string</b>: that is not a detail, it is how a leading <code class='inl'>0</code> survives.`,
    { focus: "arg" },
  );

  const pieces: [number, string, number, number | undefined, string][] = [
    [
      2,
      "country",
      0,
      1,
      `The country code is the first <b>one</b> character, <code class='inl'>slice(0, 1)</code>. It is cut as a <i>string</i>, so ${number.startsWith("0") ? `the <b>0</b> here stays a <code class='inl'>"0"</code> and prints as <code class='inl'>+0</code>. Parse the input to a number first and this slice would be handed <code class='inl'>5</code> instead, with every later slice one place off` : `a leading zero would survive it too — that is exactly what the official <code class='inl'>"05552340182"</code> checks`}.`,
    ],
    [
      3,
      "area",
      1,
      4,
      `The next three characters, <code class='inl'>slice(1, 4)</code>. The end index is <b>exclusive</b>, so the pair (1, 4) is three wide: each group starts where the previous one ended, which is why the three numbers on lines 2–5 read <b>0, 1, 4, 7</b> as a chain and never need a separate length.`,
    ],
    [
      4,
      "prefix",
      4,
      7,
      `Three more, <code class='inl'>slice(4, 7)</code>. Writing both bounds as a start and an end rather than a start and a length means each call can be checked against its neighbours by eye: this one starts at 4 because the last one ended at 4.`,
    ],
    [
      5,
      "line",
      7,
      undefined,
      `The last group, <code class='inl'>slice(7)</code>, has <b>no end</b>. For a legal input that is the same as <code class='inl'>slice(7, 11)</code>, and it is the better spelling: it says "everything that is left", so the group can't fall out of step with the others if the problem ever changes length.${number.length > 11 ? ` Here the input has <b>${number.length}</b> digits, so the open end takes the extra one and the line number comes out ${number.length - 7} long — wrong for a phone number, but visible rather than hidden.` : ``}`,
    ],
  ];
  for (const [line, name, from, to, note] of pieces) {
    got[name] = number.slice(from, to);
    S(line, note, { focus: name, changed: [name] });
  }

  const result = format(number);
  S(
    6,
    `<b>Return ${q(result)}.</b> The four pieces go into a fixed template, and the punctuation — <code class='inl'>+</code>, the parentheses, the space and the hyphen — is literal text, so it cannot go wrong depending on the input. Everything this function can get wrong is a number on lines 2–5; this line has nothing to get wrong.`,
    { focus: "tpl", done: true, result: q(result), ret: { value: q(result) } },
  );
  return steps;
}

export default {
  n: 51,
  id: "phoneformat",
  title: "Phone Number Formatter",
  dates: ["2025-09-30"],
  statement: `Given a string of <b>eleven digits</b>, return it as a phone number in this format: <code class="inl">"+D (DDD) DDD-DDDD"</code>. <span class="rule">Example: <code class="inl">formatNumber("15554354792")</code> → <code class="inl">"+1 (555) 435-4792"</code> — and <code class="inl">formatNumber("05552340182")</code> → <code class="inl">"+0 (555) 234-0182"</code>, where the leading <code class="inl">0</code> is a real digit, not padding.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(1) — eleven characters",
      approach: `The width of every group is in the statement, so the code is four <code class='inl'>slice</code> calls and a template — no loop, no regex, no validation. The entire difficulty is hiding in how the input is <i>typed</i>. It is a <b>string</b> on purpose: the first official case starts with <code class='inl'>0</code>, and <code class='inl'>0</code> is the country digit, not padding, so <code class='inl'>"+0 (555) 234-0182"</code> is correct as written. A number cannot hold that — <code class='inl'>Number("05552340182")</code> is <code class='inl'>5552340182</code>, ten digits, and every slice lands one place left of where it belongs without an error being thrown. Flip the <b>Number(…)</b> chip on the first case to watch the groups shift. Two small choices are worth making deliberately: bounds as a <b>start and an end</b> (<code class='inl'>0,1 · 1,4 · 4,7</code>) so each call visibly begins where the last one ended, and the final group with <b>no end at all</b> so it means "everything left". That open end also means a twelve-digit input is not rejected but absorbed into the line number — the third chip, ours, shows it; the statement promises eleven, so nothing checks.`,
      code: `// Fixed widths 1, 3, 3, 4 -> four slices and a template.
// Takes a STRING on purpose: "05552340182" must keep its leading 0 ("+0 ..."),
// and a Number would silently drop it and shift every slice one place left.
function formatNumber(number: string): string {
  const country = number.slice(0, 1);
  const area = number.slice(1, 4);   // each group starts where the last one ended
  const prefix = number.slice(4, 7);
  const line = number.slice(7);      // open end: "everything left"
  return \`+\${country} (\${area}) \${prefix}-\${line}\`;
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "slice by slice",
      approach: `The function one slice per line, with the digits shown by index so you can see where each cut falls. Start on <b>"05552340182"</b> — official — where the first slice is a <code class='inl'>0</code> that must survive. <b>"15554354792"</b> is the other official case, and <b>"155543547921"</b> is ours: twelve digits, to watch line 5's open end swallow the extra one. Type any string. Each note says why that bound is what it is. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            type: "text",
            label: "number =",
            value: CASES[0]!,
            presets: CASES,
            hint: "eleven digits",
          },
        }),
    },
  ],
} satisfies Challenge;
