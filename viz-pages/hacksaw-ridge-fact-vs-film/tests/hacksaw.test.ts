import { describe, it, expect } from "bun:test";
import { open, text, journeyReady, scrubTo, type P } from "./helpers.ts";

// The fact-check page has 20 story beats, each with a verdict; counted by hand from the BEATS list in app.ts:
// 9 kept true, 3 dramatized, 5 invented, 3 left out. The filter chips hide and show beats by that verdict.
const TOTAL = 20, COUNT = { true: 9, dram: 3, inv: 5, cut: 3 } as const;

describe("the verdict filter", () => {
  const visible = (page: P) => page.$$eval(".beat", (bs) => bs.filter((b) => !b.classList.contains("hide")).map((b) => (b as HTMLElement).dataset.v));
  const chip = (page: P, v: string) => page.click(`#controls .chip[data-v="${v}"]`);
  const on = (page: P) => page.$$eval("#controls .chip", (cs) => cs.filter((c) => c.classList.contains("on")).map((c) => (c as HTMLElement).dataset.v));

  it.concurrent("should show every beat, and the bar and the beats should agree on the tallies", async () => {
    // GIVEN the page as it opens
    const page = await open();

    // THEN all 20 beats are showing and every chip is on
    expect((await visible(page)).length).toBe(TOTAL);
    expect(await on(page)).toEqual(["all", "true", "dram", "inv", "cut"]);
    // AND the accuracy bar's segments read 9, 3, 5 and 3, the same as the beats' own verdict tags
    expect(await page.$$eval("#accbar .accseg", (s) => s.map((x) => [x.querySelector("small")!.textContent, +x.querySelector("span")!.textContent!]))).toEqual([
      ["Kept true", 9], ["Dramatized", 3], ["Invented", 5], ["Left out", 3]]);
    const vs = await visible(page);
    for (const [v, n] of Object.entries(COUNT)) expect(vs.filter((x) => x === v).length).toBe(n);
    expect(await text(page, "#accbar-cap")).toContain("9 of 20");
    expect(page.errors).toEqual([]);
  });

  it.concurrent("should hide exactly the beats of a verdict when its chip is switched off, and show them again", async () => {
    // GIVEN the page
    const page = await open();

    // WHEN the user switches off "Invented"
    await chip(page, "inv");

    // THEN the 5 invented beats are hidden and the other 15 stay, in order
    const vs = await visible(page);
    expect(vs.length).toBe(TOTAL - COUNT.inv);
    expect(vs.includes("inv")).toBe(false);
    // AND the chip is off and "All beats" is off with it
    expect(await on(page)).toEqual(["true", "dram", "cut"]);
    // AND the reel dims exactly those 5 frames
    expect(await page.$$eval("#reel .frame.dim", (f) => f.map((x) => (x as HTMLElement).dataset.v))).toEqual(Array(5).fill("inv"));

    // WHEN the user switches it back on
    await chip(page, "inv");
    // THEN all 20 are back and "All beats" is lit again
    expect((await visible(page)).length).toBe(TOTAL);
    expect(await on(page)).toEqual(["all", "true", "dram", "inv", "cut"]);
  });

  it.concurrent("should combine filters, say when nothing matches, and clear on All beats", async () => {
    // GIVEN the page
    const page = await open();

    // WHEN the user switches off "Kept true" and "Left out" (9 + 3 hidden)
    await chip(page, "true"); await chip(page, "cut");
    // THEN 8 beats remain: the 3 dramatized and the 5 invented
    const vs = await visible(page);
    expect(vs.length).toBe(COUNT.dram + COUNT.inv);
    expect(new Set(vs)).toEqual(new Set(["dram", "inv"]));

    // WHEN the user switches off the other two as well
    await chip(page, "dram"); await chip(page, "inv");
    // THEN nothing shows and the empty message appears
    expect((await visible(page)).length).toBe(0);
    expect(await page.$eval("#empty", (e) => (e as HTMLElement).style.display)).toBe("block");

    // WHEN the user presses All beats
    await chip(page, "all");
    // THEN everything is back and the message is gone
    expect((await visible(page)).length).toBe(TOTAL);
    expect(await page.$eval("#empty", (e) => (e as HTMLElement).style.display)).toBe("none");
  });

  it.concurrent("should remember the filter in the link and open with it applied", async () => {
    // GIVEN the page
    const page = await open();

    // WHEN the user switches off "Dramatized"
    await chip(page, "dram");
    // THEN the address records it
    await page.waitForFunction(() => location.hash.includes("dram"));
    expect(JSON.parse(decodeURIComponent(page.url().split("#")[1]!))).toEqual({ off: ["dram"] });

    // AND a link with "Invented" and "Left out" off opens with only 20 - 5 - 3 = 12 beats showing
    const linked = await open({ off: ["inv", "cut"] });
    expect((await visible(linked)).length).toBe(TOTAL - COUNT.inv - COUNT.cut);
    expect(await on(linked)).toEqual(["true", "dram"]);
  });
});

