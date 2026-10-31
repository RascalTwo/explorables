import { describe, it, expect } from "bun:test";
import { open, text, journeyReady, scrubTo, type P } from "./helpers.ts";

// The fact-check page has 20 story beats, each with a verdict; counted by hand from the BEATS list in app.ts:
// 9 kept true, 3 dramatized, 5 invented, 3 left out. The filter chips hide and show beats by that verdict.
const TOTAL = 20,
  COUNT = { true: 9, dram: 3, inv: 5, cut: 3 } as const;

describe("the verdict filter", () => {
  const visible = async (page: P) => {
    const vs = await page.$$eval(".beat", (bs) =>
      bs
        .filter((b) => !b.classList.contains("hide"))
        .map((b) => (b instanceof HTMLElement ? b.dataset.v : undefined)),
    );
    return vs;
  };
  const chip = async (page: P, v: string) => {
    await page.click(`#controls .chip[data-v="${v}"]`);
  };
  const on = async (page: P) => {
    const vs = await page.$$eval("#controls .chip", (cs) =>
      cs
        .filter((c) => c.classList.contains("on"))
        .map((c) => (c instanceof HTMLElement ? c.dataset.v : undefined)),
    );
    return vs;
  };

  it.concurrent("should show every beat, and the bar and the beats should agree on the tallies", async () => {
    const page = await viz.given("the page as it opens", async () => open());

    await viz.when("the user does nothing more", async () => {
      await Promise.resolve();
    });

    await viz.then("all 20 beats are showing and every chip is on", async () => {
      expect((await visible(page)).length).toBe(TOTAL);
      expect(await on(page)).toEqual(["all", "true", "dram", "inv", "cut"]);
    });

    await viz.then(
      "the accuracy bar's segments read 9, 3, 5 and 3, the same as the beats' own verdict tags",
      async () => {
        expect(
          await page.$$eval("#accbar .accseg", (s) =>
            s.map((x) => [
              x.querySelector("small")!.textContent,
              +x.querySelector("span")!.textContent,
            ]),
          ),
        ).toEqual([
          ["Kept true", 9],
          ["Dramatized", 3],
          ["Invented", 5],
          ["Left out", 3],
        ]);
        const vs = await visible(page);
        for (const [v, n] of Object.entries(COUNT))
          expect(vs.filter((x) => x === v).length).toBe(n);
        expect(await text(page, "#accbar-cap")).toContain("9 of 20");
        expect(page.errors).toEqual([]);
      },
    );
  });

  it.concurrent("should hide exactly the beats of a verdict when its chip is switched off, and show them again", async () => {
    const page = await viz.given("the page", async () => open());

    await viz.when('the user switches off "Invented"', async () => {
      await chip(page, "inv");
    });

    await viz.then("the 5 invented beats are hidden and the other 15 stay, in order", async () => {
      const vs = await visible(page);
      expect(vs.length).toBe(TOTAL - COUNT.inv);
      expect(vs.includes("inv")).toBe(false);
    });
    await viz.then('the chip is off and "All beats" is off with it', async () => {
      expect(await on(page)).toEqual(["true", "dram", "cut"]);
    });
    await viz.then("the reel dims exactly those 5 frames", async () => {
      expect(
        await page.$$eval("#reel .frame.dim", (f) =>
          f.map((x) => (x instanceof HTMLElement ? x.dataset.v : undefined)),
        ),
      ).toEqual(Array.from({ length: 5 }, () => "inv"));
    });

    await viz.when("the user switches it back on", async () => {
      await chip(page, "inv");
    });
    await viz.then('all 20 are back and "All beats" is lit again', async () => {
      expect((await visible(page)).length).toBe(TOTAL);
      expect(await on(page)).toEqual(["all", "true", "dram", "inv", "cut"]);
    });
  });

  it.concurrent("should combine filters, say when nothing matches, and clear on All beats", async () => {
    const page = await viz.given("the page", async () => open());

    await viz.when('the user switches off "Kept true" and "Left out" (9 + 3 hidden)', async () => {
      await chip(page, "true");
      await chip(page, "cut");
    });
    await viz.then("8 beats remain: the 3 dramatized and the 5 invented", async () => {
      const vs = await visible(page);
      expect(vs.length).toBe(COUNT.dram + COUNT.inv);
      expect(new Set(vs)).toEqual(new Set(["dram", "inv"]));
    });

    await viz.when("the user switches off the other two as well", async () => {
      await chip(page, "dram");
      await chip(page, "inv");
    });
    await viz.then("nothing shows and the empty message appears", async () => {
      expect((await visible(page)).length).toBe(0);
      expect(
        await page.$eval("#empty", (e) => (e instanceof HTMLElement ? e.style.display : "")),
      ).toBe("block");
    });

    await viz.when("the user presses All beats", async () => {
      await chip(page, "all");
    });
    await viz.then("everything is back and the message is gone", async () => {
      expect((await visible(page)).length).toBe(TOTAL);
      expect(
        await page.$eval("#empty", (e) => (e instanceof HTMLElement ? e.style.display : "")),
      ).toBe("none");
    });
  });

  it.concurrent("should remember the filter in the link and open with it applied", async () => {
    const page = await viz.given("the page", async () => open());

    await viz.when('the user switches off "Dramatized"', async () => {
      await chip(page, "dram");
    });
    await viz.then("the address records it", async () => {
      await page.waitForFunction(() => location.hash.includes("dram"));
      expect(JSON.parse(decodeURIComponent(page.url().split("#")[1]!))).toEqual({ off: ["dram"] });
    });

    const linked = await viz.when('a link with "Invented" and "Left out" off is opened', async () =>
      open({ off: ["inv", "cut"] }),
    );
    await viz.then("only 20 - 5 - 3 = 12 beats are showing", async () => {
      expect((await visible(linked)).length).toBe(TOTAL - COUNT.inv - COUNT.cut);
      expect(await on(linked)).toEqual(["true", "dram"]);
    });
  });
});

