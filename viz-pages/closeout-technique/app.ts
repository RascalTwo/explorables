export type { Api }; // an export makes this a module, so verify can map its coverage back to this file
type P = { x: number; y: number };
type Kf = P & { t: number };
type Stride = { x: number; y: number; k: string; n?: string };
type Api = { onShow?: () => void; onHide?: () => void };
type Force = "baseline" | "straight" | "middle";
const isForce = (s: string | undefined): s is Force =>
  s === "baseline" || s === "straight" || s === "middle";
/** An element the markup is known to have; throws when it is missing (each tab's init runs inside `safe`, which logs it). */
const need = <E extends Element>(e: E | null, sel: string): E => {
  if (!e) throw new Error("missing element " + sel);
  return e;
};
const scope = (root: HTMLElement) => (s: string) => need(root.querySelector<HTMLElement>(s), s);
const RIM = { x: 250, y: 56 };
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
const norm = (a: P): P => {
  const l = Math.hypot(a.x, a.y) || 1;
  return { x: a.x / l, y: a.y / l };
};
const sub = (a: P, b: P): P => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: P, b: P): P => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: P, k: number): P => ({ x: a.x * k, y: a.y * k });
const perp = (a: P): P => ({ x: -a.y, y: a.x });
const ease = (p: number) => p * p * (3 - 2 * p);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function along(pts: P[], a: number): P {
  const segs = pts.length - 1;
  const x = clamp(a, 0, 1) * segs;
  const i = Math.min(segs - 1, Math.floor(x));
  let f = ease(x - i);
  const A = pts[i]!,
    B = pts[i + 1]!;
  return { x: A.x + (B.x - A.x) * f, y: A.y + (B.y - A.y) * f };
}
const sampleKf = (kf: Kf[], t0: number): P => {
  const t = clamp(t0, 0, 1);
  for (let i = 0; i < kf.length - 1; i++) {
    const a = kf[i]!,
      b = kf[i + 1]!;
    if (t >= a.t && t <= b.t) {
      const p = b.t === a.t ? 0 : ease((t - a.t) / (b.t - a.t));
      return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
    }
  }
  const l = kf.at(-1)!;
  return { x: l.x, y: l.y };
};
const pathD = (pts: P[]) =>
  pts.map((p, i) => (i ? "L" : "M") + p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" ");

const COURT = `
  <rect x="20" y="20" width="460" height="450" fill="#241a0e" stroke="#6b5836" stroke-width="2"/>
  <rect x="170" y="20" width="160" height="190" fill="#3a2b14" stroke="#6b5836" stroke-width="2"/>
  <circle cx="250" cy="210" r="60" fill="none" stroke="#6b5836" stroke-width="2"/>
  <path d="M 210 60 A 40 40 0 0 0 290 60" fill="none" stroke="#6b5836" stroke-width="2"/>
  <path d="M 55 20 L 55 145 A 215 215 0 0 0 445 145 L 445 20" fill="none" stroke="#6b5836" stroke-width="2"/>
  <line x1="225" y1="42" x2="275" y2="42" stroke="#cbb78a" stroke-width="4"/>
  <circle cx="250" cy="56" r="9" fill="none" stroke="#ff7a3c" stroke-width="3"/>`;

const O = { x: 405, y: 205 }; // shooter, right wing at the 3pt line
const HELP = { x: 255, y: 195 }; // your help position, one pass away
const dir = norm(sub(O, HELP)); // help -> shooter unit
const toMid = norm(sub({ x: 250, y: 210 }, O)); // from shooter toward the middle/lane
const toBase = mul(toMid, -1); // toward baseline / sideline

/* ---------------- TAB 1: THE CLOSEOUT ---------------- */
function initMove(root: HTMLElement) {
  const $ = scope(root);
  $(".courtbg").innerHTML = COURT;
  const defKeys = [
    { t: 0, x: HELP.x, y: HELP.y },
    { t: 0.18, x: 288, y: 197 },
    { t: 0.42, x: 326, y: 200 },
    { t: 0.58, x: 348, y: 201 },
    { t: 0.72, x: 362, y: 202 },
    { t: 0.85, x: 371, y: 203 },
    { t: 1, x: 375, y: 203 },
  ];
  const prints = [
    { t: 0.1, x: 274, y: 190, k: "sprint" },
    { t: 0.26, x: 300, y: 208, k: "sprint" },
    { t: 0.4, x: 324, y: 190, k: "sprint" },
    { t: 0.56, x: 344, y: 208, k: "chop" },
    { t: 0.64, x: 352, y: 196, k: "chop" },
    { t: 0.72, x: 360, y: 208, k: "chop" },
    { t: 0.8, x: 367, y: 197, k: "chop" },
    { t: 0.9, x: 373, y: 208, k: "chop" },
    { t: 0.95, x: 366, y: 196, k: "chop" },
  ];
  const STEPS = [
    {
      t0: 0,
      name: "You're a step late",
      body: "The ball gets swung to a shooter on the wing. From your help position in the gap, the shot is coming — close the distance now.",
    },
    {
      t0: 0.15,
      name: "Sprint the gap",
      body: "Cover the first two-thirds flat-out with long, hard strides. This is the only part where you run at full speed.",
    },
    {
      t0: 0.55,
      name: "Chop your feet — break down",
      body: "Before you arrive, shorten into quick choppy steps. Each chop bleeds off momentum so you don't fly past. Butt drops, chest up.",
    },
    {
      t0: 0.8,
      name: "High hand at the cushion",
      body: "Arrive about an arm's length away, on balance, top hand up to contest. Close enough to bother the shot, low enough to slide with a drive.",
    },
  ];
  const stepsEl = $(".move-steps");
  STEPS.forEach((s, i) => {
    const d = document.createElement("div");
    d.className = "step";
    d.innerHTML = `<h3><span class="num">${i + 1}</span>${s.name}</h3><p>${s.body}</p>`;
    d.addEventListener("click", () => {
      pause();
      setT(s.t0 + 0.001);
    });
    stepsEl.append(d);
  });
  const off = $(".off"),
    def = $(".def"),
    ball = $(".ball"),
    trail = $(".trail"),
    printsG = $(".prints"),
    hand = $(".hand"),
    scrub = need(root.querySelector<HTMLInputElement>(".scrub"), ".scrub"),
    playBtn = $(".play"),
    spdFill = $(".spd-fill"),
    spdWord = $(".spd-word");
  off.setAttribute("transform", `translate(${O.x} ${O.y})`);
  ball.setAttribute("cx", String(-13));
  ball.setAttribute("cy", String(0));
  let pts = [];
  for (let i = 0; i <= 60; i++) pts.push(sampleKf(defKeys, i / 60));
  trail.setAttribute("d", pathD(pts));
  const speedAt = (t: number) => {
    const a = sampleKf(defKeys, clamp(t - 0.01, 0, 1)),
      b = sampleKf(defKeys, clamp(t + 0.01, 0, 1));
    return dist(a, b) / 0.02;
  };
  function render(t: number) {
    const p = sampleKf(defKeys, t);
    def.setAttribute("transform", `translate(${p.x} ${p.y})`);
    printsG.innerHTML = "";
    prints.forEach((pr) => {
      if (t >= pr.t - 0.001) {
        const chop = pr.k === "chop";
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.innerHTML = `<ellipse cx="${pr.x}" cy="${pr.y}" rx="${chop ? 5.5 : 5}" ry="${chop ? 7 : 11}" fill="${chop ? "var(--accent)" : "#5b6b82"}" opacity="${chop ? 0.95 : 0.6}"/>`;
        printsG.append(g);
      }
    });
    if (t >= 0.86) {
      const k = ease((t - 0.86) / 0.14);
      hand.setAttribute("opacity", String(k));
      hand.setAttribute("x1", String(p.x));
      hand.setAttribute("y1", String(p.y));
      hand.setAttribute("x2", String(p.x + (O.x - p.x) * 0.62));
      hand.setAttribute("y2", String(p.y - 16));
    } else hand.setAttribute("opacity", String(0));
    const sp = t < 0.001 ? 0 : clamp(speedAt(t) / 9, 0, 1);
    spdFill.style.width = (sp * 100).toFixed(0) + "%";
    spdFill.style.background = sp > 0.6 ? "#e2493f" : sp > 0.3 ? "var(--accent)" : "#36c98f";
    spdWord.textContent =
      t < 0.001 ? "—" : sp > 0.6 ? "sprint" : sp > 0.3 ? "chopping…" : "under control";
    let active = 0;
    STEPS.forEach((s, i) => {
      if (t >= s.t0) active = i;
    });
    root.querySelectorAll(".step").forEach((el, i) => {
      el.classList.toggle("active", i === active);
    });
    scrub.value = String(Math.round(t * 1000));
  }
  let playing = false,
    raf: number | null = null,
    t = 0,
    last = 0;
  const DUR = 5200;
  function tick(ts: number) {
    if (!last) last = ts;
    t += (ts - last) / DUR;
    last = ts;
    if (t >= 1) {
      t = 1;
      render(t);
      pause();
      return;
    }
    render(t);
    raf = requestAnimationFrame(tick);
  }
  function play() {
    if (playing) return;
    if (t >= 1) t = 0;
    playing = true;
    last = 0;
    playBtn.textContent = "❚❚ Pause";
    raf = requestAnimationFrame(tick);
  }
  function pause() {
    playing = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    playBtn.textContent = "▶ Play";
  }
  function setT(v: number) {
    t = clamp(v, 0, 1);
    render(t);
  }
  playBtn.addEventListener("click", () => (playing ? pause() : play()));
  $(".restart").addEventListener("click", () => {
    pause();
    setT(0);
    play();
  });
  scrub.addEventListener("input", () => {
    pause();
    setT(+scrub.value / 1000);
  });
  render(0);
  return { onHide: pause };
}

