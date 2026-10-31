// #76 · Complementary DNA — a four-entry lookup applied to each base, in place.
// A pairs with T and C pairs with G, so the complement of a strand is a per-character table lookup
// and nothing else: the output is as long as the input and the bases stay in the same order.
// Two near-misses, both shown in the demo (the official cases catch both; case 5 makes them visible):
//   - reversing: a real "reverse complement" reads the new strand backwards. The statement asks for
//     the complement only (ACGT -> TGCA), so the order must NOT flip.
//   - chained replaceAll: strand.replaceAll("A","T").replaceAll("T","A") sends every A to T and then
//     every T (including the new ones) back to A, so the two letters collapse.
// ONE approach, deliberately. A for loop, a map/join and a regex replace with a callback are the same
// single pass over the string with the table lookup spelled differently: same work, same answer,
// nothing on screen to compare (CONTRIBUTING Tier 3 §1-§3).
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// Cases 1-4 are freeCodeCamp's four assertions in the grader's order. 5 and 6 are ours.
//   5 AACCGT -> TTGGCA   the reversed shortcut gives ACGGTT and the chained replaceAll gives AACCCA
//   6 ""     -> ""       nothing to look up, the loop never runs
const CASES: { strand: string; want?: string }[] = [
  { strand: "ACGT", want: "TGCA" },
  { strand: "ATGCGTACGTTAGC", want: "TACGCATGCAATCG" },
  { strand: "GGCTTACGATCGAAG", want: "CCGAATGCTAGCTTC" },
  { strand: "GATCTAGCTAGGCTAGCTAG", want: "CTAGATCGATCCGATCGATC" },
  { strand: "AACCGT" },
  { strand: "" },
];
const OFFICIAL = 4; // CASES[0..3] are freeCodeCamp's; the rest are ours.

const PAIR: Record<string, string> = { A: "T", T: "A", C: "G", G: "C" };
const comp = (s: string) =>
  s
    .split("")
    .map((b) => PAIR[b] ?? b)
    .join("");
const q = (s: string) => `"${s}"`;
const label = (s: string) => (s.length > 18 ? s.slice(0, 16) + "…" : s);

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .dn-wrap { display:flex; flex-direction:column; gap:10px; }
    .dn-strand { display:flex; flex-wrap:wrap; gap:4px; align-items:center; }
    .dn-tag { font:11px var(--mono); color:var(--muted); width:62px; }
    .dn-b { width:26px; height:30px; display:flex; align-items:center; justify-content:center; font:700 14px var(--mono); border-radius:6px; border:1px solid var(--border); background:var(--panel-2); }
    .dn-b.A { border-color:var(--c1); color:var(--c1); }
    .dn-b.T { border-color:var(--c2); color:var(--c2); }
    .dn-b.C { border-color:var(--c3); color:var(--c3); }
    .dn-b.G { border-color:var(--c4); color:var(--c4); }
    .dn-b.odd { border-color:var(--warn); color:var(--warn); }
    .dn-r { font:12px var(--mono); padding:5px 10px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); align-self:flex-start; }
    .dn-r.hot { border-color:var(--danger); color:var(--danger); }
    .dn-r b { color:var(--text); }
    .dn-r.hot b { color:var(--danger); }
  `,
    ),
  );
}

const row = (name: string, s: string) => {
  const r = el("div", "dn-strand");
  r.append(el("span", "dn-tag", name));
  s.split("").forEach((b) => r.append(el("span", `dn-b ${PAIR[b] ? b : "odd"}`, esc(b))));
  return r;
};

function mount(host: HTMLElement) {
  ensureStyle();

  const ctl = el("div", "controls");
  const inp = el("input");
  inp.type = "text";
  inp.value = CASES[0]!.strand;
  inp.style.width = "340px";
  ctl.append(el("span", "ctl-label", "strand ="), inp);

  const pre = el("div", "controls");
  CASES.forEach((c, i) => {
    const b = el("button", "chip", c.strand === "" ? '""' : esc(label(c.strand)));
    b.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    b.addEventListener("click", () => {
      inp.value = c.strand;
      render();
    });
    pre.append(b);
  });

  const out = el("div");
  host.append(ctl, pre, out);
  inp.addEventListener("input", () => render());
  render();

  function render() {
    const strand = inp.value;
    const result = comp(strand);
    const want = CASES.find((c) => c.strand === strand)?.want;
    const ok = want === undefined || want === result;
    out.innerHTML = "";
    const wrap = el("div", "dn-wrap");

    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${ok ? "ok" : "no"}`,
        `complementaryDNA(${esc(q(label(strand)))}) → ${esc(q(label(result)))}`,
      ),
    );
    if (want !== undefined)
      line.append(el("span", "more", `matches freeCodeCamp's expected ${esc(q(label(want)))}`));
    wrap.append(line);

    wrap.append(row("strand", strand), row("complement", result));

    // The two shortcuts, scored on the same input.
    const rev = result.split("").toReversed().join("");
    const chained = strand
      .replaceAll("A", "T")
      .replaceAll("T", "A")
      .replaceAll("C", "G")
      .replaceAll("G", "C");
    const rows: [string, string][] = [
      ["reversed too", rev],
      ["chained replace", chained],
    ];
    for (const [name, v] of rows) {
      const hot = v !== result;
      wrap.append(
        el(
          "div",
          `dn-r${hot ? " hot" : ""}`,
          `${name} <b>${esc(q(label(v)))}</b>${hot ? " ✗" : " (same here)"} · table lookup <b>${esc(q(label(result)))}</b>`,
        ),
      );
    }
    wrap.append(el("div", "note", noteFor(strand)));
    out.append(wrap);
  }
}

