import { arrowMarkers, connect, side, center, labelBox, esc, $, saveHash, loadHash, type Box } from "/_kit/viz.js";

const svg = $<SVGSVGElement>("#court")!;

// --- nodes: defined once, everything derives from these ---
type NodeId = "jumbo" | "game" | "score" | "team" | "pg" | "sg" | "c";
interface NodeDef extends Box { nm: string; sb: string }
const N: Record<NodeId, NodeDef> = {
  jumbo: { x:24,  y:22,  w:200, h:60, nm:"🕒 GameClock", sb:"<Context.Provider>" },
  game:  { x:340, y:26,  w:190, h:66, nm:"<Game>",       sb:"the franchise · root" },
  score: { x:60,  y:208, w:210, h:70, nm:"<Scoreboard>", sb:"shows the score" },
  team:  { x:560, y:208, w:170, h:66, nm:"<Team>",       sb:"the bench" },
  pg:    { x:412, y:396, w:130, h:82, nm:"<Player>",     sb:"PG" },
  sg:    { x:558, y:396, w:130, h:82, nm:"<Player>",     sb:"SG" },
  c:     { x:704, y:396, w:130, h:82, nm:"<Player>",     sb:"C" },
};
const EDGES: [NodeId, NodeId][] = [["game","score"],["game","team"],["team","pg"],["team","sg"],["team","c"]];

// --- static render: defs, edges, nodes, fx layer ---
svg.innerHTML = `
  <defs>${arrowMarkers()}</defs>
  <g id="edges">${EDGES.map(([a,b],_i)=>
    `<path class="edge" data-edge="${a}-${b}" d="${connect(N[a],N[b])}"/>`).join("")}</g>
  <g id="nodes">${Object.entries(N).map(([id,n])=>
    `<g class="node" data-id="${id}"><rect class="box" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="10"/>${
      labelBox(n, `<div class="nm">${esc(n.nm)}</div><div class="sb">${esc(n.sb)}</div>`)}</g>`).join("")}</g>
  <g id="fx"></g>`;

const fx = svg.querySelector<SVGGElement>("#fx")!;
const nodeEl = (id: string) => svg.querySelector<SVGGElement>(`.node[data-id="${id}"]`)!;
const edgeEl = (a: NodeId, b: NodeId) => svg.querySelector<SVGPathElement>(`[data-edge="${a}-${b}"]`)!;

// hover tooltips: the basketball ↔ React mapping for each node
const leafTip: [string, string] = ["⛹️ Player — leaf + state",
  "On-court component. Owns its own state with useState (dribbles, stamina); reads shared context directly. The end of the line — no children to pass to."];
const TIPS: Record<string, [string, string] | undefined> = {
  jumbo: ["🕒 Jumbotron — Context",
    "A value the Provider broadcasts once. Any component below reads it with useContext, no matter how deep — nobody in between has to pass it along."],
  game: ["🏟️ Game — root",
    "Top of the tree. Holds the big-picture state and passes props down. The front office calling the plays."],
  score: ["📊 Scoreboard — props child",
    "Pure display. Gets score through props (read-only) and re-renders whenever that prop changes. Never owns the number."],
  team: ["🔁 Team — the middleman",
    "A middle layer. Often just relays props from Game down to the Players — the component that makes prop-drilling painful."],
  pg: leafTip, sg: leafTip, c: leafTip,
};
const tip = $("#tip")!;
svg.querySelector("#nodes")!.addEventListener("mousemove", ev => {
  const e = ev as MouseEvent;
  const g = (e.target as Element).closest<SVGGElement>(".node"), t = g && TIPS[g.dataset["id"]!];
  if (!t) { tip.style.display = "none"; return; }
  tip.innerHTML = `<b>${t[0]}</b>${esc(t[1])}`;
  tip.style.display = "block";
  tip.style.left = Math.min(e.clientX + 14, innerWidth - 262) + "px";
  tip.style.top  = Math.min(e.clientY + 14, innerHeight - tip.offsetHeight - 8) + "px";
});
svg.addEventListener("mouseleave", () => tip.style.display = "none");

