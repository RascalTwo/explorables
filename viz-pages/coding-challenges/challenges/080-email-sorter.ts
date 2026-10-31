// #80 · Email Sorter — sort on a (domain, username) key, lowercased for the compare only.
// The key is two halves, in this order: the part after the "@" first, the part before it second. Three
// things the official set pins down:
//   - domain beats username: bob@mail.com comes before alice@zoo.com, so you cannot just sort the strings.
//   - the compare is case-insensitive but the output is not rewritten: "amy@mail.COM" is returned as written.
//     So lowercase inside the comparator (or in a side key), never in the array you return.
//   - a shorter username sorts before a longer one it prefixes: "sam" < "sammy" < "sara" < "sarah".
// Two shortcuts go wrong:
//   - Lowercasing the whole address and comparing it sorts by username first (case 2 breaks), and its "@"
//     (code 64) is a separator that sits above "-" and "." (45-46), so "sam-x@a.com" lands before "sam@a.com"
//     where the username compare puts "sam" first. The official set has no such pair, so case 6 is ours.
//   - Case 7 is ours too: two addresses equal once lowercased keep their input order, because the sort is
//     stable and the comparator says 0.
// ONE approach, deliberately. Grouping by domain into a map and sorting each bucket is the same compare
// with an extra container: same answer, same O(n log n), nothing on screen to watch differ (CONTRIBUTING
// Tier 3 §1-§3).
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// The 5 official freeCodeCamp cases in the grader's order, then two of ours.
//   1 jill/john/jane                      two domains, same-domain pair ordered by username
//   2 bob/alice/carol                     domain beats username: mail.com before zoo.com
//   3 user@z, user@y, user@x              same username; the domain alone orders them
//   4 sam@MAIL.com, amy@mail.COM, ...     case-insensitive; original case kept
//   5 six addresses, two domains          username prefixes (sam < sammy < sara < Sarah) inside alpha.com
//   6 sam@a.com, sam-x@a.com              ours: the whole-address shortcut puts sam-x first
//   7 Zed@A.com, zed@a.com, ann@a.com     ours: an exact tie keeps input order (stable)
const CASES: { list: string[]; want?: string[] }[] = [
  {
    list: ["jill@mail.com", "john@example.com", "jane@example.com"],
    want: ["jane@example.com", "john@example.com", "jill@mail.com"],
  },
  {
    list: ["bob@mail.com", "alice@zoo.com", "carol@mail.com"],
    want: ["bob@mail.com", "carol@mail.com", "alice@zoo.com"],
  },
  {
    list: ["user@z.com", "user@y.com", "user@x.com"],
    want: ["user@x.com", "user@y.com", "user@z.com"],
  },
  {
    list: ["sam@MAIL.com", "amy@mail.COM", "bob@Mail.com"],
    want: ["amy@mail.COM", "bob@Mail.com", "sam@MAIL.com"],
  },
  {
    list: [
      "simon@beta.com",
      "sammy@alpha.com",
      "Sarah@Alpha.com",
      "SAM@ALPHA.com",
      "Simone@Beta.com",
      "sara@alpha.com",
    ],
    want: [
      "SAM@ALPHA.com",
      "sammy@alpha.com",
      "sara@alpha.com",
      "Sarah@Alpha.com",
      "simon@beta.com",
      "Simone@Beta.com",
    ],
  },
  { list: ["sam-x@a.com", "sam@a.com"] },
  { list: ["Zed@A.com", "zed@a.com", "ann@a.com"] },
];
const OFFICIAL = 5; // CASES[0..4] are freeCodeCamp's; the rest are ours.

const split = (e: string) => {
  const at = e.lastIndexOf("@");
  return { d: e.slice(at + 1).toLowerCase(), u: e.slice(0, at).toLowerCase() };
};
const cmp = (a: string, b: string) => {
  const x = split(a);
  const y = split(b);
  if (x.d !== y.d) return x.d < y.d ? -1 : 1;
  if (x.u !== y.u) return x.u < y.u ? -1 : 1;
  return 0;
};
const sort = (emails: string[]) => emails.toSorted(cmp);
// The tempting shortcut: lowercase the whole address and compare it as one string.
const wholeString = (emails: string[]) =>
  emails.toSorted((a, b) => {
    const x = a.toLowerCase();
    const y = b.toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  });
const same = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
const parse = (s: string) =>
  s
    .split(/[,\n]/u)
    .map((x) => x.trim())
    .filter((x) => x.includes("@"));

