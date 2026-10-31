import { $, esc } from "@viz/kit";
import { el, txt, MVN, GRD } from "./svg.js";
import { drawBoard } from "./scoreboard.js";
import { initMechanism } from "./mechanism.js";

/* ══════════════════════════════════════════════════════════════════════
   02 · ROOT CAUSE — one property, six consequences, mirrored.
   Left face = build file is data. Right face = build file is a program.
   ══════════════════════════════════════════════════════════════════ */
interface Coin {
  k: string;
  win: "m" | "g";
  m: string;
  g: string;
  d: string;
}
const COIN: Coin[] = [
  {
    k: "Reading it",
    win: "m",
    m: "static tools parse it",
    g: "tooling must execute it",
    d: "To know a Maven project's dependency graph you read a file. To know a Gradle project's you run its build logic. That is the same fact behind instant re-import, behind SBOM/Dependabot support, and behind the 8.4-minute IDE sync.",
  },
  {
    k: "Changing it",
    win: "g",
    m: "custom logic means a plugin artifact",
    g: "four lines in the script",
    d: "Data can't express behaviour, so Maven makes you leave the file and publish a Mojo. A program can, so Gradle lets you write it inline — which is the single most-cited reason people prefer it.",
  },
  {
    k: "Drift over years",
    win: "m",
    m: "cannot accumulate logic",
    g: "accumulates logic",
    d: "The exact property that makes Gradle extensible makes it drift. After five years and four teams a pom.xml is still a pom.xml; a build.gradle.kts is a small unowned codebase.",
  },
  {
    k: "Between two runs",
    win: "g",
    m: "no memory — redoes everything",
    g: "task graph, hashed inputs, cache",
    d: "A declarative lifecycle has nowhere to record what it already did. A program can model tasks as nodes with inputs and outputs, and skip the ones that haven't changed. §03 draws this.",
  },
  {
    k: "Upgrading",
    win: "m",
    m: "a schema can evolve compatibly",
    g: "API changes break plugins",
    d: "You can add elements to a format without invalidating old files. You cannot delete methods from an API without breaking every plugin that called them — which is what Gradle 9 did.",
  },
  {
    k: "Saying things",
    win: "g",
    m: "verbose, no expressions",
    g: "a whole language, concise",
    d: "35 lines against 62 for the same project. XML has no conditionals, so Maven smuggles them in through profiles; Gradle just has an if statement.",
  },
];
let coinSel = -1;
const RX_M = 372,
  RX_G = 528,
  ROW_Y0 = 150,
  ROW_P = 44;
const rsv = $<SVGSVGElement>("#root-svg")!;

