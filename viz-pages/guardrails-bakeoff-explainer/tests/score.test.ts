import { describe, it, expect } from "bun:test";
import type { Page } from "puppeteer-core";

type P = Page & { errors: string[] };

// The page has no backend and no outside request; it draws five contenders scored on seven dimensions.
// At the draft weights (tracing 3, determinism 3, LLM rules 2, integration 2, ops 2, build 1, repro 1; max 42):
//   Custom 38 · Raw OSS 21 · OSS+ 36 · Microservice 27 · Micro+ 32

const DIMS = ["tracing", "determinism", "llm", "integration", "ops", "build", "repro"] as const;
type Dim = (typeof DIMS)[number];

const open = async (hash?: object): Promise<P> => {
  const page = await viz.open(hash, {
    before: async (p) => {
      // The dev server's feedback pill floats over the page; it is the server's overlay, not the page's.
      await p.evaluateOnNewDocument(() =>
        addEventListener("DOMContentLoaded", () =>
          document.head.append(
            Object.assign(document.createElement("style"), {
              textContent: "#viz-feedback { display: none !important; }",
            }),
          ),
        ),
      );
    },
  });
  return page;
};

/** Drag one weight slider to a value, as a user does, firing the input event. */
const weight = async (page: P, dim: Dim, v: number) => {
  await page.$eval(
    `#dimsliders input[data-k="${dim}"]`,
    (el, val) => {
      if (el instanceof HTMLInputElement) el.value = String(val);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },
    v,
  );
};
/** Run `step` on each item in turn: every step drives the one shared page, so they cannot overlap. */
async function inOrder<T>(items: readonly T[], step: (item: T) => Promise<void>) {
  for (const item of items) {
    // oxlint-disable-next-line no-await-in-loop -- steps share one page and must not overlap
    await step(item);
  }
}

/** Set every weight at once: unlisted dimensions go to 0. */
const weights = async (page: P, w: Partial<Record<Dim, number>>) => {
  await inOrder(DIMS, async (d) => {
    await weight(page, d, w[d] ?? 0);
  });
};

/** The five bars as the user reads them: "Custom Image" → "38 / 42". */
const totals = async (page: P) => {
  const result = await page.$$eval("#bars .bar", (bars) =>
    Object.fromEntries(
      bars.map((b) => [
        b.querySelector(".who")!.textContent,
        b.querySelector(".tot")!.textContent.replaceAll(/\s+/gu, " ").trim(),
      ]),
    ),
  );
  return result;
};
const banner = async (page: P) => {
  const result = await page.$eval("#winbanner", (e) =>
    e.textContent.replaceAll(/\s+/gu, " ").trim(),
  );
  return result;
};
const until = async (page: P, fn: () => boolean) => {
  const result = await page.waitForFunction(fn, { timeout: 10_000 });
  return result;
};

const DRAFT_TOTALS = {
  "Custom Image": "38 / 42",
  "Raw OSS Image": "21 / 42",
  "OSS + Parity": "36 / 42",
  "NVIDIA Microservice": "27 / 42",
  "Microservice + Parity": "32 / 42",
};

