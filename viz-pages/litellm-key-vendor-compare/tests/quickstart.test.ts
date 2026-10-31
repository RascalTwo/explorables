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
    const page = await viz.given("the quickstart tab, opened on Ansible", async () => {
      const p = await openQuickstart();
      expect(await text(p, ".step .fname")).toBe("ansible/keys/classify-service-prod.yml");
      expect(await text(p, ".cmd code")).toBe("$ make keys-sync");
      return p;
    });

    await viz.when("the user picks Terraform", async () => {
      await universe(page, "terraform");
    });

    await viz.then(
      "the file and the command are Terraform's, and only its pill is active",
      async () => {
        expect(await text(page, ".step .fname")).toBe("terraform/keys/classify-service-tf.yml");
        expect(await text(page, ".cmd code")).toBe("$ make tf-apply");
        expect(
          await page.$$eval(".uni-pill.active", (ps) =>
            ps.map((p) => (p instanceof HTMLElement ? p.dataset["u"] : undefined)),
          ),
        ).toEqual(["terraform"]);
      },
    );

    await viz.when("the user picks Kubernetes", async () => {
      await universe(page, "k8s");
    });

    await viz.then("it is the operator's story", async () => {
      expect(await text(page, ".step .fname")).toBe("classify-service.yaml (kubectl)");
      expect(await text(page, ".cmd code")).toBe("$ kubectl apply -f classify-service.yaml");
      expect(await text(page, "#qs-uniq")).toContain("Always-on, not one-shot.");
      expect(page.errors).toEqual([]);
    });
  });

  it.concurrent("should show the minted key of the universe that ran, streamed output and all", async () => {
    const page = await viz.given("the Ansible universe, nothing minted", async () => {
      const p = await openQuickstart();
      expect(await text(p, "#qs-result")).toContain("run “Try it” above");
      return p;
    });

    await viz.when("the user tries it", async () => {
      await tryIt(page);
    });

    await viz.then(
      "the output shows what the engine did, and the result card the key it minted",
      async () => {
        expect(await text(page, "pre.out")).toBe("ansible: GENERATE");
        const r = await result(page);
        expect(r).toMatchObject({ key_version: "1", budget: "$5" });
        expect(r["LiteLLM token"]).toMatch(/^tok\d{9}…$/u);
        expect(r["SecretVault secret"]).toMatch(/^sk-m\d+a+… \(43 chars\)$/u);
        // there is no tfstate row, which only Terraform has
        expect(Object.keys(r)).not.toContain("in tfstate");
      },
    );
  });

  it.concurrent("should flag the secret in Terraform's state file", async () => {
    const page = await viz.given("the Terraform universe", async () => {
      const p = await openQuickstart();
      await universe(p, "terraform");
      return p;
    });

    await viz.when("the user tries it", async () => {
      await tryIt(page);
    });

    await viz.then(
      "the result card says the secret is in the state file, in plaintext",
      async () => {
        expect((await result(page))["in tfstate"]).toBe("⚠ yes — plaintext");
      },
    );
  });

  it.concurrent("should refuse to use a key that was never minted, then call the gateway with the one that was", async () => {
    const page = await viz.given("the Ansible universe, nothing minted", async () => {
      return await openQuickstart();
    });

    const refusal = await viz.when("the user tries to use the key", async () => {
      return await useKey(page);
    });

    await viz.then("they are told to mint one first", () => {
      expect(refusal).toBe(
        "✗ no minted key yet — run “Try it” above to author + converge the key first",
      );
    });

    const answer = await viz.when("they mint it and use it", async () => {
      await tryIt(page);
      return await useKey(page);
    });

    await viz.then("the model answers, and the page names the registered key it used", async () => {
      expect(answer).toBe("Refund-status inquiry, route to the refunds queue.");
      expect(await text(page, ".answer .prov")).toMatch(
        /^✓ key sk-m\d+a+… \(43 chars\) is a registered LiteLLM identity — alias classify-service-prod, owner joseph@corp\.com$/u,
      );
    });
  });

  it.concurrent("should show the kubernetes secret once the operator reconciled the resource", async () => {
    const page = await viz.given("the Kubernetes universe over a running cluster", async () => {
      const p = await openQuickstart();
      await universe(p, "k8s");
      return p;
    });

    await viz.when("the user tries it", async () => {
      await tryIt(page);
    });

    await viz.then("the apply output and the reconciled Secret are shown", async () => {
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
  });

  it.concurrent("should say the operator is not reconciling instead of showing a Secret it never made", async () => {
    const page = await viz.given("a cluster whose operator is not deployed", async () => {
      const p = await openQuickstart({
        world: (w) => {
          w.k8s.reconciled = false;
        },
      });
      await universe(p, "k8s");
      return p;
    });

    await viz.when("the user tries it", async () => {
      await tryIt(page);
    });

    await viz.then("the output says so and the card holds only that status", async () => {
      expect(await text(page, "pre.out")).toContain("operator not reconciling yet");
      expect(Object.keys(await result(page))).toEqual(["status"]);
    });
  });

  it.concurrent("should tell the user how to start a cluster that is offline, before and after they try", async () => {
    const page = await viz.given(
      "a kind cluster that is down (the preflight says so)",
      async () => {
        return await openQuickstart({
          world: (w) => {
            w.k8s.offline = true;
            w.qsChecks = [{ name: "kind cluster (k8s)", ok: false }];
          },
        });
      },
    );

    await viz.when("the user picks the Kubernetes universe", async () => {
      await universe(page, "k8s");
    });

    await viz.then("the ask warns the cluster is offline", async () => {
      expect(await text(page, "#qs-ask")).toContain("kind cluster is offline");
    });

    await viz.when("the user tries it", async () => {
      await page.click('[data-act="run"]');
      await page.waitForFunction(
        () => !document.querySelector<HTMLButtonElement>('[data-act="run"]')!.disabled,
      );
    });

    await viz.then("the output says how to start it, and there is no result", async () => {
      expect(await text(page, "pre.out")).toContain(
        "[kind cluster offline] start it: make op-cluster-up",
      );
      expect(await text(page, "#qs-result")).toContain("run “Try it” above");
    });
  });

  it.concurrent("should report a failed engine stream in the output and leave the result empty", async () => {
    const page = await viz.given("an engine that fails as soon as it runs", async () => {
      return await openQuickstart({
        world: (w) => {
          w.streamsFail = true;
        },
      });
    });

    await viz.when("the user tries it", async () => {
      await page.click('[data-act="run"]');
      await page.waitForFunction(
        () => !document.querySelector<HTMLButtonElement>('[data-act="run"]')!.disabled,
      );
    });

    await viz.then(
      "the output says the stream failed, and the button is usable again with no result",
      async () => {
        expect(await text(page, "pre.out")).toBe("[stream error]");
        expect(await text(page, "#qs-result")).toContain("run “Try it” above");
      },
    );
  });

  it.concurrent("should show the failure when the gateway cannot be called", async () => {
    const page = await viz.given("a minted key, and a gateway that is down", async () => {
      const p = await openQuickstart();
      await tryIt(p);
      p.world.down = ["/qs-consume"];
      return p;
    });

    const answer = await viz.when("the user uses the key", async () => {
      return await useKey(page);
    });

    await viz.then("the answer area shows why, and the button works again", () => {
      expect(answer).toContain("upstream unreachable");
    });
  });

  it.concurrent("should show the failure when the kubernetes apply cannot run", async () => {
    const page = await viz.given("a cluster call that fails", async () => {
      const p = await openQuickstart({
        world: (w) => {
          w.down = ["/qs-k8s"];
        },
      });
      await universe(p, "k8s");
      return p;
    });

    await viz.when("the user tries it", async () => {
      await page.click('[data-act="run"]');
      await page.waitForFunction(
        () => !document.querySelector<HTMLButtonElement>('[data-act="run"]')!.disabled,
      );
    });

    await viz.then("the output shows the error, and there is no result", async () => {
      expect(await text(page, "pre.out")).toContain("[error] ApiError: upstream unreachable");
      expect(await text(page, "#qs-result")).toContain("run “Try it” above");
    });
  });

  it.concurrent("should warn about an offline cluster if the preflight answers after the user already chose Kubernetes", async () => {
    const page = await viz.given(
      "a preflight that is slow, and a cluster that is down",
      async () => {
        const p = await open({
          world: (w) => {
            w.hold["/qs-preflight"] = deferred();
            w.qsChecks = [{ name: "kind cluster (k8s)", ok: false }];
          },
        });
        await p.click('.modetab[data-mode="quickstart"]');
        await p.waitForSelector("#qs-steps .step");
        return p;
      },
    );

    await viz.when("the user picks Kubernetes before it answers", async () => {
      await universe(page, "k8s");
    });

    await viz.then("the ask does not warn yet", async () => {
      expect(await text(page, "#qs-ask")).not.toContain("offline");
    });

    await viz.when("the preflight answers", () => {
      page.world.hold["/qs-preflight"]!.release();
    });

    await viz.then("the warning appears", async () => {
      await page.waitForFunction(() =>
        document.querySelector("#qs-ask")!.textContent.includes("kind cluster is offline"),
      );
    });
  });

  it.concurrent("should copy a code block to the clipboard and say so", async () => {
    const page = await viz.given(
      "the quickstart, in a browser whose clipboard is an in-memory one (a headless browser has no system clipboard to grant)",
      async () => {
        const p = await openQuickstart();
        await p.evaluate(() => {
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
        return p;
      },
    );

    await viz.when("the user copies the spec", async () => {
      await page.click(".step .cp");
      await page.waitForFunction(
        () => document.querySelector(".step .cp")!.textContent === "copied!",
      );
    });

    await viz.then("the clipboard holds the spec, and the button reverts", async () => {
      expect(
        await page.evaluate(async () => {
          const t = await navigator.clipboard.readText();
          return t;
        }),
      ).toContain("key_alias:       classify-service-prod");
      await page.waitForFunction(() => document.querySelector(".step .cp")!.textContent === "copy");
    });
  });
});
