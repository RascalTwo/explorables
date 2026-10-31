import { type Api, scope, COURT, O, dir } from "./common.js";

/* ---------------- TAB 8: READ THE MAN ---------------- */
export function initRead(root: HTMLElement): Api {
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
