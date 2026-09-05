// fetch-official.mjs — refresh `official-tests.json`, the vendored copy of every
// official freeCodeCamp assertion the gallery is graded against.
//
//   node fetch-official.mjs
//
// `check.mjs` runs those assertions against each variant's `code` (CONTRIBUTING
// Tier 1 §3). It must stay hermetic — no network, no deps — so the tests are
// vendored here rather than fetched at check time. This script is the only part
// that touches the network, and you only run it when adding a challenge.
//
// It derives the dates to fetch from the modules themselves (`dates[0]` of every
// freeCodeCamp entry), so a new module's fixture is picked up automatically.
import { readFile, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const API = "https://api.freecodecamp.org/daily-coding-challenge/date/";

// Same stub trick check.mjs uses — modules import ../shared.js, which imports
// /_kit/viz.js, a path only the dev server resolves.
globalThis.document = {
  head: { append() {} },
  createElement: () => ({ classList: { toggle() {}, add() {}, remove() {} }, append() {}, querySelectorAll: () => [], style: {} }),
  querySelectorAll: () => [],
};
const STUB_URL = "data:text/javascript," + encodeURIComponent(`
export const el = () => ({ append() {}, classList: { toggle() {} } });
export const esc = (s) => s; export const hl = (s) => s; export const codeBlock = (s) => s;
export const mountDebugger = () => {}; export const mountGallery = () => {};
export const $ = () => null; export const $$ = () => [];
`);

const files = (await readdir(join(HERE, "challenges"))).filter((f) => f.endsWith(".js")).sort();
const wanted = new Map(); // date -> challenge number, for a friendlier failure message

for (const file of files) {
  const src = await readFile(join(HERE, "challenges", file), "utf8");
  const mod = (await import("data:text/javascript," + encodeURIComponent(
    src.replace(/from\s+["']\.\.\/shared\.js["']/g, `from "${STUB_URL}"`)
  ))).default;
  if ((mod.source || "fcc") !== "fcc") continue; // LeetCode et al. have no daily API
  for (const d of mod.dates) wanted.set(d, mod.n);
}

const out = {};
for (const [date, n] of [...wanted].sort()) {
  const res = await fetch(API + date);
  if (!res.ok) { console.error(`  ✗ #${n} ${date}: HTTP ${res.status}`); continue; }
  const j = await res.json();
  // The seed declares the exact function name the grader calls.
  const fn = j.javascript.challengeFiles[0].contents.match(/function\s+(\w+)/)?.[1];
  out[date] = {
    n: j.challengeNumber,
    title: j.title,
    fn,
    // testString is the LITERAL assertion the grader runs — keep it verbatim.
    tests: j.javascript.tests.map((t) => ({
      text: t.text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(),
      assert: t.testString,
    })),
  };
  console.log(`  ✓ #${j.challengeNumber} ${date} ${j.title} — ${out[date].tests.length} tests → ${fn}()`);
}

await writeFile(join(HERE, "official-tests.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`\n  wrote official-tests.json — ${Object.keys(out).length} dates\n`);
