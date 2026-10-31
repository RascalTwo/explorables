// The Operator tab: two always-on operators over a live cluster, shown as cards (spec, live key, Secret,
// status) and driven by seven buttons. Silent failures: a badge that says IN SYNC over a drifted key, a button
// that acts on the other engine, and a capability lit without the thing it describes happening.
import { describe, it, expect } from "bun:test";
import type { Page } from "puppeteer-core";
import { open, heal, text, type KVPage } from "./helpers.ts";

type E = "ansible" | "java";
/** Click the Operator tab and wait for its cards. */
const openTab = async (page: KVPage): Promise<void> => {
  await page.click('.modetab[data-mode="operator"]');
  await page.waitForSelector("#body-ansible .card");
};
const openOperator = async (o?: Parameters<typeof open>[0]): Promise<KVPage> => {
  const page = await open(o);
  await openTab(page);
  return page;
};
/** A card as the user reads it: its title, then label → value. */
const cards = async (page: Page, e: E) => {
  const out = await page.$$eval(`#body-${e} .card`, (cs) =>
    cs.map((c) => ({
      title: c.querySelector("h3")!.textContent.replaceAll(/\s+/gu, " ").trim(),
      rows: Object.fromEntries(
        [...c.querySelectorAll(".row")].map((r) => [
          r.querySelector(".k")!.textContent,
          r.querySelector(".v")!.textContent.trim(),
        ]),
      ),
      absent: c.querySelector(".absent")?.textContent ?? null,
    })),
  );
  return out;
};
const live = async (page: Page, e: E) => (await cards(page, e))[1]!;
const press = async (page: Page, e: E, label: string) => {
  await page.evaluate(
    (eng, l) => {
      [...document.querySelectorAll<HTMLButtonElement>(`#acts-${eng} button`)]
        .find((b) => b.textContent.trim() === l)!
        .click();
    },
    e,
    label,
  );
};
/** Wait for the page to redraw a card row (it re-polls after every action). */
const until = async (page: Page, e: E, card: number, key: string, value: string) => {
  await page.waitForFunction(
    (eng, c, k, v) => {
      const row = [
        ...(document.querySelectorAll(`#body-${eng} .card`)[c]?.querySelectorAll(".row") ?? []),
      ].find((r) => r.querySelector(".k")!.textContent === k);
      return row?.querySelector(".v")!.textContent!.trim() === v;
    },
    { timeout: 12_000 },
    e,
    card,
    key,
    value,
  );
};
const lit = async (page: Page) => {
  const r = await page.$$eval(".cap.lit", (cs) => cs.map((c) => c.id));
  return r;
};

describe("opening the tab", () => {
  it.concurrent("should not touch the cluster until the tab is opened", async () => {
    const page = await viz.given("the page opened on its first tab", async () => {
      return await open();
    });

    await viz.when("the first tab finishes loading", async () => {
      await page.waitForSelector("#scenbar");
    });

    await viz.then("nothing has asked the operators' state", () => {
      expect(page.world.calls.filter((c) => c.includes("/op-"))).toEqual([]);
    });

    await viz.when("the user opens the operator tab", async () => {
      await page.click('.modetab[data-mode="operator"]');
      await page.waitForSelector("#body-ansible .card");
    });

    await viz.then("it reads the operators' state", () => {
      expect(page.world.calls.some((c) => c === "GET /op-state")).toBe(true);
    });
  });

  it.concurrent("should show both engines with no resource, no key and no Secret, and the preflight chips", async () => {
    const page = await viz.given(
      "operators with nothing applied, one preflight check failing",
      async () => {
        return await open();
      },
    );

    await viz.when("the user opens the operator tab", async () => {
      await openTab(page);
    });

    await viz.then("each engine's four cards say what is absent", async () => {
      await Promise.all(
        (["ansible", "java"] as const).map(async (e) => {
          expect((await cards(page, e)).map((c) => c.absent)).toEqual([
            "no CR — apply to create",
            "no live key",
            "no Secret",
            "—",
          ]);
        }),
      );
    });

    await viz.then("each preflight check is a chip, red when it fails", async () => {
      expect(
        await page.$$eval("#pf .chk", (cs) =>
          cs.map((c) => [
            c.querySelector(".dot")!.className.replace("dot", "").trim(),
            c.textContent,
          ]),
        ),
      ).toEqual([
        ["g", "kind cluster"],
        ["r", "operators deployed"],
      ]);
    });

    await viz.then("no capability is lit", async () => {
      expect(await lit(page)).toEqual([]);
    });
  });
});

