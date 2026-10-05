import { saveHash, loadHash, esc } from "@viz/kit";
import { ARTIFACTS } from "./artifacts.js";

// ================= DATA =================
// Verdicts: true = film matches reality · dram = based on truth but embellished
//           inv = invented / no basis · cut = real but omitted from the film
type Verdict = "true" | "dram" | "inv" | "cut";
type Source = { name: string; url: string; way?: string };
type Beat = {
  act: string;
  v: Verdict;
  title: string;
  film: string;
  real: string;
  note: string;
  src: Source;
};

const S = {
  hvh: {
    name: "History vs. Hollywood",
    url: "https://www.historyvshollywood.com/reelfaces/hacksaw-ridge/",
  },
  ww2: {
    name: "National WWII Museum",
    url: "https://www.nationalww2museum.org/war/articles/private-first-class-desmond-thomas-doss-medal-of-honor",
  },
  cmohs: {
    name: "Medal of Honor citation (CMOHS)",
    url: "https://www.cmohs.org/recipients/desmond-t-doss",
  },
  docs: {
    name: "Nat. Archives citation scan",
    url: "https://docsteach.org/document/doss-citation/",
  },
  army: {
    name: "U.S. Army — Doss's own 1987 interview",
    url: "https://achh.army.mil/regiment/moh-bios-dossint/",
  },
  lva: {
    name: "Library of Virginia biography",
    url: "https://old.lva.virginia.gov/public/dvb/bio.asp?b=Doss_Desmond_Thomas",
  },
  hoh: { name: "Home of Heroes", url: "https://homeofheroes.com/heroes-story/desmond-t-doss/" },
  faith: { name: "Faith of Doss", url: "https://faithofdoss.com/meet-desmond-doss-early-years/" },
  sr: {
    name: "ScreenRant",
    url: "https://screenrant.com/what-happened-to-desmond-doss-brother-hacksaw-ridge/",
  },
  wiki: { name: "Wikipedia — Desmond Doss", url: "https://en.wikipedia.org/wiki/Desmond_Doss" },
} satisfies Record<string, Source>;

const STATS: { n: string; l: string; hl?: boolean }[] = [
  {
    n: "75",
    l: "men the Medal of Honor citation credits him with saving on the ridge — a negotiated figure, see beat 16",
    hl: true,
  },
  { n: "0", l: "weapons Doss ever carried or fired in the war" },
  {
    n: "~400<small>ft</small>",
    l: "height of the Maeda Escarpment cliff he lowered the wounded down",
  },
  { n: "1<small>st</small>", l: "conscientious objector ever awarded the Medal of Honor" },
  { n: "2", l: "Bronze Stars for valor (Guam & Leyte) the film skips entirely" },
];

