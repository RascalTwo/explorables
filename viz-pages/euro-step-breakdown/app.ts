export type { TabApi }; // an export makes this a module so the coverage tool can map it to source
type P = { x: number; y: number };
type TabApi = { onShow?: () => unknown; onHide?: () => void };
type Styled = Element & ElementCSSInlineStyle;
/** An element the markup is known to have; throws when it is missing. */
const need = <E extends Element>(e: E | null, sel: string): E => {
  if (!e) throw new Error("missing element " + sel);
  return e;
};
const scope = (root: HTMLElement) => (s: string) => need(root.querySelector(s), s);
const RIM = { x: 250, y: 56 };
const sub = (a: P, b: P): P => ({ x: a.x - b.x, y: a.y - b.y }),
  add = (a: P, b: P): P => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: P, k: number): P => ({ x: a.x * k, y: a.y * k }),
  dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
const norm = (a: P): P => {
  const l = Math.hypot(a.x, a.y) || 1;
  return { x: a.x / l, y: a.y / l };
};
const ease = (p: number) => p * p * (3 - 2 * p);
function along(pts: P[], a: number) {
  const segs = pts.length - 1;
  const x = Math.max(0, Math.min(1, a)) * segs;
  const i = Math.min(segs - 1, Math.floor(x));
  let f = x - i;
  f = ease(f);
  return {
    x: pts[i]!.x + (pts[i + 1]!.x - pts[i]!.x) * f,
    y: pts[i]!.y + (pts[i + 1]!.y - pts[i]!.y) * f,
  };
}

/* ---------------- TAB 1: THE MOVE ---------------- */
function initMove(root: HTMLElement): TabApi {
  type Key = { t: number; x: number; y: number };
  const offKeys: Key[] = [
    { t: 0, x: 150, y: 430 },
    { t: 0.3, x: 222, y: 250 },
    { t: 0.55, x: 305, y: 200 },
    { t: 0.82, x: 188, y: 130 },
    { t: 1, x: 232, y: 78 },
  ];
  const defKeys: Key[] = [
    { t: 0, x: 250, y: 175 },
    { t: 0.3, x: 235, y: 200 },
    { t: 0.55, x: 292, y: 198 },
    { t: 0.82, x: 300, y: 205 },
    { t: 1, x: 298, y: 210 },
  ];
  const prints = [
    { t: 0.3, x: 222, y: 250, label: "gather" },
    { t: 0.55, x: 305, y: 200, label: "1" },
    { t: 0.82, x: 188, y: 130, label: "2" },
  ];
  const STEPS = [
    {
      t0: 0,
      name: "The drive",
      body: "The ball-handler attacks the basket off the dribble. The defender slides over to cut him off — straight ahead is a dead end (and a collision).",
    },
    {
      t0: 0.3,
      name: "The gather",
      body: "He picks up his dribble. The instant you stop dribbling, the rules give you two steps to finish. The clock on those two steps starts now.",
    },
    {
      t0: 0.55,
      name: "Step 1 — sell the fake",
      body: "First step is a long stride to one side (here, his right). It looks like he's finishing that way, so the defender lunges to block it.",
    },
    {
      t0: 0.82,
      name: "Step 2 — cross over",
      body: "He pushes off and takes his second step the OTHER way, swinging the ball across his body — right past the defender who just committed the wrong direction.",
    },
    {
      t0: 0.93,
      name: "The finish",
      body: "No one between him and the rim. Easy layup on the far side, away from the stranded defender. Two steps, two directions, bucket.",
    },
  ];
  const sample = (keys: Key[], t0: number): P => {
    const t = Math.max(0, Math.min(1, t0));
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i]!,
        b = keys[i + 1]!;
      if (t >= a.t && t <= b.t) {
        const p = b.t === a.t ? 0 : ease((t - a.t) / (b.t - a.t));
        return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
      }
    }
    const l = keys.at(-1)!;
    return { x: l.x, y: l.y };
  };
  const $ = scope(root);
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
    scrub = need(root.querySelector<HTMLInputElement>(".scrub"), ".scrub"),
    playBtn = $(".play");
  let dPath = "";
  for (let i = 0; i <= 120; i++) {
    const p = sample(offKeys, i / 120);
    dPath += (i ? " L " : "M ") + p.x.toFixed(1) + " " + p.y.toFixed(1);
  }
  trail.setAttribute("d", dPath);
  function render(t: number) {
    const o = sample(offKeys, t),
      d = sample(defKeys, t);
    off.setAttribute("transform", `translate(${o.x} ${o.y})`);
    def.setAttribute("transform", `translate(${d.x} ${d.y})`);
    const ah = sample(offKeys, Math.min(1, t + 0.04)),
      dx = ah.x - o.x,
      dy = ah.y - o.y,
      len = Math.hypot(dx, dy) || 1;
    ball.setAttribute("cx", String((dx / len) * 13));
    ball.setAttribute("cy", String((dy / len) * 13));
    printsG.innerHTML = "";
    prints.forEach((pr) => {
      if (t >= pr.t - 0.001) {
        const num = pr.label === "1" || pr.label === "2";
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.innerHTML = `<circle cx="${pr.x}" cy="${pr.y}" r="${num ? 11 : 9}" fill="none" stroke="${num ? "var(--accent)" : "#7d8aa0"}" stroke-width="${num ? 2.5 : 2}" ${num ? "" : 'stroke-dasharray="3 3"'} opacity="0.9"/><text x="${pr.x}" y="${pr.y + 4}" text-anchor="middle" font-size="${num ? 12 : 8.5}" font-weight="700" fill="${num ? "var(--accent)" : "#9fb0c3"}">${num ? pr.label : "⊕"}</text>`;
        printsG.append(g);
      }
    });
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
  const DUR = 6500;
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
    t = Math.max(0, Math.min(1, v));
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
    setT(Number(scrub.value) / 1000);
  });
  render(0);
  return { onHide: pause };
}

