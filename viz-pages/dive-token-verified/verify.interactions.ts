// Disposable. The page's central claim is that the signature check is real, so
// assert the actual outcomes rather than trusting screenshots. The hero runs off
// the same runGates(), so checking the lamp checks the animation too.
import type { Page } from "puppeteer-core";

const pause = async (ms: number): Promise<void> => {
  await new Promise<void>((done) => {
    setTimeout(done, ms);
  });
};

const read = async (page: Page) => {
  const state = await page.evaluate(() => ({
    no: document.querySelector("#hNo")?.textContent,
    lamp: document.querySelector("#cLampWord")?.textContent,
    outcome: document.querySelector("#cOutcome")?.textContent?.trim(),
    gates: [...document.querySelectorAll(".barrier")].map((g) =>
      g.classList.contains("pass") ? "open" : g.classList.contains("fail") ? "SLAM" : "-",
    ),
    trap: document.querySelector("#cEarly")?.classList.contains("on"),
  }));
  return state;
};

export default async function interactions(
  page: Page,
  { shot }: { shot: (name: string) => Promise<unknown> },
): Promise<void> {
  const stepTo = async (n: number) => {
    await page.click(`.htrack .tick:nth-child(${n})`);
    await pause(550);
  };
  const pick = async (id: string) => {
    await page.click(`.hpicks button[data-run="${id}"]`);
    await pause(450);
  };

  // Genuine: the lamp must still be NO at gate 2 and only flip at gate 3.
  await stepTo(3);
  await shot("hero-before-signature");
  console.log("good @gate2:", JSON.stringify(await read(page)));
  await stepTo(4);
  console.log("good @gate3:", JSON.stringify(await read(page)));
  await stepTo(7);
  await shot("hero-served");
  console.log("good @end  :", JSON.stringify(await read(page)));

  await pick("edited");
  await stepTo(4);
  await shot("hero-edited-stops");
  console.log("edited    :", JSON.stringify(await read(page)));
  await pick("hs");
  await stepTo(3);
  console.log("hs256     :", JSON.stringify(await read(page)));

  // Trap one: reading the payload before the signature clears.
  await pick("good");
  await page.click("#hEarly");
  await stepTo(2);
  await shot("hero-early-read");
  console.log("early read:", JSON.stringify(await read(page)));
  await stepTo(4); // once trusted, the trap panel must disappear
  console.log("early after sig:", JSON.stringify(await read(page)));
  await page.click("#hEarly");

  // The section below the hero keeps its own state and its own verdicts.
  const run = async (id: string) => {
    await page.click(`.pick[data-id="${id}"]`);
    await pause(400);
    await shot(`token-${id}`);
    return page.evaluate(() => ({
      verdict: document.querySelector("#verdict b")?.textContent,
      gates: [...document.querySelectorAll(".gate")].map((g) => g.className.replace("gate ", "")),
      live: document.querySelector("#verdict .live")?.textContent?.slice(-24),
    }));
  };
  for (const id of ["good", "edited", "none", "hs"]) {
    // oxlint-disable-next-line no-await-in-loop -- each token is picked, shot and read in its own state, one after another
    console.log(id, JSON.stringify(await run(id)));
  }
}
