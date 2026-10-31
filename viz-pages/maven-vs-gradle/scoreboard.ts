import { $, esc } from "@viz/kit";
import { el, txt, MVN, GRD } from "./svg.js";
import { persist, view } from "./state.js";

/* ══════════════════════════════════════════════════════════════════════
   01 · SCOREBOARD — score is editorial; weight comes from the context.
   x encodes who wins; dot area encodes how much it matters here.
   ══════════════════════════════════════════════════════════════════ */
type DimId =
  | "speed"
  | "cache"
  | "predict"
  | "learn"
  | "verbose"
  | "flex"
  | "ide"
  | "eco"
  | "poly"
  | "upgrade"
  | "adopt"
  | "ci";
interface Dim {
  id: DimId;
  label: string;
  score: number;
  mv: string;
  gr: string;
  why: string;
}
interface Ctx {
  id: string;
  label: string;
  sub: string;
  line: string;
  forced?: number;
  w: Record<DimId, number>;
}
const DIMS: Dim[] = [
  {
    id: "speed",
    label: "Raw build speed",
    score: 72,
    mv: "Cold JVM per invocation, every phase every time — but mvnd (a warm daemon) reportedly buys back 7–10× on small projects and 3–5× on large ones. Almost nobody installs it, then concludes Maven is slow.",
    gr: "Warm daemon, parallel task execution, and it only runs what actually needs running.",
    why: "Gradle's own benchmarks put clean builds 2–10× ahead depending on module count; independent runs land lower but in the same direction.",
  },
  {
    id: "cache",
    label: "Incremental work & caching",
    score: 88,
    mv: "No first-class build cache. A no-op rebuild costs about what a cold one does. An opt-in extension exists and is decent.",
    gr: "Per-task input hashing, UP-TO-DATE skipping, a local cache, a remote cache, and a configuration cache on top.",
    why: "This is the single biggest structural difference between the two tools — §02 shows the mechanism.",
  },
  {
    id: "predict",
    label: "Predictability & reproducibility",
    score: -72,
    mv: "A POM is data. The same POM does the same thing on your laptop and on the build agent, because there is nothing in it to diverge.",
    gr: "A build script is a program with an environment. Works-on-my-machine build failures are a real category here.",
    why: "Less variance between local and CI runs is the reason a lot of large regulated shops never left Maven.",
  },
  {
    id: "learn",
    label: "Learning curve",
    score: -58,
    mv: "One structure, one lifecycle, and twenty years of Stack Overflow answers that match your error verbatim.",
    gr: "You need Groovy or Kotlin, plus the configuration-vs-execution phase model, before the error messages start making sense.",
    why: "JetBrains 2025: the top reason cited for Maven is simplicity (52%); the top reason for Gradle is speed (48%).",
  },
  {
    id: "verbose",
    label: "Conciseness of the build file",
    score: 64,
    mv: "XML. Six lines to name one dependency, no expressions, and conditionals smuggled in through profiles.",
    gr: "About 35 lines against Maven's 62 for the same project, and the Kotlin DSL autocompletes the build itself.",
    why: "Shorter is not automatically better — but it is measurably shorter, and it reads more like intent.",
  },
  {
    id: "flex",
    label: "Custom logic & extensibility",
    score: 88,
    mv: "Anything the plugins don't do means writing a Mojo: a separate artifact, its own version, its own release cycle.",
    gr: "Three levels of customisation without leaving the repo. Four lines in the build script and you are done.",
    why: "This is simultaneously Gradle's best feature and the root cause of every unmaintainable build script in existence.",
  },
  {
    id: "ide",
    label: "IDE sync & static tooling",
    score: -38,
    mv: "The POM is parsed, not executed, so re-import is near-instant and SBOM scanners, Dependabot and Renovate read it directly.",
    gr: "Sync must run your build logic through the Tooling API to learn what the project even is — every time you touch a build file.",
    why: "A Kotlin JVM project with 2,000+ subprojects averaged 8.4 minutes per IDE sync (~220ms per subproject); one reported cold sync ran 24.7 minutes. This is the feedback loop developers actually live in, and it is the clearest Maven win on the page.",
  },
  {
    id: "eco",
    label: "Plugin ecosystem maturity",
    score: -28,
    mv: "The largest plugin corpus in the JVM world, and plugins written in 2015 still work today.",
    gr: "A rich plugin portal, but plugins that touched internal APIs broke on the Gradle 9 jump.",
    why: "Gradle's ecosystem is not smaller so much as less stable across major versions.",
  },
  {
    id: "poly",
    label: "Non-Java languages & targets",
    score: 90,
    mv: "Java-centric by design. Kotlin, Scala and JS are bolted on; native targets are effectively absent.",
    gr: "Java, Kotlin, Groovy, Scala, Android, C/C++, Swift and JS as first-class citizens.",
    why: "For Android this isn't even a comparison: the Android Gradle Plugin has no Maven equivalent.",
  },
  {
    id: "upgrade",
    label: "Upgrade stability",
    score: -78,
    mv: "POMs from 2012 still build in 2026, and 3.9.16 still runs on Java 8. Upgrades are non-events.",
    gr: "Gradle 9 forced Java 17, jumped Groovy to 4 and Kotlin to 2.2, removed jcenter() and deleted deprecated APIs.",
    why: "Every Gradle major is a small migration project. Every Maven major has, so far, not been.",
  },
  {
    id: "adopt",
    label: "Adoption & hireability",
    score: -52,
    mv: "67% of Java developers. Whoever you hire next already knows it.",
    gr: "Large and growing, dominant in Android and Kotlin, but the minority position on the JVM overall.",
    why: "JetBrains State of Developer Ecosystem 2025, n > 5,000.",
  },
  {
    id: "ci",
    label: "CI cost at scale",
    score: 70,
    mv: "Every agent starts from zero every time. At 200 modules that is a real line on a cloud bill.",
    gr: "A warm remote cache means CI downloads outputs it already built instead of rebuilding them.",
    why: "The catch: the remote cache that produces the best numbers is Develocity, a paid product.",
  },
];

