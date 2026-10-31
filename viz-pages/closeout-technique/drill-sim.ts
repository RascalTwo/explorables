import { type P, RIM, clamp, dist, norm, sub, add, mul, perp, pathD } from "./common.js";

/** The SVG nodes the drill moves around and the scoreboard/message nodes it writes to. */
export type Els = {
  off: Element;
  def: Element;
  ball: Element;
  drive: Element;
  hand: Element;
  stamp: Element;
  cursor: Element;
  ideal: Element;
  gatherEl: Element;
  stopsEl: Element;
  bucketsEl: Element;
  streakEl: Element;
  msgEl: Element;
};

/** Everything the rep simulation carries from frame to frame. */
export type Sim = {
  D: P;
  Dv: P;
  SH: P;
  pointer: P;
  repGather: number;
  gatherR0: number;
  state: string;
  stateT: number;
  containT: number;
  driveDir: P;
  oTrace: P[];
  stops: number;
  buckets: number;
  streak: number;
};

// shooter spawns — each rep picks one, so angles + help geometry vary
export const SPOTS = [
  { o: { x: 405, y: 205 }, d: { x: 265, y: 200 } },
  { o: { x: 448, y: 112 }, d: { x: 300, y: 150 } },
  { o: { x: 250, y: 272 }, d: { x: 250, y: 196 } },
  { o: { x: 95, y: 205 }, d: { x: 235, y: 200 } },
  { o: { x: 52, y: 112 }, d: { x: 200, y: 150 } },
];
// tunables
const OPEN = 62,
  CROWD = 20,
  CONTEST = 50,
  FLY = 250,
  HOLDMAX = 0.6,
  VMAX = 420,
  OSPEED = 300,
  DUR_CAP = 2.8;

