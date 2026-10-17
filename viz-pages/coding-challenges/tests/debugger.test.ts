import { describe, it, expect } from "bun:test";
import { open, pick, type, value, dataset, dbg } from "./helpers.ts";

// The step-through debugger is one engine (shared.ts mountDebugger) behind 160 traces. These tests drive it as a user does,
// on a numeric input (Factorializer), a text input (camelCase) and a two-value text input (Mile Pace).

describe("the step-through debugger on a number input", () => {
  const openFactorial = async () => {
    const page = await open({ tab: "factorial", v: 1 });
    return page;
  };

  it("should walk to the answer one step at a time and show it", async () => {
    const { page, total } = await viz.given(
      "the Factorializer step-through on its default, n = 20",
      async () => {
        const p = await openFactorial();
        expect(await dbg.count(p)).toMatch(/^step 1 \/ (\d+)$/u);
        const t = +(await dbg.count(p)).split("/")[1]!;
        return { page: p, total: t };
      },
    );

    await viz.when("the user steps to the end", async () => {
      await dbg.toEnd(page);
    });

    await viz.then(
      "it reads the last step and shows 20! = 2,432,902,008,176,640,000 as the return value, Step is off at the end, Back is on",
      async () => {
        expect(await dbg.count(page)).toBe(`step ${total} / ${total}`);
        expect(await dbg.out(page)).toBe("2,432,902,008,176,640,000");
        expect(
          await page.$$eval(".problem.active .dbg-btn", (b) =>
            b.map((x) => [x.textContent.trim(), x.matches(":disabled")]),
          ),
        ).toEqual([
          ["⏮ Reset", false],
          ["◀ Back", false],
          ["Step ▶", true],
          ["▶ Auto", false],
        ]);
        expect(page.errors).toEqual([]);
      },
    );
  });

  it("should go back a step and reset to the first", async () => {
    const { page, total } = await viz.given("the Factorializer stepped to the end", async () => {
      const p = await openFactorial();
      const t = +(await dbg.count(p)).split("/")[1]!;
      await dbg.toEnd(p);
      return { page: p, total: t };
    });

    await viz.when("the user goes back once", async () => {
      await dbg.btn(page, "Back");
    });

    await viz.then("it is one step short of the end and the return value is gone", async () => {
      expect(await dbg.count(page)).toBe(`step ${total - 1} / ${total}`);
      expect(await page.$(".problem.active .dbg-out")).toBeNull();
    });

    await viz.when("the user resets", async () => {
      await dbg.btn(page, "Reset");
    });

    await viz.then("it is on step 1 with Back and Reset off", async () => {
      expect(await dbg.count(page)).toBe(`step 1 / ${total}`);
      expect(
        await page.$$eval(".problem.active .dbg-btn", (b) => b.map((x) => x.matches(":disabled"))),
      ).toEqual([true, true, false, false]);
    });
  });

  it("should jump to a step from the scrubber", async () => {
    const { page, total } = await viz.given("the Factorializer at step 1", async () => {
      const p = await openFactorial();
      const t = +(await dbg.count(p)).split("/")[1]!;
      return { page: p, total: t };
    });

    await viz.when("the user drags the scrubber to the last step", async () => {
      await type(page, ".problem.active .dbg-scrub", total - 1);
    });

    await viz.then("it is on the last step, showing the answer", async () => {
      expect(await dbg.count(page)).toBe(`step ${total} / ${total}`);
      expect(await dbg.out(page)).toBe("2,432,902,008,176,640,000");
    });
  });

  it("should load a preset and answer for it", async () => {
    const page = await viz.given("the Factorializer step-through", async () => {
      const p = await openFactorial();
      return p;
    });

    await viz.when("the user clicks the preset 5 and runs to the end", async () => {
      await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>(".problem.active .demo .chip")]
          .find((c) => c.textContent === "5")!
          .click(),
      );
      await dbg.toEnd(page);
    });

    await viz.then("the input says 5 and the answer is 120", async () => {
      expect(await value(page, dbg.input)).toBe("5");
      expect(await dbg.out(page)).toBe("120");
    });
  });

  it("should clamp a number outside the allowed range and answer for the clamped one", async () => {
    const page = await viz.given("the Factorializer, which allows 0 to 25", async () => {
      const p = await openFactorial();
      return p;
    });

    await viz.when("the user types 99", async () => {
      await type(page, dbg.input, 99);
      await dbg.toEnd(page);
    });

    const at25 = await viz.then(
      "it is clamped to 25 and 25! is shown (an integer beyond exact range, printed as the debugger prints it)",
      async () => {
        expect(await value(page, dbg.input)).toBe("25");
        const shown = await dbg.out(page);
        return shown;
      },
    );

    await viz.when("the user types -4", async () => {
      await type(page, dbg.input, -4);
      await dbg.toEnd(page);
    });

    await viz.then("it is clamped to 0 and 0! is 1", async () => {
      expect(await value(page, dbg.input)).toBe("0");
      expect(await dbg.out(page)).toBe("1");
      expect(at25).not.toBe("1");
    });
  });

  it("should play through by itself and stop at the end", async () => {
    const { page, total } = await viz.given("the Factorializer at n = 1, a short run", async () => {
      const p = await openFactorial();
      await p.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>(".problem.active .demo .chip")]
          .find((c) => c.textContent === "1")!
          .click(),
      );
      const t = +(await dbg.count(p)).split("/")[1]!;
      return { page: p, total: t };
    });

    await viz.when("the user presses Auto", async () => {
      await dbg.btn(page, "Auto");
    });

    await viz.then(
      'it advances by itself to the last step, showing the answer, and the button goes back to "Auto"',
      async () => {
        await page.waitForFunction(
          (t) =>
            document.querySelector(".problem.active .dbg-count")!.textContent ===
            `step ${t} / ${t}`,
          { timeout: 20_000 },
          total,
        );
        expect(await dbg.out(page)).toBe("1");
        expect(await page.$$eval(".problem.active .dbg-btn", (b) => b[3]!.textContent.trim())).toBe(
          "▶ Auto",
        );
      },
    );
  });

  it("should move the line cursor and show the variables as it steps", async () => {
    const { page, lineOn, first } = await viz.given("the Factorializer at step 1", async () => {
      const p = await openFactorial();
      const on = async () => {
        const l = await dataset(p, ".problem.active .dbg-line.on", "ln");
        return l;
      };
      const f = await on();
      return { page: p, lineOn: on, first: f };
    });

    const second = await viz.when("the user steps once, then to the end", async () => {
      await dbg.btn(page, "Step");
      const s = await lineOn();
      await dbg.toEnd(page);
      return s;
    });

    await viz.then(
      "exactly one line is lit each time and it moved between the steps, and the frame shows the function's variables, including result",
      async () => {
        expect(first.length).toBe(1);
        expect(second.length).toBe(1);
        expect(await lineOn()).toHaveLength(1);
        expect(second).not.toEqual(first);
        expect(
          await page.$$eval(".problem.active .dbg-var .lbl", (l) => l.map((x) => x.textContent)),
        ).toContain("result");
      },
    );
  });
});

