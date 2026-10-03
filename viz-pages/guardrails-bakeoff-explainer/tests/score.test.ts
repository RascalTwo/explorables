import { describe, it, expect } from "bun:test";
import type { Page } from "puppeteer-core";

declare global {
  // eslint-disable-next-line no-var
  var viz: {
    open(hash?: string | object, o?: { width?: number; height?: number; before?: (p: Page) => unknown }): Promise<Page & { errors: string[] }>;
  };
}
type P = Page & { errors: string[] };

// The page has no backend and no outside request; it draws five contenders scored on seven dimensions.
// At the draft weights (tracing 3, determinism 3, LLM rules 2, integration 2, ops 2, build 1, repro 1; max 42):
//   Custom 38 · Raw OSS 21 · OSS+ 36 · Microservice 27 · Micro+ 32

const DIMS = ["tracing", "determinism", "llm", "integration", "ops", "build", "repro"] as const;
type Dim = (typeof DIMS)[number];

const open = (hash?: object): Promise<P> => viz.open(hash, {
  before: async (p) => {
    // The dev server's feedback pill floats over the page; it is the server's overlay, not the page's.
    await p.evaluateOnNewDocument(() => addEventListener("DOMContentLoaded", () =>
      document.head.append(Object.assign(document.createElement("style"), { textContent: "#viz-feedback { display: none !important; }" }))));
  },
});

