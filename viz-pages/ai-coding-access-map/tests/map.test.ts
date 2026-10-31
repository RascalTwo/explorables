import { describe, it, expect } from "bun:test";
import type { Page } from "puppeteer-core";

type P = Page & { errors: string[] };

/** Run `step` on each item in turn: every step drives the one shared page, so they cannot overlap. */
async function inOrder<T>(items: readonly T[], step: (item: T) => Promise<void>) {
  for (const item of items) {
    // oxlint-disable-next-line no-await-in-loop -- steps share one page and must not overlap
    await step(item);
  }
}

const text = async (page: P, sel: string) => {
  const result = await page.$eval(sel, (e) => e.textContent.trim());
  return result;
};
/** Click a plan dot on the price chart, as a user buys or drops it. */
const toggle = async (page: P, ...ids: string[]) => {
  await inOrder(ids, async (id) => {
    await page.click(`#market [data-id="${id}"]`);
    await page.waitForFunction(
      (i) =>
        document.querySelector(`#drawer h3`) && document.querySelector(`#market [data-id="${i}"]`),
      {},
      id,
    );
  });
};
const owned = async (page: P) => {
  const result = await page.$$eval("#market .plan.owned", (gs) =>
    gs.map((g) => (g instanceof SVGElement ? g.dataset["id"]! : "")).toSorted(),
  );
  return result;
};
const open = async (page: P, id: string) => {
  const result = await page.$eval(
    `#grid [data-id="${id}"]`,
    (g) => !g.classList.contains("locked"),
  );
  return result;
};
/** The dot's own circle opacity: the page dims a plan it is not suggesting. */
const dim = async (page: P, id: string) => {
  const result = await page.$eval(
    `#market [data-id="${id}"] circle`,
    (c) => +c.getAttribute("opacity")! < 0.3,
  );
  return result;
};
const setBudget = async (page: P, v: number) => {
  await page.$eval(
    "#budget",
    (el, val) => {
      if (el instanceof HTMLInputElement) el.value = String(val);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },
    v,
  );
};
const unlocked = async (page: P) => +(await text(page, "#r-got"));