const CTX: Ctx[] = [
  {
    id: "greenfield",
    label: "Greenfield service",
    sub: "one team · 1–20 modules · Spring Boot",
    line: "Speed you will never notice, against a build every hire already understands.",
    w: {
      speed: 1,
      cache: 1,
      predict: 3,
      learn: 3,
      verbose: 2,
      flex: 1,
      ide: 2,
      eco: 2,
      poly: 0,
      upgrade: 3,
      adopt: 3,
      ci: 1,
    },
  },
  {
    id: "monorepo",
    label: "Enterprise monorepo",
    sub: "200+ modules · CI time is a budget line",
    line: "This is the shape the benchmarks were written about. Caching stops being a nicety.",
    w: {
      speed: 3,
      cache: 3,
      predict: 2,
      learn: 1,
      verbose: 1,
      flex: 3,
      ide: 2,
      eco: 1,
      poly: 2,
      upgrade: 1,
      adopt: 1,
      ci: 3,
    },
  },
  {
    id: "oss",
    label: "Open-source library",
    sub: "published to Maven Central",
    line: "Drive-by contributors and downstream consumers both need to read your build without running it.",
    w: {
      speed: 1,
      cache: 0,
      predict: 3,
      learn: 2,
      verbose: 2,
      flex: 1,
      ide: 2,
      eco: 3,
      poly: 0,
      upgrade: 3,
      adopt: 3,
      ci: 1,
    },
  },
  {
    id: "polyglot",
    label: "Polyglot / multiplatform",
    sub: "JVM + native + JS from one build",
    line: "Maven does not really compete here; it was never trying to.",
    w: {
      speed: 2,
      cache: 2,
      predict: 1,
      learn: 1,
      verbose: 2,
      flex: 3,
      ide: 1,
      eco: 1,
      poly: 3,
      upgrade: 1,
      adopt: 1,
      ci: 2,
    },
  },
  {
    id: "legacy",
    label: "Legacy Java 8 estate",
    sub: "regulated · low change rate",
    line: "Gradle 9 needs Java 17 just to run. Maven 3.9 still runs on 8. That alone decides it.",
    w: {
      speed: 1,
      cache: 0,
      predict: 3,
      learn: 2,
      verbose: 1,
      flex: 0,
      ide: 2,
      eco: 3,
      poly: 0,
      upgrade: 3,
      adopt: 3,
      ci: 0,
    },
  },
  {
    id: "android",
    label: "Android app",
    sub: "no contest",
    forced: 100,
    line: "The Android Gradle Plugin ships for Gradle and only Gradle. Nothing else on this page applies.",
    w: {
      speed: 2,
      cache: 3,
      predict: 1,
      learn: 1,
      verbose: 1,
      flex: 2,
      ide: 2,
      eco: 1,
      poly: 3,
      upgrade: 1,
      adopt: 1,
      ci: 3,
    },
  },
];

