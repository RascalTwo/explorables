import { describe, it, expect } from "bun:test";
import { open, pick, approach, text, dataset, dbg } from "./helpers.ts";

describe("the gallery", () => {
  it("should list every challenge as a tab and show one challenge at a time", async () => {
    // GIVEN the page
    const page = await open();

    // THEN there is a tab per challenge, the first one is showing, and only one section is
    expect(await page.$$eval("#tabs .tab", (t) => t.length)).toBe(123);
    expect(await page.$$eval("section.problem.active", (s) => s.length)).toBe(1);
    expect(await text(page, "section.problem.active h2.ptitle")).toBe("Combination Sum");

    // WHEN the user picks another
    await pick(page, "factorial");

    // THEN that one is showing alone, with its title and its tab lit
    expect(
      await page.$$eval("section.problem.active", (s) =>
        s.map((x) => x.querySelector("h2")!.textContent),
      ),
    ).toEqual(["Factorializer"]);
    expect(await dataset(page, "#tabs .tab.active", "id")).toEqual(["factorial"]);
    expect(page.errors).toEqual([]);
  });

  it("should badge each tab by its source and link freeCodeCamp dailies to their original", async () => {
    // GIVEN the page on a freeCodeCamp daily, dated 2025-08-18
    const page = await open({ tab: "factorial" });

    // THEN its eyebrow names the source and the date, and links the original daily
    expect(await text(page, "section.problem.active .eyebrow .srcpill")).toBe("freeCodeCamp");
    expect(await page.$eval("section.problem.active a.orig", (a) => a.href)).toBe(
      "https://www.freecodecamp.org/learn/daily-coding-challenge/2025-08-18",
    );
    // AND a LeetCode tab is marked as such
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
  });

  it("should link every day of a merged multi-day series", async () => {
    // GIVEN challenge 295, which merges a six-part series
    const page = await open({ tab: "schema" });
    const links = await page.$$eval("section.problem.active .origs a.orig", (a) =>
      a.map((x) => ({ n: x.textContent, href: x.href })),
    );
    // THEN it offers six numbered links, one per day, not one
    expect(links.map((l) => l.n)).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(links[0]!.href).toBe(
      "https://www.freecodecamp.org/learn/daily-coding-challenge/2026-06-01",
    );
    expect(links[5]!.href).toBe(
      "https://www.freecodecamp.org/learn/daily-coding-challenge/2026-06-06",
    );
  });

  it("should open on the challenge and approach named in the link", async () => {
    // GIVEN a link to the Factorializer's second approach
    const page = await open({ tab: "factorial", v: 1 });

    // THEN that challenge is showing on that approach: the debugger, not the plain demo
    expect(await text(page, "section.problem.active h2.ptitle")).toBe("Factorializer");
    expect(await page.$eval("section.problem.active .vpill.on", (b) => b.textContent.trim())).toBe(
      "Step through",
    );
    expect(await dbg.count(page)).toMatch(/^step 1 \/ \d+$/u);
  });

  it("should remember where the user is in the link", async () => {
    // GIVEN the page
    const page = await open();

    // WHEN the user picks a challenge and its second approach
    await pick(page, "factorial");
    await approach(page, "Step through");

    // THEN the address records both
    await page.waitForFunction(() => location.hash.includes("factorial"));
    const hash: unknown = JSON.parse(decodeURIComponent(page.url().split("#")[1]!));
    expect(hash).toMatchObject({ tab: "factorial", v: 1 });
  });
});

