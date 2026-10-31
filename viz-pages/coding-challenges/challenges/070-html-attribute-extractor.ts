// #70 · HTML Attribute Extractor — slice the opening tag, then match name="value" pairs in it.
// Only the first element's opening tag can carry attributes, so the work is two small regexes:
//   1. tag   = the opening tag's insides: "<" + name, then any run of quoted strings or non-">" characters
//   2. pairs = every name="value" inside that slice, in order, each pushed as "name, value"
// Three things the official set pins down:
//   - the order is the order written: matchAll walks left to right, so there is nothing to sort.
//   - no attributes means []: <p>Lorem ipsum…</p> has a tag with nothing in it, and the loop body never runs.
//   - a value may hold spaces: class="btn btn-primary" is ONE attribute, so the value is "everything up to
//     the closing quote", never "up to the next space".
// Why slice the tag first instead of one global match over the string: text between tags can look like an
// attribute (<p>say a="b"</p>), and only the opening tag is the element's own. The tag pattern treats a
// quoted run as a unit, so a ">" inside a value (title="x > y") does not end the tag early.
// Limit (shortcut: valueless attributes like `disabled` are skipped; the statement promises name="value").
// ONE approach, deliberately. A hand-rolled character scanner is the same single pass with the regex
// engine unrolled: same work, same answer, nothing on screen to compare (CONTRIBUTING Tier 3 §1-§3).
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// The 5 official freeCodeCamp cases in the grader's order, then two of ours.
//   1 <span class="red"></span>                         ["class, red"]            one attribute; closing tag ignored
//   2 <meta charset="UTF-8" />                          ["charset, UTF-8"]        self-closing; the "/" is not an attribute
//   3 <p>Lorem ipsum dolor sit amet</p>                 []                        no attributes: empty array
//   4 <input name=... type=... required=... />          3 pairs                   order kept, repeated values fine
//   5 <button id="submit" class="btn btn-primary">…     value with a space        the value runs to the quote
//   6 <a title="x > y" href="#">go</a>                  ours                      a ">" inside a value does not end the tag
//   7 <p>say a="b"</p>                                  ours                      attribute-looking TEXT is not an attribute
const CASES: { html: string; want?: string[] }[] = [
  { html: '<span class="red"></span>', want: ["class, red"] },
  { html: '<meta charset="UTF-8" />', want: ["charset, UTF-8"] },
  { html: "<p>Lorem ipsum dolor sit amet</p>", want: [] },
  {
    html: '<input name="email" type="email" required="true" />',
    want: ["name, email", "type, email", "required, true"],
  },
  {
    html: '<button id="submit" class="btn btn-primary">Submit</button>',
    want: ["id, submit", "class, btn btn-primary"],
  },
  { html: '<a title="x > y" href="#">go</a>' },
  { html: '<p>say a="b"</p>' },
];
const OFFICIAL = 5; // CASES[0..4] are freeCodeCamp's; the rest are ours.

const TAG = /^<[\w-]+((?:"[^"]*"|[^>"])*)>/u;
const PAIR = /([^\s=]+)="([^"]*)"/gu;

const extractAttributes = (html: string) => {
  const tag = TAG.exec(html)?.[1] ?? "";
  const out: string[] = [];
  for (const [, name, value] of tag.matchAll(PAIR)) out.push(`${name}, ${value}`);
  return out;
};

// The input split into pieces for display: the tag shell, each name, each value, and the rest.
function mark(html: string) {
  const segs: { t: string; k: "shell" | "name" | "value" | "rest" }[] = [];
  const m = TAG.exec(html);
  if (!m) return html ? [{ t: html, k: "rest" as const }] : [];
  const tag = m[1]!;
  const start = m[0].length - 1 - tag.length; // where the attribute area begins in html
  segs.push({ t: html.slice(0, start), k: "shell" });
  let at = 0;
  for (const p of tag.matchAll(PAIR)) {
    const name = p[1]!;
    const value = p[2]!;
    segs.push(
      { t: tag.slice(at, p.index), k: "shell" },
      { t: name, k: "name" },
      { t: '="', k: "shell" },
      { t: value, k: "value" },
      { t: '"', k: "shell" },
    );
    at = p.index + p[0].length;
  }
  segs.push({ t: tag.slice(at) + ">", k: "shell" }, { t: html.slice(m[0].length), k: "rest" });
  return segs.filter((s) => s.t !== "");
}

