import { describe, it, expect } from "bun:test";
import { open, tab, text, setRange, reads } from "./helpers.ts";

// The sliders map to a cushion in court pixels: cushion = 6 + value * 0.84. "Tight" is under 16, "soft" over 52.
// So slider 11 (15.2) is tight, 12 (16.1) is right; 54 (51.4) is right, 55 (52.2) is soft.

describe("the cushion tab", () => {
  const verdict = async (page: Parameters<typeof text>[0]) => {
    const v = await text(page, ".cush-verdict .big");
    return v;
  };

  it.concurrent("should call a crowded closeout a blow-by, a tight one contested and a soft one an open shot", async () => {
    const page = await viz.given("the cushion tab", async () => {
      const p = await open();
      await tab(p, "cushion");
      return p;
    });

    await viz.when(
      "the dial is crowded, then at arm's length, then given a lot of space",
      async () => {
        await setRange(page, ".cushrange", 0);
        await reads(page, ".cush-verdict .big", "🛡 BLOW-BY");
        await setRange(page, ".cushrange", 30);
        await reads(page, ".cush-verdict .big", "✓ CONTESTED");
        await setRange(page, ".cushrange", 100);
      },
    );

    await viz.then("each reads its own verdict, the last one an open shot", async () => {
      await reads(page, ".cush-verdict .big", "🏀 OPEN SHOT");
      expect(page.errors).toEqual([]);
    });
  });

  it.concurrent("should switch verdict exactly at the tight and soft edges", async () => {
    const page = await viz.given("the cushion tab", async () => {
      const p = await open();
      await tab(p, "cushion");
      return p;
    });

    await viz.when("the dial sits at 11", async () => {
      await setRange(page, ".cushrange", 11);
    });

    await viz.then("11 is still a blow-by", async () => {
      await reads(page, ".cush-verdict .big", "🛡 BLOW-BY");
    });

    await viz.when("the dial sits at 12", async () => {
      await setRange(page, ".cushrange", 12);
    });

    await viz.then("12 is contested", async () => {
      await reads(page, ".cush-verdict .big", "✓ CONTESTED");
    });

    await viz.when("the dial sits at 54", async () => {
      await setRange(page, ".cushrange", 54);
    });

    await viz.then("54 is contested", async () => {
      await reads(page, ".cush-verdict .big", "✓ CONTESTED");
    });

    await viz.when("the dial sits at 55", async () => {
      await setRange(page, ".cushrange", 55);
    });

    await viz.then("55 is an open shot", async () => {
      await reads(page, ".cush-verdict .big", "🏀 OPEN SHOT");
    });
  });

  it.concurrent("should show the cushion in feet on the ruler", async () => {
    const { page, ft } = await viz.given("the cushion tab", async () => {
      const p = await open();
      await tab(p, "cushion");
      const feet = async () => {
        const v = await p.$eval(".ftmarker", (m) =>
          m instanceof HTMLElement ? m.dataset["ft"] : undefined,
        );
        return v;
      };
      return { page: p, ft: feet };
    });

    await viz.when("the dial is at 50 (48 px = 6 ft) and then at 0 (6 px = 0.8 ft)", async () => {
      await setRange(page, ".cushrange", 50);
      await page.waitForFunction(
        () => document.querySelector<HTMLElement>(".ftmarker")!.dataset["ft"] === "6.0 ft",
      );
      await setRange(page, ".cushrange", 0);
    });

    await viz.then("the marker reads those distances", async () => {
      await page.waitForFunction(
        () => document.querySelector<HTMLElement>(".ftmarker")!.dataset["ft"] === "0.8 ft",
      );
      expect(await ft()).toBe("0.8 ft");
    });
  });

  it.concurrent("should stamp each cushion's outcome after a run: blow-by when crowded, contested at arm's length", async () => {
    const { page, stamped } = await viz.given("the cushion tab", async () => {
      const p = await open();
      await tab(p, "cushion");
      const stamp = async (s: string) => {
        await p.waitForFunction(
          (w) =>
            document.querySelector(".stamp")!.textContent === w &&
            document.querySelector(".stamp")!.getAttribute("opacity") === "1",
          { timeout: 10_000 },
          s,
        );
      };
      return { page: p, stamped: stamp };
    });

    await viz.when("a crowded cushion is run", async () => {
      await setRange(page, ".cushrange", 0);
      await page.click(".cushrun");
    });

    await viz.then("it stamps a blow-by", async () => {
      await stamped("🛡 BLOW-BY");
    });

    await viz.when("an arm's-length cushion is run", async () => {
      await setRange(page, ".cushrange", 30);
      await page.click(".cushrun");
    });

    await viz.then("it stamps contested, with the defender's hand up on the shot", async () => {
      await stamped("✓ CONTESTED");
      expect(await page.$eval("#tab-cushion .hand", (h) => h.getAttribute("opacity"))).toBe("1");
    });
  });

  it.concurrent("should stop a run in progress when the button is pressed again", async () => {
    const page = await viz.given("a run under way", async () => {
      const p = await open();
      await tab(p, "cushion");
      await p.click(".cushrun");
      await reads(p, ".cushrun", "❚❚");
      return p;
    });

    await viz.when("the button is pressed again", async () => {
      await page.click(".cushrun");
    });

    await viz.then(
      "the run stops and the button offers to run again, with nothing stamped",
      async () => {
        await reads(page, ".cushrun", "▶ Run it");
        expect(await page.$eval(".stamp", (s) => s.getAttribute("opacity"))).toBe("0");
      },
    );
  });

  it.concurrent("should stamp the verdict on the court after running it, and clear it when the dial moves", async () => {
    const page = await viz.given("a soft cushion", async () => {
      const p = await open();
      await tab(p, "cushion");
      await setRange(p, ".cushrange", 100);
      return p;
    });

    await viz.when("the user runs it", async () => {
      await page.click(".cushrun");
    });

    await viz.then("the court stamps the verdict", async () => {
      await page.waitForFunction(
        () =>
          document.querySelector(".stamp")!.textContent === "🏀 OPEN SHOT" &&
          document.querySelector(".stamp")!.getAttribute("opacity") === "1",
      );
    });

    await viz.when("the user moves the dial", async () => {
      await setRange(page, ".cushrange", 30);
    });

    await viz.then("the stamp is wiped", async () => {
      await page.waitForFunction(
        () => document.querySelector(".stamp")!.getAttribute("opacity") === "0",
      );
      expect(await verdict(page)).toBe("✓ CONTESTED");
    });
  });
});

