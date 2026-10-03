// The Compare tab: two engines converge one key from the same spec, and the page shows what each did.
// The silent failures: a card that shows a stale or wrong value, a scenario that changes the wrong engine,
// and the contrast panel explaining a different scenario than the one that ran.
import { describe, it, expect } from "bun:test";
import { open, ready, card, text, scenario, idle, badges, deferred } from "./helpers.ts";

const ENGINES = [["ansible", "#ans-"], ["terraform", "#tf-"]] as const;

describe("opening the page", () => {
  it.concurrent("should show each preflight check as up or down, and an empty world as no key, no row, no state file", async () => {
    // GIVEN a gateway that is up and a SecretVault that is down, and no key minted anywhere
    const page = await open();

    // WHEN the page loads
    await ready(page);

    // THEN each check is a badge marked by its own state
    expect(await badges(page)).toEqual([["ok", "● LiteLLM gateway :4000"], ["bad", "○ SecretVault MySQL :3306"]]);
    // THEN both engines show the spec they will apply, and no key or vault row behind it
    for (const [, p] of ENGINES) {
      expect(await card(page, `${p}spec`)).toEqual({ version: "1", budget: "$5", blocked: "false", models: "[nemo-guarded]" });
      expect(await card(page, `${p}llm`)).toEqual({ status: "no key" });
      expect(await card(page, `${p}vault`)).toEqual({ status: "no row" });
    }
    // THEN Terraform says it has no state file yet
    expect(await text(page, "#tfstate-box")).toContain("No terraform.tfstate yet");
    expect(page.errors).toEqual([]);
  });

  it.concurrent("should say a store is unreachable rather than show it empty", async () => {
    // GIVEN a Terraform LiteLLM and SecretVault that cannot be reached, and a healthy Ansible side
    const page = await open({ world: (w) => { w.eng.terraform.unreachable = true; } });

    // WHEN the page loads
    await ready(page);

    // THEN Terraform's key and vault cards warn, and Ansible's say only that nothing is minted
    expect(await card(page, "#tf-llm")).toEqual({ "⚠": "unreachable" });
    expect(await card(page, "#tf-vault")).toEqual({ "⚠": "unreachable" });
    expect(await card(page, "#ans-llm")).toEqual({ status: "no key" });
  });
});

