// r2-recall: spaced repetition in a tab. What a learner does: answer a card (typed or spoken), grade it, come
// back later; bring their own deck; let their history follow them between devices. The silent failures: an answer
// judged right that is another card's, a review that is not saved or is counted twice, a card served out of
// order, a voice command that grades the next card, and history that does not sync and says it did.
import { describe, it, expect } from "bun:test";
import {
  open,
  ready,
  text,
  prompt,
  status,
  verdict,
  ratings,
  answer,
  grade,
  savedLog,
  buckets,
  hear,
  micOn,
  heard,
  loadDeckFile,
  writeJson,
  PEOPLE,
  recognitionEvent,
  daysAgo,
  deferred,
  GOOD,
  EASY,
  type RecallPage,
} from "./helpers.ts";

const Q = [
  "What holds the data in this format?",
  "What is a card, exactly?",
  "Where does my progress live?",
  "Which scheduler decides the intervals?",
  "How is a spoken answer graded?",
];
const wait = async (ms: number) => {
  await new Promise<void>((r) => {
    setTimeout(r, ms);
  });
};
/** Poll until `done()` holds, or `ms` have passed. */
const until = async (done: () => boolean, ms = 10_000, every = 50) => {
  const start = Date.now();
  while (!done() && Date.now() - start < ms) {
    // oxlint-disable-next-line no-await-in-loop -- polling: each check must wait for the previous sleep
    await wait(every);
  }
};
/** Wait for the sync line to say something other than "syncing…". */
const synced = async (page: RecallPage, want: RegExp | string) => {
  await page.waitForFunction(
    (w) => new RegExp(w, "u").test(document.querySelector("#sync")!.textContent),
    { timeout: 10_000 },
    want instanceof RegExp ? want.source : want.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&"),
  );
};
/** Reveal the card by pressing Enter on an empty box, as a learner who gives up does. */
const giveUp = async (page: RecallPage) => {
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => !document.querySelector("#back")!.classList.contains("hidden"));
};

