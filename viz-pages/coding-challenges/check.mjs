// check.mjs — the mechanical half of CONTRIBUTING.md.
//
//   node check.mjs
//
// CONTRIBUTING opens by admitting "nothing here is enforced by code", and then
// spends a paragraph on how `318` hard-coded `max: 4` against a longer array,
// silently orphaned a case, and survived a full test pass because nothing about
// it is a *logic* error. This catches that class of thing: the rules that are
// true or false about the source, with no judgement involved.
//
// It deliberately does NOT check the rules that need taste — whether a variant
// is a real approach or a strawman, whether presets teach anything, whether the
// notes explain *why*. Those stay human. A green run here means "nothing is
// mechanically broken", not "this entry is good".
//
// Modules import `../shared.js`, which imports `/_kit/viz.js` — a path only the
// dev server can resolve. So we rewrite that import to a stub and load each
// module from a data: URL. That means no server, no browser, no dependencies.
import { readFile, readdir, writeFile, mkdtemp } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHALLENGES = join(HERE, "challenges");

// Enough of the DOM that a module's top level can execute. Nothing here needs
// to *work* — mount() is never called, we only read the exported object.
globalThis.document = {
  head: { append() {} },
  createElement: () => ({ classList: { toggle() {}, add() {}, remove() {} }, append() {}, querySelectorAll: () => [], style: {} }),
  querySelectorAll: () => [],
};

const STUB = `
export const el = () => ({ append() {}, classList: { toggle() {} } });
export const esc = (s) => s;
export const hl = (s) => s;
export const codeBlock = (s) => s;
export const mountDebugger = () => {};
export const mountGallery = () => {};
export const $ = () => null;
export const $$ = () => [];
`;
const STUB_URL = "data:text/javascript," + encodeURIComponent(STUB);

