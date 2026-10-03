// The Operator tab: two always-on operators over a live cluster, shown as cards (spec, live key, Secret,
// status) and driven by seven buttons. Silent failures: a badge that says IN SYNC over a drifted key, a button
// that acts on the other engine, and a capability lit without the thing it describes happening.
import { describe, it, expect } from "bun:test";
import type { Page } from "puppeteer-core";
import { open, heal, text, type KVPage } from "./helpers.ts";

type E = "ansible" | "java";
const openOperator = async (o?: Parameters<typeof open>[0]): Promise<KVPage> => {
  const page = await open(o);
  await page.click('.modetab[data-mode="operator"]');
  await page.waitForSelector("#body-ansible .card");
  return page;
};
/** A card as the user reads it: its title, then label → value. */
const cards = (page: Page, e: E) => page.$$eval(`#body-${e} .card`, (cs) => cs.map((c) => ({
  title: c.querySelector("h3")!.textContent!.replace(/\s+/g, " ").trim(),
  rows: Object.fromEntries([...c.querySelectorAll(".row")].map((r) => [r.querySelector(".k")!.textContent!, r.querySelector(".v")!.textContent!.trim()])),
  absent: c.querySelector(".absent")?.textContent ?? null,
})));
const live = async (page: Page, e: E) => (await cards(page, e))[1]!;
const press = (page: Page, e: E, label: string) => page.evaluate((eng, l) => {
  [...document.querySelectorAll<HTMLButtonElement>(`#acts-${eng} button`)].find((b) => b.textContent!.trim() === l)!.click();
}, e, label);
/** Wait for the page to redraw a card row (it re-polls after every action). */
const until = (page: Page, e: E, card: number, key: string, value: string) => page.waitForFunction((eng, c, k, v) => {
  const row = [...document.querySelectorAll(`#body-${eng} .card`)[c]?.querySelectorAll(".row") ?? []].find((r) => r.querySelector(".k")!.textContent === k);
  return row?.querySelector(".v")!.textContent!.trim() === v;
}, { timeout: 12_000 }, e, card, key, value);
const lit = (page: Page) => page.$$eval(".cap.lit", (cs) => cs.map((c) => c.id));

describe("opening the tab", () => {
  it.concurrent("should not touch the cluster until the tab is opened", async () => {
    // GIVEN the page on its first tab
    const page = await open();
    await page.waitForSelector("#scenbar");

    // THEN nothing has asked the operators' state
    expect(page.world.calls.filter((c) => c.includes("/op-"))).toEqual([]);

    // WHEN the user opens the operator tab
    await page.click('.modetab[data-mode="operator"]');
    await page.waitForSelector("#body-ansible .card");

    // THEN it reads the operators' state
    expect(page.world.calls.some((c) => c === "GET /op-state")).toBe(true);
  });

  it.concurrent("should show both engines with no resource, no key and no Secret, and the preflight chips", async () => {
    // GIVEN operators with nothing applied, one preflight check failing
    const page = await openOperator();

    // THEN each engine's four cards say what is absent
    for (const e of ["ansible", "java"] as const) {
      expect((await cards(page, e)).map((c) => c.absent)).toEqual(["no CR — apply to create", "no live key", "no Secret", "—"]);
    }
    // THEN each preflight check is a chip, red when it fails
    expect(await page.$$eval("#pf .chk", (cs) => cs.map((c) => [c.querySelector(".dot")!.className.replace("dot", "").trim(), c.textContent]))).toEqual([["g", "kind cluster"], ["r", "operators deployed"]]);
    // THEN no capability is lit
    expect(await lit(page)).toEqual([]);
  });
});