/* ---------------- TAB 2: THE CUSHION ---------------- */
function initCushion(root: HTMLElement) {
  const $ = scope(root);
  $(".courtbg").innerHTML = COURT;
  const IDEAL = 32;
  const off = $(".off"),
    def = $(".def"),
    ball = $(".ball"),
    hand = $(".hand"),
    drive = $(".drive"),
    ideal = $(".ideal"),
    stamp = $(".stamp"),
    range = need(root.querySelector<HTMLInputElement>(".cushrange"), ".cushrange"),
    runBtn = $(".cushrun"),
    vEl = $(".cush-verdict"),
    vBig = vEl.querySelector<HTMLElement>(".big")!,
    vText = $(".cush-text");
  off.setAttribute("transform", `translate(${O.x} ${O.y})`);
  ideal.setAttribute("cx", String(O.x));
  ideal.setAttribute("cy", String(O.y));
  ideal.setAttribute("r", String(IDEAL));
  const cushOf = (v: number) => 6 + (v / 100) * 84;
  const classify = (c: number) => (c < 16 ? "tight" : c > 52 ? "soft" : "good");
  const defPos = (c: number) => ({ x: O.x - dir.x * c, y: O.y - dir.y * c });
  const feetOf = (c: number) => c / 8; // px → ft (arm's length ~32px ≈ 4 ft, top of the Tight band)
  const marker = root.querySelector<HTMLElement>(".ftmarker");
  const COPY = {
    tight: {
      cls: "bad",
      big: "🛡 BLOW-BY",
      txt: "You crowded him (0–2 ft, “very tight”). One jab or shot-fake and he drives right past into the space behind you — or you foul him. No cushion means no room to react.",
    },
    good: {
      cls: "good",
      big: "✓ CONTESTED",
      txt: "An arm's length (~2–4 ft, “tight”). NBA tracking: a look this contested falls to ~29% from three vs ~38% wide open — you just cost him ~10 points of efficiency, and you've kept a step to slide with a drive.",
    },
    soft: {
      cls: "open",
      big: "🏀 OPEN SHOT",
      txt: "Too much space — a 6+ ft look is “wide open,” worth the full ~38% from three. Closing out means closing the gap; don't jog at him.",
    },
  };
  function still(c: number) {
    const p = defPos(c);
    def.setAttribute("transform", `translate(${p.x} ${p.y})`);
    ball.setAttribute("cx", String(-13));
    ball.setAttribute("cy", String(0));
    hand.setAttribute("opacity", String(0));
    drive.setAttribute("opacity", String(0));
    stamp.setAttribute("opacity", String(0));
    const k = classify(c);
    const co = COPY[k];
    vEl.className = "verdict cush-verdict " + co.cls;
    vBig.textContent = co.big;
    vText.textContent = co.txt;
    ideal.setAttribute("stroke", k === "good" ? "#36c98f" : "#6b7a8f");
    if (marker) {
      const ft = feetOf(c);
      marker.style.left = clamp(ft / 9, 0, 1) * 100 + "%";
      marker.dataset["ft"] = ft.toFixed(1) + " ft";
    }
  }
  let raf: number | null = null;
  function stop() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
    runBtn.textContent = "▶ Run it";
  }
  function run() {
    stop();
    const c = cushOf(+range.value),
      k = classify(c),
      start = defPos(c);
    let a = 0,
      last = 0;
    const DUR = 1600;
    runBtn.textContent = "❚❚";
    function frame(ts: number) {
      if (!last) last = ts;
      a += (ts - last) / DUR;
      last = ts;
      const e = clamp(a, 0, 1);
      if (k === "tight") {
        const path = [
          O,
          { x: start.x - 18, y: start.y + 34 },
          { x: RIM.x + 30, y: 120 },
          { x: RIM.x, y: 78 },
        ];
        const o = along(path, e);
        off.setAttribute("transform", `translate(${o.x} ${o.y})`);
        const n = norm(sub(along(path, Math.min(1, e + 0.05)), o));
        ball.setAttribute("cx", String(n.x * 13));
        ball.setAttribute("cy", String(n.y * 13));
        drive.setAttribute("d", pathD(path));
        drive.setAttribute("opacity", String(0.7));
      } else {
        ball.setAttribute("cx", String(0));
        ball.setAttribute("cy", String(-e * 40));
        if (k === "good") {
          hand.setAttribute("opacity", String(e));
          hand.setAttribute("x1", String(start.x));
          hand.setAttribute("y1", String(start.y));
          hand.setAttribute("x2", String(O.x));
          hand.setAttribute("y2", String(O.y - 20));
        }
      }
      if (e >= 1) {
        stamp.setAttribute("opacity", String(1));
        stamp.setAttribute("fill", k === "good" ? "var(--accent)" : "#e2493f");
        stamp.textContent = COPY[k].big;
        stop();
        return;
      }
      raf = requestAnimationFrame(frame);
    }
    off.setAttribute("transform", `translate(${O.x} ${O.y})`);
    stamp.setAttribute("opacity", String(0));
    raf = requestAnimationFrame(frame);
  }
  range.addEventListener("input", () => {
    stop();
    still(cushOf(+range.value));
  });
  runBtn.addEventListener("click", () => (raf ? (stop(), still(cushOf(+range.value))) : run()));
  still(cushOf(+range.value));
  return {
    onHide: () => {
      stop();
      still(cushOf(+range.value));
    },
  };
}

