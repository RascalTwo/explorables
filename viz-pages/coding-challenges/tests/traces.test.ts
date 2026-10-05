import { describe, it, expect } from "bun:test";
import { debuggers, challenges, type Debugger } from "./capture.ts";

// Every step-through in the gallery (160 of them across 123 challenges) runs a hand-written trace(): a list of steps whose
// last one carries the answer the user reads under "Return value". Nothing else in the repo runs a trace, and a wrong one
// looks exactly like a right one. These tests read the real traces, no browser.

const inputsOf = (d: Debugger) =>
  [d.cfg.input?.value, ...(d.cfg.input?.presets ?? [])].filter((x) => x !== undefined);
// LeetCode #39 and freeCodeCamp #39 share a number, so a challenge is keyed by source too: "fcc#39", "leetcode#39".
const keyOf = (c: { n: number; source?: string }) => `${c.source ?? "fcc"}#${c.n}`;
const label = (d: Debugger) => `${keyOf(d.challenge)} ${d.variant}`;
const lastOf = (d: Debugger, input: number | string) => {
  const s = d.cfg.trace(input);
  return s.at(-1)!;
};
const byChallenge = (n: number, source = "fcc") =>
  debuggers.filter((d) => keyOf(d.challenge) === `${source}#${n}`);
const finalText = (n: number, variant: RegExp, input: number | string) => {
  const d = byChallenge(n).find((x) => variant.test(x.variant));
  if (!d) throw new Error(`no step-through matching ${variant} in #${n}`);
  return String(lastOf(d, input).result);
};

describe("the step-through inventory", () => {
  it("should find a step-through for every challenge in the gallery", () => {
    // GIVEN the registry
    // WHEN the step-throughs are collected
    const withDebugger = new Set(debuggers.map((d) => d.challenge.id));
    // THEN every one of the 123 challenges has one and none was lost to a module that would not load
    expect(challenges.length).toBe(123);
    expect(challenges.filter((c) => !withDebugger.has(c.id)).map((c) => c.id)).toEqual([]);
    expect(debuggers.length).toBe(160);
  });
});

