// Disposable. The page's central claim is that the signature check is real, so
// assert the actual outcomes rather than trusting screenshots. The hero runs off
// the same runGates(), so checking the lamp checks the animation too.
const read = (page: any) => page.evaluate(() => ({
  no: (document.querySelector('#hNo') as any)?.textContent,
  lamp: (document.querySelector('#cLampWord') as any)?.textContent,
  outcome: (document.querySelector('#cOutcome') as any)?.textContent.trim(),
  gates: [...document.querySelectorAll('.barrier')].map((g: any) =>
    g.classList.contains('pass') ? 'open' : g.classList.contains('fail') ? 'SLAM' : '-'),
  trap: document.querySelector('#cEarly')?.classList.contains('on'),
}));

export default async (page, { shot }) => {
  const stepTo = async (n: number) => {
    await page.click(`.htrack .tick:nth-child(${n})`);
    await new Promise(r => setTimeout(r, 550));
  };
  const pick = async (id: string) => {
    await page.click(`.hpicks button[data-run="${id}"]`);
    await new Promise(r => setTimeout(r, 450));
  };

  // Genuine: the lamp must still be NO at gate 2 and only flip at gate 3.
  await stepTo(3); await shot('hero-before-signature');
  console.log('good @gate2:', JSON.stringify(await read(page)));
  await stepTo(4);
  console.log('good @gate3:', JSON.stringify(await read(page)));
  await stepTo(7); await shot('hero-served');
  console.log('good @end  :', JSON.stringify(await read(page)));

  await pick('edited'); await stepTo(4); await shot('hero-edited-stops');
  console.log('edited    :', JSON.stringify(await read(page)));
  await pick('hs'); await stepTo(3);
  console.log('hs256     :', JSON.stringify(await read(page)));

  // Trap one: reading the payload before the signature clears.
  await pick('good'); await page.click('#hEarly'); await stepTo(2);
  await shot('hero-early-read');
  console.log('early read:', JSON.stringify(await read(page)));
  await stepTo(4);   // once trusted, the trap panel must disappear
  console.log('early after sig:', JSON.stringify(await read(page)));
  await page.click('#hEarly');

  // The section below the hero keeps its own state and its own verdicts.
  const run = async (id: string) => {
    await page.click(`.pick[data-id="${id}"]`);
    await new Promise(r => setTimeout(r, 400));
    await shot(`token-${id}`);
    return page.evaluate(() => ({
      verdict: (document.querySelector('#verdict b') as any)?.textContent,
      gates: [...document.querySelectorAll('.gate')].map((g: any) => g.className.replace('gate ', '')),
      live: (document.querySelector('#verdict .live') as any)?.textContent.slice(-24),
    }));
  };
  for (const id of ['good', 'edited', 'none', 'hs']) {
    console.log(id, JSON.stringify(await run(id)));
  }
};