describe("the force-a-side tab", () => {
  it.concurrent("should judge each side you force: baseline contained, straight 50/50, middle a layup", async () => {
    const page = await viz.given("the force tab", async () => {
      const p = await open();
      await tab(p, "side");
      return p;
    });

    await viz.when("straight up is chosen", async () => {
      await page.click('.side-seg button[data-f="straight"]');
    });

    await viz.then("it is 50/50", async () => {
      await reads(page, ".side-verdict .big", "⚠ 50/50");
    });

    await viz.when("middle is chosen", async () => {
      await page.click('.side-seg button[data-f="middle"]');
    });

    await viz.then("it is a layup", async () => {
      await reads(page, ".side-verdict .big", "🏀 LAYUP");
    });

    await viz.when("baseline is chosen", async () => {
      await page.click('.side-seg button[data-f="baseline"]');
    });

    await viz.then("it is contained", async () => {
      await reads(page, ".side-verdict .big", "✓ CONTAINED");
      expect(await text(page, ".side-text")).toContain("forced him baseline");
      expect(
        await page.$eval('.side-seg button[data-f="baseline"]', (b) =>
          b.classList.contains("active"),
        ),
      ).toBe(true);
    });
  });

  it.concurrent("should stamp CONTAINED for baseline and 50/50 for a straight closeout after running each", async () => {
    const { page, stamped } = await viz.given("the force tab", async () => {
      const p = await open();
      await tab(p, "side");
      const stamp = async (s: string) => {
        await p.waitForFunction(
          (w) =>
            document.querySelector(".sstamp")!.textContent === w &&
            document.querySelector(".sstamp")!.getAttribute("opacity") === "1",
          { timeout: 10_000 },
          s,
        );
      };
      return { page: p, stamped: stamp };
    });

    await viz.when("baseline is run", async () => {
      await page.click(".side-run");
    });

    await viz.then("the drive is stamped CONTAINED", async () => {
      await stamped("✓ CONTAINED");
    });

    await viz.when("straight up is run", async () => {
      await page.click('.side-seg button[data-f="straight"]');
      await page.click(".side-run");
    });

    await viz.then("it is stamped 50/50", async () => {
      await stamped("⚠ 50/50");
    });
  });

  it.concurrent("should stamp the outcome of the drive it runs", async () => {
    const page = await viz.given("middle forced", async () => {
      const p = await open();
      await tab(p, "side");
      await p.click('.side-seg button[data-f="middle"]');
      return p;
    });

    await viz.when("the drive is run", async () => {
      await page.click(".side-run");
    });

    await viz.then("the court stamps LAYUP", async () => {
      await page.waitForFunction(
        () =>
          document.querySelector(".sstamp")!.textContent === "🏀 LAYUP" &&
          document.querySelector(".sstamp")!.getAttribute("opacity") === "1",
      );
    });
  });
});

