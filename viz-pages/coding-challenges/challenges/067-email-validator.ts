// #67 · Email Validator — five rules asked in order; the first "no" is the answer.
// Split on "@" and the address falls into a local part and a domain, each with its own rules:
//   - exactly one @        split("@") must give exactly TWO pieces ("git@commit@push.io" gives three)
//   - local characters     only letters, digits, dot, underscore, hyphen (a regex over the whole part)
//   - local dots           it may not START or END with one; "hell.-w.rld" is fine, ".b" and "hello." are not
//   - no ".." anywhere     checked on BOTH sides, so "develop..ment_user" and "world..com" both fail
//   - domain ending        a dot, then at least two LETTERS, then the end: "c0" fails, "CKS" passes
// "The domain must contain a dot" is not a rule of its own: ending in dot + two letters already
// implies a dot, so a separate check could never be the one that rejects. And the domain has no
// character rule at all: "c0D!NG.R.CKS" is valid, "!" and all, because the statement only restricts
// the local part. A tidy "[a-z0-9.-]+" for the domain would reject an official true case.
// ONE approach, deliberately. One big regex, a loop over characters and the rule-by-rule version
// are the same checks spelled differently, all O(n) with nothing on screen to compare
// (CONTRIBUTING Tier 3 §1-§3), so a second tab would be a strawman.
import { el, esc, mountDebugger } from "./lib/shared.js";
import type { Challenge, DbgStep } from "./lib/shared.js";

// The 10 official freeCodeCamp cases in the grader's order, then one of ours.
//   1  a@b.cd                                valid, the minimum shape
//   2  hell.-w.rld@example.com               valid, dots and a hyphen inside the local part
//   3  .b@sh.rc                              local starts with a dot
//   4  example@test.c0                       TLD has a digit
//   5  freecodecamp.org                      no @ at all
//   6  develop.ment_user@c0D!NG.R.CKS        valid, "!" in the domain is legal
//   7  hello.@wo.rld                         local ends with a dot
//   8  hello@world..com                      ".." in the domain
//   9  develop..ment_user@c0D!NG.R.CKS       ".." in the local part
//   10 git@commit@push.io                    two @
//   11 @b.cd                                 ours: an empty local part (the statement is silent; the + in the character rule rejects it)
const CASES: { email: string; want?: boolean }[] = [
  { email: "a@b.cd", want: true },
  { email: "hell.-w.rld@example.com", want: true },
  { email: ".b@sh.rc", want: false },
  { email: "example@test.c0", want: false },
  { email: "freecodecamp.org", want: false },
  { email: "develop.ment_user@c0D!NG.R.CKS", want: true },
  { email: "hello.@wo.rld", want: false },
  { email: "hello@world..com", want: false },
  { email: "develop..ment_user@c0D!NG.R.CKS", want: false },
  { email: "git@commit@push.io", want: false },
  { email: "@b.cd" },
];
const OFFICIAL = 10; // CASES[0..9] are freeCodeCamp's; the rest are ours.

// Each rule is a question; the order is the order the code asks them, and the first "no" decides.
const RULES = [
  "exactly one @",
  "local: only a-z A-Z 0-9 . _ -",
  "local: no dot at either end",
  "no .. in either part",
  "domain: ends in a dot + 2 letters",
] as const;