const BEATS: Beat[] = [
  {
    act: "Origins",
    v: "dram",
    title: "A boyhood shaped by violence",
    film: "As a boy in Lynchburg, Virginia, Desmond nearly kills his older brother Hal in a fight — smashing him with a brick — then stares at a framed 'Thou shalt not kill' print of Cain slaying Abel.",
    real: "The brick fight really happened, and Doss himself credited that Ten Commandments picture for his lifelong horror of killing. But Hal was fine, and he served in the Navy — not the Army, as the film implies.",
    note: "A real formative moment, sharpened for the screen.",
    src: { ...S.faith, way: 'Ctrl+F "Cain"' },
  },

  {
    act: "Origins",
    v: "dram",
    title: "His father and the gun",
    film: "His drunken, abusive father Tom points a pistol at Desmond's mother; Desmond wrestles it away, aims it back at his father, and vows never to hold a gun again.",
    real: "The gun was real — but Tom drew it on Desmond's uncle during a drunken fight, and it was Desmond's mother who took it and handed it to him to hide. Biographers say Tom drank only occasionally and backed his wife's faith; the wife-threatening brute is a film exaggeration.",
    note: "Real event, wrong target — and the father is darkened for drama.",
    src: { ...S.hvh, way: "quotes The Unlikeliest Hero" },
  },

  {
    act: "Origins",
    v: "true",
    title: "Why he would not kill",
    film: "Doss is a devout Seventh-day Adventist who won't kill, won't touch a weapon, and won't work on Saturday — beliefs that drive every conflict in the film.",
    real: "Accurate. He took the Sixth Commandment literally, kept the Saturday Sabbath, and was a vegetarian. He even rejected the label 'conscientious objector,' calling himself a 'conscientious cooperator' — he wanted to serve, just by saving life, not taking it.",
    note: "",
    src: { ...S.ww2, way: 'Ctrl+F "conscientious cooperator"' },
  },

  {
    act: "Romance",
    v: "inv",
    title: "The tourniquet meet-cute",
    film: "Desmond meets Dorothy when he rushes an injured man to the hospital where she's a nurse, improvising a belt tourniquet — then donates blood just to see her again.",
    real: "Invented. They met at church, and Dorothy wasn't a nurse when they met — she only earned a nursing degree years after the war. The hospital courtship is pure Hollywood.",
    note: "",
    src: { ...S.hvh, way: 'Ctrl+F "met Dorothy Schutte at church"' },
  },

  {
    act: "Romance",
    v: "true",
    title: "The Bible from Dorothy",
    film: "Dorothy gives Desmond a small Bible with her photo tucked inside; he carries it everywhere as his talisman.",
    real: "True. The pocket Bible was a real gift he carried through the whole war — and it becomes the center of a remarkable episode the film leaves out (see beat 18).",
    note: "",
    src: { ...S.hvh, way: 'Ctrl+F "Bible"' },
  },

  {
    act: "Enlistment",
    v: "true",
    title: "An unarmed medic",
    film: "Doss enlists to serve as a combat medic, refusing to carry or fire a rifle even in training.",
    real: "True. He enlisted April 1, 1942 as a '1-A-O' noncombatant, trained as a medic, and never carried a weapon across three campaigns — the only conscientious objector of WWII so honored.",
    note: "",
    src: { ...S.army, way: 'Ctrl+F "1-AO"' },
  },

  {
    act: "Training",
    v: "true",
    title: "Keeping the Sabbath",
    film: "He refuses to train on Saturdays, his Sabbath, infuriating his officers.",
    real: "Accurate — he kept Saturday for worship and requested weekly passes, and the Army eventually accommodated it.",
    note: "",
    src: { ...S.ww2, way: 'Ctrl+F "Sabbath"' },
  },

  {
    act: "Training",
    v: "inv",
    title: "The barracks beating",
    film: "Fellow soldiers drag Doss from his bunk at night and beat him bloody; the next morning he refuses to name his attackers.",
    real: "There is no record this ever happened. Doss endured ridicule, thrown boots and accusations of cowardice — but the savage night beating (and the sergeant punishing the whole barracks over him) is dramatic invention.",
    note: "",
    src: { ...S.hvh, way: 'Ctrl+F "beaten in the night"' },
  },

  {
    act: "Training",
    v: "inv",
    title: "The court-martial and the general's letter",
    film: "Doss is arrested and court-martialed for refusing to bear arms. His father, in his old WWI uniform, bursts in with a letter from a brigadier general asserting his constitutional rights, and the charges collapse.",
    real: "The single biggest fabrication. Doss was never actually court-martialed and convicted. The real intervention came not from his father but from Carlyle B. Haynes, head of the Adventist Church's War Service Commission, who phoned the regimental commander; a threatened Section 8 discharge was quietly dropped.",
    note: "The courtroom rescue — Act One's emotional climax — is essentially made up.",
    src: { ...S.hvh, way: 'Ctrl+F "Carlyle B. Haynes"' },
  },

  {
    act: "Training",
    v: "inv",
    title: "Nearly missing his own wedding",
    film: "Jailed before his court-martial, Doss almost misses his wedding; Dorothy waits at the church as he's released just in time.",
    real: "Fiction. Doss married Dorothy on August 17, 1942 — months after he enlisted and long before deployment. There was no jailhouse wedding drama.",
    note: "",
    src: { ...S.lva, way: 'Ctrl+F "17 August 1942"' },
  },

  {
    act: "Before Okinawa",
    v: "cut",
    title: "Guam, Leyte, and two Bronze Stars",
    film: "Doss's war begins at Okinawa — his first taste of combat.",
    real: "Left out entirely: Okinawa was his THIRD campaign. He'd already braved fire as a company medic at Guam and Leyte in 1944, earning a Bronze Star with 'V' for valor in each.",
    note: "",
    src: { ...S.ww2, way: 'Ctrl+F "Guam" / "Leyte"' },
  },

  {
    act: "Okinawa",
    v: "true",
    title: "The climb up Hacksaw Ridge",
    film: "The men scale a sheer cliff on a cargo net onto a corpse-strewn moonscape — the Maeda Escarpment, nicknamed 'Hacksaw Ridge.'",
    real: "Accurate. The escarpment rose about 400 feet, its final stretch a sheer cliff climbed by naval cargo nets — wording echoed in Doss's own Medal of Honor citation.",
    note: "",
    src: { ...S.cmohs, way: 'Ctrl+F "400 feet"' },
  },

  {
    act: "Okinawa",
    v: "true",
    title: "The assault held for his prayer",
    film: "Before a later assault, Captain Glover asks Doss to pray first, and the whole unit waits while he reads his Bible.",
    real: "Remarkably, true. The push came Saturday, May 5, 1945 — Doss's Sabbath. He asked to finish his devotions, and the assault was held until he was done.",
    note: "",
    src: { ...S.hvh, way: 'Ctrl+F "until Desmond finished his devotions"' },
  },

  {
    act: "Okinawa",
    v: "true",
    title: "'Lord, please help me get one more'",
    film: "As the company retreats, Doss alone stays behind and, through the night, drags wounded men to the cliff and lowers them one by one on a rope, praying 'Lord, please help me get one more.'",
    real: "The heart of the story — and it's real. He refused to retreat, tied each man into a 'double-bowline' sling he'd devised, anchored the rope around a tree stump, and lowered man after man down the cliff for hours. The prayer comes from his own recorded testimony.",
    note: "The most cinematic part of the film is also the most accurate.",
    src: { ...S.army, way: 'Ctrl+F "double bow line"' },
  },

  {
    act: "Okinawa",
    v: "inv",
    title: "Lowering wounded Japanese",
    film: "Doss even lowers wounded Japanese soldiers to safety, underscoring his universal compassion.",
    real: "No evidence this happened — most likely invented to sharpen the film's mercy theme.",
    note: "",
    src: { ...S.hvh, way: 'Ctrl+F "wounded Japanese soldiers down the cliffside"' },
  },

  {
    act: "Okinawa",
    v: "true",
    title: "The number: 75 men",
    film: "Closing title cards state Doss saved 75 men that day.",
    real: "75 is the official citation figure — but it's a negotiated compromise, not a headcount. His commander wanted to credit him with 100; Doss himself estimated about 50; they split the difference at 75.",
    note: "Accurate as the official number — just honestly a rounded compromise, not an exact tally.",
    src: { ...S.lva, way: 'Ctrl+F "compromised on seventy-five"' },
  },

  {
    act: "Okinawa",
    v: "dram",
    title: "His own wounds",
    film: "Wounded by a grenade, a victorious Doss is lowered down the cliff on a stretcher, clutching his Bible, as the battle is won.",
    real: "Real, but rearranged. His woundings came weeks later, on May 21: a grenade shredded his legs (he waited ~5 hours rather than call another medic into danger), he rolled off his own litter to give it to a worse-hurt man, then a sniper shattered his arm — which he splinted with a rifle stock before crawling 300 yards to aid. The film telescopes it all into one triumphant descent.",
    note: "",
    src: { ...S.docs, way: 'Ctrl+F "crawled 300 yards"' },
  },

  {
    act: "Aftermath",
    v: "cut",
    title: "The unit that went back for his Bible",
    film: "The Bible is a personal talisman he keeps to the end — and nothing more.",
    real: "Left out: after the fighting Doss lost the Bible on the escarpment, and the men of his company went back onto the battlefield to search until they found it and returned it. The men who once mocked him now risked their lives for his Bible.",
    note: "",
    src: { ...S.hoh, way: 'Ctrl+F "Bible"' },
  },

  {
    act: "Aftermath",
    v: "true",
    title: "The Medal of Honor",
    film: "Closing real footage shows the actual Desmond Doss receiving the Medal of Honor from President Truman.",
    real: "True. Truman presented it on the White House lawn on October 12, 1945 — the first conscientious objector ever to receive the nation's highest military award.",
    note: "",
    src: { ...S.ww2, way: 'Ctrl+F "October 12"' },
  },

  {
    act: "Aftermath",
    v: "cut",
    title: "A lifetime of wounds",
    film: "Title cards note he was wounded and lived out his life with Dorothy.",
    real: "Barely hinted at: Doss caught tuberculosis in the Pacific that cost him a lung and five ribs; the antibiotics left him completely deaf by 1976 (a cochlear implant restored some hearing in 1988); he was rated 90% disabled. He died March 23, 2006, at 87.",
    note: "",
    src: { ...S.wiki, way: 'Ctrl+F "tuberculosis" / "cochlear"' },
  },
];

