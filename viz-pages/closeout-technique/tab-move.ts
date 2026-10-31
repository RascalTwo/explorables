import {
  type Api,
  need,
  scope,
  dist,
  ease,
  clamp,
  sampleKf,
  pathD,
  COURT,
  O,
  HELP,
} from "./common.js";

/* ---------------- TAB 1: THE CLOSEOUT ---------------- */
export function initMove(root: HTMLElement): Api {
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
