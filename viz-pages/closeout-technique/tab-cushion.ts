import {
  type Api,
  need,
  scope,
  RIM,
  norm,
  sub,
  clamp,
  along,
  pathD,
  COURT,
  O,
  dir,
} from "./common.js";

/* ---------------- TAB 2: THE CUSHION ---------------- */
export function initCushion(root: HTMLElement): Api {
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