// The journey: 15 life events, each on a map location. ROUTE is Lynchburg, Fort Jackson, Guam, Leyte, Okinawa, D.C., Piedmont.
// Events by index (hand-copied from LIFE): 0-4 Lynchburg, 5-6 Fort Jackson, 7 Guam, 8 Leyte, 9-10 Okinawa, 11 D.C., 12-14 Piedmont.
// The route lights one hop per route stop reached so far: event 0 lights none, 5 lights 1, 7 lights 2, 8 lights 3, 9 lights 4,
// 11 lights 5, 12 lights 6. Film-side: events 7, 8, 12, 13, 14 are not in the film (hollow rings), the other 10 are (dots).
const TITLES = [
  "Born in Lynchburg, Virginia",
  "A childhood vow against killing",
  "He meets Dorothy",
  "Enlists as an unarmed medic",
  "Marries Dorothy",
  "Training & refusing the rifle",
  "The court-martial",
  "Guam — first Bronze Star",
  "Leyte — second Bronze Star",
  "Hacksaw Ridge",
  "Wounded four times",
  "Medal of Honor",
  "Years lost to tuberculosis",
  "He goes deaf",
  "Dies at 87",
];
const VERDICT = [
  "Film matches",
  "Dramatized",
  "Invented",
  "Film matches",
  "Invented",
  "Dramatized",
  "Invented",
  "Left out",
  "Left out",
  "Film matches",
  "Dramatized",
  "Film matches",
  "Left out",
  "Left out",
  "Left out",
];
const LOC = [
  "lynchburg",
  "lynchburg",
  "lynchburg",
  "lynchburg",
  "lynchburg",
  "fortjackson",
  "fortjackson",
  "guam",
  "leyte",
  "okinawa",
  "okinawa",
  "dc",
  "piedmont",
  "piedmont",
  "piedmont",
];
const LIT = [0, 0, 0, 0, 0, 1, 1, 2, 3, 4, 4, 5, 6, 6, 6];

