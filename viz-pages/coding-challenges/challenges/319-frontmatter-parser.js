// #319 · Frontmatter Parser — the lines are easy; every value must come back as its TYPE.
//
// Single-approach (Tier 3): there is no wasteful-vs-clever axis here. Every
// solution reads each line once and decides a type once — a "regex instead of
// slice" rewrite is two spellings of one approach, which CONTRIBUTING rejects,
// so this module ships one `Solution` + one `Step through`, the normal outcome.
//
// The lesson is the COERCION LADDER and its order, not the parsing:
//   • booleans first  — an exact whole-string match against one literal, and the
//                       rungs below it would never reject "true" on their own.
//   • empty next      — a guard, not a case: Number("") and Number(" ") are 0,
//                       not NaN, so an empty value would arrive as the number 0.
//   • number next     — a WHOLE-string Number() test. parseFloat reads a PREFIX,
//                       which is how "1.0.0" becomes 1 and "09:30" becomes 9.
//   • string last     — the catch-all accepts everything, so anything below it
//                       would be unreachable.
// And one trap in the split itself: `line.split(":")` shatters a value that
// contains a colon (the official `url: https://example.com` case is exactly
// this), so the key/value cut is `indexOf(":")` + two slices — first colon only.
//
// WHAT THE 4 OFFICIAL ASSERTIONS DO NOT SPECIFY — every one of these is a choice
// made here, not a rule read off the grader:
//   1. Case of the boolean literals. "False"/"TRUE"/"yes"/"no" are NOT booleans;
//      only the exact lowercase "true"/"false" are. (YAML 1.1 would accept yes/no;
//      YAML 1.2's core schema would not. Chose the narrow, predictable rule.)
//   2. An empty value (`subtitle:`) → the empty STRING "", never 0.
//   3. Whitespace around the key → trimmed, so `  author   : x` keys on "author".
//   4. A line with no colon at all → skipped, not an error and not a null key.
//   5. Quotes are literal characters: `title: "Hi"` keeps its quote marks.
//      Nothing in the statement mentions quoting, so nothing strips them.
//   6. Duplicate keys → last one wins (plain assignment).
//   7. The `---` fences are treated as OPTIONAL, and any blank line is skipped —
//      the parser drops fence lines wherever they appear rather than requiring
//      them, so a fence-less block still parses. Every official input has them.
//   8. "Number-ness" is JavaScript's, not YAML's. A whole-string `Number()` also
//      accepts `1e3`, `0x10`, `Infinity` and `-0`, and turns a zero-padded `007`
//      into `7`. That is a knock-on of using `Number` rather than a hand-rolled
//      /^-?\d+(\.\d+)?$/, and the trade is deliberate — the regex would reject
//      `1e3` too, and no official test touches either side of it.
// Cases 5 and 6 in CASES below are invented to exercise 1–4; the official set
// never touches them. See the provenance comment there.
import { el, esc, mountDebugger } from "../shared.js";

// ── the real thing, shared by the demo and mirrored line-for-line by the debugger ──
function coerce(raw) {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "") return "";
  if (!Number.isNaN(Number(raw))) return Number(raw);
  return raw;
}

function parseFrontmatter(str) {
  const out = {};
  for (const line of str.split("\n")) {
    const t = line.trim();
    if (t === "" || t === "---") continue;
    const i = line.indexOf(":");
    if (i === -1) continue;
    out[line.slice(0, i).trim()] = coerce(line.slice(i + 1).trim());
  }
  return out;
}