const SCORE: { v: Verdict; c: string; h: string; p: string }[] = [
  {
    v: "true",
    c: "t",
    h: "Kept true",
    p: "The core is solid: his refusal to bear arms, the Sabbath-delayed assault, the rope rescues, the 'one more' prayer, and the Medal of Honor all really happened.",
  },
  {
    v: "dram",
    c: "d",
    h: "Dramatized",
    p: "Real events, reshaped for the screen — the childhood traumas, and his own woundings compressed into the film's triumphant ending.",
  },
  {
    v: "inv",
    c: "i",
    h: "Invented",
    p: "Pure Hollywood: the tourniquet meet-cute, the night barracks beating, the missed wedding, and the entire court-martial-and-general's-letter climax.",
  },
  {
    v: "cut",
    c: "c",
    h: "Left out",
    p: "On the cutting-room floor: two earlier Bronze Stars, the unit's rescue of his lost Bible, and a lifetime of post-war suffering.",
  },
];

const FOOT = `<h4>How this was built</h4>
<p>Every claim above is checked against first-party and primary sources — the official
<a href="https://www.cmohs.org/recipients/desmond-t-doss" target="_blank" rel="noopener">Medal of Honor citation</a>
(and its <a href="https://docsteach.org/document/doss-citation/" target="_blank" rel="noopener">National Archives scan</a>),
the <a href="https://achh.army.mil/regiment/moh-bios-dossint/" target="_blank" rel="noopener">U.S. Army's 1987 interview with Doss himself</a>,
the <a href="https://www.nationalww2museum.org/war/articles/private-first-class-desmond-thomas-doss-medal-of-honor" target="_blank" rel="noopener">National WWII Museum</a>,
the <a href="https://old.lva.virginia.gov/public/dvb/bio.asp?b=Doss_Desmond_Thomas" target="_blank" rel="noopener">Library of Virginia</a>,
and the 2004 documentary <em>The Conscientious Objector</em>, cross-checked with
<a href="https://www.historyvshollywood.com/reelfaces/hacksaw-ridge/" target="_blank" rel="noopener">History vs. Hollywood</a>.
Two honest caveats baked into the beats: the famous "75 saved" is a negotiated figure (the Army's 100 vs. Doss's own ~50), and the "one more" prayer and lost-Bible recovery come from Doss's own account, not the government citation.</p>
<p style="margin-top:10px">Film: <em>Hacksaw Ridge</em> (2016), dir. Mel Gibson · Andrew Garfield as Desmond Doss · 6 Oscar nominations, 2 wins (Film Editing, Sound Mixing). Desmond T. Doss: Feb 7, 1919 – Mar 23, 2006.</p>`;

