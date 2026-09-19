export default async (page, { shot }) => {
  await page.evaluate(() => document.querySelector("#act3").scrollIntoView());
  const names = ["Operator", "Collaborator", "Consultant", "Approver", "Observer"];
  for (const k of ["dev", "biz"]) {
    await page.click(`.proc-persona button[data-k="${k}"]`);
    for (const i of [0, 1, 2, 3, 4]) {
      await page.click(`.proc-seg[data-i="${i}"]`);
      const ok = await page.evaluate(([n, nm, kk]) => {
        const onSeg = [...document.querySelectorAll(".proc-seg")].filter(e => e.classList.contains("on"));
        const onP = [...document.querySelectorAll(".proc-persona button")].filter(e => e.classList.contains("on"));
        const line = document.querySelector("#procLine").textContent.trim();
        const hasGloss = !!document.querySelector("#procStage .vgloss");
        return onSeg.length === 1 && onSeg[0].dataset.i === String(n)
          && onP.length === 1 && onP[0].dataset.k === kk
          && line.startsWith(nm + ".") && hasGloss;
      }, [i, names[i], k]);
      if (!ok) throw new Error(`${k} rung ${i} (${names[i]}): state/content mismatch`);
      await shot(`${k}-rung-${i}`);
    }
  }
};
