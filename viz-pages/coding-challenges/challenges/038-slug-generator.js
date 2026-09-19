// #38 · Slug Generator — five stated rules, one real decision: what order to run them.
// The statement is a numbered list of transformations, which makes this a PIPELINE —
// nothing to search, nothing to test, just stages. All the engineering left is the
// order, and two orderings pay for themselves. Lowercase FIRST, so the strip pattern
// gets to be [^a-z0-9 ] rather than [^a-zA-Z0-9 ]; strip first and the version that
// forgets the A-Z deletes every capital instead of lowercasing it. Encode LAST, and
// that one matters more: "consecutive spaces become a single %20" and "no leading or
// trailing %20" are, despite the phrasing, rules about WHITESPACE. While whitespace
// is still there they are .split(/\s+/) and .trim(), one token each. Encode first and
// the same two rules have to be restated against %20 — a three-character token — and
// the strip stage will happily eat the % of the encoding it just produced.
// ONE approach, deliberately. A char-by-char pass or a single mega-regex is the same
// transform respelled, not a second mental model (Tier 3 §1), so rather than ship a
// fake second variant the demo lets you MOVE the encode stage earlier and watch the
// rules above it stop being able to see what they are about.
// Flip the order toggle to "encode before strip" on the 50% Off case: the strip
// deletes the % of its own %20 and every separator becomes the bare digits 20.
import { el, esc, mountDebugger } from "../shared.js";

// The 5 official freeCodeCamp cases, in the grader's order, then two of ours.
//   "50% Off  Today" — ours, and the case the order toggle is built for. A literal
//     % sitting next to a doubled space: under the correct order the % is deleted
//     long before any %20 exists, and moving the encode above the strip makes the
//     strip eat its own encoding.
//   "Café Münch" — ours. "Letters" in the statement means ASCII letters, because
//     that is what [^a-z0-9 ] can express: é and ü are removed outright rather than
//     folded to e and u, so the answer is "caf%20mnch". Surprising, and a direct
//     consequence of the rule as written rather than a bug.
const OFFICIAL = [
  "helloWorld", "hello world!", " hello-world ", "hello  world",
  "  ?H^3-1*1]0! W[0%R#1]D  ",
];
const CASES = [...OFFICIAL, "50% Off  Today", "Café Münch"];

// The grader's own answers, so the demo can show a verdict instead of asking you
// to take its word for it. Only the official five have one.
const EXPECTED = {
  "helloWorld": "helloworld",
  "hello world!": "hello%20world",
  " hello-world ": "helloworld",
  "hello  world": "hello%20world",
  "  ?H^3-1*1]0! W[0%R#1]D  ": "h3110%20w0r1d",
};

// Non-global on purpose: it is used with .test() per character, so a lastIndex
// would be a bug waiting for the second call.
const STRIP = /[^a-z0-9 ]/;