// The rules scored in order. `ok` is null for any rule never reached because an earlier one failed.
function check(email: string): { ok: (boolean | null)[]; valid: boolean } {
  const parts = email.split("@");
  const [local = "", domain = ""] = parts;
  const tests = [
    () => parts.length === 2,
    () => /^[A-Za-z0-9._-]+$/u.test(local),
    () => !local.startsWith(".") && !local.endsWith("."),
    () => !local.includes("..") && !domain.includes(".."),
    () => /\.[A-Za-z]{2,}$/u.test(domain),
  ];
  const ok: (boolean | null)[] = [];
  let valid = true;
  for (const t of tests) {
    if (!valid) ok.push(null);
    else ok.push((valid = t()));
  }
  return { ok, valid };
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
    .ev-wrap { display:flex; flex-direction:column; gap:12px; }
    .ev-addr { font:600 18px var(--mono); padding:10px 12px; border:1px solid var(--border); border-radius:8px; background:var(--panel-2); word-break:break-all; }
    .ev-addr .at { color:var(--accent); font-weight:800; }
    .ev-addr .loc { color:var(--c1); } .ev-addr .dom { color:var(--c2); }
    .ev-row { opacity:1; }
    .ev-row.skip { opacity:.45; }
    .ev-row .k { min-width:22px; font-weight:800; }
    .ev-row .k.y { color:var(--good); } .ev-row .k.n { color:var(--danger); }
    .ev-row .exp { flex:1; }
  `,
    ),
  );
}

// Colour the two halves; the first @ is the split, and any further @ stays inside the domain.
function addr(email: string) {
  const i = email.indexOf("@");
  if (i < 0) return `<span class="loc">${esc(email)}</span>`;
  return `<span class="loc">${esc(email.slice(0, i))}</span><span class="at">@</span><span class="dom">${esc(email.slice(i + 1))}</span>`;
}

function mount(host: HTMLElement) {
  ensureStyle();

  const ctl = el("div", "controls");
  const inp = el("input");
  inp.type = "text";
  inp.value = CASES[0]!.email;
  inp.style.width = "340px";
  ctl.append(el("span", "ctl-label", "email ="), inp);

  const pre = el("div", "controls");
  CASES.forEach((c, i) => {
    const b = el("button", "chip", esc(c.email));
    b.title = i < OFFICIAL ? "official freeCodeCamp case" : "ours";
    b.addEventListener("click", () => {
      inp.value = c.email;
      render();
    });
    pre.append(b);
  });

  const out = el("div");
  host.append(ctl, pre, out);
  inp.addEventListener("input", () => render());
  render();

  function render() {
    const email = inp.value;
    const { ok, valid } = check(email);
    const want = CASES.find((c) => c.email === email)?.want;
    const first = ok.indexOf(false);
    out.innerHTML = "";
    const wrap = el("div", "ev-wrap");

    const line = el("div", "result-line");
    line.append(
      el(
        "span",
        `badge ${want === undefined || want === valid ? "ok" : "no"}`,
        `validate(${esc(JSON.stringify(email))}) → ${valid}`,
      ),
      el(
        "span",
        "more",
        want === undefined
          ? valid
            ? "every rule holds"
            : `rejected by rule ${first + 1}`
          : `matches freeCodeCamp's expected ${want}`,
      ),
    );
    wrap.append(line, el("div", "ev-addr", addr(email)));

    RULES.forEach((r, i) => {
      const s = ok[i];
      wrap.append(
        el(
          "div",
          `srow ev-row${s === null ? " skip" : ""}`,
          `<span class="k ${s ? "y" : s === false ? "n" : ""}">${s ? "✓" : s === false ? "✗" : "·"}</span><span class="exp">${i + 1}. ${esc(r)}${s === null ? " — never asked" : ""}</span>`,
        ),
      );
    });

    wrap.append(el("div", "note", noteFor(email, first)));
    out.append(wrap);
  }
}