describe("the demo deck", () => {
  it.concurrent("should open on the highest-weight card with every card unseen, and remember it was studied", async () => {
    // GIVEN a learner with no history
    const page = await open();

    // WHEN the page loads
    await ready(page);
    await synced(page, "synced");

    // THEN the heaviest card comes first, and nothing has been seen
    expect(await prompt(page)).toBe(Q[0]!);
    expect(await status(page)).toBe("5 cards · 0 seen · 0 due now · 0 new today");
    expect(await buckets(page)).toEqual({
      "never seen": 5,
      learning: 0,
      "< 1 day": 0,
      "1–7 days": 0,
      "1–4 weeks": 0,
      "1–6 months": 0,
      "6 months +": 0,
    });
    // THEN the deck is on the "studied before" line
    expect(await text(page, "#recents")).toBe("Studied before: Demo — the deck format itself");
    expect(page.errors).toEqual([]);
  });

  it.concurrent("should mark a correct typed answer right, suggest Good, and put the answer on the back", async () => {
    // GIVEN the first card
    const page = await open();
    await ready(page);

    // WHEN the learner types the right answer
    await answer(page, "Structured fields");

    // THEN it is marked correct, Good is the suggestion, and the answer shows
    expect(await verdict(page)).toEqual({ text: "✓ correct", kind: "right" });
    expect(await ratings(page)).toEqual([
      ["Again", false],
      ["Hard", false],
      ["Good", true],
      ["Easy", false],
    ]);
    expect(await text(page, "#back")).toContain("Structured fields");
    expect(await page.$eval("#answer", (e) => e.classList.contains("hidden"))).toBe(true);
  });

  it.concurrent("should mark a wrong typed answer wrong, quoting it, and suggest Again", async () => {
    // GIVEN the first card
    const page = await open();
    await ready(page);

    // WHEN the learner types something else
    await answer(page, "A guess");

    // THEN it says what they said, and Again is the suggestion
    expect(await verdict(page)).toEqual({ text: "✗ you said “A guess”", kind: "wrong" });
    expect(await ratings(page)).toEqual([
      ["Again", true],
      ["Hard", false],
      ["Good", false],
      ["Easy", false],
    ]);
  });

  it.concurrent("should show no verdict when the learner gives up, and suggest Again", async () => {
    // GIVEN the first card
    const page = await open();
    await ready(page);

    // WHEN they press Enter with nothing typed
    await giveUp(page);

    // THEN the answer is shown with no verdict, and Again is the suggestion
    expect(await verdict(page)).toEqual({ text: "", kind: "" });
    expect(await ratings(page)).toEqual([
      ["Again", true],
      ["Hard", false],
      ["Good", false],
      ["Easy", false],
    ]);
    expect(await text(page, "#back")).toContain("Structured fields");
  });

  // The judge ranks a closed set: an answer is right only if the wanted one is the NEAREST of every answer in the deck.
  for (const [said, right] of [
    ["structured fields", true],
    ["Structred Feilds", true],
    ["STRUCTURED   FIELDS!", true],
    ["Structüred fields", true],
    ["this browser", false], // another card's exact answer
    ["zzzzzzzzzzzzzzzzzz", false], // gibberish
    ["fields", false], // too far from the wanted answer
  ] as const) {
    it.concurrent(`should judge "${said}" ${right ? "right" : "wrong"} for the first card`, async () => {
      // GIVEN the first card, whose answer is "Structured fields", among four other answers
      const page = await open();
      await ready(page);

      // WHEN the learner types it
      await answer(page, said);

      // THEN it is judged as the nearest answer decides
      expect((await verdict(page)).kind).toBe(right ? "right" : "wrong");
    });
  }

  it.concurrent("should save a grade, count it, move to the next card, and keep it after a reload", async () => {
    // GIVEN the first card, answered
    const page = await open();
    await ready(page);
    await answer(page, "Structured fields");

    // WHEN the learner grades it Good
    await grade(page, "Good");

    // THEN the next card is shown, and the status counts one seen and one new today
    expect(await prompt(page)).toBe(Q[1]!);
    expect(await status(page)).toBe("5 cards · 1 seen · 0 due now · 1 new today");
    // THEN the review is saved in the browser, for that card, with that rating
    const log = await savedLog(page);
    expect(log.map(([id, , r]) => [id, r])).toEqual([["d1::q-a", GOOD]]);
    expect(Math.abs(log[0]![1] - Date.now())).toBeLessThan(60_000);
    // THEN the card moved out of "never seen" into "learning"
    expect(await buckets(page)).toMatchObject({ "never seen": 4, learning: 1 });

    // WHEN they reload
    await page.reload();
    await ready(page);

    // THEN the history is still there: one seen, and the graded card is not served again
    expect(await status(page)).toBe("5 cards · 1 seen · 0 due now · 1 new today");
    expect(await prompt(page)).toBe(Q[1]!);
  });

  it.concurrent("should record the rating the learner chose, not the suggestion", async () => {
    // GIVEN a correct answer (Good suggested)
    const page = await open();
    await ready(page);
    await answer(page, "Structured fields");

    // WHEN they say it was easy
    await grade(page, "Easy");

    // THEN Easy is what was saved, and the card leaves "learning" for a review bucket (Easy graduates at once)
    expect((await savedLog(page)).map(([, , r]) => r)).toEqual([EASY]);
    expect((await buckets(page))["learning"]).toBe(0);
  });

  it.concurrent("should say nothing is due once every card has been graded", async () => {
    // GIVEN a learner working through the deck
    const page = await open();
    await ready(page);

    // WHEN they grade all five cards
    for (let i = 0; i < 5; i++) {
      // oxlint-disable-next-line no-await-in-loop -- each card is graded on the page the previous grade left
      await giveUp(page);
      // oxlint-disable-next-line no-await-in-loop -- each card is graded on the page the previous grade left
      await grade(page, "Good");
    }

    // THEN the card area says nothing is due, with no answer box and no rating buttons
    expect(await text(page, "#front")).toContain("Nothing due 🎉");
    expect(await page.$eval("#answer", (e) => e.classList.contains("hidden"))).toBe(true);
    expect(await ratings(page)).toEqual([]);
    expect(await status(page)).toBe("5 cards · 5 seen · 0 due now · 5 new today");
  });

  it.concurrent("should serve a due card before unseen ones, the most overdue first", async () => {
    // GIVEN history: card 4 reviewed 60 days ago and card 3 reviewed 30 days ago, both long overdue
    const page = await open({
      log: [
        ["d4::q-a", daysAgo(60), GOOD],
        ["d3::q-a", daysAgo(30), GOOD],
      ],
    });

    // WHEN the page loads
    await ready(page);

    // THEN the most overdue (card 4) leads, though card 1 is heavier and unseen
    expect(await prompt(page)).toBe(Q[3]!);
    expect(await status(page)).toBe("5 cards · 2 seen · 2 due now · 0 new today");

    // WHEN they grade it
    await giveUp(page);
    await grade(page, "Good");

    // THEN the next most overdue (card 3) comes next
    expect(await prompt(page)).toBe(Q[2]!);
  });

  it.concurrent("should list what is in a bucket when it is clicked, and say when it is empty", async () => {
    // GIVEN one card graded, four unseen
    const page = await open();
    await ready(page);
    await answer(page, "Structured fields");
    await grade(page, "Good");

    // WHEN the learner clicks "never seen"
    await page.evaluate(() =>
      [...document.querySelectorAll<HTMLButtonElement>("#buckets > button")]
        .find((b) => b.textContent === "never seen")!
        .click(),
    );

    // THEN it lists the four unseen answers, in deck order
    expect(await text(page, "#peek")).toBe(
      "A note times a template · This browser · FSRS · Nearest match",
    );

    // WHEN they click an empty bucket
    await page.evaluate(() =>
      [...document.querySelectorAll<HTMLButtonElement>("#buckets > button")]
        .find((b) => b.textContent === "6 months +")!
        .click(),
    );

    // THEN it says so
    expect(await text(page, "#peek")).toBe("(empty)");
    // THEN the bars are drawn in proportion: the fullest bucket is full width, an empty one has none
    expect(
      await page.$$eval("#buckets .bucket-bar", (bs) =>
        bs.slice(0, 2).map((b) => (b instanceof HTMLElement ? b.style.width : "")),
      ),
    ).toEqual(["100%", "25%"]);
  });
});

