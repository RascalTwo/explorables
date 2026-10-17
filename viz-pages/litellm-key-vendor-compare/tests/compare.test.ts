// The Compare tab: two engines converge one key from the same spec, and the page shows what each did.
// The silent failures: a card that shows a stale or wrong value, a scenario that changes the wrong engine,
// and the contrast panel explaining a different scenario than the one that ran.
import { describe, it, expect } from "bun:test";
import { open, ready, card, text, scenario, idle, badges, deferred } from "./helpers.ts";

const ENGINES = [
  ["ansible", "#ans-"],
  ["terraform", "#tf-"],
] as const;

describe("opening the page", () => {
  it.concurrent("should show each preflight check as up or down, and an empty world as no key, no row, no state file", async () => {
    const page = await viz.given(
      "a gateway that is up and a SecretVault that is down, and no key minted anywhere",
      async () => {
        return await open();
      },
    );

    await viz.when("the page loads", async () => {
      await ready(page);
    });

    await viz.then("each check is a badge marked by its own state", async () => {
      expect(await badges(page)).toEqual([
        ["ok", "● LiteLLM gateway :4000"],
        ["bad", "○ SecretVault MySQL :3306"],
      ]);
      // both engines show the spec they will apply, and no key or vault row behind it
      await Promise.all(
        ENGINES.map(async ([, p]) => {
          expect(await card(page, `${p}spec`)).toEqual({
            version: "1",
            budget: "$5",
            blocked: "false",
            models: "[nemo-guarded]",
          });
          expect(await card(page, `${p}llm`)).toEqual({ status: "no key" });
          expect(await card(page, `${p}vault`)).toEqual({ status: "no row" });
        }),
      );
      // Terraform says it has no state file yet
      expect(await text(page, "#tfstate-box")).toContain("No terraform.tfstate yet");
      expect(page.errors).toEqual([]);
    });
  });

  it.concurrent("should say a store is unreachable rather than show it empty", async () => {
    const page = await viz.given(
      "a Terraform LiteLLM and SecretVault that cannot be reached, and a healthy Ansible side",
      async () => {
        return await open({
          world: (w) => {
            w.eng.terraform.unreachable = true;
          },
        });
      },
    );

    await viz.when("the page loads", async () => {
      await ready(page);
    });

    await viz.then(
      "Terraform's key and vault cards warn, and Ansible's say only that nothing is minted",
      async () => {
        expect(await card(page, "#tf-llm")).toEqual({ "⚠": "unreachable" });
        expect(await card(page, "#tf-vault")).toEqual({ "⚠": "unreachable" });
        expect(await card(page, "#ans-llm")).toEqual({ status: "no key" });
      },
    );
  });
});

describe("when the backend is partly down", () => {
  it.concurrent("should still draw both engines when the preflight cannot be read, just without badges", async () => {
    const page = await viz.given("a preflight that fails", async () => {
      return await open({
        world: (w) => {
          w.down = ["/preflight"];
        },
      });
    });

    await viz.when("the page loads", async () => {
      await ready(page);
    });

    await viz.then("there are no badges, and the engines are drawn all the same", async () => {
      expect(await badges(page)).toEqual([]);
      expect((await card(page, "#ans-spec"))["budget"]).toBe("$5");
    });
  });

  it.concurrent("should say the state file exists but holds no key secret, when it does not", async () => {
    const page = await viz.given("a Terraform key whose state file holds no secret", async () => {
      const p = await open({
        world: (w) => {
          w.tfNoSecret = true;
        },
      });
      await ready(p);
      return p;
    });

    await viz.when("Terraform creates the key", async () => {
      await scenario(page, "create");
    });

    await viz.then(
      "the state box says the file is there and clean, and is not the warning",
      async () => {
        expect(await text(page, "#tfstate-box")).toContain(
          "tfstate exists but holds no key secret right now.",
        );
        expect(await page.$eval("#tfstate-box", (e) => e.className)).toBe("statebox none");
      },
    );
  });

  it.concurrent("should ignore a click on the scenario bar that is not on a scenario", async () => {
    const page = await viz.given("the page loaded", async () => {
      const p = await open();
      await ready(p);
      return p;
    });

    await viz.when("the user clicks the bar itself, between the buttons", async () => {
      await page.$eval("#scenbar", (bar) =>
        bar.dispatchEvent(new MouseEvent("click", { bubbles: true })),
      );
    });

    await viz.then(
      "nothing runs: the buttons are free, no engine was called, the terminals are idle",
      async () => {
        await idle(page);
        expect(page.world.calls.filter((c) => /run-|mutate|reset/u.test(c))).toEqual([]);
        expect(await text(page, "#term-ans")).toBe("(idle)");
      },
    );
  });
});