describe("the weighted score at the draft weights", () => {
  it.concurrent("should total each contender's scores times the weights, out of 42", async () => {
    const page = await viz.given("the page freshly opened", async () => open());

    await viz.when("the user does nothing more", async () => {
      await Promise.resolve();
    });

    await viz.then("each bar reads its weighted total over 42", async () => {
      expect(await totals(page)).toEqual(DRAFT_TOTALS);
      expect(page.errors).toEqual([]);
    });
  });

  it.concurrent("should name the leader and how far ahead it is", async () => {
    const page = await viz.given("the draft weights", async () => open());

    await viz.when("the user does nothing more", async () => {
      await Promise.resolve();
    });

    await viz.then("the banner says Custom leads with 38/42, 2 ahead of OSS+", async () => {
      expect(await banner(page)).toContain(
        "the Custom Image leads on raw score with 38/42 — 2 ahead of the OSS+",
      );
    });
  });

  it.concurrent("should show one weight slider per dimension, at its draft weight", async () => {
    const page = await viz.given("the draft weights", async () => open());

    await viz.when("the user does nothing more", async () => {
      await Promise.resolve();
    });

    await viz.then(
      "there are seven sliders reading 3,3,2,2,2,1,1, each labelled with its weight",
      async () => {
        expect(
          await page.$$eval("#dimsliders input[type=range]", (s) => s.map((x) => x.value)),
        ).toEqual(["3", "3", "2", "2", "2", "1", "1"]);
        expect(
          await page.$$eval("#dimsliders .wlab b", (b) => b.map((x) => x.textContent)),
        ).toEqual(["3", "3", "2", "2", "2", "1", "1"]);
      },
    );
  });

  it.concurrent("should split a bar into one segment per dimension, sized by weight times score", async () => {
    const { segs } = await viz.given("the draft weights", async () => {
      const page = await open();
      const read = async (who: string) => {
        const result = await page.$$eval(
          "#bars .bar",
          (bars, w) => {
            const bar = bars.find((b) => b.querySelector(".who")!.textContent === w)!;
            return [...bar.querySelectorAll<HTMLElement>(".seg")].map((s) => ({
              title: s.title,
              width: s.style.width,
            }));
          },
          who,
        );
        return result;
      };
      return { segs: read };
    });

    await viz.when("the user does nothing more", async () => {
      await Promise.resolve();
    });

    await viz.then(
      "Custom's bar has seven segments, tracing is 9 of 42 wide, and Raw OSS has no tracing segment",
      async () => {
        const custom = await segs("Custom Image");
        expect(custom).toHaveLength(7);
        expect(custom[0]!.title).toBe("Dashboard tracing: 9");
        expect(Number(custom[0]!.width.replace("%", ""))).toBeCloseTo((9 / 42) * 100, 2);
        const raw = await segs("Raw OSS Image");
        expect(raw.map((s) => s.title)).not.toContain("Dashboard tracing: 0");
        expect(raw).toHaveLength(5); // tracing and LLM-judged rules score 0 for it
      },
    );
  });
});