describe("bringing a deck", () => {
  it.concurrent("should study the deck's cards, show its text as text, and say which notes make no card", async () => {
    // GIVEN the demo deck open
    const page = await open();
    await ready(page);

    // WHEN the learner loads a deck of people, one of whom lacks the field its template requires
    await loadDeckFile(page, PEOPLE);

    // THEN the heaviest note that can make a card comes first, with its HTML shown as text
    expect(await prompt(page)).toBe("Who is the <b>CTO</b>?");
    expect(await page.$$eval("#front .prompt b", (b) => b.length)).toBe(0);
    // THEN three cards, and the one that cannot be made is named, not silently dropped
    expect(await status(page)).toBe("3 cards · 0 seen · 0 due now · 0 new today");
    expect(await text(page, "#gaps")).toBe(
      "1 in this deck produce no card — a field some template requires is missing: Nobody Special",
    );
    // THEN both decks are on the "studied before" line, with the file this one came from
    expect(await text(page, "#recents")).toBe(
      "Studied before: People (people.json) · Demo — the deck format itself",
    );
  });

  it.concurrent("should keep each deck's history apart", async () => {
    // GIVEN a card graded in the demo deck, and its sync finished
    const page = await open();
    await ready(page);
    await answer(page, "Structured fields");
    await grade(page, "Good");
    await page.waitForFunction(() => document.querySelector("#sync")!.textContent === "synced", {
      timeout: 15_000,
    });
    const posted = page.server.posts.length;
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await until(() => page.server.posts.length !== posted, Infinity);
    await synced(page, "synced");

    // WHEN the learner loads another deck
    await loadDeckFile(page, PEOPLE);

    // THEN it has no history of its own yet
    expect(await status(page)).toBe("3 cards · 0 seen · 0 due now · 0 new today");

    // WHEN they go back to the demo
    await page.click("#demoBtn");
    await page.waitForFunction(() =>
      document.querySelector("#status")!.textContent.startsWith("5 cards"),
    );

    // THEN its history is where they left it
    expect(await status(page)).toBe("5 cards · 1 seen · 0 due now · 1 new today");
  });

  it.concurrent("should not file a sync answer for one deck into another opened while it was in flight", async () => {
    // GIVEN a card graded in the demo deck, and a sync of it whose answer the server is holding back
    const page = await open();
    await ready(page);
    await synced(page, "synced");
    await answer(page, "Structured fields");
    await grade(page, "Good");
    const gate = deferred();
    page.server.gate = gate.promise;
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await synced(page, "syncing…");

    // WHEN the learner opens another deck, and then the server answers
    await loadDeckFile(page, PEOPLE);
    gate.release();
    await page.waitForFunction(() => document.querySelector("#sync")!.textContent === "synced", {
      timeout: 15_000,
    });
    await wait(500);

    // THEN the other deck has no history of the demo's reviews
    expect(await status(page)).toBe("3 cards · 0 seen · 0 due now · 0 new today");
    expect(await savedLog(page, "people")).toEqual([]);

    // WHEN they go back to the demo
    await page.click("#demoBtn");
    await page.waitForFunction(() =>
      document.querySelector("#status")!.textContent.startsWith("5 cards"),
    );

    // THEN its review is still there
    expect(await status(page)).toBe("5 cards · 1 seen · 0 due now · 1 new today");
  });

  it.concurrent("should leave the demo deck alone when the answer for a deck that has no history arrives after switching to it", async () => {
    // GIVEN a deck with no reviews, and a sync of it whose answer the server is holding back
    const page = await open();
    await ready(page);
    await loadDeckFile(page, PEOPLE);
    await synced(page, "synced");
    const gate = deferred();
    page.server.gate = gate.promise;
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await synced(page, "syncing…");

    // WHEN the learner goes back to the demo, and then the server answers
    await page.click("#demoBtn");
    await page.waitForFunction(() =>
      document.querySelector("#status")!.textContent.startsWith("5 cards"),
    );
    gate.release();
    await page.waitForFunction(() => document.querySelector("#sync")!.textContent === "synced", {
      timeout: 15_000,
    });

    // THEN the demo still has no history
    expect(await status(page)).toBe("5 cards · 0 seen · 0 due now · 0 new today");
  });

  it.concurrent("should judge an accented name against the deck's near-identical names by its letters, not its accents", async () => {
    // GIVEN a deck with Renee Smith (asked first) and, close by, Rene Smith
    const page = await open();
    await ready(page);
    const deck = {
      id: "renees",
      name: "Renees",
      templates: PEOPLE.templates,
      notes: [
        { id: "r1", weight: 2, fields: { role: "the one with the double e", name: "Renee Smith" } },
        { id: "r2", weight: 1, fields: { role: "the one with the single e", name: "Rene Smith" } },
      ],
    };
    await loadDeckFile(page, deck, "renees.json");
    expect(await prompt(page)).toBe("Who is the one with the double e?");

    // WHEN the learner types the name with an accent, as a keyboard or a recogniser gives it
    await answer(page, "Renée Smith");

    // THEN it is Renee Smith they said, not Rene Smith
    expect((await verdict(page)).kind).toBe("right");
  });

  it.concurrent("should study the whole deck when its default tags match nothing, rather than an empty one", async () => {
    // GIVEN a deck that says to start on a tag none of its notes has
    const page = await open();
    await ready(page);

    // WHEN it is loaded
    await loadDeckFile(page, { ...PEOPLE, defaultTags: ["ghosts"] });

    // THEN all its cards are studied
    expect(await status(page)).toBe("3 cards · 0 seen · 0 due now · 0 new today");
  });

  it.concurrent("should study only the deck's default tags, without calling the rest a gap", async () => {
    // GIVEN a deck that says to start on its staff
    const page = await open();
    await ready(page);

    // WHEN it is loaded
    await loadDeckFile(page, { ...PEOPLE, defaultTags: ["staff"] });

    // THEN only the two staff cards are studied, and the alumnus with no card is not reported (it is outside the filter)
    expect(await status(page)).toBe("2 cards · 0 seen · 0 due now · 0 new today");
    expect(await text(page, "#gaps")).toBe("");
    expect(await prompt(page)).toBe("Who is the <b>CTO</b>?");
  });
});