describe("running a scenario", () => {
  it.concurrent("should mint one key per engine from a clean slate, stream what each did, and flag the secret in terraform's state file", async () => {
    const page = await viz.given("the page with nothing minted", async () => {
      const p = await open();
      await ready(p);
      return p;
    });

    await viz.when("the user creates from a clean slate", async () => {
      await scenario(page, "create");
    });

    await viz.then("each engine's terminal shows its own GENERATE", async () => {
      expect(await text(page, "#term-ans")).toBe("ansible: GENERATE");
      expect(await text(page, "#term-tf")).toBe("terraform: GENERATE");
    });

    await viz.then(
      "each engine has a LiteLLM key at the spec's version and budget, and a SecretVault row for it, and the two keys differ",
      async () => {
        const tokens = await Promise.all(
          ENGINES.map(async ([, p]) => {
            const llm = await card(page, `${p}llm`),
              vault = await card(page, `${p}vault`);
            expect(llm).toMatchObject({ version: "1", budget: "$5", blocked: "false" });
            expect(llm["token"]).toMatch(/^tok\d{9}…$/u);
            expect(vault["secret"]).toMatch(/^sk-m\d+a+… \(43 chars\)$/u);
            expect(vault["version"]).toBe("1");
            return llm["token"];
          }),
        );
        // the two engines minted different keys
        expect(new Set(tokens).size).toBe(2);
      },
    );

    await viz.then(
      "only Terraform's state file is flagged as holding the secret, and the contrast panel explains creation without a divergence",
      async () => {
        expect(await text(page, "#tfstate-box")).toMatch(
          /secret in terraform\.tfstate \(24619 bytes\)/u,
        );
        expect(await page.$eval("#tfstate-box", (e) => e.className)).toBe("statebox has");
        expect(await text(page, "#difftitle")).toBe("Create from a clean slate");
        expect(await text(page, "#diff-vs")).toBe("VS");
        expect(await page.$eval("#diff", (e) => e.classList.contains("diverge"))).toBe(false);
      },
    );
  });

  it.concurrent("should change nothing on a re-run, and say so", async () => {
    const { page, before } = await viz.given("both engines converged", async () => {
      const p = await open();
      await ready(p);
      await scenario(p, "create");
      return { page: p, before: [await card(p, "#ans-llm"), await card(p, "#tf-llm")] };
    });

    await viz.when("the user re-runs with no spec change", async () => {
      await scenario(page, "norun");
    });

    await viz.then(
      "both engines report a no-op, and the keys are exactly as they were",
      async () => {
        expect(await text(page, "#term-ans")).toBe("ansible: NO-OP");
        expect(await text(page, "#term-tf")).toBe("terraform: NO-OP");
        expect([await card(page, "#ans-llm"), await card(page, "#tf-llm")]).toEqual(before);
      },
    );
  });

  it.concurrent("should update the budget in place on both engines without changing the token", async () => {
    const { page, tokens } = await viz.given("both engines converged at $5", async () => {
      const p = await open();
      await ready(p);
      await scenario(p, "create");
      return {
        page: p,
        tokens: [(await card(p, "#ans-llm"))["token"], (await card(p, "#tf-llm"))["token"]],
      };
    });

    await viz.when("the user changes the budget", async () => {
      await scenario(page, "update");
    });

    await viz.then(
      "each engine updated in place: the spec and the live key both say $7, the token is the same",
      async () => {
        await Promise.all(
          ENGINES.map(async ([name, p], i) => {
            expect(await text(page, name === "ansible" ? "#term-ans" : "#term-tf")).toBe(
              `${name}: UPDATE`,
            );
            expect((await card(page, `${p}spec`))["budget"]).toBe("$7");
            const llm = await card(page, `${p}llm`);
            expect(llm["budget"]).toBe("$7");
            expect(llm["token"]).toBe(tokens[i]);
            expect(llm["version"]).toBe("1");
          }),
        );
      },
    );
  });

  it.concurrent("should rotate on a version bump: a new token and version 2 on both engines", async () => {
    const { page, tokens } = await viz.given("both engines converged at version 1", async () => {
      const p = await open();
      await ready(p);
      await scenario(p, "create");
      return {
        page: p,
        tokens: [(await card(p, "#ans-llm"))["token"], (await card(p, "#tf-llm"))["token"]],
      };
    });

    await viz.when("the user bumps key_version", async () => {
      await scenario(page, "rotate");
    });

    await viz.then(
      "each engine minted a new token at version 2, in the spec, the key and the vault row",
      async () => {
        await Promise.all(
          ENGINES.map(async ([, p], i) => {
            expect((await card(page, `${p}spec`))["version"]).toBe("2");
            const llm = await card(page, `${p}llm`);
            expect(llm["version"]).toBe("2");
            expect(llm["token"]).not.toBe(tokens[i]!);
            expect((await card(page, `${p}vault`))["version"]).toBe("2");
          }),
        );
        expect(await text(page, "#term-ans")).toBe("ansible: ROTATE");
      },
    );
  });

  it.concurrent("should soft-disable on Ansible but destroy on Terraform when the spec is removed, then restore the same token on Ansible only", async () => {
    const { page, ansToken, tfToken } = await viz.given("both engines converged", async () => {
      const p = await open();
      await ready(p);
      await scenario(p, "create");
      return {
        page: p,
        ansToken: (await card(p, "#ans-llm"))["token"],
        tfToken: (await card(p, "#tf-llm"))["token"],
      };
    });

    await viz.when("the user removes the spec", async () => {
      await scenario(page, "remove");
    });

    await viz.then("both specs read removed", async () => {
      expect(await card(page, "#ans-spec")).toEqual({ status: "removed" });
      expect(await card(page, "#tf-spec")).toEqual({ status: "removed" });
    });

    await viz.then(
      "Ansible kept the key, blocked; Terraform destroyed the key, its vault row and the secret in its state file",
      async () => {
        expect(await card(page, "#ans-llm")).toMatchObject({ token: ansToken!, blocked: "true" });
        expect(await card(page, "#tf-llm")).toEqual({ status: "no key" });
        expect(await card(page, "#tf-vault")).toEqual({ status: "no row" });
        expect(await text(page, "#tfstate-box")).toContain("No terraform.tfstate yet");
      },
    );

    await viz.then("the contrast panel marks it as a divergence", async () => {
      expect(await text(page, "#diff-vs")).toBe("≠");
      expect(await page.$eval("#diff", (e) => e.classList.contains("diverge"))).toBe(true);
    });

    await viz.when("the user restores the spec", async () => {
      await scenario(page, "restore");
    });

    await viz.then(
      "Ansible reactivates the same key, and Terraform mints a brand-new one",
      async () => {
        expect(await card(page, "#ans-llm")).toMatchObject({ token: ansToken!, blocked: "false" });
        const tfAfter = (await card(page, "#tf-llm"))["token"];
        expect(tfAfter).toMatch(/^tok\d{9}…$/u);
        expect(tfAfter).not.toBe(tfToken!);
      },
    );
  });

  it.concurrent("should soft-disable only Terraform, and tell Ansible it has no such step", async () => {
    const { page, ansBefore } = await viz.given("both engines converged", async () => {
      const p = await open();
      await ready(p);
      await scenario(p, "create");
      return { page: p, ansBefore: await card(p, "#ans-llm") };
    });

    await viz.when("the user soft-disables the Terraform way", async () => {
      await scenario(page, "block");
    });

    await viz.then("Terraform's key is kept and blocked", async () => {
      expect(await card(page, "#tf-llm")).toMatchObject({ blocked: "true", version: "1" });
      expect(await text(page, "#term-tf")).toBe("terraform: UPDATE");
    });

    await viz.then(
      "Ansible was not run: its terminal says why, and its key is untouched",
      async () => {
        expect(await text(page, "#term-ans")).toBe(
          "n/a — Ansible disables via the prune step (remove the spec).",
        );
        expect(await card(page, "#ans-llm")).toEqual(ansBefore);
      },
    );
  });

  it.concurrent("should show an out-of-band budget change on both live keys, and Terraform's plan wanting to revert it", async () => {
    const page = await viz.given("both engines converged at $5", async () => {
      const p = await open();
      await ready(p);
      await scenario(p, "create");
      return p;
    });

    await viz.when("someone changes the live key's budget behind the spec's back", async () => {
      await scenario(page, "drift");
    });

    await viz.then("both live keys read $999 while both specs still say $5", async () => {
      await Promise.all(
        ENGINES.map(async ([, p]) => {
          expect((await card(page, `${p}llm`))["budget"]).toBe("$999");
          expect((await card(page, `${p}spec`))["budget"]).toBe("$5");
        }),
      );
    });

    await viz.then(
      "Ansible says the next sync overwrites it; Terraform's plan says it wants to change it",
      async () => {
        expect(await text(page, "#term-ans")).toContain(
          "the reconciler re-reads live state every run — next sync just overwrites it.",
        );
        expect(await text(page, "#term-tf")).toContain(
          "Plan: 0 to add, 1 to change, 0 to destroy.",
        );
        expect(await text(page, "#term-tf")).toContain(
          "plan wants to revert the out-of-band change",
        );
      },
    );
  });

  it.concurrent("should hold every scenario button while the engines run, and free them when they finish", async () => {
    const page = await viz.given("engines that have not answered yet", async () => {
      const p = await open({
        world: (w) => {
          w.gate = deferred();
        },
      });
      await ready(p);
      return p;
    });

    await viz.when("the user starts a scenario", async () => {
      await page.click('#scenbar [data-s="create"]');
    });

    await viz.then(
      "every scenario button is disabled, and the engines have minted nothing yet",
      async () => {
        expect(await page.$$eval("#scenbar button", (bs) => bs.map((b) => b.disabled))).toEqual(
          Array.from({ length: 8 }, () => true),
        );
        expect(await card(page, "#ans-llm")).toEqual({ status: "no key" });
      },
    );

    await viz.when("the engines finish", async () => {
      page.world.gate!.release();
      await idle(page);
    });

    await viz.then("the buttons are free and the keys are there", async () => {
      expect((await card(page, "#ans-llm"))["token"]).toMatch(/^tok/u);
    });
  });

  it.concurrent("should report a stream error in the terminal and free the buttons when an engine fails", async () => {
    const page = await viz.given("engines that fail as soon as they are run", async () => {
      const p = await open({
        world: (w) => {
          w.streamsFail = true;
        },
      });
      await ready(p);
      return p;
    });

    await viz.when("the user runs a scenario", async () => {
      await scenario(page, "create");
    });

    await viz.then("each terminal says the stream failed, and no key was minted", async () => {
      expect(await text(page, "#term-ans")).toBe("[stream error]");
      expect(await text(page, "#term-tf")).toBe("[stream error]");
      expect(await card(page, "#ans-llm")).toEqual({ status: "no key" });
    });
  });

  it.concurrent("should flash only a value that changed, never one that stayed", async () => {
    const page = await viz.given("both engines converged at $5", async () => {
      const p = await open();
      await ready(p);
      await scenario(p, "create");
      return p;
    });

    await viz.when("the budget changes", async () => {
      await scenario(page, "update");
    });

    await viz.then(
      "something flashed, and everything that flashed is a budget: no version, token or secret did",
      async () => {
        const flashed = await page.$$eval(".val.flash", (els) =>
          els.map((e) => (e instanceof HTMLElement ? (e.dataset["f"] ?? "") : "")),
        );
        expect(flashed.length).toBeGreaterThan(0);
        expect(flashed.filter((f) => !f.endsWith("_b"))).toEqual([]);
      },
    );
  });

  it.concurrent("should flash the changed budget on both engines", async () => {
    const page = await viz.given("both engines converged at $5", async () => {
      const p = await open();
      await ready(p);
      await scenario(p, "create");
      return p;
    });

    await viz.when("the budget changes", async () => {
      await scenario(page, "update");
    });

    await viz.then(
      "the budget flashed for Ansible and for Terraform, not only for whichever engine finished last",
      async () => {
        const flashed = await page.$$eval(".val.flash", (els) =>
          els.map((e) => (e instanceof HTMLElement ? (e.dataset["f"] ?? "") : "")),
        );
        expect(flashed.filter((f) => f.startsWith("ans_")).length).toBeGreaterThan(0);
        expect(flashed.filter((f) => f.startsWith("tf_")).length).toBeGreaterThan(0);
      },
    );
  });
});
