import { describe, it, expect } from "bun:test";
import { open, where, settle, text, type P } from "./helpers.ts";

/** The settings boxes are filled in by the page's module, which can still be starting at the load event: wait for the state we expect, so a wrong state fails here rather than reading too early. */
const checkedIs = async (page: P, sel: string, want: boolean): Promise<void> => {
  await page.waitForFunction(
    (q: string, v: boolean) => document.querySelector<HTMLInputElement>(q)?.checked === v,
    { timeout: 5000 },
    sel,
    want,
  );
};

// ---- the settings cog: two checkboxes that write ?motion= and ?rig= and reload. The wiring is INVERTED for motion on purpose
// (the URL param says "is motion on?", the box says "reduce it?") and the page's own comment records that getting it wrong made
// ticking "Reduce motion" turn animation ON, which still visibly did something, so it hid. Hence these tests.
describe("the settings cog", () => {
  const box = async (page: P) => {
    const out = await page.evaluate(() => ({
      hidden: document.querySelector<HTMLElement>("#settings")!.hidden,
      expanded: document.querySelector("#cog")!.getAttribute("aria-expanded"),
      motion: document.querySelector<HTMLInputElement>("#setMotion")!.checked,
      rig: document.querySelector<HTMLInputElement>("#setRig")!.checked,
    }));
    return out;
  };
  const params = (page: P) => Object.fromEntries(new URL(page.url()).searchParams);

  it.concurrent("should open and close the panel from the cog, Escape and a click elsewhere", async () => {
    // GIVEN the page with the panel closed
    const page = await open();
    expect(await box(page)).toMatchObject({ hidden: true, expanded: "false" });

    // WHEN the user presses the cog
    await page.click("#cog");
    // THEN the panel is open and the cog says so
    expect(await box(page)).toMatchObject({ hidden: false, expanded: "true" });

    // WHEN the user presses Escape
    await page.keyboard.press("Escape");
    // THEN it closes
    expect(await box(page)).toMatchObject({ hidden: true, expanded: "false" });

    // WHEN the user opens it again and clicks the page outside it
    await page.click("#cog");
    await page.mouse.click(300, 300);
    // THEN it closes again
    expect(await box(page)).toMatchObject({ hidden: true, expanded: "false" });
  });

  it.concurrent("should show the boxes the way the URL says: ?motion=off ticks Reduce motion, ?rig=on ticks Live embeds", async () => {
    // GIVEN the page opened with motion off and the live rig off
    const off = await open("?motion=off&rig=off");
    // THEN Reduce motion is ticked and Live embeds is not
    expect(await box(off)).toMatchObject({ motion: true, rig: false });

    // GIVEN the page opened with motion on and the live rig on (its panes point at local services, which the test blocks)
    const on = await open("?motion=on&rig=on");
    // THEN Reduce motion is not ticked and Live embeds is
    expect(await box(on)).toMatchObject({ motion: false, rig: true });
  });

  it.concurrent("should write motion=off when Reduce motion is ticked and motion=on when it is cleared, keeping the scene", async () => {
    // GIVEN the page with motion on, on its first scene, whose hash it records
    const page = await open("?motion=on&rig=off");
    const hash0 = (await where(page)).hash;
    await page.click("#cog");

    // WHEN the user ticks Reduce motion (the page reloads)
    await Promise.all([
      page.waitForNavigation({ waitUntil: "load" }),
      page.click("label:has(#setMotion)"),
    ]);
    await Promise.resolve();
    // THEN the URL now says motion=off, still says rig=off, still names the scene, and the box is ticked
    expect(params(page)).toEqual({ motion: "off", rig: "off" });
    expect(new URL(page.url()).hash).toBe(hash0);
    await checkedIs(page, "#setMotion", true);

    // WHEN the user clears it again
    await page.click("#cog");
    await Promise.all([
      page.waitForNavigation({ waitUntil: "load" }),
      page.click("label:has(#setMotion)"),
    ]);
    // THEN the URL says motion=on and the box is clear
    expect(params(page)).toEqual({ motion: "on", rig: "off" });
    await checkedIs(page, "#setMotion", false);
  });

  it.concurrent("should write rig=on when Live embeds is ticked and rig=off when it is cleared", async () => {
    // GIVEN the page with the live rig off and motion off
    const page = await open("?motion=off&rig=off");
    await page.click("#cog");

    // WHEN the user ticks Live embeds
    await Promise.all([
      page.waitForNavigation({ waitUntil: "load" }),
      page.click("label:has(#setRig)"),
    ]);
    // THEN the URL says rig=on (motion untouched) and the box is ticked
    expect(params(page)).toEqual({ motion: "off", rig: "on" });
    await checkedIs(page, "#setRig", true);

    // WHEN the user clears it
    await page.click("#cog");
    await Promise.all([
      page.waitForNavigation({ waitUntil: "load" }),
      page.click("label:has(#setRig)"),
    ]);
    // THEN rig=off and the box is clear
    expect(params(page)).toEqual({ motion: "off", rig: "off" });
    await checkedIs(page, "#setRig", false);
  }, 60_000);
});

