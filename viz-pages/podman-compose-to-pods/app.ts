import { arrowMarkers } from "@viz/kit";

/* ---------------- service data ---------------- */
const svcs = [
  ["nginx", "nginx:1.27", "TLS + reverse proxy, the front door", "web, api"],
  ["web", "snapvault-web:1.4", "Next.js UI", "api"],
  ["api", "snapvault-api:1.4", "REST API, auth, uploads", "postgres, redis, minio"],
  ["worker ×3", "snapvault-worker:1.4", "Thumbnails / transcode jobs", "redis, minio"],
  ["scheduler", "snapvault-worker:1.4", "Cron beat (cleanup, digests)", "redis"],
  ["postgres", "postgres:16", "Users, albums, metadata", "—"],
  ["redis", "redis:7", "Cache + job queue", "—"],
  ["minio", "minio:latest", "S3-compatible photo blob store", "—"],
] satisfies [string, string, string, string][];
document.querySelector("#svctbl")!.innerHTML = svcs
  .map(
    ([s, i, j, n]) => `<tr style="border-top:1px solid var(--line)">
    <td style="padding:6px 8px"><b style="color:#fff">${s}</b></td>
    <td style="padding:6px 8px"><code style="font-size:11.5px">${i}</code></td>
    <td style="padding:6px 8px;color:#cdd6e0">${j}</td>
    <td style="padding:6px 8px;color:var(--muted)">${n}</td></tr>`,
  )
  .join("");

/* ---------------- ACT 1: topology ---------------- */
(function topo() {
  type Box = {
    x: number;
    y: number;
    w: number;
    h: number;
    t: string;
    s?: string;
    c: "blue" | "good" | "warn" | "faint";
  };
  const W = 900,
    H = 400;
  const N: Record<string, Box> = {
    internet: { x: 24, y: 178, w: 92, h: 48, t: "🌐 Internet", c: "faint" },
    nginx: { x: 160, y: 178, w: 108, h: 54, t: "nginx", s: "reverse proxy", c: "blue" },
    web: { x: 330, y: 88, w: 108, h: 54, t: "web", s: "Next.js UI", c: "blue" },
    api: { x: 330, y: 268, w: 108, h: 54, t: "api", s: "REST API", c: "blue" },
    worker: { x: 520, y: 178, w: 118, h: 54, t: "worker ×3", s: "jobs", c: "good" },
    sched: { x: 520, y: 288, w: 118, h: 50, t: "scheduler", s: "cron beat", c: "good" },
    postgres: { x: 712, y: 64, w: 120, h: 54, t: "postgres", s: "metadata DB", c: "warn" },
    redis: { x: 712, y: 178, w: 120, h: 54, t: "redis", s: "cache + queue", c: "warn" },
    minio: { x: 712, y: 288, w: 120, h: 54, t: "minio", s: "blob store", c: "warn" },
  };
  const col = {
    blue: ["#1b2a3f", "var(--accent)"],
    good: ["#10241a", "var(--good)"],
    warn: ["#241c0c", "var(--warn)"],
    faint: ["#161b22", "var(--faint)"],
  };
  const edges = [
    ["internet", "nginx"],
    ["nginx", "web"],
    ["nginx", "api"],
    ["web", "api"],
    ["api", "postgres"],
    ["api", "redis"],
    ["api", "minio"],
    ["worker", "redis"],
    ["worker", "minio"],
    ["sched", "redis"],
  ] satisfies [string, string][];
  const cx = (n: Box) => n.x + n.w / 2,
    cy = (n: Box) => n.y + n.h / 2;
  function edgePath(a: Box, b: Box) {
    let x1: number, y1: number, x2: number, y2: number;
    if (b.x >= a.x + a.w) {
      x1 = a.x + a.w;
      y1 = cy(a);
      x2 = b.x;
      y2 = cy(b);
    } else if (a.x >= b.x + b.w) {
      x1 = a.x;
      y1 = cy(a);
      x2 = b.x + b.w;
      y2 = cy(b);
    } else {
      x1 = cx(a);
      y1 = b.y > a.y ? a.y + a.h : a.y;
      x2 = cx(b);
      y2 = b.y > a.y ? b.y : b.y + b.h;
    }
    const mx = (x1 + x2) / 2;
    return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
  }
  let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}">${arrowMarkers()}`;
  svg += `<rect x="300" y="36" width="560" height="330" rx="14" fill="none" stroke="var(--line)" stroke-dasharray="5 5"/>`;
  svg += `<text class="m" x="850" y="54" text-anchor="end" font-size="11" fill="var(--faint)">network: backend</text>`;
  svg += `<rect x="148" y="54" width="312" height="290" rx="14" fill="none" stroke="#24405e" stroke-dasharray="5 5"/>`;
  svg += `<text class="m" x="158" y="72" font-size="11" fill="#3d6695">network: frontend</text>`;
  for (const [a, b] of edges) {
    svg += `<path d="${edgePath(N[a]!, N[b]!)}" fill="none" stroke="#3a4658" stroke-width="1.6" marker-end="url(#ah-muted)"/>`;
  }
  for (const k in N) {
    const n = N[k]!;
    const [bg, br] = col[n.c];
    svg += `<g><rect data-viz-id="topo-${k}" data-label="${n.t}" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="9" fill="${bg}" stroke="${br}" stroke-width="1.5"/>`;
    svg += `<text x="${cx(n)}" y="${cy(n) + (n.s ? -3 : 4)}" text-anchor="middle" font-size="14" font-weight="700" fill="#fff">${n.t}</text>`;
    if (n.s)
      svg += `<text class="m" x="${cx(n)}" y="${cy(n) + 13}" text-anchor="middle" font-size="10" fill="var(--muted)">${n.s}</text>`;
    svg += `</g>`;
  }
  svg += `</svg>`;
  document.querySelector("#topowrap")!.innerHTML = svg;
})();

