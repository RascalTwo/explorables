// Showcase scene — A write-on timelapse: a drawing revealed stroke by stroke.
import { gen, sk, h, P, reduced, boil } from "./rk.js";
import { ink, clamp, mark, mkSvg, btn, readout } from "./ui.js";

/* ═════════ H · write-on timelapse ═════════ */
const STEPS = [
  "Hills",
  "Sun",
  "Cloud",
  "House",
  "Roof",
  "Door & windows",
  "Tree",
  "Path",
  "Birds",
  "Signature",
];

/** Steps 0–4: hills, sun, cloud, house and roof. */
function drawLandscape(G: (i: number) => SVGGElement, B: number): void {
  let g = G(0);
  sk(
    g,
    gen.path(
      "M 0 520 L 0 380 C 120 300, 240 330, 380 350 C 520 370, 640 290, 760 320 C 820 335, 870 330, 900 320 L 900 520 Z",
      {
        seed: 1 + B,
        stroke: P.c2,
        strokeWidth: 3,
        fill: P.c2,
        fillStyle: "hachure",
        hachureGap: 9,
        hachureAngle: -30,
      },
    ),
  );
  g = G(1);
  sk(
    g,
    gen.circle(740, 110, 96, {
      seed: 2 + B,
      stroke: "#f08c00",
      strokeWidth: 3,
      fill: "#ffd43b",
      fillStyle: "solid",
    }),
  );
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    sk(
      g,
      gen.line(
        740 + Math.cos(a) * 62,
        110 + Math.sin(a) * 62,
        740 + Math.cos(a) * 88,
        110 + Math.sin(a) * 88,
        { seed: 20 + i + B, stroke: "#f08c00", strokeWidth: 3 },
      ),
    );
  }
  g = G(2);
  for (const [x, y, w, hh] of [
    [170, 120, 110, 56],
    [230, 100, 96, 70],
    [290, 122, 110, 54],
  ] as const)
    sk(
      g,
      gen.ellipse(x, y, w, hh, {
        seed: 3 + x + B,
        stroke: P.c1,
        strokeWidth: 2.4,
        fill: "#e7f5ff",
        fillStyle: "solid",
      }),
    );
  g = G(3);
  sk(
    g,
    gen.rectangle(360, 290, 190, 130, {
      seed: 4 + B,
      stroke: ink,
      strokeWidth: 3,
      fill: P.c3,
      fillStyle: "hachure",
      hachureGap: 8,
    }),
  );
  g = G(4);
  sk(
    g,
    gen.polygon(
      [
        [340, 296],
        [455, 206],
        [570, 296],
      ],
      {
        seed: 5 + B,
        stroke: ink,
        strokeWidth: 3,
        fill: P.c6,
        fillStyle: "cross-hatch",
        hachureGap: 9,
      },
    ),
  );
  sk(
    g,
    gen.rectangle(510, 226, 24, 46, {
      seed: 50 + B,
      stroke: ink,
      strokeWidth: 2.6,
      fill: P.c6,
      fillStyle: "solid",
    }),
  );
}

