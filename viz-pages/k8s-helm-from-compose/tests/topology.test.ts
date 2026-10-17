import { describe, it, expect } from "bun:test";
import { open, text, until, type P } from "./helpers.ts";

// The topology starts with 3 healthy pods. Kill / scale / reset change it; a request travels to a live pod.
// Math.random picks which pod dies and which pod a request lands on, so a test pins it (random: 0 → the first).

const pods = async (page: P) => {
  const found = await page.$$eval("#topoSvg .node-hit[data-idx]", (g) =>
    g.map((n) => ({
      dead: n.textContent.includes("✕"),
      text: n.textContent.replaceAll(/\s+/gu, " ").trim(),
    })),
  );
  return found;
};
const deploymentLabel = async (page: P) => {
  const label = await page.$$eval("#topoSvg .node-hit", (g) =>
    g
      .map((n) => n.textContent)
      .find((t) => t.includes("desired replicas"))!
      .replaceAll(/\s+/gu, " ")
      .trim(),
  );
  return label;
};

declare global {
  // Set by the page-side tick below, read back from the test.
  interface Window {
    __ends: { x: number; y: number }[];
    __max: number;
  }
}

describe("the topology", () => {
  it.concurrent("should start with three healthy pods and the deployment asking for three", async () => {
    const page = await viz.given("the page freshly opened", async () => {
      const p = await open();
      return p;
    });

    await viz.when("the visitor does nothing more");

    await viz.then("three live pods are drawn and the Deployment wants 3", async () => {
      expect((await pods(page)).map((p) => p.dead)).toEqual([false, false, false]);
      expect(await deploymentLabel(page)).toContain("desired replicas = 3");
      expect(await text(page, "#btnScale")).toBe("＋ Scale to 4 replicas");
      expect(page.errors).toEqual([]);
    });
  });

  it.concurrent("should add a fourth pod on scale, and take it away on the second press", async () => {
    const page = await viz.given("the defaults", async () => {
      const p = await open();
      return p;
    });

    await viz.when("the user scales to 4", async () => {
      await page.click("#btnScale");
    });

    await viz.then(
      "four pods, the Deployment wants 4, and the button offers to go back",
      async () => {
        expect(await pods(page)).toHaveLength(4);
        expect(await deploymentLabel(page)).toContain("desired replicas = 4");
        expect(await text(page, "#btnScale")).toBe("－ Scale to 3 replicas");
      },
    );

    await viz.when("pressed again", async () => {
      await page.click("#btnScale");
    });

    await viz.then("back to three", async () => {
      expect(await pods(page)).toHaveLength(3);
      expect(await text(page, "#btnScale")).toBe("＋ Scale to 4 replicas");
    });
  });

  it.concurrent("should show one pod dead when killed, drop its arrow, then heal by itself", async () => {
    const { page, arrows, before } = await viz.given(
      "the defaults, and a kill that takes the first pod",
      async () => {
        const p = await open({ random: 0 });
        const count = async () => {
          const n = await p.$$eval("#topoSvg line", (l) => l.length);
          return n;
        };
        const arrowsBefore = await count();
        return { page: p, arrows: count, before: arrowsBefore };
      },
    );

    await viz.when("a pod is killed", async () => {
      await page.click("#btnKill");
    });

    await viz.then(
      "only the first pod is dead, it says it is restarting, and the Service lost the arrow to it",
      async () => {
        expect((await pods(page)).map((p) => p.dead)).toEqual([true, false, false]);
        expect((await pods(page))[0]!.text).toContain("restarting…");
        expect(await arrows()).toBe(before - 1);
      },
    );

    await viz.when("the Deployment replaces it without any action", async () => {
      await until(
        page,
        () =>
          document.querySelectorAll("#topoSvg .node-hit[data-idx]").length === 3 &&
          ![...document.querySelectorAll("#topoSvg .node-hit")].some((n) =>
            n.textContent.includes("✕"),
          ),
      );
    });

    await viz.then("three healthy pods are back and the arrow is restored", async () => {
      expect((await pods(page)).map((p) => p.dead)).toEqual([false, false, false]);
      expect(await arrows()).toBe(before);
    });
  });

  it.concurrent("should restore three healthy pods and the scale button on reset", async () => {
    const page = await viz.given("four pods, one killed", async () => {
      const p = await open({ random: 0 });
      await p.click("#btnScale");
      await p.click("#btnKill");
      expect((await pods(p)).some((x) => x.dead)).toBe(true);
      return p;
    });

    await viz.when("the user presses reset", async () => {
      await page.click("#btnReset");
    });

    await viz.then("three healthy pods and the original button label", async () => {
      expect((await pods(page)).map((p) => p.dead)).toEqual([false, false, false]);
      expect(await text(page, "#btnScale")).toBe("＋ Scale to 4 replicas");
    });
  });

  it.concurrent("should explain an object in the inspector when it is clicked", async () => {
    const { page, click, nodeWith } = await viz.given("the topology", async () => {
      const p = await open({ random: 0 });
      expect(await text(p, "#inspect h4")).toBe("Click any object");
      const clickNode = async (i: number) => (await p.$$("#topoSvg .node-hit"))[i]!.click();
      const find = async (label: string) => {
        const i = await p.$$eval(
          "#topoSvg .node-hit",
          (g, l) => g.findIndex((n) => n.textContent.includes(l)),
          label,
        );
        return i;
      };
      return { page: p, click: clickNode, nodeWith: find };
    });

    await viz.when("the Ingress is clicked", async () => {
      await click(await nodeWith("Ingress"));
    });

    await viz.then("the inspector describes it, with its Compose analog", async () => {
      await until(
        page,
        () => document.querySelector("#inspect h4")!.textContent === "L7 HTTP router",
      );
      expect(await text(page, "#inspect .kind")).toBe("Ingress");
      expect(await text(page, "#inspect .analog")).toContain("Compose analog");
    });

    await viz.when("a pod is killed and the dead pod clicked", async () => {
      await page.click("#btnKill");
      await click(await nodeWith("Pod ✕"));
    });

    await viz.then("the inspector describes a terminating pod", async () => {
      await until(
        page,
        () => document.querySelector("#inspect .kind")!.textContent === "Pod (terminating)",
      );
    });
  });

  it.concurrent("should send requests as dots that travel to a live pod and vanish", async () => {
    const page = await viz.given(
      "the defaults, with the first pod killed so a request must go elsewhere",
      async () => {
        const p = await open({ random: 0 });
        await p.click("#btnKill");
        await p.evaluate(() => {
          window.__ends = [];
          window.__max = 0;
          const svg = document.querySelector("#topoSvg")!;
          const tick = () => {
            const dots = [...svg.querySelectorAll("circle")].filter(
              (c) => c.getAttribute("r") === "7",
            );
            window.__max = Math.max(window.__max, dots.length);
            for (const d of dots)
              window.__ends.push({ x: +d.getAttribute("cx")!, y: +d.getAttribute("cy")! });
            requestAnimationFrame(tick);
          };
          tick();
        });
        return p;
      },
    );

    await viz.when("the user sends a request", async () => {
      await page.click("#btnTraffic");
    });

    await viz.then(
      "up to three dots fly, all end at the top of the second pod (dead first pod skipped), then all are gone",
      async () => {
        await until(page, () => window.__max === 3 || window.__max > 0);
        await until(
          page,
          () =>
            [...document.querySelectorAll("#topoSvg circle")].filter(
              (c) => c.getAttribute("r") === "7",
            ).length === 0 && window.__max >= 1,
        );
        const { ends, max } = await page.evaluate(() => ({
          ends: window.__ends,
          max: window.__max,
        }));
        expect(max).toBeGreaterThanOrEqual(1);
        const deepest = ends.filter((e) => e.y > 300);
        expect(deepest.length).toBeGreaterThan(0);
        // pod 2's top-centre is x = 210 + 1*(120+6) + 54 = 390; the dead pod 1's would be 264
        for (const e of deepest) expect(Math.abs(e.x - 390)).toBeLessThan(40);
        expect(deepest.every((e) => Math.abs(e.x - 264) > 40)).toBe(true);
      },
    );
  });
});

describe("the compose-to-kubernetes mapping", () => {
  it.concurrent("should highlight both halves of a row the pointer is over", async () => {
    const page = await viz.given("the mapping table, nothing lit", async () => {
      const p = await open();
      expect(await p.$$eval("#mapGrid .row.h", (r) => r.length)).toBe(0);
      return p;
    });

    await viz.when('the pointer moves over the "ports" row on the left', async () => {
      const idx = await page.$$eval("#mapLeft .row", (r) =>
        r.findIndex((x) => x.textContent.includes("ports:")),
      );
      await (await page.$$("#mapLeft .row"))[idx]!.hover();
    });

    await viz.then(
      "that row and its Kubernetes counterpart (the Service), and only those, are lit",
      async () => {
        await until(page, () => document.querySelectorAll("#mapGrid .row.h").length === 2);
        const left = await page.$$eval("#mapLeft .row.h", (r) => r.map((x) => x.textContent));
        expect(left).toHaveLength(1);
        expect(left[0]).toContain("ports:");
        const right = await page.$$eval("#mapRight .row.h", (r) => r.map((x) => x.textContent));
        expect(right).toHaveLength(1);
        expect(right[0]).toContain("Service — stable virtual IP");
      },
    );
  });
});