/* ---------------- ACT 1: terminal pain ---------------- */
(function terms() {
  const cmds = [
    [
      "postgres",
      "docker run -d --name postgres \\",
      "--network backend -e POSTGRES_… \\",
      "-v pgdata:/var/lib/… postgres:16",
    ],
    ["redis", "docker run -d --name redis \\", "--network backend \\", "redis:7"],
    [
      "minio",
      "docker run -d --name minio \\",
      "--network backend -e MINIO_… \\",
      "-v blobs:/data minio server /data",
    ],
    [
      "api",
      "# wait for pg health… then:",
      "docker run -d --name api --network \\",
      "backend -e DATABASE_URL=… api:1.4",
    ],
    [
      "worker 1",
      "docker run -d --name worker1 \\",
      "--network backend worker:1.4",
      "# now repeat this ×3 by hand…",
    ],
    ["worker 2", "docker run -d --name worker2 \\", "--network backend worker:1.4", "&nbsp;"],
    ["scheduler", "docker run -d --name sched \\", "--network backend worker:1.4", "beat"],
    [
      "nginx",
      "docker run -d --name nginx -p 443:443 \\",
      "--network frontend --network backend \\",
      "-v ./nginx.conf:… nginx:1.27",
    ],
  ] satisfies [string, ...string[]][];
  const wrap = document.querySelector("#terms")!;
  wrap.innerHTML = cmds
    .map(
      ([t, ...lines], i) => `
      <div class="term" data-viz-id="term-${t}" data-label="${t}">
        <div class="bar"><i style="background:#f85149"></i><i style="background:#d29922"></i><i style="background:#3fb950"></i><span class="t">${t} — terminal ${i + 1}</span></div>
        <div class="body"><span class="pr">$</span> ${lines.map((l) => l.replace("--network", '<span class="fl">--network</span>')).join("<br>")}<span class="cur">▍</span></div>
      </div>`,
    )
    .join("");
  const obs = new IntersectionObserver(
    (es) => {
      es.forEach((e) => {
        if (e.isIntersecting) {
          [...wrap.children].forEach((c, i) => {
            setTimeout(() => c.classList.add("in"), i * 90);
          });
          obs.disconnect();
        }
      });
    },
    { threshold: 0.15 },
  );
  obs.observe(wrap);
})();

