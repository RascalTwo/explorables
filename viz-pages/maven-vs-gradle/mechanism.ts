import { stepper, $ } from "@viz/kit";
import { el, txt, MVN, GRD } from "./svg.js";
import { persist, view } from "./state.js";

/* ══════════════════════════════════════════════════════════════════════
   03 · MECHANISM — fixed lifecycle vs task DAG, four scenarios.
   Node fill = what happened to it. Bar length = wall-clock, to scale.
   ══════════════════════════════════════════════════════════════════ */
const MP = ["validate", "compile", "test", "package", "verify", "install"];
const GT = [
  { id: "compileJava", x: 495, y: 54, w: 178, h: 40 },
  { id: "processResources", x: 690, y: 54, w: 178, h: 40 },
  { id: "classes", x: 592, y: 110, w: 178, h: 40 },
  { id: "jar", x: 495, y: 166, w: 178, h: 40 },
  { id: "compileTestJava", x: 690, y: 166, w: 178, h: 40 },
  { id: "test", x: 690, y: 222, w: 178, h: 40 },
  { id: "build", x: 592, y: 278, w: 178, h: 40 },
];
const GE: [string, string][] = [
  ["compileJava", "classes"],
  ["processResources", "classes"],
  ["classes", "jar"],
  ["classes", "compileTestJava"],
  ["compileTestJava", "test"],
  ["jar", "build"],
  ["test", "build"],
];

const RUN = "run",
  SKIP = "skip",
  CACHE = "cache",
  CONF = "conf",
  IDLE = "idle";
type State = typeof RUN | typeof SKIP | typeof CACHE | typeof CONF | typeof IDLE;
const ST: Record<State, { fill: string; op: number; label: string; dash: string | null }> = {
  [RUN]: { fill: "var(--c5)", op: 1, label: "EXECUTED", dash: null },
  [SKIP]: { fill: "var(--bg)", op: 0.9, label: "UP-TO-DATE", dash: null },
  [CACHE]: { fill: "var(--bg)", op: 0.9, label: "FROM-CACHE", dash: "5 4" },
  [CONF]: { fill: "var(--bg)", op: 0.9, label: "RE-CONFIGURED", dash: null },
  [IDLE]: { fill: "var(--bg)", op: 0.6, label: "NOT RUN", dash: "2 4" },
};
const STROKE: Record<State, string> = {
  [RUN]: "var(--c5)",
  [SKIP]: "var(--faint)",
  [CACHE]: "var(--accent)",
  [CONF]: "var(--warn)",
  [IDLE]: "var(--faint)",
};
const TEXTC: Record<State, string> = {
  [RUN]: "var(--bg)",
  [SKIP]: "var(--faint)",
  [CACHE]: "var(--accent)",
  [CONF]: "var(--warn)",
  [IDLE]: "var(--faint)",
};

interface Step {
  cap: string;
  mt: number;
  gt: number;
  md?: number;
  mvn?: State;
  note?: string;
  g: Record<string, State>;
}
const allRun = Object.fromEntries(GT.map((t): [string, State] => [t.id, RUN]));
const MECH: Step[] = [
  {
    cap: "<b>Cold build, nothing warm, nothing cached.</b> This is the one case where they are close — and Gradle actually pays a little extra here to start its daemon.",
    mt: 100,
    gt: 92,
    md: 90,
    g: { ...allRun },
  },
  {
    cap: "<b>Run it again. You changed nothing.</b> Maven has no memory of the previous run, so it walks the whole lifecycle again. Every Gradle task answers &ldquo;my inputs are byte-identical&rdquo; and is skipped.",
    mt: 100,
    gt: 4,
    md: 45,
    g: Object.fromEntries(GT.map((t): [string, State] => [t.id, SKIP])),
  },
  {
    cap: "<b>You edit one test file.</b> A Maven phase is all-or-nothing, so everything recompiles and every test re-runs. Gradle re-runs only the two tasks downstream of the file you touched.",
    mt: 100,
    gt: 21,
    md: 48,
    g: {
      compileJava: SKIP,
      processResources: SKIP,
      classes: SKIP,
      jar: SKIP,
      compileTestJava: RUN,
      test: RUN,
      build: RUN,
    },
  },
  {
    cap: "<b>A fresh CI checkout against a warm remote cache.</b> Maven starts from zero, because it always does. Gradle downloads the outputs someone else already built rather than building them again.",
    mt: 100,
    gt: 11,
    md: 95,
    g: {
      compileJava: CACHE,
      processResources: CACHE,
      classes: CACHE,
      jar: CACHE,
      compileTestJava: CACHE,
      test: CACHE,
      build: RUN,
    },
  },
  {
    cap: "<b>You edit the build file itself — and this is the one Maven wins outright.</b> Maven re-reads a POM: it is data, so nothing executes. Gradle has to re-run your build logic to find out what the project now is, and your IDE has to sync, which means doing it again through the Tooling API.",
    mt: 3,
    gt: 68,
    md: 3,
    mvn: IDLE,
    note: "measured elsewhere: a 2,000-subproject Kotlin build averaged 8.4 min per IDE sync",
    g: Object.fromEntries(GT.map((t): [string, State] => [t.id, CONF])),
  },
];

