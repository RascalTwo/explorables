import type { Page } from "puppeteer-core";

const names = ["Operator", "Collaborator", "Consultant", "Approver", "Observer"];

export default async function interactions(
  page: Page,
  { shot }: { shot: (name: string) => Promise<unknown> },
): Promise<void> {
  await page.evaluate(() => {
    document.querySelector("#act3")?.scrollIntoView();
  });
  for (const k of ["dev", "biz"]) {
    // oxlint-disable-next-line no-await-in-loop -- one page, driven step by step: each click needs the previous state
    await page.click(`.proc-persona button[data-k="${k}"]`);
    for (const i of [0, 1, 2, 3, 4]) {
      // oxlint-disable-next-line no-await-in-loop -- one page, driven step by step: each click needs the previous state
      await page.click(`.proc-seg[data-i="${i}"]`);
      // oxlint-disable-next-line no-await-in-loop -- one page, driven step by step: each click needs the previous state
      const ok = await page.evaluate(
        ([n, nm, kk]: [number, string, string]) => {
          const onSeg = [...document.querySelectorAll<HTMLElement>(".proc-seg")].filter((e) =>
            e.classList.contains("on"),
          );
          const onP = [...document.querySelectorAll<HTMLElement>(".proc-persona button")].filter(
            (e) => e.classList.contains("on"),
          );
          const line = document.querySelector("#procLine")?.textContent.trim() ?? "";
          const hasGloss = Boolean(document.querySelector("#procStage .vgloss"));
          return (
            onSeg.length === 1 &&
            onSeg[0]?.dataset["i"] === String(n) &&
            onP.length === 1 &&
            onP[0]?.dataset["k"] === kk &&
            line.startsWith(`${nm}.`) &&
            hasGloss
          );
        },
        [i, names[i] ?? "", k],
      );
      if (!ok) throw new Error(`${k} rung ${i} (${names[i]}): state/content mismatch`);
      // oxlint-disable-next-line no-await-in-loop -- one page, driven step by step: each click needs the previous state
      await shot(`${k}-rung-${i}`);
    }
  }
}
