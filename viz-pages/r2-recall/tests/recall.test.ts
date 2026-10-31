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
    const page = await viz.given("a learner with no history", async () => {
      const p = await open();
      return p;
    });

    await viz.when("the page loads", async () => {
      await ready(page);
      await synced(page, "synced");
    });

    await viz.then(
      'the heaviest card comes first, nothing has been seen, and the deck is on the "studied before" line',
      async () => {
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
        expect(await text(page, "#recents")).toBe("Studied before: Demo — the deck format itself");
        expect(page.errors).toEqual([]);
      },
    );
  });

  it.concurrent("should mark a correct typed answer right, suggest Good, and put the answer on the back", async () => {
    const page = await viz.given("the first card", async () => {
      const p = await open();
      await ready(p);
      return p;
    });

    await viz.when("the learner types the right answer", async () => {
      await answer(page, "Structured fields");
    });

    await viz.then(
      "it is marked correct, Good is the suggestion, and the answer shows",
      async () => {
        expect(await verdict(page)).toEqual({ text: "✓ correct", kind: "right" });
        expect(await ratings(page)).toEqual([
          ["Again", false],
          ["Hard", false],
          ["Good", true],
          ["Easy", false],
        ]);
        expect(await text(page, "#back")).toContain("Structured fields");
        expect(await page.$eval("#answer", (e) => e.classList.contains("hidden"))).toBe(true);
      },
    );
  });

  it.concurrent("should mark a wrong typed answer wrong, quoting it, and suggest Again", async () => {
    const page = await viz.given("the first card", async () => {
      const p = await open();
      await ready(p);
      return p;
    });

    await viz.when("the learner types something else", async () => {
      await answer(page, "A guess");
    });

    await viz.then("it says what they said, and Again is the suggestion", async () => {
      expect(await verdict(page)).toEqual({ text: "✗ you said “A guess”", kind: "wrong" });
      expect(await ratings(page)).toEqual([
        ["Again", true],
        ["Hard", false],
        ["Good", false],
        ["Easy", false],
      ]);
    });
  });

  it.concurrent("should show no verdict when the learner gives up, and suggest Again", async () => {
    const page = await viz.given("the first card", async () => {
      const p = await open();
      await ready(p);
      return p;
    });

    await viz.when("they press Enter with nothing typed", async () => {
      await giveUp(page);
    });

    await viz.then("the answer is shown with no verdict, and Again is the suggestion", async () => {
      expect(await verdict(page)).toEqual({ text: "", kind: "" });
      expect(await ratings(page)).toEqual([
        ["Again", true],
        ["Hard", false],
        ["Good", false],
        ["Easy", false],
      ]);
      expect(await text(page, "#back")).toContain("Structured fields");
    });
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
      const page = await viz.given(
        'the first card, whose answer is "Structured fields", among four other answers',
        async () => {
          const p = await open();
          await ready(p);
          return p;
        },
      );

      await viz.when("the learner types it", async () => {
        await answer(page, said);
      });

      await viz.then("it is judged as the nearest answer decides", async () => {
        expect((await verdict(page)).kind).toBe(right ? "right" : "wrong");
      });
    });
  }

  it.concurrent("should save a grade, count it, move to the next card, and keep it after a reload", async () => {
    const page = await viz.given("the first card, answered", async () => {
      const p = await open();
      await ready(p);
      await answer(p, "Structured fields");
      return p;
    });

    await viz.when("the learner grades it Good", async () => {
      await grade(page, "Good");
    });

    await viz.then(
      'the next card is shown, the status counts one seen and one new today, the review is saved in the browser for that card with that rating, and the card moved out of "never seen" into "learning"',
      async () => {
        expect(await prompt(page)).toBe(Q[1]!);
        expect(await status(page)).toBe("5 cards · 1 seen · 0 due now · 1 new today");
        const log = await savedLog(page);
        expect(log.map(([id, , r]) => [id, r])).toEqual([["d1::q-a", GOOD]]);
        expect(Math.abs(log[0]![1] - Date.now())).toBeLessThan(60_000);
        expect(await buckets(page)).toMatchObject({ "never seen": 4, learning: 1 });
      },
    );

    await viz.when("they reload", async () => {
      await page.reload();
      await ready(page);
    });

    await viz.then(
      "the history is still there: one seen, and the graded card is not served again",
      async () => {
        expect(await status(page)).toBe("5 cards · 1 seen · 0 due now · 1 new today");
        expect(await prompt(page)).toBe(Q[1]!);
      },
    );
  });

  it.concurrent("should record the rating the learner chose, not the suggestion", async () => {
    const page = await viz.given("a correct answer (Good suggested)", async () => {
      const p = await open();
      await ready(p);
      await answer(p, "Structured fields");
      return p;
    });

    await viz.when("they say it was easy", async () => {
      await grade(page, "Easy");
    });

    await viz.then(
      'Easy is what was saved, and the card leaves "learning" for a review bucket (Easy graduates at once)',
      async () => {
        expect((await savedLog(page)).map(([, , r]) => r)).toEqual([EASY]);
        expect((await buckets(page))["learning"]).toBe(0);
      },
    );
  });

  it.concurrent("should say nothing is due once every card has been graded", async () => {
    const page = await viz.given("a learner working through the deck", async () => {
      const p = await open();
      await ready(p);
      return p;
    });

    await viz.when("they grade all five cards", async () => {
      for (let i = 0; i < 5; i++) {
        // oxlint-disable-next-line no-await-in-loop -- each card is graded on the page the previous grade left
        await giveUp(page);
        // oxlint-disable-next-line no-await-in-loop -- each card is graded on the page the previous grade left
        await grade(page, "Good");
      }
    });

    await viz.then(
      "the card area says nothing is due, with no answer box and no rating buttons",
      async () => {
        expect(await text(page, "#front")).toContain("Nothing due 🎉");
        expect(await page.$eval("#answer", (e) => e.classList.contains("hidden"))).toBe(true);
        expect(await ratings(page)).toEqual([]);
        expect(await status(page)).toBe("5 cards · 5 seen · 0 due now · 5 new today");
      },
    );
  });

  it.concurrent("should serve a due card before unseen ones, the most overdue first", async () => {
    const page = await viz.given(
      "history: card 4 reviewed 60 days ago and card 3 reviewed 30 days ago, both long overdue",
      async () => {
        const p = await open({
          log: [
            ["d4::q-a", daysAgo(60), GOOD],
            ["d3::q-a", daysAgo(30), GOOD],
          ],
        });
        return p;
      },
    );

    await viz.when("the page loads", async () => {
      await ready(page);
    });

    await viz.then(
      "the most overdue (card 4) leads, though card 1 is heavier and unseen",
      async () => {
        expect(await prompt(page)).toBe(Q[3]!);
        expect(await status(page)).toBe("5 cards · 2 seen · 2 due now · 0 new today");
      },
    );

    await viz.when("they grade it", async () => {
      await giveUp(page);
      await grade(page, "Good");
    });

    await viz.then("the next most overdue (card 3) comes next", async () => {
      expect(await prompt(page)).toBe(Q[2]!);
    });
  });

  it.concurrent("should list what is in a bucket when it is clicked, and say when it is empty", async () => {
    const page = await viz.given("one card graded, four unseen", async () => {
      const p = await open();
      await ready(p);
      await answer(p, "Structured fields");
      await grade(p, "Good");
      return p;
    });

    await viz.when('the learner clicks "never seen"', async () => {
      await page.evaluate(() =>
        [...document.querySelectorAll<HTMLButtonElement>("#buckets > button")]
          .find((b) => b.textContent === "never seen")!
          .click(),
      );
    });

    await viz.then("it lists the four unseen answers, in deck order", async () => {
      expect(await text(page, "#peek")).toBe(
        "A note times a template · This browser · FSRS · Nearest match",
      );
    });

    await viz.when("they click an empty bucket", async () => {
      await page.evaluate(() =>
        [...document.querySelectorAll<HTMLButtonElement>("#buckets > button")]
          .find((b) => b.textContent === "6 months +")!
          .click(),
      );
    });

    await viz.then(
      "it says so, and the bars are drawn in proportion: the fullest bucket is full width, an empty one has none",
      async () => {
        expect(await text(page, "#peek")).toBe("(empty)");
        expect(
          await page.$$eval("#buckets .bucket-bar", (bs) =>
            bs.slice(0, 2).map((b) => (b instanceof HTMLElement ? b.style.width : "")),
          ),
        ).toEqual(["100%", "25%"]);
      },
    );
  });
});