describe("speaking to the assistant", () => {
  const model = {
    availability: "available" as const,
    plans: {
      "skip the alumni": { intent: "filter", tags: ["alumni"], mode: "except" },
      "only the iowa folks": { intent: "filter", tags: ["loc:iowa"], mode: "only" },
      "show everyone": { intent: "filter", tags: [] },
      "how many have i done": { intent: "stats" },
      "what year did the titanic sink": { intent: "unknown" },
      "only the martians": { intent: "filter", tags: ["martians"], mode: "only" },
    },
  };
  const withPeople = async () => {
    const page = await open({ model });
    await ready(page);
    await loadDeckFile(page, PEOPLE);
    await micOn(page);
    return page;
  };
  const says = async (page: RecallPage, want: string) => {
    try {
      await page.waitForFunction(
        (w) => document.querySelector("#says")!.textContent === w,
        { timeout: 10_000 },
        want,
      );
    } catch (e: unknown) {
      throw new Error(
        `the assistant never said "${want}"; it says "${await text(page, "#says")}" (${e instanceof Error ? e.message : String(e)})`,
        { cause: e },
      );
    }
  };

  it.concurrent("should narrow the deck to what the learner asks for, and widen it again", async () => {
    // GIVEN the people deck and the microphone on
    const page = await withPeople();

    // WHEN the learner says "recall, skip the alumni"
    await hear(page, "recall skip the alumni");

    // THEN the alumni are hidden: two cards, and the assistant says what it did
    await says(page, "Hiding alumni — 2 cards.");
    expect(await status(page)).toMatch(/^2 cards/u);

    // WHEN they ask for only the Iowa folks
    await hear(page, "recall only the Iowa folks");

    // THEN only Iowa's card is left, and the alumnus in Iowa who has no card is now reported as a gap
    await says(page, "Showing only loc:iowa — 1 card.");
    expect(await status(page)).toMatch(/^1 card/u);
    expect(await text(page, "#gaps")).toContain("Nobody Special");

    // WHEN they ask to show everyone
    await hear(page, "recall show everyone");

    // THEN the whole deck is back
    await says(page, "Studying the whole deck — 3 cards.");
    expect(await status(page)).toMatch(/^3 cards/u);
  });

  it.concurrent("should report progress when asked", async () => {
    // GIVEN the people deck and the microphone on
    const page = await withPeople();

    // WHEN the learner asks how many they have done
    await hear(page, "recall how many have I done");

    // THEN the assistant says
    await says(page, "0 of 3 cards seen, 0 new today.");
  });

  it.concurrent("should say it did not catch a command, and not act, on an off-hand remark", async () => {
    // GIVEN the people deck and the microphone on, a card in front of them
    const page = await withPeople();
    const before = await prompt(page);

    // WHEN the learner says something that is not a command
    await hear(page, "recall what year did the Titanic sink");

    // THEN the assistant says so, and the card and the log are untouched
    await says(page, "Didn't catch a command in that.");
    expect(await prompt(page)).toBe(before);
    expect(await savedLog(page, "people")).toEqual([]);
  });

  it.concurrent("should wait for the learner to finish speaking before acting on a command", async () => {
    // GIVEN the people deck and the microphone on
    const page = await withPeople();

    // WHEN the learner is still speaking (a partial result)
    await hear(page, "recall skip the alumni", false);

    // THEN what was heard is shown, and the deck is unchanged
    expect(await heard(page)).toBe("“recall skip the alumni”");
    expect(await status(page)).toMatch(/^3 cards/u);
    expect(await text(page, "#says")).toBe("");
  });

  it.concurrent("should say it could not read a reply the model got wrong", async () => {
    // GIVEN the people deck and a model that answers with a tag the deck does not have
    const page = await withPeople();

    // WHEN the learner asks for it
    await hear(page, "recall only the martians");

    // THEN the assistant says it could not read that, and the deck is unchanged
    await says(page, "Could not read that: Error");
    expect(await status(page)).toMatch(/^3 cards/u);
  });

  it.concurrent("should say why there is no assistant when the browser has no model, or the device cannot run it", async () => {
    // GIVEN a browser with no built-in model, and the microphone on
    const none = await open();
    await ready(none);
    await micOn(none);

    // WHEN the learner addresses the assistant
    await hear(none, "recall show everyone");

    // THEN it says the browser has none
    await says(none, "This browser has no built-in model — Chrome 148+ does.");

    // GIVEN a browser whose model is unavailable on this device
    const unavailable = await open({ model: { availability: "unavailable" } });
    await ready(unavailable);
    await micOn(unavailable);

    // WHEN the learner addresses the assistant
    await hear(unavailable, "recall show everyone");

    // THEN it says the device cannot run it
    await says(unavailable, "Chrome's built-in model is unavailable on this device.");
  });
});