describe("the journey", () => {
  const read = async (page: P) => {
    const state = await page.evaluate(() => ({
      count: document.querySelector("#jcount")!.textContent,
      title: document.querySelector("#jcap .jtitle")!.textContent,
      verdict: document.querySelector("#jcap .verdict")!.textContent,
      range: document.querySelector<HTMLInputElement>("#jrange")!.value,
      lit: document.querySelectorAll("#jmap .jroute.on").length,
      activeLoc: [...document.querySelectorAll<SVGElement>("#jmap .jdot.active")].map(
        (d) => d.dataset.loc,
      ),
      activeTl: [...document.querySelectorAll<SVGElement>("#jtl .tl-dot.active")].map(
        (d) => d.dataset.i,
      ),
    }));
    return state;
  };

  it.concurrent("should tell each event's title, verdict and place, and light the route as far as it has got, at every stop", async () => {
    const page = await viz.given("the journey, drawn", async () => {
      const p = await open();
      await journeyReady(p);
      return p;
    });

    for (let i = 0; i < TITLES.length; i++) {
      // oxlint-disable-next-line no-await-in-loop -- sequential on purpose: each event is scrubbed to and read before the next
      await viz.when(`the user scrubs to event ${i}`, async () => {
        await scrubTo(page, i);
      });
      // oxlint-disable-next-line no-await-in-loop -- sequential on purpose: reads the state after that scrub settled
      await viz.then(
        "the counter, title, verdict, place and route all match that event, and the same event is lit on the timeline: its reality dot, and its film dot when the film has it",
        async () => {
          expect(await read(page), `event ${i}`).toMatchObject({
            count: `${i + 1} / 15`,
            title: TITLES[i],
            verdict: VERDICT[i],
            range: String(i),
            lit: LIT[i],
            activeLoc: [LOC[i]],
          });
          expect((await read(page)).activeTl.every((d) => d === String(i))).toBe(true);
        },
      );
    }
    await viz.then("the page raised no errors", () => {
      expect(page.errors).toEqual([]);
    });
  });

  it.concurrent("should say plainly when the film left an event out, and show both sides when it did not", async () => {
    const { page, panes } = await viz.given("the journey", async () => {
      const p = await open();
      await journeyReady(p);
      const found = async () => {
        const result = await p.$eval("#jcap", (c) =>
          [...c.querySelectorAll(".jc")].map(
            (x) =>
              x.className.replace("jc ", "") + ":" + x.textContent.replaceAll(/\s+/gu, " ").trim(),
          ),
        );
        return result;
      };
      return { page: p, panes: found };
    });

    await viz.when("the user opens event 7, Guam, which the film omitted", async () => {
      await scrubTo(page, 7);
    });
    await viz.then('it says "Not in the film." and gives the reality', async () => {
      expect(await panes()).toEqual([
        "none:Not in the film.",
        "real:RealityEarns a Bronze Star for valor treating the wounded under fire on Guam.",
      ]);
    });

    await viz.when("the user opens event 3, the enlistment, which the film has", async () => {
      await scrubTo(page, 3);
    });
    await viz.then("both the film and the reality are told", async () => {
      const both = await panes();
      expect(both).toHaveLength(2);
      expect(both[0]).toBe(
        "film:On screenEnlists to serve without killing, over his father's objections.",
      );
      expect(both[1]).toMatch(/^real:RealityEnlists Apr 1, 1942/u);
    });
  });

  it.concurrent("should step with Next and Prev and stop at both ends", async () => {
    const { page, btn } = await viz.given("the journey on event 1 of 15", async () => {
      const p = await open();
      await journeyReady(p);
      const press = async (j: string) => {
        await p.click(`.jctrl button[data-j="${j}"]`);
      };
      return { page: p, btn: press };
    });

    await viz.when("the user presses Prev at the start", async () => {
      await btn("prev");
    });
    await viz.then("it stays on 1 / 15", async () => {
      expect(await text(page, "#jcount")).toBe("1 / 15");
    });

    await viz.when("the user presses Next twice", async () => {
      await btn("next");
      await btn("next");
    });
    await viz.then("it is on 3 / 15, the third event", async () => {
      expect(await read(page)).toMatchObject({ count: "3 / 15", title: "He meets Dorothy" });
    });

    await viz.when("the user jumps to the end and presses Next", async () => {
      await scrubTo(page, 14);
      await btn("next");
    });
    await viz.then("it stays on 15 / 15", async () => {
      expect(await text(page, "#jcount")).toBe("15 / 15");
    });

    await viz.when("the user presses Prev", async () => {
      await btn("prev");
    });
    await viz.then("it is on 14 / 15", async () => {
      expect(await read(page)).toMatchObject({ count: "14 / 15", title: "He goes deaf" });
    });
  });

  it.concurrent("should select an event from a dot on the timeline or on the map", async () => {
    const page = await viz.given("the journey", async () => {
      const p = await open();
      await journeyReady(p);
      return p;
    });

    await viz.when(
      "the user clicks the reality dot of event 9, Hacksaw Ridge, on the timeline",
      async () => {
        await page.$eval('#jtl .tl-dot[data-i="9"]', (d) =>
          d.dispatchEvent(new MouseEvent("click", { bubbles: true })),
        );
      },
    );
    await viz.then("that event is showing", async () => {
      expect(await read(page)).toMatchObject({ count: "10 / 15", title: "Hacksaw Ridge" });
    });

    await viz.when("the user clicks the hollow ring where the film left out event 12", async () => {
      await page.$eval('#jtl .tl-cut[data-i="12"]', (d) =>
        d.dispatchEvent(new MouseEvent("click", { bubbles: true })),
      );
    });
    await viz.then("that event is showing", async () => {
      expect(await read(page)).toMatchObject({
        count: "13 / 15",
        title: "Years lost to tuberculosis",
      });
    });

    await viz.when("the user clicks the Guam dot on the map", async () => {
      await page.$eval('#jmap .jdot[data-loc="guam"]', (d) =>
        d.dispatchEvent(new MouseEvent("click", { bubbles: true })),
      );
    });
    await viz.then("the first event at Guam is showing (event 7)", async () => {
      expect(await read(page)).toMatchObject({
        count: "8 / 15",
        title: "Guam — first Bronze Star",
      });
    });
  });

  it.concurrent("should draw the film's lane with a dot for each of the 10 events it has and a hollow ring for each of the 5 it left out", async () => {
    const page = await viz.given("the journey", async () => {
      const p = await open();
      await journeyReady(p);
      return p;
    });

    await viz.when("the user does nothing more", async () => {
      await Promise.resolve();
    });

    await viz.then(
      "there are 15 reality dots, 10 film dots, and 5 hollow rings, the rings on exactly the events with no film side",
      async () => {
        const counts = await page.evaluate(() => ({
          dots: document.querySelectorAll("#jtl .tl-dot").length,
          cut: [...document.querySelectorAll<SVGElement>("#jtl .tl-cut")].map((c) => c.dataset.i),
        }));
        expect(counts).toEqual({ dots: 25, cut: ["7", "8", "12", "13", "14"] });
      },
    );
  });

  it.concurrent("should play forward on its own, stop on Pause, and restart from the first event when played from the end", async () => {
    const page = await viz.given("the journey on the last event", async () => {
      const p = await open();
      await journeyReady(p);
      await scrubTo(p, 14);
      return p;
    });

    await viz.when("the user presses Play", async () => {
      await page.click('.jctrl button[data-j="play"]');
    });
    await viz.then("it goes back to the first event and the button says Pause", async () => {
      expect(await text(page, "#jplay")).toBe("❚❚ Pause");
      expect(await text(page, "#jcount")).toBe("1 / 15");
    });
    await viz.then("after a couple of seconds it has moved on by itself", async () => {
      await page.waitForFunction(
        () => document.querySelector("#jcount")!.textContent === "2 / 15",
        { timeout: 10_000 },
      );
    });

    await viz.when("the user presses Pause, then Play again, then drags the scrubber", async () => {
      await page.click('.jctrl button[data-j="play"]');
      expect(await text(page, "#jplay")).toBe("▶ Play");
      await page.click('.jctrl button[data-j="play"]');
      expect(await text(page, "#jplay")).toBe("❚❚ Pause");
      await scrubTo(page, 5);
    });
    await viz.then("playing stops: the button says Play and the event holds", async () => {
      expect(await text(page, "#jplay")).toBe("▶ Play");
      await Bun.sleep(2500);
      expect(await text(page, "#jcount")).toBe("6 / 15");
    });
  }, 30_000);
});