describe("when the backend is partly down", () => {
  it.concurrent("should still draw both engines when the preflight cannot be read, just without badges", async () => {
    // GIVEN a preflight that fails
    const page = await open({ world: (w) => { w.down = ["/preflight"]; } });

    // WHEN the page loads
    await ready(page);

    // THEN there are no badges, and the engines are drawn all the same
    expect(await badges(page)).toEqual([]);
    expect((await card(page, "#ans-spec"))["budget"]).toBe("$5");
  });

  it.concurrent("should say the state file exists but holds no key secret, when it does not", async () => {
    // GIVEN a Terraform key whose state file holds no secret
    const page = await open({ world: (w) => { w.tfNoSecret = true; } });
    await ready(page);

    // WHEN Terraform creates the key
    await scenario(page, "create");

    // THEN the state box says the file is there and clean, and is not the warning
    expect(await text(page, "#tfstate-box")).toContain("tfstate exists but holds no key secret right now.");
    expect(await page.$eval("#tfstate-box", (e) => e.className)).toBe("statebox none");
  });

  it.concurrent("should ignore a click on the scenario bar that is not on a scenario", async () => {
    // GIVEN the page loaded
    const page = await open();
    await ready(page);

    // WHEN the user clicks the bar itself, between the buttons
    await page.$eval("#scenbar", (bar) => bar.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    // THEN nothing runs: the buttons are free, no engine was called, the terminals are idle
    await idle(page);
    expect(page.world.calls.filter((c) => /run-|mutate|reset/.test(c))).toEqual([]);
    expect(await text(page, "#term-ans")).toBe("(idle)");
  });
});

describe("running a scenario", () => {
  it.concurrent("should mint one key per engine from a clean slate, stream what each did, and flag the secret in terraform's state file", async () => {
    // GIVEN the page with nothing minted
    const page = await open();
    await ready(page);

    // WHEN the user creates from a clean slate
    await scenario(page, "create");

    // THEN each engine's terminal shows its own GENERATE
    expect(await text(page, "#term-ans")).toBe("ansible: GENERATE");
    expect(await text(page, "#term-tf")).toBe("terraform: GENERATE");
    // THEN each engine has a LiteLLM key at the spec's version and budget, and a SecretVault row for it
    const tokens = [];
    for (const [, p] of ENGINES) {
      const llm = await card(page, `${p}llm`), vault = await card(page, `${p}vault`);
      expect(llm).toMatchObject({ version: "1", budget: "$5", blocked: "false" });
      expect(llm["token"]).toMatch(/^tok\d{9}…$/);
      expect(vault["secret"]).toMatch(/^sk-m\d+a+… \(43 chars\)$/);
      expect(vault["version"]).toBe("1");
      tokens.push(llm["token"]);
    }
    // THEN the two engines minted different keys
    expect(new Set(tokens).size).toBe(2);
    // THEN only Terraform's state file is flagged as holding the secret
    expect(await text(page, "#tfstate-box")).toMatch(/secret in terraform\.tfstate \(24619 bytes\)/);
    expect(await page.$eval("#tfstate-box", (e) => e.className)).toBe("statebox has");
    // THEN the contrast panel explains creation, and it is not a divergence
    expect(await text(page, "#difftitle")).toBe("Create from a clean slate");
    expect(await text(page, "#diff-vs")).toBe("VS");
    expect(await page.$eval("#diff", (e) => e.classList.contains("diverge"))).toBe(false);
  });

  it.concurrent("should change nothing on a re-run, and say so", async () => {
    // GIVEN both engines converged
    const page = await open();
    await ready(page);
    await scenario(page, "create");
    const before = [await card(page, "#ans-llm"), await card(page, "#tf-llm")];

    // WHEN the user re-runs with no spec change
    await scenario(page, "norun");

    // THEN both engines report a no-op
    expect(await text(page, "#term-ans")).toBe("ansible: NO-OP");
    expect(await text(page, "#term-tf")).toBe("terraform: NO-OP");
    // THEN the keys are exactly as they were
    expect([await card(page, "#ans-llm"), await card(page, "#tf-llm")]).toEqual(before);
  });

  it.concurrent("should update the budget in place on both engines without changing the token", async () => {
    // GIVEN both engines converged at $5
    const page = await open();
    await ready(page);
    await scenario(page, "create");
    const tokens = [(await card(page, "#ans-llm"))["token"], (await card(page, "#tf-llm"))["token"]];

    // WHEN the user changes the budget
    await scenario(page, "update");

    // THEN each engine updated in place: the spec and the live key both say $7, the token is the same
    for (const [i, [name, p]] of ENGINES.entries()) {
      expect(await text(page, name === "ansible" ? "#term-ans" : "#term-tf")).toBe(`${name}: UPDATE`);
      expect((await card(page, `${p}spec`))["budget"]).toBe("$7");
      const llm = await card(page, `${p}llm`);
      expect(llm["budget"]).toBe("$7");
      expect(llm["token"]).toBe(tokens[i]!);
      expect(llm["version"]).toBe("1");
    }
  });

  it.concurrent("should rotate on a version bump: a new token and version 2 on both engines", async () => {
    // GIVEN both engines converged at version 1
    const page = await open();
    await ready(page);
    await scenario(page, "create");
    const tokens = [(await card(page, "#ans-llm"))["token"], (await card(page, "#tf-llm"))["token"]];

    // WHEN the user bumps key_version
    await scenario(page, "rotate");

    // THEN each engine minted a new token at version 2, in the spec, the key and the vault row
    for (const [i, [, p]] of ENGINES.entries()) {
      expect((await card(page, `${p}spec`))["version"]).toBe("2");
      const llm = await card(page, `${p}llm`);
      expect(llm["version"]).toBe("2");
      expect(llm["token"]).not.toBe(tokens[i]!);
      expect((await card(page, `${p}vault`))["version"]).toBe("2");
    }
    expect(await text(page, "#term-ans")).toBe("ansible: ROTATE");
  });

  it.concurrent("should soft-disable on Ansible but destroy on Terraform when the spec is removed, then restore the same token on Ansible only", async () => {
    // GIVEN both engines converged
    const page = await open();
    await ready(page);
    await scenario(page, "create");
    const ansToken = (await card(page, "#ans-llm"))["token"];
    const tfToken = (await card(page, "#tf-llm"))["token"];

    // WHEN the user removes the spec
    await scenario(page, "remove");

    // THEN both specs read removed
    expect(await card(page, "#ans-spec")).toEqual({ status: "removed" });
    expect(await card(page, "#tf-spec")).toEqual({ status: "removed" });
    // THEN Ansible kept the key, blocked; Terraform destroyed the key, its vault row and the secret in its state file
    expect(await card(page, "#ans-llm")).toMatchObject({ token: ansToken!, blocked: "true" });
    expect(await card(page, "#tf-llm")).toEqual({ status: "no key" });
    expect(await card(page, "#tf-vault")).toEqual({ status: "no row" });
    expect(await text(page, "#tfstate-box")).toContain("No terraform.tfstate yet");
    // THEN the contrast panel marks it as a divergence
    expect(await text(page, "#diff-vs")).toBe("≠");
    expect(await page.$eval("#diff", (e) => e.classList.contains("diverge"))).toBe(true);

    // WHEN the user restores the spec
    await scenario(page, "restore");

    // THEN Ansible reactivates the same key, and Terraform mints a brand-new one
    expect(await card(page, "#ans-llm")).toMatchObject({ token: ansToken!, blocked: "false" });
    const tfAfter = (await card(page, "#tf-llm"))["token"];
    expect(tfAfter).toMatch(/^tok\d{9}…$/);
    expect(tfAfter).not.toBe(tfToken!);
  });

  it.concurrent("should soft-disable only Terraform, and tell Ansible it has no such step", async () => {
    // GIVEN both engines converged
    const page = await open();
    await ready(page);
    await scenario(page, "create");
    const ansBefore = await card(page, "#ans-llm");

    // WHEN the user soft-disables the Terraform way
    await scenario(page, "block");

    // THEN Terraform's key is kept and blocked
    expect(await card(page, "#tf-llm")).toMatchObject({ blocked: "true", version: "1" });
    expect(await text(page, "#term-tf")).toBe("terraform: UPDATE");
    // THEN Ansible was not run: its terminal says why, and its key is untouched
    expect(await text(page, "#term-ans")).toBe("n/a — Ansible disables via the prune step (remove the spec).");
    expect(await card(page, "#ans-llm")).toEqual(ansBefore);
  });

  it.concurrent("should show an out-of-band budget change on both live keys, and Terraform's plan wanting to revert it", async () => {
    // GIVEN both engines converged at $5
    const page = await open();
    await ready(page);
    await scenario(page, "create");

    // WHEN someone changes the live key's budget behind the spec's back
    await scenario(page, "drift");

    // THEN both live keys read $999 while both specs still say $5
    for (const [, p] of ENGINES) {
      expect((await card(page, `${p}llm`))["budget"]).toBe("$999");
      expect((await card(page, `${p}spec`))["budget"]).toBe("$5");
    }
    // THEN Ansible says the next sync overwrites it; Terraform's plan says it wants to change it
    expect(await text(page, "#term-ans")).toContain("the reconciler re-reads live state every run — next sync just overwrites it.");
    expect(await text(page, "#term-tf")).toContain("Plan: 0 to add, 1 to change, 0 to destroy.");
    expect(await text(page, "#term-tf")).toContain("plan wants to revert the out-of-band change");
  });

  it.concurrent("should hold every scenario button while the engines run, and free them when they finish", async () => {
    // GIVEN engines that have not answered yet
    const page = await open({ world: (w) => { w.gate = deferred(); } });
    await ready(page);

    // WHEN the user starts a scenario
    await page.click('#scenbar [data-s="create"]');

    // THEN every scenario button is disabled, and the engines have minted nothing yet
    expect(await page.$$eval("#scenbar button", (bs) => bs.map((b) => (b as HTMLButtonElement).disabled))).toEqual(Array(8).fill(true));
    expect(await card(page, "#ans-llm")).toEqual({ status: "no key" });

    // WHEN the engines finish
    page.world.gate!.release();
    await idle(page);

    // THEN the buttons are free and the keys are there
    expect((await card(page, "#ans-llm"))["token"]).toMatch(/^tok/);
  });

  it.concurrent("should report a stream error in the terminal and free the buttons when an engine fails", async () => {
    // GIVEN engines that fail as soon as they are run
    const page = await open({ world: (w) => { w.streamsFail = true; } });
    await ready(page);

    // WHEN the user runs a scenario
    await scenario(page, "create");

    // THEN each terminal says the stream failed, and no key was minted
    expect(await text(page, "#term-ans")).toBe("[stream error]");
    expect(await text(page, "#term-tf")).toBe("[stream error]");
    expect(await card(page, "#ans-llm")).toEqual({ status: "no key" });
  });

  it.concurrent("should flash only a value that changed, never one that stayed", async () => {
    // GIVEN both engines converged at $5
    const page = await open();
    await ready(page);
    await scenario(page, "create");

    // WHEN the budget changes
    await scenario(page, "update");

    // THEN something flashed, and everything that flashed is a budget: no version, token or secret did
    const flashed = await page.$$eval(".val.flash", (els) => els.map((e) => e.getAttribute("data-f")!));
    expect(flashed.length).toBeGreaterThan(0);
    expect(flashed.filter((f) => !f.endsWith("_b"))).toEqual([]);
  });

  it.concurrent("should flash the changed budget on both engines", async () => {
    // GIVEN both engines converged at $5
    const page = await open();
    await ready(page);
    await scenario(page, "create");

    // WHEN the budget changes
    await scenario(page, "update");

    // THEN the budget flashed for Ansible and for Terraform, not only for whichever engine finished last
    const flashed = await page.$$eval(".val.flash", (els) => els.map((e) => e.getAttribute("data-f")!));
    expect(flashed.filter((f) => f.startsWith("ans_")).length).toBeGreaterThan(0);
    expect(flashed.filter((f) => f.startsWith("tf_")).length).toBeGreaterThan(0);
  });
});