/* ---------------- ACT 3: podman-compose command → 2 providers ---------------- */
(function wrapdiag() {
  const W = 1000,
    H = 290;
  let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}">${arrowMarkers()}`;
  const box = (
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    stroke: string,
    id: string,
  ) =>
    `<rect data-viz-id="${id}" x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="1.6"/>`;
  const lbl = (x: number, y: number, t: string, s: string, sub: string) =>
    `<text x="${x}" y="${y}" text-anchor="middle" font-size="${s}" font-weight="700" fill="#fff">${t}</text>` +
    (sub
      ? `<text class="m" x="${x}" y="${y + 16}" text-anchor="middle" font-size="11" fill="var(--muted)">${sub}</text>`
      : "");
  const A = (x1: number, y1: number, x2: number, y2: number, c: string) =>
    `<path d="M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}" fill="none" stroke="${c}" stroke-width="2" marker-end="url(#ah-muted)"/>`;

  // the command (left)
  svg += box(34, 104, 200, 84, "#1c2330", "#c9d4e0", "wd-cmd");
  svg += `<text x="134" y="138" text-anchor="middle" font-size="16.5" font-weight="800" fill="#fff">podman compose</text>`;
  svg += `<text class="m" x="134" y="159" text-anchor="middle" font-size="11" fill="var(--muted)">the command you type (a space)</text>`;
  svg += `<text class="m" x="134" y="175" text-anchor="middle" font-size="10.5" fill="var(--faint)">implements nothing — delegates →</text>`;

  // PATH A lane (top)
  svg += `<text class="m" x="300" y="42" font-size="11" fill="var(--danger)" font-weight="700">PATH A · provider used if installed (default)</text>`;
  svg += box(300, 54, 232, 66, "#2a1213", "var(--danger)", "wd-dc");
  svg += lbl(416, 86, "docker-compose", "14.5", "the real Compose engine");
  svg += box(742, 54, 212, 66, "#1c2330", "var(--danger-line)", "wd-sock");
  svg += lbl(848, 86, "Podman", "14.5", "via Docker API socket");

  // PATH B lane (bottom)
  svg += `<text class="m" x="300" y="180" font-size="11" fill="var(--purple)" font-weight="700">PATH B · fallback — the hyphenated python tool</text>`;
  svg += box(300, 192, 232, 66, "#1d1530", "var(--purple)", "wd-py");
  svg += lbl(416, 224, "podman-compose", "14.5", "separate Python package");
  svg += box(742, 192, 212, 66, "#10241a", "var(--good-line)", "wd-cli");
  svg += lbl(848, 224, "podman CLI", "14.5", "commands, directly");

  // arrows: command → providers
  svg += A(234, 134, 300, 87, "var(--danger)");
  svg += A(234, 162, 300, 225, "var(--purple)");
  // providers → engine
  svg += A(532, 87, 742, 87, "#3a4658");
  svg += A(532, 225, 742, 225, "#3a4658");
  svg += `</svg>`;
  document.querySelector("#wrapwrap")!.innerHTML = svg;
})();