describe("driving an operator", () => {
  it.concurrent("should apply a resource to one engine only: its spec, key, Secret and status appear, and the other engine stays empty", async () => {
    // GIVEN the operator tab, nothing applied
    const page = await openOperator();

    // WHEN the user applies the Ansible operator's resource
    await press(page, "ansible", "Apply / Re-apply");
    await until(page, "ansible", 1, "key_version", "1");

    // THEN its four cards are filled
    const [spec, key, secret, status] = await cards(page, "ansible");
    expect(spec!.rows).toMatchObject({ keyAlias: "email-classification-service-aop-prod", keyVersion: "1", maxBudget: "$5", models: "nemo-guarded", deletePolicy: "softDisable", blocked: "false" });
    expect(key!.title).toContain("IN SYNC");
    expect(key!.rows).toMatchObject({ max_budget: "$5", "tpm / rpm": "200000 / 60" });
    expect(secret!.rows["name"]).toBe("litellmkey-ansible");
    expect(status!.rows["observedKeyVersion"]).toBe("1");
    // THEN the reconcile and finalizer capabilities light (a CR exists, and the operator wrote a status), and the toast says what happened
    expect(await lit(page)).toEqual(["cap-reconcile", "cap-final"]);
    expect(await text(page, "#toast")).toBe("Apply: applied");
    // THEN the Java operator is untouched
    expect((await cards(page, "java")).map((c) => c.absent)).toEqual(["no CR — apply to create", "no live key", "no Secret", "—"]);
  });

  it.concurrent("should change the budget and rotate the key on the engine whose button was pressed", async () => {
    // GIVEN both operators applied
    const page = await openOperator();
    for (const e of ["ansible", "java"] as const) { await press(page, e, "Apply / Re-apply"); await until(page, e, 1, "key_version", "1"); }
    const token = (await cards(page, "java"))[3]!.rows["tokenHash"];

    // WHEN the user sets the Ansible budget to $10 and rotates the Java key
    await press(page, "ansible", "Budget $10");
    await until(page, "ansible", 1, "max_budget", "$10");
    await press(page, "java", "Rotate (v+1)");
    await until(page, "java", 1, "key_version", "2");

    // THEN Ansible has the new budget and its old version; Java has version 2, a new token and its old budget
    expect((await cards(page, "ansible"))[0]!.rows).toMatchObject({ maxBudget: "$10", keyVersion: "1" });
    expect((await cards(page, "java"))[0]!.rows).toMatchObject({ maxBudget: "$5", keyVersion: "2" });
    expect((await cards(page, "java"))[3]!.rows["tokenHash"]).not.toBe(token!);
  });

  it.concurrent("should flag a tampered key as drift, light self-healing, and say HEALED when the operator reverts it", async () => {
    // GIVEN the Ansible operator applied and in sync
    const page = await openOperator();
    await press(page, "ansible", "Apply / Re-apply");
    await until(page, "ansible", 1, "key_version", "1");

    // WHEN someone tampers with the live budget
    await press(page, "ansible", "Tamper budget");
    await until(page, "ansible", 1, "max_budget", "$999");

    // THEN the key card says DRIFT, the spec still says $5, and the heal capability is lit
    expect((await live(page, "ansible")).title).toContain("DRIFT");
    expect((await cards(page, "ansible"))[0]!.rows["maxBudget"]).toBe("$5");
    expect(await lit(page)).toContain("cap-heal");
    expect(await page.$eval("#anatomy", (e) => e.classList.contains("drift"))).toBe(true);

    // WHEN the operator's resync reverts it
    heal(page.world, "ansible");
    await until(page, "ansible", 1, "max_budget", "$5");

    // THEN the card is back in sync, the capability dims and the page says the drift was healed
    expect((await live(page, "ansible")).title).toContain("IN SYNC");
    expect(await lit(page)).not.toContain("cap-heal");
    expect(await text(page, "#toast")).toBe("ansible: drift HEALED by reconciler");
  });

  it.concurrent("should light autonomous rotation while auto-rotate is on, and dim it when it is turned off", async () => {
    // GIVEN the Java operator applied
    const page = await openOperator();
    await press(page, "java", "Apply / Re-apply");
    await until(page, "java", 1, "key_version", "1");

    // WHEN the user turns auto-rotate on
    await press(page, "java", "Auto-rotate off");
    await until(page, "java", 0, "rotationIntervalSeconds", "30");

    // THEN the button and the capability say it is on
    expect(await page.$eval("#acts-java button.on", (b) => b.textContent)).toBe("Auto-rotate ON");
    expect(await lit(page)).toContain("cap-rotate");

    // WHEN they turn it off
    await press(page, "java", "Auto-rotate ON");
    await until(page, "java", 0, "rotationIntervalSeconds", "—");

    // THEN both go back
    expect(await page.$$eval("#acts-java button.on", (b) => b.length)).toBe(0);
    expect(await lit(page)).not.toContain("cap-rotate");
  });

  it.concurrent("should keep a soft-deleted key, blocked, and remove everything on a hard delete", async () => {
    // GIVEN both operators applied
    const page = await openOperator();
    for (const e of ["ansible", "java"] as const) { await press(page, e, "Apply / Re-apply"); await until(page, e, 1, "key_version", "1"); }

    // WHEN the user soft-deletes Ansible's and hard-deletes Java's
    await press(page, "ansible", "Del soft");
    await page.waitForFunction(() => document.querySelector("#body-ansible .card .absent")?.textContent === "no CR — apply to create", { timeout: 12_000 });
    await press(page, "java", "Del hard");
    await page.waitForFunction(() => document.querySelector("#body-java .card:nth-child(2) .absent")?.textContent === "no live key", { timeout: 12_000 });

    // THEN Ansible's key survives blocked, with its Secret; Java has nothing left
    const ans = await cards(page, "ansible");
    expect(ans[1]!.title).toContain("BLOCKED");
    expect(ans[2]!.rows["name"]).toBe("litellmkey-ansible");
    expect((await cards(page, "java")).map((c) => c.absent)).toEqual(["no CR — apply to create", "no live key", "no Secret", "—"]);
    // THEN the finalizer capability is dark: neither engine has an operator-written status any more
    expect(await lit(page)).not.toContain("cap-final");
  });

  it.concurrent("should say an action failed when the operator refuses it", async () => {
    // GIVEN nothing applied
    const page = await openOperator();

    // WHEN the user rotates an engine that has no resource
    await press(page, "ansible", "Rotate (v+1)");
    await page.waitForFunction(() => document.querySelector("#toast")!.textContent === "Rotate: no CR to change");

    // THEN the toast is the error kind, and nothing appeared
    expect(await page.$eval("#toast", (t) => (t as HTMLElement).style.borderColor)).toBe("var(--danger)");
    expect((await cards(page, "ansible"))[1]!.absent).toBe("no live key");
  });
});