describe("bringing a deck", () => {
  it.concurrent("should study the deck's cards, show its text as text, and say which notes make no card", async () => {
    const page = await viz.given("the demo deck open", async () => {
      const p = await open();
      await ready(p);
      return p;
    });

    await viz.when(
      "the learner loads a deck of people, one of whom lacks the field its template requires",
      async () => {
        await loadDeckFile(page, PEOPLE);
      },
    );

    await viz.then(
      'the heaviest note that can make a card comes first with its HTML shown as text, three cards are studied, the one that cannot be made is named, and both decks are on the "studied before" line',
      async () => {
        expect(await prompt(page)).toBe("Who is the <b>CTO</b>?");
        expect(await page.$$eval("#front .prompt b", (b) => b.length)).toBe(0);
        expect(await status(page)).toBe("3 cards · 0 seen · 0 due now · 0 new today");
        expect(await text(page, "#gaps")).toBe(
          "1 in this deck produce no card — a field some template requires is missing: Nobody Special",
        );
        expect(await text(page, "#recents")).toBe(
          "Studied before: People (people.json) · Demo — the deck format itself",
        );
      },
    );
  });

  it.concurrent("should keep each deck's history apart", async () => {
    const page = await viz.given(
      "a card graded in the demo deck, and its sync finished",
      async () => {
        const p = await open();
        await ready(p);
        await answer(p, "Structured fields");
        await grade(p, "Good");
        await p.waitForFunction(() => document.querySelector("#sync")!.textContent === "synced", {
          timeout: 15_000,
        });
        const posted = p.server.posts.length;
        await p.evaluate(() => window.dispatchEvent(new Event("online")));
        await until(() => p.server.posts.length !== posted, Infinity);
        await synced(p, "synced");
        return p;
      },
    );

    await viz.when("the learner loads another deck", async () => {
      await loadDeckFile(page, PEOPLE);
    });

    await viz.then("it has no history of its own yet", async () => {
      expect(await status(page)).toBe("3 cards · 0 seen · 0 due now · 0 new today");
    });

    await viz.when("they go back to the demo", async () => {
      await page.click("#demoBtn");
      await page.waitForFunction(() =>
        document.querySelector("#status")!.textContent.startsWith("5 cards"),
      );
    });

    await viz.then("its history is where they left it", async () => {
      expect(await status(page)).toBe("5 cards · 1 seen · 0 due now · 1 new today");
    });
  });

  it.concurrent("should not file a sync answer for one deck into another opened while it was in flight", async () => {
    const { page, gate } = await viz.given(
      "a card graded in the demo deck, and a sync of it whose answer the server is holding back",
      async () => {
        const p = await open();
        await ready(p);
        await synced(p, "synced");
        await answer(p, "Structured fields");
        await grade(p, "Good");
        const held = deferred();
        p.server.gate = held.promise;
        await p.evaluate(() => window.dispatchEvent(new Event("online")));
        await synced(p, "syncing…");
        return { page: p, gate: held };
      },
    );

    await viz.when("the learner opens another deck, and then the server answers", async () => {
      await loadDeckFile(page, PEOPLE);
      gate.release();
      await page.waitForFunction(() => document.querySelector("#sync")!.textContent === "synced", {
        timeout: 15_000,
      });
      await wait(500);
    });

    await viz.then("the other deck has no history of the demo's reviews", async () => {
      expect(await status(page)).toBe("3 cards · 0 seen · 0 due now · 0 new today");
      expect(await savedLog(page, "people")).toEqual([]);
    });

    await viz.when("they go back to the demo", async () => {
      await page.click("#demoBtn");
      await page.waitForFunction(() =>
        document.querySelector("#status")!.textContent.startsWith("5 cards"),
      );
    });

    await viz.then("its review is still there", async () => {
      expect(await status(page)).toBe("5 cards · 1 seen · 0 due now · 1 new today");
    });
  });

  it.concurrent("should leave the demo deck alone when the answer for a deck that has no history arrives after switching to it", async () => {
    const { page, gate } = await viz.given(
      "a deck with no reviews, and a sync of it whose answer the server is holding back",
      async () => {
        const p = await open();
        await ready(p);
        await loadDeckFile(p, PEOPLE);
        await synced(p, "synced");
        const held = deferred();
        p.server.gate = held.promise;
        await p.evaluate(() => window.dispatchEvent(new Event("online")));
        await synced(p, "syncing…");
        return { page: p, gate: held };
      },
    );

    await viz.when("the learner goes back to the demo, and then the server answers", async () => {
      await page.click("#demoBtn");
      await page.waitForFunction(() =>
        document.querySelector("#status")!.textContent.startsWith("5 cards"),
      );
      gate.release();
      await page.waitForFunction(() => document.querySelector("#sync")!.textContent === "synced", {
        timeout: 15_000,
      });
    });

    await viz.then("the demo still has no history", async () => {
      expect(await status(page)).toBe("5 cards · 0 seen · 0 due now · 0 new today");
    });
  });

  it.concurrent("should judge an accented name against the deck's near-identical names by its letters, not its accents", async () => {
    const page = await viz.given(
      "a deck with Renee Smith (asked first) and, close by, Rene Smith",
      async () => {
        const p = await open();
        await ready(p);
        const deck = {
          id: "renees",
          name: "Renees",
          templates: PEOPLE.templates,
          notes: [
            {
              id: "r1",
              weight: 2,
              fields: { role: "the one with the double e", name: "Renee Smith" },
            },
            {
              id: "r2",
              weight: 1,
              fields: { role: "the one with the single e", name: "Rene Smith" },
            },
          ],
        };
        await loadDeckFile(p, deck, "renees.json");
        expect(await prompt(p)).toBe("Who is the one with the double e?");
        return p;
      },
    );

    await viz.when(
      "the learner types the name with an accent, as a keyboard or a recogniser gives it",
      async () => {
        await answer(page, "Renée Smith");
      },
    );

    await viz.then("it is Renee Smith they said, not Rene Smith", async () => {
      expect((await verdict(page)).kind).toBe("right");
    });
  });

  it.concurrent("should study the whole deck when its default tags match nothing, rather than an empty one", async () => {
    const page = await viz.given(
      "a deck that says to start on a tag none of its notes has",
      async () => {
        const p = await open();
        await ready(p);
        return p;
      },
    );

    await viz.when("it is loaded", async () => {
      await loadDeckFile(page, { ...PEOPLE, defaultTags: ["ghosts"] });
    });

    await viz.then("all its cards are studied", async () => {
      expect(await status(page)).toBe("3 cards · 0 seen · 0 due now · 0 new today");
    });
  });

  it.concurrent("should study only the deck's default tags, without calling the rest a gap", async () => {
    const page = await viz.given("a deck that says to start on its staff", async () => {
      const p = await open();
      await ready(p);
      return p;
    });

    await viz.when("it is loaded", async () => {
      await loadDeckFile(page, { ...PEOPLE, defaultTags: ["staff"] });
    });

    await viz.then(
      "only the two staff cards are studied, and the alumnus with no card is not reported (it is outside the filter)",
      async () => {
        expect(await status(page)).toBe("2 cards · 0 seen · 0 due now · 0 new today");
        expect(await text(page, "#gaps")).toBe("");
        expect(await prompt(page)).toBe("Who is the <b>CTO</b>?");
      },
    );
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
    const page = await viz.given("the people deck and the microphone on", async () => {
      const p = await withPeople();
      return p;
    });

    await viz.when('the learner says "recall, skip the alumni"', async () => {
      await hear(page, "recall skip the alumni");
    });

    await viz.then(
      "the alumni are hidden: two cards, and the assistant says what it did",
      async () => {
        await says(page, "Hiding alumni — 2 cards.");
        expect(await status(page)).toMatch(/^2 cards/u);
      },
    );

    await viz.when("they ask for only the Iowa folks", async () => {
      await hear(page, "recall only the Iowa folks");
    });

    await viz.then(
      "only Iowa's card is left, and the alumnus in Iowa who has no card is now reported as a gap",
      async () => {
        await says(page, "Showing only loc:iowa — 1 card.");
        expect(await status(page)).toMatch(/^1 card/u);
        expect(await text(page, "#gaps")).toContain("Nobody Special");
      },
    );

    await viz.when("they ask to show everyone", async () => {
      await hear(page, "recall show everyone");
    });

    await viz.then("the whole deck is back", async () => {
      await says(page, "Studying the whole deck — 3 cards.");
      expect(await status(page)).toMatch(/^3 cards/u);
    });
  });

  it.concurrent("should report progress when asked", async () => {
    const page = await viz.given("the people deck and the microphone on", async () => {
      const p = await withPeople();
      return p;
    });

    await viz.when("the learner asks how many they have done", async () => {
      await hear(page, "recall how many have I done");
    });

    await viz.then("the assistant says", async () => {
      await says(page, "0 of 3 cards seen, 0 new today.");
    });
  });

  it.concurrent("should say it did not catch a command, and not act, on an off-hand remark", async () => {
    const { page, before } = await viz.given(
      "the people deck and the microphone on, a card in front of them",
      async () => {
        const p = await withPeople();
        const shown = await prompt(p);
        return { page: p, before: shown };
      },
    );

    await viz.when("the learner says something that is not a command", async () => {
      await hear(page, "recall what year did the Titanic sink");
    });

    await viz.then("the assistant says so, and the card and the log are untouched", async () => {
      await says(page, "Didn't catch a command in that.");
      expect(await prompt(page)).toBe(before);
      expect(await savedLog(page, "people")).toEqual([]);
    });
  });

  it.concurrent("should wait for the learner to finish speaking before acting on a command", async () => {
    const page = await viz.given("the people deck and the microphone on", async () => {
      const p = await withPeople();
      return p;
    });

    await viz.when("the learner is still speaking (a partial result)", async () => {
      await hear(page, "recall skip the alumni", false);
    });

    await viz.then("what was heard is shown, and the deck is unchanged", async () => {
      expect(await heard(page)).toBe("“recall skip the alumni”");
      expect(await status(page)).toMatch(/^3 cards/u);
      expect(await text(page, "#says")).toBe("");
    });
  });

  it.concurrent("should say it could not read a reply the model got wrong", async () => {
    const page = await viz.given(
      "the people deck and a model that answers with a tag the deck does not have",
      async () => {
        const p = await withPeople();
        return p;
      },
    );

    await viz.when("the learner asks for it", async () => {
      await hear(page, "recall only the martians");
    });

    await viz.then(
      "the assistant says it could not read that, and the deck is unchanged",
      async () => {
        await says(page, "Could not read that: Error");
        expect(await status(page)).toMatch(/^3 cards/u);
      },
    );
  });

  it.concurrent("should say why there is no assistant when the browser has no model, or the device cannot run it", async () => {
    const none = await viz.given(
      "a browser with no built-in model, and the microphone on",
      async () => {
        const p = await open();
        await ready(p);
        await micOn(p);
        return p;
      },
    );

    await viz.when("the learner addresses the assistant", async () => {
      await hear(none, "recall show everyone");
    });

    await viz.then("it says the browser has none", async () => {
      await says(none, "This browser has no built-in model — Chrome 148+ does.");
    });

    const unavailable = await viz.given(
      "a browser whose model is unavailable on this device, and the microphone on",
      async () => {
        const p = await open({ model: { availability: "unavailable" } });
        await ready(p);
        await micOn(p);
        return p;
      },
    );

    await viz.when("the learner addresses that assistant", async () => {
      await hear(unavailable, "recall show everyone");
    });

    await viz.then("it says the device cannot run it", async () => {
      await says(unavailable, "Chrome's built-in model is unavailable on this device.");
    });
  });
});