// ================= RENDER =================
const ICN = {
  film: '<svg class="icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 4v16M17 4v16M2 9h5M2 15h5M17 9h5M17 15h5"/></svg>',
  real: '<svg class="icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="9"/></svg>',
};
const VLABEL: Record<Verdict, string> = {
  true: "Kept true",
  dram: "Dramatized",
  inv: "Invented",
  cut: "Left out",
};

function renderStats() {
  document.querySelector("#stats")!.innerHTML = STATS.map(
    (s) =>
      `<div class="stat ${s.hl ? "hl" : ""}"><div class="n">${s.n}</div><div class="l">${esc(s.l)}</div></div>`,
  ).join("");
}

function renderBeats() {
  const el = document.querySelector("#beats")!;
  el.innerHTML = BEATS.map((b, i) => {
    const only = !b.film;
    const filmSide = only
      ? ""
      : `<div class="side film"><h4>${ICN.film} On screen</h4><p>${esc(b.film)}</p></div>`;
    const realSide = `<div class="side real ${only ? "only" : ""}"><h4>${ICN.real} What really happened</h4><p>${esc(b.real)}</p></div>`;
    const src =
      b.src && b.src.url
        ? ` <span class="src">— <a href="${b.src.url}" target="_blank" rel="noopener">${esc(b.src.name)}</a>${b.src.way ? ` · <em>${esc(b.src.way)}</em>` : ""}</span>`
        : "";
    return `<div class="beat" id="beat-${i}" data-v="${b.v}">
      <div class="beat-head">
        <span class="beat-num">${i + 1}</span>
        <span class="beat-title">${esc(b.title)}</span>
        <span class="beat-act">${esc(b.act)}</span>
        <span class="verdict" data-v="${b.v}">${VLABEL[b.v]}</span>
      </div>
      <div class="split ${only ? "single" : ""}">${filmSide}${realSide}</div>
      ${b.note ? `<div class="note"><span>◆</span><span><b>The verdict:</b> ${esc(b.note)}${src}</span></div>` : ""}
    </div>`;
  }).join("");
}

