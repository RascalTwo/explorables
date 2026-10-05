import type { Page } from "puppeteer-core";

const pause = async (ms: number): Promise<void> => {
  await new Promise<void>((done) => {
    setTimeout(done, ms);
  });
};

/** One link inside #world, as the probe reports it. */
type Link = { scene: string; href: string; pe: string; text: string };

export default async function interactions(page: Page): Promise<void> {
  await pause(3000);
  const info = await page.evaluate(() => {
    const out: Link[] = [];
    for (const a of document.querySelectorAll<HTMLAnchorElement>("#world a[href]")) {
      const scene = a.closest("#cost,#crop,#gallery,#monScene,#docBlock")?.id ?? "?";
      // An icon-only link has textContent "" (not null): that must still fall back to aria-label.
      const own = a.textContent;
      const text = own !== null && own !== "" ? own : (a.getAttribute("aria-label") ?? "");
      out.push({
        scene,
        href: a.href,
        pe: getComputedStyle(a).pointerEvents,
        text: text.slice(0, 28),
      });
    }
    const bad = out.filter((o) => o.pe !== "auto");
    const byScene: Record<string, number> = {};
    for (const o of out) byScene[o.scene] = (byScene[o.scene] ?? 0) + 1;
    return {
      total: out.length,
      byScene,
      notClickable: bad,
      hrefs: [...new Set(out.map((o) => o.href))],
    };
  });
  console.log("BY_SCENE " + JSON.stringify(info.byScene));
  console.log("TOTAL " + info.total + "  NOT_CLICKABLE " + info.notClickable.length);
  console.log("UNIQUE_HREFS " + info.hrefs.length);
  info.hrefs.forEach((h) => {
    console.log("HREF " + h);
  });
}
