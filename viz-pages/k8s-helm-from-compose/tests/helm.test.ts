import { describe, it, expect } from "bun:test";
import { open, text, type P } from "./helpers.ts";

// The Helm panel renders the chart's templates from values: the base values.yaml, a per-environment override, then the
// three controls (replicaCount, image.tag, ingress.enabled) win last. At the start it is `dev`: 1 replica, tag 1.0.0.

const env = (page: P, e: "dev" | "staging" | "prod") => page.click(`#envSeg button[data-env="${e}"]`);
const tag = (page: P, t: string) => page.click(`#tagSeg button[data-tag="${t}"]`);
const file = (page: P, f: "deployment" | "service" | "ingress") => page.click(`#tplTabs button[data-f="${f}"]`);
const replicas = (page: P, n: number) =>
  page.$eval("#repRange", (el, v) => { (el as HTMLInputElement).value = String(v); el.dispatchEvent(new Event("input", { bubbles: true })); }, n);
const rendered = (page: P) => text(page, "#outView");
const values = (page: P) => text(page, "#valsView");
const on = (page: P, sel: string) => page.$$eval(`${sel} button.on`, (b) => b.map((x) => x.textContent));

describe("the Helm renderer at its defaults", () => {
  it.concurrent("should render the deployment for dev from the merged values", async () => {
    // GIVEN the page freshly opened, on the dev environment
    const page = await open();

    // THEN the rendered Deployment carries the release name, 1 replica, the 1.0.0 image and 256Mi
    const out = await rendered(page);
    expect(out).toContain("name: web-api");
    expect(out).toContain("replicas: 1");
    expect(out).toContain('image: "myco/api:1.0.0"');
    expect(out).toContain("memory: 256Mi");
    expect(out).toContain("app: web-api");
    expect(out).not.toContain("{{"); // every template hole was filled
    expect(page.errors).toEqual([]);
  });

  it.concurrent("should show the merged values, with the dev override's host over the base", async () => {
    // GIVEN the defaults
    const page = await open();

    // THEN the effective values show the base repository and the dev host, not the base host
    const v = await values(page);
    expect(v).toContain("replicaCount: 1");
    expect(v).toContain("repository: myco/api");
    expect(v).toContain("host: api.dev.myco.com");
    expect(v).not.toContain("api.local");
    expect(v).toContain("enabled: true");
    expect(await text(page, "#renderNote")).toBe("helm template");
  });

  it.concurrent("should show the template with its holes and highlight the placeholders and conditions", async () => {
    // GIVEN the defaults, then the ingress tab (which carries an if/else)
    const page = await open();
    expect(await text(page, "#tplView")).toContain("replicas: {{ .Values.replicaCount }}");
    await file(page, "ingress");

    // THEN placeholders are marked as values and the if/else/end as control flow
    expect(await page.$$eval("#tplView .v", (s) => s.length)).toBeGreaterThan(0);
    expect(await page.$$eval("#tplView .ctl", (s) => s.map((x) => x.textContent!.replace(/\s+/g, " ").trim()))).toEqual([
      "{{- if .Values.ingress.enabled }}", "{{- else }}", "{{- end }}",
    ]);
  });
});