async function loadModule(file) {
  const src = await readFile(join(CHALLENGES, file), "utf8");
  const patched = src.replace(/from\s+["']\.\.\/shared\.js["']/g, `from "${STUB_URL}"`);
  const mod = await import("data:text/javascript," + encodeURIComponent(patched));
  return { mod: mod.default, src };
}

// ── findings ────────────────────────────────────────────────────────────────
const problems = [];
const warnings = [];
const fail = (file, msg) => problems.push(`${file}: ${msg}`);
// Drift worth seeing but not worth blocking on — a dominant convention with
// defensible exceptions, rather than a rule.
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);

const CANONICAL = new Set([
  "Backtracking", "Dynamic programming", "Greedy", "Recursion", "Hashing",
  "Flood fill", "Math", "Simulation", "Gotcha", "Direct",
]);

// A step-through variant is named "Step through" or "Step: <phrase>".
const isStepThrough = (v) => /^Step\b/.test(v.name || "");

const HEADER_MAX = 95; // longest existing header line is 91 chars

function checkHeader(file, src) {
  const first = src.split("\n")[0];
  if (!first.startsWith("//")) return fail(file, "first line is not a comment");
  // "// #336 · Title — insight."  or  "// LeetCode #39 · Title — insight."
  if (!/^\/\/ (LeetCode )?#[\d–-]+ · .+ — .+$/.test(first))
    return fail(file, `header must read "// #<n> · <Title> — <insight>", got: ${first.slice(0, 60)}…`);
  if (first.length > HEADER_MAX)
    fail(file, `header first line is ${first.length} chars (max ${HEADER_MAX}) — shorten the insight`);
  // The insight has to *finish* on line 1. A line ending mid-clause means it
  // spilled; anything grepping the header gets a truncated sentence.
  if (!/[.?!)]$/.test(first.trim()))
    fail(file, `header first line doesn't terminate — the insight must fit on one line, got: …${first.slice(-38)}`);
}

function checkModule(file, m, src) {
  if (!m) return fail(file, "no default export");

  for (const f of ["n", "id", "title", "dates", "statement", "variants"])
    if (m[f] === undefined) fail(file, `missing required field \`${f}\``);

  if (typeof m.id === "string" && !/^[a-z0-9-]+$/.test(m.id))
    fail(file, `id "${m.id}" must be a lowercase kebab slug`);

  if (!Array.isArray(m.dates) || !m.dates.length) fail(file, "`dates` must be a non-empty array");
  else {
    m.dates.forEach((d) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) fail(file, `date "${d}" is not ISO YYYY-MM-DD`);
    });
    const sorted = [...m.dates].sort();
    if (String(sorted) !== String(m.dates)) fail(file, "`dates` must be in ascending order");
  }

  if (m.tag !== undefined) fail(file, "`tag` was removed from the contract — delete it (see Known warts)");
  if (m.date !== undefined || m.published !== undefined)
    fail(file, "`date`/`published` were removed — `dates` is the single source");

  if (!Array.isArray(m.variants) || !m.variants.length) return fail(file, "`variants` must have at least one entry");

  m.variants.forEach((v, i) => {
    const at = `variant ${i} (${v.name || "unnamed"})`;
    if (!v.name) fail(file, `${at}: missing \`name\``);
    if (typeof v.mount !== "function") fail(file, `${at}: \`mount\` must be a function — there are no static entries`);
    if (!v.cost) fail(file, `${at}: missing \`cost\``);
    if (v.tone && !["brute", "opt"].includes(v.tone)) fail(file, `${at}: tone must be "brute" or "opt", got "${v.tone}"`);

    // `graded: false` opts a variant OUT of the official-test gate below. It is
    // the ONLY way to ship a code-bearing variant that doesn't answer the
    // grader, and it is deliberately narrow — see the official-test pass.
    if (v.graded !== undefined && v.graded !== false)
      fail(file, `${at}: \`graded\` may only be set to false — it opts a variant out of the official-test gate`);
    if (v.graded === false && isStepThrough(v))
      fail(file, `${at}: \`graded: false\` is meaningless on a step-through — only code-bearing variants are graded`);

    // code is present on every solution variant and absent from every
    // step-through — the debugger renders its own source.
    if (isStepThrough(v)) {
      if (v.code) fail(file, `${at}: step-throughs must NOT carry \`code\` — the debugger renders its own source`);
      // "line-by-line" is the default (53 of 109), but a step-through may name
      // what it actually emphasises instead — "call stack" for a recursive
      // trace, "cache hit" for a memo one. That's an improvement, not drift.
      if (v.cost !== "line-by-line")
        warn(file, `${at}: cost "${v.cost}" instead of the usual "line-by-line" — fine if it names what the trace emphasises`);
    } else if (!v.code) {
      fail(file, `${at}: solution variants must carry \`code\``);
    }
  });

  // Per-approach debuggers use "Step: <lowercase phrase>"; single-approach
  // modules use exactly "Solution" and "Step through".
  m.variants.filter(isStepThrough).forEach((v) => {
    if (v.name === "Step through") return;
    const mm = /^Step: (.+)$/.exec(v.name);
    if (!mm) fail(file, `"${v.name}": step-through must be "Step through" or "Step: <phrase>"`);
    else if (mm[1][0] !== mm[1][0].toLowerCase())
      fail(file, `"${v.name}": the phrase after "Step: " must be lowercase`);
  });

  // tone is functional (it tints the pill + cost badge) and marks a PAIR, so a
  // brute needs an opt and vice versa. Untoned extras are allowed: `320` ships a
  // fifth, unpaired step-through explaining the antigen rule.
  const tones = new Set(m.variants.map((v) => v.tone).filter(Boolean));
  if (tones.size === 1)
    fail(file, `has \`tone: "${[...tones][0]}"\` variants but no counterpart — tone marks a brute/opt pair`);

  // Kit custom properties are the design system; a module may read them but
  // never redefine them.
  const KIT_PROPS = /(^|[^-\w])--(bg|panel|panel-2|border|text|muted|accent|good|warn|danger|c[1-6]|sans|mono|r)\s*:/;
  src.split("\n").forEach((line, i) => {
    if (KIT_PROPS.test(line) && !line.trim().startsWith("//"))
      fail(file, `line ${i + 1} redefines a kit custom property — read them, never redefine`);
  });
}

