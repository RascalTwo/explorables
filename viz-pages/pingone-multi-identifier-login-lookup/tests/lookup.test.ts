// The login lookup: what a person types into the username box, what query DaVinci would issue for it, and
// whether it resolves to the one account. The silent failures: a lookalike identifier that resolves (a prefix, a
// stranger's), an owned one that does not, a stale answer left on screen after the input changes.
import { describe, it, expect } from "bun:test";
import type { Page } from "puppeteer-core";

const GREEN = "rgb(63, 185, 80)",
  RED = "rgb(248, 81, 73)",
  GREY = "rgb(48, 54, 61)";

/** Run `step` on each item in turn: every step drives the one shared page, so they cannot overlap. */
async function inOrder<T>(items: readonly T[], step: (item: T) => Promise<void>) {
  for (const item of items) {
    // oxlint-disable-next-line no-await-in-loop -- steps share one page and must not overlap
    await step(item);
  }
}

/** Replace whatever is in the username box with what the user types. */
async function enter(page: Page, value: string) {
  await page.evaluate(() => {
    const el = document.querySelector<HTMLInputElement>("#typed")!;
    el.value = "";
    el.focus();
  });
  await page.evaluate(() =>
    document.querySelector<HTMLInputElement>("#typed")!.dispatchEvent(new Event("input")),
  );
  if (value) await page.type("#typed", value);
}
const text = async (page: Page, sel: string) => {
  const result = await page.$eval(sel, (e) =>
    (e.textContent ?? "").replaceAll(/\s+/gu, " ").trim(),
  );
  return result;
};
const verdict = async (page: Page) => ({
  text: await text(page, "#verdict"),
  kind: await page.$eval("#verdict", (e) => e.className.replace("verdict", "").trim()),
});
/** The outline colour of a row on the left of the diagram, as drawn. */
const rowOutline = async (page: Page, v: string) => {
  const result = await page.$eval(`g[data-v="${v}"] rect`, (r) => getComputedStyle(r).stroke);
  return result;
};
const outlines = async (page: Page) => {
  const result = await page.$$eval("g[data-v]", (gs) =>
    Object.fromEntries(
      gs.map((g) => [g.dataset["v"]!, getComputedStyle(g.querySelector("rect")!).stroke]),
    ),
  );
  return result;
};
const accountOutline = async (page: Page) => {
  const result = await page.$eval("#acctBox", (r) => getComputedStyle(r).stroke);
  return result;
};
const packet = async (page: Page) => {
  const result = await page.$eval("#pkt", (p) => ({
    x: Number(p.getAttribute("cx")),
    opacity: p.getAttribute("opacity"),
    fill: p.getAttribute("fill"),
  }));
  return result;
};