describe("using the key from a pod", () => {
  it.concurrent("should show what the pod saw and the model's answer, for a key that exists", async () => {
    // GIVEN the Ansible operator applied
    const page = await openOperator();
    await press(page, "ansible", "Apply / Re-apply");
    await until(page, "ansible", 1, "key_version", "1");

    // WHEN the user uses the key from a pod
    await page.click("#consume-ansible button");
    await page.waitForFunction(() => document.querySelector("#atext-ansible")?.textContent === "Billing question, refunds queue.", { timeout: 12_000 });

    // THEN the pod's environment, the model and the registered key are shown
    const steps = await text(page, "#consume-ansible .csteps");
    expect(steps).toContain("LLM_KEY=sk-op1… (len 43");
    expect(steps).toContain("model: nemo-guarded");
    expect(steps).toContain("registered key — alias email-classification-service-aop-prod, owner joseph@corp.com · a bogus key → 404");
    expect(await text(page, "#consume-ansible button")).toBe("▶ Use the key again");
  });

  it.concurrent("should refuse with the operator's reason when there is no key to use", async () => {
    // GIVEN nothing applied
    const page = await openOperator();

    // WHEN the user uses the key from a pod
    await page.click("#consume-java button");
    await page.waitForFunction(() => document.querySelector("#consume-java .cstep.bad"));

    // THEN the reason is shown
    expect(await text(page, "#consume-java .cstep.bad")).toBe("✗ no live key to consume: apply the CR first");
  });

  it.concurrent("should show the failure when the pod cannot be reached", async () => {
    // GIVEN the Ansible operator applied, then a cluster that stops answering
    const page = await openOperator();
    await press(page, "ansible", "Apply / Re-apply");
    await until(page, "ansible", 1, "key_version", "1");
    page.world.down = ["/op-consume"];

    // WHEN the user uses the key
    await page.click("#consume-ansible button");
    await page.waitForFunction(() => document.querySelector("#consume-ansible .cstep.bad"));

    // THEN the error is shown and the button offers another try
    expect(await text(page, "#consume-ansible .cstep.bad")).toContain("upstream unreachable");
    expect(await text(page, "#consume-ansible button")).toBe("▶ Use the key again");
  });
});