// Provenance — cases 1–4 are freeCodeCamp's OFFICIAL set, verbatim and in the
// grader's order. They already cover a lot: all three types, an id that only
// LOOKS numeric, a version string parseFloat would mangle to 1, a URL whose
// value contains colons, and two floats. Cases 5–6 are OURS, and each lands
// somewhere the official set never goes:
//   5 — a human value containing a colon, three times over. split(":") shatters
//       every one of them; the official url case hides this behind a URL.
//   6 — the corners the statement left unspecified: an empty value (Number("")
//       is 0), a key padded with spaces, a capitalised "False" that stays a
//       string, and a line with no colon at all. All four are OUR choices.
const CASES = [
  { label: "official · the three types", text: "---\ntitle: My Post\ndraft: false\nviews: 100\n---" },
  { label: "official · id that looks numeric", text: "---\nid: 6a174db57256a112f932195c\ntitle: My Book\nlocale: en\nwordCount: 10000\npublished: false\n---" },
  { label: "official · version + url", text: "---\nversion: 1.0.0\nurl: https://example.com\nprivate: true\n---" },
  { label: "official · two floats", text: "---\nrating: 4.5\nprice: 9.99\n---" },
  { label: "ours · colons inside values", text: "---\ntitle: Notes: part two\nratio: 16:9\nstandup: 09:30\n---" },
  { label: "ours · the unspecified corners", text: "---\n  author   : Ada Lovelace\nsubtitle:\ndraft: False\nthis line has no colon\n---" },
];

// Which rung of the ladder fired, for the demo's "rung" column. Mirrors coerce()'s
// ORDER, and `ord` is an ORDINAL — 1st, 2nd, 3rd, 4th rung — NOT a line number.
// Do not "correct" these to match SRC: coerce()'s rungs are SRC lines 15–19, and the two
// counts deliberately differ, because rung 1 covers BOTH boolean tests (SRC lines 15
// and 16) — the table only reports that a literal matched, not which literal. Four
// rungs, five source lines; the field is named `ord` so the two can't be confused.
function rungOf(raw) {
  if (raw === "true" || raw === "false") return { ord: 1, why: "exact literal" };
  if (raw === "") return { ord: 2, why: 'empty guard' };
  if (!Number.isNaN(Number(raw))) return { ord: 3, why: "whole-string Number" };
  return { ord: 4, why: "fallback" };
}

const typeKey = (v) => (typeof v === "string" ? "s" : typeof v === "number" ? "n" : "b");
// Escaped display form of a coerced value — strings keep their quotes so the
// TYPE is visible twice: once in the badge, once in the punctuation.
const reprHtml = (v) => (typeof v === "string" ? `"${esc(v)}"` : esc(String(v)));
const reprPlain = (v) => (typeof v === "string" ? `"${v}"` : String(v));
const objPlain = (o) => {
  const e = Object.entries(o);
  return e.length ? "{ " + e.map(([k, v]) => `${k}: ${reprPlain(v)}`).join(", ") + " }" : "{}";
};

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  // Type colours come from the kit's MEANING-FREE ramp slots (--c4/--c5/--c8).
  // --c1/--c2/--c3/--c6 are aliases of accent/good/warn/danger, so a type badge
  // painted in one of those would read as "success" or "error". These three are
  // categorical, which is exactly what a type is.
  document.head.append(el("style", null, `
    .fmp-ta { width:100%; min-height:150px; box-sizing:border-box; background:var(--panel-2); color:var(--text);
              border:1px solid var(--border); border-radius:10px; padding:10px 12px;
              font:12.5px/1.7 var(--mono); resize:vertical; }
    .fmp-ta:focus { outline:none; border-color:var(--accent); }
    .fmp-tbl { border:1px solid var(--border); border-radius:12px; background:var(--panel); overflow-x:auto; margin-top:12px; }
    .fmp-row { display:grid; grid-template-columns:24px minmax(54px,.7fr) minmax(80px,1.15fr) minmax(80px,1.15fr) 68px 82px;
               gap:10px; align-items:center; padding:6px 12px; font:12.5px var(--mono); min-width:440px;
               border-bottom:1px dashed color-mix(in srgb, var(--border) 55%, transparent); }
    .fmp-row:last-child { border-bottom:0; }
    .fmp-row.head { font:700 9.5px var(--sans); letter-spacing:.08em; text-transform:uppercase;
                    color:var(--muted); background:var(--panel-2); }
    .fmp-row > span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .fmp-row .fmp-n { color:var(--muted); opacity:.6; text-align:right; }
    .fmp-row .fmp-k { color:var(--accent); }
    .fmp-row .fmp-raw { color:var(--muted); }
    .fmp-row .fmp-rung { font-size:10.5px; color:var(--muted); text-align:right; }
    .fmp-row.skip { opacity:.42; }
    .fmp-row.skip .fmp-raw { font-style:italic; }
    .fmp-t { font:700 9.5px var(--sans); letter-spacing:.05em; text-transform:uppercase;
             padding:2px 0; border-radius:20px; text-align:center; }
    .fmp-t.s { color:var(--c5); border:1px solid color-mix(in srgb, var(--c5) 55%, var(--border)); background:color-mix(in srgb, var(--c5) 13%, transparent); }
    .fmp-t.n { color:var(--c4); border:1px solid color-mix(in srgb, var(--c4) 55%, var(--border)); background:color-mix(in srgb, var(--c4) 13%, transparent); }
    .fmp-t.b { color:var(--c8); border:1px solid color-mix(in srgb, var(--c8) 55%, var(--border)); background:color-mix(in srgb, var(--c8) 13%, transparent); }
    .fmp-v.s { color:var(--c5); } .fmp-v.n { color:var(--c4); font-weight:700; } .fmp-v.b { color:var(--c8); font-weight:700; }
    .fmp-obj { margin-top:12px; padding:11px 14px; border:1px solid var(--border); border-radius:10px;
               background:#0a0e14; font:12.5px/1.75 var(--mono); overflow:auto; white-space:pre; }
    .fmp-obj .fmp-fk { color:var(--accent); }
    .fmp-tally { display:flex; gap:6px; flex-wrap:wrap; }
    /* the tally reuses .tag for its shell; .fmp-t's zero side-padding suits a
       table cell, not a free-standing pill, so put it back here only. */
    .fmp-tally .fmp-t { padding:2px 10px; }
  `));
}