// small svg helpers
const tagAt = (n: Box, text: string, color: string, dy=-14) => {
  const c = center(n);
  return `<g class="fxtag" transform="translate(${c.x},${n.y+dy})" text-anchor="middle">
    <rect x="-46" y="-15" width="92" height="22" rx="6" fill="var(--panel)" stroke="${color}"/>
    <text y="1" fill="${color}">${text}</text></g>`;
};

let dribbles = 0; // module-scoped: this is "state" surviving outside React, on purpose

// ---------------- STEPS ----------------
interface Step { c: string; tag: string; title: string; body: string; code: string; cap: string; on: NodeId[]; style?: Partial<Record<NodeId, string>>; fx: () => void }
const STEPS: Step[] = [
  { c:"setup", tag:"The roster", title:"Every app is a roster",
    body:`A React app is a <b class="hl">tree of components</b> — exactly like a team's depth chart.
      <code>&lt;Game&gt;</code> at the top, <code>&lt;Team&gt;</code> under it, <code>&lt;Player&gt;</code> on the floor.
      The only real question in React is: <b class="hl">where does a piece of data live, and who's allowed to see it?</b>
      Three answers — props, state, context. Each is a different way to move the ball.`,
    code:`<Game>
  <Scoreboard />
  <Team>
    <Player pos="PG" />
    <Player pos="SG" />
  </Team>
</Game>`,
    cap:`<b>The court.</b> This tree never goes away — every concept below is just data moving through it.`,
    on:[], fx:()=>{} },

  { c:"props", tag:"Props", title:"Props — passing the ball down",
    body:`A parent hands data to a child, like a coach calling a play or a guard feeding the post.
      Strictly <b class="hl">one direction: down</b>. The child can <b class="hl">read</b> a prop but never reassign it —
      you don't rip the ball out of the passer's hands and rewrite the play.
      Need to send something back up? You don't pass up — you <b class="hl">call for the ball</b>:
      the parent hands down a function, the child invokes it.`,
    code:`function Game() {
  return <Scoreboard score={102} />;
  // ↑ pass the value DOWN
}

function Scoreboard({ score }) {  // catch
  return <h1>{score}</h1>;        // read-only
}`,
    cap:`<b>🏀 The pass.</b> <code>score=102</code> travels <code>&lt;Game&gt;</code> → <code>&lt;Scoreboard&gt;</code>. The dashed line back up is <code>onScore()</code> — a callback, the only way "up".`,
    on:["game","score"], style:{game:"n-props",score:"n-props"},
    fx(){
      edgeEl("game","score").classList.add("hot");
      const p = connect(N.game, N.score);
      // the ball travels down the edge, then the prop tag lands
      fx.innerHTML = `
        <circle class="ball" r="11">
          <animateMotion dur="1.3s" fill="freeze" path="${p}"/>
        </circle>
        <path class="edge" d="${connect(N.score,N.game)}" stroke="var(--muted)"
              stroke-dasharray="5 5" marker-end="url(#ah)" opacity=".6"/>
        <text x="${center(N.game).x-118}" y="172" text-anchor="middle"
              fill="var(--muted)" font="11px var(--mono)">↑ onScore()</text>
        <g opacity="0">
          <animate attributeName="opacity" begin="1.2s" dur=".4s" to="1" fill="freeze"/>
          ${tagAt(N.score,"score: 102","var(--accent)")}
        </g>`;
    } },

  { c:"state", tag:"State", title:"State — what a player owns",
    body:`State is data a component owns and controls itself — a player's live <b class="hl">dribble count</b>,
      stamina, whether they've got the ball. Only that component can change it. And when it does
      (<code>setDribbles</code>), React <b class="hl">re-renders</b> that component — the number on screen updates.
      <b class="hl">Click the SG</b> below to bump the count and watch the re-render fire.`,
    code:`function Player() {
  const [dribbles, setDribbles] =
    useState(0);

  return (
    <button onClick={() =>
      setDribbles(dribbles + 1)}>
      dribbles: {dribbles}
    </button>
  );
  // owned & changed here → re-render
}`,
    cap:`<b>⛹️ The dribble.</b> Nobody passed this in. The SG owns it; only the SG changes it; changing it re-renders <em>only</em> the SG.`,
    on:["sg"], style:{sg:"n-state"},
    fx(){
      const n = N.sg, c = center(n);
      fx.innerHTML = `<g id="dribUI" style="cursor:pointer">
        <rect x="${n.x+12}" y="${n.y+n.h-30}" width="${n.w-24}" height="22" rx="6"
              fill="var(--good)" opacity=".18" stroke="var(--good)"/>
        <text id="dribTxt" x="${c.x}" y="${n.y+n.h-14}" text-anchor="middle"
              fill="var(--good)" font="600 12px var(--mono)">dribbles: ${dribbles} ▲</text></g>`;
      svg.querySelector<SVGGElement>("#dribUI")!.onclick = () => {
        dribbles++;                                   // mutate own state
        svg.querySelector("#dribTxt")!.textContent = `dribbles: ${dribbles} ▲`;
        const g = nodeEl("sg"); g.classList.remove("pulse"); void (g as SVGGElement & { offsetWidth?: number }).offsetWidth; g.classList.add("pulse"); // re-render flash
      };
    } },

  { c:"context", tag:"Context", title:"Context — the jumbotron",
    body:`Some things the whole arena needs at once: the game clock, the score, the home colors.
      You don't relay the clock hand-to-hand to all five players — you put it on the
      <b class="hl">jumbotron</b> and everyone just looks up. Context is a value a
      <b class="hl">Provider</b> broadcasts; any component below reads it directly with
      <code>useContext</code> — no matter how deep, with nobody in between relaying it.`,
    code:`const GameClock = createContext();

<GameClock.Provider value="7:24">
  <Team />        {/* no clock prop */}
</GameClock.Provider>

// any descendant, however deep:
const clock = useContext(GameClock);`,
    cap:`<b>🕒 The jumbotron.</b> One broadcast, every component reads it. No edge of the tree carried it.`,
    on:["jumbo"], style:{jumbo:"n-context"},
    fx(){
      const j = side(N.jumbo,"bottom");
      const targets: NodeId[] = ["game","score","team","pg","sg","c"];
      fx.innerHTML = targets.map((id,i)=>{
        const t = center(N[id]);
        return `<path class="beam" style="animation-delay:${i*0.08}s" d="M${j.x},${j.y} L${t.x},${t.y}"/>`;
      }).join("") + targets.map(id=>tagAt(N[id],"🕒 7:24","var(--c4)", -2)).join("");
    } },

  { c:"context", tag:"Decide", title:"Prop-drilling vs. the jumbotron",
    body:`Without context, getting the clock to a player means <b class="hl">prop-drilling</b>:
      <code>&lt;Game&gt;</code> → <code>&lt;Team&gt;</code> → <code>&lt;Player&gt;</code>, every layer relaying a
      value it doesn't even use (the amber dots). Annoying at 3 layers, miserable at 8. The
      <b class="hl">jumbotron skips the relay</b> (purple). The trade: don't put <em>everything</em> up there —
      context that changes constantly re-renders every reader.`,
    code:`// Where should this data live?

Owned & changed by ONE component?
    → useState
Parent → child, a hop or two?
    → props
Many readers, deep, rarely changes?
    → useContext
    (theme · user · locale · clock)`,
    cap:`<b>The call.</b> Amber = drill the prop through every layer. Purple = one broadcast. Pick by how many need it and how often it changes.`,
    on:["game","team","pg"],
    fx(){
      const drill = connect(N.game,N.team), drill2 = connect(N.team,N.pg);
      edgeEl("game","team").classList.add("hot");
      edgeEl("team","pg").classList.add("hot");
      const j = side(N.jumbo,"bottom"), pgc = center(N.pg);
      fx.innerHTML = `
        <circle class="relay" r="9"><animateMotion dur="1s" fill="freeze" path="${drill}"/></circle>
        <circle class="relay" r="9" opacity="0">
          <animate attributeName="opacity" begin="1s" dur="0.1s" to="1" fill="freeze"/>
          <animateMotion dur="1s" begin="1s" fill="freeze" path="${drill2}"/></circle>
        <text x="${center(N.team).x}" y="${N.team.y-8}" text-anchor="middle"
              fill="var(--warn)" font="600 11px var(--mono)">relays clock ↓ (unused)</text>
        <path class="beam" style="animation-delay:1.6s" d="M${j.x},${j.y} L${pgc.x},${pgc.y}"/>
        <circle class="ctxtok" r="9" opacity="0">
          <animate attributeName="opacity" begin="1.8s" dur="0.1s" to="1" fill="freeze"/>
          <animateMotion dur="0.7s" begin="1.8s" fill="freeze" path="M${j.x},${j.y} L${pgc.x},${pgc.y}"/></circle>
      `;
    } },
];

