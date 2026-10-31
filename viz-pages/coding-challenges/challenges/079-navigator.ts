// #79 · Navigator — a history list plus a cursor: Back and Forward move it, Visit cuts.
// The browser's history is an array of pages plus an index `i` for the page you are on:
//   Back     -> i moves left one, but never below 0 (nothing earlier than Home)
//   Forward  -> i moves right one, but never past the last page (nothing to go forward to)
//   Visit X  -> throw away everything right of `i`, push X, and step onto it
// Things the official set pins down:
//   - the page name is everything after "Visit ": "Visit About Us" is the page "About Us", so slice off
//     the six characters "Visit " rather than splitting on spaces.
//   - Visit really does discard the forward history: official case 6 goes Back from Gallery, visits
//     Contact, and Forward must stay on Contact because Gallery is gone.
//   - a page may itself be named "Visit Us": official case 7 sends "Visit Visit Us". Only the first
//     word is the command, which is another reason to slice rather than split.
// ONE approach, deliberately. Two stacks (back and forward) is the same history with the cursor
// replaced by a split point: same work per command, same answer, nothing on screen to compare
// (CONTRIBUTING Tier 3 §1-§3). Cases 1-7 are freeCodeCamp's; 8 is ours.
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// Cases 1-7 are freeCodeCamp's seven assertions in the grader's order. 8 is ours.
//   8 - three visits, two Backs, then a Forward: the cursor lands mid-history on "B", which no official
//     case does (they end on Home, the newest page, or one step back from the newest).
const CASES: { cmds: string[]; exp?: string }[] = [
  { cmds: ["Visit About Us", "Back", "Forward"], exp: "About Us" },
  { cmds: ["Forward"], exp: "Home" },
  { cmds: ["Back"], exp: "Home" },
  { cmds: ["Visit About Us", "Visit Gallery"], exp: "Gallery" },
  { cmds: ["Visit About Us", "Visit Gallery", "Back", "Back"], exp: "Home" },
  { cmds: ["Visit About", "Visit Gallery", "Back", "Visit Contact", "Forward"], exp: "Contact" },
  {
    cmds: ["Visit About Us", "Visit Visit Us", "Forward", "Visit Contact Us", "Back"],
    exp: "Visit Us",
  },
  { cmds: ["Visit A", "Visit B", "Visit C", "Back", "Back", "Forward"] },
];
const OFFICIAL = 7; // CASES[0..6] are freeCodeCamp's; the rest are ours.

const navigate = (commands: string[]) => {
  const history = ["Home"];
  let i = 0;
  for (const cmd of commands) {
    if (cmd === "Back") i = Math.max(0, i - 1);
    else if (cmd === "Forward") i = Math.min(history.length - 1, i + 1);
    else {
      history.length = i + 1;
      history.push(cmd.slice(6));
      i++;
    }
  }
  return history[i]!;
};

// Comma-separated text in, command list out. Page names here never hold a comma.
const parse = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x !== "");
const q = (s: string) => JSON.stringify(s);
const qa = (a: string[]) => JSON.stringify(a);

