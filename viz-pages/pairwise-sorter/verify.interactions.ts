// Self-check, three parts:
//   1. drive the sort with a known ground truth (numeric order) and assert the result
//      comes out sorted within merge sort's worst-case comparison budget;
//   2. feed one item of each input syntax and assert each renders the right fields;
//   3. bench an item mid-sort and sub it back in, asserting it leaves and rejoins the ranking;
//   4. junk in saved state must not throw away the session;
//   5. EDITING a list (reorder + add + delete) must not invalidate answers already given;
//   6. several named lists coexist, switch, and survive a reload;
//   7. export -> import round-trips items AND comparisons, re-asking nothing;
//   8. the comparisons tab lists every answer and can delete one;
//   9. a cycle in the answers is detected and pointed at;
//  10. items tied through a CHAIN share a rank without being compared directly;
//  11. duplicate lines are merged with a visible warning, not silently;
//  12. the chooser is a real keyboard-operable button and the card is inert;
//  13. clicking an image inspects it instead of voting;
//  14. you can step out of the chooser to see the partial order, then resume;
//  15. the scripting API covers every behaviour the UI has;
//  16. two lists sharing a name are an unambiguous error, never a silent wrong-list action;
//  17. the lightbox fills the screen and arrows step between images without voting;
//  18. editing answers from the paused view keeps you there instead of snapping to the chooser;
//  19. both Choose buttons sit on the same baseline whatever the content height;
//  20. a card shows at most two rows of media and pages through the rest;
//  21. a declared tier order answers cross-tier pairs instead of ever asking them, and
//      those synthesised verdicts never reach the log;
//  22. your own answer beats the tier order, and can be handed back to it on demand;
//  23. renaming an item carries its answers across — including negating the verdict when
//      the rename flips the pair key's order — and refuses to merge two histories;
//  24. search filters what you see and nothing else, and locks saving while it lies;
//  25. editing an item mid-duel does not cost you the question you were part-way through;
//  26. resetting answers leaves the bench alone, and "Sub all in" empties it on demand;
//  27. a tag can never contain whitespace, so it survives the text round-trip;
//  28. tier WEIGHTS let a lower tier's best item outrank a higher tier's worst, which
//      strict tier order can never do;
//  29. "Resolve" reorders to contradict as few answers as possible, and admits when a
//      cycle is irreducible rather than claiming it fixed it;
//  30. stopping early keeps the placed items in their final order — the claim the
//      "you can stop here" nudge makes;
//  31. a list saved by an older build still opens, renders, and comes back complete;
//  32. migrations are versioned, ordered, idempotent, and refuse to downgrade data
//      written by a newer build;
//  33. the bench is two-way from the finished ranking — benching keeps you in the list
//      and keeps the item's answers, so subbing it back in re-asks nothing;
//  34. benchMany applies a batch atomically in one re-sort;
//  35. ranked rows align their titles and their action clusters, and expand in place to
//      show media and description — with an expander only where there is something to show.

/** Answer every comparison by numeric order until the results screen appears. */
async function solve(page) {
  for (let n = 0; n < 300; n++) {
    if (await page.$eval("#done", el => !el.classList.contains("hide"))) return;
    const [a, b] = await page.evaluate(() =>
      [document.querySelector("#optA .txt").textContent, document.querySelector("#optB .txt").textContent]);
    await page.click(+a < +b ? "#chooseA" : "#chooseB");
  }
  throw new Error("[check] FAILED — sort never finished");
}

const results = page => page.$$eval("#results li .item", ls => ls.map(l => l.textContent));

async function restart(page, lines) {
  await page.$eval("#input", el => el.value = "");
  await page.type("#input", lines.join("\n"));
  await page.click("#start");
}

const logLen = page => page.evaluate(() => {
  const db = JSON.parse(localStorage.getItem("pairwise-sorter/v4"));
  return db.lists[db.current].log.length;
});