// The journey: 15 life events, each on a map location. ROUTE is Lynchburg, Fort Jackson, Guam, Leyte, Okinawa, D.C., Piedmont.
// Events by index (hand-copied from LIFE): 0-4 Lynchburg, 5-6 Fort Jackson, 7 Guam, 8 Leyte, 9-10 Okinawa, 11 D.C., 12-14 Piedmont.
// The route lights one hop per route stop reached so far: event 0 lights none, 5 lights 1, 7 lights 2, 8 lights 3, 9 lights 4,
// 11 lights 5, 12 lights 6. Film-side: events 7, 8, 12, 13, 14 are not in the film (hollow rings), the other 10 are (dots).
const TITLES = [
  "Born in Lynchburg, Virginia", "A childhood vow against killing", "He meets Dorothy", "Enlists as an unarmed medic", "Marries Dorothy",
  "Training & refusing the rifle", "The court-martial", "Guam — first Bronze Star", "Leyte — second Bronze Star", "Hacksaw Ridge",
  "Wounded four times", "Medal of Honor", "Years lost to tuberculosis", "He goes deaf", "Dies at 87",
];
const VERDICT = ["Film matches", "Dramatized", "Invented", "Film matches", "Invented", "Dramatized", "Invented", "Left out", "Left out", "Film matches", "Dramatized", "Film matches", "Left out", "Left out", "Left out"];
const LOC = ["lynchburg", "lynchburg", "lynchburg", "lynchburg", "lynchburg", "fortjackson", "fortjackson", "guam", "leyte", "okinawa", "okinawa", "dc", "piedmont", "piedmont", "piedmont"];
const LIT = [0, 0, 0, 0, 0, 1, 1, 2, 3, 4, 4, 5, 6, 6, 6];