// Replay the commands, keeping each state for display.
interface Snap {
  cmd: string;
  history: string[];
  i: number;
  kind: "back" | "forward" | "visit";
  moved: boolean;
  dropped: string[];
}
function replay(cmds: string[]): Snap[] {
  const history = ["Home"];
  let i = 0;
  return cmds.map((cmd) => {
    let kind: Snap["kind"] = "visit";
    let moved = true;
    let dropped: string[] = [];
    if (cmd === "Back") {
      kind = "back";
      moved = i > 0;
      i = Math.max(0, i - 1);
    } else if (cmd === "Forward") {
      kind = "forward";
      moved = i < history.length - 1;
      i = Math.min(history.length - 1, i + 1);
    } else {
      dropped = history.slice(i + 1);
      history.length = i + 1;
      history.push(cmd.slice(6));
      i++;
    }
    return { cmd, history: history.slice(), i, kind, moved, dropped };
  });
}

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .nv-wrap { display:flex; flex-direction:column; gap:12px; }
    .nv-row { display:flex; flex-wrap:wrap; gap:5px; align-items:center; }
    .nv-p { font:13px var(--mono); padding:5px 10px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); }
    .nv-p.cur { border-color:var(--accent); color:var(--accent); font-weight:700; background:color-mix(in srgb, var(--accent) 14%, transparent); }
    .nv-p.gone { border-color:var(--danger); color:var(--danger); text-decoration:line-through; opacity:.7; }
    .nv-cmd { font:12px var(--mono); color:var(--muted); }
    .nv-cmd b { color:var(--text); }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();

  const ctl = el("div", "controls");
  const inp = el("input");
  inp.type = "text";
  inp.value = CASES[0]!.cmds.join(", ");
  inp.style.width = "460px";
  ctl.append(el("span", "ctl-label", "commands ="), inp);

  const pre = el("div", "controls");
  CASES.forEach((c, i) => {
    const b = el("button", "chip", `${i + 1}`);
    b.title = i < OFFICIAL ? `official freeCodeCamp case: ${c.exp}` : "ours";
    b.addEventListener("click", () => {
      inp.value = c.cmds.join(", ");
      render();
    });
    pre.append(b);
  });
  const hint = el("div", "controls");
  hint.append(el("span", "ctl-label", "comma-separated: Visit <page>, Back, Forward"));

  const out = el("div");
  host.append(ctl, pre, hint, out);
  inp.addEventListener("input", () => render());
  render();

  function render() {
    const cmds = parse(inp.value);
    const result = navigate(cmds);
    const idx = CASES.findIndex((c) => JSON.stringify(c.cmds) === JSON.stringify(cmds));
    const want = idx >= 0 && idx < OFFICIAL ? CASES[idx]!.exp : undefined;
    const ok = want === undefined || want === result;
    const snaps = replay(cmds);
    const last = snaps.at(-1);

    out.innerHTML = "";
    const wrap = el("div", "nv-wrap");

    const line = el("div", "result-line");
    line.append(
      el("span", `badge ${ok ? "ok" : "no"}`, `navigate(${esc(qa(cmds))}) → ${esc(q(result))}`),
    );
    if (want !== undefined)
      line.append(el("span", "more", `matches freeCodeCamp's expected ${esc(q(want))}`));
    wrap.append(line);

    // Final history: the cursor page lit, plus (struck out) what the last Visit threw away.
    const row = el("div", "nv-row");
    const hist = last ? last.history : ["Home"];
    const cur = last ? last.i : 0;
    hist.forEach((p, k) => row.append(el("span", `nv-p${k === cur ? " cur" : ""}`, esc(p))));
    if (last && last.dropped.length > 0)
      last.dropped.forEach((p) => row.append(el("span", "nv-p gone", esc(p))));
    wrap.append(row);

    // One line per command: what it did to the cursor.
    snaps.forEach((s, k) => {
      const where = s.history[s.i]!;
      const what =
        s.kind === "visit"
          ? `go to <b>${esc(where)}</b>${s.dropped.length > 0 ? `, dropping ${esc(qa(s.dropped))}` : ""}`
          : s.moved
            ? `now on <b>${esc(where)}</b>`
            : `nowhere to go, stays on <b>${esc(where)}</b>`;
      wrap.append(el("div", "nv-cmd", `${k + 1}. <b>${esc(s.cmd)}</b> → ${what}`));
    });

    wrap.append(el("div", "note", noteFor(cmds, snaps)));
    out.append(wrap);
  }
}

