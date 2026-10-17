// #66 · HTML Tag Stripper — at a "<" jump past the next ">", else keep the character.
// A tag is everything from a "<" through the next ">", attributes and all, so there is nothing to
// parse and no nesting to track: nested tags are just tags that follow one another. The whole
// function is one pointer and one output string:
//   while (i < html.length)
//     if html[i] is "<"  ->  i jumps to just past the next ">"   (the tag is dropped, whatever is in it)
//     else               ->  html[i] is text, append it and step
// Three things the official set pins down:
//   - attributes go with the tag: href="#" and class="center" never reach the output, because the
//     jump lands after the ">" rather than after the tag NAME.
//   - a void tag is just a tag: <img ...> has no closing partner, so "remove the closers" or "pair
//     them up" gets it wrong, and the answer is the empty string "".
//   - adjacent text is not separated: sectionsection, not "section section". Nothing is inserted
//     where a tag was, so two elements that touch in the markup touch in the text.
// Limit (shortcut: a ">" inside a quoted attribute value ends the tag early; the statement
// promises plain valid markup, so the first ">" is the end. A real parser tracks quotes).
// ONE approach, deliberately. A /<[^>]*>/g replace is the same scan with the loop hidden in the
// regex engine: same work, same answer, nothing on screen to compare (CONTRIBUTING Tier 3
// §1-§3), so a second tab would be a strawman.
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// The 4 official freeCodeCamp cases in the grader's order, then one of ours.
//   1 <a href="#">Click here</a>                    Click here      one tag pair; the attribute goes with the tag
//   2 <p class="center">Hello <b>World</b>!</p>      Hello World!    nested; text on both sides of an inner tag
//   3 <img src="cat.jpg" alt="Cat">                  ""              a void tag, all tag and no text
//   4 <main id="main"><section ...>section</section>... sectionsection  adjacent elements; nothing inserted between
//   5 plain text, no tags                            ours            the jump never fires; the input comes back whole
const CASES: { html: string; want?: string }[] = [
  { html: '<a href="#">Click here</a>', want: "Click here" },
  { html: '<p class="center">Hello <b>World</b>!</p>', want: "Hello World!" },
  { html: '<img src="cat.jpg" alt="Cat">', want: "" },
  {
    html: '<main id="main"><section class="section">section</section><section class="section">section</section></main>',
    want: "sectionsection",
  },
  { html: "plain text, no tags" },
];
const OFFICIAL = 4; // CASES[0..3] are freeCodeCamp's; the rest are ours.

const stripTags = (html: string) => {
  let out = "";
  let i = 0;
  while (i < html.length) {
    // oxlint-disable-next-line unicorn/explicit-length-check -- not a length check: `indexOf + 1 || length` maps a missing ">" (-1 → 0) to the end of the string
    if (html[i] === "<") i = html.indexOf(">", i) + 1 || html.length;
    else out += html[i++];
  }
  return out;
};

// Each character of the input tagged as dropped (inside a tag) or kept, by the same walk.
function mark(html: string) {
  const segs: { t: string; tag: boolean }[] = [];
  let i = 0;
  while (i < html.length) {
    if (html[i] === "<") {
      // oxlint-disable-next-line unicorn/explicit-length-check -- not a length check: `indexOf + 1 || length` maps a missing ">" (-1 → 0) to the end of the string
      const j = html.indexOf(">", i) + 1 || html.length;
      segs.push({ t: html.slice(i, j), tag: true });
      i = j;
    } else segs.push({ t: html[i++]!, tag: false });
  }
  return segs;
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
    .ts-wrap { display:flex; flex-direction:column; gap:12px; }
    .ts-src { font:13px var(--mono); line-height:1.9; word-break:break-all; background:var(--panel-2); border:1px solid var(--border); border-radius:8px; padding:10px 12px; }
    .ts-src .tag { color:var(--danger); text-decoration:line-through; background:color-mix(in srgb, var(--danger) 10%, transparent); border-radius:4px; padding:1px 2px; margin:0 1px; }
    .ts-src .keep { color:var(--good); font-weight:700; }
    .ts-key { font:11px var(--mono); color:var(--muted); display:flex; flex-wrap:wrap; gap:12px; }
    .ts-key .tag { color:var(--danger); } .ts-key .keep { color:var(--good); }
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
    const result = stripTags(html);
    const want = CASES.find((c) => c.html === html)?.want;
    const segs = mark(html);
    const tags = segs.filter((s) => s.tag).length;

    out.innerHTML = "";
    const wrap = el("div", "ts-wrap");

    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${want === undefined || want === result ? "ok" : "no"}`,
        `stripTags(${esc(q(html))}) → ${esc(q(result))}`,
      ),
      el(
        "span",
        "more",
        want === undefined
          ? `${tags} tag${tags === 1 ? "" : "s"} removed · ${result.length} character${result.length === 1 ? "" : "s"} kept`
          : `${tags} tag${tags === 1 ? "" : "s"} removed · matches freeCodeCamp's expected ${esc(q(want))}`,
      ),
    );
    wrap.append(line);

    // Every piece of user text goes through esc, so typed markup is shown, never rendered.
    wrap.append(
      el(
        "div",
        "ts-src",
        segs.length === 0
          ? `<span class="muted">(empty input)</span>`
          : segs.map((s) => `<span class="${s.tag ? "tag" : "keep"}">${esc(s.t)}</span>`).join(""),
      ),
      el(
        "div",
        "ts-key",
        `<span class="tag">■ tag, "&lt;" through "&gt;" (dropped)</span><span class="keep">■ text (kept)</span>`,
      ),
    );

    wrap.append(el("div", "note", noteFor(html, tags, result)));
    out.append(wrap);
  }
}

