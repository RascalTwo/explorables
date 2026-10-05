// The login lookup: what a person types into the username box, what query DaVinci would issue for it, and
// whether it resolves to the one account. The silent failures: a lookalike identifier that resolves (a prefix, a
// stranger's), an owned one that does not, a stale answer left on screen after the input changes.
import { describe, it, expect } from "bun:test";
import type { Page } from "puppeteer-core";

declare global {
  var viz: {
    open(
      hash?: string | object,
      o?: { width?: number; height?: number; before?: (p: Page) => unknown },
    ): Promise<Page & { errors: string[] }>;
  };
}

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
    // GIVEN the login screen
    const page = await viz.open();

    await inOrder(
      [
        ["jdoe", "primary username"],
        ["j.doe@example.com", "alternateLoginIds[]"],
        ["doe123", "alternateLoginIds[]"],
        ["80055512", "alternateLoginIds[]"],
      ] as const,
      async ([id, how]) => {
        // WHEN the user types one of their identifiers
        await enter(page, id);

        // THEN it resolves to the one account, and says whether it matched the primary username or an alternate
        expect(await verdict(page)).toEqual({
          text: `✓ Resolved → 1 account (jdoe). Matched on ${how}.`,
          kind: "match",
        });
        // THEN the query names what was typed, against both attributes
        expect(await text(page, "#scim")).toBe(
          `GET /environments/{env}/users ?filter=username eq "${id}" or alternateLoginIds eq "${id}"`,
        );
        // THEN the account is outlined green, and so is that identifier's row, and no other row is
        expect(await accountOutline(page)).toBe(GREEN);
        const o = await outlines(page);
        expect(
          Object.entries(o)
            .filter(([, c]) => c === GREEN)
            .map(([k]) => k),
        ).toEqual([id]);
      },
    );
  });

  it.concurrent("should reject an identifier that belongs to nobody, and mark it in red", async () => {
    // GIVEN the login screen
    const page = await viz.open();

    // WHEN the user types the stranger's identifier
    await enter(page, "hacker99");

    // THEN the login is rejected with no account found
    expect(await verdict(page)).toEqual({
      text: "✗ No match — 0 results. Login rejected.",
      kind: "miss",
    });
    // THEN its row is outlined red, and the account is not lit
    expect(await rowOutline(page, "hacker99")).toBe(RED);
    expect(await accountOutline(page)).toBe(GREY);
    expect(await rowOutline(page, "jdoe")).toBe(GREY);
  });

  it.concurrent("should reject a lookalike of an owned identifier, whether a prefix, a different case or a stray letter", async () => {
    // GIVEN the login screen
    const page = await viz.open();

    await inOrder(
      ["doe12", "doe1234", "Doe123", "j.doe@example.co", "8005551"],
      async (lookalike) => {
        // WHEN the user types it
        await enter(page, lookalike);

        // THEN nothing resolves
        expect(await verdict(page)).toEqual({
          text: "✗ No match — 0 results. Login rejected.",
          kind: "miss",
        });
        expect(await accountOutline(page)).toBe(GREY);
      },
    );
  });

  it.concurrent("should ignore spaces around what was typed, and show the query without them", async () => {
    // GIVEN the login screen
    const page = await viz.open();

    // WHEN the user types an owned identifier with spaces on both sides
    await enter(page, "  doe123  ");

    // THEN it still resolves, and the query holds the trimmed identifier
    expect((await verdict(page)).kind).toBe("match");
    expect(await text(page, "#scim")).toContain('username eq "doe123" or');
  });

  it.concurrent("should ask for an identifier when the box is empty, and show an empty query", async () => {
    // GIVEN the login screen with an identifier typed
    const page = await viz.open();
    expect((await verdict(page)).kind).toBe("match");

    // WHEN the user clears the box
    await enter(page, "");

    // THEN it asks for one, nothing is lit, and the query is empty
    expect(await verdict(page)).toEqual({ text: "Type or pick an identifier…", kind: "" });
    expect(await accountOutline(page)).toBe(GREY);
    expect(Object.values(await outlines(page)).filter((c) => c === GREEN)).toEqual([]);
    expect(await text(page, "#scim")).toContain('username eq "" or');
  });

  it.concurrent("should show markup in what was typed as text, not run it", async () => {
    // GIVEN the login screen
    const page = await viz.open();

    // WHEN the user types markup
    await enter(page, "<img src=x>&amp;");

    // THEN the query shows it literally, and nothing was added to the page
    expect(await text(page, "#scim")).toContain('username eq "<img src=x>&amp;"');
    expect(await page.$$eval("#scim img", (i) => i.length)).toBe(0);
    expect((await verdict(page)).kind).toBe("miss");
    expect(page.errors).toEqual([]);
  });

  it.concurrent("should fill the box and answer when a suggestion chip is clicked", async () => {
    // GIVEN the login screen
    const page = await viz.open();
    const chips = await page.$$eval("#chips .chip", (cs) => cs.map((c) => c.textContent));
    expect(chips).toEqual([
      "jdoe (primary)",
      "j.doe@example.com",
      "doe123",
      "80055512 (member #)",
      "hacker99 (nobody's)",
    ]);

    // WHEN the user clicks the member-number chip
    await page.click("#chips .chip:nth-child(4)");

    // THEN the box holds the number, and it resolves
    expect(
      await page.evaluate(() => document.querySelector<HTMLInputElement>("#typed")!.value),
    ).toBe("80055512");
    expect((await verdict(page)).kind).toBe("match");

    // WHEN they click the dashed chip
    await page.click("#chips .chip.bad");

    // THEN the box holds the stranger's identifier and it is rejected
    expect(
      await page.evaluate(() => document.querySelector<HTMLInputElement>("#typed")!.value),
    ).toBe("hacker99");
    expect((await verdict(page)).kind).toBe("miss");
  });
});

