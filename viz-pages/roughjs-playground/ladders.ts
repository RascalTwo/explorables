// Fill and option ladders: one parameter stepped across a row of cells, same shape and seed.
import { $ } from "@viz/kit";

import { sk, svgEl, h, P, bytes, type Opts } from "./rk.js";
import { SHAPES, FILL_STYLES, type ShapeName } from "./shapes.js";

interface Cell {
  label: string;
  o: Opts;
}
interface Ladder {
  title: string;
  note: string;
  shape: ShapeName;
  base: Opts;
  cells: Cell[];
  cw?: number;
  ch?: number;
}
const BASE: Opts = { seed: 7, stroke: P.ink, strokeWidth: 1.6 };
const withFill = (extra: Opts = {}, fill: string = P.c3): Opts => ({
  ...BASE,
  fill,
  hachureGap: 8,
  ...extra,
});
const ladderTo = (host: Element, spec: Ladder): void => {
  const box = h("div", "ladder", `<h3>${spec.title} <span>— ${spec.note}</span></h3>`, host);
  box.dataset["vizId"] = `ladder-${spec.title.replaceAll(/\W+/gu, "-")}`;
  box.dataset["label"] = spec.title;
  const row = h("div", "cells", "", box);
  const cw = spec.cw ?? 150,
    ch = spec.ch ?? 105;
  const draw = (): void => {
    row.replaceChildren();
    for (const c of spec.cells) {
      const cell = h("div", "cell", "", row);
      const svg = svgEl("svg", { width: cw, height: ch, viewBox: `0 0 ${cw} ${ch}` });
      cell.append(svg);
      const d = SHAPES[spec.shape].fn({ ...spec.base, ...c.o }, cw, ch);
      sk(svg, d);
      h("div", "lab1", c.label, cell);
      h("div", "bytes", `${bytes(d)} chars`, cell);
    }
  };
  draw();
  box.addEventListener("click", draw);
};
const F = (o: Opts = {}): Opts => withFill(o);
const FILL_LADDERS: Ladder[] = [
  {
    title: "fillStyle",
    note: "seven built-ins (dots uses Math.random → jitters on redraw)",
    shape: "circle",
    base: F(),
    cw: 150,
    ch: 120,
    cells: FILL_STYLES.map((s) => ({ label: s, o: { fillStyle: s } })),
  },
  {
    title: "hachureAngle",
    note: "degrees; default −41",
    shape: "polygon",
    base: F(),
    cells: [-90, -41, 0, 30, 60, 90].map((a) => ({ label: String(a), o: { hachureAngle: a } })),
  },
  {
    title: "hachureGap",
    note: "px between hatch lines; −1 = auto (4 × strokeWidth)",
    shape: "ellipse",
    base: F(),
    cells: [-1, 2, 5, 10, 20, 30].map((g) => ({ label: String(g), o: { hachureGap: g } })),
  },
  {
    title: "fillWeight",
    note: "hatch stroke width; −1 = auto (strokeWidth / 2)",
    shape: "rectangle",
    base: F(),
    cells: [-1, 0.5, 1.5, 3, 6].map((w) => ({ label: String(w), o: { fillWeight: w } })),
  },
  {
    title: "fillStyle: 'dots' + fillWeight",
    note: "dot diameter",
    shape: "circle",
    base: F({ fillStyle: "dots", hachureGap: 10 }),
    cells: [1, 2, 4, 6].map((w) => ({ label: String(w), o: { fillWeight: w } })),
  },
  {
    title: "fillStyle: 'dashed' — dashOffset / dashGap",
    note: "dash length / gap",
    shape: "rectangle",
    base: F({ fillStyle: "dashed" }),
    cells: [
      [-1, -1],
      [4, 4],
      [12, 4],
      [4, 14],
      [16, 16],
    ].map(([a, b]) => ({
      label: `len ${a} gap ${b}`,
      o: { dashOffset: a ?? -1, dashGap: b ?? -1 },
    })),
  },
  {
    title: "fillStyle: 'zigzag-line' — zigzagOffset",
    note: "zig height",
    shape: "rectangle",
    base: F({ fillStyle: "zigzag-line" }),
    cells: [-1, 2, 5, 10, 18].map((z) => ({ label: String(z), o: { zigzagOffset: z } })),
  },
  {
    title: "fillStyle: 'cross-hatch' — hachureAngle",
    note: "second pass is +90°",
    shape: "circle",
    base: F({ fillStyle: "cross-hatch" }),
    cells: [-41, 0, 30, 45].map((a) => ({ label: String(a), o: { hachureAngle: a } })),
  },
  {
    title: "fillStyle: 'solid' — fillShapeRoughnessGain",
    note: "extra roughness on a solid path() fill",
    shape: "path",
    base: F({ fillStyle: "solid", roughness: 1.5 }),
    cells: [0, 0.4, 0.8, 1.5, 2].map((g) => ({
      label: String(g),
      o: { fillShapeRoughnessGain: g },
    })),
  },
  {
    title: "fillLineDash + fillLineDashOffset",
    note: "dash the hatch strokes themselves",
    shape: "rectangle",
    base: F(),
    cells: [
      { label: "none", o: {} },
      { label: "[6, 6]", o: { fillLineDash: [6, 6] } },
      { label: "[2, 5]", o: { fillLineDash: [2, 5] } },
      { label: "[6, 6] +3", o: { fillLineDash: [6, 6], fillLineDashOffset: 3 } },
    ],
  },
  {
    title: "disableMultiStrokeFill",
    note: "one pass vs two passes per hatch line",
    shape: "ellipse",
    base: F(),
    cells: [
      { label: "false", o: {} },
      { label: "true", o: { disableMultiStrokeFill: true } },
    ],
  },
];
const OPT_LADDERS: Ladder[] = [
  {
    title: "roughness",
    note: "0 = perfect → 5 = drunk",
    shape: "rectangle",
    base: { ...BASE },
    cells: [0, 0.5, 1, 2, 3, 5].map((r) => ({ label: String(r), o: { roughness: r } })),
  },
  {
    title: "bowing",
    note: "curvature of straight edges",
    shape: "rectangle",
    base: { ...BASE },
    cells: [0, 1, 3, 6, 10].map((b) => ({ label: String(b), o: { bowing: b } })),
  },
  {
    title: "maxRandomnessOffset",
    note: "max endpoint displacement (px)",
    shape: "circle",
    base: { ...BASE },
    cells: [0, 1, 2, 5, 10, 20].map((m) => ({ label: String(m), o: { maxRandomnessOffset: m } })),
  },
  {
    title: "strokeWidth",
    note: "px",
    shape: "ellipse",
    base: { ...BASE },
    cells: [0.5, 1, 2, 4, 8].map((w) => ({ label: String(w), o: { strokeWidth: w } })),
  },
  {
    title: "stroke: 'none'",
    note: "hide the outline; keep the fill",
    shape: "ellipse",
    base: F(),
    cells: [
      { label: "stroke", o: {} },
      { label: "'none'", o: { stroke: "none" } },
    ],
  },
  {
    title: "curveFitting",
    note: "curve(): fidelity to your points",
    shape: "curve",
    base: { ...BASE },
    cells: [0, 0.5, 0.8, 0.95, 1].map((c) => ({ label: String(c), o: { curveFitting: c } })),
  },
  {
    title: "curveStepCount",
    note: "ellipse/arc resolution",
    shape: "ellipse",
    base: { ...BASE },
    cells: [2, 3, 5, 9, 20].map((c) => ({ label: String(c), o: { curveStepCount: c } })),
  },
  {
    title: "curveTightness",
    note: "curve(): −1 loose … 1 straight",
    shape: "curve",
    base: { ...BASE, roughness: 0.4 },
    cells: [-1, -0.5, 0, 0.5, 1].map((c) => ({ label: String(c), o: { curveTightness: c } })),
  },
  {
    title: "simplification",
    note: "path() only: thins the fill sketch",
    shape: "path",
    base: F(),
    cells: [0.1, 0.25, 0.5, 0.75, 1].map((s) => ({ label: String(s), o: { simplification: s } })),
  },
  {
    title: "disableMultiStroke",
    note: "single vs double outline",
    shape: "rectangle",
    base: { ...BASE },
    cells: [
      { label: "false", o: {} },
      { label: "true", o: { disableMultiStroke: true } },
    ],
  },
  {
    title: "preserveVertices",
    note: "corners pinned (roughness 4 to exaggerate)",
    shape: "polygon",
    base: { ...BASE, roughness: 4 },
    cells: [
      { label: "false", o: {} },
      { label: "true", o: { preserveVertices: true } },
    ],
  },
  {
    title: "strokeLineDash + strokeLineDashOffset",
    note: "dashed outlines",
    shape: "rectangle",
    base: { ...BASE, strokeWidth: 2 },
    cells: [
      { label: "none", o: {} },
      { label: "[4, 4]", o: { strokeLineDash: [4, 4] } },
      { label: "[10, 6]", o: { strokeLineDash: [10, 6] } },
      { label: "[10, 6] +5", o: { strokeLineDash: [10, 6], strokeLineDashOffset: 5 } },
      { label: "[14, 4, 2, 4]", o: { strokeLineDash: [14, 4, 2, 4] } },
    ],
  },
  {
    title: "fixedDecimalPlaceDigits",
    note: "round path data; caption shows the size saved",
    shape: "circle",
    base: { ...BASE, roughness: 1.5 },
    cells: [
      { label: "off", o: {} },
      { label: "0", o: { fixedDecimalPlaceDigits: 0 } },
      { label: "1", o: { fixedDecimalPlaceDigits: 1 } },
      { label: "2", o: { fixedDecimalPlaceDigits: 2 } },
    ],
  },
  {
    title: "seed",
    note: "equal seeds ⇒ identical · 0 ⇒ re-rolls on every click",
    shape: "rectangle",
    base: { ...BASE, fill: P.c4, hachureGap: 8 },
    cells: [
      { label: "1", o: { seed: 1 } },
      { label: "1", o: { seed: 1 } },
      { label: "2", o: { seed: 2 } },
      { label: "3", o: { seed: 3 } },
      { label: "0 (random)", o: { seed: 0 } },
      { label: "0 (random)", o: { seed: 0 } },
    ],
  },
];
/** Build the fill and option ladders into their page sections. */
export function initLadders(): void {
  const fillsHost = $("#fills-rows")!;
  const laddersHost = $("#ladder-rows")!;
  FILL_LADDERS.forEach((l) => ladderTo(fillsHost, l));
  OPT_LADDERS.forEach((l) => ladderTo(laddersHost, l));
}
