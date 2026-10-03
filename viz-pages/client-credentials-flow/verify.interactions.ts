// Disposable. A plain verify run only ever sees step 1, which on a stepper page
// is the one frame that proves nothing. Walk to the three steps that carry a
// dive link and shoot each, then confirm the links actually resolve.
export default async (page, { shot }) => {
  const step = async (n: number) => {
    for (let i = 0; i < n; i++) await page.click('#next');
    await new Promise(r => setTimeout(r, 700));
  };
  await step(2); await shot('s3-registration');   // Dive A doorway
  await step(4); await shot('s7-token-issued');   // Dive B doorway
  await step(3); await shot('s10-verified');      // Dive C doorway

  const hrefs = await page.$$eval('a.dive', els => els.map((e: any) => e.href));
  console.log('dive links:', JSON.stringify(hrefs));
  const box = await page.$eval('a.dive', (e: any) => {
    const r = e.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), clickable: r.width > 0 && r.height > 0 };
  });
  console.log('first dive link box:', JSON.stringify(box));

  // Added 2026-08-07 with the closing beat, rewritten the same day when it was
  // found to PRINT everything and ASSERT nothing — which is how the panel came
  // to be drawn 87px on top of p-verify without any check complaining.
  //
  // Three things are now gates rather than observations:
  //   1. every sibling in the family is reachable from this one page
  //   2. the panel does not overlap any other panel
  //   3. the panel is on the canvas
  //
  // (1) is the real requirement: the spine is the only LISTED page, so a viz
  // that is not linked from here is a viz nobody can find.
  const FAMILY = [
    'dive-credential-created', 'dive-token-created', 'dive-token-verified',
    'jwks-explainer', 'jwks-diagrams',
    'token-compromise-map', 'failure-cap-lockout', 'token-kill-switch',
  ];
  await step(1);
  await shot('s11-where-next');

  const closing = await page.evaluate((family: string[]) => {
    const p = document.querySelector('#p-next') as HTMLElement;
    const stage = document.querySelector('#stage') as HTMLElement;
    if (!p || !stage) return { found: false };
    const r = p.getBoundingClientRect(), s = stage.getBoundingClientRect();

    // Reachability is measured over the WHOLE page, not just this panel — an
    // inline doorway earlier in the walkthrough counts just as well.
    const all = [...document.querySelectorAll('a[href]')].map((a: any) => a.getAttribute('href'));
    const missing = family.filter(slug => !all.some(h => h && h.includes(`/${slug}/`)));

    // Overlap against every other panel on the canvas.
    const overlaps = [...document.querySelectorAll('.panelbox')]
      .filter((o: any) => o.id && o.id !== 'p-next')
      .map((o: any) => ({ id: o.id, r: o.getBoundingClientRect() }))
      .filter(({ r: q }) => r.left < q.right && q.left < r.right && r.top < q.bottom && q.top < r.bottom)
      .map(({ id, r: q }) => `${id} (by ${Math.round(Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top))}px)`);

    return {
      found: true,
      famTiles: p.querySelectorAll('a.fam').length,
      missingFromPage: missing,
      overlaps,
      withinStage: r.bottom <= s.bottom + 1 && r.right <= s.right + 1,
      overflowPx: Math.round(r.bottom - s.bottom),
    };
  }, FAMILY);
  console.log('closing panel:', JSON.stringify(closing));

  if (!closing.found) throw new Error('#p-next or #stage missing');
  if (closing.missingFromPage.length)
    throw new Error(`family pages unreachable from the spine: ${closing.missingFromPage.join(', ')}`);
  if (closing.famTiles !== FAMILY.length)
    throw new Error(`closing panel has ${closing.famTiles} tiles, expected ${FAMILY.length}`);
  if (closing.overlaps.length)
    throw new Error(`#p-next overlaps: ${closing.overlaps.join(', ')}`);
  if (!closing.withinStage)
    throw new Error(`#p-next runs off the stage by ${closing.overflowPx}px`);

  // The loudening only counts if the doorway is bigger than it was. The old
  // style rendered ~11px text with a 1px border; anything under ~44px tall is
  // back to looking like a note.
  console.log('dive box after loudening:', JSON.stringify(
    await page.$eval('a.dive', (e: any) => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return { h: Math.round(r.height), border: cs.borderTopWidth,
               cta: getComputedStyle(e, '::after').content };
    })));
};
