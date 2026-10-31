import {
  type Api,
  type P,
  type Force,
  isForce,
  need,
  scope,
  RIM,
  norm,
  sub,
  add,
  mul,
  clamp,
  along,
  pathD,
  COURT,
  O,
  dir,
  toMid,
  toBase,
} from "./common.js";

/* ---------------- TAB 6: YOU TRY IT (SANDBOX) ---------------- */
/** What a possession ends as, from the cushion in court px, the control (0..1), the forced side and whether he left late. */
function evalPossession(c: number, control: number, force: Force, late: boolean) {
  const cards = {
    distance: c >= 16 && c <= 52,
    balance: control >= 0.45,
    angle: force === "baseline",
    timing: !late,
  };
  let type: string, title: string, text: string;
  if (late && c < 70) {
    type = "open";
    title = "OPEN SHOT";
    text =
      "You left after the catch — the ball is up before you arrive. Leave on the flight of the pass, not the catch.";
  } else if (c > 52) {
    type = "open";
    title = "OPEN SHOT";
    text = "Too soft — you pulled up and gave a clean look. Closing out means closing the gap.";
  } else if (c < 16) {
    type = "blowby";
    title = "BLOW-BY";
    text = "You crowded him. One rip-through and he's past you before you can move a foot.";
  } else if (control < 0.45) {
    type = "blowby";
    title = "BLOW-BY";
    text =
      "You flew in out of control — no chop, no balance. He drove and you couldn't slide with him.";
  } else if (force === "middle") {
    type = "drive";
    title = "DRIVE TO THE RIM";
    text =
      "Good cushion, but you forced him MIDDLE — straight into the open lane. Take the middle away, force baseline.";
  } else if (force === "straight") {
    type = "contest";
    title = "CONTESTED — but 50/50";
    text =
      "Square closeout: you bothered the shot, but took no side away. A live driver just picks one. Force him a way.";
  } else {
    type = "contained";
    title = "CONTAINED ✓";
    text =
      "Arm's length, chopped down and balanced, forced baseline into help. Contested shot or a walled-off drive. Textbook.";
  }
  const grade = type === "contained" ? "A" : type === "contest" ? "B" : type === "open" ? "D" : "C";
  const cls = type === "contained" ? "good" : type === "contest" ? "ok" : "bad";
  return { type, title, text, grade, cls, cards };
}

/** Fills the four scorecard cells from a graded possession (or blanks them). */
function paintScorecard(root: HTMLElement, cards: Record<string, boolean> | null, live: boolean) {
  root.querySelectorAll<HTMLElement>(".sc").forEach((sc) => {
    const k = sc.dataset["k"]!;
    const v = sc.querySelector(".v")!;
    if (!live) {
      sc.className = "sc";
      v.textContent = "—";
      return;
    }
    const ok = cards![k];
    sc.className = "sc " + (ok ? "pass" : "fail");
    v.textContent = ok ? "✓" : "✗";
  });
}

