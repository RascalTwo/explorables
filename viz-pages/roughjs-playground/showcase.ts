// Section 7 — "Plus Ultra": twelve scenes that each COMMUNICATE an idea with a wobbly pen,
// instead of listing options. Each scene mounts lazily and returns a redraw function that the
// global boil offset (and tab switches) call.
import { gen, sk, svgEl, h, P, live, reduced, arrow, boil, type Opts, type Pt } from "./rk.js";

import { ink, SVGW, clamp, lerp, txt, mark, mkSvg, toSvg, rangeCtl, selectCtl, btn, readout } from "./ui.js";
import { sceneTrust } from "./trust.js";
import { sceneEditor } from "./editor.js";
import { sceneArch } from "./arch.js";

interface Scene { id: string; tab: string; says: string; uses: string; mount: (box: HTMLElement) => () => void }

/* ═════════ A · dataviz: encode by colour, by pattern, or both ═════════ */
function sceneChart(box: HTMLElement): () => void {
  const bar = h("div", "toolbar", "", box);
  let layout = "stacked", encode = "both";
  selectCtl(bar, "layout", ["stacked", "grouped"], layout, (v) => { layout = v; draw(); });
  selectCtl(bar, "encode channel by", ["colour", "pattern", "both"], encode, (v) => { encode = v; draw(); });
  const info = readout(bar);
  info.textContent = "hover a bar";
  const svg = mkSvg(box);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const chans = [
    { name: "Organic", c: P.c1, fs: "hachure", d: [40, 46, 52, 61, 70, 84] },
    { name: "Paid", c: P.c3, fs: "cross-hatch", d: [22, 30, 28, 41, 45, 52] },
    { name: "Referral", c: P.c2, fs: "zigzag", d: [10, 12, 18, 20, 31, 33] },
  ];
  const X0 = 90, X1 = 870, Y0 = 440, YT = 60;
  const style = (c: (typeof chans)[number]): Opts => ({
    stroke: encode === "pattern" ? ink : c.c,
    fill: encode === "pattern" ? "#555" : c.c,
    fillStyle: encode === "colour" ? "hachure" : c.fs,
    hachureGap: 6, fillWeight: 1.2, strokeWidth: 1.8,
  });
  function draw(): void {
    svg.replaceChildren();
    const ymax = layout === "stacked" ? 180 : 100;
    const yS = (v: number): number => Y0 - (v / ymax) * (Y0 - YT);
    txt(svg, X0 - 40, 34, "Signups by channel (k / month, illustrative)", { size: 24, weight: 700 });
    for (let v = 0; v <= ymax; v += 20) {
      sk(svg, gen.line(X0, yS(v), X1, yS(v), { seed: 3 + boil + v, roughness: 0.7, stroke: "#d9d3c3", strokeWidth: 1, strokeLineDash: [4, 5] }));
      txt(svg, X0 - 12, yS(v) + 5, String(v), { anchor: "end", size: 18, fill: P.muted });
    }
    sk(svg, gen.line(X0, YT - 10, X0, Y0, { seed: 11 + boil, stroke: ink, strokeWidth: 2 }));
    sk(svg, gen.line(X0, Y0, X1, Y0, { seed: 12 + boil, stroke: ink, strokeWidth: 2 }));
    const gw = (X1 - X0) / months.length;
    months.forEach((m, i) => {
      const cx = X0 + gw * (i + 0.5);
      txt(svg, cx, Y0 + 28, m, { anchor: "middle", size: 22 });
      let acc = 0;
      chans.forEach((c, j) => {
        const v = c.d[i]!;
        const bw = layout === "stacked" ? 64 : 30;
        const x = layout === "stacked" ? cx - bw / 2 : cx - 45 + j * 30;
        const top = layout === "stacked" ? yS(acc + v) : yS(v);
        const hgt = layout === "stacked" ? yS(acc) - yS(acc + v) : Y0 - yS(v);
        const g = mark(svg, `bar-${c.name}-${m}`, `${c.name} · ${m}: ${v}k signups`);
        g.setAttribute("class", "hoverable");
        sk(g, gen.rectangle(x, top, bw, hgt, { ...style(c), seed: 100 + i * 10 + j * 3 + boil }));
        g.addEventListener("pointerenter", () => { info.textContent = `${c.name} · ${m}: ${v}k signups`; });
        if (layout === "stacked") acc += v;
      });
      if (layout === "stacked") txt(svg, cx, yS(acc) - 8, `${acc}`, { anchor: "middle", size: 18, fill: P.muted });
    });
    chans.forEach((c, j) => {
      const lx = 600 + j * 100;
      sk(svg, gen.rectangle(lx, 14, 26, 22, { ...style(c), seed: 900 + j + boil }));
      txt(svg, lx + 34, 32, c.name, { size: 19 });
    });
  }
  draw();
  return draw;
}

/* ═════════ B · roughness = uncertainty ═════════ */
function sceneForecast(box: HTMLElement): () => void {
  const bar = h("div", "toolbar", "", box);
  let today = 6, gain = 1, hoverM = -1;
  rangeCtl(bar, "today = month", 2, 10, 1, today, (v) => { today = v; draw(); });
  rangeCtl(bar, "uncertainty gain", 0, 2, 0.1, gain, (v) => { gain = v; draw(); }, (v) => v.toFixed(1));
  const info = readout(bar);
  info.textContent = "move over the chart";
  const svg = mkSvg(box);
  const X0 = 80, X1 = 860, Y0 = 440, YT = 60, YMAX = 520;
  const xS = (m: number): number => X0 + (m / 12) * (X1 - X0);
  const yS = (v: number): number => Y0 - (v / YMAX) * (Y0 - YT);
  const model = (m: number): number => 100 + 20 * m + 0.9 * m * m;
  const val = (m: number): number => m <= today ? model(m) + 9 * Math.sin(m * 1.9) : model(m) + 9 * Math.sin(today * 1.9) * Math.exp(-(m - today) / 2);
  const rough_ = (m: number): number => m <= today ? 0 : Math.min(6, gain * 0.6 * (m - today));
  const hw = (m: number): number => m <= today ? 0 : 9 * gain * Math.pow(m - today, 1.15);
  const overlay = svgEl("g", { "pointer-events": "none" });
  function guide(): void {
    overlay.replaceChildren();
    if (hoverM < 0) return;
    sk(overlay, gen.line(xS(hoverM), YT - 6, xS(hoverM), Y0, { seed: 77, roughness: 0.8, stroke: P.c6, strokeWidth: 1.5, strokeLineDash: [5, 5] }));
    const w = hw(hoverM);
    info.textContent = hoverM <= today
      ? `month ${hoverM}: ${Math.round(val(hoverM))} — measured, roughness 0`
      : `month ${hoverM}: ${Math.round(val(hoverM))} ± ${Math.round(w)} — forecast, roughness ${rough_(hoverM).toFixed(1)}`;
  }
  function draw(): void {
    svg.replaceChildren();
    txt(svg, X0, 34, "Weekly active users — the pen gets shakier as we look further ahead", { size: 26, weight: 700 });
    for (let v = 0; v <= 500; v += 100) {
      sk(svg, gen.line(X0, yS(v), X1, yS(v), { seed: 5 + v, roughness: 0.7, stroke: "#d9d3c3", strokeWidth: 1, strokeLineDash: [4, 5] }));
      txt(svg, X0 - 12, yS(v) + 5, String(v), { anchor: "end", size: 18, fill: P.muted });
    }
    sk(svg, gen.line(X0, Y0, X1, Y0, { seed: 12, stroke: ink, strokeWidth: 2 }));
    sk(svg, gen.line(X0, YT - 10, X0, Y0, { seed: 13, stroke: ink, strokeWidth: 2 }));
    for (let m = 0; m <= 12; m += 2) txt(svg, xS(m), Y0 + 28, `M${m}`, { anchor: "middle", size: 20 });
    // confidence band: rougher, sparser hatching the wider it gets
    if (today < 12) {
      const up: Pt[] = [], dn: Pt[] = [];
      for (let m = today; m <= 12; m += 0.5) { up.push([xS(m), yS(val(m) + hw(m))]); dn.unshift([xS(m), yS(val(m) - hw(m))]); }
      const g = mark(svg, "band", "Forecast confidence band");
      sk(g, gen.polygon([...up, ...dn], { seed: 40 + boil, roughness: 0.6 + gain * 1.6, stroke: "none", fill: P.c4, fillStyle: "hachure", hachureGap: 9, fillWeight: 0.9 }));
    }
    sk(svg, gen.line(xS(today), YT - 6, xS(today), Y0, { seed: 60, roughness: 0.4, stroke: P.muted, strokeWidth: 1.6, strokeLineDash: [10, 6] }));
    txt(svg, xS(today) - 8, YT + 6, "today", { anchor: "end", size: 22, fill: P.muted });
    for (let m = 0; m < 12; m++) {
      const r = rough_(m + 1);
      const g = mark(svg, `seg-${m}`, `Month ${m}→${m + 1}: roughness ${r.toFixed(1)}`);
      sk(g, gen.line(xS(m), yS(val(m)), xS(m + 1), yS(val(m + 1)), { seed: 200 + m + boil, roughness: r, stroke: m + 1 <= today ? P.c1 : P.c4, strokeWidth: 3.2, bowing: 1 + r * 0.3 }));
    }
    for (let m = 0; m <= 12; m++) {
      const g = mark(svg, `pt-${m}`, `Month ${m}: ${Math.round(val(m))}`);
      const meas = m <= today;
      sk(g, gen.circle(xS(m), yS(val(m)), meas ? 11 : 13, { seed: 300 + m + boil, roughness: rough_(m), stroke: meas ? P.c1 : P.c4, strokeWidth: 2.4, fill: meas ? P.c1 : "#fff", fillStyle: "solid" }));
    }
    txt(svg, X0 + 12, Y0 - 24, "measured  →  roughness 0", { size: 22, fill: P.c1 });
    txt(svg, X1 - 8, Y0 - 24, "forecast  →  roughness = horizon × gain", { anchor: "end", size: 22, fill: P.c4 });
    svg.appendChild(overlay);
    guide();
  }
  svg.addEventListener("pointermove", (e) => {
    const [x] = toSvg(svg, e);
    hoverM = clamp(Math.round(((x - X0) / (X1 - X0)) * 12), 0, 12);
    guide();
  });
  draw();
  return draw;
}