/* ---------------- TAB 2: WHY IT WORKS ---------------- */
function initWhy(root: HTMLElement): TabApi {
  const svg = root.querySelector<SVGSVGElement>(".why-court")!;
  const $ = scope(root);
  let D = { x: 250, y: 195 };
  const O_START = { x: 175, y: 442 },
    REACH_R = 52,
    LUNGE = 34;
  function plan() {
    const spaceSide = D.x <= RIM.x ? 1 : -1,
      fakeSide = -spaceSide;
    const gather = { x: D.x, y: Math.min(D.y + 52, 300) };
    const fake = { x: gather.x + fakeSide * 72, y: D.y + 6 };
    const finish = { x: RIM.x + spaceSide * 46, y: 92 };
    const toFake = norm(sub(fake, D));
    const lungeEnd = add(D, mul(toFake, LUNGE));
    const open = dist(finish, lungeEnd) > REACH_R;
    const margin = Math.round(dist(finish, lungeEnd) - REACH_R);
    return { spaceSide, fakeSide, gather, fake, finish, toFake, lungeEnd, open, margin };
  }
  const els = {
    reach: need(root.querySelector<SVGCircleElement>(".reach"), ".reach"),
    mom: need(root.querySelector<SVGLineElement>(".momArrow"), ".momArrow"),
    fake: need(root.querySelector<SVGLineElement>(".fakeArrow"), ".fakeArrow"),
    finish: need(root.querySelector<SVGGElement>(".finish"), ".finish"),
    finishC: $(".finish circle"),
    path: $(".wpath"),
    off: $(".off"),
    ball: $(".ball"),
    def: need(root.querySelector<SVGGElement>(".def"), ".def"),
  };
  const setLine = (el: Element, a: P, b: P) => {
    el.setAttribute("x1", String(a.x));
    el.setAttribute("y1", String(a.y));
    el.setAttribute("x2", String(b.x));
    el.setAttribute("y2", String(b.y));
  };
  function verdict(p: ReturnType<typeof plan>) {
    const v = $(".verdict"),
      big = v.querySelector(".big")!,
      t = $(".vtext");
    v.className = "verdict " + (p.open ? "open" : "contested");
    if (p.open) {
      big.textContent = `🏀 OPEN LAYUP  (+${p.margin}px clear)`;
      t.textContent =
        "The defender's momentum carried them toward the fake. By the time they could change direction, the finish on the other side is already up. This is the Euro Step working.";
    } else {
      big.textContent = `🛡 CONTESTED  (${p.margin}px short)`;
      t.textContent =
        "From here the defender can still recover to the finish — they're sitting back, not over-committing. Sell the fake harder, or pick a different finish. Drag D off-center to open the move up.";
    }
  }
  function render(a = 0) {
    const p = plan();
    els.def.setAttribute("transform", `translate(${D.x} ${D.y})`);
    const committed = a >= 0.45;
    const lungeNow = committed ? p.lungeEnd : D;
    els.reach.setAttribute("cx", String(lungeNow.x));
    els.reach.setAttribute("cy", String(lungeNow.y));
    els.reach.setAttribute("r", String(REACH_R));
    els.reach.style.opacity = String(a >= 0.3 ? 1 : 0.35);
    setLine(els.mom, D, lungeNow);
    els.mom.style.opacity = String(committed ? 1 : 0.25);
    setLine(els.fake, p.gather, p.fake);
    els.fake.style.opacity = String(a >= 0.3 && a < 0.75 ? 1 : 0.25);
    els.finish.setAttribute("transform", `translate(${p.finish.x} ${p.finish.y})`);
    els.finishC.setAttribute("stroke", p.open ? "#36c98f" : "#e2493f");
    els.finish.style.opacity = String(a >= 0.5 ? 1 : 0.3);
    els.path.setAttribute(
      "d",
      `M ${O_START.x} ${O_START.y} L ${p.gather.x} ${p.gather.y} L ${p.fake.x} ${p.fake.y} L ${p.finish.x} ${p.finish.y}`,
    );
    const o = along([O_START, p.gather, p.fake, p.finish], a);
    els.off.setAttribute("transform", `translate(${o.x} ${o.y})`);
    const o2 = along([O_START, p.gather, p.fake, p.finish], Math.min(1, a + 0.05));
    const d = norm(sub(o2, o));
    els.ball.setAttribute("cx", String(d.x * 13));
    els.ball.setAttribute("cy", String(d.y * 13));
    if (committed) {
      const tt = Math.min(1, (a - 0.45) / 0.3);
      const dp = add(D, mul(p.toFake, LUNGE * tt));
      els.def.setAttribute("transform", `translate(${dp.x} ${dp.y})`);
    }
    verdict(p);
  }
  let dragging = false;
  const pt = svg.createSVGPoint();
  const toSvg = (e: PointerEvent): P => {
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM()!.inverse();
    const p = pt.matrixTransform(m);
    return { x: p.x, y: p.y };
  };
  els.def.addEventListener("pointerdown", (e) => {
    dragging = true;
    els.def.setPointerCapture(e.pointerId);
    els.def.style.cursor = "grabbing";
  });
  svg.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const p = toSvg(e);
    D.x = Math.max(120, Math.min(380, p.x));
    D.y = Math.max(80, Math.min(300, p.y));
    render(0);
  });
  window.addEventListener("pointerup", () => {
    if (dragging) {
      dragging = false;
      els.def.style.cursor = "grab";
    }
  });
  let raf: number | null = null,
    a = 0,
    last = 0;
  const DUR = 4200;
  const playBtn = $(".wplay");
  function tick(ts: number) {
    if (!last) last = ts;
    a += (ts - last) / DUR;
    last = ts;
    if (a >= 1) {
      a = 1;
      render(1);
      raf = null;
      playBtn.textContent = "▶ Run the move";
      return;
    }
    render(a);
    raf = requestAnimationFrame(tick);
  }
  playBtn.addEventListener("click", () => {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = null;
      playBtn.textContent = "▶ Run the move";
      render(1);
      return;
    }
    a = 0;
    last = 0;
    playBtn.textContent = "❚❚ Stop";
    raf = requestAnimationFrame(tick);
  });
  $(".wreset").addEventListener("click", () => {
    D = { x: 250, y: 195 };
    if (raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
    playBtn.textContent = "▶ Run the move";
    render(0);
  });
  render(0);
  return {
    onHide: () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
        playBtn.textContent = "▶ Run the move";
      }
    },
  };
}