describe("the pattern filter", () => {
  it("should count every challenge under exactly one pattern", async () => {
    // GIVEN the pattern bar
    const page = await open();

    // WHEN the counts on its chips are read
    const chips = await page.$$eval(".pat-chip", (c) =>
      c.map((x) => ({
        name: x instanceof HTMLElement ? (x.dataset["pat"] ?? "") : "",
        n: +x.querySelector(".pc")!.textContent,
      })),
    );

    // THEN "All" says 123 and the patterns add up to the same 123
    expect(chips[0]).toEqual({ name: "", n: 123 });
    expect(chips.slice(1).reduce((a, c) => a + c.n, 0)).toBe(123);
  });

  it("should narrow the tabs to the chosen pattern, explain it, and restore on All", async () => {
    // GIVEN the pattern bar
    const page = await open();
    const chips = await page.$$eval(".pat-chip", (c) =>
      c.map((x) => ({
        name: x instanceof HTMLElement ? (x.dataset["pat"] ?? "") : "",
        n: +x.querySelector(".pc")!.textContent,
      })),
    );
    const pick1 = chips.find((c) => c.name && c.n > 1 && c.n < 123)!;
    const tabsShown = async () => {
      const n = await page.$$eval(
        "#tabs .tab",
        (t) => t.filter((x) => x instanceof HTMLElement && x.style.display !== "none").length,
      );
      return n;
    };

    // WHEN the user clicks a pattern
    await page.click(`.pat-chip[data-pat="${pick1.name}"]`);

    // THEN exactly that many tabs remain, the tell is shown, and the chip is lit
    expect(await tabsShown()).toBe(pick1.n);
    expect(await text(page, ".pat-tell")).toContain(pick1.name);
    expect(
      await page.$eval(".pat-tell", (e) => (e instanceof HTMLElement ? e.style.display : null)),
    ).toBe("block");
    expect(await dataset(page, ".pat-chip.on", "pat")).toEqual([pick1.name]);
    // AND the challenge showing belongs to a visible tab
    expect(
      await page.$eval("#tabs .tab.active", (t) =>
        t instanceof HTMLElement ? t.style.display : null,
      ),
    ).not.toBe("none");

    // WHEN the user clicks All
    await page.click('.pat-chip[data-pat=""]');

    // THEN every tab is back and the tell is gone
    expect(await tabsShown()).toBe(123);
    expect(
      await page.$eval(".pat-tell", (e) => (e instanceof HTMLElement ? e.style.display : null)),
    ).toBe("none");
  });

  it("should filter to a challenge's own pattern from its eyebrow link", async () => {
    // GIVEN the Factorializer showing
    const page = await open({ tab: "factorial" });
    const pat = await page.$eval("section.problem.active .pat-link", (b) =>
      b instanceof HTMLElement ? (b.dataset["pat"] ?? "") : "",
    );

    // WHEN the user clicks its pattern label
    await page.click("section.problem.active .pat-link");

    // THEN the bar filters to that pattern
    expect(await dataset(page, ".pat-chip.on", "pat")).toEqual([pat]);
    expect(
      await page.$$eval(
        "#tabs .tab",
        (t) => t.filter((x) => x instanceof HTMLElement && x.style.display !== "none").length,
      ),
    ).toBe(+(await page.$eval(`.pat-chip[data-pat="${pat}"] .pc`, (e) => e.textContent)));
  });
});

describe("the approach switch", () => {
  it("should swap the demo, the cost badge and the code when the user picks the other approach", async () => {
    // GIVEN Unnatural Prime, which has a brute-force and an optimized approach
    const page = await open({ tab: "unprime" });
    const cost = async () => {
      const c = await text(page, "section.problem.active .demo-head .cost");
      return c;
    };
    const code = async () => {
      const c = await text(page, "section.problem.active aside pre.code");
      return c;
    };
    const brute = { cost: await cost(), code: await code() };
    expect(
      await page.$$eval("section.problem.active .vpill", (b) => b.map((x) => x.textContent.trim())),
    ).toEqual(["Divide by every d", "Step: divide by every d", "Stop at √n", "Step: stop at √n"]);

    // WHEN the user picks the optimized one
    await approach(page, "Stop at √n");

    // THEN the cost and code change to the optimized ones, and the pill is lit
    expect(await cost()).not.toBe(brute.cost);
    expect(await cost()).toContain("√n");
    expect(await code()).not.toBe(brute.code);
    expect(await page.$eval("section.problem.active .vpill.on", (b) => b.textContent.trim())).toBe(
      "Stop at √n",
    );
  });
});

describe("every demo", () => {
  it("should survive every approach, every chip and every step-through run to its end", async () => {
    // GIVEN the page
    const page = await open();
    const ids = await dataset(page, "#tabs .tab", "id");

    /* oxlint-disable no-await-in-loop -- one shared page: each challenge is driven in turn, never concurrently */
    for (const id of ids) {
      // WHEN each challenge has each approach picked, each chip clicked in it, and any step-through played to the last step
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

    // THEN no demo threw
    expect(page.errors).toEqual([]);
  }, 300_000);
});