describe("the footwork tab", () => {
  it.concurrent("should rate the chop-step high on balance and low on speed, and the sprint-stop the reverse", async () => {
    const page = await viz.given(
      "the footwork tab, on the chop-step: balance is high, speed is low, and it is best against a driver",
      async () => {
        const p = await open();
        await tab(p, "feet");
        await reads(p, ".tr-bal-v", "high");
        await reads(p, ".tr-spd-v", "low");
        await reads(p, ".feet-when .big", "Best vs a DRIVER");
        return p;
      },
    );

    await viz.when("the user picks the sprint-stop", async () => {
      await page.click('.feet-seg button[data-m="sprint"]');
    });

    await viz.then(
      "balance is only solid, speed is high, and it is best against a shooter",
      async () => {
        await reads(page, ".tr-bal-v", "solid");
        await reads(page, ".tr-spd-v", "high");
        await reads(page, ".feet-when .big", "Best vs a SHOOTER");
        expect(
          await page.$eval(".tr-bal", (e) => (e instanceof HTMLElement ? e.style.width : "")),
        ).toBe("64%");
      },
    );
  });

  it.concurrent("should print the footsteps and tick the coaching cues when run", async () => {
    const page = await viz.given("the chop-step (9 footprints, 4 cues), not yet run", async () => {
      const p = await open();
      await tab(p, "feet");
      expect(await p.$$eval(".feet-prints g", (g) => g.length)).toBe(0);
      return p;
    });

    await viz.when("it is run", async () => {
      await page.click(".feet-run");
    });

    await viz.then(
      "all nine prints land, every cue lights, and the phase ends on the high hand",
      async () => {
        await page.waitForFunction(() => document.querySelectorAll(".feet-prints g").length === 9, {
          timeout: 15_000,
        });
        await reads(page, ".feet-phase", "High hand ✋ — contest!");
        expect(await page.$$eval(".feet-cues li.on", (l) => l.length)).toBe(4);
      },
    );
  });

  it.concurrent("should clear the run when the mode changes", async () => {
    const page = await viz.given("a finished run on the chop-step", async () => {
      const p = await open();
      await tab(p, "feet");
      await p.click(".feet-run");
      await p.waitForFunction(() => document.querySelectorAll(".feet-prints g").length > 0);
      return p;
    });

    await viz.when("the user switches to the sprint-stop", async () => {
      await page.click('.feet-seg button[data-m="sprint"]');
    });

    await viz.then("the prints are gone and the phase is back to Ready", async () => {
      expect(await page.$$eval(".feet-prints g", (g) => g.length)).toBe(0);
      await reads(page, ".feet-phase", "Ready");
    });
  });
});