// What did THIS strand exercise?
function noteFor(strand: string) {
  if (strand === "")
    return `An empty strand has no bases, so the loop never runs and the answer is <b>""</b>. There is nothing to look up and nothing to guard.`;
  const odd = [...new Set(strand.split("").filter((b) => !PAIR[b]))];
  const oddNote =
    odd.length > 0
      ? ` The amber ${odd.map((b) => `<b>${esc(b)}</b>`).join(", ")} ${odd.length === 1 ? "is" : "are"} not a DNA letter (the prompt promises only A, C, G, T), so the <code class='inl'>?? base</code> fallback copies ${odd.length === 1 ? "it" : "them"} through unchanged.`
      : "";
  const c = comp(strand);
  return `Each of the ${strand.length} bases swaps by the table (A&harr;T, C&harr;G) and stays in its own position, so the complement reads left to right alongside the strand.${oddNote} ${
    c.split("").toReversed().join("") === c
      ? "This complement reads the same backwards, so the reversed shortcut cannot be told apart here."
      : "Reading the complement backwards (the red line) would give a different strand: the order must not flip."
  }`;
}

// ── STEP — one lookup per base ───────────────────────────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">complementaryDNA</span>(<span class="tok" data-t="arg">strand</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> <span class="tok" data-t="pair">PAIR = { A: <span class="st">"T"</span>, T: <span class="st">"A"</span>, C: <span class="st">"G"</span>, G: <span class="st">"C"</span> }</span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">let</span> <span class="tok" data-t="init">out = <span class="st">""</span></span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="base">base</span> <span class="k">of</span> <span class="tok" data-t="loop">strand</span>)`,
  },
  {
    ln: 5,
    html: `    <span class="tok" data-t="add">out += PAIR[base] ?? base</span>;`,
  },
  { ln: 6, html: `  <span class="k">return</span> <span class="tok" data-t="out">out</span>;` },
  { ln: 7, html: `}` },
];

