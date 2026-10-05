// Shared by the coding-challenges journey tests. The page has no backend and no CDN import; the only outside requests
// are links a user could follow, so `open()` aborts every cross-origin request and nothing here can touch the network.
import type { Page } from "puppeteer-core";

export type P = Page & { errors: string[] };

// The `viz` global, as far as these tests use it (the harness's full type is lib/testing/global.d.ts). Declared here
// because the lint run's type program does not load that file and would see `viz` as an unresolved, untyped name.
declare const viz: {
  open(hash?: object, options?: { before?: (page: Page) => unknown }): Promise<P>;
};

const BASE = new URL((process.env.VIZ_URL ?? "").replace(/#.*$/u, ""));

export async function open(hash?: object): Promise<P> {
  const page = await viz.open(hash, {
    before: async (p: Page) => {
      // The dev server's feedback pill is the server's overlay, and the sticky tab bar scrolls smoothly under a click.
      await p.evaluateOnNewDocument(() => {
        addEventListener("DOMContentLoaded", () => {
          document.head.append(
            Object.assign(document.createElement("style"), {
              textContent:
                "#viz-feedback { display: none !important; } html { scroll-behavior: auto !important; }",
            }),
          );
        });
      });
      await p.setRequestInterception(true);
      p.on("request", (req) => {
        if (req.isInterceptResolutionHandled()) return;
        const settled =
          new URL(req.url()).origin === BASE.origin ? req.continue() : req.abort("blockedbyclient");
        settled.catch((e: unknown) => {
          console.error("request interception failed:", e);
        });
      });
    },
  });
  return page;
}

export const text = async (page: Page, sel: string): Promise<string> => {
  const t = await page.$eval(sel, (e) => (e.textContent ?? "").replaceAll(/\s+/gu, " ").trim());
  return t;
};

/** Open a challenge the way a user does: click its tab, wait for its section. */
export async function pick(page: Page, id: string): Promise<void> {
  await page.click(`#tabs .tab[data-id="${id}"]`);
  await page.waitForFunction(
    (i) => document.querySelector(`section.problem[data-id="${i}"]`)!.classList.contains("active"),
    {},
    id,
  );
}

/** Pick a variant pill by its visible name. */
export async function approach(page: Page, name: string): Promise<void> {
  await page.evaluate((n) => {
    const pill = [...document.querySelectorAll<HTMLElement>("section.problem.active .vpill")].find(
      (b) => (b.textContent ?? "").trim() === n,
    );
    if (!pill) throw new Error(`no approach pill "${n}"`);
    pill.click();
  }, name);
}

/** Replace an input's value and fire what typing fires. */
export const type = async (page: Page, sel: string, v: string | number): Promise<void> => {
  await page.$eval(
    sel,
    (el, val) => {
      if (!(el instanceof HTMLInputElement)) throw new Error(`${el.tagName} is not an input`);
      el.value = String(val);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    },
    v,
  );
};

/** One `data-<key>` value per element matching `sel`, in document order ("" where an element has none). */
export const dataset = async (page: Page, sel: string, key: string): Promise<string[]> => {
  const all = await page.$$eval(
    sel,
    (els, k) => els.map((e) => (e instanceof HTMLElement ? (e.dataset[k] ?? "") : "")),
    key,
  );
  return all;
};

/** What an input currently holds. */
export const value = async (page: Page, sel: string): Promise<string> => {
  const v = await page.$eval(sel, (el) => {
    if (!(el instanceof HTMLInputElement)) throw new Error(`${el.tagName} is not an input`);
    return el.value;
  });
  return v;
};

/** The step-through's own readouts, from the active challenge. */
export const dbg = {
  count: async (p: Page): Promise<string> => {
    const t = await text(p, ".problem.active .dbg-count");
    return t;
  },
  out: async (p: Page): Promise<string> => {
    const t = await text(p, ".problem.active .dbg-out");
    return t;
  },
  input: ".problem.active .demo .controls input",
  btn: async (p: Page, label: string): Promise<void> => {
    await p.evaluate((l) => {
      const b = [...document.querySelectorAll<HTMLButtonElement>(".problem.active .dbg-btn")].find(
        (x) => (x.textContent ?? "").includes(l),
      );
      if (!b) throw new Error(`no button ${l}`);
      b.click();
    }, label);
  },
  /** Press Step until it is disabled, in one round trip (a click renders synchronously). */
  toEnd: async (p: Page): Promise<void> => {
    await p.evaluate(() => {
      const step = [
        ...document.querySelectorAll<HTMLButtonElement>(".problem.active .dbg-btn"),
      ].find((x) => x.textContent.includes("Step"))!;
      for (let i = 0; i < 400 && !step.disabled; i++) step.click();
      if (!step.disabled) throw new Error("never reached the last step");
    });
  },
};
