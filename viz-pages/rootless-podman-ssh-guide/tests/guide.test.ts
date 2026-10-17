// The setup guide: two boxes (machine, username) personalise every command, and the guide remembers where the
// reader is (tab, flavour, steps done) in the URL. The silent failures: a command still naming the default
// machine somewhere, a placeholder left raw, and progress that counts steps the reader cannot see.
import { describe, it, expect } from "bun:test";
import type { Page } from "puppeteer-core";

/** Replace what is in a box with what the reader types. */
async function fill(page: Page, sel: string, value: string): Promise<void> {
  await page.$eval(sel, (e) => {
    if (e instanceof HTMLInputElement) {
      e.value = "";
      e.focus();
    }
  });
  if (value) await page.type(sel, value);
  else
    await page.evaluate((s) => document.querySelector(s)!.dispatchEvent(new Event("input")), sel);
}
/** The command of a step, as the reader would copy it. */
const command = async (page: Page, step: string) => {
  const t = await page.$eval(`[data-step="${step}"] pre`, (e) => e.textContent);
  return t;
};
const hash = async (page: Page) => {
  const h = await page.evaluate(() =>
    Object.fromEntries(new URLSearchParams(location.hash.slice(1))),
  );
  return h;
};
const progress = async (page: Page) => {
  const p = await page.evaluate(() => ({
    done: document.querySelector("#done-n")!.textContent,
    total: document.querySelector("#total-n")!.textContent,
    bar: document.querySelector<HTMLElement>("#bar")!.style.width,
  }));
  return p;
};
const activeTab = async (page: Page) => {
  const active = await page.$$eval(".tab.active", (ts) =>
    ts.map((t) => (t instanceof HTMLElement ? t.dataset["tab"] : undefined)),
  );
  return active;
};
const activePanels = async (page: Page) => {
  const active = await page.$$eval(".taskpanel.active", (ps) =>
    ps.map((p) => (p instanceof HTMLElement ? p.dataset["panel"] : undefined)),
  );
  return active;
};
/** Click a step's tick box, as a reader does (the step must be on screen: pick its tab and flavour first). */
const tick = async (page: Page, step: string): Promise<void> => {
  await page.click(`[data-step="${step}"] .check`);
};
const doneSteps = async (page: Page) => {
  const d = await page.$$eval(".step.done", (ss) =>
    ss.map((s) => (s instanceof HTMLElement ? s.dataset["step"] : undefined)),
  );
  return d;
};

