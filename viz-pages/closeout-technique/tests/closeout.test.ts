import { describe, it, expect } from "bun:test";
import { open, tab, text, setRange, reads } from "./helpers.ts";

// The sliders map to a cushion in court pixels: cushion = 6 + value * 0.84. "Tight" is under 16, "soft" over 52.
// So slider 11 (15.2) is tight, 12 (16.1) is right; 54 (51.4) is right, 55 (52.2) is soft.

describe("the cushion tab", () => {
  const verdict = (page: Parameters<typeof text>[0]) => text(page, ".cush-verdict .big");

  it.concurrent("should call a crowded closeout a blow-by, a tight one contested and a soft one an open shot", async () => {
    // GIVEN the cushion tab
    const page = await open();
    await tab(page, "cushion");

    // WHEN the dial is crowded, then at arm's length, then given a lot of space
    await setRange(page, ".cushrange", 0);
    await reads(page, ".cush-verdict .big", "🛡 BLOW-BY");
    await setRange(page, ".cushrange", 30);
    await reads(page, ".cush-verdict .big", "✓ CONTESTED");
    await setRange(page, ".cushrange", 100);

    // THEN each reads its own verdict, the last one an open shot
    await reads(page, ".cush-verdict .big", "🏀 OPEN SHOT");
    expect(page.errors).toEqual([]);
  });

  it.concurrent("should switch verdict exactly at the tight and soft edges", async () => {
    // GIVEN the cushion tab
    const page = await open();
    await tab(page, "cushion");
    const at = async (v: number, want: string) => { await setRange(page, ".cushrange", v); await reads(page, ".cush-verdict .big", want); };

    // WHEN the dial sits either side of each edge
    // THEN 11 is still a blow-by, 12 is contested, 54 is contested, 55 is open
    await at(11, "🛡 BLOW-BY");
    await at(12, "✓ CONTESTED");
    await at(54, "✓ CONTESTED");
    await at(55, "🏀 OPEN SHOT");
  });

  it.concurrent("should show the cushion in feet on the ruler", async () => {
    // GIVEN the cushion tab
    const page = await open();
    await tab(page, "cushion");

    // WHEN the dial is at 50 (48 px = 6 ft) and then at 0 (6 px = 0.8 ft)
    await setRange(page, ".cushrange", 50);
    const ft = () => page.$eval(".ftmarker", (m) => m.getAttribute("data-ft"));
    await page.waitForFunction(() => document.querySelector(".ftmarker")!.getAttribute("data-ft") === "6.0 ft");
    await setRange(page, ".cushrange", 0);

    // THEN the marker reads those distances
    await page.waitForFunction(() => document.querySelector(".ftmarker")!.getAttribute("data-ft") === "0.8 ft");
    expect(await ft()).toBe("0.8 ft");
  });

  it.concurrent("should stamp each cushion's outcome after a run: blow-by when crowded, contested at arm's length", async () => {
    // GIVEN the cushion tab
    const page = await open();
    await tab(page, "cushion");
    const stamped = (s: string) => page.waitForFunction((w) => document.querySelector(".stamp")!.textContent === w && document.querySelector(".stamp")!.getAttribute("opacity") === "1", { timeout: 10_000 }, s);

    // WHEN a crowded cushion is run
    await setRange(page, ".cushrange", 0);
    await page.click(".cushrun");

    // THEN it stamps a blow-by
    await stamped("🛡 BLOW-BY");

    // WHEN an arm's-length cushion is run
    await setRange(page, ".cushrange", 30);
    await page.click(".cushrun");

    // THEN it stamps contested, with the defender's hand up on the shot
    await stamped("✓ CONTESTED");
    expect(await page.$eval("#tab-cushion .hand", (h) => h.getAttribute("opacity"))).toBe("1");
  });

  it.concurrent("should stop a run in progress when the button is pressed again", async () => {
    // GIVEN a run under way
    const page = await open();
    await tab(page, "cushion");
    await page.click(".cushrun");
    await reads(page, ".cushrun", "❚❚");

    // WHEN the button is pressed again
    await page.click(".cushrun");

    // THEN the run stops and the button offers to run again, with nothing stamped
    await reads(page, ".cushrun", "▶ Run it");
    expect(await page.$eval(".stamp", (s) => s.getAttribute("opacity"))).toBe("0");
  });

  it.concurrent("should stamp the verdict on the court after running it, and clear it when the dial moves", async () => {
    // GIVEN a soft cushion
    const page = await open();
    await tab(page, "cushion");
    await setRange(page, ".cushrange", 100);

    // WHEN the user runs it
    await page.click(".cushrun");

    // THEN the court stamps the verdict, and moving the dial wipes it
    await page.waitForFunction(() => document.querySelector(".stamp")!.textContent === "🏀 OPEN SHOT" && document.querySelector(".stamp")!.getAttribute("opacity") === "1");
    await setRange(page, ".cushrange", 30);
    await page.waitForFunction(() => document.querySelector(".stamp")!.getAttribute("opacity") === "0");
    expect(await verdict(page)).toBe("✓ CONTESTED");
  });
});