describe("driving an operator", () => {
  it.concurrent("should apply a resource to one engine only: its spec, key, Secret and status appear, and the other engine stays empty", async () => {
    const page = await viz.given("the operator tab, nothing applied", async () => {
      return await openOperator();
    });

    await viz.when("the user applies the Ansible operator's resource", async () => {
      await press(page, "ansible", "Apply / Re-apply");
      await until(page, "ansible", 1, "key_version", "1");
    });

    await viz.then("its four cards are filled", async () => {
      const [spec, key, secret, status] = await cards(page, "ansible");
      expect(spec!.rows).toMatchObject({
        keyAlias: "email-classification-service-aop-prod",
        keyVersion: "1",
        maxBudget: "$5",
        models: "nemo-guarded",
        deletePolicy: "softDisable",
        blocked: "false",
      });
      expect(key!.title).toContain("IN SYNC");
      expect(key!.rows).toMatchObject({ max_budget: "$5", "tpm / rpm": "200000 / 60" });
      expect(secret!.rows["name"]).toBe("litellmkey-ansible");
      expect(status!.rows["observedKeyVersion"]).toBe("1");
    });

    await viz.then(
      "the reconcile and finalizer capabilities light (a CR exists, and the operator wrote a status), and the toast says what happened",
      async () => {
        expect(await lit(page)).toEqual(["cap-reconcile", "cap-final"]);
        expect(await text(page, "#toast")).toBe("Apply: applied");
      },
    );

    await viz.then("the Java operator is untouched", async () => {
      expect((await cards(page, "java")).map((c) => c.absent)).toEqual([
        "no CR — apply to create",
        "no live key",
        "no Secret",
        "—",
      ]);
    });
  });

  it.concurrent("should change the budget and rotate the key on the engine whose button was pressed", async () => {
    const { page, token } = await viz.given("both operators applied", async () => {
      const p = await openOperator();
      await Promise.all(
        (["ansible", "java"] as const).map(async (e) => {
          await press(p, e, "Apply / Re-apply");
          await until(p, e, 1, "key_version", "1");
        }),
      );
      return { page: p, token: (await cards(p, "java"))[3]!.rows["tokenHash"] };
    });

    await viz.when("the user sets the Ansible budget to $10 and rotates the Java key", async () => {
      await press(page, "ansible", "Budget $10");
      await until(page, "ansible", 1, "max_budget", "$10");
      await press(page, "java", "Rotate (v+1)");
      await until(page, "java", 1, "key_version", "2");
    });

    await viz.then(
      "Ansible has the new budget and its old version; Java has version 2, a new token and its old budget",
      async () => {
        expect((await cards(page, "ansible"))[0]!.rows).toMatchObject({
          maxBudget: "$10",
          keyVersion: "1",
        });
        expect((await cards(page, "java"))[0]!.rows).toMatchObject({
          maxBudget: "$5",
          keyVersion: "2",
        });
        expect((await cards(page, "java"))[3]!.rows["tokenHash"]).not.toBe(token!);
      },
    );
  });

  it.concurrent("should flag a tampered key as drift, light self-healing, and say HEALED when the operator reverts it", async () => {
    const page = await viz.given("the Ansible operator applied and in sync", async () => {
      const p = await openOperator();
      await press(p, "ansible", "Apply / Re-apply");
      await until(p, "ansible", 1, "key_version", "1");
      return p;
    });

    await viz.when("someone tampers with the live budget", async () => {
      await press(page, "ansible", "Tamper budget");
      await until(page, "ansible", 1, "max_budget", "$999");
    });

    await viz.then(
      "the key card says DRIFT, the spec still says $5, and the heal capability is lit",
      async () => {
        expect((await live(page, "ansible")).title).toContain("DRIFT");
        expect((await cards(page, "ansible"))[0]!.rows["maxBudget"]).toBe("$5");
        expect(await lit(page)).toContain("cap-heal");
        expect(await page.$eval("#anatomy", (e) => e.classList.contains("drift"))).toBe(true);
      },
    );

    await viz.when("the operator's resync reverts it", async () => {
      heal(page.world, "ansible");
      await until(page, "ansible", 1, "max_budget", "$5");
    });

    await viz.then(
      "the card is back in sync, the capability dims and the page says the drift was healed",
      async () => {
        expect((await live(page, "ansible")).title).toContain("IN SYNC");
        expect(await lit(page)).not.toContain("cap-heal");
        expect(await text(page, "#toast")).toBe("ansible: drift HEALED by reconciler");
      },
    );
  });

  it.concurrent("should light autonomous rotation while auto-rotate is on, and dim it when it is turned off", async () => {
    const page = await viz.given("the Java operator applied", async () => {
      const p = await openOperator();
      await press(p, "java", "Apply / Re-apply");
      await until(p, "java", 1, "key_version", "1");
      return p;
    });

    await viz.when("the user turns auto-rotate on", async () => {
      await press(page, "java", "Auto-rotate off");
      await until(page, "java", 0, "rotationIntervalSeconds", "30");
    });

    await viz.then("the button and the capability say it is on", async () => {
      expect(await page.$eval("#acts-java button.on", (b) => b.textContent)).toBe("Auto-rotate ON");
      expect(await lit(page)).toContain("cap-rotate");
    });

    await viz.when("they turn it off", async () => {
      await press(page, "java", "Auto-rotate ON");
      await until(page, "java", 0, "rotationIntervalSeconds", "—");
    });

    await viz.then("both go back", async () => {
      expect(await page.$$eval("#acts-java button.on", (b) => b.length)).toBe(0);
      expect(await lit(page)).not.toContain("cap-rotate");
    });
  });

  it.concurrent("should keep a soft-deleted key, blocked, and remove everything on a hard delete", async () => {
    const page = await viz.given("both operators applied", async () => {
      const p = await openOperator();
      await Promise.all(
        (["ansible", "java"] as const).map(async (e) => {
          await press(p, e, "Apply / Re-apply");
          await until(p, e, 1, "key_version", "1");
        }),
      );
      return p;
    });

    await viz.when("the user soft-deletes Ansible's and hard-deletes Java's", async () => {
      await press(page, "ansible", "Del soft");
      await page.waitForFunction(
        () =>
          document.querySelector("#body-ansible .card .absent")?.textContent ===
          "no CR — apply to create",
        { timeout: 12_000 },
      );
      await press(page, "java", "Del hard");
      await page.waitForFunction(
        () =>
          document.querySelector("#body-java .card:nth-child(2) .absent")?.textContent ===
          "no live key",
        { timeout: 12_000 },
      );
    });

    await viz.then(
      "Ansible's key survives blocked, with its Secret; Java has nothing left",
      async () => {
        const ans = await cards(page, "ansible");
        expect(ans[1]!.title).toContain("BLOCKED");
        expect(ans[2]!.rows["name"]).toBe("litellmkey-ansible");
        expect((await cards(page, "java")).map((c) => c.absent)).toEqual([
          "no CR — apply to create",
          "no live key",
          "no Secret",
          "—",
        ]);
      },
    );

    await viz.then(
      "the finalizer capability is dark: neither engine has an operator-written status any more",
      async () => {
        expect(await lit(page)).not.toContain("cap-final");
      },
    );
  });

  it.concurrent("should say an action failed when the operator refuses it", async () => {
    const page = await viz.given("nothing applied", async () => {
      return await openOperator();
    });

    await viz.when("the user rotates an engine that has no resource", async () => {
      await press(page, "ansible", "Rotate (v+1)");
      await page.waitForFunction(
        () => document.querySelector("#toast")!.textContent === "Rotate: no CR to change",
      );
    });

    await viz.then("the toast is the error kind, and nothing appeared", async () => {
      expect(
        await page.$eval("#toast", (t) => (t instanceof HTMLElement ? t.style.borderColor : "")),
      ).toBe("var(--danger)");
      expect((await cards(page, "ansible"))[1]!.absent).toBe("no live key");
    });
  });
});