// Which rule decided THIS address? Each branch is a different way to be rejected (or to pass).
function noteFor(email: string, first: number) {
  if (first === 0)
    return `Splitting on <code class='inl'>@</code> gave <b>${email.split("@").length}</b> piece${email.split("@").length === 1 ? "" : "s"}, not 2. With none there is no domain to speak of; with more than one, "exactly one @" is broken and nothing after it is worth asking.`;
  if (first === 1)
    return `The local part is not made only of letters, digits, <code class='inl'>.</code> <code class='inl'>_</code> <code class='inl'>-</code>. An <i>empty</i> local part also lands here: the regex uses <code class='inl'>+</code>, so it needs at least one character.`;
  if (first === 2)
    return `The local part starts or ends with a dot. A dot <i>inside</i> it is fine (<code class='inl'>hell.-w.rld</code> is valid); only the two ends are banned.`;
  if (first === 3)
    return `Two dots in a row, in the local part or the domain. The same <code class='inl'>includes("..")</code> test runs on both halves, so one check covers <code class='inl'>develop..ment_user</code> and <code class='inl'>world..com</code>.`;
  if (first === 4)
    return `The domain must end in a dot followed by <b>two or more letters</b>, then the end of the string. <code class='inl'>c0</code> has a digit where the second letter should be, so it fails; a domain with no dot at all fails here too, which is why "must contain a dot" needs no rule of its own.`;
  return /[^A-Za-z0-9.-]/u.test(email.slice(email.indexOf("@") + 1))
    ? `Valid, and a good warning: the domain contains a character like <code class='inl'>!</code>. The statement restricts the characters of the <i>local</i> part only, so the domain is checked for its ending and its dots, nothing else.`
    : `Every rule holds, so the address is valid. Notice how little this proves: nothing here checks that the domain exists, only that the text has the right shape.`;
}

// ── STEP — split, then ask the rules in order ──────────────────────────────
const SRC = [
  {
    ln: 1,
    html: `<span class="k">function</span> <span class="fn">validate</span>(<span class="tok" data-t="arg">email</span>) {`,
  },
  {
    ln: 2,
    html: `  <span class="k">const</span> parts = <span class="tok" data-t="parts">email.<span class="fn">split</span>(<span class="st">"@"</span>)</span>;`,
  },
  {
    ln: 3,
    html: `  <span class="k">if</span> (<span class="tok" data-t="one">parts.length !== 2</span>) <span class="k">return</span> <span class="k">false</span>;`,
  },
  {
    ln: 4,
    html: `  <span class="k">const</span> [<span class="tok" data-t="halves">local, domain</span>] = parts;`,
  },
  {
    ln: 5,
    html: `  <span class="k">if</span> (<span class="tok" data-t="chars">!/^[A-Za-z0-9._-]+$/.<span class="fn">test</span>(local)</span>) <span class="k">return</span> <span class="k">false</span>;`,
  },
  {
    ln: 6,
    html: `  <span class="k">if</span> (<span class="tok" data-t="ends">local.<span class="fn">startsWith</span>(<span class="st">"."</span>) || local.<span class="fn">endsWith</span>(<span class="st">"."</span>)</span>) <span class="k">return</span> <span class="k">false</span>;`,
  },
  {
    ln: 7,
    html: `  <span class="k">if</span> (<span class="tok" data-t="dots">local.<span class="fn">includes</span>(<span class="st">".."</span>) || domain.<span class="fn">includes</span>(<span class="st">".."</span>)</span>) <span class="k">return</span> <span class="k">false</span>;`,
  },
  {
    ln: 8,
    html: `  <span class="k">return</span> <span class="tok" data-t="tld">/\\.[A-Za-z]{2,}$/.<span class="fn">test</span>(domain)</span>;`,
  },
  { ln: 9, html: `}` },
];