/** Steps 5–9: door and windows, tree, path, birds and signature. */
function drawHouseAndGarden(G: (i: number) => SVGGElement, B: number): void {
  let g: SVGGElement;
  g = G(5);
  sk(
    g,
    gen.rectangle(430, 350, 50, 70, {
      seed: 6 + B,
      stroke: ink,
      strokeWidth: 2.6,
      fill: "#8d6e63",
      fillStyle: "solid",
    }),
  );
  sk(
    g,
    gen.rectangle(378, 318, 40, 40, {
      seed: 61 + B,
      stroke: ink,
      strokeWidth: 2.4,
      fill: "#e7f5ff",
      fillStyle: "solid",
    }),
  );
  sk(g, gen.line(398, 318, 398, 358, { seed: 62 + B, stroke: ink, strokeWidth: 2 }));
  sk(g, gen.line(378, 338, 418, 338, { seed: 63 + B, stroke: ink, strokeWidth: 2 }));
  g = G(6);
  sk(
    g,
    gen.rectangle(650, 320, 26, 100, {
      seed: 7 + B,
      stroke: ink,
      strokeWidth: 2.6,
      fill: "#8d6e63",
      fillStyle: "hachure",
      hachureGap: 5,
    }),
  );
  sk(
    g,
    gen.ellipse(664, 270, 130, 120, {
      seed: 71 + B,
      stroke: "#1b7a34",
      strokeWidth: 3,
      fill: P.c2,
      fillStyle: "zigzag",
      hachureGap: 8,
    }),
  );
  g = G(7);
  sk(
    g,
    gen.curve(
      [
        [440, 424],
        [420, 452],
        [370, 484],
        [300, 520],
      ],
      { seed: 8 + B, stroke: "#a1887f", strokeWidth: 5 },
    ),
  );
  sk(
    g,
    gen.curve(
      [
        [476, 424],
        [470, 460],
        [430, 496],
        [372, 520],
      ],
      { seed: 81 + B, stroke: "#a1887f", strokeWidth: 5 },
    ),
  );
  g = G(8);
  for (const [x, y] of [
    [560, 84],
    [610, 122],
    [520, 140],
  ] as const)
    sk(
      g,
      gen.curve(
        [
          [x - 18, y - 4],
          [x - 6, y + 8],
          [x, y],
          [x + 6, y + 8],
          [x + 18, y - 4],
        ],
        { seed: 90 + x + B, stroke: ink, strokeWidth: 2.6 },
      ),
    );
  g = G(9);
  sk(
    g,
    gen.curve(
      [
        [730, 480],
        [760, 455],
        [790, 500],
        [820, 462],
        [860, 490],
      ],
      { seed: 99 + B, stroke: P.c4, strokeWidth: 3.2 },
    ),
  );
}

export function sceneWriteOn(box: HTMLElement): () => void {
  const bar = h("div", "toolbar", "", box);
  let p = STEPS.length; // progress in steps (fractional)
  let raf = 0,
    last = 0;
  const prev = btn(bar, "◀ step", () => {
    stop();
    p = Math.max(0, Math.ceil(p) - 1);
    apply();
  });
  const play = btn(bar, "▶ play", () => {
    if (raf) stop();
    else {
      if (p >= STEPS.length) p = 0;
      last = performance.now();
      raf = requestAnimationFrame(tick);
      play.textContent = "❚❚ pause";
    }
  });
  const next = btn(bar, "step ▶", () => {
    stop();
    p = Math.min(STEPS.length, Math.floor(p) + 1);
    apply();
  });
  if (reduced) play.disabled = true;
  const scrub = h("input", "", "", h("label", "", "scrub ", bar));
  Object.assign(scrub, {
    type: "range",
    min: "0",
    max: String(STEPS.length),
    step: "0.01",
    value: String(p),
  });
  const info = readout(bar);
  const svg = mkSvg(box);
  const groups: SVGGElement[] = [];
  const stop = (): void => {
    cancelAnimationFrame(raf);
    raf = 0;
    play.textContent = "▶ play";
  };
  function tick(now: number): void {
    p = Math.min(STEPS.length, p + (now - last) / 1100);
    last = now;
    apply();
    if (p >= STEPS.length) {
      stop();
      return;
    }
    raf = requestAnimationFrame(tick);
  }
  scrub.addEventListener("input", () => {
    stop();
    p = Number(scrub.value);
    apply();
  });
  function apply(): void {
    scrub.value = String(p);
    prev.disabled = p <= 0;
    next.disabled = p >= STEPS.length;
    const k = clamp(Math.ceil(p) - 1, 0, STEPS.length - 1);
    info.textContent = p <= 0 ? "blank page" : `step ${k + 1}/${STEPS.length} · ${STEPS[k]}`;
    groups.forEach((g, gi) => {
      const f = clamp(p - gi, 0, 1);
      const paths = [...g.querySelectorAll("path")];
      paths.forEach((el, j) => {
        const local = clamp(f * paths.length - j, 0, 1);
        const stroked = el.getAttribute("stroke") !== "none";
        if (stroked) {
          const len = el.getTotalLength() || 1;
          el.style.strokeDasharray = `${len}`;
          el.style.strokeDashoffset = `${len * (1 - local)}`;
        } else el.style.opacity = String(clamp((local - 0.4) / 0.6, 0, 1));
      });
    });
  }
  function build(): void {
    svg.replaceChildren();
    groups.length = 0;
    const B = boil;
    const G = (i: number): SVGGElement => {
      const g = mark(svg, `step-${i}`, `Step ${i + 1}: ${STEPS[i]}`);
      groups.push(g);
      return g;
    };
    drawLandscape(G, B);
    drawHouseAndGarden(G, B);
    apply();
  }
  build();
  return () => {
    build();
  };
}