/* ═════════ C · annotation vocabulary ═════════ */
type Kind = "none" | "highlight" | "underline" | "squiggle" | "circle" | "box" | "bracket" | "strike";
const KINDS: Kind[] = ["none", "highlight", "underline", "squiggle", "circle", "box", "bracket", "strike"];
interface Box4 { x: number; y: number; w: number; h: number }
/** Draw one annotation around a word's box. `back` annotations sit behind the text. */
function annotate(back: SVGGElement, front: SVGGElement, kind: Kind, r: Box4, seed: number): void {
  const { x, y, w, h: hh } = r;
  const s = seed + boil;
  switch (kind) {
    case "highlight": sk(back, gen.rectangle(x - 4, y + 6, w + 8, hh - 6, { seed: s, roughness: 1.4, stroke: "none", fill: "#ffe066", fillStyle: "solid" })); break;
    case "underline": sk(front, gen.line(x, y + hh + 2, x + w, y + hh + 4, { seed: s, roughness: 1.2, bowing: 3, stroke: P.c1, strokeWidth: 3 })); break;
    case "squiggle": {
      const pts: Pt[] = [];
      for (let px = x, i = 0; px <= x + w; px += 8, i++) pts.push([px, y + hh + 4 + (i % 2 ? 4 : -2)]);
      sk(front, gen.linearPath(pts, { seed: s, roughness: 0.6, stroke: P.c6, strokeWidth: 2.2 })); break;
    }
    case "circle": sk(front, gen.ellipse(x + w / 2, y + hh / 2 + 2, w + 34, hh + 16, { seed: s, roughness: 1.8, stroke: P.c6, strokeWidth: 2.6 })); break;
    case "box": sk(front, gen.rectangle(x - 7, y - 1, w + 14, hh + 8, { seed: s, roughness: 1.3, stroke: P.c4, strokeWidth: 2.4 })); break;
    case "bracket":
      sk(front, gen.linearPath([[x + 2, y - 2], [x - 8, y - 2], [x - 8, y + hh + 6], [x + 2, y + hh + 6]], { seed: s, stroke: P.c2, strokeWidth: 2.6 }));
      sk(front, gen.linearPath([[x + w - 2, y - 2], [x + w + 8, y - 2], [x + w + 8, y + hh + 6], [x + w - 2, y + hh + 6]], { seed: s + 1, stroke: P.c2, strokeWidth: 2.6 })); break;
    case "strike": sk(front, gen.line(x - 4, y + hh * 0.58, x + w + 4, y + hh * 0.5, { seed: s, roughness: 1.4, stroke: P.c6, strokeWidth: 3 })); break;
    case "none": break;
  }
}
/** Lay out words as <tspan>s (spaces separate) and measure each word's box. */
function layoutWords(parent: SVGElement, lines: string[][], x0: number, y0: number, lh: number, size: number, start = 0, cls = "word"): Array<{ box: Box4; idx: number; el: SVGTSpanElement }> {
  const out: Array<{ box: Box4; idx: number; el: SVGTSpanElement }> = [];
  let idx = start;
  lines.forEach((ws, li) => {
    const t = svgEl("text", { x: x0, y: y0 + li * lh, "font-family": "var(--hand)", "font-size": size, fill: ink, style: "white-space:pre" }, parent);
    ws.forEach((wd, i) => {
      const sp = svgEl("tspan", { class: cls, "data-viz-id": `word-${idx}`, "data-label": `word “${wd}”` }, t);
      sp.textContent = wd;
      if (i < ws.length - 1) svgEl("tspan", {}, t).textContent = " ";
      out.push({ box: { x: 0, y: 0, w: 0, h: 0 }, idx, el: sp });
      idx++;
    });
  });
  for (const o of out) { const b = o.el.getBBox(); o.box = { x: b.x, y: b.y, w: b.width, h: b.height }; }
  return out;
}
function sceneNotes(box: HTMLElement): () => void {
  const bar = h("div", "toolbar", "", box);
  btn(bar, "clear all", () => { annot.clear(); draw(); });
  btn(bar, "reset example", () => { seedExample(); draw(); });
  const info = readout(bar);
  info.textContent = "click any word to cycle its annotation";
  const svg = mkSvg(box);
  const lines = [["Roughness", "can", "carry", "meaning:", "a", "crisp", "line"], ["for", "what", "we", "know,", "a", "wobbly", "one"], ["for", "what", "we", "guess", "—", "and", "a", "circle"], ["around", "whatever", "needs", "a", "second", "look."]];
  const annot = new Map<number, Kind>();
  const seedExample = (): void => { annot.clear(); annot.set(0, "highlight"); annot.set(5, "underline"); annot.set(12, "squiggle"); annot.set(15, "strike"); annot.set(21, "circle"); annot.set(24, "box"); };
  seedExample();
  function draw(): void {
    svg.replaceChildren();
    const back = svgEl("g", {}, svg), textG = svgEl("g", {}, svg), front = svgEl("g", {}, svg);
    const words = layoutWords(textG, lines, 60, 90, 74, 44);
    for (const w of words) {
      const kind = annot.get(w.idx) ?? "none";
      annotate(back, front, kind, w.box, 500 + w.idx * 7);
      w.el.style.cursor = "pointer";
      w.el.addEventListener("click", () => {
        const next = KINDS[(KINDS.indexOf(annot.get(w.idx) ?? "none") + 1) % KINDS.length]!;
        if (next === "none") annot.delete(w.idx); else annot.set(w.idx, next);
        info.textContent = `“${lines.flat()[w.idx]}” → ${next}`;
        draw();
      });
    }
    // the vocabulary, drawn with the very same function
    txt(svg, 60, 388, "the vocabulary — one Rough.js call each:", { size: 24, fill: P.muted });
    const sample = svgEl("g", {}, svg);
    KINDS.filter((k) => k !== "none").forEach((k, i) => {
      const sb = svgEl("g", {}, sample), sf = svgEl("g", {}, sample), st = svgEl("g", {}, sample);
      const ws = layoutWords(st, [["word"]], 70 + i * 120, 452, 0, 34, 1000 + i * 2, "sample");
      annotate(sb, sf, k, ws[0]!.box, 800 + i * 9);
      txt(svg, 70 + i * 120 + 30, 496, k, { anchor: "middle", size: 19, fill: P.muted });
    });
  }
  draw();
  return draw;
}