describe("answering by voice", () => {
  it.concurrent("should take the answer only when the learner locks it in, then grade by voice, and not carry the words onto the next card", async () => {
    const page = await viz.given("the first card and the microphone on", async () => {
      const p = await open();
      await ready(p);
      await micOn(p);
      expect(await text(p, "#hint")).toContain("Say the answer, then lock it in.");
      return p;
    });

    await viz.when("the learner says the answer but does not lock it in", async () => {
      await hear(page, "structured fields");
    });

    await viz.then("what was heard is shown, and the card is still face down", async () => {
      expect(await heard(page)).toBe("“structured fields”");
      expect(await page.$eval("#back", (e) => e.classList.contains("hidden"))).toBe(true);
    });

    await viz.when("they lock it in", async () => {
      await hear(page, "lock it in");
    });

    await viz.then("it is judged, and the hint says to grade by voice", async () => {
      await page.waitForFunction(
        () => !document.querySelector("#back")!.classList.contains("hidden"),
      );
      expect(await verdict(page)).toEqual({ text: "✓ correct", kind: "right" });
      expect(await text(page, "#hint")).toContain("Now say Again, Hard, Good or Easy.");
    });

    await viz.when('they say "good"', async () => {
      await hear(page, "good");
    });

    await viz.then(
      "the card was graded Good, and the next card is face down with no verdict: the words did not bleed onto it",
      async () => {
        await page.waitForFunction(
          (q) => document.querySelector("#front .prompt")!.textContent !== q,
          {},
          Q[0]!,
        );
        expect((await savedLog(page)).map(([, , r]) => r)).toEqual([GOOD]);
        expect(await page.$eval("#back", (e) => e.classList.contains("hidden"))).toBe(true);
        expect(await verdict(page)).toEqual({ text: "", kind: "" });
      },
    );
  });

  it.concurrent('should give up on a spoken "I don\'t know", showing the answer and suggesting Again', async () => {
    const page = await viz.given("the first card and the microphone on", async () => {
      const p = await open();
      await ready(p);
      await micOn(p);
      return p;
    });

    await viz.when("the learner says they do not know", async () => {
      await hear(page, "I don't know");
    });

    await viz.then("the answer is shown with no verdict, and Again is suggested", async () => {
      await page.waitForFunction(
        () => !document.querySelector("#back")!.classList.contains("hidden"),
      );
      expect(await verdict(page)).toEqual({ text: "", kind: "" });
      expect((await ratings(page)).find(([, on]) => on)?.[0]).toBe("Again");
    });
  });

  it.concurrent("should judge a spoken wrong answer wrong", async () => {
    const page = await viz.given("the first card and the microphone on", async () => {
      const p = await open();
      await ready(p);
      await micOn(p);
      return p;
    });

    await viz.when("the learner says another card's answer and locks it in", async () => {
      await hear(page, "this browser lock it in");
    });

    await viz.then("it is wrong, quoting what they said without the commit phrase", async () => {
      await page.waitForFunction(
        () => !document.querySelector("#back")!.classList.contains("hidden"),
      );
      expect(await verdict(page)).toEqual({ text: "✗ you said “this browser”", kind: "wrong" });
    });
  });

  it.concurrent("should say the microphone is blocked, and turn it off, when the browser refuses it", async () => {
    const page = await viz.given("the microphone on", async () => {
      const p = await open();
      await ready(p);
      await micOn(p);
      return p;
    });

    await viz.when("the browser reports the permission was denied", async () => {
      await recognitionEvent(page, "error", { error: "not-allowed" });
    });

    await viz.then(
      "the learner is told how to fix it, and the button offers voice again",
      async () => {
        expect(await heard(page)).toBe(
          "Microphone blocked — allow it in the address bar, then click again.",
        );
        expect(await text(page, "#mic")).toBe("🎙 Answer by voice");
        expect(await page.$eval("#mic", (e) => e.getAttribute("aria-pressed"))).toBe("false");
      },
    );
  });

  it.concurrent("should ignore a routine silence timeout and keep listening", async () => {
    const page = await viz.given("the microphone on", async () => {
      const p = await open();
      await ready(p);
      await micOn(p);
      return p;
    });

    await viz.when("the browser reports there was no speech", async () => {
      await recognitionEvent(page, "error", { error: "no-speech" });
    });

    await viz.then("nothing is said, and the microphone is still on", async () => {
      expect(await heard(page)).toBe("");
      expect(await page.$eval("#mic", (e) => e.getAttribute("aria-pressed"))).toBe("true");
    });
  });

  it.concurrent("should say what went wrong for any other microphone error", async () => {
    const page = await viz.given("the microphone on", async () => {
      const p = await open();
      await ready(p);
      await micOn(p);
      return p;
    });

    await viz.when("the browser reports a network error", async () => {
      await recognitionEvent(page, "error", { error: "network" });
    });

    await viz.then("the learner is told which, and the microphone is off", async () => {
      expect(await heard(page)).toBe("Microphone error: network");
      expect(await page.$eval("#mic", (e) => e.getAttribute("aria-pressed"))).toBe("false");
    });
  });

  it.concurrent("should start listening again when Chrome ends a session after a stretch of silence", async () => {
    const page = await viz.given("the microphone on, having heard audio", async () => {
      const p = await open();
      await ready(p);
      await micOn(p);
      await p.waitForFunction(() => window.__srStarts === 1);
      return p;
    });

    await viz.when("Chrome ends the session on its own", async () => {
      await recognitionEvent(page, "end");
    });

    await viz.then(
      "the same recogniser is started again, and the microphone stays on",
      async () => {
        await page.waitForFunction(() => window.__srStarts === 2, { timeout: 10_000 });
        expect(await page.evaluate(() => window.__srBuilt)).toBe(1);
        expect(await page.$eval("#mic", (e) => e.getAttribute("aria-pressed"))).toBe("true");
      },
    );
  });

  it.concurrent("should stop listening when the microphone button is pressed again", async () => {
    const page = await viz.given("the microphone on", async () => {
      const p = await open();
      await ready(p);
      await micOn(p);
      return p;
    });

    await viz.when("the learner presses it again", async () => {
      await page.click("#mic");
    });

    await viz.then(
      "it is off, the session was stopped, and the hint is the typing one",
      async () => {
        expect(await text(page, "#mic")).toBe("🎙 Answer by voice");
        expect(await page.evaluate(() => window.__srAborts)).toBe(1);
        expect(await text(page, "#hint")).toContain("Type it and press Enter");
      },
    );
  });

  it.concurrent("should say there is no speech recognition in a browser without it", async () => {
    const page = await viz.given("a browser with no Web Speech API", async () => {
      const p = await open({ noSpeech: true });
      await ready(p);
      return p;
    });

    await viz.when("the learner presses the voice button", async () => {
      await page.click("#mic");
    });

    await viz.then("they are told, and the button stays off", async () => {
      expect(await heard(page)).toBe("This browser has no Web Speech API — Chrome does.");
      expect(await page.$eval("#mic", (e) => e.getAttribute("aria-pressed"))).toBe("false");
    });
  });

  it.concurrent("should give up on a microphone that keeps dying before it opens", async () => {
    const page = await viz.given(
      "a microphone that opens but never hears (its sessions end at once)",
      async () => {
        const p = await open({ noAudio: true });
        await ready(p);
        await micOn(p);
        return p;
      },
    );

    await viz.when(
      "its session ends four times in a row before any audio (all within the half second the page allows a session to open in)",
      async () => {
        await page.evaluate(() => {
          Date.now = () => 0; // pin the clock: a loaded machine must not make "within half a second" untrue
          for (let i = 0; i < 4; i++) window.__sr!.dispatchEvent(new Event("end"));
        });
      },
    );

    await viz.then("the page stops restarting it and says to type instead", async () => {
      expect(await heard(page)).toBe(
        "Speech recognition keeps stopping before the mic opens. Type your answer instead.",
      );
      expect(await page.$eval("#mic", (e) => e.getAttribute("aria-pressed"))).toBe("false");
    });
  });

  it.concurrent("should say the microphone hears nothing when audio never arrives", async () => {
    const page = await viz.given("a microphone that opens but never hears", async () => {
      const p = await open({ noAudio: true });
      await ready(p);
      return p;
    });

    await viz.when("the learner turns it on and waits", async () => {
      await micOn(page);
    });

    await viz.then("after a few seconds the page says to check the input device", async () => {
      await page.waitForFunction(
        () =>
          document
            .querySelector("#heard")!
            .textContent.startsWith("Mic is open but hearing nothing"),
        { timeout: 25_000 },
      );
      expect(await heard(page)).toBe(
        "Mic is open but hearing nothing — check your input device, or just type.",
      );
    });
  }, 40_000);
});

