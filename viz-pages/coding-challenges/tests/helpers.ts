// Shared by the coding-challenges journey tests. The page has no backend and no CDN import; the only outside requests
// are links a user could follow, so `open()` aborts every cross-origin request and nothing here can touch the network.
import type { Page } from "puppeteer-core";

export type P = Page & { errors: string[] };

const BASE = new URL(process.env.VIZ_URL!.replace(/#.*$/, ""));

export async function open(hash?: object): Promise<P> {
  return viz.open(hash, {
    before: async (p) => {
      // The dev server's feedback pill is the server's overlay, and the sticky tab bar scrolls smoothly under a click.
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
}

export const text = (page: Page, sel: string) => page.$eval(sel, (e) => (e.textContent ?? "").replace(/\s+/g, " ").trim());

/** Open a challenge the way a user does: click its tab, wait for its section. */
export async function pick(page: Page, id: string) {
  await page.click(`#tabs .tab[data-id="${id}"]`);
  await page.waitForFunction((i) => document.querySelector(`section.problem[data-id="${i}"]`)!.classList.contains("active"), {}, id);
}

/** Pick a variant pill by its visible name. */
export async function approach(page: Page, name: string) {
  await page.evaluate((n) => {
    const pill = [...document.querySelectorAll<HTMLElement>("section.problem.active .vpill")].find((b) => (b.textContent ?? "").trim() === n);
    if (!pill) throw new Error(`no approach pill "${n}"`);
    pill.click();
  }, name);
}

/** Replace an input's value and fire what typing fires. */
export const type = (page: Page, sel: string, v: string | number) =>
  page.$eval(sel, (el, val) => { const i = el as HTMLInputElement; i.value = String(val); i.dispatchEvent(new Event("input", { bubbles: true })); i.dispatchEvent(new Event("change", { bubbles: true })); }, v);

/** The step-through's own readouts, from the active challenge. */
export const dbg = {
  count: (p: Page) => text(p, ".problem.active .dbg-count"),
  out: (p: Page) => text(p, ".problem.active .dbg-out"),
  input: ".problem.active .demo .controls input",
  btn: (p: Page, label: string) => p.evaluate((l) => {
    const b = [...document.querySelectorAll<HTMLButtonElement>(".problem.active .dbg-btn")].find((x) => (x.textContent ?? "").includes(l));
    if (!b) throw new Error(`no button ${l}`);
    b.click();
  }, label),
  /** Press Step until it is disabled, in one round trip (a click renders synchronously). */
  toEnd: (p: Page) => p.evaluate(() => {
    const step = [...document.querySelectorAll<HTMLButtonElement>(".problem.active .dbg-btn")].find((x) => x.textContent!.includes("Step"))!;
    for (let i = 0; i < 400 && !step.disabled; i++) step.click();
    if (!step.disabled) throw new Error("never reached the last step");
  }),
};