/* ---------------- ACT 4: networking compare ---------------- */
(function netdiag() {
  const W = 900,
    H = 320;
  let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}">${arrowMarkers()}`;
  // LEFT: compose bridge + DNS
  svg += `<text x="225" y="26" text-anchor="middle" font-size="13" font-weight="700" fill="var(--accent)">Compose — bridge + DNS</text>`;
  svg += `<rect x="28" y="40" width="394" height="262" rx="14" fill="#0e1722" stroke="#24405e"/>`;
  svg += `<text class="m" x="225" y="290" text-anchor="middle" font-size="11" fill="#3d6695">bridge network · each service = its own IP</text>`;
  svg += `<line x1="56" y1="200" x2="394" y2="200" stroke="#24405e" stroke-width="2"/>`;
  svg += `<text class="m" x="62" y="216" font-size="10" fill="#3d6695">docker0-style bridge</text>`;
  const svcBox = (x: number, y: number, t: string, sub: string, c: string) =>
    `<rect data-viz-id="net-${t}" x="${x}" y="${y}" width="120" height="46" rx="8" fill="#161b22" stroke="${c}" stroke-width="1.4"/>` +
    `<text x="${x + 60}" y="${y + 21}" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">${t}</text>` +
    `<text class="m" x="${x + 60}" y="${y + 36}" text-anchor="middle" font-size="9.5" fill="var(--muted)">${sub}</text>`;
  svg += svcBox(56, 66, "api", "wants postgres:5432", "var(--accent)");
  svg += svcBox(248, 56, "postgres", ":5432", "var(--warn)");
  svg += svcBox(248, 136, "redis", ":6379", "var(--warn)");
  svg += svcBox(248, 216, "minio", ":9000", "var(--warn)");
  const dns = (y: number) =>
    `<path d="M176,89 C214,89 214,${y} 248,${y}" fill="none" stroke="#3a4658" stroke-width="1.4" marker-end="url(#ah-muted)"/>`;
  svg += dns(79) + dns(159) + dns(239);
  svg += `<text class="m" x="200" y="50" font-size="9.5" fill="var(--accent)">found by DNS name →</text>`;

  // RIGHT: pod shared loopback
  svg += `<text x="680" y="26" text-anchor="middle" font-size="13" font-weight="700" fill="var(--purple)">Pod — one shared loopback</text>`;
  svg += `<rect x="480" y="40" width="392" height="262" rx="14" fill="#150e22" stroke="var(--purple-line)"/>`;
  svg += `<rect data-viz-id="net-infra" x="500" y="234" width="352" height="50" rx="9" fill="#1d1530" stroke="var(--purple)" stroke-dasharray="4 4"/>`;
  svg += `<text x="676" y="255" text-anchor="middle" font-size="12" font-weight="700" fill="var(--purple)">infra container (holds the shared netns)</text>`;
  svg += `<text class="m" x="676" y="271" text-anchor="middle" font-size="10" fill="#a98cd0">every container joins it → all see 127.0.0.1</text>`;
  svg += `<line x1="510" y1="205" x2="842" y2="205" stroke="var(--purple)" stroke-width="2"/>`;
  svg += `<text class="m" x="516" y="200" font-size="10" fill="#a98cd0">127.0.0.1 (lo) — ONE port space</text>`;
  const podBox = (x: number, t: string, sub: string, c: string) => {
    const y = 76;
    return (
      `<rect data-viz-id="net-pod-${t}" x="${x}" y="${y}" width="98" height="46" rx="8" fill="#161b22" stroke="${c}" stroke-width="1.4"/>` +
      `<text x="${x + 49}" y="${y + 21}" text-anchor="middle" font-size="12.5" font-weight="700" fill="#fff">${t}</text>` +
      `<text class="m" x="${x + 49}" y="${y + 36}" text-anchor="middle" font-size="9" fill="var(--muted)">${sub}</text>` +
      `<line x1="${x + 49}" y1="${y + 46}" x2="${x + 49}" y2="205" stroke="#4b3a73" stroke-width="1.4"/>`
    );
  };
  svg += podBox(508, "api", "→127.0.0.1", "var(--accent)");
  svg += podBox(625, "postgres", ":5432", "var(--warn)");
  svg += podBox(742, "redis", ":6379", "var(--warn)");
  svg += `</svg>`;
  document.querySelector("#netwrap")!.innerHTML = svg;
})();

