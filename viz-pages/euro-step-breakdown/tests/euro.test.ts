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
    const { page, at } = await viz.given("the move tab", async () => {
      const p = await open();
      const scrubTo = async (v: number) => {
        await setRange(p, "#tab-move .scrub", v);
        const st = await state(p);
        return st;
      };
      return { page: p, at: scrubTo };
    });

    const seen = await viz.when(
      "the user scrubs to just before and exactly at each step start",
      async () => {
        const s0 = await at(0);
        const s298 = await at(298);
        const s299 = await at(299);
        const s300 = await at(300);
        const s548 = await at(548);
        const s549 = await at(549);
        const s550 = await at(550);
        const s818 = await at(818);
        const s819 = await at(819);
        const s820 = await at(820);
        const s929 = await at(929);
        const s930 = await at(930);
        const s1000 = await at(1000);
        return { s0, s298, s299, s300, s548, s549, s550, s818, s819, s820, s929, s930, s1000 };
      },
    );

    await viz.then(
      "the active step and footprint count change exactly at the boundary, and nowhere else",
      () => {
        expect(seen.s0).toMatchObject({ active: [1], prints: 0 });
        expect(seen.s298).toMatchObject({ active: [1], prints: 0 });
        expect(seen.s299).toMatchObject({ active: [1], prints: 1 });
        expect(seen.s300).toMatchObject({ active: [2], prints: 1 });
        expect(seen.s548).toMatchObject({ active: [2], prints: 1 });
        expect(seen.s549).toMatchObject({ active: [2], prints: 2 });
        expect(seen.s550).toMatchObject({ active: [3], prints: 2 });
        expect(seen.s818).toMatchObject({ active: [3], prints: 2 });
        expect(seen.s819).toMatchObject({ active: [3], prints: 3 });
        expect(seen.s820).toMatchObject({ active: [4], prints: 3 });
        expect(seen.s929).toMatchObject({ active: [4], prints: 3 });
        expect(seen.s930).toMatchObject({ active: [5], prints: 3 });
        expect(seen.s1000).toMatchObject({ active: [5], prints: 3 });
        expect(page.errors).toEqual([]);
      },
    );
  });

  it.concurrent("should put the ball-handler and defender where the timeline says at the start and the end", async () => {
    const { page, where } = await viz.given(
      "the move tab, where at the start the attacker is at (150,430) and the defender at (250,175)",
      async () => {
        const p = await open();
        const locate = async () => {
          const w = await p.evaluate(() =>
            [".off", ".def"].map((s) =>
              document.querySelector(`#tab-move ${s}`)!.getAttribute("transform"),
            ),
          );
          return w;
        };
        expect(await locate()).toEqual(["translate(150 430)", "translate(250 175)"]);
        return { page: p, where: locate };
      },
    );

    await viz.when("the user scrubs to the end", async () => {
      await setRange(page, "#tab-move .scrub", 1000);
    });

    await viz.then(
      "the attacker has reached (232,78) and the defender is stranded at (298,210)",
      async () => {
        expect(await where()).toEqual(["translate(232 78)", "translate(298 210)"]);
      },
    );
  });

  it.concurrent("should jump to a step when the user clicks its card, just past its start", async () => {
    const page = await viz.given("the move tab", async () => {
      const p = await open();
      return p;
    });

    await viz.when(
      'the user clicks the third card ("Step 1 — sell the fake", which starts at .55)',
      async () => {
        await page.click("#tab-move .step:nth-child(3)");
      },
    );

    await viz.then(
      "that step is active and the scrubber sits at .551, so both first footprints are down",
      async () => {
        expect(await state(page)).toMatchObject({ active: [3], scrub: "551", prints: 2 });
      },
    );
  });

  it.concurrent("should play forward from the start, pause where it is, and restart from zero", async () => {
    const { page, scrub } = await viz.given("the move tab", async () => {
      const p = await open();
      const scrubValue = async () => +(await state(p)).scrub;
      return { page: p, scrub: scrubValue };
    });

    await viz.when("the user presses Play", async () => {
      await page.click("#tab-move .play");
    });

    await viz.then("the label changes and the scrubber moves off zero", async () => {
      await reads(page, "#tab-move .play", "❚❚ Pause");
      await page.waitForFunction(
        () => +document.querySelector<HTMLInputElement>("#tab-move .scrub")!.value > 20,
      );
    });

    await viz.when("the user pauses", async () => {
      await page.click("#tab-move .play");
    });

    await viz.then("it stops where it was", async () => {
      await reads(page, "#tab-move .play", "▶ Play");
      const held = await scrub();
      await new Promise<void>((done) => {
        setTimeout(done, 400);
      });
      expect(await scrub()).toBe(held);
    });

    await viz.when("the user presses Restart", async () => {
      await setRange(page, "#tab-move .scrub", 900);
      await page.click("#tab-move .restart");
    });

    await viz.then("it is playing again, from near the beginning", async () => {
      await reads(page, "#tab-move .play", "❚❚ Pause");
      expect(await scrub()).toBeLessThan(300);
    });
  });
});