// ---- navigation: the rail has one button per stop (a scene head plus its beats); Next/Prev, the arrow keys, Home/End and a rail click
// all move the same "current stop". What a reader sees for it: the rail's lit button, "NN/TT" scene count, "beat b / n", and the hash.
describe("moving through the story", () => {
  it.concurrent("should step forward one stop at a time and always agree with the rail's own labels, the whole way through", async () => {
    // GIVEN the page at its first stop
    const page = await open();
    const first = await where(page);
    expect(first).toMatchObject({ j: 0, prevDisabled: true, nextDisabled: false, scene: 1 });

    let prev = first;
    for (let j = 1; j < first.total; j++) {
      // WHEN the user presses Next
      // oxlint-disable-next-line no-await-in-loop -- sequential on purpose: each press of Next depends on the stop the previous one reached
      await page.click("#next");
      // oxlint-disable-next-line no-await-in-loop -- sequential on purpose: each press of Next depends on the stop the previous one reached
      await settle(page, j);
      // oxlint-disable-next-line no-await-in-loop -- sequential on purpose: reads the state after that settle
      const w = await where(page);

      // THEN exactly one stop on, and the labels agree with the rail button's own title ("<eyebrow> — beat b of n")
      const m = w.title.match(/beat (\d+) of (\d+)$/u)!;
      const [b, n] = [+m[1]!, +m[2]!];
      expect(w.beatcount, `stop ${j}`).toBe(n > 1 ? `beat ${b} / ${n}` : "");
      // AND the scene count is the number of scene heads up to here, out of all of them, zero-padded
      expect(w.stepcount, `stop ${j}`).toBe(
        `${String(w.scene).padStart(2, "0")}/${String(w.scenes).padStart(2, "0")}`,
      );
      // AND the hash changes when the scene changes and only then
      if (b === 1) expect(w.hash, `stop ${j}`).not.toBe(prev.hash);
      else expect(w.hash, `stop ${j}`).toBe(prev.hash);
      // AND Prev is on now, Next is off only at the last stop
      expect(w.prevDisabled).toBe(false);
      expect(w.nextDisabled).toBe(j === w.total - 1);
      prev = w;
    }
    // THEN the walk reached the last stop
    expect(prev.j).toBe(first.total - 1);
    expect(page.errors).toEqual([]);
  }, 120_000);

  it.concurrent("should go back one stop with Prev and the left arrow, and not past the start", async () => {
    // GIVEN the page on its fourth stop
    const page = await open();
    for (let j = 1; j <= 3; j++) {
      // oxlint-disable-next-line no-await-in-loop -- sequential on purpose: each Next press needs the previous stop reached
      await page.click("#next");
      // oxlint-disable-next-line no-await-in-loop -- sequential on purpose: each Next press needs the previous stop reached
      await settle(page, j);
    }

    // WHEN the user presses Prev, then the left arrow
    await page.click("#prev");
    await settle(page, 2);
    await page.keyboard.press("ArrowLeft");
    await settle(page, 1);
    // THEN it is on stop 1
    expect((await where(page)).j).toBe(1);

    // WHEN the user goes to the start and presses the left arrow again
    await page.keyboard.press("ArrowLeft");
    await settle(page, 0);
    await page.keyboard.press("ArrowLeft");
    await new Promise((r) => {
      setTimeout(r, 300);
    });
    // THEN it stays put with Prev disabled
    expect(await where(page)).toMatchObject({ j: 0, prevDisabled: true });
  });

  it.concurrent("should move with the right arrow, space, End, Home and a click on the rail", async () => {
    // GIVEN the page at the start
    const page = await open();
    const { total } = await where(page);

    // WHEN the user presses the right arrow, then space
    await page.keyboard.press("ArrowRight");
    await settle(page, 1);
    await page.keyboard.press("Space");
    await settle(page, 2);
    // THEN it is on stop 2
    expect((await where(page)).j).toBe(2);

    // WHEN the user presses End
    await page.keyboard.press("End");
    await settle(page, total - 1);
    // THEN it is on the last stop with Next disabled, and the right arrow does nothing more
    expect(await where(page)).toMatchObject({ j: total - 1, nextDisabled: true });
    await page.keyboard.press("ArrowRight");
    await new Promise((r) => {
      setTimeout(r, 300);
    });
    expect((await where(page)).j).toBe(total - 1);

    // WHEN the user presses Home
    await page.keyboard.press("Home");
    await settle(page, 0);
    // THEN it is back at the first
    expect((await where(page)).j).toBe(0);

    // WHEN the user clicks the fifth rail mark (its button is 4)
    await page.$eval('#rail button[data-j="4"]', (b) => (b as HTMLElement).click());
    // THEN it is on stop 4
    await settle(page, 4);
  });

  it.concurrent("should open on the scene named in the link, not on scene one", async () => {
    // GIVEN the hash the page itself writes once a reader is on the third scene
    const walk = await open();
    let w = await where(walk);
    for (let j = 1; w.scene < 3 || w.title.match(/beat (\d+) of/u)![1] !== "1"; j++) {
      // oxlint-disable-next-line no-await-in-loop -- sequential on purpose: walks Next until the page reports scene 3
      await walk.click("#next");
      // oxlint-disable-next-line no-await-in-loop -- sequential on purpose: walks Next until the page reports scene 3
      await settle(walk, j);
      // oxlint-disable-next-line no-await-in-loop -- sequential on purpose: walks Next until the page reports scene 3
      w = await where(walk);
    }
    const { hash, j: head } = w;
    expect(hash).not.toBe("");

    // WHEN somebody opens a link carrying that hash
    const page = await open("?motion=off&rig=off", hash);

    // THEN the page opens on that scene's first stop, with the same hash, not on scene one
    await settle(page, head);
    expect(await where(page)).toMatchObject({ j: head, scene: 3, hash });
  }, 60_000);
});