/* ---------------- TAB 3: ROOKIE vs PRO ---------------- */
function initVS(root: HTMLElement): TabApi {
  type Kf = [number, number, number][];
  type Cfg = { o: Kf; d: Kf; stampAt: number; stamp: string; color: string; ballPop?: boolean };
  const cfg: Record<string, Cfg> = {
    rookie: {
      o: [
        [0, 140, 288],
        [0.5, 140, 202],
        [0.72, 140, 176],
        [1, 140, 176],
      ],
      d: [
        [0, 140, 150],
        [1, 140, 150],
      ],
      stampAt: 0.72,
      stamp: "CHARGE!",
      color: "#e2493f",
      ballPop: true,
    },
    pro: {
      o: [
        [0, 140, 288],
        [0.45, 140, 205],
        [0.65, 196, 170],
        [0.85, 92, 128],
        [1, 160, 66],
      ],
      d: [
        [0, 140, 150],
        [0.45, 140, 152],
        [0.65, 182, 168],
        [1, 188, 170],
      ],
      stampAt: 0.9,
      stamp: "BUCKET 🏀",
      color: "#36c98f",
    },
  };
  const sampleKf = (kf: Kf, a: number): P => {
    for (let i = 0; i < kf.length - 1; i++) {
      const A = kf[i]!,
        B = kf[i + 1]!;
      if (a >= A[0] && a <= B[0]) {
        const p = B[0] === A[0] ? 0 : ease((a - A[0]) / (B[0] - A[0]));
        return { x: A[1] + (B[1] - A[1]) * p, y: A[2] + (B[2] - A[2]) * p };
      }
    }
    const L = kf.at(-1)!;
    return { x: L[1], y: L[2] };
  };
  const panes = [...root.querySelectorAll<HTMLElement>(".vs-pane")].map((pane) => {
    const c = cfg[pane.dataset["kind"]!]!;
    const off = pane.querySelector(".voff")!,
      def = pane.querySelector(".vdef")!,
      ball = pane.querySelector(".vball")!,
      trail = pane.querySelector(".vtrail")!,
      stamp = pane.querySelector<SVGTextElement>(".vstamp")!;
    trail.setAttribute("stroke", c.color);
    let d = "";
    c.o.forEach((p, i) => {
      d += (i ? " L " : "M ") + p[1] + " " + p[2];
    });
    trail.setAttribute("d", d);
    return { c, off, def, ball, trail, stamp };
  });
  function render(a: number) {
    panes.forEach((P) => {
      const o = sampleKf(P.c.o, a),
        d = sampleKf(P.c.d, a);
      P.off.setAttribute("transform", `translate(${o.x} ${o.y})`);
      P.def.setAttribute("transform", `translate(${d.x} ${d.y})`);
      if (P.c.ballPop && a >= P.c.stampAt) {
        const t = (a - P.c.stampAt) / (1 - P.c.stampAt);
        P.ball.setAttribute("cx", String(42 * t));
        P.ball.setAttribute("cy", String(-34 * t));
      } else {
        const o2 = sampleKf(P.c.o, Math.min(1, a + 0.05));
        const dx = o2.x - o.x,
          dy = o2.y - o.y,
          len = Math.hypot(dx, dy) || 1;
        P.ball.setAttribute("cx", String((dx / len) * 11));
        P.ball.setAttribute("cy", String((dy / len) * 11));
      }
      P.stamp.style.opacity = String(a >= P.c.stampAt ? 1 : 0);
      P.stamp.setAttribute("fill", P.c.color);
      P.stamp.textContent = P.c.stamp;
    });
  }
  let raf: number | null = null,
    a = 0,
    last = 0;
  const DUR = 3600;
  const btn = root.querySelector(".vsplay")!;
  function tick(ts: number) {
    if (!last) last = ts;
    a += (ts - last) / DUR;
    last = ts;
    if (a >= 1) {
      a = 1;
      render(1);
      raf = null;
      btn.textContent = "↺ Run both again";
      return;
    }
    render(a);
    raf = requestAnimationFrame(tick);
  }
  btn.addEventListener("click", () => {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = null;
      btn.textContent = "▶ Run both";
      return;
    }
    a = 0;
    last = 0;
    btn.textContent = "❚❚ Stop";
    raf = requestAnimationFrame(tick);
  });
  render(0);
  return {
    onHide: () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
        btn.textContent = "▶ Run both";
      }
    },
  };
}

