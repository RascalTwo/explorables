// The setup guide: two boxes (machine, username) personalise every command, and the guide remembers where the
// reader is (tab, flavour, steps done) in the URL. The silent failures: a command still naming the default
// machine somewhere, a placeholder left raw, and progress that counts steps the reader cannot see.
import { describe, it, expect } from "bun:test";
import type { Page } from "puppeteer-core";

declare global {
  // eslint-disable-next-line no-var
  var viz: { open(hash?: string | object, o?: { width?: number; height?: number; before?: (p: Page) => unknown }): Promise<Page & { errors: string[] }> };
}

/** Replace what is in a box with what the reader types. */
async function fill(page: Page, sel: string, value: string) {
  await page.$eval(sel, (e) => { (e as HTMLInputElement).value = ""; (e as HTMLInputElement).focus(); });
  if (value) await page.type(sel, value);
  else await page.evaluate((s) => document.querySelector(s)!.dispatchEvent(new Event("input")), sel);
}
/** The command of a step, as the reader would copy it. */
const command = (page: Page, step: string) => page.$eval(`[data-step="${step}"] pre`, (e) => e.textContent!);
const hash = (page: Page) => page.evaluate(() => Object.fromEntries(new URLSearchParams(location.hash.slice(1))));
const progress = (page: Page) => page.evaluate(() => ({ done: document.querySelector("#done-n")!.textContent, total: document.querySelector("#total-n")!.textContent, bar: (document.querySelector("#bar") as HTMLElement).style.width }));
const activeTab = (page: Page) => page.$$eval(".tab.active", (ts) => ts.map((t) => (t as HTMLElement).dataset["tab"]));
const activePanels = (page: Page) => page.$$eval(".taskpanel.active", (ps) => ps.map((p) => (p as HTMLElement).dataset["panel"]));
/** Click a step's tick box, as a reader does (the step must be on screen: pick its tab and flavour first). */
const tick = (page: Page, step: string) => page.click(`[data-step="${step}"] .check`);
const doneSteps = (page: Page) => page.$$eval(".step.done", (ss) => ss.map((s) => (s as HTMLElement).dataset["step"]));