describe("syncing history", () => {
  it.concurrent("should send the learner's code and deck to the server, and say it synced", async () => {
    const { page, code } = await viz.given("a learner with a sync link", async () => {
      const c = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
      const p = await open({ code: c, log: [["d1::q-a", daysAgo(1), GOOD]] });
      return { page: p, code: c };
    });

    await viz.when("the page loads", async () => {
      await ready(page);
      await synced(page, "synced");
    });

    await viz.then(
      "the server was sent their code, the deck, and the review it did not have",
      async () => {
        expect(page.server.posts[0]).toEqual({
          code,
          deckId: "demo",
          events: [["d1::q-a", expect.any(Number), GOOD]],
        });
        expect(await text(page, "#sync")).toBe("synced");
      },
    );
  });

  it.concurrent("should send a new review a few seconds after it is graded, and only that one", async () => {
    const page = await viz.given("a learner who has synced once", async () => {
      const p = await open({ log: [["d3::q-a", Date.now() - 5000, GOOD]] }); // just reviewed, so not due: card 1 is next
      await ready(p);
      await synced(p, "synced");
      return p;
    });

    await viz.when("they grade a card", async () => {
      await answer(page, "Structured fields");
      await grade(page, "Good");
    });

    await viz.then(
      "a few seconds later the server is sent that review, and only it: not the older one it already has",
      async () => {
        const sentGrade = () =>
          page.server.posts.find((p) => p.events.some(([id]) => id === "d1::q-a"));
        await until(() => !!sentGrade(), 40_000, 100);
        expect(sentGrade()!.events.map(([id, , r]) => [id, r])).toEqual([["d1::q-a", GOOD]]);
      },
    );
  }, 70_000);

  it.concurrent("should pull the reviews another device made, once each, and say how many", async () => {
    const page = await viz.given(
      "this device has reviewed card 1, and another device has reviewed cards 1 and 2",
      async () => {
        const both: [string, number, 3][] = [
          ["d1::q-a", daysAgo(3), GOOD],
          ["d2::q-a", daysAgo(2), GOOD],
        ];
        const p = await open({ log: [both[0]!], remote: both });
        return p;
      },
    );

    await viz.when("the page syncs", async () => {
      await ready(page);
      await synced(page, /pulled/u);
    });

    await viz.then(
      "only the review it lacked is pulled, in the singular, and both cards now count as seen",
      async () => {
        expect(await text(page, "#sync")).toBe("synced — pulled 1 review from another device");
        expect(await status(page)).toMatch(/^5 cards · 2 seen/u);
        expect((await savedLog(page)).map(([id]) => id)).toEqual(["d1::q-a", "d2::q-a"]);
      },
    );
  });

  it.concurrent("should say reviews in the plural when it pulls more than one", async () => {
    const page = await viz.given(
      "another device that has reviewed two cards this one has not",
      async () => {
        const p = await open({
          remote: [
            ["d2::q-a", daysAgo(3), GOOD],
            ["d3::q-a", daysAgo(2), GOOD],
          ],
        });
        return p;
      },
    );

    await viz.when("the page syncs", async () => {
      await ready(page);
      await synced(page, /pulled/u);
    });

    await viz.then("it says two, and the status counts them", async () => {
      expect(await text(page, "#sync")).toBe("synced — pulled 2 reviews from another device");
      expect(await status(page)).toMatch(/^5 cards · 2 seen/u);
    });
  });

  it.concurrent("should keep working when the server is down, and say the reviews are saved here", async () => {
    const page = await viz.given("a sync server that is down", async () => {
      const p = await open({ down: true });
      return p;
    });

    await viz.when("the page loads", async () => {
      await ready(page);
      await synced(page, /offline/u);
    });

    await viz.then("it says so, with why", async () => {
      expect(await text(page, "#sync")).toBe(
        "offline — reviews are saved here and will sync later (HTTP 503)",
      );
    });

    await viz.when("the learner grades a card anyway", async () => {
      await answer(page, "Structured fields");
      await grade(page, "Good");
    });

    await viz.then("the review is saved on this device", async () => {
      expect((await savedLog(page)).map(([id, , r]) => [id, r])).toEqual([["d1::q-a", GOOD]]);
    });
  });

  it.concurrent("should make a code for a learner with none, and put it in the address so the page can be bookmarked", async () => {
    const page = await viz.given("a learner who opens the plain app link", async () => {
      const p = await open({ hash: "" });
      return p;
    });

    await viz.when("the page loads", async () => {
      await ready(page);
      await synced(page, "synced");
    });

    await viz.then(
      "a fresh 32-digit code was made and used, and the address carries it",
      async () => {
        const code = page.server.posts[0]!.code;
        expect(code).toMatch(/^[0-9a-f]{32}$/u);
        expect(await page.evaluate(() => location.hash)).toBe(`#s=${code}`);
      },
    );
  });

  it.concurrent("should not use a malformed code from the link, and make a fresh one instead", async () => {
    const page = await viz.given("a link whose code is not 32 hex digits", async () => {
      const p = await open({ hash: "s=not-a-code" });
      return p;
    });

    await viz.when("the page loads", async () => {
      await ready(page);
      await synced(page, "synced");
    });

    await viz.then("the server was sent a fresh code, not the malformed one", () => {
      expect(page.server.posts[0]!.code).toMatch(/^[0-9a-f]{32}$/u);
    });
  });

  it.concurrent("should put the fresh code in the address when the link's code was malformed", async () => {
    const page = await viz.given("a link whose code is not 32 hex digits", async () => {
      const p = await open({ hash: "s=not-a-code" });
      return p;
    });

    await viz.when("the page loads", async () => {
      await ready(page);
      await synced(page, "synced");
    });

    await viz.then(
      "the address carries the fresh code that was used, so a bookmark names the identity",
      async () => {
        const code = page.server.posts[0]!.code;
        expect(await page.evaluate(() => location.hash)).toBe(`#s=${code}`);
      },
    );
  });

  it.concurrent("should sync again when the browser comes back online or the tab is shown again", async () => {
    const { page, n } = await viz.given("a learner who has synced once", async () => {
      const p = await open();
      await ready(p);
      await synced(p, "synced");
      return { page: p, n: p.server.posts.length };
    });

    await viz.when("the browser comes back online", async () => {
      await page.evaluate(() => window.dispatchEvent(new Event("online")));
      await until(() => page.server.posts.length !== n);
    });

    await viz.then("it synced again", () => {
      expect(page.server.posts.length).toBe(n + 1);
    });

    await viz.when("the tab is shown again", async () => {
      await page.evaluate(() =>
        document.dispatchEvent(new Event("visibilitychange", { bubbles: true })),
      );
      await until(() => page.server.posts.length !== n + 1);
    });

    await viz.then("it synced once more", () => {
      expect(page.server.posts.length).toBe(n + 2);
    });
  });

  it.concurrent("should copy the learner's own link with their code, and the plain app link without it", async () => {
    const { page, code, app } = await viz.given("the page opened on a sync link", async () => {
      const c = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
      const p = await open({ code: c });
      await ready(p);
      const origin = await p.evaluate(() => location.origin + location.pathname);
      return { page: p, code: c, app: origin };
    });

    await viz.when("the learner copies their sync link", async () => {
      await page.click("#mylink");
      await synced(page, "copied — this link carries your history, so keep it to yourself");
    });

    await viz.then("the clipboard holds the app link with their code", async () => {
      expect(
        await page.evaluate(async () => {
          const held = await navigator.clipboard.readText();
          return held;
        }),
      ).toBe(`${app}#s=${code}`);
    });

    await viz.when("they copy the app link", async () => {
      await page.click("#applink");
      await synced(page, "copied the plain app link — no history attached");
    });

    await viz.then("the clipboard holds the link with no code", async () => {
      expect(
        await page.evaluate(async () => {
          const held = await navigator.clipboard.readText();
          return held;
        }),
      ).toBe(app);
    });
  });
});

