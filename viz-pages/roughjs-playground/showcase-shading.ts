// Showcase scene — Engraver's shading: hatch density as a brightness scale on an isometric cube and a sphere.
import { gen, sk, svgEl, h, P, boil, type Opts, type Pt } from "./rk.js";
import { ink, clamp, lerp, txt, mark, mkSvg, toSvg, rangeCtl, readout } from "./ui.js";

/* ═════════ D · engraving: shading by hatch density ═════════ */
/** Brightness (0 dark … 1 lit) → pen options: tighter, heavier hatching as the face gets darker. */
const shade = (b: number, seed: number): Opts => {
  if (b < 0.06)
    return {
      seed,
      stroke: ink,
      fill: ink,
      fillStyle: "cross-hatch",
      hachureGap: 2.6,
      hachureAngle: 45,
      fillWeight: 1.4,
      strokeWidth: 2,
    };
  if (b < 0.3)
    return {
      seed,
      stroke: ink,
      fill: ink,
      fillStyle: "cross-hatch",
      hachureGap: lerp(3, 6, b / 0.3),
      hachureAngle: 45,
      fillWeight: 1,
      strokeWidth: 2,
    };
  if (b < 0.85)
    return {
      seed,
      stroke: ink,
      fill: ink,
      fillStyle: "hachure",
      hachureGap: lerp(4, 16, (b - 0.3) / 0.55),
      hachureAngle: 45,
      fillWeight: lerp(1.3, 0.6, (b - 0.3) / 0.55),
      strokeWidth: 2,
    };
  return { seed, stroke: ink, strokeWidth: 2 };
};
export function sceneShading(box: HTMLElement): () => void {
  const bar = h("div", "toolbar", "", box);
  let sun = 62; // degrees along the arc, 0 = far right horizon, 90 = overhead, 180 = far left
  const slider = rangeCtl(
    bar,
    "sun angle",
    6,
    174,
    1,
    sun,
    (v) => {
      sun = v;
      draw();
    },
    (v) => `${v}°`,
  );
  const info = readout(bar);
  info.textContent = "drag the sun · or use the slider";
  const svg = mkSvg(box);
  const CX = 450,
    CY = 450,
    R = 380;
  // drag lives on the persistent <svg>: draw() rebuilds the sun, which would drop pointer capture
  let dragging = false;
  svg.addEventListener("pointerdown", (e) => {
    if (e.target instanceof Element && e.target.closest('[data-viz-id="sun"]')) {
      dragging = true;
      svg.setPointerCapture(e.pointerId);
    }
  });
  svg.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const [px, py] = toSvg(svg, e);
    sun = Math.round(clamp((Math.atan2(CY - py, px - CX) * 180) / Math.PI, 6, 174));
    slider.value = String(sun);
    draw();
  });
  svg.addEventListener("pointerup", () => {
    dragging = false;
  });
  const dx = 130 * 0.866,
    dy = 130 * 0.5,
    s = 130,
    cx = 280,
    cy = 420;
  function draw(): void {
    svg.replaceChildren();
    const a = (sun * Math.PI) / 180;
    const L: [number, number, number] = [Math.cos(a), 0.35, Math.sin(a)];
    const ll = Math.hypot(...L);
    const light: [number, number, number] = [L[0] / ll, L[1] / ll, L[2] / ll];
    const lit = (n: [number, number, number]): number =>
      clamp(0.08 + 0.92 * Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]), 0, 1);
    const bTop = lit([0, 0, 1]),
      bLeft = lit([-0.87, 0.5, 0]),
      bRight = lit([0.87, 0.5, 0]);
    txt(svg, 40, 40, "Shading = hatch density. The darker the face, the tighter the pen.", {
      size: 26,
      weight: 700,
    });
    // sun arc + ground
    sk(
      svg,
      gen.path(`M ${CX + R} ${CY} A ${R} ${R} 0 0 0 ${CX - R} ${CY}`, {
        seed: 5,
        roughness: 0.8,
        stroke: "#d0c9b5",
        strokeWidth: 1.6,
        strokeLineDash: [6, 8],
      }),
    );
    sk(svg, gen.line(40, CY + 10, 860, CY + 10, { seed: 6, stroke: ink, strokeWidth: 2.4 }));
    // shadow on the ground (opposite the light)
    if (sun > 8 && sun < 172) {
      const len = clamp(dx * 2.4 * (light[0] / Math.max(0.15, light[2])), -260, 260);
      const base: Pt[] = [
        [cx - dx, cy - dy + 10],
        [cx, cy + 10],
        [cx + dx, cy - dy + 10],
      ];
      const tip: Pt[] = base.map(([x, y]) => [x - len, y] as Pt);
      const g = mark(svg, "shadow-cube", "Cube shadow");
      sk(
        g,
        gen.polygon([...base, ...tip.toReversed()], {
          seed: 20 + boil,
          roughness: 1.2,
          stroke: "none",
          fill: "#666",
          fillStyle: "hachure",
          hachureAngle: -30,
          hachureGap: 5,
          fillWeight: 1,
        }),
      );
    }
    const gc = mark(svg, "cube", "Isometric cube");
    const fb: Pt = [cx, cy],
      lb: Pt = [cx - dx, cy - dy],
      rb: Pt = [cx + dx, cy - dy],
      ft: Pt = [cx, cy - s],
      lt: Pt = [cx - dx, cy - dy - s],
      rt: Pt = [cx + dx, cy - dy - s],
      bt: Pt = [cx, cy - s - 2 * dy];
    sk(gc, gen.polygon([lb, fb, ft, lt], shade(bLeft, 31 + boil)));
    sk(gc, gen.polygon([fb, rb, rt, ft], shade(bRight, 32 + boil)));
    sk(gc, gen.polygon([lt, ft, rt, bt], shade(bTop, 33 + boil)));
    // sphere: a lit disc that darkens away from the light
    const sx = 640,
      sy = 350,
      sr = 92;
    const gs = mark(svg, "sphere", "Sphere");
    const bSph = clamp(0.25 + 0.75 * Math.max(0, light[2] * 0.7 + Math.abs(light[0]) * 0.2), 0, 1);
    sk(gs, gen.circle(sx, sy, sr * 2, { ...shade(bSph * 0.75, 41 + boil), hachureAngle: -40 }));
    sk(
      gs,
      gen.ellipse(sx + light[0] * 40, sy - light[2] * 46, 34, 22, {
        seed: 42 + boil,
        roughness: 0.8,
        stroke: "none",
        fill: "#fff",
        fillStyle: "solid",
      }),
    );
    sk(
      svg,
      gen.line(sx - 90, CY + 10, sx + 90, CY + 10, { seed: 43, stroke: ink, strokeWidth: 2 }),
    );
    // value scale, drawn with the same shade()
    txt(svg, 40, 96, "value scale (light → dark):", { size: 20, fill: P.muted });
    for (let i = 0; i < 8; i++) {
      const b = 1 - i / 7;
      sk(svg, gen.rectangle(40 + i * 44, 108, 38, 26, shade(b, 60 + i)));
    }
    // the sun — draggable along the arc
    const sxp = CX + R * Math.cos(a),
      syp = CY - R * Math.sin(a);
    const gsun = mark(svg, "sun", "Sun (drag me)");
    gsun.style.cursor = "grab";
    gsun.setAttribute("tabindex", "0");
    gsun.setAttribute("role", "slider");
    gsun.setAttribute("aria-label", "Sun angle");
    gsun.setAttribute("aria-valuenow", String(sun));
    for (let i = 0; i < 10; i++) {
      const ra = (i / 10) * Math.PI * 2;
      sk(
        gsun,
        gen.line(
          sxp + Math.cos(ra) * 34,
          syp + Math.sin(ra) * 34,
          sxp + Math.cos(ra) * 50,
          syp + Math.sin(ra) * 50,
          { seed: 70 + i + boil, stroke: "#f08c00", strokeWidth: 2.4 },
        ),
      );
    }
    sk(
      gsun,
      gen.circle(sxp, syp, 56, {
        seed: 80 + boil,
        stroke: "#f08c00",
        strokeWidth: 2.4,
        fill: "#ffd43b",
        fillStyle: "solid",
      }),
    );
    svgEl("circle", { cx: sxp, cy: syp, r: 60, fill: "transparent" }, gsun);
    info.textContent = `sun ${sun}° → faces: left ${(bLeft * 100).toFixed(0)}% · right ${(bRight * 100).toFixed(0)}% · top ${(bTop * 100).toFixed(0)}% lit`;
    gsun.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowLeft" ? 4 : e.key === "ArrowRight" ? -4 : 0;
      if (d) {
        e.preventDefault();
        e.stopPropagation();
        sun = clamp(sun + d, 6, 174);
        slider.value = String(sun);
        draw();
      }
    });
  }
  draw();
  return draw;
}