// One stage per method in the chain. `why` is the thing that stage would no longer
// be able to express if it ran after the encode — which is the whole lesson.
const STAGES = {
  lower: {
    call: ".toLowerCase()",
    apply: (s) => s.toLowerCase(),
    why: `Running this <b>first</b> is what lets the next stage's pattern be <code class='inl'>[^a-z0-9 ]</code>. Strip first and the pattern has to carry <code class='inl'>A-Z</code> as well — and the version that forgets does not fail loudly, it silently <i>deletes</i> every capital, so <code class='inl'>"helloWorld"</code> comes back as <code class='inl'>"helloorld"</code>. One rule made another rule shorter, which is the cheapest kind of ordering win there is.`,
  },
  strip: {
    call: `.replace(/[^a-z0-9 ]/g, "")`,
    apply: (s) => s.replace(/[^a-z0-9 ]/g, ""),
    why: `The destructive stage, and the one people mis-remember. The statement says these characters are <b>removed</b> — not replaced with a separator — so a hyphen does not become a gap, it closes one: <code class='inl'>"hello-world"</code> fuses into a single word and never earns a <code class='inl'>%20</code>. It also deletes any <code class='inl'>%</code> in the input, which is only safe because at this point in the chain there is no <code class='inl'>%20</code> of ours for it to eat.`,
  },
  trim: {
    call: ".trim()",
    apply: (s) => s.trim(),
    why: `"No leading or trailing <code class='inl'>%20</code>" is a rule about the two ends of the string, and here the ends still hold <b>whitespace</b>, so the rule is one <code class='inl'>.trim()</code>. After the encode the ends are a <code class='inl'>%</code>, which <code class='inl'>.trim()</code> has nothing to say about, and the same rule becomes <code class='inl'>.replace(/^(%20)+|(%20)+$/g, "")</code> — anchored twice, three characters per separator.`,
  },
  collapse: {
    call: `.split(/\\s+/).join(" ")`,
    apply: (s) => s.split(/\s+/).join(" "),
    why: `<code class='inl'>/\\s+/</code> matches a whole <b>run</b>, so "consecutive spaces are replaced with a single <code class='inl'>%20</code>" is never a rule you write — the <code class='inl'>+</code> already enforced it. Nothing counts spaces and nothing collapses anything. Encode first and you are back to writing it by hand, against <code class='inl'>/(%20)+/</code>.`,
  },
  encode: {
    call: `.replaceAll(" ", "%20")`,
    apply: (s) => s.replaceAll(" ", "%20"),
    why: `The only stage that changes the <b>representation</b> rather than the content, which is exactly why it goes last. Everything above is free to talk about characters and whitespace precisely because none of it has to know that a separator will eventually be three characters long. Move this stage up and every rule it passes has to be rewritten against the encoded form — and rules rewritten against an encoded form are where the bugs are.`,
  },
};

// Three orders. The other four stages keep their relative positions; only the
// encode moves, which is what makes this a reordering rather than a rewrite.
const ORDERS = [
  { label: "encode last", seq: ["lower", "strip", "trim", "collapse", "encode"] },
  { label: "encode before collapse", seq: ["lower", "strip", "encode", "trim", "collapse"] },
  { label: "encode before strip", seq: ["lower", "encode", "strip", "trim", "collapse"] },
];

// The value after each stage, in the given order. vals[4] is what the chain returns.
const run = (s, seq) => {
  const vals = []; let v = s;
  for (const k of seq) { v = STAGES[k].apply(v); vals.push(v); }
  return vals;
};

const solve = (str) => str.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().split(/\s+/).join("%20");

// ── Rendering one string, character by character, with the stage's edits marked ──
// A space is drawn as "·" everywhere in this module: the whole problem is about
// whitespace, and whitespace you cannot see is whitespace you cannot reason about.
const CH = (txt, cls) => `<span class="sg-ch${cls ? " sg-" + cls : ""}">${txt}</span>`;
const glyph = (c) => (/\s/.test(c) ? "·" : esc(c));
const ws = (c) => (/\s/.test(c) ? "sp" : "");

