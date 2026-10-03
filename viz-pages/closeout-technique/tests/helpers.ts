// Shared by the closeout explainer's tests. The page has no backend; its only outside request is the 3D tab's
// `three` import from esm.sh (an importmap entry), which a test must never send. `open()` aborts every
// cross-origin request, so nothing here can touch the network.
import type { Page } from "puppeteer-core";

declare global {
  // eslint-disable-next-line no-var
  var viz: {
    open(hash?: string | object, o?: { width?: number; height?: number; before?: (p: Page) => unknown }): Promise<Page & { errors: string[] }>;
  };
}
export type P = Page & { errors: string[] };

const BASE = new URL(process.env.VIZ_URL!.replace(/#.*$/, ""));
const SKILL = "/Users/jmilliken/Desktop/Desktop/Code/ai-setup/skills/viz";

// The 3D tab imports `three` (and its OrbitControls) from esm.sh. A test answers those two requests with the REAL
// library, built locally from the skill's node_modules (same version, 0.160.0); every other outside request is aborted.
const built: Record<string, Promise<string>> = {};
const bundle = (key: string, entry: string, external: string[] = []) =>
  built[key] ??= Bun.build({ entrypoints: [Bun.resolveSync(entry, SKILL)], format: "esm", target: "browser", external })
    .then((r) => r.outputs[0]!.text());

export async function open(o: { seedRandom?: boolean } = {}): Promise<P> {
  return viz.open(undefined, {
    before: async (p) => {
      // The dev server's feedback pill floats over the page; it is the server's overlay, not the page's.
      await p.evaluateOnNewDocument(() => addEventListener("DOMContentLoaded", () =>
        document.head.append(Object.assign(document.createElement("style"), { textContent: "#viz-feedback { display: none !important; }" }))));
      // The live drill picks each rep's shooter spot at random; pin it to the first spot so a test is repeatable.
      if (o.seedRandom) await p.evaluateOnNewDocument(() => { Math.random = () => 0; });
      await p.setRequestInterception(true);
      p.on("request", (req) => {
        if (req.isInterceptResolutionHandled()) return;
        const u = new URL(req.url());
        const cdn = (body: Promise<string>) => body.then((b) => req.respond({ status: 200, contentType: "text/javascript", headers: { "access-control-allow-origin": "*" }, body: b }));
        if (u.hostname === "esm.sh" && u.pathname === "/three@0.160.0") return void cdn(bundle("three", "three"));
        if (u.hostname === "esm.sh" && u.pathname === "/three@0.160.0/examples/jsm/controls/OrbitControls.js")
          return void cdn(bundle("orbit", "three/examples/jsm/controls/OrbitControls.js", ["three"]));
        if (u.origin !== BASE.origin) return void req.abort("blockedbyclient");
        if (/\/_log\//.test(req.url())) return void req.respond({ status: 200, contentType: "application/json", body: "[]" });
        return void req.continue();
      });
    },
  });
}

export const text = (page: Page, sel: string) => page.$eval(sel, (e) => (e.textContent ?? "").replace(/\s+/g, " ").trim());

/** Open a tab the way a user does, and wait for its section to show. */
export async function tab(page: Page, id: string) {
  await page.click(`#tabs button[data-tab="${id}"]`);
  await page.waitForFunction((i) => document.querySelector(`#tab-${i}`)!.classList.contains("active"), {}, id);
}

/** Drag a range input to a value and fire the input event a drag fires. */
export const setRange = (page: Page, sel: string, v: number) =>
  page.$eval(sel, (el, val) => { (el as HTMLInputElement).value = String(val); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);

/** Wait for a section's text to read this exactly. */
export const reads = (page: Page, sel: string, want: string, timeout = 10_000) =>
  page.waitForFunction((s, w) => document.querySelector(s)!.textContent!.replace(/\s+/g, " ").trim() === w, { timeout }, sel, want)
    .catch(async (e) => { throw new Error(`${sel} never read "${want}"; it reads "${await text(page, sel)}" (${e.message})`); });