/* ---------------- ACT 2: OCI shared-foundation stack ---------------- */
(function ociStack() {
  const W = 1000,
    H = 362;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}">`;
  const box = (
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    stroke: string,
    id: string,
    sw?: number,
  ) =>
    `<rect data-viz-id="${id}" x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="${sw ?? 1.5}"/>`;

  // ---- tool-specific pillars (top) ----
  s += box(180, 52, 270, 94, "#13243a", "var(--accent)", "oci-docker");
  s += `<text class="m" x="200" y="74" font-size="11" font-weight="700" fill="var(--accent)">DOCKER</text>`;
  s += `<text x="315" y="103" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">Docker Compose</text>`;
  s += `<text class="m" x="315" y="124" text-anchor="middle" font-size="10.5" fill="var(--muted)">the compose format Docker coined</text>`;

  s += box(550, 52, 320, 94, "#1d1530", "var(--purple)", "oci-podman");
  s += `<text class="m" x="570" y="74" font-size="11" font-weight="700" fill="var(--purple)">PODMAN</text>`;
  s += `<text x="710" y="100" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">podman compose · pods · Quadlet</text>`;
  s += `<text class="m" x="710" y="124" text-anchor="middle" font-size="10.5" fill="var(--muted)">a thin wrapper + native pods / Quadlet</text>`;

  // divider + labels
  s += `<text class="m" x="500" y="172" text-anchor="middle" font-size="11.5" fill="var(--faint)">▲ tool-specific — the ONLY layer that differs</text>`;
  s += `<line x1="30" y1="186" x2="970" y2="186" stroke="var(--line)" stroke-dasharray="6 5"/>`;
  s += `<text class="m" x="500" y="205" text-anchor="middle" font-size="11.5" fill="var(--good)">▼ shared open standard — identical &amp; portable</text>`;

  // connectors (both pillars rest on the foundation)
  s += `<line x1="315" y1="146" x2="315" y2="218" stroke="#2a3340" stroke-width="1.4"/>`;
  s += `<line x1="710" y1="146" x2="710" y2="218" stroke="#2a3340" stroke-width="1.4"/>`;

  // ---- shared OCI foundation (bottom) ----
  s += box(30, 216, 940, 134, "#0f2417", "var(--good-line)", "oci-foundation", 1.8);
  s += `<text x="48" y="240" font-size="15" font-weight="800" fill="var(--good)">OCI — Open Container Initiative</text>`;
  s += `<text class="m" x="48" y="257" font-size="10.5" fill="var(--muted)">open standard since 2015 · Linux Foundation · Docker donated runc + the image format</text>`;
  const comp = (x: number, t: string, a: string, b: string) =>
    box(x, 270, 288, 68, "#0a1c12", "var(--good-line)", "oci-" + t.replaceAll(/\W/gu, ""), 1.2) +
    `<text x="${x + 16}" y="294" font-size="12.5" font-weight="700" fill="#fff">${t}</text>` +
    `<text class="m" x="${x + 16}" y="312" font-size="10" fill="var(--muted)">${a}</text>` +
    `<text class="m" x="${x + 16}" y="327" font-size="10" fill="#5fcf86">${b}</text>`;
  s += comp(48, "Image Spec", "the image format", "a Docker image IS an OCI image");
  s += comp(356, "Runtime Spec", "runc / crun", "unpacks &amp; runs the container");
  s += comp(664, "Distribution Spec", "registries · push / pull", "Docker Hub · ghcr.io · quay.io");
  s += `</svg>`;
  document.querySelector("#ociwrap")!.innerHTML = s;
})();

/* ---------------- nav: scrollspy ---------------- */
const tabs = [...document.querySelectorAll<HTMLElement>(".tab")];
tabs.forEach((t) =>
  t.addEventListener("click", () => {
    document
      .querySelector(`#${t.dataset["go"]}`)!
      .scrollIntoView({ behavior: "smooth", block: "start" });
  }),
);
const acts = tabs.map((t) => document.querySelector(`#${t.dataset["go"]}`)!);
const spy = new IntersectionObserver(
  (es) => {
    es.forEach((e) => {
      if (e.isIntersecting) {
        const id = e.target.id;
        tabs.forEach((t) => {
          t.classList.toggle("active", t.dataset["go"] === id);
        });
      }
    });
  },
  { rootMargin: "-45% 0px -50% 0px" },
);
acts.forEach((a) => spy.observe(a));
