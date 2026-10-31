import rough from "https://unpkg.com/roughjs@4.6.6/bundled/rough.esm.js";
import type { Options } from "roughjs/bundled/core";
import type { RoughSVG } from "roughjs/bundled/svg";
type Pt = [number, number];
const svg = document.querySelector<SVGSVGElement>("#art")!;
// oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-call, typescript/no-unsafe-member-access -- the CDN module has no types in lint's program; RoughSVG is its real type, from the roughjs package, and tsc checks the rest of this file against it
const rc: RoughSVG = rough.svg(svg);
const add = (d: SVGElement) => svg.append(d);
const ink = "#1e1e1e",
  pur = "#6965db",
  org = "#f08c00",
  blu = "#1971c2",
  red = "#e03131";
const o = (x: Options = {}): Options => ({ seed: 7, stroke: ink, strokeWidth: 2.4, ...x });
// paper card for the collage
add(
  rc.rectangle(
    6,
    6,
    528,
    550,
    o({
      seed: 1,
      roughness: 1.6,
      stroke: "#c9c3b3",
      fill: "#fffefb",
      fillStyle: "solid",
      strokeWidth: 2,
    }),
  ),
);

// ── forecast: crisp measured line → shaky forecast + band (top) ──
const fx = (m: number) => 40 + m * 40,
  fy = (v: number) => 250 - v * 0.42;
add(rc.line(40, 250, 500, 250, o({ seed: 2, strokeWidth: 2.2 })));
add(rc.line(40, 60, 40, 250, o({ seed: 3, strokeWidth: 2.2 })));
add(
  rc.line(
    fx(5.5),
    60,
    fx(5.5),
    250,
    o({ seed: 4, roughness: 0.4, stroke: "#8a846f", strokeLineDash: [8, 6], strokeWidth: 1.6 }),
  ),
);
const val = (m: number) => 60 + 22 * m + 1.4 * m * m + (m <= 5.5 ? 8 * Math.sin(m * 1.9) : 0);
const up: Pt[] = [],
  dn: Pt[] = [];
for (let m = 5.5; m <= 11.2; m += 0.5) {
  const w = 9 * Math.pow(m - 5.5, 1.15) * 1.2;
  up.push([fx(m), fy(val(m) + w)]);
  dn.unshift([fx(m), fy(val(m) - w)]);
}
add(
  rc.polygon(
    [...up, ...dn],
    o({
      seed: 5,
      roughness: 2.4,
      stroke: "none",
      fill: pur,
      fillStyle: "hachure",
      hachureGap: 8,
      fillWeight: 1,
    }),
  ),
);
for (let m = 0; m < 11; m++) {
  const r = m + 1 <= 5.5 ? 0 : Math.min(5, 0.8 * (m + 1 - 5.5));
  add(
    rc.line(
      fx(m),
      fy(val(m)),
      fx(m + 1),
      fy(val(m + 1)),
      o({ seed: 20 + m, roughness: r, stroke: m + 1 <= 5.5 ? blu : pur, strokeWidth: 4 }),
    ),
  );
}
for (let m = 0; m <= 11; m += 1)
  add(
    rc.circle(
      fx(m),
      fy(val(m)),
      12,
      o({
        seed: 40 + m,
        roughness: m <= 5.5 ? 0 : 2.2,
        stroke: m <= 5.5 ? blu : pur,
        strokeWidth: 2.4,
        fill: m <= 5.5 ? blu : "#fff",
        fillStyle: "solid",
      }),
    ),
  );

// ── shaded cube + sun (bottom-left) ──
const cx = 130,
  cy = 500,
  s = 78,
  dx = s * 0.866,
  dy = s * 0.5;
const fb: Pt = [cx, cy],
  lb: Pt = [cx - dx, cy - dy],
  rb: Pt = [cx + dx, cy - dy],
  ft: Pt = [cx, cy - s],
  lt: Pt = [cx - dx, cy - dy - s],
  rt: Pt = [cx + dx, cy - dy - s],
  bt: Pt = [cx, cy - s - 2 * dy];