/* ═════════ D · engraving: shading by hatch density ═════════ */
function sceneShading(box: HTMLElement): () => void {
  const bar = h("div", "toolbar", "", box);
  let sun = 62; // degrees along the arc, 0 = far right horizon, 90 = overhead, 180 = far left
  const slider = rangeCtl(bar, "sun angle", 6, 174, 1, sun, (v) => { sun = v; draw(); }, (v) => `${v}°`);
  const info = readout(bar);
  info.textContent = "drag the sun · or use the slider";
  const svg = mkSvg(box);
  const CX = 450, CY = 450, R = 380;
  // drag lives on the persistent <svg>: draw() rebuilds the sun, which would drop pointer capture
  let dragging = false;
  svg.addEventListener("pointerdown", (e) => { if ((e.target as Element).closest('[data-viz-id="sun"]')) { dragging = true; svg.setPointerCapture(e.pointerId); } });
  svg.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const [px, py] = toSvg(svg, e);
    sun = Math.round(clamp((Math.atan2(CY - py, px - CX) * 180) / Math.PI, 6, 174));
    slider.value = String(sun);
    draw();
  });
  svg.addEventListener("pointerup", () => { dragging = false; });
  const dx = 130 * 0.866, dy = 130 * 0.5, s = 130, cx = 280, cy = 420;
  const shade = (b: number, seed: number): Opts => {
    if (b < 0.06) return { seed, stroke: ink, fill: ink, fillStyle: "cross-hatch", hachureGap: 2.6, hachureAngle: 45, fillWeight: 1.4, strokeWidth: 2 };
    if (b < 0.3) return { seed, stroke: ink, fill: ink, fillStyle: "cross-hatch", hachureGap: lerp(3, 6, b / 0.3), hachureAngle: 45, fillWeight: 1, strokeWidth: 2 };
    if (b < 0.85) return { seed, stroke: ink, fill: ink, fillStyle: "hachure", hachureGap: lerp(4, 16, (b - 0.3) / 0.55), hachureAngle: 45, fillWeight: lerp(1.3, 0.6, (b - 0.3) / 0.55), strokeWidth: 2 };
    return { seed, stroke: ink, strokeWidth: 2 };
  };
  function draw(): void {
    svg.replaceChildren();
    const a = (sun * Math.PI) / 180;
    const L: [number, number, number] = [Math.cos(a), 0.35, Math.sin(a)];
    const ll = Math.hypot(...L);
    const light = L.map((v) => v / ll) as [number, number, number];
    const lit = (n: [number, number, number]): number => clamp(0.08 + 0.92 * Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]), 0, 1);
    const bTop = lit([0, 0, 1]), bLeft = lit([-0.87, 0.5, 0]), bRight = lit([0.87, 0.5, 0]);
    txt(svg, 40, 40, "Shading = hatch density. The darker the face, the tighter the pen.", { size: 26, weight: 700 });
    // sun arc + ground
    sk(svg, gen.path(`M ${CX + R} ${CY} A ${R} ${R} 0 0 0 ${CX - R} ${CY}`, { seed: 5, roughness: 0.8, stroke: "#d0c9b5", strokeWidth: 1.6, strokeLineDash: [6, 8] }));
    sk(svg, gen.line(40, CY + 10, 860, CY + 10, { seed: 6, stroke: ink, strokeWidth: 2.4 }));
    // shadow on the ground (opposite the light)
    if (sun > 8 && sun < 172) {
      const len = clamp(dx * 2.4 * (light[0] / Math.max(0.15, light[2])), -260, 260);
      const base: Pt[] = [[cx - dx, cy - dy + 10], [cx, cy + 10], [cx + dx, cy - dy + 10]];
      const tip: Pt[] = base.map(([x, y]) => [x - len, y] as Pt);
      const g = mark(svg, "shadow-cube", "Cube shadow");
      sk(g, gen.polygon([...base, ...tip.reverse()], { seed: 20 + boil, roughness: 1.2, stroke: "none", fill: "#666", fillStyle: "hachure", hachureAngle: -30, hachureGap: 5, fillWeight: 1 }));
    }
    const gc = mark(svg, "cube", "Isometric cube");
    const fb: Pt = [cx, cy], lb: Pt = [cx - dx, cy - dy], rb: Pt = [cx + dx, cy - dy], ft: Pt = [cx, cy - s], lt: Pt = [cx - dx, cy - dy - s], rt: Pt = [cx + dx, cy - dy - s], bt: Pt = [cx, cy - s - 2 * dy];
    sk(gc, gen.polygon([lb, fb, ft, lt], shade(bLeft, 31 + boil)));
    sk(gc, gen.polygon([fb, rb, rt, ft], shade(bRight, 32 + boil)));
    sk(gc, gen.polygon([lt, ft, rt, bt], shade(bTop, 33 + boil)));
    // sphere: a lit disc that darkens away from the light
    const sx = 640, sy = 350, sr = 92;
    const gs = mark(svg, "sphere", "Sphere");
    const bSph = clamp(0.25 + 0.75 * Math.max(0, light[2] * 0.7 + Math.abs(light[0]) * 0.2), 0, 1);
    sk(gs, gen.circle(sx, sy, sr * 2, { ...shade(bSph * 0.75, 41 + boil), hachureAngle: -40 }));
    sk(gs, gen.ellipse(sx + light[0] * 40, sy - light[2] * 46, 34, 22, { seed: 42 + boil, roughness: 0.8, stroke: "none", fill: "#fff", fillStyle: "solid" }));
    sk(svg, gen.line(sx - 90, CY + 10, sx + 90, CY + 10, { seed: 43, stroke: ink, strokeWidth: 2 }));
    // value scale, drawn with the same shade()
    txt(svg, 40, 96, "value scale (light → dark):", { size: 20, fill: P.muted });
    for (let i = 0; i < 8; i++) {
      const b = 1 - i / 7;
      sk(svg, gen.rectangle(40 + i * 44, 108, 38, 26, shade(b, 60 + i)));
    }
    // the sun — draggable along the arc
    const sxp = CX + R * Math.cos(a), syp = CY - R * Math.sin(a);
    const gsun = mark(svg, "sun", "Sun (drag me)");
    gsun.style.cursor = "grab"; gsun.setAttribute("tabindex", "0"); gsun.setAttribute("role", "slider");
    gsun.setAttribute("aria-label", "Sun angle"); gsun.setAttribute("aria-valuenow", String(sun));
    for (let i = 0; i < 10; i++) {
      const ra = (i / 10) * Math.PI * 2;
      sk(gsun, gen.line(sxp + Math.cos(ra) * 34, syp + Math.sin(ra) * 34, sxp + Math.cos(ra) * 50, syp + Math.sin(ra) * 50, { seed: 70 + i + boil, stroke: "#f08c00", strokeWidth: 2.4 }));
    }
    sk(gsun, gen.circle(sxp, syp, 56, { seed: 80 + boil, stroke: "#f08c00", strokeWidth: 2.4, fill: "#ffd43b", fillStyle: "solid" }));
    svgEl("circle", { cx: sxp, cy: syp, r: 60, fill: "transparent" }, gsun);
    info.textContent = `sun ${sun}° → faces: left ${(bLeft * 100).toFixed(0)}% · right ${(bRight * 100).toFixed(0)}% · top ${(bTop * 100).toFixed(0)}% lit`;
    gsun.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowLeft" ? 4 : e.key === "ArrowRight" ? -4 : 0;
      if (d) { e.preventDefault(); e.stopPropagation(); sun = clamp(sun + d, 6, 174); slider.value = String(sun); draw(); }
    });
  }
  draw();
  return draw;
}