describe("buying plans", () => {
  it.concurrent("should start owning nothing, with nothing unlocked", async () => {
    const page = await viz.given("the page freshly opened", async () => viz.open());

    await viz.when("the user does nothing more");

    await viz.then(
      "the receipt shows no spend and no tools, and the grid says to pick a plan",
      async () => {
        expect(await text(page, "#r-spend")).toBe("$0");
        expect(await unlocked(page)).toBe(0);
        expect(await page.$$eval("#grid .node:not(.locked)", (n) => n.length)).toBe(0);
        expect(await text(page, "#s2sub")).toContain("Nothing is unlocked yet");
        expect(page.errors).toEqual([]);
      },
    );
  });

  it.concurrent("should add the prices of the plans bought, from different vendors", async () => {
    const page = await viz.given("the page", async () => viz.open());

    await viz.when("a $20 and a $10 plan from different vendors are bought", async () => {
      await toggle(page, "claude-pro", "gh-pro");
    });

    await viz.then("the receipt reads $30 a month and both dots are ringed as owned", async () => {
      await page.waitForFunction(() => document.querySelector("#r-spend")!.textContent === "$30");
      expect(await owned(page)).toEqual(["claude-pro", "gh-pro"]);
    });
  });

  it.concurrent("should hold one plan per ladder, so buying a higher tier replaces the lower one", async () => {
    const page = await viz.given("Plus ($20) bought", async () => {
      const p = await viz.open();
      await toggle(p, "chatgpt-plus");
      await p.waitForFunction(() => document.querySelector("#r-spend")!.textContent === "$20");
      return p;
    });

    await viz.when("Pro ($100) on the same ladder is bought", async () => {
      await toggle(page, "chatgpt-pro");
    });

    await viz.then("only Pro is owned and the receipt is $100, not $120", async () => {
      await page.waitForFunction(() => document.querySelector("#r-spend")!.textContent === "$100");
      expect(await owned(page)).toEqual(["chatgpt-pro"]);
    });
  });

  it.concurrent("should drop a plan when its dot is clicked again", async () => {
    const page = await viz.given("two plans bought", async () => {
      const p = await viz.open();
      await toggle(p, "claude-pro", "gh-pro");
      await p.waitForFunction(() => document.querySelector("#r-spend")!.textContent === "$30");
      return p;
    });

    await viz.when("the Copilot one is clicked again", async () => {
      await toggle(page, "gh-pro");
    });

    await viz.then("only the Claude plan remains, at $20", async () => {
      await page.waitForFunction(() => document.querySelector("#r-spend")!.textContent === "$20");
      expect(await owned(page)).toEqual(["claude-pro"]);
    });
  });

  it.concurrent("should unlock the tools a plan pays for and leave the others locked", async () => {
    const page = await viz.given("the page", async () => viz.open());

    await viz.when("Claude Pro is bought", async () => {
      await toggle(page, "claude-pro");
    });

    await viz.then(
      "Claude's cloud agent is lit, an unrelated vendor's tool is not, and the count agrees with the lit boxes",
      async () => {
        await page.waitForFunction(() => +document.querySelector("#r-got")!.textContent > 0);
        expect(await open(page, "cc-gh")).toBe(false); // a GitHub-sold agent
        const lit = await page.$$eval("#grid .node:not(.locked)", (n) => n.length);
        expect(lit).toBeGreaterThan(0);
        expect(await unlocked(page)).toBe(lit);
        expect(Number(await text(page, "#r-all"))).toBeGreaterThan(lit);
      },
    );
  });

  it.concurrent("should keep a gated tool locked until the admin switch is also owned", async () => {
    const { page, before } = await viz.given(
      "Copilot Pro bought: the Claude agent on github.com needs the admin policy too",
      async () => {
        const p = await viz.open();
        await toggle(p, "gh-pro");
        await p.waitForFunction(() => document.querySelector("#r-spend")!.textContent === "$10");
        expect(await open(p, "cc-gh")).toBe(false);
        const count = await unlocked(p);
        return { page: p, before: count };
      },
    );

    await viz.when("the admin policy is switched on as well", async () => {
      await toggle(page, "gh-admin");
    });

    await viz.then(
      "that agent lights up, and the count rose by exactly the gated tools it opened",
      async () => {
        await page.waitForFunction(
          (n) => +document.querySelector("#r-got")!.textContent > n,
          {},
          before,
        );
        expect(await open(page, "cc-gh")).toBe(true);
        expect(await text(page, "#r-spend")).toBe("$10");
      },
    );
  });

  it.concurrent("should clear everything with reset", async () => {
    const page = await viz.given("plans bought", async () => {
      const p = await viz.open();
      await toggle(p, "claude-pro", "gh-pro");
      await p.waitForFunction(() => document.querySelector("#r-spend")!.textContent === "$30");
      return p;
    });

    await viz.when("the user presses reset", async () => {
      await page.click("#clear");
    });

    await viz.then("nothing is owned or unlocked", async () => {
      await page.waitForFunction(() => document.querySelector("#r-spend")!.textContent === "$0");
      expect(await owned(page)).toEqual([]);
      expect(await unlocked(page)).toBe(0);
    });
  });

  it.concurrent("should load a starting stack from a preset and explain it", async () => {
    const page = await viz.given("the page", async () => viz.open());

    await viz.when(
      'the user picks the "widest $20" preset (Copilot Pro $10 + ChatGPT Go $8)',
      async () => {
        await page.click('#presets button[data-preset="1"]');
      },
    );

    await viz.then(
      "those two plans are owned, the receipt reads $18 and the drawer explains the stack",
      async () => {
        await page.waitForFunction(() => document.querySelector("#r-spend")!.textContent === "$18");
        expect(await owned(page)).toEqual(["chatgpt-go", "gh-pro"]);
        expect(await text(page, "#drawer h3")).toBe("widest $20");
      },
    );
  });
});