describe("dragging the weights", () => {
  it.concurrent("should re-total every bar and update the slider's label when a weight moves", async () => {
    const page = await viz.given("the draft weights", async () => open());

    await viz.when(
      '"LLM-judged rules" goes from 2 to 0 (those score 3,0,3,0,3 for the five)',
      async () => {
        await weight(page, "llm", 0);
      },
    );

    await viz.then(
      "the max falls to 36, Custom to 32, OSS+ to 30, Micro+ to 26; Raw OSS and Microservice are unchanged",
      async () => {
        await until(page, () => document.querySelector("#wl-llm")!.textContent === "0");
        expect(await totals(page)).toEqual({
          "Custom Image": "32 / 36",
          "Raw OSS Image": "21 / 36",
          "OSS + Parity": "30 / 36",
          "NVIDIA Microservice": "27 / 36",
          "Microservice + Parity": "26 / 36",
        });
      },
    );
  });

  it.concurrent("should crown a different leader when the weights favour it", async () => {
    const page = await viz.given(
      'only "Build / maintain effort" weighted (scores 1,1,1,2,1)',
      async () => {
        const p = await open();
        await weights(p, { build: 3 });
        return p;
      },
    );

    await viz.when("the user does nothing more", async () => {
      await Promise.resolve();
    });

    await viz.then("the Microservice leads with 6/9, 3 ahead of the Custom", async () => {
      await until(page, () =>
        document.querySelector("#winbanner")!.textContent.includes("NVIDIA Microservice"),
      );
      expect(await banner(page)).toContain(
        "the NVIDIA Microservice leads on raw score with 6/9 — 3 ahead of the Custom",
      );
      expect((await totals(page))["NVIDIA Microservice"]).toBe("6 / 9");
    });
  });

  it.concurrent("should say tied, not ahead, when the top two are level", async () => {
    const page = await viz.given(
      'only "Version reproducibility" weighted (scores 3,1,1,3,3): Custom, Microservice and Micro+ all top out',
      async () => {
        const p = await open();
        await weights(p, { repro: 3 });
        return p;
      },
    );

    await viz.when("the user does nothing more", async () => {
      await Promise.resolve();
    });

    await viz.then("the banner says the leader is tied", async () => {
      await until(page, () =>
        document.querySelector("#winbanner")!.textContent.includes("tied with"),
      );
      expect(await banner(page)).toContain(
        "leads on raw score with 9/9 — tied with the Microservice",
      );
    });
  });

  it.concurrent("should show empty bars and 0 of 0 when every weight is zero, without breaking", async () => {
    const page = await viz.given("the draft weights", async () => open());

    await viz.when("the user drags every weight to zero", async () => {
      await weights(page, {});
    });

    await viz.then(
      "each bar reads 0 / 0 and is drawn empty, and the page did not error",
      async () => {
        await until(page, () => document.querySelector("#wl-repro")!.textContent === "0");
        expect(Object.values(await totals(page))).toEqual([
          "0 / 0",
          "0 / 0",
          "0 / 0",
          "0 / 0",
          "0 / 0",
        ]);
        expect(await page.$$eval("#bars .track.empty", (t) => t.length)).toBe(5);
        expect(await page.$$eval("#bars .seg", (s) => s.length)).toBe(0);
        expect(page.errors).toEqual([]);
      },
    );
  });

  it.concurrent("should go back to the draft weights on reset", async () => {
    const page = await viz.given("weights dragged away from the draft", async () => {
      const p = await open();
      await weights(p, { build: 3 });
      await until(p, () => document.querySelector("#wl-build")!.textContent === "3");
      return p;
    });

    await viz.when("the user presses reset", async () => {
      await page.click("#resetw");
    });

    await viz.then("the sliders, labels and totals are the draft's again", async () => {
      await until(page, () => document.querySelector("#wl-tracing")!.textContent === "3");
      expect(
        await page.$$eval("#dimsliders input[type=range]", (s) => s.map((x) => x.value)),
      ).toEqual(["3", "3", "2", "2", "2", "1", "1"]);
      expect(await totals(page)).toEqual(DRAFT_TOTALS);
    });
  });
});

describe("sharing state in the link", () => {
  it.concurrent("should restore weights from the link, filling any dimension it omits from the draft", async () => {
    const page = await viz.given("a link that sets only tracing to 0", async () =>
      open({ w: JSON.stringify({ tracing: 0 }) }),
    );

    await viz.when("the user does nothing more", async () => {
      await Promise.resolve();
    });

    await viz.then(
      "tracing reads 0 and the rest keep their draft weights, so the max is 33 and Custom is 29",
      async () => {
        expect(await page.$eval('#dimsliders input[data-k="tracing"]', (s) => s.value)).toBe("0");
        expect(await page.$eval('#dimsliders input[data-k="determinism"]', (s) => s.value)).toBe(
          "3",
        );
        expect((await totals(page))["Custom Image"]).toBe("29 / 33");
      },
    );
  });

  it.concurrent("should ignore a link whose weights are unreadable and show the draft", async () => {
    const page = await viz.given("a link carrying garbage as its weights", async () =>
      open({ w: "{not json" }),
    );

    await viz.when("the user does nothing more", async () => {
      await Promise.resolve();
    });

    await viz.then("the draft weights show", async () => {
      expect(await totals(page)).toEqual(DRAFT_TOTALS);
    });
  });

  it.concurrent("should write a dragged weight into the link, so a reload keeps it", async () => {
    const page = await viz.given("a weight dragged", async () => {
      const p = await open();
      await weight(p, "llm", 0);
      await until(p, () => document.querySelector("#wl-llm")!.textContent === "0");
      return p;
    });

    await viz.when("the page reloads", async () => {
      await page.reload();
    });

    await viz.then("the weight is still 0 and the totals still reflect it", async () => {
      await until(
        page,
        () =>
          document.querySelector<HTMLInputElement>('#dimsliders input[data-k="llm"]')?.value ===
          "0",
      );
      expect((await totals(page))["Custom Image"]).toBe("32 / 36");
    });
  });
});

