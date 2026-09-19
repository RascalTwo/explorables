// KEEP. Two modes, and mode 1 is the whole argument — a plain verify.ts run only
// ever sees mode 0, which is the case where the two counters AGREE and the page
// therefore proves nothing. Also runs the collision sweep: text-over-text and
// text-over-line are invisible to both verify.ts and vizAudit.
export default async (page, { shot }) => {
  const read = async (name: string) => {
    await new Promise(r => setTimeout(r, 300));
    await shot(name);
    return page.evaluate(() => ({
      counters: [...document.querySelectorAll('#fig .ctr-n')].map((e: any) => e.textContent),
      verdicts: [...document.querySelectorAll('#fig .ctr-v')].map((e: any) => e.textContent.trim()),
      sourceDots: document.querySelectorAll('#fig circle').length,
    }));
  };

  const one = await read('one-address');
  console.log('one address:', JSON.stringify(one));
  await page.click('#modes button[data-m="1"]');
  const many = await read('rotating-addresses');
  console.log('rotating   :', JSON.stringify(many));

  // The claim: rotating sources changes the per-SOURCE count and leaves the
  // per-CREDENTIAL count untouched. If a refactor ever makes both move together
  // the page is asserting something false while still looking correct.
  console.log('per-source count dropped?', one.counters[0] !== many.counters[0],
    one.counters[0], '→', many.counters[0]);
  console.log('per-credential count unchanged?', one.counters[1] === many.counters[1],
    one.counters[1]);
  // Colour and glyph mean "was the attack caught", NOT "did the number rise".
  // Getting this backwards made the per-source counter go green exactly when it
  // had failed to notice a hundred guesses, so assert the direction explicitly.
  console.log('per-source MISSES when rotated?', many.verdicts[0].startsWith('✕'));
  console.log('per-source CATCHES single source?', one.verdicts[0].startsWith('✓'));
  console.log('per-credential catches in both?',
    one.verdicts[1].startsWith('✓') && many.verdicts[1].startsWith('✓'));
  console.log('red box is the missed one?', JSON.stringify(await page.evaluate(() =>
    [...document.querySelectorAll('#fig .ctr-box')].map((e: any) => e.getAttribute('class')))));

  console.log('collisions:', JSON.stringify(await page.evaluate(() => {
    const svg = document.querySelector('#fig') as SVGSVGElement;
    const texts = [...svg.querySelectorAll('text')] as SVGTextElement[];
    const pad = 1.5;
    const hit = (a: any, b: any) =>
      a.x < b.x + b.width - pad && a.x + a.width - pad > b.x &&
      a.y < b.y + b.height - pad && a.y + a.height - pad > b.y;
    const out: string[] = [];
    for (let i = 0; i < texts.length; i++)
      for (let j = i + 1; j < texts.length; j++)
        if (hit(texts[i].getBBox(), texts[j].getBBox()))
          out.push(`"${texts[i].textContent?.slice(0, 24)}" × "${texts[j].textContent?.slice(0, 24)}"`);
    // The attempt lines deliberately converge on the credential box, so only
    // check text against them where the text is NOT the credential's own label.
    for (const t of texts) {
      const tb = t.getBBox();
      for (const l of [...svg.querySelectorAll('line.attempt')] as SVGLineElement[]) {
        const x1 = +l.getAttribute('x1')!, x2 = +l.getAttribute('x2')!;
        const y1 = +l.getAttribute('y1')!, y2 = +l.getAttribute('y2')!;
        const lb = { x: Math.min(x1, x2), y: Math.min(y1, y2),
                     width: Math.abs(x2 - x1) || 1, height: Math.abs(y2 - y1) || 1 };
        if (hit(tb, lb)) { out.push(`LINE × "${t.textContent?.slice(0, 24)}"`); break; }
      }
    }
    return out;
  })));
};
