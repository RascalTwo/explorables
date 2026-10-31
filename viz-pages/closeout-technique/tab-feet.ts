import { type Api, type Stride, scope } from "./common.js";

/* ---------------- TAB 4: THE FOOTWORK (chop-step vs sprint-stop) ---------------- */
export function initFeet(root: HTMLElement): Api {
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