describe("the packet", () => {
  it.concurrent("should travel through the query to the account on a match, and stay there in green", async () => {
    // GIVEN the login screen
    const page = await viz.open();

    // WHEN the user types an owned identifier
    await enter(page, "jdoe");

    // THEN the packet ends at the account, visible and green
    await page.waitForFunction(() => document.querySelector("#pkt")!.getAttribute("cx") === "652", {
      timeout: 10_000,
    });
    expect(await packet(page)).toEqual({ x: 652, opacity: "1", fill: "#3fb950" });
  });

  it.concurrent("should stop at the query and disappear on a miss, in red", async () => {
    // GIVEN the login screen
    const page = await viz.open();

    // WHEN the user types the stranger's identifier
    await enter(page, "hacker99");

    // THEN the packet reaches the query node, is red, and then vanishes
    await page.waitForFunction(
      () =>
        document.querySelector("#pkt")!.getAttribute("cx") === "375" &&
        document.querySelector("#pkt")!.getAttribute("opacity") === "0",
      { timeout: 10_000 },
    );
    expect((await packet(page)).fill).toBe("#f85149");
  });

  it.concurrent("should not send a packet for something that is not one of the listed identifiers", async () => {
    // GIVEN the login screen
    const page = await viz.open();

    // WHEN the user types something with no row
    await enter(page, "nobody");

    // THEN no packet is shown
    expect((await packet(page)).opacity).toBe("0");
  });

  it.concurrent("should let the latest input win when the user types again mid-flight", async () => {
    // GIVEN a packet on its way for a match
    const page = await viz.open();
    await enter(page, "jdoe");
    await page.waitForFunction(
      () => document.querySelector("#pkt")!.getAttribute("opacity") === "1",
    );

    // WHEN the user types the stranger's identifier before it lands
    await enter(page, "hacker99");

    // THEN the old journey is abandoned: the packet ends hidden, red, and never reaches the account
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
  });
});
