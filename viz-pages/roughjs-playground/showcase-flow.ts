// Showcase scene — A decision flowchart you can walk.
import { gen, sk, svgEl, h, P, arrow, boil, type Opts, type Pt } from "./rk.js";
import { ink, txt, mark, mkSvg, btn, readout } from "./ui.js";

/* ═════════ I · decision flowchart you can walk ═════════ */
interface FNode {
  id: string;
  kind: "ellipse" | "diamond" | "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
  col: string;
}
export function sceneFlow(box: HTMLElement): () => void {
  const bar = h("div", "toolbar", "", box);
  let path = ["start"];
  const info = readout(bar);
  const yes = btn(bar, "Yes", () => step("yes")),
    no = btn(bar, "No", () => step("no"));
  btn(bar, "restart", () => {
    path = ["start"];
    draw();
  });
  const svg = mkSvg(box);
  const N: FNode[] = [
    {
      id: "start",
      kind: "ellipse",
      x: 450,
      y: 46,
      w: 270,
      h: 58,
      lines: ["Should I sketch it?"],
      col: P.c4,
    },
    {
      id: "q1",
      kind: "diamond",
      x: 450,
      y: 170,
      w: 320,
      h: 116,
      lines: ["Is “rough” part", "of the message?"],
      col: P.c3,
    },
    {
      id: "q2",
      kind: "diamond",
      x: 230,
      y: 320,
      w: 320,
      h: 116,
      lines: ["Need automatic", "layout?"],
      col: P.c3,
    },
    {
      id: "o1",
      kind: "rect",
      x: 730,
      y: 320,
      w: 250,
      h: 88,
      lines: ["Crisp SVG / Canvas", "skip the wobble"],
      col: P.c1,
    },
    {
      id: "o2",
      kind: "rect",
      x: 110,
      y: 468,
      w: 210,
      h: 82,
      lines: ["Compute layout (elk, d3)", "Rough.js draws boxes"],
      col: P.c2,
    },
    {
      id: "o3",
      kind: "rect",
      x: 370,
      y: 468,
      w: 220,
      h: 82,
      lines: ["Hand-place shapes", "+ SVG <text>"],
      col: P.c2,
    },
  ];
  const E: Array<{ a: string; b: string; ans: "yes" | "no" | ""; ap: "b" | "l" | "r"; bp: "t" }> = [
    { a: "start", b: "q1", ans: "", ap: "b", bp: "t" },
    { a: "q1", b: "q2", ans: "yes", ap: "l", bp: "t" },
    { a: "q1", b: "o1", ans: "no", ap: "r", bp: "t" },
    { a: "q2", b: "o2", ans: "yes", ap: "l", bp: "t" },
    { a: "q2", b: "o3", ans: "no", ap: "b", bp: "t" },
  ];
  const node = (id: string): FNode => N.find((n) => n.id === id)!;
  const port = (n: FNode, s: "b" | "l" | "r" | "t"): Pt =>
    s === "b"
      ? [n.x, n.y + n.h / 2]
      : s === "t"
        ? [n.x, n.y - n.h / 2]
        : s === "l"
          ? [n.x - n.w / 2, n.y]
          : [n.x + n.w / 2, n.y];
  function step(ans: "yes" | "no"): void {
    const cur = path.at(-1)!;
    const e = E.find((x) => x.a === cur && x.ans === ans);
    if (e) {
      path.push(e.b);
      draw();
    }
  }
  function draw(): void {
    svg.replaceChildren();
    const cur = path.at(-1)!;
    yes.disabled = no.disabled = !(node(cur).kind === "diamond");
    if (cur === "start") {
      path.push("q1");
      draw();
      return;
    }
    info.textContent =
      node(cur).kind === "diamond" ? "answer the question" : `→ ${node(cur).lines.join(" ")}`;
    E.forEach((e, i) => {
      const A = node(e.a),
        B = node(e.b);
      const [x1, y1] = port(A, e.ap),
        [x2, y2] = port(B, e.bp);
      const taken =
        path.includes(e.a) && path.includes(e.b) && path.indexOf(e.b) === path.indexOf(e.a) + 1;
      const g = mark(svg, `edge-${e.a}-${e.b}`, `${A.id} → ${B.id} (${e.ans || "next"})`);
      arrow(g, x1, y1, x2, y2, {
        seed: 10 + i + boil,
        roughness: taken ? 0.8 : 2.2,
        stroke: taken ? P.c6 : "#b9b3a3",
        strokeWidth: taken ? 3.6 : 1.8,
        bowing: 1.5,
      });
      if (e.ans)
        txt(g, (x1 + x2) / 2 + (x2 < x1 ? -34 : 12), (y1 + y2) / 2 - 4, e.ans, {
          size: 24,
          fill: taken ? P.c6 : P.muted,
          weight: 700,
        });
    });
    N.forEach((n, i) => {
      const seen = path.includes(n.id),
        on = n.id === cur;
      const o: Opts = {
        seed: 100 + i + boil,
        roughness: seen ? 1 : 2.4,
        stroke: seen ? ink : "#b9b3a3",
        strokeWidth: on ? 4.4 : seen ? 2.8 : 1.6,
        hachureGap: 8,
        ...(seen ? { fill: n.col, fillStyle: on ? "solid" : "hachure" } : {}),
      };
      const g = mark(svg, `fn-${n.id}`, n.lines.join(" "));
      if (n.kind === "ellipse") sk(g, gen.ellipse(n.x, n.y, n.w, n.h, o));
      else if (n.kind === "diamond")
        sk(
          g,
          gen.polygon(
            [
              [n.x, n.y - n.h / 2],
              [n.x + n.w / 2, n.y],
              [n.x, n.y + n.h / 2],
              [n.x - n.w / 2, n.y],
            ],
            o,
          ),
        );
      else sk(g, gen.rectangle(n.x - n.w / 2, n.y - n.h / 2, n.w, n.h, o));
      const lh = 26,
        y0 = n.y - ((n.lines.length - 1) * lh) / 2 + 8;
      const plate = Math.max(0, ...n.lines.map((l) => l.length)) * 10.5 + 16;
      if (seen)
        svgEl(
          "rect",
          {
            x: n.x - plate / 2,
            y: y0 - 22,
            width: plate,
            height: n.lines.length * lh + 6,
            rx: 6,
            fill: "#fff",
            "fill-opacity": on ? 0.95 : 0.8,
          },
          g,
        );
      n.lines.forEach((l, k) => {
        txt(g, n.x, y0 + k * lh, l, {
          anchor: "middle",
          size: 23,
          weight: 700,
          fill: seen ? ink : P.muted,
        });
      });
    });
  }
  draw();
  return draw;
}