function trace(idx: number) {
  const strand = CASES[Math.max(1, Math.min(CASES.length, idx)) - 1]!.strand;
  const steps: DbgStep[] = [];
  let out = "";
  let base: string | undefined;
  const pairs: string[] = [];

  const S = (
    line: number,
    note: string,
    x: { focus?: string; changed?: string[]; done?: boolean } = {},
  ) => {
    // A name appears in the panel only once the line that declares it has run.
    const vars: Record<string, unknown> = { strand: q(strand) };
    if (line >= 3) vars["out"] = q(out);
    if (line >= 4 && line < 6 && base !== undefined) vars["base"] = q(base);
    steps.push({
      line,
      note,
      focus: x.focus,
      done: x.done,
      result: x.done ? q(out) : undefined,
      frames: [
        {
          title: `complementaryDNA(${q(label(strand))})`,
          vars,
          changed: x.changed ?? [],
          structs: line >= 4 ? [{ label: "pairs so far", items: pairs.slice(), newest: true }] : [],
          ret: x.done ? { value: q(out) } : undefined,
        },
      ],
    });
  };

  S(
    1,
    `A strand of ${strand.length} base${strand.length === 1 ? "" : "s"}. The complement is the same length in the same order, so there is nothing to sort, reverse or search: each base is replaced on its own.`,
    { focus: "arg" },
  );
  S(
    2,
    `The whole rule is a four-entry table: A and T swap, C and G swap. Looking a base up in it replaces it in one step, which is why no <code class='inl'>if</code> chain or <code class='inl'>replace</code> is needed.`,
    { focus: "pair" },
  );
  S(
    3,
    `<code class='inl'>out</code> starts as an empty string. It is the answer if the strand has no bases${strand === "" ? ", and this one has none" : ""}.`,
    { focus: "init", changed: ["out"] },
  );
  for (const [k, b] of strand.split("").entries()) {
    base = b;
    S(
      4,
      `Base <b>${k + 1}</b> of ${strand.length}: <code class='inl'>base</code> = <b>${esc(q(b))}</b>. The loop walks left to right, so the new strand is built in the same order as the old.`,
      { focus: "base", changed: ["base"] },
    );
    const c = PAIR[b] ?? b;
    out += c;
    pairs.push(`${b} → ${c}`);
    S(
      5,
      PAIR[b]
        ? `<code class='inl'>PAIR[${esc(q(b))}]</code> is <b>${esc(q(c))}</b>, appended to <code class='inl'>out</code>, now <b>${esc(q(out))}</b>. Each base is looked up in the original, never in <code class='inl'>out</code>, so a swapped letter is never swapped back (the chained <code class='inl'>replaceAll</code> mistake).`
        : `<b>${esc(q(b))}</b> is not in the table, so <code class='inl'>PAIR[base]</code> is <code class='inl'>undefined</code> and <code class='inl'>?? base</code> falls back to the letter itself: <code class='inl'>out</code> is now <b>${esc(q(out))}</b>. (The prompt promises only A, C, G, T; the fallback just keeps stray input from printing "undefined".)`,
      { focus: "add", changed: ["out"] },
    );
  }
  base = undefined;
  S(
    6,
    strand === ""
      ? `No bases, so the loop body never ran and <code class='inl'>out</code> is still <b>""</b>.`
      : `Every base is done: <code class='inl'>out</code> is <b>${esc(q(out))}</b>, the same length as the input and not reversed. Return it.`,
    { focus: "out", done: true },
  );
  return steps;
}

export default {
  n: 76,
  id: "complementary-dna",
  title: "Complementary DNA",
  dates: ["2025-10-25"],
  statement: `Given a string representing a DNA sequence, return its complementary strand. DNA consists of the letters <code class="inl">"A"</code>, <code class="inl">"C"</code>, <code class="inl">"G"</code> and <code class="inl">"T"</code>. <code class="inl">"A"</code> and <code class="inl">"T"</code> complement each other, and so do <code class="inl">"C"</code> and <code class="inl">"G"</code>. <span class="rule">Example: <code class="inl">complementaryDNA("ACGT")</code> → <code class="inl">"TGCA"</code>.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(n) — one lookup per base",
      approach: `The rule is a four-entry table, so the work is one lookup per base: <code class='inl'>A↔T</code>, <code class='inl'>C↔G</code>. The output is the same length and in the same order as the input. Two tempting shortcuts go wrong, and the red lines score both on your strand. <b>Reversing</b> the result (a real reverse complement) flips the order; the prompt asks for the complement only, so <b>Chained replaceAll</b> (<code class='inl'>A→T</code>, then <code class='inl'>T→A</code>) swaps a letter and then swaps it back, merging the two. Case <b>5</b> (ours) breaks both; case <b>6</b> is the empty strand. Type any strand or click a case: the first four are freeCodeCamp's.`,
      code: `// One table lookup per base; the result keeps the input's length and order.
function complementaryDNA(strand: string): string {
  const PAIR: Record<string, string> = { A: "T", T: "A", C: "G", G: "C" };
  let out = "";
  for (const base of strand) out += PAIR[base] ?? base; // looked up in the original, never in out
  return out;
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "one lookup per base",
      approach: `Six lines, but the loop is two: line 4 takes the next base, line 5 looks it up and appends. Start on <b>case 1</b> to watch <code class='inl'>ACGT</code> become <code class='inl'>TGCA</code> one letter at a time, with the <b>pairs so far</b> list growing beside it. Cases <b>2</b> to <b>4</b> are the longer official strands. Case <b>5</b> (ours) is the one where reversing or chained replacing would differ, and case <b>6</b> (ours) is empty, so lines 4 and 5 never run. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            label: "case =",
            value: 1,
            min: 1,
            max: CASES.length,
            presets: CASES.map((_, i) => i + 1),
            hint: `1-${CASES.length}: 1-${OFFICIAL} official, ${OFFICIAL + 1}-${CASES.length} ours`,
          },
        }),
    },
  ],
} satisfies Challenge;