describe("backing up progress", () => {
  it.concurrent("should export the review log as a file the learner can keep", async () => {
    const page = await viz.given("one card graded", async () => {
      const p = await open();
      await ready(p);
      await answer(p, "Structured fields");
      await grade(p, "Good");
      return p;
    });

    await viz.when("they export", async () => {
      await page.click("#export");
    });

    await viz.then("the file holds the deck's id and the log the browser saved", async () => {
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
  });

  it.concurrent("should merge an imported backup into the history, once, in time order", async () => {
    const { page, mine, theirs, backup } = await viz.given(
      "card 2 reviewed a day ago on this device, and a backup with that review and one for card 3 two days ago",
      async () => {
        const own: [string, number, 3] = ["d2::q-a", daysAgo(1), GOOD],
          other: [string, number, 3] = ["d3::q-a", daysAgo(2), GOOD];
        const p = await open({ log: [own] });
        await ready(p);
        const file = writeJson("recall-demo-progress.json", {
          v: 1,
          deckId: "demo",
          log: [own, other],
        });
        return { page: p, mine: own, theirs: other, backup: file };
      },
    );

    await viz.when("the learner imports the backup, twice", async () => {
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
    });

    await viz.then(
      "each review is in the history once, oldest first, and the status counts two cards seen",
      async () => {
        expect(await savedLog(page)).toEqual([theirs, mine]);
        expect(await status(page)).toMatch(/^5 cards · 2 seen/u);
      },
    );
  });
});