// Each stage renders the string it was HANDED, marking what it is about to do to
// it — so a deletion is visible at the stage that performs it, not one row later.
const SHOW = {
  lower: (b) => [...b].map((c) => { const lo = c.toLowerCase(); return CH(glyph(lo), lo !== c ? "hit" : ws(c)); }).join(""),
  strip: (b) => [...b].map((c) => CH(glyph(c), STRIP.test(c) ? "cut" : ws(c))).join(""),
  trim: (b) => {
    const cps = [...b];
    let lead = 0; while (lead < cps.length && /\s/.test(cps[lead])) lead++;
    let end = cps.length; while (end > lead && /\s/.test(cps[end - 1])) end--;
    return cps.map((c, i) => CH(glyph(c), i < lead || i >= end ? "cut" : ws(c))).join("");
  },
  collapse: (b) => {
    let prevWs = false;
    return [...b].map((c) => {
      const isWs = /\s/.test(c), cut = isWs && prevWs;
      prevWs = isWs;
      return CH(glyph(c), cut ? "cut" : ws(c));
    }).join("");
  },
  encode: (b) => [...b].map((c) => (c === " " ? CH("%20", "enc") : CH(glyph(c), ws(c)))).join(""),
};

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .sg-wrap { display:flex; flex-direction:column; gap:11px; }
    .sg-chip { white-space:pre; }
    .sg-stack { display:flex; flex-direction:column; gap:5px; }
    .sg-stage { display:grid; grid-template-columns:18px 178px minmax(0,1fr) auto; align-items:center; gap:10px; padding:6px 10px; border:1px solid var(--border); border-radius:9px; background:var(--panel-2); cursor:pointer; text-align:left; color:var(--text); font:inherit; }
    .sg-stage:hover { border-color:var(--accent); }
    .sg-stage.on { border-color:var(--accent); background:color-mix(in srgb, var(--accent) 11%, transparent); }
    .sg-stage.moved { border-color:var(--danger); background:color-mix(in srgb, var(--danger) 10%, transparent); }
    .sg-n { font:700 10px var(--mono); color:var(--muted); text-align:right; }
    .sg-call { font:12px var(--mono); color:var(--accent); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .sg-str { font:700 13px var(--mono); display:flex; flex-wrap:wrap; min-height:18px; }
    .sg-len { font:11px var(--mono); color:var(--muted); white-space:nowrap; }
    .sg-ch { display:inline-block; min-width:.6em; text-align:center; }
    .sg-sp { color:var(--muted); opacity:.65; }
    .sg-cut { color:var(--danger); text-decoration:line-through; opacity:.8; }
    .sg-hit { color:var(--accent); }
    .sg-enc { color:var(--warn); }
    .sg-cmp { font:12px var(--sans); color:var(--muted); padding:5px 10px; border:1px dashed var(--border); border-radius:8px; }
    .sg-cmp b { font-family:var(--mono); color:var(--text); }
    .sg-cmp.split { color:var(--danger); border-color:var(--danger); border-style:solid; background:color-mix(in srgb, var(--danger) 10%, transparent); }
    .sg-cmp.split b { color:var(--danger); }
    @media (max-width:640px) {
      .sg-stage { grid-template-columns:18px minmax(0,1fr); }
      .sg-str { grid-column:1 / -1; }
      .sg-len { display:none; }
    }
  `));
}

function mount(host) {
  ensureStyle();
  let order = 0, sel = -1;

  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = "  ?H^3-1*1]0! W[0%R#1]D  "; inp.style.width = "300px";
  ctl.append(el("span", "ctl-label", "str ="), inp);

  // Chips come off CASES, so a case added there can never go unreachable here.
  // white-space:pre keeps the leading and trailing spaces visible on the chip —
  // on this problem they are the input, not decoration.
  const pre = el("div", "controls");
  CASES.forEach((v) => {
    const c = el("button", "chip sg-chip", `"${esc(v)}"`);
    c.onclick = () => { inp.value = v; sel = -1; render(); };
    pre.append(c);
  });

  const ord = el("div", "controls");
  ord.append(el("span", "ctl-label", "stage order"));
  const ordChips = ORDERS.map((o, i) => {
    const c = el("button", "chip" + (i ? " bad" : " good") + (i === order ? " on" : ""), o.label);
    c.onclick = () => { order = i; sel = -1; render(); };
    ord.append(c);
    return c;
  });

  const out = el("div");
  host.append(ctl, pre, ord, out);
  inp.oninput = () => { sel = -1; render(); };
  render();

  function render() {
    ordChips.forEach((c, i) => c.classList.toggle("on", i === order));
    const raw = String(inp.value);
    const seq = ORDERS[order].seq;
    const vals = run(raw, seq);
    const result = vals[4];
    const want = EXPECTED[raw];
    const correct = solve(raw);

    out.innerHTML = "";
    const wrap = el("div", "sg-wrap");

    const line = el("div", "result-line");
    line.append(el("span", `badge ${want === undefined ? (result === correct ? "ok" : "no") : (result === want ? "ok" : "no")}`,
      `generateSlug("${esc(raw)}") → "${esc(result)}"`));
    if (want !== undefined)
      line.append(el("span", "sg-cmp" + (result === want ? "" : " split"),
        result === want
          ? `matches freeCodeCamp's expected <b>"${esc(want)}"</b>`
          : `freeCodeCamp expects <b>"${esc(want)}"</b> — this order fails the grader`));
    else if (result !== correct)
      line.append(el("span", "sg-cmp split", `the correct order returns <b>"${esc(correct)}"</b>`));
    wrap.append(line);

    // Five stages stacked in the order that is actually running. Each row shows the
    // string as that stage received it, with the characters it is about to remove
    // struck through — so the deletion is visible where it happens.
    const stack = el("div", "sg-stack");
    seq.forEach((k, i) => {
      const before = i ? vals[i - 1] : raw;
      const moved = k === "encode" && order > 0;
      const row = el("button", "sg-stage" + (i === sel ? " on" : "") + (moved ? " moved" : ""),
        `<span class="sg-n">${i + 1}</span>` +
        `<span class="sg-call">${esc(STAGES[k].call)}</span>` +
        `<span class="sg-str">${SHOW[k](before)}</span>` +
        `<span class="sg-len">${[...vals[i]].length} ch</span>`);
      row.onclick = () => { sel = sel === i ? -1 : i; render(); };
      stack.append(row);
    });
    wrap.append(stack);

    wrap.append(el("div", "muted",
      `<code class='inl'>·</code> is a space. Each row shows the string <i>entering</i> that stage; struck-through characters are the ones it removes. Click a row to read what that rule could no longer have expressed if it ran later.`));

    wrap.append(el("div", "note", sel >= 0 ? stageNote(seq, vals, sel) : noteFor(raw, order, result, correct)));
    out.append(wrap);
  }
}