const q = (s: string) => JSON.stringify(s);

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .ax-wrap { display:flex; flex-direction:column; gap:12px; }
    .ax-src { font:13px var(--mono); line-height:1.9; word-break:break-all; background:var(--panel-2); border:1px solid var(--border); border-radius:8px; padding:10px 12px; }
    .ax-src .shell { color:var(--muted); }
    .ax-src .rest { color:var(--muted); opacity:.55; text-decoration:line-through; }
    .ax-src .name { color:var(--c1); font-weight:700; }
    .ax-src .value { color:var(--good); font-weight:700; }
    .ax-key { font:11px var(--mono); color:var(--muted); display:flex; flex-wrap:wrap; gap:12px; }
    .ax-key .name { color:var(--c1); } .ax-key .value { color:var(--good); }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();

  const ctl = el("div", "controls");
  const inp = el("input");
  inp.type = "text";
  inp.value = CASES[0]!.html;
  inp.style.width = "420px";
  ctl.append(el("span", "ctl-label", "html ="), inp);

  const pre = el("div", "controls");
  CASES.forEach((c, i) => {
    const b = el("button", "chip", esc(c.html.length > 28 ? c.html.slice(0, 26) + "…" : c.html));
    b.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    b.addEventListener("click", () => {
      inp.value = c.html;
      render();
    });
    pre.append(b);
  });

  const out = el("div");
  host.append(ctl, pre, out);
  inp.addEventListener("input", () => render());
  render();

  function render() {
    const html = inp.value;
    const result = extractAttributes(html);
    const want = CASES.find((c) => c.html === html)?.want;
    const ok = want === undefined || JSON.stringify(want) === JSON.stringify(result);
    const n = result.length;

    out.innerHTML = "";
    const wrap = el("div", "ax-wrap");

    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${ok ? "ok" : "no"}`,
        `extractAttributes(${esc(q(html))}) → ${esc(JSON.stringify(result))}`,
      ),
      el(
        "span",
        "more",
        want === undefined
          ? `${n} attribute${n === 1 ? "" : "s"} found`
          : `${n} attribute${n === 1 ? "" : "s"} · matches freeCodeCamp's expected ${esc(JSON.stringify(want))}`,
      ),
    );
    wrap.append(line);

    // Every piece of user text goes through esc, so typed markup is shown, never rendered.
    const segs = mark(html);
    wrap.append(
      el(
        "div",
        "ax-src",
        segs.length === 0
          ? `<span class="muted">(empty input)</span>`
          : segs.map((s) => `<span class="${s.k}">${esc(s.t)}</span>`).join(""),
      ),
      el(
        "div",
        "ax-key",
        `<span class="name">■ attribute name</span><span class="value">■ value (up to the closing quote)</span><span>■ tag syntax</span><span>■ <s>after the opening tag (never read)</s></span>`,
      ),
    );

    wrap.append(el("div", "note", noteFor(html, result)));
    out.append(wrap);
  }
}

// What did THIS input exercise? Each branch names a different thing to get wrong.
function noteFor(html: string, result: string[]) {
  if (!TAG.test(html))
    return `No opening tag at the start of the input, so the tag match fails and <code class='inl'>tag</code> falls back to <code class='inl'>""</code>: the loop has nothing to scan and the answer is <code class='inl'>[]</code>.`;
  if (result.length === 0)
    return `The opening tag is bare, so the pair match finds nothing and <code class='inl'>out</code> stays <code class='inl'>[]</code>. The words in the text are never looked at, because only the opening tag is scanned.`;
  if (result.some((r) => r.includes(">")))
    return `A <code class='inl'>&gt;</code> sits <b>inside</b> a value, so "end the tag at the first &gt;" would cut <code class='inl'>title</code> short. The tag pattern consumes each quoted run as a unit and only an unquoted <code class='inl'>&gt;</code> ends it. This one is ours.`;
  if (/\s[^\s=]+="[^"]* [^"]*"/u.test(html))
    return `A value with a <b>space</b> in it: <code class='inl'>class="btn btn-primary"</code> is one attribute, not two, because the value runs to the closing quote. Splitting on whitespace would have made <code class='inl'>btn</code> and <code class='inl'>btn-primary</code> separate pieces.`;
  if (result.length > 1)
    return `<b>${result.length}</b> attributes, returned in the order written. <code class='inl'>matchAll</code> walks left to right, so nothing is sorted. Two values may be equal (<code class='inl'>name</code> and <code class='inl'>type</code> are both "email"); each pair is its own entry.`;
  return `One attribute: <b>${esc(q(result[0]!))}</b>. Whatever follows the opening tag (a closing tag, a self-closing <code class='inl'>/</code>) is not part of the attribute area, so it never matches.`;
}

