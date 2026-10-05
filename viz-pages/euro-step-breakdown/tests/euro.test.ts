import { describe, it, expect } from "bun:test";
import { open, tab, text, setRange, reads, type P } from "./helpers.ts";

// ---- the move tab: a scrubber over a fixed timeline. The step that is "active" and the footprints drawn are computed
// from the scrubber value: step k is active once t >= its start (0, .30, .55, .82, .93); a footprint appears once t >= its time minus
// .001 (gather .30, "1" .55, "2" .82), a float tolerance that draws each footprint one scrub tick before its step starts.
// Boundary values are tested exactly at, and one below, each edge.
describe("the move tab", () => {
  const state = async (page: P) => {
    const st = await page.evaluate(() => ({
      active: [...document.querySelectorAll("#tab-move .step")]
        .map((s, i) => (s.classList.contains("active") ? i + 1 : 0))
        .filter(Boolean),
      prints: document.querySelectorAll("#tab-move .prints g").length,
      scrub: document.querySelector<HTMLInputElement>("#tab-move .scrub")!.value,
    }));
    return st;
  };

  it.concurrent("should light the step and footprints that the scrubber has reached, exactly at each boundary", async () => {
    // GIVEN the move tab
    const page = await open();
    const at = async (v: number) => {
      await setRange(page, "#tab-move .scrub", v);
      return state(page);
    };

    // WHEN the user scrubs to just before and exactly at each step start
    // THEN the active step and footprint count change exactly at the boundary, and nowhere else
    expect(await at(0)).toMatchObject({ active: [1], prints: 0 });
    expect(await at(298)).toMatchObject({ active: [1], prints: 0 });
    expect(await at(299)).toMatchObject({ active: [1], prints: 1 });
    expect(await at(300)).toMatchObject({ active: [2], prints: 1 });
    expect(await at(548)).toMatchObject({ active: [2], prints: 1 });
    expect(await at(549)).toMatchObject({ active: [2], prints: 2 });
    expect(await at(550)).toMatchObject({ active: [3], prints: 2 });
    expect(await at(818)).toMatchObject({ active: [3], prints: 2 });
    expect(await at(819)).toMatchObject({ active: [3], prints: 3 });
    expect(await at(820)).toMatchObject({ active: [4], prints: 3 });
    expect(await at(929)).toMatchObject({ active: [4], prints: 3 });
    expect(await at(930)).toMatchObject({ active: [5], prints: 3 });
    expect(await at(1000)).toMatchObject({ active: [5], prints: 3 });
    expect(page.errors).toEqual([]);
  });

  it.concurrent("should put the ball-handler and defender where the timeline says at the start and the end", async () => {
    // GIVEN the move tab
    const page = await open();
    const where = async () => {
      const w = await page.evaluate(() =>
        [".off", ".def"].map((s) =>
          document.querySelector(`#tab-move ${s}`)!.getAttribute("transform"),
        ),
      );
      return w;
    };

    // THEN at the start the attacker is at (150,430) and the defender at (250,175)
    expect(await where()).toEqual(["translate(150 430)", "translate(250 175)"]);
    // WHEN the user scrubs to the end
    await setRange(page, "#tab-move .scrub", 1000);
    // THEN the attacker has reached (232,78) and the defender is stranded at (298,210)
    expect(await where()).toEqual(["translate(232 78)", "translate(298 210)"]);
  });

  it.concurrent("should jump to a step when the user clicks its card, just past its start", async () => {
    // GIVEN the move tab
    const page = await open();

    // WHEN the user clicks the third card ("Step 1 — sell the fake", which starts at .55)
    await page.click("#tab-move .step:nth-child(3)");

    // THEN that step is active and the scrubber sits at .551, so both first footprints are down
    expect(await state(page)).toMatchObject({ active: [3], scrub: "551", prints: 2 });
  });

  it.concurrent("should play forward from the start, pause where it is, and restart from zero", async () => {
    // GIVEN the move tab
    const page = await open();
    const scrub = async () => +(await state(page)).scrub;

    // WHEN the user presses Play
    await page.click("#tab-move .play");
    // THEN the label changes and the scrubber moves off zero
    await reads(page, "#tab-move .play", "❚❚ Pause");
    await page.waitForFunction(
      () => +document.querySelector<HTMLInputElement>("#tab-move .scrub")!.value > 20,
    );

    // WHEN the user pauses
    await page.click("#tab-move .play");
    await reads(page, "#tab-move .play", "▶ Play");
    const held = await scrub();
    await new Promise<void>((done) => {
      setTimeout(done, 400);
    });
    // THEN it stops where it was
    expect(await scrub()).toBe(held);

    // WHEN the user presses Restart
    await setRange(page, "#tab-move .scrub", 900);
    await page.click("#tab-move .restart");
    // THEN it is playing again, from near the beginning
    await reads(page, "#tab-move .play", "❚❚ Pause");
    expect(await scrub()).toBeLessThan(300);
  });
});