describe("the controls", () => {
  it.concurrent("should put the replica slider's value into spec.replicas, its label and the values", async () => {
    // GIVEN the defaults
    const page = await open();

    // WHEN replicaCount is dragged to 5
    await replicas(page, 5);

    // THEN the label, the Deployment and the merged values all say 5
    expect(await text(page, "#repVal")).toBe("5");
    expect(await rendered(page)).toContain("replicas: 5");
    expect(await values(page)).toContain("replicaCount: 5");
  });

  it.concurrent("should put the chosen image tag into the image line", async () => {
    // GIVEN the defaults
    const page = await open();

    // WHEN the tag is set to 1.4.2, then to latest
    await tag(page, "1.4.2");
    const first = await rendered(page);
    await tag(page, "latest");

    // THEN the image line follows, and only one tag button is on
    expect(first).toContain('image: "myco/api:1.4.2"');
    expect(await rendered(page)).toContain('image: "myco/api:latest"');
    expect(await on(page, "#tagSeg")).toEqual(["latest"]);
    expect(await values(page)).toContain("tag: latest");
  });

  it.concurrent("should render the ingress with its host and service port when enabled", async () => {
    // GIVEN the defaults, on the ingress template
    const page = await open();
    await file(page, "ingress");

    // THEN it renders an Ingress for the dev host on the service port 80
    const out = await rendered(page);
    expect(out).toContain("kind: Ingress");
    expect(out).toContain("host: api.dev.myco.com");
    expect(out).toContain("port: { number: 80 }");
    expect(out).not.toContain("ingress.enabled=false");
  });

  it.concurrent("should render nothing for the ingress when it is switched off, and say so", async () => {
    // GIVEN the ingress template shown
    const page = await open();
    await file(page, "ingress");

    // WHEN ingress.enabled is switched off
    await page.click("#ingToggle");

    // THEN no Ingress object is rendered, only the explanation, and the note says it was guarded out
    const out = await rendered(page);
    expect(out).not.toContain("kind: Ingress");
    expect(out).toContain("ingress.enabled=false → Helm renders nothing.");
    expect(await text(page, "#renderNote")).toBe("rendered: (nothing — guarded out)");
    expect(await page.$eval("#ingToggle", (t) => t.classList.contains("on"))).toBe(false);
    expect(await values(page)).toContain("enabled: false");

    // WHEN it is switched back on
    await page.click("#ingToggle");

    // THEN the Ingress returns
    expect(await rendered(page)).toContain("kind: Ingress");
    expect(await text(page, "#renderNote")).toBe("helm template");
  });

  it.concurrent("should not say the render is empty for other templates when ingress is off", async () => {
    // GIVEN ingress switched off, and the service template shown
    const page = await open();
    await page.click("#ingToggle");
    await file(page, "service");

    // THEN the service still renders, on port 80 → 8080, and the note is the plain one
    const out = await rendered(page);
    expect(out).toContain("kind: Service");
    expect(out).toContain("- port: 80");
    expect(out).toContain("targetPort: 8080");
    expect(await text(page, "#renderNote")).toBe("helm template");
  });

  it.concurrent("should show one template tab at a time", async () => {
    // GIVEN the deployment tab
    const page = await open();
    expect(await text(page, "#tplTabs button.on")).toBe("deployment.yaml");

    // WHEN the service tab is chosen
    await file(page, "service");

    // THEN only it is on, and the template is the Service's
    expect(await on(page, "#tplTabs")).toEqual(["service.yaml"]);
    expect(await text(page, "#tplView")).toContain("kind: Service");
    expect(await text(page, "#tplView")).not.toContain("kind: Deployment");
  });
});

describe("the environment override", () => {
  it.concurrent("should move replicas, tag, memory and host together for prod", async () => {
    // GIVEN the defaults
    const page = await open();

    // WHEN prod is chosen
    await env(page, "prod");

    // THEN the slider and tag buttons jump to prod's 4 and 1.4.2, and the Deployment follows, with 1Gi
    expect(await page.$eval("#repRange", (r) => (r as HTMLInputElement).value)).toBe("4");
    expect(await text(page, "#repVal")).toBe("4");
    expect(await on(page, "#tagSeg")).toEqual(["1.4.2"]);
    const out = await rendered(page);
    expect(out).toContain("replicas: 4");
    expect(out).toContain('image: "myco/api:1.4.2"');
    expect(out).toContain("memory: 1Gi");
    expect(await on(page, "#envSeg")).toEqual(["prod"]);

    // AND the ingress host is prod's
    await file(page, "ingress");
    expect(await rendered(page)).toContain("host: api.myco.com");
  });

  it.concurrent("should give staging its own replicas, memory and host", async () => {
    // GIVEN the defaults
    const page = await open();

    // WHEN staging is chosen
    await env(page, "staging");

    // THEN it is 2 replicas, 1.4.2, 512Mi, and the staging host
    const out = await rendered(page);
    expect(out).toContain("replicas: 2");
    expect(out).toContain('image: "myco/api:1.4.2"');
    expect(out).toContain("memory: 512Mi");
    expect(await values(page)).toContain("host: api.staging.myco.com");
  });

  it.concurrent("should let the controls win over the environment after it is chosen", async () => {
    // GIVEN prod chosen (4 replicas, 1Gi)
    const page = await open();
    await env(page, "prod");

    // WHEN the user then drags replicas to 2
    await replicas(page, 2);

    // THEN replicas are 2 while the rest of prod's override stays (1Gi)
    const out = await rendered(page);
    expect(out).toContain("replicas: 2");
    expect(out).toContain("memory: 1Gi");
  });

  it.concurrent("should return to dev's replicas and memory when dev is chosen again", async () => {
    // GIVEN prod chosen
    const page = await open();
    await env(page, "prod");

    // WHEN dev is chosen again
    await env(page, "dev");

    // THEN replicas fall back to dev's 1 and memory to the base 256Mi
    const out = await rendered(page);
    expect(out).toContain("replicas: 1");
    expect(out).toContain("memory: 256Mi");
    expect(await values(page)).toContain("host: api.dev.myco.com");
  });
});