describe("at work", () => {
  it.concurrent("should stop counting a plan from a blocked band, but keep it visibly owned", async () => {
    const { page, tools } = await viz.given(
      "Claude Pro ($20, enterprise band) and Kimi ($15, cheap band) bought for myself",
      async () => {
        const p = await viz.open();
        await toggle(p, "claude-pro", "kimi");
        await p.waitForFunction(() => document.querySelector("#r-spend")!.textContent === "$35");
        const count = await unlocked(p);
        return { page: p, tools: count };
      },
    );

    await viz.when('the user switches to "at work"', async () => {
      await page.click('#mode button[data-mode="work"]');
    });

    await viz.then(
      "the spend drops to $20, Kimi stays ringed, its band says blocked, and the page reports one plan stopped counting",
      async () => {
        await page.waitForFunction(() => document.querySelector("#r-spend")!.textContent === "$20");
        expect(await owned(page)).toEqual(["claude-pro", "kimi"]);
        expect(await page.$eval("#market", (m) => m.textContent)).toContain("BLOCKED AT WORK");
        expect(await text(page, "#s1sub")).toContain("1 plan you'd picked just stopped counting");
        expect(await unlocked(page)).toBeLessThanOrEqual(tools);
      },
    );
  });

  it.concurrent("should block from the third band down and keep the second, at the boundary", async () => {
    const page = await viz.given(
      "one plan from each of bands 1, 2 and 3: Claude Pro $20, JetBrains Pro $10, Zed Pro $10",
      async () => {
        const p = await viz.open();
        await toggle(p, "claude-pro", "jb-pro", "zed-pro");
        await p.waitForFunction(() => document.querySelector("#r-spend")!.textContent === "$40");
        return p;
      },
    );

    await viz.when("the user goes to work", async () => {
      await page.click('#mode button[data-mode="work"]');
    });

    await viz.then("band 2 still counts and band 3 does not: $30", async () => {
      await page.waitForFunction(() => document.querySelector("#r-spend")!.textContent === "$30");
    });
  });

  it.concurrent("should remove tools from blocked bands from the total, and bring them back on switching home", async () => {
    const { page, home } = await viz.given(
      'the free/self-hosted "local models" plan owned for myself, which lights a band-5 tool',
      async () => {
        const p = await viz.open();
        await toggle(p, "local");
        await p.waitForFunction(() => +document.querySelector("#r-got")!.textContent > 0);
        const counts = { got: await unlocked(p), all: Number(await text(p, "#r-all")) };
        return { page: p, home: counts };
      },
    );

    await viz.when("switched to work", async () => {
      await page.click('#mode button[data-mode="work"]');
    });

    await viz.then('nothing is unlocked and the "of N tools" total shrinks', async () => {
      await page.waitForFunction(() => document.querySelector("#r-got")!.textContent === "0");
      expect(Number(await text(page, "#r-all"))).toBeLessThan(home.all);
    });

    await viz.when("switched back", async () => {
      await page.click('#mode button[data-mode="personal"]');
    });

    await viz.then("the same tools return", async () => {
      await page.waitForFunction(
        (n) => +document.querySelector("#r-got")!.textContent === n,
        {},
        home.got,
      );
      expect(Number(await text(page, "#r-all"))).toBe(home.all);
    });
  });

  it.concurrent("should report how many plans survive a security review", async () => {
    const { page, all } = await viz.given("the page", async () => {
      const p = await viz.open();
      const total = await p.$$eval("#market .plan[data-id]", (g) => g.length);
      return { page: p, all: total };
    });

    await viz.when("the user goes to work", async () => {
      await page.click('#mode button[data-mode="work"]');
    });

    await viz.then(
      "the summary counts fewer surviving plans than the total, and names a real cheapest paid price",
      async () => {
        await page.waitForFunction(() =>
          document.querySelector("#s1sub")!.textContent.includes("survive"),
        );
        const m = (await text(page, "#s1sub")).match(/(\d+) of (\d+) plans survive/u);
        expect(m).not.toBeNull();
        expect(Number(m![2])).toBe(all);
        expect(Number(m![1])).toBeLessThan(all);
        expect(Number(m![1])).toBeGreaterThan(0);
        expect(await text(page, "#s1sub")).toMatch(
          /cheapest paid plan still\s+open to you is \$4\.99/u,
        );
      },
    );
  });
});