describe("personalising the commands", () => {
  it.concurrent("should show the defaults until the reader types their own, and put them in every command that names them", async () => {
    // GIVEN the guide, untouched
    const page = await viz.open();

    // THEN the boxes hold the defaults and the commands use them
    expect(await page.$eval("#v-machine", (e) => (e as HTMLInputElement).value)).toBe("dev-server");
    expect(await page.$eval("#v-user", (e) => (e as HTMLInputElement).value)).toBe("you");
    expect(await command(page, "t1s2")).toBe("ssh-copy-id -i ~/.ssh/podman you@dev-server");
    expect(await command(page, "t1s3")).toBe("ssh -i ~/.ssh/podman you@dev-server");
    expect(page.errors).toEqual([]);
  });

  it.concurrent("should rewrite every command, in every tab, when the machine and username change", async () => {
    // GIVEN the guide
    const page = await viz.open();

    // WHEN the reader types their machine and username
    await fill(page, "#v-machine", "box.example.com");
    await fill(page, "#v-user", "ann");

    // THEN commands in the first, third and fourth tabs use them, ...
    expect(await command(page, "t1s2")).toBe("ssh-copy-id -i ~/.ssh/podman ann@box.example.com");
    expect(await command(page, "t1s4")).toBe("printf 'Host box.example.com\\n  IdentityFile %s/.ssh/podman\\n' \"$HOME\" >> ~/.ssh/config");
    const podmanAdd = await page.$$eval("pre[data-tpl^='podman system connection add']", (ps) => ps.map((p) => p.textContent!));
    expect(podmanAdd.length).toBe(1);
    expect(podmanAdd[0]).toContain("box.example.com");
    expect(podmanAdd[0]).toContain("ann@box.example.com");
    // THEN the browser addresses and inline mentions do too, and no placeholder is left raw anywhere
    expect(await page.$$eval("[data-tpl-browser]", (els) => els.map((e) => e.textContent))).toEqual(expect.arrayContaining(["http://box.example.com:8123", "http://box.example.com:8200"]));
    expect(await page.evaluate(() => /\{\{\w+\}\}/.test(document.body.textContent!))).toBe(false);
    // THEN none of the defaults survives in a command
    expect(await page.$$eval("pre[data-tpl]", (ps) => ps.filter((p) => /dev-server|you@/.test(p.textContent!)).length)).toBe(0);
  });

  it.concurrent("should fall back to the defaults when a box is emptied", async () => {
    // GIVEN a reader who typed their own machine and username
    const page = await viz.open();
    await fill(page, "#v-machine", "box");
    await fill(page, "#v-user", "ann");
    expect(await command(page, "t1s3")).toBe("ssh -i ~/.ssh/podman ann@box");

    // WHEN they empty the machine
    await fill(page, "#v-machine", "");

    // THEN the commands name the default machine again, and still their username
    expect(await command(page, "t1s3")).toBe("ssh -i ~/.ssh/podman ann@dev-server");

    // WHEN they empty the username too
    await fill(page, "#v-user", "");

    // THEN both defaults are back
    expect(await command(page, "t1s3")).toBe("ssh -i ~/.ssh/podman you@dev-server");
  });

  it.concurrent("should highlight the machine and username inside a command, even when they contain characters a pattern would read as syntax", async () => {
    // GIVEN the guide
    const page = await viz.open();

    // WHEN the reader types a machine and a username full of regular-expression characters
    await fill(page, "#v-machine", "a.b(c)+");
    await fill(page, "#v-user", "u*[x]");

    // THEN the command is exact, with exactly the two names highlighted, and the page did not break
    expect(await command(page, "t1s2")).toBe("ssh-copy-id -i ~/.ssh/podman u*[x]@a.b(c)+");
    expect(await page.$$eval("[data-step='t1s2'] pre .tok", (ts) => ts.map((t) => t.textContent))).toEqual(["u*[x]", "a.b(c)+"]);
    expect(page.errors).toEqual([]);
  });

  it.concurrent("should keep the reader's names in the address, so the link carries them", async () => {
    // GIVEN the guide
    const page = await viz.open();

    // WHEN the reader types their names
    await fill(page, "#v-machine", "box");
    await fill(page, "#v-user", "ann");

    // THEN the address holds them, with the tab and flavour they are on
    expect(await hash(page)).toEqual({ m: "box", u: "ann", t: "1", f: "a" });
  });
});

describe("opening a shared link", () => {
  it.concurrent("should restore the names, the tab, the flavour and the steps done from the link", async () => {
    // GIVEN a link with names, the Podman tab, and the SQL Server flavour
    const page = await viz.open("m=box&u=ann&t=3&f=b&done=t1s1,t3s1,t4b1");

    // THEN the boxes and the commands have the names
    expect(await page.$eval("#v-machine", (e) => (e as HTMLInputElement).value)).toBe("box");
    expect(await command(page, "t1s2")).toBe("ssh-copy-id -i ~/.ssh/podman ann@box");
    // THEN the third tab is the one showing, and it alone
    expect(await activeTab(page)).toEqual(["3"]);
    expect(await activePanels(page)).toEqual(["3"]);
    // THEN the flavour is SQL Server
    expect(await page.$$eval(".flavor-btn.active", (bs) => bs.map((b) => (b as HTMLElement).dataset["flavor"]))).toEqual(["b"]);
    expect(await page.$$eval(".flavor.active", (ps) => ps.map((p) => (p as HTMLElement).dataset["flavor"]))).toEqual(["b"]);
    // THEN the steps in the link are ticked
    expect(await doneSteps(page)).toEqual(["t1s1", "t3s1", "t4b1"]);
  });
});