// What did THIS input exercise?
function noteFor(cmds: string[], snaps: Snap[]) {
  if (cmds.length === 0)
    return `No commands, so nothing moves: you are still on <b>Home</b>, the page every session starts on.`;
  const cut = snaps.find((s) => s.dropped.length > 0);
  if (cut)
    return `<b>${esc(cut.cmd)}</b> was typed while pages sat to the right of the cursor, so they are gone (struck out above): a Visit throws away the forward history. That is why a later Forward cannot bring them back (official case 6).`;
  if (cmds.some((c) => c.startsWith("Visit ") && c.slice(6).startsWith("Visit")))
    return `A page may itself be called <b>Visit Us</b>: only the first six characters, <code class='inl'>"Visit "</code>, are the command, so slicing keeps the whole name. Splitting on spaces would lose it.`;
  if (snaps.some((s) => s.kind !== "visit" && !s.moved))
    return `A <b>${esc(snaps.find((s) => s.kind !== "visit" && !s.moved)!.cmd)}</b> with nowhere to go is ignored: the cursor is clamped to <code class='inl'>0..history.length - 1</code>, so it can never leave the list.`;
  return `Back and Forward only move the cursor along a history that Visit builds, and the answer is the page under the cursor at the end, not the newest page.`;
}

// ── STEP — one command at a time ─────────────────────────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">navigate</span>(<span class="tok" data-t="arg">commands</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> <span class="tok" data-t="hist">history = [<span class="st">"Home"</span>]</span>;`,
  },
  { ln: 3, html: `  <span class="k">let</span> <span class="tok" data-t="cursor">i = 0</span>;` },
  {
    ln: 4,
    html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="cmd">cmd</span> <span class="k">of</span> commands) {`,
  },
  {
    ln: 5,
    html: `    <span class="k">if</span> (<span class="tok" data-t="backc">cmd === <span class="st">"Back"</span></span>) <span class="tok" data-t="back">i = Math.<span class="fn">max</span>(0, i - 1)</span>;`,
  },
  {
    ln: 6,
    html: `    <span class="k">else if</span> (<span class="tok" data-t="fwdc">cmd === <span class="st">"Forward"</span></span>) <span class="tok" data-t="fwd">i = Math.<span class="fn">min</span>(history.length - 1, i + 1)</span>;`,
  },
  { ln: 7, html: `    <span class="k">else</span> {` },
  {
    ln: 8,
    html: `      <span class="tok" data-t="cut">history.length = i + 1</span>;  <span class="cm">// drop the forward history</span>`,
  },
  {
    ln: 9,
    html: `      <span class="tok" data-t="push">history.<span class="fn">push</span>(cmd.<span class="fn">slice</span>(6))</span>;`,
  },
  { ln: 10, html: `      <span class="tok" data-t="step">i++</span>;` },
  { ln: 11, html: `    }` },
  { ln: 12, html: `  }` },
  {
    ln: 13,
    html: `  <span class="k">return</span> <span class="tok" data-t="ret">history[i]</span>;`,
  },
  { ln: 14, html: `}` },
];