describe("personalising the commands", () => {
  it.concurrent("should show the defaults until the reader types their own, and put them in every command that names them", async () => {
    const page = await viz.given("the guide, untouched", async () => {
      const p = await viz.open();
      return p;
    });

    const shown = await viz.when("the reader looks at the boxes and the commands", async () => {
      const machine = await page.$eval("#v-machine", (e) =>
        e instanceof HTMLInputElement ? e.value : "",
      );
      const user = await page.$eval("#v-user", (e) =>
        e instanceof HTMLInputElement ? e.value : "",
      );
      const copyId = await command(page, "t1s2");
      const ssh = await command(page, "t1s3");
      return { machine, user, copyId, ssh };
    });

    await viz.then("the boxes hold the defaults and the commands use them", () => {
      expect(shown.machine).toBe("dev-server");
      expect(shown.user).toBe("you");
      expect(shown.copyId).toBe("ssh-copy-id -i ~/.ssh/podman you@dev-server");
      expect(shown.ssh).toBe("ssh -i ~/.ssh/podman you@dev-server");
      expect(page.errors).toEqual([]);
    });
  });

  it.concurrent("should rewrite every command, in every tab, when the machine and username change", async () => {
    const page = await viz.given("the guide", async () => {
      const p = await viz.open();
      return p;
    });

    await viz.when("the reader types their machine and username", async () => {
      await fill(page, "#v-machine", "box.example.com");
      await fill(page, "#v-user", "ann");
    });

    await viz.then("commands in the first, third and fourth tabs use them", async () => {
      expect(await command(page, "t1s2")).toBe("ssh-copy-id -i ~/.ssh/podman ann@box.example.com");
      expect(await command(page, "t1s4")).toBe(
        "printf 'Host box.example.com\\n  IdentityFile %s/.ssh/podman\\n' \"$HOME\" >> ~/.ssh/config",
      );
      const podmanAdd = await page.$$eval("pre[data-tpl^='podman system connection add']", (ps) =>
        ps.map((p) => p.textContent),
      );
      expect(podmanAdd.length).toBe(1);
      expect(podmanAdd[0]).toContain("box.example.com");
      expect(podmanAdd[0]).toContain("ann@box.example.com");
    });

    await viz.then(
      "the browser addresses and inline mentions do too, and no placeholder is left raw anywhere",
      async () => {
        const addrs = await page.$$eval("[data-tpl-browser]", (els) =>
          els.map((e) => e.textContent),
        );
        expect(addrs).toContain("http://box.example.com:8123");
        expect(addrs).toContain("http://box.example.com:8200");
        expect(await page.evaluate(() => /\{\{\w+\}\}/u.test(document.body.textContent))).toBe(
          false,
        );
      },
    );

    await viz.then("none of the defaults survives in a command", async () => {
      expect(
        await page.$$eval(
          "pre[data-tpl]",
          (ps) => ps.filter((p) => /dev-server|you@/u.test(p.textContent)).length,
        ),
      ).toBe(0);
    });
  });

  it.concurrent("should fall back to the defaults when a box is emptied", async () => {
    const page = await viz.given("a reader who typed their own machine and username", async () => {
      const p = await viz.open();
      await fill(p, "#v-machine", "box");
      await fill(p, "#v-user", "ann");
      expect(await command(p, "t1s3")).toBe("ssh -i ~/.ssh/podman ann@box");
      return p;
    });

    await viz.when("they empty the machine", async () => {
      await fill(page, "#v-machine", "");
    });

    await viz.then(
      "the commands name the default machine again, and still their username",
      async () => {
        expect(await command(page, "t1s3")).toBe("ssh -i ~/.ssh/podman ann@dev-server");
      },
    );

    await viz.when("they empty the username too", async () => {
      await fill(page, "#v-user", "");
    });

    await viz.then("both defaults are back", async () => {
      expect(await command(page, "t1s3")).toBe("ssh -i ~/.ssh/podman you@dev-server");
    });
  });

  it.concurrent("should highlight the machine and username inside a command, even when they contain characters a pattern would read as syntax", async () => {
    const page = await viz.given("the guide", async () => {
      const p = await viz.open();
      return p;
    });

    await viz.when(
      "the reader types a machine and a username full of regular-expression characters",
      async () => {
        await fill(page, "#v-machine", "a.b(c)+");
        await fill(page, "#v-user", "u*[x]");
      },
    );

    await viz.then(
      "the command is exact, with exactly the two names highlighted, and the page did not break",
      async () => {
        expect(await command(page, "t1s2")).toBe("ssh-copy-id -i ~/.ssh/podman u*[x]@a.b(c)+");
        expect(
          await page.$$eval("[data-step='t1s2'] pre .tok", (ts) => ts.map((t) => t.textContent)),
        ).toEqual(["u*[x]", "a.b(c)+"]);
        expect(page.errors).toEqual([]);
      },
    );
  });

  it.concurrent("should keep the reader's names in the address, so the link carries them", async () => {
    const page = await viz.given("the guide", async () => {
      const p = await viz.open();
      return p;
    });

    await viz.when("the reader types their names", async () => {
      await fill(page, "#v-machine", "box");
      await fill(page, "#v-user", "ann");
    });

    await viz.then("the address holds them, with the tab and flavour they are on", async () => {
      expect(await hash(page)).toEqual({ m: "box", u: "ann", t: "1", f: "a" });
    });
  });
});

describe("opening a shared link", () => {
  it.concurrent("should restore the names, the tab, the flavour and the steps done from the link", async () => {
    const page = await viz.given(
      "a link with names, the Podman tab, and the SQL Server flavour",
      async () => {
        const p = await viz.open("m=box&u=ann&t=3&f=b&done=t1s1,t3s1,t4b1");
        return p;
      },
    );

    await viz.when("the guide opens from the link", async () => {
      await page.waitForSelector("#v-machine");
    });

    await viz.then("the boxes and the commands have the names", async () => {
      expect(
        await page.$eval("#v-machine", (e) => (e instanceof HTMLInputElement ? e.value : "")),
      ).toBe("box");
      expect(await command(page, "t1s2")).toBe("ssh-copy-id -i ~/.ssh/podman ann@box");
    });

    await viz.then("the third tab is the one showing, and it alone", async () => {
      expect(await activeTab(page)).toEqual(["3"]);
      expect(await activePanels(page)).toEqual(["3"]);
    });

    await viz.then("the flavour is SQL Server", async () => {
      expect(
        await page.$$eval(".flavor-btn.active", (bs) =>
          bs.map((b) => (b instanceof HTMLElement ? b.dataset["flavor"] : undefined)),
        ),
      ).toEqual(["b"]);
      expect(
        await page.$$eval(".flavor.active", (ps) =>
          ps.map((p) => (p instanceof HTMLElement ? p.dataset["flavor"] : undefined)),
        ),
      ).toEqual(["b"]);
    });

    await viz.then("the steps in the link are ticked", async () => {
      expect(await doneSteps(page)).toEqual(["t1s1", "t3s1", "t4b1"]);
    });
  });
});