/* ═════════ E · wireframe → polished (fidelity dial) ═════════ */
function sceneWireframe(box: HTMLElement): () => void {
  const bar = h("div", "toolbar", "", box);
  let fid = 0, liked = new Set<number>();
  const label = readout(bar);
  rangeCtl(bar, "fidelity", 0, 1, 0.01, fid, (v) => { fid = v; draw(); }, (v) => v.toFixed(2));
  const svg = mkSvg(box);
  const cards = [["Lisbon weekend", "3 days · 2 friends", P.c1], ["Kyoto in spring", "9 days · solo", P.c6], ["Dolomites hike", "5 days · 4 friends", P.c2]] as const;
  function draw(): void {
    svg.replaceChildren();
    const r = 3.2 * (1 - fid) ** 1.3;
    const solid = fid >= 0.5, real = fid >= 0.75;
    const font = real ? "var(--sans)" : "var(--hand)";
    label.textContent = fid < 0.34 ? "sketch — ideas & questions" : fid < 0.75 ? "wireframe — structure agreed" : "polished — ready to build";
    const base = (extra: Opts = {}): Opts => ({ roughness: r, strokeWidth: lerp(2.4, 1.4, fid), stroke: ink, seed: 1 + boil, ...extra });
    const X = 300, Y = 16, W = 300, H = 488;
    sk(svg, gen.rectangle(X, Y, W, H, base({ seed: 2 + boil, fill: "#fbfaf6", fillStyle: "solid", strokeWidth: 3 })));
    sk(svg, gen.line(X + 110, Y + 14, X + 190, Y + 14, base({ seed: 3 + boil, strokeWidth: 4 })));
    const t = (x: number, y: number, s: string, size: number, weight = 500, fill = ink): void => { const e = txt(svg, x, y, s, { size, weight, fill }); e.setAttribute("font-family", font); };
    t(X + 20, Y + 66, "Trips", real ? 28 : 40, 700);
    sk(svg, gen.circle(X + W - 44, Y + 54, 38, base({ seed: 4 + boil, fill: solid ? P.c4 : ink, fillStyle: solid ? "solid" : "hachure", hachureGap: 5 })));
    cards.forEach(([title, sub, col], i) => {
      const cy = Y + 96 + i * 122;
      const g = mark(svg, `card-${i}`, `Trip card: ${title}`);
      sk(g, gen.rectangle(X + 16, cy, W - 32, 108, base({ seed: 10 + i + boil, fill: "#fff", fillStyle: "solid" })));
      const px = X + 26, py = cy + 10, pw = 84, ph = 88;
      sk(g, gen.rectangle(px, py, pw, ph, base({ seed: 20 + i + boil, ...(solid ? { fill: col, fillStyle: fid > 0.9 ? "solid" : "hachure", hachureGap: 6 } : {}) })));
      if (!solid) { sk(g, gen.line(px, py, px + pw, py + ph, base({ seed: 30 + i + boil, strokeWidth: 1.4 }))); sk(g, gen.line(px + pw, py, px, py + ph, base({ seed: 40 + i + boil, strokeWidth: 1.4 }))); }
      if (real) { t(px + 124 - 14, cy + 40, title, 17, 700); t(px + 124 - 14, cy + 64, sub, 13, 400, P.muted); }
      else {
        const sq = (y: number, wd: number, sd: number): void => {
          const pts: Pt[] = []; for (let x = 0, k = 0; x <= wd; x += 9, k++) pts.push([px + 100 + x, y + (k % 2 ? 3 : -3)]);
          sk(g, gen.linearPath(pts, base({ seed: sd + boil, strokeWidth: 2 })));
        };
        sq(cy + 34, 140, 50 + i); sq(cy + 58, 90, 60 + i);
      }
      const hx = X + W - 50, hy = cy + 86;
      const on = liked.has(i);
      const hg = mark(g, `like-${i}`, `Like ${title}`);
      hg.style.cursor = "pointer";
      sk(hg, gen.path(`M ${hx} ${hy + 8} C ${hx - 14} ${hy - 4}, ${hx - 6} ${hy - 16}, ${hx} ${hy - 6} C ${hx + 6} ${hy - 16}, ${hx + 14} ${hy - 4}, ${hx} ${hy + 8} Z`, base({ seed: 70 + i + boil, stroke: P.c6, ...(on ? { fill: P.c6, fillStyle: "solid" } : {}) })));
      svgEl("rect", { x: hx - 18, y: hy - 20, width: 36, height: 34, fill: "transparent" }, hg);
      hg.addEventListener("click", () => { if (liked.has(i)) liked.delete(i); else liked.add(i); draw(); });
    });
    for (let i = 0; i < 4; i++) sk(svg, gen.circle(X + 50 + i * 67, Y + H - 28, 24, base({ seed: 90 + i + boil, ...(i === 0 ? { fill: ink, fillStyle: "solid" } : {}) })));
    // design-review margin notes fade out as fidelity rises
    const op = clamp(1 - fid * 2.2, 0, 1);
    if (op > 0.02) {
      const notes = svgEl("g", { opacity: op }, svg);
      txt(notes, 30, 110, "bigger photos?", { size: 26, fill: P.c6 });
      arrow(notes, 190, 105, X + 12, Y + 140, { seed: 5 + boil, roughness: 1.4, stroke: P.c6, strokeWidth: 2 });
      txt(notes, 640, 230, "what happens on tap?", { size: 26, fill: P.c4 });
      arrow(notes, 700, 240, X + W - 40, Y + 220, { seed: 6 + boil, roughness: 1.4, stroke: P.c4, strokeWidth: 2 });
      txt(notes, 640, 430, "do we need 4 tabs?", { size: 26, fill: P.c2 });
      arrow(notes, 700, 440, X + 260, Y + H - 34, { seed: 7 + boil, roughness: 1.4, stroke: P.c2, strokeWidth: 2 });
    }
  }
  draw();
  return draw;
}