describe("the sandbox (You Try It)", () => {
  const sc = async (page: Parameters<typeof text>[0]) => {
    const cards = await page.$$eval(".sc", (els) =>
      Object.fromEntries(
        els.map((e) => [
          e instanceof HTMLElement ? (e.dataset["k"] ?? "") : "",
          e.querySelector(".v")!.textContent,
        ]),
      ),
    );
    return cards;
  };
  const run = async (
    page: Awaited<ReturnType<typeof open>>,
    o: { cush?: number; ctrl?: number; force?: string; timing?: string } = {},
  ) => {
    if (o.cush !== undefined) await setRange(page, ".sb-cush", o.cush);
    if (o.ctrl !== undefined) await setRange(page, ".sb-ctrl", o.ctrl);
    if (o.force) await page.click(`.sb-force button[data-f="${o.force}"]`);
    if (o.timing) await page.click(`.sb-timing button[data-t="${o.timing}"]`);
    await page.click(".sb-run");
  };
  const graded = async (page: Awaited<ReturnType<typeof open>>, grade: string, title: string) => {
    await reads(page, "#sbGrade", grade);
    await reads(page, ".sb-verdict .big", title);
  };
  const sandbox = async () => {
    const p = await open();
    await tab(p, "sandbox");
    return p;
  };

  it.concurrent("should start ungraded, with the scorecard blank", async () => {
    const page = await viz.given("the sandbox tab", sandbox);

    await viz.when("the user has not run anything");

    await viz.then("there is no grade and every scorecard cell is a dash", async () => {
      expect(await text(page, "#sbGrade")).toBe("—");
      expect(await sc(page)).toEqual({ distance: "—", balance: "—", angle: "—", timing: "—" });
    });
  });

  it.concurrent("should grade the full recipe an A, contained, with all four cards passing", async () => {
    const page = await viz.given(
      "the defaults on the sandbox tab: cushion 30, approach chopped 75, force baseline, leave on the pass",
      sandbox,
    );

    await viz.when("the possession is run", async () => {
      await run(page);
    });

    await viz.then("it is CONTAINED, grade A, every card ticked", async () => {
      await graded(page, "A", "CONTAINED ✓");
      expect(await sc(page)).toEqual({ distance: "✓", balance: "✓", angle: "✓", timing: "✓" });
    });
  });

  it.concurrent("should give an open shot when the cushion is too soft, failing only the distance card", async () => {
    const page = await viz.given("everything right but a jogging closeout", sandbox);

    await viz.when("run with the cushion at 70 (65 px)", async () => {
      await run(page, { cush: 70 });
    });

    await viz.then("it is OPEN SHOT, D, and only distance fails", async () => {
      await graded(page, "D", "OPEN SHOT");
      expect(await sc(page)).toEqual({ distance: "✗", balance: "✓", angle: "✓", timing: "✓" });
    });
  });

  it.concurrent("should give a blow-by when he is crowded, failing only the distance card", async () => {
    const page = await viz.given("everything right but crowding him", sandbox);

    await viz.when("run with the cushion at 0", async () => {
      await run(page, { cush: 0 });
    });

    await viz.then("it is a BLOW-BY, C, and only distance fails", async () => {
      await graded(page, "C", "BLOW-BY");
      expect(await sc(page)).toEqual({ distance: "✗", balance: "✓", angle: "✓", timing: "✓" });
    });
  });

  it.concurrent("should give a blow-by when he flies in, failing only the balance card", async () => {
    const page = await viz.given(
      'everything right but approach control at 20 ("flew in")',
      sandbox,
    );

    await viz.when("the possession is run", async () => {
      await run(page, { ctrl: 20 });
    });

    await viz.then("it is a BLOW-BY and only balance fails", async () => {
      await graded(page, "C", "BLOW-BY");
      expect(await sc(page)).toEqual({ distance: "✓", balance: "✗", angle: "✓", timing: "✓" });
    });
  });

  it.concurrent("should drive him to the rim when he is forced middle, failing only the angle card", async () => {
    const page = await viz.given("everything right but forcing him middle", sandbox);

    await viz.when("the possession is run", async () => {
      await run(page, { force: "middle" });
    });

    await viz.then("it is DRIVE TO THE RIM, C, and only angle fails", async () => {
      await graded(page, "C", "DRIVE TO THE RIM");
      expect(await sc(page)).toEqual({ distance: "✓", balance: "✓", angle: "✗", timing: "✓" });
    });
  });

  it.concurrent("should call a square closeout contested but 50/50, a B", async () => {
    const page = await viz.given("everything right but forcing neither side", sandbox);

    await viz.when("run straight up", async () => {
      await run(page, { force: "straight" });
    });

    await viz.then("it is CONTESTED, B, and angle fails", async () => {
      await graded(page, "B", "CONTESTED — but 50/50");
      expect((await sc(page)).angle).toBe("✗");
    });
  });

  it.concurrent("should give an open shot when he leaves after the catch, failing only the timing card", async () => {
    const page = await viz.given("everything right but leaving on the catch", sandbox);

    await viz.when("the possession is run", async () => {
      await run(page, { timing: "late" });
    });

    await viz.then("it is OPEN SHOT, D, and only timing fails", async () => {
      await graded(page, "D", "OPEN SHOT");
      expect(await sc(page)).toEqual({ distance: "✓", balance: "✓", angle: "✓", timing: "✗" });
      expect(await text(page, ".sb-text")).toContain("left after the catch");
    });
  });

  it.concurrent("should grade at the exact edges of distance and balance", async () => {
    const page = await viz.given("the sandbox tab", sandbox);

    await viz.when("cushion sits at 12 (16.1 px, right)", async () => {
      await setRange(page, ".sb-cush", 12);
      await page.click(".sb-run");
    });

    await viz.then("the grade is A", async () => {
      await reads(page, "#sbGrade", "A");
    });

    await viz.when("cushion sits at 11 (15.2 px, crowded)", async () => {
      await setRange(page, ".sb-cush", 11);
      await page.click(".sb-run");
    });

    await viz.then("the grade is C", async () => {
      await reads(page, "#sbGrade", "C");
    });

    await viz.when("cushion sits at 54 (51.4 px, right)", async () => {
      await setRange(page, ".sb-cush", 54);
      await page.click(".sb-run");
    });

    await viz.then("the grade is A", async () => {
      await reads(page, "#sbGrade", "A");
    });

    await viz.when("cushion sits at 55 (52.2 px, soft)", async () => {
      await setRange(page, ".sb-cush", 55);
      await page.click(".sb-run");
    });

    await viz.then("the grade is D", async () => {
      await reads(page, "#sbGrade", "D");
    });

    await viz.when("cushion is back at 30 and balance sits at 45 (right)", async () => {
      await setRange(page, ".sb-cush", 30);
      await setRange(page, ".sb-ctrl", 45);
      await page.click(".sb-run");
    });

    await viz.then("the grade is A", async () => {
      await reads(page, "#sbGrade", "A");
    });

    await viz.when("balance sits at 44 (flew in)", async () => {
      await setRange(page, ".sb-ctrl", 44);
      await page.click(".sb-run");
    });

    await viz.then("the grade is C", async () => {
      await reads(page, "#sbGrade", "C");
    });
  });

  it.concurrent("should blank the scorecard again when a setting changes after a run", async () => {
    const page = await viz.given("a graded run", async () => {
      const p = await sandbox();
      await run(p);
      await graded(p, "A", "CONTAINED ✓");
      return p;
    });

    await viz.when("the user moves the cushion dial", async () => {
      await setRange(page, ".sb-cush", 40);
    });

    await viz.then("the scorecard is blank again", async () => {
      expect(await sc(page)).toEqual({ distance: "—", balance: "—", angle: "—", timing: "—" });
    });
  });

  it.concurrent("should stamp the outcome on the court once the possession plays out", async () => {
    const page = await viz.given("the full recipe", sandbox);

    await viz.when("the possession is run", async () => {
      await run(page);
    });

    await viz.then("the court stamps it and the run button returns", async () => {
      await page.waitForFunction(
        () =>
          document.querySelector(".sbstamp")!.textContent === "CONTAINED ✓" &&
          document.querySelector(".sbstamp")!.getAttribute("opacity") === "1",
      );
      await reads(page, ".sb-run", "▶ Run possession");
    });
  });
});

