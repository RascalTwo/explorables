// The shape catalogue every section draws: size-parametric Rough.js calls plus the fill styles.
import { gen, type Pt, type Opts, type Drawable } from "./rk.js";

export const SHAPE_NAMES = [
  "line",
  "rectangle",
  "ellipse",
  "circle",
  "linearPath",
  "polygon",
  "arc",
  "arcClosed",
  "curve",
  "curveMulti",
  "path",
  "pathMulti",
] as const;
export type ShapeName = (typeof SHAPE_NAMES)[number];
export const isShape = (v: string): v is ShapeName => SHAPE_NAMES.some((n) => n === v);
export interface ShapeDef {
  label: string;
  sig: string;
  fn: (o: Opts, w: number, h: number) => Drawable;
  note?: string;
}
const sc = (pts: Pt[], w: number, hh: number): Pt[] => pts.map(([x, y]) => [x * w, y * hh] as Pt);
const star = (w: number, hh: number): Pt[] => {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.2 : 0.46,
      a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([
      w / 2 + Math.cos(a) * r * Math.min(w, hh) * 1.35,
      hh / 2 + Math.sin(a) * r * Math.min(w, hh) * 1.35,
    ]);
  }
  return pts;
};
const WAVE: Pt[] = [
  [0.08, 0.6],
  [0.25, 0.2],
  [0.42, 0.75],
  [0.6, 0.25],
  [0.75, 0.7],
  [0.92, 0.4],
];
export const SHAPES: Record<ShapeName, ShapeDef> = {
  line: {
    label: "line",
    sig: "rc.line(x1, y1, x2, y2, options)",
    fn: (o, w, hh) => gen.line(w * 0.1, hh * 0.85, w * 0.9, hh * 0.15, o),
    note: "fill is ignored for open shapes",
  },
  rectangle: {
    label: "rectangle",
    sig: "rc.rectangle(x, y, width, height, options)",
    fn: (o, w, hh) => gen.rectangle(w * 0.12, hh * 0.15, w * 0.76, hh * 0.7, o),
  },
  ellipse: {
    label: "ellipse",
    sig: "rc.ellipse(cx, cy, width, height, options)",
    fn: (o, w, hh) => gen.ellipse(w / 2, hh / 2, w * 0.78, hh * 0.62, o),
  },
  circle: {
    label: "circle",
    sig: "rc.circle(cx, cy, diameter, options)",
    fn: (o, w, hh) => gen.circle(w / 2, hh / 2, Math.min(w, hh) * 0.72, o),
  },
  linearPath: {
    label: "linearPath",
    sig: "rc.linearPath([[x, y], …], options)",
    fn: (o, w, hh) =>
      gen.linearPath(
        sc(
          [
            [0.1, 0.8],
            [0.3, 0.2],
            [0.5, 0.8],
            [0.7, 0.2],
            [0.9, 0.8],
          ],
          w,
          hh,
        ),
        o,
      ),
    note: "open polyline — fill ignored",
  },
  polygon: {
    label: "polygon",
    sig: "rc.polygon([[x, y], …], options)",
    fn: (o, w, hh) => gen.polygon(star(w, hh), o),
  },
  arc: {
    label: "arc (open)",
    sig: "rc.arc(cx, cy, w, h, start, stop, false, options)",
    fn: (o, w, hh) =>
      gen.arc(w / 2, hh / 2, w * 0.8, hh * 0.7, -Math.PI * 0.85, Math.PI * 0.35, false, o),
    note: "closed=false: fill is ignored",
  },
  arcClosed: {
    label: "arc (closed)",
    sig: "rc.arc(cx, cy, w, h, start, stop, true, options)",
    fn: (o, w, hh) =>
      gen.arc(w / 2, hh / 2, w * 0.8, hh * 0.7, -Math.PI * 0.85, Math.PI * 0.35, true, o),
    note: "closed=true draws the pie wedge",
  },
  curve: {
    label: "curve",
    sig: "rc.curve([[x, y], …], options)",
    fn: (o, w, hh) => gen.curve(sc(WAVE, w, hh), o),
  },
  curveMulti: {
    label: "curve (Point[][])",
    sig: "rc.curve([[…], […]], options)",
    fn: (o, w, hh) =>
      gen.curve(
        [
          sc(
            [
              [0.1, 0.3],
              [0.3, 0.1],
              [0.5, 0.35],
              [0.9, 0.2],
            ],
            w,
            hh,
          ),
          sc(
            [
              [0.1, 0.8],
              [0.4, 0.55],
              [0.7, 0.9],
              [0.9, 0.7],
            ],
            w,
            hh,
          ),
        ],
        o,
      ),
    note: "several polylines in one Drawable",
  },
  path: {
    label: "path (SVG d)",
    sig: "rc.path('M… C… Z', options)",
    fn: (o, w, hh) =>
      gen.path(
        `M ${w / 2} ${hh * 0.86} C ${w * 0.02} ${hh * 0.55}, ${w * 0.2} ${hh * 0.06}, ${w / 2} ${hh * 0.32} C ${w * 0.8} ${hh * 0.06}, ${w * 0.98} ${hh * 0.55}, ${w / 2} ${hh * 0.86} Z`,
        o,
      ),
    note: "a heart from cubic béziers",
  },
  pathMulti: {
    label: "path (arcs, sub-paths)",
    sig: "rc.path('M… A… Z M… Z', options)",
    fn: (o, w, hh) =>
      gen.path(
        `M ${w * 0.15} ${hh * 0.85} L ${w * 0.15} ${hh * 0.4} L ${w * 0.5} ${hh * 0.12} L ${w * 0.85} ${hh * 0.4} L ${w * 0.85} ${hh * 0.85} Z M ${w * 0.42} ${hh * 0.85} L ${w * 0.42} ${hh * 0.6} A ${w * 0.08} ${hh * 0.08} 0 0 1 ${w * 0.58} ${hh * 0.6} L ${w * 0.58} ${hh * 0.85} Z`,
        o,
      ),
    note: "a house: line, arc & 2 sub-paths",
  },
};
export const FILL_STYLES = [
  "hachure",
  "solid",
  "zigzag",
  "cross-hatch",
  "dots",
  "dashed",
  "zigzag-line",
];