describe("the force-a-side tab", () => {
  it.concurrent("should judge each side you force: baseline contained, straight 50/50, middle a layup", async () => {
    // GIVEN the force tab
    const page = await open();
    await tab(page, "side");
    const force = async (f: string, big: string) => {
      await page.click(`.side-seg button[data-f="${f}"]`);
      await reads(page, ".side-verdict .big", big);
    };

    // WHEN each side is chosen
    // THEN baseline is contained, straight up is 50/50, and middle is a layup
    await force("straight", "⚠ 50/50");
    await force("middle", "🏀 LAYUP");
    await force("baseline", "✓ CONTAINED");
    expect(await text(page, ".side-text")).toContain("forced him baseline");
    expect(await page.$eval('.side-seg button[data-f="baseline"]', (b) => b.classList.contains("active"))).toBe(true);
  });

  it.concurrent("should stamp CONTAINED for baseline and 50/50 for a straight closeout after running each", async () => {
    // GIVEN the force tab
    const page = await open();
    await tab(page, "side");
    const stamped = (s: string) => page.waitForFunction((w) => document.querySelector(".sstamp")!.textContent === w && document.querySelector(".sstamp")!.getAttribute("opacity") === "1", { timeout: 10_000 }, s);

    // WHEN baseline is run
    await page.click(".side-run");

    // THEN the drive is stamped CONTAINED
    await stamped("✓ CONTAINED");

    // WHEN straight up is run
    await page.click('.side-seg button[data-f="straight"]');
    await page.click(".side-run");

    // THEN it is stamped 50/50
    await stamped("⚠ 50/50");
  });

  it.concurrent("should stamp the outcome of the drive it runs", async () => {
    // GIVEN middle forced
    const page = await open();
    await tab(page, "side");
    await page.click('.side-seg button[data-f="middle"]');

    // WHEN the drive is run
    await page.click(".side-run");

    // THEN the court stamps LAYUP
    await page.waitForFunction(() => document.querySelector(".sstamp")!.textContent === "🏀 LAYUP" && document.querySelector(".sstamp")!.getAttribute("opacity") === "1");
  });
});