// What did THIS input exercise? Each branch names a different thing to get wrong.
function noteFor(html: string, tags: number, result: string) {
  if (html === "")
    return `Nothing to walk, so nothing comes back: the loop never starts and <code class='inl'>out</code> stays <code class='inl'>""</code>.`;
  if (tags === 0)
    return `No <code class='inl'>&lt;</code> anywhere, so the jump never fires and every character is appended: the input comes back unchanged. Stripping is a no-op on plain text, which is the case a "strip then trim" or "split on tags" attempt tends to mangle. This one is ours.`;
  if (result === "")
    return `All tag and no text: the whole input is one tag, the pointer jumps from <code class='inl'>&lt;</code> to the final <code class='inl'>&gt;</code>, and the answer is the empty string. <code class='inl'>&lt;img&gt;</code> has no closing partner, so an approach that pairs tags up or removes closers cannot handle it. The attributes <code class='inl'>src</code> and <code class='inl'>alt</code> vanish because the jump runs to the <code class='inl'>&gt;</code>, not to the end of the tag name.`;
  if (/<\/(\w+)><\1[\s>]/u.test(html) || /<\/(\w+)><\w/u.test(html))
    return `Elements that touch in the markup touch in the text: nothing is inserted where a tag was, so the two <code class='inl'>section</code> bodies come out as <b>${esc(result)}</b>, not "section section". Nesting (<code class='inl'>main</code> around both) costs nothing either, since a nested tag is just another tag following the last one.`;
  if (/<\w[^>]*>[^<]+<\w/u.test(html))
    return `Text sits on <b>both sides</b> of an inner tag. The walk keeps <code class='inl'>Hello </code>, jumps over <code class='inl'>&lt;b&gt;</code>, keeps <code class='inl'>World</code>, jumps over <code class='inl'>&lt;/b&gt;</code>, keeps the <code class='inl'>!</code>: the result <b>${esc(q(result))}</b> keeps the space that sat before the tag, because only the tag is removed. Nesting needs no stack.`;
  return `<b>${tags}</b> tags removed, <b>${esc(q(result))}</b> kept. The attribute <code class='inl'>href="#"</code> goes with its tag: the jump lands after the <code class='inl'>&gt;</code>, so whatever was inside the brackets is never looked at.`;
}

// ── STEP — a pointer, a jump, an output string ─────────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">stripTags</span>(<span class="tok" data-t="arg">html</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">let</span> <span class="tok" data-t="init">out = <span class="st">""</span>, i = 0</span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">while</span> (<span class="tok" data-t="loop">i &lt; html.length</span>) {`,
  },
  {
    ln: 4,
    html: `    <span class="k">if</span> (<span class="tok" data-t="test">html[i] === <span class="st">"&lt;"</span></span>) <span class="tok" data-t="jump">i = (html.<span class="fn">indexOf</span>(<span class="st">"&gt;"</span>, i) + 1) || html.length</span>;`,
  },
  {
    ln: 5,
    html: `    <span class="k">else</span> <span class="tok" data-t="keep">out += html[i++]</span>;`,
  },
  { ln: 6, html: `  }` },
  { ln: 7, html: `  <span class="k">return</span> <span class="tok" data-t="out">out</span>;` },
  { ln: 8, html: `}` },
];