describe("the beat reel", () => {
  it.concurrent("should name the beat and its verdict when a frame is hovered, and go back to the hint when the mouse leaves", async () => {
    const { page, hint } = await viz.given(
      "the reel, one frame per beat, on its hint text",
      async () => {
        const p = await open();
        const h = await text(p, "#reeltip");
        expect(h).toContain("Each frame is one story beat");
        return { page: p, hint: h };
      },
    );

    await viz.when(
      'the user hovers the fourth frame (BEATS[3], "The tourniquet meet-cute", invented)',
      async () => {
        await page.hover('#reel .frame[data-i="3"]');
      },
    );
    await viz.then("the tip names it, numbered from 1, with its verdict", async () => {
      expect(await text(page, "#reeltip")).toBe("4. The tourniquet meet-cute — Invented");
    });

    await viz.when('the user hovers the third frame ("Why he would not kill", true)', async () => {
      await page.hover('#reel .frame[data-i="2"]');
    });
    await viz.then("the tip names that beat with its verdict", async () => {
      expect(await text(page, "#reeltip")).toBe("3. Why he would not kill — Kept true");
    });

    await viz.when("the mouse leaves the reel", async () => {
      await page.mouse.move(1, 1);
    });
    await viz.then("the hint is back", async () => {
      expect(await text(page, "#reeltip")).toBe(hint);
    });
  });

  it.concurrent("should scroll to the beat when a frame is clicked", async () => {
    const { page, top, before } = await viz.given("the reel with the page at the top", async () => {
      const p = await open();
      const where = async () => {
        const y = await p.evaluate(() =>
          Math.round(document.querySelector("#beat-3")!.getBoundingClientRect().top),
        );
        return y;
      };
      return { page: p, top: where, before: await where() };
    });

    await viz.when("the user clicks the fourth frame", async () => {
      await page.$eval('#reel .frame[data-i="3"]', (f) => {
        if (f instanceof HTMLElement) f.click();
      });
    });

    await viz.then(
      "(once the smooth scroll settles) that beat sits in the middle of the window",
      async () => {
        await page.waitForFunction(
          () => {
            const r = document.querySelector("#beat-3")!.getBoundingClientRect();
            const m = (r.top + r.height / 2) / innerHeight;
            return m > 0.4 && m < 0.6;
          },
          { timeout: 5000 },
        );
        expect(await top()).not.toBe(before);
      },
    );
  });
});

