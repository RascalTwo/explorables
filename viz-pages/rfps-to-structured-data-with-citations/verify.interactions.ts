export default async (page, { shot }) => {
  await new Promise(r => setTimeout(r, 3000));
  const info = await page.evaluate(() => {
    const out = [];
    for (const a of document.querySelectorAll("#world a[href]")) {
      const scene = a.closest("#cost,#crop,#gallery,#monScene,#docBlock")?.id || "?";
      out.push({ scene, href: a.href, pe: getComputedStyle(a).pointerEvents,
                 text: (a.textContent || a.getAttribute("aria-label") || "").slice(0, 28) });
    }
    const bad = out.filter(o => o.pe !== "auto");
    const byScene = {};
    for (const o of out) byScene[o.scene] = (byScene[o.scene] || 0) + 1;
    return { total: out.length, byScene, notClickable: bad,
             hrefs: [...new Set(out.map(o => o.href))] };
  });
  console.log("BY_SCENE " + JSON.stringify(info.byScene));
  console.log("TOTAL " + info.total + "  NOT_CLICKABLE " + info.notClickable.length);
  console.log("UNIQUE_HREFS " + info.hrefs.length);
  info.hrefs.forEach(h => console.log("HREF " + h));
};
