// Showcase scene — A floor plan to scale with a linked ranking bar chart.
import { gen, sk, svgEl, h, P, boil, type Opts } from "./rk.js";
import { ink, lerp, txt, mark, mkSvg, selectCtl, readout } from "./ui.js";

/* ═════════ G · floor plan ═════════ */
const S = 44,
  OX = 40,
  OY = 46;
const rooms: Array<{
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  sun: number;
  lx: number;
  ly: number;
}> = [
  { name: "Living", x: 0, y: 0, w: 6, h: 5.5, sun: 4, lx: 3, ly: 1.8 },
  { name: "Kitchen", x: 6, y: 0, w: 3, h: 5.5, sun: 3, lx: 7.5, ly: 1 },
  { name: "Bath", x: 9, y: 0, w: 3, h: 3, sun: 1, lx: 10.5, ly: 1.75 },
  { name: "Storage", x: 9, y: 3, w: 3, h: 2.5, sun: 0, lx: 10.5, ly: 4.25 },
  { name: "Bedroom", x: 0, y: 5.5, w: 6, h: 3.5, sun: 5, lx: 4.6, ly: 7.3 },
  { name: "Study", x: 6, y: 5.5, w: 3, h: 3.5, sun: 2, lx: 7.5, ly: 7 },
  { name: "Balcony", x: 9, y: 5.5, w: 3, h: 3.5, sun: 5, lx: 10.5, ly: 6.6 },
];
const px = (m: number): number => OX + m * S,
  py = (m: number): number => OY + m * S;
const doors: Array<[number, number, number, number, number, number]> = [
  // hinge x, hinge y (m), leaf-open dx, dy (unit), arc start, arc stop
  [6, 2, 1, 0, 0, Math.PI / 2],
  [9, 1, 1, 0, 0, Math.PI / 2],
  [2, 5.5, 0, 1, 0, Math.PI / 2],
  [6, 7, 1, 0, 0, Math.PI / 2],
  [9, 6.5, 1, 0, 0, Math.PI / 2],
  [3, 0, 0, 1, 0, Math.PI / 2],
];
const maxArea = Math.max(...rooms.map((r) => r.w * r.h));

/** Sofa, bed, desk, tub, table and plant, drawn over the room outlines. */
function drawFurniture(svg: SVGSVGElement): void {
  const F = (x: number, y: number, w: number, hh: number, sd: number): void => {
    sk(
      svg,
      gen.rectangle(px(x), py(y), w * S, hh * S, {
        seed: sd + boil,
        roughness: 1,
        stroke: P.muted,
        strokeWidth: 1.8,
        fill: "#fff",
        fillStyle: "solid",
      }),
    );
  };
  F(1, 3.2, 2.4, 0.9, 300);
  F(4.4, 3.4, 0.9, 1.4, 301); // sofa, armchair
  F(1.2, 6.2, 2.2, 2.1, 302);
  F(7, 8, 1.6, 0.6, 303); // bed, desk
  F(9.3, 0.4, 1.7, 0.8, 304);
  sk(
    svg,
    gen.circle(px(11.3), py(2.75), S * 0.7, {
      seed: 305 + boil,
      stroke: P.muted,
      strokeWidth: 1.8,
    }),
  ); // tub, basin
  sk(
    svg,
    gen.circle(px(7.9), py(3.7), S * 1.1, {
      seed: 306 + boil,
      stroke: P.muted,
      strokeWidth: 1.8,
    }),
  ); // table
  sk(
    svg,
    gen.circle(px(11.2), py(8.3), S * 0.9, {
      seed: 307 + boil,
      stroke: P.c2,
      strokeWidth: 2,
      fill: P.c2,
      fillStyle: "hachure",
    }),
  ); // plant
}