function trace(idx: number) {
  const cs = CASES[Math.max(1, Math.min(CASES.length, idx)) - 1]!;
  const cmds = cs.cmds;
  const history = ["Home"];
  let i = 0;
  let cmd: string | undefined;
  const steps: DbgStep[] = [];
  const result = navigate(cmds);

  const S = (
    line: number,
    note: string,
    x: {
      focus?: string;
      changed?: string[];
      eval?: { expr: string; val: boolean };
      newest?: boolean;
      done?: boolean;
    } = {},
  ) => {
    // A name appears in the panel only once the line that declares it has run.
    const vars: Record<string, unknown> = { commands: qa(cmds) };
    if (line >= 3) vars["i"] = i;
    if (line >= 4 && line <= 11 && cmd !== undefined) vars["cmd"] = q(cmd);
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.done ? q(result) : undefined,
      frames: [
        {
          title: `navigate(${qa(cmds).length > 40 ? qa(cmds).slice(0, 38) + "…" : qa(cmds)})`,
          vars,
          changed: x.changed ?? [],
          structs:
            line >= 2
              ? [
                  {
                    label: "history (◀ = i)",
                    items: history.map((p, k) => (k === i && line >= 3 ? `${p} ◀` : p)),
                    newest: !!x.newest,
                  },
                ]
              : [],
          ret: x.done ? { value: q(result) } : undefined,
        },
      ],
    });
  };

  S(
    1,
    `${cmds.length} command${cmds.length === 1 ? "" : "s"}, and you begin on <b>Home</b>, which is never in the list. The plan: keep every page visited in order, plus a cursor for the page you are on, so Back and Forward are just cursor moves.`,
    { focus: "arg" },
  );
  S(
    2,
    `<code class='inl'>history</code> starts as <b>["Home"]</b>: the page you are already on when the first command arrives.`,
    { focus: "hist", changed: ["history"] },
  );
  S(
    3,
    `<code class='inl'>i = 0</code> points at Home. The answer is always <code class='inl'>history[i]</code>, the page under the cursor, not the newest page.`,
    {
      focus: "cursor",
      changed: ["i"],
    },
  );

  for (const c of cmds) {
    cmd = c;
    S(
      4,
      `Next command: <b>${esc(q(c))}</b>. It is exactly one of three kinds, and the first two tests cover the exact words <b>Back</b> and <b>Forward</b>.`,
      { focus: "cmd", changed: ["cmd"] },
    );
    const isBack = c === "Back";
    const blocked = i === 0;
    if (isBack) i = Math.max(0, i - 1);
    S(
      5,
      isBack
        ? blocked
          ? `<code class='inl'>cmd === "Back"</code> is true, but <code class='inl'>i</code> is already 0, so <code class='inl'>Math.max(0, i - 1)</code> stays at 0. Nothing is earlier than Home, so you stay put (official case 3).`
          : `<code class='inl'>cmd === "Back"</code> is true: the cursor moves one page left, to <b>${esc(history[i]!)}</b>. The page you left is still in the list, to the right, so Forward can return to it.`
        : `<code class='inl'>cmd === "Back"</code> is false, so this is not a Back. Try Forward next.`,
      {
        focus: "backc",
        eval: { expr: `cmd === "Back"`, val: isBack },
        changed: isBack ? ["i"] : [],
      },
    );
    if (isBack) continue;
    const isFwd = c === "Forward";
    const atEnd = i === history.length - 1;
    if (isFwd) i = Math.min(history.length - 1, i + 1);
    S(
      6,
      isFwd
        ? atEnd
          ? `<code class='inl'>cmd === "Forward"</code> is true, but <code class='inl'>i</code> is already the last index (${i}), so <code class='inl'>Math.min(history.length - 1, i + 1)</code> holds it there. No page lies ahead, so you stay put (official case 2).`
          : `<code class='inl'>cmd === "Forward"</code> is true: the cursor moves one page right, to <b>${esc(history[i]!)}</b>. That page was only there because a Back left it behind.`
        : `<code class='inl'>cmd === "Forward"</code> is false too, so the command is a <b>Visit</b>. The page is whatever follows the six characters <code class='inl'>"Visit "</code>.`,
      {
        focus: "fwdc",
        eval: { expr: `cmd === "Forward"`, val: isFwd },
        changed: isFwd ? ["i"] : [],
      },
    );
    if (isFwd) continue;
    const gone = history.slice(i + 1);
    history.length = i + 1;
    S(
      8,
      gone.length > 0
        ? `Cut the list at the cursor: <b>${esc(qa(gone))}</b> lay ahead of it and are discarded. This is the "forget the forward history" rule, and it is why a Forward after a new Visit goes nowhere (official case 6).`
        : `Cut the list at the cursor. The cursor is already on the newest page, so nothing lies ahead and nothing is lost.`,
      { focus: "cut", changed: ["history"] },
    );
    history.push(c.slice(6));
    S(
      9,
      `<code class='inl'>cmd.slice(6)</code> drops <code class='inl'>"Visit "</code> and keeps the rest: <b>${esc(q(c.slice(6)))}</b>.${c.slice(6).startsWith("Visit") ? " The page is itself named like a command, which is why we slice instead of splitting on spaces (official case 7)." : ""} It is pushed on the end, but the cursor has not moved yet.`,
      { focus: "push", changed: ["history"], newest: true },
    );
    i++;
    S(
      10,
      `<code class='inl'>i++</code> moves the cursor onto the new page, <b>${esc(history[i]!)}</b>, the newest entry.`,
      {
        focus: "step",
        changed: ["i"],
      },
    );
  }
  cmd = undefined;

  S(
    13,
    `The commands are used up. The cursor is at <b>${i}</b>, so the answer is <code class='inl'>history[${i}]</code> = <b>${esc(q(result))}</b>${i === history.length - 1 ? "" : `, not the newest page (${esc(q(history.at(-1)!))}): Back moved the cursor and nothing has moved it forward since`}.`,
    { focus: "ret", done: true },
  );
  return steps;
}

