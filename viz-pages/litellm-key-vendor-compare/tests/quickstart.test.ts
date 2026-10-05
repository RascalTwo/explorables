// The Quickstart tab: one developer's ask, told once per universe, with a "Try it" that runs the engine and a
// "Use the key" that calls the gateway with what was minted. Silent failures: the result card showing another
// universe's key, "Use the key" answering with a key that was never minted, and the kubernetes universe
// pretending to have reconciled when the operator is not running.
import { describe, it, expect } from "bun:test";
import type { Page } from "puppeteer-core";
import { open, text, deferred, type KVPage } from "./helpers.ts";

const openQuickstart = async (o?: Parameters<typeof open>[0]): Promise<KVPage> => {
  const page = await open(o);
  await page.click('.modetab[data-mode="quickstart"]');
  await page.waitForSelector("#qs-steps .step");
  return page;
};
const universe = async (page: Page, u: string) => {
  await page.click(`.uni-pill[data-u="${u}"]`);
};
/** The result card as the user reads it: label → value. */
const result = async (page: Page) => {
  const r = await page.$$eval("#qs-result .k", (ks) =>
    Object.fromEntries(
      ks.map((k) => [k.textContent.trim(), k.nextElementSibling!.textContent.trim()]),
    ),
  );
  return r;
};
const tryIt = async (page: Page) => {
  await page.click('[data-act="run"]');
  await page.waitForFunction(
    () =>
      !document.querySelector<HTMLButtonElement>('[data-act="run"]')!.disabled &&
      !document.querySelector("#qs-result")!.classList.contains("empty"),
    { timeout: 15_000 },
  );
};
const useKey = async (page: Page) => {
  await page.click('[data-act="use"]');
  await page.waitForFunction(
    () => !document.querySelector<HTMLButtonElement>('[data-act="use"]')!.disabled,
    { timeout: 15_000 },
  );
  return text(page, ".answer .at");
};