describe("the move tab, played to the end", () => {
  it.concurrent("should stop at the end on its own, showing the finish, and replay from the start", async () => {
    const page = await viz.given("the move tab", async () => {
      const p = await open();
      return p;
    });

    await viz.when("the user presses Play and lets it run out (6.5 s)", async () => {
      await page.click("#tab-move .play");
      await reads(page, "#tab-move .play", "▶ Play", 20_000);
    });

    await viz.then(
      "the scrubber is at the end with the last step active and the attacker at the rim",
      async () => {
        expect(
          await page.$eval("#tab-move .scrub", (s) =>
            s instanceof HTMLInputElement ? s.value : "",
          ),
        ).toBe("1000");
        expect(
          await page.$eval("#tab-move .step:nth-child(5)", (s) => s.classList.contains("active")),
        ).toBe(true);
        expect(await page.$eval("#tab-move .off", (o) => o.getAttribute("transform"))).toBe(
          "translate(232 78)",
        );
      },
    );

    await viz.when("the user presses Play again", async () => {
      await page.click("#tab-move .play");
    });

    await viz.then("it runs from the start, not from the end", async () => {
      await reads(page, "#tab-move .play", "❚❚ Pause");
      await page.waitForFunction(
        () => +document.querySelector<HTMLInputElement>("#tab-move .scrub")!.value < 300,
        { timeout: 5000 },
      );
    });
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
    // Working: fake (178,201), lunge end (216.1,197.8), finish (296,92): distance 132.6, minus 52 = 80.6 -> 81
    const page = await viz.given("the why tab with the defender at (250,195)", async () => {
      const p = await open();
      await tab(p, "why");
      return p;
    });

    await viz.when("the user leaves the defender where it starts");

    await viz.then("it reads open with +81 px", async () => {
      expect(await verdict(page)).toBe("🏀 OPEN LAYUP (+81px clear)");
      expect(await page.$eval("#tab-why .verdict", (v) => v.className)).toBe("verdict open");
      expect(await page.$eval("#tab-why .finish", (f) => f.getAttribute("transform"))).toBe(
        "translate(296 92)",
      );
    });
  });

  it.concurrent("should recompute the margin as the defender is dragged, and flip the finish to the other side of the rim", async () => {
    const page = await viz.given("the why tab", async () => {
      const p = await open();
      await tab(p, "why");
      return p;
    });

    // Lunge end (86.1,82.8), finish (296,92): distance 210.1, minus 52 = 158
    await viz.when("the user drags the defender to the top-left corner (120,80)", async () => {
      await drag(page, 120, 80);
    });

    await viz.then(
      "the margin is 158 and the finish is still on the right of the rim",
      async () => {
        await reads(page, "#tab-why .verdict .big", "🏀 OPEN LAYUP (+158px clear)");
        expect(await page.$eval("#tab-why .finish", (f) => f.getAttribute("transform"))).toBe(
          "translate(296 92)",
        );
      },
    );

    // Finish moves to (204,92), fake to the right, lunge end (333.9,102.8): distance 130.3, minus 52 = 78
    await viz.when("the user drags to (300,100), right of the rim", async () => {
      await drag(page, 300, 100);
    });

    await viz.then(
      "the margin is 78 and the finish has flipped to the left of the rim",
      async () => {
        await reads(page, "#tab-why .verdict .big", "🏀 OPEN LAYUP (+78px clear)");
        expect(await page.$eval("#tab-why .finish", (f) => f.getAttribute("transform"))).toBe(
          "translate(204 92)",
        );
      },
    );
  });

  it.concurrent("should keep the defender inside the court however far the user drags", async () => {
    const page = await viz.given("the why tab", async () => {
      const p = await open();
      await tab(p, "why");
      return p;
    });

    // Clamped to 380,300: gather (380,300), fake (452,306), lunge end (413.9,302.8), finish (204,92): distance 297.5, minus 52 = 245
    await viz.when("the user drags the defender far past the bottom-right corner", async () => {
      await drag(page, 470, 340);
    });

    await viz.then("it stops at (380,300) and reads +245", async () => {
      await reads(page, "#tab-why .verdict .big", "🏀 OPEN LAYUP (+245px clear)");
      expect(await page.$eval("#tab-why .def", (d) => d.getAttribute("transform"))).toBe(
        "translate(380 300)",
      );
    });
  });

  it.concurrent("should put the defender back and read 81 again on Reset", async () => {
    const page = await viz.given("the defender dragged away", async () => {
      const p = await open();
      await tab(p, "why");
      await drag(p, 120, 80);
      await reads(p, "#tab-why .verdict .big", "🏀 OPEN LAYUP (+158px clear)");
      return p;
    });

    await viz.when("the user presses Reset", async () => {
      await page.click("#tab-why .wreset");
    });

    await viz.then("it is back at (250,195) and reads +81", async () => {
      await reads(page, "#tab-why .verdict .big", "🏀 OPEN LAYUP (+81px clear)");
      expect(await page.$eval("#tab-why .def", (d) => d.getAttribute("transform"))).toBe(
        "translate(250 195)",
      );
    });
  });

  it.concurrent("should run the move: the defender lunges toward the fake and the run ends on Run the move again", async () => {
    const page = await viz.given("the why tab", async () => {
      const p = await open();
      await tab(p, "why");
      return p;
    });

    await viz.when("the user runs the move and it plays out (4.2 s)", async () => {
      await page.click("#tab-why .wplay");
      await reads(page, "#tab-why .wplay", "❚❚ Stop");
      await reads(page, "#tab-why .wplay", "▶ Run the move");
    });

    await viz.then(
      "the defender ends 34 px along the fake direction from (250,195), at (216.1,197.8), and the finish ring is green because the finish is open",
      async () => {
        const m = (await page.$eval("#tab-why .def", (d) => d.getAttribute("transform")))!.match(
          /translate\(([\d.]+) ([\d.]+)\)/u,
        )!;
        expect(+m[1]!).toBeCloseTo(216.117, 2);
        expect(+m[2]!).toBeCloseTo(197.824, 2);
        expect(await page.$eval("#tab-why .finish circle", (c) => c.getAttribute("stroke"))).toBe(
          "#36c98f",
        );
      },
    );
  }, 20_000);
});