describe("the cliff rescue counter", () => {
  it.concurrent("should show all 75 rescued at once, with eight figures at the foot, when motion is reduced", async () => {
    const page = await viz.given("a visitor who asks for reduced motion", async () => {
      const p = await open();
      await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
      await p.reload();
      await p.waitForSelector("#cliff-num");
      return p;
    });

    await viz.when("the user does nothing more", async () => {
      await Promise.resolve();
    });

    await viz.then("the counter reads 75 and eight rescued figures are drawn", async () => {
      expect(await text(page, "#cliff-num")).toBe("75");
      expect(await page.$$eval("#cliff-rescued g", (g) => g.length)).toBe(8);
    });
  });

  it.concurrent("should count up one rescue per litter descent when motion is allowed", async () => {
    const page = await viz.given("the page with motion allowed", async () => open());

    await viz.when("the first litter reaches the base (2.3 s)", async () => {
      await page.waitForFunction(() => document.querySelector("#cliff-num")!.textContent === "1", {
        timeout: 15_000,
      });
    });

    await viz.then("one figure is drawn at the foot", async () => {
      expect(await page.$$eval("#cliff-rescued g", (g) => g.length)).toBe(1);
    });
  }, 30_000);
});

describe("the artifact gallery", () => {
  it.concurrent("should enlarge a picture with its caption and credit, and close on Escape", async () => {
    const { page, first } = await viz.given("the gallery", async () => {
      const p = await open();
      const firstArt = await p.$eval("#gallery .art", (a) => ({
        cap: a.querySelector(".cap b")!.textContent,
        credit: a.querySelector(".credit")!.textContent,
      }));
      expect(await p.$eval("#lightbox", (l) => l.classList.contains("open"))).toBe(false);
      return { page: p, first: firstArt };
    });

    await viz.when("the user clicks the first picture", async () => {
      await page.$eval("#gallery .art", (a) => {
        if (a instanceof HTMLElement) a.click();
      });
    });
    await viz.then("the lightbox opens with that picture's caption and credit", async () => {
      expect(await page.$eval("#lightbox", (l) => l.classList.contains("open"))).toBe(true);
      expect(await text(page, "#lbCap")).toBe(`${first.cap}${first.credit}`);
      expect(
        await page.$eval(
          "#lbImg",
          (i) => i instanceof HTMLImageElement && i.src.startsWith("data:image"),
        ),
      ).toBe(true);
    });

    await viz.when("the user presses Escape", async () => {
      await page.keyboard.press("Escape");
    });
    await viz.then("it closes and the picture is cleared", async () => {
      expect(await page.$eval("#lightbox", (l) => l.classList.contains("open"))).toBe(false);
    });
  });
});
