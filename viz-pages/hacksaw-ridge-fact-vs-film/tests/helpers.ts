// Shared by the Hacksaw Ridge tests. The page has no backend; its only outside request is the journey map's d3-geo
// import from esm.sh, which a test must never send: `open()` answers it with the REAL d3-geo (3.1.1), built locally from
// the skill's node_modules, and aborts every other cross-origin request.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "puppeteer-core";

export type P = Page & { errors: string[] };

const BASE = new URL(process.env.VIZ_URL!.replace(/#.*$/, ""));
const SKILL = "/Users/jmilliken/Desktop/Desktop/Code/ai-setup/skills/viz";

// Bundling the package entry directly drops all its code (its package.json says sideEffects: false and the entry only re-exports),
// so the bundle goes through a one-line stub entry.
let d3geo: Promise<string> | undefined;
const geoBundle = () => (d3geo ??= (async () => {
  const entry = join(mkdtempSync(join(tmpdir(), "d3geo-")), "entry.js");
  writeFileSync(entry, `export * from ${JSON.stringify(Bun.resolveSync("d3-geo", SKILL))};`);
  return (await Bun.build({ entrypoints: [entry], format: "esm", target: "browser" })).outputs[0]!.text();
})());

export async function open(hash?: object): Promise<P> {
  const page = await viz.open(hash, {
    before: async (p) => {
      // The dev server's feedback pill floats over the page; smooth scrolling moves a target under a click.
      await p.evaluateOnNewDocument(() => addEventListener("DOMContentLoaded", () =>
        document.head.append(Object.assign(document.createElement("style"), { textContent: "#viz-feedback { display: none !important; } html { scroll-behavior: auto !important; }" }))));
      await p.setRequestInterception(true);
      p.on("request", (req) => {
        if (req.isInterceptResolutionHandled()) return;
        const u = new URL(req.url());
        if (u.hostname === "esm.sh" && u.pathname === "/d3-geo@3")
          return void geoBundle().then((b) => req.respond({ status: 200, contentType: "text/javascript", headers: { "access-control-allow-origin": "*" }, body: b }));
        if (u.origin !== BASE.origin) return void req.abort("blockedbyclient");
        return void req.continue();
      });
    },
  });
  return page;
}

export const text = (page: Page, sel: string) => page.$eval(sel, (e) => (e.textContent ?? "").replace(/\s+/g, " ").trim());

/** Wait for the journey to have drawn (its map and timeline build after the d3-geo import). */
export const journeyReady = (page: Page) => page.waitForFunction(() => document.querySelector("#jcount")?.textContent === "1 / 15", { timeout: 20_000 });

/** Drag the journey scrubber to an event and fire what a drag fires. */
export const scrubTo = (page: Page, i: number) =>
  page.$eval("#jrange", (el, v) => { (el as HTMLInputElement).value = String(v); el.dispatchEvent(new Event("input", { bubbles: true })); }, i);