describe("reading what the gateway says", () => {
  it.concurrent("should show a key with no limits as dashes, not as numbers", async () => {
    // GIVEN a live key with no tpm/rpm limit, no environment and a Secret with no prefix, and a status the operator has not filled
    const page = await openOperator({ world: (w) => {
      w.op.ansible = { cr: { keyAlias: "a", keyVersion: 1, maxBudget: 5 }, live: { keyVersion: 1, maxBudget: 5, blocked: false, env: null, tpm: null, rpm: null },
        secret: { name: "s", valuePrefix: null, ownerRefs: 2 }, status: { observedKeyVersion: 1 }, token: 0 };
    } });

    // THEN the limits read as dashes, the missing prefix as a dash, and a Secret with owners says how many
    const [spec, key, secret, status] = await cards(page, "ansible");
    expect(key!.rows["tpm / rpm"]).toBe("— / —");
    expect(secret!.rows).toEqual({ name: "s", secret_value: "—", ownerRefs: "2" });
    // THEN a spec with no models or rotation reads as empty
    expect(spec!.rows).toMatchObject({ models: "", deletePolicy: "softDisable", rotationIntervalSeconds: "—" });
    // THEN a status with no token or Secret reference reads as dashes
    expect(status!.rows).toMatchObject({ observedKeyVersion: "1", tokenHash: "…", secretRef: "—", lastRotated: "—" });
  });

  it.concurrent("should show a key with no budget as a dash", async () => {
    // GIVEN a live key whose budget LiteLLM reports as null (no budget)
    const page = await openOperator({ world: (w) => {
      w.op.ansible = { cr: { keyAlias: "a", keyVersion: 1, maxBudget: 5 }, live: { keyVersion: 1, maxBudget: null, blocked: false, env: "prod", tpm: 1, rpm: 1 },
        secret: { name: "s", valuePrefix: "sk-", ownerRefs: 0 }, status: { observedKeyVersion: 1 }, token: 0 };
    } });

    // THEN the live budget reads as a dash, and the spec's budget still reads as dollars
    const [spec, key] = await cards(page, "ansible");
    expect(key!.rows["max_budget"]).toBe("—");
    expect(spec!.rows["maxBudget"]).toBe("$5");
  });

  it.concurrent("should say an action failed when the cluster cannot be reached", async () => {
    // GIVEN a cluster that answers nothing
    const page = await openOperator({ world: (w) => { w.down = ["/op-apply"]; } });

    // WHEN the user applies
    await press(page, "ansible", "Apply / Re-apply");
    await page.waitForFunction(() => document.querySelector("#toast")!.textContent!.startsWith("Apply: "));

    // THEN the toast is the error kind and nothing appeared
    expect(await page.$eval("#toast", (t) => (t as HTMLElement).style.borderColor)).toBe("var(--danger)");
    expect((await cards(page, "ansible"))[1]!.absent).toBe("no live key");
  });
});