describe("the quickstart", () => {
  it.concurrent("should tell each universe's story: its spec file, its one command, and only the active pill lit", async () => {
    // GIVEN the quickstart tab, opened on Ansible
    const page = await openQuickstart();
    expect(await text(page, ".step .fname")).toBe("ansible/keys/classify-service-prod.yml");
    expect(await text(page, ".cmd code")).toBe("$ make keys-sync");

    // WHEN the user picks Terraform
    await universe(page, "terraform");

    // THEN the file and the command are Terraform's, and only its pill is active
    expect(await text(page, ".step .fname")).toBe("terraform/keys/classify-service-tf.yml");
    expect(await text(page, ".cmd code")).toBe("$ make tf-apply");
    expect(
      await page.$$eval(".uni-pill.active", (ps) =>
        ps.map((p) => (p instanceof HTMLElement ? p.dataset["u"] : undefined)),
      ),
    ).toEqual(["terraform"]);

    // WHEN the user picks Kubernetes
    await universe(page, "k8s");

    // THEN it is the operator's story
    expect(await text(page, ".step .fname")).toBe("classify-service.yaml (kubectl)");
    expect(await text(page, ".cmd code")).toBe("$ kubectl apply -f classify-service.yaml");
    expect(await text(page, "#qs-uniq")).toContain("Always-on, not one-shot.");
    expect(page.errors).toEqual([]);
  });

  it.concurrent("should show the minted key of the universe that ran, streamed output and all", async () => {
    // GIVEN the Ansible universe, nothing minted
    const page = await openQuickstart();
    expect(await text(page, "#qs-result")).toContain("run “Try it” above");

    // WHEN the user tries it
    await tryIt(page);

    // THEN the output shows what the engine did, and the result card the key it minted
    expect(await text(page, "pre.out")).toBe("ansible: GENERATE");
    const r = await result(page);
    expect(r).toMatchObject({ key_version: "1", budget: "$5" });
    expect(r["LiteLLM token"]).toMatch(/^tok\d{9}…$/u);
    expect(r["SecretVault secret"]).toMatch(/^sk-m\d+a+… \(43 chars\)$/u);
    // THEN there is no tfstate row, which only Terraform has
    expect(Object.keys(r)).not.toContain("in tfstate");
  });

  it.concurrent("should flag the secret in Terraform's state file", async () => {
    // GIVEN the Terraform universe
    const page = await openQuickstart();
    await universe(page, "terraform");

    // WHEN the user tries it
    await tryIt(page);

    // THEN the result card says the secret is in the state file, in plaintext
    expect((await result(page))["in tfstate"]).toBe("⚠ yes — plaintext");
  });

  it.concurrent("should refuse to use a key that was never minted, then call the gateway with the one that was", async () => {
    // GIVEN the Ansible universe, nothing minted
    const page = await openQuickstart();

    // WHEN the user tries to use the key
    // THEN they are told to mint one first
    expect(await useKey(page)).toBe(
      "✗ no minted key yet — run “Try it” above to author + converge the key first",
    );

    // WHEN they mint it and use it
    await tryIt(page);
    const answer = await useKey(page);

    // THEN the model answers, and the page names the registered key it used
    expect(answer).toBe("Refund-status inquiry, route to the refunds queue.");
    expect(await text(page, ".answer .prov")).toMatch(
      /^✓ key sk-m\d+a+… \(43 chars\) is a registered LiteLLM identity — alias classify-service-prod, owner joseph@corp\.com$/u,
    );
  });

  it.concurrent("should show the kubernetes secret once the operator reconciled the resource", async () => {
    // GIVEN the Kubernetes universe over a running cluster
    const page = await openQuickstart();
    await universe(page, "k8s");

    // WHEN the user tries it
    await tryIt(page);

    // THEN the apply output and the reconciled Secret are shown
    expect(await text(page, "pre.out")).toContain(
      "✓ operator reconciled → namespaced Secret materialized",
    );
    expect(await result(page)).toEqual({
      Secret: "litellmkey-classify-service",
      "token (sha256)": "k8stoken0123456789…",
      keyVersion: "1",
      secret_value: "sk-k8s0001…",
    });
  });

  it.concurrent("should say the operator is not reconciling instead of showing a Secret it never made", async () => {
    // GIVEN a cluster whose operator is not deployed
    const page = await openQuickstart({
      world: (w) => {
        w.k8s.reconciled = false;
      },
    });
    await universe(page, "k8s");

    // WHEN the user tries it
    await tryIt(page);

    // THEN the output says so and the card holds only that status
    expect(await text(page, "pre.out")).toContain("operator not reconciling yet");
    expect(Object.keys(await result(page))).toEqual(["status"]);
  });

  it.concurrent("should tell the user how to start a cluster that is offline, before and after they try", async () => {
    // GIVEN a kind cluster that is down (the preflight says so)
    const page = await openQuickstart({
      world: (w) => {
        w.k8s.offline = true;
        w.qsChecks = [{ name: "kind cluster (k8s)", ok: false }];
      },
    });

    // WHEN the user picks the Kubernetes universe and tries it
    await universe(page, "k8s");
    // THEN the ask warns the cluster is offline
    expect(await text(page, "#qs-ask")).toContain("kind cluster is offline");
    await page.click('[data-act="run"]');
    await page.waitForFunction(
      () => !document.querySelector<HTMLButtonElement>('[data-act="run"]')!.disabled,
    );

    // THEN the output says how to start it, and there is no result
    expect(await text(page, "pre.out")).toContain(
      "[kind cluster offline] start it: make op-cluster-up",
    );
    expect(await text(page, "#qs-result")).toContain("run “Try it” above");
  });

  it.concurrent("should report a failed engine stream in the output and leave the result empty", async () => {
    // GIVEN an engine that fails as soon as it runs
    const page = await openQuickstart({
      world: (w) => {
        w.streamsFail = true;
      },
    });

    // WHEN the user tries it
    await page.click('[data-act="run"]');
    await page.waitForFunction(
      () => !document.querySelector<HTMLButtonElement>('[data-act="run"]')!.disabled,
    );

    // THEN the output says the stream failed, and the button is usable again with no result
    expect(await text(page, "pre.out")).toBe("[stream error]");
    expect(await text(page, "#qs-result")).toContain("run “Try it” above");
  });

  it.concurrent("should show the failure when the gateway cannot be called", async () => {
    // GIVEN a minted key, and a gateway that is down
    const page = await openQuickstart();
    await tryIt(page);
    page.world.down = ["/qs-consume"];

    // WHEN the user uses the key
    // THEN the answer area shows why, and the button works again
    expect(await useKey(page)).toContain("upstream unreachable");
  });

  it.concurrent("should show the failure when the kubernetes apply cannot run", async () => {
    // GIVEN a cluster call that fails
    const page = await openQuickstart({
      world: (w) => {
        w.down = ["/qs-k8s"];
      },
    });
    await universe(page, "k8s");

    // WHEN the user tries it
    await page.click('[data-act="run"]');
    await page.waitForFunction(
      () => !document.querySelector<HTMLButtonElement>('[data-act="run"]')!.disabled,
    );

    // THEN the output shows the error, and there is no result
    expect(await text(page, "pre.out")).toContain("[error] ApiError: upstream unreachable");
    expect(await text(page, "#qs-result")).toContain("run “Try it” above");
  });

  it.concurrent("should warn about an offline cluster if the preflight answers after the user already chose Kubernetes", async () => {
    // GIVEN a preflight that is slow, and a cluster that is down
    const page = await open({
      world: (w) => {
        w.hold["/qs-preflight"] = deferred();
        w.qsChecks = [{ name: "kind cluster (k8s)", ok: false }];
      },
    });
    await page.click('.modetab[data-mode="quickstart"]');
    await page.waitForSelector("#qs-steps .step");

    // WHEN the user picks Kubernetes before it answers
    await universe(page, "k8s");
    expect(await text(page, "#qs-ask")).not.toContain("offline");
    page.world.hold["/qs-preflight"]!.release();

    // THEN the warning appears once it does
    await page.waitForFunction(() =>
      document.querySelector("#qs-ask")!.textContent.includes("kind cluster is offline"),
    );
  });

  it.concurrent("should copy a code block to the clipboard and say so", async () => {
    // GIVEN the quickstart, in a browser whose clipboard is an in-memory one (a headless browser has no system clipboard to grant)
    const page = await openQuickstart();
    await page.evaluate(() => {
      let held = "";
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: async (t: string) => {
            held = t;
            await Promise.resolve();
          },
          readText: async () => {
            await Promise.resolve();
            return held;
          },
        },
      });
    });

    // WHEN the user copies the spec
    await page.click(".step .cp");
    await page.waitForFunction(
      () => document.querySelector(".step .cp")!.textContent === "copied!",
    );

    // THEN the clipboard holds the spec, and the button reverts
    expect(
      await page.evaluate(async () => {
        const t = await navigator.clipboard.readText();
        return t;
      }),
    ).toContain("key_alias:       classify-service-prod");
    await page.waitForFunction(() => document.querySelector(".step .cp")!.textContent === "copy");
  });
});
