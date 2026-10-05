// Shared by the Compose-to-Kubernetes explainer's tests. The page has no backend; its one outside request is
// js-yaml from esm.sh, which the Helm renderer needs for real (it parses and prints YAML). A test answers that
// request with the REAL js-yaml 4.1.0 (the version the page pins), vendored in tests/vendor because the skill's
// node_modules does not carry it, and aborts every other outside request.
import type { EvaluateFunc, HTTPRequest, Page } from "puppeteer-core";

export type P = Page & { errors: string[] };

const BASE = new URL(process.env.VIZ_URL!.replace(/#.*$/u, ""));
const YAML = Bun.file(new URL("./vendor/js-yaml-4.1.0.mjs", import.meta.url).pathname).text();

/** Open the page. `random` pins Math.random (the topology picks its killed pod and request target at random). */
export async function open(o: { random?: number } = {}): Promise<P> {
  const page = await viz.open(undefined, {
    before: async (p: Page) => {
      // The dev server's feedback pill floats over the page; it is the server's overlay, not the page's.
      // The page scrolls smoothly, so a click made mid-scroll lands on the wrong spot: a test scrolls instantly.
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
      if (o.random !== undefined)
        await p.evaluateOnNewDocument((r) => {
          Math.random = () => r;
        }, o.random);
      await p.setRequestInterception(true);
      p.on("request", (req) => {
        route(req).catch(console.error);
      });
    },
  });
  return page;
}

/** Answer one outside request: the vendored js-yaml, the empty log, or a block. */
async function route(req: HTTPRequest): Promise<void> {
  if (req.isInterceptResolutionHandled()) return;
  const u = new URL(req.url());
  if (u.hostname === "esm.sh" && u.pathname === "/js-yaml@4.1.0")
    await req.respond({
      status: 200,
      contentType: "text/javascript",
      headers: { "access-control-allow-origin": "*" },
      body: await YAML,
    });
  else if (u.origin !== BASE.origin) await req.abort("blockedbyclient");
  else if (u.pathname.includes("/_log/"))
    await req.respond({ status: 200, contentType: "application/json", body: "[]" });
  else await req.continue();
}

export const text = async (page: P, sel: string): Promise<string> => {
  const t = await page.$eval(sel, (e) => (e.textContent ?? "").trim());
  return t;
};
export const until = async <A extends unknown[]>(
  page: P,
  fn: EvaluateFunc<A>,
  ...args: A
): Promise<void> => {
  await page.waitForFunction(fn, { timeout: 10_000 }, ...args);
};
