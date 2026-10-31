// Showcase scene — A draggable mind map whose edges keep their seeds while branches move.
import { gen, sk, svgEl, h, P, boil, type Pt } from "./rk.js";
import { ink, SVGW, clamp, txt, mark, mkSvg, toSvg, btn, readout } from "./ui.js";

/* ═════════ F · draggable mind map ═════════ */
interface MNode {
  id: string;
  label: string;
  x: number;
  y: number;
  parent: string | null;
  color: string;
  r: number;
}
export function sceneMindmap(box: HTMLElement): () => void {
  const bar = h("div", "toolbar", "", box);
  btn(bar, "re-arrange", () => {
    layout();
    draw();
  });
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
  const twOf = (n: MNode): number =>
    n.label.length * (n.r === 0 ? 12 : n.r === 1 ? 10.5 : 8.6) + 30;
  function layout(): void {
    nodes = [
      {
        id: "root",
        label: "What a wobbly pen says",
        x: 450,
        y: 270,
        parent: null,
        color: ink,
        r: 0,
      },
    ];
    branches.forEach(([name, col, kids], i) => {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / branches.length;
      const bx = 450 + Math.cos(a) * 185 * 1.25,
        by = 270 + Math.sin(a) * 175;
      nodes.push({ id: name, label: name, x: bx, y: by, parent: "root", color: col, r: 1 });
      kids.forEach((k, j) => {
        const ka = a + (j === 0 ? -0.34 : 0.34);
        nodes.push({
          id: `${name}/${k}`,
          label: k,
          x: 450 + Math.cos(ka) * 330 * 1.28,
          y: 270 + Math.sin(ka) * 250,
          parent: name,
          color: col,
          r: 2,
        });
      });
    });
    for (const n of nodes) {
      n.x = clamp(n.x, twOf(n) / 2 + 24, SVGW - twOf(n) / 2 - 24);
      n.y = clamp(n.y, 44, 486);
    }
  }
  layout();
  let drag: { id: string; last: Pt } | null = null;
  svg.addEventListener("pointerdown", (e) => {
    const g = e.target instanceof Element ? e.target.closest<SVGElement>("[data-node]") : null;
    if (!g) return;
    drag = { id: g.dataset["node"]!, last: toSvg(svg, e) };
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const [px, py] = toSvg(svg, e);
    const group = subtree(drag.id);
    for (const m of group) {
      m.x += px - drag.last[0];
      m.y += py - drag.last[1];
    }
    drag.last = [px, py];
    info.textContent = `${drag.id.split("/").pop()} — ${group.length} node(s) moving`;
    draw();
  });
  svg.addEventListener("pointerup", () => {
    drag = null;
  });
  const kidsOf = (id: string): MNode[] => nodes.filter((n) => n.parent === id);
  const subtree = (id: string): MNode[] => {
    const n = nodes.find((m) => m.id === id)!;
    return [n, ...kidsOf(id).flatMap((k) => subtree(k.id))];
  };
  function draw(): void {
    svg.replaceChildren();
    const edges = svgEl("g", {}, svg),
      shapes = svgEl("g", {}, svg);
    nodes.forEach((n, i) => {
      if (n.parent) {
        const p = nodes.find((m) => m.id === n.parent)!;
        const ex = n.r === 2 ? n.x + (p.x < n.x ? -1 : 1) * (twOf(n) / 2 - 6) : n.x,
          ey = n.r === 2 ? n.y + 13 : n.y;
        sk(
          edges,
          gen.curve(
            [
              [p.x, p.y],
              [(p.x + ex) / 2 - (ey - p.y) * 0.12, (p.y + ey) / 2 + (ex - p.x) * 0.12],
              [ex, ey],
            ],
            { seed: 10 + i + boil, roughness: 1, stroke: n.color, strokeWidth: n.r === 1 ? 3 : 2 },
          ),
        );
      }
    });
    nodes.forEach((n, i) => {
      const g = mark(shapes, `mm-${n.id}`, `Mind-map node: ${n.label}`);
      g.style.cursor = "grab";
      g.dataset["node"] = n.id;
      const tw = twOf(n);
      if (n.r === 0)
        sk(
          g,
          gen.ellipse(n.x, n.y, tw + 20, 88, {
            seed: 200 + boil,
            roughness: 1.3,
            stroke: ink,
            strokeWidth: 3,
            fill: "#fff3bf",
            fillStyle: "solid",
          }),
        );
      else if (n.r === 1)
        sk(
          g,
          gen.rectangle(n.x - tw / 2, n.y - 24, tw, 48, {
            seed: 300 + i + boil,
            roughness: 1.2,
            stroke: n.color,
            strokeWidth: 2.6,
            fill: n.color,
            fillStyle: "hachure",
            hachureGap: 7,
            fillWeight: 1,
          }),
        );
      else
        sk(
          g,
          gen.line(n.x - tw / 2 + 6, n.y + 12, n.x + tw / 2 - 6, n.y + 14, {
            seed: 400 + i + boil,
            stroke: n.color,
            strokeWidth: 2.4,
            bowing: 2,
          }),
        );
      if (n.r === 1)
        svgEl(
          "rect",
          {
            x: n.x - tw / 2 + 8,
            y: n.y - 16,
            width: tw - 16,
            height: 32,
            rx: 4,
            fill: "#fff",
            "fill-opacity": 0.88,
          },
          g,
        );
      txt(g, n.x, n.y + (n.r === 2 ? 4 : 8), n.label, {
        anchor: "middle",
        size: n.r === 0 ? 30 : n.r === 1 ? 24 : 20,
        weight: n.r === 2 ? 500 : 700,
      });
    });
  }
  draw();
  return draw;
}