describe("working through the guide", () => {
  it.concurrent("should switch tabs, showing one task at a time and remembering it in the address", async () => {
    const page = await viz.given("the guide on its first task", async () => {
      const p = await viz.open();
      expect(await activePanels(p)).toEqual(["1"]);
      return p;
    });

    await viz.when("the reader picks the Compose tab", async () => {
      await page.click('.tab[data-tab="4"]');
    });

    await viz.then("only that task shows, and the address says so", async () => {
      expect(await activeTab(page)).toEqual(["4"]);
      expect(await activePanels(page)).toEqual(["4"]);
      expect((await hash(page))["t"]).toBe("4");
    });
  });

  it.concurrent("should count ticked steps out of the visible flavour's steps, and mark a tab complete when all its steps are ticked", async () => {
    const page = await viz.given(
      "the guide, nothing ticked: 16 steps in the first three tabs plus 6 in the chosen Compose flavour",
      async () => {
        const p = await viz.open();
        expect(await progress(p)).toEqual({ done: "0", total: "22", bar: "0%" });
        return p;
      },
    );

    await viz.when("the reader ticks the first step", async () => {
      await tick(page, "t1s1");
    });

    await viz.then(
      "progress says 1 of 22, the bar has moved that far, and the step is marked",
      async () => {
        const p = await progress(page);
        expect(p.done).toBe("1");
        expect(Number(p.bar.slice(0, -1))).toBeCloseTo(100 / 22, 3);
        expect(await doneSteps(page)).toEqual(["t1s1"]);
      },
    );

    await viz.then("the tab is not complete yet", async () => {
      expect(await page.$$eval(".tab.complete", (ts) => ts.length)).toBe(0);
    });

    await viz.when("they tick the other four", async () => {
      // oxlint-disable-next-line no-await-in-loop -- the ticks must land one after another
      for (const s of ["t1s2", "t1s3", "t1s4", "t1s5"]) await tick(page, s);
    });

    await viz.then("the first tab is complete, and only it", async () => {
      expect(
        await page.$$eval(".tab.complete", (ts) =>
          ts.map((t) => (t instanceof HTMLElement ? t.dataset["tab"] : undefined)),
        ),
      ).toEqual(["1"]);
      expect((await progress(page)).done).toBe("5");
    });

    await viz.when("they untick one", async () => {
      await tick(page, "t1s3");
    });

    await viz.then("the tab is no longer complete and the count drops", async () => {
      expect(await page.$$eval(".tab.complete", (ts) => ts.length)).toBe(0);
      expect((await progress(page)).done).toBe("4");
      expect((await hash(page))["done"]).toBe("t1s1,t1s2,t1s4,t1s5");
    });
  });

  it.concurrent("should count a step of the other Compose flavour only when that flavour is chosen", async () => {
    const page = await viz.given(
      "a link with a step of the SQL Server flavour ticked, while the Postgres flavour is chosen",
      async () => {
        const p = await viz.open("t=4&f=a&done=t4b1,t4s1");
        // only the step the reader can see counts
        expect((await progress(p)).done).toBe("1");
        return p;
      },
    );

    await viz.when("they choose the SQL Server flavour", async () => {
      await page.click('.flavor-btn[data-flavor="b"]');
    });

    await viz.then(
      "the count is that flavour's step, and the address remembers the flavour",
      async () => {
        expect((await progress(page)).done).toBe("1");
        expect((await hash(page))["f"]).toBe("b");
        expect(await doneSteps(page)).toEqual(["t4s1", "t4b1"]);
      },
    );

    await viz.when("they tick every step of that flavour", async () => {
      // oxlint-disable-next-line no-await-in-loop -- the ticks must land one after another
      for (const s of ["t4b2", "t4b3", "t4b4", "t4b5", "t4b6"]) await tick(page, s);
    });

    await viz.then(
      "the Compose tab is complete, though the Postgres steps were never done",
      async () => {
        expect(
          await page.$$eval(".tab.complete", (ts) =>
            ts.map((t) => (t instanceof HTMLElement ? t.dataset["tab"] : undefined)),
          ),
        ).toEqual(["4"]);
      },
    );
  });
});

describe("copying a command", () => {
  it.concurrent("should copy the personalised command to the clipboard and say so", async () => {
    const page = await viz.given(
      "the guide with the reader's names, in a browser whose clipboard is an in-memory one (a headless browser has no system clipboard to grant)",
      async () => {
        const p = await viz.open();
        await p.evaluate(() => {
          let held = "";
          Object.defineProperty(navigator, "clipboard", {
            value: {
              writeText: async (t: string) => {
                await Promise.resolve();
                held = t;
              },
              readText: async () => {
                await Promise.resolve();
                return held;
              },
            },
          });
        });
        await fill(p, "#v-machine", "box");
        return p;
      },
    );

    await viz.when("the reader copies the second command", async () => {
      await page.click('[data-step="t1s2"] .copy');
      await page.waitForFunction(
        () => document.querySelector('[data-step="t1s2"] .copy')!.textContent === "Copied ✓",
      );
    });

    await viz.then(
      "the clipboard holds the command with their machine, and the confirmation shows",
      async () => {
        expect(
          await page.evaluate(async () => {
            const t = await navigator.clipboard.readText();
            return t;
          }),
        ).toBe("ssh-copy-id -i ~/.ssh/podman you@box");
        expect(await page.$eval("#toast", (t) => t.classList.contains("show"))).toBe(true);
      },
    );
  });
});