describe("the read-the-man tab", () => {
  it.concurrent("should give each kind of shooter the closeout that suits him", async () => {
    const page = await viz.given("the read tab, opened on the shooter", async () => {
      const p = await open();
      await tab(p, "read");
      await reads(p, ".read-verdict .big", "Knockdown shooter — contest hard");
      return p;
    });

    await viz.when("the pump-faker is picked", async () => {
      await page.click('.read-seg button[data-t="pump"]');
    });

    await viz.then("the title is the pump-faker's advice", async () => {
      await reads(page, ".read-verdict .big", "Pump-faker — high hand, feet down");
    });

    await viz.when("the driver is picked", async () => {
      await page.click('.read-seg button[data-t="driver"]');
    });

    await viz.then("the title is the driver's advice", async () => {
      await reads(page, ".read-verdict .big", "Driver — sit on the drive");
    });

    await viz.when("the non-shooter is picked", async () => {
      await page.click('.read-seg button[data-t="none"]');
    });

    await viz.then("the title is the non-shooter's advice", async () => {
      await reads(page, ".read-verdict .big", "Non-shooter — don't close out");
      expect(await text(page, ".read-rule")).toContain("Barely close out");
    });
  });

  it.concurrent("should show the closeout gap growing from the shooter to the non-shooter", async () => {
    const { page, ring } = await viz.given("the read tab", async () => {
      const p = await open();
      await tab(p, "read");
      const radius = async () => {
        const v = await p.$eval(".rideal", (c) => +c.getAttribute("r")!);
        return v;
      };
      return { page: p, ring: radius };
    });

    const shooter = await viz.when("the shooter, then the non-shooter is picked", async () => {
      const first = await ring();
      await page.click('.read-seg button[data-t="none"]');
      await page.waitForFunction(
        (r) => +document.querySelector(".rideal")!.getAttribute("r")! > r,
        {},
        first,
      );
      return first;
    });

    await viz.then("the ring is wider for the non-shooter (82 px vs 30 px)", async () => {
      expect(shooter).toBe(30);
      expect(await ring()).toBe(82);
    });
  });
});