add(
  rc.polygon(
    [lb, fb, ft, lt],
    o({
      seed: 60,
      roughness: 1.2,
      fill: ink,
      fillStyle: "cross-hatch",
      hachureGap: 4,
      hachureAngle: 45,
      fillWeight: 1,
    }),
  ),
);
add(
  rc.polygon(
    [fb, rb, rt, ft],
    o({
      seed: 61,
      roughness: 1.2,
      fill: ink,
      fillStyle: "hachure",
      hachureGap: 9,
      hachureAngle: 45,
      fillWeight: 0.9,
    }),
  ),
);
add(rc.polygon([lt, ft, rt, bt], o({ seed: 62, roughness: 1.2 })));
add(rc.line(30, cy + 8, 250, cy + 8, o({ seed: 63 })));
add(
  rc.polygon(
    [
      [cx - dx, cy - dy + 8],
      [cx, cy + 8],
      [cx + dx, cy - dy + 8],
      [cx + dx + 78, cy - dy + 8],
      [cx + 78, cy + 8],
    ],
    o({
      seed: 64,
      roughness: 1,
      stroke: "none",
      fill: "#666",
      fillStyle: "hachure",
      hachureAngle: -30,
      hachureGap: 5,
    }),
  ),
);
const sx = 236,
  sy = 318;
for (let i = 0; i < 10; i++) {
  const a = (i / 10) * Math.PI * 2;
  add(
    rc.line(
      sx + Math.cos(a) * 26,
      sy + Math.sin(a) * 26,
      sx + Math.cos(a) * 40,
      sy + Math.sin(a) * 40,
      o({ seed: 70 + i, stroke: org, strokeWidth: 2.6 }),
    ),
  );
}
add(rc.circle(sx, sy, 42, o({ seed: 80, stroke: org, fill: "#ffd43b", fillStyle: "solid" })));

// ── annotated text (bottom-right): highlight + circle + squiggle ──
const t = (x: number, y: number, label: string, sz = 44, fill = ink) => {
  const e = document.createElementNS("http://www.w3.org/2000/svg", "text");
  e.setAttribute("x", String(x));
  e.setAttribute("y", String(y));
  e.setAttribute("font-family", "Caveat, cursive");
  e.setAttribute("font-size", String(sz));
  e.setAttribute("font-weight", "700");
  e.setAttribute("fill", fill);
  e.textContent = label;
  svg.append(e);
};
add(
  rc.rectangle(
    288,
    348,
    108,
    34,
    o({ seed: 90, roughness: 1.4, stroke: "none", fill: "#ffe066", fillStyle: "solid" }),
  ),
);
t(292, 380, "crisp", 46);
t(414, 380, "vs", 34, "#6b665a");
t(300, 446, "guess", 46);
add(rc.ellipse(340, 434, 128, 58, o({ seed: 91, roughness: 1.8, stroke: red, strokeWidth: 3 })));
const sq: Pt[] = [];
for (let x = 288, k = 0; x <= 390; x += 8, k++) sq.push([x, 470 + (k % 2 ? 4 : -2)]);
add(rc.linearPath(sq, o({ seed: 92, roughness: 0.6, stroke: red, strokeWidth: 2.2 })));
// mini phone wireframe
add(
  rc.rectangle(
    430,
    330,
    76,
    150,
    o({ seed: 95, roughness: 2.6, strokeWidth: 2.6, fill: "#fbfaf6", fillStyle: "solid" }),
  ),
);
add(rc.rectangle(438, 350, 60, 34, o({ seed: 96, roughness: 2.6, strokeWidth: 1.6 })));
add(rc.line(438, 350, 498, 384, o({ seed: 97, roughness: 2.6, strokeWidth: 1.2 })));
add(rc.line(498, 350, 438, 384, o({ seed: 98, roughness: 2.6, strokeWidth: 1.2 })));
add(
  rc.linearPath(
    [
      [440, 400],
      [450, 396],
      [460, 402],
      [470, 396],
      [480, 402],
      [490, 398],
    ],
    o({ seed: 99, roughness: 2, strokeWidth: 1.8 }),
  ),
);
add(
  rc.linearPath(
    [
      [440, 416],
      [452, 412],
      [464, 418],
      [476, 412],
    ],
    o({ seed: 100, roughness: 2, strokeWidth: 1.8 }),
  ),
);
t(438, 456, "??", 30, red);
// little arrow from a margin note
add(rc.line(304, 320, 342, 344, o({ seed: 101, stroke: pur, strokeWidth: 2 })));
add(
  rc.linearPath(
    [
      [326, 344],
      [342, 344],
      [336, 328],
    ],
    o({ seed: 102, stroke: pur, strokeWidth: 2 }),
  ),
);
