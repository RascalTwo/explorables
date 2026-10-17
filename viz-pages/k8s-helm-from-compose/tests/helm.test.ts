import { describe, it, expect } from "bun:test";
import { open, text, type P } from "./helpers.ts";

// The Helm panel renders the chart's templates from values: the base values.yaml, a per-environment override, then the
// three controls (replicaCount, image.tag, ingress.enabled) win last. At the start it is `dev`: 1 replica, tag 1.0.0.

const env = async (page: P, e: "dev" | "staging" | "prod") => {
  await page.click(`#envSeg button[data-env="${e}"]`);
};
const tag = async (page: P, t: string) => {
  await page.click(`#tagSeg button[data-tag="${t}"]`);
};
const file = async (page: P, f: "deployment" | "service" | "ingress") => {
  await page.click(`#tplTabs button[data-f="${f}"]`);
};
const replicas = async (page: P, n: number) => {
  await page.$eval(
    "#repRange",
    (el, v) => {
      if (el instanceof HTMLInputElement) {
        el.value = String(v);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    },
    n,
  );
};
const rendered = async (page: P) => {
  const t = await text(page, "#outView");
  return t;
};
const values = async (page: P) => {
  const t = await text(page, "#valsView");
  return t;
};
const on = async (page: P, sel: string) => {
  const names = await page.$$eval(`${sel} button.on`, (b) => b.map((x) => x.textContent));
  return names;
};

describe("the Helm renderer at its defaults", () => {
  it.concurrent("should render the deployment for dev from the merged values", async () => {
    const page = await viz.given("the page freshly opened, on the dev environment", async () => {
      const p = await open();
      return p;
    });

    await viz.when("the visitor does nothing more");

    await viz.then(
      "the rendered Deployment carries the release name, 1 replica, the 1.0.0 image and 256Mi",
      async () => {
        const out = await rendered(page);
        expect(out).toContain("name: web-api");
        expect(out).toContain("replicas: 1");
        expect(out).toContain('image: "myco/api:1.0.0"');
        expect(out).toContain("memory: 256Mi");
        expect(out).toContain("app: web-api");
        expect(out).not.toContain("{{"); // every template hole was filled
        expect(page.errors).toEqual([]);
      },
    );
  });

  it.concurrent("should show the merged values, with the dev override's host over the base", async () => {
    const page = await viz.given("the defaults", async () => {
      const p = await open();
      return p;
    });

    await viz.when("the visitor does nothing more");

    await viz.then(
      "the effective values show the base repository and the dev host, not the base host",
      async () => {
        const v = await values(page);
        expect(v).toContain("replicaCount: 1");
        expect(v).toContain("repository: myco/api");
        expect(v).toContain("host: api.dev.myco.com");
        expect(v).not.toContain("api.local");
        expect(v).toContain("enabled: true");
        expect(await text(page, "#renderNote")).toBe("helm template");
      },
    );
  });

  it.concurrent("should show the template with its holes and highlight the placeholders and conditions", async () => {
    const page = await viz.given("the defaults, showing the deployment template", async () => {
      const p = await open();
      expect(await text(p, "#tplView")).toContain("replicas: {{ .Values.replicaCount }}");
      return p;
    });

    await viz.when("the ingress tab (which carries an if/else) is chosen", async () => {
      await file(page, "ingress");
    });

    await viz.then(
      "placeholders are marked as values and the if/else/end as control flow",
      async () => {
        expect(await page.$$eval("#tplView .v", (s) => s.length)).toBeGreaterThan(0);
        expect(
          await page.$$eval("#tplView .ctl", (s) =>
            s.map((x) => x.textContent.replaceAll(/\s+/gu, " ").trim()),
          ),
        ).toEqual(["{{- if .Values.ingress.enabled }}", "{{- else }}", "{{- end }}"]);
      },
    );
  });
});

describe("the controls", () => {
  it.concurrent("should put the replica slider's value into spec.replicas, its label and the values", async () => {
    const page = await viz.given("the defaults", async () => {
      const p = await open();
      return p;
    });

    await viz.when("replicaCount is dragged to 5", async () => {
      await replicas(page, 5);
    });

    await viz.then("the label, the Deployment and the merged values all say 5", async () => {
      expect(await text(page, "#repVal")).toBe("5");
      expect(await rendered(page)).toContain("replicas: 5");
      expect(await values(page)).toContain("replicaCount: 5");
    });
  });

  it.concurrent("should put the chosen image tag into the image line", async () => {
    const page = await viz.given("the defaults", async () => {
      const p = await open();
      return p;
    });

    const first = await viz.when("the tag is set to 1.4.2, then to latest", async () => {
      await tag(page, "1.4.2");
      const afterFirst = await rendered(page);
      await tag(page, "latest");
      return afterFirst;
    });

    await viz.then("the image line follows, and only one tag button is on", async () => {
      expect(first).toContain('image: "myco/api:1.4.2"');
      expect(await rendered(page)).toContain('image: "myco/api:latest"');
      expect(await on(page, "#tagSeg")).toEqual(["latest"]);
      expect(await values(page)).toContain("tag: latest");
    });
  });

  it.concurrent("should render the ingress with its host and service port when enabled", async () => {
    const page = await viz.given("the defaults, on the ingress template", async () => {
      const p = await open();
      await file(p, "ingress");
      return p;
    });

    await viz.when("the visitor does nothing more");

    await viz.then("it renders an Ingress for the dev host on the service port 80", async () => {
      const out = await rendered(page);
      expect(out).toContain("kind: Ingress");
      expect(out).toContain("host: api.dev.myco.com");
      expect(out).toContain("port: { number: 80 }");
      expect(out).not.toContain("ingress.enabled=false");
    });
  });

  it.concurrent("should render nothing for the ingress when it is switched off, and say so", async () => {
    const page = await viz.given("the ingress template shown", async () => {
      const p = await open();
      await file(p, "ingress");
      return p;
    });

    await viz.when("ingress.enabled is switched off", async () => {
      await page.click("#ingToggle");
    });

    await viz.then(
      "no Ingress object is rendered, only the explanation, and the note says it was guarded out",
      async () => {
        const out = await rendered(page);
        expect(out).not.toContain("kind: Ingress");
        expect(out).toContain("ingress.enabled=false → Helm renders nothing.");
        expect(await text(page, "#renderNote")).toBe("rendered: (nothing — guarded out)");
        expect(await page.$eval("#ingToggle", (t) => t.classList.contains("on"))).toBe(false);
        expect(await values(page)).toContain("enabled: false");
      },
    );

    await viz.when("it is switched back on", async () => {
      await page.click("#ingToggle");
    });

    await viz.then("the Ingress returns", async () => {
      expect(await rendered(page)).toContain("kind: Ingress");
      expect(await text(page, "#renderNote")).toBe("helm template");
    });
  });

  it.concurrent("should not say the render is empty for other templates when ingress is off", async () => {
    const page = await viz.given(
      "ingress switched off, and the service template shown",
      async () => {
        const p = await open();
        await p.click("#ingToggle");
        await file(p, "service");
        return p;
      },
    );

    await viz.when("the visitor does nothing more");

    await viz.then(
      "the service still renders, on port 80 → 8080, and the note is the plain one",
      async () => {
        const out = await rendered(page);
        expect(out).toContain("kind: Service");
        expect(out).toContain("- port: 80");
        expect(out).toContain("targetPort: 8080");
        expect(await text(page, "#renderNote")).toBe("helm template");
      },
    );
  });

  it.concurrent("should show one template tab at a time", async () => {
    const page = await viz.given("the deployment tab", async () => {
      const p = await open();
      expect(await text(p, "#tplTabs button.on")).toBe("deployment.yaml");
      return p;
    });

    await viz.when("the service tab is chosen", async () => {
      await file(page, "service");
    });

    await viz.then("only it is on, and the template is the Service's", async () => {
      expect(await on(page, "#tplTabs")).toEqual(["service.yaml"]);
      expect(await text(page, "#tplView")).toContain("kind: Service");
      expect(await text(page, "#tplView")).not.toContain("kind: Deployment");
    });
  });
});

describe("the environment override", () => {
  it.concurrent("should move replicas, tag, memory and host together for prod", async () => {
    const page = await viz.given("the defaults", async () => {
      const p = await open();
      return p;
    });

    await viz.when("prod is chosen", async () => {
      await env(page, "prod");
    });

    await viz.then(
      "the slider and tag buttons jump to prod's 4 and 1.4.2, and the Deployment follows, with 1Gi",
      async () => {
        expect(
          await page.$eval("#repRange", (r) => (r instanceof HTMLInputElement ? r.value : "")),
        ).toBe("4");
        expect(await text(page, "#repVal")).toBe("4");
        expect(await on(page, "#tagSeg")).toEqual(["1.4.2"]);
        const out = await rendered(page);
        expect(out).toContain("replicas: 4");
        expect(out).toContain('image: "myco/api:1.4.2"');
        expect(out).toContain("memory: 1Gi");
        expect(await on(page, "#envSeg")).toEqual(["prod"]);
      },
    );

    await viz.when("the ingress template is shown", async () => {
      await file(page, "ingress");
    });

    await viz.then("the ingress host is prod's", async () => {
      expect(await rendered(page)).toContain("host: api.myco.com");
    });
  });

  it.concurrent("should give staging its own replicas, memory and host", async () => {
    const page = await viz.given("the defaults", async () => {
      const p = await open();
      return p;
    });

    await viz.when("staging is chosen", async () => {
      await env(page, "staging");
    });

    await viz.then("it is 2 replicas, 1.4.2, 512Mi, and the staging host", async () => {
      const out = await rendered(page);
      expect(out).toContain("replicas: 2");
      expect(out).toContain('image: "myco/api:1.4.2"');
      expect(out).toContain("memory: 512Mi");
      expect(await values(page)).toContain("host: api.staging.myco.com");
    });
  });

  it.concurrent("should let the controls win over the environment after it is chosen", async () => {
    const page = await viz.given("prod chosen (4 replicas, 1Gi)", async () => {
      const p = await open();
      await env(p, "prod");
      return p;
    });

    await viz.when("the user then drags replicas to 2", async () => {
      await replicas(page, 2);
    });

    await viz.then("replicas are 2 while the rest of prod's override stays (1Gi)", async () => {
      const out = await rendered(page);
      expect(out).toContain("replicas: 2");
      expect(out).toContain("memory: 1Gi");
    });
  });

  it.concurrent("should return to dev's replicas and memory when dev is chosen again", async () => {
    const page = await viz.given("prod chosen", async () => {
      const p = await open();
      await env(p, "prod");
      return p;
    });

    await viz.when("dev is chosen again", async () => {
      await env(page, "dev");
    });

    await viz.then("replicas fall back to dev's 1 and memory to the base 256Mi", async () => {
      const out = await rendered(page);
      expect(out).toContain("replicas: 1");
      expect(out).toContain("memory: 256Mi");
      expect(await values(page)).toContain("host: api.dev.myco.com");
    });
  });
});
