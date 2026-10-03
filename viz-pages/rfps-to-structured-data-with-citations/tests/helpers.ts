// Shared by the RFP explorable's tests. The page has no backend. Its live panes point at localhost services (a citation
// viewer, a CRM, a tracing UI) that a test must never call, and its fonts come from a CDN: `open()` aborts every
// cross-origin request, so nothing here touches the network or a local service.
import type { Page } from "puppeteer-core";

declare global {
  // eslint-disable-next-line no-var
  var viz: {
    open(hash?: string | object, o?: { width?: number; height?: number; before?: (p: Page) => unknown }): Promise<Page & { errors: string[] }>;
  };
}
export type P = Page & { errors: string[] };

const BASE = new URL(process.env.VIZ_URL!.replace(/#.*$/, ""));

/** Open the page with a query string (`?motion=off&rig=off`) and optional hash, both settings the page reads. */
export async function open(search = "?motion=off&rig=off", hash = ""): Promise<P> {
  const page = await viz.open(undefined, {
    before: async (p) => {
      await p.evaluateOnNewDocument(() => addEventListener("DOMContentLoaded", () =>
        document.head.append(Object.assign(document.createElement("style"), { textContent: "#viz-feedback { display: none !important; } html { scroll-behavior: auto !important; }" }))));
      await p.setRequestInterception(true);
      p.on("request", (req) => {
        if (req.isInterceptResolutionHandled()) return;
        if (new URL(req.url()).origin !== BASE.origin) return void req.abort("blockedbyclient");
        return void req.continue();
      });
    },
  });
  await page.goto(`${BASE.origin}${BASE.pathname}${search}${hash}`, { waitUntil: "load" });
  await ready(page);
  return page;
}

/** The camera, rail and narration exist once the page has measured itself. */
export const ready = (page: Page) =>
  page.waitForFunction(() => document.querySelectorAll("#rail button").length > 10 && (document.querySelector("#stepcount")?.textContent ?? "").length > 0, { timeout: 30_000 });

export const text = (page: Page, sel: string) => page.$eval(sel, (e) => (e.textContent ?? "").replace(/\s+/g, " ").trim());

/** Where the rail says we are: the active stop, its beat label and scene count, the hash, and the button states. */
export const where = (page: Page) => page.evaluate(() => {
  const btns = [...document.querySelectorAll<HTMLElement>("#rail button")];
  const j = btns.findIndex((b) => b.classList.contains("act"));
  return {
    j,
    total: btns.length,
    stepcount: document.querySelector("#stepcount")!.textContent!.replace(/\s+/g, ""),
    beatcount: document.querySelector("#beatcount")!.textContent!,
    hash: location.hash,
    prevDisabled: (document.querySelector("#prev") as HTMLButtonElement).disabled,
    nextDisabled: (document.querySelector("#next") as HTMLButtonElement).disabled,
    title: btns[j]?.title ?? "",
    scene: btns.slice(0, j + 1).filter((b) => b.classList.contains("head")).length,
    scenes: btns.filter((b) => b.classList.contains("head")).length,
  };
});

/** Wait for the rail to settle on stop j (a key press or click scrolls there, then the page re-applies on the next frame). */
export const settle = (page: Page, j: number) =>
  page.waitForFunction((n) => [...document.querySelectorAll("#rail button")].findIndex((b) => b.classList.contains("act")) === n, { timeout: 10_000 }, j)
    .catch(async (e) => { throw new Error(`rail never reached stop ${j}; it is on ${(await where(page)).j} (${e.message})`); });