// ── Demo — type your own frontmatter, watch each value get a TYPE ─────────────
// The whole point is the right-hand columns: the same characters, once as the
// raw text the file contained and once as the JS value they coerce to, badged.
function mountSolution(host) {
  ensureStyle();

  const ta = el("textarea", "fmp-ta");
  ta.value = CASES[0].text;
  ta.spellcheck = false;
  const chips = el("div", "controls");
  const chipEls = CASES.map((c, i) => {
    const b = el("button", "chip" + (i === 0 ? " on" : ""), esc(c.label));
    b.onclick = () => {
      ta.value = c.text;
      chipEls.forEach((x, j) => x.classList.toggle("on", j === i));
      render();
    };
    chips.append(b);
    return b;
  });
  const out = el("div");
  host.append(el("div", "ctl-label", "Raw frontmatter — edit it freely:"), ta, chips, out);
  ta.oninput = () => { chipEls.forEach((x) => x.classList.remove("on")); render(); };
  render();

  function render() {
    const text = ta.value;
    // One walk, producing a row per SOURCE line so the skipped ones stay visible.
    const rows = text.split("\n").map((line, idx) => {
      const t = line.trim();
      if (t === "" || t === "---") return { n: idx + 1, line, skip: t === "" ? "blank line" : "--- fence" };
      const i = line.indexOf(":");
      if (i === -1) return { n: idx + 1, line, skip: "no colon" };
      const key = line.slice(0, i).trim();
      const raw = line.slice(i + 1).trim();
      const value = coerce(raw);
      return { n: idx + 1, line, key, raw, value, rung: rungOf(raw) };
    });
    const pairs = rows.filter((r) => !r.skip);
    const obj = parseFrontmatter(text);
    const tally = { string: 0, number: 0, boolean: 0 };
    Object.values(obj).forEach((v) => { tally[typeof v]++; });

    const head = `<div class="fmp-row head"><span></span><span>key</span><span>raw text</span><span>coerced value</span><span>type</span><span>rung</span></div>`;
    const body = rows.map((r) => {
      if (r.skip) {
        return `<div class="fmp-row skip"><span class="fmp-n">${r.n}</span>` +
          `<span class="fmp-raw">—</span><span class="fmp-raw" title="${esc(r.line)}">${esc(r.line) || "&nbsp;"}</span>` +
          `<span class="fmp-raw">skipped · ${esc(r.skip)}</span><span></span><span class="fmp-rung">—</span></div>`;
      }
      const k = typeKey(r.value);
      return `<div class="fmp-row"><span class="fmp-n">${r.n}</span>` +
        `<span class="fmp-k" title="${esc(r.key)}">${esc(r.key)}</span>` +
        `<span class="fmp-raw" title="${esc(r.raw)}">${r.raw === "" ? "<i>(empty)</i>" : esc(r.raw)}</span>` +
        `<span class="fmp-v ${k}" title="${esc(reprPlain(r.value))}">${reprHtml(r.value)}</span>` +
        `<span class="fmp-t ${k}">${typeof r.value}</span>` +
        `<span class="fmp-rung">${r.rung.ord} · ${esc(r.rung.why)}</span></div>`;
    }).join("");

    const entries = Object.entries(obj);
    const lit = entries.length
      ? "{\n" + entries.map(([k, v]) => `  <span class="fmp-fk">${esc(k)}</span>: <span class="fmp-v ${typeKey(v)}">${reprHtml(v)}</span>`).join(",\n") + "\n}"
      : "{}";

    out.innerHTML =
      `<div class="result-line">` +
        `<span class="badge ok">parseFrontmatter → ${entries.length} key${entries.length === 1 ? "" : "s"}</span>` +
        `<span class="fmp-tally">` +
          `<span class="tag fmp-t s">${tally.string} string</span>` +
          `<span class="tag fmp-t n">${tally.number} number</span>` +
          `<span class="tag fmp-t b">${tally.boolean} boolean</span>` +
        `</span>` +
        (pairs.length !== rows.length ? `<span class="muted" style="font-size:12px">${rows.length - pairs.length} line${rows.length - pairs.length === 1 ? "" : "s"} skipped</span>` : "") +
      `</div>` +
      `<div class="fmp-tbl">${head}${body}</div>` +
      `<div class="fmp-obj">${lit}</div>` +
      `<div class="note">The <b>raw text</b> and <b>coerced value</b> columns hold the same characters — only the ` +
      `type differs, and the badge is the whole challenge. Type <code class='inl'>100</code> and it turns purple; add a ` +
      `dot to make <code class='inl'>1.0.0</code> and it goes back to teal, because <code class='inl'>Number()</code> tests ` +
      `the <b>whole</b> string (<code class='inl'>parseFloat</code> would hand you <b>1</b>). Delete a value entirely and ` +
      `it stays a string — <code class='inl'>Number("")</code> is <b>0</b>, so the empty guard has to sit in front of the ` +
      `number rung. Put a colon in a value and it survives: the cut is made at the <b>first</b> colon only.</div>`;
  }
}