describe("the plain-language / technical switch", () => {
  const techVisible = async (page: P) => {
    const result = await page.$$eval(".tech-only", (els) =>
      els.every((e) => getComputedStyle(e).display !== "none"),
    );
    return result;
  };
  const techHidden = async (page: P) => {
    const result = await page.$$eval(".tech-only", (els) =>
      els.every((e) => getComputedStyle(e).display === "none"),
    );
    return result;
  };

  it.concurrent("should hide the technical detail until the switch is turned on, and hide it again when off", async () => {
    const page = await viz.given("the page in plain language", async () => {
      const p = await open();
      expect(await p.$eval("#audlabel", (e) => e.textContent)).toBe("Plain language");
      expect(await techHidden(p)).toBe(true);
      return p;
    });

    await viz.when("the user turns the switch on", async () => {
      await page.click("label.switch"); // the checkbox itself is drawn as a switch and hidden
    });
    await viz.then("the technical detail shows and the label says so", async () => {
      await until(page, () => document.body.classList.contains("tech"));
      expect(await techVisible(page)).toBe(true);
      expect(await page.$eval("#audlabel", (e) => e.textContent)).toBe("Technical detail");
    });

    await viz.when("it is turned off again", async () => {
      await page.click("label.switch"); // the checkbox itself is drawn as a switch and hidden
    });
    await viz.then("the detail is hidden again", async () => {
      await until(page, () => !document.body.classList.contains("tech"));
      expect(await techHidden(page)).toBe(true);
      expect(await page.$eval("#audlabel", (e) => e.textContent)).toBe("Plain language");
    });
  });

  it.concurrent("should open in technical mode from the link, with the switch on", async () => {
    const page = await viz.given("a link asking for technical detail", async () =>
      open({ tech: "1" }),
    );

    await viz.when("the user does nothing more", async () => {
      await Promise.resolve();
    });

    await viz.then("the switch is on and the detail shows", async () => {
      expect(
        await page.$eval("#techToggle", (c) => c instanceof HTMLInputElement && c.checked),
      ).toBe(true);
      expect(await page.$eval("#audlabel", (e) => e.textContent)).toBe("Technical detail");
      expect(
        await page.$$eval(".tech-only", (els) =>
          els.every((e) => getComputedStyle(e).display !== "none"),
        ),
      ).toBe(true);
    });
  });

  it.concurrent("should keep the chosen mode across a reload", async () => {
    const page = await viz.given("technical mode switched on", async () => {
      const p = await open();
      await p.click("label.switch"); // the checkbox itself is drawn as a switch and hidden
      await until(p, () => document.body.classList.contains("tech"));
      return p;
    });

    await viz.when("the page reloads", async () => {
      await page.reload();
    });

    await viz.then("it is still technical", async () => {
      await until(page, () => document.body.classList.contains("tech"));
      expect(
        await page.$eval("#techToggle", (c) => c instanceof HTMLInputElement && c.checked),
      ).toBe(true);
    });
  });

  it.concurrent("should not disturb the weights when the mode is switched", async () => {
    const page = await viz.given("a weight dragged", async () => {
      const p = await open();
      await weight(p, "llm", 0);
      await until(p, () => document.querySelector("#wl-llm")!.textContent === "0");
      return p;
    });

    await viz.when("the mode is switched on", async () => {
      await page.click("label.switch"); // the checkbox itself is drawn as a switch and hidden
      await until(page, () => document.body.classList.contains("tech"));
    });

    await viz.then("the weight and the totals are unchanged", async () => {
      expect((await totals(page))["Custom Image"]).toBe("32 / 36");
    });
  });
});