function renderScore() {
  document.querySelector("#score")!.innerHTML = SCORE.map((s) => {
    const n = BEATS.filter((b) => b.v === s.v).length;
    return `<div class="scard ${s.c}"><div class="big">${n}</div><h3>${esc(s.h)}</h3><p>${esc(s.p)}</p></div>`;
  }).join("");
}

const REELTIP_DEFAULT =
  "Each frame is one story beat, colored by verdict — click to jump. Notice the red clusters before the battle, and the green through Okinawa.";
// The nearest ancestor of the event target (or the target itself) that matches `sel`.
const hit = (e: Event, sel: string): HTMLElement | null =>
  e.target instanceof Element ? e.target.closest<HTMLElement>(sel) : null;

function renderReel() {
  const reel = document.querySelector("#reel")!,
    tip = document.querySelector("#reeltip")!;
  reel.innerHTML = BEATS.map(
    (b, i) =>
      `<div class="frame" data-v="${b.v}" data-i="${i}" title="${esc(i + 1 + ". " + b.title)}"></div>`,
  ).join("");
  reel.addEventListener("click", (e) => {
    const f = hit(e, ".frame");
    if (!f) return;
    const el = document.querySelector("#beat-" + f.dataset["i"]);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  reel.addEventListener("mouseover", (e) => {
    const f = hit(e, ".frame");
    if (!f) return;
    const b = BEATS[+f.dataset["i"]!]!;
    tip.innerHTML = `<b>${esc(+f.dataset["i"]! + 1 + ". " + b.title)}</b> — ${VLABEL[b.v]}`;
  });
  reel.addEventListener("mouseleave", () => {
    tip.textContent = REELTIP_DEFAULT;
  });
}

function renderAccbar() {
  const order: [Verdict, string, string][] = [
    ["true", "t", "Kept true"],
    ["dram", "d", "Dramatized"],
    ["inv", "i", "Invented"],
    ["cut", "c", "Left out"],
  ];
  const total = BEATS.length;
  document.querySelector("#accbar")!.innerHTML = order
    .map(([v, c, lab]) => {
      const n = BEATS.filter((b) => b.v === v).length;
      return `<div class="accseg ${c}" style="flex-grow:${n}" title="${lab}: ${n}"><span>${n}</span><small>${lab}</small></div>`;
    })
    .join("");
  const t = BEATS.filter((b) => b.v === "true").length,
    d = BEATS.filter((b) => b.v === "dram").length;
  document.querySelector("#accbar-cap")!.innerHTML =
    `<b style="color:var(--text)">${t} of ${total}</b> beats are essentially accurate and another ${d} are true events dramatized — and nearly every invention sits in the pre-war half, not the battle.`;
}

// ---- filters (persist to hash) ----
const state = Object.assign({ off: [] as string[] }, loadHash<{ off: string[] }>());
function applyFilter() {
  const off = new Set(state.off);
  document.querySelectorAll<HTMLElement>("#controls .chip[data-v]").forEach((c) => {
    if (c.dataset["v"] === "all") return;
    c.classList.toggle("on", !off.has(c.dataset["v"]!));
  });
  let shown = 0;
  document.querySelectorAll<HTMLElement>(".beat").forEach((b) => {
    const hide = off.has(b.dataset["v"]!);
    b.classList.toggle("hide", hide);
    if (!hide) shown++;
  });
  document.querySelectorAll<HTMLElement>("#reel .frame").forEach((f) => {
    f.classList.toggle("dim", off.has(f.dataset["v"]!));
  });
  document.querySelector<HTMLElement>("#empty")!.style.display = shown ? "none" : "block";
  const allOn = off.size === 0;
  document.querySelector('.chip[data-v="all"]')!.classList.toggle("on", allOn);
}
document.querySelector("#controls")!.addEventListener("click", (e) => {
  const chip = hit(e, ".chip");
  if (!chip) return;
  const v = chip.dataset["v"]!;
  if (v === "all") {
    state.off = [];
  } else {
    const s = new Set(state.off);
    if (s.has(v)) s.delete(v);
    else s.add(v);
    state.off = [...s];
  }
  saveHash({ off: state.off });
  applyFilter();
});

function renderGallery() {
  const g = document.querySelector("#gallery")!;
  g.innerHTML = ARTIFACTS.map(
    (a, i) =>
      `<figure class="art ${a.cls ?? ""}" data-i="${i}" tabindex="0" role="button" aria-label="Enlarge: ${esc(a.cap)}">
       <div class="imgwrap"><img src="${esc(a.file)}" alt="${esc(a.alt || a.cap)}" loading="lazy"></div>
       <figcaption class="cap"><b>${esc(a.cap)}</b><span class="credit">${a.creditUrl ? `<a href="${esc(a.creditUrl)}" target="_blank" rel="noopener">${esc(a.credit)}</a>` : esc(a.credit)}</span></figcaption>
     </figure>`,
  ).join("");
}
// lightbox
const lb = document.querySelector("#lightbox")!,
  lbImg = document.querySelector<HTMLImageElement>("#lbImg")!,
  lbCap = document.querySelector("#lbCap")!;
function openLb(i: number) {
  const a = ARTIFACTS[i]!;
  lbImg.src = a.file;
  lbImg.alt = a.alt || a.cap;
  lbCap.innerHTML = `${esc(a.cap)}<span class="credit">${esc(a.credit)}</span>`;
  lb.classList.add("open");
}
function closeLb() {
  lb.classList.remove("open");
  lbImg.src = "";
}
document.querySelector<HTMLElement>("#gallery")!.addEventListener("click", (e) => {
  const f = hit(e, ".art");
  if (f) openLb(+f.dataset["i"]!);
});
document.querySelector<HTMLElement>("#gallery")!.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    const f = hit(e, ".art");
    if (f) {
      e.preventDefault();
      openLb(+f.dataset["i"]!);
    }
  }
});
lb.addEventListener("click", closeLb);
document.querySelector("#lbClose")!.addEventListener("click", closeLb);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLb();
});

renderStats();
renderBeats();
renderReel();
renderScore();
renderAccbar();
renderGallery();
document.querySelector("#footer")!.innerHTML = FOOT;
applyFilter();