/* ═════════ F · draggable mind map ═════════ */
interface MNode { id: string; label: string; x: number; y: number; parent: string | null; color: string; r: number }
function sceneMindmap(box: HTMLElement): () => void {
  const bar = h("div", "toolbar", "", box);
  btn(bar, "re-arrange", () => { layout(); draw(); });
  const info = readout(bar);
  info.textContent = "drag any node — its branch comes with it";
  const svg = mkSvg(box);
  const branches: Array<[string, string, string[]]> = [
    ["Uncertainty", P.c4, ["roughness = confidence", "forecast bands"]],
    ["Draft-ness", P.c1, ["wireframes", "early ideas"]],
    ["Emphasis", P.c6, ["circle · underline", "highlighter"]],
    ["Shading", P.c3, ["hachure density", "cross-hatch"]],
    ["Structure", P.c5, ["diagrams", "maps & plans"]],
    ["Data", P.c2, ["pattern, not just colour", "sketchy charts"]],
  ];
  let nodes: MNode[] = [];
  const twOf = (n: MNode): number => n.label.length * (n.r === 0 ? 12 : n.r === 1 ? 10.5 : 8.6) + 30;
  function layout(): void {
    nodes = [{ id: "root", label: "What a wobbly pen says", x: 450, y: 270, parent: null, color: ink, r: 0 }];
    branches.forEach(([name, col, kids], i) => {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / branches.length;
      const bx = 450 + Math.cos(a) * 185 * 1.25, by = 270 + Math.sin(a) * 175;
      nodes.push({ id: name, label: name, x: bx, y: by, parent: "root", color: col, r: 1 });
      kids.forEach((k, j) => {
        const ka = a + (j === 0 ? -0.34 : 0.34);
        nodes.push({ id: `${name}/${k}`, label: k, x: 450 + Math.cos(ka) * 330 * 1.28, y: 270 + Math.sin(ka) * 250, parent: name, color: col, r: 2 });
      });
    });
    for (const n of nodes) { n.x = clamp(n.x, twOf(n) / 2 + 24, SVGW - twOf(n) / 2 - 24); n.y = clamp(n.y, 44, 486); }
  }
  layout();
  let drag: { id: string; last: Pt } | null = null;
  svg.addEventListener("pointerdown", (e) => {
    const g = (e.target as Element).closest("[data-node]");
    if (!g) return;
    drag = { id: (g as SVGElement).dataset["node"]!, last: toSvg(svg, e) };
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const [px, py] = toSvg(svg, e);
    const group = subtree(drag.id);
    for (const m of group) { m.x += px - drag.last[0]; m.y += py - drag.last[1]; }
    drag.last = [px, py];
    info.textContent = `${drag.id.split("/").pop()} — ${group.length} node(s) moving`;
    draw();
  });
  svg.addEventListener("pointerup", () => { drag = null; });
  const kidsOf = (id: string): MNode[] => nodes.filter((n) => n.parent === id);
  const subtree = (id: string): MNode[] => { const n = nodes.find((m) => m.id === id)!; return [n, ...kidsOf(id).flatMap((k) => subtree(k.id))]; };
  function draw(): void {
    svg.replaceChildren();
    const edges = svgEl("g", {}, svg), shapes = svgEl("g", {}, svg);
    nodes.forEach((n, i) => {
      if (n.parent) {
        const p = nodes.find((m) => m.id === n.parent)!;
        const ex = n.r === 2 ? n.x + (p.x < n.x ? -1 : 1) * (twOf(n) / 2 - 6) : n.x, ey = n.r === 2 ? n.y + 13 : n.y;
        sk(edges, gen.curve([[p.x, p.y], [(p.x + ex) / 2 - (ey - p.y) * 0.12, (p.y + ey) / 2 + (ex - p.x) * 0.12], [ex, ey]], { seed: 10 + i + boil, roughness: 1, stroke: n.color, strokeWidth: n.r === 1 ? 3 : 2 }));
      }
    });
    nodes.forEach((n, i) => {
      const g = mark(shapes, `mm-${n.id}`, `Mind-map node: ${n.label}`);
      g.style.cursor = "grab"; g.dataset["node"] = n.id;
      const tw = twOf(n);
      if (n.r === 0) sk(g, gen.ellipse(n.x, n.y, tw + 20, 88, { seed: 200 + boil, roughness: 1.3, stroke: ink, strokeWidth: 3, fill: "#fff3bf", fillStyle: "solid" }));
      else if (n.r === 1) sk(g, gen.rectangle(n.x - tw / 2, n.y - 24, tw, 48, { seed: 300 + i + boil, roughness: 1.2, stroke: n.color, strokeWidth: 2.6, fill: n.color, fillStyle: "hachure", hachureGap: 7, fillWeight: 1 }));
      else sk(g, gen.line(n.x - tw / 2 + 6, n.y + 12, n.x + tw / 2 - 6, n.y + 14, { seed: 400 + i + boil, stroke: n.color, strokeWidth: 2.4, bowing: 2 }));
      if (n.r === 1) svgEl("rect", { x: n.x - tw / 2 + 8, y: n.y - 16, width: tw - 16, height: 32, rx: 4, fill: "#fff", "fill-opacity": 0.88 }, g);
      txt(g, n.x, n.y + (n.r === 2 ? 4 : 8), n.label, { anchor: "middle", size: n.r === 0 ? 30 : n.r === 1 ? 24 : 20, weight: n.r === 2 ? 500 : 700 });
    });
  }
  draw();
  return draw;
}