/* ---------------- TAB 4: 3D VIEW ---------------- */
type T3 = typeof import("three");
type Limb = import("three").Mesh<
  import("three").CapsuleGeometry,
  import("three").MeshStandardMaterial
>;
type Fig = {
  g: import("three").Group;
  torso: import("three").Mesh;
  head: import("three").Mesh;
  legL: Limb;
  legR: Limb;
  armL: Limb;
  armR: Limb;
  scale: number;
  _y?: number;
};
type XZ = [number, number];
function initD3(root: HTMLElement): TabApi {
  const host = root.querySelector<HTMLElement>(".d3-canvas")!;
  const playBtn = root.querySelector(".d3play")!,
    scrub = root.querySelector<HTMLInputElement>(".d3scrub")!,
    rotChk = root.querySelector<HTMLInputElement>(".d3rot")!,
    phaseEl = root.querySelector(".d3phase")!,
    titleEl = root.querySelector("#d3phaseTitle")!;
  let THREE: T3,
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
  const figs: { ball?: import("three").Mesh; off?: Fig; def?: Fig } = {};

  // move keyframes in 3D ground coords (x lateral, z toward basket at z=-22)
  const rootKf: [number, number, number][] = [
    [0, -5, 14],
    [0.38, -1, 0.5],
    [0.5, -1, -0.5],
    [0.66, 2.2, -4],
    [0.86, -2.2, -10],
    [1, 0.4, -15.5],
  ];
  const sample3 = (kf: [number, number, number][], t: number): XZ => {
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
  const PHASES: [number, string, string][] = [
    [0, "The drive", "Attacking downhill, ball on a live dribble."],
    [0.38, "The gather", "Picks up the ball — the two-step clock starts."],
    [0.5, "Step 1 — the fake", "A long, low stride to one side. Watch the lean sell it."],
    [0.7, "Step 2 — the cross", "Whips the other way; the ball swings across the body."],
    [0.9, "The finish", "Up at the rim, far side, defender stranded."],
  ];

  function makeFigure(color: number, scale = 1): Fig {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.7 * scale, 1.5 * scale, 6, 12), mat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.55 * scale, 18, 18), mat);
    g.add(torso, head);
    const limb = (r: number, l: number): Limb => {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 8), mat);
      m.geometry.translate(0, -l / 2, 0);
      g.add(m);
      return m;
    };
    const legL = limb(0.22 * scale, 1.6 * scale),
      legR = limb(0.22 * scale, 1.6 * scale),
      armL = limb(0.18 * scale, 1.4 * scale),
      armR = limb(0.18 * scale, 1.4 * scale);
    scene.add(g);
    return { g, torso, head, legL, legR, armL, armR, scale };
  }
  // orient a top-anchored capsule (its top at `from`) to point toward `to`
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  function aimLimb(mesh: Limb, from: import("three").Vector3, to: import("three").Vector3) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length() || 0.001;
    mesh.position.copy(from);
    mesh.quaternion.setFromUnitVectors(V(0, -1, 0), dir.clone().normalize());
    mesh.scale.y = len / (mesh.geometry.parameters.length || 1);
  }

  function build() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0a06);
    const w = host.clientWidth || 520,
      h = host.clientHeight || 520;
    cam = new THREE.PerspectiveCamera(42, w / h, 0.1, 200);
    cam.position.set(16, 15, 20);
    const r = (renderer = new THREE.WebGLRenderer({ antialias: true }));
    r.setSize(w, h);
    r.setPixelRatio(Math.min(2, devicePixelRatio));
    host.append(r.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dl = new THREE.DirectionalLight(0xfff0d8, 1.1);
    dl.position.set(10, 20, 8);
    scene.add(dl);
    // floor + paint + rim
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
      new THREE.MeshStandardMaterial({ color: 0x888 }),
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
    // ball
    figs.ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 18, 18),
      new THREE.MeshStandardMaterial({ color: 0xff9b3c, roughness: 0.5 }),
    );
    scene.add(figs.ball);
    figs.off = makeFigure(0x36c98f);
    figs.def = makeFigure(0xe2493f, 0.98);
    controls = new OrbitControls(cam, r.domElement);
    controls.target.set(0, 2, -9);
    controls.enableDamping = true;
    controls.minDistance = 10;
    controls.maxDistance = 60;
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

  function poseFigure(
    f: Fig,
    pos: XZ,
    lean: { side: number; fwd: number },
    footL: XZ,
    footR: XZ,
    handBall: [number, number, number] | null,
  ) {
    const [x, z] = pos;
    const y = f._y ?? 0;
    f.g.position.set(x, 0, z);
    // torso leans (rotate group about Z for lateral lean, X for forward)
    f.g.rotation.set(lean.fwd, 0, lean.side);
    f.torso.position.set(0, 2.3 + y, 0);
    f.head.position.set(0, 3.7 + y, 0);
    // hips/shoulders in group-local space
    const hipL = V(-0.45, 1.5 + y, 0),
      hipR = V(0.45, 1.5 + y, 0),
      shL = V(-0.6, 3.0 + y, 0),
      shR = V(0.6, 3.0 + y, 0);
    // feet given in WORLD-ish offset relative to root; convert to local by subtracting root x/z
    aimLimb(f.legL, hipL, V(footL[0] - x, 0, footL[1] - z));
    aimLimb(f.legR, hipR, V(footR[0] - x, 0, footR[1] - z));
    // arms: ball-side arm reaches to the ball, other relaxed
    aimLimb(
      f.armR,
      shR,
      handBall ? V(handBall[0] - x, handBall[1], handBall[2] - z) : V(0.9, 1.6 + y, 0.2),
    );
    aimLimb(f.armL, shL, V(-0.9, 1.6 + y, 0.2));
  }

  function render(t: number) {
    const [x, z] = sample3(rootKf, t);
    // lean: toward fake (right,+side) during step1, toward left during step2
    let side = 0,
      fwd = 0.12;
    if (t > 0.5 && t < 0.72) side = -0.28; // lean right (visual +x ⇒ negative Z-rot)
    else if (t >= 0.72 && t < 0.9) side = 0.3; // lean left
    // jump at finish
    figs.off!._y = t > 0.9 ? ((t - 0.9) / 0.1) * 1.6 : 0;
    // feet: plant wide on each step, else tuck near root
    const footStepR: XZ = [2.6, -4],
      footStepL: XZ = [-2.6, -10];
    const footR: XZ = t > 0.5 && t < 0.74 ? footStepR : [x + 0.5, z + 0.3];
    const footL: XZ = t >= 0.7 ? footStepL : [x - 0.5, z + 0.3];
    // ball: held right (step1) → swung left (step2) → raised at finish
    let ball: [number, number, number];
    if (t < 0.5) ball = [x + 0.6, 2.4, z + 0.4];
    else if (t < 0.72) ball = [x + 1.0, 2.2, z + 0.2]; // cocked to fake side
    else if (t < 0.9) ball = [x - 1.0, 2.3, z - 0.2]; // swung across
    else ball = [0.2, 5.2 + ((t - 0.9) / 0.1) * 0.8, -18.5]; // up to rim
    figs.ball!.position.set(ball[0], ball[1], ball[2]);
    poseFigure(figs.off!, [x, z], { side, fwd }, footL, footR, ball);
    // defender lunges to the fake then stuck
    const dRoot: XZ =
      t < 0.5 ? [0, -7] : t < 0.78 ? [2.2 + ((t - 0.5) / 0.28) * 1.2, -7.5] : [3.4, -7.6];
    poseFigure(
      figs.def!,
      dRoot,
      { side: t > 0.5 && t < 0.78 ? -0.25 : 0, fwd: 0.1 },
      [dRoot[0] - 0.5, dRoot[1] + 0.4],
      [dRoot[0] + 0.5, dRoot[1] + 0.4],
      null,
    );
    // phase text
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
    controls.autoRotateSpeed = 0.8;
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

  let OrbitControls: typeof import("three/examples/jsm/controls/OrbitControls.js").OrbitControls;
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
    a = Number(scrub.value) / 1000;
    if (built) render(a);
  });
  return { onShow, onHide };
}