const X0 = 277,
  XC = 577,
  X1 = 877,
  SX = (s: number) => XC + s * 3;
const ROW_Y = (i: number) => 60 + i * 36;

/* — context buttons — */
const ctxRow = $("#ctx-row")!;
CTX.forEach((c, i) => {
  const b = document.createElement("button");
  b.className = "ctl";
  b.type = "button";
  b.dataset["vizId"] = `ctx-${c.id}`;
  b.dataset["label"] = c.label;
  b.textContent = c.label;
  b.title = c.sub;
  b.addEventListener("click", () => {
    view.ctx = i;
    drawBoard();
    persist();
  });
  ctxRow.append(b);
});

/* — static chrome of the board — */
const board = $<SVGSVGElement>("#board-svg")!;
export function drawBoard(): void {
  const ctx = CTX[view.ctx]!;
  [...ctxRow.children].forEach((b, i) => b.setAttribute("aria-pressed", String(i === view.ctx)));
  board.replaceChildren();

  // axis grid + headers
  for (const s of [-100, -50, 0, 50, 100]) {
    const x = SX(s);
    board.append(
      el("line", {
        x1: x,
        y1: 34,
        x2: x,
        y2: 474,
        stroke: "var(--border)",
        "stroke-width": s === 0 ? 1.5 : 1,
        "stroke-dasharray": s === 0 ? null : "3 5",
      }),
    );
    const t = el("text", { x, y: 494, "text-anchor": "middle", class: "tick" });
    t.append(txt(s === 0 ? "tie" : Math.abs(s)));
    board.append(t);
  }
  const hM = el("text", {
    x: X0,
    y: 22,
    "text-anchor": "start",
    "font-size": 12,
    "font-weight": 700,
    "letter-spacing": "0.12em",
    fill: MVN,
  });
  hM.append(txt("◀ MAVEN WINS"));
  board.append(hM);
  const hG = el("text", {
    x: X1,
    y: 22,
    "text-anchor": "end",
    "font-size": 12,
    "font-weight": 700,
    "letter-spacing": "0.12em",
    fill: GRD,
  });
  hG.append(txt("GRADLE WINS ▶"));
  board.append(hG);

  DIMS.forEach((d, i) => {
    const y = ROW_Y(i),
      w = ctx.w[d.id],
      x = SX(d.score),
      col = d.score < 0 ? MVN : GRD;
    const g = el("g", {
      class: "row" + (i === view.sel ? " on" : ""),
      "data-viz-id": `dim-${d.id}`,
      "data-label": `${d.label} — score ${d.score}, weight ${w}`,
    });

    g.append(
      el("line", { x1: X0, y1: y, x2: X1, y2: y, stroke: "var(--border)", "stroke-width": 1 }),
    );
    g.append(
      el("line", {
        x1: XC,
        y1: y,
        x2: x,
        y2: y,
        stroke: col,
        "stroke-width": 3,
        "stroke-linecap": "round",
        opacity: w === 0 ? 0.18 : 0.45,
      }),
    );

    const r = w === 0 ? 4.5 : 4.5 + w * 2.6;
    g.append(
      el("circle", {
        cx: x,
        cy: y,
        r,
        fill: w === 0 ? "var(--bg)" : col,
        stroke: col,
        "stroke-width": w === 0 ? 1.5 : 0,
        opacity: w === 0 ? 0.55 : i === view.sel ? 1 : 0.85,
      }),
    );

    const lab = el("text", {
      x: 232,
      y: y + 4,
      "text-anchor": "end",
      class: "rowlab" + (i === view.sel ? " on" : ""),
    });
    lab.append(txt(d.label));
    g.append(lab);

    const hit = el("rect", {
      x: 0,
      y: y - 17,
      width: 900,
      height: 34,
      fill: "transparent",
      class: "hit",
    });
    hit.append(
      el("title", {}, [
        txt(
          `${d.label}: ${d.score > 0 ? "Gradle" : "Maven"} by ${Math.abs(d.score)}, weight ${w}/3 here`,
        ),
      ]),
    );
    hit.addEventListener("click", () => {
      view.sel = i;
      drawBoard();
      persist();
    });
    g.append(hit);
    board.append(g);
  });

  drawNeedle(agg(ctx), ctx);
  drawDetail();
}

