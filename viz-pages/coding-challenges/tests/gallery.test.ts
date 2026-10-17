import { describe, it, expect } from "bun:test";
import { open, pick, approach, text, dataset, dbg } from "./helpers.ts";

describe("the gallery", () => {
  it("should list every challenge as a tab and show one challenge at a time", async () => {
    const page = await viz.given("the page", async () => {
      const p = await open();
      return p;
    });

    await viz.when("the user looks at the page as it opens");

    await viz.then(
      "there is a tab per challenge, the first one is showing, and only one section is",
      async () => {
        expect(await page.$$eval("#tabs .tab", (t) => t.length)).toBe(137);
        expect(await page.$$eval("section.problem.active", (s) => s.length)).toBe(1);
        expect(await text(page, "section.problem.active h2.ptitle")).toBe("Combination Sum");
      },
    );

    await viz.when("the user picks another", async () => {
      await pick(page, "factorial");
    });

    await viz.then("that one is showing alone, with its title and its tab lit", async () => {
      expect(
        await page.$$eval("section.problem.active", (s) =>
          s.map((x) => x.querySelector("h2")!.textContent),
        ),
      ).toEqual(["Factorializer"]);
      expect(await dataset(page, "#tabs .tab.active", "id")).toEqual(["factorial"]);
      expect(page.errors).toEqual([]);
    });
  });

  it("should badge each tab by its source and link freeCodeCamp dailies to their original", async () => {
    const page = await viz.given("the page on a freeCodeCamp daily, dated 2025-08-18", async () => {
      const p = await open({ tab: "factorial" });
      return p;
    });

    await viz.when("the user reads the page and the tab bar");

    await viz.then(
      "its eyebrow names the source and the date, links the original daily, and a LeetCode tab is marked as such",
      async () => {
        expect(await text(page, "section.problem.active .eyebrow .srcpill")).toBe("freeCodeCamp");
        expect(await page.$eval("section.problem.active a.orig", (a) => a.href)).toBe(
          "https://www.freecodecamp.org/learn/daily-coding-challenge/2025-08-18",
        );
        expect(
          await page.$$eval('#tabs .tab[data-source="leetcode"] .srcbadge', (b) => [
            ...new Set(b.map((x) => x.textContent)),
          ]),
        ).toEqual(["LC"]);
        expect(
          await page.$$eval('#tabs .tab[data-source="fcc"] .srcbadge', (b) => [
            ...new Set(b.map((x) => x.textContent)),
          ]),
        ).toEqual(["fCC"]);
      },
    );
  });

  it("should link every day of a merged multi-day series", async () => {
    const { links } = await viz.given("challenge 295, which merges a six-part series", async () => {
      const page = await open({ tab: "schema" });
      const l = await page.$$eval("section.problem.active .origs a.orig", (a) =>
        a.map((x) => ({ n: x.textContent, href: x.href })),
      );
      return { page, links: l };
    });

    await viz.when("the user looks at its links to the originals");

    await viz.then("it offers six numbered links, one per day, not one", () => {
      expect(links.map((l) => l.n)).toEqual(["1", "2", "3", "4", "5", "6"]);
      expect(links[0]!.href).toBe(
        "https://www.freecodecamp.org/learn/daily-coding-challenge/2026-06-01",
      );
      expect(links[5]!.href).toBe(
        "https://www.freecodecamp.org/learn/daily-coding-challenge/2026-06-06",
      );
    });
  });

  it("should open on the challenge and approach named in the link", async () => {
    const page = await viz.given("a link to the Factorializer's second approach", async () => {
      const p = await open({ tab: "factorial", v: 1 });
      return p;
    });

    await viz.when("the user follows the link");

    await viz.then(
      "that challenge is showing on that approach: the debugger, not the plain demo",
      async () => {
        expect(await text(page, "section.problem.active h2.ptitle")).toBe("Factorializer");
        expect(
          await page.$eval("section.problem.active .vpill.on", (b) => b.textContent.trim()),
        ).toBe("Step through");
        expect(await dbg.count(page)).toMatch(/^step 1 \/ \d+$/u);
      },
    );
  });

  it("should remember where the user is in the link", async () => {
    const page = await viz.given("the page", async () => {
      const p = await open();
      return p;
    });

    await viz.when("the user picks a challenge and its second approach", async () => {
      await pick(page, "factorial");
      await approach(page, "Step through");
    });

    await viz.then("the address records both", async () => {
      await page.waitForFunction(() => location.hash.includes("factorial"));
      const hash: unknown = JSON.parse(decodeURIComponent(page.url().split("#")[1]!));
      expect(hash).toMatchObject({ tab: "factorial", v: 1 });
    });
  });
});

