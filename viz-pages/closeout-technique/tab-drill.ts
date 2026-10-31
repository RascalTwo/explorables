import { type Api, need, scope, COURT } from "./common.js";
import { SPOTS, draw, idle, newRep, placeSpot, step, type Els, type Sim } from "./drill-sim.js";

/* ---------------- TAB 7: LIVE DRILL (REAL-TIME) ---------------- */
export function initDrill(root: HTMLElement): Api {
  const $ = scope(root);
  $(".courtbg").innerHTML = COURT;
  const svg = need(root.querySelector<SVGSVGElement>(".drill-court"), ".drill-court"),
    off = $(".off"),
    def = $(".def"),
    ball = $(".ball"),
    drive = $(".ddrive"),
    hand = $(".dhand"),
    stamp = $(".dstamp"),
    cursor = $(".dcursor"),
    ideal = $(".dideal"),
    gatherEl = $(".dgather");
  const stopsEl = $(".d-stops"),
    bucketsEl = $(".d-buckets"),
    streakEl = $(".d-streak"),
    msgEl = $(".d-msg"),
    startBtn = $(".d-start");
  const sim: Sim = {
    D: { x: 265, y: 200 },
    Dv: { x: 0, y: 0 },
    SH: { x: 405, y: 205 },
    pointer: { x: 265, y: 200 },
    // gather (reaction window) scales with the closeout distance, so a far spawn gives you time to arrive
    repGather: 0.9,
    gatherR0: 120,
    state: "idle",
    stateT: 0,
    containT: 0,
    driveDir: { x: 0, y: 0 },
    oTrace: [],
    stops: 0,
    buckets: 0,
    streak: 0,
  };
  const els: Els = {
    off,
    def,
    ball,
    drive,
    hand,
    stamp,
    cursor,
    ideal,
    gatherEl,
    stopsEl,
    bucketsEl,
    streakEl,
    msgEl,
  };
  placeSpot(sim, els, SPOTS[0]!);
  let raf: number | null = null,
    lastTs = 0;
  const pt = svg.createSVGPoint();
  const toSvg = (e: MouseEvent) => {
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };
  const onMove = (e: MouseEvent) => {
    sim.pointer = toSvg(e);
  };
  svg.addEventListener("pointermove", onMove);
  svg.addEventListener("mousemove", onMove);
  function loop(ts: number) {
    if (!lastTs) lastTs = ts;
    let dt = (ts - lastTs) / 1000;
    lastTs = ts;
    dt = Math.min(dt, 0.05);
    if (sim.state === "idle" || sim.state === "done") draw(sim, els);
    else step(sim, els, dt);
    raf = requestAnimationFrame(loop);
  }
  startBtn.addEventListener("click", () => {
    newRep(sim, els);
  });
  idle(sim, els);
  return {
    onShow() {
      lastTs = 0;
      raf ??= requestAnimationFrame(loop);
    },
    onHide() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      if (sim.state !== "idle") idle(sim, els);
    },
  };
}