describe("the move tab, played to the end", () => {
  it.concurrent("should stop at the end on its own, showing the finish, and replay from the start", async () => {
    // GIVEN the move tab
    const page = await open();

    // WHEN the user presses Play and lets it run out (6.5 s)
    await page.click("#tab-move .play");
    await reads(page, "#tab-move .play", "▶ Play", 20_000);

    // THEN the scrubber is at the end with the last step active and the attacker at the rim
    expect(
      await page.$eval("#tab-move .scrub", (s) => (s instanceof HTMLInputElement ? s.value : "")),
    ).toBe("1000");
    expect(
      await page.$eval("#tab-move .step:nth-child(5)", (s) => s.classList.contains("active")),
    ).toBe(true);
    expect(await page.$eval("#tab-move .off", (o) => o.getAttribute("transform"))).toBe(
      "translate(232 78)",
    );

    // WHEN the user presses Play again
    await page.click("#tab-move .play");
    // THEN it runs from the start, not from the end
    await reads(page, "#tab-move .play", "❚❚ Pause");
    await page.waitForFunction(
      () => +document.querySelector<HTMLInputElement>("#tab-move .scrub")!.value < 300,
      { timeout: 5000 },
    );
  }, 30_000);
});

// ---- the "why it works" tab: drag the defender and the page COMPUTES whether the finish is open. The plan (worked by hand):
// D is the defender. spaceSide = +1 when D.x <= 250 (the rim), else -1; the fake goes to the other side, 72 px sideways and 6 down
// from D; the defender lunges 34 px toward the fake; the finish is at (250 + spaceSide*46, 92); the finish is "open" when it is
// farther than 52 px from the lunge end, and the margin is that distance minus 52, rounded.
describe("the why-it-works tab", () => {
  const verdict = async (page: P) => {
    const v = await text(page, "#tab-why .verdict .big");
    return v;
  };

  /** Drag the defender to an SVG coordinate, the way a user does (mouse down on it, move, release). */
  async function drag(page: P, x: number, y: number) {
    const pts = await page.evaluate(
      (tx, ty) => {
        const svg = document.querySelector<SVGSVGElement>("#tab-why .why-court")!;
        const def = document.querySelector<SVGGElement>("#tab-why .def")!;
        const toClient = (px: number, py: number) => {
          const p = svg.createSVGPoint();
          p.x = px;
          p.y = py;
          const c = p.matrixTransform(svg.getScreenCTM()!);
          return { x: c.x, y: c.y };
        };
        const r = def.getBoundingClientRect();
        return { from: { x: r.x + r.width / 2, y: r.y + r.height / 2 }, to: toClient(tx, ty) };
      },
      x,
      y,
    );
    await page.mouse.move(pts.from.x, pts.from.y);
    await page.mouse.down();
    await page.mouse.move(pts.to.x, pts.to.y, { steps: 4 });
    await page.mouse.up();
  }

  it.concurrent("should call the finish open with an 81 px margin for the defender's starting spot", async () => {
    // GIVEN the tab with the defender at (250,195). Working: fake (178,201), lunge end (216.1,197.8), finish (296,92):
    // distance 132.6, minus 52 = 80.6 -> 81
    const page = await open();
    await tab(page, "why");

    // THEN it reads open with +81 px
    expect(await verdict(page)).toBe("🏀 OPEN LAYUP (+81px clear)");
    expect(await page.$eval("#tab-why .verdict", (v) => v.className)).toBe("verdict open");
    expect(await page.$eval("#tab-why .finish", (f) => f.getAttribute("transform"))).toBe(
      "translate(296 92)",
    );
  });

  it.concurrent("should recompute the margin as the defender is dragged, and flip the finish to the other side of the rim", async () => {
    // GIVEN the tab
    const page = await open();
    await tab(page, "why");

    // WHEN the user drags the defender to the top-left corner (120,80): lunge end (86.1,82.8), finish (296,92):
    // distance 210.1, minus 52 = 158
    await drag(page, 120, 80);
    // THEN the margin is 158 and the finish is still on the right of the rim
    await reads(page, "#tab-why .verdict .big", "🏀 OPEN LAYUP (+158px clear)");
    expect(await page.$eval("#tab-why .finish", (f) => f.getAttribute("transform"))).toBe(
      "translate(296 92)",
    );

    // WHEN the user drags to (300,100), right of the rim: finish moves to (204,92), fake to the right,
    // lunge end (333.9,102.8): distance 130.3, minus 52 = 78
    await drag(page, 300, 100);
    // THEN the margin is 78 and the finish has flipped to the left of the rim
    await reads(page, "#tab-why .verdict .big", "🏀 OPEN LAYUP (+78px clear)");
    expect(await page.$eval("#tab-why .finish", (f) => f.getAttribute("transform"))).toBe(
      "translate(204 92)",
    );
  });

  it.concurrent("should keep the defender inside the court however far the user drags", async () => {
    // GIVEN the tab
    const page = await open();
    await tab(page, "why");

    // WHEN the user drags the defender far past the bottom-right corner (clamped to 380,300):
    // gather (380,300), fake (452,306), lunge end (413.9,302.8), finish (204,92): distance 297.5, minus 52 = 245
    await drag(page, 470, 340);

    // THEN it stops at (380,300) and reads +245
    await reads(page, "#tab-why .verdict .big", "🏀 OPEN LAYUP (+245px clear)");
    expect(await page.$eval("#tab-why .def", (d) => d.getAttribute("transform"))).toBe(
      "translate(380 300)",
    );
  });

  it.concurrent("should put the defender back and read 81 again on Reset", async () => {
    // GIVEN the defender dragged away
    const page = await open();
    await tab(page, "why");
    await drag(page, 120, 80);
    await reads(page, "#tab-why .verdict .big", "🏀 OPEN LAYUP (+158px clear)");

    // WHEN the user presses Reset
    await page.click("#tab-why .wreset");

    // THEN it is back at (250,195) and reads +81
    await reads(page, "#tab-why .verdict .big", "🏀 OPEN LAYUP (+81px clear)");
    expect(await page.$eval("#tab-why .def", (d) => d.getAttribute("transform"))).toBe(
      "translate(250 195)",
    );
  });

  it.concurrent("should run the move: the defender lunges toward the fake and the run ends on Run the move again", async () => {
    // GIVEN the tab
    const page = await open();
    await tab(page, "why");

    // WHEN the user runs the move and it plays out (4.2 s)
    await page.click("#tab-why .wplay");
    await reads(page, "#tab-why .wplay", "❚❚ Stop");
    await reads(page, "#tab-why .wplay", "▶ Run the move");

    // THEN the defender ends 34 px along the fake direction from (250,195): (216.1,197.8)
    const m = (await page.$eval("#tab-why .def", (d) => d.getAttribute("transform")))!.match(
      /translate\(([\d.]+) ([\d.]+)\)/u,
    )!;
    expect(+m[1]!).toBeCloseTo(216.117, 2);
    expect(+m[2]!).toBeCloseTo(197.824, 2);
    // AND the finish ring is green because the finish is open
    expect(await page.$eval("#tab-why .finish circle", (c) => c.getAttribute("stroke"))).toBe(
      "#36c98f",
    );
  }, 20_000);
});