function trace(idx: number) {
  const email = CASES[Math.max(1, Math.min(CASES.length, idx)) - 1]!.email;
  const parts = email.split("@");
  const [local = "", domain = ""] = parts;
  const q = (s: string) => JSON.stringify(s);
  const steps: DbgStep[] = [];

  const S = (
    line: number,
    note: string,
    x: {
      focus?: string;
      changed?: string[];
      eval?: { expr: string; val: boolean };
      result?: boolean;
    } = {},
  ) => {
    // A name appears in the panel only once the line that declares it has run.
    const vars: Record<string, unknown> = { email: q(email) };
    if (line >= 2) vars["parts"] = `[${parts.map(q).join(", ")}]`;
    if (line >= 4 && parts.length === 2) {
      vars["local"] = q(local);
      vars["domain"] = q(domain);
    }
    const done = x.result !== undefined;
    steps.push({
      line,
      note,
      focus: x.focus,
      eval: x.eval,
      done,
      result: done ? String(x.result) : undefined,
      frames: [
        {
          title: `validate(${q(email)})`,
          vars,
          changed: x.changed ?? [],
          structs: line >= 2 ? [{ label: "parts", items: parts.map(q) }] : [],
          ret: done ? { value: String(x.result) } : undefined,
        },
      ],
    });
  };
  // Ask one rule: show it, and stop with false if it rejects.
  const ask = (
    line: number,
    focus: string,
    expr: string,
    rejects: boolean,
    yes: string,
    no: string,
  ) => {
    S(line, rejects ? no : yes, {
      focus,
      eval: { expr, val: rejects },
      ...(rejects ? { result: false } : {}),
    });
    return rejects;
  };

  S(
    1,
    `Validating ${esc(q(email))}. The plan: cut the address at <code class='inl'>@</code> into a local part and a domain, then ask the rules cheapest-first. The first rule that says no ends the call with <code class='inl'>false</code>; only an address that survives all of them reaches the last line.`,
    { focus: "arg" },
  );
  S(
    2,
    `<code class='inl'>split("@")</code> gives <b>${parts.length}</b> piece${parts.length === 1 ? "" : "s"}: ${esc(parts.map(q).join(", "))}. Splitting is also the "exactly one @" test in disguise, because n separators always make n+1 pieces.`,
    { focus: "parts", changed: ["parts"] },
  );
  if (
    ask(
      3,
      "one",
      "parts.length !== 2",
      parts.length !== 2,
      `Two pieces, so exactly one <code class='inl'>@</code>. Safe to name the halves.`,
      parts.length === 1
        ? `Only one piece: there is <b>no @</b> in ${esc(q(email))}, so there is no domain at all. Return <b>false</b>.`
        : `<b>${parts.length}</b> pieces means ${parts.length - 1} <code class='inl'>@</code> symbols, and the rule says exactly one. Return <b>false</b> before touching the pieces.`,
    )
  )
    return steps;
  S(
    4,
    `Destructuring is safe only now: with exactly two pieces, <code class='inl'>local</code> is ${esc(q(local))} and <code class='inl'>domain</code> is ${esc(q(domain))}. Every rule below talks about one half or the other.`,
    { focus: "halves", changed: ["local", "domain"] },
  );
  if (
    ask(
      5,
      "chars",
      `!/^[A-Za-z0-9._-]+$/.test(${q(local)})`,
      !/^[A-Za-z0-9._-]+$/u.test(local),
      `Every character of the local part is a letter, digit, dot, underscore or hyphen, and there is at least one (<code class='inl'>+</code>). Note the domain gets <i>no</i> such test.`,
      local === ""
        ? `The local part is <b>empty</b>. The statement never says so outright, but <code class='inl'>+</code> demands at least one allowed character, so an address with nothing before the <code class='inl'>@</code> is rejected here. Return <b>false</b>.`
        : `${esc(q(local))} contains a character outside letters, digits and <code class='inl'>. _ -</code>. Return <b>false</b>.`,
    )
  )
    return steps;
  if (
    ask(
      6,
      "ends",
      `local.startsWith(".") || local.endsWith(".")`,
      local.startsWith(".") || local.endsWith("."),
      `Neither end of ${esc(q(local))} is a dot. Dots <i>inside</i> are allowed, so this checks the two ends and nothing else.`,
      `${esc(q(local))} ${local.startsWith(".") ? "starts" : "ends"} with a dot, which the local part may not do. Return <b>false</b>.`,
    )
  )
    return steps;
  if (
    ask(
      7,
      "dots",
      `local.includes("..") || domain.includes("..")`,
      local.includes("..") || domain.includes(".."),
      `No two dots in a row on either side. One check per half, because the rule is for both.`,
      `Two dots in a row in the ${local.includes("..") ? "local part" : "domain"}: ${esc(q(local.includes("..") ? local : domain))}. Return <b>false</b>.`,
    )
  )
    return steps;
  const tld = /\.[A-Za-z]{2,}$/u.test(domain);
  S(
    8,
    tld
      ? `${esc(q(domain))} ends in a dot followed by two or more letters, so the last rule holds, and so does "must contain a dot" with it. Every rule passed: return <b>true</b>.`
      : `${esc(q(domain))} does not end in a dot plus at least two letters${/\.[A-Za-z0-9]+$/u.test(domain) ? " (the last label has a digit or is one character long)" : ""}. The same test also covers "the domain must contain a dot": no dot means no match. Return <b>false</b>.`,
    { focus: "tld", result: tld },
  );
  return steps;
}