// ---------------- driver ----------------
let i = loadHash<{ step: number }>().step ?? 0;
i = Math.max(0, Math.min(STEPS.length-1, i));

// tokenize a line of JSX, escaping each piece — robust against `<`, `{`, `&` etc.
const hi = (line: string) => {
  const re = /(\/\/.*$)|("[^"]*"|'[^']*')|(\b(?:function|const|let|return|import|from|export)\b|=>)|(<\/?[A-Z][\w.]*|\b(?:useState|useContext|createContext)\b)/g;
  let out="", last=0, m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    out += esc(line.slice(last, m.index));
    out += `<span class="${m[1]?'c':m[2]?'s':m[3]?'k':'f'}">${esc(m[0])}</span>`;
    last = re.lastIndex;
  }
  return out + esc(line.slice(last));
};
const renderCode = (code: string) => code.split("\n").map(hi).join("\n");

function show(){
  const s = STEPS[i]!;
  // narrative
  const narr = $("#narr")!; narr.dataset["c"] = s.c;
  $("#t-tag")!.textContent = s.tag;
  $("#t-title")!.textContent = s.title;
  $("#t-body")!.innerHTML = `<p>${s.body}</p>`;
  $("#t-code")!.innerHTML = renderCode(s.code);
  $("#cap")!.innerHTML = s.cap;

  // reset stage
  svg.querySelectorAll(".edge").forEach(e=>e.classList.remove("hot"));
  svg.querySelectorAll<SVGGElement>(".node").forEach(g=>{
    g.classList.remove("on","dim","pulse","n-props","n-state","n-context");
  });
  fx.innerHTML = "";

  // apply step emphasis
  const on = new Set(s.on);
  if (on.size) svg.querySelectorAll<SVGGElement>(".node").forEach(g=>{
    g.classList.toggle("on", on.has(g.dataset["id"] as NodeId));
    g.classList.toggle("dim", !on.has(g.dataset["id"] as NodeId));
  });
  if (s.style) for (const [id,cls] of Object.entries(s.style)) nodeEl(id).classList.add(cls!);
  s.fx();

  // nav
  $<HTMLButtonElement>("#prev")!.disabled = i===0;
  $<HTMLButtonElement>("#next")!.disabled = i===STEPS.length-1;
  $("#dots")!.querySelectorAll(".dot").forEach((d,k)=>d.classList.toggle("on",k===i));
  saveHash({step:i});
}

// dots
$("#dots")!.innerHTML = STEPS.map((_,k)=>`<button class="dot" data-k="${k}" aria-label="step ${k+1}"></button>`).join("");
$("#dots")!.onclick = e => { const k=(e.target as HTMLElement).dataset?.["k"]; if(k!=null){ i=+k; show(); } };
$("#prev")!.onclick = ()=>{ if(i>0){i--;show();} };
$("#next")!.onclick = ()=>{ if(i<STEPS.length-1){i++;show();} };
addEventListener("keydown", e=>{
  if(e.key==="ArrowRight"||e.key===" "){ if(i<STEPS.length-1){i++;show();} }
  if(e.key==="ArrowLeft"){ if(i>0){i--;show();} }
});

show();