const stageNote = (seq, vals, i) =>
  `<b>Stage ${i + 1} · <code class='inl'>${esc(STAGES[seq[i]].call)}</code></b> — ${STAGES[seq[i]].why} Stop the pipeline here and the function returns <b>"${esc(vals[i])}"</b>.`;

// What did THIS input exercise? Every branch names a different rule, because every
// preset was chosen to land on a different one.
function noteFor(raw, order, result, correct) {
  const lowered = raw.toLowerCase();
  const stripped = lowered.replace(/[^a-z0-9 ]/g, "");
  const removed = [...lowered].filter((c) => STRIP.test(c));
  const fused = /[a-z0-9][^a-z0-9 ]+[a-z0-9]/.test(lowered);
  const dbl = /\s\s/.test(stripped);
  const edge = stripped !== stripped.trim();
  const accented = removed.filter((c) => /\p{L}/u.test(c));

  if (order === 1) {
    const broke = dbl || edge;
    return `The encode now runs <b>before</b> <code class='inl'>.trim()</code> and the split, and the interesting part is that it does not make those two rules <i>wrong</i> — it makes them <b>inapplicable</b>. Both are written against whitespace, and after the encode there is no whitespace left in the string, so both quietly do nothing at all. ${broke
      ? `Here that shows up as <b>"${esc(result)}"</b> against the correct <b>"${esc(correct)}"</b>${dbl ? `, with the doubled space surviving as <code class='inl'>%20%20</code>` : ``}${edge ? `${dbl ? ` and` : `,`} with a <code class='inl'>%20</code> still welded to the ends` : ``}. To get the two rules back you would rewrite <code class='inl'>.trim()</code> as <code class='inl'>.replace(/^(%20)+|(%20)+$/g, "")</code> and <code class='inl'>/\\s+/</code> as <code class='inl'>/(%20)+/</code> — the same two rules, restated against a three-character token, which is exactly the kind of rewrite that ships bugs.`
      : `This particular input has neither a doubled space nor a space at either end, so nothing visibly breaks and the answer is still <b>"${esc(result)}"</b> — which is the dangerous half of the story, because the two dead rules leave no trace. Click <code class='inl'>"hello  world"</code> or <code class='inl'>"50% Off  Today"</code> to see it fail.`}`;
  }
  if (order === 2) {
    const pct = raw.includes("%"), had = / /.test(lowered);
    return `Now the strip runs <b>after</b> the encode, and the strip has no idea which characters are yours. A <code class='inl'>%</code> is not a letter, a number or a space, so it matches <code class='inl'>[^a-z0-9 ]</code> and is deleted — including the <code class='inl'>%</code> of every <code class='inl'>%20</code> the previous stage just wrote, leaving the bare digits <code class='inl'>20</code> welded into the words. ${had
      ? `Here that turns <b>"${esc(correct)}"</b> into <b>"${esc(result)}"</b>.`
      : `This input has no spaces, so the encode had nothing to write and there is nothing for the strip to eat — the damage needs a space to exist. Click <code class='inl'>"50% Off  Today"</code>.`} ${pct
      ? `And note the input's <i>own</i> <code class='inl'>%</code> is deleted either way. That is the point: once the encoding shares an alphabet with the data, no later stage can tell them apart.`
      : `This is the failure mode that makes "representation changes go last" a rule rather than a preference: a stage that runs after an encoding sees the encoding as data.`}`;
  }
  if (fused)
    return `This is the case where prior knowledge actively hurts. Every slug library you have used turns punctuation into a separator — that is what a slug <i>is</i>, everywhere except in this statement, which says such characters are <b>removed</b>. So the hyphen in <code class='inl'>"${esc(raw.trim())}"</code> does not become a gap, it closes one: the two words fuse into <b>"${esc(result)}"</b>, with no <code class='inl'>%20</code> anywhere. Anyone answering from memory writes <code class='inl'>"hello%20world"</code> or <code class='inl'>"hello-world"</code> and fails a test they were sure of. The fastest way to catch this is the cheapest: run the statement's own examples in your head before writing any code.`;
  if (raw.includes("%"))
    return `There is a literal <code class='inl'>%</code> in the input, and stage 2 deletes it like any other punctuation — <code class='inl'>%</code> is not a letter, a number or a space. That is <i>safe</i> only because of where stage 2 sits: at this moment no <code class='inl'>%20</code> exists yet, so the only <code class='inl'>%</code> in the string is the user's. ${dbl ? `The doubled space then collapses for free on stage 4, because <code class='inl'>/\\s+/</code> matches the whole run. ` : ``}Switch the order to <b>encode before strip</b> and watch the same stage eat the encoding instead. Ordering here is not tidiness — it is what keeps two stages from fighting over the same character.`;
  if (accented.length)
    return `<b>"${esc(raw)}"</b> → <b>"${esc(result)}"</b>, and the ${accented.length === 1 ? `accented letter` : `accented letters`} ${accented.map((c) => `<code class='inl'>${esc(c)}</code>`).join(" and ")} ${accented.length === 1 ? `is` : `are`} gone entirely rather than folded to ${accented.length === 1 ? `its` : `their`} ASCII base. The statement says "letters", and <code class='inl'>[^a-z0-9 ]</code> is what "letters" can mean once you have committed to a character class — <code class='inl'>é</code> is not in <code class='inl'>a-z</code>, so it is removed. A real slug library would normalise to NFD and drop the combining marks first; this one is not asked to, and adding it would fail nothing and help nothing. Worth knowing which one you have shipped.`;
  if (dbl)
    return `The doubled space is the rule that costs nothing to satisfy. <code class='inl'>.split(/\\s+/)</code> matches a whole <b>run</b> of whitespace as one separator, so "consecutive spaces should be replaced with a single <code class='inl'>%20</code>" is not a line of code — it is a consequence of the <code class='inl'>+</code>. Nothing counts spaces and nothing collapses anything. Now flip the order to <b>encode before collapse</b>: the run becomes <code class='inl'>%20%20</code> before anything gets to look at it, and the free rule turns into a regex over a three-character token.`;
  if (edge)
    return `The leading and trailing whitespace is dropped by <code class='inl'>.trim()</code> on stage 3, while the ends of the string are still <i>spaces</i>. That is the only reason the rule is one word long. Encode first and the ends are a <code class='inl'>%</code>, which <code class='inl'>.trim()</code> cannot see, and "no leading or trailing <code class='inl'>%20</code>" becomes <code class='inl'>.replace(/^(%20)+|(%20)+$/g, "")</code>. ${result.includes("%20") ? `` : `Note there is no <code class='inl'>%20</code> in the answer at all — trimming removed the only spaces this string had. `}Every rule is easiest to state in the domain it was written in.`;
  return `${removed.length ? `Stage 2 removed ${removed.length} character${removed.length === 1 ? "" : "s"}; ` : `Nothing was removed here; `}no doubled space, nothing at the ends, ${result.includes("%20") ? `one space survives to become a <code class='inl'>%20</code>` : `and no space at all, so the answer carries no <code class='inl'>%20</code>`}. The quiet stage on this input is <code class='inl'>.toLowerCase()</code>: it runs first so that stage 2's pattern can be <code class='inl'>[^a-z0-9 ]</code> and not <code class='inl'>[^a-zA-Z0-9 ]</code>. Swap those two and the shorter pattern deletes every capital instead of lowercasing it — <code class='inl'>"helloWorld"</code> would come back as <code class='inl'>"helloorld"</code>, which still looks like a slug.`;
}