function agg(ctx: Ctx): number {
  if (ctx.forced !== undefined) return ctx.forced;
  let num = 0,
    den = 0;
  for (const d of DIMS) {
    const w = ctx.w[d.id];
    num += w * d.score;
    den += w;
  }
  return den ? num / den : 0;
}

function drawNeedle(a: number, ctx: Ctx) {
  const s = $<SVGSVGElement>("#needle")!;
  s.replaceChildren();
  const defs = el("defs");
  const lg = el("linearGradient", { id: "ng", x1: "0", x2: "1" });
  lg.append(el("stop", { offset: "0", "stop-color": MVN }));
  lg.append(el("stop", { offset: "0.5", "stop-color": "var(--border)" }));
  lg.append(el("stop", { offset: "1", "stop-color": GRD }));
  defs.append(lg);
  s.append(defs);

  s.append(
    el("rect", {
      x: X0,
      y: 44,
      width: X1 - X0,
      height: 10,
      rx: 5,
      fill: "url(#ng)",
      opacity: 0.75,
    }),
  );
  s.append(
    el("line", { x1: XC, y1: 38, x2: XC, y2: 60, stroke: "var(--faint)", "stroke-width": 1 }),
  );

  const lm = el("text", { x: X0, y: 70, "text-anchor": "start", class: "tick" });
  lm.append(txt("all-Maven"));
  s.append(lm);
  const lg2 = el("text", { x: X1, y: 70, "text-anchor": "end", class: "tick" });
  lg2.append(txt("all-Gradle"));
  s.append(lg2);

  const x = SX(Math.max(-100, Math.min(100, a)));
  const g = el("g", {
    "data-viz-id": "verdict-needle",
    "data-label": `weighted verdict ${a.toFixed(0)}`,
  });
  g.append(el("path", { d: `M ${x - 9} 26 L ${x + 9} 26 L ${x} 40 Z`, fill: a < 0 ? MVN : GRD }));
  g.append(
    el("line", { x1: x, y1: 40, x2: x, y2: 58, stroke: a < 0 ? MVN : GRD, "stroke-width": 2 }),
  );
  s.append(g);

  const strong = Math.abs(a) >= 25,
    tie = Math.abs(a) < 8;
  const who = a < 0 ? "Maven" : "Gradle";
  $("#v-title")!.innerHTML =
    ctx.forced !== undefined
      ? `<span class="g">Gradle</span> — and it is not a decision`
      : tie
        ? `Genuinely close &mdash; call it on taste`
        : `<span class="${a < 0 ? "m" : "g"}">${who}</span>, ${strong ? "clearly" : "on balance"} <span style="color:var(--faint);font-family:var(--mono);font-size:.8rem">(${a > 0 ? "+" : ""}${a.toFixed(0)})</span>`;
  $("#v-sub")!.textContent = ctx.line;
}

function drawDetail() {
  const d = DIMS[view.sel]!;
  const cx = CTX[view.ctx]!;
  $("#detail")!.innerHTML = `
    <div class="dh">
      <div class="dt">${esc(d.label)}</div>
      <div class="dscore">score ${d.score > 0 ? "+" : ""}${d.score} · weight ${cx.w[d.id]}/3 for &ldquo;${esc(cx.label)}&rdquo;</div>
    </div>
    <div class="sides">
      <div class="sd mv"><span class="who">Maven</span>${d.mv}</div>
      <div class="sd gr"><span class="who">Gradle</span>${d.gr}</div>
    </div>
    <p class="why">${d.why}</p>`;
}

addEventListener("keydown", (e) => {
  if (e.target instanceof Element && /input|textarea|select/iu.test(e.target.tagName)) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    view.sel = Math.max(0, Math.min(DIMS.length - 1, view.sel + (e.key === "ArrowDown" ? 1 : -1)));
    e.preventDefault();
    drawBoard();
    persist();
  }
});