describe("the pattern filter", () => {
  it("should count every challenge under exactly one pattern", async () => {
    const page = await viz.given("the pattern bar", async () => {
      const p = await open();
      return p;
    });

    const chips = await viz.when("the counts on its chips are read", async () => {
      const c = await page.$$eval(".pat-chip", (all) =>
        all.map((x) => ({
          name: x instanceof HTMLElement ? (x.dataset["pat"] ?? "") : "",
          n: +x.querySelector(".pc")!.textContent,
        })),
      );
      return c;
    });

    await viz.then('"All" says 137 and the patterns add up to the same 137', () => {
      expect(chips[0]).toEqual({ name: "", n: 137 });
      expect(chips.slice(1).reduce((a, c) => a + c.n, 0)).toBe(137);
    });
  });

  it("should narrow the tabs to the chosen pattern, explain it, and restore on All", async () => {
    const { page, pick1, tabsShown } = await viz.given("the pattern bar", async () => {
      const p = await open();
      const chips = await p.$$eval(".pat-chip", (c) =>
        c.map((x) => ({
          name: x instanceof HTMLElement ? (x.dataset["pat"] ?? "") : "",
          n: +x.querySelector(".pc")!.textContent,
        })),
      );
      const chosen = chips.find((c) => c.name && c.n > 1 && c.n < 137)!;
      const shown = async () => {
        const n = await p.$$eval(
          "#tabs .tab",
          (t) => t.filter((x) => x instanceof HTMLElement && x.style.display !== "none").length,
        );
        return n;
      };
      return { page: p, pick1: chosen, tabsShown: shown };
    });

    await viz.when("the user clicks a pattern", async () => {
      await page.click(`.pat-chip[data-pat="${pick1.name}"]`);
    });

    await viz.then(
      "exactly that many tabs remain, the tell is shown, the chip is lit, and the challenge showing belongs to a visible tab",
      async () => {
        expect(await tabsShown()).toBe(pick1.n);
        expect(await text(page, ".pat-tell")).toContain(pick1.name);
        expect(
          await page.$eval(".pat-tell", (e) => (e instanceof HTMLElement ? e.style.display : null)),
        ).toBe("block");
        expect(await dataset(page, ".pat-chip.on", "pat")).toEqual([pick1.name]);
        expect(
          await page.$eval("#tabs .tab.active", (t) =>
            t instanceof HTMLElement ? t.style.display : null,
          ),
        ).not.toBe("none");
      },
    );

    await viz.when("the user clicks All", async () => {
      await page.click('.pat-chip[data-pat=""]');
    });

    await viz.then("every tab is back and the tell is gone", async () => {
      expect(await tabsShown()).toBe(137);
      expect(
        await page.$eval(".pat-tell", (e) => (e instanceof HTMLElement ? e.style.display : null)),
      ).toBe("none");
    });
  });

  it("should filter to a challenge's own pattern from its eyebrow link", async () => {
    const { page, pat } = await viz.given("the Factorializer showing", async () => {
      const p = await open({ tab: "factorial" });
      const name = await p.$eval("section.problem.active .pat-link", (b) =>
        b instanceof HTMLElement ? (b.dataset["pat"] ?? "") : "",
      );
      return { page: p, pat: name };
    });

    await viz.when("the user clicks its pattern label", async () => {
      await page.click("section.problem.active .pat-link");
    });

    await viz.then("the bar filters to that pattern", async () => {
      expect(await dataset(page, ".pat-chip.on", "pat")).toEqual([pat]);
      expect(
        await page.$$eval(
          "#tabs .tab",
          (t) => t.filter((x) => x instanceof HTMLElement && x.style.display !== "none").length,
        ),
      ).toBe(+(await page.$eval(`.pat-chip[data-pat="${pat}"] .pc`, (e) => e.textContent)));
    });
  });
});

describe("the approach switch", () => {
  it("should swap the demo, the cost badge and the code when the user picks the other approach", async () => {
    const { page, cost, code, brute } = await viz.given(
      "Unnatural Prime, which has a brute-force and an optimized approach",
      async () => {
        const p = await open({ tab: "unprime" });
        const readCost = async () => {
          const c = await text(p, "section.problem.active .demo-head .cost");
          return c;
        };
        const readCode = async () => {
          const c = await text(p, "section.problem.active aside pre.code");
          return c;
        };
        const first = { cost: await readCost(), code: await readCode() };
        expect(
          await p.$$eval("section.problem.active .vpill", (b) =>
            b.map((x) => x.textContent.trim()),
          ),
        ).toEqual([
          "Divide by every d",
          "Step: divide by every d",
          "Stop at √n",
          "Step: stop at √n",
        ]);
        return { page: p, cost: readCost, code: readCode, brute: first };
      },
    );

    await viz.when("the user picks the optimized one", async () => {
      await approach(page, "Stop at √n");
    });

    await viz.then(
      "the cost and code change to the optimized ones, and the pill is lit",
      async () => {
        expect(await cost()).not.toBe(brute.cost);
        expect(await cost()).toContain("√n");
        expect(await code()).not.toBe(brute.code);
        expect(
          await page.$eval("section.problem.active .vpill.on", (b) => b.textContent.trim()),
        ).toBe("Stop at √n");
      },
    );
  });
});

describe("every demo", () => {
  it("should survive every approach, every chip and every step-through run to its end", async () => {
    const { page, ids } = await viz.given("the page", async () => {
      const p = await open();
      const tabs = await dataset(p, "#tabs .tab", "id");
      return { page: p, ids: tabs };
    });

    await viz.when(
      "each challenge has each approach picked, each chip clicked in it, and any step-through played to the last step",
      async () => {
        /* oxlint-disable no-await-in-loop -- one shared page: each challenge is driven in turn, never concurrently */
        for (const id of ids) {
          await pick(page, id);
          await page.evaluate(() => {
            const sec = document.querySelector("section.problem.active")!;
            const chips = () => [...sec.querySelectorAll<HTMLElement>(".demo .chip")]; // re-queried: a click may redraw the demo
            const playOut = () => {
              const step = [...sec.querySelectorAll<HTMLButtonElement>(".dbg-btn")].find((b) =>
                b.textContent.includes("Step"),
              );
              if (step) for (let i = 0; i < 400 && !step.disabled; i++) step.click();
            };
            for (const pill of sec.querySelectorAll<HTMLElement>(".vpill")) {
              pill.click();
              playOut();
              const n = chips().length; // fixed up front: "+ add" style chips grow the list as they are clicked
              for (let k = 0; k < n; k++) {
                chips()[k]?.click();
                playOut();
              }
            }
          });
        }

        /* oxlint-enable no-await-in-loop */
      },
    );

    await viz.then("no demo threw", () => {
      expect(page.errors).toEqual([]);
    });
  }, 300_000);
});