// ---- the rookie-vs-pro tab: a timed animation whose end state stamps each pane. Rookie: "CHARGE!" once a >= .72;
// pro: "BUCKET 🏀" once a >= .9.
describe("the rookie-vs-pro tab", () => {
  it.concurrent("should stamp CHARGE! on the rookie and BUCKET on the pro at the end of the run, and not before", async () => {
    const { page, stamps } = await viz.given(
      "the tab before any run, with both stamps hidden",
      async () => {
        const p = await open();
        await tab(p, "vs");
        const readStamps = async () => {
          const st = await p.$$eval("#tab-vs .vs-pane", (panes) =>
            panes.map((pane) => {
              const s = pane.querySelector<SVGTextElement>(".vstamp")!;
              return {
                kind: pane instanceof HTMLElement ? pane.dataset["kind"] : undefined,
                text: s.textContent,
                shown: s.style.opacity === "1",
                fill: s.getAttribute("fill"),
              };
            }),
          );
          return st;
        };
        expect((await readStamps()).map((s) => s.shown)).toEqual([false, false]);
        return { page: p, stamps: readStamps };
      },
    );

    await viz.when("the user runs both and it finishes (3.6 s)", async () => {
      await page.click("#tab-vs .vsplay");
      await reads(page, "#tab-vs .vsplay", "↺ Run both again");
    });

    await viz.then("the rookie is stamped CHARGE! in red and the pro BUCKET in green", async () => {
      expect(await stamps()).toEqual([
        { kind: "rookie", text: "CHARGE!", shown: true, fill: "#e2493f" },
        { kind: "pro", text: "BUCKET 🏀", shown: true, fill: "#36c98f" },
      ]);
    });
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
    const page = await viz.given("the footwork tab, before any run", async () => {
      const p = await open();
      await tab(p, "feet");
      expect(await read(p)).toMatchObject({
        count: "0",
        banner: "Press a button below",
        shown: [],
      });
      return p;
    });

    await viz.when("the user runs the legal Euro Step to its end", async () => {
      await page.click(".feet-legal");
      await page.waitForFunction(
        () => document.querySelector(".feet-banner .big")!.textContent === "🏀 LEGAL — bucket",
        { timeout: 10_000 },
      );
    });

    await viz.then(
      "two steps were counted, the gather and steps 1 and 2 are down and the third is not",
      async () => {
        expect(await read(page)).toEqual({
          count: "2",
          banner: "🏀 LEGAL — bucket",
          cls: "feet-banner verdict open",
          shown: ["gather", "s1", "s2"],
        });
      },
    );
  }, 20_000);

  it.concurrent("should call a third step a travel and turn the counter red", async () => {
    const page = await viz.given("the footwork tab", async () => {
      const p = await open();
      await tab(p, "feet");
      return p;
    });

    await viz.when("the user takes the third step", async () => {
      await page.click(".feet-travel");
      await page.waitForFunction(
        () => document.querySelector(".feet-banner .big")!.textContent === "🚫 TRAVEL — turnover",
        { timeout: 10_000 },
      );
    });

    await viz.then("the counter reads 3 in red and all four footprints are down", async () => {
      expect(await read(page)).toEqual({
        count: "3",
        banner: "🚫 TRAVEL — turnover",
        cls: "feet-banner verdict contested",
        shown: ["gather", "s1", "s2", "s3"],
      });
      expect(
        await page.$eval(".feet-count", (c) => (c instanceof HTMLElement ? c.style.color : "")),
      ).toBe("rgb(226, 73, 63)");
    });
  }, 20_000);

  it.concurrent("should start over when the user leaves the tab", async () => {
    const page = await viz.given("a travel in progress, in the footwork tab", async () => {
      const p = await open();
      await tab(p, "feet");
      await p.click(".feet-travel");
      await p.waitForFunction(() => document.querySelector(".feet-count")!.textContent === "1", {
        timeout: 10_000,
      });
      return p;
    });

    await viz.when("the user goes to another tab", async () => {
      await tab(page, "move");
    });

    await viz.then(
      "the footwork tab is reset, and nothing left running writes into it later",
      async () => {
        await new Promise<void>((done) => {
          setTimeout(done, 3000);
        });
        expect(await read(page)).toMatchObject({
          count: "0",
          banner: "Press a button below",
          shown: [],
        });
      },
    );
  }, 20_000);
});