// ── STEP — parseFrontmatter() calling coerce(), on the shared debugger ────────
// Two real frames: the loop frame stays put while a coerce() frame is pushed for
// every value, so the ladder is visible as its own call rather than inlined.
// Scope is by LIVENESS FLAG rather than line-gating, because `i`/`key`/`raw` stay
// alive in the caller while the coerce frame is on top (lines 14–19).
const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">parseFrontmatter</span>(<span class="tok" data-t="param">str</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> <span class="tok" data-t="outinit">out = {}</span>;` },
  { ln: 3,  html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="forline">line</span> <span class="k">of</span> str.<span class="fn">split</span>(<span class="st">"\\n"</span>)) {` },
  { ln: 4,  html: `    <span class="k">if</span> (<span class="tok" data-t="fence">line.<span class="fn">trim</span>() === <span class="st">""</span> || line.<span class="fn">trim</span>() === <span class="st">"---"</span></span>) <span class="k">continue</span>;` },
  { ln: 5,  html: `    <span class="k">const</span> <span class="tok" data-t="idx">i = line.<span class="fn">indexOf</span>(<span class="st">":"</span>)</span>;   <span class="cm">// FIRST colon only</span>` },
  { ln: 6,  html: `    <span class="k">if</span> (<span class="tok" data-t="nocolon">i === -1</span>) <span class="k">continue</span>;` },
  { ln: 7,  html: `    <span class="k">const</span> <span class="tok" data-t="key">key = line.<span class="fn">slice</span>(0, i).<span class="fn">trim</span>()</span>;` },
  { ln: 8,  html: `    <span class="k">const</span> <span class="tok" data-t="raw">raw = line.<span class="fn">slice</span>(i + 1).<span class="fn">trim</span>()</span>;` },
  { ln: 9,  html: `    <span class="tok" data-t="call">out[key] = <span class="fn">coerce</span>(raw)</span>;` },
  { ln: 10, html: `  }` },
  { ln: 11, html: `  <span class="k">return</span> <span class="tok" data-t="ret">out</span>;` },
  { ln: 12, html: `}` },
  { ln: 13, html: `` },
  { ln: 14, html: `<span class="k">function</span> <span class="fn">coerce</span>(<span class="tok" data-t="craw">raw</span>) {` },
  { ln: 15, html: `  <span class="k">if</span> (<span class="tok" data-t="rtrue">raw === <span class="st">"true"</span></span>)  <span class="k">return</span> <span class="k">true</span>;` },
  { ln: 16, html: `  <span class="k">if</span> (<span class="tok" data-t="rfalse">raw === <span class="st">"false"</span></span>) <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 17, html: `  <span class="k">if</span> (<span class="tok" data-t="rempty">raw === <span class="st">""</span></span>)     <span class="k">return</span> <span class="st">""</span>;      <span class="cm">// Number("") is 0</span>` },
  { ln: 18, html: `  <span class="k">if</span> (<span class="tok" data-t="rnum">!Number.<span class="fn">isNaN</span>(<span class="fn">Number</span>(raw))</span>) <span class="k">return</span> <span class="fn">Number</span>(raw);` },
  { ln: 19, html: `  <span class="k">return</span> <span class="tok" data-t="rstr">raw</span>;` },
  { ln: 20, html: `}` },
];

function traceParse(caseIndex) {
  const idx = Math.max(0, Math.min(CASES.length - 1, (caseIndex | 0) - 1));
  const c = CASES[idx] || CASES[0];
  const steps = [];
  const out = {};

  let cur = null, i = null, key = null, raw = null, cRaw = null;
  let haveOut = false, haveLine = false, haveI = false, haveKey = false, haveRaw = false;
  const qv = (s) => `"${s}"`;                       // vars/structs are escaped by the engine
  const items = () => Object.entries(out).map(([k, v]) => `${k}: ${reprPlain(v)}`);

  const S = (ln, note, x = {}) => {
    const vars = {};
    if (haveLine) vars.line = qv(cur);
    if (haveI) vars.i = i;
    if (haveKey) vars.key = qv(key);
    if (haveRaw) vars.raw = qv(raw);
    const frames = [{
      title: "parseFrontmatter(str)", vars, changed: x.changed || [],
      structs: haveOut ? [{ label: "out", items: items(), newest: !!x.outNew }] : [],
      ret: x.ret,
    }];
    if (x.coerce) frames.push({ title: `coerce(${qv(cRaw)})`, vars: { raw: qv(cRaw) }, changed: x.cChanged || [], ret: x.cRet });
    steps.push({ line: ln, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result, frames });
  };

  const lines = c.text.split("\n");
  S(1, `<b>Case ${idx + 1}: ${esc(c.label)}.</b> One string arrives holding <b>${lines.length}</b> lines separated by <code class='inl'>\\n</code>. Every value inside it is <b>text</b> right now — the job is to hand back the ones that are really numbers and booleans as numbers and booleans.`, { focus: "param" });
  haveOut = true;
  S(2, `Start with an empty object. Keys will be <b>appended in file order</b>, and a repeated key would simply overwrite — the statement never mentions duplicates, so plain assignment (last one wins) is the choice made here.`, { focus: "outinit" });

  for (const L of lines) {
    cur = L; haveLine = true; haveI = haveKey = haveRaw = false;
    S(3, `Next source line: <code class='inl'>${esc(L) || "(empty)"}</code>. Splitting on <code class='inl'>"\\n"</code> is enough because the statement guarantees newline-separated input — no <code class='inl'>\\r\\n</code> handling is being invented here.`, { focus: "forline", changed: ["line"] });

    const t = L.trim();
    const isFence = t === "" || t === "---";
    S(4, isFence
      ? `<code class='inl'>line.trim()</code> is <code class='inl'>${esc(t) || '""'}</code> — a ${t === "" ? "blank line" : "<b>---</b> fence"}, which carries no data. <b>Skip it.</b> Fences are matched on the <b>trimmed</b> line so indented ones still count, and they are treated as optional rather than required: nothing here demands the block be fenced at all.`
      : `<code class='inl'>line.trim()</code> is neither <code class='inl'>""</code> nor <code class='inl'>"---"</code>, so this line carries data. Note the test runs on a <b>trimmed copy</b> — the original <code class='inl'>line</code> is kept intact, because the value may need its own internal spacing.`,
      { focus: "fence", eval: { expr: `line.trim() is "" or "---"`, val: isFence } });
    if (isFence) continue;

    i = L.indexOf(":"); haveI = true;
    const shards = L.split(":").length;
    S(5, `<code class='inl'>indexOf(":")</code> → <b>${i}</b>: the position of the <b>first</b> colon. That single index is the whole reason this line survives — <code class='inl'>line.split(":")</code> would cut it into <b>${shards}</b> piece${shards === 1 ? "" : "s"}${shards > 2 ? ` and quietly throw away everything after the first colon` : ``}, while slicing at one index keeps the remainder whole.`, { focus: "idx", changed: ["i"] });

    if (i === -1) {
      // Line 6 only earns a step when it actually fires — on a well-formed line
      // the guard is a no-op, and narrating "not -1" every time would be noise.
      S(6, `No colon anywhere on this line, so there is no key and no value. <b>Skip it.</b> The statement says nothing about malformed lines; treating them as skippable rather than throwing (or emitting an empty key) is a choice, and the forgiving one.`, { focus: "nocolon", eval: { expr: `i === -1`, val: true } });
      haveI = false;
      continue;
    }

    key = L.slice(0, i).trim(); haveKey = true;
    S(7, `Everything <b>before</b> index ${i} is the key: <code class='inl'>${esc(JSON.stringify(L.slice(0, i)))}</code> → trimmed to <b>${esc(key)}</b>. The trim is not cosmetic — an untrimmed key would make <code class='inl'>obj["${esc(key)} "]</code> a different property from <code class='inl'>obj["${esc(key)}"]</code>.`, { focus: "key", changed: ["key"] });

    raw = L.slice(i + 1).trim(); haveRaw = true;
    S(8, `Everything <b>after</b> it is the value: <code class='inl'>${esc(JSON.stringify(L.slice(i + 1)))}</code> → trimmed to <code class='inl'>${esc(JSON.stringify(raw))}</code>. The <code class='inl'>+ 1</code> steps over the colon itself; any <b>later</b> colon is still in there, untouched, because it belongs to the value.`, { focus: "raw", changed: ["raw"] });

    cRaw = raw;
    S(9, `The value is still a <b>string</b>. Hand it to <code class='inl'>coerce</code> to decide what it really is — a new frame is <b>pushed</b>.`, { focus: "call" });
    S(14, `Inside <b>coerce</b>. What follows is a <b>ladder</b>: rungs tried top to bottom, first match wins. The order is the entire lesson — each rung must be narrower than the one below it, and the rung that accepts <i>everything</i> has to be last or the rungs beneath it are dead code.`, { coerce: true, focus: "craw", cChanged: ["raw"] });

    const num = Number(raw);
    const ladder = [
      {
        ln: 15, tok: "rtrue", expr: `raw === "true"`, hit: raw === "true", value: true,
        hitNote: `Exact match on the literal <b>"true"</b> → return the <b>boolean</b> <code class='inl'>true</code>, not the four-character string. Deliberately narrow: only the exact lowercase word qualifies, so a value like <code class='inl'>true story</code> is left alone.`,
        missNote: `<code class='inl'>raw === "true"</code> → <b>false</b>. Booleans are tested <b>first</b> because this is the narrowest test in the ladder — one exact whole-string comparison. Nothing further down could have caught it either: <code class='inl'>Number("true")</code> is <b>NaN</b>, so the number rung would have waved it straight through to the string fallback.`,
      },
      {
        ln: 16, tok: "rfalse", expr: `raw === "false"`, hit: raw === "false", value: false,
        hitNote: `Exact match on <b>"false"</b> → return the <b>boolean</b> <code class='inl'>false</code>. This is why the test is <code class='inl'>===</code> and not a truthiness check: <code class='inl'>Boolean("false")</code> is <b>true</b>, because every non-empty string is truthy.`,
        missNote: `<code class='inl'>raw === "false"</code> → <b>false</b>. It gets its own line rather than folding into a <code class='inl'>Boolean(raw)</code> coercion, because <code class='inl'>Boolean("false")</code> is <b>true</b> — coercing instead of comparing would turn every non-empty value in the file into <code class='inl'>true</code>.`,
      },
      {
        ln: 17, tok: "rempty", expr: `raw === ""`, hit: raw === "", value: "",
        hitNote: `The value is <b>empty</b> — everything after the colon was whitespace. Return the empty <b>string</b>. This rung exists only to stand in front of the next one: <code class='inl'>Number("")</code> is <b>0</b> and <code class='inl'>Number(" ")</code> is <b>0</b> too, not NaN, so without the guard an absent value would arrive as the number <b>0</b> — a value the file never contained.`,
        missNote: `<code class='inl'>raw === ""</code> → <b>false</b>, there is something here. The guard still earns its line: <code class='inl'>Number("")</code> is <b>0</b>, not NaN, so an empty value reaching the rung below would come back as the number <b>0</b>. None of the official tests cover it, which is exactly why it has to be reasoned about rather than discovered.`,
      },
      {
        ln: 18, tok: "rnum", expr: `!Number.isNaN(Number(raw))`, hit: !Number.isNaN(num), value: num,
        hitNote: `<code class='inl'>Number(${esc(JSON.stringify(raw))})</code> → <b>${num}</b>, not NaN, so the <b>whole</b> string is a number → return it as one. "Whole" is the load-bearing word: <code class='inl'>Number</code> parses the entire string or fails outright, while <code class='inl'>parseFloat</code> reads a <b>prefix</b> and stops.`,
        missNote: `<code class='inl'>Number(${esc(JSON.stringify(raw))})</code> → <b>NaN</b>: this string does not parse <b>end to end</b>, so it is not a number. Here is where <code class='inl'>parseFloat</code> would have got it wrong — it returns the longest numeric prefix, turning <code class='inl'>1.0.0</code> into <b>1</b> and <code class='inl'>09:30</code> into <b>9</b>. A whole-string test refuses both.`,
      },
      {
        ln: 19, tok: "rstr", expr: null, hit: true, value: raw,
        hitNote: `Nothing above matched, so the value is a <b>string</b> — returned trimmed, quotes and colons and all. The catch-all has to be <b>last</b>: it accepts every possible input, so any rung placed below it could never run.`,
        missNote: ``,
      },
    ];

    let val;
    for (const r of ladder) {
      if (r.hit) {
        val = r.value;
        S(r.ln, r.hitNote, { coerce: true, focus: r.tok, eval: r.expr ? { expr: r.expr, val: true } : undefined, cRet: { value: reprPlain(r.value) } });
        break;
      }
      S(r.ln, r.missNote, { coerce: true, focus: r.tok, eval: { expr: r.expr, val: false } });
    }

    out[key] = val;
    S(9, `The frame pops. <code class='inl'>out["${esc(key)}"]</code> is now <code class='inl'>${esc(reprPlain(val))}</code> — a <b>${typeof val}</b>, where the file only ever held characters. That difference is what the grader checks.`, { focus: "call", outNew: true });
  }

  haveLine = haveI = haveKey = haveRaw = false;  // the for-of is over; its bindings are gone
  S(11, `Every line has been read. <b>Return</b> <code class='inl'>${esc(objPlain(out))}</code> — ${Object.keys(out).length} key${Object.keys(out).length === 1 ? "" : "s"}, each carrying the type its text implied rather than the type its text <i>was</i>.`, { focus: "ret", done: true, result: objPlain(out), ret: { value: objPlain(out) } });
  return steps;
}

export default {
  n: 319, id: "frontmatter", title: "Frontmatter Parser", dates: ["2026-06-25"],
  statement: `Given a string holding a frontmatter block — <code class="inl">key: value</code> lines, one per line, wrapped in <code class="inl">---</code> delimiters and separated by <code class="inl">\\n</code> — parse it and return an object of those keys and values. <span class="rule">Numbers, Booleans and Strings must each come back as their own type.</span> So <code class="inl">"---\\ntitle: My Post\\ndraft: false\\nviews: 100\\n---"</code> → <code class="inl">{ title: "My Post", draft: false, views: 100 }</code>.`,
  variants: [
    {
      name: "Solution", cost: "O(n) — one pass per line",
      approach: `Cut each line at its <b>first</b> colon with <code class='inl'>indexOf</code> + two slices — never <code class='inl'>split(":")</code>, which shatters a value that contains one (<code class='inl'>url: https://example.com</code> is an official test). Then run the value down a <b>coercion ladder</b>, ordered narrowest-first: the two boolean literals, an empty-string guard, a <b>whole-string</b> <code class='inl'>Number()</code> test, and finally the string catch-all. Two rungs are load-bearing for reasons the tests barely hint at — <code class='inl'>Number("")</code> is <b>0</b>, so the empty guard must come before the number rung, and <code class='inl'>Number</code> must be used rather than <code class='inl'>parseFloat</code>, which reads a prefix and turns <code class='inl'>1.0.0</code> into <b>1</b>.`,
      code: `// Frontmatter is "key: value" lines between --- fences. Splitting them is the
// easy half; the challenge is that every value arrives as TEXT and has to come
// back as the right JS type.
type Scalar = string | number | boolean;

function parseFrontmatter(str: string): Record<string, Scalar> {
  const out: Record<string, Scalar> = {};
  for (const line of str.split("\\n")) {
    const t = line.trim();
    if (t === "" || t === "---") continue;   // fences and blank lines carry nothing
    const i = line.indexOf(":");             // FIRST colon only: values may hold one
    if (i === -1) continue;                  // not a "key: value" line at all
    out[line.slice(0, i).trim()] = coerce(line.slice(i + 1).trim());
  }
  return out;
}

// The ladder. The ORDER is the lesson: every rung is narrower than the one under
// it, and the catch-all sits last or the rungs below it are unreachable.
function coerce(raw: string): Scalar {
  if (raw === "true") return true;    // exact literal — Boolean("false") is true,
  if (raw === "false") return false;  // so compare, never coerce
  if (raw === "") return "";          // guard: Number("") is 0, NOT NaN
  if (!Number.isNaN(Number(raw))) return Number(raw); // WHOLE string; parseFloat
  return raw;                                         // would read "1.0.0" as 1
}`,
      mount: mountSolution,
    },
    {
      name: "Step through", cost: "the coercion ladder",
      approach: `The parser and the ladder as <b>two real frames</b>: the loop frame holds <code class='inl'>line</code>, <code class='inl'>i</code>, <code class='inl'>key</code> and <code class='inl'>raw</code> while a <code class='inl'>coerce</code> frame is pushed for every single value. Watch each value fall down the rungs — and read the <b>miss</b> notes, not just the hits: they say why that rung sits where it does. Try case 3 (<code class='inl'>1.0.0</code> refuses the number rung), case 5 (a colon inside the value, kept whole), and case 6 (an empty value stopped by the guard before <code class='inl'>Number("")</code> can make it <b>0</b>). Pick a case, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, {
        source: SRC, trace: traceParse,
        input: { label: "case =", value: 1, min: 1, max: CASES.length, presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick an example` },
      }),
    },
  ],
};
