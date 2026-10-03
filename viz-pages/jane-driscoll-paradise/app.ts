import { arrowMarkers, connect, labelBox, $, $$ } from "/_kit/viz.js";

/* ============ THE JOURNEY ============ */
const ACTS = [
  { band: "Origin · before the series", color: "var(--c4)", beats: [
    { ep: "Revealed · S2E6 \"Jane\"", when: "May 29 – Jun 6, 1997", t: "The prophecy", p: "A stranger receives a message from a mystery sender, \"Alex Q,\" on a store computer: a killer will be born June 6 at 12:01 a.m. — and \"she can be stopped when it matters.\" He tries to warn Jane's mother on the hospital steps.",
      note: "This message — and the sender \"Alex\" — is the thread Season 2 pulls on. ALEX turns out to be a predictive AI tied to Sinatra; how it sent a 1997 message is left as an open (possibly time-bending) mystery." },
    { ep: "Revealed · S2E6 \"Jane\"", when: "Childhood · year unstated", t: "Climby & the sauna", p: "Raised alone by a detached, abusive mother. To cope, she invents Climby — an imaginary friend who eggs her on. On his encouragement she locks her mother and the boyfriend in a sauna.",
      note: "First glimpse of the engine: loneliness in, permission-to-harm out. Climby is the violence she isn't allowed to own yet." },
    { ep: "Revealed · S2E6 \"Jane\"", when: "Adulthood · year unstated", t: "Stacy Thomas, the first mother", p: "She enlists and trains at the CIA's secret facility, The Farm. Mentor Stacy Thomas teaches her meditation to quiet the voices — Jane turns it into assassin's hyperfocus. Desperate for Stacy's approval, she brutally retaliates against the man promoted over her.",
      note: "The template for every relationship after: find a woman to idolize, earn her with violence. Sinatra is just the sequel to Stacy." },
  ]},
  { band: "Season 1 · the quiet cleanup crew", color: "var(--accent)", beats: [
    { ep: "S1E1 · \"Wildcat is Down\"", when: "≈3 yrs after \"the Day\"", t: "The night the President dies", p: "President Cal Bradford is assassinated. Jane is working the control systems; her lover Billy is on guard — and the cameras are down. Xavier calls the residence lockdown.",
      note: "She's hidden in plain sight from the pilot — a colleague, not yet a suspect. (No calendar year is ever given for the bunker present.)" },
    { ep: "S1E3", when: "days later", t: "The Wii Tennis alibi", p: "As investigator Garcia closes in on the camera blackout, Jane and Billy's cover for the dark night is almost absurdly innocent: they say they shut the cameras off to play Wii Tennis.",
      note: "The camera blackout is what enabled the assassination cover-up — and the Wii is introduced as her tell, a childish fixation bolted onto a killer." },
    { ep: "S1E4 · \"Agent Billy Pace\"", when: "days later", t: "She kills Billy", p: "On Sinatra's order (Billy was a threat to her), Jane poisons Billy's beer and stages a drug overdose — murdering her own lover on command.",
      note: "Clean demonstration of \"aimed\": the target is someone she's close to, and it doesn't matter." },
    { ep: "S1E5", when: "same stretch", t: "Grieving the body she staged", p: "Jane and Xavier \"discover\" Billy's corpse. Jane performs the devastated girlfriend flawlessly — only she and Sinatra know she did it.",
      note: "She can manufacture grief on demand. The performance is as effortless as the kill." },
    { ep: "S1E6 · \"You Asked for Miracles\"", when: "days later", t: "She takes Presley", p: "Tasked with finding the off-grid Xavier, Jane retrieves her gun from a heart-shaped pillow and abducts his daughter Presley — under the gentle cover of \"not wanting to be alone.\"",
      note: "The heart-pillow holster says it all: the loneliness leaks through even mid-operation. The captive is also company." },
    { ep: "S1E8 · \"The Man Who Kept the Secrets\"", when: "S1 climax", t: "She shoots Sinatra", p: "Denied her petty prize — the late president's Wii / video-game collection — Jane finds Xavier holding Sinatra at gunpoint and shoots Sinatra herself, leaning in: she should've just let me have the Wii. (Presley was safe all along.)",
      note: "Approval is conditional and volatile — cross her on something small and the loyalty inverts in a heartbeat. Fogelman: the Wii is \"the butt of the joke,\" but she does love that damn game." },
  ]},
  { band: "Season 2 · the origin, and the reversal", color: "var(--c5)", beats: [
    { ep: "S2E6 · \"Jane\"", when: "continuous with S1", t: "Her standalone episode", p: "The backstory above is finally told. In the present, with President Baines secretly dead by Jane's hand and Sinatra back in control, Jane explains why she kept Sinatra alive — \"a weapon… people I respect aim me\" — and warns Dr. Torabi: \"If you come for her, you come through me.\"",
      note: "The thesis statement of the character, delivered to the only person who's started to see her clearly." },
    { ep: "S2E7 · \"The Final Countdown\"", when: "S2 climax", t: "The predator becomes prey", p: "Jane breaks into Dr. Gabriela Torabi's home to kill her. Torabi senses it, ambushes her from behind, and stabs her twice in the back. Jane collapses, bleeding out in the shower.",
      note: "For once the room out-watches the watcher. The hunter ends the season on the floor." },
  ]},
  { band: "Cliffhanger", color: "var(--danger)", beats: [
    { ep: "S2 finale", when: "moments later", t: "The empty shower", p: "Minutes from the end, a cut reveals Jane's body is gone — no drag trail, just splatter. She isn't there when the bunker implodes. Dead, or removed by someone? The series leaves it wide open.",
      note: "See \"Is Jane dead?\" below — the writer says she looked dead; the staging says she didn't stay put." },
  ]},
];