/** Drag one weight slider to a value, as a user does, firing the input event. */
const weight = (page: P, dim: Dim, v: number) =>
  page.$eval(`#dimsliders input[data-k="${dim}"]`, (el, val) => { (el as HTMLInputElement).value = String(val); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
/** Set every weight at once: unlisted dimensions go to 0. */
const weights = async (page: P, w: Partial<Record<Dim, number>>) => { for (const d of DIMS) await weight(page, d, w[d] ?? 0); };

/** The five bars as the user reads them: "Custom Image" → "38 / 42". */
const totals = (page: P) => page.$$eval("#bars .bar", (bars) =>
  Object.fromEntries(bars.map((b) => [b.querySelector(".who")!.textContent!, b.querySelector(".tot")!.textContent!.replace(/\s+/g, " ").trim()])));
const banner = (page: P) => page.$eval("#winbanner", (e) => e.textContent!.replace(/\s+/g, " ").trim());
const until = (page: P, fn: () => boolean, ...args: unknown[]) => page.waitForFunction(fn as never, { timeout: 10_000 }, ...args);

const DRAFT_TOTALS = {
  "Custom Image": "38 / 42", "Raw OSS Image": "21 / 42", "OSS + Parity": "36 / 42", "NVIDIA Microservice": "27 / 42", "Microservice + Parity": "32 / 42",
};

describe("the weighted score at the draft weights", () => {
  it.concurrent("should total each contender's scores times the weights, out of 42", async () => {
    // GIVEN the page freshly opened
    const page = await open();

    // THEN each bar reads its weighted total over 42
    expect(await totals(page)).toEqual(DRAFT_TOTALS);
    expect(page.errors).toEqual([]);
  });

  it.concurrent("should name the leader and how far ahead it is", async () => {
    // GIVEN the draft weights
    const page = await open();

    // THEN the banner says Custom leads with 38/42, 2 ahead of OSS+
    expect(await banner(page)).toContain("the Custom Image leads on raw score with 38/42 — 2 ahead of the OSS+");
  });

  it.concurrent("should show one weight slider per dimension, at its draft weight", async () => {
    // GIVEN the draft weights
    const page = await open();

    // THEN there are seven sliders reading 3,3,2,2,2,1,1, each labelled with its weight
    expect(await page.$$eval("#dimsliders input[type=range]", (s) => s.map((x) => (x as HTMLInputElement).value))).toEqual(["3", "3", "2", "2", "2", "1", "1"]);
    expect(await page.$$eval("#dimsliders .wlab b", (b) => b.map((x) => x.textContent))).toEqual(["3", "3", "2", "2", "2", "1", "1"]);
  });

  it.concurrent("should split a bar into one segment per dimension, sized by weight times score", async () => {
    // GIVEN the draft weights
    const page = await open();

    // THEN Custom's bar has seven segments, tracing is 9 of 42 wide, and Raw OSS has no tracing segment
    const segs = (who: string) => page.$$eval("#bars .bar", (bars, w) => {
      const bar = bars.find((b) => b.querySelector(".who")!.textContent === w)!;
      return [...bar.querySelectorAll(".seg")].map((s) => ({ title: (s as HTMLElement).title, width: (s as HTMLElement).style.width }));
    }, who);
    const custom = await segs("Custom Image");
    expect(custom).toHaveLength(7);
    expect(custom[0]!.title).toBe("Dashboard tracing: 9");
    expect(parseFloat(custom[0]!.width)).toBeCloseTo((9 / 42) * 100, 2);
    const raw = await segs("Raw OSS Image");
    expect(raw.map((s) => s.title)).not.toContain("Dashboard tracing: 0");
    expect(raw).toHaveLength(5); // tracing and LLM-judged rules score 0 for it
  });
});

describe("dragging the weights", () => {
  it.concurrent("should re-total every bar and update the slider's label when a weight moves", async () => {
    // GIVEN the draft weights
    const page = await open();

    // WHEN "LLM-judged rules" goes from 2 to 0 (those score 3,0,3,0,3 for the five)
    await weight(page, "llm", 0);

    // THEN the max falls to 36, Custom to 32, OSS+ to 30, Micro+ to 26; Raw OSS and Microservice are unchanged
    await until(page, () => document.querySelector("#wl-llm")!.textContent === "0");
    expect(await totals(page)).toEqual({
      "Custom Image": "32 / 36", "Raw OSS Image": "21 / 36", "OSS + Parity": "30 / 36", "NVIDIA Microservice": "27 / 36", "Microservice + Parity": "26 / 36",
    });
  });

  it.concurrent("should crown a different leader when the weights favour it", async () => {
    // GIVEN only "Build / maintain effort" weighted (scores 1,1,1,2,1)
    const page = await open();
    await weights(page, { build: 3 });

    // THEN the Microservice leads with 6/9, 3 ahead of the Custom
    await until(page, () => document.querySelector("#winbanner")!.textContent!.includes("NVIDIA Microservice"));
    expect(await banner(page)).toContain("the NVIDIA Microservice leads on raw score with 6/9 — 3 ahead of the Custom");
    expect((await totals(page))["NVIDIA Microservice"]).toBe("6 / 9");
  });

  it.concurrent("should say tied, not ahead, when the top two are level", async () => {
    // GIVEN only "Version reproducibility" weighted (scores 3,1,1,3,3): Custom, Microservice and Micro+ all top out
    const page = await open();
    await weights(page, { repro: 3 });

    // THEN the banner says the leader is tied
    await until(page, () => document.querySelector("#winbanner")!.textContent!.includes("tied with"));
    expect(await banner(page)).toContain("leads on raw score with 9/9 — tied with the Microservice");
  });

  it.concurrent("should show empty bars and 0 of 0 when every weight is zero, without breaking", async () => {
    // GIVEN the draft weights
    const page = await open();

    // WHEN the user drags every weight to zero
    await weights(page, {});

    // THEN each bar reads 0 / 0 and is drawn empty, and the page did not error
    await until(page, () => document.querySelector("#wl-repro")!.textContent === "0");
    expect(Object.values(await totals(page))).toEqual(["0 / 0", "0 / 0", "0 / 0", "0 / 0", "0 / 0"]);
    expect(await page.$$eval("#bars .track.empty", (t) => t.length)).toBe(5);
    expect(await page.$$eval("#bars .seg", (s) => s.length)).toBe(0);
    expect(page.errors).toEqual([]);
  });

  it.concurrent("should go back to the draft weights on reset", async () => {
    // GIVEN weights dragged away from the draft
    const page = await open();
    await weights(page, { build: 3 });
    await until(page, () => document.querySelector("#wl-build")!.textContent === "3");

    // WHEN the user presses reset
    await page.click("#resetw");

    // THEN the sliders, labels and totals are the draft's again
    await until(page, () => document.querySelector("#wl-tracing")!.textContent === "3");
    expect(await page.$$eval("#dimsliders input[type=range]", (s) => s.map((x) => (x as HTMLInputElement).value))).toEqual(["3", "3", "2", "2", "2", "1", "1"]);
    expect(await totals(page)).toEqual(DRAFT_TOTALS);
  });
});

describe("sharing state in the link", () => {
  it.concurrent("should restore weights from the link, filling any dimension it omits from the draft", async () => {
    // GIVEN a link that sets only tracing to 0
    const page = await open({ w: JSON.stringify({ tracing: 0 }) });

    // THEN tracing reads 0 and the rest keep their draft weights, so the max is 33 and Custom is 29
    expect(await page.$eval('#dimsliders input[data-k="tracing"]', (s) => (s as HTMLInputElement).value)).toBe("0");
    expect(await page.$eval('#dimsliders input[data-k="determinism"]', (s) => (s as HTMLInputElement).value)).toBe("3");
    expect((await totals(page))["Custom Image"]).toBe("29 / 33");
  });

  it.concurrent("should ignore a link whose weights are unreadable and show the draft", async () => {
    // GIVEN a link carrying garbage as its weights
    const page = await open({ w: "{not json" });

    // THEN the draft weights show
    expect(await totals(page)).toEqual(DRAFT_TOTALS);
  });

  it.concurrent("should write a dragged weight into the link, so a reload keeps it", async () => {
    // GIVEN a weight dragged
    const page = await open();
    await weight(page, "llm", 0);
    await until(page, () => document.querySelector("#wl-llm")!.textContent === "0");

    // WHEN the page reloads
    await page.reload();

    // THEN the weight is still 0 and the totals still reflect it
    await until(page, () => (document.querySelector('#dimsliders input[data-k="llm"]') as HTMLInputElement | null)?.value === "0");
    expect((await totals(page))["Custom Image"]).toBe("32 / 36");
  });
});

describe("the plain-language / technical switch", () => {
  const techVisible = (page: P) => page.$$eval(".tech-only", (els) => els.every((e) => getComputedStyle(e).display !== "none"));
  const techHidden = (page: P) => page.$$eval(".tech-only", (els) => els.every((e) => getComputedStyle(e).display === "none"));

  it.concurrent("should hide the technical detail until the switch is turned on, and hide it again when off", async () => {
    // GIVEN the page in plain language
    const page = await open();
    expect(await page.$eval("#audlabel", (e) => e.textContent)).toBe("Plain language");
    expect(await techHidden(page)).toBe(true);

    // WHEN the user turns the switch on
    await page.click("label.switch"); // the checkbox itself is drawn as a switch and hidden

    // THEN the technical detail shows and the label says so
    await until(page, () => document.body.classList.contains("tech"));
    expect(await techVisible(page)).toBe(true);
    expect(await page.$eval("#audlabel", (e) => e.textContent)).toBe("Technical detail");

    // WHEN it is turned off again
    await page.click("label.switch"); // the checkbox itself is drawn as a switch and hidden

    // THEN the detail is hidden again
    await until(page, () => !document.body.classList.contains("tech"));
    expect(await techHidden(page)).toBe(true);
    expect(await page.$eval("#audlabel", (e) => e.textContent)).toBe("Plain language");
  });

  it.concurrent("should open in technical mode from the link, with the switch on", async () => {
    // GIVEN a link asking for technical detail
    const page = await open({ tech: "1" });

    // THEN the switch is on and the detail shows
    expect(await page.$eval("#techToggle", (c) => (c as HTMLInputElement).checked)).toBe(true);
    expect(await page.$eval("#audlabel", (e) => e.textContent)).toBe("Technical detail");
    expect(await page.$$eval(".tech-only", (els) => els.every((e) => getComputedStyle(e).display !== "none"))).toBe(true);
  });

  it.concurrent("should keep the chosen mode across a reload", async () => {
    // GIVEN technical mode switched on
    const page = await open();
    await page.click("label.switch"); // the checkbox itself is drawn as a switch and hidden
    await until(page, () => document.body.classList.contains("tech"));

    // WHEN the page reloads
    await page.reload();

    // THEN it is still technical
    await until(page, () => document.body.classList.contains("tech"));
    expect(await page.$eval("#techToggle", (c) => (c as HTMLInputElement).checked)).toBe(true);
  });

  it.concurrent("should not disturb the weights when the mode is switched", async () => {
    // GIVEN a weight dragged
    const page = await open();
    await weight(page, "llm", 0);
    await until(page, () => document.querySelector("#wl-llm")!.textContent === "0");

    // WHEN the mode is switched on
    await page.click("label.switch"); // the checkbox itself is drawn as a switch and hidden
    await until(page, () => document.body.classList.contains("tech"));

    // THEN the weight and the totals are unchanged
    expect((await totals(page))["Custom Image"]).toBe("32 / 36");
  });
});