function drawRoot() {
  rsv.replaceChildren();
  const defs = el("defs");
  for (const [id, c] of [
    ["rtm", MVN],
    ["rtg", GRD],
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
  rsv.append(defs);

  // the one property, splitting
  const box = (
    x: number,
    y: number,
    w: number,
    h: number,
    txt2: string,
    col: string,
    mono?: boolean,
  ) => {
    rsv.append(
      el("rect", {
        x,
        y,
        width: w,
        height: h,
        rx: 8,
        fill: "var(--panel)",
        stroke: col,
        "stroke-width": 1.6,
      }),
    );
    const t = el("text", {
      x: x + w / 2,
      y: y + h / 2 + 5,
      "text-anchor": "middle",
      "font-size": 13,
      "font-weight": 700,
      fill: col,
      "font-family": mono ? "var(--mono)" : "var(--sans)",
    });
    t.append(txt(txt2));
    rsv.append(t);
  };
  box(360, 14, 180, 34, "the build file is…", "var(--border)");
  rsv.append(
    el("path", {
      d: "M 400 48 C 400 68, 250 62, 250 80",
      fill: "none",
      stroke: MVN,
      "stroke-width": 1.8,
      opacity: 0.7,
      "marker-end": "url(#rtm)",
    }),
  );
  rsv.append(
    el("path", {
      d: "M 500 48 C 500 68, 650 62, 650 80",
      fill: "none",
      stroke: GRD,
      "stroke-width": 1.8,
      opacity: 0.7,
      "marker-end": "url(#rtg)",
    }),
  );
  box(160, 82, 180, 34, "DATA", MVN, true);
  box(560, 82, 180, 34, "A PROGRAM", GRD, true);
  for (const [x, t2, col] of [
    [250, "pom.xml — you parse it", MVN],
    [650, "build.gradle — you run it", GRD],
  ] as const) {
    const e = el("text", {
      x,
      y: 132,
      "text-anchor": "middle",
      "font-size": 10.5,
      fill: col,
      opacity: 0.75,
    });
    e.append(txt(t2));
    rsv.append(e);
  }

  COIN.forEach((c, i) => {
    const y = ROW_Y0 + i * ROW_P,
      sel = i === coinSel;
    const g = el("g", {
      class: "row",
      "data-viz-id": `coin-${i}`,
      "data-label": `${c.k}: Maven "${c.m}" vs Gradle "${c.g}" — ${c.win === "m" ? "Maven" : "Gradle"} wins`,
    });

    if (sel)
      g.append(
        el("rect", {
          x: 8,
          y: y - 17,
          width: 884,
          height: 34,
          rx: 8,
          fill: "var(--panel)",
          stroke: "var(--border)",
        }),
      );

    // the coin's edge — a hairline joining the two faces
    g.append(
      el("line", {
        x1: RX_M + 6,
        y1: y,
        x2: RX_G - 6,
        y2: y,
        stroke: "var(--border)",
        "stroke-dasharray": "2 4",
      }),
    );
    const k = el("text", {
      x: 450,
      y: y + 4,
      "text-anchor": "middle",
      "font-size": 10,
      "letter-spacing": "0.08em",
      fill: sel ? "var(--text)" : "var(--faint)",
      "font-family": "var(--mono)",
    });
    k.append(txt(c.k.toUpperCase()));
    g.append(k);
    // mask the dashes behind the centre label
    g.insertBefore(
      el("rect", {
        x: 390,
        y: y - 9,
        width: 120,
        height: 18,
        fill: sel ? "var(--panel)" : "var(--bg)",
      }),
      k,
    );

    for (const [side, x, anchor] of [
      ["m", RX_M, "end", "◀"],
      ["g", RX_G, "start", "▶"],
    ] as const) {
      const wins = c.win === side,
        col = side === "m" ? MVN : GRD;
      const t = el("text", {
        x,
        y: y + 4,
        "text-anchor": anchor,
        "font-size": 12.5,
        "font-weight": wins ? 700 : 500,
        fill: wins ? col : "var(--faint)",
        opacity: wins ? 1 : 0.8,
      });
      t.append(txt(wins ? `▲ ${c[side]}` : `▽ ${c[side]}`));
      g.append(t);
    }

    const hit = el("rect", {
      x: 0,
      y: y - 20,
      width: 900,
      height: 40,
      fill: "transparent",
      class: "hit",
    });
    hit.append(
      el("title", {}, [txt(`${c.k} — ${c.win === "m" ? "Maven" : "Gradle"} wins this one`)]),
    );
    hit.addEventListener("click", () => {
      coinSel = coinSel === i ? -1 : i;
      drawRoot();
    });
    g.append(hit);
    rsv.append(g);
  });

  const tally = el("text", {
    x: 450,
    y: 412,
    "text-anchor": "middle",
    "font-size": 11.5,
    fill: "var(--muted)",
  });
  tally.append(txt("▲ = the winning face. Three each. Same coin, six times."));
  rsv.append(tally);

  $("#root-detail")!.innerHTML =
    coinSel < 0
      ? `<p style="margin:0;color:var(--faint)">Click any row. Each one is a single property seen from two sides &mdash; there is no version of Gradle that keeps the extensibility and loses the drift, because they are the same sentence.</p>`
      : `<div class="dh"><div class="dt">${esc(COIN[coinSel]!.k)}</div><div class="dscore">${COIN[coinSel]!.win === "m" ? "Maven" : "Gradle"} takes this face</div></div>
       <p style="margin:0;color:var(--muted)">${COIN[coinSel]!.d}</p>`;
}

initMechanism();

/* ══════════════════════════════════════════════════════════════════════
   04 · BENCHMARKS — Gradle's own multipliers, log scale.
   ══════════════════════════════════════════════════════════════════ */
type ScenId = "clean" | "inc" | "cache";
type Bench = { name: string; sub: string } & Record<ScenId, [number, string] | null>;
const SCEN: { id: ScenId; label: string; col: string }[] = [
  { id: "clean", label: "clean build", col: "var(--c7)" },
  { id: "inc", label: "incremental change", col: "var(--c5)" },
  { id: "cache", label: "with build cache", col: "var(--c4)" },
];
const BENCH: Bench[] = [
  {
    name: "Single library",
    sub: "commons-lang3",
    clean: [1.7, "1.7×"],
    inc: null,
    cache: [30, "up to 30×"],
  },
  {
    name: "10 modules",
    sub: "small multi-project",
    clean: [2.5, "2–3×"],
    inc: [7, "~7×"],
    cache: [14, "up to 14×"],
  },
  {
    name: "100 modules",
    sub: "medium multi-project",
    clean: [4.5, "4–5×"],
    inc: [40, "~40×"],
    cache: [13, "up to 13×"],
  },
  {
    name: "500 modules",
    sub: "large multi-project",
    clean: [6.5, "3–10×"],
    inc: [85, "~85×"],
    cache: [13, "up to 13×"],
  },
  {
    name: "50,000 source files",
    sub: "one monolith",
    clean: [2.5, "2–3×"],
    inc: [7, "~7×"],
    cache: [3, "up to 3×"],
  },
];
const BX0 = 220,
  BW = 620,
  bx = (v: number) => BX0 + (Math.log10(v) / 2) * BW;
const on = new Set<string>(SCEN.map((s) => s.id));

const brow = $("#bench-row")!;
SCEN.forEach((s) => {
  const b = document.createElement("button");
  b.className = "ctl";
  b.type = "button";
  b.dataset["vizId"] = `scen-${s.id}`;
  b.dataset["label"] = s.label;
  b.innerHTML = `<span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${s.col};margin-right:7px;vertical-align:0"></span>${s.label}`;
  b.addEventListener("click", () => {
    if (on.has(s.id)) on.delete(s.id);
    else on.add(s.id);
    drawBench();
  });
  brow.append(b);
});

const bench = $<SVGSVGElement>("#bench-svg")!;
function drawBench() {
  [...brow.children].forEach((b, i) => b.setAttribute("aria-pressed", String(on.has(SCEN[i]!.id))));
  bench.replaceChildren();
  for (const v of [1, 2, 5, 10, 20, 50, 100]) {
    const x = bx(v);
    bench.append(
      el("line", {
        x1: x,
        y1: 34,
        x2: x,
        y2: 370,
        stroke: "var(--border)",
        "stroke-dasharray": v === 1 ? null : "3 5",
        "stroke-width": v === 1 ? 1.5 : 1,
      }),
    );
    const t = el("text", { x, y: 26, "text-anchor": "middle", class: "tick" });
    t.append(txt(v === 1 ? "1× (parity)" : v + "×"));
    bench.append(t);
  }
  const ax = el("text", { x: BX0 + BW / 2, y: 392, "text-anchor": "middle", class: "tick" });
  ax.append(
    txt(
      "claimed Gradle speed-up vs Maven — logarithmic axis, each gridline is a different order of change",
    ),
  );
  bench.append(ax);

  BENCH.forEach((row, i) => {
    const y0 = 50 + i * 64;
    const active = SCEN.filter((s) => on.has(s.id));
    const n = el("text", {
      x: 208,
      y: y0 + 24,
      "text-anchor": "end",
      "font-size": 13,
      "font-weight": 600,
      fill: "var(--text)",
    });
    n.append(txt(row.name));
    bench.append(n);
    const sb = el("text", {
      x: 208,
      y: y0 + 40,
      "text-anchor": "end",
      "font-size": 10.5,
      fill: "var(--faint)",
    });
    sb.append(txt(row.sub));
    bench.append(sb);

    active.forEach((s, j) => {
      const d = row[s.id],
        y = y0 + j * 18;
      if (!d) {
        const t = el("text", {
          x: BX0 + 8,
          y: y + 12,
          "font-size": 10.5,
          fill: "var(--faint)",
          "font-style": "italic",
        });
        t.append(txt("not published for this project size"));
        bench.append(t);
        return;
      }
      const g = el("g", {
        "data-viz-id": `bench-${i}-${s.id}`,
        "data-label": `${row.name}, ${s.label}: ${d[1]} faster`,
      });
      g.append(
        el("rect", {
          x: BX0,
          y,
          width: Math.max(2, bx(d[0]) - BX0),
          height: 15,
          rx: 3,
          fill: s.col,
          opacity: 0.88,
        }),
      );
      const v = el("text", {
        x: bx(d[0]) + 8,
        y: y + 12,
        "font-size": 11.5,
        "font-weight": 700,
        fill: s.col,
      });
      v.append(txt(d[1]));
      g.append(v);
      g.append(el("title", {}, [txt(`${row.name} · ${s.label} · ${d[1]} faster than Maven`)]));
      bench.append(g);
    });
    if (active.length === 0) {
      const t = el("text", { x: BX0 + 8, y: y0 + 22, "font-size": 11.5, fill: "var(--faint)" });
      t.append(txt("no scenario selected"));
      bench.append(t);
    }
  });
}

/* ══════════════════════════════════════════════════════════════════════
   06 · ROUTER — first yes wins.
   ══════════════════════════════════════════════════════════════════ */
const TAGS = {
  hard: ["hard constraint", "var(--danger)"],
  soft: ["preference", "var(--faint)"],
  money: ["cost, not capability", "var(--warn)"],
} as const;
interface QItem {
  q: string;
  tag: keyof typeof TAGS;
  t: string;
  side: "g" | "m";
  d: string;
}
const Q: QItem[] = [
  {
    q: "Are you building an Android app?",
    tag: "hard",
    t: "Gradle. This is not a decision.",
    side: "g",
    d: "Not a convention — a dependency. The Android-specific work (manifest and resource merging, dexing, R8 shrinking, the build-variant matrix, AAB packaging and signing) is performed <i>by</i> the Android Gradle Plugin, which Google ships for Gradle and only Gradle. Dropping Gradle means reimplementing Google's toolchain. The old community android-maven-plugin never tracked the platform through App Bundles, R8 or Compose.",
  },
  {
    q: "Do you target anything that isn't the JVM — Kotlin/Native, JS, wasm, iOS?",
    tag: "hard",
    t: "Gradle.",
    side: "g",
    d: "The toolchain that compiles to those targets ships as a Gradle plugin. Maven has never seriously competed here and is not trying to. Kotlin Multiplatform in particular is Gradle-only in practice.",
  },
  {
    q: "Are your build agents stuck on a JVM below Java 17, and you can't change that?",
    tag: "hard",
    t: "Maven — on a version still being maintained.",
    side: "m",
    d: "<b>Careful: there are two Java versions in play.</b> The JVM that <i>runs the build tool</i>, and the Java you <i>compile against</i>. Both tools decouple these with toolchains, so needing to emit Java 8 bytecode constrains neither — Gradle 9 runs on 17 and happily targets 8.<br><br>This only bites on the first one. Gradle 9 <b>will not start</b> below Java 17. Gradle 8.x still runs on Java 8 but has been warning for years that this ends, so it is a frozen path. Maven 3.9.16 runs on Java 8 and shipped three months ago.",
  },
  {
    q: "Must your dependency graph be derivable without executing build code?",
    tag: "hard",
    t: "Maven.",
    side: "m",
    d: "The property is <b>static readability</b>, not offline-ness — both tools work fine offline. To know a Maven project's dependencies you parse a file; to know a Gradle project's you run its build logic. Where &ldquo;we do not execute untrusted code to enumerate our dependencies&rdquo; is a written control — regulated finance, defence, parts of healthcare — that is decisive. It is also why SBOM, licence-scanning and Renovate tooling has an easier time with Maven generally.",
  },
  {
    q: "Is there an existing Maven build that already works?",
    tag: "soft",
    t: "Stay on Maven — but fix the speed first.",
    side: "m",
    d: "Adopt <b>mvnd</b> and the <b>maven-build-cache-extension</b> before you consider migrating. That is an afternoon; a Gradle migration on a real codebase is weeks, and it re-derives build logic that is currently boring and correct. Most teams who believe Maven is slow have never run the daemon. Migrate only if you tried the afternoon and it genuinely wasn't enough.",
  },
  {
    q: "Is CI wall-clock a budget line — 100+ modules, or builds people sit and wait on?",
    tag: "money",
    t: "Gradle, with a remote build cache.",
    side: "g",
    d: "This is economic rather than absolute: both tools <i>can</i> do it, but remote caching is Gradle's architecture and Maven's opt-in extension. This is the exact shape the benchmarks in §04 were written about and the one case where the big multipliers are honestly earned. Budget for the upgrade tax on every Gradle major, and for Develocity if you want the best of it.",
  },
  {
    q: "Publishing an open-source library, or running a low-churn estate?",
    tag: "soft",
    t: "Maven.",
    side: "m",
    d: "Drive-by contributors already know it, downstream consumers can read your build without running it, and upgrades will not interrupt you for a decade. Build speed you will never notice is not worth trading for that.",
  },
];
const DEFAULT_T = {
  t: "Nothing forces you. This is tabs-versus-spaces.",
  side: "m",
  d: "You cleared all four hard constraints and both economic ones, which puts you with the majority of JVM projects. Either tool will do this job. If you want a tiebreak: take the one 67% of the ecosystem already knows and whose upgrades are non-events — but that is a preference, and anyone who tells you it is an engineering decision is selling something. Revisit only if CI time becomes something you actually complain about.",
};

const QY = [20, 108, 196, 284, 372, 460, 548],
  QX = 40,
  QW = 340,
  QH = 54,
  TX = 480,
  TW = 380;
let routeAns: string[] = [];
const rsvg = $<SVGSVGElement>("#router-svg")!;

interface BoxOpts {
  fill: string;
  stroke: string;
  dash?: string | null;
  text: string;
  sub?: string;
  tcol: string;
  bold: boolean;
}
function nodeBox(
  g: Element,
  x: number,
  y: number,
  w: number,
  h: number,
  { fill, stroke, dash, text, sub, tcol, bold }: BoxOpts,
) {
  g.append(
    el("rect", {
      x,
      y,
      width: w,
      height: h,
      rx: 9,
      fill,
      stroke,
      "stroke-width": 1.6,
      "stroke-dasharray": dash,
    }),
  );
  const t = el("text", {
    x: x + 14,
    y: sub ? y + 22 : y + h / 2 + 5,
    "font-size": 12.5,
    "font-weight": bold ? 700 : 500,
    fill: tcol,
  });
  t.append(txt(text));
  g.append(t);
  if (sub) {
    const s = el("text", { x: x + 14, y: y + 39, "font-size": 10.5, fill: "var(--faint)" });
    s.append(txt(sub));
    g.append(s);
  }
}

function setAnswer(i: number, key: "y" | "n") {
  routeAns[i] = key;
  routeAns.length = i + 1;
  drawRouter();
}

/** The YES / NO buttons on the live question. */
function addAnswerButtons(g: Element, q: QItem, i: number, y: number) {
  for (const [lbl, key, px, py] of [
    ["YES →", "y", QX + QW + 6, y + QH / 2 - 11],
    ["NO ↓", "n", QX + QW / 2 - 26, y + QH + 9],
  ] as const) {
    const b = el("g", {
      class: "hit",
      "data-viz-id": `q-${i}-${key}`,
      "data-label": `${q.q} → ${key === "y" ? "yes" : "no"}`,
    });
    b.append(
      el("rect", {
        x: px,
        y: py,
        width: 52,
        height: 22,
        rx: 11,
        fill: "var(--accent)",
        opacity: 0.92,
      }),
    );
    const t = el("text", {
      x: px + 26,
      y: py + 15,
      "text-anchor": "middle",
      "font-size": 10.5,
      "font-weight": 700,
      fill: "var(--bg)",
    });
    t.append(txt(lbl));
    b.append(t);
    b.addEventListener("click", () => {
      setAnswer(i, key);
    });
    g.append(b);
  }
}

/** This question's outcome box on the right. */
function drawTerminal(q: QItem, i: number, y: number) {
  // terminal for this question's yes
  const tg = el("g", { "data-viz-id": `t-${i}`, "data-label": `Outcome: ${q.t}` });
  const picked = routeAns[i] === "y";
  nodeBox(tg, TX, y, TW, QH, {
    fill: picked
      ? q.side === "g"
        ? "rgba(78,201,176,0.16)"
        : "rgba(188,140,255,0.16)"
      : "var(--panel)",
    stroke: picked ? (q.side === "g" ? GRD : MVN) : "var(--border)",
    dash: picked ? null : "4 4",
    text: q.t,
    tcol: picked ? (q.side === "g" ? GRD : MVN) : "var(--faint)",
    bold: picked,
  });
  const [tl, tc] = TAGS[q.tag];
  const tb = el("text", {
    x: TX + TW - 12,
    y: y + 17,
    "text-anchor": "end",
    "font-size": 8.5,
    "letter-spacing": "0.1em",
    fill: tc,
    "font-family": "var(--mono)",
    opacity: picked ? 1 : 0.7,
  });
  tb.append(txt(tl.toUpperCase()));
  tg.append(tb);
  tg.setAttribute("opacity", String(picked ? 1 : 0.5));
  rsvg.append(tg);
}

function drawRouter() {
  rsvg.replaceChildren();
  const defs = el("defs");
  for (const [id, c] of [
    ["rah", "var(--faint)"],
    ["rahg", GRD],
    ["rahm", MVN],
  ] as const) {
    const m = el("marker", {
      id,
      viewBox: "0 0 10 10",
      refX: 9,
      refY: 5,
      markerWidth: 5.5,
      markerHeight: 5.5,
      orient: "auto-start-reverse",
    });
    m.append(el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: c }));
    defs.append(m);
  }
  rsvg.append(defs);

  const active = routeAns.length; // index of the live question
  const yesAt = routeAns.indexOf("y"); // -1 if none
  const done = yesAt >= 0 || routeAns.length === Q.length;
  const chosen = yesAt >= 0 ? Q[yesAt] : routeAns.length === Q.length ? DEFAULT_T : null;

  Q.forEach((q, i) => {
    const y = QY[i]!,
      live = i === active && !done,
      past = i < active;
    const g = el("g", { "data-viz-id": `q-${i}`, "data-label": `Question ${i + 1}: ${q.q}` });

    // yes edge → terminal
    const yes = routeAns[i] === "y";
    g.append(
      el("line", {
        x1: QX + QW,
        y1: y + QH / 2,
        x2: TX,
        y2: y + QH / 2,
        stroke: yes ? (q.side === "g" ? GRD : MVN) : "var(--border)",
        "stroke-width": yes ? 2.4 : 1.4,
        "marker-end": yes ? (q.side === "g" ? "url(#rahg)" : "url(#rahm)") : "url(#rah)",
        opacity: yes ? 1 : 0.4,
      }),
    );

    // no edge → next question
    if (i < Q.length - 1)
      g.append(
        el("line", {
          x1: QX + QW / 2,
          y1: y + QH,
          x2: QX + QW / 2,
          y2: QY[i + 1]!,
          stroke: routeAns[i] === "n" ? "var(--text)" : "var(--border)",
          "stroke-width": routeAns[i] === "n" ? 2.2 : 1.4,
          "marker-end": "url(#rah)",
          opacity: routeAns[i] === "n" ? 0.9 : 0.4,
        }),
      );

    nodeBox(g, QX, y, QW, QH, {
      fill: live ? "var(--panel-2)" : "var(--panel)",
      stroke: live ? "var(--accent)" : "var(--border)",
      text: `${i + 1}.`,
      tcol: live ? "var(--accent)" : "var(--faint)",
      bold: true,
    });
    const wrap = el("foreignObject", { x: QX + 34, y: y + 6, width: QW - 44, height: QH - 12 });
    const div = document.createElement("div");
    div.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    div.style.cssText = `font:500 12.5px/1.3 var(--sans);color:${live ? "var(--text)" : past ? "var(--faint)" : "var(--muted)"};display:flex;align-items:center;height:100%`;
    div.textContent = q.q;
    wrap.append(div);
    g.append(wrap);

    if (live) addAnswerButtons(g, q, i, y);
    rsvg.append(g);

    drawTerminal(q, i, y);
  });

  // fall-through terminal
  const fell = routeAns.length === Q.length && yesAt < 0;
  const fg = el("g", { "data-viz-id": "t-default", "data-label": `Outcome: ${DEFAULT_T.t}` });
  fg.append(
    el("path", {
      d: `M ${QX + QW / 2} ${QY[Q.length - 1]! + QH} L ${QX + QW / 2} 663 L ${TX} 663`,
      fill: "none",
      stroke: fell ? "var(--text)" : "var(--border)",
      "stroke-width": fell ? 2.2 : 1.4,
      "marker-end": fell ? "url(#rahm)" : "url(#rah)",
      opacity: fell ? 0.9 : 0.4,
    }),
  );
  nodeBox(fg, TX, 636, TW, QH, {
    fill: fell ? "rgba(188,140,255,0.16)" : "var(--panel)",
    stroke: fell ? MVN : "var(--border)",
    dash: fell ? null : "4 4",
    text: DEFAULT_T.t,
    tcol: fell ? MVN : "var(--faint)",
    bold: fell,
  });
  const ft = el("text", {
    x: TX + TW - 12,
    y: 653,
    "text-anchor": "end",
    "font-size": 8.5,
    "letter-spacing": "0.1em",
    fill: "var(--faint)",
    "font-family": "var(--mono)",
  });
  ft.append(txt("NO CONSTRAINT — TASTE"));
  fg.append(ft);
  fg.setAttribute("opacity", String(fell ? 1 : 0.5));
  rsvg.append(fg);

  $("#rout-detail")!.innerHTML = chosen
    ? `<div class="dh"><div class="dt" style="color:${chosen.side === "g" ? GRD : MVN}">${esc(chosen.t)}</div></div><p style="margin:0;color:var(--muted)">${chosen.d}</p>`
    : `<p style="margin:0;color:var(--faint)">Answer question ${active + 1} above. The first <b>yes</b> ends the chart — the questions are ordered by how hard a constraint they are, so the earliest one that applies to you is the one that actually decides it.</p>`;
}
$("#rreset")!.addEventListener("click", () => {
  routeAns = [];
  drawRouter();
});