// ---- the rookie-vs-pro tab: a timed animation whose end state stamps each pane. Rookie: "CHARGE!" once a >= .72;
// pro: "BUCKET 🏀" once a >= .9.
describe("the rookie-vs-pro tab", () => {
  it.concurrent("should stamp CHARGE! on the rookie and BUCKET on the pro at the end of the run, and not before", async () => {
    // GIVEN the tab before any run
    const page = await open();
    await tab(page, "vs");
    const stamps = async () => {
      const st = await page.$$eval("#tab-vs .vs-pane", (panes) =>
        panes.map((p) => {
          const s = p.querySelector<SVGTextElement>(".vstamp")!;
          return {
            kind: p instanceof HTMLElement ? p.dataset["kind"] : undefined,
            text: s.textContent,
            shown: s.style.opacity === "1",
            fill: s.getAttribute("fill"),
          };
        }),
      );
      return st;
    };

    // THEN both stamps are hidden
    expect((await stamps()).map((s) => s.shown)).toEqual([false, false]);

    // WHEN the user runs both and it finishes (3.6 s)
    await page.click("#tab-vs .vsplay");
    await reads(page, "#tab-vs .vsplay", "↺ Run both again");

    // THEN the rookie is stamped CHARGE! in red and the pro BUCKET in green
    expect(await stamps()).toEqual([
      { kind: "rookie", text: "CHARGE!", shown: true, fill: "#e2493f" },
      { kind: "pro", text: "BUCKET 🏀", shown: true, fill: "#36c98f" },
    ]);
  }, 20_000);
});