// ── STEP — slice the tag, then one push per pair ───────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">extractAttributes</span>(<span class="tok" data-t="arg">html</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> <span class="tok" data-t="tag">tag = TAG.<span class="fn">exec</span>(html)?.[<span class="st">1</span>] ?? <span class="st">""</span></span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">const</span> <span class="tok" data-t="init">out = []</span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">for</span> (<span class="k">const</span> [, <span class="tok" data-t="name">name</span>, <span class="tok" data-t="value">value</span>] <span class="k">of</span> <span class="tok" data-t="loop">tag.<span class="fn">matchAll</span>(PAIR)</span>)`,
  },
  {
    ln: 5,
    html: `    <span class="tok" data-t="push">out.<span class="fn">push</span>(<span class="st">\`\${name}, \${value}\`</span>)</span>;`,
  },
  { ln: 6, html: `  <span class="k">return</span> <span class="tok" data-t="out">out</span>;` },
  { ln: 7, html: `}` },
];

function trace(idx: number) {
  const html = CASES[Math.max(1, Math.min(CASES.length, idx)) - 1]!.html;
  const steps: DbgStep[] = [];
  const m = TAG.exec(html);
  const tag = m?.[1] ?? "";
  const out: string[] = [];
  let cur: { name: string; value: string } | undefined;

  const S = (
    line: number,
    note: string,
    x: {
      focus?: string;
      changed?: string[];
      eval?: { expr: string; val: boolean };
      done?: boolean;
      result?: string;
      ret?: { value: string };
    } = {},
  ) => {
    // A name appears in the panel only once the line that declares it has run.
    const vars: Record<string, unknown> = { html: q(html) };
    if (line >= 2) vars["tag"] = q(tag);
    if (line >= 3) vars["out"] = JSON.stringify(out);
    if (line >= 4 && cur && line < 6) {
      vars["name"] = q(cur.name);
      vars["value"] = q(cur.value);
    }
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.result,
      frames: [
        {
          title: `extractAttributes(${q(html.length > 24 ? html.slice(0, 22) + "…" : html)})`,
          vars,
          changed: x.changed ?? [],
          structs: line >= 3 ? [{ label: "out", items: out.slice(), newest: true }] : [],
          ret: x.ret,
        },
      ],
    });
  };

  S(
    1,
    `A string holding one element. Only its <b>opening tag</b> can carry attributes, so the plan is: cut that tag's insides out, then collect every <code class='inl'>name="value"</code> pair from the cut, in order.`,
    { focus: "arg" },
  );
  S(
    2,
    m
      ? `<code class='inl'>TAG</code> matches from the opening <code class='inl'>&lt;</code> to the first <b>unquoted</b> <code class='inl'>&gt;</code> and captures what sits between the tag name and that <code class='inl'>&gt;</code>: <b>${esc(q(tag))}</b>. ${tag.trim() === "" ? "Nothing there, so no attributes can follow." : "Text after the tag, and the closing tag, are left behind."}`
      : `<code class='inl'>TAG</code> does not match: the input does not start with an opening tag, so <code class='inl'>tag</code> falls back to <code class='inl'>""</code>.`,
    { focus: "tag", changed: ["tag"] },
  );
  S(
    3,
    `<code class='inl'>out</code> starts as an empty array. It is the answer if no pair is ever found.`,
    {
      focus: "init",
      changed: ["out"],
    },
  );

  const pairs = [...tag.matchAll(PAIR)];
  pairs.forEach((p, k) => {
    cur = { name: p[1]!, value: p[2]! };
    S(
      4,
      `Match <b>${k + 1}</b> of ${pairs.length}: <code class='inl'>name</code> = <b>${esc(q(cur.name))}</b>, <code class='inl'>value</code> = <b>${esc(q(cur.value))}</b>. The value runs to the closing quote${cur.value.includes(" ") ? ", so the space inside it does not split it" : ""}${cur.value.includes(">") ? ", so the <code class='inl'>&gt;</code> inside it is just a character" : ""}.`,
      { focus: "name", changed: ["name", "value"] },
    );
    out.push(`${cur.name}, ${cur.value}`);
    S(
      5,
      `Push <b>${esc(q(out.at(-1)!))}</b>: name, a comma and a space, then value. <code class='inl'>matchAll</code> goes left to right, so the array stays in the order written.`,
      { focus: "push", changed: ["out"] },
    );
  });
  cur = undefined;

  S(
    6,
    pairs.length === 0
      ? `<code class='inl'>matchAll</code> found nothing, so the body never ran and <code class='inl'>out</code> is still <b>[]</b>. No attributes means an empty array, not <code class='inl'>null</code> or a message.`
      : `No more matches. <code class='inl'>out</code> holds ${pairs.length} entr${pairs.length === 1 ? "y" : "ies"} in source order: <b>${esc(JSON.stringify(out))}</b>.`,
    { focus: "out", done: true, result: JSON.stringify(out), ret: { value: JSON.stringify(out) } },
  );
  return steps;
}