// ---- the 3D tab: three (real, served locally) draws the scene; what the page COMPUTES from the scrubber that a test can read is the phase
// title: The drive < .38 <= The gather < .50 <= Step 1 < .70 <= Step 2 < .90 <= The finish.
describe("the 3D tab", () => {
  it.concurrent("should name the phase the scrubber has reached, exactly at each boundary", async () => {
    const { page, phase } = await viz.given("the 3D tab opened with real three", async () => {
      const p = await open();
      await tab(p, "d3");
      await p.waitForSelector(".d3-canvas canvas", { timeout: 20_000 });
      const titleAt = async (v: number) => {
        await setRange(p, ".d3scrub", v);
        const t = await text(p, "#d3phaseTitle");
        return t;
      };
      return { page: p, phase: titleAt };
    });

    const titles = await viz.when(
      "the user scrubs to just before and exactly at each phase start",
      async () => {
        const t0 = await phase(0);
        const t379 = await phase(379);
        const t380 = await phase(380);
        const t499 = await phase(499);
        const t500 = await phase(500);
        const t699 = await phase(699);
        const t700 = await phase(700);
        const t899 = await phase(899);
        const t900 = await phase(900);
        return { t0, t379, t380, t499, t500, t699, t700, t899, t900 };
      },
    );

    await viz.then("the title changes exactly at the boundary", async () => {
      expect(titles.t0).toBe("The drive");
      expect(titles.t379).toBe("The drive");
      expect(titles.t380).toBe("The gather");
      expect(titles.t499).toBe("The gather");
      expect(titles.t500).toBe("Step 1 — the fake");
      expect(titles.t699).toBe("Step 1 — the fake");
      expect(titles.t700).toBe("Step 2 — the cross");
      expect(titles.t899).toBe("Step 2 — the cross");
      expect(titles.t900).toBe("The finish");
      expect(await text(page, ".d3phase")).toBe("Up at the rim, far side, defender stranded.");
      expect(page.errors).toEqual([]);
    });
  }, 30_000);

  it.concurrent("should play, pausing the label, and let the scrubber take over", async () => {
    const page = await viz.given("the 3D tab", async () => {
      const p = await open();
      await tab(p, "d3");
      await p.waitForSelector(".d3-canvas canvas", { timeout: 20_000 });
      return p;
    });

    await viz.when("the user presses Play", async () => {
      await page.click(".d3play");
    });

    await viz.then("it says Pause and the scrubber moves off zero", async () => {
      await reads(page, ".d3play", "❚❚ Pause");
      await page.waitForFunction(
        () => +document.querySelector<HTMLInputElement>(".d3scrub")!.value > 20,
        { timeout: 10_000 },
      );
    });

    await viz.when("the user grabs the scrubber", async () => {
      await setRange(page, ".d3scrub", 500);
    });

    await viz.then("playing stops and the label goes back to Play", async () => {
      await reads(page, ".d3play", "▶ Play");
      expect(await text(page, "#d3phaseTitle")).toBe("Step 1 — the fake");
    });
  }, 30_000);
});