const tl = $("#timeline")!;
let html = "", i = 0;
for (const act of ACTS) {
  html += `<div class="act-band"><span style="color:${act.color}">${act.band}</span></div>`;
  for (const b of act.beats) {
    const sideCls = i % 2 ? "right" : "left";
    html += `<div class="beat ${sideCls}">
      <div class="dot" style="border-color:${act.color}"></div>
      <div class="card2">
        <div class="meta-row">
          <span class="badge b-ep">${b.ep}</span>
          <span class="badge b-when">${b.when}</span>
        </div>
        <h3>${b.t}</h3>
        <p>${b.p}</p>
        <details><summary>more</summary><div class="note">${b.note}</div></details>
      </div>
    </div>`;
    i++;
  }
}
tl.innerHTML = html;

/* ============ THE AIMED-WEAPON LOOP ============ */
(() => {
  const svg = $("#loop")!;
  const nodes = [
    { x: 18,  y: 70, w: 168, h: 96, c: "var(--c4)",     t: "<b>Abandonment wound</b>", r: "raised by an abusive mother; no compass of her own" },
    { x: 222, y: 70, w: 168, h: 96, c: "var(--warn)",   t: "<b>Latches onto a mother</b>", r: "Stacy, then Sinatra — someone to idolize and earn" },
    { x: 426, y: 70, w: 168, h: 96, c: "var(--accent)", t: "<b>Gets aimed</b>", r: "the handler points her at a target" },
    { x: 630, y: 70, w: 168, h: 96, c: "var(--danger)", t: "<b>Executes</b>", r: "kills without remorse — then needs to be wanted again" },
  ];
  let s = arrowMarkers();
  for (let k = 0; k < nodes.length - 1; k++) {
    s += `<path d="${connect(nodes[k]!, nodes[k+1]!)}" fill="none" stroke="var(--border)" stroke-width="2" marker-end="url(#ah)"/>`;
  }
  const a = nodes[3]!, b = nodes[0]!;
  s += `<path d="M ${a.x + a.w/2} ${a.y + a.h} C ${a.x + a.w/2} 235, ${b.x + b.w/2} 235, ${b.x + b.w/2} ${b.y + b.h}"
          fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#ah-danger)"/>`;
  s += `<text x="408" y="230" text-anchor="middle" fill="var(--danger)" font-size="12" font-style="italic">craves the next approval — and the loop resets</text>`;
  for (const n of nodes) {
    s += `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="11" fill="var(--panel)" stroke="${n.c}" stroke-width="2"/>`;
    s += labelBox({ x: n.x, y: n.y, w: n.w, h: n.h },
      `<div style="padding:10px 12px"><div>${n.t}</div><div class="role">${n.r}</div></div>`);
  }
  svg.innerHTML = s;
})();