export function sceneFloor(box: HTMLElement): () => void {
  const bar = h("div", "toolbar", "", box);
  let mode = "area";
  selectCtl(
    bar,
    "fill rooms by",
    ["outline only", "area", "sun exposure (illustrative)"],
    "area",
    (v) => {
      mode = v === "outline only" ? "none" : v.startsWith("sun") ? "sun" : "area";
      draw();
    },
  );
  const info = readout(bar);
  info.textContent = "hover a room";
  const svg = mkSvg(box);
  const link = (name: string): void => {
    for (const e of svg.querySelectorAll<SVGElement>("[data-room]"))
      e.classList.toggle("linked", e.dataset["room"] === name);
  };
  function draw(): void {
    svg.replaceChildren();
    txt(svg, OX, 30, "Apartment plan — 12 m × 9 m (1 m = the bar below)", {
      size: 24,
      weight: 700,
    });
    rooms.forEach((r, i) => {
      const area = r.w * r.h;
      const g = mark(svg, `room-${r.name}`, `${r.name}: ${area} m²`);
      g.setAttribute("class", "hoverable");
      g.dataset["room"] = r.name;
      const o: Opts = { seed: 10 + i + boil, roughness: 1.1, stroke: ink, strokeWidth: 3.2 };
      if (mode === "area")
        Object.assign(o, {
          fill: P.c1,
          fillStyle: "hachure",
          hachureGap: lerp(16, 7, area / maxArea),
          fillWeight: 0.8,
        });
      if (mode === "sun")
        Object.assign(o, {
          fill: P.c3,
          fillStyle: "hachure",
          hachureGap: lerp(18, 5, r.sun / 5),
          fillWeight: 1,
        });
      sk(g, gen.rectangle(px(r.x), py(r.y), r.w * S, r.h * S, o));
      g.addEventListener("pointerenter", () => {
        link(r.name);
        info.textContent = `${r.name}: ${r.w} × ${r.h} m = ${area} m²${mode === "sun" ? ` · sun ${r.sun}/5` : ""}`;
      });
      g.addEventListener("pointerleave", () => link(""));
    });
    // doors: erase the wall, then draw the swing
    doors.forEach(([hx, hy, ox], i) => {
      const vertical = ox === 1; // leaf opens along +x ⇒ the wall runs vertically
      const x0 = px(hx),
        y0 = py(hy);
      const wx = vertical ? x0 - 5 : x0,
        wy = vertical ? y0 : y0 - 5;
      svgEl(
        "rect",
        { x: wx, y: wy, width: vertical ? 10 : S, height: vertical ? S : 10, fill: "#fff" },
        svg,
      );
      const dv = vertical;
      const arcX = x0,
        arcY = y0;
      sk(
        svg,
        gen.arc(arcX, arcY, S * 2, S * 2, 0, Math.PI / 2, false, {
          seed: 60 + i + boil,
          roughness: 0.7,
          stroke: P.c6,
          strokeWidth: 1.6,
          strokeLineDash: [4, 4],
        }),
      );
      sk(
        svg,
        gen.line(arcX, arcY, arcX + (dv ? S : 0), arcY + (dv ? 0 : S), {
          seed: 70 + i + boil,
          roughness: 0.7,
          stroke: P.c6,
          strokeWidth: 2.6,
        }),
      );
    });
    drawFurniture(svg);
    rooms.forEach((r) => {
      const cx = px(r.lx),
        cy = py(r.ly);
      const t = svgEl("g", {}, svg);
      svgEl(
        "rect",
        {
          x: cx - 52,
          y: cy - 22,
          width: 104,
          height: 46,
          rx: 6,
          fill: "#fff",
          "fill-opacity": 0.85,
        },
        t,
      );
      txt(t, cx, cy + 2, r.name, { anchor: "middle", size: 24, weight: 700 });
      txt(t, cx, cy + 20, `${r.w * r.h} m²`, {
        anchor: "middle",
        size: 16,
        fill: P.muted,
        mono: true,
      });
    });
    sk(
      svg,
      gen.line(OX, OY + 9 * S + 26, OX + S, OY + 9 * S + 26, {
        seed: 500,
        stroke: ink,
        strokeWidth: 2.4,
      }),
    );
    txt(svg, OX + S + 10, OY + 9 * S + 32, "1 m", { size: 20 });
    // ranking bars: same rooms, area as LENGTH
    const bx = 650;
    txt(svg, bx, 78, "area (m²)", { size: 24, weight: 700 });
    rooms
      .toSorted((a, b) => b.w * b.h - a.w * a.h)
      .forEach((r, k) => {
        const area = r.w * r.h,
          y = 96 + k * 46;
        const g = mark(svg, `rank-${r.name}`, `${r.name} area bar`);
        g.setAttribute("class", "hoverable");
        g.dataset["room"] = r.name;
        txt(g, bx, y + 26, r.name, { size: 20 });
        sk(
          g,
          gen.rectangle(bx + 78, y + 6, (area / maxArea) * 120, 26, {
            seed: 600 + k + boil,
            stroke: ink,
            strokeWidth: 2,
            fill: P.c1,
            fillStyle: "hachure",
            hachureGap: 5,
          }),
        );
        txt(g, bx + 78 + (area / maxArea) * 120 + 8, y + 26, String(area), {
          size: 18,
          fill: P.muted,
        });
        g.addEventListener("pointerenter", () => {
          link(r.name);
          info.textContent = `${r.name}: ${area} m²`;
        });
        g.addEventListener("pointerleave", () => link(""));
      });
  }
  draw();
  return draw;
}
