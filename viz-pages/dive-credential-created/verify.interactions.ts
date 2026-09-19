// Disposable. Two independent steppers on this page: the hero machine (scoped
// to the .hero element) and the custody track (document arrows). Both are blank
// at rest, so a plain run would screenshot two empty figures.
export default async (page, { shot }) => {
  const heroAt = async (n: number, name: string) => {
    await page.click(`.htrack .tick:nth-child(${n})`);
    await new Promise(r => setTimeout(r, 500));
    await shot(name);
    return page.evaluate(() => ({
      no: (document.querySelector('#hNo') as any)?.textContent,
      out: (document.querySelector('#hOut') as any)?.textContent,
    }));
  };
  console.log('hero step 6:', JSON.stringify(await heroAt(6, 'hero-salt-inside')));
  console.log('hero step 8:', JSON.stringify(await heroAt(8, 'hero-verify')));

  // Stepping BACK must restore the earlier picture exactly — the whole reason
  // render is absolute rather than cumulative.
  await page.click('#hPrev'); await page.click('#hPrev');
  await new Promise(r => setTimeout(r, 400));
  console.log('after two prev:', JSON.stringify(await page.evaluate(() => ({
    no: (document.querySelector('#hNo') as any)?.textContent,
    verifyShown: document.querySelector('#hVerify')?.classList.contains('on'),
    nowayShown: document.querySelector('#hNoway')?.classList.contains('on'),
  }))));

  // Restart draws a new salt, so the same secret must yield a different string.
  const before = await page.$eval('#hOut', (e: any) => e.textContent);
  await page.click('#hRestart');
  await page.click('.htrack .tick:nth-child(6)');
  await new Promise(r => setTimeout(r, 500));
  const after = await page.$eval('#hOut', (e: any) => e.textContent);
  console.log('new salt changed the string?', before !== after);
  await shot('hero-second-salt');

  const arrow = async (n: number) => {
    for (let i = 0; i < n; i++) await page.keyboard.press('ArrowRight');
    await new Promise(r => setTimeout(r, 450));
  };
  await page.click('#life h2');           // move focus off the hero
  await arrow(2); await shot('beat3-shown-once');
  await arrow(3); await shot('beat6-verify');
  console.log('custody at beat 6:',
    JSON.stringify(await page.$$eval('.place', els => els.map((e: any) => e.className))));
  console.log('hero step unchanged by document arrows:',
    await page.$eval('#hNo', (e: any) => e.textContent));

  // The `.elsewhere` block is styled by /_kit/viz-kit.css, NOT by this page. If
  // the kit ever stops being served or the component is removed from it, the
  // block degrades to unstyled text that still reads fine and no longer looks
  // like a citation — a silent failure. Assert the rule actually landed.
  await page.$eval('.elsewhere', (e: any) => e.scrollIntoView());
  await new Promise(r => setTimeout(r, 250));
  await shot('elsewhere');
  console.log('elsewhere styling:', JSON.stringify(await page.$eval('.elsewhere', (e: any) => {
    const cs = getComputedStyle(e);
    return {
      borderLeft: cs.borderLeftWidth,
      styledByKit: cs.borderLeftWidth !== '0px',
      href: e.querySelector('a')?.getAttribute('href'),
      hasWhy: !!e.querySelector('.why'),
    };
  })));
};
