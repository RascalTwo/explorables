// Shared Rough.js helpers: types (roughjs is `any` from the CDN), the generator, DOM builders,
// and the global "boil" seed offset that every live sketch reads.
import rough from "https://unpkg.com/roughjs@4.6.6/bundled/rough.esm.js";
import { $ } from "/_kit/viz.js";

export { rough };
export type Pt = [number, number];
export interface Opts {
  maxRandomnessOffset?: number; roughness?: number; bowing?: number; stroke?: string; strokeWidth?: number;
  curveFitting?: number; curveTightness?: number; curveStepCount?: number; fill?: string; fillStyle?: string;
  fillWeight?: number; hachureAngle?: number; hachureGap?: number; simplification?: number; dashOffset?: number;
  dashGap?: number; zigzagOffset?: number; seed?: number; strokeLineDash?: number[]; strokeLineDashOffset?: number;
  fillLineDash?: number[]; fillLineDashOffset?: number; disableMultiStroke?: boolean; disableMultiStrokeFill?: boolean;
  preserveVertices?: boolean; fixedDecimalPlaceDigits?: number; fillShapeRoughnessGain?: number;
}
export interface Op { op: "move" | "lineTo" | "bcurveTo"; data: number[] }
export interface OpSet { type: "path" | "fillPath" | "fillSketch"; ops: Op[] }
export interface Drawable { shape: string; options: Opts; sets: OpSet[] }
export interface PathInfo { d: string; stroke: string; strokeWidth: number; fill?: string }
export interface Gen {
  defaultOptions: Record<string, unknown>;
  line(x1: number, y1: number, x2: number, y2: number, o?: Opts): Drawable;
  rectangle(x: number, y: number, w: number, h: number, o?: Opts): Drawable;
  ellipse(x: number, y: number, w: number, h: number, o?: Opts): Drawable;
  circle(x: number, y: number, d: number, o?: Opts): Drawable;
  linearPath(p: Pt[], o?: Opts): Drawable;
  polygon(p: Pt[], o?: Opts): Drawable;
  arc(x: number, y: number, w: number, h: number, a: number, b: number, closed?: boolean, o?: Opts): Drawable;
  curve(p: Pt[] | Pt[][], o?: Opts): Drawable;
  path(d: string, o?: Opts): Drawable;
  toPaths(d: Drawable): PathInfo[];
  opsToPath(s: OpSet, digits?: number): string;
}
export interface RoughSvg { draw(d: Drawable): SVGGElement }
export interface RoughCanvas { draw(d: Drawable): void }

export const gen: Gen = rough.generator();
export const NS = "http://www.w3.org/2000/svg";
const css = (v: string): string => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
export const P = { ink: css("--text"), muted: css("--muted"), c1: css("--c1"), c2: css("--c2"), c3: css("--c3"), c4: css("--c4"), c5: css("--c5"), c6: css("--c6") };
export const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

export function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, parent?: Element): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent?.appendChild(e);
  return e;
}
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", html = "", parent?: Element): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  parent?.appendChild(e);
  return e;
}
/** Draw a Drawable into an <svg>/<g> via rough.svg() — draw() returns a <g> we must append ourselves. */
export const sk = (svg: SVGSVGElement | SVGGElement, d: Drawable): SVGGElement => {
  const root = svg instanceof SVGSVGElement ? svg : (svg.ownerSVGElement as SVGSVGElement);
  const g = (rough.svg(root) as RoughSvg).draw(d);
  svg.appendChild(g);
  return g;
};
/** Size of a drawable's path data, honouring fixedDecimalPlaceDigits like the renderers do. */
export const bytes = (d: Drawable): number => d.sets.reduce((n, s) => n + gen.opsToPath(s, d.options.fixedDecimalPlaceDigits).length, 0);

/** A line with a sketchy two-stroke arrowhead. */
export function arrow(parent: SVGSVGElement | SVGGElement, x1: number, y1: number, x2: number, y2: number, o: Opts, head = 16): void {
  sk(parent, gen.line(x1, y1, x2, y2, o));
  const a = Math.atan2(y2 - y1, x2 - x1), sp = 0.45;
  const solid: Opts = { ...o, bowing: 0.5, seed: (o.seed ?? 1) + 3 };
  delete solid.strokeLineDash;
  sk(parent, gen.linearPath([[x2 - head * Math.cos(a - sp), y2 - head * Math.sin(a - sp)], [x2, y2], [x2 - head * Math.cos(a + sp), y2 - head * Math.sin(a + sp)]], solid));
}

/* live sketches + the global "boil" seed offset */
export let boil = 0;
export const live: Array<() => void> = [];
export const redrawLive = (): void => { $("#boil-read")!.textContent = (boil >= 0 ? "+" : "") + boil; for (const f of live) f(); };
export const bump = (n: number): void => { boil += n; redrawLive(); };