const mech = $<SVGSVGElement>("#mech-svg")!;
const BAR_X_M = 130,
  BAR_X_G = 495,
  BAR_SCALE = 2.4,
  BAR_Y = 378;

/** Arrowhead markers, the two column headings and the divider between the columns. */
function drawDefsAndHeaders(): void {
  const defs = el("defs");
  for (const [id, c] of [
    ["mah", "var(--faint)"],
    ["mahc", "var(--c5)"],
  ] as const) {
    const m = el("marker", {
      id,
      viewBox: "0 0 10 10",
      refX: 9,
      refY: 5,
      markerWidth: 5,
      markerHeight: 5,
      orient: "auto-start-reverse",
    });
    m.append(el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: c }));
    defs.append(m);
  }
  mech.append(defs);

  // column headers
  const h1 = el("text", {
    x: 235,
    y: 26,
    "text-anchor": "middle",
    "font-size": 13.5,
    "font-weight": 700,
    fill: MVN,
  });
  h1.append(txt("MAVEN — fixed lifecycle, in order, every time"));
  mech.append(h1);
  const h2 = el("text", {
    x: 680,
    y: 26,
    "text-anchor": "middle",
    "font-size": 13.5,
    "font-weight": 700,
    fill: GRD,
  });
  h2.append(txt("GRADLE — task graph, each node asks first"));
  mech.append(h2);
  mech.append(
    el("line", {
      x1: 440,
      y1: 14,
      x2: 440,
      y2: 440,
      stroke: "var(--border)",
      "stroke-dasharray": "4 6",
    }),
  );
}

/** Maven: the fixed lifecycle, one state for all its phases. */
function drawMavenColumn(s: Step): void {
  // ── Maven: linear chain, always fully executed ──
  const mst = s.mvn ?? RUN; // phases share one state per scenario
  MP.forEach((p, i) => {
    const y = 54 + i * 44,
      x = 130,
      w = 210,
      h = 32;
    const ran = mst === RUN;
    const g = el("g", {
      "data-viz-id": `mvn-phase-${p}`,
      "data-label": `Maven phase ${p} — ${ran ? "EXECUTED" : ST[mst].label}`,
    });
    g.append(
      el("rect", {
        x,
        y,
        width: w,
        height: h,
        rx: 7,
        fill: ran ? MVN : "var(--bg)",
        stroke: ran ? "none" : MVN,
        "stroke-width": 1.4,
        "stroke-dasharray": ran ? null : "2 4",
        opacity: ran ? 0.9 : 0.5,
      }),
    );
    const t = el("text", {
      x: x + w / 2,
      y: y + 21,
      "text-anchor": "middle",
      "font-size": 13,
      "font-weight": 600,
      fill: ran ? "var(--bg)" : MVN,
      opacity: ran ? 1 : 0.75,
      "font-family": "var(--mono)",
    });
    t.append(txt(p));
    g.append(t);
    if (i < MP.length - 1)
      g.append(
        el("line", {
          x1: x + w / 2,
          y1: y + h,
          x2: x + w / 2,
          y2: y + 44,
          stroke: MVN,
          "stroke-width": 2,
          opacity: ran ? 0.7 : 0.25,
          "marker-end": "url(#mah)",
        }),
      );
    mech.append(g);
  });
  const mn = el("text", {
    x: 235,
    y: 336,
    "text-anchor": "middle",
    "font-size": 11.5,
    fill: "var(--faint)",
  });
  mn.append(
    txt(
      mst === RUN
        ? "no node can be skipped — there is nothing to ask"
        : "nothing executes — the POM is data, so it is simply re-read",
    ),
  );
  mech.append(mn);
}