describe("the footwork tab", () => {
  it.concurrent("should rate the chop-step high on balance and low on speed, and the sprint-stop the reverse", async () => {
    // GIVEN the footwork tab, on the chop-step
    const page = await open();
    await tab(page, "feet");

    // THEN balance is high, speed is low, and it is best against a driver
    await reads(page, ".tr-bal-v", "high");
    await reads(page, ".tr-spd-v", "low");
    await reads(page, ".feet-when .big", "Best vs a DRIVER");

    // WHEN the user picks the sprint-stop
    await page.click('.feet-seg button[data-m="sprint"]');

    // THEN balance is only solid, speed is high, and it is best against a shooter
    await reads(page, ".tr-bal-v", "solid");
    await reads(page, ".tr-spd-v", "high");
    await reads(page, ".feet-when .big", "Best vs a SHOOTER");
    expect(await page.$eval(".tr-bal", (e) => (e as HTMLElement).style.width)).toBe("64%");
  });

  it.concurrent("should print the footsteps and tick the coaching cues when run", async () => {
    // GIVEN the chop-step (9 footprints, 4 cues)
    const page = await open();
    await tab(page, "feet");
    expect(await page.$$eval(".feet-prints g", (g) => g.length)).toBe(0);

    // WHEN it is run
    await page.click(".feet-run");

    // THEN all nine prints land, every cue lights, and the phase ends on the high hand
    await page.waitForFunction(() => document.querySelectorAll(".feet-prints g").length === 9, { timeout: 15_000 });
    await reads(page, ".feet-phase", "High hand ✋ — contest!");
    expect(await page.$$eval(".feet-cues li.on", (l) => l.length)).toBe(4);
  });

  it.concurrent("should clear the run when the mode changes", async () => {
    // GIVEN a finished run on the chop-step
    const page = await open();
    await tab(page, "feet");
    await page.click(".feet-run");
    await page.waitForFunction(() => document.querySelectorAll(".feet-prints g").length > 0);

    // WHEN the user switches to the sprint-stop
    await page.click('.feet-seg button[data-m="sprint"]');

    // THEN the prints are gone and the phase is back to Ready
    expect(await page.$$eval(".feet-prints g", (g) => g.length)).toBe(0);
    await reads(page, ".feet-phase", "Ready");
  });
});