describe("using the key from a pod", () => {
  it.concurrent("should show what the pod saw and the model's answer, for a key that exists", async () => {
    const page = await viz.given("the Ansible operator applied", async () => {
      const p = await openOperator();
      await press(p, "ansible", "Apply / Re-apply");
      await until(p, "ansible", 1, "key_version", "1");
      return p;
    });

    await viz.when("the user uses the key from a pod", async () => {
      await page.click("#consume-ansible button");
      await page.waitForFunction(
        () =>
          document.querySelector("#atext-ansible")?.textContent ===
          "Billing question, refunds queue.",
        { timeout: 12_000 },
      );
    });

    await viz.then(
      "the pod's environment, the model and the registered key are shown",
      async () => {
        const steps = await text(page, "#consume-ansible .csteps");
        expect(steps).toContain("LLM_KEY=sk-op1… (len 43");
        expect(steps).toContain("model: nemo-guarded");
        expect(steps).toContain(
          "registered key — alias email-classification-service-aop-prod, owner joseph@corp.com · a bogus key → 404",
        );
        expect(await text(page, "#consume-ansible button")).toBe("▶ Use the key again");
      },
    );
  });

  it.concurrent("should refuse with the operator's reason when there is no key to use", async () => {
    const page = await viz.given("nothing applied", async () => {
      return await openOperator();
    });

    await viz.when("the user uses the key from a pod", async () => {
      await page.click("#consume-java button");
      await page.waitForFunction(() => document.querySelector("#consume-java .cstep.bad"));
    });

    await viz.then("the reason is shown", async () => {
      expect(await text(page, "#consume-java .cstep.bad")).toBe(
        "✗ no live key to consume: apply the CR first",
      );
    });
  });

  it.concurrent("should show the failure when the pod cannot be reached", async () => {
    const page = await viz.given(
      "the Ansible operator applied, then a cluster that stops answering",
      async () => {
        const p = await openOperator();
        await press(p, "ansible", "Apply / Re-apply");
        await until(p, "ansible", 1, "key_version", "1");
        p.world.down = ["/op-consume"];
        return p;
      },
    );

    await viz.when("the user uses the key", async () => {
      await page.click("#consume-ansible button");
      await page.waitForFunction(() => document.querySelector("#consume-ansible .cstep.bad"));
    });

    await viz.then("the error is shown and the button offers another try", async () => {
      expect(await text(page, "#consume-ansible .cstep.bad")).toContain("upstream unreachable");
      expect(await text(page, "#consume-ansible button")).toBe("▶ Use the key again");
    });
  });
});

