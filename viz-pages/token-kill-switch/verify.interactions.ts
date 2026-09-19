// KEEP. Two independent state axes (2 universes x 3 TTLs) plus a static figure
// added 2026-08-07. A plain verify.ts run sees universe 0 / TTL default only.
export default async (page, { shot }) => {
  // The lever-4 detail figure is built by a script block AFTER the chart's own
  // draw(). If that block ever throws, the chart still renders and the page
  // looks fine — the figure is just an empty frame. Assert it filled.
  await page.$eval('#denyfig', (e: any) => e.scrollIntoView());
  await new Promise(r => setTimeout(r, 300));
  await shot('lever4-detail');
  console.log('deny figure:', JSON.stringify(await page.evaluate(() => {
    const f = document.querySelector('#denyfig') as SVGSVGElement;
    const r = f.getBoundingClientRect();
    return {
      boxes: f.querySelectorAll('.dstep').length,       // 4 steps: 1, 2, 3a, 3b... +4
      local: f.querySelectorAll('.dstep.local').length,
      intro: f.querySelectorAll('.dstep.intro').length,
      onCanvas: r.width > 0 && r.height > 0,
      // Any <text> pushed outside the viewBox is invisible with no error.
      overflowing: [...f.querySelectorAll('text')].filter((t: any) => {
        const b = t.getBBox();
        return b.x < 0 || b.y < 0 || b.x + b.width > 1120 || b.y + b.height > 470;
      }).map((t: any) => t.textContent.slice(0, 40)),
    };
  })));

  // Both universes and the shortest TTL — the figure must not move with either,
  // because the mechanism does not.
  for (const [sel, name] of [['#uni-1', 'universe-b'], ['.ttl', 'ttl-first']] as any) {
    await page.click(sel);
    await new Promise(r => setTimeout(r, 350));
    await shot(name);
  }
  console.log('figure unchanged across state:', JSON.stringify(await page.evaluate(() =>
    document.querySelectorAll('#denyfig .dstep').length)));
};
