// Section 7 — "Plus Ultra": twelve scenes that each COMMUNICATE an idea with a wobbly pen,
// instead of listing options. Each scene mounts lazily and returns a redraw function that the
// global boil offset (and tab switches) call.
import { gen, sk, svgEl, h, P, live, arrow, boil, type Opts, type Pt } from "./rk.js";

import {
  ink,
  clamp,
  lerp,
  txt,
  mark,
  mkSvg,
  toSvg,
  rangeCtl,
  selectCtl,
  btn,
  readout,
} from "./ui.js";
import { sceneShading } from "./showcase-shading.js";
import { sceneMindmap } from "./showcase-mindmap.js";
import { sceneFloor } from "./showcase-floor.js";
import { sceneWriteOn } from "./showcase-writeon.js";
import { sceneFlow } from "./showcase-flow.js";
import { sceneTrust } from "./trust.js";
import { sceneEditor } from "./editor.js";
import { sceneArch } from "./arch.js";

interface Scene {
  id: string;
  tab: string;
  says: string;
  uses: string;
  mount: (box: HTMLElement) => () => void;
}

/* ═════════ A · dataviz: encode by colour, by pattern, or both ═════════ */
function sceneChart(box: HTMLElement): () => void {
  const bar = h("div", "toolbar", "", box);
  let layout = "stacked",
    encode = "both";
  selectCtl(bar, "layout", ["stacked", "grouped"], layout, (v) => {
    layout = v;
    draw();
  });
  selectCtl(bar, "encode channel by", ["colour", "pattern", "both"], encode, (v) => {
    encode = v;
    draw();
  });
  const info = readout(bar);
  info.textContent = "hover a bar";
  const svg = mkSvg(box);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const chans = [
    { name: "Organic", c: P.c1, fs: "hachure", d: [40, 46, 52, 61, 70, 84] },
    { name: "Paid", c: P.c3, fs: "cross-hatch", d: [22, 30, 28, 41, 45, 52] },
    { name: "Referral", c: P.c2, fs: "zigzag", d: [10, 12, 18, 20, 31, 33] },
  ];
  const X0 = 90,
    X1 = 870,
    Y0 = 440,
    YT = 60;
  const style = (c: (typeof chans)[number]): Opts => ({
    stroke: encode === "pattern" ? ink : c.c,
    fill: encode === "pattern" ? "#555" : c.c,
    fillStyle: encode === "colour" ? "hachure" : c.fs,
    hachureGap: 6,
    fillWeight: 1.2,
    strokeWidth: 1.8,
  });
  function draw(): void {
    svg.replaceChildren();
    const ymax = layout === "stacked" ? 180 : 100;
    const yS = (v: number): number => Y0 - (v / ymax) * (Y0 - YT);
    txt(svg, X0 - 40, 34, "Signups by channel (k / month, illustrative)", {
      size: 24,
      weight: 700,
    });
    for (let v = 0; v <= ymax; v += 20) {
      sk(
        svg,
        gen.line(X0, yS(v), X1, yS(v), {
          seed: 3 + boil + v,
          roughness: 0.7,
          stroke: "#d9d3c3",
          strokeWidth: 1,
          strokeLineDash: [4, 5],
        }),
      );
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
        g.addEventListener("pointerenter", () => {
          info.textContent = `${c.name} · ${m}: ${v}k signups`;
        });
        if (layout === "stacked") acc += v;
      });
      if (layout === "stacked")
        txt(svg, cx, yS(acc) - 8, `${acc}`, { anchor: "middle", size: 18, fill: P.muted });
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
  let today = 6,
    gain = 1,
    hoverM = -1;
  rangeCtl(bar, "today = month", 2, 10, 1, today, (v) => {
    today = v;
    draw();
  });
  rangeCtl(
    bar,
    "uncertainty gain",
    0,
    2,
    0.1,
    gain,
    (v) => {
      gain = v;
      draw();
    },
    (v) => v.toFixed(1),
  );
  const info = readout(bar);
  info.textContent = "move over the chart";
  const svg = mkSvg(box);
  const X0 = 80,
    X1 = 860,
    Y0 = 440,
    YT = 60,
    YMAX = 520;
  const xS = (m: number): number => X0 + (m / 12) * (X1 - X0);
  const yS = (v: number): number => Y0 - (v / YMAX) * (Y0 - YT);
  const model = (m: number): number => 100 + 20 * m + 0.9 * m * m;
  const val = (m: number): number =>
    m <= today
      ? model(m) + 9 * Math.sin(m * 1.9)
      : model(m) + 9 * Math.sin(today * 1.9) * Math.exp(-(m - today) / 2);
  const rough_ = (m: number): number => (m <= today ? 0 : Math.min(6, gain * 0.6 * (m - today)));
  const hw = (m: number): number => (m <= today ? 0 : 9 * gain * Math.pow(m - today, 1.15));
  const overlay = svgEl("g", { "pointer-events": "none" });
  function guide(): void {
    overlay.replaceChildren();
    if (hoverM < 0) return;
    sk(
      overlay,
      gen.line(xS(hoverM), YT - 6, xS(hoverM), Y0, {
        seed: 77,
        roughness: 0.8,
        stroke: P.c6,
        strokeWidth: 1.5,
        strokeLineDash: [5, 5],
      }),
    );
    const w = hw(hoverM);
    info.textContent =
      hoverM <= today
        ? `month ${hoverM}: ${Math.round(val(hoverM))} — measured, roughness 0`
        : `month ${hoverM}: ${Math.round(val(hoverM))} ± ${Math.round(w)} — forecast, roughness ${rough_(hoverM).toFixed(1)}`;
  }
  function draw(): void {
    svg.replaceChildren();
    txt(svg, X0, 34, "Weekly active users — the pen gets shakier as we look further ahead", {
      size: 26,
      weight: 700,
    });
    for (let v = 0; v <= 500; v += 100) {
      sk(
        svg,
        gen.line(X0, yS(v), X1, yS(v), {
          seed: 5 + v,
          roughness: 0.7,
          stroke: "#d9d3c3",
          strokeWidth: 1,
          strokeLineDash: [4, 5],
        }),
      );
      txt(svg, X0 - 12, yS(v) + 5, String(v), { anchor: "end", size: 18, fill: P.muted });
    }
    sk(svg, gen.line(X0, Y0, X1, Y0, { seed: 12, stroke: ink, strokeWidth: 2 }));
    sk(svg, gen.line(X0, YT - 10, X0, Y0, { seed: 13, stroke: ink, strokeWidth: 2 }));
    for (let m = 0; m <= 12; m += 2)
      txt(svg, xS(m), Y0 + 28, `M${m}`, { anchor: "middle", size: 20 });
    // confidence band: rougher, sparser hatching the wider it gets
    if (today < 12) {
      const up: Pt[] = [],
        dn: Pt[] = [];
      for (let m = today; m <= 12; m += 0.5) {
        up.push([xS(m), yS(val(m) + hw(m))]);
        dn.unshift([xS(m), yS(val(m) - hw(m))]);
      }
      const g = mark(svg, "band", "Forecast confidence band");
      sk(
        g,
        gen.polygon([...up, ...dn], {
          seed: 40 + boil,
          roughness: 0.6 + gain * 1.6,
          stroke: "none",
          fill: P.c4,
          fillStyle: "hachure",
          hachureGap: 9,
          fillWeight: 0.9,
        }),
      );
    }
    sk(
      svg,
      gen.line(xS(today), YT - 6, xS(today), Y0, {
        seed: 60,
        roughness: 0.4,
        stroke: P.muted,
        strokeWidth: 1.6,
        strokeLineDash: [10, 6],
      }),
    );
    txt(svg, xS(today) - 8, YT + 6, "today", { anchor: "end", size: 22, fill: P.muted });
    for (let m = 0; m < 12; m++) {
      const r = rough_(m + 1);
      const g = mark(svg, `seg-${m}`, `Month ${m}→${m + 1}: roughness ${r.toFixed(1)}`);
      sk(
        g,
        gen.line(xS(m), yS(val(m)), xS(m + 1), yS(val(m + 1)), {
          seed: 200 + m + boil,
          roughness: r,
          stroke: m + 1 <= today ? P.c1 : P.c4,
          strokeWidth: 3.2,
          bowing: 1 + r * 0.3,
        }),
      );
    }
    for (let m = 0; m <= 12; m++) {
      const g = mark(svg, `pt-${m}`, `Month ${m}: ${Math.round(val(m))}`);
      const meas = m <= today;
      sk(
        g,
        gen.circle(xS(m), yS(val(m)), meas ? 11 : 13, {
          seed: 300 + m + boil,
          roughness: rough_(m),
          stroke: meas ? P.c1 : P.c4,
          strokeWidth: 2.4,
          fill: meas ? P.c1 : "#fff",
          fillStyle: "solid",
        }),
      );
    }
    txt(svg, X0 + 12, Y0 - 24, "measured  →  roughness 0", { size: 22, fill: P.c1 });
    txt(svg, X1 - 8, Y0 - 24, "forecast  →  roughness = horizon × gain", {
      anchor: "end",
      size: 22,
      fill: P.c4,
    });
    svg.append(overlay);
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
type Kind =
  | "none"
  | "highlight"
  | "underline"
  | "squiggle"
  | "circle"
  | "box"
  | "bracket"
  | "strike";
const KINDS: Kind[] = [
  "none",
  "highlight",
  "underline",
  "squiggle",
  "circle",
  "box",
  "bracket",
  "strike",
];
interface Box4 {
  x: number;
  y: number;
  w: number;
  h: number;
}
/** Draw one annotation around a word's box. `back` annotations sit behind the text. */
function annotate(back: SVGGElement, front: SVGGElement, kind: Kind, r: Box4, seed: number): void {
  const { x, y, w, h: hh } = r;
  const s = seed + boil;
  switch (kind) {
    case "highlight":
      sk(
        back,
        gen.rectangle(x - 4, y + 6, w + 8, hh - 6, {
          seed: s,
          roughness: 1.4,
          stroke: "none",
          fill: "#ffe066",
          fillStyle: "solid",
        }),
      );
      break;
    case "underline":
      sk(
        front,
        gen.line(x, y + hh + 2, x + w, y + hh + 4, {
          seed: s,
          roughness: 1.2,
          bowing: 3,
          stroke: P.c1,
          strokeWidth: 3,
        }),
      );
      break;
    case "squiggle": {
      const pts: Pt[] = [];
      for (let px = x, i = 0; px <= x + w; px += 8, i++)
        pts.push([px, y + hh + 4 + (i % 2 ? 4 : -2)]);
      sk(front, gen.linearPath(pts, { seed: s, roughness: 0.6, stroke: P.c6, strokeWidth: 2.2 }));
      break;
    }
    case "circle":
      sk(
        front,
        gen.ellipse(x + w / 2, y + hh / 2 + 2, w + 34, hh + 16, {
          seed: s,
          roughness: 1.8,
          stroke: P.c6,
          strokeWidth: 2.6,
        }),
      );
      break;
    case "box":
      sk(
        front,
        gen.rectangle(x - 7, y - 1, w + 14, hh + 8, {
          seed: s,
          roughness: 1.3,
          stroke: P.c4,
          strokeWidth: 2.4,
        }),
      );
      break;
    case "bracket":
      sk(
        front,
        gen.linearPath(
          [
            [x + 2, y - 2],
            [x - 8, y - 2],
            [x - 8, y + hh + 6],
            [x + 2, y + hh + 6],
          ],
          { seed: s, stroke: P.c2, strokeWidth: 2.6 },
        ),
      );
      sk(
        front,
        gen.linearPath(
          [
            [x + w - 2, y - 2],
            [x + w + 8, y - 2],
            [x + w + 8, y + hh + 6],
            [x + w - 2, y + hh + 6],
          ],
          { seed: s + 1, stroke: P.c2, strokeWidth: 2.6 },
        ),
      );
      break;
    case "strike":
      sk(
        front,
        gen.line(x - 4, y + hh * 0.58, x + w + 4, y + hh * 0.5, {
          seed: s,
          roughness: 1.4,
          stroke: P.c6,
          strokeWidth: 3,
        }),
      );
      break;
    case "none":
      break;
    default:
      break;
  }
}
/** Lay out words as <tspan>s (spaces separate) and measure each word's box. */
function layoutWords(
  parent: SVGElement,
  lines: string[][],
  x0: number,
  y0: number,
  lh: number,
  size: number,
  start = 0,
  cls = "word",
): Array<{ box: Box4; idx: number; el: SVGTSpanElement }> {
  const out: Array<{ box: Box4; idx: number; el: SVGTSpanElement }> = [];
  let idx = start;
  lines.forEach((ws, li) => {
    const t = svgEl(
      "text",
      {
        x: x0,
        y: y0 + li * lh,
        "font-family": "var(--hand)",
        "font-size": size,
        fill: ink,
        style: "white-space:pre",
      },
      parent,
    );
    ws.forEach((wd, i) => {
      const sp = svgEl(
        "tspan",
        { class: cls, "data-viz-id": `word-${idx}`, "data-label": `word “${wd}”` },
        t,
      );
      sp.textContent = wd;
      if (i < ws.length - 1) svgEl("tspan", {}, t).textContent = " ";
      out.push({ box: { x: 0, y: 0, w: 0, h: 0 }, idx, el: sp });
      idx++;
    });
  });
  for (const o of out) {
    const b = o.el.getBBox();
    o.box = { x: b.x, y: b.y, w: b.width, h: b.height };
  }
  return out;
}
function sceneNotes(box: HTMLElement): () => void {
  const bar = h("div", "toolbar", "", box);
  btn(bar, "clear all", () => {
    annot.clear();
    draw();
  });
  btn(bar, "reset example", () => {
    seedExample();
    draw();
  });
  const info = readout(bar);
  info.textContent = "click any word to cycle its annotation";
  const svg = mkSvg(box);
  const lines = [
    ["Roughness", "can", "carry", "meaning:", "a", "crisp", "line"],
    ["for", "what", "we", "know,", "a", "wobbly", "one"],
    ["for", "what", "we", "guess", "—", "and", "a", "circle"],
    ["around", "whatever", "needs", "a", "second", "look."],
  ];
  const annot = new Map<number, Kind>();
  const seedExample = (): void => {
    annot.clear();
    annot.set(0, "highlight");
    annot.set(5, "underline");
    annot.set(12, "squiggle");
    annot.set(15, "strike");
    annot.set(21, "circle");
    annot.set(24, "box");
  };
  seedExample();
  function draw(): void {
    svg.replaceChildren();
    const back = svgEl("g", {}, svg),
      textG = svgEl("g", {}, svg),
      front = svgEl("g", {}, svg);
    const words = layoutWords(textG, lines, 60, 90, 74, 44);
    for (const w of words) {
      const kind = annot.get(w.idx) ?? "none";
      annotate(back, front, kind, w.box, 500 + w.idx * 7);
      w.el.style.cursor = "pointer";
      w.el.addEventListener("click", () => {
        const next = KINDS[(KINDS.indexOf(annot.get(w.idx) ?? "none") + 1) % KINDS.length]!;
        if (next === "none") annot.delete(w.idx);
        else annot.set(w.idx, next);
        info.textContent = `“${lines.flat()[w.idx]}” → ${next}`;
        draw();
      });
    }
    // the vocabulary, drawn with the very same function
    txt(svg, 60, 388, "the vocabulary — one Rough.js call each:", { size: 24, fill: P.muted });
    const sample = svgEl("g", {}, svg);
    KINDS.filter((k) => k !== "none").forEach((k, i) => {
      const sb = svgEl("g", {}, sample),
        sf = svgEl("g", {}, sample),
        st = svgEl("g", {}, sample);
      const ws = layoutWords(st, [["word"]], 70 + i * 120, 452, 0, 34, 1000 + i * 2, "sample");
      annotate(sb, sf, k, ws[0]!.box, 800 + i * 9);
      txt(svg, 70 + i * 120 + 30, 496, k, { anchor: "middle", size: 19, fill: P.muted });
    });
  }
  draw();
  return draw;
}

/* ═════════ E · wireframe → polished (fidelity dial) ═════════ */
function sceneWireframe(box: HTMLElement): () => void {
  const bar = h("div", "toolbar", "", box);
  let fid = 0,
    liked = new Set<number>();
  const label = readout(bar);
  rangeCtl(
    bar,
    "fidelity",
    0,
    1,
    0.01,
    fid,
    (v) => {
      fid = v;
      draw();
    },
    (v) => v.toFixed(2),
  );
  const svg = mkSvg(box);
  const cards = [
    ["Lisbon weekend", "3 days · 2 friends", P.c1],
    ["Kyoto in spring", "9 days · solo", P.c6],
    ["Dolomites hike", "5 days · 4 friends", P.c2],
  ] as const;
  function draw(): void {
    svg.replaceChildren();
    const r = 3.2 * (1 - fid) ** 1.3;
    const solid = fid >= 0.5,
      real = fid >= 0.75;
    const font = real ? "var(--sans)" : "var(--hand)";
    label.textContent =
      fid < 0.34
        ? "sketch — ideas & questions"
        : fid < 0.75
          ? "wireframe — structure agreed"
          : "polished — ready to build";
    const base = (extra: Opts = {}): Opts => ({
      roughness: r,
      strokeWidth: lerp(2.4, 1.4, fid),
      stroke: ink,
      seed: 1 + boil,
      ...extra,
    });
    const X = 300,
      Y = 16,
      W = 300,
      H = 488;
    sk(
      svg,
      gen.rectangle(
        X,
        Y,
        W,
        H,
        base({ seed: 2 + boil, fill: "#fbfaf6", fillStyle: "solid", strokeWidth: 3 }),
      ),
    );
    sk(svg, gen.line(X + 110, Y + 14, X + 190, Y + 14, base({ seed: 3 + boil, strokeWidth: 4 })));
    const t = (x: number, y: number, s: string, size: number, weight = 500, fill = ink): void => {
      const e = txt(svg, x, y, s, { size, weight, fill });
      e.setAttribute("font-family", font);
    };
    t(X + 20, Y + 66, "Trips", real ? 28 : 40, 700);
    sk(
      svg,
      gen.circle(
        X + W - 44,
        Y + 54,
        38,
        base({
          seed: 4 + boil,
          fill: solid ? P.c4 : ink,
          fillStyle: solid ? "solid" : "hachure",
          hachureGap: 5,
        }),
      ),
    );
    cards.forEach(([title, sub, col], i) => {
      const cy = Y + 96 + i * 122;
      const g = mark(svg, `card-${i}`, `Trip card: ${title}`);
      sk(
        g,
        gen.rectangle(
          X + 16,
          cy,
          W - 32,
          108,
          base({ seed: 10 + i + boil, fill: "#fff", fillStyle: "solid" }),
        ),
      );
      const px = X + 26,
        py = cy + 10,
        pw = 84,
        ph = 88;
      sk(
        g,
        gen.rectangle(
          px,
          py,
          pw,
          ph,
          base({
            seed: 20 + i + boil,
            ...(solid
              ? { fill: col, fillStyle: fid > 0.9 ? "solid" : "hachure", hachureGap: 6 }
              : {}),
          }),
        ),
      );
      if (!solid) {
        sk(g, gen.line(px, py, px + pw, py + ph, base({ seed: 30 + i + boil, strokeWidth: 1.4 })));
        sk(g, gen.line(px + pw, py, px, py + ph, base({ seed: 40 + i + boil, strokeWidth: 1.4 })));
      }
      if (real) {
        t(px + 124 - 14, cy + 40, title, 17, 700);
        t(px + 124 - 14, cy + 64, sub, 13, 400, P.muted);
      } else {
        const sq = (y: number, wd: number, sd: number): void => {
          const pts: Pt[] = [];
          for (let x = 0, k = 0; x <= wd; x += 9, k++)
            pts.push([px + 100 + x, y + (k % 2 ? 3 : -3)]);
          sk(g, gen.linearPath(pts, base({ seed: sd + boil, strokeWidth: 2 })));
        };
        sq(cy + 34, 140, 50 + i);
        sq(cy + 58, 90, 60 + i);
      }
      const hx = X + W - 50,
        hy = cy + 86;
      const on = liked.has(i);
      const hg = mark(g, `like-${i}`, `Like ${title}`);
      hg.style.cursor = "pointer";
      sk(
        hg,
        gen.path(
          `M ${hx} ${hy + 8} C ${hx - 14} ${hy - 4}, ${hx - 6} ${hy - 16}, ${hx} ${hy - 6} C ${hx + 6} ${hy - 16}, ${hx + 14} ${hy - 4}, ${hx} ${hy + 8} Z`,
          base({
            seed: 70 + i + boil,
            stroke: P.c6,
            ...(on ? { fill: P.c6, fillStyle: "solid" } : {}),
          }),
        ),
      );
      svgEl("rect", { x: hx - 18, y: hy - 20, width: 36, height: 34, fill: "transparent" }, hg);
      hg.addEventListener("click", () => {
        if (liked.has(i)) liked.delete(i);
        else liked.add(i);
        draw();
      });
    });
    for (let i = 0; i < 4; i++)
      sk(
        svg,
        gen.circle(
          X + 50 + i * 67,
          Y + H - 28,
          24,
          base({ seed: 90 + i + boil, ...(i === 0 ? { fill: ink, fillStyle: "solid" } : {}) }),
        ),
      );
    // design-review margin notes fade out as fidelity rises
    const op = clamp(1 - fid * 2.2, 0, 1);
    if (op > 0.02) {
      const notes = svgEl("g", { opacity: op }, svg);
      txt(notes, 30, 110, "bigger photos?", { size: 26, fill: P.c6 });
      arrow(notes, 190, 105, X + 12, Y + 140, {
        seed: 5 + boil,
        roughness: 1.4,
        stroke: P.c6,
        strokeWidth: 2,
      });
      txt(notes, 640, 230, "what happens on tap?", { size: 26, fill: P.c4 });
      arrow(notes, 700, 240, X + W - 40, Y + 220, {
        seed: 6 + boil,
        roughness: 1.4,
        stroke: P.c4,
        strokeWidth: 2,
      });
      txt(notes, 640, 430, "do we need 4 tabs?", { size: 26, fill: P.c2 });
      arrow(notes, 700, 440, X + 260, Y + H - 34, {
        seed: 7 + boil,
        roughness: 1.4,
        stroke: P.c2,
        strokeWidth: 2,
      });
    }
  }
  draw();
  return draw;
}

/* ═════════ registry + tabs ═════════ */
const SCENES: Scene[] = [
  {
    id: "chart",
    tab: "📊 Data",
    says: "A chart that admits it's a sketch. Channel identity can travel in pattern instead of (or as well as) colour — hatch, cross-hatch and zigzag survive greyscale printing and colour-blindness.",
    uses: "rectangle · fillStyle hachure / cross-hatch / zigzag · line (dashed grid via strokeLineDash) · hover via CSS on the drawn <g>",
    mount: sceneChart,
  },
  {
    id: "forecast",
    tab: "❓ Uncertainty",
    says: "Roughness as a data channel: measured values are drawn crisp (roughness 0); the further into the forecast, the shakier the pen and the sparser the band. Certainty becomes something you can see and feel, not just read.",
    uses: "roughness driven per-segment · polygon fill hachure for the band · circle solid vs hollow · line · a per-month readout",
    mount: sceneForecast,
  },
  {
    id: "notes",
    tab: "🖍 Annotate",
    says: "The marks people make on paper — highlight, underline, squiggle, circle, box, bracket, strike — each one Rough.js call around a measured word box. Click words to annotate.",
    uses: "rectangle solid (highlighter) · line · linearPath (squiggle) · ellipse · rectangle · linearPath (brackets) — positions from SVG getBBox()",
    mount: sceneNotes,
  },
  {
    id: "shade",
    tab: "🌗 Shading",
    says: "Engraver's shading: light is a vector, every face computes n·L, and brightness is mapped onto hatch gap, weight and fill style (open hatch → dense → cross-hatch). Drag the sun.",
    uses: "polygon · circle · ellipse solid highlight · path (arc) · hachureGap / hachureAngle / fillWeight / fillStyle as a value scale",
    mount: sceneShading,
  },
  {
    id: "wire",
    tab: "📱 Fidelity",
    says: "The same screen at three levels of commitment. Low fidelity invites feedback (“bigger photos?”); high fidelity looks final. One slider moves roughness, fill style, and typeface together.",
    uses: "roughness lerp · fillStyle hachure→solid · rectangle / circle / path / linearPath · margin notes + arrow()",
    mount: sceneWireframe,
  },
  {
    id: "mind",
    tab: "🕸 Mind map",
    says: "An idea map you can rearrange — dragging a branch carries its children. Edges are three-point curves; every re-draw keeps each edge's seed so the wobble stays put while things move.",
    uses: "curve (3 points) · ellipse · rectangle hachure · line (leaf underline) · pointer-drag re-render with stable seeds",
    mount: sceneMindmap,
  },
  {
    id: "plan",
    tab: "🏠 Floor plan",
    says: "Space you can read: rooms drawn to scale (1 m = 44 px), door swings as arcs, and a second encoding — hatch density for area or sun exposure — linked to a ranked bar chart.",
    uses: "rectangle · arc · line · circle · hachureGap as an ordinal scale · hover linking between plan and bars",
    mount: sceneFloor,
  },
  {
    id: "write",
    tab: "✍ Write-on",
    says: "A drawing as a process, not a picture: strokes are revealed in order (dashoffset over each Rough.js path). Step, scrub or play — every step is a separate Drawable group.",
    uses: "path · polygon · ellipse · circle · curve · line · SVG getTotalLength() + stroke-dashoffset on rough.svg output",
    mount: sceneWriteOn,
  },
  {
    id: "flow",
    tab: "🔀 Flowchart",
    says: "A decision tree you walk through. The path you take turns solid and confident; the roads not taken go pale and shaky — which is how the eye reads certainty.",
    uses: "polygon (diamonds) · ellipse · rectangle · line + arrowhead · roughness & fillStyle switched by state",
    mount: sceneFlow,
  },
  {
    id: "trust",
    tab: "📈 Trust dashboard",
    says: "A dashboard where the pen encodes data quality. The same metric arrives from six systems; each source's line, meter and tile is as shaky as it is untrustworthy. Slide the trust floor and low-quality sources drop out of the consensus (and the KPI tiles' own wobble calms down).",
    uses: "roughness = f(quality) on linearPath sparklines · rectangle meters with hachure · tiles whose roughness follows the average trust of their inputs · drill-down altitude with gaps as dashed circles",
    mount: sceneTrust,
  },
  {
    id: "editor",
    tab: "🖊 Editor",
    says: "A working mini-Excalidraw: draw, move, resize, label, restyle, undo/redo, snap to grid, export. Everything you draw is a Rough.js Drawable with its own seed, so shapes hold still while you edit — and the boil buttons make the whole drawing shimmer.",
    uses: "rectangle · ellipse · polygon (diamond) · line + arrow() · linearPath (freehand) · per-element roughness / fillStyle / strokeWidth / seed · svg export of rough.svg output",
    mount: sceneEditor,
  },
  {
    id: "arch",
    tab: "🏗 How this chat ran",
    says: "A real architecture and data-flow diagram — of the conversation that built this page. You → Claude Code (the harness loop) ⇄ the model, context sources feeding in (CLAUDE.md, the skills catalogue, MCP servers, hooks), and tools fanning out. Every count comes from this session's own log; the tape at the bottom is each tool call in order. Replay it, or click the tape to jump. Drawn deliberately calm: low roughness, one confident stroke, white boxes with coloured outlines.",
    uses: "rectangle · line + arrow() with open chevron heads · strokeLineDash for on-demand/async links · roughness 0.5 + disableMultiStroke for the clean-hand look · per-frame dot along an arrow · tape of 115 ticks from real timings",
    mount: sceneArch,
  },
];

export function initShowcase(
  startId: string | undefined,
  onPick: (id: string) => void,
): (id: string, user?: boolean) => void {
  const tabs = document.querySelector("#scene-tabs")!,
    stage = document.querySelector("#scene-stage")!,
    infoEl = document.querySelector("#scene-info")!;
  const mounted = new Map<string, { box: HTMLElement; draw: () => void }>();
  let cur = SCENES.some((s) => s.id === startId) ? startId! : SCENES[0]!.id;
  function show(id: string, user = true): void {
    if (!SCENES.some((s) => s.id === id)) return;
    cur = id;
    const sc = SCENES.find((s) => s.id === id)!;
    for (const b of tabs.querySelectorAll("button"))
      b.setAttribute("aria-pressed", String(b.dataset["id"] === id));
    for (const m of mounted.values()) m.box.hidden = true;
    let m = mounted.get(id);
    if (!m) {
      const b = h("div", "scene", "", stage);
      b.dataset["vizId"] = `scene-${id}`;
      b.dataset["label"] = sc.tab;
      m = {
        box: b,
        draw: () => {
          /* until the scene mounts, there is nothing to redraw */
        },
      };
      mounted.set(id, m);
      m.box.hidden = false; // must be visible before mount: text measurement and path lengths need layout
      m.draw = sc.mount(b);
    }
    m.box.hidden = false;
    m.draw();
    infoEl.innerHTML = `<h3>${sc.tab}</h3><p><b>What it says.</b> ${sc.says}</p><p><b>Rough.js used.</b> <span style="color:var(--muted)">${sc.uses}</span></p>`;
    const link = h("button", "btn", "🔗 copy link to this scene", infoEl);
    link.addEventListener("click", () => {
      navigator.clipboard
        ?.writeText(`${location.origin}${location.pathname}#ultra/${id}`)
        .catch(console.warn);
      link.textContent = "✓ copied";
      setTimeout(() => {
        link.textContent = "🔗 copy link to this scene";
      }, 1400);
    });
    if (user) onPick(id);
  }
  for (const s of SCENES) {
    const b = h("button", "chip", s.tab, tabs);
    b.dataset["id"] = s.id;
    b.addEventListener("click", () => show(s.id));
  }
  live.push(() => {
    const m = mounted.get(cur);
    if (m && !m.box.hidden) m.draw();
  });
  show(cur, false);
  return show;
}