/* ---------------- TAB 5: THE FOOTWORK ---------------- */
function initFeet(root: HTMLElement): TabApi {
  const $ = scope(root);
  const fps: Record<string, SVGGElement> = {};
  root.querySelectorAll<SVGGElement>(".fp").forEach((g) => {
    fps[g.dataset["id"]!] = g;
  });
  const path = need(root.querySelector<Styled>(".feet-path"), ".feet-path"),
    countEl = need(root.querySelector<HTMLElement>(".feet-count"), ".feet-count"),
    banner = $(".feet-banner"),
    bannerBig = banner.querySelector<HTMLElement>(".big")!,
    msg = $(".feet-msg");
  let timers: ReturnType<typeof setTimeout>[] = [];
  const clear = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };
  function reset() {
    clear();
    Object.values(fps).forEach((g) => {
      g.style.opacity = "0";
    });
    path.style.opacity = "0";
    countEl.textContent = "0";
    countEl.style.color = "var(--accent)";
    banner.className = "feet-banner verdict";
    bannerBig.textContent = "Press a button below";
    bannerBig.style.color = "";
    msg.textContent =
      "The gather is “step zero” — picking up your dribble. Then you get exactly two steps.";
  }
  const show = (id: string) => {
    fps[id]!.style.opacity = "1";
    fps[id]!.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 220 });
  };
  function legal() {
    reset();
    timers.push(
      setTimeout(() => {
        show("gather");
        msg.textContent = "Gather — dribble picked up. The two-step count starts now.";
      }, 150),
      setTimeout(() => {
        show("s1");
        countEl.textContent = "1";
        path.style.opacity = "0.7";
        bannerBig.textContent = "Step 1 ✓";
        bannerBig.style.color = "var(--accent)";
        msg.textContent = "First step — a long stride one way to move the defender.";
      }, 1000),
      setTimeout(() => {
        show("s2");
        countEl.textContent = "2";
        bannerBig.textContent = "Step 2 ✓";
        msg.textContent = "Second step — the other way, into the open space. Shoot now.";
      }, 1900),
      setTimeout(() => {
        banner.className = "feet-banner verdict open";
        bannerBig.textContent = "🏀 LEGAL — bucket";
        msg.textContent = "Two steps, two directions, ball released. Textbook Euro Step.";
      }, 2700),
    );
  }
  function travel() {
    legal();
    timers.push(
      setTimeout(() => {
        show("s3");
        countEl.textContent = "3";
        countEl.style.color = "#e2493f";
        banner.className = "feet-banner verdict contested";
        bannerBig.textContent = "🚫 TRAVEL — turnover";
        bannerBig.style.color = "#e2493f";
        msg.textContent =
          "That third step is a traveling violation — you only get two after the gather. Ball goes the other way.";
        countEl.animate([{ transform: "scale(1.4)" }, { transform: "scale(1)" }], {
          duration: 300,
        });
      }, 2700),
    );
  }
  $(".feet-legal").addEventListener("click", legal);
  $(".feet-travel").addEventListener("click", travel);
  reset();
  return { onHide: reset };
}

/* ---------------- TABS ---------------- */
const inits: Record<string, TabApi> = {
  move: initMove(document.querySelector("#tab-move")!),
  why: initWhy(document.querySelector("#tab-why")!),
  vs: initVS(document.querySelector("#tab-vs")!),
  d3: initD3(document.querySelector("#tab-d3")!),
  feet: initFeet(document.querySelector("#tab-feet")!),
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