describe("working through the guide", () => {
  it.concurrent("should switch tabs, showing one task at a time and remembering it in the address", async () => {
    // GIVEN the guide on its first task
    const page = await viz.open();
    expect(await activePanels(page)).toEqual(["1"]);

    // WHEN the reader picks the Compose tab
    await page.click('.tab[data-tab="4"]');

    // THEN only that task shows, and the address says so
    expect(await activeTab(page)).toEqual(["4"]);
    expect(await activePanels(page)).toEqual(["4"]);
    expect((await hash(page))["t"]).toBe("4");
  });

  it.concurrent("should count ticked steps out of the visible flavour's steps, and mark a tab complete when all its steps are ticked", async () => {
    // GIVEN the guide, nothing ticked: 16 steps in the first three tabs plus 6 in the chosen Compose flavour
    const page = await viz.open();
    expect(await progress(page)).toEqual({ done: "0", total: "22", bar: "0%" });

    // WHEN the reader ticks the first step
    await tick(page, "t1s1");

    // THEN progress says 1 of 22, the bar has moved that far, and the step is marked
    const p = await progress(page);
    expect(p.done).toBe("1");
    expect(parseFloat(p.bar)).toBeCloseTo(100 / 22, 3);
    expect(await doneSteps(page)).toEqual(["t1s1"]);
    // THEN the tab is not complete yet
    expect(await page.$$eval(".tab.complete", (ts) => ts.length)).toBe(0);

    // WHEN they tick the other four
    for (const s of ["t1s2", "t1s3", "t1s4", "t1s5"]) await tick(page, s);

    // THEN the first tab is complete, and only it
    expect(await page.$$eval(".tab.complete", (ts) => ts.map((t) => (t as HTMLElement).dataset["tab"]))).toEqual(["1"]);
    expect((await progress(page)).done).toBe("5");

    // WHEN they untick one
    await tick(page, "t1s3");

    // THEN the tab is no longer complete and the count drops
    expect(await page.$$eval(".tab.complete", (ts) => ts.length)).toBe(0);
    expect((await progress(page)).done).toBe("4");
    expect((await hash(page))["done"]).toBe("t1s1,t1s2,t1s4,t1s5");
  });

  it.concurrent("should count a step of the other Compose flavour only when that flavour is chosen", async () => {
    // GIVEN a link with a step of the SQL Server flavour ticked, while the Postgres flavour is chosen
    const page = await viz.open("t=4&f=a&done=t4b1,t4s1");

    // THEN only the step the reader can see counts
    expect((await progress(page)).done).toBe("1");

    // WHEN they choose the SQL Server flavour
    await page.click('.flavor-btn[data-flavor="b"]');

    // THEN the count is that flavour's step, and the address remembers the flavour
    expect((await progress(page)).done).toBe("1");
    expect((await hash(page))["f"]).toBe("b");
    expect(await doneSteps(page)).toEqual(["t4s1", "t4b1"]);

    // WHEN they tick every step of that flavour
    for (const s of ["t4b2", "t4b3", "t4b4", "t4b5", "t4b6"]) await tick(page, s);

    // THEN the Compose tab is complete, though the Postgres steps were never done
    expect(await page.$$eval(".tab.complete", (ts) => ts.map((t) => (t as HTMLElement).dataset["tab"]))).toEqual(["4"]);
  });
});

describe("copying a command", () => {
  it.concurrent("should copy the personalised command to the clipboard and say so", async () => {
    // GIVEN the guide with the reader's names, in a browser whose clipboard is an in-memory one (a headless browser has no system clipboard to grant)
    const page = await viz.open();
    await page.evaluate(() => {
      let held = "";
      Object.defineProperty(navigator, "clipboard", { value: { writeText: async (t: string) => { held = t; }, readText: async () => held } });
    });
    await fill(page, "#v-machine", "box");

    // WHEN the reader copies the second command
    await page.click('[data-step="t1s2"] .copy');
    await page.waitForFunction(() => document.querySelector('[data-step="t1s2"] .copy')!.textContent === "Copied ✓");

    // THEN the clipboard holds the command with their machine, and the confirmation shows
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("ssh-copy-id -i ~/.ssh/podman you@box");
    expect(await page.$eval("#toast", (t) => t.classList.contains("show"))).toBe(true);
  });
});