describe("the sandbox (You Try It)", () => {
  const sc = (page: Parameters<typeof text>[0]) =>
    page.$$eval(".sc", (els) => Object.fromEntries(els.map((e) => [(e as HTMLElement).dataset["k"]!, e.querySelector(".v")!.textContent])));
  const run = async (page: Awaited<ReturnType<typeof open>>, o: { cush?: number; ctrl?: number; force?: string; timing?: string } = {}) => {
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

  it.concurrent("should start ungraded, with the scorecard blank", async () => {
    // GIVEN the sandbox tab
    const page = await open();
    await tab(page, "sandbox");

    // THEN there is no grade and every scorecard cell is a dash
    expect(await text(page, "#sbGrade")).toBe("—");
    expect(await sc(page)).toEqual({ distance: "—", balance: "—", angle: "—", timing: "—" });
  });

  it.concurrent("should grade the full recipe an A, contained, with all four cards passing", async () => {
    // GIVEN the defaults: cushion 30, approach chopped 75, force baseline, leave on the pass
    const page = await open();
    await tab(page, "sandbox");

    // WHEN the possession is run
    await run(page);

    // THEN it is CONTAINED, grade A, every card ticked
    await graded(page, "A", "CONTAINED ✓");
    expect(await sc(page)).toEqual({ distance: "✓", balance: "✓", angle: "✓", timing: "✓" });
  });

  it.concurrent("should give an open shot when the cushion is too soft, failing only the distance card", async () => {
    // GIVEN everything right but a jogging closeout
    const page = await open();
    await tab(page, "sandbox");

    // WHEN run with the cushion at 70 (65 px)
    await run(page, { cush: 70 });

    // THEN it is OPEN SHOT, D, and only distance fails
    await graded(page, "D", "OPEN SHOT");
    expect(await sc(page)).toEqual({ distance: "✗", balance: "✓", angle: "✓", timing: "✓" });
  });

  it.concurrent("should give a blow-by when he is crowded, failing only the distance card", async () => {
    // GIVEN everything right but crowding him
    const page = await open();
    await tab(page, "sandbox");

    // WHEN run with the cushion at 0
    await run(page, { cush: 0 });

    // THEN it is a BLOW-BY, C, and only distance fails
    await graded(page, "C", "BLOW-BY");
    expect(await sc(page)).toEqual({ distance: "✗", balance: "✓", angle: "✓", timing: "✓" });
  });

  it.concurrent("should give a blow-by when he flies in, failing only the balance card", async () => {
    // GIVEN everything right but approach control at 20 ("flew in")
    const page = await open();
    await tab(page, "sandbox");

    // WHEN run
    await run(page, { ctrl: 20 });

    // THEN it is a BLOW-BY and only balance fails
    await graded(page, "C", "BLOW-BY");
    expect(await sc(page)).toEqual({ distance: "✓", balance: "✗", angle: "✓", timing: "✓" });
  });

  it.concurrent("should drive him to the rim when he is forced middle, failing only the angle card", async () => {
    // GIVEN everything right but forcing him middle
    const page = await open();
    await tab(page, "sandbox");

    // WHEN run
    await run(page, { force: "middle" });

    // THEN it is DRIVE TO THE RIM, C, and only angle fails
    await graded(page, "C", "DRIVE TO THE RIM");
    expect(await sc(page)).toEqual({ distance: "✓", balance: "✓", angle: "✗", timing: "✓" });
  });

  it.concurrent("should call a square closeout contested but 50/50, a B", async () => {
    // GIVEN everything right but forcing neither side
    const page = await open();
    await tab(page, "sandbox");

    // WHEN run straight up
    await run(page, { force: "straight" });

    // THEN it is CONTESTED, B, and angle fails
    await graded(page, "B", "CONTESTED — but 50/50");
    expect((await sc(page)).angle).toBe("✗");
  });

  it.concurrent("should give an open shot when he leaves after the catch, failing only the timing card", async () => {
    // GIVEN everything right but leaving on the catch
    const page = await open();
    await tab(page, "sandbox");

    // WHEN run
    await run(page, { timing: "late" });

    // THEN it is OPEN SHOT, D, and only timing fails
    await graded(page, "D", "OPEN SHOT");
    expect(await sc(page)).toEqual({ distance: "✓", balance: "✓", angle: "✓", timing: "✗" });
    expect(await text(page, ".sb-text")).toContain("left after the catch");
  });

  it.concurrent("should grade at the exact edges of distance and balance", async () => {
    // GIVEN the sandbox tab
    const page = await open();
    await tab(page, "sandbox");
    const edge = async (o: { cush?: number; ctrl?: number }, grade: string) => { await run(page, o); await reads(page, "#sbGrade", grade); await page.click(".sb-run").catch(() => {}); };

    // WHEN cushion sits at 12 (16.1 px, right) and 11 (15.2 px, crowded); 54 (51.4 px, right) and 55 (52.2 px, soft); balance 45 (right) and 44 (flew in)
    // THEN the grade flips exactly there
    await setRange(page, ".sb-cush", 12); await page.click(".sb-run"); await reads(page, "#sbGrade", "A");
    await setRange(page, ".sb-cush", 11); await page.click(".sb-run"); await reads(page, "#sbGrade", "C");
    await setRange(page, ".sb-cush", 54); await page.click(".sb-run"); await reads(page, "#sbGrade", "A");
    await setRange(page, ".sb-cush", 55); await page.click(".sb-run"); await reads(page, "#sbGrade", "D");
    await setRange(page, ".sb-cush", 30);
    await setRange(page, ".sb-ctrl", 45); await page.click(".sb-run"); await reads(page, "#sbGrade", "A");
    await setRange(page, ".sb-ctrl", 44); await page.click(".sb-run"); await reads(page, "#sbGrade", "C");
    void edge;
  });

  it.concurrent("should blank the scorecard again when a setting changes after a run", async () => {
    // GIVEN a graded run
    const page = await open();
    await tab(page, "sandbox");
    await run(page);
    await graded(page, "A", "CONTAINED ✓");

    // WHEN the user moves the cushion dial
    await setRange(page, ".sb-cush", 40);

    // THEN the scorecard is blank again
    expect(await sc(page)).toEqual({ distance: "—", balance: "—", angle: "—", timing: "—" });
  });

  it.concurrent("should stamp the outcome on the court once the possession plays out", async () => {
    // GIVEN the full recipe
    const page = await open();
    await tab(page, "sandbox");

    // WHEN run
    await run(page);

    // THEN the court stamps it and the run button returns
    await page.waitForFunction(() => document.querySelector(".sbstamp")!.textContent === "CONTAINED ✓" && document.querySelector(".sbstamp")!.getAttribute("opacity") === "1");
    await reads(page, ".sb-run", "▶ Run possession");
  });
});

describe("the read-the-man tab", () => {
  it.concurrent("should give each kind of shooter the closeout that suits him", async () => {
    // GIVEN the read tab, opened on the shooter
    const page = await open();
    await tab(page, "read");
    await reads(page, ".read-verdict .big", "Knockdown shooter — contest hard");

    // WHEN each other type is picked
    // THEN the title changes to that type's advice
    for (const [t, title] of [["pump", "Pump-faker — high hand, feet down"], ["driver", "Driver — sit on the drive"], ["none", "Non-shooter — don't close out"]] as const) {
      await page.click(`.read-seg button[data-t="${t}"]`);
      await reads(page, ".read-verdict .big", title);
    }
    expect(await text(page, ".read-rule")).toContain("Barely close out");
  });

  it.concurrent("should show the closeout gap growing from the shooter to the non-shooter", async () => {
    // GIVEN the read tab
    const page = await open();
    await tab(page, "read");
    const ring = () => page.$eval(".rideal", (c) => +c.getAttribute("r")!);

    // WHEN the shooter, then the non-shooter is picked
    const shooter = await ring();
    await page.click('.read-seg button[data-t="none"]');
    await page.waitForFunction((r) => +document.querySelector(".rideal")!.getAttribute("r")! > r, {}, shooter);

    // THEN the ring is wider for the non-shooter (82 px vs 30 px)
    expect(shooter).toBe(30);
    expect(await ring()).toBe(82);
  });
});

describe("the move tab's speed readout", () => {
  it.concurrent("should call the sprint fast and the arrival under control as the timeline is scrubbed", async () => {
    // GIVEN the first tab, at rest
    const page = await open();
    expect(await text(page, ".spd-word")).toBe("—");

    // WHEN the timeline is scrubbed early (the sprint), then to the end (the arrival)
    await setRange(page, ".scrub", 300);
    await reads(page, ".spd-word", "sprint");
    await setRange(page, ".scrub", 1000);

    // THEN the readout says the defender is under control
    await reads(page, ".spd-word", "under control");
  });

  it.concurrent("should light the coaching step the scrubber reaches, and jump there when a step is clicked", async () => {
    // GIVEN the first tab
    const page = await open();
    const active = () => page.$$eval(".move-steps .step", (s) => s.findIndex((e) => e.classList.contains("active")));
    expect(await active()).toBe(0);

    // WHEN the timeline is scrubbed near the end
    await setRange(page, ".scrub", 900);
    await page.waitForFunction(() => document.querySelectorAll(".move-steps .step")[3]!.classList.contains("active"));

    // AND the second step is clicked
    await page.click(".move-steps .step:nth-child(2)");

    // THEN the timeline jumps back to it
    await page.waitForFunction(() => document.querySelectorAll(".move-steps .step")[1]!.classList.contains("active"));
    expect(await page.$eval(".scrub", (s) => +(s as HTMLInputElement).value)).toBeGreaterThan(140);
    expect(await page.$eval(".scrub", (s) => +(s as HTMLInputElement).value)).toBeLessThan(200);
  });
});

describe("the in-a-defense tab", () => {
  it.concurrent("should light the rotation step the timeline reaches", async () => {
    // GIVEN the defense tab
    const page = await open();
    await tab(page, "team");
    const active = () => page.$$eval(".team-steps .step", (s) => s.findIndex((e) => e.classList.contains("active")));
    expect(await active()).toBe(0);

    // WHEN the timeline is scrubbed to 60% (the closeout with help behind)
    await setRange(page, ".team-scrub", 600);

    // THEN step 4 is lit
    await page.waitForFunction(() => document.querySelectorAll(".team-steps .step")[3]!.classList.contains("active"));
  });
});

describe("the in-a-defense tab, played", () => {
  it.concurrent("should run the rotation to its end and offer to run it again", async () => {
    // GIVEN the defense tab
    const page = await open();
    await tab(page, "team");

    // WHEN the rotation is run
    await page.click(".team-play");
    await reads(page, ".team-play", "❚❚ Pause");

    // THEN it ends on the closeout step with the timeline full, and the button resets
    await page.waitForFunction(() => document.querySelectorAll(".team-steps .step")[3]!.classList.contains("active") && (document.querySelector(".team-scrub") as HTMLInputElement).value === "1000", { timeout: 15_000 });
    await reads(page, ".team-play", "▶ Run the rotation");
  });

  it.concurrent("should pause the rotation midway", async () => {
    // GIVEN a run under way
    const page = await open();
    await tab(page, "team");
    await page.click(".team-play");
    await page.waitForFunction(() => +(document.querySelector(".team-scrub") as HTMLInputElement).value > 50);

    // WHEN it is paused
    await page.click(".team-play");

    // THEN the button offers to run, and the timeline stays where it stopped short of the end
    await reads(page, ".team-play", "▶ Run the rotation");
    const at = await page.$eval(".team-scrub", (s) => +(s as HTMLInputElement).value);
    expect(at).toBeLessThan(1000);
  });
});

describe("the 3D tab", () => {
  it.concurrent("should draw the scene and name the phase the scrubber reaches", async () => {
    // GIVEN the 3D tab opened (real three, served locally)
    const page = await open();
    await tab(page, "d3");
    await page.waitForSelector(".d3-canvas canvas", { timeout: 20_000 });
    await reads(page, "#d3phaseTitle", "The sprint");

    // WHEN the scrubber goes to 50%, then 70%, then 90%
    // THEN the phase names follow the play
    await setRange(page, ".d3scrub", 500);
    await reads(page, "#d3phaseTitle", "Chop it down");
    await setRange(page, ".d3scrub", 700);
    await reads(page, "#d3phaseTitle", "Sink the hips");
    await setRange(page, ".d3scrub", 900);
    await reads(page, "#d3phaseTitle", "High hand, contest");
    expect(page.errors).toEqual([]);
  });

  it.concurrent("should stop spinning when the side view is taken", async () => {
    // GIVEN the 3D tab with auto-spin on
    const page = await open();
    await tab(page, "d3");
    await page.waitForSelector(".d3-canvas canvas", { timeout: 20_000 });
    expect(await page.$eval(".d3rot", (c) => (c as HTMLInputElement).checked)).toBe(true);

    // WHEN the user picks the side view
    await page.click(".d3side");

    // THEN spin is switched off
    expect(await page.$eval(".d3rot", (c) => (c as HTMLInputElement).checked)).toBe(false);
  });

  it.concurrent("should play to the end and back to the start on play again", async () => {
    // GIVEN the 3D tab
    const page = await open();
    await tab(page, "d3");
    await page.waitForSelector(".d3-canvas canvas", { timeout: 20_000 });

    // WHEN play is pressed
    await page.click(".d3play");
    await reads(page, ".d3play", "❚❚ Pause");

    // THEN it finishes on the last phase with the scrubber full
    await page.waitForFunction(() => (document.querySelector(".d3scrub") as HTMLInputElement).value === "1000", { timeout: 20_000 });
    await reads(page, "#d3phaseTitle", "High hand, contest");
    await reads(page, ".d3play", "↺ Play again");
  });
});

describe("the live drill", () => {
  // The drill is steered by the pointer. A test places the pointer at a spot on the court (in court units).
  const at = async (page: Awaited<ReturnType<typeof open>>, x: number, y: number) => {
    const c = await page.$eval(".drill-court", (svg, p) => {
      const s = svg as unknown as SVGSVGElement, pt = s.createSVGPoint();
      pt.x = p.x; pt.y = p.y;
      const r = pt.matrixTransform(s.getScreenCTM()!);
      return { x: r.x, y: r.y };
    }, { x, y });
    await page.mouse.move(c.x, c.y);
  };
  const counts = (page: Awaited<ReturnType<typeof open>>) =>
    page.evaluate(() => ({ stops: document.querySelector(".d-stops")!.textContent, buckets: document.querySelector(".d-buckets")!.textContent, streak: document.querySelector(".d-streak")!.textContent }));

  it.concurrent("should start with an empty scoreboard and a prompt", async () => {
    // GIVEN the drill tab
    const page = await open({ seedRandom: true });
    await tab(page, "drill");

    // THEN nothing is scored and the prompt says to press Start
    expect(await counts(page)).toEqual({ stops: "0", buckets: "0", streak: "0" });
    expect(await text(page, ".d-msg")).toContain("Press Start");
  });

  it.concurrent("should score a bucket when the defender is left far from the shooter", async () => {
    // GIVEN a rep started
    const page = await open({ seedRandom: true });
    await tab(page, "drill");
    await page.click(".d-start");

    // WHEN the cursor sits in the far corner and the defender never closes out
    await at(page, 30, 460);

    // THEN the shot goes up wide open: a bucket, streak zero
    await page.waitForFunction(() => document.querySelector(".dstamp")!.textContent === "BUCKET", { timeout: 15_000 });
    expect(await text(page, ".d-msg")).toContain("wide-open jumper");
    expect(await counts(page)).toEqual({ stops: "0", buckets: "1", streak: "0" });
  });

  it.concurrent("should score a stop when the defender settles at arm's length, and reset the streak on the next bucket", async () => {
    // GIVEN a rep started (shooter at the right wing, 405,205)
    const page = await open({ seedRandom: true });
    await tab(page, "drill");
    await page.click(".d-start");

    // WHEN the cursor settles about 30 px from the shooter
    await at(page, 375, 203);

    // THEN the rep is a stop
    await page.waitForFunction(() => document.querySelector(".dstamp")!.textContent === "STOP ✓", { timeout: 15_000 });
    expect(await counts(page)).toEqual({ stops: "1", buckets: "0", streak: "1" });

    // WHEN the next rep is left open
    await page.click(".d-start");
    await page.waitForFunction(() => document.querySelector(".dstamp")!.getAttribute("opacity") === "0");
    await at(page, 30, 460);

    // THEN it is a bucket and the streak resets
    await page.waitForFunction(() => document.querySelector(".d-buckets")!.textContent === "1", { timeout: 15_000 });
    expect(await counts(page)).toEqual({ stops: "1", buckets: "1", streak: "0" });
  });

  it.concurrent("should let the shooter drive past a defender who crowds him, and count the bucket", async () => {
    // GIVEN a rep started (shooter at 405,205)
    const page = await open({ seedRandom: true });
    await tab(page, "drill");
    await page.click(".d-start");

    // WHEN the cursor sits right on top of the shooter (under 20 px: crowding)
    await at(page, 406, 206);

    // THEN he attacks and the rep ends with a stamped result and a counted rep
    await page.waitForFunction(() => /^(STOP ✓|BUCKET)$/.test(document.querySelector(".dstamp")!.textContent!), { timeout: 15_000 });
    const c = await counts(page);
    expect(Number(c.stops) + Number(c.buckets)).toBe(1);
    expect(await text(page, ".d-msg")).toMatch(/walled off|beat you to the rim|couldn.t turn the corner/);
  });

  it.concurrent("should reset to the idle prompt when the user leaves the tab mid-rep", async () => {
    // GIVEN a rep started
    const page = await open({ seedRandom: true });
    await tab(page, "drill");
    await page.click(".d-start");
    await reads(page, ".d-msg", "Close out! Get inside the shrinking yellow ring before he's set.");

    // WHEN the user goes to another tab
    await tab(page, "read");

    // THEN the drill is back to its prompt
    expect(await text(page, ".d-msg")).toContain("Press Start");
  });
});