/* ═════════ G · floor plan ═════════ */
function sceneFloor(box: HTMLElement): () => void {
  const bar = h("div", "toolbar", "", box);
  let mode = "area";
  selectCtl(bar, "fill rooms by", ["outline only", "area", "sun exposure (illustrative)"], "area", (v) => { mode = v === "outline only" ? "none" : v.startsWith("sun") ? "sun" : "area"; draw(); });
  const info = readout(bar);
  info.textContent = "hover a room";
  const svg = mkSvg(box);
  const S = 44, OX = 40, OY = 46;
  const rooms: Array<{ name: string; x: number; y: number; w: number; h: number; sun: number; lx: number; ly: number }> = [
    { name: "Living", x: 0, y: 0, w: 6, h: 5.5, sun: 4, lx: 3, ly: 1.8 }, { name: "Kitchen", x: 6, y: 0, w: 3, h: 5.5, sun: 3, lx: 7.5, ly: 1 },
    { name: "Bath", x: 9, y: 0, w: 3, h: 3, sun: 1, lx: 10.5, ly: 1.75 }, { name: "Storage", x: 9, y: 3, w: 3, h: 2.5, sun: 0, lx: 10.5, ly: 4.25 },
    { name: "Bedroom", x: 0, y: 5.5, w: 6, h: 3.5, sun: 5, lx: 4.6, ly: 7.3 }, { name: "Study", x: 6, y: 5.5, w: 3, h: 3.5, sun: 2, lx: 7.5, ly: 7 },
    { name: "Balcony", x: 9, y: 5.5, w: 3, h: 3.5, sun: 5, lx: 10.5, ly: 6.6 },
  ];
  const px = (m: number): number => OX + m * S, py = (m: number): number => OY + m * S;
  const doors: Array<[number, number, number, number, number, number]> = [
    // hinge x, hinge y (m), leaf-open dx, dy (unit), arc start, arc stop
    [6, 2, 1, 0, 0, Math.PI / 2], [9, 1, 1, 0, 0, Math.PI / 2], [2, 5.5, 0, 1, 0, Math.PI / 2], [6, 7, 1, 0, 0, Math.PI / 2], [9, 6.5, 1, 0, 0, Math.PI / 2], [3, 0, 0, 1, 0, Math.PI / 2],
  ];
  const maxArea = Math.max(...rooms.map((r) => r.w * r.h));
  const link = (name: string): void => { for (const e of svg.querySelectorAll("[data-room]")) e.classList.toggle("linked", (e as SVGElement).dataset["room"] === name); };
  function draw(): void {
    svg.replaceChildren();
    txt(svg, OX, 30, "Apartment plan — 12 m × 9 m (1 m = the bar below)", { size: 24, weight: 700 });
    rooms.forEach((r, i) => {
      const area = r.w * r.h;
      const g = mark(svg, `room-${r.name}`, `${r.name}: ${area} m²`);
      g.setAttribute("class", "hoverable"); g.dataset["room"] = r.name;
      const o: Opts = { seed: 10 + i + boil, roughness: 1.1, stroke: ink, strokeWidth: 3.2 };
      if (mode === "area") Object.assign(o, { fill: P.c1, fillStyle: "hachure", hachureGap: lerp(16, 7, area / maxArea), fillWeight: 0.8 });
      if (mode === "sun") Object.assign(o, { fill: P.c3, fillStyle: "hachure", hachureGap: lerp(18, 5, r.sun / 5), fillWeight: 1 });
      sk(g, gen.rectangle(px(r.x), py(r.y), r.w * S, r.h * S, o));
      g.addEventListener("pointerenter", () => { link(r.name); info.textContent = `${r.name}: ${r.w} × ${r.h} m = ${area} m²${mode === "sun" ? ` · sun ${r.sun}/5` : ""}`; });
      g.addEventListener("pointerleave", () => link(""));
    });
    // doors: erase the wall, then draw the swing
    doors.forEach(([hx, hy, ox], i) => {
      const vertical = ox === 1; // leaf opens along +x ⇒ the wall runs vertically
      const x0 = px(hx), y0 = py(hy);
      const wx = vertical ? x0 - 5 : x0, wy = vertical ? y0 : y0 - 5;
      svgEl("rect", { x: wx, y: wy, width: vertical ? 10 : S, height: vertical ? S : 10, fill: "#fff" }, svg);
      const dv = vertical;
      const arcX = x0, arcY = y0;
      sk(svg, gen.arc(arcX, arcY, S * 2, S * 2, 0, Math.PI / 2, false, { seed: 60 + i + boil, roughness: 0.7, stroke: P.c6, strokeWidth: 1.6, strokeLineDash: [4, 4] }));
      sk(svg, gen.line(arcX, arcY, arcX + (dv ? S : 0), arcY + (dv ? 0 : S), { seed: 70 + i + boil, roughness: 0.7, stroke: P.c6, strokeWidth: 2.6 }));
    });
    // furniture
    const F = (x: number, y: number, w: number, hh: number, sd: number): void => { sk(svg, gen.rectangle(px(x), py(y), w * S, hh * S, { seed: sd + boil, roughness: 1, stroke: P.muted, strokeWidth: 1.8, fill: "#fff", fillStyle: "solid" })); };
    F(1, 3.2, 2.4, 0.9, 300); F(4.4, 3.4, 0.9, 1.4, 301);            // sofa, armchair
    F(1.2, 6.2, 2.2, 2.1, 302); F(7, 8, 1.6, 0.6, 303);               // bed, desk
    F(9.3, 0.4, 1.7, 0.8, 304); sk(svg, gen.circle(px(11.3), py(2.75), S * 0.7, { seed: 305 + boil, stroke: P.muted, strokeWidth: 1.8 })); // tub, basin
    sk(svg, gen.circle(px(7.9), py(3.7), S * 1.1, { seed: 306 + boil, stroke: P.muted, strokeWidth: 1.8 })); // table
    sk(svg, gen.circle(px(11.2), py(8.3), S * 0.9, { seed: 307 + boil, stroke: P.c2, strokeWidth: 2, fill: P.c2, fillStyle: "hachure" })); // plant
    rooms.forEach((r) => {
      const cx = px(r.lx), cy = py(r.ly);
      const t = svgEl("g", {}, svg);
      svgEl("rect", { x: cx - 52, y: cy - 22, width: 104, height: 46, rx: 6, fill: "#fff", "fill-opacity": 0.85 }, t);
      txt(t, cx, cy + 2, r.name, { anchor: "middle", size: 24, weight: 700 });
      txt(t, cx, cy + 20, `${r.w * r.h} m²`, { anchor: "middle", size: 16, fill: P.muted, mono: true });
    });
    sk(svg, gen.line(OX, OY + 9 * S + 26, OX + S, OY + 9 * S + 26, { seed: 500, stroke: ink, strokeWidth: 2.4 }));
    txt(svg, OX + S + 10, OY + 9 * S + 32, "1 m", { size: 20 });
    // ranking bars: same rooms, area as LENGTH
    const bx = 650;
    txt(svg, bx, 78, "area (m²)", { size: 24, weight: 700 });
    [...rooms].sort((a, b) => b.w * b.h - a.w * a.h).forEach((r, k) => {
      const area = r.w * r.h, y = 96 + k * 46;
      const g = mark(svg, `rank-${r.name}`, `${r.name} area bar`);
      g.setAttribute("class", "hoverable"); g.dataset["room"] = r.name;
      txt(g, bx, y + 26, r.name, { size: 20 });
      sk(g, gen.rectangle(bx + 78, y + 6, (area / maxArea) * 120, 26, { seed: 600 + k + boil, stroke: ink, strokeWidth: 2, fill: P.c1, fillStyle: "hachure", hachureGap: 5 }));
      txt(g, bx + 78 + (area / maxArea) * 120 + 8, y + 26, String(area), { size: 18, fill: P.muted });
      g.addEventListener("pointerenter", () => { link(r.name); info.textContent = `${r.name}: ${area} m²`; });
      g.addEventListener("pointerleave", () => link(""));
    });
  }
  draw();
  return draw;
}

/* ═════════ H · write-on timelapse ═════════ */
function sceneWriteOn(box: HTMLElement): () => void {
  const bar = h("div", "toolbar", "", box);
  const steps = ["Hills", "Sun", "Cloud", "House", "Roof", "Door & windows", "Tree", "Path", "Birds", "Signature"];
  let p = steps.length; // progress in steps (fractional)
  let raf = 0, last = 0;
  const prev = btn(bar, "◀ step", () => { stop(); p = Math.max(0, Math.ceil(p) - 1); apply(); });
  const play = btn(bar, "▶ play", () => { if (raf) stop(); else { if (p >= steps.length) p = 0; last = performance.now(); raf = requestAnimationFrame(tick); play.textContent = "❚❚ pause"; } });
  const next = btn(bar, "step ▶", () => { stop(); p = Math.min(steps.length, Math.floor(p) + 1); apply(); });
  if (reduced) play.disabled = true;
  const scrub = h("input", "", "", h("label", "", "scrub ", bar));
  Object.assign(scrub, { type: "range", min: "0", max: String(steps.length), step: "0.01", value: String(p) });
  const info = readout(bar);
  const svg = mkSvg(box);
  const groups: SVGGElement[] = [];
  const stop = (): void => { cancelAnimationFrame(raf); raf = 0; play.textContent = "▶ play"; };
  function tick(now: number): void {
    p = Math.min(steps.length, p + (now - last) / 1100); last = now;
    apply();
    if (p >= steps.length) { stop(); return; }
    raf = requestAnimationFrame(tick);
  }
  scrub.addEventListener("input", () => { stop(); p = Number(scrub.value); apply(); });
  function apply(): void {
    scrub.value = String(p);
    prev.disabled = p <= 0; next.disabled = p >= steps.length;
    const k = clamp(Math.ceil(p) - 1, 0, steps.length - 1);
    info.textContent = p <= 0 ? "blank page" : `step ${k + 1}/${steps.length} · ${steps[k]}`;
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
    const G = (i: number): SVGGElement => { const g = mark(svg, `step-${i}`, `Step ${i + 1}: ${steps[i]}`); groups.push(g); return g; };
    let g = G(0);
    sk(g, gen.path("M 0 520 L 0 380 C 120 300, 240 330, 380 350 C 520 370, 640 290, 760 320 C 820 335, 870 330, 900 320 L 900 520 Z", { seed: 1 + B, stroke: P.c2, strokeWidth: 3, fill: P.c2, fillStyle: "hachure", hachureGap: 9, hachureAngle: -30 }));
    g = G(1);
    sk(g, gen.circle(740, 110, 96, { seed: 2 + B, stroke: "#f08c00", strokeWidth: 3, fill: "#ffd43b", fillStyle: "solid" }));
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; sk(g, gen.line(740 + Math.cos(a) * 62, 110 + Math.sin(a) * 62, 740 + Math.cos(a) * 88, 110 + Math.sin(a) * 88, { seed: 20 + i + B, stroke: "#f08c00", strokeWidth: 3 })); }
    g = G(2);
    for (const [x, y, w, hh] of [[170, 120, 110, 56], [230, 100, 96, 70], [290, 122, 110, 54]] as const) sk(g, gen.ellipse(x, y, w, hh, { seed: 3 + x + B, stroke: P.c1, strokeWidth: 2.4, fill: "#e7f5ff", fillStyle: "solid" }));
    g = G(3);
    sk(g, gen.rectangle(360, 290, 190, 130, { seed: 4 + B, stroke: ink, strokeWidth: 3, fill: P.c3, fillStyle: "hachure", hachureGap: 8 }));
    g = G(4);
    sk(g, gen.polygon([[340, 296], [455, 206], [570, 296]], { seed: 5 + B, stroke: ink, strokeWidth: 3, fill: P.c6, fillStyle: "cross-hatch", hachureGap: 9 }));
    sk(g, gen.rectangle(510, 226, 24, 46, { seed: 50 + B, stroke: ink, strokeWidth: 2.6, fill: P.c6, fillStyle: "solid" }));
    g = G(5);
    sk(g, gen.rectangle(430, 350, 50, 70, { seed: 6 + B, stroke: ink, strokeWidth: 2.6, fill: "#8d6e63", fillStyle: "solid" }));
    sk(g, gen.rectangle(378, 318, 40, 40, { seed: 61 + B, stroke: ink, strokeWidth: 2.4, fill: "#e7f5ff", fillStyle: "solid" }));
    sk(g, gen.line(398, 318, 398, 358, { seed: 62 + B, stroke: ink, strokeWidth: 2 }));
    sk(g, gen.line(378, 338, 418, 338, { seed: 63 + B, stroke: ink, strokeWidth: 2 }));
    g = G(6);
    sk(g, gen.rectangle(650, 320, 26, 100, { seed: 7 + B, stroke: ink, strokeWidth: 2.6, fill: "#8d6e63", fillStyle: "hachure", hachureGap: 5 }));
    sk(g, gen.ellipse(664, 270, 130, 120, { seed: 71 + B, stroke: "#1b7a34", strokeWidth: 3, fill: P.c2, fillStyle: "zigzag", hachureGap: 8 }));
    g = G(7);
    sk(g, gen.curve([[440, 424], [420, 452], [370, 484], [300, 520]], { seed: 8 + B, stroke: "#a1887f", strokeWidth: 5 }));
    sk(g, gen.curve([[476, 424], [470, 460], [430, 496], [372, 520]], { seed: 81 + B, stroke: "#a1887f", strokeWidth: 5 }));
    g = G(8);
    for (const [x, y] of [[560, 84], [610, 122], [520, 140]] as const) sk(g, gen.curve([[x - 18, y - 4], [x - 6, y + 8], [x, y], [x + 6, y + 8], [x + 18, y - 4]], { seed: 90 + x + B, stroke: ink, strokeWidth: 2.6 }));
    g = G(9);
    sk(g, gen.curve([[730, 480], [760, 455], [790, 500], [820, 462], [860, 490]], { seed: 99 + B, stroke: P.c4, strokeWidth: 3.2 }));
    apply();
  }
  build();
  return () => { build(); };
}

