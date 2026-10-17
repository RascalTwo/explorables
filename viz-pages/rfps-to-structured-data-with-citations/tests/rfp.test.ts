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
    const page = await viz.given("the page with the panel closed", async () => {
      const p = await open();
      expect(await box(p)).toMatchObject({ hidden: true, expanded: "false" });
      return p;
    });

    await viz.when("the user presses the cog", async () => {
      await page.click("#cog");
    });

    await viz.then("the panel is open and the cog says so", async () => {
      expect(await box(page)).toMatchObject({ hidden: false, expanded: "true" });
    });

    await viz.when("the user presses Escape", async () => {
      await page.keyboard.press("Escape");
    });

    await viz.then("it closes", async () => {
      expect(await box(page)).toMatchObject({ hidden: true, expanded: "false" });
    });

    await viz.when("the user opens it again and clicks the page outside it", async () => {
      await page.click("#cog");
      await page.mouse.click(300, 300);
    });

    await viz.then("it closes again", async () => {
      expect(await box(page)).toMatchObject({ hidden: true, expanded: "false" });
    });
  });

  it.concurrent("should show the boxes the way the URL says: ?motion=off ticks Reduce motion, ?rig=on ticks Live embeds", async () => {
    const off = await viz.given(
      "the page opened with motion off and the live rig off",
      async () => {
        return await open("?motion=off&rig=off");
      },
    );

    await viz.when("the user looks at the settings boxes");

    await viz.then("Reduce motion is ticked and Live embeds is not", async () => {
      expect(await box(off)).toMatchObject({ motion: true, rig: false });
    });

    const on = await viz.when(
      "the page is opened with motion on and the live rig on (its panes point at local services, which the test blocks)",
      async () => {
        return await open("?motion=on&rig=on");
      },
    );

    await viz.then("Reduce motion is not ticked and Live embeds is", async () => {
      expect(await box(on)).toMatchObject({ motion: false, rig: true });
    });
  });

  it.concurrent("should write motion=off when Reduce motion is ticked and motion=on when it is cleared, keeping the scene", async () => {
    const { page, hash0 } = await viz.given(
      "the page with motion on, on its first scene, whose hash it records",
      async () => {
        const p = await open("?motion=on&rig=off");
        const hash = (await where(p)).hash;
        await p.click("#cog");
        return { page: p, hash0: hash };
      },
    );

    await viz.when("the user ticks Reduce motion (the page reloads)", async () => {
      await Promise.all([
        page.waitForNavigation({ waitUntil: "load" }),
        page.click("label:has(#setMotion)"),
      ]);
      await Promise.resolve();
    });

    await viz.then(
      "the URL now says motion=off, still says rig=off, still names the scene, and the box is ticked",
      async () => {
        expect(params(page)).toEqual({ motion: "off", rig: "off" });
        expect(new URL(page.url()).hash).toBe(hash0);
        await checkedIs(page, "#setMotion", true);
      },
    );

    await viz.when("the user clears it again", async () => {
      await page.click("#cog");
      await Promise.all([
        page.waitForNavigation({ waitUntil: "load" }),
        page.click("label:has(#setMotion)"),
      ]);
    });

    await viz.then("the URL says motion=on and the box is clear", async () => {
      expect(params(page)).toEqual({ motion: "on", rig: "off" });
      await checkedIs(page, "#setMotion", false);
    });
  });

  it.concurrent("should write rig=on when Live embeds is ticked and rig=off when it is cleared", async () => {
    const page = await viz.given("the page with the live rig off and motion off", async () => {
      const p = await open("?motion=off&rig=off");
      await p.click("#cog");
      return p;
    });

    await viz.when("the user ticks Live embeds", async () => {
      await Promise.all([
        page.waitForNavigation({ waitUntil: "load" }),
        page.click("label:has(#setRig)"),
      ]);
    });

    await viz.then("the URL says rig=on (motion untouched) and the box is ticked", async () => {
      expect(params(page)).toEqual({ motion: "off", rig: "on" });
      await checkedIs(page, "#setRig", true);
    });

    await viz.when("the user clears it", async () => {
      await page.click("#cog");
      await Promise.all([
        page.waitForNavigation({ waitUntil: "load" }),
        page.click("label:has(#setRig)"),
      ]);
    });

    await viz.then("rig=off and the box is clear", async () => {
      expect(params(page)).toEqual({ motion: "off", rig: "off" });
      await checkedIs(page, "#setRig", false);
    });
  }, 60_000);
});