/* ---------------- TAB 3: FORCE A SIDE ---------------- */
function initSide(root: HTMLElement) {
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

/* ---------------- TAB 4: THE FOOTWORK (chop-step vs sprint-stop) ---------------- */
function initFeet(root: HTMLElement) {
  const $ = scope(root);
  const printsG = $(".feet-prints"),
    phaseEl = $(".feet-phase"),
    runBtn = $(".feet-run"),
    feetCues = $(".feet-cues"),
    whenEl = $(".feet-when"),
    whenBig = whenEl.querySelector<HTMLElement>(".big")!,
    whenT = $(".feet-when-t");
  const MODES: Record<
    "chop" | "sprint",
    {
      bal: number;
      spd: number;
      whenCls: string;
      whenBig: string;
      whenT: string;
      strides: Stride[];
      cues: [string, string][];
    }
  > = {
    chop: {
      bal: 92,
      spd: 52,
      whenCls: "good",
      whenBig: "Best vs a DRIVER",
      whenT:
        "The chop keeps you low and balanced, so when he puts it on the floor you can slide and cut off the drive — worth arriving a beat later.",
      strides: [
        { x: 132, y: 360, k: "sprint" },
        { x: 168, y: 322, k: "sprint" },
        { x: 132, y: 286, k: "sprint" },
        { x: 160, y: 255, k: "chop" },
        { x: 138, y: 236, k: "chop" },
        { x: 158, y: 218, k: "chop" },
        { x: 140, y: 202, k: "chop" },
        { x: 157, y: 150, k: "stance" },
        { x: 135, y: 132, k: "stance" },
      ],
      cues: [
        ["Sprint two-thirds", "Long hard strides to cover ground."],
        ["Chop your feet", "Short quick steps bleed off momentum."],
        ["Sink your hips", "Butt down, chest up, low base."],
        ["High hand at a step", "Balanced, contest, and ready to slide."],
      ],
    },
    sprint: {
      bal: 64,
      spd: 92,
      whenCls: "ok",
      whenBig: "Best vs a SHOOTER",
      whenT:
        "Sprint hard and plant a quick 1-2 stop. You arrive a half-beat sooner with a higher contest — trading some balance for getting there in time.",
      strides: [
        { x: 132, y: 360, k: "sprint" },
        { x: 170, y: 318, k: "sprint" },
        { x: 130, y: 276, k: "sprint" },
        { x: 168, y: 232, k: "sprint" },
        { x: 162, y: 174, k: "stance", n: "1" },
        { x: 138, y: 150, k: "stance", n: "2" },
      ],
      cues: [
        ["Sprint all the way", "Don't decelerate early — cover ground fast."],
        ["Plant 1-2", "Two quick steps to gather and stop, chest up."],
        ["High hand, now", "Get the top hand up fast to contest the shot."],
        ["Recover to slide", "Less margin — be ready if he drives past."],
      ],
    },
  };
  let mode: "chop" | "sprint" = "chop",
    timers: number[] = [];
  const drawPrint = (p: Stride) => {
    const chop = p.k !== "sprint";
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const fill = p.k === "stance" ? "#36c98f" : chop ? "var(--accent)" : "#5b6b82";
    g.innerHTML =
      `<ellipse cx="${p.x}" cy="${p.y}" rx="${chop ? 6 : 5.5}" ry="${chop ? 7.5 : 12}" fill="${fill}"/>` +
      (p.n
        ? `<text x="${p.x}" y="${p.y + 4}" text-anchor="middle" font-size="11" font-weight="800" fill="#06231a">${p.n}</text>`
        : "");
    printsG.append(g);
    g.animate([{ opacity: 0.15 }, { opacity: 1 }], { duration: 180, fill: "forwards" });
  };
  const clear = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };
  const cues = () => [...feetCues.querySelectorAll("li")];
  const lightCue = (i: number) => {
    const c = cues()[i];
    if (c) c.classList.add("on");
  };
  function renderMode() {
    const m = MODES[mode];
    feetCues.innerHTML = m.cues
      .map(
        ([b, t], i) =>
          `<li data-cue="${i}"><span class="tick">✓</span><div><b>${b}.</b> ${t}</div></li>`,
      )
      .join("");
    $(".tr-bal").style.width = m.bal + "%";
    $(".tr-bal-v").textContent = m.bal >= 85 ? "high" : m.bal >= 60 ? "solid" : "low";
    $(".tr-spd").style.width = m.spd + "%";
    $(".tr-spd-v").textContent = m.spd >= 85 ? "high" : m.spd >= 60 ? "solid" : "low";
    whenEl.className = "verdict feet-when " + m.whenCls;
    whenBig.textContent = m.whenBig;
    whenT.textContent = m.whenT;
  }
  function reset() {
    clear();
    printsG.innerHTML = "";
    phaseEl.textContent = "Ready";
    phaseEl.style.color = "var(--accent)";
    cues().forEach((c) => c.classList.remove("on"));
  }
  function run() {
    reset();
    const S = MODES[mode].strides;
    let t = 200;
    S.forEach((p: Stride) => {
      const gap = p.k === "sprint" ? 230 : p.k === "chop" ? 165 : 150;
      timers.push(
        setTimeout(() => {
          drawPrint(p);
          phaseEl.textContent =
            p.k === "sprint"
              ? "SPRINT"
              : p.k === "chop"
                ? "chop · chop · chop"
                : p.n
                  ? "plant " + p.n
                  : "BREAK DOWN";
          phaseEl.style.color =
            p.k === "sprint" ? "#e2493f" : p.k === "chop" ? "var(--accent)" : "#36c98f";
        }, t),
      );
      t += gap;
    });
    const total = t;
    [0, 1, 2, 3].forEach((i) => {
      timers.push(setTimeout(() => lightCue(i), 260 + i * (total / 4.2)));
    });
    timers.push(
      setTimeout(() => {
        phaseEl.textContent = "High hand ✋ — contest!";
        phaseEl.style.color = "#36c98f";
        lightCue(3);
      }, total + 120),
    );
  }
  root.querySelectorAll<HTMLElement>(".feet-seg button").forEach((b) =>
    b.addEventListener("click", () => {
      root.querySelectorAll<HTMLElement>(".feet-seg button").forEach((x) => {
        x.classList.toggle("active", x === b);
      });
      {
        const v = b.dataset["m"];
        if (v === "chop" || v === "sprint") mode = v;
      }
      reset();
      renderMode();
    }),
  );
  runBtn.addEventListener("click", run);
  renderMode();
  reset();
  return { onHide: reset };
}