/* ═════════ I · decision flowchart you can walk ═════════ */
interface FNode { id: string; kind: "ellipse" | "diamond" | "rect"; x: number; y: number; w: number; h: number; lines: string[]; col: string }
function sceneFlow(box: HTMLElement): () => void {
  const bar = h("div", "toolbar", "", box);
  let path = ["start"];
  const info = readout(bar);
  const yes = btn(bar, "Yes", () => step("yes")), no = btn(bar, "No", () => step("no"));
  btn(bar, "restart", () => { path = ["start"]; draw(); });
  const svg = mkSvg(box);
  const N: FNode[] = [
    { id: "start", kind: "ellipse", x: 450, y: 46, w: 270, h: 58, lines: ["Should I sketch it?"], col: P.c4 },
    { id: "q1", kind: "diamond", x: 450, y: 170, w: 320, h: 116, lines: ["Is “rough” part", "of the message?"], col: P.c3 },
    { id: "q2", kind: "diamond", x: 230, y: 320, w: 320, h: 116, lines: ["Need automatic", "layout?"], col: P.c3 },
    { id: "o1", kind: "rect", x: 730, y: 320, w: 250, h: 88, lines: ["Crisp SVG / Canvas", "skip the wobble"], col: P.c1 },
    { id: "o2", kind: "rect", x: 110, y: 468, w: 210, h: 82, lines: ["Compute layout (elk, d3)", "Rough.js draws boxes"], col: P.c2 },
    { id: "o3", kind: "rect", x: 370, y: 468, w: 220, h: 82, lines: ["Hand-place shapes", "+ SVG <text>"], col: P.c2 },
  ];
  const E: Array<{ a: string; b: string; ans: "yes" | "no" | ""; ap: "b" | "l" | "r"; bp: "t" }> = [
    { a: "start", b: "q1", ans: "", ap: "b", bp: "t" }, { a: "q1", b: "q2", ans: "yes", ap: "l", bp: "t" }, { a: "q1", b: "o1", ans: "no", ap: "r", bp: "t" },
    { a: "q2", b: "o2", ans: "yes", ap: "l", bp: "t" }, { a: "q2", b: "o3", ans: "no", ap: "b", bp: "t" },
  ];
  const node = (id: string): FNode => N.find((n) => n.id === id)!;
  const port = (n: FNode, s: "b" | "l" | "r" | "t"): Pt => s === "b" ? [n.x, n.y + n.h / 2] : s === "t" ? [n.x, n.y - n.h / 2] : s === "l" ? [n.x - n.w / 2, n.y] : [n.x + n.w / 2, n.y];
  function step(ans: "yes" | "no"): void {
    const cur = path[path.length - 1]!;
    const e = E.find((x) => x.a === cur && x.ans === ans);
    if (e) { path.push(e.b); draw(); }
  }
  function draw(): void {
    svg.replaceChildren();
    const cur = path[path.length - 1]!;
    yes.disabled = no.disabled = !(node(cur).kind === "diamond");
    if (cur === "start") { path.push("q1"); draw(); return; }
    info.textContent = node(cur).kind === "diamond" ? "answer the question" : `→ ${node(cur).lines.join(" ")}`;
    E.forEach((e, i) => {
      const A = node(e.a), B = node(e.b);
      const [x1, y1] = port(A, e.ap), [x2, y2] = port(B, e.bp);
      const taken = path.includes(e.a) && path.includes(e.b) && path.indexOf(e.b) === path.indexOf(e.a) + 1;
      const g = mark(svg, `edge-${e.a}-${e.b}`, `${A.id} → ${B.id} (${e.ans || "next"})`);
      arrow(g, x1, y1, x2, y2, { seed: 10 + i + boil, roughness: taken ? 0.8 : 2.2, stroke: taken ? P.c6 : "#b9b3a3", strokeWidth: taken ? 3.6 : 1.8, bowing: 1.5 });
      if (e.ans) txt(g, (x1 + x2) / 2 + (x2 < x1 ? -34 : 12), (y1 + y2) / 2 - 4, e.ans, { size: 24, fill: taken ? P.c6 : P.muted, weight: 700 });
    });
    N.forEach((n, i) => {
      const seen = path.includes(n.id), on = n.id === cur;
      const o: Opts = { seed: 100 + i + boil, roughness: seen ? 1 : 2.4, stroke: seen ? ink : "#b9b3a3", strokeWidth: on ? 4.4 : seen ? 2.8 : 1.6, hachureGap: 8, ...(seen ? { fill: n.col, fillStyle: on ? "solid" : "hachure" } : {}) };
      const g = mark(svg, `fn-${n.id}`, n.lines.join(" "));
      if (n.kind === "ellipse") sk(g, gen.ellipse(n.x, n.y, n.w, n.h, o));
      else if (n.kind === "diamond") sk(g, gen.polygon([[n.x, n.y - n.h / 2], [n.x + n.w / 2, n.y], [n.x, n.y + n.h / 2], [n.x - n.w / 2, n.y]], o));
      else sk(g, gen.rectangle(n.x - n.w / 2, n.y - n.h / 2, n.w, n.h, o));
      const lh = 26, y0 = n.y - ((n.lines.length - 1) * lh) / 2 + 8;
      const plate = n.lines.reduce((m, l) => Math.max(m, l.length), 0) * 10.5 + 16;
      if (seen) svgEl("rect", { x: n.x - plate / 2, y: y0 - 22, width: plate, height: n.lines.length * lh + 6, rx: 6, fill: "#fff", "fill-opacity": on ? 0.95 : 0.8 }, g);
      n.lines.forEach((l, k) => txt(g, n.x, y0 + k * lh, l, { anchor: "middle", size: 23, weight: 700, fill: seen ? ink : P.muted }));
    });
  }
  draw();
  return draw;
}