// ---- the footwork tab: two buttons play fixed timelines that end with a verdict and a step counter.
describe("the footwork tab", () => {
  const read = async (page: P) => {
    const st = await page.evaluate(() => ({
      count: document.querySelector(".feet-count")!.textContent,
      banner: document.querySelector(".feet-banner .big")!.textContent,
      cls: document.querySelector(".feet-banner")!.className,
      shown: [...document.querySelectorAll<SVGGElement>("#tab-feet .fp")]
        .filter((g) => g.style.opacity === "1")
        .map((g) => g.dataset["id"]),
    }));
    return st;
  };

  it.concurrent("should count two steps and call a legal Euro Step a bucket", async () => {
    // GIVEN the footwork tab, before any run
    const page = await open();
    await tab(page, "feet");
    expect(await read(page)).toMatchObject({
      count: "0",
      banner: "Press a button below",
      shown: [],
    });

    // WHEN the user runs the legal Euro Step to its end
    await page.click(".feet-legal");
    await page.waitForFunction(
      () => document.querySelector(".feet-banner .big")!.textContent === "🏀 LEGAL — bucket",
      { timeout: 10_000 },
    );

    // THEN two steps were counted, the gather and steps 1 and 2 are down and the third is not
    expect(await read(page)).toEqual({
      count: "2",
      banner: "🏀 LEGAL — bucket",
      cls: "feet-banner verdict open",
      shown: ["gather", "s1", "s2"],
    });
  }, 20_000);

  it.concurrent("should call a third step a travel and turn the counter red", async () => {
    // GIVEN the footwork tab
    const page = await open();
    await tab(page, "feet");

    // WHEN the user takes the third step
    await page.click(".feet-travel");
    await page.waitForFunction(
      () => document.querySelector(".feet-banner .big")!.textContent === "🚫 TRAVEL — turnover",
      { timeout: 10_000 },
    );

    // THEN the counter reads 3 in red and all four footprints are down
    expect(await read(page)).toEqual({
      count: "3",
      banner: "🚫 TRAVEL — turnover",
      cls: "feet-banner verdict contested",
      shown: ["gather", "s1", "s2", "s3"],
    });
    expect(
      await page.$eval(".feet-count", (c) => (c instanceof HTMLElement ? c.style.color : "")),
    ).toBe("rgb(226, 73, 63)");
  }, 20_000);

  it.concurrent("should start over when the user leaves the tab", async () => {
    // GIVEN a travel in progress, in the footwork tab
    const page = await open();
    await tab(page, "feet");
    await page.click(".feet-travel");
    await page.waitForFunction(() => document.querySelector(".feet-count")!.textContent === "1", {
      timeout: 10_000,
    });

    // WHEN the user goes to another tab
    await tab(page, "move");

    // THEN the footwork tab is reset, and nothing left running writes into it later
    await new Promise<void>((done) => {
      setTimeout(done, 3000);
    });
    expect(await read(page)).toMatchObject({
      count: "0",
      banner: "Press a button below",
      shown: [],
    });
  }, 20_000);
});

// ---- the 3D tab: three (real, served locally) draws the scene; what the page COMPUTES from the scrubber that a test can read is the phase
// title: The drive < .38 <= The gather < .50 <= Step 1 < .70 <= Step 2 < .90 <= The finish.
describe("the 3D tab", () => {
  it.concurrent("should name the phase the scrubber has reached, exactly at each boundary", async () => {
    // GIVEN the 3D tab opened with real three
    const page = await open();
    await tab(page, "d3");
    await page.waitForSelector(".d3-canvas canvas", { timeout: 20_000 });
    const phase = async (v: number) => {
      await setRange(page, ".d3scrub", v);
      return text(page, "#d3phaseTitle");
    };

    // WHEN the user scrubs to just before and exactly at each phase start
    // THEN the title changes exactly at the boundary
    expect(await phase(0)).toBe("The drive");
    expect(await phase(379)).toBe("The drive");
    expect(await phase(380)).toBe("The gather");
    expect(await phase(499)).toBe("The gather");
    expect(await phase(500)).toBe("Step 1 — the fake");
    expect(await phase(699)).toBe("Step 1 — the fake");
    expect(await phase(700)).toBe("Step 2 — the cross");
    expect(await phase(899)).toBe("Step 2 — the cross");
    expect(await phase(900)).toBe("The finish");
    expect(await text(page, ".d3phase")).toBe("Up at the rim, far side, defender stranded.");
    expect(page.errors).toEqual([]);
  }, 30_000);

  it.concurrent("should play, pausing the label, and let the scrubber take over", async () => {
    // GIVEN the 3D tab
    const page = await open();
    await tab(page, "d3");
    await page.waitForSelector(".d3-canvas canvas", { timeout: 20_000 });

    // WHEN the user presses Play
    await page.click(".d3play");
    // THEN it says Pause and the scrubber moves off zero
    await reads(page, ".d3play", "❚❚ Pause");
    await page.waitForFunction(
      () => +document.querySelector<HTMLInputElement>(".d3scrub")!.value > 20,
      { timeout: 10_000 },
    );

    // WHEN the user grabs the scrubber
    await setRange(page, ".d3scrub", 500);
    // THEN playing stops and the label goes back to Play
    await reads(page, ".d3play", "▶ Play");
    expect(await text(page, "#d3phaseTitle")).toBe("Step 1 — the fake");
  }, 30_000);
});
