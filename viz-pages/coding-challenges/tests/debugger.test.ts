import { describe, it, expect } from "bun:test";
import { open, pick, type, dbg } from "./helpers.ts";

// The step-through debugger is one engine (shared.ts mountDebugger) behind 160 traces. These tests drive it as a user does,
// on a numeric input (Factorializer), a text input (camelCase) and a two-value text input (Mile Pace).

describe("the step-through debugger on a number input", () => {
  const openFactorial = () => open({ tab: "factorial", v: 1 });

  it("should walk to the answer one step at a time and show it", async () => {
    // GIVEN the Factorializer step-through on its default, n = 20
    const page = await openFactorial();
    expect(await dbg.count(page)).toMatch(/^step 1 \/ (\d+)$/);
    const total = +(await dbg.count(page)).split("/")[1]!;

    // WHEN the user steps to the end
    await dbg.toEnd(page);

    // THEN it reads the last step and shows 20! = 2,432,902,008,176,640,000 as the return value
    expect(await dbg.count(page)).toBe(`step ${total} / ${total}`);
    expect(await dbg.out(page)).toBe("2,432,902,008,176,640,000");
    // AND Step is off at the end, Back is on
    expect(await page.$$eval(".problem.active .dbg-btn", (b) => b.map((x) => [x.textContent!.trim(), (x as HTMLButtonElement).disabled]))).toEqual([
      ["⏮ Reset", false], ["◀ Back", false], ["Step ▶", true], ["▶ Auto", false]]);
    expect(page.errors).toEqual([]);
  });

  it("should go back a step and reset to the first", async () => {
    // GIVEN the Factorializer stepped to the end
    const page = await openFactorial();
    const total = +(await dbg.count(page)).split("/")[1]!;
    await dbg.toEnd(page);

    // WHEN the user goes back once
    await dbg.btn(page, "Back");
    // THEN it is one step short of the end and the return value is gone
    expect(await dbg.count(page)).toBe(`step ${total - 1} / ${total}`);
    expect(await page.$(".problem.active .dbg-out")).toBeNull();

    // WHEN the user resets
    await dbg.btn(page, "Reset");
    // THEN it is on step 1 with Back and Reset off
    expect(await dbg.count(page)).toBe(`step 1 / ${total}`);
    expect(await page.$$eval(".problem.active .dbg-btn", (b) => b.map((x) => (x as HTMLButtonElement).disabled))).toEqual([true, true, false, false]);
  });

  it("should jump to a step from the scrubber", async () => {
    // GIVEN the Factorializer at step 1
    const page = await openFactorial();
    const total = +(await dbg.count(page)).split("/")[1]!;

    // WHEN the user drags the scrubber to the last step
    await type(page, ".problem.active .dbg-scrub", total - 1);

    // THEN it is on the last step, showing the answer
    expect(await dbg.count(page)).toBe(`step ${total} / ${total}`);
    expect(await dbg.out(page)).toBe("2,432,902,008,176,640,000");
  });

  it("should load a preset and answer for it", async () => {
    // GIVEN the Factorializer step-through
    const page = await openFactorial();

    // WHEN the user clicks the preset 5 and runs to the end
    await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".problem.active .demo .chip")].find((c) => c.textContent === "5")!.click());
    await dbg.toEnd(page);

    // THEN the input says 5 and the answer is 120
    expect(await page.$eval(dbg.input, (i) => (i as HTMLInputElement).value)).toBe("5");
    expect(await dbg.out(page)).toBe("120");
  });

  it("should clamp a number outside the allowed range and answer for the clamped one", async () => {
    // GIVEN the Factorializer, which allows 0 to 25
    const page = await openFactorial();

    // WHEN the user types 99, then -4
    await type(page, dbg.input, 99);
    await dbg.toEnd(page);
    // THEN it is clamped to 25 and 25! is shown (an integer beyond exact range, printed as the debugger prints it)
    expect(await page.$eval(dbg.input, (i) => (i as HTMLInputElement).value)).toBe("25");
    const at25 = await dbg.out(page);
    await type(page, dbg.input, -4);
    await dbg.toEnd(page);
    expect(await page.$eval(dbg.input, (i) => (i as HTMLInputElement).value)).toBe("0");
    // AND 0! is 1
    expect(await dbg.out(page)).toBe("1");
    expect(at25).not.toBe("1");
  });

  it("should play through by itself and stop at the end", async () => {
    // GIVEN the Factorializer at n = 1, a short run
    const page = await openFactorial();
    await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".problem.active .demo .chip")].find((c) => c.textContent === "1")!.click());
    const total = +(await dbg.count(page)).split("/")[1]!;

    // WHEN the user presses Auto
    await dbg.btn(page, "Auto");

    // THEN it advances by itself to the last step, showing the answer, and the button goes back to "Auto"
    await page.waitForFunction((t) => document.querySelector(".problem.active .dbg-count")!.textContent === `step ${t} / ${t}`, { timeout: 20_000 }, total);
    expect(await dbg.out(page)).toBe("1");
    expect(await page.$$eval(".problem.active .dbg-btn", (b) => b[3]!.textContent!.trim())).toBe("▶ Auto");
  });

  it("should move the line cursor and show the variables as it steps", async () => {
    // GIVEN the Factorializer at step 1
    const page = await openFactorial();
    const lineOn = () => page.$$eval(".problem.active .dbg-line.on", (l) => l.map((x) => (x as HTMLElement).dataset.ln));
    const first = await lineOn();

    // WHEN the user steps once, then to the end
    await dbg.btn(page, "Step");
    const second = await lineOn();
    await dbg.toEnd(page);

    // THEN exactly one line is lit each time, and it moved between the steps
    expect(first.length).toBe(1);
    expect(second.length).toBe(1);
    expect(await lineOn()).toHaveLength(1);
    expect(second).not.toEqual(first);
    // AND the frame shows the function's variables, including result
    expect(await page.$$eval(".problem.active .dbg-var .lbl", (l) => l.map((x) => x.textContent))).toContain("result");
  });
});