describe("the journey", () => {
  const read = (page: P) => page.evaluate(() => ({
    count: document.querySelector("#jcount")!.textContent,
    title: document.querySelector("#jcap .jtitle")!.textContent,
    verdict: document.querySelector("#jcap .verdict")!.textContent,
    range: (document.querySelector("#jrange") as HTMLInputElement).value,
    lit: document.querySelectorAll("#jmap .jroute.on").length,
    activeLoc: [...document.querySelectorAll<SVGElement>("#jmap .jdot.active")].map((d) => d.getAttribute("data-loc")),
    activeTl: [...document.querySelectorAll<SVGElement>("#jtl .tl-dot.active")].map((d) => d.getAttribute("data-i")),
  }));

  it.concurrent("should tell each event's title, verdict and place, and light the route as far as it has got, at every stop", async () => {
    // GIVEN the journey, drawn
    const page = await open();
    await journeyReady(page);

    for (let i = 0; i < TITLES.length; i++) {
      // WHEN the user scrubs to event i
      await scrubTo(page, i);
      // THEN the counter, title, verdict, place and route all match that event
      expect(await read(page), `event ${i}`).toMatchObject({
        count: `${i + 1} / 15`, title: TITLES[i], verdict: VERDICT[i], range: String(i), lit: LIT[i], activeLoc: [LOC[i]],
      });
      // AND the same event is lit on the timeline: its reality dot, and its film dot when the film has it
      expect((await read(page)).activeTl.every((d) => d === String(i))).toBe(true);
    }
    expect(page.errors).toEqual([]);
  });

  it.concurrent("should say plainly when the film left an event out, and show both sides when it did not", async () => {
    // GIVEN the journey
    const page = await open();
    await journeyReady(page);
    const panes = () => page.$eval("#jcap", (c) => [...c.querySelectorAll(".jc")].map((x) => x.className.replace("jc ", "") + ":" + x.textContent!.replace(/\s+/g, " ").trim()));

    // WHEN the user opens event 7, Guam, which the film omitted
    await scrubTo(page, 7);
    // THEN it says "Not in the film." and gives the reality
    expect(await panes()).toEqual(["none:Not in the film.", "real:RealityEarns a Bronze Star for valor treating the wounded under fire on Guam."]);

    // WHEN the user opens event 3, the enlistment, which the film has
    await scrubTo(page, 3);
    // THEN both the film and the reality are told
    expect(await panes()).toEqual(["film:On screenEnlists to serve without killing, over his father's objections.", expect.stringMatching(/^real:RealityEnlists Apr 1, 1942/)]);
  });

  it.concurrent("should step with Next and Prev and stop at both ends", async () => {
    // GIVEN the journey on event 1 of 15
    const page = await open();
    await journeyReady(page);
    const btn = (j: string) => page.click(`.jctrl button[data-j="${j}"]`);

    // WHEN the user presses Prev at the start
    await btn("prev");
    // THEN it stays on 1 / 15
    expect(await text(page, "#jcount")).toBe("1 / 15");

    // WHEN the user presses Next twice
    await btn("next"); await btn("next");
    // THEN it is on 3 / 15, the third event
    expect(await read(page)).toMatchObject({ count: "3 / 15", title: "He meets Dorothy" });

    // WHEN the user jumps to the end and presses Next
    await scrubTo(page, 14);
    await btn("next");
    // THEN it stays on 15 / 15
    expect(await text(page, "#jcount")).toBe("15 / 15");
    // WHEN Prev
    await btn("prev");
    // THEN 14 / 15
    expect(await read(page)).toMatchObject({ count: "14 / 15", title: "He goes deaf" });
  });

  it.concurrent("should select an event from a dot on the timeline or on the map", async () => {
    // GIVEN the journey
    const page = await open();
    await journeyReady(page);

    // WHEN the user clicks the reality dot of event 9, Hacksaw Ridge, on the timeline
    await page.$eval('#jtl .tl-dot[data-i="9"]', (d) => d.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    // THEN that event is showing
    expect(await read(page)).toMatchObject({ count: "10 / 15", title: "Hacksaw Ridge" });

    // WHEN the user clicks the hollow ring where the film left out event 12
    await page.$eval('#jtl .tl-cut[data-i="12"]', (d) => d.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    // THEN that event is showing
    expect(await read(page)).toMatchObject({ count: "13 / 15", title: "Years lost to tuberculosis" });

    // WHEN the user clicks the Guam dot on the map
    await page.$eval('#jmap .jdot[data-loc="guam"]', (d) => d.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    // THEN the first event at Guam is showing (event 7)
    expect(await read(page)).toMatchObject({ count: "8 / 15", title: "Guam — first Bronze Star" });
  });

  it.concurrent("should draw the film's lane with a dot for each of the 10 events it has and a hollow ring for each of the 5 it left out", async () => {
    // GIVEN the journey
    const page = await open();
    await journeyReady(page);

    // THEN there are 15 reality dots, 10 film dots, and 5 hollow rings, the rings on exactly the events with no film side
    const counts = await page.evaluate(() => ({
      dots: document.querySelectorAll("#jtl .tl-dot").length,
      cut: [...document.querySelectorAll("#jtl .tl-cut")].map((c) => c.getAttribute("data-i")),
    }));
    expect(counts).toEqual({ dots: 25, cut: ["7", "8", "12", "13", "14"] });
  });

  it.concurrent("should play forward on its own, stop on Pause, and restart from the first event when played from the end", async () => {
    // GIVEN the journey on the last event
    const page = await open();
    await journeyReady(page);
    await scrubTo(page, 14);

    // WHEN the user presses Play
    await page.click('.jctrl button[data-j="play"]');
    // THEN it goes back to the first event and the button says Pause
    expect(await text(page, "#jplay")).toBe("❚❚ Pause");
    expect(await text(page, "#jcount")).toBe("1 / 15");

    // AND after a couple of seconds it has moved on by itself
    await page.waitForFunction(() => document.querySelector("#jcount")!.textContent === "2 / 15", { timeout: 10_000 });

    // WHEN the user presses Pause, then Play again, then drags the scrubber
    await page.click('.jctrl button[data-j="play"]');
    expect(await text(page, "#jplay")).toBe("▶ Play");
    await page.click('.jctrl button[data-j="play"]');
    expect(await text(page, "#jplay")).toBe("❚❚ Pause");
    await scrubTo(page, 5);
    // THEN playing stops: the button says Play and the event holds
    expect(await text(page, "#jplay")).toBe("▶ Play");
    await new Promise((r) => setTimeout(r, 2500));
    expect(await text(page, "#jcount")).toBe("6 / 15");
  }, 30_000);
});

describe("the beat reel", () => {
  it.concurrent("should name the beat and its verdict when a frame is hovered, and go back to the hint when the mouse leaves", async () => {
    // GIVEN the reel, one frame per beat, on its hint text
    const page = await open();
    const hint = await text(page, "#reeltip");
    expect(hint).toContain("Each frame is one story beat");

    // WHEN the user hovers the fourth frame (BEATS[3], "The tourniquet meet-cute", invented)
    await page.hover('#reel .frame[data-i="3"]');
    // THEN the tip names it, numbered from 1, with its verdict
    expect(await text(page, "#reeltip")).toBe("4. The tourniquet meet-cute — Invented");
    // WHEN the user hovers the third frame ("Why he would not kill", true)
    await page.hover('#reel .frame[data-i="2"]');
    expect(await text(page, "#reeltip")).toBe("3. Why he would not kill — Kept true");

    // WHEN the mouse leaves the reel
    await page.mouse.move(1, 1);
    // THEN the hint is back
    expect(await text(page, "#reeltip")).toBe(hint);
  });

  it.concurrent("should scroll to the beat when a frame is clicked", async () => {
    // GIVEN the reel with the page at the top
    const page = await open();
    const top = () => page.evaluate(() => Math.round(document.getElementById("beat-3")!.getBoundingClientRect().top));
    const before = await top();

    // WHEN the user clicks the fourth frame
    await page.$eval('#reel .frame[data-i="3"]', (f) => (f as HTMLElement).click());

    // THEN (once the smooth scroll settles) that beat sits in the middle of the window
    await page.waitForFunction(() => { const r = document.getElementById("beat-3")!.getBoundingClientRect(); const m = (r.top + r.height / 2) / innerHeight; return m > 0.4 && m < 0.6; }, { timeout: 5000 });
    expect(await top()).not.toBe(before);
  });
});

describe("the cliff rescue counter", () => {
  it.concurrent("should show all 75 rescued at once, with eight figures at the foot, when motion is reduced", async () => {
    // GIVEN a visitor who asks for reduced motion
    const page = await open();
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await page.reload();
    await page.waitForSelector("#cliff-num");

    // THEN the counter reads 75 and eight rescued figures are drawn
    expect(await text(page, "#cliff-num")).toBe("75");
    expect(await page.$$eval("#cliff-rescued g", (g) => g.length)).toBe(8);
  });

  it.concurrent("should count up one rescue per litter descent when motion is allowed", async () => {
    // GIVEN the page with motion allowed
    const page = await open();
    // WHEN the first litter reaches the base (2.3 s)
    await page.waitForFunction(() => document.getElementById("cliff-num")!.textContent === "1", { timeout: 15_000 });
    // THEN one figure is drawn at the foot
    expect(await page.$$eval("#cliff-rescued g", (g) => g.length)).toBe(1);
  }, 30_000);
});

describe("the artifact gallery", () => {
  it.concurrent("should enlarge a picture with its caption and credit, and close on Escape", async () => {
    // GIVEN the gallery
    const page = await open();
    const first = await page.$eval("#gallery .art", (a) => ({ cap: a.querySelector(".cap b")!.textContent, credit: a.querySelector(".credit")!.textContent }));
    expect(await page.$eval("#lightbox", (l) => l.classList.contains("open"))).toBe(false);

    // WHEN the user clicks the first picture
    await page.$eval("#gallery .art", (a) => (a as HTMLElement).click());

    // THEN the lightbox opens with that picture's caption and credit
    expect(await page.$eval("#lightbox", (l) => l.classList.contains("open"))).toBe(true);
    expect(await text(page, "#lbCap")).toBe(`${first.cap}${first.credit}`);
    expect(await page.$eval("#lbImg", (i) => (i as HTMLImageElement).src.startsWith("data:image"))).toBe(true);

    // WHEN the user presses Escape
    await page.keyboard.press("Escape");
    // THEN it closes and the picture is cleared
    expect(await page.$eval("#lightbox", (l) => l.classList.contains("open"))).toBe(false);
  });
});