export default {
  n: 70,
  id: "html-attribute-extractor",
  title: "HTML Attribute Extractor",
  dates: ["2025-10-19"],
  statement: `Given a string of a valid HTML element, return its attributes. You are given exactly one element; attributes look like <code class="inl">attribute="value"</code>. Return an array of strings, each <code class="inl">"attribute, value"</code>, in the order given, or an empty array if there are none. <span class="rule">Example: <code class="inl">extractAttributes('&lt;span class="red"&gt;&lt;/span&gt;')</code> → <code class="inl">["class, red"]</code>. A value may contain spaces: <code class="inl">class="btn btn-primary"</code> gives <code class="inl">"class, btn btn-primary"</code>.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(n) — one pass",
      approach: `Only the opening tag can hold attributes, so cut it out first, then collect pairs from the cut. The tag pattern runs from the <code class='inl'>&lt;</code> to the first <b>unquoted</b> <code class='inl'>&gt;</code> and captures the part after the tag name; the pair pattern <code class='inl'>name="value"</code> then runs over that slice only. Three things fall out of the official set. <b>Order</b> is free: <code class='inl'>matchAll</code> goes left to right. <b>No attributes</b> is free: the loop body never runs and the empty array comes back. <b>Spaces in a value</b> are free: the value is everything up to the closing quote, so <code class='inl'>btn btn-primary</code> stays one entry. Slicing the tag first also keeps attribute-looking <i>text</i> out (case 7, ours), and treating quoted runs as units keeps a <code class='inl'>&gt;</code> inside a value from ending the tag (case 6, ours). Type any element, or click a case: the first five are freeCodeCamp's. One honest limit: valueless attributes like <code class='inl'>disabled</code> are skipped; the statement promises <code class='inl'>name="value"</code>.`,
      code: `// Slice the opening tag, then collect each name="value" pair in order.
function extractAttributes(html: string): string[] {
  const tag = /^<[\\w-]+((?:"[^"]*"|[^>"])*)>/.exec(html)?.[1] ?? "";   // quoted runs are units, so ">" in a value is safe
  const out: string[] = [];
  for (const [, name, value] of tag.matchAll(/([^\\s=]+)="([^"]*)"/g)) {
    out.push(\`\${name}, \${value}\`);                                   // value runs to the closing quote
  }
  return out;
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "slice, then one push per pair",
      approach: `The function one decision per step: one step to slice the tag, then a match step and a push step per attribute. Start on <b>case 5</b>: <code class='inl'>class="btn btn-primary"</code> arrives as a single match with the space kept inside. <b>Case 3</b> never enters the loop and returns <code class='inl'>[]</code>. <b>Case 6</b> is ours: the <code class='inl'>&gt;</code> inside <code class='inl'>title</code> does not cut the tag short. <b>Case 7</b> is ours too: the text has an <code class='inl'>a="b"</code> in it, but the slice is empty so nothing matches. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            label: "case =",
            value: 5,
            min: 1,
            max: CASES.length,
            presets: CASES.map((_, i) => i + 1),
            hint: `1–${CASES.length}: 1–${OFFICIAL} official, 6–${CASES.length} ours`,
          },
        }),
    },
  ],
} satisfies Challenge;