let styled = false;
function ensureStyle() {
  if (styled) return;
  styled = true;
  document.head.append(
    el(
      "style",
      null,
      `
    .es-wrap { display:flex; flex-direction:column; gap:12px; margin-top:10px; }
    .es-list { display:flex; flex-direction:column; gap:4px; }
    .es-row { display:flex; align-items:center; gap:10px; font:13px var(--mono); padding:5px 10px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); }
    .es-row.top { margin-top:6px; }
    .es-n { color:var(--muted); width:2.2em; flex:none; }
    .es-a { color:var(--text); flex:1; }
    .es-k { color:var(--muted); font-size:12px; }
    .es-k b { color:var(--accent); font-weight:600; }
    .es-r { font:12px var(--mono); padding:5px 10px; border-radius:7px; border:1px solid var(--border); background:var(--panel-2); color:var(--muted); align-self:flex-start; }
    .es-r.hot { border-color:var(--danger); color:var(--danger); }
    .es-r b { color:var(--text); }
    .es-r.hot b { color:var(--danger); }
  `,
    ),
  );
}

function mount(host: HTMLElement) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input");
  inp.type = "text";
  inp.value = CASES[4]!.list.join(", ");
  inp.style.width = "460px";
  ctl.append(el("span", "ctl-label", "emails, comma-separated"), inp);
  const pre = el("div", "controls");
  CASES.forEach((cs, i) => {
    const b = el("button", "chip", `${i + 1}`);
    b.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    b.addEventListener("click", () => {
      inp.value = cs.list.join(", ");
      render();
    });
    pre.append(b);
  });
  const out = el("div");
  host.append(ctl, pre, out);
  inp.addEventListener("input", render);
  render();

  function render() {
    const list = parse(inp.value);
    const result = sort(list);
    out.innerHTML = "";
    const idx = CASES.findIndex((cs) => same(cs.list, list));
    const want = idx >= 0 && idx < OFFICIAL ? CASES[idx]!.want : undefined;
    const wrap = el("div", "es-wrap");

    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${want === undefined || same(want, result) ? "ok" : "no"}`,
        `sort(${list.length} emails) → ${list.length} sorted`,
      ),
    );
    if (want !== undefined)
      line.append(el("span", "more", "matches freeCodeCamp's expected output"));
    wrap.append(line);

    const rows = el("div", "es-list");
    result.forEach((e, i) => {
      const k = split(e);
      const newDomain = i > 0 && split(result[i - 1]!).d !== k.d;
      const r = el("div", `es-row${newDomain ? " top" : ""}`);
      r.append(
        el("span", "es-n", `${list.indexOf(e) + 1}→${i + 1}`),
        el("span", "es-a", esc(e)),
        el("span", "es-k", `key <b>${esc(k.d)}</b> · ${esc(k.u)}`),
      );
      rows.append(r);
    });
    wrap.append(rows);

    const bad = wholeString(list);
    const hot = !same(bad, result);
    wrap.append(
      el(
        "div",
        `es-r${hot ? " hot" : ""}`,
        `whole address lowercased <b>${esc(bad.join(", "))}</b>${hot ? " ✗" : ""}`,
      ),
    );
    wrap.append(el("div", "note", noteFor(list, result)));
    out.append(wrap);
  }
}

// What did THIS input exercise?
function noteFor(list: string[], result: string[]) {
  if (list.length === 0)
    return "No addresses with an <b>@</b> in them yet: the result is <code class='inl'>[]</code>. Type a few, or pick a case.";
  const domains = [...new Set(result.map((e) => split(e).d))];
  const bits = [
    `${list.length} address${list.length === 1 ? "" : "es"} fall into ${domains.length} domain${domains.length === 1 ? "" : "s"} (${domains.map(esc).join(", ")}), and the domains are put in order <i>first</i>; usernames only break ties inside one domain.`,
  ];
  const caseKept = result.some((e) => e !== e.toLowerCase());
  if (caseKept)
    bits.push(
      "Capitals decide nothing (the compare lowercases both sides) yet every address comes back exactly as typed.",
    );
  const tie = result.some((e, i) => i > 0 && cmp(result[i - 1]!, e) === 0);
  if (tie)
    bits.push(
      "Two addresses are equal once lowercased, so the comparator says 0 and the stable sort leaves them in input order (the <b>from→to</b> column shows it).",
    );
  return bits.join(" ");
}

// ── STEP — build a key per address, sort on it, return the originals ─────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">sort</span>(<span class="tok" data-t="arg">emails</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> <span class="tok" data-t="keyed">keyed</span> = [];`,
  },
  {
    ln: 3,
    html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="e">e</span> <span class="k">of</span> emails) {`,
  },
  {
    ln: 4,
    html: `    <span class="k">const</span> <span class="tok" data-t="at">at</span> = e.<span class="fn">lastIndexOf</span>(<span class="st">"@"</span>);`,
  },
  {
    ln: 5,
    html: `    keyed.<span class="fn">push</span>({ e, <span class="tok" data-t="d">d: e.<span class="fn">slice</span>(at + 1).<span class="fn">toLowerCase</span>()</span>, <span class="tok" data-t="u">u: e.<span class="fn">slice</span>(0, at).<span class="fn">toLowerCase</span>()</span> });`,
  },
  { ln: 6, html: `  }` },
  {
    ln: 7,
    html: `  keyed.<span class="fn">sort</span>((a, b) =&gt; <span class="tok" data-t="cmp">a.d &lt; b.d ? -1 : a.d &gt; b.d ? 1 : a.u &lt; b.u ? -1 : a.u &gt; b.u ? 1 : 0</span>);`,
  },
  {
    ln: 8,
    html: `  <span class="k">return</span> <span class="tok" data-t="ret">keyed.<span class="fn">map</span>(k =&gt; k.e)</span>;`,
  },
  { ln: 9, html: `}` },
];

function trace(idx: number) {
  const cs = CASES[Math.max(1, Math.min(CASES.length, idx)) - 1]!;
  const emails = cs.list;
  const keyed = emails.map((e) => ({ e, ...split(e) }));
  const sorted = keyed.toSorted((a, b) => cmp(a.e, b.e));
  const result = sorted.map((k) => k.e);
  const fmt = (k: { d: string; u: string }) => `${k.d} | ${k.u}`;
  const steps: DbgStep[] = [];

  const S = (
    line: number,
    note: string,
    x: {
      focus?: string;
      changed?: string[];
      eval?: { expr: string; val: boolean };
      done?: boolean;
      loop?: { i: number; withAt: boolean };
      pushed?: number; // how many keys exist at this step
    } = {},
  ) => {
    // A name appears in the panel only once the line that declares it has run.
    const n = x.pushed ?? 0;
    const sortedNow = line >= 7;
    const vars: Record<string, unknown> = {};
    if (line >= 2) vars["keyed"] = n === 0 ? "[]" : `[${n} keys]`;
    if (x.loop) {
      vars["e"] = emails[x.loop.i];
      if (x.loop.withAt) vars["at"] = emails[x.loop.i]!.lastIndexOf("@");
    }
    const shown = sortedNow ? sorted : keyed.slice(0, n);
    const structs: { label: string; items: string[]; newest?: boolean }[] = [
      { label: "emails", items: emails },
    ];
    if (line >= 2) {
      structs.push({
        label: sortedNow ? "keyed (sorted)" : "keyed",
        items: shown.map(fmt),
        newest: line === 5,
      });
    }
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done: x.done,
      result: x.done ? JSON.stringify(result) : undefined,
      frames: [
        {
          title: `sort(emails)`,
          vars,
          changed: x.changed ?? [],
          structs,
          ret: x.done ? { value: JSON.stringify(result) } : undefined,
        },
      ],
    });
  };

  S(
    1,
    `${emails.length} address${emails.length === 1 ? "" : "es"} come in. The order wanted is not the string order of the addresses, it is <b>domain first, then username</b>, ignoring case, so each address will need two small lowercase keys before anything can be compared.`,
    { focus: "arg" },
  );
  S(
    2,
    `<code class='inl'>keyed</code> starts empty. Keys sit in a side list next to the untouched original <code class='inl'>e</code>, so the lowercasing that makes the compare case-blind can never leak into what is returned.`,
    { focus: "keyed", changed: ["keyed"] },
  );
  emails.forEach((e, i) => {
    const k = keyed[i]!;
    const at = e.lastIndexOf("@");
    S(
      3,
      `Next address: <b>${esc(e)}</b>${i === 0 ? "" : ` (${i + 1} of ${emails.length})`}. Each one is split exactly once here, instead of re-splitting inside the comparator on every one of its comparisons.`,
      { focus: "e", changed: ["e"], loop: { i, withAt: false }, pushed: i },
    );
    S(
      4,
      `The domain starts after the <b>last</b> "@", found at index <b>${at}</b>. Using the last one means a stray "@" inside the username cannot move the split point.`,
      { focus: "at", changed: ["at"], loop: { i, withAt: true }, pushed: i },
    );
    S(
      5,
      `Push the original plus two lowercased halves: domain <b>${esc(k.d)}</b>, username <b>${esc(k.u)}</b>. ${
        e === e.toLowerCase()
          ? "Already lowercase here, so the keys equal the pieces."
          : `The capitals in <b>${esc(e)}</b> are folded away in the keys only; <code class='inl'>e</code> keeps them.`
      }`,
      { focus: "d", changed: ["keyed"], loop: { i, withAt: true }, pushed: i + 1 },
    );
  });
  const doms = [...new Set(sorted.map((k) => k.d))];
  const grouped = doms
    .map(
      (d) =>
        `<b>${esc(d)}</b> (${sorted
          .filter((k) => k.d === d)
          .map((k) => esc(k.u))
          .join(", ")})`,
    )
    .join(" then ");
  const ties = sorted.some((k, i) => i > 0 && cmp(sorted[i - 1]!.e, k.e) === 0);
  S(
    7,
    `Sort on the keys: ${grouped}. The comparator looks at the domain first and only when the domains are equal does it look at the username, which is why a username can never pull an address across a domain boundary.${
      ties
        ? " Two addresses tie on both keys; the comparator returns 0 and the stable sort keeps their input order."
        : ""
    } The compare uses &lt; on strings, so a username that is a prefix of another sorts first.`,
    {
      focus: "cmp",
      changed: ["keyed"],
      pushed: emails.length,
      eval: { expr: "a.d < b.d ? -1 : a.d > b.d ? 1 : (usernames)", val: doms.length > 1 },
    },
  );
  S(
    8,
    `Drop the keys and return only the originals, in the new order. Nothing was rewritten, so every address keeps the case it arrived with.`,
    { focus: "ret", pushed: emails.length, done: true },
  );
  return steps;
}

export default {
  n: 80,
  id: "email-sorter",
  title: "Email Sorter",
  dates: ["2025-10-29"],
  statement: `Given an array of email addresses, sort them alphabetically by <b>domain</b> (the part after the <code class="inl">@</code>) first and by <b>username</b> (the part before it) second. The sort is case-insensitive, but the returned addresses keep their original case. <span class="rule">Example: <code class="inl">sort(["jill@mail.com", "john@example.com", "jane@example.com"])</code> → <code class="inl">["jane@example.com", "john@example.com", "jill@mail.com"]</code>: example.com sorts before mail.com, and jane before john inside it.</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(n log n)",
      approach: `Compare two addresses by a two-part key: the lowercased <b>domain</b>, and only if those are equal, the lowercased <b>username</b>. Lowercase inside the comparator and leave the array's strings alone, so the output keeps its original case. Sorting the whole lowercased address as one string is the tempting shortcut; the red line under the list scores it on the same input. It fails case 2 outright (it sorts by username first), and case <b>6</b> (ours) is the subtler break: "-" sorts below "@", so <code class='inl'>sam-x@a.com</code> jumps ahead of <code class='inl'>sam@a.com</code>. Case <b>7</b> (ours) is an exact tie that keeps input order. Type your own list or pick a case; 1 to 5 are freeCodeCamp's.`,
      code: `// Compare by lowercased domain, then lowercased username. Originals are never rewritten.
function sort(emails: string[]): string[] {
  const parts = (e: string) => {
    const at = e.lastIndexOf("@");
    return [e.slice(at + 1).toLowerCase(), e.slice(0, at).toLowerCase()];
  };
  return [...emails].sort((a, b) => {
    const [da, ua] = parts(a);
    const [db, ub] = parts(b);
    if (da !== db) return da < db ? -1 : 1; // domain decides first
    if (ua !== ub) return ua < ub ? -1 : 1; // username breaks a domain tie
    return 0;                               // equal ignoring case: stable sort keeps input order
  });
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "line-by-line",
      approach: `Keys first, sort second: a loop gives each address its lowercased domain and username (three steps per address), one step sorts the keys, one returns the originals. Start on <b>case 5</b>: six addresses in two domains, and watch <code class='inl'>sam</code>, <code class='inl'>sammy</code>, <code class='inl'>sara</code>, <code class='inl'>Sarah</code> come out in prefix order inside alpha.com. <b>Case 2</b> shows the domain outranking the username. <b>Case 6</b> is ours (the "-" versus "@" trap) and <b>case 7</b> is ours (a tie keeps input order). Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
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
            hint: `1-${CASES.length}: 1-${OFFICIAL} official, ${CASES.length - OFFICIAL} ours`,
          },
        }),
    },
  ],
} satisfies Challenge;