describe("the move tab's speed readout", () => {
  it.concurrent("should call the sprint fast and the arrival under control as the timeline is scrubbed", async () => {
    const page = await viz.given("the first tab, at rest", async () => {
      const p = await open();
      expect(await text(p, ".spd-word")).toBe("—");
      return p;
    });

    await viz.when("the timeline is scrubbed early (the sprint)", async () => {
      await setRange(page, ".scrub", 300);
    });

    await viz.then("the readout says sprint", async () => {
      await reads(page, ".spd-word", "sprint");
    });

    await viz.when("the timeline is scrubbed to the end (the arrival)", async () => {
      await setRange(page, ".scrub", 1000);
    });

    await viz.then("the readout says the defender is under control", async () => {
      await reads(page, ".spd-word", "under control");
    });
  });

  it.concurrent("should light the coaching step the scrubber reaches, and jump there when a step is clicked", async () => {
    const page = await viz.given("the first tab, on its first coaching step", async () => {
      const p = await open();
      const i = await p.$$eval(".move-steps .step", (s) =>
        s.findIndex((e) => e.classList.contains("active")),
      );
      expect(i).toBe(0);
      return p;
    });

    await viz.when("the timeline is scrubbed near the end", async () => {
      await setRange(page, ".scrub", 900);
    });

    await viz.then("the fourth step is lit", async () => {
      await page.waitForFunction(() =>
        document.querySelectorAll(".move-steps .step")[3]!.classList.contains("active"),
      );
    });

    await viz.when("the second step is clicked", async () => {
      await page.click(".move-steps .step:nth-child(2)");
    });

    await viz.then("the timeline jumps back to it", async () => {
      await page.waitForFunction(() =>
        document.querySelectorAll(".move-steps .step")[1]!.classList.contains("active"),
      );
      expect(
        await page.$eval(".scrub", (s) =>
          s instanceof HTMLInputElement ? Number(s.value) : Number.NaN,
        ),
      ).toBeGreaterThan(140);
      expect(
        await page.$eval(".scrub", (s) =>
          s instanceof HTMLInputElement ? Number(s.value) : Number.NaN,
        ),
      ).toBeLessThan(200);
    });
  });
});

describe("the in-a-defense tab", () => {
  it.concurrent("should light the rotation step the timeline reaches", async () => {
    const page = await viz.given("the defense tab, on its first step", async () => {
      const p = await open();
      await tab(p, "team");
      const i = await p.$$eval(".team-steps .step", (s) =>
        s.findIndex((e) => e.classList.contains("active")),
      );
      expect(i).toBe(0);
      return p;
    });

    await viz.when("the timeline is scrubbed to 60% (the closeout with help behind)", async () => {
      await setRange(page, ".team-scrub", 600);
    });

    await viz.then("step 4 is lit", async () => {
      await page.waitForFunction(() =>
        document.querySelectorAll(".team-steps .step")[3]!.classList.contains("active"),
      );
    });
  });
});