describe("the step-through debugger on a text input", () => {
  it("should run what the user types and show its answer on Enter", async () => {
    const page = await viz.given("the camelCase step-through", async () => {
      const p = await open({ tab: "camelcase", v: 1 });
      return p;
    });

    await viz.when(
      'the user types "make-it__camel case" and presses Enter, then steps to the end',
      async () => {
        await page.$eval(dbg.input, (i) => {
          if (i instanceof HTMLInputElement) i.value = "make-it__camel case";
        });
        await page.focus(dbg.input);
        await page.keyboard.press("Enter");
        await page.waitForFunction(() =>
          document.querySelector(".problem.active .dbg-count")!.textContent.startsWith("step 1 /"),
        );
        await dbg.toEnd(page);
      },
    );

    await viz.then("it returns makeItCamelCase", async () => {
      expect(await dbg.out(page)).toBe('"makeItCamelCase"');
    });
  });

  it("should answer each preset with its own answer", async () => {
    const page = await viz.given("the camelCase step-through", async () => {
      const p = await open({ tab: "camelcase", v: 1 });
      return p;
    });

    await viz.when('the user loads the "-hello_world-" preset chip and runs it', async () => {
      await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>(".problem.active .demo .chip")]
          .find((c) => c.textContent === "-hello_world-")!
          .click(),
      );
      await dbg.toEnd(page);
    });

    await viz.then("the input shows it and the answer is helloWorld", async () => {
      expect(await value(page, dbg.input)).toBe("-hello_world-");
      expect(await dbg.out(page)).toBe('"helloWorld"');
    });
  });

  it("should take two values in one box for Mile Pace", async () => {
    const page = await viz.given(
      'the Mile Pace step-through, which reads "miles / MM:SS"',
      async () => {
        const p = await open({ tab: "milepace", v: 1 });
        return p;
      },
    );

    await viz.when(
      "the user enters 3 miles in 27:00 (1620 s / 3 = 540 s = 09:00) and steps to the end",
      async () => {
        await page.$eval(dbg.input, (i) => {
          if (i instanceof HTMLInputElement) {
            i.value = "3 / 27:00";
            i.dispatchEvent(new Event("change"));
          }
        });
        await dbg.toEnd(page);
      },
    );

    await viz.then("the pace is 09:00", async () => {
      expect(await dbg.out(page)).toBe('"09:00"');
    });
  });
});