function trace(idx: number) {
  const html = CASES[Math.max(1, Math.min(CASES.length, idx)) - 1]!.html;
  const steps: DbgStep[] = [];
  let out = "";
  let i = 0;
  const removed: string[] = [];

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
    if (line >= 2) {
      vars["out"] = q(out);
      vars["i"] = i;
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
          title: `stripTags(${q(html.length > 24 ? html.slice(0, 22) + "…" : html)})`,
          vars,
          changed: x.changed ?? [],
          structs: line >= 2 ? [{ label: "tags dropped", items: removed.slice() }] : [],
          ret: x.ret,
        },
      ],
    });
  };

  S(
    1,
    `A string of <b>${html.length}</b> character${html.length === 1 ? "" : "s"} with <b>${mark(html).filter((s) => s.tag).length}</b> tag${mark(html).filter((s) => s.tag).length === 1 ? "" : "s"} in it. The plan is one pointer and one output string: text is copied, a tag is skipped whole. No stack, no nesting counter, because a tag never contains another tag.`,
    { focus: "arg" },
  );
  S(
    2,
    `<code class='inl'>out</code> starts empty and <code class='inl'>i</code> at the first character. <code class='inl'>out</code> is the only thing that survives to the return; <code class='inl'>i</code> is how far the walk has got.`,
    { focus: "init", changed: ["out", "i"] },
  );

  while (i < html.length) {
    if (html[i] === "<") {
      const from = i;
      // oxlint-disable-next-line unicorn/explicit-length-check -- not a length check: `indexOf + 1 || length` maps a missing ">" (-1 → 0) to the end of the string
      i = html.indexOf(">", i) + 1 || html.length;
      const tag = html.slice(from, i);
      removed.push(tag);
      S(
        4,
        `<code class='inl'>html[${from}]</code> is <code class='inl'>&lt;</code>, so a tag starts. <code class='inl'>indexOf("&gt;")</code> finds its end and <code class='inl'>i</code> jumps to <b>${i}</b>, one past it: <code class='inl'>${esc(tag)}</code> is dropped in a single step, ${/\s/u.test(tag) ? "attributes and all, because nothing between the brackets is read" : "and nothing of it reaches <code class='inl'>out</code>"}. ${tag.startsWith("</") ? "A closing tag is no different from an opening one." : ""}`,
        { focus: "jump", changed: ["i"], eval: { expr: `html[${from}] === "<"`, val: true } },
      );
    } else {
      const ch = html[i]!;
      out += ch;
      i++;
      S(
        5,
        `<code class='inl'>${esc(q(ch))}</code> is not <code class='inl'>&lt;</code>, so it is text: append it to <code class='inl'>out</code> (now <b>${esc(q(out))}</b>) and step <code class='inl'>i</code> to ${i}.${ch === " " ? " Spaces count as text; only tags are removed." : ""}`,
        {
          focus: "keep",
          changed: ["out", "i"],
          eval: { expr: `html[${i - 1}] === "<"`, val: false },
        },
      );
    }
  }

  S(
    7,
    `<code class='inl'>i</code> is <b>${i}</b>, past the end, so the loop is over. ${out === "" ? "Every character was inside a tag, so nothing was ever appended: the answer is the empty string." : `What was kept, in order, is <b>${esc(q(out))}</b>.`}`,
    { focus: "out", done: true, result: q(out), ret: { value: q(out) } },
  );
  return steps;
}

export default {
  n: 66,
  id: "html-tag-stripper",
  title: "HTML Tag Stripper",
  dates: ["2025-10-15"],
  statement: `Given a string of HTML, remove the tags and return the plain text. The input is valid HTML, tags may be nested, and attributes go with the tag. <span class="rule">Example: <code class="inl">stripTags('&lt;a href="#"&gt;Click here&lt;/a&gt;')</code> → <code class="inl">"Click here"</code>. A void tag like <code class="inl">&lt;img src="cat.jpg" alt="Cat"&gt;</code> has no text at all and gives <code class="inl">""</code>.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(n) — one pass",
      approach: `A tag is everything from a <code class='inl'>&lt;</code> through the next <code class='inl'>&gt;</code>, so there is nothing to parse: walk the string with one pointer, and at a <code class='inl'>&lt;</code> jump straight past the next <code class='inl'>&gt;</code> instead of appending. Everything else is text. That handles the three things the statement hides. <b>Attributes</b> go with the tag, since the jump lands after the <code class='inl'>&gt;</code> and never reads what was inside. <b>Nesting</b> needs no stack, because a nested tag is only another tag following the last. And <b>adjacent elements</b> run together (<code class='inl'>sectionsection</code>), since nothing is inserted where a tag was. Red struck-through runs in the demo are dropped, green runs are kept. Type any markup, or click a case: the first four are freeCodeCamp's, the fifth (no tags at all) is ours. One honest limit: a <code class='inl'>&gt;</code> inside a quoted attribute value would end the tag early; the statement promises plain markup, so the first <code class='inl'>&gt;</code> is the end.`,
      code: `// Copy text, skip each tag whole: from "<" to just past the next ">".
function stripTags(html: string): string {
  let out = "";
  let i = 0;
  while (i < html.length) {
    if (html[i] === "<") i = (html.indexOf(">", i) + 1) || html.length;   // drop the tag, attributes and all
    else out += html[i++];                                                // text: keep it
  }
  return out;
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "pointer, jump, output",
      approach: `The loop one decision per step: a tag is one jump, a text character is one append. Start on <b>case 1</b>, <code class='inl'>&lt;a href="#"&gt;Click here&lt;/a&gt;</code>, where the whole opening tag, <code class='inl'>href</code> included, disappears in a single step. <b>Case 3</b> is a single jump and an empty answer. <b>Case 4</b> shows adjacent elements: six jumps and fourteen appends with nothing inserted between. <b>Case 5</b> is ours: no tags, so line 4 never jumps. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
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
            hint: `1–${CASES.length}: 1–${OFFICIAL} official, ${CASES.length} ours`,
          },
        }),
    },
  ],
} satisfies Challenge;