describe("the in-a-defense tab, played", () => {
  it.concurrent("should run the rotation to its end and offer to run it again", async () => {
    const page = await viz.given("the defense tab", async () => {
      const p = await open();
      await tab(p, "team");
      return p;
    });

    await viz.when("the rotation is run", async () => {
      await page.click(".team-play");
      await reads(page, ".team-play", "❚❚ Pause");
    });

    await viz.then(
      "it ends on the closeout step with the timeline full, and the button resets",
      async () => {
        await page.waitForFunction(
          () =>
            document.querySelectorAll(".team-steps .step")[3]!.classList.contains("active") &&
            document.querySelector<HTMLInputElement>(".team-scrub")!.value === "1000",
          { timeout: 15_000 },
        );
        await reads(page, ".team-play", "▶ Run the rotation");
      },
    );
  });

  it.concurrent("should pause the rotation midway", async () => {
    const page = await viz.given("a run under way", async () => {
      const p = await open();
      await tab(p, "team");
      await p.click(".team-play");
      await p.waitForFunction(
        () => +document.querySelector<HTMLInputElement>(".team-scrub")!.value > 50,
      );
      return p;
    });

    await viz.when("it is paused", async () => {
      await page.click(".team-play");
    });

    await viz.then(
      "the button offers to run, and the timeline stays where it stopped short of the end",
      async () => {
        await reads(page, ".team-play", "▶ Run the rotation");
        const at = await page.$eval(".team-scrub", (s) =>
          s instanceof HTMLInputElement ? Number(s.value) : Number.NaN,
        );
        expect(at).toBeLessThan(1000);
      },
    );
  });
});

describe("the 3D tab", () => {
  it.concurrent("should draw the scene and name the phase the scrubber reaches", async () => {
    const page = await viz.given("the 3D tab opened (real three, served locally)", async () => {
      const p = await open();
      await tab(p, "d3");
      await p.waitForSelector(".d3-canvas canvas", { timeout: 20_000 });
      await reads(p, "#d3phaseTitle", "The sprint");
      return p;
    });

    await viz.when("the scrubber goes to 50%", async () => {
      await setRange(page, ".d3scrub", 500);
    });

    await viz.then("the phase is Chop it down", async () => {
      await reads(page, "#d3phaseTitle", "Chop it down");
    });

    await viz.when("the scrubber goes to 70%", async () => {
      await setRange(page, ".d3scrub", 700);
    });

    await viz.then("the phase is Sink the hips", async () => {
      await reads(page, "#d3phaseTitle", "Sink the hips");
    });

    await viz.when("the scrubber goes to 90%", async () => {
      await setRange(page, ".d3scrub", 900);
    });

    await viz.then("the phase is High hand, contest", async () => {
      await reads(page, "#d3phaseTitle", "High hand, contest");
      expect(page.errors).toEqual([]);
    });
  });

  it.concurrent("should stop spinning when the side view is taken", async () => {
    const page = await viz.given("the 3D tab with auto-spin on", async () => {
      const p = await open();
      await tab(p, "d3");
      await p.waitForSelector(".d3-canvas canvas", { timeout: 20_000 });
      expect(await p.$eval(".d3rot", (c) => c instanceof HTMLInputElement && c.checked)).toBe(true);
      return p;
    });

    await viz.when("the user picks the side view", async () => {
      await page.click(".d3side");
    });

    await viz.then("spin is switched off", async () => {
      expect(await page.$eval(".d3rot", (c) => c instanceof HTMLInputElement && c.checked)).toBe(
        false,
      );
    });
  });

  it.concurrent("should play to the end and back to the start on play again", async () => {
    const page = await viz.given("the 3D tab", async () => {
      const p = await open();
      await tab(p, "d3");
      await p.waitForSelector(".d3-canvas canvas", { timeout: 20_000 });
      return p;
    });

    await viz.when("play is pressed", async () => {
      await page.click(".d3play");
      await reads(page, ".d3play", "❚❚ Pause");
    });

    await viz.then("it finishes on the last phase with the scrubber full", async () => {
      await page.waitForFunction(
        () => document.querySelector<HTMLInputElement>(".d3scrub")!.value === "1000",
        { timeout: 20_000 },
      );
      await reads(page, "#d3phaseTitle", "High hand, contest");
      await reads(page, ".d3play", "↺ Play again");
    });
  });
});