// ---- free look: drag pans the whole canvas by exactly the pointer's movement, and the wheel zooms about the cursor so the world point
// under it stays under it. Both are checked on #world's own transform matrix.
describe("free look", () => {
  const matrix = async (page: P) => {
    const out = await page.$eval("#world", (w) => {
      const m = new DOMMatrix(getComputedStyle(w).transform);
      return { a: m.a, e: m.e, f: m.f };
    });
    return out;
  };
  /** The world coordinate under a screen point, from the current transform. */
  const worldAt = async (page: P, x: number, y: number) => {
    const out = await page.$eval(
      "#world",
      (w, sx, sy) => {
        const p = new DOMMatrix(getComputedStyle(w).transform)
          .inverse()
          .transformPoint({ x: sx, y: sy });
        return { x: p.x, y: p.y };
      },
      x,
      y,
    );
    return out;
  };

  it.concurrent("should enter on P, show the badge, and leave on Escape", async () => {
    // GIVEN the page in its normal mode
    const page = await open();
    const free = async () => {
      const out = await page.evaluate(() => ({
        body: document.body.classList.contains("freelook"),
        badge:
          getComputedStyle(document.querySelector("#freebadge")!).display !== "none" &&
          +getComputedStyle(document.querySelector("#freebadge")!).opacity > 0,
      }));
      return out;
    };
    expect((await free()).body).toBe(false);

    // WHEN the user presses P
    await page.keyboard.press("p");
    // THEN free look is on and the badge shows
    expect(await free()).toEqual({ body: true, badge: true });
    // WHEN the user presses Escape
    await page.keyboard.press("Escape");
    // THEN it is off
    expect((await free()).body).toBe(false);
  });

  it.concurrent("should pan the canvas by exactly as far as the pointer is dragged", async () => {
    // GIVEN free look
    const page = await open();
    await page.keyboard.press("p");
    const before = await matrix(page);

    // WHEN the user drags the pointer 120 px right and 45 px down
    await page.mouse.move(600, 400);
    await page.mouse.down();
    await page.mouse.move(720, 445, { steps: 6 });
    await page.mouse.up();

    // THEN the canvas moved 120 right and 45 down, at the same zoom
    const after = await matrix(page);
    expect(after.a).toBeCloseTo(before.a, 6);
    expect(after.e - before.e).toBeCloseTo(120, 0);
    expect(after.f - before.f).toBeCloseTo(45, 0);
  });

  it.concurrent("should zoom about the cursor, keeping the world point under it fixed, and zoom out on the opposite wheel", async () => {
    // GIVEN free look, with the world point under (500,300) noted
    const page = await open();
    await page.keyboard.press("p");
    const before = await matrix(page);
    const p0 = await worldAt(page, 500, 300);

    // WHEN the user scrolls the wheel up (zoom in) with the cursor at (500,300)
    await page.mouse.move(500, 300);
    await page.mouse.wheel({ deltaY: -400 });
    await page.waitForFunction(
      (a) => new DOMMatrix(getComputedStyle(document.querySelector("#world")!).transform).a > a,
      {},
      before.a,
    );

    // THEN the zoom grew and the same world point is still under the cursor
    const zoomed = await matrix(page);
    expect(zoomed.a / before.a).toBeCloseTo(Math.exp(0.0015 * 400), 2);
    const p1 = await worldAt(page, 500, 300);
    expect(p1.x).toBeCloseTo(p0.x, 0);
    expect(p1.y).toBeCloseTo(p0.y, 0);

    // WHEN the user scrolls the other way by the same amount
    await page.mouse.wheel({ deltaY: 400 });
    await page.waitForFunction(
      (a) => new DOMMatrix(getComputedStyle(document.querySelector("#world")!).transform).a < a,
      {},
      zoomed.a,
    );
    // THEN it is back at the first zoom
    expect((await matrix(page)).a).toBeCloseTo(before.a, 4);
  });
});

describe("the page as a whole", () => {
  it.concurrent("should load with no page errors and the counters filled in", async () => {
    // GIVEN the page opened
    const page = await open();
    // THEN no script threw, the scene counter reads 01/NN and the title bar names the first scene
    expect(page.errors).toEqual([]);
    expect(await text(page, "#stepcount")).toMatch(/^01\s?\/\s?\d\d$/u);
    expect((await text(page, "#topbar")).length).toBeGreaterThan(10);
  });
});
