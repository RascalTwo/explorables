import { type Api, type Kf, need, scope, ease, clamp, sampleKf, pathD, COURT } from "./common.js";

/* ---------------- TAB 7: IN A DEFENSE ---------------- */
export function initTeam(root: HTMLElement): Api {
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