describe("a Solution demo that computes from what the user types", () => {
  const rows = async (page: Awaited<ReturnType<typeof open>>) => {
    const r = await page.$eval("section.problem.active .demo", (d) => ({
      front: d.querySelector(".vb-cnt.front")!.textContent,
      back: d.querySelector(".vb-cnt.back")!.textContent,
      badge: d.querySelector(".badge")!.textContent,
      math: d.querySelector(".result-line .mono")!.textContent,
      meta: d.querySelector(".vb-meta")!.textContent.replaceAll(/\s+/gu, " "),
    }));
    return r;
  };

  it("should count the vowels in each half of what the user types", async () => {
    const page = await viz.given("the Vowel Balance solution demo", async () => {
      const p = await open({ tab: "vowelbal" });
      return p;
    });

    await viz.when(
      'the user types "string" (front "str" has 0 vowels, back "ing" has 1)',
      async () => {
        await type(page, "section.problem.active .demo input[type=text]", "string");
      },
    );

    await viz.then("it is not balanced: 0 !== 1", async () => {
      expect(await rows(page)).toMatchObject({
        front: "0 vowels",
        back: "1 vowel",
        badge: "false",
        math: "0 !== 1",
      });
    });

    await viz.when(
      'the user types "puzzle" (front "puz" 1 vowel, back "zle" 1 vowel)',
      async () => {
        await type(page, "section.problem.active .demo input[type=text]", "puzzle");
      },
    );

    await viz.then("it is balanced: 1 === 1", async () => {
      expect(await rows(page)).toMatchObject({
        front: "1 vowel",
        back: "1 vowel",
        badge: "true",
        math: "1 === 1",
      });
    });
  });

  it("should skip the centre character of an odd-length string", async () => {
    const page = await viz.given("the Vowel Balance solution demo", async () => {
      const p = await open({ tab: "vowelbal" });
      return p;
    });

    await viz.when(
      'the user types "racecar" (7 letters: front "rac" has 1, back "car" has 1, the centre "e" is ignored)',
      async () => {
        await type(page, "section.problem.active .demo input[type=text]", "racecar");
      },
    );

    await viz.then(
      'the halves tie and index 3 is named as the ignored centre (a tile "e", then "index 3")',
      async () => {
        const r = await rows(page);
        expect(r).toMatchObject({ front: "1 vowel", back: "1 vowel", badge: "true" });
        expect(r.meta).toContain("floor(7/2) = 3, ceil(7/2) = 4");
        expect(
          await page.$eval("section.problem.active .demo .vb-mid", (m) =>
            m.textContent.replaceAll(/\s+/gu, " ").trim(),
          ),
        ).toBe("ignoredeindex 3");
      },
    );
  });

  it("should fill the box and recompute from a chip", async () => {
    const page = await viz.given("the Vowel Balance solution demo", async () => {
      const p = await open({ tab: "vowelbal" });
      return p;
    });

    await viz.when(
      'the user clicks the "Kitty Ipsum" chip (front "Kitty" has 1 vowel, back "Ipsum" has 2; odd length 11)',
      async () => {
        await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>("section.problem.active .demo .chip")]
            .find((c) => c.textContent.includes("Kitty␣Ipsum"))!
            .click(),
        );
      },
    );

    await viz.then("the box holds it and the answer is false, 1 !== 2", async () => {
      expect(await value(page, "section.problem.active .demo input[type=text]")).toBe(
        "Kitty Ipsum",
      );
      expect(await rows(page)).toMatchObject({ badge: "false", math: "1 !== 2" });
    });
  });
});

describe("every demo in the gallery", () => {
  it("should mount without an error and accept its own input, on every challenge and approach", async () => {
    const { page, bad, ids } = await viz.given("the page", async () => {
      const p = await open();
      const problems: string[] = [];
      const tabs = await dataset(p, "#tabs .tab", "id");
      return { page: p, bad: problems, ids: tabs };
    });

    await viz.when(
      "the user opens each challenge and each of its approaches, and nudges each of its inputs the way typing does",
      async () => {
        /* oxlint-disable no-await-in-loop -- one shared page: each challenge and approach is driven in turn, never concurrently */
        for (const id of ids) {
          await pick(page, id);
          const pills = await page.$$eval("section.problem.active .vpill", (p) => p.length);
          for (let v = 0; v < Math.max(pills, 1); v++) {
            if (pills)
              await page.$$eval(
                "section.problem.active .vpill",
                (p, i) => {
                  const pill = p[i];
                  if (!(pill instanceof HTMLElement)) throw new Error(`no approach pill ${i}`);
                  pill.click();
                },
                v,
              );
            await page.$$eval("section.problem.active .demo input", (inputs) => {
              inputs.forEach((i) => {
                i.dispatchEvent(new Event("input", { bubbles: true }));
              });
            });
            // each demo is read right after its own approach was picked and nudged
            const state = await page.$eval("section.problem.active .demo", (d) => ({
              err: d.querySelector(".note")?.textContent?.startsWith("demo error")
                ? d.querySelector(".note")!.textContent
                : null,
              empty: d.children.length === 0,
            }));
            if (state.err || state.empty)
              bad.push(`${id} approach ${v + 1}: ${state.err ?? "empty demo"}`);
          }
        }
        /* oxlint-enable no-await-in-loop */
      },
    );

    await viz.then("each demo shows no error note and is not empty", () => {
      expect(bad).toEqual([]);
      expect(page.errors).toEqual([]);
    });
  }, 120_000);
});
