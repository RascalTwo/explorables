// Disposable: exercises the interactions the tool exists for, because a plain
// verify run only ever sees the opening frame — the one state never in doubt.
//
// The assertion that matters throughout is that the VERDICT MOVES. Anyone can
// render bars; the claim of this tool is that one edit reschedules the rest.
export default async (page, { shot }) => {
  // ACCEPT DIALOGS FOR THE WHOLE RUN, REGISTERED FIRST. Two in this suite will
  // otherwise hang it outright: the unsaved-changes prompt this tool now raises
  // on navigation, armed the moment any test edits a plan, and the overwrite
  // confirm on import. A blocked dialog stops every subsequent CDP call, so the
  // symptom is a Puppeteer protocol timeout hundreds of lines from the cause —
  // which is exactly how it presented, three times, while the real culprit
  // looked like frame capture.
  // ONE handler, for the whole run. Individual tests used to add their own
  // `page.once("dialog", ...)` on top of this — and since this one fires first
  // and accepts, the second accept threw "Cannot accept dialog which is already
  // handled" as an unhandled rejection, printing a ten-line puppeteer stack into
  // the middle of a passing run. Noise that looks exactly like a failure is how
  // you teach someone to stop reading the output.
  page.on("dialog", async (d: any) => { try { await d.accept(); } catch {} });

  // DRIVE THE FIXTURE, NEVER SOMEONE'S REAL PLAN. This suite used to run against
  // whatever `api/list` sorted first, which was a live client plan — so its
  // assertions moved whenever that plan was edited in a meeting, and the numbers
  // below could not be constants. Worse, the plans have since left the repo, so
  // a fresh clone has an EMPTY store and every step here would die on a missing
  // `.bar`.
  //
  // Re-navigating here rather than relying on the caller's URL keeps the suite
  // self-contained: however verify.ts is invoked, it tests the fixture.
  if (!/[?&]demo\b/.test(page.url())) {
    await page.goto(page.url().split("#")[0].split("?")[0] + "?demo", { waitUntil: "networkidle2" });
    await page.waitForSelector(".bar");
    await new Promise(r => setTimeout(r, 200));
  }
  // The big #verdict block was replaced by per-milestone chips; the first chip's
  // verdict line carries the same "does this make the date" answer.
  const verdict = () => page.$eval(".ms .vd", (n: any) => n.textContent.trim());
  const nBars = () => page.$$eval(".bar", (n: any[]) => n.length);
  const fail: string[] = [];

  // Fork, Export, Import, Store, Start, Sprint and the channel editors all live
  // behind the ⚙ now, so anything that CLICKS them has to open it first —
  // Puppeteer's click refuses an element the modal is covering. Reads and
  // synthetic dispatches (`$eval`) work either way and are left alone.
  // Settings is tabbed now, and a hidden panel's children are not clickable — so
  // every caller names the tab it needs. `$eval` still reaches a hidden control,
  // which is why only the CLICKS ever needed this.
  const openSettings = async (tab = "plan") => {
    await page.evaluate((t: string) => {
      (document.querySelector("#cog") as any).click();
      (document.querySelector(`.settabs [data-tab="${t}"]`) as any)?.click();
    }, tab);
    await new Promise(r => setTimeout(r, 220));
  };
  // UNDO IS GONE, so a test that mutates the fixture resets by reloading it. That
  // is slower than ⌘Z and strictly more honest: undo-as-teardown meant every
  // reset silently depended on the feature under test elsewhere in this file
  // being correct, so a broken undo could hide a second failure behind itself.
  // A reload cannot be wrong about what pristine means.
  const reset = async () => {
    await page.goto(page.url().split("#")[0].split("?")[0] + "?demo", { waitUntil: "networkidle2" });
    await page.waitForSelector(".bar");
    await new Promise(r => setTimeout(r, 300));
  };
  const closeSettings = async () => {
    await page.evaluate(() => {
      const s: any = document.querySelector("#settings");
      if (s && !s.hidden) (document.querySelector("#set-close") as any).click();
    });
    await new Promise(r => setTimeout(r, 200));
  };

  await shot("1-loaded");
  const before = await verdict(), bars0 = await nBars();

  // ---- the fixture itself ---------------------------------------------------
  // Absolute numbers, on purpose. Every other assertion in this file is relative
  // ("the verdict moved"), which proves the tool reacts but not that it computes
  // the right answer — a scheduler that returned a different wrong number on
  // every edit would pass all of them. These are the hand-checked results for
  // demo.json, so they also fail loudly if someone edits the fixture without
  // meaning to. demo.json is the public demo and the walkthrough's stage as well,
  // so an accidental edit is worth hearing about.
  const fixture = await page.evaluate(() => ({
    title: (document.querySelector("#title") as any)?.value,
    chips: [...document.querySelectorAll(".ms .vd")].map((n: any) => n.textContent.trim()),
    bars: document.querySelectorAll(".bar").length,
    pins: document.querySelectorAll(".bar.pin").length,
    caps: [...document.querySelectorAll(".lane-head")].filter((n: any) => /∥\d/.test(n.textContent)).length,
    fills: [...new Set([...document.querySelectorAll(".bar")].map((b: any) =>
      [...b.querySelector(".fillbody").classList].find((c: string) => c.startsWith("pat-"))))].sort(),
    // The fixture carries exactly one genuinely-two-systems task (the espresso
    // bar: front-of-house counter, kitchen plumbing). Pinned here because it is
    // the only sample the split-bar assertions below have.
    split: [...document.querySelectorAll(".bar")]
      .filter((b: any) => b.querySelector(".band"))
      .map((b: any) => `${b.dataset.label}=${b.dataset.colors}`),
    // Shape is opt-in, and the fixture opts in with two values so the channel
    // has something to assert against. `theirs` is the pointed one.
    shaped: [...document.querySelectorAll(".bar")]
      .filter((b: any) => !/sh-soft/.test(b.querySelector(".shape").className))
      .map((b: any) => b.dataset.label).sort(),
  }));
  const wantFixture = {
    title: "Demo · opening the second bakery",
    chips: ["1 wk to spare", "misses by 1 wk"],   // one milestone met, one missed
    bars: 12, pins: 1, caps: 1,
    fills: ["pat-hatch", "pat-solid", "pat-underline"],   // all three confidence fills
    split: ["Espresso bar=front kitchen"],
    shaped: ["Building permits", "Health inspection"],   // someone else's calendar
  };
  if (JSON.stringify(fixture) !== JSON.stringify(wantFixture))
    fail.push(`fixture drifted:\n    got  ${JSON.stringify(fixture)}\n    want ${JSON.stringify(wantFixture)}`);
  else console.log(`  fixture: ${fixture.bars} bars, chips ${JSON.stringify(fixture.chips)}, ${fixture.pins} pin, ${fixture.caps} lane at capacity`);

  // The unsaved-work guard, half one. A freshly loaded plan is clean, so closing
  // the tab must NOT be interrupted — a guard that always fires is a guard people
  // learn to click through. The dirty half runs at the end, once there are real
  // edits to lose; both halves together are what make either meaningful.
  const closeGuarded = () => page.evaluate(() => {
    const ev = new Event("beforeunload", { cancelable: true });
    dispatchEvent(ev);
    return ev.defaultPrevented;
  });
  if (await closeGuarded()) fail.push("a clean plan still warns about unsaved changes on close");

  // SCROLL MUST SURVIVE AN EDIT. Rebuilding the rows collapses the document
  // height and the browser clamps scrollTop; the symptom was being thrown back
  // to the top on every click, which makes the tool unusable in front of people.
  // Assert it directly — it is invisible in a screenshot.
  // NB: do NOT use page.click() here. Puppeteer scrolls the target into view
  // first, so it moves the page itself and the assertion measures Puppeteer
  // rather than the app. Click by viewport coordinates on a bar that is already
  // on screen instead.
  const scrollTo400 = async () => {
    await page.evaluate(() => window.scrollTo(0, 400));
    await new Promise(r => setTimeout(r, 150));
    return page.evaluate(() => window.scrollY);
  };
  // BOUNDS ON BOTH AXES. Vertical-only was a real bug and a quiet one: #chart is
  // its own horizontal scroller, so a bar can sit past the right edge of the
  // 1280px viewport while its rect looks perfectly healthy. page.mouse.click()
  // then clicks empty space outside the window, nothing gets selected, and the
  // next step dies on a missing #dur — a failure that names neither the cause
  // nor the test that caused it. Which bars are off to the right depends on the
  // plan, so this went off the day a later-finishing plan became the default.
  const onScreenBar = () => page.evaluate(() => {
    for (const b of document.querySelectorAll(".bar")) {
      const r = (b as any).getBoundingClientRect();
      if (r.top > 80 && r.bottom < innerHeight - 80 && r.width > 10
          && r.left > 0 && r.right < innerWidth - 4)
        return { id: (b as any).dataset.vizId, x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    return null;
  });

  // SHRINK THE VIEWPORT so the document actually overflows. The fixture is 12
  // tasks — deliberately small enough to read — and at 1280x800 the page barely
  // scrolls, which makes a scroll-preservation test meaningless: scrollY stays 0
  // whether or not the bug is present. The old client plan had 37 tasks and
  // overflowed by accident, which is not a property a test should depend on.
  // Restored right after, so nothing downstream inherits the short window.
  await page.setViewport({ width: 1280, height: 420 });
  await new Promise(r => setTimeout(r, 200));
  const scrollBefore = await scrollTo400();
  if (scrollBefore < 60) fail.push(`page barely scrolls (scrollY=${scrollBefore}) — the jump test is meaningless`);
  const spot = await onScreenBar();
  if (!spot) fail.push("no bar on screen at scrollY=400");
  else {
    await page.mouse.click(spot.x, spot.y);
    await new Promise(r => setTimeout(r, 250));
    const afterClick = await page.evaluate(() => window.scrollY);
    if (Math.abs(afterClick - scrollBefore) > 2)
      fail.push(`click jumped the page: scrollY ${scrollBefore} -> ${afterClick}`);
  }
  // Compare against what the page ACTUALLY reached, never a hardcoded 400: the
  // document is only ~360px taller than the viewport here, so scrollTo(400)
  // clamps on arrival and a literal comparison fails for a reason that has
  // nothing to do with the behaviour under test.
  const parked = await scrollTo400();
  // Every step from here needs a selected task. Say so plainly rather than
  // letting $eval throw "failed to find element #dur" and take the whole run
  // down with a message that points at the wrong thing.
  if (!(await page.$("#dur"))) {
    fail.push("nothing selected after clicking a bar — inspector never opened, skipping the rest");
    console.log("INTERACTIONS FAILED: " + fail.join(" | "));
    return;
  }
  await page.$eval("#dur", (n: any) => { n.value = "21"; n.dispatchEvent(new Event("change")); });
  await new Promise(r => setTimeout(r, 250));
  const afterEdit = await page.evaluate(() => window.scrollY);
  if (Math.abs(afterEdit - parked) > 2) {
    const diag = await page.evaluate(() => ({
      docH: document.documentElement.scrollHeight,
      inner: innerHeight,
      maxScroll: document.documentElement.scrollHeight - innerHeight,
      gridH: (document.querySelector("#grid") as any)?.scrollHeight,
      chartH: (document.querySelector("#chart") as any)?.scrollHeight,
      rows: document.querySelectorAll(".row").length,
    }));
    fail.push(`edit jumped the page: scrollY ${parked} -> ${afterEdit} ${JSON.stringify(diag)}`);
  }
  await reset();
  await page.setViewport({ width: 1280, height: 800 });      // back to the real window
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 200));

  // The axis must actually be on screen. It was not, for one build: `#chart`
  // sets overflow-x, which computes overflow-y to auto, which clipped labels
  // positioned above y=0. Nothing errored — they were simply invisible. So
  // assert on the rendered text rather than trusting that the code ran.
  const axis = await page.$eval("#axis", (n: any) => n.textContent.replace(/\s+/g, " ").trim());
  // Milestone names come from the fixture rather than being hardcoded — the old
  // list named a client's change-freeze milestone, which is exactly the coupling that made
  // this suite unable to run against anything but one private plan.
  for (const want of ["Aug", "Sep", "Oct", "Nov", "TODAY", "SOFT OPENING", "GRAND OPENING"])
    if (!axis.includes(want)) fail.push(`axis missing "${want}" (got: ${axis.slice(0, 120)})`);

  // 1. Drag a bar's grip right — lengthens it, pushes the finish out.
  const b = await (await page.$(".bar .grip")).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 108, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 250));
  const afterDrag = await verdict();
  await shot("2-after-drag");

  // 2. Reloading the fixture must come back to exactly the starting verdict.
  // This was an undo test; with undo gone it still earns its place — it proves a
  // drag mutates nothing the fixture carries on disk.
  await reset();
  await new Promise(r => setTimeout(r, 250));
  const afterReset = await verdict();

  // 3. Select, rename, retype the duration.
  await page.click(".bar");
  await new Promise(r => setTimeout(r, 200));
  if (!(await page.$("#dur"))) fail.push("inspector has no duration input");
  await page.click("#lab", { clickCount: 3 });
  await page.type("#lab", "RENAMED IN A MEETING");
  await new Promise(r => setTimeout(r, 250));
  const labels = await page.$$eval(".rowlabel", (n: any[]) => n.map(x => x.textContent));
  if (!labels.some((l: string) => l.includes("RENAMED IN A MEETING")))
    fail.push("rename did not reach the chart");
  // Focus must survive the re-render or you can only ever type one character.
  const focused = await page.evaluate(() => document.activeElement?.id);
  if (focused !== "lab") fail.push(`rename stole focus (activeElement=${focused})`);

  await page.$eval("#dur", (n: any) => { n.value = "42"; n.dispatchEvent(new Event("change")); });
  await new Promise(r => setTimeout(r, 250));
  const afterDur = await verdict();
  if (afterDur === afterReset) fail.push("typing a duration did not move the verdict");
  await shot("3-renamed-and-retimed");

  // ---- duplicate ------------------------------------------------------------
  // Must land directly BELOW the original in its lane, not at the bottom: array
  // order is queue order, so appending would silently reorder the team's work.
  const laneOf = () => page.$$eval(".row .rowlabel", (n: any[]) => n.map(x => x.textContent.trim()));
  const rowsBefore = await laneOf();
  const nBefore = await nBars();
  await page.click("#dup");
  await new Promise(r => setTimeout(r, 300));
  const rowsAfter = await laneOf(), nAfter = await nBars();
  if (nAfter !== nBefore + 1) fail.push(`duplicate: ${nBefore} -> ${nAfter} bars, expected +1`);
  const origIdx = rowsAfter.findIndex((l: string) => l === rowsBefore[0]);
  if (origIdx < 0 || !/\(2\)$/.test(rowsAfter[origIdx + 1] || ""))
    fail.push(`copy not directly below original: ${JSON.stringify(rowsAfter.slice(0, 3))}`);
  // deps must come with it; dependents must NOT be rewired
  const depCheck = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".deprow")].map((n: any) => n.textContent);
    return rows.find((r: string) => /waits directly for/i.test(r)) || "";
  });
  console.log(`  duplicate: ${nBefore} -> ${nAfter} bars, copy sits at row ${origIdx + 1}, deps "${depCheck.slice(0, 70)}"`);
  await reset();
  await new Promise(r => setTimeout(r, 300));
  if ((await nBars()) !== nBefore) fail.push("reloading the fixture did not remove the duplicate");
  // Undo left `sel` pointing at the removed copy, which used to throw on every
  // later render. Assert the page still works rather than just looks right.
  await page.evaluate(() => { (document.querySelector(".bar") as any).click(); });
  await new Promise(r => setTimeout(r, 250));
  if (!(await page.$("#fill"))) fail.push("inspector is dead after reloading");

  // The Fill control must WRITE THROUGH to the bar. It listed hardcoded values
  // and wrote to a dead field for a while — the dropdown moved and nothing
  // happened, which is the least visible kind of broken. Runs here, where a task
  // is already selected, rather than after the fork test switches plans.
  const fillOpts = await page.$$eval("#fill option", (n: any[]) => n.map(x => x.value));
  const patBefore = await page.$eval(".bar .fillbody", (n: any) => n.className);
  await page.$eval("#fill", (n: any) => {
    n.value = [...n.options].map((o: any) => o.value).find((v: string) => v !== n.value);
    n.dispatchEvent(new Event("change")); });
  await new Promise(r => setTimeout(r, 250));
  const patAfter = await page.$eval(".bar .fillbody", (n: any) => n.className);
  if (patAfter === patBefore) fail.push(`Fill control did not change the bar (${patBefore})`);
  if (fillOpts.length !== 3) fail.push(`Fill options not from data: ${JSON.stringify(fillOpts)}`);
  console.log(`  fill control: ${JSON.stringify(fillOpts)}, bar "${patBefore}" -> "${patAfter}"`);
  await reset();
  await new Promise(r => setTimeout(r, 200));


  // 4. Add a task, then delete it — bar count must go up then back down.
  await page.click("#add");
  await new Promise(r => setTimeout(r, 250));
  const bars1 = await nBars();
  if (bars1 !== bars0 + 1) fail.push(`add task: ${bars0} -> ${bars1}, expected +1`);
  await shot("4-added");
  await page.click("#del");
  await new Promise(r => setTimeout(r, 300));
  const bars2 = await nBars();
  if (bars2 !== bars0) fail.push(`delete task: ${bars1} -> ${bars2}, expected back to ${bars0}`);

  // The case that prompted the feature: a QA task naming three direct
  // prerequisites and actually sits on a much longer chain. Assert the second
  // row exists and shows more than the direct list.
  await page.evaluate(() => window.scrollTo(0, 0));
  // scrollIntoView and getBoundingClientRect must be separated by a frame —
  // reading the rect in the same evaluate() returns pre-scroll coordinates and
  // the click lands on empty space.
  const found = await page.evaluate(() => {
    const r = [...document.querySelectorAll(".row")].find(x =>
      (x.querySelector(".rowlabel")?.textContent || "").trim() === "Train on the new ovens");
    if (!r) return false;
    r.scrollIntoView({ block: "center" });
    return true;
  });
  await new Promise(r => setTimeout(r, 300));
  // #chart scrolls horizontally, and late bars sit past the viewport edge once
  // the axis is snapped out to whole months. Bring the bar into view on BOTH
  // axes before measuring, or the click lands outside the window and silently
  // does nothing.
  if (found) await page.evaluate(() => {
    const r = [...document.querySelectorAll(".row")].find(x =>
      (x.querySelector(".rowlabel")?.textContent || "").trim() === "Train on the new ovens");
    const bar: any = r.querySelector(".bar"), chart: any = document.querySelector("#chart");
    chart.scrollLeft = bar.offsetLeft - chart.clientWidth / 2;
  });
  await new Promise(r => setTimeout(r, 300));
  const qa = !found ? null : await page.evaluate(() => {
    const r = [...document.querySelectorAll(".row")].find(x =>
      (x.querySelector(".rowlabel")?.textContent || "").trim() === "Train on the new ovens");
    const b = r.querySelector(".bar").getBoundingClientRect();
    if (b.x < 0 || b.right > innerWidth || b.y < 0 || b.bottom > innerHeight) return null;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  });
  if (found && !qa) fail.push("'Train on the new ovens' bar is off-screen even after scrolling it into view");
  if (!qa) fail.push("could not find the 'Train on the new ovens' row");
  else {
    await new Promise(r => setTimeout(r, 200));
    await page.mouse.click(qa.x, qa.y);
    await new Promise(r => setTimeout(r, 250));
    const rows = await page.$$eval(".deprow", (n: any[]) =>
      n.map(x => x.textContent.replace(/\s+/g, " ").trim()));
    const direct = rows.find((r: string) => /^waits directly for/i.test(r)) || "";
    const trans  = rows.find((r: string) => /in turn wait for/i.test(r)) || "";
    if (!trans) fail.push("no transitive row shown for 'Train on the new ovens' — deprows: " + JSON.stringify(rows).slice(0, 300));
    console.log("  train direct   -> " + direct.slice(0, 200));
    console.log("  train upstream -> " + trans.slice(0, 300));
    await shot("5-transitive");
  }

  // ---- reorder within a team ----------------------------------------------
  // The row order must actually change. Row order is array order is queue order;
  // if any of those three came apart the buttons would silently do nothing.
  const laneLabels = () => page.$$eval(".row .rowlabel", (n: any[]) =>
    n.map(x => x.textContent.trim()).slice(0, 6));      // the SRV lane
  await page.evaluate(() => {
    const b: any = document.querySelector(".row .bar");
    b.scrollIntoView({ block: "center" });
  });
  await new Promise(r => setTimeout(r, 250));
  const orderBefore = await laneLabels();
  const first = await page.evaluate(() => {
    const r: any = document.querySelector(".row .bar").getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(first.x, first.y);
  await new Promise(r => setTimeout(r, 200));
  await page.click("#down");
  await new Promise(r => setTimeout(r, 250));
  const orderAfter = await laneLabels();
  if (orderBefore[0] === orderAfter[0])
    fail.push(`reorder did not move the row (still "${orderBefore[0]}")`);
  if (orderAfter[1] !== orderBefore[0])
    fail.push(`reorder did not swap cleanly: ${JSON.stringify(orderBefore.slice(0,2))} -> ${JSON.stringify(orderAfter.slice(0,2))}`);
  await page.click("#up");                                  // put it back
  await new Promise(r => setTimeout(r, 250));
  const orderRestored = await laneLabels();
  if (orderRestored[0] !== orderBefore[0]) fail.push("reorder up/down is not symmetric");
  console.log(`  reorder: "${orderBefore[0].slice(0,32)}" moved down then back`);

  // ---- hover previews the chain without changing selection ------------------
  const strokes = () => page.$$eval("#arrows path", (n: any[]) =>
    n.map(p => p.getAttribute("stroke")).join(","));
  const selBefore = await page.$eval("#insp", (n: any) => n.textContent.slice(0, 40));
  const quiet = await strokes();
  await page.evaluate(() => {
    const bars = document.querySelectorAll(".bar");
    bars[bars.length - 1].dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
  });
  await new Promise(r => setTimeout(r, 200));
  const hovered = await strokes();
  if (hovered === quiet) fail.push("hover did not recolour any dependency line");
  const selAfter = await page.$eval("#insp", (n: any) => n.textContent.slice(0, 40));
  if (selAfter !== selBefore) fail.push("hover changed the selection — it should only preview");
  console.log("  hover: recoloured lines, selection unchanged");

  // ---- REGRESSION: a later, empty milestone must not drag the plan ----------
  // Adding an incentive deadline in January right-aligned everything to it and
  // pushed the November work 6.3 weeks past its own CAB line. Assert the bars do
  // not move when a later milestone is added, and that they DO move when work is
  // reassigned to it — the second half is what proves the alignment still works
  // rather than having been disabled.
  await page.evaluate(() => window.scrollTo(0, 0));
  // PIN THE ZOOM FIRST, or this measures the wrong thing. At "Whole plan" the
  // scale is `width / span`, so a later milestone widens the span and every bar
  // shrinks and slides left — the schedule has not moved at all, but the pixels
  // have, and this assertion is about the schedule. A fixed span makes PPD
  // independent of the milestones again, so bar x is once more an exact proxy
  // for "nothing rescheduled" rather than a proxy that happened to hold while
  // the scale was a constant.
  await page.$eval("#zoom", (n: any) => { n.value = "30"; n.dispatchEvent(new Event("change")); });
  await new Promise(r => setTimeout(r, 300));
  const firstBarX = () => page.$eval(".bar", (n: any) => Math.round(n.getBoundingClientRect().x));
  const xBefore = await firstBarX();
  await page.click("#addms");
  await new Promise(r => setTimeout(r, 300));
  const msDates = await page.$$eval("[data-ms-date]", (n: any[]) => n.map(x => x.value));
  const xAfterAdd = await firstBarX();
  if (xAfterAdd !== xBefore)
    fail.push(`adding a later milestone moved the bars: x ${xBefore} -> ${xAfterAdd} (milestones ${JSON.stringify(msDates)})`);
  const chips = await page.$$eval(".ms .vd", (n: any[]) => n.map(x => x.textContent.trim()));
  if (!chips.some((c: string) => /no work assigned/.test(c)))
    fail.push(`new milestone should report no work assigned, got ${JSON.stringify(chips)}`);
  console.log(`  empty later milestone: bars held at x=${xBefore}, chips ${JSON.stringify(chips)}`);
  // Reassigning must reach the milestone's own accounting. NOT asserting that
  // the bars move: by this point earlier edits have made the plan late, so slack
  // is negative, shift clamps to 0 and nothing should move — an assertion that
  // the bars shift would be testing a coincidence, not the behaviour.
  await page.evaluate(() => { (document.querySelector(".bar") as any).click(); });
  await new Promise(r => setTimeout(r, 250));
  await page.$eval("#ms", (n: any) => { n.value = n.options[n.options.length - 1].value;
                                        n.dispatchEvent(new Event("change")); });
  await new Promise(r => setTimeout(r, 300));
  const chips2 = await page.$$eval(".ms .vd", (n: any[]) => n.map(x => x.textContent.trim()));
  // The milestone the task was moved TO is the last one; assert IT picked the
  // work up, rather than that no milestone anywhere is empty — with three
  // milestones in play that was asserting something the step never claimed.
  if (/no work assigned/.test(chips2[chips2.length - 1] || ""))
    fail.push(`reassign did not register on the target milestone: ${JSON.stringify(chips2)}`);
  console.log(`  after reassigning one task: chips ${JSON.stringify(chips2)}`);
  await page.$eval("#zoom", (n: any) => { n.value = ""; n.dispatchEvent(new Event("change")); });
  await new Promise(r => setTimeout(r, 250));
  await reset();
  await reset();
  await new Promise(r => setTimeout(r, 250));

  // ---- the last row must be reachable past the pinned panel ----------------
  // The panel grows with its content up to 44vh; a fixed bottom reservation left
  // the last lane's rows permanently underneath it.
  await page.evaluate(() => {
    const rows = document.querySelectorAll(".row");
    (rows[rows.length - 1].querySelector(".bar") as any).click();
  });
  await new Promise(r => setTimeout(r, 350));
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await new Promise(r => setTimeout(r, 350));
  const reach = await page.evaluate(() => {
    const rows = document.querySelectorAll(".row");
    const last = rows[rows.length - 1].getBoundingClientRect();
    const panel = (document.querySelector("#insp") as any).getBoundingClientRect();
    const de = document.documentElement;
    return { lastBottom: Math.round(last.bottom), panelTop: Math.round(panel.top),
             panelH: Math.round(panel.height),
             pad: parseInt(getComputedStyle(document.body).paddingBottom),
             scrollY: Math.round(window.scrollY),
             maxScroll: Math.round(de.scrollHeight - innerHeight),
             docH: de.scrollHeight, bodyH: Math.round(document.body.getBoundingClientRect().height),
             chartScrollH: (document.querySelector("#chart") as any).scrollHeight,
             chartClientH: (document.querySelector("#chart") as any).clientHeight };
  });
  if (reach.lastBottom > reach.panelTop)
    fail.push(`last row hidden behind panel: ${JSON.stringify(reach)}`);
  console.log(`  last row clears panel: row bottom ${reach.lastBottom} vs panel top ${reach.panelTop} (pad ${reach.pad}px for a ${reach.panelH}px panel)`);

  // Delete and the dismiss × must not be adjacent — bad pair to fat-finger.
  const gap = await page.evaluate(() => {
    const d = (document.querySelector("#del") as any)?.getBoundingClientRect();
    const x = (document.querySelector("#dismiss") as any)?.getBoundingClientRect();
    if (!d || !x) return null;
    return Math.round(Math.hypot(Math.max(0, d.left - x.right, x.left - d.right),
                                 Math.max(0, d.top - x.bottom, x.top - d.bottom)));
  });
  if (gap == null) fail.push("could not measure Delete/dismiss separation");
  else if (gap < 20) fail.push(`Delete and × are only ${gap}px apart`);
  else console.log(`  Delete/× separation: ${gap}px`);
  await page.evaluate(() => window.scrollTo(0, 0));

  // ---- REGRESSION: start date later than today ------------------------------
  // Moving the start past today makes todayW() negative; the TODAY line was then
  // drawn at a negative offset, i.e. inside the row-label gutter, on top of the
  // labels. Nothing errors — it just looks broken.
  await page.evaluate(() => window.scrollTo(0, 0));
  const labelRight = await page.$eval(".rowlabel", (n: any) =>
    Math.round(n.getBoundingClientRect().right));
  await page.$eval("#start", (n: any) => {
    const d = new Date(); d.setDate(d.getDate() + 21);
    n.value = d.toISOString().slice(0, 10);
    n.dispatchEvent(new Event("change"));
  });
  await new Promise(r => setTimeout(r, 350));
  const marks = await page.evaluate(() => {
    const grid: any = document.querySelector("#grid");
    const g = grid.getBoundingClientRect();
    const flags = [...document.querySelectorAll(".ax.flag")].map((n: any) =>
      ({ t: n.textContent.trim().slice(0, 22), x: Math.round(n.getBoundingClientRect().left - g.left) }));
    const lines = [...document.querySelectorAll(".gl")].map((n: any) =>
      Math.round(n.getBoundingClientRect().left - g.left));
    return { flags, minLine: Math.min(...lines) };
  });
  // READ the gutter, never hardcode it. This was `const gutter = 430`, which
  // stopped being true the moment the label column started being measured from
  // the labels — and a stale constant here does not report "the column changed",
  // it reports "a chart line landed in the label gutter", which is a different
  // and much more alarming bug than the one that happened.
  const gutter = await page.evaluate(() =>
    Math.round(parseFloat(getComputedStyle(document.querySelector("#grid") as any).getPropertyValue("--labw"))));
  if (marks.minLine < gutter - 2)
    fail.push(`a chart line landed in the label gutter at x=${marks.minLine} (gutter ${gutter})`);
  const strays = marks.flags.filter((f: any) => f.x < gutter - 2);
  if (strays.length) fail.push(`axis flags in the gutter: ${JSON.stringify(strays)}`);
  console.log(`  start pushed +21d: leftmost line x=${marks.minLine}, flags ${JSON.stringify(marks.flags.map((f: any) => f.t))}`);
  await reset();
  await new Promise(r => setTimeout(r, 250));

  // NOTHING ON A BAR MAY OVERPRINT THE ROW LABELS. This used to select
  // `.bar.conf-guess`, a class index.html no longer renders — so it matched zero
  // elements, `Math.min()` of nothing is Infinity, and Infinity is less than no
  // gutter. It reported a clean pass for every build since the class was removed.
  // A test that cannot fail reads as coverage while providing none.
  //
  // Re-pointed at the invariant that still exists and now matters more, since the
  // gutter is measured and therefore narrower: the leftmost painted pixel of any
  // bar — including the start-constraint tick, which hangs 5px off the left edge
  // — must land at or right of the gutter.
  const TICK = 5;
  const glyphs = await page.evaluate(() => {
    const grid: any = document.querySelector("#grid");
    const g = grid.getBoundingClientRect();
    return [...document.querySelectorAll(".bar")].map((b: any) =>
      Math.round(b.getBoundingClientRect().left - g.left));
  });
  if (!glyphs.length) fail.push("no bars found for the gutter-overprint check");
  else {
    const minGlyph = Math.min(...glyphs);
    if (minGlyph - TICK < gutter)
      fail.push(`a bar paints into the label gutter (left edge x=${minGlyph}, tick ${TICK}px, gutter ${gutter})`);
    else console.log(`  gutter clear: leftmost bar edge x=${minGlyph} (tick ${TICK}px), gutter ends ${gutter}`);
  }

  // ---- the channel editor exists and actually writes through ---------------
  await page.evaluate(() => window.scrollTo(0, 0));
  // The per-group ✎ is gone — it was a link to Settings dressed as an editor, and
  // five in a row read as five separate editing surfaces. ⚙ is the only door now,
  // so assert there is no second one rather than asserting it works.
  const strayEdits = await page.$$eval("#legend [data-edit]", (n: any[]) => n.length);
  if (strayEdits) fail.push(`${strayEdits} per-group edit buttons are back on the legend`);
  await openSettings("channels");
  const styleCtls = await page.$$eval("#chedit .stylebtn", (n: any[]) => n.map((x: any) => x.dataset.sp));
  if (!styleCtls.length) fail.push("border editor showed no style controls");
  const chVisible = await page.$$eval("#chedit .chrow", (n: any[]) => n.map((x: any) => x.id));
  for (const want of ["ch-lanes", "ch-colors", "ch-borders", "ch-fills"])
    if (!chVisible.includes(want)) fail.push(`Settings is missing the ${want} editor (found ${JSON.stringify(chVisible)})`);
  // Change the first border's style THROUGH THE PICKER and confirm it reaches the
  // bars. Driven by clicking a swatch rather than setting a <select>'s value,
  // because that is now the only way a person can do it — a test that pokes an
  // element the UI no longer has proves nothing about the UI.
  const beforeStyle = await page.$eval(".bar .shape", (n: any) => getComputedStyle(n).borderTopStyle);
  await page.evaluate(async () => {
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const btn: any = [...document.querySelectorAll("#chedit .stylebtn")]
      .find((b: any) => b.dataset.sp.startsWith("borders:"));
    btn.click(); await sleep(250);
    const cur: any = document.querySelector("#stylepop .swopt.on");
    const pick: any = [...document.querySelectorAll("#stylepop .swopt")]
      .find((b: any) => b !== cur && b.title !== "none");
    pick.click(); await sleep(350);
  });
  const afterStyle = await page.$eval(".bar .shape", (n: any) => getComputedStyle(n).borderTopStyle);
  if (afterStyle === beforeStyle)
    fail.push(`editing a border style did not reach the bars (still ${beforeStyle})`);
  console.log(`  channel editor: ${styleCtls.length} style pickers, bar ${beforeStyle} -> ${afterStyle}`);
  await reset();
  await closeSettings();

  // ---- dependency-arrow styles are data, not constants ---------------------
  // The point of moving them into the document is that editing one reaches the
  // chart, so the assertion is on a drawn path's stroke — not on the control.
  await openSettings("arrows");
  const arrowKinds = await page.$$eval("#arrowedit [data-ac]", (n: any[]) => n.map(x => x.dataset.ac));
  for (const want of ["direct", "trans", "down", "downtrans"])
    if (!arrowKinds.includes(want)) fail.push(`no arrow style control for "${want}" (found ${JSON.stringify(arrowKinds)})`);
  await closeSettings();
  // Select a task that ACTUALLY HAS DEPENDENCIES, rather than the first bar —
  // an unselected chart draws every path in the muted colour, so asserting on
  // the wrong bar would test nothing and pass.
  const picked = await page.evaluate(() => {
    for (const b of [...document.querySelectorAll(".bar")] as any[]) {
      b.click();
      if (document.querySelector("#insp [data-rm]")) return b.dataset.label;
    }
    return null;
  });
  if (!picked) fail.push("no task in the fixture has a dependency to colour an arrow with");
  await new Promise(r => setTimeout(r, 300));
  await openSettings("arrows");
  await page.$eval('#arrowedit [data-ac="direct"]', (n: any) => {
    n.value = "#ff00ff"; n.dispatchEvent(new Event("change")); });
  await new Promise(r => setTimeout(r, 300));
  const arrowStrokes = await page.$$eval("#arrows path", (n: any[]) => n.map(x => x.getAttribute("stroke")));
  if (!arrowStrokes.some((s: string) => /#ff00ff/i.test(s)))
    fail.push(`recolouring the "direct" arrow did not reach the chart (strokes ${JSON.stringify(arrowStrokes.slice(0, 8))})`);
  else console.log(`  arrow styles are data: "direct" recoloured on "${picked}" (${arrowStrokes.length} paths)`);
  // Put it back by hand rather than reloading — the reset is a full navigation,
  // and this assertion only needs the one field it just changed.
  await page.$eval('#arrowedit [data-ac="direct"]', (n: any) => {
    n.value = "#58a6ff"; n.dispatchEvent(new Event("change")); });
  await new Promise(r => setTimeout(r, 250));
  await closeSettings();
  await page.keyboard.press("Escape");
  await new Promise(r => setTimeout(r, 200));

  // ---- arrow depth is TWO budgets, and both reach the chart -----------------
  // The claim under test is not "there is a dropdown". It is that the number in
  // it changes how far the chain lights up, that hover and click hold their own
  // number, and that going past the budget MUTES an arrow rather than removing
  // it — a line that vanishes at depth 3 reads as "there is nothing there"
  // instead of "you asked not to be told", which is a different, wrong answer.
  const litPaths = () => page.$$eval("#arrows path",
    (n: any[]) => n.filter(p => p.getAttribute("opacity") === "1").length);
  const allPaths = () => page.$$eval("#arrows path", (n: any[]) => n.length);
  // Dashed means "not the first hop". At a budget of one hop there must be NONE,
  // and that is the assertion, not a nicety — see the block below.
  const dashedLit = () => page.$$eval("#arrows path", (n: any[]) => n.filter(p =>
    p.getAttribute("opacity") === "1" && p.getAttribute("stroke-dasharray") !== "none").length);
  const setDepth = async (which: string, v: string) => {
    await openSettings("arrows");
    await page.$eval(`#d${which}`, (n: any, val: string) => {
      n.value = val; n.dispatchEvent(new Event("change")); }, v);
    await new Promise(r => setTimeout(r, 250));
    await closeSettings();
  };
  // DRIVEN BY HOVER, DELIBERATELY. A pointerenter redraws the arrows on the spot;
  // a click goes through render(), which defers the redraw to requestAnimationFrame
  // — and a throttled frame callback reads back as an EMPTY svg, so the assertion
  // would fail for a reason with nothing to do with depth. Every read below ends
  // on a pointer event for that reason, including the selection ones.
  const pointer = (label: string, ev: string) => page.evaluate((l: string, e: string) => {
    const b: any = [...document.querySelectorAll(".bar")].find((x: any) => x.dataset.label === l);
    b?.dispatchEvent(new PointerEvent(e, { bubbles: true }));
  }, label, ev);
  const hoverLit = async (label: string) => {
    await pointer(label, "pointerenter");
    await new Promise(r => setTimeout(r, 120));
    const n = await litPaths();
    await pointer(label, "pointerleave");            // leaving redraws for the SELECTION
    await new Promise(r => setTimeout(r, 120));
    return n;
  };
  // The deepest chain in the fixture, found rather than hard-coded: a plan is
  // data, and a depth assertion on a task with two hops of ancestry proves
  // nothing about a limit of three.
  await setDepth("hover", "all");
  const barLabels = await page.$$eval(".bar", (n: any[]) => n.map(b => b.dataset.label));
  let deepest = { label: "", lit: 0 };
  for (const l of barLabels) { const n = await hoverLit(l); if (n > deepest.lit) deepest = { label: l, lit: n }; }
  const pathsBefore = await allPaths();
  const ladder: number[] = [];
  for (const d of ["1", "2", "3"]) { await setDepth("hover", d); ladder.push(await hoverLit(deepest.label)); }
  const rungs = [...ladder, deepest.lit];
  if (!(ladder[0] < deepest.lit && rungs.every((n, i) => i === 0 || n >= rungs[i - 1])))
    fail.push(`hover depth does not narrow the chain: 1/2/3/all lit ${rungs.join("/")} on "${deepest.label}"`);
  else console.log(`  arrow depth: hover 1/2/3/all lights ${rungs.join("/")} paths on "${deepest.label}"`);
  const pathsAfter = await allPaths();
  if (pathsAfter !== pathsBefore)
    fail.push(`limiting depth REMOVED arrows (${pathsBefore} -> ${pathsAfter}); past the budget they must go muted, not missing`);

  // "1 hop — direct only" MEANS ONLY THE LINES TOUCHING THE HOVERED BAR. The
  // first version of this classified an edge by whether both its ends were in
  // reach, which let an edge BETWEEN two direct dependencies through — both ends
  // one hop away, and unmistakably a second hop on screen. On a real plan whose
  // task had seven interlinked dependencies that drew seven solid lines and nine
  // dashed at the setting that promises none. A dash at depth 1 is the signature.
  await setDepth("hover", "1");
  await pointer(deepest.label, "pointerenter");
  await new Promise(r => setTimeout(r, 150));
  const dashedAt1 = await dashedLit();
  await pointer(deepest.label, "pointerleave");
  if (dashedAt1)
    fail.push(`${dashedAt1} dashed arrow(s) lit at depth 1 on "${deepest.label}" — dashed is "the rest of the chain", which one hop does not have`);
  else console.log(`  arrow depth: no dashed arrows at "1 hop — direct only"`);

  // AND THE WHOLE CHAIN IS STILL NOT THE WHOLE PLAN. Infinity was the obvious
  // sentinel for "this edge is on neither side of the focus", and it is the wrong
  // one: the budget is ALSO Infinity at this setting, `Infinity <= Infinity`
  // holds, and every unrelated dependency in the plan came out coloured. Assert
  // on the LEAST connected task, so the check does not depend on the fixture
  // happening to contain something disconnected from the deepest chain.
  await setDepth("hover", "all");
  let loneliest = { label: "", lit: Infinity };
  for (const l of barLabels) { const n = await hoverLit(l); if (n < loneliest.lit) loneliest = { label: l, lit: n }; }
  if (loneliest.lit >= pathsBefore)
    fail.push(`at "the whole chain" every one of the ${pathsBefore} arrows lit up for "${loneliest.label}" — unrelated dependencies must stay muted`);
  else console.log(`  arrow depth: at "the whole chain" the quietest task ("${loneliest.label}") lights ${loneliest.lit} of ${pathsBefore}`);

  // TWO NUMBERS, NOT ONE. Deep on click and shallow on hover at the same time is
  // the configuration the feature exists for, so it is the one asserted: if
  // either budget were secretly reading the other's value, these two are equal.
  await setDepth("click", "all");
  await setDepth("hover", "1");
  await page.evaluate((l: string) => {                // select it, the way a person would
    const b: any = [...document.querySelectorAll(".bar")].find((x: any) => x.dataset.label === l);
    b?.click();
  }, deepest.label);
  await new Promise(r => setTimeout(r, 350));
  const hovShallow = await hoverLit(deepest.label);     // and the leave restores the selection
  const selDeep = await litPaths();
  if (!(hovShallow < selDeep))
    fail.push(`hover and click share one depth budget (hover@1 lit ${hovShallow}, click@all lit ${selDeep})`);
  else console.log(`  arrow depth: hover@1 lights ${hovShallow}, the click@all selection ${selDeep}`);
  await reset();                                     // depth is written to the plan, so put it back

  // ---- a one-day task is expressible, which is the whole point -------------
  // Under weeks it was 1/7 — a number you cannot type, cannot store exactly, and
  // cannot add up without drift. The assertion is end-to-end: type 1, and the
  // chart draws a shorter bar that says "1 day" rather than "0.1 wks".
  const oneDay = await page.evaluate(async () => {
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    (document.querySelectorAll(".bar")[0] as any).click();
    await sleep(300);
    const read = async (v: string) => {
      const d: any = document.querySelector("#dur");
      d.value = v; d.dispatchEvent(new Event("change"));
      await sleep(320);
      const bar: any = document.querySelector(".bar.sel");
      return { says: bar.title.split("\n")[1], px: Math.round(bar.getBoundingClientRect().width) };
    };
    const unit = (document.querySelector("#dur") as any)?.closest("label")?.textContent.trim().split("\n")[0];
    return { unit, one: await read("1"), ten: await read("10"), week: await read("7") };
  });
  if (!/days/.test(oneDay.unit || "")) fail.push(`the duration field is not in days: "${oneDay.unit}"`);
  if (!/^1 day/.test(oneDay.one.says)) fail.push(`a 1-day task reads "${oneDay.one.says}"`);
  if (!/^10 days/.test(oneDay.ten.says)) fail.push(`a 10-day task reads "${oneDay.ten.says}"`);
  // A whole number of weeks still SAYS weeks — storing days is not reciting them.
  if (!/^1 wk/.test(oneDay.week.says)) fail.push(`7 days should still read "1 wk", got "${oneDay.week.says}"`);
  if (!(oneDay.one.px < oneDay.ten.px && oneDay.ten.px < oneDay.week.px * 2))
    fail.push(`bar widths do not track duration: ${JSON.stringify(oneDay)}`);
  else console.log(`  days: 1 -> "${oneDay.one.says}" ${oneDay.one.px}px · 10 -> "${oneDay.ten.says}" ${oneDay.ten.px}px · 7 -> "${oneDay.week.says}" ${oneDay.week.px}px`);
  await reset();

  // ---- the row label IS the row --------------------------------------------
  // The label column is this chart's index, and an index you cannot click is a
  // caption. So the assertion is equivalence, not existence: hovering the name
  // must light exactly what hovering the bar lights, and clicking it must select
  // exactly what clicking the bar selects.
  const rowIds = await page.$$eval(".row[data-task]", (n: any[]) => n.map(r => r.dataset.task));
  const probe = rowIds[Math.floor(rowIds.length / 2)];
  const via = async (sel: string) => {
    await page.$eval(sel, (n: any) => n.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true })));
    await new Promise(r => setTimeout(r, 150));
    const shape = await page.$$eval("#arrows path", (n: any[]) => n.map(p =>
      `${p.getAttribute("opacity")}:${p.getAttribute("stroke")}`).join(","));
    const hot = await page.$$eval(".bar.hot", (n: any[]) => n.length);
    await page.$eval(sel, (n: any) => n.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true })));
    await new Promise(r => setTimeout(r, 150));
    return { shape, hot };
  };
  const viaBar = await via(`.row[data-task="${probe}"] .bar`);
  const viaLab = await via(`.row[data-task="${probe}"] .rowlabel`);
  if (viaBar.shape !== viaLab.shape)
    fail.push(`hovering the label lights different arrows than hovering the bar on "${probe}"`);
  // The bar is under the pointer when you hover it, and a long way from it when
  // you hover the label — which is the whole reason the label borrows the chips'
  // `.hot`. So this one is deliberately NOT symmetric.
  if (!viaLab.hot) fail.push("hovering the row label does not mark its bar — nothing says WHICH bar that name is");
  await page.evaluate(() => (document.querySelector("#chart") as any).click());
  await new Promise(r => setTimeout(r, 250));
  await page.$eval(`.row[data-task="${probe}"] .rowlabel`, (n: any) => n.click());
  await new Promise(r => setTimeout(r, 300));
  const labelPicked = await page.$$eval(".bar.sel", (n: any[]) => n.length);
  const inspOpen = await page.$eval("#insp", (n: any) => !n.hidden);
  if (labelPicked !== 1 || !inspOpen)
    fail.push(`clicking the row label did not select it (${labelPicked} selected bar(s), inspector ${inspOpen ? "open" : "shut"}) — #chart's own click clears the selection, so the label must stop propagating`);
  else console.log(`  row label: same arrows as the bar, marks it hot, and selects on click ("${probe}")`);
  await reset();

  // ---- a style control has to SHOW the style -------------------------------
  // "backslashdense" and "hatchdense" differ by one letter as words and obviously
  // as textures; picking between them by name is picking blind. Colour never had
  // the problem because its control IS its preview, and the assertion is that
  // every other styled channel now matches it.
  await openSettings("channels");
  const swatched = await page.evaluate(() => Object.fromEntries(
    ["borders", "fills", "shapes"].map(k => [k,
      [...document.querySelectorAll(`#ch-${k} .chit:not(.chhdr):not(.chempty)`)]
        .map((row: any) => !!row.querySelector(".cst .k, .cst .shk"))])));
  for (const [k, seen] of Object.entries(swatched) as [string, boolean[]][])
    if (seen.length && !seen.every(Boolean))
      fail.push(`${k}: ${seen.filter(x => !x).length} of ${seen.length} style controls draw no preview`);
  // + ADD, ON EVERY CHANNEL. It read `doc[k].push(...)` against an array that is
  // OPTIONAL on a document — shapes are opt-in and no plan written before they
  // existed carries one — so the button threw, silently, on precisely the empty
  // channel you would need it for. Every read site already spelled it `|| []`;
  // this was the sole write site.
  const added = await page.evaluate(async () => {
    const count = (k: string) =>
      document.querySelectorAll(`#ch-${k} .chit:not(.chhdr):not(.chempty)`).length;
    const out: Record<string, string> = {};
    for (const k of ["lanes", "colors", "borders", "fills", "shapes"]) {
      const before = count(k);
      try { (document.querySelector(`#ch-${k} [data-addch]`) as any).click(); }
      catch (e) { out[k] = "threw: " + (e as Error).message; continue; }
      await new Promise(r => setTimeout(r, 120));
      out[k] = count(k) === before + 1 ? "ok" : `${before} -> ${count(k)}`;
    }
    return out;
  });
  const broke = Object.entries(added).filter(([, v]) => v !== "ok");
  if (broke.length) fail.push(`"+ Add" failed on ${JSON.stringify(Object.fromEntries(broke))}`);
  else console.log(`  channels: every style control previews itself, "+ Add" works on all 5`);

  // ---- you pick the picture, and there are no words in it -------------------
  // The control IS the swatch now, and the grid it opens is swatches too. The
  // assertion that matters is "no text": a name in there means somebody put the
  // dropdown back.
  //
  // AND IT HAS TO BE THE TOPMOST THING AT ITS OWN CENTRE — not merely on screen.
  // It shipped at z-index 80 under a settings overlay at 85: correct position,
  // correct size, correct contents, invisible. A rect inside the viewport is a
  // weaker claim than a pixel you can click, and only the second one is the
  // feature. elementFromPoint asks the second question.
  const picker = await page.evaluate(async () => {
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const btn: any = [...document.querySelectorAll("#chedit .stylebtn")]
      .find((b: any) => b.dataset.sp.startsWith("fills:"));
    if (!btn) return null;
    btn.click(); await sleep(250);
    const pop: any = document.querySelector("#stylepop");
    const r = pop.getBoundingClientRect();
    const hit: any = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const before = [...document.querySelectorAll(".bar .fillbody")]
      .map((e: any) => [...e.classList].find((c: string) => c.startsWith("pat-")));
    const want: any = [...pop.querySelectorAll(".swopt")].find((b: any) => b.title === "cross");
    want?.click(); await sleep(400);
    return { opts: pop.querySelectorAll(".swopt").length,
             words: pop.textContent.trim(),
             marked: [...pop.querySelectorAll(".swopt.on")].length,
             topmost: !!hit?.closest("#stylepop"),
             closedAfterPick: pop.hidden,
             reached: [...document.querySelectorAll(".bar .fillbody")]
               .some((e: any) => e.classList.contains("pat-cross")),
             changed: before.length > 0 };
  });
  if (!picker) fail.push("no style picker button in the channel editor");
  else {
    if (await page.$$eval("#chedit select", (n: any[]) => n.length))
      fail.push("a native <select> is still in the channel editor — the control is meant to BE the swatch");
    if (picker.words) fail.push(`the style grid shows words, not just styles: "${picker.words}"`);
    if (!picker.topmost) fail.push("the style grid is behind something — on screen but not clickable");
    if (!picker.reached) fail.push("picking a texture did not reach the chart");
    if (!picker.closedAfterPick) fail.push("the style grid stayed open after a pick");
    if (!fail.length) console.log(`  style picker: ${picker.opts} silhouettes, 0 words, topmost, pick reached the chart`);
  }
  await reset();

  // ---- the not-applicable value is settable, not just migrated -------------
  await openSettings("channels");
  const dfl = await page.evaluate(async () => {
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const marks = () => [...document.querySelectorAll("#ch-borders .dflt")].map((b: any) => b.textContent);
    const before = marks();
    (document.querySelectorAll("#ch-borders .dflt")[2] as any).click(); await sleep(350);
    const afterSet = marks();
    (document.querySelector("#set-close") as any).click(); await sleep(200);
    (document.querySelector("#chart") as any).click(); await sleep(200);
    (document.querySelector("#add") as any).click(); await sleep(400);
    const took = (document.querySelector("#bord") as any)?.selectedOptions[0]?.text;
    return { before, afterSet, took };
  });
  if (dfl.afterSet.filter((m: string) => m === "●").length !== 1)
    fail.push(`marking a not-applicable value did not take: ${JSON.stringify(dfl)}`);
  else if (dfl.took !== "customer-facing")
    fail.push(`a new task did not take the designated value — got "${dfl.took}"`);
  else console.log(`  not-applicable value: settable in the UI, and a new task takes it ("${dfl.took}")`);
  await reset();

  // ---- the no-system hue is data ------------------------------------------
  // The one channel that cannot say its neutral with a VALUE, because `[]` is the
  // neutral. So it says it with a hue, and the hue has to reach a bar carrying no
  // colours at all — which is the only state it describes.
  await openSettings("channels");
  const hue = await page.evaluate(async () => {
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const nc: any = document.querySelector("#nocolor");
    if (!nc) return null;
    nc.value = "#ff2299"; nc.dispatchEvent(new Event("change")); await sleep(400);
    (document.querySelector("#set-close") as any).click(); await sleep(200);
    (document.querySelectorAll(".bar")[0] as any).click(); await sleep(300);
    (document.querySelector("#colr") as any).click(); await sleep(200);
    document.querySelectorAll("#colrpop [data-col]").forEach((c: any) => {
      if (c.checked) { c.checked = false; c.dispatchEvent(new Event("change")); } });
    await sleep(500);
    return getComputedStyle(document.querySelector(".bar.sel .fillbody") as any).backgroundColor;
  });
  if (hue === null) fail.push("no no-system colour control on the Colour channel");
  else if (hue !== "rgb(255, 34, 153)")
    fail.push(`the no-system hue did not reach a colourless bar — it painted ${hue}`);
  else console.log(`  no-system hue: configurable, and it reaches a bar carrying no colours`);
  await reset();

  // ---- a shape swatch has to be a different SHAPE --------------------------
  // The swatch was a `.k` carrying an `sh-` class, and `.k` sets its own
  // border-radius further down the sheet — equal specificity, later wins — so
  // every RADIUS-based silhouette collapsed to the same 3px rectangle while the
  // CLIP-PATH ones rendered correctly. Asserting on the computed values is the
  // only way to catch that: the markup was right, the class was right, and a
  // screenshot of five identical lozenges looks like five shapes that happen to
  // be similar. Distinctness IS the claim, so distinctness is the assertion.
  const silhouettes = await page.evaluate((shapes: string[]) => {
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;left:-9999px;top:0";
    probe.innerHTML = shapes.map(x => `<span class="shk"><i class="shape sh-${x}"></i></span>`).join("");
    document.body.append(probe);
    const seen = [...probe.querySelectorAll(".shape")].map((e: any) => {
      const c = getComputedStyle(e); return `${c.borderRadius}|${c.clipPath}`; });
    probe.remove();
    return seen;
  }, ["soft", "pill", "oval", "roundleft", "roundright", "chevron", "diamond"]);
  const uniq = new Set(silhouettes).size;
  if (uniq !== silhouettes.length)
    fail.push(`only ${uniq} of ${silhouettes.length} shape swatches draw differently — ${JSON.stringify(silhouettes)}`);
  else console.log(`  shape swatches: ${uniq} distinct silhouettes, radius and clip-path both surviving`);

  // ---- the colour picker must escape the panel that scrolls ----------------
  // #insp is `overflow-y:auto`, this popup opens upward, and an absolutely
  // positioned child of a scroll container is clipped by it — so everything past
  // the panel's top edge was simply not drawn. The assertion is geometric, not
  // "is it visible": it has to reach ABOVE #insp and still fit on screen.
  await page.evaluate(() => (document.querySelectorAll(".bar")[0] as any).click());
  await new Promise(r => setTimeout(r, 350));
  const popBox = await page.evaluate(() => {
    (document.querySelector("#colr") as any)?.click();
    const p: any = document.querySelector("#colrpop"), i: any = document.querySelector("#insp");
    if (!p || !i) return null;
    const pr = p.getBoundingClientRect(), ir = i.getBoundingClientRect();
    return { items: p.querySelectorAll(".cpick").length, colours: (document.querySelectorAll("#legend .g-colors .it")).length,
             above: pr.top < ir.top, onScreen: pr.top >= 0 && pr.bottom <= window.innerHeight,
             pos: getComputedStyle(p).position };
  });
  if (!popBox) fail.push("no colour picker on the inspector");
  else if (!popBox.above || !popBox.onScreen || popBox.items !== popBox.colours)
    fail.push(`colour picker is clipped or short: ${JSON.stringify(popBox)}`);
  else console.log(`  colour picker: ${popBox.items} items, reaches above the panel, on screen (${popBox.pos})`);
  await page.keyboard.press("Escape");
  await reset();

  // ---- a channel under two values shows no UI, and holds there -------------
  // One value is not a choice: a legend entry that isolates 100% of the chart
  // cannot do anything, and a dropdown with one option asks a question with one
  // answer. It stops AT one rather than zero, because since v3 every task points
  // at a real value — the last one is what they are all pointing at.
  //
  // A bounded loop, not `while (rows > 0)`. The unbounded version was written
  // when a channel could be emptied and became an infinite loop the moment the
  // guard came back, which reads as a CDP protocol timeout hundreds of lines from
  // the cause. Bound the loop, then assert where it stopped.
  const shrink = await page.evaluate(async () => {
    const real = window.confirm; (window as any).confirm = () => true;
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const rows = (k: string) =>
      document.querySelectorAll(`#ch-${k} .chit:not(.chhdr):not(.chempty)`).length;
    const ui = () => ({ legend: !!document.querySelector("#legend .g-colors"),
                        insp: !!document.querySelector("#colr") });
    (document.querySelector("#cog") as any).click();
    (document.querySelector('.settabs [data-tab="channels"]') as any).click();
    await sleep(250);
    const trail: any[] = [];
    for (let n = 0; n < 8; n++) {
      const b: any = document.querySelector("#ch-colors .chit:not(.chhdr):not(.chempty) [data-x]");
      if (b) b.click();
      await sleep(200);
      trail.push({ left: rows("colors"), ...ui() });
    }
    const out = { trail, left: rows("colors"),
                  msg: (document.querySelector("#msg") as any)?.textContent || "",
                  bars: document.querySelectorAll(".bar").length };
    (window as any).confirm = real;
    return out;
  });
  const atOne = shrink.trail.find((x: any) => x.left === 1);
  if (!atOne || atOne.legend || atOne.insp)
    fail.push(`a one-value channel still draws UI: ${JSON.stringify(atOne)}`);
  if (shrink.left !== 1)
    fail.push(`colours went to ${shrink.left}; every task points at a value, so the last one must hold`);
  else if (!/cannot go/.test(shrink.msg))
    fail.push(`the refusal did not say why: "${shrink.msg}"`);
  else if (!shrink.bars)
    fail.push("the chart stopped drawing bars");
  else console.log(`  channels: UI gone at 1 value, holds at 1, ${shrink.bars} bars — "${shrink.msg.slice(0, 46)}…"`);
  await reset();

  // ---- settings is tabbed, and the reference is not a setting ---------------
  await openSettings("channels");
  const tabState = await page.evaluate(() => ({
    tabs: [...document.querySelectorAll(".settabs [data-tab]")].map((b: any) => b.dataset.tab),
    shown: [...document.querySelectorAll("[data-panel]")].filter((p: any) => !p.hidden)
             .map((p: any) => p.dataset.panel),
    wallInSettings: !!document.querySelector("#settings #swatchwall"),
    wallExists: !!document.querySelector("#wall #swatchwall"),
  }));
  for (const want of ["plan", "channels", "swap", "arrows", "global"])
    if (!tabState.tabs.includes(want)) fail.push(`settings has no "${want}" tab (found ${JSON.stringify(tabState.tabs)})`);
  // SCOPE, NOT JUST JOB. "Where are plans kept" and "Import" act on the whole
  // store, so they must not sit under the tab whose heading says "this plan" —
  // that heading was making a claim about their blast radius that was false.
  const scoped = await page.evaluate(() => ({
    plan:   [...document.querySelectorAll('[data-panel="plan"] [id]')].map((n: any) => n.id),
    global: [...document.querySelectorAll('[data-panel="global"] [id]')].map((n: any) => n.id),
  }));
  for (const id of ["storemode", "importbtn", "importfile", "exportall"])
    if (!scoped.global.includes(id)) fail.push(`"${id}" acts on the whole store but is not on the Global tab (global has ${JSON.stringify(scoped.global)})`);
  for (const id of ["start", "sprintw", "fork", "exportone"])
    if (!scoped.plan.includes(id)) fail.push(`"${id}" is about this plan but left the Plan tab`);
  console.log(`  settings scope: plan ${JSON.stringify(scoped.plan)} · global ${JSON.stringify(scoped.global)}`);

  // ---- the demo is a fixture, and Save must refuse it -----------------------
  // Saving it wrote a demo.json the tool could never open again: refreshPicker
  // appends its own hardcoded "demo" option, so the stored copy appeared as a
  // duplicate, and load() short-circuits on that id before reaching any store.
  const demoSave = await page.evaluate(async () => {
    (document.querySelector("#set-close") as any)?.click();
    (document.querySelector("#save") as any).click();
    await new Promise(r => setTimeout(r, 400));
    return { msg: (document.querySelector("#msg") as any)?.textContent || "",
             err: (document.querySelector("#msg") as any)?.className || "" };
  });
  if (!/fixture/.test(demoSave.msg))
    fail.push(`Save did not refuse the demo — said "${demoSave.msg}"`);
  else console.log(`  demo save refused: "${demoSave.msg}"`);
  // Exactly one, or the tabs are decorative and the panel you wanted is still
  // somewhere below the fold — which is the thing they were added to fix.
  if (tabState.shown.length !== 1 || tabState.shown[0] !== "channels")
    fail.push(`tabs show ${JSON.stringify(tabState.shown)}, expected exactly ["channels"]`);
  if (tabState.wallInSettings) fail.push("the swatch wall is back inside Settings — it is a reference, not a setting");
  if (!tabState.wallExists) fail.push("the swatch wall is missing from the ? overlay");

  // ---- channel labels are per-plan -------------------------------------------
  // The legend heading and the inspector's field name must BOTH follow, because
  // the whole point is that the room's word for a channel appears everywhere the
  // channel does.
  await page.$eval('[data-chname="colors"]', (n: any) => {
    n.value = "Projects"; n.dispatchEvent(new Event("input")); });
  await new Promise(r => setTimeout(r, 300));
  await closeSettings();
  await page.evaluate(() => (document.querySelector(".bar") as any).click());
  await new Promise(r => setTimeout(r, 250));
  const named = await page.evaluate(() => ({
    legend: /Projects/.test(document.querySelector("#legend")!.textContent || ""),
    inspector: /Projects/.test(document.querySelector("#insp")!.textContent || ""),
    stillDefault: /(^|[^a-z])Color([^a-z]|$)/.test(document.querySelector("#legend")!.textContent || ""),
  }));
  if (!named.legend) fail.push("renaming a channel did not reach the legend");
  if (!named.inspector) fail.push("renaming a channel did not reach the inspector");
  if (named.stillDefault) fail.push("the legend still shows the default channel name alongside the custom one");
  else console.log(`  channel labels: "Color" -> "Projects" in the legend and the inspector`);
  await reset();

  // ---- the demo is reachable from the picker ---------------------------------
  // It lives beside index.html rather than in the store, so it needs a synthetic
  // entry — without one, having a single real plan on disk hides the demo
  // entirely from anyone looking at the dropdown.
  const demoOpt = await page.$$eval("#pick option", (n: any[]) => n.map((o: any) => o.value));
  if (!demoOpt.includes("demo")) fail.push(`the demo is not in the picker (${JSON.stringify(demoOpt)})`);
  else console.log(`  picker carries the demo alongside ${demoOpt.length - 1} stored plan(s)`);

  // ---- swapping what two channels MEAN --------------------------------------
  // THE ASSERTION IS ON THE COUNTS, and that is the whole trick: if "known" had 2
  // tasks and 3 weeks as a fill, it must still have 2 tasks and 3 weeks after it
  // becomes a border. Anything that mangles the mapping moves those numbers.
  //
  // It also catches the exact bug this shipped with once: every new value was
  // minted with the same id (uid() only knew about ids already in the document,
  // and a swap mints a whole list before writing any of it), so every task
  // pointed at one value and the legend reported all 12 tasks under all 3. The
  // per-value counts are the only assertion that would have noticed — "the labels
  // moved" was true the whole time.
  const legendGroup = (g: string) => page.$eval("#legend", (n: any, gg: string) => {
    const m = n.textContent.replace(/\s+/g, " ").match(new RegExp(gg + "(.*?)✎"));
    return m ? m[1].trim() : "";
  }, g);
  const borderBefore = await legendGroup("Border"), fillBefore = await legendGroup("Fill");
  const verdictsBefore = await page.$$eval(".ms .vd", (n: any[]) => n.map(x => x.textContent.trim()));
  await openSettings("swap");
  await page.evaluate(() => {
    const a: any = document.querySelector("#swapa"), b: any = document.querySelector("#swapb");
    a.value = "borders"; a.dispatchEvent(new Event("change"));
    b.value = "fills";   b.dispatchEvent(new Event("change"));
  });
  await new Promise(r => setTimeout(r, 300));
  await page.click("#swapgo");
  await new Promise(r => setTimeout(r, 500));
  await closeSettings();
  const borderAfter = await legendGroup("Border"), fillAfter = await legendGroup("Fill");
  if (borderAfter !== fillBefore)
    fail.push(`swap: Border should now read what Fill did.\n    got  ${borderAfter}\n    want ${fillBefore}`);
  if (fillAfter !== borderBefore)
    fail.push(`swap: Fill should now read what Border did.\n    got  ${fillAfter}\n    want ${borderBefore}`);
  // Distinct ids, or every task lands on one value and the counts above lie.
  const swapIds = await page.evaluate(() => {
    const q = (s: string) => [...document.querySelectorAll(`#legend [data-fv^="${s}|"]`)]
      .map((n: any) => n.dataset.fv);
    return { b: q("borders"), f: q("fills") };
  });
  for (const [ch, ids] of Object.entries(swapIds))
    if (new Set(ids).size !== ids.length)
      fail.push(`swap minted duplicate ids in ${ch}: ${JSON.stringify(ids)}`);
  // A swap is a re-rendering, not a re-scheduling: neither channel feeds sched().
  const verdictsAfter = await page.$$eval(".ms .vd", (n: any[]) => n.map(x => x.textContent.trim()));
  if (JSON.stringify(verdictsAfter) !== JSON.stringify(verdictsBefore))
    fail.push(`swapping Border and Fill moved the dates: ${JSON.stringify(verdictsBefore)} -> ${JSON.stringify(verdictsAfter)}`);
  // A swap is in-memory until Save, so a reload must bring both channels back.
  await reset();
  await new Promise(r => setTimeout(r, 400));
  if (await legendGroup("Border") !== borderBefore || await legendGroup("Fill") !== fillBefore)
    fail.push("a swap survived a reload — it should be in-memory until Save");
  else console.log(`  swap Border<->Fill: counts followed their labels, dates unmoved, discarded on reload`);

  // ---- shape: a clipped silhouette must not eat the controls ---------------
  // The ONLY reason `.shape` exists is that clip-path clips everything in its
  // element, and the grip, the constraint tick and the selection halo all
  // deliberately overhang the bar. Assert each of them survives a POINTED shape
  // specifically — on a rounded one they would pass whether the split existed or
  // not, which is an assertion that cannot fail.
  await openSettings("channels");
  const shapeSel = await page.$$eval("#chedit .stylebtn", (n: any[]) =>
    n.map((x: any) => x.dataset.sp).filter((v: string) => v.startsWith("shapes:")));
  if (!shapeSel.length) fail.push("no shape controls in the channel editor");
  const gotDiamond = await page.evaluate(async () => {
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const btn: any = [...document.querySelectorAll("#chedit .stylebtn")]
      .find((b: any) => b.dataset.sp.startsWith("shapes:"));
    btn.click(); await sleep(250);
    const pick: any = [...document.querySelectorAll("#stylepop .swopt")]
      .find((b: any) => b.title === "diamond");
    if (!pick) return false;
    pick.click(); await sleep(350);
    return true;
  });
  if (!gotDiamond) fail.push("the shape picker offers no diamond");
  await new Promise(r => setTimeout(r, 300));
  await closeSettings();
  await page.evaluate(() => {
    const b: any = [...document.querySelectorAll(".bar")]
      .find((x: any) => /sh-diamond/.test(x.querySelector(".shape").className));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 300));
  const clipped = await page.evaluate(() => {
    const b: any = [...document.querySelectorAll(".bar")]
      .find((x: any) => /sh-diamond/.test(x.querySelector(".shape").className));
    if (!b) return null;
    const sh = b.querySelector(".shape"), g = b.querySelector(".grip");
    const br = b.getBoundingClientRect(), gr = g.getBoundingClientRect();
    return {
      clip: /polygon/.test(getComputedStyle(sh).clipPath),
      // the grip overhangs the RIGHT edge; if the clip reached it, width would be 0
      gripW: Math.round(gr.width), gripOverhang: Math.round(gr.right - br.right),
      outline: getComputedStyle(b).outlineWidth,
      tick: getComputedStyle(document.querySelector(".bar.pin"), "::before").width,
    };
  });
  // A POINTED SHAPE PAINTS ITS OWN RIM. A CSS border would be painted on the box
  // edges and then clipped away on the diagonals, leaving the point bare — which
  // is what shipped first and looked like a rendering fault. Assert the rim layer
  // exists, carries the border's style, and does NOT wear the fill pattern (the
  // rim is not hatched; the core is).
  const rim = await page.evaluate(() => {
    const b: any = [...document.querySelectorAll(".bar")]
      .find((x: any) => /sh-diamond/.test(x.querySelector(".shape").className));
    if (!b) return null;
    const sh = b.querySelector(".shape"), core = b.querySelector(".core");
    return { rimClass: [...sh.classList].find((c: string) => c.startsWith("rim-")) || null,
             shapeHasPattern: [...sh.classList].some((c: string) => c.startsWith("pat-")),
             corePattern: core && [...core.classList].find((c: string) => c.startsWith("pat-")) || null,
             coreInset: core ? Math.round(core.getBoundingClientRect().left
                                          - sh.getBoundingClientRect().left) : null,
             coreClipped: core ? /polygon/.test(getComputedStyle(core).clipPath) : false };
  });
  if (!rim || !rim.rimClass) fail.push("a pointed shape has no self-painted rim layer");
  else {
    if (rim.shapeHasPattern) fail.push("the rim layer is wearing the fill pattern — the rim should not be hatched");
    if (!rim.corePattern) fail.push("the core lost the fill pattern when the rim layer was added");
    if (!rim.coreClipped) fail.push("the core is not clipped to the silhouette, so the fill will overflow the point");
    if (rim.coreInset !== 2) fail.push(`the core is inset ${rim.coreInset}px, expected 2px of rim`);
    else console.log(`  pointed rim: ${rim.rimClass}, core inset 2px and clipped, pattern ${rim.corePattern}`);
  }
  if (!clipped) fail.push("setting a shape to diamond did not reach any bar");
  else {
    if (!clipped.clip) fail.push("the diamond shape carries no clip-path");
    if (clipped.gripW < 6 || clipped.gripOverhang < 1)
      fail.push(`a clipped shape ate the resize grip (${clipped.gripW}px wide, overhang ${clipped.gripOverhang}px)`);
    if (!/^[1-9]/.test(clipped.outline)) fail.push(`a clipped shape ate the selection outline (${clipped.outline})`);
    if (!/^[1-9]/.test(clipped.tick)) fail.push(`a clipped shape ate the constraint tick (${clipped.tick})`);
    console.log(`  clipped shape: grip ${clipped.gripW}px overhanging ${clipped.gripOverhang}px, `
      + `outline ${clipped.outline}, constraint tick ${clipped.tick}`);
  }
  await reset();
  await page.keyboard.press("Escape");
  await new Promise(r => setTimeout(r, 250));

  // ---- multi-colour tasks: drawn, filtered and counted under BOTH -----------
  // The whole point of the list is that a shared task answers to either half of
  // it. A split bar that filters under only one colour would look right and be
  // useless, so the assertion is on the FILTER, not just the pixels.
  await page.evaluate(() => window.scrollTo(0, 0));
  const bandGeom = await page.evaluate(() => {
    const b: any = [...document.querySelectorAll(".bar")].find((x: any) => x.querySelector(".band"));
    if (!b) return null;
    const br = b.getBoundingClientRect(), dr = b.querySelector(".band").getBoundingClientRect();
    return { barW: Math.round(br.width), bandW: Math.round(dr.width),
             bandH: Math.round(dr.height), rightAligned: Math.abs(dr.right - br.right) < 3,
             // The seam pseudo-element and the fill pattern must both survive on
             // the band — a band that drops the hatch silently un-marks a guess.
             pat: [...b.querySelector(".band").classList].some((c: string) => c.startsWith("pat-")) };
  });
  if (!bandGeom) fail.push("no split bar rendered for the two-system task");
  else {
    if (bandGeom.bandH < 10) fail.push(`the colour band has no height (${bandGeom.bandH}px) — it is not positioned`);
    if (Math.abs(bandGeom.bandW - bandGeom.barW / 2) > 3)
      fail.push(`the second colour band is ${bandGeom.bandW}px of a ${bandGeom.barW}px bar, expected half`);
    if (!bandGeom.rightAligned) fail.push("the last colour band does not reach the bar's right edge");
    if (!bandGeom.pat) fail.push("the colour band dropped the confidence fill pattern");
    console.log(`  split bar: ${bandGeom.bandW}px band on a ${bandGeom.barW}px bar, pattern kept`);
  }
  // Filter by each of its two colours in turn; the task must survive both.
  for (const half of ["front", "kitchen"]) {
    await page.evaluate((c: string) => {
      (document.querySelector("#hiderest") as any).checked = true;
      (document.querySelector("#hiderest") as any).dispatchEvent(new Event("change"));
      (document.querySelector(`#legend [data-fv="colors|${c}"]`) as any).click();
    }, half);
    await new Promise(r => setTimeout(r, 300));
    const survived = await page.$$eval(".row .rowlabel", (n: any[]) => n.map(x => x.textContent.trim()));
    if (!survived.includes("Espresso bar"))
      fail.push(`the two-system task vanished when filtering by "${half}" — it should match either colour (got ${JSON.stringify(survived)})`);
    await page.evaluate(() => (document.querySelector("#clearfilter") as any)?.click());
    await new Promise(r => setTimeout(r, 250));
  }
  await page.evaluate(() => {
    (document.querySelector("#hiderest") as any).checked = false;
    (document.querySelector("#hiderest") as any).dispatchEvent(new Event("change"));
  });
  await new Promise(r => setTimeout(r, 250));
  console.log(`  multi-colour task matched both of its colours`);

  // Counts come from the plan, so assert the SHAPE (every fill carries a count on
  // its own legend swatch and they add up to the task count), never a hardcoded
  // number that changes whenever the default plan does. This used to read a
  // single fill tally out of #msbar; the counts now live per legend entry, which
  // is what made the same question answerable for teams, colours and borders too.
  const legendText = await page.$eval("#legend", (n: any) => n.textContent.replace(/\s+/g, " "));
  const nTasks = await nBars();
  const sum = [...legendText.matchAll(/(known|estimated|guessed)\s*(\d+)·/g)]
    .reduce((a: number, m: any) => a + +m[2], 0);
  if (!sum) fail.push(`no per-fill counts on the legend: ${legendText.slice(0, 200)}`);
  else if (sum !== nTasks) fail.push(`legend fill counts sum to ${sum}, but there are ${nTasks} tasks`);
  else console.log(`  legend fill counts sum to ${sum} = task count`);

  // ---- totality: every task answers every channel --------------------------
  // Since v3 there is no unassigned state outside colour, and the legend is where
  // that becomes checkable: if a channel's counts sum to the task count then no
  // task is missing from it, and if they sum to LESS then somebody is carrying a
  // value the legend cannot see — which is the exact failure the old nullable
  // `fill` had, drawn as fills[0] and counted as nothing.
  //
  // Colour is excluded by design: a task may carry two systems or none, so its
  // counts are free to sum to more or less than the plan's task count. That is
  // stated on the group heading rather than left looking like an arithmetic bug.
  const totals = await page.evaluate(() => {
    const n = document.querySelectorAll(".row[data-task]").length;
    const out: Record<string, number[]> = {};
    for (const ch of ["borders", "fills", "shapes", "lanes"]) {
      const g = document.querySelector(`#legend .g-${ch}`);
      if (!g) continue;                       // a channel under two values draws none
      out[ch] = [[...g.querySelectorAll(".lgc")]
        .reduce((a, e: any) => a + (parseInt(e.textContent, 10) || 0), 0), n];
    }
    return out;
  });
  for (const [ch, [sum_, n]] of Object.entries(totals) as [string, number[]][])
    if (sum_ !== n) fail.push(`${ch} legend sums to ${sum_} but the plan has ${n} tasks — a task is answering that channel with nothing`);
  console.log(`  totality: ${Object.keys(totals).join(", ")} each sum to the task count`);

  // NO BLANK OPTION on a total channel. The `["", "—"]` entry meant "unset", and
  // an unset state that no longer exists must not still be offerable.
  const blanks = await page.evaluate(() => {
    (document.querySelectorAll(".bar")[0] as any).click();
    return ["#bord", "#fill", "#shp"].map(id => {
      const el: any = document.querySelector(id);
      return el ? [id, [...el.options].filter((o: any) => o.value === "").length] : [id, -1];
    });
  });
  await new Promise(r => setTimeout(r, 250));
  for (const [id, n] of blanks as [string, number][])
    if (n > 0) fail.push(`${id} still offers a blank "unset" option`);

  // A NEW TASK ANSWERS EVERYTHING TOO — and not with borders[0], which is a real
  // environment in every plan here. With nothing selected it takes the plan's
  // not-applicable value where there is one.
  const minted = await page.evaluate(() => {
    (document.querySelector("#chart") as any).click();            // deselect first
    (document.querySelector("#add") as any).click();
    const row: any = document.querySelector(".bar.sel");
    const sel_ = (id: string) => (document.querySelector(id) as any)?.value ?? "(no control)";
    return { border: sel_("#bord"), fill: sel_("#fill"), shape: sel_("#shp"), drew: !!row };
  });
  await new Promise(r => setTimeout(r, 300));
  for (const [k, v] of Object.entries(minted))
    if (v === "") fail.push(`a new task came out with no ${k}`);
  console.log(`  new task answers every channel: ${JSON.stringify(minted)}`);
  await reset();

  // ---- the last value of a channel cannot go -------------------------------
  // It used to refuse for no nameable reason, which is what made it read as a
  // bug. Now every task in the plan is pointing AT it, so removing it would leave
  // them pointing at nothing — the state v3 abolishes. Taking a channel down to
  // one value is how you stop using it; that already draws no UI.
  const guard = await page.evaluate(async () => {
    const real = window.confirm; (window as any).confirm = () => true;
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const rows_ = () => document.querySelectorAll("#ch-borders .chit:not(.chhdr):not(.chempty)").length;
    (document.querySelector("#cog") as any).click();
    (document.querySelector('.settabs [data-tab="channels"]') as any).click();
    await sleep(250);
    for (let n = 0; n < 8; n++) {
      const b: any = document.querySelector("#ch-borders .chit:not(.chhdr):not(.chempty) [data-x]");
      if (b) b.click(); await sleep(180);
    }
    const out = { left: rows_(), msg: (document.querySelector("#msg") as any)?.textContent || "",
                  bars: document.querySelectorAll(".bar").length };
    (window as any).confirm = real;
    return out;
  });
  if (guard.left !== 1) fail.push(`borders emptied to ${guard.left}; every task points at a value, so the last one must hold`);
  else if (!/cannot go/.test(guard.msg)) fail.push(`the refusal did not say why: "${guard.msg}"`);
  else console.log(`  last value holds at 1, ${guard.bars} bars still drawn — "${guard.msg.slice(0, 54)}…"`);
  await reset();
  for (const grp of ["Lanes", "Color", "Border"])
    if (!new RegExp(grp + "[^]*?\\d+·[\\d.]+w").test(legendText))
      fail.push(`the ${grp} legend group carries no count·weeks`);

  // ---- sprint lines exist and are quieter than the month rules -------------
  const rules = await page.evaluate(() => {
    const q = (c: string) => [...document.querySelectorAll(c)].map((n: any) =>
      ({ x: Math.round(n.getBoundingClientRect().left), op: +getComputedStyle(n).opacity }));
    return { spr: q(".gl.spr"), mon: q(".gl.mon") };
  });
  if (!rules.spr.length) fail.push("no sprint lines drawn");
  else if (rules.mon.length && rules.spr[0].op >= rules.mon[0].op)
    fail.push(`sprint lines are not subtler than month lines (${rules.spr[0].op} vs ${rules.mon[0].op})`);
  else console.log(`  sprint lines: ${rules.spr.length} at opacity ${rules.spr[0].op} (months ${rules.mon[0]?.op})`);


  // ---- legend filter --------------------------------------------------------
  await page.evaluate(() => window.scrollTo(0, 0));
  const dimmed = () => page.$$eval(".row", (n: any[]) => n.filter(x => x.classList.contains("dim")).length);
  const total = await page.$$eval(".row", (n: any[]) => n.length);
  const fv = (sel: string, ev: string) => page.evaluate(([s_, e_]: string[]) => {
    const el: any = document.querySelector(s_);
    el.dispatchEvent(new MouseEvent(e_, { bubbles: e_ === "click" }));
  }, [sel, ev]);
  const nth = (i: number, ev: string) => page.evaluate(([i_, e_]: any[]) => {
    const el: any = document.querySelectorAll('[data-fv^="lanes|"]')[i_];
    el.dispatchEvent(e_ === "click" ? new MouseEvent("click", { bubbles: true })
                                    : new PointerEvent(e_, { bubbles: true }));
  }, [i, ev]);

  if (await dimmed() !== 0) fail.push("rows are dimmed before any filter is applied");

  // Hover preview, exercised by DISPATCHING the enter/leave events rather than by
  // moving the mouse. page.hover() would be better evidence, but it does not
  // deliver an enter event to this element in headless Chrome — diagnosed by
  // dispatching manually and watching 25 rows dim, so the handler and the filter
  // are both fine and only the emulation is not. Worth one eyeball in a real
  // browser; everything else here is genuine.
  await fv('[data-fv^="lanes|"]', "mouseenter");
  await new Promise(r => setTimeout(r, 120));
  const onHover = await dimmed();
  await fv('[data-fv^="lanes|"]', "mouseleave");
  await new Promise(r => setTimeout(r, 120));
  if (await dimmed() !== 0) fail.push("hover preview did not clear on leave");
  if (!onHover || onHover >= total) fail.push(`hover previewed nothing useful (${onHover}/${total})`);

  await nth(0, "click");
  await new Promise(r => setTimeout(r, 150));
  const oneLane = await dimmed();
  await nth(1, "click");                       // widen: two lanes now visible
  await new Promise(r => setTimeout(r, 150));
  const twoLanes = await dimmed();
  if (twoLanes >= oneLane) fail.push(`second lane did not widen the filter (${oneLane} -> ${twoLanes} dimmed)`);

  await fv('[data-fv^="borders|"]', "click");  // AND across channels: narrows again
  await new Promise(r => setTimeout(r, 150));
  const crossed = await dimmed();
  if (crossed <= twoLanes) fail.push(`cross-channel filter did not narrow (${twoLanes} -> ${crossed})`);
  if (crossed >= total) fail.push("cross-channel filter hid everything");
  if (!(await page.$eval("#clearfilter", (n: any) => !n.hidden))) fail.push("clear-filter button did not appear");
  await page.click("#clearfilter");
  await new Promise(r => setTimeout(r, 150));
  if (await dimmed() !== 0) fail.push("clear did not restore every row");
  console.log(`  legend filter: hover ${onHover}/${total} · 1 lane ${oneLane} · 2 lanes ${twoLanes} · +border ${crossed} · cleared 0`);

  // ---- collapse the control bar ---------------------------------------------
  await page.evaluate(() => window.scrollTo(0, 0));
  const topH = () => page.$eval("#top", (n: any) => Math.round(n.getBoundingClientRect().height));
  const openH = await topH();
  await page.click("#collapse");
  await new Promise(r => setTimeout(r, 250));
  const shutH = await topH();
  const mini = await page.$eval("#mini", (n: any) => n.textContent.trim());
  if (shutH >= openH) fail.push(`collapse did not shrink the bar (${openH} -> ${shutH})`);
  if (!mini) fail.push("collapsed bar shows no summary line");
  if (await page.$eval(".toolbar", (n: any) => getComputedStyle(n).display) !== "none")
    fail.push("controls still visible when collapsed");
  await page.click("#collapse");
  await new Promise(r => setTimeout(r, 250));
  if ((await topH()) !== openH) fail.push("expanding did not restore the bar");
  console.log(`  collapse: ${openH}px -> ${shutH}px, mini "${mini.slice(0, 60)}"`);

  // "No border" must render as no border. Both an unassigned task and a border
  // whose style is "none" used to come out as a bright 2px solid — the same as
  // prod, the loudest value on the ramp.
  const borders = await page.evaluate(() => {
    const out: any = {};
    for (const b of document.querySelectorAll(".bar .shape")) {
      const row: any = b.closest(".row");
      const cs = getComputedStyle(b as any);
      out[row.dataset.task] = cs.borderTopStyle + "/" + cs.borderTopWidth;
    }
    return out;
  });
  const unassigned = ["d-rates", "d-moauth", "d-eadv"].filter(id => borders[id]);
  const bad = unassigned.filter(id => !/^none/.test(borders[id]));
  if (bad.length) fail.push(`tasks with no border still have one: ${bad.map(i => i + "=" + borders[i]).join(", ")}`);
  else if (unassigned.length) console.log(`  no-border tasks render "${borders[unassigned[0]]}"`);

  // ---- lane capacity --------------------------------------------------------
  // Capacity is the one knob that lets a plan say "this team can run two of
  // these side by side", so changing it must move real dates.
  //
  // Measured across the WHOLE plan, not the first six rows. Serialising a lane
  // pushes the tasks that depend on it, and those live in other lanes further
  // down — a window onto the first six rows can miss the entire effect and
  // report "capacity changed nothing".
  // RELOAD THE PRISTINE FIXTURE FIRST. By this point the suite has retimed a
  // task to six weeks, added one, deleted one and reordered a lane, leaving the
  // plan nine weeks late with its critical path somewhere else entirely — so
  // serialising the kitchen changed nothing and the test failed while the
  // feature worked. A test whose premise depends on twenty prior mutations
  // isn't testing the thing it names.
  await page.goto(page.url().split("#")[0].split("?")[0] + "?demo", { waitUntil: "networkidle2" });
  await page.waitForSelector(".bar");
  await new Promise(r => setTimeout(r, 250));
  await page.evaluate(() => window.scrollTo(0, 0));
  // MEASURED IN SLACK, NOT PIXELS. A pixel measure of the plan's right edge is
  // confounded three ways: the label gutter is sized from the labels (and an
  // earlier test renames one to something long), the chart origin snaps to whole
  // months, and the ALAP shift right-aligns everything to the tightest milestone
  // — so serialising a lane can push the plan a week later while moving its last
  // bar LEFT. Measured that way this test reported the opposite of the truth.
  //
  // Slack is the tool's own answer to "does this make the date", in weeks, and
  // no layout decision can move it. Positive = spare, negative = late.
  const slacks = () => page.evaluate(() => [...document.querySelectorAll(".ms .vd")].map((n: any) => {
    const t = n.textContent.trim(), m = t.match(/([\d.]+)\s*wks?/);
    const v = m ? parseFloat(m[1]) : 0;
    return /misses/.test(t) ? -v : /spare/.test(t) ? v : 0;
  }));
  const capBefore = Math.min(...await slacks());
  await openSettings("channels");
  const hasCap = await page.$("#chedit [data-cap]");
  if (!hasCap) fail.push("Lanes editor has no capacity control");
  else {
    // RUN IT BACKWARDS on the fixture: Kitchen fit-out already ships at 2, and
    // dropping it to 1 must push the plan out. Raising the FIRST lane instead
    // proved nothing here — Licensing is a dependency chain, not a queue, so
    // extra capacity cannot compress it and the test failed for a reason that
    // had nothing to do with capacity. This is also the exact experiment the
    // fixture's own task description invites: "set it back to 1 and watch the
    // grand opening slip."
    const capIdx = await page.$$eval("#chedit [data-cap]", (n: any[]) =>
      n.findIndex((x: any) => Number(x.value) > 1));
    if (capIdx < 0) fail.push("no lane in the fixture has capacity > 1 to test with");
    await page.evaluate((i: number) => {
      const n: any = document.querySelectorAll("#chedit [data-cap]")[i];
      n.value = "1"; n.dispatchEvent(new Event("change"));
    }, Math.max(0, capIdx));
    await new Promise(r => setTimeout(r, 300));
    const capAfter = Math.min(...await slacks());
    const header = (await page.$$eval(".lane-head", (n: any[]) => n.map((x: any) => x.textContent)))
      .find((h: string) => /∥\d/.test(h)) || "(no capacity lane left)";
    if (capAfter >= capBefore)
      fail.push(`dropping capacity to 1 did not cost the plan any slack (${capBefore} -> ${capAfter} wks)`);
    console.log(`  lane capacity 2->1: tightest slack ${capBefore} -> ${capAfter} wks, header "${header.trim()}"`);
    await reset();
    await new Promise(r => setTimeout(r, 250));
  }
  await closeSettings();

  // ---- start constraints ----------------------------------------------------
  // Dragging a bar's BODY sets "cannot start before <date>". The assertion is
  // deliberately NOT that the bar lands under the cursor: the ALAP shift is
  // recomputed from slack, so pushing a task on the binding chain spends slack
  // and slides everything else left instead. What must be true either way is
  // that the constraint got stored and is visible, and that dragging back past
  // the earliest feasible start removes it rather than leaving an inert one.
  await page.evaluate(() => window.scrollTo(0, 0));
  // Re-measured by id every time: render() replaces the element on every edit,
  // so a stashed handle would go stale, and a fresh "first on-screen bar" scan
  // would drift onto a different task halfway through the sequence.
  const barPin = (id: string) => page.evaluate((i: string) => {
    const b = document.querySelector(`[data-viz-id="${i}"]`) as any;
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { pin: b.classList.contains("pin"), left: Math.round(r.x),
             x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, id);
  // Clamped to the viewport: a pointer move past the window edge is not
  // delivered, so an unclamped drag would silently become a shorter one — or no
  // drag at all — and report itself as a broken feature.
  const dragBody = async (from: any, dx: number) => {
    const w = await page.evaluate(() => innerWidth);
    const to = Math.max(8, Math.min(w - 8, from.x + dx));
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to, from.y, { steps: 10 });
    await page.mouse.up();
    await new Promise(r => setTimeout(r, 350));
  };
  const nb0 = await onScreenBar();
  if (!nb0) fail.push("no bar on screen for the start-constraint test");
  else {
    await dragBody(nb0, 120);
    const set = await barPin(nb0.id);
    const setMsg = await page.$eval("#msg", (n: any) => n.textContent);
    if (!set?.pin) fail.push("dragging a bar right did not set a start constraint (no pin marker)");
    if (!/cannot start before/.test(setMsg)) fail.push(`no constraint message after drag: "${setMsg}"`);
    // The drag must also SELECT what it moved, or the inspector's Not-before
    // field describes some other task while the bar under the pointer is the one
    // that changed — which is how this was first caught.
    const nbField = await page.$eval("#nb", (n: any) => n.value).catch(() => "<no #nb>");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nbField))
      fail.push(`inspector Not-before does not show the dragged constraint: "${nbField}"`);
    await shot("9-start-constraint");
    // Back past the earliest feasible start: the scheduler ignores a floor it is
    // already past, so the constraint must be dropped rather than stored inert.
    if (set) {
      await dragBody(set, -400);
      const cleared = await barPin(nb0.id);
      const clrMsg = await page.$eval("#msg", (n: any) => n.textContent);
      if (cleared?.pin) fail.push("dragging back past the feasible start left an inert constraint");
      console.log(`  start constraint: set -> "${setMsg.trim()}", cleared -> "${clrMsg.trim()}"`);
    }
    await reset();
    await new Promise(r => setTimeout(r, 200));
  }

  // ---- actuals: a fact beats the schedule -----------------------------------
  // THE ONE ASSERTION THE NODE HARNESS CANNOT MAKE. `sched()` seeding an actual
  // start is checked there in a second; that the BAR then stops taking the ALAP
  // shift is a render-layer claim, and the render layer only exists here.
  //
  // The trick that makes it exact rather than "it moved left": the TODAY line is
  // a date drawn on the same axis as the bars, so a task pinned to today must
  // start at exactly that x. If the shift still applied it would sit `SHIFT`
  // days to the right of it, and the demo has a week of slack, so the two
  // answers are nowhere near each other.
  await page.evaluate(() => window.scrollTo(0, 0));
  const todayX = () => page.$eval(".gl.today", (n: any) => Math.round(n.getBoundingClientRect().x));
  // The WIDEST bar you can actually put a pointer on, and BOTH halves of that
  // cost a debugging round. Widest, because one assertion here is that a one-day
  // observed span draws narrower than the estimate it replaced — on a bar that
  // was already a day long that assertion cannot fail. And hit-tested with
  // elementFromPoint rather than trusted from a rect, because the inspector is
  // pinned OVER the chart: the widest bar had a perfectly healthy rect and sat
  // underneath the panel, so every gesture below landed on the toolbar instead
  // and every refusal silently did not happen.
  //
  // The panel has to be open before the question can be asked, so something is
  // selected first. Which bar that is does not matter; it is thrown away.
  const seed = await onScreenBar();
  if (seed) { await page.mouse.click(seed.x, seed.y); await new Promise(r => setTimeout(r, 250)); }
  const actBar = await page.evaluate(() => {
    let best: any = null;
    for (const b of document.querySelectorAll(".bar")) {
      const r = (b as any).getBoundingClientRect();
      if (r.top < 80 || r.left < 0 || r.right > innerWidth - 4 || r.bottom > innerHeight) continue;
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      if ((document.elementFromPoint(x, y) as any)?.closest?.(".bar") !== b) continue;
      if (!best || r.width > best.w) best = { id: (b as any).dataset.vizId, x, y, w: r.width };
    }
    return best;
  });
  if (!actBar) fail.push("no clickable bar on screen for the actuals test");
  else if (actBar.w < 20) fail.push(`widest reachable bar is only ${actBar.w}px — nothing for an observed span to shrink from`);
  else {
    await page.mouse.click(actBar.x, actBar.y);
    await new Promise(r => setTimeout(r, 250));
    // Re-measured on every call, never stashed: back-dating a start moves the
    // chart's own origin, so every x on screen changes even though the row did
    // not. A point captured before that edit points at empty space after it.
    const geom = () => page.evaluate((i: string) => {
      const b = document.querySelector(`[data-viz-id="${i}"]`) as any;
      const r = b.getBoundingClientRect();
      return { x: Math.round(r.x), w: Math.round(r.width), y: r.y + r.height / 2 };
    }, actBar.id);
    const g0 = await geom();
    // A REFUSED DRAG LEAVES NOTHING SELECTED, and that is not new here: a drag
    // that changes nothing never re-renders, so the pointer's element survives
    // and the click that follows the pointerup reaches #chart — whose click
    // means "you clicked the background, deselect". The refusal lives in the
    // message, not in the panel. Every gesture below that expects the inspector
    // afterwards says so rather than assuming.
    const reselect = async () => {
      await page.evaluate((i: string) => (document.querySelector(`[data-viz-id="${i}"]`) as any).click(), actBar.id);
      await new Promise(r => setTimeout(r, 250));
    };
    // `max` on the field IS today, so the test never has to compute a date — and
    // it is reading the same clock the page is.
    const today = await page.$eval("#as", (n: any) => n.max);
    await page.$eval("#as", (n: any) => { n.value = n.max; n.dispatchEvent(new Event("change")); });
    await new Promise(r => setTimeout(r, 300));
    const g1 = await geom(), tx = await todayX();
    if (Math.abs(g1.x - tx) > 1)
      fail.push(`a task started today should begin on the TODAY line: bar x=${g1.x}, line x=${tx} (was ${g0.x})`);
    if (g1.x === g0.x) fail.push("setting an actual start did not move the bar at all");
    // And the inspector must agree with the pixels, unshifted.
    const startsTxt = await page.$eval("#insp", (n: any) => (n.textContent.match(/starts\s+(\w+ \d+)/) || [])[1]);
    // Every flag label shares one class, so it is found by what it says.
    const todayLab = await page.$$eval(".ax.flag", (n: any[]) =>
      (n.map(e => e.textContent).find((t: string) => /^TODAY/.test(t)) || "").replace(/^TODAY\s*/, "").trim());
    if (startsTxt !== todayLab)
      fail.push(`inspector says it starts "${startsTxt}" but TODAY is "${todayLab}"`);
    console.log(`  actual start: bar landed on the TODAY line at x=${g1.x} (forecast was ${g0.x}), inspector "${startsTxt}"`);

    // THE ELAPSED STRIP, in progress meaning a start and no finish.
    const strip = () => page.evaluate((i: string) => {
      const b = document.querySelector(`[data-viz-id="${i}"]`) as any;
      const e = b.closest(".row").querySelector(".elapsed");
      if (!e) return null;
      const r = e.getBoundingClientRect(), br = b.getBoundingClientRect();
      return { w: Math.round(r.width), right: Math.round(r.right), barRight: Math.round(br.right),
               dx: Math.round(r.x - br.x), below: Math.round(r.y - br.y), h: Math.round(r.height) };
    }, actBar.id);
    const s1 = await strip();
    if (!s1) fail.push("a started task with no finish drew no elapsed strip");
    else {
      if (s1.dx !== 0) fail.push(`the elapsed strip should begin with the bar, off by ${s1.dx}px`);
      if (s1.below < 18) fail.push(`the elapsed strip should sit UNDER the bar, ${s1.below}px below its top`);
      if (s1.h < 3) fail.push(`a ${s1.h}px strip is a decoration, not a reading`);
    }

    // A FUTURE START IS REFUSED. It would read as in-progress work nobody has
    // begun, which is the one contradiction two nullable dates cannot rule out.
    const tomorrow = new Date(Date.parse(today + "T00:00:00Z") + 864e5).toISOString().slice(0, 10);
    await page.$eval("#as", (n: any, v: string) => { n.value = v; n.dispatchEvent(new Event("change")); }, tomorrow);
    await new Promise(r => setTimeout(r, 300));
    const refusal = await page.$eval("#msg", (n: any) => n.textContent.trim());
    const held = await page.$eval("#as", (n: any) => n.value);
    if (!/future/.test(refusal)) fail.push(`a future actual start was not refused: "${refusal}"`);
    if (held !== today) fail.push(`a refused future start still changed the field: "${held}"`);
    console.log(`  future start refused: "${refusal}" — field held at ${held}`);

    // THE OVERHANG IS THE READING THE STRIP EXISTS FOR. Started today is a
    // one-day strip, which shows the mechanism and nothing else. Back-dated
    // twenty days against an estimate shorter than that, the strip runs past
    // the bar's own right edge and says "this has already taken longer than we
    // thought" — which nothing else on the chart can say.
    const ELAPSED_DAYS = 21;                      // 20 days back, today inclusive
    const past = new Date(Date.parse(today + "T00:00:00Z") - 20 * 864e5).toISOString().slice(0, 10);
    await page.$eval("#as", (n: any, v: string) => { n.value = v; n.dispatchEvent(new Event("change")); }, past);
    await new Promise(r => setTimeout(r, 350));
    const s2 = await strip();
    const tx2 = await todayX();
    if (!s2) fail.push("no elapsed strip after back-dating the start");
    else {
      if (s2.right <= s2.barRight)
        fail.push(`elapsed should overhang an estimate it has outrun: strip ends ${s2.right}, bar ends ${s2.barRight}`);
      // It ends at the END of today, which is one day past the TODAY line —
      // work begun this morning has one day in it, like every other span here.
      const dayPx = s2.w / ELAPSED_DAYS;
      if (Math.abs(s2.right - (tx2 + dayPx)) > 1.5)
        fail.push(`elapsed should end one day past the TODAY line: strip ends ${s2.right}, line ${tx2} + ${dayPx.toFixed(1)}px`);
      console.log(`  elapsed strip: ${s2.w}px over a ${s2.barRight - (s2.right - s2.w)}px estimate, ending ${
        (s2.right - tx2).toFixed(0)}px past TODAY (one day is ${dayPx.toFixed(1)}px)`);
    }

    // The body drag means "cannot begin before", and a started task's beginning
    // is not up for negotiation. Refused rather than silently inert. Done while
    // the bar is still its estimated width, so the pointer has somewhere to land
    // that is not the grip.
    const gp = await geom();
    await dragBody({ x: gp.x + 4, y: gp.y }, 140);
    const dragMsg = await page.$eval("#msg", (n: any) => n.textContent.trim());
    const gd = await geom();
    if (gd.x !== gp.x) fail.push(`dragging a started bar moved it: x ${gp.x} -> ${gd.x}`);
    if (!/fact, not a constraint/.test(dragMsg)) fail.push(`no refusal when dragging a started bar: "${dragMsg}"`);
    // AND IT KEEPS THE SELECTION. A refused drag does not re-render, so the click
    // after the pointerup used to reach #chart and be read as "you clicked the
    // background" — being told why a gesture was refused also shut the panel you
    // would have acted on. #chart now ignores a click that travelled.
    const stillOpen = await page.$eval("#insp", (n: any) => !n.hidden && n.textContent.trim().length > 0);
    if (!stillOpen) fail.push("a refused drag deselected the task it was refusing");
    console.log(`  started bar refuses the constraint drag and stays selected: "${dragMsg}"`);

    await reselect();

    // MARK DONE stamps the end, and the bar becomes its OBSERVED span. Started
    // and finished today is one day of work, so it is the narrowest bar the
    // chart draws — and the grip must then refuse, because dragging it would
    // edit an estimate that no longer draws anything.
    await page.$eval("#markdone", (n: any) => n.click());
    await new Promise(r => setTimeout(r, 300));
    const doneEnd = await page.$eval("#ae", (n: any) => n.value);
    if (doneEnd !== today) fail.push(`"Mark done" should finish it today, field reads "${doneEnd}"`);
    const g2 = await geom();
    // THE BAR BECOMES EXACTLY WHAT THE STRIP WAS SHOWING. Finishing today after
    // starting twenty days ago means the observed span IS the elapsed span, so
    // the two must agree to the pixel — and it must no longer be the estimate.
    if (s2 && Math.abs(g2.w - s2.w) > 1)
      fail.push(`the observed span should match the elapsed strip: bar ${g2.w}px vs strip ${s2.w}px`);
    if (g2.w === g0.w) fail.push(`the bar is still its ${g0.w}px estimate after being marked done`);
    // DONE IS TYPOGRAPHY, and the strip goes: a finished bar IS its observed
    // span, so an elapsed strip under it would be the same fact drawn twice.
    if (await strip()) fail.push("a finished task still drew an elapsed strip");
    const struck = await page.evaluate((i: string) => {
      const lab = (document.querySelector(`[data-viz-id="${i}"]`) as any).closest(".row").querySelector(".rowlabel");
      return { done: lab.classList.contains("done"),
               line: getComputedStyle(lab).textDecorationLine };
    }, actBar.id);
    if (!struck.done || !/line-through/.test(struck.line))
      fail.push(`a finished task's label is not struck through: ${JSON.stringify(struck)}`);
    console.log(`  done: strip gone, label ${struck.line}`);

    const grip = await page.evaluate((i: string) => {
      const b = document.querySelector(`[data-viz-id="${i}"]`) as any;
      const r = b.querySelector(".grip").getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, actBar.id);
    await page.mouse.move(grip.x, grip.y); await page.mouse.down();
    await page.mouse.move(grip.x + 90, grip.y, { steps: 6 }); await page.mouse.up();
    await new Promise(r => setTimeout(r, 300));
    const gripMsg = await page.$eval("#msg", (n: any) => n.textContent.trim());
    const g3 = await geom();
    if (g3.w !== g2.w) fail.push(`the grip resized a finished bar: ${g2.w}px -> ${g3.w}px`);
    if (!/actually took/.test(gripMsg)) fail.push(`no refusal when gripping a finished bar: "${gripMsg}"`);
    console.log(`  mark done: ${g0.w}px estimate -> ${g2.w}px observed, grip refused ("${gripMsg.slice(0, 40)}…")`);

    await reselect();

    // CLEARING THE START CLEARS THE END WITH IT — an end on its own is a date
    // nothing reads — and the bar goes back to exactly where the forecast put it.
    await page.$eval("#asx", (n: any) => n.click());
    await new Promise(r => setTimeout(r, 300));
    const fields = await page.evaluate(() => [(document.querySelector("#as") as any)?.value,
                                              (document.querySelector("#ae") as any)?.value,
                                              (document.querySelector("#ae") as any)?.disabled]);
    const g5 = await geom();
    if (fields[0] || fields[1]) fail.push(`clearing the start left ${JSON.stringify(fields)} behind`);
    if (!fields[2]) fail.push("the finish field should be disabled with no start to hang it on");
    if (g5.x !== g0.x || g5.w !== g0.w)
      fail.push(`clearing the actuals did not restore the forecast bar: ${JSON.stringify(g0)} -> ${JSON.stringify(g5)}`);
    if (await strip()) fail.push("clearing the actuals left an elapsed strip behind");
    const anyMark = await page.$$eval(".elapsed, .rowlabel.done", (n: any[]) => n.length);
    if (anyMark) fail.push(`${anyMark} actuals mark(s) survived on a plan with no actuals`);
    console.log(`  cleared: both fields empty, finish disabled, no marks left, bar back at x=${g5.x} w=${g5.w}`);
    await reset();
    await new Promise(r => setTimeout(r, 200));
  }

  // ---- the strip is skipped where there is no room for it -------------------
  // The squeezed fold divides bar height between tracks, so the 4px underneath a
  // full-height bar is not there. Shrinking the strip to fit would turn a reading
  // into a decoration — the same trade that state already makes with the grip.
  //
  // Only a lane that genuinely runs work in parallel HAS that state: where work
  // never overlaps, one-row-per-track and one-row-flat are the same picture and
  // the lane cycles in two. So this drives the one the fixture marks with ∥2, and
  // RE-QUERIES THE HEAD BEFORE EVERY CLICK — each fold rebuilds it, so a handle
  // held across two clicks is detached for the second and the state never moves.
  await page.evaluate(() => window.scrollTo(0, 0));
  const laneIdx = await page.$$eval(".lane-head", (n: any[]) =>
    n.findIndex((h: any) => /∥\d/.test(h.textContent)));
  if (laneIdx < 0) fail.push("no lane at capacity in the fixture — the fold gate cannot be tested");
  else {
    // A bar belonging to that lane: #grid is a flat run of head, rows…, head,
    // rows…, so walk forward from the head until the next one.
    const inLane = await page.evaluate((i: number) => {
      const kids = [...document.querySelector("#grid")!.children];
      const at = kids.filter(k => k.classList.contains("lane-head"))[i];
      for (let k = kids.indexOf(at) + 1; k < kids.length; k++) {
        if (kids[k].classList.contains("lane-head")) break;
        const b = kids[k].querySelector(".bar") as any;
        if (b) { b.click(); return b.dataset.vizId; }
      }
      return null;
    }, laneIdx);
    if (!inLane) fail.push("no bar under the parallel lane's head");
    else {
      await page.$eval("#as", (n: any) => { n.value = n.max; n.dispatchEvent(new Event("change")); });
      await new Promise(r => setTimeout(r, 350));
      const expanded = await page.$$eval(".elapsed", (n: any[]) => n.length);
      if (!expanded) fail.push("no elapsed strip before folding — the gate test has nothing to gate");
      // Expanded -> one row per track -> one row flat. Full-height bars in the
      // middle state, so the strip must SURVIVE that one and only go in the last.
      const fold = async () => {
        await page.evaluate((i: number) =>
          (document.querySelectorAll(".lane-head")[i] as any).click(), laneIdx);
        await new Promise(r => setTimeout(r, 300));
      };
      await fold();
      const perTrack = await page.$$eval(".elapsed", (n: any[]) => n.length);
      if (perTrack !== expanded)
        fail.push(`one-row-per-track keeps full-height bars, so it must keep the strip: ${expanded} -> ${perTrack}`);
      await fold();
      const squeezed = await page.evaluate(() => ({
        thin: document.querySelectorAll(".row.thin").length,
        inThin: document.querySelectorAll(".row.thin .elapsed").length,
      }));
      if (!squeezed.thin) fail.push("two folds did not reach the squeezed state on a multi-track lane");
      else if (squeezed.inThin)
        fail.push(`${squeezed.inThin} strip(s) drawn in a squeezed row with no space for them`);
      else console.log(`  fold gate: strip kept through one-row-per-track (${perTrack}), gone in ${squeezed.thin} squeezed row(s)`);
    }
  }
  await reset();
  await new Promise(r => setTimeout(r, 200));

  // ---- EVERY TASK SAYS WHY IT IS WHERE IT IS --------------------------------
  // The claim is not "we show a number", it is that the number is never missing.
  // Two ways it went missing while this was being written, both silent: `why`
  // started as a module global that selftest() overwrote at boot with a reference
  // plan's answers, and tasks with an actual start are seeded before the loop that
  // records the reason, so they had no entry at all. Both showed up as an
  // inspector that simply said nothing — which is indistinguishable from a task
  // that genuinely has no constraint, and is why this counts rather than samples.
  const explain = await page.evaluate(async () => {
    const rows = () => [...document.querySelectorAll(".row")];
    const out: any[] = [];
    for (let i = 0; i < rows().length; i++) {
      const bar = rows()[i]?.querySelector(".bar") as any;
      if (!bar) continue;
      bar.click();
      await new Promise(r => setTimeout(r, 90));
      const drows = [...document.querySelectorAll(".deprow")];
      const up = drows[0];
      // Held-by shares the first row, after a separator — so the dependency chips
      // are the ones BEFORE it and the held-by chips are the ones after.
      const all = [...(up?.querySelectorAll(".chip, .heldsep") || [])];
      const cut = all.findIndex((n: any) => n.classList.contains("heldsep"));
      const chips = (cut < 0 ? all : all.slice(0, cut));
      const heldChips = cut < 0 ? [] : all.slice(cut + 1);
      out.push({
        label: (rows()[i].querySelector(".rowlabel") as any)?.textContent.trim(),
        pins: chips.map((c: any) => c.classList.contains("pin")),
        // Held-by is DATA, not a sentence: a key chip and, where there is one, a
        // named task carrying the same `data-go` the dependency chips use.
        note: heldChips.map((c: any) => c.textContent.trim()).join(" | "),
        who: (heldChips.find((c: any) => c.dataset.go) as any)?.dataset.go || "",
      });
    }
    return out;
  });
  const mute = explain.filter((e: any) => !e.note && !e.pins.some(Boolean));
  // The row must never be a sentence again — it is chips, and a bare text node in
  // it is prose creeping back.
  const prose = explain.filter((e: any) => / not by anything | held by the |it has already started/.test(e.note));
  if (prose.length) fail.push(`the Held-by row is generating prose again: "${prose[0].note}"`);
  if (mute.length)
    fail.push(`${mute.length}/${explain.length} task(s) explain nothing about their date, e.g. `
      + JSON.stringify(mute.slice(0, 3).map((e: any) => e.label)));
  // SORTED TIGHTEST-FIRST, so whatever is pinning has to be at the head of the
  // list. Checked as a shape rather than by parsing "+3 days" against "+1 wk",
  // which would be a second copy of the unit formatting.
  const unsorted = explain.filter((e: any) =>
    e.pins.some(Boolean) && e.pins.lastIndexOf(true) >= e.pins.indexOf(false) && e.pins.includes(false));
  if (unsorted.length)
    fail.push(`a pinning dependency was not at the head of the list on ${unsorted.length} task(s), `
      + `so the row is not sorted tightest-first: ${JSON.stringify(unsorted[0])}`);
  // At most one thing can be *the* bottleneck, ties aside — a row where every chip
  // claims to be pinning is a row that has told you nothing.
  const allPinned = explain.filter((e: any) => e.pins.length > 1 && e.pins.every(Boolean));
  if (allPinned.length)
    fail.push(`every dependency claimed to be pinning on ${allPinned.length} task(s): ${allPinned[0].label}`);
  // A QUEUE MUST NAME ITS OCCUPANT. "That lane is busy" stops one question short
  // of useful, and the queue is the only bottleneck with no arrow on the chart
  // pointing at its cause — so if the name is missing there is nothing to go and
  // look at.
  const queued = explain.filter((e: any) => /^queue/.test(e.note));
  const nameless = queued.filter((e: any) => !e.who);
  if (queued.length && nameless.length)
    fail.push(`${nameless.length} task(s) held by a lane queue did not name what is in it, `
      + `e.g. "${nameless[0].note}"`);
  const withNote = explain.filter((e: any) => e.note).length;
  console.log(`  bottleneck: ${explain.length}/${explain.length} tasks explain their date `
    + `(${explain.length - withNote} pinned by a dependency, ${withNote} by a queue, a constraint or a fact)`);
  await reset();
  await new Promise(r => setTimeout(r, 200));

  // ---- THE ESTIMATE, ON A FINISHED BAR --------------------------------------
  // A done bar is drawn at what really happened, so `dur` stops driving anything
  // and the estimate is on screen nowhere. The tick is the only thing that says
  // whether it was right, and its whole claim is GEOMETRIC — inside the bar means
  // the work outran the estimate, past the right edge means it beat it — so this
  // checks the pixels rather than the words.
  await page.evaluate(() => window.scrollTo(0, 0));
  const estCase = async (dur: number) => page.evaluate(async (d: number) => {
    const $ = (s: string) => document.querySelector(s) as any;
    const row = () => document.querySelectorAll(".row")[0] as any;
    row().querySelector(".bar").click();
    await new Promise(r => setTimeout(r, 200));
    // Both actuals fields are capped at today, so the span is short — which is
    // plenty: what varies is the ESTIMATE, and that is the whole point.
    const today = new Date();
    const iso = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
      .toISOString().slice(0, 10);
    $("#as").value = $("#start").value; $("#as").dispatchEvent(new Event("change"));
    await new Promise(r => setTimeout(r, 200));
    $("#ae").value = iso; $("#ae").dispatchEvent(new Event("change"));
    await new Promise(r => setTimeout(r, 200));
    $("#dur").value = String(d); $("#dur").dispatchEvent(new Event("change"));
    await new Promise(r => setTimeout(r, 300));
    row().querySelector(".bar").click();
    await new Promise(r => setTimeout(r, 250));
    const bar = row().querySelector(".bar");
    const tick = bar.querySelector(".esttick");
    return { cls: tick ? tick.className : null,
             at: tick ? parseFloat(tick.style.left) : null,
             barW: parseFloat(bar.style.width),
             lead: !!bar.querySelector(".estlead"),
             says: $("#est") ? $("#est").textContent.trim() : null };
  }, dur);

  const over = await estCase(1);
  if (!/over/.test(over.cls || "")) fail.push(`a task that outran its estimate got tick "${over.cls}"`);
  if (!(over.at! < over.barW)) fail.push(`the overrun tick is at ${over.at}, not inside the ${over.barW}px bar`);
  if (over.lead) fail.push("an overrun drew a whisker; there is nothing outside the bar to point at");
  if (!/over the estimate/.test(over.says || "")) fail.push(`overrun reads "${over.says}"`);

  const early = await estCase(30);
  if (!/early/.test(early.cls || "")) fail.push(`a task that beat its estimate got tick "${early.cls}"`);
  if (!(early.at! > early.barW)) fail.push(`the early tick is at ${early.at}, not past the ${early.barW}px bar`);
  // WITHOUT THE WHISKER the tick is a mark floating in whitespace attached to
  // nothing, which is the entire reason it exists.
  if (!early.lead) fail.push("finishing early drew a tick outside the bar with no whisker to it");
  if (!/early/.test(early.says || "")) fail.push(`early reads "${early.says}"`);

  // A task still in progress must NOT get one: its bar is already the estimate
  // walked from the real start, so a tick would land on its own right edge and
  // say nothing.
  const running = await page.evaluate(async () => {
    const $ = (s: string) => document.querySelector(s) as any;
    const row = () => document.querySelectorAll(".row")[0] as any;
    row().querySelector(".bar").click();
    await new Promise(r => setTimeout(r, 200));
    $("#aex").click();                                   // un-finish it
    await new Promise(r => setTimeout(r, 350));
    return !!(row().querySelector(".esttick"));
  });
  if (running) fail.push("a task in progress drew an estimate tick; its bar IS the estimate");
  console.log(`  estimate mark: overran -> tick at ${over.at!.toFixed(0)}px inside a ${
    over.barW.toFixed(0)}px bar; early -> ${early.at!.toFixed(0)}px past it with a whisker; `
    + `in progress -> none`);
  await reset();
  await new Promise(r => setTimeout(r, 200));

  // ---- the comparison: an older save that must NOT recompute ----------------
  // THE ASSERTION THAT MATTERS IS THE THIRD ONE. A comparison that silently
  // recomputed would always show zero variance and look like good news, which is
  // worse than having none at all — so it is not enough to check that turning it
  // on works, the check has to edit the plan afterwards and prove the version
  // stayed where it was.
  //
  // COMPARING NEEDS A SAVED VERSION, and the demo is a fixture Save refuses. So
  // unlike almost everything else in this file these two blocks work on a fork and
  // delete it afterwards. That is not a workaround, it is the real path: History →
  // Compare is unreachable on the fixture by construction, and the README says so.
  const strips = () => page.$$eval(".baseline", (n: any[]) => n.map((e: any) => {
    const r = e.getBoundingClientRect();
    const br = e.closest(".row").querySelector(".bar").getBoundingClientRect();
    return { dx: Math.round(r.x - br.x), dw: Math.round(r.width - br.width) };
  }));
  const saveNow = async (note: string) => {
    await page.evaluate(async (t: string) => {
      const $ = (s: string) => document.querySelector(s) as any;
      $("#save").click();
      await new Promise(r => setTimeout(r, 200));
      if (!$("#savepop").hidden) {
        $("#savenote").value = t;
        $("#savenote").dispatchEvent(new KeyboardEvent("keydown",
          { key: "Enter", bubbles: true, cancelable: true }));
      }
    }, note);
    await new Promise(r => setTimeout(r, 800));
  };
  const compareTo = async (n: number | null) => {
    if (n == null) {
      await page.evaluate(() => (document.querySelector("#cmpoff") as any).click());
    } else {
      await page.evaluate(() => (document.querySelector("#histbtn") as any).click());
      await new Promise(r => setTimeout(r, 800));
      await page.evaluate((k: number) =>
        (document.querySelector(`#hist .hcmp[data-n="${k}"]`) as any).click(), n);
      await new Promise(r => setTimeout(r, 1000));
      await page.evaluate(() => (document.querySelector("#hist-close") as any).click());
    }
    await new Promise(r => setTimeout(r, 500));
  };
  const onAFork = async (label: string, fn: () => Promise<void>) => {
    const seen = await page.$$eval("#pick option", (n: any[]) => n.map((o: any) => o.value));
    await openSettings("plan");
    await page.click("#fork");
    await closeSettings();
    await new Promise(r => setTimeout(r, 900));
    const fid = await page.evaluate(() =>
      JSON.parse(decodeURIComponent(location.hash.slice(1)) || "{}").id);
    if (!fid || seen.includes(fid)) { fail.push(`${label}: fork produced no plan to work on`); return; }
    try { await fn(); }
    finally {
      await page.evaluate(async (f: string) => {
        localStorage.removeItem("ts:plan:" + f); localStorage.removeItem("ts:hist:" + f);
        await fetch("api/delete", { method: "POST",
          headers: { "content-type": "application/json" }, body: JSON.stringify({ id: f }) });
      }, fid);
    }
  };

  await page.evaluate(() => window.scrollTo(0, 0));
  await onAFork("comparison", async () => {
    // Fork saves as it creates, so version 1 is the plan exactly as it stands —
    // which makes "compare against 1" the moment of capture the old test had.
    if ((await strips()).length) fail.push("a plan comparing against nothing drew comparison strips");
    if (!await page.$eval("#cmpchip", (n: any) => n.hidden))
      fail.push("the comparison chip is showing with no comparison set");
    await compareTo(1);
    const chip = await page.$eval("#cmpname", (n: any) => n.textContent.trim());
    if (!/^vs save #1/.test(chip)) fail.push(`the comparison chip does not name the version: "${chip}"`);
    // DERIVED FROM THE DRAWN EXTENT, so against the version it was saved as, every
    // strip must sit exactly under its own bar — same x, same width. Anything else
    // means the derivation produced a schedule the chart was not showing.
    const s0 = await strips();
    if (s0.length !== bars0) fail.push(`derived ${s0.length} strips for ${bars0} bars`);
    const off = s0.filter((v: any) => v.dx !== 0 || v.dw !== 0);
    if (off.length)
      fail.push(`comparing against an unchanged save should be invisible: ${JSON.stringify(off)}`);
    console.log(`  comparison: ${chip}, ${s0.length} strips all flush with their bars`);

    // NOW MOVE THE PLAN. The strips must not follow.
    await page.evaluate(() => (document.querySelector(".bar") as any).click());
    await new Promise(r => setTimeout(r, 250));
    await page.$eval("#dur", (n: any) => { n.value = "40"; n.dispatchEvent(new Event("change")); });
    await new Promise(r => setTimeout(r, 400));
    const s1b = await strips();
    const drifted = s1b.filter((v: any) => v.dx !== 0 || v.dw !== 0);
    if (!drifted.length)
      fail.push("after retiming a task every strip still matched its bar — the comparison is recomputing");
    const vTxt = await page.$eval("#var", (n: any) => n.textContent.trim());
    if (!/comparison/.test(vTxt)) fail.push(`the inspector reports no variance: "${vTxt}"`);
    console.log(`  comparison held: ${drifted.length}/${s1b.length} bar(s) now off it — "${vTxt}"`);

    // IT LIVES IN THE HASH, NOT THE DOCUMENT — the whole reason it stopped being
    // `doc.baseline`. So it must survive a reload, and the saved plan must not
    // have grown a field.
    await saveNow("retimed under a comparison");
    const stored = await page.evaluate(async (f: string) =>
      "baseline" in await fetch("api/load?id=" + f).then((r: any) => r.json()),
      await page.evaluate(() => JSON.parse(decodeURIComponent(location.hash.slice(1)) || "{}").id));
    if (stored) fail.push("saving while comparing wrote a baseline into the document");
    // DROP `?demo`, KEEP THE FRAGMENT. `?demo` forces the fixture ahead of
    // anything in the hash — that is what it is for — so a plain reload here can
    // only ever come back as the demo, and would say the comparison did not
    // survive when what did not survive was the plan. The fragment is left
    // exactly as the app wrote it, because that is the thing under test.
    const keepHash = new URL(page.url());
    await page.goto(keepHash.origin + keepHash.pathname + keepHash.hash, { waitUntil: "networkidle2" });
    await page.waitForSelector(".bar");
    await new Promise(r => setTimeout(r, 700));
    const rechip = await page.$eval("#cmpname", (n: any) => n.textContent.trim());
    if (!/^vs save #1/.test(rechip))
      fail.push(`the comparison did not survive a reload: "${rechip}"`);
    if (!(await strips()).length) fail.push("the comparison survived a reload but drew no strips");

    // And turning it off takes the strips with it.
    await compareTo(null);
    if ((await strips()).length) fail.push("turning the comparison off left its strips on the chart");
    if (await page.evaluate(() => "cmp" in JSON.parse(decodeURIComponent(location.hash.slice(1)) || "{}")))
      fail.push("turning the comparison off left its key in the hash");
    console.log(`  comparison: survived a reload, wrote nothing to the document, cleared cleanly`);
  });
  await reset();
  await new Promise(r => setTimeout(r, 200));

  // ---- REGRESSION: the strips must be the bar that was DRAWN ----------------
  // This shipped wrong once and the derivation inherits the same trap. A bar's
  // WIDTH is the span measured at its unshifted start while its LEFT edge is
  // shifted, and asking the calendar again from the shifted start is a different
  // question with a different answer the moment a holiday sits between the two.
  // On a real plan it recorded 11 of 38 bars 4-11px off, so a comparison already
  // reported movement at the instant it was taken.
  //
  // IT MATTERS MORE NOW, NOT LESS: stripsFrom() runs the render pipeline over an
  // archived document precisely so this maths is never transcribed into a second
  // copy that can drift from the first.
  //
  // THE DEMO CANNOT CATCH THIS AS IT SHIPS, which is why the check above does
  // not: it has no holidays, and it misses a milestone, so the ALAP shift is 0
  // and the two expressions are the same expression. Both have to be arranged.
  await page.evaluate(() => window.scrollTo(0, 0));
  await onAFork("drawn-extent", async () => {
  await openSettings("plan");
  await page.click('[data-dow="0"]');                 // Sunday off
  await page.click('[data-dow="6"]');                 // Saturday off
  const planStart = await page.$eval("#start", (n: any) => n.value);
  for (const d of [18, 25, 39, 46, 60, 67, 81]) {     // days off scattered through the plan
    await page.$eval("#holnew", (n: any, v: string) => { n.value = v; }, 
      new Date(Date.parse(planStart + "T00:00:00Z") + d * 864e5).toISOString().slice(0, 10));
    await page.click("#holadd");
  }
  await closeSettings();
  // Slack, so the shift is a real number rather than zero.
  await page.$$eval("[data-ms-date]", (ns: any[]) => ns.forEach((n: any) => {
    n.value = new Date(Date.parse(n.value + "T00:00:00Z") + 120 * 864e5).toISOString().slice(0, 10);
    n.dispatchEvent(new Event("change"));
  }));
  await new Promise(r => setTimeout(r, 400));
  const spare = await page.$$eval(".ms .vd", (n: any[]) => n.map(x => x.textContent.trim()));
  if (!spare.every((c: string) => /to spare/.test(c)))
    fail.push(`the shift regression needs slack to be meaningful, got ${JSON.stringify(spare)}`);
  // Save the arranged plan, then measure against exactly that save. Version 2:
  // the fork's own creation is version 1, from before any of this was set up.
  await saveNow("five-day week, seven days off, slack to slide into");
  await compareTo(2);
  const snap = await strips();
  const wrong = snap.filter((v: any) => v.dx !== 0 || v.dw !== 0);
  if (wrong.length)
    fail.push(`a comparison derived on a plan with days off and slack does not match its own bars: ${
      wrong.length}/${snap.length} off, e.g. ${JSON.stringify(wrong.slice(0, 3))}`);
  console.log(`  comparison on a 5-day week with 7 days off and ${spare[0]}: all ${snap.length} flush`);
  });
  await reset();
  await new Promise(r => setTimeout(r, 200));

  // ---- REGRESSION: the refusal must name the thing that is actually holding it
  // "Why is that waiting?" is one of the questions this tool exists for, and the
  // one place it answers it in a sentence was testing `start + dur` — the last
  // surviving copy of the assumption the working week deleted from the scheduler.
  // It lived in a MESSAGE, so no assertion covered it, and on the all-on demo a
  // duration and a span are the same number so it agreed by coincidence. Under a
  // five-day week it stopped recognising the dependency and blamed the team.
  await page.evaluate(() => window.scrollTo(0, 0));
  await openSettings("plan");
  await page.click('[data-dow="0"]');
  await page.click('[data-dow="6"]');
  await closeSettings();
  // NAMED, not scanned for. The bug only shows where the blocking task's span
  // crosses a non-working day — a dependency that starts and finishes inside one
  // week has `start + dur` equal to its real end, so the broken test agreed by
  // accident there too. "Sign the lease" is 7 working days from a Monday, so on a
  // five-day week it runs through the following Tuesday while the old arithmetic
  // said Monday, and "Building permits" waits on it. Pinning the pair is the same
  // move `wantFixture` makes, and it fails loudly rather than quietly weakening
  // if the demo is ever retimed.
  const gated = await page.evaluate(() => {
    const b = document.querySelector('[data-label="Building permits"]') as any;
    if (!b) return null;
    b.scrollIntoView({ block: "center", inline: "center" });
    const r = b.getBoundingClientRect();
    const x = r.x + r.width / 2, y = r.y + r.height / 2;
    if ((document.elementFromPoint(x, y) as any)?.closest?.(".bar") !== b) return null;
    b.click();
    return { id: b.dataset.vizId, x, y, waits: !!document.querySelector("#insp .chip [data-rm]") };
  });
  if (!gated) fail.push('"Building permits" is not on screen — the refusal regression cannot run');
  else if (!gated.waits) fail.push('"Building permits" no longer waits on anything — retime the regression');
  else {
    // Left past the earliest the plan allows: the scheduler ignores a floor it is
    // already past, so the bar does not move and the refusal is the schedule's.
    await dragBody(gated, -400);
    const why = await page.$eval("#msg", (n: any) => n.textContent.trim());
    if (!/waiting on /.test(why))
      fail.push(`a dependency-bound task on a five-day week blamed the wrong thing: "${why}"`);
    console.log(`  refusal names its blocker on a 5-day week: "${why}"`);
  }
  await reset();
  await new Promise(r => setTimeout(r, 200));

  // ---- vertical drag reorders the team's queue ------------------------------
  // Same gesture, other axis. The assertion is on the ROW ORDER of the labels in
  // that lane, not on pixels: array order IS queue order, and a reorder that did
  // not change the list changed nothing at all.
  const laneOrder = () => page.$$eval(".rowlabel", (n: any[]) => n.map((e: any) => e.textContent));
  const vBar = await onScreenBar();
  if (!vBar) fail.push("no bar on screen for the reorder-drag test");
  else {
    const order0 = await laneOrder();
    // Counted before AND after, never just after: the previous test's undo
    // restores the snapshot taken at the START of its clearing drag, which still
    // had a constraint in it — so a pinned bar is already on screen here and an
    // absolute count would blame this drag for it.
    const pins0 = await page.$$eval(".bar.pin", (n: any[]) => n.length);
    await page.mouse.move(vBar.x, vBar.y);
    await page.mouse.down();
    await page.mouse.move(vBar.x, vBar.y + 26, { steps: 6 });   // exactly one row
    await page.mouse.up();
    await new Promise(r => setTimeout(r, 300));
    const order1 = await laneOrder();
    const moved = order0.findIndex((l: string, i: number) => l !== order1[i]);
    if (moved < 0) fail.push("dragging a bar down one row did not reorder its team's queue");
    else console.log(`  reorder drag: row ${moved} "${order0[moved]}" <-> "${order1[moved]}"`);
    // And the horizontal meaning must NOT have fired: a vertical drag is not a
    // start constraint. This is the axis lock, asserted rather than assumed.
    const pins1 = await page.$$eval(".bar.pin", (n: any[]) => n.length);
    if (pins1 !== pins0)
      fail.push(`a vertical drag changed the constraint count ${pins0} -> ${pins1} — axis lock leaked`);
    await reset();
    await new Promise(r => setTimeout(r, 200));
  }

  // ---- dismissing the inspector must not move the page ----------------------
  // Select a task, scroll down, dismiss: the panel's reserved space used to
  // vanish with it, shortening the document so the browser clamped scrollTop and
  // the whole chart lurched upward. Assert on scrollY, which is the thing that
  // actually jumped — the panel being hidden is not in doubt.
  await page.evaluate(() => window.scrollTo(0, 0));
  const jumpBar = await onScreenBar();
  if (jumpBar) {
    await page.mouse.click(jumpBar.x, jumpBar.y);
    await new Promise(r => setTimeout(r, 250));
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await new Promise(r => setTimeout(r, 250));
    const yBefore = await page.evaluate(() => window.scrollY);
    const x = await page.$("#dismiss");
    if (!x) fail.push("no inspector open to dismiss for the layout-jump test");
    else {
      await x.click();
      await new Promise(r => setTimeout(r, 350));
      const yAfter = await page.evaluate(() => window.scrollY);
      if (Math.abs(yAfter - yBefore) > 2)
        fail.push(`dismissing the inspector jumped the page: scrollY ${yBefore} -> ${yAfter}`);
      else console.log(`  dismiss holds the page: scrollY ${yBefore} -> ${yAfter}`);
    }
  }

  // ---- the label column is sized to its labels ------------------------------
  // Not a fixed 430 any more. Two things must both hold, and they pull against
  // each other: nothing clips (the reason 430 was chosen), and no wide dead strip
  // is left over (the reason it stopped being 430).
  const labelCol = await page.evaluate(() => {
    const labs = [...document.querySelectorAll(".rowlabel, .lane-head")] as any[];
    const colW = Math.round((labs[0] as any).getBoundingClientRect().width);
    // The natural width is measured on an UNCONSTRAINED clone, not with
    // scrollWidth. scrollWidth is clamped to at least clientWidth, so it reports
    // the column's own width for every label that fits — which makes
    // "colW - widest > 60" an assertion that can never fail, however much dead
    // space is actually there. It passed at 430px. Clone, let it size itself,
    // and the number means something.
    let clipped = 0, widest = 0;
    for (const l of labs) {
      if (l.scrollWidth > l.clientWidth + 1) clipped++;
      const c = l.cloneNode(true) as any;
      c.style.cssText = "position:absolute;visibility:hidden;left:-9999px;top:0;width:auto;white-space:nowrap";
      document.body.append(c);
      widest = Math.max(widest, c.getBoundingClientRect().width);
      c.remove();
    }
    return { colW, clipped, widest: Math.round(widest) };
  });
  if (labelCol.clipped) fail.push(`${labelCol.clipped} label(s) clip in a ${labelCol.colW}px column`);
  if (labelCol.colW - labelCol.widest > 60)
    fail.push(`label column is ${labelCol.colW}px for a ${labelCol.widest}px widest label — dead strip on the left`);
  console.log(`  label column: ${labelCol.colW}px, widest label ${labelCol.widest}px, ${labelCol.clipped} clipped`);

  // ---- the refusal has to be visible FROM WHERE THE DRAG HAPPENS ------------
  // The message used to live inline in the control bar, so collapsing that bar
  // or scrolling down at all meant an illegal drag explained itself off-screen.
  // Reproduce the worst case — collapsed AND scrolled to the bottom — and assert
  // the message is inside the viewport, which is the whole claim.
  const dismiss = await page.$("#dismiss");
  if (dismiss) { await dismiss.click(); await new Promise(r => setTimeout(r, 200)); }
  await page.evaluate(() => (document.querySelector("#collapse") as any).click());
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await new Promise(r => setTimeout(r, 300));
  const deep = await onScreenBar();
  if (!deep) fail.push("no bar on screen with the control bar collapsed and the page scrolled down");
  else {
    await dragBody(deep, -400);                       // illegal: left of the feasible start
    // SIZE IS CHECKED FIRST, and that is the whole point of this assertion. The
    // first version tested only "is the rect inside the viewport", which a
    // display:none element passes trivially — its rect is all zeros, and zero is
    // inside everything. It reported a healthy pass on a message that was not on
    // screen at all. Anything asserting visibility has to prove the box exists
    // before it argues about where the box is.
    const box = await page.evaluate(() => {
      const m = document.querySelector("#msg") as any;
      if (!m || !m.textContent.trim()) return null;
      const r = m.getBoundingClientRect(), cs = getComputedStyle(m);
      return { text: m.textContent.trim(), top: Math.round(r.top), bottom: Math.round(r.bottom),
               w: Math.round(r.width), h: Math.round(r.height),
               shown: cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity > 0,
               inView: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth };
    });
    if (!box) fail.push("an illegal drag showed no message at all with the control bar collapsed");
    else if (!box.shown || box.w < 40 || box.h < 10)
      fail.push(`the refusal is not rendered: ${box.w}x${box.h}, shown=${box.shown} — "${box.text}"`);
    else if (!box.inView) fail.push(`the refusal rendered outside the viewport (top ${box.top}, bottom ${box.bottom})`);
    else console.log(`  refusal while collapsed+scrolled: "${box.text}" — ${box.w}x${box.h} at y=${box.top}`);
    await shot("10-refusal-visible");
  }
  await page.evaluate(() => (document.querySelector("#collapse") as any).click());   // restore
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 200));

  // The unsaved-work guard, half two — MAKE THE DIRT, don't inherit it. This used
  // to lean on whatever the previous twenty tests had left unsaved, which stopped
  // being true the moment undo started restoring the whole document instead of
  // just the task list: a run that edits and then undoes is now genuinely clean,
  // which is correct behaviour that broke a test resting on it. A precondition a
  // test needs is a precondition the test should establish.
  // Select something first — `#lab` only exists while a task is selected, and
  // relying on an earlier test to have left one selected is the same mistake one
  // rung down. Short label: it feeds the row-gutter width.
  await page.evaluate(() => (document.querySelector(".bar") as any).click());
  await new Promise(r => setTimeout(r, 250));
  await page.$eval("#lab", (n: any) => {
    n.value = n.value + "*"; n.dispatchEvent(new Event("input")); });
  await new Promise(r => setTimeout(r, 250));
  const dirtyNow = await page.$eval("#dirty", (n: any) => n.textContent.trim());
  if (!dirtyNow) fail.push("editing a task label did not mark the plan unsaved — the close-guard test proves nothing without that");
  else if (!(await closeGuarded()))
    fail.push(`unsaved changes ("${dirtyNow}") but closing the tab is not guarded`);
  else console.log(`  close guard: armed while "${dirtyNow}", silent when clean`);

  if (afterDrag === before) fail.push(`drag did not move the verdict (still "${before}")`);
  if (afterReset !== before) fail.push(`reloading the fixture did not restore: "${before}" -> "${afterReset}"`);
  // ---- isolate: the other filtering lens ------------------------------------
  // Dim keeps every row and greys the rest; isolate removes them. The assertion
  // that matters is not "rows disappeared" — it is that NOTHING ELSE MOVED.
  // Filtering is a view, so the surviving bars must sit at exactly the same x and
  // the milestone verdicts must read exactly the same. A filter that quietly
  // reschedules is a filter that lets you win an argument dishonestly.
  await page.goto(page.url().split("#")[0].split("?")[0] + "?demo", { waitUntil: "networkidle2" });
  await page.waitForSelector(".bar");
  await new Promise(r => setTimeout(r, 300));

  const snapshot = () => page.evaluate(() => ({
    rows: document.querySelectorAll(".row").length,
    heads: document.querySelectorAll(".lane-head").length,
    dimmed: document.querySelectorAll(".row.dim").length,
    chips: [...document.querySelectorAll(".ms .vd")].map((n: any) => n.textContent.trim()),
    bars: Object.fromEntries([...document.querySelectorAll(".bar")].map((b: any) =>
      [b.dataset.vizId, Math.round(b.offsetLeft)])),
    arrows: document.querySelectorAll("#arrows path").length,
    nomatch: !!document.querySelector("#nomatch"),
  }));

  const base = await snapshot();
  // Pick a team from the legend and filter to it, still in dim mode.
  const laneBtn = await page.evaluate(() => {
    const b = document.querySelector('#legend [data-fv^="lanes|"]') as any;
    if (!b) return null;
    b.click();
    return b.dataset.fv;
  });
  await new Promise(r => setTimeout(r, 350));
  const dimState = await snapshot();
  if (dimState.rows !== base.rows)
    fail.push(`dim mode removed rows (${base.rows} -> ${dimState.rows}) — it is supposed to grey them`);
  if (!dimState.dimmed) fail.push("dim mode greyed nothing after a filter was set");

  // Now flip the lens. Same filter, different rendering.
  await page.$eval("#hiderest", (n: any) => { n.checked = true; n.dispatchEvent(new Event("change")); });
  await new Promise(r => setTimeout(r, 450));
  const iso = await snapshot();

  if (iso.rows >= base.rows)
    fail.push(`isolate did not remove anything (${base.rows} -> ${iso.rows} rows)`);
  if (iso.heads >= base.heads)
    fail.push(`isolate left ${iso.heads} lane headers of ${base.heads} — a team with no rows still has a heading`);
  if (JSON.stringify(iso.chips) !== JSON.stringify(base.chips))
    fail.push(`isolate changed the verdicts: ${JSON.stringify(base.chips)} -> ${JSON.stringify(iso.chips)}`);
  const moved = Object.entries(iso.bars).filter(([id, x]) => base.bars[id] !== x);
  if (moved.length) fail.push(`isolate moved bars that should not have moved: ${JSON.stringify(moved.slice(0, 3))}`);
  if (iso.arrows > base.arrows)
    fail.push(`isolate drew MORE arrows (${base.arrows} -> ${iso.arrows}) — some must point at rows that are gone`);

  if (iso.nomatch) fail.push("the empty-result message is showing while rows are rendered");
  await shot("11-isolate");

  // An impossible combination must EXPLAIN itself rather than render blank.
  // Found by walking colours until one empties the isolated lane, rather than
  // assuming which — the assertion should survive an edit to the fixture.
  let emptied = false;
  const colourIds = await page.$$eval('#legend [data-fv^="colors|"]', (n: any[]) =>
    n.map((b: any) => b.dataset.fv));
  for (const fv of colourIds) {
    await page.evaluate((f: string) => (document.querySelector(`#legend [data-fv="${f}"]`) as any)?.click(), fv);
    await new Promise(r => setTimeout(r, 300));
    const now = await snapshot();
    if (!now.rows) {
      emptied = true;
      if (!now.nomatch) fail.push("an empty isolate result rendered a blank chart with no explanation");
      const copies = await page.$$eval(".nomatch", (n: any[]) => n.length);
      if (copies !== 1) fail.push(`the empty-result message rendered ${copies} times — it is not being cleared between renders`);
      break;
    }
    await page.evaluate((f: string) => (document.querySelector(`#legend [data-fv="${f}"]`) as any)?.click(), fv);
    await new Promise(r => setTimeout(r, 200));
  }
  if (!emptied) fail.push("could not produce an empty combination to test the explanation");

  // Clearing must BUILD the rows back, not merely un-dim ones that are absent.
  await page.evaluate(() => (document.querySelector("#clearfilter") as any)?.click());
  await new Promise(r => setTimeout(r, 450));
  const cleared = await snapshot();
  if (cleared.rows !== base.rows)
    fail.push(`clearing under isolate did not restore every row (${base.rows} -> ${cleared.rows})`);
  if (JSON.stringify(cleared.bars) !== JSON.stringify(base.bars))
    fail.push("clearing under isolate did not restore the bars to their original positions");
  if (cleared.nomatch) fail.push("the empty-result message survived into a chart that has rows again");

  console.log(`  isolate: ${base.rows} rows dim (${dimState.dimmed} greyed) -> ${iso.rows} rows isolated `
    + `-> ${cleared.rows} restored, verdicts unchanged ${JSON.stringify(iso.chips)}`);
  await page.$eval("#hiderest", (n: any) => { n.checked = false; n.dispatchEvent(new Event("change")); });
  await new Promise(r => setTimeout(r, 350));

  // ---- the graph lens -------------------------------------------------------
  // A SECOND VIEW, and the assertions are about it being a LENS rather than a
  // second tool: same document, same selection, same legend filter, same chain
  // focus, and no power to move a date. The library is fetched from the network
  // on first use, so a failure here may be the network rather than the code —
  // the message says so rather than leaving someone to guess.
  const graphState = () => page.$eval("#cy", (n: any) => n.dataset.graph ? JSON.parse(n.dataset.graph) : null);
  const toGraph = async () => {
    await page.$eval("#view", (n: any) => { n.value = "graph"; n.dispatchEvent(new Event("change")); });
    await new Promise(r => setTimeout(r, 2200));
  };
  const toTimeline = async () => {
    await page.$eval("#view", (n: any) => { n.value = "timeline"; n.dispatchEvent(new Event("change")); });
    await new Promise(r => setTimeout(r, 400));
  };
  await page.evaluate(() => window.scrollTo(0, 0));
  const msBefore = await page.$$eval(".ms .vd", (n: any[]) => n.map(x => x.textContent.trim()));
  // Select in the TIMELINE first: whether the graph knows about it afterwards is
  // the whole "one selection" claim.
  await page.evaluate(() => (document.querySelectorAll(".bar")[3] as any).click());
  await new Promise(r => setTimeout(r, 250));
  const selName = await page.$eval("#insp .chip, #insp", (n: any) => n.textContent.trim().slice(0, 20));
  await toGraph();
  const g0 = await graphState();
  if (!g0) {
    fail.push("the graph drew nothing — cytoscape is fetched from the network on first use, "
      + "so check connectivity before assuming this is the code");
  } else {
    const hidden = await page.evaluate(() => [(document.querySelector("#chart") as any).hidden,
                                              (document.querySelector("#graph") as any).hidden,
                                              (document.querySelector("#zoomwrap") as any).offsetParent === null]);
    if (!hidden[0] || hidden[1]) fail.push(`switching views did not swap them: ${JSON.stringify(hidden)}`);
    // Zoom is a question about TIME and there is no time axis here, so its control
    // has to go — and [hidden] loses to the .lbl display rule unless told.
    if (!hidden[2]) fail.push("the zoom control is still on screen in a view with no time axis");
    if (g0.n !== bars0) fail.push(`graph drew ${g0.n} nodes for ${bars0} tasks`);
    if (g0.e < 1) fail.push("graph drew no dependencies at all");
    if (g0.cols < 2) fail.push(`a chain of work should lay out in columns, got ${g0.cols}`);
    if (g0.sel === null) fail.push("the graph does not know what the timeline had selected");
    // LAYOUT QUALITY IS TESTED IN `verify.sched.mjs`, NOT HERE, and that is worth
    // stating because here is the obvious place for it. This fixture is twelve
    // tasks in a near-straight line: it draws one crossing with the layered
    // ordering and one with the ordering deliberately disabled, so any threshold
    // put on it is an assertion that cannot fail — verified by breaking the code
    // and watching this pass. The harness builds a graph that is genuinely
    // tangled (88 crossings laid out naively, 0 after ordering) and fails if
    // either the bend routing or the sweeps break.
    //
    // What this fixture CAN still say is that the picture has not been stretched
    // into a diagonal smear, which is a real regression and a cheap one to catch.
    if (g0.cross > 6)
      fail.push(`the fixture's graph draws ${g0.cross} crossings — something is badly wrong with the ordering`);
    if (g0.rows > g0.n)
      fail.push(`the graph is ${g0.rows} rows tall for ${g0.n} tasks — it has been stretched, not laid out`);
    console.log(`  graph: ${g0.n} nodes, ${g0.e} edges, ${g0.cols} columns, ${g0.cross} crossings, `
      + `${g0.rows} rows, selection "${g0.sel}" carried over`);

    // BANDING IS A DIFFERENT ANSWER, not a better one — whether it helps depends
    // on the plan, which is why it is a control and why its cost is on the label.
    const grouped = await page.evaluate(async () => {
      const g: any = document.querySelector("#ggroup");
      const opt = [...g.options].find((o: any) => o.value);
      if (!opt) return null;
      g.value = opt.value; g.dispatchEvent(new Event("change"));
      await new Promise(r => setTimeout(r, 700));
      return { by: opt.textContent, ...JSON.parse((document.querySelector("#cy") as any).dataset.graph) };
    });
    if (!grouped) fail.push("no channel with two values to band the graph by");
    else {
      if (grouped.n !== g0.n) fail.push(`banding changed how many tasks are drawn: ${g0.n} -> ${grouped.n}`);
      console.log(`  graph banded by ${grouped.by}: ${grouped.cross} crossings, ${grouped.rows} rows `
        + `(vs ${g0.cross} and ${g0.rows} ungrouped)`);
    }
    await page.$eval("#ggroup", (n: any) => { n.value = ""; n.dispatchEvent(new Event("change")); });
    await new Promise(r => setTimeout(r, 600));

    // SCOPED TO WHAT WAS CLICKED. Fewer nodes, and — the part that matters — the
    // milestone verdicts do not move, because a lens is a view.
    //
    // ISOLATE FIRST, and that is not incidental. Chain focus obeys `hide the rest`
    // now, the same as a legend pick: in dim mode it greys the rest instead of
    // dropping them, so "fewer nodes" is only the right assertion under isolate.
    // This test asserted narrowing in whatever mode it happened to be in, which
    // was fine while the chain was the one filter that ignored the tick-box.
    await page.$eval("#hiderest", (n: any) => { if (!n.checked) { n.checked = true; n.dispatchEvent(new Event("change")); } });
    await new Promise(r => setTimeout(r, 400));
    await page.$eval("#gscope", (n: any) => { n.value = "chain"; n.dispatchEvent(new Event("change")); });
    await new Promise(r => setTimeout(r, 700));
    const g1 = await graphState();
    const msAfter = await page.$$eval(".ms .vd", (n: any[]) => n.map(x => x.textContent.trim()));
    if (!g1?.chain || g1.n >= g0.n) fail.push(`scoping to a chain did not narrow anything: ${JSON.stringify(g1)}`);
    if (JSON.stringify(msAfter) !== JSON.stringify(msBefore))
      fail.push(`the graph lens moved the schedule: ${JSON.stringify(msBefore)} -> ${JSON.stringify(msAfter)}`);
    // It is the SAME state the inspector's chain button sets, so the timeline is
    // scoped too — two controls over one piece of state, not two states.
    await toTimeline();
    const rowsScoped = await page.$$eval(".row", (n: any[]) => n.length);
    if (rowsScoped >= bars0)
      fail.push(`the graph's scope control did not reach the timeline: ${rowsScoped} rows of ${bars0}`);
    console.log(`  graph scope: ${g0.n} -> ${g1.n} nodes, and the timeline follows (${rowsScoped} rows), verdicts unmoved`);
    await toGraph();
    await page.$eval("#gscope", (n: any) => { n.value = "all"; n.dispatchEvent(new Event("change")); });
    await new Promise(r => setTimeout(r, 700));
    await page.$eval("#hiderest", (n: any) => { if (n.checked) { n.checked = false; n.dispatchEvent(new Event("change")); } });
    await new Promise(r => setTimeout(r, 400));

    // THE LEGEND FILTER DIMS BOTH LENSES, from one predicate. Repainted rather
    // than rebuilt, which is what makes hover-preview work here at all.
    await page.evaluate(() => (document.querySelector("#legend [data-fv]") as any).click());
    await new Promise(r => setTimeout(r, 600));
    const g2 = await graphState();
    if (!g2?.dim) fail.push("a legend filter did not reach the graph");
    else if (g2.dim >= g2.n) fail.push(`the filter dimmed everything (${g2.dim}/${g2.n}) — nothing left to read`);
    else console.log(`  graph filter: ${g2.dim} of ${g2.n} nodes dimmed by one legend click`);
    await page.evaluate(() => (document.querySelector("#clearfilter") as any)?.click());
    await new Promise(r => setTimeout(r, 500));

    // The view is view state, so a link to it reopens as it.
    const hashHasView = await page.evaluate(() => /graph/.test(decodeURIComponent(location.hash)));
    if (!hashHasView) fail.push("the graph view did not reach the hash — a link to it would not reopen as it");
  }
  await toTimeline();
  await reset();
  await new Promise(r => setTimeout(r, 200));

  // ---- WALKTHROUGH FRAMES ---------------------------------------------------
  // The walkthrough the site ships is produced HERE, by the same script that
  // asserts the behaviour it depicts. That is the whole point: a hand-built tour
  // hardcodes steps that break silently when the tool changes, while this run
  // breaks loudly. If a step below stops being reachable, its frame stops being
  // written and the page renders a visible hole rather than one fewer step.
  //
  // Captured on the PRISTINE fixture and in the order the captions tell it, not
  // scavenged from screenshots the assertions happened to leave behind — those
  // are taken mid-suite with renamed tasks and half-applied edits in them.
  // CAPTURED TO A TEMP DIR, PUBLISHED AT THE VERY END. Writing frames straight
  // into the viz folder puts a file into the directory the dev server watches,
  // so every single frame tripped its hot-reload and navigated the page out from
  // under the next step — the run died on a Puppeteer protocol timeout after two
  // frames. The fork test's own comment warns about this hazard for exactly the
  // same reason; it applies to anything that writes here mid-run, not just forks.
  const frameDir = new URL("./walkthrough/", import.meta.url).pathname;
  const tmpFrames = "/tmp/timeline-studio-frames";
  const fsp = await import("node:fs/promises");
  await fsp.rm(tmpFrames, { recursive: true, force: true });
  await fsp.mkdir(tmpFrames, { recursive: true });
  // Written as JPEG, downscaled, because these are inlined as base64 into the
  // published single-file build: six full-size PNGs is about a megabyte of data
  // URI before encoding overhead. 1000px wide at q60 is a third of that and
  // indistinguishable in a card that renders them ~1120px across.
  const { execFileSync } = await import("node:child_process");
  const frame = async (name: string) => {
    const p = await shot(name);
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "60",
                          "-Z", "1000", p, "--out", `${tmpFrames}/${name}.jpg`],
                 { stdio: "ignore" });
  };
  const pristine = async () => {
    await page.goto(page.url().split("#")[0].split("?")[0] + "?demo", { waitUntil: "networkidle2" });
    await page.waitForSelector(".bar");
    await new Promise(r => setTimeout(r, 350));
  };

  await pristine();
  await frame("tour-1-plan");

  // 2: relationships. Pick a task deep enough in the chain that the amber
  // transitive arrows have something to say.
  //
  // Scrolled into view FIRST, and in a separate evaluate: this row is in the last
  // lane, below the fold, so reading its rect without scrolling gave coordinates
  // outside the window and the click landed on nothing. The frame came out
  // byte-identical to the previous one — a walkthrough step showing the wrong
  // thing, silently. scrollIntoView and getBoundingClientRect must also be
  // separated by a frame or the rect is still the pre-scroll one.
  await page.evaluate(() => {
    const r = [...document.querySelectorAll(".row")].find(x =>
      (x.querySelector(".rowlabel")?.textContent || "").trim() === "Train on the new ovens");
    r?.scrollIntoView({ block: "center" });
  });
  await new Promise(r => setTimeout(r, 350));
  const spine = await page.evaluate(() => {
    const r = [...document.querySelectorAll(".row")].find(x =>
      (x.querySelector(".rowlabel")?.textContent || "").trim() === "Train on the new ovens");
    if (!r) return null;
    const b = r.querySelector(".bar").getBoundingClientRect();
    if (b.y < 0 || b.bottom > innerHeight || b.x < 0 || b.right > innerWidth) return null;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  });
  if (!spine) fail.push("walkthrough: could not bring the chain task on screen for its frame");
  if (spine) { await page.mouse.click(spine.x, spine.y); await new Promise(r => setTimeout(r, 350)); }
  await frame("tour-2-chain");

  // 3: retime by dragging the grip, so the verdict moves on camera.
  const grip = await (await page.$(".bar .grip")).boundingBox();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2 + 110, grip.y + grip.height / 2, { steps: 10 });
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 400));
  await frame("tour-3-cost");

  // 4 and 5: a start constraint, then the refusal when you drag past feasible.
  await pristine();
  const cbar = await onScreenBar();
  if (cbar) {
    await dragBody(cbar, 120);
    await frame("tour-4-constraint");
    const set = await barPin(cbar.id);
    if (set) { await dragBody(set, -400); await frame("tour-5-refusal"); }
  }

  // 6: serialise the capacity-2 lane and let the plan slip.
  await pristine();
  await openSettings("channels");
  const ci = await page.$$eval("#chedit [data-cap]", (n: any[]) =>
    n.findIndex((x: any) => Number(x.value) > 1));
  if (ci >= 0) {
    await page.evaluate((i: number) => {
      const n: any = document.querySelectorAll("#chedit [data-cap]")[i];
      n.value = "1"; n.dispatchEvent(new Event("change"));
    }, ci);
    await new Promise(r => setTimeout(r, 400));
  }
  // Settings MUST be shut before the frame — the walkthrough is showing what
  // capacity did to the chart, and a modal parked over the chart shows nothing.
  await closeSettings();
  await frame("tour-6-capacity");

  // Every caption must have a frame. A caption without one is the rot this
  // design exists to prevent, so it fails the run rather than the page.
  const wrote = (await fsp.readdir(tmpFrames)).filter((f: string) => f.endsWith(".jpg"));
  const wantFrames = ["tour-1-plan", "tour-2-chain", "tour-3-cost",
                      "tour-4-constraint", "tour-5-refusal", "tour-6-capacity"];
  const missingFrames = wantFrames.filter(w => !wrote.includes(w + ".jpg"));
  if (missingFrames.length) fail.push(`walkthrough frames not produced: ${JSON.stringify(missingFrames)}`);

  // NO TWO FRAMES MAY BE IDENTICAL. Every step above exists to show a DIFFERENT
  // state, so two matching frames mean the interaction between them did nothing —
  // a click that missed, a drag that was refused, a control that moved. That
  // happened on the first run here (the chain task was below the fold, so the
  // click landed outside the window) and it is invisible in a passing suite: the
  // frames were written, they were the right count, and the walkthrough quietly
  // showed the same picture twice.
  const crypto = await import("node:crypto");
  const seenHash = new Map<string, string>();
  for (const w of wantFrames) {
    if (missingFrames.includes(w)) continue;
    const h = crypto.createHash("md5").update(await fsp.readFile(`${tmpFrames}/${w}.jpg`)).digest("hex");
    const twin = seenHash.get(h);
    if (twin) fail.push(`walkthrough frames "${twin}" and "${w}" are identical — the step between them did nothing`);
    else seenHash.set(h, w);
  }
  if (!missingFrames.length && seenHash.size === wantFrames.length)
    console.log(`  walkthrough: ${wantFrames.length} distinct frames regenerated from this run`);

  // ---- STORAGE, IN BOTH WORLDS ----------------------------------------------
  // Run twice: once against files, once against browser storage. The two stores
  // have to behave identically, and the way that breaks is silent — one of them
  // quietly not persisting, or listing, or refusing a delete.
  //
  // What is NOT run twice, deliberately: dragging, reordering, arrows, filters,
  // the inspector, the axis. Every one of those operates on the in-memory doc
  // and cannot see a store — running them again would double the runtime to
  // re-prove something structurally identical. If a change ever gives the stores
  // different documents, THAT is the bug, and the round-trip below catches it.
  const storageSuite = async (mode: string) => {
    const tag = `store:${mode}`;
    await page.goto(page.url().split("#")[0].split("?")[0] + "?demo", { waitUntil: "networkidle2" });
    await page.waitForSelector(".bar");
    await page.select("#storemode", mode);
    await new Promise(r => setTimeout(r, 700));

    const active = await page.$eval("#storemode", (n: any) => n.value);
    if (active !== mode) { fail.push(`${tag}: could not switch to ${mode}`); return; }

    // WORK ON A SCRATCH FORK, NEVER ON WHAT IS ALREADY IN THE STORE. The first
    // version of this clicked Save on whatever the store listed first, which in
    // files mode is a real plan of the author's — a test suite that writes to
    // the data it is testing against is one edit away from destroying it. Fork
    // first, prove persistence on the copy, delete the copy.
    const idsBefore = await page.$$eval("#pick option", (n: any[]) => n.map((o: any) => o.value));
    await openSettings("plan");
    await page.click("#fork");
    await closeSettings();
    await new Promise(r => setTimeout(r, 900));
    const forkId = await page.evaluate(() =>
      JSON.parse(decodeURIComponent(location.hash.slice(1)) || "{}").id);
    if (!forkId || idsBefore.includes(forkId)) { fail.push(`${tag}: fork produced no new plan`); return; }

    // ACTUALS AND A BASELINE GO IN THE EDIT, because nothing in this file had
    // ever saved one. They are plain document fields, so they SHOULD ride along
    // with everything else — "should" being the word that precedes a bug, and
    // the only thing standing between them and a silent loss is that `doc` is
    // serialised whole. That is an implementation detail, and this is the test
    // that makes it a guarantee.
    await page.evaluate(() => (document.querySelector(".bar") as any).click());
    await new Promise(r => setTimeout(r, 250));
    await page.$eval("#as", (n: any) => { n.value = n.max; n.dispatchEvent(new Event("change")); });
    await new Promise(r => setTimeout(r, 300));
    await page.$eval("#markdone", (n: any) => n.click());
    await new Promise(r => setTimeout(r, 300));
    await openSettings("plan");
    await compareTo(1);
    await new Promise(r => setTimeout(r, 300));
    await closeSettings();

    // Edit it, save it, and prove durability by RELOADING and reading it back —
    // not by trusting the "saved" message, which a broken store still prints.
    await page.$eval("#title", (n: any) => {
      n.value = "scratch — verify run"; n.dispatchEvent(new Event("input"));
    });
    // SAVE OPENS A NOTE FIELD FIRST on a plan with edits in it — one click to
    // open, Enter to commit. A click that used to save now only opens a box, so
    // driving Save the old way here would leave the plan unsaved and every
    // durability assertion below would fail somewhere else entirely.
    await page.click("#save");
    await new Promise(r => setTimeout(r, 250));
    if (await page.$eval("#savepop", (n: any) => n.hidden))
      fail.push(`${tag}: Save did not offer a note on a plan with unsaved edits`);
    await page.type("#savenote", "renamed it in the verify run");
    await page.keyboard.press("Enter");
    await new Promise(r => setTimeout(r, 500));
    if (await page.$eval("#dirty", (n: any) => n.textContent.trim()))
      fail.push(`${tag}: still dirty after Save`);

    // SNAPSHOT THE URL THE APP PRODUCED, before the bare-URL reload below throws
    // the fragment away. It names both the plan and the comparison, and both are
    // being checked further down — rebuilding it by hand would test that this file
    // can write those keys rather than that the tool does.
    const appHash = await page.evaluate(() => location.hash);
    await page.goto(page.url().split("#")[0].split("?")[0], { waitUntil: "networkidle2" });
    await page.waitForSelector(".bar");
    await new Promise(r => setTimeout(r, 400));
    const listed = await page.$$eval("#pick option", (n: any[]) =>
      n.map((o: any) => ({ v: o.value, t: o.textContent })));
    const found = listed.find((o: any) => o.v === forkId);
    if (!found) fail.push(`${tag}: "${forkId}" did not survive a reload — listed ${JSON.stringify(listed.map((o: any) => o.v))}`);
    else if (!/scratch/.test(found.t)) fail.push(`${tag}: the edit did not persist — title reads "${found.t}"`);

    // Open the fork itself. The reload above lands on whichever plan the store
    // lists first, which is not necessarily this one — so the title check above
    // reads the PICKER, and anything about the document has to load it.
    if (found) {
      // GOTO IS NOT A RELOAD WHEN ONLY THE FRAGMENT CHANGES. The previous line
      // already navigated to this URL without a hash, so adding one is a
      // same-document navigation: no boot, no `loadHash()`, and the page stays
      // on whatever plan it was showing. In browser mode that happened to BE the
      // fork, so this passed by luck there and read v7 in files mode. Reload.
      // Restore the app's own fragment rather than a hand-built one: it used to be
      // rebuilt as `{id}`, which was right when the hash only had to name the plan
      // and silently drops the comparison now that it carries that too.
      await page.goto(page.url().split("#")[0] + appHash, { waitUntil: "networkidle2" });
      await page.reload({ waitUntil: "networkidle2" });
      await page.waitForSelector(".bar");
      await new Promise(r => setTimeout(r, 500));
      const kept = await page.evaluate(() => ({
        title: (document.querySelector("#title") as any)?.value,
        done: document.querySelectorAll(".rowlabel.done").length,
        strips: document.querySelectorAll(".baseline").length,
        chip: (document.querySelector("#cmpname") as any)?.textContent.trim(),
      }));
      if (!/scratch/.test(kept.title || ""))
        fail.push(`${tag}: opened "${kept.title}" instead of the fork — the persistence check read the wrong plan`);
      if (kept.done !== 1) fail.push(`${tag}: ${kept.done} finished task(s) survived the save, expected 1`);
      // The COMPARISON is not saved — it lives in the hash — so what is being
      // checked here is that it comes back from the URL on a fresh load, and that
      // the actuals in the document survived the save beside it.
      if (!kept.strips) fail.push(`${tag}: the comparison did not come back from the hash`);
      if (!/^vs save #/.test(kept.chip || "")) fail.push(`${tag}: the comparison chip did not survive: "${kept.chip}"`);
      console.log(`  ${tag}: actuals saved and the comparison reloaded — ${kept.done} done, ${kept.strips} strips, ${kept.chip}`);
    }

    // ---- HISTORY, IN BOTH WORLDS -------------------------------------------
    // Driven entirely through the panel rather than the store, because the store
    // is module-scoped and because the claim under test is what a person sees:
    // that their saves are all still there and one of them can be opened.
    //
    // The fork above already wrote version 1 (Fork auto-notes), and the rename
    // wrote version 2 — so this arrives with a two-entry archive it did not have
    // to build, which is also a check that both of those paths snapshot at all.
    const hOpen = async () => {
      await page.evaluate(() => (document.querySelector("#histbtn") as any).click());
      await new Promise(r => setTimeout(r, 700));
      return page.$$eval("#hist .hrow", (rows: any[]) => rows.map((r: any) => ({
        n: r.querySelector("b").textContent,
        note: r.querySelector(".hnote").value,
        tasks: r.children[3].textContent.trim(),
        lands: r.children[4].textContent.trim(),
      })));
    };
    const hClose = () => page.evaluate(() => (document.querySelector("#hist-close") as any).click());

    const v1 = await hOpen();
    if (v1.length !== 2)
      fail.push(`${tag}: ${v1.length} versions after fork + save, expected 2`);
    if (!/renamed it in the verify run/.test(v1[0]?.note || ""))
      fail.push(`${tag}: newest version's note is "${v1[0]?.note}", not the one that was typed`);
    if (!/forked from/.test(v1[1]?.note || ""))
      fail.push(`${tag}: Fork did not leave a note on the version it created: "${v1[1]?.note}"`);
    // Every row answers "what did it land on". A row that cannot say is a row
    // that has quietly stopped running the scheduler.
    if (v1.some(r => !/^lands /.test(r.lands)))
      fail.push(`${tag}: a version could not compute its finish date: ${JSON.stringify(v1.map(r => r.lands))}`);
    await hClose();

    // DEDUPE. Saving with nothing changed must not add a row — a log that fills
    // up with identical entries is a log nobody reads.
    await page.evaluate(() => (document.querySelector("#save") as any).click());
    await new Promise(r => setTimeout(r, 600));
    const v2 = await hOpen();
    if (v2.length !== v1.length)
      fail.push(`${tag}: an unchanged Save added a version (${v1.length} -> ${v2.length})`);

    // OPEN AN OLD VERSION. It becomes the working document WITH unsaved changes —
    // if it came back clean, the tab-close guard and the plan-switch guard would
    // both wave away a plan that no longer matches what is stored.
    await page.evaluate(() =>
      (document.querySelector('#hist .hopen[data-n="1"]') as any).click());
    await new Promise(r => setTimeout(r, 700));
    const restored = await page.evaluate(() => ({
      viewing: (document.querySelector("#viewing") as any).textContent.trim(),
      dirty: (document.querySelector("#dirty") as any).textContent.trim(),
      title: (document.querySelector("#title") as any).value,
    }));
    if (!/^viewing save 1 of 2/.test(restored.viewing))
      fail.push(`${tag}: opening a version did not say so: "${restored.viewing}"`);
    if (!restored.dirty)
      fail.push(`${tag}: an opened old version reads as saved — it is not what is stored`);
    if (/verify run/.test(restored.title))
      fail.push(`${tag}: opening version 1 left the RENAMED title on screen: "${restored.title}"`);

    // ...and Revert is the way back, exactly as it was before history existed.
    await page.click("#revert");
    await new Promise(r => setTimeout(r, 700));
    const back = await page.evaluate(() => ({
      viewing: (document.querySelector("#viewing") as any).textContent.trim(),
      title: (document.querySelector("#title") as any).value,
    }));
    if (back.viewing) fail.push(`${tag}: Revert left the version marker up: "${back.viewing}"`);
    if (!/verify run/.test(back.title))
      fail.push(`${tag}: Revert did not come back to what is stored: "${back.title}"`);
    console.log(`  ${tag}: history — ${v1.length} versions, dedupe held, opened #1 and reverted`);

    // ---- THE LAST CHANGE IS ON SCREEN, not two clicks into a panel ----------
    const last = await page.evaluate(() => {
      const c = document.querySelector(".ms.lastsave") as any;
      return c ? { text: c.textContent.replace(/\s+/g, " ").trim(),
                   // Pushed to the far end of the milestone row with margin-left:auto,
                   // so "is it actually opposite the milestones" is a geometry question.
                   right: Math.round(c.getBoundingClientRect().right),
                   edge: Math.round((document.querySelector("#msbar") as any).getBoundingClientRect().right) }
                : null;
    });
    if (!last) fail.push(`${tag}: a plan with ${v1.length} versions shows no last-change card`);
    else {
      if (!/^Last change · /.test(last.text))
        fail.push(`${tag}: the last-change card does not say when: "${last.text}"`);
      if (!/renamed it in the verify run/.test(last.text))
        fail.push(`${tag}: the last-change card shows the wrong note: "${last.text}"`);
      if (last.edge - last.right > 40)
        fail.push(`${tag}: the last-change card is not at the far end of the row `
          + `(${last.edge - last.right}px short)`);
    }
    // It belongs to the control bar, so collapsing takes it with everything else.
    const collapsed = await page.evaluate(async () => {
      (document.querySelector("#collapse") as any).click();
      await new Promise(r => setTimeout(r, 300));
      const gone = !(document.querySelector(".ms.lastsave") as any)?.offsetParent;
      (document.querySelector("#collapse") as any).click();
      await new Promise(r => setTimeout(r, 300));
      return { gone, back: !!(document.querySelector(".ms.lastsave") as any)?.offsetParent };
    });
    if (!collapsed.gone) fail.push(`${tag}: the last-change card survived collapsing the bar`);
    if (!collapsed.back) fail.push(`${tag}: the last-change card did not come back on expanding`);
    // And it opens the panel it summarises.
    await page.evaluate(() => (document.querySelector(".ms.lastsave") as any).click());
    await new Promise(r => setTimeout(r, 700));
    if (await page.$eval("#hist", (n: any) => n.hidden))
      fail.push(`${tag}: clicking the last-change card did not open History`);
    await hClose();
    console.log(`  ${tag}: last change on screen — "${(last?.text || "").slice(0, 60)}"`);

    // ---- THE CEILING, AND THAT IT NEVER DROPS ANYTHING QUIETLY ---------------
    // Browser only: the file store is unbounded, so there is no ceiling to test.
    // The archive is SEEDED rather than saved 200 times — this is a check of the
    // drop rule, not of how long 200 saves take.
    //
    // `window.confirm` is stubbed rather than driven through the suite's global
    // dialog handler, which accepts everything: the case that matters most here
    // is the one where the user says NO and nothing is written, and a handler
    // that always accepts can never produce it.
    if (mode === "browser") {
      const CAP = 200;                       // must match browserStore.cap
      const seed = async (count: number) => {
        await page.evaluate(async (fid: string, n: number) => {
          const b64 = (buf: ArrayBuffer) => { let o = ""; const u = new Uint8Array(buf);
            for (let i = 0; i < u.length; i += 0x8000)
              o += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000) as any);
            return btoa(o); };
          const base = JSON.parse(localStorage.getItem("ts:plan:" + fid) as string);
          const arr = Array.from({ length: n }, (_, i) => ({
            n: i + 1, at: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
            note: "seeded " + (i + 1), doc: { ...base, title: "seed " + (i + 1) } }));
          localStorage.setItem("ts:hist:" + fid, "z" + b64(await new Response(
            new Blob([JSON.stringify(arr)]).stream()
              .pipeThrough(new (window as any).CompressionStream("gzip"))).arrayBuffer()));
        }, forkId, count);
        // The countdown is fed by a cached count refreshed on load, so the page
        // has to come back for a seeded archive to be visible to the top bar.
        await page.goto(page.url().split("#")[0].split("?")[0]
          + "#" + encodeURIComponent(JSON.stringify({ id: forkId })), { waitUntil: "networkidle2" });
        await page.reload({ waitUntil: "networkidle2" });
        await page.waitForSelector(".bar");
        await new Promise(r => setTimeout(r, 400));
      };
      const count = () => page.evaluate(async (fid: string) => {
        const raw = localStorage.getItem("ts:hist:" + fid) as string;
        const u = Uint8Array.from(atob(raw.slice(1)), c => c.charCodeAt(0));
        const v = JSON.parse(await new Response(new Blob([u]).stream()
          .pipeThrough(new (window as any).DecompressionStream("gzip"))).text());
        return { len: v.length, oldest: v[0].n };
      }, forkId);
      // A save that goes through the note field, with confirm answering `yes`.
      const saveWith = async (title: string, yes: boolean) => page.evaluate(
        async (t: string, y: boolean) => {
          (window as any).confirm = () => y;
          const $ = (s: string) => document.querySelector(s) as any;
          $("#title").value = t; $("#title").dispatchEvent(new Event("input"));
          await new Promise(r => setTimeout(r, 150));
          $("#save").click();
          await new Promise(r => setTimeout(r, 200));
          if (!$("#savepop").hidden) {
            $("#savenote").value = t;
            $("#savenote").dispatchEvent(new KeyboardEvent("keydown",
              { key: "Enter", bubbles: true, cancelable: true }));
          }
          await new Promise(r => setTimeout(r, 600));
          return $("#msg").textContent || "";
        }, title, yes);

      // The band lights BEFORE anything is at risk, and says how much room is left.
      await seed(CAP - 25);
      const early = await page.$eval("#histwarn", (n: any) => n.textContent.trim());
      if (!/25 more saves/.test(early))
        fail.push(`${tag}: at ${CAP - 25} versions the bar said "${early}", expected a countdown from 25`);

      await seed(CAP);
      const full = await page.$eval("#histwarn", (n: any) => n.textContent.trim());
      if (!/^full/.test(full))
        fail.push(`${tag}: at the cap the bar said "${full}", expected it to say it is full`);

      // SAYING NO MUST WRITE NOTHING. Not "write the plan but skip the version" —
      // nothing, or a refusal costs you the edit you were trying to keep.
      const refused = await saveWith("cap-refused", false);
      const afterNo = await count();
      if (!/cancelled/.test(refused))
        fail.push(`${tag}: refusing the drop said "${refused}", expected the save to be cancelled`);
      if (afterNo.len !== CAP || afterNo.oldest !== 1)
        fail.push(`${tag}: refusing the drop still changed the archive (${afterNo.len} entries, oldest #${afterNo.oldest})`);

      const allowed = await saveWith("cap-allowed", true);
      const afterYes = await count();
      if (afterYes.len !== CAP)
        fail.push(`${tag}: allowing the drop left ${afterYes.len} entries, expected to stay at ${CAP}`);
      if (afterYes.oldest !== 2)
        fail.push(`${tag}: allowing the drop should have removed exactly #1, oldest is now #${afterYes.oldest}`);
      if (/cancelled/.test(allowed))
        fail.push(`${tag}: allowing the drop still refused the save: "${allowed}"`);
      console.log(`  ${tag}: ceiling — countdown at ${CAP - 25}, "full" at ${CAP}, `
        + `no dropped 0 and kept #1, yes dropped exactly #1`);
    }

    // Clean up our own debris. The stores differ here only because plan deletion
    // has no UI in either mode — see the note in the summary.
    const gone = await page.evaluate(async (fid: string, m: string) => {
      if (m === "browser") {
        localStorage.removeItem("ts:plan:" + fid); localStorage.removeItem("ts:hist:" + fid);
        return "removed " + fid;
      }
      const r = await fetch("api/delete", { method: "POST",
        headers: { "content-type": "application/json" }, body: JSON.stringify({ id: fid }) });
      return (await r.json()).ok ? "removed " + fid : "FAILED to remove " + fid;
    }, forkId, mode);
    if (/FAILED/.test(gone)) fail.push(`${tag}: ${gone}`);
    // The archive goes with the plan. This suite forks on every run, so an
    // archive that outlives its plan is a directory per run, forever.
    const orphan = await page.evaluate(async (fid: string, m: string) =>
      m === "browser" ? (localStorage.getItem("ts:hist:" + fid) ? 1 : 0)
        : ((await fetch("api/history?id=" + fid).then((r: any) => r.json())).versions || []).length,
      forkId, mode);
    if (orphan) fail.push(`${tag}: deleting the plan left its history behind (${orphan})`);
    console.log(`  ${tag}: forked "${forkId}", edit survived a reload, ${gone}`);
  };

  await storageSuite("browser");
  await storageSuite("files");

  // ---- export / import round trip -------------------------------------------
  // The only bridge between the two stores, so it gets a real round trip through
  // a real file rather than a unit test of the parser: export everything, wipe
  // the browser store, import the file back, and check the plans returned.
  const dlDir = "/tmp/timeline-studio-verify-downloads";
  const cdp = await page.target().createCDPSession();
  await cdp.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: dlDir });
  await page.goto(page.url().split("#")[0].split("?")[0] + "?demo", { waitUntil: "networkidle2" });
  await page.waitForSelector(".bar");
  await page.select("#storemode", "browser");
  await new Promise(r => setTimeout(r, 700));
  await page.click("#save");
  await new Promise(r => setTimeout(r, 400));
  await openSettings("global");
  await page.click("#exportall");
  await new Promise(r => setTimeout(r, 900));

  const fs = await import("node:fs/promises");
  let bundle: any = null;
  try { bundle = JSON.parse(await fs.readFile(dlDir + "/timeline-plans.json", "utf8")); }
  catch (e) { fail.push(`export all wrote no readable file: ${(e as Error).message}`); }
  if (bundle) {
    const ids = Object.keys(bundle.plans || {});
    if (!ids.length) fail.push("exported bundle contains no plans");
    // Wipe the store, then import the file back. Confirm dialogs must be handled
    // or the import blocks forever on a collision prompt.
    await page.evaluate(() => Object.keys(localStorage)
      .filter(k => k.startsWith("ts:plan:")).forEach(k => localStorage.removeItem(k)));
    await page.goto(page.url().split("#")[0].split("?")[0], { waitUntil: "networkidle2" });
    await page.waitForSelector(".bar");
    await new Promise(r => setTimeout(r, 400));
    const input = await page.$("#importfile");
    await input.uploadFile(dlDir + "/timeline-plans.json");
    await new Promise(r => setTimeout(r, 1200));
    const restored = await page.evaluate(() =>
      Object.keys(localStorage).filter(k => k.startsWith("ts:plan:")).map(k => k.slice(8)));
    const missing = ids.filter((i: string) => !restored.includes(i));
    if (missing.length) fail.push(`import did not restore ${JSON.stringify(missing)} — got ${JSON.stringify(restored)}`);
    else console.log(`  export/import round trip: ${ids.length} plan(s) out, ${restored.length} back`);
  }
  // Leave the browser store empty and the tool back on files, so a human opening
  // this page next does not find the test's leftovers.
  await page.evaluate(() => {
    Object.keys(localStorage).filter(k => k.startsWith("ts:plan:")).forEach(k => localStorage.removeItem(k));
    localStorage.removeItem("ts:mode");
  });
  try { await fs.rm(dlDir, { recursive: true, force: true }); } catch {}
  // RELOAD INTO A KNOWN STATE. Clearing localStorage does not un-ring the page:
  // it is still in browser mode in memory, with a picker listing plans that no
  // longer exist, so whatever runs next operates on a store that disagrees with
  // what is on screen. The fork test below failed for exactly that reason. With
  // ts:mode removed, a reload re-detects files.
  await page.goto(page.url().split("#")[0].split("?")[0], { waitUntil: "networkidle2" });
  await page.waitForSelector(".bar");
  await new Promise(r => setTimeout(r, 400));

  // NOTE ON ORDER: everything above this line must stay above it. The fork test
  // below writes a plan through the store and trips the dev server's watcher,
  // which navigates the page out from under whatever runs next — that is what
  // "LAST ON PURPOSE" means, and it is not advisory. Three blocks were appended
  // after it and every run died on a Puppeteer protocol timeout mid-capture.

  // ---- LAST ON PURPOSE ------------------------------------------------------
  // Forking writes a file into models/, which lives inside the directory the viz
  // dev server watches — so the write trips its hot-reload and the page navigates
  // out from under whatever runs next ("Execution context was destroyed"). Kept
  // at the end so a reload afterwards costs nothing.
  // ---- fork creates a real file and switches to it --------------------------
  const idsBefore = await page.$$eval("#pick option", (n: any[]) => n.map((o: any) => o.value));
  const before2 = idsBefore.length;
  await openSettings("plan");
  await page.click("#fork");
  // Settings is deliberately left OPEN here: this fork writes into the watched
  // directory, the dev server reloads the page, and one more evaluate() racing
  // that reload is the "Execution context was destroyed" failure this whole
  // section is ordered last to avoid. Nothing below needs the modal shut.
  await new Promise(r => setTimeout(r, 900));
  const after2 = await page.$$eval("#pick option", (n: any[]) => n.length);
  const nowId = await page.evaluate(() => location.hash);
  const title = await page.$eval("#title", (n: any) => n.value);
  // Assert a NEW id exists, not a count. The picker also carries a synthetic
  // entry for the demo fixture (which lives beside index.html, not in the
  // store), and refreshing the picker after a fork drops that entry while adding
  // the fork — so the count is unchanged and "+1" reports a failure that did not
  // happen.
  const idsAfter = await page.$$eval("#pick option", (n: any[]) => n.map((o: any) => o.value));
  const fresh = idsAfter.filter((i: string) => !idsBefore.includes(i));
  if (fresh.length !== 1) fail.push(`fork did not add exactly one plan: new ids ${JSON.stringify(fresh)}`);
  if (!/copy/i.test(title)) fail.push(`fork did not rename: "${title}"`);
  console.log(`  fork: ${before2} -> ${after2} plans, now "${title}" ${nowId}`);
  // Clean up after ourselves — this test writes a real file to the user's
  // models directory, and a test that leaves debris behind gets disabled.
  //
  // The guard is "this id did not exist before the fork", NOT "the id contains
  // copy". The id is a 40-char slug of the title, so a plan whose name is
  // already long has "— copy" truncated straight off the end — the guard then
  // refuses to delete the very file the test just created, and every run left
  // another orphan in models/. Comparing against the ids seen before the click
  // cannot be fooled by whatever the slug rules happen to be.
  const gone = await page.evaluate(async (seen: string[]) => {
    const id = JSON.parse(decodeURIComponent(location.hash.slice(1)) || "{}").id;
    if (!id || seen.includes(id)) return "skipped: " + id;
    const r = await fetch("api/delete", { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    return (await r.json()).ok ? "removed " + id : "FAILED to remove " + id;
  }, idsBefore);
  if (/^skipped/.test(gone)) fail.push(`fork cleanup ${gone} — a model file was left in models/`);
  if (/FAILED/.test(gone)) fail.push(gone);
  console.log("  fork cleanup: " + gone);

  // ---- /save REFUSES A BROKEN DOCUMENT --------------------------------------
  // This is the rail an AGENT runs on (see AGENTS.md) and it exists only on the
  // file store. The browser's editors cannot produce a dangling channel value or a
  // dependency on a task that is not there — every one of them picks from a list.
  // Something writing JSON does it by accident, and without this the POST succeeds,
  // the file is written, and the plan breaks at RENDER with nothing pointing back
  // at the write. Driven over fetch because it is an API property, not a gesture.
  // FETCHED FROM HERE, NOT FROM THE PAGE. Driving these through page.evaluate
  // works and costs 16 console errors — eight deliberate 400s, each logged twice
  // by the browser — so a passing run prints "16 error(s)" in red. Noise that
  // looks exactly like a failure is how you teach someone to stop reading the
  // output, which this file has a comment about elsewhere and then did anyway.
  const apiBase = page.url().split("#")[0].split("?")[0];
  const api = async (path: string, body: any) => {
    const r = await fetch(apiBase + "api/" + path, { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return { code: r.status, body: await r.json() as any };
  };
  // The fixture ships at an older schema on purpose, so bring it current the way
  // the browser would — otherwise every case below passes for the wrong reason.
  const valFixture = await page.evaluate(() =>
    JSON.parse((document.querySelector("#demo-plan") as any).textContent));
  const valDoc = { ...valFixture, schemaVersion: 4,
    shapes: valFixture.shapes && valFixture.shapes.length ? valFixture.shapes
          : [{ id: "s1", label: "\u2014", shape: "soft" }],
    tasks: valFixture.tasks.map((t: any) => ({ ...t, shape: t.shape || "s1",
      color: Array.isArray(t.color) ? t.color : t.color == null ? [] : [t.color],
      dur: t.dur * (valFixture.schemaVersion === 4 ? 1 : 7) })) };

  const firstSave = await api("save", { id: "zz-verify-val", doc: valDoc, note: "validation probe" });
  if (firstSave.code !== 200)
    fail.push(`a VALID document was refused by /save: ${firstSave.code} ${firstSave.body.error || ""}`);
  const broken: [string, (d: any) => void][] = [
    ["dangling lane", d => { d.tasks[0].lane = "no-such-lane"; }],
    ["dependency on a ghost", d => { d.tasks[0].deps = ["no-such-task"]; }],
    ["colour outside the pool", d => { d.tasks[0].color = ["no-such-colour"]; }],
    ["duration of zero", d => { d.tasks[0].dur = 0; }],
    ["colour as a bare string", d => { d.tasks[0].color = "rates"; }],
    ["an older schema", d => { d.schemaVersion = 3; }],
    ["a task depending on itself", d => { d.tasks[0].deps = [d.tasks[0].id]; }],
    ["two tasks sharing an id", d => { d.tasks.push({ ...d.tasks[0] }); }],
  ];
  let sample = "";
  for (const [label, mutate] of broken) {
    const d = JSON.parse(JSON.stringify(valDoc)); mutate(d);
    const r = await api("save", { id: "zz-verify-val", doc: d });
    const why = r.body.error || "";
    if (r.code !== 400) fail.push(`/save accepted a document with a ${label} (${r.code})`);
    // A refusal nobody can act on is barely better than none — whatever wrote the
    // document gets one line back and has to learn which task and which field.
    else if (why.length < 20) fail.push(`/save refused a ${label} without saying why: "${why}"`);
    if (label === "dependency on a ghost") sample = why;
  }
  await api("delete", { id: "zz-verify-val" });
  console.log(`  /save validation: ${broken.length} broken documents refused, e.g. "${sample}"`);

  // ---- ?demo IS SPENT ONCE YOU OPEN SOMETHING ELSE --------------------------
  // It outranks the hash at boot, by design — that is how this suite pins itself
  // to the fixture. The bug was that it kept outranking it after a deliberate
  // switch: the plan you chose sat in the hash, `?demo` sat in the query, and
  // every refresh threw you back to the demo while the address bar said otherwise.
  const stale = await page.evaluate(async () => {
    const $ = (s: string) => document.querySelector(s) as any;
    const other = [...$("#pick").options].map((o: any) => o.value).find((v: string) => v !== "demo");
    if (!other) return { skipped: true };
    $("#pick").value = other;
    $("#pick").dispatchEvent(new Event("change"));
    await new Promise(r => setTimeout(r, 900));
    return { skipped: false, opened: other, search: location.search,
             hashId: JSON.parse(decodeURIComponent(location.hash.slice(1)) || "{}").id };
  });
  if (!stale.skipped) {
    if (/demo/.test(stale.search))
      fail.push(`?demo survived opening "${stale.opened}" — every refresh will snap back to the fixture`);
    if (stale.hashId !== stale.opened)
      fail.push(`the hash says "${stale.hashId}" after opening "${stale.opened}"`);
    // The claim is about what a RELOAD does, so reload.
    await page.reload({ waitUntil: "networkidle2" });
    await page.waitForSelector(".bar");
    await new Promise(r => setTimeout(r, 600));
    const landed = await page.evaluate(() =>
      JSON.parse(decodeURIComponent(location.hash.slice(1)) || "{}").id);
    if (landed !== stale.opened)
      fail.push(`refresh landed on "${landed}" instead of the plan that was open, "${stale.opened}"`);
    console.log(`  ?demo: dropped on opening "${stale.opened}", and a refresh stayed there`);
  }
  await reset();
  await new Promise(r => setTimeout(r, 200));

  // ---- /verdict AND THE CHIPS MUST NOT DISAGREE -----------------------------
  // The reason schedule.js exists. Both sides now run the same `sched()`, and the
  // way that silently stops being true is a stale copy somewhere — so this reads
  // the numbers off the CHART and off the ENDPOINT and requires them to be the
  // same numbers, rather than trusting that one import means one answer.
  const vId = "zz-verify-verdict";
  await api("save", { id: vId, doc: valDoc, note: "verdict cross-check" });
  await page.goto(apiBase + "#" + encodeURIComponent(JSON.stringify({ id: vId })),
    { waitUntil: "networkidle2" });
  await page.reload({ waitUntil: "networkidle2" });
  await page.waitForSelector(".bar");
  await new Promise(r => setTimeout(r, 700));
  // A REAL MILESTONE CHIP IS ONE WITH AN EDITABLE LABEL, which is the only thing
  // that distinguishes it from the other cards sharing `.ms` — "Whole plan",
  // "Selected", and the last-change card, which is not `.empty` and so slipped
  // straight through a `:not(.empty)` filter on the first run.
  const vChips = await page.evaluate(() => [...document.querySelectorAll(".ms")]
    .map((m: any) => ({ m, lab: m.querySelector("[data-ms-label]") as any }))
    .filter((x: any) => x.lab)
    .map(({ m, lab }: any) => {
      const txt = m.textContent.replace(/\s+/g, " ");
      return { label: lab.value,
               ends: (txt.match(/work ends ([A-Z][a-z]{2} \d+)/) || [])[1] || null,
               tasks: +((txt.match(/· (\d+) tasks?/) || [])[1] || -1) };
    }));
  const vres = await fetch(apiBase + "api/verdict?id=" + vId).then(r => r.json()) as any;
  await api("delete", { id: vId });
  const short = (isoDate: string) => new Date(isoDate + "T00:00:00Z")
    .toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  if (!vChips.length) fail.push("no milestone chips to cross-check /verdict against");
  for (const c of vChips) {
    const m = (vres.milestones || []).find((x: any) => x.label === c.label);
    if (!m) { fail.push(`/verdict has no milestone "${c.label}" that the chart shows`); continue; }
    if (short(m.finish) !== c.ends)
      fail.push(`/verdict and the chip disagree on when "${c.label}" ends: `
        + `endpoint ${short(m.finish)}, chart ${c.ends}`);
    if (m.tasks !== c.tasks)
      fail.push(`/verdict and the chip disagree on "${c.label}" task count: `
        + `endpoint ${m.tasks}, chart ${c.tasks}`);
  }
  console.log(`  /verdict: ${vChips.length} milestone(s) agree with the chart — `
    + vChips.map((c: any) => `${c.label} ${c.ends}/${c.tasks}`).join(", "));
  await reset();
  await new Promise(r => setTimeout(r, 200));

  // ---- THE DOCUMENTED RECIPES, RUN --------------------------------------
  // AGENTS.md tells an agent how to change a plan and points at agent-recipes.ts
  // for the code, rather than copying it into prose. This is what makes that
  // pointer worth anything: every recipe is applied to a scratch plan, saved
  // through the real endpoint, read back from disk and checked. Documentation
  // that stops working fails the run.
  const { RECIPES } = await import("./agent-recipes.ts");
  const recipeId = "zz-verify-recipes";
  const seedDoc = await page.evaluate(() => {
    const base = JSON.parse((document.querySelector("#demo-plan") as any).textContent);
    // The fixture ships at an older schema deliberately, so bring it current the
    // way the browser does before the recipes — which are written for schema 4 —
    // are allowed anywhere near it.
    return { ...base, schemaVersion: 4,
      shapes: base.shapes && base.shapes.length ? base.shapes
            : [{ id: "s1", label: "\u2014", shape: "soft" }],
      tasks: base.tasks.map((t: any) => ({ ...t, shape: t.shape || "s1",
        color: Array.isArray(t.color) ? t.color : t.color == null ? [] : [t.color],
        dur: t.dur * (base.schemaVersion === 4 ? 1 : 7) })) };
  });
  const rApi = async (path: string, body: any) => {
    const r = await fetch(apiBase + "api/" + path, { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return { code: r.status, body: await r.json() as any };
  };
  const rLoad = () => fetch(apiBase + "api/load?id=" + recipeId).then(r => r.json() as any);
  let ranRecipes = 0;
  for (const recipe of RECIPES) {
    // Each recipe starts from the pristine fixture, so one failing does not
    // cascade into the next and a reader can apply them in any order.
    const fresh = await rApi("save", { id: recipeId, doc: seedDoc, note: "recipe fixture" });
    if (fresh.code !== 200) { fail.push(`recipe setup failed: ${fresh.body.error}`); break; }
    const doc = await rLoad();
    try { recipe.run(doc); }
    catch (e) { fail.push(`recipe "${recipe.name}" threw: ${(e as Error).message}`); continue; }
    const saved = await rApi("save", { id: recipeId, doc, note: recipe.name });
    if (saved.code !== 200) {
      fail.push(`recipe "${recipe.name}" produced a document /save refused: ${saved.body.error}`);
      continue;
    }
    const wrong = recipe.check(await rLoad());
    if (wrong) fail.push(`recipe "${recipe.name}" did not take effect: ${wrong}`);
    else ranRecipes++;
  }
  await rApi("delete", { id: recipeId });
  console.log(`  agent recipes: ${ranRecipes}/${RECIPES.length} documented recipes applied, `
    + `saved and read back`);

  // ---- the pinning edge is the thick one -----------------------------------
  // "Which of these five is actually holding it" was answerable in the inspector
  // and invisible on the chart. `health` waits on TWO things (ovens, plumbing) and
  // exactly one of them binds, so it is the fixture that can tell a real answer
  // from "every direct edge got fat".
  await page.goto(page.url().split("#")[0].split("?")[0] + "?demo", { waitUntil: "networkidle2" });
  await page.waitForSelector(".bar");
  await new Promise(r => setTimeout(r, 400));
  const pickTask = (id: string) => page.evaluate((tid: string) => {
    const row = document.querySelector(`.row[data-task="${tid}"] .bar`) as HTMLElement | null;
    if (row) row.click();
    return !!row;
  }, id);
  if (!(await pickTask("health"))) {
    fail.push("demo fixture drifted: no task `health` to select");
  } else {
    await new Promise(r => setTimeout(r, 350));
    const pins = await page.evaluate(() => {
      const all = [...document.querySelectorAll("#arrows path")];
      const pin = all.filter(p => p.getAttribute("data-pin"));
      const wOf = (p: Element) => parseFloat(p.getAttribute("stroke-width") || "0");
      return { total: all.length, pinned: pin.length,
               pinW: pin.map(wOf), others: all.filter(p => !p.getAttribute("data-pin")).map(wOf) };
    });
    // `health` has two dependencies and one binding one. If BOTH went thick the
    // encoding says nothing; if none did, the chart lost the fact entirely.
    if (pins.pinned !== 1)
      fail.push(`expected exactly one pinning edge on a task with two deps, got ${pins.pinned} `
        + `of ${pins.total} (${JSON.stringify(pins.pinW)})`);
    if (pins.pinned && Math.min(...pins.pinW) <= Math.max(...pins.others))
      fail.push(`the pinning edge is not the widest: pin ${JSON.stringify(pins.pinW)} `
        + `vs others ${JSON.stringify(pins.others)}`);
    // Fold the panel before the frame: it covers most of the chart, and the whole
    // point of this encoding is what the CHART says without one.
    const fb = await page.$("#inspfold");
    if (fb) { await fb.click(); await new Promise(r => setTimeout(r, 400)); }
    await shot("pinning-edge");
    if (fb) { await fb.click(); await new Promise(r => setTimeout(r, 300)); }
    console.log(`  pinning edge: ${pins.pinned} of ${pins.total} paths widened `
      + `(${pins.pinW.join(",")} vs max ${Math.max(...pins.others)})`);
  }

  // ---- the inspector folds, and ? is out of its corner ----------------------
  // The panel can be 44vh of dependency chips over the bottom of the chart. The
  // control bar has folded since it existed; this is the same bargain at the other
  // end of the screen — keep the header row, drop the rest — and the assertion
  // that matters is that the reclaimed space actually comes back, because
  // padForPanel() only ever GROWS its reservation.
  await page.goto(page.url().split("#")[0].split("?")[0] + "?demo", { waitUntil: "networkidle2" });
  await page.waitForSelector(".bar");
  await new Promise(r => setTimeout(r, 400));
  await page.click(".bar");
  await new Promise(r => setTimeout(r, 300));

  const inspState = () => page.evaluate(() => {
    const b = document.querySelector("#insp") as HTMLElement | null;
    const kids = b ? [...b.children] : [];
    return {
      h: b ? Math.round(b.getBoundingClientRect().height) : 0,
      shown: kids.filter(k => getComputedStyle(k).display !== "none").length,
      kids: kids.length,
      pad: Math.round(parseFloat(getComputedStyle(document.body).paddingBottom)),
      lab: !!document.querySelector("#lab"),
      labVisible: !!(document.querySelector("#lab") as HTMLElement)?.offsetParent,
    };
  });
  const openState = await inspState();
  const foldBtn = await page.$("#inspfold");
  if (!foldBtn) {
    fail.push("the inspector has no fold control");
  } else {
    await foldBtn.click();
    await new Promise(r => setTimeout(r, 450));
    const folded = await inspState();
    if (folded.h >= openState.h)
      fail.push(`folding did not shrink the panel (${openState.h}px -> ${folded.h}px)`);
    if (!folded.labVisible)
      fail.push("folding hid the task name — the one thing the header row exists to keep");
    if (folded.shown >= openState.shown)
      fail.push(`folding hid nothing: ${openState.shown} of ${openState.kids} children shown, still ${folded.shown}`);
    if (folded.pad >= openState.pad)
      fail.push(`folding did not give the reserved space back (${openState.pad}px -> ${folded.pad}px) `
        + `— padForPanel only ever grows unless folding resets it`);
    await shot("insp-folded");
    await foldBtn.click();
    await new Promise(r => setTimeout(r, 450));
    const back = await inspState();
    if (back.shown !== openState.shown)
      fail.push(`unfolding did not restore the panel (${openState.shown} -> ${back.shown} children shown)`);
    console.log(`  inspector fold: ${openState.h}px/${openState.shown} rows -> ${folded.h}px/${folded.shown} `
      + `(body padding ${openState.pad} -> ${folded.pad}) -> ${back.shown} restored`);
  }

  // ? is a toolbar button now, not a disc parked over the panel's bottom-left.
  const helpWhere = await page.evaluate(() => {
    const h = document.querySelector("#help") as HTMLElement | null;
    if (!h) return null;
    return { inToolbar: !!h.closest("#top"), fixed: getComputedStyle(h).position === "fixed" };
  });
  if (!helpWhere) fail.push("the ? button is gone entirely");
  else if (!helpWhere.inToolbar || helpWhere.fixed)
    fail.push(`? is still floating over the chart: ${JSON.stringify(helpWhere)}`);

  // ---- chain focus obeys the same lens as the legend -----------------------
  // The eye used to remove rows whatever `hide the rest` said, so the tick-box
  // meant "dim" for a legend pick and nothing at all for a chain. Now it governs
  // both. Dim keeps every row and greys what is not in the chain; isolate drops
  // it. And the origin must be identifiable either way, which in dim mode is the
  // only thing distinguishing "focused" from "slightly greyer".
  await page.goto(page.url().split("#")[0].split("?")[0] + "?demo", { waitUntil: "networkidle2" });
  await page.waitForSelector(".bar");
  await new Promise(r => setTimeout(r, 400));
  await page.$eval("#hiderest", (n: any) => { if (n.checked) { n.checked = false; n.dispatchEvent(new Event("change")); } });
  await new Promise(r => setTimeout(r, 300));

  const chainSnap = () => page.evaluate(() => ({
    rows: document.querySelectorAll(".row").length,
    dimmed: document.querySelectorAll(".row.dim").length,
    eyed: document.querySelectorAll(".bar.eyed").length,
    marks: document.querySelectorAll(".eyemark").length,
    // THE LINES ARE THE POINT OF THIS LENS, so they are part of its state. The
    // arrow layer is one SVG with one opacity: fold a focused chain into the same
    // "something is filtered" flag the legend uses and every arrow drops to 13%,
    // which reads as the lines having been deleted.
    arrows: document.querySelectorAll("#arrows path").length,
    arrowsDim: !!document.querySelector("#arrows.dim"),
  }));
  await page.click(".bar");
  await new Promise(r => setTimeout(r, 250));
  const preEye = await chainSnap();
  const eyeBtn = await page.$("#eye");
  if (!eyeBtn) {
    fail.push("no chain-focus button in the inspector");
  } else {
    await eyeBtn.click();
    await new Promise(r => setTimeout(r, 350));
    const dimEye = await chainSnap();
    if (dimEye.rows !== preEye.rows)
      fail.push(`chain focus removed rows in DIM mode (${preEye.rows} -> ${dimEye.rows}) `
        + `— it should grey them, the same as a legend pick`);
    if (!dimEye.dimmed)
      fail.push("chain focus in dim mode greyed nothing — the eye appears to do nothing at all");
    if (dimEye.eyed !== 1)
      fail.push(`expected exactly one bar marked as the chain's origin, found ${dimEye.eyed}`);
    if (dimEye.arrowsDim)
      fail.push("focusing a chain faded the arrow layer — the lines ARE the chain");
    if (!dimEye.arrows)
      fail.push("focusing a chain left no arrows drawn at all");
    await shot("eyed-dim");

    // And hovering still draws them, which it cannot do into a layer at 13%.
    await page.hover(".bar");
    await new Promise(r => setTimeout(r, 250));
    const hovered = await chainSnap();
    if (hovered.arrowsDim || !hovered.arrows)
      fail.push(`hover under chain focus drew nothing visible `
        + `(${hovered.arrows} paths, layer dim=${hovered.arrowsDim})`);

    // Same chain, other lens.
    await page.$eval("#hiderest", (n: any) => { n.checked = true; n.dispatchEvent(new Event("change")); });
    await new Promise(r => setTimeout(r, 450));
    const isoEye = await chainSnap();
    if (isoEye.rows >= preEye.rows)
      fail.push(`chain focus in ISOLATE mode kept every row (${preEye.rows} -> ${isoEye.rows})`);
    if (isoEye.eyed !== 1)
      fail.push(`the chain's origin lost its marker when isolated (${isoEye.eyed} marked)`);

    // Back to dim, and everything returns.
    await page.$eval("#hiderest", (n: any) => { n.checked = false; n.dispatchEvent(new Event("change")); });
    await new Promise(r => setTimeout(r, 450));
    const backEye = await chainSnap();
    if (backEye.rows !== preEye.rows)
      fail.push(`unticking hide-the-rest did not restore the rows (${backEye.rows} of ${preEye.rows})`);
    console.log(`  chain lens: dim ${dimEye.rows} rows (${dimEye.dimmed} greyed, ${dimEye.marks} eye mark, `
      + `${dimEye.arrows} arrows kept) -> isolate ${isoEye.rows} rows -> dim ${backEye.rows} restored`);
  }
  await page.goto(page.url().split("#")[0].split("?")[0] + "?demo", { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 500));

  // ---- Sort lanes by dependencies ------------------------------------------
  // The law is unit-tested against a brute-force oracle in verify.sched.mjs. What
  // only a browser shows is that the button is wired to the document — that it
  // reorders the real lanes and the chart follows, rather than computing a nice
  // answer and dropping it.
  await page.click("#cog");
  await new Promise(r => setTimeout(r, 250));
  await page.click('[data-tab="channels"]');
  await new Promise(r => setTimeout(r, 250));
  const laneHeads = () => page.$$eval("#ch-lanes .chit .cl", (n: any[]) => n.map(x => (x as any).value));
  const lanesBefore = await laneHeads();
  const sortBtn = await page.$("#sortlanes");
  if (!sortBtn) {
    fail.push("no Sort by dependencies button on the lanes channel");
  } else {
    await sortBtn.click();
    await new Promise(r => setTimeout(r, 350));
    const lanesAfter = await laneHeads();
    const msg = await page.$eval("#msg", (n: any) => n.textContent.trim());
    if (lanesBefore.length !== lanesAfter.length)
      fail.push(`sorting lanes changed how many there are: ${lanesBefore.length} -> ${lanesAfter.length}`);
    if (!/dependenc/i.test(msg))
      fail.push(`sorting lanes said nothing useful: "${msg}"`);
    // THE PRESS MUST DO SOMETHING. Without this the check passes on a laneOrder
    // that returns its input untouched: the button would flash "already in the
    // best order", which contains the word this looks for, and both presses would
    // agree because neither moved anything. The demo's lanes are typed in an
    // order this improves; if that ever stops being true, this failing is the
    // correct outcome, because the fixture would no longer exercise anything.
    if (lanesAfter.join() === lanesBefore.join())
      fail.push(`Sort by dependencies changed nothing on a fixture it should improve: `
        + `${JSON.stringify(lanesBefore)} — either the button is inert or the demo was re-ordered`);
    // IDEMPOTENT, and this is the half that catches a button that reshuffles.
    await (await page.$("#sortlanes"))!.click();
    await new Promise(r => setTimeout(r, 350));
    const lanesTwice = await laneHeads();
    if (lanesTwice.join() !== lanesAfter.join())
      fail.push(`pressing Sort twice moved the lanes again: ${JSON.stringify(lanesAfter)} -> ${JSON.stringify(lanesTwice)}`);
    const msg2 = await page.$eval("#msg", (n: any) => n.textContent.trim());
    if (!/already/i.test(msg2))
      fail.push(`the second press should say it is already sorted, said "${msg2}"`);
    console.log(`  sort lanes: ${JSON.stringify(lanesBefore)} -> ${JSON.stringify(lanesAfter)}, `
      + `stable on a second press`);
  }
  await page.click("#set-close");
  await new Promise(r => setTimeout(r, 200));
  await page.reload({ waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 600));

  // ---- a short bar is clickable, not all handle ----------------------------
  // The resize grip is 8px wide and hangs 3px past the bar, so it sits on 5px of
  // it. The bar floor is 8px. On a one-day task zoomed out, the grip therefore
  // covered x=3..8 of an 8px bar — the CENTRE of the bar was the handle, and
  // clicking a short task to select it started a duration drag instead.
  //
  // Two halves, and MEASURED: put the threshold back to zero and it is the
  // INVARIANT that fails, on four bars. The centre-click still passes at the
  // width this fixture happens to produce (10.2px, grip x=5.2..13.2, centre 5.1
  // — just outside), and only bites nearer the 8px floor. So the invariant is
  // the load-bearing check here; the click is the regression guard for the grip
  // growing or the threshold being applied to the wrong dimension. Said plainly
  // because a comment claiming the click catches this would be wrong.
  // PPD is fitted to the available width, so a wide window keeps every bar
  // comfortably above the threshold and the check below would pass vacuously —
  // it said so, out loud, the first time it ran. Squeeze the window until a day
  // really is a few pixels, which is the state the bug lives in.
  // PPD IS avail/VIEW, so the only reliable way to make a day a few pixels is to
  // set VIEW, not to shrink the window. Two earlier attempts here passed
  // vacuously — a wide window left bars at 60-180px, and whole-plan zoom only
  // halved that because the demo spans about 17 days. The zoom lives in the hash
  // as JSON, so ask for a 200-day view and every bar lands on the 8px floor.
  // PPD is avail/VIEW, so a day is only a few pixels when the window is narrow
  // AND the view is the whole plan. Both, or this passes vacuously — which it did
  // twice while being written, and said so both times rather than going green.
  await page.setViewport({ width: 420, height: 900 });
  await page.select("#zoom", "");
  await new Promise(r => setTimeout(r, 500));
  const gripAudit = await page.evaluate(() => {
    const min = (8 - 3) * 3;
    const rows = [...document.querySelectorAll(".bar")].map((b, i) => ({
      i, w: +(b as HTMLElement).getBoundingClientRect().width.toFixed(1),
      grip: !!b.querySelector(".grip"),
    }));
    return { min, rows,
             short: rows.filter(r => r.w < min - 0.5),
             wrong: rows.filter(r => (r.w < min - 0.5) === r.grip) };
  });
  if (!gripAudit.short.length)
    fail.push("no bar is short enough to exercise the grip threshold — this check cannot fail here"
      + ` [min=${gripAudit.min} widths=${JSON.stringify(gripAudit.rows.slice(0, 8).map(r => r.w))}]`);
  if (gripAudit.wrong.length)
    fail.push(`grip threshold broken on ${gripAudit.wrong.length} bar(s): `
      + JSON.stringify(gripAudit.wrong.slice(0, 3)));

  if (gripAudit.short.length) {
    const idx = gripAudit.short[0].i;
    // ElementHandle.click scrolls the bar into view and clicks its CENTRE — which
    // is the pixel that mattered: on an 8px bar the grip spanned x=3..11, so the
    // middle of the bar WAS the handle. A raw mouse.click at page coordinates is
    // not equivalent here; in a 420px window the bar is off to the right and the
    // coordinates land on whatever is actually there, which is how this first
    // reported a failure that was the test's, not the product's.
    const bars = await page.$$(".bar");
    await bars[idx].click();
    await new Promise(r => setTimeout(r, 250));
    const picked = await page.$$eval(".bar", (n: any[]) =>
      n.map((b, i) => (b.classList.contains("sel") ? i : -1)).filter(i => i >= 0));
    if (!picked.includes(idx))
      fail.push(`clicking the centre of a ${gripAudit.short[0].w}px bar did not select it `
        + `(selected ${JSON.stringify(picked)}) — the grip is still eating short bars`);
    console.log(`  short bars: ${gripAudit.short.length} under ${gripAudit.min}px carry no grip, `
      + `centre-click selects one (${gripAudit.short[0].w}px)`);
  }
  await page.setViewport({ width: 1280, height: 900 });
  await page.reload({ waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 600));


  // Publish the frames now that nothing is driving the page — see the note above
  // on the dev server's watcher. Only on a clean run: shipping the walkthrough
  // from a run that failed would put a picture of the broken state on the site.
  if (!fail.length) {
    await fsp.mkdir(frameDir, { recursive: true });
    for (const f of wrote) await fsp.copyFile(`${tmpFrames}/${f}`, frameDir + f);
    console.log(`  walkthrough published: ${wrote.length} frames`);
  } else {
    console.log(`  walkthrough NOT published — the run failed, so the frames are of a broken state`);
  }
  await fsp.rm(tmpFrames, { recursive: true, force: true });

  console.log(fail.length ? "INTERACTIONS FAILED: " + fail.join(" | ") : "interactions ok");
  console.log(`  verdict: "${before}" --drag--> "${afterDrag}" --reload--> "${afterReset}" --dur=42d--> "${afterDur}"`);
  console.log(`  bars: ${bars0} --add--> ${bars1} --del--> ${bars2}`);
  console.log(`  axis: ${axis.slice(0, 120)}`);
};