/* ============ WHO SHE ORBITS ============ */
type Cat = "handler" | "inner" | "killed" | "captive" | "foe";
(() => {
  const svg = $("#orbitsvg")!;
  const jane = { x: 410, y: 300, w: 160, h: 64 };
  const C: Record<Cat, string> = { handler: "var(--warn)", inner: "var(--c4)", killed: "var(--danger)", captive: "var(--c5)", foe: "var(--accent)" };
  const sat: { x: number; y: number; w: number; h: number; cat: Cat; t: string; r: string }[] = [
    { x: 405, y: 18,  w: 170, h: 54, cat: "inner",   t: "Climby", r: "the inner voice that grants permission" },
    { x: 70,  y: 80,  w: 180, h: 56, cat: "handler", t: "Stacy Thomas", r: "first mother-figure · CIA mentor" },
    { x: 730, y: 80,  w: 180, h: 60, cat: "handler", t: "Sinatra", r: "current handler — yet Jane shot her too" },
    { x: 770, y: 300, w: 180, h: 56, cat: "foe",     t: "Xavier Collins", r: "colleague she deceives & crosses" },
    { x: 40,  y: 300, w: 180, h: 56, cat: "captive", t: "Presley", r: "Xavier's daughter — abducted" },
    { x: 90,  y: 540, w: 180, h: 56, cat: "killed",  t: "Billy Pace", r: "her lover — killed on order" },
    { x: 400, y: 580, w: 180, h: 56, cat: "killed",  t: "President Baines", r: "secretly killed by Jane" },
    { x: 720, y: 540, w: 190, h: 60, cat: "killed",  t: "Dr. Gabriela Torabi", r: "her last target — who stabbed her instead" },
  ];
  let s = arrowMarkers();
  const markerFor: Record<Cat, string> = { handler: "url(#ah-warn)", inner: "url(#ah)", killed: "url(#ah-danger)", captive: "url(#ah)", foe: "url(#ah-accent)" };
  for (const n of sat) {
    const dashed = n.cat === "killed" && n.t.startsWith("Dr.");
    s += `<path d="${connect(jane, n)}" fill="none" stroke="${C[n.cat]}" stroke-width="2"
            ${dashed ? 'stroke-dasharray="5 4"' : ""} marker-end="${markerFor[n.cat]}"/>`;
  }
  for (const n of sat) {
    s += `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="10" fill="var(--panel)" stroke="${C[n.cat]}" stroke-width="1.5"/>`;
    s += labelBox(n, `<div style="padding:7px 11px"><div><b>${n.t}</b></div><div class="role">${n.r}</div></div>`);
  }
  s += `<rect x="${jane.x}" y="${jane.y}" width="${jane.w}" height="${jane.h}" rx="12" fill="var(--panel-2)" stroke="var(--text)" stroke-width="2"/>`;
  s += labelBox(jane, `<div style="padding:9px 12px;text-align:center"><div style="font-size:17px"><b>JANE</b></div><div class="role">the weapon</div></div>`);
  svg.innerHTML = s;
})();

/* ============ ALEX MESSAGE FLOW ============ */
(() => {
  const svg = $("#alexflow")!;
  const fn = [
    { x: 6,   y: 40, w: 172, h: 70, c: "var(--c4)",     t: "ALEX", r: "predictive AI · Sinatra's secret" },
    { x: 202, y: 40, w: 172, h: 70, c: "var(--accent)", t: "\"Alex Q\" message", r: "on a 1997 store computer" },
    { x: 398, y: 40, w: 160, h: 70, c: "var(--muted)",  t: "Don", r: "the store clerk who got it" },
    { x: 582, y: 40, w: 170, h: 70, c: "var(--muted)",  t: "Charlotte", r: "Jane's mother, at the hospital" },
    { x: 776, y: 40, w: 178, h: 70, c: "var(--danger)", t: "Jane", r: "born Jun 6, 1997 · 12:01 a.m." },
  ];
  let s = arrowMarkers();
  for (let k = 0; k < fn.length - 1; k++) {
    const dashed = k === 0; // the eerie/time-bending hop from a future AI into 1997
    s += `<path d="${connect(fn[k]!, fn[k+1]!)}" fill="none" stroke="${dashed ? 'var(--c4)' : 'var(--border)'}"
            stroke-width="2" ${dashed ? 'stroke-dasharray="5 4"' : ""} marker-end="${dashed ? 'url(#ah-accent)' : 'url(#ah)'}"/>`;
  }
  for (const n of fn) {
    s += `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="11" fill="var(--panel)" stroke="${n.c}" stroke-width="1.8"/>`;
    s += labelBox(n, `<div style="padding:9px 12px"><div><b>${n.t}</b></div><div class="role">${n.r}</div></div>`);
  }
  svg.innerHTML = s;
})();

/* ============ nav active-state + progress bar ============ */
const prog = $<HTMLElement>("#progress")!;
const links = $$<HTMLAnchorElement>("nav.toc a");
const sections = links.map(a => document.getElementById(a.getAttribute("href")!.slice(1))).filter((e): e is HTMLElement => Boolean(e));
function onScroll() {
  const h = document.documentElement;
  prog.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + "%";
  let active = sections[0]!;
  for (const sec of sections) { if (sec.getBoundingClientRect().top <= 120) active = sec; }
  links.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + active.id));
}
document.addEventListener("scroll", onScroll, { passive: true });
onScroll();