describe("the step-through debugger on a text input", () => {
  it("should run what the user types and show its answer on Enter", async () => {
    // GIVEN the camelCase step-through
    const page = await open({ tab: "camelcase", v: 1 });

    // WHEN the user types "make-it__camel case" and presses Enter, then steps to the end
    await page.$eval(dbg.input, (i) => { (i as HTMLInputElement).value = "make-it__camel case"; });
    await page.focus(dbg.input);
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector(".problem.active .dbg-count")!.textContent!.startsWith("step 1 /"));
    await dbg.toEnd(page);

    // THEN it returns makeItCamelCase
    expect(await dbg.out(page)).toBe('"makeItCamelCase"');
  });

  it("should answer each preset with its own answer", async () => {
    // GIVEN the camelCase step-through
    const page = await open({ tab: "camelcase", v: 1 });

    // WHEN the user loads the "-hello_world-" preset chip and runs it
    await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".problem.active .demo .chip")].find((c) => c.textContent === "-hello_world-")!.click());
    await dbg.toEnd(page);

    // THEN the input shows it and the answer is helloWorld
    expect(await page.$eval(dbg.input, (i) => (i as HTMLInputElement).value)).toBe("-hello_world-");
    expect(await dbg.out(page)).toBe('"helloWorld"');
  });

  it("should take two values in one box for Mile Pace", async () => {
    // GIVEN the Mile Pace step-through, which reads "miles / MM:SS"
    const page = await open({ tab: "milepace", v: 1 });

    // WHEN the user enters 3 miles in 27:00 (1620 s / 3 = 540 s = 09:00) and steps to the end
    await page.$eval(dbg.input, (i) => { (i as HTMLInputElement).value = "3 / 27:00"; i.dispatchEvent(new Event("change")); });
    await dbg.toEnd(page);

    // THEN the pace is 09:00
    expect(await dbg.out(page)).toBe('"09:00"');
  });
});

