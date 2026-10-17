// Shared scene-building helpers (text, marks, svg mount, pointer→svg coords, small controls).
import { svgEl, h, P, type Pt } from "./rk.js";

export const ink = P.ink;
export const SVGW = 900,
  SVGH = 520;
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/* ───────────── tiny builders ───────────── */
export interface TxtOpts {
  size?: number;
  anchor?: string;
  fill?: string;
  mono?: boolean;
  weight?: number;
}
export function txt(
  parent: Element,
  x: number,
  y: number,
  s: string,
  o: TxtOpts = {},
): SVGTextElement {
  const t = svgEl(
    "text",
    {
      x,
      y,
      "text-anchor": o.anchor ?? "start",
      "font-family": o.mono ? "var(--mono)" : "var(--hand)",
      "font-size": o.size ?? 22,
      fill: o.fill ?? ink,
      "font-weight": o.weight ?? 500,
    },
    parent,
  );
  t.textContent = s;
  return t;
}
export function mark(parent: Element, id: string, label: string): SVGGElement {
  return svgEl("g", { "data-viz-id": id, "data-label": label }, parent);
}
export function mkSvg(box: HTMLElement): SVGSVGElement {
  const svg = svgEl("svg", { viewBox: `0 0 ${SVGW} ${SVGH}`, class: "sceneSvg" });
  box.append(svg);
  return svg;
}
export function toSvg(svg: SVGSVGElement, e: MouseEvent): Pt {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
  return [p.x, p.y];
}
export function rangeCtl(
  bar: HTMLElement,
  label: string,
  min: number,
  max: number,
  step: number,
  value: number,
  on: (v: number) => void,
  fmt: (v: number) => string = String,
): HTMLInputElement {
  const w = h("label", "", `${label} `, bar);
  const input = h("input", "", "", w);
  Object.assign(input, {
    type: "range",
    min: String(min),
    max: String(max),
    step: String(step),
    value: String(value),
  });
  const out = h("output", "", fmt(value), w);
  input.addEventListener("input", () => {
    const v = Number(input.value);
    out.textContent = fmt(v);
    on(v);
  });
  return input;
}
export function selectCtl(
  bar: HTMLElement,
  label: string,
  opts: string[],
  value: string,
  on: (v: string) => void,
): HTMLSelectElement {
  const w = h("label", "", `${label} `, bar);
  const s = h("select", "", opts.map((o) => `<option>${o}</option>`).join(""), w);
  s.value = value;
  s.addEventListener("change", () => on(s.value));
  return s;
}
export const btn = (bar: HTMLElement, label: string, on: () => void): HTMLButtonElement => {
  const b = h("button", "btn", label, bar);
  b.addEventListener("click", on);
  return b;
};
export const readout = (bar: HTMLElement): HTMLElement => {
  const r = h("span", "readout", "", bar);
  return r;
};