export function placeSpot(sim: Sim, els: Els, s: { o: P; d: P }): void {
  sim.SH = { ...s.o };
  sim.D = { ...s.d };
  sim.pointer = { ...s.d };
  sim.Dv = { x: 0, y: 0 };
  els.ideal.setAttribute("cx", String(sim.SH.x));
  els.ideal.setAttribute("cy", String(sim.SH.y));
  els.ideal.setAttribute("r", String(30));
  els.gatherEl.setAttribute("cx", String(sim.SH.x));
  els.gatherEl.setAttribute("cy", String(sim.SH.y));
}
function setMsg(els: Els, t: string, cls: string) {
  els.msgEl.textContent = t;
  els.msgEl.className = "verdict d-msg " + (cls || "");
}
export function draw(sim: Sim, els: Els): void {
  els.def.setAttribute("transform", `translate(${sim.D.x} ${sim.D.y})`);
  els.off.setAttribute("transform", `translate(${sim.SH.x} ${sim.SH.y})`);
  els.cursor.setAttribute("cx", String(sim.pointer.x));
  els.cursor.setAttribute("cy", String(sim.pointer.y));
}
export function idle(sim: Sim, els: Els): void {
  placeSpot(sim, els, SPOTS[0]!);
  sim.state = "idle";
  els.drive.setAttribute("opacity", String(0));
  els.stamp.setAttribute("opacity", String(0));
  els.hand.setAttribute("opacity", String(0));
  els.gatherEl.setAttribute("opacity", String(0));
  els.ball.setAttribute("cx", String(-13));
  els.ball.setAttribute("cy", String(0));
  setMsg(
    els,
    "Press Start, then steer your defender with the cursor. Sprint out, then break down at the ring.",
    "",
  );
  draw(sim, els);
}
export function newRep(sim: Sim, els: Els): void {
  placeSpot(sim, els, SPOTS[Math.floor(Math.random() * SPOTS.length)]!);
  sim.state = "ready";
  sim.stateT = 0;
  sim.containT = 0;
  sim.oTrace = [];
  sim.gatherR0 = dist(sim.D, sim.SH);
  sim.repGather = clamp(sim.gatherR0 / 220 + 0.4, 0.65, 1.6); // farther closeout → more time
  els.drive.setAttribute("opacity", String(0));
  els.stamp.setAttribute("opacity", String(0));
  els.hand.setAttribute("opacity", String(0));
  els.ball.setAttribute("cx", String(-13));
  els.ball.setAttribute("cy", String(0));
  setMsg(els, "Close out! Get inside the shrinking yellow ring before he's set.", "");
  draw(sim, els);
}
function finish(sim: Sim, els: Els, kind: string, text: string) {
  sim.state = "done";
  sim.stateT = 0;
  const good = kind === "stop";
  if (good) {
    sim.stops++;
    sim.streak++;
  } else {
    sim.buckets++;
    sim.streak = 0;
  }
  els.stopsEl.textContent = String(sim.stops);
  els.bucketsEl.textContent = String(sim.buckets);
  els.streakEl.textContent = String(sim.streak);
  els.gatherEl.setAttribute("opacity", String(0));
  els.stamp.setAttribute("opacity", String(1));
  els.stamp.setAttribute("fill", good ? "var(--accent)" : "#e2493f");
  els.stamp.textContent = good ? "STOP ✓" : "BUCKET";
  setMsg(els, text + "  —  press Start for the next rep.", good ? "good" : "bad");
}
function startDrive(sim: Sim, els: Els) {
  sim.state = "drive";
  sim.stateT = 0;
  sim.oTrace = [{ x: sim.SH.x, y: sim.SH.y }];
  // burst toward the rim, biased to whichever side the defender isn't covering
  const toRim = norm(sub(RIM, sim.SH)),
    p = perp(toRim);
  const lat = (sim.D.x - sim.SH.x) * p.x + (sim.D.y - sim.SH.y) * p.y; // defender's lateral position vs the rim line
  sim.driveDir = norm(add(toRim, mul(p, (lat > 0 ? -1 : 1) * 0.9)));
  setMsg(els, "He's attacking — cut him off! Get between him and the rim.", "");
}
export function step(sim: Sim, els: Els, dt: number): void {
  // defender momentum: accelerate toward the cursor, damped, speed-capped → yanking overshoots
  sim.Dv.x += (sim.pointer.x - sim.D.x) * 10 * dt;
  sim.Dv.y += (sim.pointer.y - sim.D.y) * 10 * dt;
  sim.Dv.x *= 1 - 5.5 * dt;
  sim.Dv.y *= 1 - 5.5 * dt;
  const sp = Math.hypot(sim.Dv.x, sim.Dv.y);
  if (sp > VMAX) {
    sim.Dv.x *= VMAX / sp;
    sim.Dv.y *= VMAX / sp;
  }
  sim.D.x = clamp(sim.D.x + sim.Dv.x * dt, 30, 470);
  sim.D.y = clamp(sim.D.y + sim.Dv.y * dt, 30, 460);
  const vmag = Math.hypot(sim.Dv.x, sim.Dv.y);
  sim.stateT += dt;
  if (sim.state === "ready") {
    const pr = clamp(sim.stateT / sim.repGather, 0, 1); // shrinking "he's gathering" window
    els.gatherEl.setAttribute("r", String(30 + (1 - pr) * sim.gatherR0));
    els.gatherEl.setAttribute("opacity", String(0.3 + 0.45 * (1 - pr)));
    if (sim.stateT >= sim.repGather) {
      sim.state = "hold";
      sim.stateT = 0;
      els.gatherEl.setAttribute("opacity", String(0));
      setMsg(els, "He's set — contest or contain!", "");
    }
  } else if (sim.state === "hold") {
    const d = dist(sim.D, sim.SH);
    if (d > OPEN) {
      sim.state = "shoot";
      sim.stateT = 0;
    } else if (d < CROWD) {
      startDrive(sim, els);
    } else if (vmag > FLY) {
      startDrive(sim, els);
    } else {
      sim.containT += dt;
      if (sim.containT >= HOLDMAX) {
        sim.state = "shoot";
        sim.stateT = 0;
      }
    }
  } else if (sim.state === "shoot") {
    const e = clamp(sim.stateT / 0.42, 0, 1);
    els.ball.setAttribute("cx", String(0));
    els.ball.setAttribute("cy", String(-e * 44));
    const d = dist(sim.D, sim.SH);
    if (d <= CONTEST) {
      els.hand.setAttribute("opacity", String(1));
      els.hand.setAttribute("x1", String(sim.D.x));
      els.hand.setAttribute("y1", String(sim.D.y));
      els.hand.setAttribute("x2", String(sim.SH.x));
      els.hand.setAttribute("y2", String(sim.SH.y - 20));
    } else els.hand.setAttribute("opacity", String(0));
    if (e >= 1) {
      if (dist(sim.D, sim.SH) <= CONTEST)
        finish(sim, els, "stop", "Balanced at the cushion — you contested the shot clean. Stop.");
      else
        finish(sim, els, "bucket", "Too much space — wide-open jumper. You have to close the gap.");
    }
  } else if (sim.state === "drive") {
    const tgt =
      sim.stateT > 0.22
        ? { x: RIM.x, y: 74 }
        : { x: sim.SH.x + sim.driveDir.x * 40, y: sim.SH.y + sim.driveDir.y * 40 };
    const dx = tgt.x - sim.SH.x,
      dy = tgt.y - sim.SH.y,
      l = Math.hypot(dx, dy) || 1;
    sim.SH.x += (dx / l) * OSPEED * dt;
    sim.SH.y += (dy / l) * OSPEED * dt;
    sim.oTrace.push({ x: sim.SH.x, y: sim.SH.y });
    els.drive.setAttribute("d", pathD(sim.oTrace));
    els.drive.setAttribute("opacity", String(0.6));
    const nb = norm({ x: dx, y: dy });
    els.ball.setAttribute("cx", String(nb.x * 13));
    els.ball.setAttribute("cy", String(nb.y * 13));
    if (dist(sim.D, sim.SH) < 27 && dist(sim.D, RIM) < dist(sim.SH, RIM) + 4) {
      finish(sim, els, "stop", "You stayed in front and walled off the drive. Contained — stop.");
      return;
    }
    if (dist(sim.SH, RIM) < 34) {
      finish(
        sim,
        els,
        "bucket",
        "He beat you to the rim — you were too crowded or flying to slide with him.",
      );
      return;
    }
    if (sim.stateT > DUR_CAP) {
      finish(sim, els, "stop", "He couldn't turn the corner on you — contained.");
      return;
    }
  }
  draw(sim, els);
}