/* ═════════ registry + tabs ═════════ */
const SCENES: Scene[] = [
  { id: "chart", tab: "📊 Data", says: "A chart that admits it's a sketch. Channel identity can travel in pattern instead of (or as well as) colour — hatch, cross-hatch and zigzag survive greyscale printing and colour-blindness.", uses: "rectangle · fillStyle hachure / cross-hatch / zigzag · line (dashed grid via strokeLineDash) · hover via CSS on the drawn <g>", mount: sceneChart },
  { id: "forecast", tab: "❓ Uncertainty", says: "Roughness as a data channel: measured values are drawn crisp (roughness 0); the further into the forecast, the shakier the pen and the sparser the band. Certainty becomes something you can see and feel, not just read.", uses: "roughness driven per-segment · polygon fill hachure for the band · circle solid vs hollow · line · a per-month readout", mount: sceneForecast },
  { id: "notes", tab: "🖍 Annotate", says: "The marks people make on paper — highlight, underline, squiggle, circle, box, bracket, strike — each one Rough.js call around a measured word box. Click words to annotate.", uses: "rectangle solid (highlighter) · line · linearPath (squiggle) · ellipse · rectangle · linearPath (brackets) — positions from SVG getBBox()", mount: sceneNotes },
  { id: "shade", tab: "🌗 Shading", says: "Engraver's shading: light is a vector, every face computes n·L, and brightness is mapped onto hatch gap, weight and fill style (open hatch → dense → cross-hatch). Drag the sun.", uses: "polygon · circle · ellipse solid highlight · path (arc) · hachureGap / hachureAngle / fillWeight / fillStyle as a value scale", mount: sceneShading },
  { id: "wire", tab: "📱 Fidelity", says: "The same screen at three levels of commitment. Low fidelity invites feedback (“bigger photos?”); high fidelity looks final. One slider moves roughness, fill style, and typeface together.", uses: "roughness lerp · fillStyle hachure→solid · rectangle / circle / path / linearPath · margin notes + arrow()", mount: sceneWireframe },
  { id: "mind", tab: "🕸 Mind map", says: "An idea map you can rearrange — dragging a branch carries its children. Edges are three-point curves; every re-draw keeps each edge's seed so the wobble stays put while things move.", uses: "curve (3 points) · ellipse · rectangle hachure · line (leaf underline) · pointer-drag re-render with stable seeds", mount: sceneMindmap },
  { id: "plan", tab: "🏠 Floor plan", says: "Space you can read: rooms drawn to scale (1 m = 44 px), door swings as arcs, and a second encoding — hatch density for area or sun exposure — linked to a ranked bar chart.", uses: "rectangle · arc · line · circle · hachureGap as an ordinal scale · hover linking between plan and bars", mount: sceneFloor },
  { id: "write", tab: "✍ Write-on", says: "A drawing as a process, not a picture: strokes are revealed in order (dashoffset over each Rough.js path). Step, scrub or play — every step is a separate Drawable group.", uses: "path · polygon · ellipse · circle · curve · line · SVG getTotalLength() + stroke-dashoffset on rough.svg output", mount: sceneWriteOn },
  { id: "flow", tab: "🔀 Flowchart", says: "A decision tree you walk through. The path you take turns solid and confident; the roads not taken go pale and shaky — which is how the eye reads certainty.", uses: "polygon (diamonds) · ellipse · rectangle · line + arrowhead · roughness & fillStyle switched by state", mount: sceneFlow },
  { id: "trust", tab: "📈 Trust dashboard", says: "A dashboard where the pen encodes data quality. The same metric arrives from six systems; each source's line, meter and tile is as shaky as it is untrustworthy. Slide the trust floor and low-quality sources drop out of the consensus (and the KPI tiles' own wobble calms down).", uses: "roughness = f(quality) on linearPath sparklines · rectangle meters with hachure · tiles whose roughness follows the average trust of their inputs · drill-down altitude with gaps as dashed circles", mount: sceneTrust },
  { id: "editor", tab: "🖊 Editor", says: "A working mini-Excalidraw: draw, move, resize, label, restyle, undo/redo, snap to grid, export. Everything you draw is a Rough.js Drawable with its own seed, so shapes hold still while you edit — and the boil buttons make the whole drawing shimmer.", uses: "rectangle · ellipse · polygon (diamond) · line + arrow() · linearPath (freehand) · per-element roughness / fillStyle / strokeWidth / seed · svg export of rough.svg output", mount: sceneEditor },
  { id: "arch", tab: "🏗 How this chat ran", says: "A real architecture and data-flow diagram — of the conversation that built this page. You → Claude Code (the harness loop) ⇄ the model, context sources feeding in (CLAUDE.md, the skills catalogue, MCP servers, hooks), and tools fanning out. Every count comes from this session's own log; the tape at the bottom is each tool call in order. Replay it, or click the tape to jump. Drawn deliberately calm: low roughness, one confident stroke, white boxes with coloured outlines.", uses: "rectangle · line + arrow() with open chevron heads · strokeLineDash for on-demand/async links · roughness 0.5 + disableMultiStroke for the clean-hand look · per-frame dot along an arrow · tape of 115 ticks from real timings", mount: sceneArch },
];

export function initShowcase(startId: string | undefined, onPick: (id: string) => void): (id: string, user?: boolean) => void {
  const tabs = document.getElementById("scene-tabs")!, stage = document.getElementById("scene-stage")!, infoEl = document.getElementById("scene-info")!;
  const mounted = new Map<string, { box: HTMLElement; draw: () => void }>();
  let cur = SCENES.some((s) => s.id === startId) ? startId! : SCENES[0]!.id;
  function show(id: string, user = true): void {
    if (!SCENES.some((s) => s.id === id)) return;
    cur = id;
    const sc = SCENES.find((s) => s.id === id)!;
    for (const b of tabs.querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset["id"] === id));
    for (const m of mounted.values()) m.box.hidden = true;
    let m = mounted.get(id);
    if (!m) {
      const b = h("div", "scene", "", stage);
      b.dataset["vizId"] = `scene-${id}`; b.dataset["label"] = sc.tab;
      m = { box: b, draw: () => undefined };
      mounted.set(id, m);
      m.box.hidden = false; // must be visible before mount: text measurement and path lengths need layout
      m.draw = sc.mount(b);
    }
    m.box.hidden = false;
    m.draw();
    infoEl.innerHTML = `<h3>${sc.tab}</h3><p><b>What it says.</b> ${sc.says}</p><p><b>Rough.js used.</b> <span style="color:var(--muted)">${sc.uses}</span></p>`;
    const link = h("button", "btn", "🔗 copy link to this scene", infoEl);
    link.addEventListener("click", () => { void navigator.clipboard?.writeText(`${location.origin}${location.pathname}#ultra/${id}`); link.textContent = "✓ copied"; setTimeout(() => { link.textContent = "🔗 copy link to this scene"; }, 1400); });
    if (user) onPick(id);
  }
  for (const s of SCENES) {
    const b = h("button", "chip", s.tab, tabs);
    b.dataset["id"] = s.id;
    b.addEventListener("click", () => show(s.id));
  }
  live.push(() => { const m = mounted.get(cur); if (m && !m.box.hidden) m.draw(); });
  show(cur, false);
  return show;
}
