// Shared by the RFP explorable's tests. The page has no backend. Its live panes point at localhost services (a citation
// viewer, a CRM, a tracing UI) that a test must never call, and its fonts come from a CDN: `open()` aborts every
// cross-origin request, so nothing here touches the network or a local service.
import type { Page } from "puppeteer-core";

declare global {
  var viz: {
    open(
      hash?: string | object,
      o?: { width?: number; height?: number; before?: (p: Page) => unknown },
    ): Promise<Page & { errors: string[] }>;
  };
}
export type P = Page & { errors: string[] };

const BASE = new URL(process.env.VIZ_URL!.replace(/#.*$/u, ""));

/** Open the page with a query string (`?motion=off&rig=off`) and optional hash, both settings the page reads. */
export async function open(search = "?motion=off&rig=off", hash = ""): Promise<P> {
  const page = await viz.open(undefined, {
    before: async (p) => {
      await p.evaluateOnNewDocument(() =>
        addEventListener("DOMContentLoaded", () =>
          document.head.append(
            Object.assign(document.createElement("style"), {
              textContent:
                "#viz-feedback { display: none !important; } html { scroll-behavior: auto !important; }",
            }),
          ),
        ),
      );
      await p.setRequestInterception(true);
      p.on("request", (req) => {
        if (req.isInterceptResolutionHandled()) return;
        // a failure here (page closed mid-request) is harmless to the test, so it is swallowed
        const done =
          new URL(req.url()).origin !== BASE.origin ? req.abort("blockedbyclient") : req.continue();
        done.catch(() => null);
      });
    },
  });
  await page.goto(`${BASE.origin}${BASE.pathname}${search}${hash}`, { waitUntil: "load" });
  await ready(page);
  return page;
}

/** The camera, rail and narration exist once the page has measured itself. */
export const ready = async (page: Page): Promise<unknown> => {
  const done = await page.waitForFunction(
    () =>
      document.querySelectorAll("#rail button").length > 10 &&
      (document.querySelector("#stepcount")?.textContent ?? "").length > 0,
    { timeout: 30_000 },
  );
  return done;
};

export const text = async (page: Page, sel: string): Promise<string> => {
  const out = await page.$eval(sel, (e) => (e.textContent ?? "").replaceAll(/\s+/gu, " ").trim());
  return out;
};

/** Where the rail says we are: the active stop, its beat label and scene count, the hash, and the button states. */
export interface Where {
  j: number;
  total: number;
  stepcount: string;
  beatcount: string;
  hash: string;
  prevDisabled: boolean;
  nextDisabled: boolean;
  title: string;
  scene: number;
  scenes: number;
}
export const where = async (page: Page): Promise<Where> => {
  const out = await page.evaluate(() => {
    const disabled = (sel: string) => document.querySelector<HTMLButtonElement>(sel)!.disabled;
    const btns = [...document.querySelectorAll<HTMLElement>("#rail button")];
    const j = btns.findIndex((b) => b.classList.contains("act"));
    return {
      j,
      total: btns.length,
      stepcount: document.querySelector("#stepcount")!.textContent.replaceAll(/\s+/gu, ""),
      beatcount: document.querySelector("#beatcount")!.textContent,
      hash: location.hash,
      prevDisabled: disabled("#prev"),
      nextDisabled: disabled("#next"),
      title: btns[j]?.title ?? "",
      scene: btns.slice(0, j + 1).filter((b) => b.classList.contains("head")).length,
      scenes: btns.filter((b) => b.classList.contains("head")).length,
    };
  });
  return out;
};

/** Wait for the rail to settle on stop j (a key press or click scrolls there, then the page re-applies on the next frame). */
export const settle = async (page: Page, j: number): Promise<unknown> => {
  const done = await page
    .waitForFunction(
      (n) =>
        [...document.querySelectorAll("#rail button")].findIndex((b) =>
          b.classList.contains("act"),
        ) === n,
      { timeout: 10_000 },
      j,
    )
    .catch(async (e: unknown) => {
      throw new Error(
        `rail never reached stop ${j}; it is on ${(await where(page)).j} (${e instanceof Error ? e.message : String(e)})`,
      );
    });
  return done;
};