export function initSandbox(root: HTMLElement): Api {
  const $ = scope(root);
  $(".courtbg").innerHTML = COURT;
  const HELPB = { x: 300, y: 120 };
  const off = $(".off"),
    def = $(".def"),
    ball = $(".ball"),
    help = $(".help"),
    ideal = $(".ideal"),
    drive = $(".sbdrive"),
    hhi = $(".hhi"),
    hlo = $(".hlo"),
    stamp = $(".sbstamp"),
    gradeEl = $("#sbGrade"),
    vEl = $(".sb-verdict"),
    vBig = vEl.querySelector<HTMLElement>(".big")!,
    vText = $(".sb-text");
  const cush = need(root.querySelector<HTMLInputElement>(".sb-cush"), ".sb-cush"),
    ctrl = need(root.querySelector<HTMLInputElement>(".sb-ctrl"), ".sb-ctrl");
  let force: "baseline" | "straight" | "middle" = "baseline",
    timing = "early",
    raf: number | null = null;
  const cushOf = (v: number) => 6 + (v / 100) * 84;
  off.setAttribute("transform", `translate(${O.x} ${O.y})`);
  ball.setAttribute("cx", String(-13));
  ideal.setAttribute("cx", String(O.x));
  ideal.setAttribute("cy", String(O.y));
  ideal.setAttribute("r", String(30));
  help.setAttribute("transform", `translate(${HELPB.x} ${HELPB.y})`);
  const shadeOf = () =>
    force === "baseline" ? toMid : force === "middle" ? toBase : { x: 0, y: 0 };
  function defPos() {
    const c = cushOf(+cush.value);
    return add(O, add(mul(dir, -c), mul(shadeOf(), 9)));
  }
  function still() {
    const d = defPos();
    def.setAttribute("transform", `translate(${d.x} ${d.y})`);
    off.setAttribute("transform", `translate(${O.x} ${O.y})`);
    ball.setAttribute("cx", String(-13));
    ball.setAttribute("cy", String(0));
    // hands preview
    hhi.setAttribute("x1", String(d.x));
    hhi.setAttribute("y1", String(d.y));
    hhi.setAttribute("x2", String(O.x));
    hhi.setAttribute("y2", String(O.y - 20));
    hhi.setAttribute("opacity", String(0.85));
    if (force === "straight") {
      hlo.setAttribute("opacity", String(0));
    } else {
      const lp = add(d, mul(shadeOf(), 24));
      hlo.setAttribute("x1", String(d.x));
      hlo.setAttribute("y1", String(d.y));
      hlo.setAttribute("x2", String(lp.x));
      hlo.setAttribute("y2", String(lp.y));
      hlo.setAttribute("opacity", String(0.85));
    }
    drive.setAttribute("opacity", String(0));
    stamp.setAttribute("opacity", String(0));
    help.setAttribute("opacity", String(0));
  }
  function stop() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
    $(".sb-run").textContent = "▶ Run possession";
  }
  function run() {
    stop();
    const r = evalPossession(cushOf(+cush.value), +ctrl.value / 100, force, timing === "late");
    const d0 = defPos();
    gradeEl.textContent = r.grade;
    gradeEl.style.borderColor =
      r.cls === "good" ? "var(--accent)" : r.cls === "ok" ? "#e2b23f" : "#e2493f";
    gradeEl.style.color = gradeEl.style.borderColor;
    vEl.className = "verdict sb-verdict " + r.cls;
    vBig.textContent = r.title;
    vText.textContent = r.text;
    paintScorecard(root, r.cards, true);
    // build shooter action
    let path: P[] | null = null,
      shoot = false,
      showHelp = false;
    if (r.type === "open" || r.type === "contest") {
      shoot = true;
    } else if (r.type === "contained") {
      path = [O, add(O, mul(toBase, 40)), { x: 330, y: 110 }, HELPB];
      showHelp = true;
    } else if (r.type === "drive") {
      path = [O, add(O, mul(toMid, 50)), { x: 295, y: 150 }, { x: 262, y: 80 }];
    } else if (r.type === "blowby") {
      const way = force === "middle" ? toMid : toBase;
      path = [
        O,
        add(d0, mul(way, 10)),
        add(O, mul(way, 60)),
        { x: RIM.x + (way.x > 0 ? 34 : -4), y: 120 },
        { x: RIM.x, y: 78 },
      ];
    }
    $(".sb-run").textContent = "❚❚";
    let a = 0,
      last = 0;
    const DUR = 1600;
    function frame(ts: number) {
      if (!last) last = ts;
      a += (ts - last) / DUR;
      last = ts;
      const e = clamp(a, 0, 1);
      if (shoot) {
        ball.setAttribute("cx", String(0));
        ball.setAttribute("cy", String(-e * 40));
        if (r.type === "contest") {
          hhi.setAttribute("opacity", String(1));
        }
      } else {
        const o = along(path!, e);
        off.setAttribute("transform", `translate(${o.x} ${o.y})`);
        const n = norm(sub(along(path!, Math.min(1, e + 0.05)), o));
        ball.setAttribute("cx", String(n.x * 13));
        ball.setAttribute("cy", String(n.y * 13));
        drive.setAttribute("d", pathD(path!));
        drive.setAttribute("opacity", String(0.65));
        drive.setAttribute("stroke", r.type === "contained" ? "#36c98f" : "#e2493f");
        if (showHelp) {
          help.setAttribute("opacity", String(e));
        }
      }
      if (e >= 1) {
        stamp.setAttribute("opacity", String(1));
        stamp.setAttribute(
          "fill",
          r.cls === "good" ? "var(--accent)" : r.cls === "ok" ? "#e2b23f" : "#e2493f",
        );
        stamp.textContent = r.title;
        stop();
        return;
      }
      raf = requestAnimationFrame(frame);
    }
    off.setAttribute("transform", `translate(${O.x} ${O.y})`);
    raf = requestAnimationFrame(frame);
  }
  cush.addEventListener("input", () => {
    stop();
    still();
    paintScorecard(root, null, false);
  });
  ctrl.addEventListener("input", () => {
    stop();
    still();
    paintScorecard(root, null, false);
  });
  root.querySelectorAll<HTMLElement>(".sb-force button").forEach((b) =>
    b.addEventListener("click", () => {
      root.querySelectorAll<HTMLElement>(".sb-force button").forEach((x) => {
        x.classList.toggle("active", x === b);
      });
      {
        const f = b.dataset["f"];
        if (isForce(f)) force = f;
      }
      stop();
      still();
      paintScorecard(root, null, false);
    }),
  );
  root.querySelectorAll<HTMLElement>(".sb-timing button").forEach((b) =>
    b.addEventListener("click", () => {
      root.querySelectorAll<HTMLElement>(".sb-timing button").forEach((x) => {
        x.classList.toggle("active", x === b);
      });
      timing = b.dataset["t"]!;
    }),
  );
  $(".sb-run").addEventListener("click", () => (raf ? (stop(), still()) : run()));
  still();
  return {
    onHide: () => {
      stop();
      still();
    },
  };
}