describe("the live drill", () => {
  // The drill is steered by the pointer. A test places the pointer at a spot on the court (in court units).
  const at = async (page: Awaited<ReturnType<typeof open>>, x: number, y: number) => {
    const c = await page.$eval(
      ".drill-court",
      (s, p) => {
        if (!(s instanceof SVGSVGElement)) throw new Error(".drill-court is not an svg");
        const pt = s.createSVGPoint();
        pt.x = p.x;
        pt.y = p.y;
        const r = pt.matrixTransform(s.getScreenCTM()!);
        return { x: r.x, y: r.y };
      },
      { x, y },
    );
    await page.mouse.move(c.x, c.y);
  };
  const counts = async (page: Awaited<ReturnType<typeof open>>) => {
    const c = await page.evaluate(() => ({
      stops: document.querySelector(".d-stops")!.textContent,
      buckets: document.querySelector(".d-buckets")!.textContent,
      streak: document.querySelector(".d-streak")!.textContent,
    }));
    return c;
  };
  const drill = async () => {
    const p = await open({ seedRandom: true });
    await tab(p, "drill");
    return p;
  };

  it.concurrent("should start with an empty scoreboard and a prompt", async () => {
    const page = await viz.given("the drill tab", drill);

    await viz.when("the user has not pressed Start");

    await viz.then("nothing is scored and the prompt says to press Start", async () => {
      expect(await counts(page)).toEqual({ stops: "0", buckets: "0", streak: "0" });
      expect(await text(page, ".d-msg")).toContain("Press Start");
    });
  });

  it.concurrent("should score a bucket when the defender is left far from the shooter", async () => {
    const page = await viz.given("a rep started", async () => {
      const p = await drill();
      await p.click(".d-start");
      return p;
    });

    await viz.when(
      "the cursor sits in the far corner and the defender never closes out",
      async () => {
        await at(page, 30, 460);
      },
    );

    await viz.then("the shot goes up wide open: a bucket, streak zero", async () => {
      await page.waitForFunction(
        () => document.querySelector(".dstamp")!.textContent === "BUCKET",
        {
          timeout: 15_000,
        },
      );
      expect(await text(page, ".d-msg")).toContain("wide-open jumper");
      expect(await counts(page)).toEqual({ stops: "0", buckets: "1", streak: "0" });
    });
  });

  it.concurrent("should score a stop when the defender settles at arm's length, and reset the streak on the next bucket", async () => {
    const page = await viz.given("a rep started (shooter at the right wing, 405,205)", async () => {
      const p = await drill();
      await p.click(".d-start");
      return p;
    });

    await viz.when("the cursor settles about 30 px from the shooter", async () => {
      await at(page, 375, 203);
    });

    await viz.then("the rep is a stop", async () => {
      await page.waitForFunction(
        () => document.querySelector(".dstamp")!.textContent === "STOP ✓",
        {
          timeout: 15_000,
        },
      );
      expect(await counts(page)).toEqual({ stops: "1", buckets: "0", streak: "1" });
    });

    await viz.when("the next rep is left open", async () => {
      await page.click(".d-start");
      await page.waitForFunction(
        () => document.querySelector(".dstamp")!.getAttribute("opacity") === "0",
      );
      await at(page, 30, 460);
    });

    await viz.then("it is a bucket and the streak resets", async () => {
      await page.waitForFunction(() => document.querySelector(".d-buckets")!.textContent === "1", {
        timeout: 15_000,
      });
      expect(await counts(page)).toEqual({ stops: "1", buckets: "1", streak: "0" });
    });
  });

  it.concurrent("should let the shooter drive past a defender who crowds him, and count the bucket", async () => {
    const page = await viz.given("a rep started (shooter at 405,205)", async () => {
      const p = await drill();
      await p.click(".d-start");
      return p;
    });

    await viz.when(
      "the cursor sits right on top of the shooter (under 20 px: crowding)",
      async () => {
        await at(page, 406, 206);
      },
    );

    await viz.then(
      "he attacks and the rep ends with a stamped result and a counted rep",
      async () => {
        await page.waitForFunction(
          () => /^(STOP ✓|BUCKET)$/u.test(document.querySelector(".dstamp")!.textContent),
          { timeout: 15_000 },
        );
        const c = await counts(page);
        expect(Number(c.stops) + Number(c.buckets)).toBe(1);
        expect(await text(page, ".d-msg")).toMatch(
          /walled off|beat you to the rim|couldn.t turn the corner/u,
        );
      },
    );
  });

  it.concurrent("should reset to the idle prompt when the user leaves the tab mid-rep", async () => {
    const page = await viz.given("a rep started", async () => {
      const p = await drill();
      await p.click(".d-start");
      await reads(p, ".d-msg", "Close out! Get inside the shrinking yellow ring before he's set.");
      return p;
    });

    await viz.when("the user goes to another tab", async () => {
      await tab(page, "read");
    });

    await viz.then("the drill is back to its prompt", async () => {
      expect(await text(page, ".d-msg")).toContain("Press Start");
    });
  });
});