describe("every trace", () => {
  it("should run on its default input and every preset, and end with the answer", () => {
    // GIVEN each step-through with its default input and its preset chips
    const problems: string[] = [];
    for (const d of debuggers) {
      for (const input of inputsOf(d)) {
        // WHEN the user loads that input
        let steps;
        try {
          steps = d.cfg.trace(input);
        } catch (e) {
          problems.push(`${label(d)} on ${JSON.stringify(input)} threw ${String(e)}`);
          continue;
        }
        const last = steps.at(-1);
        // THEN there is at least one step and the last one is "done" with a result (or the demo says why it stopped)
        if (!last) {
          problems.push(`${label(d)} on ${JSON.stringify(input)}: no steps`);
          continue;
        }
        const stopsOnPurpose =
          keyOf(d.challenge) === "fcc#27" &&
          d.variant.includes("transpose, then reverse") &&
          String(input)
            .split(";")
            .some((r) => r.split(",").length !== String(input).split(";").length);
        if (!stopsOnPurpose && (!last.done || last.result === undefined))
          problems.push(
            `${label(d)} on ${JSON.stringify(input)}: last step is not done, or has no result`,
          );
      }
    }
    expect(problems).toEqual([]);
  });

  it("should stop on purpose when the in-place rotation is handed a matrix that is not square", () => {
    // GIVEN the #27 in-place variant
    const d = byChallenge(27).find((x) => x.variant.includes("transpose, then reverse"))!;
    // WHEN it is given a 2x3 grid, then a 2x2 grid
    const wide = d.cfg.trace("1,2,3;4,5,6"),
      square = d.cfg.trace("1,2;3,4");
    // THEN the wide one halts short of an answer and the square one rotates clockwise
    expect(wide.at(-1)!.done).toBeFalsy();
    expect(String(square.at(-1)!.result).replaceAll(/\s/gu, "")).toBe("[[3,1],[4,2]]");
  });

  it("should point every step at a line that exists in the source listing", () => {
    // GIVEN each trace on each input
    const bad: string[] = [];
    for (const d of debuggers) {
      const lines = new Set(d.cfg.source.map((s) => s.ln));
      for (const input of inputsOf(d)) {
        d.cfg.trace(input).forEach((s, i) => {
          if (!lines.has(s.line))
            bad.push(`${label(d)} ${JSON.stringify(input)} step ${i + 1} -> line ${s.line}`);
        });
      }
    }
    // THEN none points off the listing (the cursor would silently light nothing)
    expect(bad).toEqual([]);
  });

  // Steps whose focus names a token the line does not carry, so the spotlight lights nothing. Cosmetic, known: a new one
  // fails the test; fixing one only shortens this list.
  const SPOTLIGHT_MISSES = new Set([
    `leetcode#39 Step: recurse line 16 focus "pop"`,
    `fcc#13 Step: divide by every d line 3 focus "mod"`,
    `fcc#13 Step: stop at √n line 3 focus "mod"`,
    `fcc#13 Step: stop at √n line 4 focus "mod"`,
    `fcc#13 Step: stop at √n line 4 focus "ret"`,
    `fcc#293 Step: rescan line 16 focus "di"`,
    `fcc#307 Step through line 12 focus "push"`,
    `fcc#354 Step through line 3 focus "calls"`,
    `fcc#365 Step: free search line 13 focus "cols"`,
    `fcc#365 Step: free search line 18 focus "budget"`,
    `fcc#365 Step: free search line 14 focus "prune"`,
    `leetcode#39 Step: every ordering line 16 focus "pop"`,
  ]);
  it("should spotlight a token that is on the line it names, apart from the known misses", () => {
    // GIVEN each trace on each input
    const bad = new Set<string>();
    for (const d of debuggers) {
      for (const input of inputsOf(d)) {
        for (const s of d.cfg.trace(input)) {
          if (!s.focus) continue;
          const html = d.cfg.source.find((x) => x.ln === s.line)?.html ?? "";
          if (!html.includes(`data-t="${s.focus}"`))
            bad.add(`${label(d)} line ${s.line} focus "${s.focus}"`);
        }
      }
    }
    // THEN nothing new misses
    expect([...bad].filter((x) => !SPOTLIGHT_MISSES.has(x))).toEqual([]);
  });

  it.todo(
    'should light a token on every step that names one (possible bug: 12 steps in #13, #39 LeetCode, #293, #307, #354, #365 name a token their line lacks, e.g. challenges/039-combination-sum.ts:397 has no data-t="pop")',
  );

  it("should keep every preset chip inside its input's min and max", () => {
    // GIVEN each numeric input with a range
    const off: string[] = [];
    for (const d of debuggers) {
      const { min, max } = d.cfg.input ?? {};
      for (const p of d.cfg.input?.presets ?? []) {
        if (
          typeof p === "number" &&
          ((min !== undefined && p < min) || (max !== undefined && p > max))
        )
          off.push(`${label(d)} preset ${p} outside ${min}..${max}`);
      }
      // THEN a chip never gets silently clamped to a different case than the one it shows
    }
    expect(off).toEqual([]);
  });

  it("should give the same answer twice for the same input", () => {
    // GIVEN each trace (except #21, which draws random colours on purpose)
    const differ: string[] = [];
    for (const d of debuggers.filter((x) => keyOf(x.challenge) !== "fcc#21")) {
      for (const input of inputsOf(d)) {
        const first = String(lastOf(d, input).result),
          second = String(lastOf(d, input).result);
        if (first !== second) differ.push(`${label(d)} ${JSON.stringify(input)}`);
      }
    }
    // THEN none changes between runs
    expect(differ).toEqual([]);
  });
});