export default {
  n: 79,
  id: "navigator",
  title: "Navigator",
  dates: ["2025-10-28"],
  statement: `Given an array of browser commands you executed on Netscape Navigator, return the current page you are on after executing all of them. You always start on the <code class="inl">"Home"</code> page, which is not in the array. <code class="inl">"Visit Page"</code> goes to the page named <code class="inl">Page</code> and discards any forward history. <code class="inl">"Back"</code> goes to the previous page, or stays if there is none. <code class="inl">"Forward"</code> goes forward again, or stays if there is none. <span class="rule">Example: <code class="inl">navigate(["Visit About Us", "Back", "Forward"])</code> → <code class="inl">"About Us"</code>.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(n)",
      approach: `Keep two things: a <code class='inl'>history</code> array of pages and a cursor <code class='inl'>i</code> for the page you are on. <b>Back</b> and <b>Forward</b> only move the cursor, clamped to <code class='inl'>0..history.length - 1</code> so they stay put at the ends. <b>Visit</b> is the one command that edits the list: it cuts everything right of the cursor (the forward history), pushes the new page, and steps onto it. The page name is everything after <code class='inl'>"Visit "</code>, so slice it off; official case 7 visits a page called <code class='inl'>Visit Us</code>, which splitting on spaces would break. The answer is <code class='inl'>history[i]</code>, the page under the cursor, not the newest one. Type any commands, or click a case: 1 to 7 are freeCodeCamp's, 8 is ours and ends mid-history.`,
      code: `// A history array plus a cursor; Visit cuts the forward history.
function navigate(commands: string[]): string {
  const history = ["Home"];
  let i = 0;
  for (const cmd of commands) {
    if (cmd === "Back") i = Math.max(0, i - 1);
    else if (cmd === "Forward") i = Math.min(history.length - 1, i + 1);
    else {
      history.length = i + 1;       // drop the forward history
      history.push(cmd.slice(6));   // everything after "Visit "
      i++;
    }
  }
  return history[i];
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "line-by-line",
      approach: `Watch the list and the cursor together: <code class='inl'>history</code> shows <b>◀</b> beside the page under <code class='inl'>i</code>. Case <b>6</b> is the one to step: Back leaves Gallery to the right of the cursor, the next Visit cuts it off at line 8, and the final Forward finds nothing ahead. Cases <b>2</b> and <b>3</b> hit the clamps on lines 5 and 6. Case <b>7</b> pushes a page called <code class='inl'>Visit Us</code>. Case <b>8</b> (ours) ends on a page that is not the newest. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) =>
        mountDebugger(host, {
          source: SRC,
          trace,
          input: {
            label: "case =",
            value: 6,
            min: 1,
            max: CASES.length,
            presets: CASES.map((_, i) => i + 1),
            hint: `1-${CASES.length}: 1-${OFFICIAL} official, ${CASES.length - OFFICIAL} ours`,
          },
        }),
    },
  ],
} satisfies Challenge;
