// Shared by the Euro Step tests. The page has no backend; its only outside request is the 3D tab's `three` import from
// esm.sh (an importmap entry), which a test must never send: `open()` answers it with the REAL three 0.160.0, built
// locally from the skill's node_modules, and aborts every other cross-origin request.
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
const SKILL = "/Users/jmilliken/Desktop/Desktop/Code/ai-setup/skills/viz";

const built: Record<string, Promise<string>> = {};
const compile = async (entry: string, external: string[]): Promise<string> => {
  const r = await Bun.build({
    entrypoints: [Bun.resolveSync(entry, SKILL)],
    format: "esm",
    target: "browser",
    external,
  });
  return r.outputs[0]!.text();
};
const bundle = async (key: string, entry: string, external: string[] = []): Promise<string> => {
  const src = await (built[key] ??= compile(entry, external));
  return src;
};
// A request answered after the page has closed has nothing left to answer.
const swallow = (): void => {
  /* page closed under the request */
};

export async function open(): Promise<P> {
  const page = await viz.open(undefined, {
    before: async (p) => {
      // The dev server's feedback pill floats over the page; smooth scrolling moves a target under a click.
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
        const u = new URL(req.url());
        const cdn = async (body: Promise<string>): Promise<void> => {
          await req.respond({
            status: 200,
            contentType: "text/javascript",
            headers: { "access-control-allow-origin": "*" },
            body: await body,
          });
        };
        let answer: Promise<void>;
        if (u.hostname === "esm.sh" && u.pathname === "/three@0.160.0")
          answer = cdn(bundle("three", "three"));
        else if (
          u.hostname === "esm.sh" &&
          u.pathname === "/three@0.160.0/examples/jsm/controls/OrbitControls.js"
        )
          answer = cdn(bundle("orbit", "three/examples/jsm/controls/OrbitControls.js", ["three"]));
        else if (u.origin !== BASE.origin) answer = req.abort("blockedbyclient");
        else answer = req.continue();
        answer.catch(swallow);
      });
    },
  });
  return page;
}

export const text = async (page: Page, sel: string): Promise<string> => {
  const t = await page.$eval(sel, (e) => (e.textContent ?? "").replaceAll(/\s+/gu, " ").trim());
  return t;
};

export async function tab(page: Page, id: string): Promise<void> {
  await page.click(`#tabs button[data-tab="${id}"]`);
  await page.waitForFunction(
    (i) => document.querySelector(`#tab-${i}`)!.classList.contains("active"),
    {},
    id,
  );
}

/** Drag a range input to a value and fire the input event a drag fires. */
export const setRange = async (page: Page, sel: string, v: number): Promise<void> => {
  await page.$eval(
    sel,
    (el, val) => {
      if (el instanceof HTMLInputElement) el.value = String(val);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },
    v,
  );
};

/** Wait for a selector's text to read this exactly. */
export const reads = async (
  page: Page,
  sel: string,
  want: string,
  timeout = 10_000,
): Promise<void> => {
  try {
    await page.waitForFunction(
      (s, w) => document.querySelector(s)!.textContent.replaceAll(/\s+/gu, " ").trim() === w,
      { timeout },
      sel,
      want,
    );
  } catch (e) {
    throw new Error(
      `${sel} never read "${want}"; it reads "${await text(page, sel)}" (${e instanceof Error ? e.message : String(e)})`,
      { cause: e },
    );
  }
};