/** Gradle: the task graph, each node in its own state. */
function drawGradleDag(s: Step): void {
  // ── Gradle: DAG, per-node state ──
  const byId = Object.fromEntries(GT.map((t) => [t.id, t]));
  for (const [a, b] of GE) {
    const A = byId[a]!,
      B = byId[b]!;
    const st = s.g[b];
    mech.append(
      el("path", {
        d: `M ${A.x + A.w / 2} ${A.y + A.h} C ${A.x + A.w / 2} ${A.y + A.h + 9}, ${B.x + B.w / 2} ${B.y - 9}, ${B.x + B.w / 2} ${B.y}`,
        fill: "none",
        stroke: st === RUN ? "var(--c5)" : "var(--faint)",
        "stroke-width": 1.6,
        opacity: st === RUN ? 0.8 : 0.4,
        "marker-end": st === RUN ? "url(#mahc)" : "url(#mah)",
      }),
    );
  }
  GT.forEach((t) => {
    const st = s.g[t.id]!,
      k = ST[st];
    const g = el("g", {
      "data-viz-id": `gradle-task-${t.id}`,
      "data-label": `Gradle task ${t.id} — ${k.label}`,
    });
    g.append(
      el("rect", {
        x: t.x,
        y: t.y,
        width: t.w,
        height: t.h,
        rx: 7,
        fill: k.fill,
        stroke: STROKE[st],
        "stroke-width": 1.6,
        "stroke-dasharray": k.dash,
        opacity: k.op,
      }),
    );
    const a = el("text", {
      x: t.x + 11,
      y: t.y + 18,
      "font-size": 12.5,
      "font-weight": 600,
      fill: TEXTC[st],
      "font-family": "var(--mono)",
    });
    a.append(txt(t.id));
    g.append(a);
    const b = el("text", {
      x: t.x + 11,
      y: t.y + 32,
      "font-size": 9,
      "letter-spacing": "0.1em",
      fill: st === RUN ? "var(--bg)" : STROKE[st],
      opacity: 0.9,
    });
    b.append(txt(k.label));
    g.append(b);
    g.append(el("title", {}, [txt(`${t.id}: ${k.label}`)]));
    mech.append(g);
  });
}

/** Wall-clock bars for both builds, drawn to scale. */
function drawTimeBars(s: Step): void {
  // ── wall-clock bars, drawn to scale ──
  const bl = el("text", {
    x: 130,
    y: 360,
    "font-size": 11,
    "letter-spacing": "0.1em",
    fill: "var(--faint)",
  });
  bl.append(txt("WALL-CLOCK, RELATIVE TO A COLD MAVEN BUILD"));
  mech.append(bl);
  for (const [x0, t, col, name] of [
    [BAR_X_M, s.mt, MVN, "Maven"],
    [BAR_X_G, s.gt, GRD, "Gradle"],
  ] as const) {
    const g = el("g", {
      "data-viz-id": `time-${name.toLowerCase()}`,
      "data-label": `${name} relative time ${t}`,
    });
    g.append(
      el("rect", {
        x: x0,
        y: BAR_Y,
        width: 100 * BAR_SCALE,
        height: 22,
        rx: 4,
        fill: "var(--panel-2)",
      }),
    );
    g.append(
      el("rect", {
        x: x0,
        y: BAR_Y,
        width: Math.max(3, t * BAR_SCALE),
        height: 22,
        rx: 4,
        fill: col,
      }),
    );
    const v = el("text", {
      x: x0 + 100 * BAR_SCALE + 10,
      y: BAR_Y + 16,
      "font-size": 13,
      "font-weight": 700,
      fill: col,
    });
    v.append(txt(`${t}`));
    g.append(v);
    const n = el("text", { x: x0, y: BAR_Y + 38, "font-size": 11.5, fill: "var(--muted)" });
    n.append(txt(name));
    g.append(n);
    mech.append(g);
  }
}

