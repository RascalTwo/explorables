// Shared by the Hacksaw Ridge tests. The page has no backend; its only outside request is the journey map's d3-geo
// import from esm.sh, which a test must never send: `open()` answers it with the REAL d3-geo (3.1.1), built locally from
// the skill's node_modules, and aborts every other cross-origin request.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { HTTPRequest, Page } from "puppeteer-core";

export type P = Page & { errors: string[] };

const BASE = new URL(process.env.VIZ_URL!.replace(/#.*$/u, ""));
const SKILL = "/Users/jmilliken/Desktop/Desktop/Code/ai-setup/skills/viz";

// Bundling the package entry directly drops all its code (its package.json says sideEffects: false and the entry only re-exports),
// so the bundle goes through a one-line stub entry.
let d3geo: Promise<string> | undefined;
const geoBundle = async (): Promise<string> => {
  d3geo ??= (async () => {
    const entry = path.join(mkdtempSync(path.join(tmpdir(), "d3geo-")), "entry.js");
    writeFileSync(entry, `export * from ${JSON.stringify(Bun.resolveSync("d3-geo", SKILL))};`);
    return (
      await Bun.build({ entrypoints: [entry], format: "esm", target: "browser" })
    ).outputs[0]!.text();
  })();
  const js = await d3geo;
  return js;
};

/** Answer one outside request: the real d3-geo bundle, or a block. */
async function route(req: HTTPRequest): Promise<void> {
  if (req.isInterceptResolutionHandled()) return;
  const u = new URL(req.url());
  if (u.hostname === "esm.sh" && u.pathname === "/d3-geo@3") {
    const body = await geoBundle();
    await req.respond({
      status: 200,
      contentType: "text/javascript",
      headers: { "access-control-allow-origin": "*" },
      body,
    });
  } else if (u.origin !== BASE.origin) await req.abort("blockedbyclient");
  else await req.continue();
}

export async function open(hash?: object): Promise<P> {
  const page = await viz.open(hash, {
    before: async (p: Page) => {
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
        route(req).catch(console.error);
      });
    },
  });
  return page;
}

export const text = async (page: Page, sel: string): Promise<string> => {
  const t = await page.$eval(sel, (e) => (e.textContent ?? "").replaceAll(/\s+/gu, " ").trim());
  return t;
};

/** Wait for the journey to have drawn (its map and timeline build after the d3-geo import). */
export const journeyReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => document.querySelector("#jcount")?.textContent === "1 / 15", {
    timeout: 20_000,
  });
};

/** Drag the journey scrubber to an event and fire what a drag fires. */
export const scrubTo = async (page: Page, i: number): Promise<void> => {
  await page.$eval(
    "#jrange",
    (el, v) => {
      if (el instanceof HTMLInputElement) {
        el.value = String(v);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    },
    i,
  );
};