describe("the budget slider", () => {
  it.concurrent("should dim plans dearer than the budget and keep those at or under it", async () => {
    const page = await viz.given("the page with no budget limit", async () => {
      const p = await viz.open();
      expect(await text(p, "#budgetval")).toBe("any");
      expect(await dim(p, "claude-team")).toBe(false);
      return p;
    });

    await viz.when("the budget is set to $20", async () => {
      await setBudget(page, 20);
    });

    await viz.then(
      "the label says so; a $20 plan stays, $25 and $100 plans dim, and a free one stays",
      async () => {
        await page.waitForFunction(
          () => document.querySelector("#budgetval")!.textContent === "$20/mo",
        );
        expect(await dim(page, "claude-pro")).toBe(false);
        expect(await dim(page, "claude-team")).toBe(true);
        expect(await dim(page, "claude-max5")).toBe(true);
        expect(await dim(page, "claude-free")).toBe(false);
      },
    );
  });

  it.concurrent("should not change what is owned or spent, only what is suggested", async () => {
    const page = await viz.given("Claude Max 5x ($100) bought", async () => {
      const p = await viz.open();
      await toggle(p, "claude-max5");
      await p.waitForFunction(() => document.querySelector("#r-spend")!.textContent === "$100");
      return p;
    });

    await viz.when("the budget is lowered to $10", async () => {
      await setBudget(page, 10);
      await page.waitForFunction(
        () => document.querySelector("#budgetval")!.textContent === "$10/mo",
      );
    });

    await viz.then("the plan is still owned and counted, though dimmed", async () => {
      expect(await owned(page)).toEqual(["claude-max5"]);
      expect(await text(page, "#r-spend")).toBe("$100");
      expect(await dim(page, "claude-max5")).toBe(true);
    });
  });

  it.concurrent("should go back to no limit when the slider returns to its top", async () => {
    const page = await viz.given("a $10 budget", async () => {
      const p = await viz.open();
      await setBudget(p, 10);
      await p.waitForFunction(() => document.querySelector("#budgetval")!.textContent === "$10/mo");
      expect(await dim(p, "claude-pro")).toBe(true);
      return p;
    });

    await viz.when("the slider goes back to its maximum", async () => {
      await setBudget(page, 220);
    });

    await viz.then('it reads "any" and nothing is dimmed', async () => {
      await page.waitForFunction(() => document.querySelector("#budgetval")!.textContent === "any");
      expect(await dim(page, "claude-pro")).toBe(false);
      expect(await dim(page, "claude-max20")).toBe(false);
    });
  });
});

describe("sharing state in the link", () => {
  it.concurrent("should restore owned plans, mode and budget from the link", async () => {
    const link = await viz.given(
      "a shared link: Claude Pro and Kimi owned, at work, $50 budget",
      () => ({
        owned: ["claude-pro", "kimi"],
        mode: "work",
        budget: 50,
      }),
    );

    const page = await viz.when("the page loads from the link", async () => viz.open(link));

    await viz.then(
      "the page shows that state: $20 counted (Kimi is blocked at work), mode pressed, slider label",
      async () => {
        expect(await text(page, "#r-spend")).toBe("$20");
        expect(await owned(page)).toEqual(["claude-pro", "kimi"]);
        expect(
          await page.$eval('#mode button[data-mode="work"]', (b) => b.getAttribute("aria-pressed")),
        ).toBe("true");
        expect(await text(page, "#budgetval")).toBe("$50/mo");
        expect(
          await page.$eval("#budget", (b) => (b instanceof HTMLInputElement ? b.value : null)),
        ).toBe("50");
      },
    );
  });

  it.concurrent("should write a purchase into the link so a reload keeps it", async () => {
    const page = await viz.given("Claude Pro bought", async () => {
      const p = await viz.open();
      await toggle(p, "claude-pro");
      await p.waitForFunction(() => document.querySelector("#r-spend")!.textContent === "$20");
      return p;
    });

    await viz.when("the page is reloaded", async () => {
      await page.reload();
    });

    await viz.then("it is still owned", async () => {
      await page.waitForFunction(() => document.querySelector("#r-spend")!.textContent === "$20");
      expect(await owned(page)).toEqual(["claude-pro"]);
    });
  });
});