describe("answering by voice", () => {
  it.concurrent("should take the answer only when the learner locks it in, then grade by voice, and not carry the words onto the next card", async () => {
    // GIVEN the first card and the microphone on
    const page = await open();
    await ready(page);
    await micOn(page);
    expect(await text(page, "#hint")).toContain("Say the answer, then lock it in.");

    // WHEN the learner says the answer but does not lock it in
    await hear(page, "structured fields");

    // THEN what was heard is shown, and the card is still face down
    expect(await heard(page)).toBe("“structured fields”");
    expect(await page.$eval("#back", (e) => e.classList.contains("hidden"))).toBe(true);

    // WHEN they lock it in
    await hear(page, "lock it in");

    // THEN it is judged, and the hint says to grade by voice
    await page.waitForFunction(
      () => !document.querySelector("#back")!.classList.contains("hidden"),
    );
    expect(await verdict(page)).toEqual({ text: "✓ correct", kind: "right" });
    expect(await text(page, "#hint")).toContain("Now say Again, Hard, Good or Easy.");

    // WHEN they say "good"
    await hear(page, "good");

    // THEN the card was graded Good, and the next card is face down with no verdict: the words did not bleed onto it
    await page.waitForFunction(
      (q) => document.querySelector("#front .prompt")!.textContent !== q,
      {},
      Q[0]!,
    );
    expect((await savedLog(page)).map(([, , r]) => r)).toEqual([GOOD]);
    expect(await page.$eval("#back", (e) => e.classList.contains("hidden"))).toBe(true);
    expect(await verdict(page)).toEqual({ text: "", kind: "" });
  });

  it.concurrent('should give up on a spoken "I don\'t know", showing the answer and suggesting Again', async () => {
    // GIVEN the first card and the microphone on
    const page = await open();
    await ready(page);
    await micOn(page);

    // WHEN the learner says they do not know
    await hear(page, "I don't know");

    // THEN the answer is shown with no verdict, and Again is suggested
    await page.waitForFunction(
      () => !document.querySelector("#back")!.classList.contains("hidden"),
    );
    expect(await verdict(page)).toEqual({ text: "", kind: "" });
    expect((await ratings(page)).find(([, on]) => on)?.[0]).toBe("Again");
  });

  it.concurrent("should judge a spoken wrong answer wrong", async () => {
    // GIVEN the first card and the microphone on
    const page = await open();
    await ready(page);
    await micOn(page);

    // WHEN the learner says another card's answer and locks it in
    await hear(page, "this browser lock it in");

    // THEN it is wrong, quoting what they said without the commit phrase
    await page.waitForFunction(
      () => !document.querySelector("#back")!.classList.contains("hidden"),
    );
    expect(await verdict(page)).toEqual({ text: "✗ you said “this browser”", kind: "wrong" });
  });

  it.concurrent("should say the microphone is blocked, and turn it off, when the browser refuses it", async () => {
    // GIVEN the microphone on
    const page = await open();
    await ready(page);
    await micOn(page);

    // WHEN the browser reports the permission was denied
    await recognitionEvent(page, "error", { error: "not-allowed" });

    // THEN the learner is told how to fix it, and the button offers voice again
    expect(await heard(page)).toBe(
      "Microphone blocked — allow it in the address bar, then click again.",
    );
    expect(await text(page, "#mic")).toBe("🎙 Answer by voice");
    expect(await page.$eval("#mic", (e) => e.getAttribute("aria-pressed"))).toBe("false");
  });

  it.concurrent("should ignore a routine silence timeout and keep listening", async () => {
    // GIVEN the microphone on
    const page = await open();
    await ready(page);
    await micOn(page);

    // WHEN the browser reports there was no speech
    await recognitionEvent(page, "error", { error: "no-speech" });

    // THEN nothing is said, and the microphone is still on
    expect(await heard(page)).toBe("");
    expect(await page.$eval("#mic", (e) => e.getAttribute("aria-pressed"))).toBe("true");
  });

  it.concurrent("should say what went wrong for any other microphone error", async () => {
    // GIVEN the microphone on
    const page = await open();
    await ready(page);
    await micOn(page);

    // WHEN the browser reports a network error
    await recognitionEvent(page, "error", { error: "network" });

    // THEN the learner is told which, and the microphone is off
    expect(await heard(page)).toBe("Microphone error: network");
    expect(await page.$eval("#mic", (e) => e.getAttribute("aria-pressed"))).toBe("false");
  });

  it.concurrent("should start listening again when Chrome ends a session after a stretch of silence", async () => {
    // GIVEN the microphone on, having heard audio
    const page = await open();
    await ready(page);
    await micOn(page);
    await page.waitForFunction(() => window.__srStarts === 1);

    // WHEN Chrome ends the session on its own
    await recognitionEvent(page, "end");

    // THEN the same recogniser is started again, and the microphone stays on
    await page.waitForFunction(() => window.__srStarts === 2, { timeout: 10_000 });
    expect(await page.evaluate(() => window.__srBuilt)).toBe(1);
    expect(await page.$eval("#mic", (e) => e.getAttribute("aria-pressed"))).toBe("true");
  });

  it.concurrent("should stop listening when the microphone button is pressed again", async () => {
    // GIVEN the microphone on
    const page = await open();
    await ready(page);
    await micOn(page);

    // WHEN the learner presses it again
    await page.click("#mic");

    // THEN it is off, the session was stopped, and the hint is the typing one
    expect(await text(page, "#mic")).toBe("🎙 Answer by voice");
    expect(await page.evaluate(() => window.__srAborts)).toBe(1);
    expect(await text(page, "#hint")).toContain("Type it and press Enter");
  });

  it.concurrent("should say there is no speech recognition in a browser without it", async () => {
    // GIVEN a browser with no Web Speech API
    const page = await open({ noSpeech: true });
    await ready(page);

    // WHEN the learner presses the voice button
    await page.click("#mic");

    // THEN they are told, and the button stays off
    expect(await heard(page)).toBe("This browser has no Web Speech API — Chrome does.");
    expect(await page.$eval("#mic", (e) => e.getAttribute("aria-pressed"))).toBe("false");
  });

  it.concurrent("should give up on a microphone that keeps dying before it opens", async () => {
    // GIVEN a microphone that opens but never hears (its sessions end at once)
    const page = await open({ noAudio: true });
    await ready(page);
    await micOn(page);

    // WHEN its session ends four times in a row before any audio (all within the half second the page allows a session to open in)
    await page.evaluate(() => {
      Date.now = () => 0; // pin the clock: a loaded machine must not make "within half a second" untrue
      for (let i = 0; i < 4; i++) window.__sr!.dispatchEvent(new Event("end"));
    });

    // THEN the page stops restarting it and says to type instead
    expect(await heard(page)).toBe(
      "Speech recognition keeps stopping before the mic opens. Type your answer instead.",
    );
    expect(await page.$eval("#mic", (e) => e.getAttribute("aria-pressed"))).toBe("false");
  });

  it.concurrent("should say the microphone hears nothing when audio never arrives", async () => {
    // GIVEN a microphone that opens but never hears
    const page = await open({ noAudio: true });
    await ready(page);

    // WHEN the learner turns it on and waits
    await micOn(page);

    // THEN after a few seconds the page says to check the input device
    await page.waitForFunction(
      () =>
        document.querySelector("#heard")!.textContent.startsWith("Mic is open but hearing nothing"),
      { timeout: 25_000 },
    );
    expect(await heard(page)).toBe(
      "Mic is open but hearing nothing — check your input device, or just type.",
    );
  }, 40_000);
});