describe("a Solution demo that computes from what the user types", () => {
  const rows = (page: Awaited<ReturnType<typeof open>>) => page.$eval("section.problem.active .demo", (d) => ({
    front: d.querySelector(".vb-cnt.front")!.textContent, back: d.querySelector(".vb-cnt.back")!.textContent,
    badge: d.querySelector(".badge")!.textContent, math: d.querySelector(".result-line .mono")!.textContent,
    meta: d.querySelector(".vb-meta")!.textContent!.replace(/\s+/g, " "),
  }));

  it("should count the vowels in each half of what the user types", async () => {
    // GIVEN the Vowel Balance solution demo
    const page = await open({ tab: "vowelbal" });

    // WHEN the user types "string" (front "str" has 0 vowels, back "ing" has 1)
    await type(page, "section.problem.active .demo input[type=text]", "string");
    // THEN it is not balanced: 0 !== 1
    expect(await rows(page)).toMatchObject({ front: "0 vowels", back: "1 vowel", badge: "false", math: "0 !== 1" });

    // WHEN the user types "puzzle" (front "puz" 1 vowel, back "zle" 1 vowel)
    await type(page, "section.problem.active .demo input[type=text]", "puzzle");
    // THEN it is balanced: 1 === 1
    expect(await rows(page)).toMatchObject({ front: "1 vowel", back: "1 vowel", badge: "true", math: "1 === 1" });
  });

  it("should skip the centre character of an odd-length string", async () => {
    // GIVEN the Vowel Balance solution demo
    const page = await open({ tab: "vowelbal" });

    // WHEN the user types "racecar" (7 letters: front "rac" has 1, back "car" has 1, the centre "e" is ignored)
    await type(page, "section.problem.active .demo input[type=text]", "racecar");

    // THEN the halves tie and index 3 is named as the ignored centre (a tile "e", then "index 3")
    const r = await rows(page);
    expect(r).toMatchObject({ front: "1 vowel", back: "1 vowel", badge: "true" });
    expect(r.meta).toContain("floor(7/2) = 3, ceil(7/2) = 4");
    expect(await page.$eval("section.problem.active .demo .vb-mid", (m) => m.textContent!.replace(/\s+/g, " ").trim())).toBe("ignoredeindex 3");
  });

  it("should fill the box and recompute from a chip", async () => {
    // GIVEN the Vowel Balance solution demo
    const page = await open({ tab: "vowelbal" });

    // WHEN the user clicks the "Kitty Ipsum" chip (front "Kitty" has 1 vowel, back "Ipsum" has 2; odd length 11)
    await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("section.problem.active .demo .chip")].find((c) => c.textContent!.includes("Kitty␣Ipsum"))!.click());

    // THEN the box holds it and the answer is false, 1 !== 2
    expect(await page.$eval("section.problem.active .demo input[type=text]", (i) => (i as HTMLInputElement).value)).toBe("Kitty Ipsum");
    expect(await rows(page)).toMatchObject({ badge: "false", math: "1 !== 2" });
  });
});

describe("every demo in the gallery", () => {
  it("should mount without an error and accept its own input, on every challenge and approach", async () => {
    // GIVEN the page
    const page = await open();
    const bad: string[] = [];
    const ids = await page.$$eval("#tabs .tab", (t) => t.map((x) => (x as HTMLElement).dataset.id!));

    for (const id of ids) {
      // WHEN the user opens each challenge and each of its approaches
      await pick(page, id);
      const pills = await page.$$eval("section.problem.active .vpill", (p) => p.length);
      for (let v = 0; v < Math.max(pills, 1); v++) {
        if (pills) await page.$$eval("section.problem.active .vpill", (p, i) => (p[i] as HTMLElement).click(), v);
        // AND nudges each of its inputs the way typing does
        await page.$$eval("section.problem.active .demo input", (inputs) => inputs.forEach((i) => i.dispatchEvent(new Event("input", { bubbles: true }))));
        // THEN the demo shows no error note and is not empty
        const state = await page.$eval("section.problem.active .demo", (d) => ({ err: d.querySelector(".note")?.textContent?.startsWith("demo error") ? d.querySelector(".note")!.textContent : null, empty: d.children.length === 0 }));
        if (state.err || state.empty) bad.push(`${id} approach ${v + 1}: ${state.err ?? "empty demo"}`);
      }
    }
    expect(bad).toEqual([]);
    expect(page.errors).toEqual([]);
  }, 120_000);
});