export default {
  n: 67,
  id: "email-validator",
  title: "Email Validator",
  dates: ["2025-10-16"],
  statement: `Given a string, decide whether it is a valid email address. It must contain <b>exactly one <code class="inl">@</code></b>. The <b>local part</b> (before it) may hold only letters, digits, <code class="inl">.</code>, <code class="inl">_</code> and <code class="inl">-</code>, and may not start or end with a dot. The <b>domain</b> (after it) must contain a dot and end with a dot followed by at least two letters. Neither part may have two dots in a row. <span class="rule">Example: <code class="inl">validate("hell.-w.rld@example.com")</code> → <code class="inl">true</code>; <code class="inl">validate("hello.@wo.rld")</code> → <code class="inl">false</code> (the local part ends with a dot).</span>`,
  variants: [
    {
      name: "Solution",
      cost: "O(n) — five checks",
      approach: `Cut the address at <code class='inl'>@</code> and ask the rules in order; the first "no" is the answer. <code class='inl'>split("@")</code> must give <b>exactly two</b> pieces, which is the "one @" rule and the guard that makes destructuring safe. The local part gets a character-class regex (<code class='inl'>+</code> so it cannot be empty) and an end-of-string dot check; both halves share one <code class='inl'>includes("..")</code> test; the domain only has to <b>end</b> in a dot and two letters, which also covers "must contain a dot". The trap is the domain: the statement restricts characters of the <i>local</i> part only, so <code class='inl'>c0D!NG.R.CKS</code> is valid and a tidy domain character class would reject an official true case. Type any address, or click a case: the first ten are freeCodeCamp's, each rejected by a different rule or (cases 1, 2, 6) valid; the demo ticks the rules the address passed and greys the ones it never reached.`,
      code: `function validate(email: string): boolean {
  const parts = email.split("@");
  if (parts.length !== 2) return false;                         // exactly one @
  const [local, domain] = parts as [string, string];
  if (!/^[A-Za-z0-9._-]+$/.test(local)) return false;           // allowed characters, non-empty
  if (local.startsWith(".") || local.endsWith(".")) return false;
  if (local.includes("..") || domain.includes("..")) return false;
  return /\\.[A-Za-z]{2,}$/.test(domain);                        // dot + 2 letters at the end
}`,
      mount,
    },
    {
      name: "Step through",
      cost: "first failing rule",
      approach: `The same function one rule per line, with <code class='inl'>local</code> and <code class='inl'>domain</code> appearing only after the destructuring runs, and a condition panel that goes green or red on each test. Start on <b>case 1</b>, <code class='inl'>a@b.cd</code>, which walks the whole function to <code class='inl'>true</code>. <b>Case 10</b> dies on line 3 (three pieces) and <b>case 5</b> too (one piece); <b>case 3</b> gets past the character test and dies on the dot at the end; <b>case 4</b> survives every rule except the last; <b>case 6</b> shows <code class='inl'>!</code> sailing through the domain. <b>Case 11</b>, <code class='inl'>@b.cd</code>, is ours: an empty local part. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
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