// ---- navigation: the rail has one button per stop (a scene head plus its beats); Next/Prev, the arrow keys, Home/End and a rail click
// all move the same "current stop". What a reader sees for it: the rail's lit button, "NN/TT" scene count, "beat b / n", and the hash.
describe("moving through the story", () => {
  it.concurrent("should step forward one stop at a time and always agree with the rail's own labels, the whole way through", async () => {
    const { page, first } = await viz.given("the page at its first stop", async () => {
      const p = await open();
      const f = await where(p);
      expect(f).toMatchObject({ j: 0, prevDisabled: true, nextDisabled: false, scene: 1 });
      return { page: p, first: f };
    });

    const steps = await viz.when("the user presses Next at every stop", async () => {
      const seen: {
        j: number;
        w: Awaited<ReturnType<typeof where>>;
        prev: Awaited<ReturnType<typeof where>>;
      }[] = [];
      let prev = first;
      for (let j = 1; j < first.total; j++) {
        // oxlint-disable-next-line no-await-in-loop -- sequential on purpose: each press of Next depends on the stop the previous one reached
        await page.click("#next");
        // oxlint-disable-next-line no-await-in-loop -- sequential on purpose: each press of Next depends on the stop the previous one reached
        await settle(page, j);
        // oxlint-disable-next-line no-await-in-loop -- sequential on purpose: reads the state after that settle
        const w = await where(page);
        seen.push({ j, w, prev });
        prev = w;
      }
      return seen;
    });

    await viz.then(
      'exactly one stop on, and the labels agree with the rail button\'s own title ("<eyebrow> — beat b of n")',
      () => {
        for (const { j, w, prev } of steps) {
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
        }
      },
    );

    await viz.then("the walk reached the last stop", () => {
      expect(steps.at(-1)!.w.j).toBe(first.total - 1);
      expect(page.errors).toEqual([]);
    });
  }, 120_000);

  it.concurrent("should go back one stop with Prev and the left arrow, and not past the start", async () => {
    const page = await viz.given("the page on its fourth stop", async () => {
      const p = await open();
      for (let j = 1; j <= 3; j++) {
        // oxlint-disable-next-line no-await-in-loop -- sequential on purpose: each Next press needs the previous stop reached
        await p.click("#next");
        // oxlint-disable-next-line no-await-in-loop -- sequential on purpose: each Next press needs the previous stop reached
        await settle(p, j);
      }
      return p;
    });

    await viz.when("the user presses Prev, then the left arrow", async () => {
      await page.click("#prev");
      await settle(page, 2);
      await page.keyboard.press("ArrowLeft");
      await settle(page, 1);
    });

    await viz.then("it is on stop 1", async () => {
      expect((await where(page)).j).toBe(1);
    });

    await viz.when("the user goes to the start and presses the left arrow again", async () => {
      await page.keyboard.press("ArrowLeft");
      await settle(page, 0);
      await page.keyboard.press("ArrowLeft");
      await new Promise((r) => {
        setTimeout(r, 300);
      });
    });

    await viz.then("it stays put with Prev disabled", async () => {
      expect(await where(page)).toMatchObject({ j: 0, prevDisabled: true });
    });
  });

  it.concurrent("should move with the right arrow, space, End, Home and a click on the rail", async () => {
    const { page, total } = await viz.given("the page at the start", async () => {
      const p = await open();
      const { total: t } = await where(p);
      return { page: p, total: t };
    });

    await viz.when("the user presses the right arrow, then space", async () => {
      await page.keyboard.press("ArrowRight");
      await settle(page, 1);
      await page.keyboard.press("Space");
      await settle(page, 2);
    });

    await viz.then("it is on stop 2", async () => {
      expect((await where(page)).j).toBe(2);
    });

    await viz.when("the user presses End", async () => {
      await page.keyboard.press("End");
      await settle(page, total - 1);
    });

    await viz.then(
      "it is on the last stop with Next disabled, and the right arrow does nothing more",
      async () => {
        expect(await where(page)).toMatchObject({ j: total - 1, nextDisabled: true });
        await page.keyboard.press("ArrowRight");
        await new Promise((r) => {
          setTimeout(r, 300);
        });
        expect((await where(page)).j).toBe(total - 1);
      },
    );

    await viz.when("the user presses Home", async () => {
      await page.keyboard.press("Home");
      await settle(page, 0);
    });

    await viz.then("it is back at the first", async () => {
      expect((await where(page)).j).toBe(0);
    });

    await viz.when("the user clicks the fifth rail mark (its button is 4)", async () => {
      await page.$eval('#rail button[data-j="4"]', (b) => (b as HTMLElement).click());
    });

    await viz.then("it is on stop 4", async () => {
      await settle(page, 4);
    });
  });

  it.concurrent("should open on the scene named in the link, not on scene one", async () => {
    const { hash, head } = await viz.given(
      "the hash the page itself writes once a reader is on the third scene",
      async () => {
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
        expect(w.hash).not.toBe("");
        return { hash: w.hash, head: w.j };
      },
    );

    const page = await viz.when("somebody opens a link carrying that hash", async () => {
      return await open("?motion=off&rig=off", hash);
    });

    await viz.then(
      "the page opens on that scene's first stop, with the same hash, not on scene one",
      async () => {
        await settle(page, head);
        expect(await where(page)).toMatchObject({ j: head, scene: 3, hash });
      },
    );
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
    const { page, free } = await viz.given("the page in its normal mode", async () => {
      const p = await open();
      const state = async () => {
        const out = await p.evaluate(() => ({
          body: document.body.classList.contains("freelook"),
          badge:
            getComputedStyle(document.querySelector("#freebadge")!).display !== "none" &&
            +getComputedStyle(document.querySelector("#freebadge")!).opacity > 0,
        }));
        return out;
      };
      expect((await state()).body).toBe(false);
      return { page: p, free: state };
    });

    await viz.when("the user presses P", async () => {
      await page.keyboard.press("p");
    });

    await viz.then("free look is on and the badge shows", async () => {
      expect(await free()).toEqual({ body: true, badge: true });
    });

    await viz.when("the user presses Escape", async () => {
      await page.keyboard.press("Escape");
    });

    await viz.then("it is off", async () => {
      expect((await free()).body).toBe(false);
    });
  });

  it.concurrent("should pan the canvas by exactly as far as the pointer is dragged", async () => {
    const { page, before } = await viz.given("free look", async () => {
      const p = await open();
      await p.keyboard.press("p");
      return { page: p, before: await matrix(p) };
    });

    await viz.when("the user drags the pointer 120 px right and 45 px down", async () => {
      await page.mouse.move(600, 400);
      await page.mouse.down();
      await page.mouse.move(720, 445, { steps: 6 });
      await page.mouse.up();
    });

    await viz.then("the canvas moved 120 right and 45 down, at the same zoom", async () => {
      const after = await matrix(page);
      expect(after.a).toBeCloseTo(before.a, 6);
      expect(after.e - before.e).toBeCloseTo(120, 0);
      expect(after.f - before.f).toBeCloseTo(45, 0);
    });
  });

  it.concurrent("should zoom about the cursor, keeping the world point under it fixed, and zoom out on the opposite wheel", async () => {
    const { page, before, p0 } = await viz.given(
      "free look, with the world point under (500,300) noted",
      async () => {
        const p = await open();
        await p.keyboard.press("p");
        const m = await matrix(p);
        const w0 = await worldAt(p, 500, 300);
        return { page: p, before: m, p0: w0 };
      },
    );

    await viz.when(
      "the user scrolls the wheel up (zoom in) with the cursor at (500,300)",
      async () => {
        await page.mouse.move(500, 300);
        await page.mouse.wheel({ deltaY: -400 });
        await page.waitForFunction(
          (a) => new DOMMatrix(getComputedStyle(document.querySelector("#world")!).transform).a > a,
          {},
          before.a,
        );
      },
    );

    const zoomed = await viz.then(
      "the zoom grew and the same world point is still under the cursor",
      async () => {
        const z = await matrix(page);
        expect(z.a / before.a).toBeCloseTo(Math.exp(0.0015 * 400), 2);
        const p1 = await worldAt(page, 500, 300);
        expect(p1.x).toBeCloseTo(p0.x, 0);
        expect(p1.y).toBeCloseTo(p0.y, 0);
        return z;
      },
    );

    await viz.when("the user scrolls the other way by the same amount", async () => {
      await page.mouse.wheel({ deltaY: 400 });
      await page.waitForFunction(
        (a) => new DOMMatrix(getComputedStyle(document.querySelector("#world")!).transform).a < a,
        {},
        zoomed.a,
      );
    });

    await viz.then("it is back at the first zoom", async () => {
      expect((await matrix(page)).a).toBeCloseTo(before.a, 4);
    });
  });
});

describe("the page as a whole", () => {
  it.concurrent("should load with no page errors and the counters filled in", async () => {
    const page = await viz.given("the page opened", async () => {
      return await open();
    });

    await viz.when("the page has finished loading");

    await viz.then(
      "no script threw, the scene counter reads 01/NN and the title bar names the first scene",
      async () => {
        expect(page.errors).toEqual([]);
        expect(await text(page, "#stepcount")).toMatch(/^01\s?\/\s?\d\d$/u);
        expect((await text(page, "#topbar")).length).toBeGreaterThan(10);
      },
    );
  });
});