// ── run ─────────────────────────────────────────────────────────────────────
const files = (await readdir(CHALLENGES)).filter((f) => f.endsWith(".js")).sort();
const loaded = [];

for (const file of files) {
  try {
    const { mod, src } = await loadModule(file);
    checkHeader(file, src);
    checkModule(file, mod, src);
    if (mod) loaded.push({ file, m: mod });
  } catch (e) {
    fail(file, `failed to load — ${e.message}`);
  }
}

// Cross-file: uniqueness, registry, patterns.
const seenId = new Map(), seenN = new Map();
for (const { file, m } of loaded) {
  if (seenId.has(m.id)) fail(file, `duplicate id "${m.id}" (also in ${seenId.get(m.id)})`);
  else seenId.set(m.id, file);
  const key = `${m.source || "fcc"}#${m.n}`;
  if (seenN.has(key)) fail(file, `duplicate challenge number ${key} (also in ${seenN.get(key)})`);
  else seenN.set(key, file);
}

const registry = await readFile(join(HERE, "registry.js"), "utf8");
for (const { file } of loaded) {
  if (!registry.includes(`./challenges/${file}`)) fail("registry.js", `no import for ${file}`);
}
// Every imported binding must also appear in the exported array.
for (const [, binding] of registry.matchAll(/^import\s+(\w+)\s+from\s+"\.\/challenges\//gm)) {
  const arrayBody = registry.slice(registry.indexOf("export default ["));
  if (!new RegExp(`\\b${binding}\\b`).test(arrayBody))
    fail("registry.js", `\`${binding}\` is imported but missing from the exported array`);
}

const patternsSrc = await readFile(join(HERE, "patterns.js"), "utf8");
const { SPOT } = await import("data:text/javascript," + encodeURIComponent(patternsSrc));
for (const { file, m } of loaded) {
  const entry = SPOT[m.id];
  if (!entry) fail(file, `no SPOT entry for id "${m.id}" in patterns.js — it would silently degrade to "Direct"`);
  else if (!CANONICAL.has(entry.pattern))
    fail("patterns.js", `"${m.id}": pattern "${entry.pattern}" is not canonical — it falls out of the filter bar`);
  else if (!entry.spot) fail("patterns.js", `"${m.id}": empty \`spot\` clue`);
}
for (const id of Object.keys(SPOT))
  if (!seenId.has(id)) fail("patterns.js", `SPOT entry "${id}" matches no module`);

// ── official tests ──────────────────────────────────────────────────────────
// CONTRIBUTING Tier 1 §3: "Each variant must pass every official test the source
// publishes. All of them, not most of them." This is the one hard rule that used
// to have no enforcement, and it is exactly the rule that let `304` ship a brute
// variant returning the itinerary LIST where the grader wants a count, and `321`
// ship a `code` block with its data elided to `/* …118 symbols… */`.
//
// Each code-bearing variant is written to a temp .ts (Node strips the types
// natively) and run against freeCodeCamp's LITERAL assertions, vendored in
// official-tests.json by fetch-official.mjs. No network here — run that script
// when you add a challenge.
const ASSERT = {
  equal: (a, b, m) => assert.strictEqual(a, b, m),
  strictEqual: (a, b, m) => assert.strictEqual(a, b, m),
  deepEqual: (a, b, m) => assert.deepStrictEqual(a, b, m),
  deepStrictEqual: (a, b, m) => assert.deepStrictEqual(a, b, m),
  isTrue: (a, m) => assert.strictEqual(a, true, m),
  isFalse: (a, m) => assert.strictEqual(a, false, m),
  isOk: (a, m) => assert.ok(a, m),
  isNotOk: (a, m) => assert.ok(!a, m),
  // #21 is the first challenge whose grader cannot compare against a fixed answer
  // — the output is random, so its tests assert PROPERTIES instead: a length, a
  // strict ordering between channels, and that two calls differ.
  isAbove: (a, b, m) => assert.ok(a > b, m),
  lengthOf: (a, n, m) => assert.strictEqual(a.length, n, m),
  // Loose on purpose, unlike `equal` above. chai's notEqual is `!=`, and here the
  // strict form would be the WEAKER assertion — it passes on operands the grader
  // would have called equal, quietly widening the gate instead of narrowing it.
  notEqual: (a, b, m) => assert.ok(a != b, m),
};

let officialFixtures = null;
try {
  officialFixtures = JSON.parse(await readFile(join(HERE, "official-tests.json"), "utf8"));
} catch {
  warn("official-tests.json", "missing or unreadable — run `node fetch-official.mjs`; the Tier 1 §3 gate is SKIPPED");
}

let asserted = 0;
const exempt = [];

if (officialFixtures) {
  const tmp = await mkdtemp(join(tmpdir(), "cc-check-"));
  for (const { file, m } of loaded) {
    if ((m.source || "fcc") !== "fcc") continue; // no daily API for LeetCode et al.
    const fx = officialFixtures[m.dates[0]];
    if (!fx) { warn(file, `no official fixture for ${m.dates[0]} — run \`node fetch-official.mjs\``); continue; }

    for (const [i, v] of m.variants.entries()) {
      if (isStepThrough(v) || !v.code) continue;
      const at = `variant ${i} (${v.name})`;
      if (v.graded === false) { exempt.push(`${file}: ${at}`); continue; }

      const path = join(tmp, `${m.n}-${i}.ts`);
      await writeFile(path, `${v.code}\nexport { ${fx.fn} };\n`);

      let fn;
      try {
        fn = (await import(path))[fx.fn];
      } catch (e) {
        // A `code` block that can't even load is not copy-pasteable — the exact
        // shape `321` shipped for months.
        fail(file, `${at}: \`code\` does not run standalone — ${e.message.split("\n")[0]}`);
        continue;
      }
      if (typeof fn !== "function") {
        fail(file, `${at}: \`code\` never defines ${fx.fn}(), the function #${fx.n} is graded on — if this variant deliberately doesn't answer the grader, mark it \`graded: false\``);
        continue;
      }

      const failed = [];
      for (const t of fx.tests) {
        asserted++;
        try { new Function("assert", fx.fn, t.assert)(ASSERT, fn); }
        catch (e) { failed.push(`${t.text} — ${e.message.split("\n")[0]}`); }
      }
      if (failed.length)
        fail(file, `${at}: fails ${failed.length}/${fx.tests.length} official #${fx.n} tests — ${failed[0]}`);
    }
  }
}

// ── report ──────────────────────────────────────────────────────────────────
const variants = loaded.reduce((s, x) => s + x.m.variants.length, 0);
const twoApproach = loaded.filter((x) => x.m.variants.some((v) => v.tone === "opt")).length;
const steps = loaded.reduce((s, x) => s + x.m.variants.filter(isStepThrough).length, 0);

console.log(`\n  ${loaded.length} modules · ${variants} variants · ${steps} step-throughs · ${twoApproach} two-approach`);
console.log(`  (CONTRIBUTING quotes these counts — refresh them there when this moves)`);
console.log(`  ${asserted} official assertions run${exempt.length ? `, ${exempt.length} variant(s) exempt via \`graded: false\`` : ""}\n`);

// Exemptions are legitimate but must never be invisible — an unreviewed opt-out
// is how the gate quietly stops meaning anything.
if (exempt.length) {
  console.log(`  \`graded: false\` — deliberately not answering the grader:`);
  exempt.forEach((e) => console.log(`    · ${e}`));
  console.log("");
}

if (warnings.length) {
  console.warn(`! ${warnings.length} note${warnings.length === 1 ? "" : "s"} (not failures):\n`);
  warnings.forEach((w) => console.warn(`  · ${w}`));
  console.warn("");
}

if (problems.length) {
  console.error(`✗ ${problems.length} problem${problems.length === 1 ? "" : "s"}:\n`);
  problems.forEach((p) => console.error(`  · ${p}`));
  console.error(`\n  These are the mechanical rules only. Read CONTRIBUTING.md for the ones`);
  console.error(`  that need judgement — is each variant a real approach, do the presets`);
  console.error(`  teach, does every note explain *why*.\n`);
  process.exit(1);
}
console.log("✓ all mechanical checks pass\n");