describe("challenges with two independent step-throughs", () => {
  // Same challenge, same input, two different algorithms: they must land on the same answer. Left out, each for its reason:
  // #21 is random; #309 is built to differ (default sort vs numeric sort); #318, #320, #329 phrase or ask their result differently;
  // #341, #343, #356, #363, #365 read a case NUMBER whose meaning differs between the two variants.
  const DIFFER_BY_DESIGN = new Set(
    [21, 27, 309, 318, 320, 329, 341, 343, 356, 363, 365].map((n) => `fcc#${n}`),
  );

  it("should agree on the answer for every preset", () => {
    // GIVEN each challenge that has two or more step-throughs, minus the designed exceptions
    const disagree: string[] = [];
    let compared = 0;
    for (const c of challenges.filter((x) => !DIFFER_BY_DESIGN.has(keyOf(x)))) {
      const ds = debuggers.filter((d) => d.challenge === c);
      if (ds.length < 2) continue;
      for (const input of inputsOf(ds[0]!)) {
        // WHEN each is run on the same input
        const answers = ds.map((d) => String(lastOf(d, input).result));
        compared++;
        // THEN they all read the same
        if (new Set(answers).size > 1)
          disagree.push(`${keyOf(c)} ${JSON.stringify(input)}: ${answers.join(" vs ")}`);
      }
    }
    expect(disagree).toEqual([]);
    expect(compared).toBeGreaterThan(80);
  });
});

describe("answers worked out by hand", () => {
  // Each expected value is derived independently of the code (the arithmetic is in the comment).
  const cases: [string, number, RegExp, number | string, string][] = [
    // 5! = 120; 20! = 2432902008176640000; 0! = 1 (the empty product). The trace prints the number with thousands separators.
    ["factorial of 5", 8, /Step through/u, 5, "120"],
    ["factorial of 20", 8, /Step through/u, 20, "2,432,902,008,176,640,000"],
    ["factorial of 0", 8, /Step through/u, 0, "1"],
    // 97 is prime; 91 = 7 x 13 is not; 2 is the smallest prime; 1 is not prime (both algorithms).
    ["97 is prime by trial division", 13, /divide by every d/u, 97, "true"],
    ["91 is not prime by trial division", 13, /divide by every d/u, 91, "false"],
    ["91 is not prime by square root", 13, /stop at/u, 91, "false"],
    // X=10, C=100, XC=90 so XCIX = 90 + 9 = 99 (both roman variants); MCMXCIV = 1000 + 900 + 90 + 4 = 1994.
    ["XCIX is 99", 28, /probe the table/u, "XCIX", "99"],
    ["MCMXCIV is 1994", 28, /peek at the neighbour/u, "MCMXCIV", "1994"],
    // "FREE cODE cAMP" lowercases to free code camp -> freeCodeCamp
    ["camelCase of FREE cODE cAMP", 15, /Step through/u, "FREE cODE cAMP", '"freeCodeCamp"'],
    ["camelCase drops the edge separators", 15, /Step through/u, "-hello_world-", '"helloWorld"'],
    // 4242 from the right: 2, 4x2=8, 2, 4x2=8 -> 20, divisible by 10 -> valid; 4243 -> 3+8+2+8 = 21 -> invalid.
    ["Luhn accepts 4242", 308, /Step through/u, "4242", "true"],
    ["Luhn rejects 4243", 308, /Step through/u, "4243", "false"],
    // 26.2 miles in 120:35 = 7235 s; 7235 / 26.2 = 276.1 s = 4:36 per mile.
    ["a marathon in 120:35 is a 04:36 mile", 11, /Step through/u, "26.2 / 120:35", '"04:36"'],
    // "By the way" -> B, T, W
    ["acronym of By the way", 29, /Step through/u, "By the way", '"BTW"'],
    // [1,2,3,4,1,2]: 1 and 2 occur twice
    ["duplicates in 1,2,3,4,1,2", 20, /re-scan/u, "1,2,3,4,1,2", "[1, 2]"],
    // even-length "string": front half "str" has 0 vowels, back half "ing" has 1 -> not balanced; "racecar": "rac"=1, "car"=1 -> balanced
    ["vowel balance case 1 racecar", 1, /Step through/u, 1, "true"],
    ["vowel balance case 4 string", 1, /Step through/u, 4, "false"],
  ];
  for (const [title, n, variant, input, want] of cases) {
    it.concurrent(`should show ${title}`, () => {
      // GIVEN the step-through for the challenge
      // WHEN the user runs it on that input
      const shown = finalText(n, variant, input);
      // THEN the Return value is the hand-worked answer
      expect(shown).toBe(want);
    });
  }
});
