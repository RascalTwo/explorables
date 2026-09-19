// Disposable. Three moving parts: the hero stepper (scoped to .hero), the
// assembly stepper (document arrows) and the decode button.
export default async (page, { shot }) => {
  const heroAt = async (n: number, name: string) => {
    await page.click(`.htrack .tick:nth-child(${n})`);
    await new Promise(r => setTimeout(r, 500));
    await shot(name);
    return page.evaluate(() => ({
      no: (document.querySelector('#hNo') as any)?.textContent,
      keysShown: document.querySelector('#bKeys')?.classList.contains('on'),
      sealShown: document.querySelector('#bSeal')?.classList.contains('on'),
      sealBroken: document.querySelector('#bSeal')?.classList.contains('broken'),
      solidShown: document.querySelector('#bSolid')?.classList.contains('on'),
      payLit: document.querySelector("#bPay")?.classList.contains("lit"),
    }));
  };
  console.log('hero step 1:', JSON.stringify(await heroAt(1, 'hero-keypair')));
  console.log('hero step 4:', JSON.stringify(await heroAt(4, 'hero-stamped')));
  console.log('hero step 8:', JSON.stringify(await heroAt(8, 'hero-end')));
  // stepping back must un-break the seal, not leave it stuck
  await page.click('#hPrev'); await page.click('#hPrev');
  await new Promise(r => setTimeout(r, 400));
  console.log('after two prev:', JSON.stringify(await page.evaluate(() => ({
    no: (document.querySelector('#hNo') as any)?.textContent,
    sealBroken: document.querySelector('#bSeal')?.classList.contains('broken'),
  }))));

  await page.click('#assembly h2');        // focus off the hero
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
  await new Promise(r => setTimeout(r, 450));
  await shot('assembled');
  console.log('hero untouched by document arrows:',
    await page.$eval('#hNo', (e: any) => e.textContent));

  await page.click('#btnDecode');
  await new Promise(r => setTimeout(r, 350));
  await shot('decoded');
  const out = await page.$eval('#outPay', (e: any) => e.textContent);
  console.log('decoded payload starts:', JSON.stringify(out.slice(0, 70)));
  const rows = await page.$$eval('.row', els => els.filter((e: any) => e.classList.contains('on')).length);
  console.log('assembly rows lit:', rows, 'of', await page.$$eval('.row', e => e.length));
};