describe("the detail drawer", () => {
  it.concurrent("should say whether a clicked tool is unlocked by what is owned", async () => {
    const { page, lit } = await viz.given("Claude Pro bought, and a tool it pays for", async () => {
      const p = await viz.open();
      await toggle(p, "claude-pro");
      await p.waitForFunction(() => +document.querySelector("#r-got")!.textContent > 0);
      const id = await p.$eval("#grid .node:not(.locked)", (n) =>
        n instanceof SVGElement ? n.dataset["id"]! : "",
      );
      return { page: p, lit: id };
    });

    await viz.when("the user clicks a lit tool, then a locked one", async () => {
      await page.click(`#grid [data-id="${lit}"]`);
      await page.waitForFunction(() =>
        document.querySelector("#drawer")!.textContent.includes("unlocked by what you own"),
      );
      await page.click(`#grid [data-id="cc-gh"]`);
    });

    await viz.then('the drawer says "locked" for the second', async () => {
      await page.waitForFunction(
        () =>
          /\blocked\b/u.test(document.querySelector("#drawer .dr-sub")!.textContent) &&
          !document.querySelector("#drawer")!.textContent.includes("unlocked by"),
      );
    });
  });

  it.concurrent("should tell a plan's price and its state in the drawer", async () => {
    const page = await viz.given("the page", async () => viz.open());

    await viz.when("a plan is bought", async () => {
      await toggle(page, "gh-pro");
    });

    await viz.then("the drawer names its price and says it is in the stack", async () => {
      await page.waitForFunction(() =>
        document.querySelector("#drawer .dr-sub")!.textContent.includes("in your stack"),
      );
      expect(await text(page, "#drawer .dr-sub")).toContain("$10/month");
    });
  });

  it.concurrent("should close the drawer when the same tool is clicked twice", async () => {
    const page = await viz.given("a tool opened in the drawer", async () => {
      const p = await viz.open();
      await p.click(`#grid [data-id="cc-gh"]`);
      await p.waitForFunction(
        () => document.querySelector("#drawer h3")!.textContent === "Claude agent on github.com",
      );
      return p;
    });

    await viz.when("the same tool is clicked again", async () => {
      await page.click(`#grid [data-id="cc-gh"]`);
    });

    await viz.then("the drawer goes back to its prompt", async () => {
      await page.waitForFunction(
        () =>
          document.querySelector("#drawer h3")!.textContent === "Click anything for the details",
      );
    });
  });

  it.concurrent("should list the extra admin requirement of a gated tool as owned once it is", async () => {
    const page = await viz.given(
      "Copilot Pro and the admin policy bought, and the gated tool opened",
      async () => {
        const p = await viz.open();
        await toggle(p, "gh-pro", "gh-admin");
        await p.click(`#grid [data-id="cc-gh"]`);
        return p;
      },
    );

    await viz.when("the user reads the drawer");

    await viz.then(
      "the drawer says it is unlocked and lists the admin requirement with a filled marker",
      async () => {
        await page.waitForFunction(() =>
          document
            .querySelector("#drawer .dr-sub")!
            .textContent.includes("unlocked by what you own"),
        );
        const reqs = await page.$$eval("#drawer .req", (r) =>
          r.map((x) => x.textContent.replaceAll(/\s+/gu, " ").trim()),
        );
        expect(reqs.some((r) => r.startsWith("●") && r.includes("and"))).toBe(true);
      },
    );
  });

  it.concurrent("should describe a pay-per-token plan as billed per token, not as free", async () => {
    const page = await viz.given("the page", async () => viz.open());

    await viz.when("the Anthropic API plan ($0 a month) is clicked", async () => {
      await toggle(page, "anthropic-api");
    });

    await viz.then("the drawer says it is billed per token", async () => {
      await page.waitForFunction(() =>
        document.querySelector("#drawer .dr-sub")!.textContent.includes("billed per token used"),
      );
    });
  });
});