/* ---------------- TAB 5: 3D VIEW ---------------- */
function initD3(root: HTMLElement): Api {
  const host = root.querySelector<HTMLElement>(".d3-canvas")!;
  const playBtn = root.querySelector<HTMLElement>(".d3play")!,
    scrub = root.querySelector<HTMLInputElement>(".d3scrub")!,
    rotChk = root.querySelector<HTMLInputElement>(".d3rot")!,
    sideBtn = root.querySelector<HTMLElement>(".d3side")!,
    phaseEl = root.querySelector<HTMLElement>(".d3phase")!,
    titleEl = root.querySelector<HTMLElement>("#d3phaseTitle")!;
  type Three = typeof import("three");
  type Fig = {
    g: import("three").Group;
    torso: import("three").Mesh;
    head: import("three").Mesh;
    legL: Limb;
    legR: Limb;
    armL: Limb;
    armR: Limb;
    scale: number;
  };
  type Limb = import("three").Mesh<
    import("three").CapsuleGeometry,
    import("three").MeshStandardMaterial
  >;
  type Foot = { x: number; y: number; z: number };
  let THREE: Three,
    OrbitControls: typeof import("three/examples/jsm/controls/OrbitControls.js").OrbitControls,
    scene: import("three").Scene,
    cam: import("three").PerspectiveCamera,
    renderer: import("three").WebGLRenderer | undefined,
    controls: import("three/examples/jsm/controls/OrbitControls.js").OrbitControls,
    raf: number | null = null,
    built = false,
    a = 0,
    last = 0,
    playing = false;
  const DUR = 6000;
  const figs: {
    ball?: import("three").Mesh;
    off?: Fig;
    def?: Fig;
    plants?: import("three").Mesh[];
  } = {};
  // ground coords: rim at z=-22,x=0. shooter on right wing. defender closes out from help.
  const SHOOTER: [number, number] = [8, -9];
  const rootKf: [number, number, number][] = [
    [0, -3, -3],
    [0.2, 1, -5.5],
    [0.42, 4.6, -8],
    [0.58, 5.7, -8.6],
    [0.74, 6.1, -8.9],
    [1, 6.3, -9],
  ];
  const sample3 = (kf: [number, number, number][], t: number): [number, number] => {
    for (let i = 0; i < kf.length - 1; i++) {
      const A = kf[i]!,
        B = kf[i + 1]!;
      if (t >= A[0] && t <= B[0]) {
        const p = B[0] === A[0] ? 0 : ease((t - A[0]) / (B[0] - A[0]));
        return [A[1] + (B[1] - A[1]) * p, A[2] + (B[2] - A[2]) * p];
      }
    }
    const L = kf.at(-1)!;
    return [L[1], L[2]];
  };
  // Footstep plants along the path: long sprint strides that shrink to short chops, then a wide stance.
  // Each foot alternates L/R; positions are offset perpendicular to travel so the base has width.
  const PLANTS = [
    { t: 0.08, side: "L", kind: "sprint" },
    { t: 0.2, side: "R", kind: "sprint" },
    { t: 0.33, side: "L", kind: "sprint" },
    { t: 0.45, side: "R", kind: "chop" },
    { t: 0.53, side: "L", kind: "chop" },
    { t: 0.61, side: "R", kind: "chop" },
    { t: 0.69, side: "L", kind: "chop" },
    { t: 0.8, side: "R", kind: "stance" },
    { t: 0.88, side: "L", kind: "stance" },
  ].map((p) => {
    const [x, z] = sample3(rootKf, p.t);
    const [x2, z2] = sample3(rootKf, Math.min(1, p.t + 0.02));
    const dx = x2 - x,
      dz = z2 - z,
      l = Math.hypot(dx, dz) || 1;
    const px = -dz / l,
      pz = dx / l; // left-perp of travel
    const w = p.kind === "sprint" ? 0.42 : p.kind === "chop" ? 0.6 : 0.95,
      s = p.side === "L" ? 1 : -1;
    return { t: p.t, side: p.side, kind: p.kind, pos: { x: x + px * w * s, z: z + pz * w * s } };
  });
  const F0 = (s: number): Foot => ({
    x: sample3(rootKf, 0)[0] + s * 0.42,
    z: sample3(rootKf, 0)[1],
    y: 0,
  });
  function feet(t: number) {
    let fL = F0(-1),
      fR = F0(1);
    for (let i = 0; i < PLANTS.length; i++) {
      const p = PLANTS[i]!;
      if (p.t <= t) {
        if (p.side === "L") fL = { x: p.pos.x, z: p.pos.z, y: 0 };
        else fR = { x: p.pos.x, z: p.pos.z, y: 0 };
        continue;
      }
      // first future plant = the swinging foot; lift it in an arc from its last plant to the next
      const from = p.side === "L" ? fL : fR,
        prevT = i > 0 ? PLANTS[i - 1]!.t : 0;
      const e = clamp((t - prevT) / (p.t - prevT), 0, 1);
      const lift = Math.sin(e * Math.PI) * (p.kind === "sprint" ? 0.6 : 0.28);
      const sx = from.x + (p.pos.x - from.x) * e,
        sz = from.z + (p.pos.z - from.z) * e;
      if (p.side === "L") fL = { x: sx, z: sz, y: lift };
      else fR = { x: sx, z: sz, y: lift };
      break;
    }
    return { fL, fR };
  }
  const PHASES: [number, string, string][] = [
    [0, "The sprint", "Tall and fast — long strides eating up the gap. No control yet, all speed."],
    [0.42, "Chop it down", "Steps shorten, hips start to drop. You're trading speed for balance."],
    [
      0.58,
      "Sink the hips",
      "Butt down, chest up, base wide. This low stance is what lets you move any direction.",
    ],
    [
      0.78,
      "High hand, contest",
      "Landed at an arm's length. Top hand high in the shot, low hand out to wall the drive.",
    ],
  ];
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  function makeFigure(color: number, scale = 1): Fig {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.7 * scale, 1.5 * scale, 6, 12), mat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.55 * scale, 18, 18), mat);
    g.add(torso, head);
    const limb = (r: number, l: number) => {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 8), mat);
      m.geometry.translate(0, -l / 2, 0);
      g.add(m);
      return m;
    };
    const legL = limb(0.22 * scale, 1.7 * scale),
      legR = limb(0.22 * scale, 1.7 * scale),
      armL = limb(0.18 * scale, 1.4 * scale),
      armR = limb(0.18 * scale, 1.4 * scale);
    scene.add(g);
    return { g, torso, head, legL, legR, armL, armR, scale };
  }
  function aimLimb(mesh: Limb, from: import("three").Vector3, to: import("three").Vector3) {
    const d = new THREE.Vector3().subVectors(to, from);
    const len = d.length() || 0.001;
    mesh.position.copy(from);
    mesh.quaternion.setFromUnitVectors(V(0, -1, 0), d.clone().normalize());
    mesh.scale.y = len / (mesh.geometry.parameters.length || 1);
  }
  // crouch 0..1 lowers hips; legs aim at actual world foot positions (fL/fR), so the figure steps.
  function pose(
    f: Fig,
    pos: [number, number],
    crouch: number,
    fL: Foot,
    fR: Foot,
    hhi: [number, number, number] | null,
    hlo: [number, number, number] | null,
    leanFwd: number,
  ) {
    const [x, z] = pos;
    const drop = crouch * 1.0;
    const bob = (fL.y + fR.y) * 0.22; // torso rises on the swing
    f.g.position.set(x, 0, z);
    f.g.rotation.set(leanFwd || 0, 0, 0);
    const hipY = 1.5 - drop + bob,
      shY = 3.0 - drop * 1.3 + bob;
    f.torso.position.set(0, 2.3 - drop * 1.15 + bob, 0);
    f.head.position.set(0, 3.7 - drop * 1.3 + bob, 0);
    const hipL = V(-0.4, hipY, 0),
      hipR = V(0.4, hipY, 0),
      shL = V(-0.6, shY, 0),
      shR = V(0.6, shY, 0);
    aimLimb(f.legL, hipL, V(fL.x - x, fL.y, fL.z - z));
    aimLimb(f.legR, hipR, V(fR.x - x, fR.y, fR.z - z));
    aimLimb(f.armR, shR, hhi ? V(hhi[0] - x, hhi[1], hhi[2] - z) : V(0.9, 1.6, 0.2));
    aimLimb(f.armL, shL, hlo ? V(hlo[0] - x, hlo[1], hlo[2] - z) : V(-0.9, 1.5, 0.2));
  }
  function build() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0a06);
    const w = host.clientWidth || 520,
      h = host.clientHeight || 520;
    cam = new THREE.PerspectiveCamera(42, w / h, 0.1, 200);
    cam.position.set(16, 14, 18);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    host.append(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dl = new THREE.DirectionalLight(0xfff0d8, 1.1);
    dl.position.set(10, 20, 8);
    scene.add(dl);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x241a0e, roughness: 0.95 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -6;
    scene.add(floor);
    const paint = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 22),
      new THREE.MeshStandardMaterial({ color: 0x3a2b14, roughness: 0.95 }),
    );
    paint.rotation.x = -Math.PI / 2;
    paint.position.set(0, 0.02, -11);
    scene.add(paint);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 9),
      new THREE.MeshStandardMaterial({ color: 0x888888 }),
    );
    pole.position.set(0, 4.5, -23.5);
    scene.add(pole);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(6, 3.5, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xcbb78a }),
    );
    board.position.set(0, 8, -22.7);
    scene.add(board);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(1.4, 0.13, 12, 28),
      new THREE.MeshStandardMaterial({ color: 0xff7a3c, roughness: 0.4 }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 6.6, -21);
    scene.add(rim);
    figs.ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 18, 18),
      new THREE.MeshStandardMaterial({ color: 0xff9b3c, roughness: 0.5 }),
    );
    scene.add(figs.ball);
    figs.off = makeFigure(0x36c98f);
    figs.def = makeFigure(0x4aa8ff, 1.0);
    // ground footprints — the stride pattern, laid down as you pass each plant
    figs.plants = PLANTS.map((p) => {
      const col = p.kind === "sprint" ? 0x5b6b82 : p.kind === "chop" ? 0x4aa8ff : 0x36c98f;
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(p.kind === "stance" ? 0.44 : 0.36, 0.32, 0.05, 16),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.85 }),
      );
      m.position.set(p.pos.x, 0.03, p.pos.z);
      m.visible = false;
      scene.add(m);
      return m;
    });
    controls = new OrbitControls(cam, renderer.domElement);
    controls.target.set(3, 2, -8);
    controls.enableDamping = true;
    controls.minDistance = 8;
    controls.maxDistance = 55;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.update();
    window.addEventListener("resize", onResize);
  }
  function onResize() {
    if (!renderer) return;
    const w = host.clientWidth || 520,
      h = host.clientHeight || 520;
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  function render(t: number) {
    const [x, z] = sample3(rootKf, t);
    const crouch = clamp((t - 0.35) / 0.35, 0, 1); // stand → sink
    const { fL, fR } = feet(t); // stepping feet
    if (figs.plants)
      figs.plants.forEach((m, i) => {
        m.visible = PLANTS[i]!.t <= t;
      });
    // shooter holds ball at chest, raises to shoot at very end
    const shoot = clamp((t - 0.9) / 0.1, 0, 1);
    figs.ball!.position.set(SHOOTER[0] - 1.1, 2.4 + shoot * 2.2, SHOOTER[1] + 0.3);
    const sfL = { x: SHOOTER[0] - 0.5, z: SHOOTER[1] + 0.1, y: 0 },
      sfR = { x: SHOOTER[0] + 0.5, z: SHOOTER[1] - 0.1, y: 0 };
    pose(
      figs.off!,
      SHOOTER,
      0.15,
      sfL,
      sfR,
      [SHOOTER[0] - 1, 2.6 + shoot * 2, SHOOTER[1] + 0.4],
      [SHOOTER[0] + 0.6, 2.2, SHOOTER[1] - 0.2],
      0,
    );
    // defender: high right hand toward the ball once close; low left hand walls the middle (−x side)
    const close = t > 0.7;
    const hhi: [number, number, number] = close
      ? [SHOOTER[0] - 1, 4.2, SHOOTER[1] + 0.3]
      : [x + 1.2, 2.4, z + 0.2];
    const hlo: [number, number, number] = close ? [x - 1.4, 0.8, z + 0.6] : [x - 1, 1.6, z + 0.2];
    pose(figs.def!, [x, z], crouch, fL, fR, hhi, hlo, (1 - crouch) * 0.18);
    let ph = PHASES[0]!;
    PHASES.forEach((p) => {
      if (t >= p[0]) ph = p;
    });
    titleEl.textContent = ph[1];
    phaseEl.textContent = ph[2];
    scrub.value = String(Math.round(t * 1000));
  }
  function loop(ts: number) {
    if (!last) last = ts;
    if (playing) {
      a += (ts - last) / DUR;
      if (a >= 1) {
        a = 1;
        playing = false;
        playBtn.textContent = "↺ Play again";
      }
      render(a);
    }
    last = ts;
    controls.autoRotate = rotChk.checked;
    controls.autoRotateSpeed = 0.7;
    controls.update();
    renderer!.render(scene, cam);
    raf = requestAnimationFrame(loop);
  }
  async function onShow() {
    if (!built) {
      THREE = await import("three");
      ({ OrbitControls } = await import("three/addons/controls/OrbitControls.js"));
      build();
      render(0);
      built = true;
    }
    onResize();
    if (!raf) {
      last = 0;
      raf = requestAnimationFrame(loop);
    }
  }
  function onHide() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }
  playBtn.addEventListener("click", () => {
    if (playing) {
      playing = false;
      playBtn.textContent = "▶ Play";
    } else {
      if (a >= 1) a = 0;
      playing = true;
      last = 0;
      playBtn.textContent = "❚❚ Pause";
    }
  });
  scrub.addEventListener("input", () => {
    playing = false;
    playBtn.textContent = "▶ Play";
    a = +scrub.value / 1000;
    if (built) render(a);
  });
  sideBtn.addEventListener("click", () => {
    if (!built) return;
    rotChk.checked = false;
    cam.position.set(20, 4, -8);
    controls.target.set(4, 2.5, -8.5);
    controls.update();
  });
  return {
    onShow: () => {
      onShow().catch((e: unknown) => {
        console.error("3D view failed to load:", e);
      });
    },
    onHide,
  };
}