describe("reading what the gateway says", () => {
  it.concurrent("should show a key with no limits as dashes, not as numbers", async () => {
    const page = await viz.given(
      "a live key with no tpm/rpm limit, no environment and a Secret with no prefix, and a status the operator has not filled",
      async () => {
        return await open({
          world: (w) => {
            w.op.ansible = {
              cr: { keyAlias: "a", keyVersion: 1, maxBudget: 5 },
              live: {
                keyVersion: 1,
                maxBudget: 5,
                blocked: false,
                env: null,
                tpm: null,
                rpm: null,
              },
              secret: { name: "s", valuePrefix: null, ownerRefs: 2 },
              status: { observedKeyVersion: 1 },
              token: 0,
            };
          },
        });
      },
    );

    await viz.when("the user opens the operator tab", async () => {
      await openTab(page);
    });

    await viz.then(
      "the limits read as dashes, the missing prefix as a dash, and a Secret with owners says how many",
      async () => {
        const [, key, secret] = await cards(page, "ansible");
        expect(key!.rows["tpm / rpm"]).toBe("— / —");
        expect(secret!.rows).toEqual({ name: "s", secret_value: "—", ownerRefs: "2" });
      },
    );

    await viz.then("a spec with no models or rotation reads as empty", async () => {
      const [spec] = await cards(page, "ansible");
      expect(spec!.rows).toMatchObject({
        models: "",
        deletePolicy: "softDisable",
        rotationIntervalSeconds: "—",
      });
    });

    await viz.then("a status with no token or Secret reference reads as dashes", async () => {
      const [, , , status] = await cards(page, "ansible");
      expect(status!.rows).toMatchObject({
        observedKeyVersion: "1",
        tokenHash: "…",
        secretRef: "—",
        lastRotated: "—",
      });
    });
  });

  it.concurrent("should show a key with no budget as a dash", async () => {
    const page = await viz.given(
      "a live key whose budget LiteLLM reports as null (no budget)",
      async () => {
        return await open({
          world: (w) => {
            w.op.ansible = {
              cr: { keyAlias: "a", keyVersion: 1, maxBudget: 5 },
              live: { keyVersion: 1, maxBudget: null, blocked: false, env: "prod", tpm: 1, rpm: 1 },
              secret: { name: "s", valuePrefix: "sk-", ownerRefs: 0 },
              status: { observedKeyVersion: 1 },
              token: 0,
            };
          },
        });
      },
    );

    await viz.when("the user opens the operator tab", async () => {
      await openTab(page);
    });

    await viz.then(
      "the live budget reads as a dash, and the spec's budget still reads as dollars",
      async () => {
        const [spec, key] = await cards(page, "ansible");
        expect(key!.rows["max_budget"]).toBe("—");
        expect(spec!.rows["maxBudget"]).toBe("$5");
      },
    );
  });

  it.concurrent("should say an action failed when the cluster cannot be reached", async () => {
    const page = await viz.given("a cluster that answers nothing", async () => {
      return await openOperator({
        world: (w) => {
          w.down = ["/op-apply"];
        },
      });
    });

    await viz.when("the user applies", async () => {
      await press(page, "ansible", "Apply / Re-apply");
      await page.waitForFunction(() =>
        document.querySelector("#toast")!.textContent.startsWith("Apply: "),
      );
    });

    await viz.then("the toast is the error kind and nothing appeared", async () => {
      expect(
        await page.$eval("#toast", (t) => (t instanceof HTMLElement ? t.style.borderColor : "")),
      ).toBe("var(--danger)");
      expect((await cards(page, "ansible"))[1]!.absent).toBe("no live key");
    });
  });
});
