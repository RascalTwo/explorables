// KEEP. Two independent state axes (2 universes x 3 TTLs) plus a static figure
// added 2026-08-07. A plain viz verify run sees universe 0 / TTL default only.
import type { Page } from "puppeteer-core";

const pause = async (ms: number): Promise<void> => {
  await new Promise<void>((done) => {
    setTimeout(done, ms);
  });
};

export default async function interactions(
  page: Page,
  { shot }: { shot: (name: string) => Promise<unknown> },
): Promise<void> {
  // The lever-4 detail figure is built by a script block AFTER the chart's own
  // draw(). If that block ever throws, the chart still renders and the page
  // looks fine — the figure is just an empty frame. Assert it filled.
  await page.$eval("#denyfig", (e) => {
    e.scrollIntoView();
  });
  await pause(300);
  await shot("lever4-detail");
  console.log(
    "deny figure:",
    JSON.stringify(
      await page.evaluate(() => {
        const f = document.querySelector<SVGSVGElement>("#denyfig");
        if (!f) throw new Error("#denyfig missing");
        const r = f.getBoundingClientRect();
        return {
          boxes: f.querySelectorAll(".dstep").length, // 4 steps: 1, 2, 3a, 3b... +4
          local: f.querySelectorAll(".dstep.local").length,
          intro: f.querySelectorAll(".dstep.intro").length,
          onCanvas: r.width > 0 && r.height > 0,
          // Any <text> pushed outside the viewBox is invisible with no error.
          overflowing: [...f.querySelectorAll("text")]
            .filter((t) => {
              const b = t.getBBox();
              return b.x < 0 || b.y < 0 || b.x + b.width > 1120 || b.y + b.height > 470;
            })
            .map((t) => (t.textContent ?? "").slice(0, 40)),
        };
      }),
    ),
  );

  // Both universes and the shortest TTL — the figure must not move with either,
  // because the mechanism does not.
  for (const [sel, name] of [
    ["#uni-1", "universe-b"],
    [".ttl", "ttl-first"],
  ] as const) {
    // oxlint-disable-next-line no-await-in-loop -- the two states are visited one after the other, each shot taken in its state
    await page.click(sel);
    // oxlint-disable-next-line no-await-in-loop -- see above
    await pause(350);
    // oxlint-disable-next-line no-await-in-loop -- see above
    await shot(name);
  }
  console.log(
    "figure unchanged across state:",
    JSON.stringify(await page.evaluate(() => document.querySelectorAll("#denyfig .dstep").length)),
  );
}