describe("resolving an identifier", () => {
  it.concurrent("should resolve each of the user's identifiers to the one account, naming how it matched", async () => {
    const page = await viz.given("the login screen", async () => await viz.open());

    await inOrder(
      [
        ["jdoe", "primary username"],
        ["j.doe@example.com", "alternateLoginIds[]"],
        ["doe123", "alternateLoginIds[]"],
        ["80055512", "alternateLoginIds[]"],
      ] as const,
      async ([id, how]) => {
        await viz.when("the user types one of their identifiers", async () => {
          await enter(page, id);
        });

        await viz.then(
          "it resolves to the one account, says whether it matched the primary username or an alternate, the query names what was typed against both attributes, and the account and that identifier's row (no other) are outlined green",
          async () => {
            expect(await verdict(page)).toEqual({
              text: `✓ Resolved → 1 account (jdoe). Matched on ${how}.`,
              kind: "match",
            });
            expect(await text(page, "#scim")).toBe(
              `GET /environments/{env}/users ?filter=username eq "${id}" or alternateLoginIds eq "${id}"`,
            );
            expect(await accountOutline(page)).toBe(GREEN);
            const o = await outlines(page);
            expect(
              Object.entries(o)
                .filter(([, c]) => c === GREEN)
                .map(([k]) => k),
            ).toEqual([id]);
          },
        );
      },
    );
  });

  it.concurrent("should reject an identifier that belongs to nobody, and mark it in red", async () => {
    const page = await viz.given("the login screen", async () => await viz.open());

    await viz.when("the user types the stranger's identifier", async () => {
      await enter(page, "hacker99");
    });

    await viz.then(
      "the login is rejected with no account found, its row is outlined red, and the account is not lit",
      async () => {
        expect(await verdict(page)).toEqual({
          text: "✗ No match — 0 results. Login rejected.",
          kind: "miss",
        });
        expect(await rowOutline(page, "hacker99")).toBe(RED);
        expect(await accountOutline(page)).toBe(GREY);
        expect(await rowOutline(page, "jdoe")).toBe(GREY);
      },
    );
  });

  it.concurrent("should reject a lookalike of an owned identifier, whether a prefix, a different case or a stray letter", async () => {
    const page = await viz.given("the login screen", async () => await viz.open());

    await inOrder(
      ["doe12", "doe1234", "Doe123", "j.doe@example.co", "8005551"],
      async (lookalike) => {
        await viz.when("the user types it", async () => {
          await enter(page, lookalike);
        });

        await viz.then("nothing resolves", async () => {
          expect(await verdict(page)).toEqual({
            text: "✗ No match — 0 results. Login rejected.",
            kind: "miss",
          });
          expect(await accountOutline(page)).toBe(GREY);
        });
      },
    );
  });

  it.concurrent("should ignore spaces around what was typed, and show the query without them", async () => {
    const page = await viz.given("the login screen", async () => await viz.open());

    await viz.when("the user types an owned identifier with spaces on both sides", async () => {
      await enter(page, "  doe123  ");
    });

    await viz.then("it still resolves, and the query holds the trimmed identifier", async () => {
      expect((await verdict(page)).kind).toBe("match");
      expect(await text(page, "#scim")).toContain('username eq "doe123" or');
    });
  });

  it.concurrent("should ask for an identifier when the box is empty, and show an empty query", async () => {
    const page = await viz.given("the login screen with an identifier typed", async () => {
      const p = await viz.open();
      expect((await verdict(p)).kind).toBe("match");
      return p;
    });

    await viz.when("the user clears the box", async () => {
      await enter(page, "");
    });

    await viz.then("it asks for one, nothing is lit, and the query is empty", async () => {
      expect(await verdict(page)).toEqual({ text: "Type or pick an identifier…", kind: "" });
      expect(await accountOutline(page)).toBe(GREY);
      expect(Object.values(await outlines(page)).filter((c) => c === GREEN)).toEqual([]);
      expect(await text(page, "#scim")).toContain('username eq "" or');
    });
  });

  it.concurrent("should show markup in what was typed as text, not run it", async () => {
    const page = await viz.given("the login screen", async () => await viz.open());

    await viz.when("the user types markup", async () => {
      await enter(page, "<img src=x>&amp;");
    });

    await viz.then("the query shows it literally, and nothing was added to the page", async () => {
      expect(await text(page, "#scim")).toContain('username eq "<img src=x>&amp;"');
      expect(await page.$$eval("#scim img", (i) => i.length)).toBe(0);
      expect((await verdict(page)).kind).toBe("miss");
      expect(page.errors).toEqual([]);
    });
  });

  it.concurrent("should fill the box and answer when a suggestion chip is clicked", async () => {
    const page = await viz.given("the login screen", async () => {
      const p = await viz.open();
      const chips = await p.$$eval("#chips .chip", (cs) => cs.map((c) => c.textContent));
      expect(chips).toEqual([
        "jdoe (primary)",
        "j.doe@example.com",
        "doe123",
        "80055512 (member #)",
        "hacker99 (nobody's)",
      ]);
      return p;
    });

    await viz.when("the user clicks the member-number chip", async () => {
      await page.click("#chips .chip:nth-child(4)");
    });

    await viz.then("the box holds the number, and it resolves", async () => {
      expect(
        await page.evaluate(() => document.querySelector<HTMLInputElement>("#typed")!.value),
      ).toBe("80055512");
      expect((await verdict(page)).kind).toBe("match");
    });

    await viz.when("they click the dashed chip", async () => {
      await page.click("#chips .chip.bad");
    });

    await viz.then("the box holds the stranger's identifier and it is rejected", async () => {
      expect(
        await page.evaluate(() => document.querySelector<HTMLInputElement>("#typed")!.value),
      ).toBe("hacker99");
      expect((await verdict(page)).kind).toBe("miss");
    });
  });
});

describe("the packet", () => {
  it.concurrent("should travel through the query to the account on a match, and stay there in green", async () => {
    const page = await viz.given("the login screen", async () => await viz.open());

    await viz.when("the user types an owned identifier", async () => {
      await enter(page, "jdoe");
    });

    await viz.then("the packet ends at the account, visible and green", async () => {
      await page.waitForFunction(
        () => document.querySelector("#pkt")!.getAttribute("cx") === "652",
        { timeout: 10_000 },
      );
      expect(await packet(page)).toEqual({ x: 652, opacity: "1", fill: "#3fb950" });
    });
  });

  it.concurrent("should stop at the query and disappear on a miss, in red", async () => {
    const page = await viz.given("the login screen", async () => await viz.open());

    await viz.when("the user types the stranger's identifier", async () => {
      await enter(page, "hacker99");
    });

    await viz.then("the packet reaches the query node, is red, and then vanishes", async () => {
      await page.waitForFunction(
        () =>
          document.querySelector("#pkt")!.getAttribute("cx") === "375" &&
          document.querySelector("#pkt")!.getAttribute("opacity") === "0",
        { timeout: 10_000 },
      );
      expect((await packet(page)).fill).toBe("#f85149");
    });
  });

  it.concurrent("should not send a packet for something that is not one of the listed identifiers", async () => {
    const page = await viz.given("the login screen", async () => await viz.open());

    await viz.when("the user types something with no row", async () => {
      await enter(page, "nobody");
    });

    await viz.then("no packet is shown", async () => {
      expect((await packet(page)).opacity).toBe("0");
    });
  });

  it.concurrent("should let the latest input win when the user types again mid-flight", async () => {
    const page = await viz.given("a packet on its way for a match", async () => {
      const p = await viz.open();
      await enter(p, "jdoe");
      await p.waitForFunction(
        () => document.querySelector("#pkt")!.getAttribute("opacity") === "1",
      );
      return p;
    });

    await viz.when("the user types the stranger's identifier before it lands", async () => {
      await enter(page, "hacker99");
    });

    await viz.then(
      "the old journey is abandoned: the packet ends hidden, red, and never reaches the account",
      async () => {
        await page.waitForFunction(
          () =>
            document.querySelector("#pkt")!.getAttribute("opacity") === "0" &&
            document.querySelector("#pkt")!.getAttribute("cx") === "375",
          { timeout: 10_000 },
        );
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 800);
        });
        expect(await packet(page)).toEqual({ x: 375, opacity: "0", fill: "#f85149" });
      },
    );
  });
});
