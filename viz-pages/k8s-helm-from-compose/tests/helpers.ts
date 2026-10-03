// Shared by the Compose-to-Kubernetes explainer's tests. The page has no backend; its one outside request is
// js-yaml from esm.sh, which the Helm renderer needs for real (it parses and prints YAML). A test answers that
// request with the REAL js-yaml 4.1.0 (the version the page pins), vendored in tests/vendor because the skill's
// node_modules does not carry it, and aborts every other outside request.
import type { Page } from "puppeteer-core";

export type P = Page & { errors: string[] };

const BASE = new URL(process.env.VIZ_URL!.replace(/#.*$/, ""));
const YAML = Bun.file(new URL("./vendor/js-yaml-4.1.0.mjs", import.meta.url).pathname).text();

/** Open the page. `random` pins Math.random (the topology picks its killed pod and request target at random). */
export async function open(o: { random?: number } = {}): Promise<P> {
  return viz.open(undefined, {
    before: async (p) => {
      // The dev server's feedback pill floats over the page; it is the server's overlay, not the page's.
      // The page scrolls smoothly, so a click made mid-scroll lands on the wrong spot: a test scrolls instantly.
      await p.evaluateOnNewDocument(() => addEventListener("DOMContentLoaded", () =>
        document.head.append(Object.assign(document.createElement("style"), { textContent: "#viz-feedback { display: none !important; } html { scroll-behavior: auto !important; }" }))));
      if (o.random !== undefined) await p.evaluateOnNewDocument((r) => { Math.random = () => r; }, o.random);
      await p.setRequestInterception(true);
      p.on("request", async (req) => {
        if (req.isInterceptResolutionHandled()) return;
        const u = new URL(req.url());
        if (u.hostname === "esm.sh" && u.pathname === "/js-yaml@4.1.0")
          return void req.respond({ status: 200, contentType: "text/javascript", headers: { "access-control-allow-origin": "*" }, body: await YAML });
        if (u.origin !== BASE.origin) return void req.abort("blockedbyclient");
        if (/\/_log\//.test(u.pathname)) return void req.respond({ status: 200, contentType: "application/json", body: "[]" });
        return void req.continue();
      });
    },
  });
}

export const text = (page: P, sel: string) => page.$eval(sel, (e) => (e.textContent ?? "").trim());
export const until = (page: P, fn: (...a: never[]) => unknown, ...args: unknown[]) => page.waitForFunction(fn as never, { timeout: 10_000 }, ...args);