// ── STEP — the chain unrolled, one method per line ──────────────────────────
const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">generateSlug</span>(<span class="tok" data-t="arg">str</span>) {` },
  { ln: 2, html: `  <span class="k">return</span> str` },
  { ln: 3, html: `    <span class="tok" data-t="lower">.<span class="fn">toLowerCase</span>()</span>` },
  { ln: 4, html: `    <span class="tok" data-t="strip">.<span class="fn">replace</span>(/[^a-z0-9 ]/g, <span class="st">""</span>)</span>` },
  { ln: 5, html: `    <span class="tok" data-t="trim">.<span class="fn">trim</span>()</span>` },
  { ln: 6, html: `    <span class="tok" data-t="split">.<span class="fn">split</span>(/\\s+/)</span>` },
  { ln: 7, html: `    <span class="tok" data-t="join">.<span class="fn">join</span>(<span class="st">"%20"</span>)</span>;` },
  { ln: 8, html: `}` },
];

const q = (s) => JSON.stringify(s);
const boxes = (s) => [...s].map((c) => (/\s/.test(c) ? "·" : c));

function trace(rawInput) {
  const str = String(rawInput);
  const steps = [];
  let now = str, parts = null;

  const S = (line, note, x = {}) => {
    const vars = { str: q(str) };
    // `value` is the single thing threaded through the chain — it exists from the
    // moment line 2 hands `str` in, and never stops existing, so its struct stays
    // put for the rest of the call and only its CONTENTS change.
    if (line >= 2) vars.value = parts ? `[${parts.map(q).join(", ")}]` : q(now);
    const structs = line >= 2
      ? [{ label: "value", items: parts ? parts.map(q) : boxes(now) }]
      : [];
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: `generateSlug(${q(str)})`, vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  S(1, `Five rules, and every one of them is a <b>transformation</b> rather than a test — nothing to search, nothing to decide per character. That makes this a pipeline, and the only real engineering left is what order to run it in. Watch which <i>domain</i> each rule gets to be written in.`, { focus: "arg" });

  S(2, `<code class='inl'>str</code> enters the chain untouched. The whole function is one expression, so there are no named intermediates — the <b>value</b> panel below is the single thing being threaded from line to line. A <code class='inl'>·</code> is a space.`);

  const before3 = now;
  now = now.toLowerCase();
  const capitals = [...before3].filter((c) => c !== c.toLowerCase()).length;
  S(3, `${capitals ? `<b>${capitals}</b> capital${capitals === 1 ? "" : "s"} folded down. ` : `No capitals in this input, so nothing changed here. `}The reason lowercasing goes <b>first</b> is the next line: it lets the pattern be <code class='inl'>[^a-z0-9 ]</code> instead of <code class='inl'>[^a-zA-Z0-9 ]</code>. Get that order wrong and the shorter pattern does not complain — it <i>deletes</i> every capital, so <code class='inl'>"helloWorld"</code> returns <code class='inl'>"helloorld"</code>, which still looks enough like a slug to ship.`,
    { focus: "lower", changed: capitals ? ["value"] : [] });

  const before4 = now;
  now = now.replace(/[^a-z0-9 ]/g, "");
  const gone = [...before4].filter((c) => STRIP.test(c));
  const fused = /[a-z0-9][^a-z0-9 ]+[a-z0-9]/.test(before4);
  S(4, `${gone.length ? `Removed <b>${gone.length}</b> character${gone.length === 1 ? "" : "s"}: ${[...new Set(gone)].map((c) => `<code class='inl'>${esc(c)}</code>`).join(" ")}. ` : `Nothing to remove here. `}<b>Removed</b> is the word to hold on to — not "replaced with a separator", which is what every slug library you have used does. ${fused ? `That is why the two words on either side of the punctuation <b>fuse</b> here: the gap is closed, not widened, so this string will never earn a <code class='inl'>%20</code>.` : `A character between two words would close the gap rather than widen it.`}${before4.includes("%") ? ` Note the literal <code class='inl'>%</code> going out with the rest — harmless only because line 7 has not run yet. Run the join first and this line eats its own encoding.` : ``}`,
    { focus: "strip", changed: gone.length ? ["value"] : [] });

  const before5 = now;
  now = now.trim();
  const trimmed = before5.length - now.length;
  S(5, `${trimmed ? `<b>${trimmed}</b> space${trimmed === 1 ? "" : "s"} dropped from the ends. ` : `Nothing at either end to trim. `}"No leading or trailing <code class='inl'>%20</code>" is one <code class='inl'>.trim()</code> for exactly one reason: at this point in the chain the ends are still <b>whitespace</b>. After the join they are a <code class='inl'>%</code>, and the identical rule has to be spelled <code class='inl'>.replace(/^(%20)+|(%20)+$/g, "")</code>.`,
    { focus: "trim", changed: trimmed ? ["value"] : [], eval: { expr: `/^\\s|\\s$/.test(value)`, val: trimmed > 0 } });

  const before6 = now;
  parts = now.split(/\s+/);
  const runs = /\s\s/.test(before6);
  S(6, `<b>${parts.length}</b> piece${parts.length === 1 ? "" : "s"}. <code class='inl'>/\\s+/</code> matches a whole <b>run</b> of whitespace as a single separator, so "consecutive spaces should be replaced with a single <code class='inl'>%20</code>" is not code you write — it is a consequence of the <code class='inl'>+</code>. ${runs ? `The doubled space here collapsed without anything counting it.` : `Nothing to collapse on this input, but the rule is already satisfied.`} And notice what line 5 bought: with the ends already trimmed, <code class='inl'>split</code> cannot emit a zero-length piece at position 0, so there is no <code class='inl'>.filter(Boolean)</code> tidying up after it. Either guard alone would do; <code class='inl'>.trim()</code> is the one that states the spec's own rule rather than deleting the artefact afterwards.`,
    { focus: "split", changed: ["value"], eval: { expr: `/\\s\\s/.test(value)`, val: runs } });

  const result = parts.join("%20");
  parts = null; now = result;
  S(7, `<b>Return ${q(result)}.</b> This is the first and only stage that changes the <b>representation</b> rather than the content, and it goes last on purpose: every rule above it was free to talk about characters and whitespace precisely because none of them had to know that a separator would eventually be three characters long. That is the transferable part — do the destructive normalisation first, and put the encoding, the escaping and the formatting at the very end.`,
    { focus: "join", changed: ["value"], done: true, result: q(result), ret: { value: q(result) } });

  return steps;
}

export default {
  n: 38, id: "slug", title: "Slug Generator", dates: ["2025-09-17"],
  statement: `Given a string, return a <b>URL-friendly</b> version of it: all letters <b>lowercase</b>; every character that is not a letter, a number or a space <b>removed</b>; every space replaced with the URL-encoded <code class="inl">%20</code>; <b>consecutive</b> spaces replaced with a single <code class="inl">%20</code>; and <b>no leading or trailing</b> <code class="inl">%20</code>. <span class="rule">Example: <code class="inl">generateSlug("hello world!")</code> → <code class="inl">"hello%20world"</code>, but <code class="inl">generateSlug(" hello-world ")</code> → <code class="inl">"helloworld"</code> — the hyphen is <i>removed</i>, not turned into a separator, so the two words fuse.</span>`,
  variants: [
    {
      name: "Solution", cost: "O(n) — five passes",
      approach: `Five bullets, five transformations, no test and no search anywhere — so this is a <b>pipeline</b>, and the only real decision left is the order. Two orderings earn their keep. <b>Lowercase first</b>, so the strip pattern gets to be <code class='inl'>[^a-z0-9 ]</code>; strip first and it has to carry <code class='inl'>A-Z</code> too, and the version that forgets does not fail loudly — it deletes every capital instead of lowercasing it. <b>Encode last</b>, and that is the one that matters. "Consecutive spaces become a single <code class='inl'>%20</code>" and "no leading or trailing <code class='inl'>%20</code>" are, despite how they are phrased, rules about <i>whitespace</i>: while whitespace is still there they are <code class='inl'>.split(/\\s+/)</code> and <code class='inl'>.trim()</code>, one token each. Replace the spaces first and the same two rules have to be restated against <code class='inl'>%20</code>, a three-character token — <code class='inl'>/(%20)+/</code> and <code class='inl'>/^(%20)+|(%20)+$/</code> — and a rule rewritten against an encoded form is where the bugs live. It also stops two stages fighting over one character: the official <code class='inl'>"  ?H^3-1*1]0! W[0%R#1]D  "</code> contains a literal <code class='inl'>%</code>, and the strip is only safe to delete it because no <code class='inl'>%20</code> of ours exists yet. One more trap has nothing to do with order — the word <b>slug</b>. Every slug library turns punctuation into a hyphen; this statement says it is <b>removed</b>, so <code class='inl'>" hello-world "</code> is <code class='inl'>"helloworld"</code>, one word, no separator. Read the bullets, not your memory of what a slug is. Then move the encode stage with the order toggle and watch the rules above it stop being able to see what they are about.`,
      code: `// Five stated rules, run in the order that keeps each one simplest to state:
// destructive normalisation first, the representation change last.
function generateSlug(str: string): string {
  return str
    .toLowerCase()               // first, so the pattern below can be [^a-z0-9 ]
    .replace(/[^a-z0-9 ]/g, "")  // REMOVED, not turned into separators: "a-b" -> "ab"
    .trim()                      // "no leading/trailing %20" while the ends are spaces
    .split(/\\s+/)                // a run of whitespace is ONE separator: the + is the rule
    .join("%20");                // the only representation change, and it runs last
}`,
      mount,
    },
    {
      name: "Step through", cost: "stage by stage",
      approach: `The chain unrolled, one method per line, with the single value threaded through it shown as boxes (<code class='inl'>·</code> is a space). Start on <b>" hello-world "</b> — the hyphen is deleted on line 4 and the two words <i>fuse</i>, so the answer carries no <code class='inl'>%20</code> at all. Then <b>"hello&nbsp;&nbsp;world"</b>, where line 6's <code class='inl'>/\\s+/</code> swallows a two-space run without anything counting anything, and the kitchen-sink case, where the input's literal <code class='inl'>%</code> is deleted on line 4 — long before line 7 writes one of its own. Each note names what that line's rule <i>could no longer have expressed</i> if it ran after the join. One wart: HTML collapses the leading and trailing spaces in the preset chips, so <code class='inl'>" hello-world "</code> and <code class='inl'>"hello  world"</code> read short there; the input box holds the real string. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { type: "text", label: "str =", value: " hello-world ", presets: CASES, hint: "any string" } }),
    },
  ],
};
