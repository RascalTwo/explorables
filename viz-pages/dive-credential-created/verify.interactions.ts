// Disposable. Two independent steppers on this page: the hero machine (scoped
// to the .hero element) and the custody track (document arrows). Both are blank
// at rest, so a plain run would screenshot two empty figures.
import type { Page } from "puppeteer-core";

const pause = async (ms: number): Promise<void> => {
  await new Promise<void>((done) => {
    setTimeout(done, ms);
  });
};

export default async function interactions(
  page: Page,
  { shot }: { shot: (name: string) => Promise<unknown> },
): Promise<void> {
  const heroAt = async (n: number, name: string) => {
    await page.click(`.htrack .tick:nth-child(${n})`);
    await pause(500);
    await shot(name);
    return page.evaluate(() => ({
      no: document.querySelector("#hNo")?.textContent,
      out: document.querySelector("#hOut")?.textContent,
    }));
  };
  console.log("hero step 6:", JSON.stringify(await heroAt(6, "hero-salt-inside")));
  console.log("hero step 8:", JSON.stringify(await heroAt(8, "hero-verify")));

  // Stepping BACK must restore the earlier picture exactly — the whole reason
  // render is absolute rather than cumulative.
  await page.click("#hPrev");
  await page.click("#hPrev");
  await pause(400);
  console.log(
    "after two prev:",
    JSON.stringify(
      await page.evaluate(() => ({
        no: document.querySelector("#hNo")?.textContent,
        verifyShown: document.querySelector("#hVerify")?.classList.contains("on"),
        nowayShown: document.querySelector("#hNoway")?.classList.contains("on"),
      })),
    ),
  );

  // Restart draws a new salt, so the same secret must yield a different string.
  const before = await page.$eval("#hOut", (e) => e.textContent);
  await page.click("#hRestart");
  await page.click(".htrack .tick:nth-child(6)");
  await pause(500);
  const after = await page.$eval("#hOut", (e) => e.textContent);
  console.log("new salt changed the string?", before !== after);
  await shot("hero-second-salt");

  const arrow = async (n: number) => {
    for (let i = 0; i < n; i++) {
      // oxlint-disable-next-line no-await-in-loop -- the key presses must land one after another
      await page.keyboard.press("ArrowRight");
    }
    await pause(450);
  };
  await page.click("#life h2"); // move focus off the hero
  await arrow(2);
  await shot("beat3-shown-once");
  await arrow(3);
  await shot("beat6-verify");
  console.log(
    "custody at beat 6:",
    JSON.stringify(await page.$$eval(".place", (els) => els.map((e) => e.className))),
  );
  console.log(
    "hero step unchanged by document arrows:",
    await page.$eval("#hNo", (e) => e.textContent),
  );

  // The `.elsewhere` block is styled by /_kit/viz-kit.css, NOT by this page. If
  // the kit ever stops being served or the component is removed from it, the
  // block degrades to unstyled text that still reads fine and no longer looks
  // like a citation — a silent failure. Assert the rule actually landed.
  await page.$eval(".elsewhere", (e) => {
    e.scrollIntoView();
  });
  await pause(250);
  await shot("elsewhere");
  console.log(
    "elsewhere styling:",
    JSON.stringify(
      await page.$eval(".elsewhere", (e) => {
        const cs = getComputedStyle(e);
        return {
          borderLeft: cs.borderLeftWidth,
          styledByKit: cs.borderLeftWidth !== "0px",
          href: e.querySelector("a")?.getAttribute("href"),
          hasWhy: !!e.querySelector(".why"),
        };
      }),
    ),
  );
}
