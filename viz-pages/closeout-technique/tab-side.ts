import {
  type Api,
  type P,
  isForce,
  scope,
  norm,
  sub,
  add,
  mul,
  perp,
  clamp,
  along,
  pathD,
  COURT,
  O,
  dir,
  toMid,
  toBase,
} from "./common.js";

/* ---------------- TAB 3: FORCE A SIDE ---------------- */
export function initSide(root: HTMLElement): Api {
  const $ = scope(root);
  $(".courtbg").innerHTML = COURT;
  const HELPB = { x: 300, y: 120 }; // low man in the short corner / baseline help
  const off = $(".off"),
    def = $(".def"),
    ball = $(".ball"),
    help = $(".help"),
    wall = $(".wall"),
    lane = $(".lane"),
    sdrive = $(".sdrive"),
    hhi = $(".hhi"),
    hlo = $(".hlo"),
    stamp = $(".sstamp"),
    vEl = $(".side-verdict"),
    vBig = vEl.querySelector<HTMLElement>(".big")!,
    vText = $(".side-text");
  off.setAttribute("transform", `translate(${O.x} ${O.y})`);
  ball.setAttribute("cx", String(-13));
  help.setAttribute("transform", `translate(${HELPB.x} ${HELPB.y})`);
  let force: "baseline" | "straight" | "middle" = "baseline",
    raf: number | null = null;
  const IDEAL = 30;
  // defender shades to the side he's TAKING AWAY, funneling to the open side
  const CFG = {
    baseline: {
      shade: toMid,
      give: toBase,
      cls: "good",
      big: "✓ CONTAINED",
      txt: "You shaded his middle and forced him baseline — right into the short corner where help is waiting. Contested shot or a walled-off drive. This is the goal.",
    },
    straight: {
      shade: { x: 0, y: 0 },
      give: null,
      cls: "ok",
      big: "⚠ 50/50",
      txt: "Square closeout. You contest the shot, but you took no side away — a live driver just picks one. Fine against a shooter, dangerous against a driver.",
    },
    middle: {
      shade: toBase,
      give: toMid,
      cls: "bad",
      big: "🏀 LAYUP",
      txt: "You shaded baseline and forced him middle — straight into the open lane with no one home. This is the mistake: never force middle.",
    },
  };
  function still() {
    const c = CFG[force];
    const d = add(O, add(mul(dir, -IDEAL), mul(c.shade, 10))); // arm's length, shaded toward taken side
    def.setAttribute("transform", `translate(${d.x} ${d.y})`);
    // high hand up toward shot; low hand toward the side being walled off
    hhi.setAttribute("x1", String(d.x));
    hhi.setAttribute("y1", String(d.y));
    hhi.setAttribute("x2", String(O.x));
    hhi.setAttribute("y2", String(O.y - 20));
    hhi.setAttribute("opacity", String(1));
    if (force === "straight") {
      hlo.setAttribute("opacity", String(0));
      wall.setAttribute("d", "");
      lane.setAttribute("opacity", String(0));
    } else {
      const lp = add(d, mul(c.shade, 26));
      hlo.setAttribute("x1", String(d.x));
      hlo.setAttribute("y1", String(d.y));
      hlo.setAttribute("x2", String(lp.x));
      hlo.setAttribute("y2", String(lp.y));
      hlo.setAttribute("opacity", String(1));
      // shaded "taken away" wedge from shooter toward the walled side
      const w1 = add(O, mul(c.shade, 90)),
        wp = perp(c.shade);
      const a = add(O, mul(wp, 16)),
        b = add(O, mul(wp, -16));
      wall.setAttribute(
        "d",
        `M ${a.x} ${a.y} L ${add(w1, mul(wp, 26)).x} ${add(w1, mul(wp, 26)).y} L ${add(w1, mul(wp, -26)).x} ${add(w1, mul(wp, -26)).y} L ${b.x} ${b.y} Z`,
      );
      // forced-lane arrow toward the give side
      const g1 = add(O, mul(c.give!, 30)),
        g2 = add(O, mul(c.give!, 95));
      lane.setAttribute("d", `M ${g1.x} ${g1.y} L ${g2.x} ${g2.y}`);
      lane.setAttribute("opacity", String(0.9));
    }
    sdrive.setAttribute("opacity", String(0));
    stamp.setAttribute("opacity", String(0));
    vEl.className = "verdict side-verdict " + c.cls;
    vBig.textContent = c.big;
    vText.textContent = c.txt;
  }
  function stop() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }
  function run() {
    stop();
    const c = CFG[force];
    still();
    let path: P[] = [],
      shoots = force === "straight";
    if (force === "baseline") path = [O, add(O, mul(toBase, 42)), { x: 330, y: 110 }, HELPB]; // driven baseline into help
    else if (force === "middle")
      path = [O, add(O, mul(toMid, 50)), { x: 295, y: 150 }, { x: 262, y: 80 }]; // middle to rim
    let a = 0,
      last = 0;
    const DUR = 1500;
    function frame(ts: number) {
      if (!last) last = ts;
      a += (ts - last) / DUR;
      last = ts;
      const e = clamp(a, 0, 1);
      if (shoots) {
        ball.setAttribute("cx", String(0));
        ball.setAttribute("cy", String(-e * 38));
      } else {
        const o = along(path, e);
        off.setAttribute("transform", `translate(${o.x} ${o.y})`);
        const n = norm(sub(along(path, Math.min(1, e + 0.05)), o));
        ball.setAttribute("cx", String(n.x * 13));
        ball.setAttribute("cy", String(n.y * 13));
        sdrive.setAttribute("d", pathD(path));
        sdrive.setAttribute("opacity", String(0.65));
        sdrive.setAttribute("stroke", force === "baseline" ? "#36c98f" : "#e2493f");
      }
      if (e >= 1) {
        stamp.setAttribute("opacity", String(1));
        stamp.setAttribute(
          "fill",
          c.cls === "bad" || c.cls === "open"
            ? "#e2493f"
            : c.cls === "ok"
              ? "#e2b23f"
              : "var(--accent)",
        );
        stamp.textContent = c.big;
        stop();
        return;
      }
      raf = requestAnimationFrame(frame);
    }
    off.setAttribute("transform", `translate(${O.x} ${O.y})`);
    raf = requestAnimationFrame(frame);
  }
  root.querySelectorAll<HTMLElement>(".side-seg button").forEach((b) =>
    b.addEventListener("click", () => {
      root.querySelectorAll<HTMLElement>(".side-seg button").forEach((x) => {
        x.classList.toggle("active", x === b);
      });
      {
        const f = b.dataset["f"];
        if (isForce(f)) force = f;
      }
      stop();
      still();
    }),
  );
  $(".side-run").addEventListener("click", run);
  still();
  return {
    onHide: () => {
      stop();
      still();
    },
  };
}