describe("syncing history", () => {
  it.concurrent("should send the learner's code and deck to the server, and say it synced", async () => {
    // GIVEN a learner with a sync link
    const code = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const page = await open({ code, log: [["d1::q-a", daysAgo(1), GOOD]] });

    // WHEN the page loads
    await ready(page);
    await synced(page, "synced");

    // THEN the server was sent their code, the deck, and the review it did not have
    expect(page.server.posts[0]).toEqual({
      code,
      deckId: "demo",
      events: [["d1::q-a", expect.any(Number), GOOD]],
    });
    expect(await text(page, "#sync")).toBe("synced");
  });

  it.concurrent("should send a new review a few seconds after it is graded, and only that one", async () => {
    // GIVEN a learner who has synced once
    const page = await open({ log: [["d3::q-a", Date.now() - 5000, GOOD]] }); // just reviewed, so not due: card 1 is next
    await ready(page);
    await synced(page, "synced");

    // WHEN they grade a card
    await answer(page, "Structured fields");
    await grade(page, "Good");

    // THEN a few seconds later the server is sent that review, and only it: not the older one it already has
    const sentGrade = () =>
      page.server.posts.find((p) => p.events.some(([id]) => id === "d1::q-a"));
    await until(() => !!sentGrade(), 40_000, 100);
    expect(sentGrade()!.events.map(([id, , r]) => [id, r])).toEqual([["d1::q-a", GOOD]]);
  }, 70_000);

  it.concurrent("should pull the reviews another device made, once each, and say how many", async () => {
    // GIVEN this device has reviewed card 1, and another device has reviewed cards 1 and 2
    const both: [string, number, 3][] = [
      ["d1::q-a", daysAgo(3), GOOD],
      ["d2::q-a", daysAgo(2), GOOD],
    ];
    const page = await open({ log: [both[0]!], remote: both });

    // WHEN the page syncs
    await ready(page);
    await synced(page, /pulled/u);

    // THEN only the review it lacked is pulled, in the singular, and both cards now count as seen
    expect(await text(page, "#sync")).toBe("synced — pulled 1 review from another device");
    expect(await status(page)).toMatch(/^5 cards · 2 seen/u);
    expect((await savedLog(page)).map(([id]) => id)).toEqual(["d1::q-a", "d2::q-a"]);
  });

  it.concurrent("should say reviews in the plural when it pulls more than one", async () => {
    // GIVEN another device that has reviewed two cards this one has not
    const page = await open({
      remote: [
        ["d2::q-a", daysAgo(3), GOOD],
        ["d3::q-a", daysAgo(2), GOOD],
      ],
    });

    // WHEN the page syncs
    await ready(page);
    await synced(page, /pulled/u);

    // THEN it says two, and the status counts them
    expect(await text(page, "#sync")).toBe("synced — pulled 2 reviews from another device");
    expect(await status(page)).toMatch(/^5 cards · 2 seen/u);
  });

  it.concurrent("should keep working when the server is down, and say the reviews are saved here", async () => {
    // GIVEN a sync server that is down
    const page = await open({ down: true });

    // WHEN the page loads
    await ready(page);
    await synced(page, /offline/u);

    // THEN it says so, with why
    expect(await text(page, "#sync")).toBe(
      "offline — reviews are saved here and will sync later (HTTP 503)",
    );

    // WHEN the learner grades a card anyway
    await answer(page, "Structured fields");
    await grade(page, "Good");

    // THEN the review is saved on this device
    expect((await savedLog(page)).map(([id, , r]) => [id, r])).toEqual([["d1::q-a", GOOD]]);
  });

  it.concurrent("should make a code for a learner with none, and put it in the address so the page can be bookmarked", async () => {
    // GIVEN a learner who opens the plain app link
    const page = await open({ hash: "" });

    // WHEN the page loads
    await ready(page);
    await synced(page, "synced");

    // THEN a fresh 32-digit code was made and used, and the address carries it
    const code = page.server.posts[0]!.code;
    expect(code).toMatch(/^[0-9a-f]{32}$/u);
    expect(await page.evaluate(() => location.hash)).toBe(`#s=${code}`);
  });

  it.concurrent("should not use a malformed code from the link, and make a fresh one instead", async () => {
    // GIVEN a link whose code is not 32 hex digits
    const page = await open({ hash: "s=not-a-code" });

    // WHEN the page loads
    await ready(page);
    await synced(page, "synced");

    // THEN the server was sent a fresh code, not the malformed one
    expect(page.server.posts[0]!.code).toMatch(/^[0-9a-f]{32}$/u);
  });

  it.concurrent("should put the fresh code in the address when the link's code was malformed", async () => {
    // GIVEN a link whose code is not 32 hex digits
    const page = await open({ hash: "s=not-a-code" });

    // WHEN the page loads
    await ready(page);
    await synced(page, "synced");

    // THEN the address carries the fresh code that was used, so a bookmark names the identity
    const code = page.server.posts[0]!.code;
    expect(await page.evaluate(() => location.hash)).toBe(`#s=${code}`);
  });

  it.concurrent("should sync again when the browser comes back online or the tab is shown again", async () => {
    // GIVEN a learner who has synced once
    const page = await open();
    await ready(page);
    await synced(page, "synced");
    const n = page.server.posts.length;

    // WHEN the browser comes back online
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await until(() => page.server.posts.length !== n);

    // THEN it synced again
    expect(page.server.posts.length).toBe(n + 1);

    // WHEN the tab is shown again
    await page.evaluate(() =>
      document.dispatchEvent(new Event("visibilitychange", { bubbles: true })),
    );
    await until(() => page.server.posts.length !== n + 1);

    // THEN it synced once more
    expect(page.server.posts.length).toBe(n + 2);
  });

  it.concurrent("should copy the learner's own link with their code, and the plain app link without it", async () => {
    // GIVEN the page opened on a sync link
    const code = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const page = await open({ code });
    await ready(page);
    const app = await page.evaluate(() => location.origin + location.pathname);

    // WHEN the learner copies their sync link
    await page.click("#mylink");
    await synced(page, "copied — this link carries your history, so keep it to yourself");

    // THEN the clipboard holds the app link with their code
    expect(
      await page.evaluate(async () => {
        const held = await navigator.clipboard.readText();
        return held;
      }),
    ).toBe(`${app}#s=${code}`);

    // WHEN they copy the app link
    await page.click("#applink");
    await synced(page, "copied the plain app link — no history attached");

    // THEN the clipboard holds the link with no code
    expect(
      await page.evaluate(async () => {
        const held = await navigator.clipboard.readText();
        return held;
      }),
    ).toBe(app);
  });
});