/** Where the same Maven build lands once mvnd is holding a warm JVM. */
function drawMvndTick(s: Step): void {
  // Where the same Maven build lands once mvnd is holding a warm JVM. Indicative,
  // not measured — it is here because leaving it out is how Maven gets read as slow.
  if (s.md !== undefined && s.md < s.mt) {
    const mx = BAR_X_M + s.md * BAR_SCALE;
    const g = el("g", {
      "data-viz-id": "time-mvnd",
      "data-label": `Maven with mvnd, indicative ${s.md}`,
    });
    // label sits BELOW the bar — above it collides with the wall-clock caption
    g.append(
      el("line", {
        x1: mx,
        y1: BAR_Y - 3,
        x2: mx,
        y2: BAR_Y + 26,
        stroke: "var(--warn)",
        "stroke-width": 2,
      }),
    );
    g.append(
      el("path", {
        d: `M ${mx - 5} ${BAR_Y + 33} L ${mx + 5} ${BAR_Y + 33} L ${mx} ${BAR_Y + 26} Z`,
        fill: "var(--warn)",
      }),
    );
    const l = el("text", {
      x: mx,
      y: BAR_Y + 45,
      "text-anchor": "middle",
      "font-size": 10,
      "font-weight": 700,
      fill: "var(--warn)",
      "font-family": "var(--mono)",
    });
    l.append(txt(`▲ mvnd ≈${s.md}`));
    g.append(l);
    g.append(
      el("title", {}, [
        txt(`Same Maven build with a warm mvnd daemon — indicative, ~${s.md} vs ${s.mt}`),
      ]),
    );
    mech.append(g);
  }
}

function drawMech() {
  const s = MECH[view.mech]!;
  mech.replaceChildren();
  drawDefsAndHeaders();
  drawMavenColumn(s);
  drawGradleDag(s);
  drawTimeBars(s);
  drawMvndTick(s);
  if (s.note) {
    const n = el("text", { x: 130, y: BAR_Y + 60, "font-size": 10.5, fill: "var(--warn)" });
    n.append(txt(s.note));
    mech.append(n);
  }

  $("#mc")!.textContent = `${view.mech + 1} / ${MECH.length}`;
  $("#mcap")!.innerHTML = s.cap;
  persist();
}

export function initMechanism(): void {
  $("#mech-legend")!.innerHTML =
    (
      [
        ["var(--c5)", "var(--c5)", null, "<b>EXECUTED</b> — actually did the work"],
        ["var(--bg)", "var(--faint)", null, "<b>UP-TO-DATE</b> — inputs unchanged, skipped"],
        ["var(--bg)", "var(--accent)", "3 3", "<b>FROM-CACHE</b> — output pulled, not rebuilt"],
        [
          "var(--bg)",
          "var(--warn)",
          null,
          "<b>RE-CONFIGURED</b> — build logic re-run to learn the project",
        ],
        ["var(--bg)", "var(--faint)", "2 3", "<b>NOT RUN</b> — nothing executed at all"],
      ] as const
    )
      .map(
        ([f, st, d, l]) =>
          `<span><svg width="15" height="15" style="display:inline-block;vertical-align:-3px;width:15px" viewBox="0 0 15 15"><rect x="1" y="3" width="13" height="10" rx="2" fill="${f}" stroke="${st}" stroke-width="1.5" ${d ? `stroke-dasharray="${d}"` : ""}/></svg> ${l}</span>`,
      )
      .join("") +
    `<span style="color:var(--faint)"><b>Bar length</b> = wall-clock, same scale in both columns.</span>` +
    `<span style="color:var(--warn)"><b>▲ mvnd tick</b> = the same Maven build with a warm daemon — indicative, not measured.</span>`;

  const mstep = stepper({
    n: MECH.length,
    hashKey: "mstep",
    onStep: (i: number) => {
      view.mech = i;
      drawMech();
    },
  });
  mstep.go(view.mech);
  $("#mn")!.addEventListener("click", () => {
    mstep.next();
  });
  $("#mp")!.addEventListener("click", () => {
    mstep.prev();
  });
}