export default async (page, { shot }) => {
  const ITEMS = [5, 3, 8, 1, 7, 2, 6, 4];
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" }); // not networkidle0 — the SSE hot-reload stream never idles

  // ── part 1: the sort itself ──
  await page.type("#input", ITEMS.join("\n"));
  await page.click("#start");
  await shot("compare");
  await solve(page);

  const list = await results(page);
  const count = await page.$eval("#cCmp", el => +el.textContent);
  console.log("[check] ranked:", list.join(","), "| comparisons:", count);
  if (list.join(",") !== [...ITEMS].sort((x, y) => x - y).join(","))
    throw new Error("[check] FAILED — not sorted: " + list.join(","));
  if (count > 17) throw new Error("[check] FAILED — over budget: " + count);
  await shot("results");

  // ── part 2: input syntaxes ──
  const IMGURL = new URL("test.svg", page.url()).href;   // local: this sandbox has no external network
  const VIDURL = new URL("test.mp4", page.url()).href;   // real file, so the check never flags a dead request
  const RICH = [
    "Cold brew",
    "[Flat white](https://example.com/fw)",
    // media deliberately in the LAST columns, and the link NOT first — content, not position.
    // Two media URLs prove the array; example.com/p has no media extension so it is the link.
    // #-token field is tags, wherever it sits — content, not position, same as the rest.
    `Sony WH-1000XM5 | ${IMGURL} | https://example.com/p | #audio #anc | Noise cancelling over-ear | ${VIDURL}`,
  ];
  await page.click("#edit2");    // back to the setup screen to swap in a new list
  await restart(page, RICH);

  const parsed = await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem("pairwise-sorter/v4"));
    return db.lists[db.current].items;
  });
  console.log("[check] parsed:", JSON.stringify(parsed));
  const want = [
    { title: "Cold brew", url: "", media: [], desc: "", tags: [] },
    { title: "Flat white", url: "https://example.com/fw", media: [], desc: "", tags: [] },
    { title: "Sony WH-1000XM5", url: "https://example.com/p", media: [IMGURL, VIDURL],
      desc: "Noise cancelling over-ear", tags: ["audio", "anc"] },
  ];
  if (JSON.stringify(parsed) !== JSON.stringify(want))
    throw new Error("[check] FAILED — parse mismatch, wanted " + JSON.stringify(want));

  // Binary insertion places items in order, so the rich item is not in the FIRST pair.
  // Advance until it is on screen rather than assuming.
  for (let i = 0; i < 5; i++) {
    const titles = await page.$$eval(".opt .txt", ts => ts.map(t => t.textContent));
    if (titles.some(t => t.startsWith("Sony"))) break;
    await page.click("#chooseA");
  }
  const shown = await page.evaluate(() => ["#optA", "#optB"].map(s => {
    const el = document.querySelector(s + " .body");
    const side = s.slice(-1);
    return { title: el.querySelector(".txt").textContent, img: el.querySelectorAll("img").length, video: el.querySelectorAll("video").length,
             link: !document.querySelector("#link" + side).classList.contains("hide") };
  }));
  console.log("[check] cards:", JSON.stringify(shown));
  const rich = shown.find(c => c.title.startsWith("Sony"));
  const plain = shown.find(c => c.title === "Cold brew");
  // .jpg/.svg must route to <img>, .mp4 to <video> — that is the new media routing.
  if (rich && !(rich.img === 1 && rich.video === 1 && rich.link))
    throw new Error("[check] FAILED — want 1 img + 1 video + link, got " + JSON.stringify(rich));
  if (plain && (plain.img || plain.video || plain.link)) throw new Error("[check] FAILED — plain card grew chrome");

  // Element present isn't enough — assert the bitmap actually decoded and has size.
  const painted = await page.evaluate(async () => {
    const img = document.querySelector(".opt img");
    await img.decode().catch(() => {});
    return { w: img.naturalWidth, h: img.naturalHeight, box: img.getBoundingClientRect().height };
  });
  console.log("[check] image painted:", JSON.stringify(painted));
  if (!painted.w || !painted.box) throw new Error("[check] FAILED — image did not paint: " + JSON.stringify(painted));
  await shot("rich");

  // ── part 3: remove and restore ──
  const SMALL = [5, 3, 1, 6, 2, 4];
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await restart(page, SMALL.map(String));

  // Remove whatever is on the left of the very first comparison.
  const dropped = await page.$eval("#optA .txt", el => el.textContent);
  await page.click("#rmA");   // the remove control is now a sibling of the card, not a child
  // Removing must not also have cast a vote for it.
  if (await page.$eval("#compare", el => el.classList.contains("hide")))
    throw new Error("[check] FAILED — remove ended the compare screen");
  await solve(page);

  const afterRemove = await results(page);
  const parked = await page.$$eval("#benchList li .item", ls => ls.map(l => l.textContent));
  console.log("[check] removed", dropped, "→ ranked:", afterRemove.join(","), "| parked:", parked.join(","));
  if (afterRemove.includes(dropped)) throw new Error("[check] FAILED — removed item still ranked: " + dropped);
  if (!parked.includes(dropped)) throw new Error("[check] FAILED — removed item not parked: " + dropped);
  if (afterRemove.join(",") !== SMALL.filter(n => String(n) !== dropped).sort((x, y) => x - y).join(","))
    throw new Error("[check] FAILED — rest not sorted: " + afterRemove.join(","));
  await shot("removed");

  // Restore it and confirm it rejoins the ranking.
  await page.$eval("#benchDetails", el => el.open = true);
  await page.click("#benchList button.subin");
  await solve(page);
  const afterRestore = await results(page);
  console.log("[check] restored → ranked:", afterRestore.join(","));
  if (afterRestore.join(",") !== [...SMALL].sort((x, y) => x - y).join(","))
    throw new Error("[check] FAILED — restore did not rejoin: " + afterRestore.join(","));

  // ── part 4: a corrupt `benched` entry must not throw away the session ──
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem("pairwise-sorter/v4"));
    db.lists[db.current].benched = [null, 999, "no-such-item"];   // junk of every shape
    db.lists[db.current].log.push(["bogus-key-with-no-items", 1]);
    localStorage.setItem("pairwise-sorter/v4", JSON.stringify(db));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  const resumed = await page.evaluate(() =>
    ["setup", "compare", "done"].find(s => !document.querySelector("#" + s).classList.contains("hide")));
  console.log("[check] resumed after corrupt benched[]:", resumed);
  if (resumed === "setup") throw new Error("[check] FAILED — corrupt benched[] dropped the session");
  const cleaned = await page.evaluate(() =>
    window.pairwiseSorter.comparisons().every(c => c.a?.title !== undefined && c.b?.title !== undefined));
  console.log("[check] malformed log entry dropped on load:", cleaned);
  if (!cleaned) throw new Error("[check] FAILED — malformed log entry survived load");

  // ── part 5: editing the list must not invalidate answers ──
  const SIX = [4, 1, 6, 2, 5, 3];
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await restart(page, SIX.map(String));
  await solve(page);
  const baseline = await logLen(page);
  console.log("[check] baseline answers:", baseline);

  // Reorder every line AND append a new item. Reordering must cost nothing, and placing
  // one new item into a sorted 6 must take ~ceil(log2 7) = 3 questions, not a re-sort.
  await page.click("#edit2");
  await restart(page, [...SIX].reverse().concat(7).map(String));
  const afterEdit = await logLen(page);
  console.log("[check] after reorder + add:", afterEdit, "(was", baseline + ")");
  if (afterEdit !== baseline)
    throw new Error(`[check] FAILED — reorder/add lost answers: ${baseline} -> ${afterEdit}`);
  await solve(page);
  const askedToInsert = (await logLen(page)) - baseline;
  console.log("[check] questions to insert ONE new item into a sorted 6:", askedToInsert);
  if (askedToInsert > 3)
    throw new Error(`[check] FAILED — incremental insert cost ${askedToInsert}, want <= 3`);
  const withNew = await results(page);
  console.log("[check] ranked after add:", withNew.join(","));
  if (withNew.join(",") !== "1,2,3,4,5,6,7")
    throw new Error("[check] FAILED — wrong order after add: " + withNew.join(","));

  // Deleting an item should drop only the answers that mention it.
  const beforeDelete = await logLen(page);
  await page.click("#edit2");
  await restart(page, SIX.concat(7).filter(n => n !== 6).map(String));
  const afterDelete = await logLen(page);
  console.log("[check] after deleting one item:", afterDelete, "(was", beforeDelete + ")");
  if (afterDelete >= beforeDelete) throw new Error("[check] FAILED — delete dropped nothing");
  if (afterDelete === 0) throw new Error("[check] FAILED — delete wiped every answer");
  await solve(page);
  const afterDel = await results(page);
  if (afterDel.join(",") !== "1,2,3,4,5,7")
    throw new Error("[check] FAILED — wrong order after delete: " + afterDel.join(","));
  await shot("edited");

  // ── part 6: several lists coexist and survive a reload ──
  await page.click("#newList");
  await page.$eval("#listName", el => { el.value = "Second list"; el.dispatchEvent(new Event("input")); });
  await restart(page, ["30", "10", "20"]);
  await solve(page);
  const second = await results(page);
  if (second.join(",") !== "10,20,30") throw new Error("[check] FAILED — second list wrong: " + second.join(","));

  await page.reload({ waitUntil: "domcontentloaded" });
  const ids = await page.$$eval("#listPick option", os => os.map(o => ({ v: o.value, t: o.textContent })));
  console.log("[check] lists after reload:", JSON.stringify(ids));
  if (ids.length !== 2) throw new Error("[check] FAILED — expected 2 lists, got " + ids.length);
  if (!ids.some(o => o.t.startsWith("Second list"))) throw new Error("[check] FAILED — rename did not persist");

  // Switch back to the first list: it must show ITS ranking, with nothing re-asked.
  const firstId = ids.find(o => !o.t.startsWith("Second list")).v;
  const beforeSwitch = await logLen(page);
  await page.select("#listPick", firstId);
  const restored = await results(page);
  console.log("[check] switched back → ranked:", restored.join(","), "| second list answers kept:", beforeSwitch);
  if (restored.join(",") !== "1,2,3,4,5,7")
    throw new Error("[check] FAILED — first list did not restore: " + restored.join(","));
  if (await page.$eval("#done", el => el.classList.contains("hide")))
    throw new Error("[check] FAILED — switching lists re-asked comparisons instead of resuming");
  await shot("lists");

  // ── part 7: export / import round-trip ──
  // Falsifier: if the import lost the comparisons, the new list lands on the COMPARE
  // screen asking questions again instead of straight on the finished ranking.
  const exported = await page.evaluate(() => window.pairwiseSorter.exportJSON());
  console.log("[check] export:", exported.items.length, "items,", exported.comparisons.length,
              "comparisons, ranking:", exported.ranking.join(","));
  if (exported.format !== "pairwise-sorter/3") throw new Error("[check] FAILED — no format tag");
  if (!exported.comparisons.length) throw new Error("[check] FAILED — export carried no comparisons");
  if (!exported.comparisons.every(c => c.a?.title && c.b?.title && "verdict" in c))
    throw new Error("[check] FAILED — comparisons not in readable {a,b,verdict} form");

  const beforeImport = await page.$$eval("#listPick option", os => os.length);
  await page.click("#importBtn");
  await page.$eval("#importText", (el, v) => { el.value = v; }, JSON.stringify(exported));
  await page.click("#doImport");

  const afterImport = await page.$$eval("#listPick option", os => os.length);
  const landedOn = await page.evaluate(() =>
    ["setup", "compare", "done", "import"].find(s => !document.querySelector("#" + s).classList.contains("hide")));
  const importedRanking = await results(page);
  console.log("[check] imported → lists:", beforeImport, "->", afterImport, "| landed on:", landedOn,
              "| ranking:", importedRanking.join(","));
  if (afterImport !== beforeImport + 1) throw new Error("[check] FAILED — import did not add a list");
  if (landedOn !== "done")
    throw new Error("[check] FAILED — import lost comparisons; landed on " + landedOn);
  if (importedRanking.join(",") !== exported.ranking.join(","))
    throw new Error(`[check] FAILED — ranking changed: ${exported.ranking} -> ${importedRanking}`);

  // The original list must be untouched by the import.
  const orig = await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem("pairwise-sorter/v4"));
    return Object.values(db.lists).map(l => ({ n: l.name, i: l.items.length, c: l.log.length }));
  });
  console.log("[check] all lists after import:", JSON.stringify(orig));
  if (orig.length !== afterImport) throw new Error("[check] FAILED — storage/UI list count disagree");

  // Junk must fail loudly, not silently create a broken list.
  await page.click("#importBtn");
  await page.$eval("#importText", el => { el.value = '{"items":[{"title":"only one"}]}'; });
  await page.click("#doImport");
  const hint = await page.$eval("#importHint", el => el.textContent);
  const stillImport = await page.$eval("#import", el => !el.classList.contains("hide"));
  console.log("[check] bad import rejected:", JSON.stringify(hint));
  if (!stillImport || !hint.startsWith("Could not import"))
    throw new Error("[check] FAILED — bad payload was not rejected: " + hint);
  await page.click("#cancelImport");
  await shot("imported");

  // ── part 8: comparisons tab, and deleting a single answer ──
  // Falsifier: deleting an answer leaves the stored log length unchanged.
  await page.click("#tabComparisons");
  const rows = await page.$$eval("#cmpList li .item", ls => ls.map(l => l.textContent.trim()));
  const shownCount = await page.$eval("#cCmp", el => +el.textContent);
  const stored = await logLen(page);
  console.log("[check] comparisons tab:", rows.length, "rows, badge says", shownCount, ", stored", stored);
  console.log("[check] sample rows:", JSON.stringify(rows.slice(0, 3)));
  if (rows.length !== stored || shownCount !== stored)
    throw new Error(`[check] FAILED — tab/badge/store disagree: ${rows.length}/${shownCount}/${stored}`);
  if (!rows.every(r => /›|=/.test(r)))
    throw new Error("[check] FAILED — rows do not show a winner/tie marker: " + JSON.stringify(rows[0]));
  if (await page.$eval("#results", el => !el.classList.contains("hide")))
    throw new Error("[check] FAILED — ranking still visible on the comparisons tab");

  await page.click("#cmpList li button");          // delete the first recorded answer
  const afterDelete2 = await logLen(page);
  console.log("[check] after deleting one comparison:", stored, "->", afterDelete2);
  if (afterDelete2 !== stored - 1)
    throw new Error(`[check] FAILED — delete did not drop exactly one: ${stored} -> ${afterDelete2}`);

  // The sort now needs that pair again, so it must ask rather than invent an answer.
  const reAsked = await page.evaluate(() => !document.querySelector("#compare").classList.contains("hide"));
  console.log("[check] re-asked the deleted pair:", reAsked);
  await solve(page);
  const afterRedo = await results(page);
  if (afterRedo.join(",") !== "1,2,3,4,5,7")
    throw new Error("[check] FAILED — ranking broke after re-answering: " + afterRedo.join(","));
  await page.click("#tabComparisons");
  await shot("comparisons");

  // ── part 9: contradiction detection ──
  // A>B, B>C, C>A. Every comparison the sort needs is supplied, so nothing is asked and
  // the cycle must surface. Falsifier: no banner, or no row marked as conflicting.
  const t = (title) => ({ title, url: "" });
  await page.click("#importBtn");
  await page.$eval("#importText", (el, v) => { el.value = v; }, JSON.stringify({
    name: "Cycle", items: [t("A"), t("B"), t("C")],
    comparisons: [
      { a: t("A"), b: t("B"), verdict: -1 },   // A beats B
      { a: t("B"), b: t("C"), verdict: -1 },   // B beats C
      { a: t("C"), b: t("A"), verdict: -1 },   // ...and C beats A
    ],
  }));
  await page.click("#doImport");
  const banner = await page.evaluate(() => {
    const b = document.querySelector("#conflictBanner");
    return { hidden: b.classList.contains("hide"), text: b.textContent };
  });
  console.log("[check] cycle banner:", JSON.stringify(banner));
  if (banner.hidden) throw new Error("[check] FAILED — cycle not detected");
  await page.click("#tabComparisons");
  const flagged = await page.$$eval("#cmpList li.conflict .item", ls => ls.map(l => l.textContent.trim()));
  console.log("[check] rows flagged:", JSON.stringify(flagged));
  if (flagged.length !== 1) throw new Error("[check] FAILED — want exactly 1 flagged row, got " + flagged.length);
  await shot("conflict");

  // ── part 10: transitive ties ──
  // A=B and B=C recorded; A vs C never compared. All three must still share one rank.
  await page.click("#importBtn");
  await page.$eval("#importText", (el, v) => { el.value = v; }, JSON.stringify({
    name: "Chain", items: [t("A"), t("B"), t("C")],
    comparisons: [
      { a: t("A"), b: t("B"), verdict: 0 },
      { a: t("B"), b: t("C"), verdict: 0 },
    ],
  }));
  await page.click("#doImport");
  const ranks = await page.$$eval("#results li .rank", rs => rs.map(r => r.textContent));
  const noConflict = await page.$eval("#conflictBanner", b => b.classList.contains("hide"));
  const askedAC = await page.evaluate(() =>
    window.pairwiseSorter.comparisons().some(c =>
      [c.a.title, c.b.title].sort().join("") === "AC"));
  console.log("[check] tie chain ranks:", JSON.stringify(ranks), "| A vs C ever compared:", askedAC, "| clean:", noConflict);
  if (ranks.join(",") !== "1,=,=")
    throw new Error("[check] FAILED — chain did not share a rank: " + ranks.join(","));
  if (!noConflict) throw new Error("[check] FAILED — consistent ties reported as a conflict");

  // ── part 11: duplicates are merged loudly ──
  await page.click("#newList");
  await restart(page, ["Alpha", "Beta", "Alpha", "Gamma"]);
  const dupHint = await page.$eval("#setupHint", el => el.textContent);
  const itemCount = await page.evaluate(() => window.pairwiseSorter.state().items);
  console.log("[check] dedupe hint:", JSON.stringify(dupHint), "| items kept:", itemCount);
  if (itemCount !== 3) throw new Error("[check] FAILED — expected 3 items after dedupe, got " + itemCount);
  if (!/duplicate/i.test(dupHint) || !dupHint.includes("Alpha"))
    throw new Error("[check] FAILED — duplicate merged silently: " + JSON.stringify(dupHint));

  // ── part 12: the cards are real buttons ──
  const a11y = await page.evaluate(() => ({
    cardIsNotAButton: document.querySelector("#optA").getAttribute("role") === null,
    chooseIsRealButton: document.querySelector("#chooseA").tagName === "BUTTON",
    chooseLabel: document.querySelector("#chooseA").getAttribute("aria-label"),
    // remove/open must be SIBLINGS of the card, never nested inside it
    nestedInCard: document.querySelectorAll("#optA a, #optA .act").length,
    actsArePresent: !!document.querySelector("#rmA") && !!document.querySelector("#linkA"),
  }));
  console.log("[check] card a11y:", JSON.stringify(a11y));
  if (!a11y.cardIsNotAButton || !a11y.chooseIsRealButton || !a11y.chooseLabel || !a11y.actsArePresent)
    throw new Error("[check] FAILED — chooser structure wrong: " + JSON.stringify(a11y));
  if (a11y.nestedInCard !== 0) throw new Error("[check] FAILED — open/remove control nested inside the card");

  const beforeKey = await logLen(page);
  await page.focus("#chooseA");
  const focused = await page.evaluate(() => document.activeElement?.id);
  await page.keyboard.press("Enter");
  const afterKey = await logLen(page);
  console.log("[check] focus:", focused, "| Enter chose:", beforeKey, "->", afterKey);
  if (focused !== "chooseA") throw new Error("[check] FAILED — choose button not focusable, got " + focused);
  if (afterKey !== beforeKey + 1) throw new Error("[check] FAILED — Enter did not cast a vote");

  // ── part 13: clicking media inspects, never votes ──
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  const IMG = new URL("test.svg", page.url()).href;
  await restart(page, [`Alpha | ${IMG}`, `Beta | ${IMG}`, `Gamma | ${IMG}`]);
  const beforeImgClick = await logLen(page);
  await page.click(".opt img");
  const afterImgClick = await logLen(page);
  const lightboxOpen = await page.$eval("#lightbox", el => !el.classList.contains("hide"));
  console.log("[check] image click — answers:", beforeImgClick, "->", afterImgClick, "| lightbox:", lightboxOpen);
  if (afterImgClick !== beforeImgClick) throw new Error("[check] FAILED — clicking an image cast a vote");
  if (!lightboxOpen) throw new Error("[check] FAILED — clicking an image did not open the lightbox");
  await page.keyboard.press("Escape");
  if (await page.$eval("#lightbox", el => !el.classList.contains("hide")))
    throw new Error("[check] FAILED — Escape did not close the lightbox");
  await shot("lightbox-closed");

  // ── part 14: pause out of the chooser, see partial order, resume ──
  await page.click("#chooseA");                      // answer one so something is placed
  const paused = await page.evaluate(async () => await window.pairwiseSorter.pause());
  const placedRows = await page.$$eval("#results li .item", ls => ls.map(l => l.textContent));
  const unplacedRows = await page.$$eval("#unplaced li .item", ls => ls.map(l => l.textContent));
  console.log("[check] paused:", JSON.stringify({ screen: paused.screen, paused: paused.paused, placed: placedRows, unplaced: unplacedRows }));
  if (!paused.paused || paused.screen !== "done") throw new Error("[check] FAILED — pause did not leave the chooser");
  if (!placedRows.length || !unplacedRows.length)
    throw new Error("[check] FAILED — partial view should show both placed and unplaced items");
  if (await page.$eval("#resume", el => el.classList.contains("hide")))
    throw new Error("[check] FAILED — no Resume button while paused");
  await shot("partial");

  const backToChooser = await page.evaluate(async () => await window.pairwiseSorter.resume());
  if (backToChooser.screen !== "compare" || backToChooser.paused)
    throw new Error("[check] FAILED — resume did not return to the chooser");
  // Pausing must not have lost the question that was open.
  if (!backToChooser.pending) throw new Error("[check] FAILED — the pending question was lost across pause/resume");
  await solve(page);

  // ── part 15: the API covers every UI behaviour ──
  const api = await page.evaluate(() => Object.keys(window.pairwiseSorter));
  const REQUIRED = ["help", "state", "ranking", "comparisons", "conflicts", "lists",
    "newList", "openList", "renameList", "deleteList",
    "load", "addItems", "setItemsText", "removeItem", "restoreItem",
    "answer", "undo", "deleteComparison", "resetAnswers",
    "pause", "resume", "goto", "tab", "exportJSON", "importJSON",
    "bench", "subIn", "subAll", "editItem", "tag", "untag",
    "priority", "setPriority", "combineBy", "overrides", "dropOverrides", "search",
    "placement", "resolve", "schema", "benchMany",
    "expand", "expandAll", "collapseAll"];
  const missing = REQUIRED.filter(k => !api.includes(k));
  console.log("[check] API surface:", api.length, "methods | missing:", JSON.stringify(missing));
  if (missing.length) throw new Error("[check] FAILED — API missing: " + missing.join(", "));

  const help = await page.evaluate(() => window.pairwiseSorter.help());
  const undocumented = REQUIRED.filter(k => !help.includes(k + "("));
  if (undocumented.length) throw new Error("[check] FAILED — help() omits: " + undocumented.join(", "));

  // Drive a whole session through the API alone — no clicking.
  const flow = await page.evaluate(async () => {
    const P = window.pairwiseSorter;
    const out = {};
    out.created = (await P.newList("API list")).list;
    await P.load([{ title: "one" }, { title: "two" }, { title: "three" }]);
    out.loaded = P.state().items;
    while (P.state().pending) {
      const { a, b } = P.state().pending;
      await P.answer(a.title.length <= b.title.length ? "a" : "b");
    }
    out.ranking = P.ranking().map(r => r.title);
    out.comparisons = P.comparisons().length;
    await P.addItems([{ title: "four" }]);
    out.afterAdd = P.state().items;
    while (P.state().pending) await P.answer("a");
    await P.removeItem("four");
    out.afterRemove = P.state().benched;
    await P.restoreItem("four");
    while (P.state().pending) await P.answer("a");
    out.renamed = (await P.renameList("API renamed")).list;
    out.exported = P.exportJSON().items.length;
    out.tabbed = (await P.tab("comparisons")).screen;
    await P.tab("ranking");
    out.lists = P.lists().length;
    await P.undo(); out.undone = P.state().answered;
    return out;
  });
  console.log("[check] API-only session:", JSON.stringify(flow));
  if (flow.created !== "API list") throw new Error("[check] FAILED — newList(name) did not name the list");
  if (flow.loaded !== 3 || flow.afterAdd !== 4) throw new Error("[check] FAILED — load/addItems wrong: " + JSON.stringify(flow));
  if (!flow.afterRemove.includes("four")) throw new Error("[check] FAILED — removeItem did not park it");
  if (flow.renamed !== "API renamed") throw new Error("[check] FAILED — renameList did not apply");
  if (flow.exported !== 4) throw new Error("[check] FAILED — exportJSON lost items");
  await shot("api");

  // ── part 16: duplicate list names must not silently act on the wrong list ──
  // Falsifier: deleteList("Dup") "succeeds" while a list named Dup is still present.
  const dup = await page.evaluate(async () => {
    const P = window.pairwiseSorter;
    await P.newList("Dup");
    await P.load([{ title: "p" }, { title: "q" }]);
    await P.newList("Dup");                       // same name on purpose
    await P.load([{ title: "r" }, { title: "s" }]);
    const named = P.lists().filter(l => l.name === "Dup");
    let deleteErr = null, openErr = null;
    try { await P.deleteList("Dup"); } catch (e) { deleteErr = e.message; }
    try { await P.openList("Dup"); } catch (e) { openErr = e.message; }
    // An id must still work, and must remove exactly one.
    const before = P.lists().length;
    await P.deleteList(named[0].id);
    return { count: named.length, ids: named.map(l => l.id), deleteErr, openErr,
             removedExactlyOne: before - P.lists().length === 1,
             stillNamedDup: P.lists().filter(l => l.name === "Dup").length };
  });
  console.log("[check] duplicate names:", JSON.stringify(dup));
  if (dup.count !== 2) throw new Error("[check] FAILED — could not create two lists with one name");
  if (!dup.deleteErr || !/lists are named/.test(dup.deleteErr))
    throw new Error("[check] FAILED — ambiguous deleteList did not refuse: " + dup.deleteErr);
  if (!dup.openErr) throw new Error("[check] FAILED — ambiguous openList did not refuse");
  if (!dup.removedExactlyOne || dup.stillNamedDup !== 1)
    throw new Error("[check] FAILED — deleting by id removed the wrong number: " + JSON.stringify(dup));

  // ── part 17: lightbox fills the screen, arrows navigate and never vote ──
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  const IMG2 = new URL("test.svg", page.url()).href;
  await restart(page, [
    `Tall | ${IMG2} | ${IMG2}?b`,          // two images on one card
    `Short | ${IMG2}?c`,
    `NoPicture | this one has a much longer description than the other cards do`,
  ]);
  await page.click(".opt img");
  const lb = await page.evaluate(() => {
    const img = document.querySelector("#lightboxImg");
    const r = img.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), natural: img.naturalWidth,
             vw: innerWidth, vh: innerHeight, count: document.querySelector("#lightboxCount").textContent,
             navShown: !document.querySelector("#lightboxNext").classList.contains("hide") };
  });
  console.log("[check] lightbox:", JSON.stringify(lb));
  // It must SCALE UP past the image's natural size, i.e. actually fill the screen.
  if (lb.w <= lb.natural) throw new Error("[check] FAILED — lightbox did not enlarge: " + JSON.stringify(lb));
  if (lb.w < lb.vw * 0.5 && lb.h < lb.vh * 0.5)
    throw new Error("[check] FAILED — lightbox does not fill the screen: " + JSON.stringify(lb));
  if (!lb.navShown || !/\d+ \/ \d+/.test(lb.count))
    throw new Error("[check] FAILED — no gallery navigation for multiple images: " + JSON.stringify(lb));

  const beforeArrows = await logLen(page);
  const shot1 = await page.$eval("#lightboxImg", el => el.src);
  await page.keyboard.press("ArrowRight");
  const shot2 = await page.$eval("#lightboxImg", el => el.src);
  await page.keyboard.press("ArrowLeft");
  const back = await page.$eval("#lightboxImg", el => el.src);
  const afterArrows = await logLen(page);
  console.log("[check] arrows stepped:", shot1 !== shot2, "| wrapped back:", shot1 === back,
              "| votes cast:", afterArrows - beforeArrows);
  if (shot1 === shot2) throw new Error("[check] FAILED — ArrowRight did not change image");
  if (shot1 !== back) throw new Error("[check] FAILED — ArrowLeft did not step back");
  if (afterArrows !== beforeArrows) throw new Error("[check] FAILED — arrows voted while the lightbox was open");
  await shot("lightbox");
  await page.keyboard.press("Escape");

  // ── part 19: both Choose buttons share a baseline despite unequal content ──
  const baselines = await page.evaluate(() => ["#chooseA", "#chooseB"]
    .map(s => Math.round(document.querySelector(s).getBoundingClientRect().bottom)));
  console.log("[check] choose-button baselines:", JSON.stringify(baselines));
  if (Math.abs(baselines[0] - baselines[1]) > 1)
    throw new Error("[check] FAILED — Choose buttons not aligned: " + JSON.stringify(baselines));

  // ── part 18: editing answers from the paused view keeps you there ──
  await page.click("#chooseA");                       // record something to delete
  await page.evaluate(async () => await window.pairwiseSorter.pause());
  await page.click("#tabComparisons");
  const onCmpTab = await page.$eval("#cmpList", el => !el.classList.contains("hide"));
  await page.click("#cmpList li button");             // delete a comparison from the paused view
  const after = await page.evaluate(() => ({
    screen: window.pairwiseSorter.state().screen,
    paused: window.pairwiseSorter.state().paused,
    onComparisons: !document.querySelector("#cmpList").classList.contains("hide"),
  }));
  console.log("[check] delete while paused — was on cmp tab:", onCmpTab, "| after:", JSON.stringify(after));
  if (after.screen !== "done" || !after.paused)
    throw new Error("[check] FAILED — deleting a comparison snapped back to the chooser: " + JSON.stringify(after));
  if (!after.onComparisons)
    throw new Error("[check] FAILED — deleting a comparison lost the comparisons tab");
  await shot("paused-edit");

  // ── part 20: media paging — at most two rows per card, carousel for the rest ──
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  const M = new URL("test.svg", page.url()).href;
  const many = Array.from({ length: 7 }, (_, i) => `${M}?${i}`);
  await page.evaluate(async (media) => {
    const P = window.pairwiseSorter;
    await P.load([{ title: "Loaded", media }, { title: "Plain" }, { title: "Third" }]);
  }, many);

  const paging = await page.evaluate(() => {
    const card = [...document.querySelectorAll(".opt")].find(c => c.querySelector(".medianav"));
    if (!card) return null;
    return {
      shown: card.querySelectorAll(".media img").length,
      label: card.querySelector(".medianav span").textContent.trim(),
      cols: getComputedStyle(card.querySelector(".media")).gridTemplateColumns.split(" ").length,
    };
  });
  console.log("[check] media paging:", JSON.stringify(paging));
  if (!paging) throw new Error("[check] FAILED — 7 images produced no carousel");
  if (paging.shown > 4) throw new Error("[check] FAILED — more than two rows shown: " + paging.shown);
  if (paging.cols !== 2) throw new Error("[check] FAILED — expected a 2-column grid, got " + paging.cols);
  if (paging.label !== "1 / 2") throw new Error("[check] FAILED — wrong page label: " + paging.label);

  const firstPage = await page.$$eval(".media img", is => is.map(i => i.src).join(","));
  await page.click(".mnext");
  const secondPage = await page.$$eval(".media img", is => is.map(i => i.src).join(","));
  const label2 = await page.$eval(".medianav span", el => el.textContent.trim());
  console.log("[check] paged to:", label2, "| changed:", firstPage !== secondPage);
  if (firstPage === secondPage) throw new Error("[check] FAILED — carousel did not advance");
  if (label2 !== "2 / 2") throw new Error("[check] FAILED — page label did not advance: " + label2);

  // The lightbox must still offer every image, including ones paged out of view.
  await page.click(".media img");
  const galleryCount = await page.$eval("#lightboxCount", el => el.textContent.trim());
  console.log("[check] lightbox gallery across paged media:", galleryCount);
  if (galleryCount !== "5 / 7" && !/\/ 7$/.test(galleryCount))
    throw new Error("[check] FAILED — lightbox gallery missed paged-out images: " + galleryCount);
  await page.keyboard.press("Escape");
  await shot("media-paging");

  // ── part 21: tiers answer cross-tier pairs instead of asking them ──
  // Falsifier: if a cross-tier pair were ever put on screen, the answer count would
  // exceed the two within-tier questions, and `mixed` would be non-empty.
  const tiers = await page.evaluate(async () => {
    const P = window.pairwiseSorter;
    await P.newList("Tiers");
    await P.load([{ title: "g1", tags: ["gameplay"] }, { title: "v1", tags: ["visual"] },
                  { title: "g2", tags: ["gameplay"] }, { title: "v2", tags: ["visual"] }]);
    await P.setPriority(["gameplay", "visual"]);
    const mixed = [];
    while (P.state().pending) {
      const { a, b } = P.state().pending;
      // Record any pair that straddles the divide — there must never be one.
      if (a.tags[0] !== b.tags[0]) mixed.push(a.title + " vs " + b.title);
      await P.answer("a");
    }
    return { mixed, answered: P.state().answered, budget: P.state().estimatedTotal,
             ranking: P.ranking().map(r => r.title), stored: P.exportJSON().comparisons.length };
  });
  console.log("[check] tiers:", JSON.stringify(tiers));
  if (tiers.mixed.length)
    throw new Error("[check] FAILED — asked across the divide: " + tiers.mixed.join(", "));
  if (tiers.ranking.slice(0, 2).some(t => t.startsWith("v")))
    throw new Error("[check] FAILED — a visual item outranked a gameplay one: " + tiers.ranking.join(","));
  // Synthesised verdicts must never reach the log — only the two real answers are stored.
  if (tiers.stored !== 2)
    throw new Error("[check] FAILED — synthesised verdicts leaked into the log: " + tiers.stored);
  if (tiers.budget !== 2)
    throw new Error("[check] FAILED — budget ignored the tiers: " + tiers.budget);

  const rule = await page.$$eval("#results li.tierrule", ls => ls.map(l => l.textContent));
  console.log("[check] tier dividers:", JSON.stringify(rule));
  if (rule.join(",") !== "#gameplay,#visual")
    throw new Error("[check] FAILED — dividers wrong or missing: " + rule.join(","));
  await shot("tiers");

  // ── part 22: your own answer beats the tier order ──
  // Falsifier: if tiers overrode answers, `first` would be the high-tier item and
  // overrides would be empty.
  const override = await page.evaluate(async () => {
    const P = window.pairwiseSorter;
    await P.newList("Override");
    await P.load([{ title: "lo1", tags: ["lo"] }, { title: "hi1", tags: ["hi"] },
                  { title: "lo2", tags: ["lo"] }, { title: "hi2", tags: ["hi"] }]);
    // Tiers OFF, so every pair is asked. Always pick the "lo" side, contradicting the
    // tier order we are about to declare.
    while (P.state().pending) {
      const { a } = P.state().pending;
      await P.answer(a.tags[0] === "lo" ? "a" : "b");
    }
    await P.setPriority(["hi", "lo"]);
    const withOverrides = { first: P.ranking()[0].title, count: P.state().tierOverrides };
    await P.dropOverrides();
    return { withOverrides, dropped: { first: P.ranking()[0].title, count: P.state().tierOverrides } };
  });
  console.log("[check] override:", JSON.stringify(override));
  if (!override.withOverrides.count || !override.withOverrides.first.startsWith("lo"))
    throw new Error("[check] FAILED — tier order overrode a real answer: " + JSON.stringify(override));
  if (override.dropped.count !== 0 || !override.dropped.first.startsWith("hi"))
    throw new Error("[check] FAILED — dropOverrides did not hand the pairs back to the tiers: "
      + JSON.stringify(override));

  // ── part 23: renaming an item carries its answers across ──
  // "b" sorts BEFORE "m" and "z" sorts AFTER it, so this rename flips the pair key's
  // order — the verdict has to be negated with it. Falsifier: without that negation the
  // renamed item lands below "m" instead of above it, and the answer count drops.
  const renamed = await page.evaluate(async () => {
    const P = window.pairwiseSorter;
    await P.newList("Rename");
    await P.load([{ title: "b" }, { title: "m" }]);
    while (P.state().pending) {
      const { a } = P.state().pending;
      await P.answer(a.title === "b" ? "a" : "b");     // b beats m, however they are shown
    }
    const before = { ranking: P.ranking().map(r => r.title), answered: P.state().answered };
    await P.editItem("b", { title: "z" });
    return { before, after: { ranking: P.ranking().map(r => r.title), answered: P.state().answered,
                              pending: !!P.state().pending } };
  });
  console.log("[check] rename:", JSON.stringify(renamed));
  if (renamed.after.answered !== renamed.before.answered)
    throw new Error("[check] FAILED — rename orphaned answers: " + JSON.stringify(renamed));
  if (renamed.after.pending)
    throw new Error("[check] FAILED — rename made the sort re-ask a decided pair");
  if (renamed.after.ranking.join(",") !== "z,m")
    throw new Error("[check] FAILED — rename inverted the verdict: " + renamed.after.ranking.join(","));

  const collide = await page.evaluate(async () => {
    try { await window.pairwiseSorter.editItem("m", { title: "z" }); return null; }
    catch (e) { return e.message; }
  });
  console.log("[check] rename onto an existing item:", JSON.stringify(collide));
  if (!collide || !/already has that title/.test(collide))
    throw new Error("[check] FAILED — a colliding rename was allowed to merge two histories");

  // ── part 24: search filters the view and nothing else ──
  // Falsifier: if search touched the sort, `answered` would move or the ranking would
  // shrink; if it filtered the textarea, Save would stay enabled and eat the hidden lines.
  const search = await page.evaluate(async () => {
    const P = window.pairwiseSorter;
    await P.newList("Search");
    await P.load([{ title: "apple pie" }, { title: "banana" }, { title: "apple tart" }]);
    while (P.state().pending) await P.answer("a");
    const before = { answered: P.state().answered, ranks: P.ranking().length };
    await P.search("apple");
    const vis = () => [...document.querySelectorAll("#results li")]
      .filter(li => !li.classList.contains("hide") && !li.classList.contains("tierrule")).length;
    const filtered = { shown: vis(), answered: P.state().answered, ranks: P.ranking().length,
                       count: document.querySelector("#searchDoneCount").textContent };
    await P.goto("setup");
    const setup = { saveDisabled: document.querySelector("#start").disabled,
                    saveLabel: document.querySelector("#start").textContent,
                    textareaHidden: document.querySelector("#input").classList.contains("hide"),
                    listed: document.querySelectorAll("#editFiltered li").length };
    return { before, filtered, setup };
  });
  await shot("search");                     // the filtered edit view, save locked out
  const cleared = await page.evaluate(async () => {
    await window.pairwiseSorter.search("");
    return { shown: [...document.querySelectorAll("#results li")]
               .filter(li => !li.classList.contains("hide") && !li.classList.contains("tierrule")).length,
             saveDisabled: document.querySelector("#start").disabled };
  });
  search.cleared = cleared;
  console.log("[check] search:", JSON.stringify(search));
  if (search.filtered.shown !== 2 || search.filtered.ranks !== search.before.ranks)
    throw new Error("[check] FAILED — search changed the ranking itself: " + JSON.stringify(search));
  if (search.filtered.answered !== search.before.answered)
    throw new Error("[check] FAILED — search changed the answers");
  if (!/showing 2 of 3/.test(search.filtered.count))
    throw new Error("[check] FAILED — no 'showing N of M', so a filtered list reads as a short one");
  if (!search.setup.saveDisabled || !search.setup.textareaHidden || search.setup.listed !== 2)
    throw new Error("[check] FAILED — filtered edit view can still be saved: " + JSON.stringify(search.setup));
  if (search.cleared.shown !== 3 || search.cleared.saveDisabled)
    throw new Error("[check] FAILED — clearing the filter did not restore the view");

  // ── part 25: editing mid-duel keeps your place ──
  // Falsifier: if the editor restarted the sort, `pending` would be rebuilt and the
  // answer count or the pair on screen could move under you.
  const before25 = await page.evaluate(async () => {
    const P = window.pairwiseSorter;
    await P.newList("MidDuel");
    // All three carry #alpha, so the assertion below holds whichever one lands on card A.
    await P.load(["one", "two", "three"].map(title => ({ title, tags: ["alpha"] })));
    const p = P.state().pending;
    return [p.a.title, p.b.title];
  });
  await page.click("#edA");                          // the card's own edit control
  await page.type("#edDesc", "edited in place");
  await page.type("#edTagInput", "beta, gamma");     // commas split, so this adds two
  await page.click("#edTagAdd");
  await page.click("#edMediaAdd");
  await shot("editor");                              // the form itself, mid-edit
  const midDuel = await page.evaluate(async (before) => {
    const P = window.pairwiseSorter;
    const open = document.querySelector("#editor").open;
    const chips = [...document.querySelectorAll("#edTagChips .tag")].map(c => c.textContent.replace("×", ""));
    const rows = document.querySelectorAll("#edMediaRows .mrow").length;
    document.querySelector("#editorForm").requestSubmit();
    await new Promise(r => setTimeout(r, 0));
    return { open, chips, rows, before,
             after: [P.state().pending?.a.title, P.state().pending?.b.title],
             screen: P.state().screen, answered: P.state().answered,
             onCard: document.querySelector("#optA .desc")?.textContent ?? null };
  }, before25);
  console.log("[check] mid-duel edit:", JSON.stringify(midDuel));
  if (!midDuel.open) throw new Error("[check] FAILED — the card's edit control did not open the editor");
  if (midDuel.screen !== "compare" || midDuel.answered !== 0)
    throw new Error("[check] FAILED — editing cost an answer or left the chooser: " + JSON.stringify(midDuel));
  if (midDuel.before.join(",") !== midDuel.after.join(","))
    throw new Error("[check] FAILED — the pair changed under the edit: " + JSON.stringify(midDuel));
  if (midDuel.onCard !== "edited in place")
    throw new Error("[check] FAILED — the edit did not reach the card: " + midDuel.onCard);
  // A comma-separated paste is two tags, not one, and it keeps the tag the item arrived with.
  if (midDuel.chips.join(",") !== "#alpha,#beta,#gamma")
    throw new Error("[check] FAILED — tag chips wrong: " + midDuel.chips.join(","));
  if (midDuel.rows !== 1) throw new Error("[check] FAILED — media row not added: " + midDuel.rows);

  // ── part 26: resetting answers must leave the bench alone ──
  // Falsifier: if reset also cleared the bench, `benched` comes back empty and the benched
  // item reappears in the ranking.
  const bench = await page.evaluate(async () => {
    const P = window.pairwiseSorter;
    await P.newList("Bench");
    await P.load(["a", "b", "c"]);
    while (P.state().pending) await P.answer("a");
    await P.bench("b");
    while (P.state().pending) await P.answer("a");
    await P.resetAnswers();
    while (P.state().pending) await P.answer("a");
    const after = { benched: P.state().benched, ranking: P.ranking().map(r => r.title) };
    await P.subAll();
    while (P.state().pending) await P.answer("a");
    return { after, subbed: { benched: P.state().benched, n: P.ranking().length } };
  });
  console.log("[check] bench vs reset:", JSON.stringify(bench));
  if (bench.after.benched.join(",") !== "b")
    throw new Error("[check] FAILED — reset emptied the bench: " + JSON.stringify(bench.after));
  if (bench.after.ranking.includes("b"))
    throw new Error("[check] FAILED — a benched item rejoined the ranking on reset");
  if (bench.subbed.benched.length !== 0 || bench.subbed.n !== 3)
    throw new Error("[check] FAILED — subAll did not empty the bench: " + JSON.stringify(bench.subbed));

  // ── part 27: a tag can never contain whitespace ──
  // Falsifier: without hyphenation "open world" survives load but the next text round-trip
  // turns it into DESCRIPTION text, taking any tier built on it down with it.
  const tagws = await page.evaluate(async () => {
    const P = window.pairwiseSorter;
    await P.newList("TagWS");
    await P.load([{ title: "a", tags: ["open world"] }, { title: "b", tags: ["  #spaced  "] }]);
    const afterLoad = P.exportJSON().items.map(i => i.tags.join("|"));
    await P.setItemsText(P.exportJSON().items
      .map(i => [i.title, ...i.tags.map(t => "#" + t)].join(" | ")).join("\n"));
    return { afterLoad, afterRoundTrip: P.exportJSON().items.map(i => i.tags.join("|")),
             descs: P.exportJSON().items.map(i => i.desc) };
  });
  console.log("[check] whitespace tags:", JSON.stringify(tagws));
  if (tagws.afterLoad.join(",") !== "open-world,spaced")
    throw new Error("[check] FAILED — tag not hyphenated on entry: " + JSON.stringify(tagws.afterLoad));
  if (tagws.afterRoundTrip.join(",") !== "open-world,spaced")
    throw new Error("[check] FAILED — tag lost in the text round-trip: " + JSON.stringify(tagws));
  if (tagws.descs.some(Boolean))
    throw new Error("[check] FAILED — a tag leaked into the description: " + JSON.stringify(tagws.descs));

  // ── part 28: weights let a lower tier's best beat a higher tier's worst ──
  // Falsifier: under strict order every #hi item outranks every #lo one no matter what, so
  // if weights were inert `even` would equal `strict`.
  const weighted = await page.evaluate(async () => {
    const P = window.pairwiseSorter;
    await P.newList("Weights");
    await P.load([
      { title: "hi1", tags: ["hi"] }, { title: "hi2", tags: ["hi"] }, { title: "hi3", tags: ["hi"] },
      { title: "lo1", tags: ["lo"] }, { title: "lo2", tags: ["lo"] },
    ]);
    await P.setPriority(["hi", "lo"]);
    while (P.state().pending) await P.answer("a");
    const strict = P.ranking().map(r => r.title);
    await P.combineBy("weights");
    await P.setPriority([{ tag: "hi", weight: 10 }, { tag: "lo", weight: 1 }]);
    const lopsided = P.ranking().map(r => r.title);
    await P.setPriority([{ tag: "hi", weight: 1 }, { tag: "lo", weight: 1 }]);
    const even = P.ranking().map(r => r.title);
    const rules = () => [...document.querySelectorAll("#results li.tierrule")].length;
    document.querySelector("#tierPanel").open = true;
    return { strict, lopsided, even, mode: P.state().combine, weightedRules: rules() };
  });
  await shot("weights");                       // the tier panel, in weights mode, open
  weighted.strictRules = await page.evaluate(async () => {
    await window.pairwiseSorter.combineBy("order");
    return [...document.querySelectorAll("#results li.tierrule")].length;
  });
  console.log("[check] weights:", JSON.stringify(weighted));
  if (weighted.strict.slice(0, 3).some(t => t.startsWith("lo")))
    throw new Error("[check] FAILED — strict mode let a lo item up: " + weighted.strict.join(","));
  if (weighted.lopsided.join(",") !== weighted.strict.join(","))
    throw new Error("[check] FAILED — 10:1 should still keep hi on top: " + weighted.lopsided.join(","));
  if (weighted.even.join(",") === weighted.strict.join(","))
    throw new Error("[check] FAILED — equal weights changed nothing, so weights are inert");
  // The point of weights: at parity, lo's LEADER outranks hi's TAIL — impossible in strict mode.
  if (weighted.even.indexOf("lo2") > weighted.even.indexOf("hi1"))
    throw new Error("[check] FAILED — lo's leader never crossed hi's tail: " + weighted.even.join(","));
  // Dividers mark a real block boundary, so they belong to strict mode only. Under
  // weights the tiers interleave and a rule per change would be pure noise.
  if (weighted.weightedRules !== 0)
    throw new Error("[check] FAILED — tier dividers drawn over an interleaved list: "
      + weighted.weightedRules);
  if (weighted.strictRules !== 2)
    throw new Error("[check] FAILED — strict mode lost its dividers: " + weighted.strictRules);


  // ── part 29: resolve minimises contradicted answers ──
  // Falsifier: if the reorder were a no-op, `after` would not fall below `before`.
  // Imported rather than clicked: the sort never ASKS a pair transitivity already
  // implies, so a cycle can only be supplied whole, exactly as part 9 does it.
  const resolved = await page.evaluate(async () => {
    const P = window.pairwiseSorter;
    const t = title => ({ title, url: "" });
    await P.importJSON({
      name: "Resolve", items: [t("A"), t("B"), t("C"), t("D")],
      comparisons: [
        { a: t("A"), b: t("B"), verdict: -1 },   // A beats B
        { a: t("B"), b: t("C"), verdict: -1 },   // B beats C
        { a: t("C"), b: t("A"), verdict: -1 },   // ...and C beats A — irreducible 3-cycle
        { a: t("A"), b: t("D"), verdict: -1 },
        { a: t("B"), b: t("D"), verdict: -1 },
        { a: t("C"), b: t("D"), verdict: -1 },   // D loses to everyone: unambiguously last
      ],
    });
    while (P.state().pending) await P.answer("a");
    const before = P.state().conflicts;
    const r = P.resolve();
    return { before, r, after: P.state().conflicts, last: P.ranking().slice(-1)[0].title };
  });
  console.log("[check] resolve:", JSON.stringify(resolved));
  if (!resolved.before)
    throw new Error("[check] FAILED — the cycle was never detected, so resolve proves nothing");
  if (resolved.r.after > resolved.r.before)
    throw new Error("[check] FAILED — resolve made the order worse: " + JSON.stringify(resolved.r));
  // A 3-cycle is irreducible: exactly one answer must stay contradicted, never zero. If
  // resolve ever reports 0 here it is lying about what it achieved.
  if (resolved.after !== 1)
    throw new Error("[check] FAILED — a 3-cycle must leave exactly 1 contradiction, got "
      + resolved.after);
  // The cycle is unresolvable, but D's position is not — a good order still puts it last.
  if (resolved.last !== "D")
    throw new Error("[check] FAILED — resolve mangled the unambiguous part: last is " + resolved.last);

  // ── part 30: stopping early keeps the placed items, in their final order ──
  // This is the claim the "you can stop here" nudge makes, so it has to be true. The
  // falsifier is the whole point: if binary insertion ever REORDERED already-placed
  // items, an early snapshot would not be a prefix-consistent subsequence of the final
  // ranking, and stopping early would quietly corrupt what you kept.
  const stop = await page.evaluate(async () => {
    const P = window.pairwiseSorter;
    await P.newList("Stop");
    await P.load(["5", "3", "8", "1", "7", "2", "6", "4"]);
    const first = P.placement();
    let snapshot = null, atStop = null;
    while (P.state().pending) {
      const { a, b } = P.state().pending;
      await P.answer(+a.title < +b.title ? "a" : "b");
      const at = P.placement();
      // Grab the partial order the moment the nudge would appear.
      if (!snapshot && at.pct >= 50 && at.placed > 2) {
        await P.pause();
        snapshot = P.ranking().map(r => r.title);
        atStop = at;
        await P.resume();
      }
    }
    return { first, snapshot, atStop, final: P.ranking().map(r => r.title), end: P.placement() };
  });
  console.log("[check] stop-early:", JSON.stringify(stop));
  // The very first item is placed for free — there is nothing to compare it against yet.
  if (stop.first.placed > 1 || stop.end.pct !== 100)
    throw new Error("[check] FAILED — placement did not climb to 100%: " + JSON.stringify(stop));
  if (!stop.snapshot || stop.snapshot.length < 3)
    throw new Error("[check] FAILED — never captured a partial ranking to check");
  // The kept items must appear in the SAME relative order in the finished ranking.
  const projected = stop.final.filter(t => stop.snapshot.includes(t));
  if (projected.join(",") !== stop.snapshot.join(","))
    throw new Error("[check] FAILED — placed items were reordered later, so stopping early "
      + `would have corrupted them: kept ${stop.snapshot.join(",")} but they ended up `
      + projected.join(","));

  // ── part 31: a list stored before a field existed must still open ──
  // Storage is the only source of items that never passed through item(). A list saved
  // by an older build has no `tags`, and both `toText` and `render` spread `.media` and
  // read `.tags` unguarded — so the page rendered BLANK on a TypeError while the data
  // sat intact underneath. Falsifier: any of these three shapes leaves the textarea or
  // the cards empty, or puts a TypeError on the console.
  const legacyErrors = [];
  const onError = e => legacyErrors.push(String(e.message ?? e).split("\n")[0]);
  page.on("pageerror", onError);
  const legacy = [];
  for (const [label, items] of [
    ["no-tags",  [{ title: "a", url: "", media: [], desc: "" },
                  { title: "b", url: "", media: [], desc: "" }]],
    ["no-media", [{ title: "c", url: "", desc: "", tags: [] },
                  { title: "d", url: "", desc: "", tags: [] }]],
    ["bare",     [{ title: "e" }, { title: "f" }]],
  ]) {
    await page.evaluate((rows) => localStorage.setItem("pairwise-sorter/v4", JSON.stringify({
      current: "legacy",
      lists: { legacy: { name: "Legacy", log: [], removed: [], items: rows } },
    })), items);
    await page.reload({ waitUntil: "domcontentloaded" });
    legacy.push([label, await page.evaluate(() => ({
      text: document.querySelector("#input").value.replace(/\n/g, ","),
      picker: document.querySelectorAll("#listPick option").length,
      card: document.querySelector("#optA .txt")?.textContent ?? null,
      normalised: window.pairwiseSorter.exportJSON().items
        .every(i => Array.isArray(i.tags) && Array.isArray(i.media)),
    }))]);
  }
  page.off("pageerror", onError);
  console.log("[check] legacy lists:", JSON.stringify(legacy), "| errors:", JSON.stringify(legacyErrors));
  if (legacyErrors.length)
    throw new Error("[check] FAILED — legacy list threw: " + legacyErrors.join(" · "));
  for (const [label, r] of legacy) {
    if (!r.text || r.picker !== 1)
      throw new Error(`[check] FAILED — ${label} list rendered blank: ` + JSON.stringify(r));
    if (!r.card)
      throw new Error(`[check] FAILED — ${label} left the comparison cards empty`);
    if (!r.normalised)
      throw new Error(`[check] FAILED — ${label} items were not normalised on load`);
  }

  // ── part 32: versioned migrations ──
  // Falsifiers, in order: unversioned data is not brought up to date; the `removed`
  // -> `benched` rename does not happen (the one thing normalisation CANNOT do);
  // migrating twice is not a no-op; or data written by a NEWER build gets mangled by
  // this build's older migrations, which would be worse than the bug we started with.
  const mig = await page.evaluate(async () => {
    const write = db => localStorage.setItem("pairwise-sorter/v4", JSON.stringify(db));
    const read = () => JSON.parse(localStorage.getItem("pairwise-sorter/v4"));
    const SEP_ID = String.fromCharCode(0);
    // Exactly what an older build left behind: no `version`, no `tags`, no tier
    // fields, and a `removed[]` of id strings.
    const legacy = {
      current: "old",
      lists: { old: { name: "Old", log: [],
        items: [{ title: "a", url: "u1", media: [], desc: "" },
                { title: "b", url: "u2", media: [], desc: "" },
                { title: "c", url: "u3", media: [], desc: "" }],
        removed: ["b" + SEP_ID + "u2"] } },
    };
    write(legacy);
    return { legacy, read: read.toString() };
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  const migrated = await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem("pairwise-sorter/v4"));
    const l = db.lists.old;
    return { version: db.version, schema: window.pairwiseSorter.schema(),
             hasBenched: Array.isArray(l.benched), benched: l.benched,
             removedGone: !("removed" in l),
             tagged: l.items.every(i => Array.isArray(i.tags)),
             tiers: Array.isArray(l.priority) && Array.isArray(l.weights) && !!l.combine,
             benchedInUi: window.pairwiseSorter.state().benched };
  });
  console.log("[check] migration 0 →", JSON.stringify(migrated));
  if (migrated.version !== migrated.schema)
    throw new Error("[check] FAILED — unversioned data was not migrated: " + JSON.stringify(migrated));
  if (!migrated.hasBenched || !migrated.removedGone || migrated.benched.length !== 1)
    throw new Error("[check] FAILED — removed -> benched rename did not happen: " + JSON.stringify(migrated));
  if (!migrated.tagged || !migrated.tiers)
    throw new Error("[check] FAILED — baseline migration left fields missing: " + JSON.stringify(migrated));
  if (migrated.benchedInUi.join(",") !== "b")
    throw new Error("[check] FAILED — the migrated bench did not survive into the session: "
      + JSON.stringify(migrated.benchedInUi));

  // Idempotent: reloading already-current data must change nothing.
  const before2 = await page.evaluate(() => localStorage.getItem("pairwise-sorter/v4"));
  await page.reload({ waitUntil: "domcontentloaded" });
  const same = await page.evaluate(prev => {
    const now = JSON.parse(localStorage.getItem("pairwise-sorter/v4"));
    return { version: now.version, benched: now.lists.old.benched.length,
             stable: JSON.parse(prev).lists.old.benched.join() === now.lists.old.benched.join() };
  }, before2);
  console.log("[check] migration idempotent:", JSON.stringify(same));
  if (!same.stable || same.benched !== 1)
    throw new Error("[check] FAILED — re-running migrations changed settled data: " + JSON.stringify(same));

  // Data from a FUTURE build must be left alone rather than run through older steps.
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem("pairwise-sorter/v4"));
    db.version = 999;
    db.lists.old.somethingNew = "from a newer build";
    localStorage.setItem("pairwise-sorter/v4", JSON.stringify(db));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  const future = await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem("pairwise-sorter/v4"));
    return { version: db.version, kept: db.lists.old.somethingNew,
             items: window.pairwiseSorter.state().items };
  });
  console.log("[check] future-version data:", JSON.stringify(future));
  if (future.version !== 999 || future.kept !== "from a newer build")
    throw new Error("[check] FAILED — an older build downgraded data from a newer one: "
      + JSON.stringify(future));
  if (future.items !== 3)
    throw new Error("[check] FAILED — future-version data was not readable: " + JSON.stringify(future));

  // ── part 33: the bench is two-way from the finished ranking ──
  // Every benched row has always had "Sub in"; nothing sent an item the other way once
  // the sort was done, so the only routes out were the console or Edit list. Falsifiers:
  // no Bench control on a ranked row; clicking it dumps you back into the chooser; or
  // subbing the item back in costs a question it already had an answer for.
  const twoWay = await page.evaluate(async () => {
    const P = window.pairwiseSorter;
    await P.newList("TwoWay");
    await P.load(["1", "2", "3", "4", "5"]);
    while (P.state().pending) {
      const { a, b } = P.state().pending;
      await P.answer(+a.title < +b.title ? "a" : "b");
    }
    const before = { ranking: P.ranking().map(r => r.title), answered: P.state().answered };
    const rows = [...document.querySelectorAll("#results li")];
    const row = rows.find(li => li.querySelector(".item")?.textContent === "3");
    const btn = row?.querySelector("button.bench");
    if (!btn) return { before, noButton: true };
    btn.click();
    await new Promise(r => setTimeout(r, 0));
    const benched = { screen: P.state().screen, ranking: P.ranking().map(r => r.title),
                      benched: P.state().benched, answered: P.state().answered,
                      // If a new question DID arise, the way back must be on screen.
                      resumeShown: !document.querySelector("#resume").classList.contains("hide"),
                      asking: !!P.state().pending };
    // Answer anything the removal newly requires, then put it back.
    while (P.state().pending) {
      const { a, b } = P.state().pending;
      await P.answer(+a.title < +b.title ? "a" : "b");
    }
    await P.subIn("3");
    const reAsked = P.state().answered;
    while (P.state().pending) {
      const { a, b } = P.state().pending;
      await P.answer(+a.title < +b.title ? "a" : "b");
    }
    return { before, benched,
             back: { ranking: P.ranking().map(r => r.title), answered: reAsked,
                     askedOnReturn: P.state().answered - reAsked } };
  });
  console.log("[check] two-way bench:", JSON.stringify(twoWay));
  if (twoWay.noButton)
    throw new Error("[check] FAILED — no Bench control on a finished ranking row");
  // Removing an item CAN raise a new question — binary insertion may have used it as a
  // pivot. That is allowed. Being ejected from the list you were reading is not.
  if (twoWay.benched.screen !== "done")
    throw new Error("[check] FAILED — benching from the finished list reopened the chooser: "
      + twoWay.benched.screen);
  if (twoWay.benched.asking && !twoWay.benched.resumeShown)
    throw new Error("[check] FAILED — a new question arose with no way to resume into it");
  if (twoWay.benched.ranking.includes("3") || twoWay.benched.benched.join(",") !== "3")
    throw new Error("[check] FAILED — bench did not take it out: " + JSON.stringify(twoWay.benched));
  // The whole point of "kept, not deleted": its answers are still there.
  if (twoWay.benched.answered !== twoWay.before.answered)
    throw new Error("[check] FAILED — benching discarded answers: " + JSON.stringify(twoWay));
  if (twoWay.back.askedOnReturn !== 0)
    throw new Error("[check] FAILED — subbing back in re-asked answered pairs: "
      + twoWay.back.askedOnReturn);
  if (twoWay.back.ranking.join(",") !== twoWay.before.ranking.join(","))
    throw new Error("[check] FAILED — subbing back in did not restore the order: "
      + JSON.stringify(twoWay.back));
  await shot("two-way-bench");

  // ── part 34: benchMany is atomic and costs one re-sort ──
  // Falsifier: a batch containing one bad title leaves the good ones applied.
  const batch = await page.evaluate(async () => {
    const P = window.pairwiseSorter;
    await P.newList("Batch");
    await P.load(["a", "b", "c", "d", "e", "f"]);
    while (P.state().pending) await P.answer("a");
    let err = null;
    try { await P.benchMany(["a", "b", "no-such-item"]); } catch (e) { err = e.message; }
    const afterFail = P.state().benched.length;
    await P.benchMany(["a", "b", "c"]);
    return { err, afterFail, benched: P.state().benched.sort(),
             active: P.state().active, screen: P.state().screen };
  });
  console.log("[check] benchMany:", JSON.stringify(batch));
  if (!batch.err || !/no item titled/.test(batch.err))
    throw new Error("[check] FAILED — a bad title in the batch was not rejected: " + batch.err);
  if (batch.afterFail !== 0)
    throw new Error("[check] FAILED — a failed batch applied partially: " + batch.afterFail);
  if (batch.benched.join(",") !== "a,b,c" || batch.active !== 3)
    throw new Error("[check] FAILED — batch bench wrong: " + JSON.stringify(batch));

  // ── part 35: row controls align, and rows expand ──
  // Falsifiers: the action clusters do not share a left edge (they trail the titles, as
  // the bench list never did); a row with media/desc has no expander; expanding shows
  // nothing; or a plain row grows a caret that opens onto emptiness.
  const rowUi = await page.evaluate(async () => {
    const P = window.pairwiseSorter;
    const img = new URL("test.svg", location.href).href;
    await P.newList("Rows");
    await P.load([
      { title: "short", media: [img, img], desc: "A description worth reading." },
      { title: "a very much longer title that pushes its buttons further right",
        media: [img], desc: "Another description." },
      { title: "plain" },                       // nothing to reveal
    ]);
    while (P.state().pending) await P.answer("a");

    const lefts = () => [...document.querySelectorAll("#results li .rowacts")]
      .map(el => Math.round(el.getBoundingClientRect().left));
    const before = lefts();
    // Titles must share a left edge too — a row with no caret would otherwise sit a
    // character further left than every row that has one.
    const titleLefts = [...document.querySelectorAll("#results li .item")]
      .map(el => Math.round(el.getBoundingClientRect().left));
    const carets = [...document.querySelectorAll("#results li .titlebtn")].map(b => b.textContent);
    const plainRow = [...document.querySelectorAll("#results li")]
      .find(li => li.querySelector(".item")?.textContent === "plain");

    await P.expandAll();
    const openDetails = document.querySelectorAll("#results li .detail").length;
    const strips = document.querySelectorAll("#results li .detail .strip img").length;
    const descs = [...document.querySelectorAll("#results li .detail .desc")].map(p => p.textContent);
    const ariaOpen = [...document.querySelectorAll("#results li .titlebtn")]
      .filter(b => b.getAttribute("aria-expanded") === "true").length;

    await P.collapseAll();
    const afterCollapse = document.querySelectorAll("#results li .detail").length;

    // A single row toggled by its own title, the way a person would.
    document.querySelector("#results li .titlebtn").click();
    await new Promise(r => setTimeout(r, 0));
    const oneOpen = document.querySelectorAll("#results li .detail").length;

    return { lefts: before, titleLefts, carets, plainHasCaret: !!plainRow?.querySelector(".titlebtn"),
             openDetails, strips, descs, ariaOpen, afterCollapse, oneOpen };
  });
  console.log("[check] rows:", JSON.stringify(rowUi));
  if (new Set(rowUi.lefts).size !== 1)
    throw new Error("[check] FAILED — action clusters are not aligned: " + JSON.stringify(rowUi.lefts));
  if (new Set(rowUi.titleLefts).size !== 1)
    throw new Error("[check] FAILED — titles are not aligned; a caret-less row sits left: "
      + JSON.stringify(rowUi.titleLefts));
  if (rowUi.carets.length !== 2 || rowUi.plainHasCaret)
    throw new Error("[check] FAILED — expander offered on the wrong rows: " + JSON.stringify(rowUi));
  if (rowUi.openDetails !== 2 || rowUi.strips !== 3 || rowUi.descs.length !== 2)
    throw new Error("[check] FAILED — expand all did not reveal media and descriptions: "
      + JSON.stringify(rowUi));
  if (rowUi.ariaOpen !== 2)
    throw new Error("[check] FAILED — aria-expanded did not follow the state: " + rowUi.ariaOpen);
  if (rowUi.afterCollapse !== 0)
    throw new Error("[check] FAILED — collapse all left rows open: " + rowUi.afterCollapse);
  if (rowUi.oneOpen !== 1)
    throw new Error("[check] FAILED — clicking a title did not toggle just that row: " + rowUi.oneOpen);
  await shot("expanded-rows");

  console.log("[check] PASSED");
};