describe("backing up progress", () => {
  it.concurrent("should export the review log as a file the learner can keep", async () => {
    // GIVEN one card graded
    const page = await open();
    await ready(page);
    await answer(page, "Structured fields");
    await grade(page, "Good");

    // WHEN they export
    await page.click("#export");

    // THEN the file holds the deck's id and the log the browser saved
    const file: unknown = JSON.parse(
      await page.evaluate(async () => {
        const body = await window.__blob!.text();
        return body;
      }),
    );
    const saved = await savedLog(page);
    expect(file).toEqual({ v: 1, deckId: "demo", log: saved });
    expect(saved.map(([id, , r]) => [id, r])).toEqual([["d1::q-a", GOOD]]);
  });

  it.concurrent("should merge an imported backup into the history, once, in time order", async () => {
    // GIVEN card 2 reviewed a day ago on this device, and a backup with that review and one for card 3 two days ago
    const mine: [string, number, 3] = ["d2::q-a", daysAgo(1), GOOD],
      theirs: [string, number, 3] = ["d3::q-a", daysAgo(2), GOOD];
    const page = await open({ log: [mine] });
    await ready(page);
    const backup = writeJson("recall-demo-progress.json", {
      v: 1,
      deckId: "demo",
      log: [mine, theirs],
    });

    // WHEN the learner imports the backup, twice
    const importBackup = async () => {
      const [chooser] = await Promise.all([page.waitForFileChooser(), page.click("#importBtn")]);
      await chooser.accept([backup]);
      await page.waitForFunction(
        (n) => document.querySelector("#status")!.textContent.includes(`${n} seen`),
        {},
        2,
      );
    };
    await importBackup();
    await importBackup();

    // THEN each review is in the history once, oldest first, and the status counts two cards seen
    expect(await savedLog(page)).toEqual([theirs, mine]);
    expect(await status(page)).toMatch(/^5 cards · 2 seen/u);
  });
});