/* ══════════════════════════════════════════════════════════════════════
   07 · CONVERGENCE — x = who had it first; arrow tip = how far it landed.
   ══════════════════════════════════════════════════════════════════ */
const RAIL_M = 140,
  RAIL_G = 800;
const CONV: { from: "g" | "m"; tip: number; label: string; note: string; open?: boolean }[] = [
  {
    from: "g",
    tip: 158,
    label: "Pin the tool version in the repo",
    note: "→ Maven Wrapper (mvnw), shipped",
  },
  {
    from: "g",
    tip: 320,
    label: "A warm daemon instead of a cold JVM",
    note: "→ mvnd, and mvnsh in Maven 4 — opt-in / RC",
  },
  {
    from: "g",
    tip: 430,
    label: "Hash the inputs, reuse the outputs",
    note: "→ maven-build-cache-extension — opt-in",
  },
  {
    from: "g",
    tip: 335,
    label: "Parallel-aware, resumable reactor",
    note: "→ Maven 4 -b concurrent and --resume — RC only",
  },
  {
    from: "m",
    tip: 690,
    label: "Configuration that is data you can cache",
    note: "→ configuration cache: preferred in 9.0, default target 10",
  },
  {
    from: "m",
    tip: 600,
    label: "Projects that cannot reach into each other",
    note: "→ Isolated Projects, incubating in 9.7",
  },
  {
    from: "m",
    tip: 330,
    label: "A build file you can read without running it",
    note: "→ still open: IDE sync must execute build logic",
    open: true,
  },
];
const conv = $<SVGSVGElement>("#conv-svg")!;
function drawConv() {
  conv.replaceChildren();
  const defs = el("defs");
  for (const [id, c] of [
    ["cam", MVN],
    ["cag", GRD],
    ["caw", "var(--warn)"],
  ] as const) {
    // head matches its line
    const m = el("marker", {
      id,
      viewBox: "0 0 10 10",
      refX: 9,
      refY: 5,
      markerWidth: 6,
      markerHeight: 6,
      orient: "auto-start-reverse",
    });
    m.append(el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: c }));
    defs.append(m);
  }
  conv.append(defs);

  for (const [x, col, name, anchor] of [
    [RAIL_M, MVN, "MAVEN", "start"],
    [RAIL_G, GRD, "GRADLE", "end"],
  ] as const) {
    conv.append(
      el("line", { x1: x, y1: 60, x2: x, y2: 408, stroke: col, "stroke-width": 3, opacity: 0.55 }),
    );
    const t = el("text", {
      x: anchor === "start" ? x - 4 : x + 4,
      y: 42,
      "text-anchor": anchor,
      "font-size": 13,
      "font-weight": 700,
      fill: col,
      "letter-spacing": "0.1em",
    });
    t.append(txt(name));
    conv.append(t);
  }
  const sub = el("text", {
    x: 470,
    y: 42,
    "text-anchor": "middle",
    "font-size": 11,
    fill: "var(--faint)",
  });
  sub.append(
    txt(
      "arrow starts at whoever had the idea · tip shows how far it has actually landed on the other side",
    ),
  );
  conv.append(sub);

  CONV.forEach((c, i) => {
    const y = 88 + i * 46;
    const src = c.from === "g" ? RAIL_G : RAIL_M;
    const col = c.open ? "var(--warn)" : c.from === "g" ? GRD : MVN;
    const mk = c.open ? "url(#caw)" : c.from === "g" ? "url(#cag)" : "url(#cam)";
    const g = el("g", {
      "data-viz-id": `conv-${i}`,
      "data-label": `${c.label} — originated with ${c.from === "g" ? "Gradle" : "Maven"} ${c.note}`,
    });

    g.append(el("circle", { cx: src, cy: y, r: 4, fill: col }));
    g.append(
      el("line", {
        x1: src,
        y1: y,
        x2: c.tip,
        y2: y,
        stroke: col,
        "stroke-width": 2,
        "stroke-dasharray": c.open ? "6 5" : null,
        opacity: 0.85,
        "marker-end": mk,
      }),
    );

    const mid = (src + c.tip) / 2;
    const t = el("text", {
      x: mid,
      y: y - 9,
      "text-anchor": "middle",
      "font-size": 12,
      "font-weight": 600,
      fill: "var(--text)",
    });
    t.append(txt(c.label));
    g.append(t);
    const n = el("text", {
      x: mid,
      y: y + 18,
      "text-anchor": "middle",
      "font-size": 10.5,
      fill: c.open ? "var(--warn)" : "var(--faint)",
    });
    n.append(txt(c.note));
    g.append(n);
    g.append(el("title", {}, [txt(`${c.label} ${c.note}`)]));
    conv.append(g);
  });

  const k = el("text", {
    x: 470,
    y: 442,
    "text-anchor": "middle",
    "font-size": 11,
    fill: "var(--faint)",
  });
  k.append(
    txt(
      "A short arrow means the idea has been copied in name but not yet in practice. A dashed one means it has not been copied at all.",
    ),
  );
  conv.append(k);
}

/* ── init ── */
drawBoard();
drawRoot();
drawBench();
drawRouter();
drawConv();