/* ---------------- TAB 6: YOU TRY IT (SANDBOX) ---------------- */
function initSandbox(root: HTMLElement) {
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
  function evalPossession() {
    const c = cushOf(+cush.value),
      control = +ctrl.value / 100,
      late = timing === "late";
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
    const grade =
      type === "contained" ? "A" : type === "contest" ? "B" : type === "open" ? "D" : "C";
    const cls = type === "contained" ? "good" : type === "contest" ? "ok" : "bad";
    return { type, title, text, grade, cls, cards };
  }
  function paintScorecard(cards: Record<string, boolean> | null, live: boolean) {
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
    const r = evalPossession();
    const d0 = defPos();
    gradeEl.textContent = r.grade;
    gradeEl.style.borderColor =
      r.cls === "good" ? "var(--accent)" : r.cls === "ok" ? "#e2b23f" : "#e2493f";
    gradeEl.style.color = gradeEl.style.borderColor;
    vEl.className = "verdict sb-verdict " + r.cls;
    vBig.textContent = r.title;
    vText.textContent = r.text;
    paintScorecard(r.cards, true);
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
    paintScorecard(null, false);
  });
  ctrl.addEventListener("input", () => {
    stop();
    still();
    paintScorecard(null, false);
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
      paintScorecard(null, false);
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

/* ---------------- TAB 7: IN A DEFENSE ---------------- */
function initTeam(root: HTMLElement) {
  const $ = scope(root);
  $(".courtbg").innerHTML = COURT;
  const O1s = { x: 120, y: 210 },
    O1e = { x: 96, y: 118 }; // ball-handler drives baseline (left)
  const O2 = { x: 405, y: 230 }; // weak-side shooter (right wing)
  const Dhelp = { x: 250, y: 150 },
    Dtag = { x: 180, y: 150 }; // you: at the nail, tag the driver, then close out
  const Hs = { x: 250, y: 300 },
    He = { x: 250, y: 200 }; // low man rotates up
  const o1 = $(".o1"),
    o2 = $(".o2"),
    tball = $(".tball"),
    help = $(".help"),
    def = $(".def"),
    hand = $(".hand"),
    pass = $(".pass"),
    dtrail = $(".dtrail"),
    htrail = $(".htrail"),
    scrub = need(root.querySelector<HTMLInputElement>(".team-scrub"), ".team-scrub"),
    playBtn = $(".team-play");
  o2.setAttribute("transform", `translate(${O2.x} ${O2.y})`);
  // keyframes over t
  const o1K: Kf[] = [
    { t: 0, ...O1s },
    { t: 0.32, ...O1e },
    { t: 0.45, ...O1e },
    { t: 1, ...O1e },
  ];
  const defK: Kf[] = [
    { t: 0, ...Dhelp },
    { t: 0.3, ...Dtag },
    { t: 0.45, x: 220, y: 165 },
    { t: 0.72, x: 355, y: 225 },
    { t: 0.86, x: 372, y: 227 },
    { t: 1, x: 376, y: 228 },
  ];
  const helpK: Kf[] = [
    { t: 0, ...Hs },
    { t: 0.45, ...Hs },
    { t: 0.55, x: 255, y: 250 },
    { t: 1, ...He },
  ];
  const STEPS = [
    {
      t0: 0,
      name: "You're in help",
      body: "Ball on the left. You're off your man with two feet in the paint — in the gap, ready to stop a drive. This is correct.",
    },
    {
      t0: 0.15,
      name: "The drive pulls you in",
      body: "The ball-handler attacks baseline. You slide over to tag him. Now you're two passes from the shooter — that's why every closeout starts late.",
    },
    {
      t0: 0.35,
      name: "The skip pass",
      body: "He kicks it crosscourt to the open shooter on the weak side. The ball travels a long way — your cue to sprint.",
    },
    {
      t0: 0.5,
      name: "Closeout — with help behind",
      body: "You sprint-closeout to the shooter while the low man rotates up to cover the paint. Because help is behind you, you can close out hard and take away the drive.",
    },
  ];
  const stepsEl = $(".team-steps");
  STEPS.forEach((s, i) => {
    const d = document.createElement("div");
    d.className = "step";
    d.innerHTML = `<h3><span class="num">${i + 1}</span>${s.name}</h3><p>${s.body}</p>`;
    d.addEventListener("click", () => {
      pause();
      setT(s.t0 + 0.001);
    });
    stepsEl.append(d);
  });
  let dpts = [];
  for (let i = 0; i <= 60; i++) dpts.push(sampleKf(defK, i / 60));
  dtrail.setAttribute("d", pathD(dpts));
  let hpts = [];
  for (let i = 0; i <= 40; i++) hpts.push(sampleKf(helpK, i / 40));
  htrail.setAttribute("d", pathD(hpts));
  function render(t: number) {
    const p1 = sampleKf(o1K, t),
      pd = sampleKf(defK, t),
      ph = sampleKf(helpK, t);
    o1.setAttribute("transform", `translate(${p1.x} ${p1.y})`);
    def.setAttribute("transform", `translate(${pd.x} ${pd.y})`);
    help.setAttribute("transform", `translate(${ph.x} ${ph.y})`);
    // ball: with O1 until .35, flies to O2 by .5, then held by O2
    let b;
    if (t < 0.35) b = { x: p1.x, y: p1.y };
    else if (t < 0.5) {
      const e = ease((t - 0.35) / 0.15);
      b = { x: p1.x + (O2.x - p1.x) * e, y: p1.y + (O2.y - p1.y) * e };
    } else b = { x: O2.x, y: O2.y };
    tball.setAttribute("cx", String(b.x));
    tball.setAttribute("cy", String(b.y));
    pass.setAttribute("d", `M ${O1e.x} ${O1e.y} L ${O2.x} ${O2.y}`);
    pass.setAttribute("opacity", String(t >= 0.34 && t < 0.55 ? 0.9 : 0.12));
    if (t >= 0.88) {
      const k = ease((t - 0.88) / 0.12);
      hand.setAttribute("opacity", String(k));
      hand.setAttribute("x1", String(pd.x));
      hand.setAttribute("y1", String(pd.y));
      hand.setAttribute("x2", String(O2.x));
      hand.setAttribute("y2", String(O2.y - 20));
    } else hand.setAttribute("opacity", String(0));
    let active = 0;
    STEPS.forEach((s, i) => {
      if (t >= s.t0) active = i;
    });
    root.querySelectorAll(".team-steps .step").forEach((el, i) => {
      el.classList.toggle("active", i === active);
    });
    scrub.value = String(Math.round(t * 1000));
  }
  let playing = false,
    raf: number | null = null,
    t = 0,
    last = 0;
  const DUR = 6800;
  function tick(ts: number) {
    if (!last) last = ts;
    t += (ts - last) / DUR;
    last = ts;
    if (t >= 1) {
      t = 1;
      render(t);
      pause();
      return;
    }
    render(t);
    raf = requestAnimationFrame(tick);
  }
  function play() {
    if (playing) return;
    if (t >= 1) t = 0;
    playing = true;
    last = 0;
    playBtn.textContent = "❚❚ Pause";
    raf = requestAnimationFrame(tick);
  }
  function pause() {
    playing = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    playBtn.textContent = "▶ Run the rotation";
  }
  function setT(v: number) {
    t = clamp(v, 0, 1);
    render(t);
  }
  playBtn.addEventListener("click", () => (playing ? pause() : play()));
  scrub.addEventListener("input", () => {
    pause();
    setT(+scrub.value / 1000);
  });
  render(0);
  return { onHide: pause };
}

/* ---------------- TAB 8: READ THE MAN ---------------- */
function initRead(root: HTMLElement) {
  const $ = scope(root);
  $(".courtbg").innerHTML = COURT;
  const off = $(".off"),
    def = $(".def"),
    ideal = $(".rideal"),
    cush = $(".rcush"),
    cushLab = $(".rcush-lab"),
    hi = $(".rhi"),
    vEl = $(".read-verdict"),
    vBig = vEl.querySelector<HTMLElement>(".big")!,
    rule = $(".read-rule"),
    mText = $(".read-mistake-t");
  off.setAttribute("transform", `translate(${O.x} ${O.y})`);
  const TYPES = {
    shooter: {
      c: 30,
      hand: true,
      cls: "good",
      ring: "#36c98f",
      lab: "arm's length",
      title: "Knockdown shooter — contest hard",
      rule: "Sprint ~90% and break down late, high hand up in his face. Get there and take the shot away — you can live with the drive because he'll bury an open look.",
      mistake:
        "A soft or late closeout gives up a wide-open three (~38%). Against a shooter, a beat late is a bucket.",
    },
    pump: {
      c: 32,
      hand: true,
      cls: "good",
      ring: "#36c98f",
      lab: "arm's length — stay DOWN",
      title: "Pump-faker — high hand, feet down",
      rule: "Close out under control with a high hand, but NEVER leave your feet. Hand vertical, mirror the ball, and let him shoot into your contest.",
      mistake:
        "Bite the pump fake and jump — now you foul him on the shot or he steps through you for a layup.",
    },
    driver: {
      c: 56,
      hand: false,
      cls: "ok",
      ring: "#e2b23f",
      lab: "a step off",
      title: "Driver — sit on the drive",
      rule: "Sprint only halfway, break down early, and give ground. Sit on the drive and make him prove he can hit the (contested) jumper.",
      mistake: "Fly all the way out on a driver and he blows right by — you handed him the rim.",
    },
    none: {
      c: 82,
      hand: false,
      cls: "bad",
      ring: "#6b7a8f",
      lab: "sag — stay home",
      title: "Non-shooter — don't close out",
      rule: "Barely close out at all. Stay in the gap with your hands down, clog the drive, and dare a non-shooter to beat you with a jumper he doesn't have.",
      mistake:
        "Running a hard closeout at a guy who can't shoot wastes your position and opens a driving lane for the whole team.",
    },
  };
  const isType = (k: string | undefined): k is keyof typeof TYPES =>
    k !== undefined && Object.hasOwn(TYPES, k);
  function show(t: keyof typeof TYPES) {
    const c = TYPES[t];
    const p = { x: O.x - dir.x * c.c, y: O.y - dir.y * c.c };
    def.setAttribute("transform", `translate(${p.x} ${p.y})`);
    ideal.setAttribute("cx", String(O.x));
    ideal.setAttribute("cy", String(O.y));
    ideal.setAttribute("r", String(c.c));
    ideal.setAttribute("stroke", c.ring);
    cush.setAttribute("x1", String(p.x));
    cush.setAttribute("y1", String(p.y));
    cush.setAttribute("x2", String(O.x));
    cush.setAttribute("y2", String(O.y));
    const mid = { x: (p.x + O.x) / 2, y: (p.y + O.y) / 2 - 8 };
    cushLab.setAttribute("x", String(mid.x));
    cushLab.setAttribute("y", String(mid.y));
    cushLab.textContent = c.lab;
    if (c.hand) {
      hi.setAttribute("opacity", String(1));
      hi.setAttribute("x1", String(p.x));
      hi.setAttribute("y1", String(p.y));
      hi.setAttribute("x2", String(O.x));
      hi.setAttribute("y2", String(O.y - 20));
    } else hi.setAttribute("opacity", String(0));
    vEl.className = "verdict read-verdict " + c.cls;
    vBig.textContent = c.title;
    rule.textContent = c.rule;
    mText.textContent = c.mistake;
  }
  root.querySelectorAll<HTMLElement>(".read-seg button").forEach((b) =>
    b.addEventListener("click", () => {
      root.querySelectorAll<HTMLElement>(".read-seg button").forEach((x) => {
        x.classList.toggle("active", x === b);
      });
      const k = b.dataset["t"];
      if (isType(k)) show(k);
    }),
  );
  show("shooter");
  return {};
}

/* ---------------- TAB 7: LIVE DRILL (REAL-TIME) ---------------- */
function initDrill(root: HTMLElement) {
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
  // shooter spawns — each rep picks one, so angles + help geometry vary
  const SPOTS = [
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
  let D = { x: 265, y: 200 },
    Dv = { x: 0, y: 0 },
    SH = { x: 405, y: 205 },
    pointer = { x: 265, y: 200 };
  function placeSpot(s: { o: P; d: P }) {
    SH = { ...s.o };
    D = { ...s.d };
    pointer = { ...s.d };
    Dv = { x: 0, y: 0 };
    ideal.setAttribute("cx", String(SH.x));
    ideal.setAttribute("cy", String(SH.y));
    ideal.setAttribute("r", String(30));
    gatherEl.setAttribute("cx", String(SH.x));
    gatherEl.setAttribute("cy", String(SH.y));
  }
  placeSpot(SPOTS[0]!);
  // gather (reaction window) scales with the closeout distance, so a far spawn gives you time to arrive
  let repGather = 0.9,
    gatherR0 = 120;
  let state = "idle",
    stateT = 0,
    containT = 0,
    driveDir = { x: 0, y: 0 },
    oTrace: P[] = [];
  let stops = 0,
    buckets = 0,
    streak = 0,
    raf: number | null = null,
    lastTs = 0;
  const pt = svg.createSVGPoint();
  const toSvg = (e: MouseEvent) => {
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };
  const onMove = (e: MouseEvent) => {
    pointer = toSvg(e);
  };
  svg.addEventListener("pointermove", onMove);
  svg.addEventListener("mousemove", onMove);
  function setMsg(t: string, cls: string) {
    msgEl.textContent = t;
    msgEl.className = "verdict d-msg " + (cls || "");
  }
  function draw() {
    def.setAttribute("transform", `translate(${D.x} ${D.y})`);
    off.setAttribute("transform", `translate(${SH.x} ${SH.y})`);
    cursor.setAttribute("cx", String(pointer.x));
    cursor.setAttribute("cy", String(pointer.y));
  }
  function idle() {
    placeSpot(SPOTS[0]!);
    state = "idle";
    drive.setAttribute("opacity", String(0));
    stamp.setAttribute("opacity", String(0));
    hand.setAttribute("opacity", String(0));
    gatherEl.setAttribute("opacity", String(0));
    ball.setAttribute("cx", String(-13));
    ball.setAttribute("cy", String(0));
    setMsg(
      "Press Start, then steer your defender with the cursor. Sprint out, then break down at the ring.",
      "",
    );
    draw();
  }
  function newRep() {
    placeSpot(SPOTS[Math.floor(Math.random() * SPOTS.length)]!);
    state = "ready";
    stateT = 0;
    containT = 0;
    oTrace = [];
    gatherR0 = dist(D, SH);
    repGather = clamp(gatherR0 / 220 + 0.4, 0.65, 1.6); // farther closeout → more time
    drive.setAttribute("opacity", String(0));
    stamp.setAttribute("opacity", String(0));
    hand.setAttribute("opacity", String(0));
    ball.setAttribute("cx", String(-13));
    ball.setAttribute("cy", String(0));
    setMsg("Close out! Get inside the shrinking yellow ring before he's set.", "");
    draw();
  }
  function finish(kind: string, text: string) {
    state = "done";
    stateT = 0;
    const good = kind === "stop";
    if (good) {
      stops++;
      streak++;
    } else {
      buckets++;
      streak = 0;
    }
    stopsEl.textContent = String(stops);
    bucketsEl.textContent = String(buckets);
    streakEl.textContent = String(streak);
    gatherEl.setAttribute("opacity", String(0));
    stamp.setAttribute("opacity", String(1));
    stamp.setAttribute("fill", good ? "var(--accent)" : "#e2493f");
    stamp.textContent = good ? "STOP ✓" : "BUCKET";
    setMsg(text + "  —  press Start for the next rep.", good ? "good" : "bad");
  }
  function startDrive() {
    state = "drive";
    stateT = 0;
    oTrace = [{ x: SH.x, y: SH.y }];
    // burst toward the rim, biased to whichever side the defender isn't covering
    const toRim = norm(sub(RIM, SH)),
      p = perp(toRim);
    const lat = (D.x - SH.x) * p.x + (D.y - SH.y) * p.y; // defender's lateral position vs the rim line
    driveDir = norm(add(toRim, mul(p, (lat > 0 ? -1 : 1) * 0.9)));
    setMsg("He's attacking — cut him off! Get between him and the rim.", "");
  }
  function step(dt: number) {
    // defender momentum: accelerate toward the cursor, damped, speed-capped → yanking overshoots
    Dv.x += (pointer.x - D.x) * 10 * dt;
    Dv.y += (pointer.y - D.y) * 10 * dt;
    Dv.x *= 1 - 5.5 * dt;
    Dv.y *= 1 - 5.5 * dt;
    const sp = Math.hypot(Dv.x, Dv.y);
    if (sp > VMAX) {
      Dv.x *= VMAX / sp;
      Dv.y *= VMAX / sp;
    }
    D.x = clamp(D.x + Dv.x * dt, 30, 470);
    D.y = clamp(D.y + Dv.y * dt, 30, 460);
    const vmag = Math.hypot(Dv.x, Dv.y);
    stateT += dt;
    if (state === "ready") {
      const pr = clamp(stateT / repGather, 0, 1); // shrinking "he's gathering" window
      gatherEl.setAttribute("r", String(30 + (1 - pr) * gatherR0));
      gatherEl.setAttribute("opacity", String(0.3 + 0.45 * (1 - pr)));
      if (stateT >= repGather) {
        state = "hold";
        stateT = 0;
        gatherEl.setAttribute("opacity", String(0));
        setMsg("He's set — contest or contain!", "");
      }
    } else if (state === "hold") {
      const d = dist(D, SH);
      if (d > OPEN) {
        state = "shoot";
        stateT = 0;
      } else if (d < CROWD) {
        startDrive();
      } else if (vmag > FLY) {
        startDrive();
      } else {
        containT += dt;
        if (containT >= HOLDMAX) {
          state = "shoot";
          stateT = 0;
        }
      }
    } else if (state === "shoot") {
      const e = clamp(stateT / 0.42, 0, 1);
      ball.setAttribute("cx", String(0));
      ball.setAttribute("cy", String(-e * 44));
      const d = dist(D, SH);
      if (d <= CONTEST) {
        hand.setAttribute("opacity", String(1));
        hand.setAttribute("x1", String(D.x));
        hand.setAttribute("y1", String(D.y));
        hand.setAttribute("x2", String(SH.x));
        hand.setAttribute("y2", String(SH.y - 20));
      } else hand.setAttribute("opacity", String(0));
      if (e >= 1) {
        if (dist(D, SH) <= CONTEST)
          finish("stop", "Balanced at the cushion — you contested the shot clean. Stop.");
        else finish("bucket", "Too much space — wide-open jumper. You have to close the gap.");
      }
    } else if (state === "drive") {
      const tgt =
        stateT > 0.22
          ? { x: RIM.x, y: 74 }
          : { x: SH.x + driveDir.x * 40, y: SH.y + driveDir.y * 40 };
      const dx = tgt.x - SH.x,
        dy = tgt.y - SH.y,
        l = Math.hypot(dx, dy) || 1;
      SH.x += (dx / l) * OSPEED * dt;
      SH.y += (dy / l) * OSPEED * dt;
      oTrace.push({ x: SH.x, y: SH.y });
      drive.setAttribute("d", pathD(oTrace));
      drive.setAttribute("opacity", String(0.6));
      const nb = norm({ x: dx, y: dy });
      ball.setAttribute("cx", String(nb.x * 13));
      ball.setAttribute("cy", String(nb.y * 13));
      if (dist(D, SH) < 27 && dist(D, RIM) < dist(SH, RIM) + 4) {
        finish("stop", "You stayed in front and walled off the drive. Contained — stop.");
        return;
      }
      if (dist(SH, RIM) < 34) {
        finish(
          "bucket",
          "He beat you to the rim — you were too crowded or flying to slide with him.",
        );
        return;
      }
      if (stateT > DUR_CAP) {
        finish("stop", "He couldn't turn the corner on you — contained.");
        return;
      }
    }
    draw();
  }
  function loop(ts: number) {
    if (!lastTs) lastTs = ts;
    let dt = (ts - lastTs) / 1000;
    lastTs = ts;
    dt = Math.min(dt, 0.05);
    if (state === "idle" || state === "done") draw();
    else step(dt);
    raf = requestAnimationFrame(loop);
  }
  startBtn.addEventListener("click", newRep);
  idle();
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
      if (state !== "idle") idle();
    },
  };
}

/* ---------------- TABS ---------------- */
const safe = (fn: (root: HTMLElement) => Api, el: HTMLElement | null) => {
  try {
    return fn(el!);
  } catch (e) {
    console.error("tab init failed:", e);
    return null;
  }
};
const inits: Record<string, Api | null> = {
  move: safe(initMove, document.querySelector("#tab-move")),
  cushion: safe(initCushion, document.querySelector("#tab-cushion")),
  side: safe(initSide, document.querySelector("#tab-side")),
  feet: safe(initFeet, document.querySelector("#tab-feet")),
  d3: safe(initD3, document.querySelector("#tab-d3")),
  sandbox: safe(initSandbox, document.querySelector("#tab-sandbox")),
  drill: safe(initDrill, document.querySelector("#tab-drill")),
  read: safe(initRead, document.querySelector("#tab-read")),
  team: safe(initTeam, document.querySelector("#tab-team")),
};
document.querySelector("#tabs")!.addEventListener("click", (e) => {
  const b = e.target instanceof Element ? e.target.closest<HTMLElement>("button[data-tab]") : null;
  if (!b) return;
  const id = b.dataset["tab"]!;
  document.querySelectorAll("#tabs button").forEach((x) => {
    x.classList.toggle("active", x === b);
  });
  document.querySelectorAll(".tab").forEach((s) => {
    s.classList.toggle("active", s.id === "tab-" + id);
  });
  Object.entries(inits).forEach(([k, api]) => {
    if (k !== id && api && api.onHide) api.onHide();
  });
  const cur = inits[id];
  if (cur && cur.onShow) cur.onShow();
});
