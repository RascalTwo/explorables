import { arrowMarkers, $, esc } from "@viz/kit";

/* ---------------- ACT 1: spectrum (always open) ---------------- */
const STAGES: { kind: string; name: string; sc: string; one: string; lines: [string, string][] }[] =
  [
    {
      kind: "talks",
      name: "Chatbot",
      sc: "#58a6ff",
      one: "You ask, it answers. That's all it can do.",
      lines: [
        ["can", "talks, drafts, explains, brainstorms"],
        ["cant", "can't touch anything — no buttons, no files, no real actions"],
        ["eg", "<b>Everyday:</b> asking ChatGPT to draft an email"],
        ["eg", "<b>Engineer:</b> autocomplete suggesting the next line"],
      ],
    },
    {
      kind: "talks",
      name: "Assistant",
      sc: "#3fb950",
      one: "A chatbot that knows your stuff.",
      lines: [
        ["can", "answers grounded in your own documents and policies"],
        ["cant", "still only talks — it files nothing, sends nothing"],
        ["eg", "<b>Everyday:</b> a helper trained on your HR handbook"],
        ["eg", "<b>Engineer:</b> a chat that knows your codebase"],
      ],
    },
    {
      kind: "acts",
      name: "Agent",
      sc: "#d29922",
      one: "Goes and does the task, then reports back.",
      lines: [
        ["can", "uses real tools, takes several steps, fixes its own mistakes"],
        ["can", "comes back when the job is actually done"],
        ["eg", "<b>Everyday:</b> handles a refund ticket end-to-end"],
        ["eg", "<b>Engineer:</b> fixes a failing test on request"],
      ],
    },
    {
      kind: "acts",
      name: "Orchestrator",
      sc: "#bc8cff",
      one: "Runs a whole team of agents on a big job, checking in at the gates.",
      lines: [
        ["can", "splits a goal across sub-agents and runs the whole play"],
        ["can", "pauses for your sign-off at the key checkpoints"],
        ["eg", "<b>Everyday:</b> plans an event end-to-end, asks before it books"],
        ["eg", "<b>Engineer:</b> runs research + coding agents to land a ticket"],
      ],
    },
    {
      kind: "acts",
      name: "Autonomous",
      sc: "#f85149",
      one: "Set a goal once; it keeps the job done.",
      lines: [
        ["can", "runs continuously on its own — no prompt each time"],
        ["cant", "aspirational today; real only in narrow, well-bounded jobs"],
        ["eg", "<b>Everyday:</b> inventory that restocks itself"],
        ["eg", "<b>Engineer:</b> reviews every pull request automatically"],
      ],
    },
  ];
const mk: Record<string, string> = { can: "✓", cant: "✕", eg: "›" };
$("#stages")!.innerHTML = STAGES.map(
  (s) => `
    <div class="stage" style="--sc:${s.sc}" data-viz-id="stage-${s.name.toLowerCase()}" data-label="${s.name}">
      <div class="kind">${s.kind}</div>
      <div class="name">${s.name}</div>
      <div class="one">${s.one}</div>
      <div class="lines">${s.lines
        .map(
          ([c, t]) =>
            `<div class="ln ${c}"><span class="mk">${mk[c]}</span><span class="t">${t}</span></div>`,
        )
        .join("")}</div>
    </div>`,
).join("");

/* ---------------- ACT 1: decision tree (static SVG) ---------------- */
const NS = "http://www.w3.org/2000/svg";
const el = (n: string, a: Record<string, string | number> = {}, h?: string | null) => {
  const e = document.createElementNS(NS, n);
  for (const k in a) e.setAttribute(k, String(a[k]));
  if (h !== undefined && h !== null) e.innerHTML = h;
  return e;
};
const fo = (x: number, y: number, w: number, h: number, html: string) => {
  const f = el("foreignObject", { x, y, width: w, height: h });
  const d = document.createElement("div");
  d.style.cssText =
    "height:100%;display:flex;flex-direction:column;justify-content:center;padding:9px 13px;box-sizing:border-box";
  d.innerHTML = html;
  f.append(d);
  return f;
};

type Eg = [string, string][];
const TREE: { q: string; noL: string; leaf: { t: string; d: string; eg: Eg } }[] = [
  {
    q: "Is real AI doing the thinking?",
    noL: "NO",
    leaf: {
      t: "Traditional automation",
      d: "A script, a rules engine, plain “if this, then that.” No AI at its core.",
      eg: [
        [
          "Thermostat",
          "Runs one fixed rule: if it's cold, turn on the heat. No language model, no reasoning — it can't handle anything the rule didn't foresee.",
        ],
        [
          "Zapier zap",
          "“When X happens, do Y” — wiring you set up in advance. Every step is pre-decided by a human; nothing reasons or chooses at runtime.",
        ],
      ],
    },
  },
  {
    q: "Can it actually <b>DO</b> things — use tools, take real actions — not just talk?",
    noL: "NO",
    leaf: {
      t: "Chatbot / assistant",
      d: "It only produces words. Helpful, but it can't touch anything in the world.",
      eg: [
        [
          "ChatGPT Q&amp;A",
          "You ask, it writes text back — and that's all it can do. No tool to call, no action in the world. A reasoning engine with no hands.",
        ],
        [
          "Ask-your-PDF bot",
          "Pulls passages from your document and answers from them (that's “RAG”). It reads and replies but never acts — a smarter chatbot, not an agent.",
        ],
      ],
    },
  },
  {
    q: "Does it <b>keep going</b> — several steps, reacting to what it finds?",
    noL: "NO",
    leaf: {
      t: "Single-shot tool use",
      d: "Reaches out once, then stops. Has the ingredient, but not the loop.",
      eg: [
        [
          "Siri setting a timer",
          "“Set a 10-minute timer” calls one tool once and stops. Real tool use, but a single shot — it never loops or checks an outcome to pick a next step.",
        ],
        [
          "Code autocomplete",
          "It edits your file (more than talk), but it's one suggestion you accept or reject — no observe-then-continue loop, so it can't react to the result.",
        ],
      ],
    },
  },
  {
    q: "Does it <b>decide the steps itself</b> — or did a human pre-set the path?",
    noL: "PRE-SET",
    leaf: {
      t: "Workflow",
      d: "Smart steps in a fixed order a human chose. Most “agent” demos are really this.",
      eg: [
        [
          "Summarize → translate → email",
          "Three steps a developer wired in a fixed order. The model does each well, but it can't skip, reorder, or add a step. The path is hard-coded.",
        ],
        [
          "Invoice intake",
          "Every invoice runs the same stages: extract → validate → file. Smart at each stage, but the route never changes. A pipeline, not an agent.",
        ],
      ],
    },
  },
];
const chips = (arr: Eg) =>
  `<div class="chiprow">${arr
    .map(([l, w]) => `<span class="chip3" data-why="${esc(w)}" data-title="${esc(l)}">${l}</span>`)
    .join("")}</div>`;
const svgT = $<SVGSVGElement>("#tree")!;
const QX = 16,
  QW = 318,
  QH = 80,
  GAP = 130,
  TOP = 14,
  LX = 410,
  LW = 352,
  LH = 104;
const cxT = QX + QW / 2;
const qy = (i: number) => TOP + i * GAP;
const STUB = qy(TREE.length - 1) + QH + 48; // where the final YES arrow ends
const LEAFBOT = qy(TREE.length - 1) + QH / 2 + LH / 2; // bottom of the last leaf
svgT.setAttribute("viewBox", `0 0 ${LX + LW + 16} ${Math.max(STUB, LEAFBOT) + 10}`);
svgT.insertAdjacentHTML("afterbegin", arrowMarkers());
const gE = el("g"),
  gN = el("g");
svgT.append(gE, gN);

TREE.forEach((q, i) => {
  const top = qy(i),
    cy = top + QH / 2;
  const nextTop = i < TREE.length - 1 ? qy(i + 1) : STUB;
  // YES spine
  gE.append(
    el("line", {
      class: "",
      x1: cxT,
      y1: top + QH,
      x2: cxT,
      y2: nextTop,
      stroke: "var(--good)",
      "stroke-width": 2.5,
      "marker-end": "url(#ah-good)",
    }),
  );
  gE.append(
    el(
      "text",
      {
        x: cxT + 9,
        y: top + QH + (nextTop - top - QH) / 2 + 4,
        fill: "var(--good)",
        "font-size": 11,
        "font-weight": 700,
      },
      "YES",
    ),
  );
  // NO branch
  const ly = cy - LH / 2;
  gE.append(
    el("line", {
      x1: QX + QW,
      y1: cy,
      x2: LX,
      y2: cy,
      stroke: "#8a94a3",
      "stroke-width": 1.6,
      "stroke-dasharray": "5 4",
      "marker-end": "url(#ah)",
    }),
  );
  gE.append(
    el(
      "text",
      { x: QX + QW + 13, y: cy - 8, fill: "#aab3c0", "font-size": 11, "font-weight": 700 },
      q.noL,
    ),
  );
  // question box
  gN.append(
    el("rect", {
      x: QX,
      y: top,
      width: QW,
      height: QH,
      rx: 12,
      fill: "#16202e",
      stroke: "var(--accent)",
      "stroke-width": 1.6,
      "data-viz-id": "q" + (i + 1),
      "data-label": "Q" + (i + 1),
    }),
  );
  gN.append(
    el(
      "text",
      {
        x: QX + 15,
        y: top + 22,
        fill: "var(--accent)",
        "font-size": 12,
        "font-weight": 700,
        "font-family": "var(--mono)",
      },
      "Q" + (i + 1),
    ),
  );
  gN.append(
    fo(
      QX + 8,
      top + 16,
      QW - 16,
      QH - 18,
      `<div style="font-size:14px;font-weight:600;line-height:1.3;color:var(--text)">${q.q}</div>`,
    ),
  );
  // leaf
  gN.append(
    el("rect", {
      x: LX,
      y: ly,
      width: LW,
      height: LH,
      rx: 10,
      fill: "#1c1f24",
      stroke: "#6b7280",
      "stroke-width": 1.4,
      "data-viz-id": "leaf-" + (i + 1),
      "data-label": q.leaf.t,
    }),
  );
  gN.append(
    fo(
      LX,
      ly,
      LW,
      LH,
      `<div style="font-weight:700;font-size:14px;margin-bottom:3px">${q.leaf.t}</div>
       <div style="font-size:12px;color:#9aa5b1;line-height:1.4;margin-bottom:7px">${q.leaf.d}</div>
       ${chips(q.leaf.eg)}`,
    ),
  );
});
// the YES spine ends here and flows into the AI AGENT box below the SVG
gN.append(
  el(
    "text",
    {
      x: cxT + 16,
      y: STUB - 4,
      fill: "var(--good)",
      "font-size": 12,
      "font-weight": 800,
      "letter-spacing": ".04em",
    },
    "it's an AI agent ↓",
  ),
);

/* two styles of agent (interactive vs ambient) */
const STYLES: { stc: string; stag: string; title: string; desc: string; also: string; eg: Eg }[] = [
  {
    stc: "#58a6ff",
    stag: "You kick it off",
    title: "Interactive agent",
    desc: "A person actively starts the run and usually watches or approves. Typing a message is the common case — but clicking “Run” counts too.",
    also: "Also called: chat · conversational · foreground",
    eg: [
      [
        "“Go fix this test”",
        "You send one instruction; it reads files, edits, runs the test, loops until green, then reports. A full agent — kicked off by you.",
      ],
      [
        "Clicking “Summarize”",
        "No sentence typed, but you actively started it and you're watching for the result. A human is in the initiating loop — still the interactive side.",
      ],
      [
        "A refund chatbot",
        "A customer message starts it; it looks up the order, checks policy, issues the refund, confirms. Triggered by a person's request.",
      ],
    ],
  },
  {
    stc: "#bc8cff",
    stag: "An event kicks it off",
    title: "Ambient / background agent",
    desc: "Fires on an event and runs on its own — a new email, a schedule, a code push, a log alert — surfacing only when it needs a decision.",
    also: "Also called: ambient · background · autonomous",
    eg: [
      [
        "PR-review bot",
        "No one prompts it — a new commit fires it. It reads the diff, runs checks, comments, pings a human if risky. Event-triggered, but plans and acts like any agent.",
      ],
      [
        "Inbox triage",
        "Wakes on each incoming email, decides whether and how to respond, drafts or routes, surfaces to you for approval. The trigger is an event, not your prompt.",
      ],
      [
        "Log / alert monitor",
        "Listens to a telemetry stream; on an anomaly it investigates with tools and fixes or escalates. Event-triggered ≠ less of an agent.",
      ],
    ],
  },
];
$("#styles")!.innerHTML = STYLES.map(
  (s) => `
    <div class="style" style="--stc:${s.stc}" data-viz-id="style-${s.title.split(" ")[0]!.toLowerCase()}" data-label="${s.title}">
      <div class="stag">${s.stag}</div>
      <h4>${s.title}</h4>
      <div class="sdesc">${s.desc}</div>
      <div class="also">${s.also}</div>
      ${chips(s.eg)}
    </div>`,
).join("");

/* popover for all .chip3 */
const act1 = $("#act1")!;
const pop = document.createElement("div");
pop.className = "popover";
act1.append(pop);
document.addEventListener("click", (e) => {
  const target = e.target instanceof Element ? e.target : null;
  const chip = target?.closest<HTMLElement>(".chip3");
  if (chip && chip.dataset["why"]) {
    e.stopPropagation();
    pop.innerHTML = `<div class="pop-title">${chip.dataset["title"]}</div><div class="pop-body">${chip.dataset["why"]}</div>`;
    pop.style.display = "block";
    const pw = Math.min(340, act1.clientWidth - 16),
      ar = act1.getBoundingClientRect(),
      cr = chip.getBoundingClientRect();
    pop.style.width = pw + "px";
    pop.style.left = Math.max(8, Math.min(cr.left - ar.left, act1.clientWidth - pw - 8)) + "px";
    pop.style.top = cr.bottom - ar.top + 6 + "px";
  } else if (!target?.closest(".popover")) {
    pop.style.display = "none";
  }
});

/* ---------------- ACT 2: ladder (dual column, vibe in header) ---------------- */
type Lane = { label: string; blurb: string; story: [string, string][] };
const RUNGS: { role: string; short: string; rc: string; vibe: string; nondev: Lane; dev: Lane }[] =
  [
    {
      role: "Operator",
      short: "“Ask”",
      rc: "#58a6ff",
      vibe: "<span class='q'>“You hold the wheel; the AI is a suggestion box.”</span> Maximum control, minimum autonomy — it never touches anything; it just hands you text.",
      nondev: {
        label: "Ask the chatbot",
        blurb: "a one-off question or a quick draft",
        story: [
          ["you", "“Draft a polite reminder about Friday's deadline.”"],
          ["ai", "Writes a three-line draft in the chat."],
          [
            "you",
            "You copy it into email, fix the tone, and hit send yourself. The AI never saw your mailbox.",
          ],
        ],
      },
      dev: {
        label: "Autocomplete",
        blurb: "ghost-text suggestions as you type",
        story: [
          ["you", "You type <code>for user in </code>…"],
          ["ai", "Ghost text appears: <code>users: print(user.name)</code>"],
          [
            "you",
            "You press Tab to accept — or keep typing and ignore it. Your keystroke decided; the AI only offered.",
          ],
        ],
      },
    },
    {
      role: "Collaborator",
      short: "“Assist”",
      rc: "#3fb950",
      vibe: "<span class='q'>“You and the AI trade turns on the same task.”</span> Real back-and-forth — it proposes, you correct, it revises. You still own every line.",
      nondev: {
        label: "A custom assistant",
        blurb: "built on your docs; you Q&amp;A with it",
        story: [
          ["you", "You built a “Benefits Helper” on the HR PDF. “How many sick days carry over?”"],
          ["ai", "“Up to 5 days — section 4.2.”"],
          ["you", "“And if I'm part-time?”"],
          [
            "ai",
            "Follows up from the same doc. A tireless partner — but it only talks; it files nothing.",
          ],
        ],
      },
      dev: {
        label: "Chat-assisted coding",
        blurb: "describe a change, review the diff",
        story: [
          ["you", "“Add input validation to this function.” (you paste it in)"],
          ["ai", "Proposes a diff — null guards, a clear error, an early return."],
          ["you", "The error wording is too harsh; you ask it to soften it."],
          ["ai", "Revises. You hit accept; <b>your</b> hand applies it to the file."],
        ],
      },
    },
    {
      role: "Consultant",
      short: "“Act”",
      rc: "#d29922",
      vibe: "<span class='q'>“The AI does the task and reports; you stay the decider.”</span> It runs its own tool-use loop on one bounded job you handed it, then brings back a result to judge.",
      nondev: {
        label: "A working agent",
        blurb: "does a real job end-to-end, then reports",
        story: [
          ["you", "“Go through yesterday's support emails — draft a reply and tag each one.”"],
          ["ai", "Works through all 12: reads, sorts, drafts a reply, tags each ticket."],
          ["ai", "“Done — drafts are queued. Here's the summary.”"],
          [
            "you",
            "You spot-check a couple and approve the sends. It did the work; you supervised.",
          ],
        ],
      },
      dev: {
        label: "Agentic coding",
        blurb: "delegate a scoped task; it loops and self-corrects",
        story: [
          ["you", "“The date picker breaks on Safari — fix it.” Then you go get coffee."],
          ["ai", "Finds the bug, edits the file, runs the tests, hits a failure…"],
          ["ai", "…patches it, re-runs — green. “Done. Here's the diff and why.”"],
          [
            "you",
            "You skim the finished change and keep it. You judged the <b>outcome</b>, not each step.",
          ],
        ],
      },
    },
    {
      role: "Approver",
      short: "“Orchestrate”",
      rc: "#bc8cff",
      vibe: "<span class='q'>“The AI runs the play; you sign off at the gates.”</span> It plans <b>and</b> acts across many steps — kicked off by a trigger, not your prompt — pausing only for a yes/no at defined checkpoints.",
      nondev: {
        label: "Scheduled workflow",
        blurb: "fires on a trigger; you approve to send",
        story: [
          ["sys", "Every Monday 8am the workflow fires — that's the schedule, not you."],
          ["ai", "One agent pulls the sales numbers; another drafts the summary from them."],
          ["ai", "Posts to Teams: “Draft ready — approve to send to leadership.”"],
          ["you", "You click Approve. You never opened a spreadsheet; you signed off at the gate."],
        ],
      },
      dev: {
        label: "Harness-driven",
        blurb: "orchestrator + sub-agents; you approve the PR",
        story: [
          ["sys", "A ticket lands in the queue. No human prompt — that's the trigger."],
          [
            "ai",
            "An orchestrator spins up a research agent and an implementation agent; they hand off; tests run.",
          ],
          ["ai", "Opens a pull request: “Ready for review.”"],
          [
            "you",
            "You approve at the gate — or send it back. You never wrote a line; you ran QC on a plan the agents executed.",
          ],
        ],
      },
    },
    {
      role: "Observer",
      short: "“Autonomous”",
      rc: "#f85149",
      vibe: "<span class='q'>“You give intent and read the results.”</span> The human is pushed to the outermost edge. Aspirational, not a promise of zero mistakes — just that you're out of the loop.",
      nondev: {
        label: "Autonomous function",
        blurb: "set the goal once; it runs the function",
        story: [
          [
            "you",
            "You tell the ops agent: “Keep reorder levels healthy — never stock out, don't over-order.”",
          ],
          [
            "ai",
            "It watches inventory, forecasts demand, places orders, reconciles invoices — continuously.",
          ],
          ["ai", "“Inventory's been green for 6 weeks. Here's the spend.”"],
          ["you", "You glance at the dashboard. You set intent once, and you watch."],
        ],
      },
      dev: {
        label: "Dark factory",
        blurb: "ships to production with no human in the loop",
        story: [
          ["you", "“Customers keep asking for CSV export. Ship it.” Then you walk away."],
          [
            "ai",
            "Writes the spec, builds it, writes &amp; runs the tests, reviews its own PR, merges, deploys, watches the metrics.",
          ],
          ["ai", "“Shipped. Export is live — here's the early usage.”"],
          ["you", "You read the outcome. You were never in the loop — intent in, results out."],
        ],
      },
    },
  ];
const thread = (s: [string, string][]) =>
  s
    .map(
      ([w, t]) =>
        `<div class="turn ${w}"><div class="who">${w === "sys" ? "Trigger" : w === "ai" ? "AI" : "You"}</div><div class="txt">${t}</div></div>`,
    )
    .join("");
const colHTML = (cls: string, tag: string, lane: Lane) =>
  `<div class="col ${cls}"><span class="tag">${tag}</span>
       <div class="lead"><b>${lane.label}</b> — ${lane.blurb}</div>
       <div class="story">${thread(lane.story)}</div></div>`;
$("#rungs")!.innerHTML = RUNGS.map((r) => {
  const parts = r.vibe.split("</span>");
  const quote = parts[0] + "</span>",
    expl = parts.slice(1).join("</span>").trim();
  return `
    <div class="rung" style="--rc:${r.rc}" data-viz-id="rung-${r.role.toLowerCase()}" data-label="${r.role}">
      <div class="rung-head">
        <div><div class="name">${r.role}</div><div class="short">${r.short}</div></div>
        <div class="vibe">${quote}</div>
      </div>
      <div class="rung-expl">${expl}</div>
      <div class="rung-cols">
        ${colHTML("everyday", "Everyday", r.nondev)}
        ${colHTML("engineer", "Engineer", r.dev)}
      </div>
    </div>`;
}).join("");

/* ---------------- ACT 3: wall ---------------- */
const ABOVE = [
  "Write instructions in plain English",
  "Upload your own documents",
  "Flip on built-in tools (web, images)",
  "Connect a ready-made plug",
  "Put it on a schedule",
  "Share it with your team or org",
];
const BELOW = [
  "Build the tool behind a plug",
  "Wire two systems together",
  "Write custom logic",
  "Host it for everyone",
];
$("#above")!.innerHTML = ABOVE.map((c) => `<span class="chip2">${c}</span>`).join("");
$("#below")!.innerHTML = BELOW.map((c) => `<span class="chip2">${c}</span>`).join("");

/* ---------------- ACT 4: share diagram (static) ---------------- */
const sel = el; // reuse
const svg = $<SVGSVGElement>("#share-svg")!;
const CX = 240,
  CY = 240;
const RINGS = [
  { name: "The world", r: 205, pc: "#bc8cff" },
  { name: "Your organization", r: 140, pc: "#d29922" },
  { name: "Your team", r: 78, pc: "#3fb950" },
];
const SURF = [
  { r: 205, a: 312, t: "Claude Code" },
  { r: 205, a: 228, t: "A vendor's app" },
  { r: 140, a: 8, t: "Copilot" },
  { r: 140, a: 172, t: "Teams" },
  { r: 78, a: 62, t: "ChatGPT" },
  { r: 78, a: 118, t: "A coworker's bot" },
];
RINGS.forEach((s) => {
  svg.append(
    sel("circle", {
      cx: CX,
      cy: CY,
      r: s.r,
      fill: "none",
      stroke: s.pc,
      "stroke-width": 1.6,
      "stroke-dasharray": "4 5",
      opacity: 0.7,
    }),
  );
  const ly = CY - s.r,
    w = s.name.length * 6.6 + 16;
  svg.append(
    sel("rect", {
      x: CX - w / 2,
      y: ly - 11,
      width: w,
      height: 20,
      rx: 10,
      fill: "var(--bg)",
      stroke: s.pc,
      "stroke-width": 1,
      opacity: 0.95,
    }),
  );
  svg.append(
    sel(
      "text",
      {
        x: CX,
        y: ly + 4,
        "text-anchor": "middle",
        fill: s.pc,
        "font-size": 11.5,
        "font-weight": 700,
      },
      esc(s.name),
    ),
  );
});
SURF.forEach((d) => {
  const rad = (d.a * Math.PI) / 180,
    px = CX + Math.cos(rad) * d.r,
    py = CY + Math.sin(rad) * d.r;
  svg.append(
    sel("line", {
      x1: CX,
      y1: CY,
      x2: px,
      y2: py,
      stroke: "var(--good)",
      "stroke-width": 1.4,
      opacity: 0.4,
    }),
  );
  svg.append(sel("circle", { cx: px, cy: py, r: 5.5, fill: "var(--good)" }));
  const lx = CX + Math.cos(rad) * (d.r + 12),
    ly = CY + Math.sin(rad) * (d.r + 12);
  svg.append(
    sel(
      "text",
      {
        x: lx,
        y: ly + (ly < CY ? -2 : 10),
        "text-anchor": lx > CX + 4 ? "start" : lx < CX - 4 ? "end" : "middle",
        fill: "var(--muted)",
        "font-size": 10.5,
      },
      esc(d.t),
    ),
  );
});
svg.append(
  sel("circle", {
    cx: CX,
    cy: CY,
    r: 36,
    fill: "var(--panel-2)",
    stroke: "var(--accent)",
    "stroke-width": 2.4,
  }),
);
svg.append(
  sel(
    "text",
    {
      x: CX,
      y: CY - 4,
      "text-anchor": "middle",
      fill: "var(--text)",
      "font-size": 12,
      "font-weight": 700,
    },
    "built",
  ),
);
svg.append(
  sel(
    "text",
    {
      x: CX,
      y: CY + 12,
      "text-anchor": "middle",
      fill: "var(--text)",
      "font-size": 12,
      "font-weight": 700,
    },
    "once",
  ),
);

const SCOPES = [
  {
    name: "Your team",
    pc: "#3fb950",
    desc: "Build it, share it with a few colleagues. Everyone on the team can plug it into their own AI tools.",
  },
  {
    name: "Your organization",
    pc: "#d29922",
    desc: "Publish it to the company catalog. Anyone in the org — and every AI tool they use — can reach it.",
  },
  {
    name: "The world",
    pc: "#bc8cff",
    desc: "Open it to everyone. A vendor ships a plug; the whole ecosystem can use the capability.",
  },
];
$("#scopes")!.innerHTML = SCOPES.map(
  (s) => `
    <div class="scope" style="--pc:${s.pc}" data-viz-id="scope-${s.name.split(" ").pop()!.toLowerCase()}" data-label="${esc(s.name)}">
      <div class="name">${s.name}</div><div class="desc">${s.desc}</div>
    </div>`,
).join("");

/* ---------------- ACT 5: players ---------------- */
const PLAYERS = [
  {
    name: "OpenAI",
    c: "#10a37f",
    t1: "<b>Custom GPTs</b> + the GPT Store",
    t2: "<b>AgentKit</b> — a visual canvas for multi-step agents",
  },
  {
    name: "Microsoft",
    c: "#58a6ff",
    t1: "<b>Copilot agents</b> inside Microsoft 365",
    t2: "<b>Copilot Studio</b> — connectors, triggers, workflows",
  },
  {
    name: "Google",
    c: "#d29922",
    t1: "<b>Gems</b> — custom experts in Gemini",
    t2: "<b>Opal</b> / Agent Designer in Gemini Enterprise",
  },
  {
    name: "Anthropic",
    c: "#bc8cff",
    t1: "<b>Claude Projects</b> + <b>Skills</b>",
    t2: "<b>Claude Agent SDK</b> (leans more engineer-facing)",
  },
];
$("#players")!.innerHTML = PLAYERS.map(
  (p) => `
    <tr data-viz-id="player-${p.name.toLowerCase()}" data-label="${p.name}">
      <td class="who"><span class="dot" style="background:${p.c}"></span>${p.name}</td>
      <td>${p.t1}</td><td>${p.t2}</td>
    </tr>`,
).join("");

/* ---------------- ACT 3: process morph ---------------- */
// each step carries the work at three levels of AI involvement: you / duo (co-pilot) / ai (runs it)
type Step = { n: string; you: string; duo: string; ai: string };
type Track = {
  title: string;
  sub: string;
  steps: Step[];
  fuse: [number, number];
  gate: number;
  loop: string;
};
type Persona = "dev" | "biz";
type Owner = "you" | "duo" | "ai";
const PROC: Record<Persona, Track> = {
  dev: {
    title: "Software team",
    sub: "Agile / Scrum — the delivery lifecycle",
    steps: [
      {
        n: "backlog",
        you: "You triage tickets and rank what matters most.",
        duo: "AI drafts ticket write-ups and suggests priority; you order the list.",
        ai: "AI grooms the backlog — dedupes, estimates, and orders it.",
      },
      {
        n: "requirements",
        you: "You write each story's requirements and acceptance criteria by hand.",
        duo: "AI drafts acceptance criteria from the ticket; you sharpen them.",
        ai: "AI expands a one-line ask into a full spec — but you still own what 'done' means.",
      },
      {
        n: "design",
        you: "You make the architecture calls and sketch how the pieces fit.",
        duo: "AI weighs options and drafts the diagram; the call stays yours.",
        ai: "AI proposes a design — but architecture is where AI helps least; you still decide.",
      },
      {
        n: "tests",
        you: "You write the tests first — they pin down what 'done' means before any code exists.",
        duo: "AI drafts the test cases from the spec; you decide which matter.",
        ai: "AI turns the acceptance criteria into a full test suite up front.",
      },
      {
        n: "build",
        you: "You write the code until every test passes.",
        duo: "AI pair-programs toward green; you steer and accept.",
        ai: "AI writes the code until the tests pass, fixing itself as it goes.",
      },
      {
        n: "quality",
        you: "You run the full suite and the security scans, then sign off.",
        duo: "AI runs the checks, explains failures and vulnerabilities; you clear them.",
        ai: "AI runs every test and security scan, and patches what it finds.",
      },
      {
        n: "review",
        you: "You read every diff and leave review notes.",
        duo: "AI pre-reviews and flags issues; you make the call.",
        ai: "AI reviews the diff, flags risks, and merges it — no human gate left.",
      },
      {
        n: "ship",
        you: "You push the finished code out to customers by hand.",
        duo: "AI preps the release notes and rollout plan; you press go.",
        ai: "AI releases it gradually and automatically rolls it back if the numbers go bad.",
      },
      {
        n: "run & monitor",
        you: "You watch the dashboards and get paged when it breaks.",
        duo: "AI spots the problem and drafts what went wrong; you fix it.",
        ai: "AI investigates outages and proposes the fix — but only acts with your OK.",
      },
      {
        n: "acceptance",
        you: "You — or the product owner — confirm it solved the original problem: 'I asked for this; did I get it?'",
        duo: "AI maps what shipped back to the original ask; you make the final call.",
        ai: "AI checks its own work against the original ask and calls it solved.",
      },
    ],
    fuse: [3, 4],
    gate: 9,
    loop: "next sprint",
  },
  biz: {
    title: "Everyone else",
    sub: "The recurring report — e.g. the monthly business review",
    steps: [
      {
        n: "gather",
        you: "You pull numbers from each system into one place.",
        duo: "AI fetches and cleans the data; you sanity-check it.",
        ai: "AI pulls every source and reconciles it automatically.",
      },
      {
        n: "analyze",
        you: "You build the charts and spot the trends yourself.",
        duo: "AI surfaces trends and outliers; you interpret them.",
        ai: "AI runs the analysis and flags what actually changed.",
      },
      {
        n: "draft",
        you: "You write the narrative and assemble the slides.",
        duo: "AI drafts the write-up; you edit the story.",
        ai: "AI writes the full report from the analysis.",
      },
      {
        n: "review",
        you: "You proof every number and tighten the wording.",
        duo: "AI fact-checks and proofs; you approve the read.",
        ai: "AI self-checks the whole report.",
      },
      {
        n: "present",
        you: "You build the deck and present it live.",
        duo: "AI preps your talking points; you deliver.",
        ai: "AI distributes the report, tailored per audience.",
      },
      {
        n: "act",
        you: "You track the action items and chase the owners.",
        duo: "AI drafts the follow-ups; you assign them.",
        ai: "AI opens and tracks every action item to closure.",
      },
    ],
    fuse: [0, 1],
    gate: 3,
    loop: "next cycle",
  },
};
const RUNGS3 = [
  {
    name: "Operator",
    short: "Ask",
    c: "#58a6ff",
    line: "Every step is still yours. The AI is a suggestion box <b>inside</b> a step — it owns nothing.",
  },
  {
    name: "Collaborator",
    short: "Assist",
    c: "#3fb950",
    line: "A co-pilot joins <b>every</b> step. Same steps, same order — each one just gets a partner. Watch every box turn green.",
  },
  {
    name: "Consultant",
    short: "Act",
    c: "#d29922",
    line: "You hand off one bounded chunk: <b>tests + build</b> become a self-correcting loop the AI owns end-to-end, then reports back. Only those two change.",
  },
  {
    name: "Approver",
    short: "Orchestrate",
    c: "#bc8cff",
    line: "AI now runs the <b>whole</b> play, kicked off by a trigger. Everything goes to AI but one human touchpoint: <b>acceptance</b> — you still sign off that it actually solved the problem (the green row, alone in the field of AI).",
  },
  {
    name: "Observer",
    short: "Autonomous",
    c: "#f85149",
    line: "Even <b>acceptance</b> is AI's now — it decides for itself that its work solved your problem. Same pipeline, you're just fully <b>out of the loop</b>: hand in intent, read the result.",
  },
];
const OWN: Record<Owner, string> = { you: "You", duo: "You + AI", ai: "AI" };
const ownBadge = (o: Owner) => `<span class="own">${OWN[o]}</span>`; // colour comes from the row's --cell
const back = (t: Track, label: string) =>
  `<div class="proc-back"><span>↺ ${label} — <b>${t.loop}</b></span></div>`;
const pad = (i: number) => "0" + (i + 1);
const ERA = ["#58a6ff", "#3fb950", "#d29922", "#bc8cff", "#f85149"]; // the 5 rung colours, Operator→Observer

// each step's owner (badge text) AND era (the rung where it last changed → its colour)
const cellState = (rIdx: number, i: number, t: Track): { owner: Owner; era: number } => {
  const loop = i >= t.fuse[0] && i <= t.fuse[1],
    gate = i === t.gate;
  if (rIdx === 0) return { owner: "you", era: 0 };
  if (rIdx === 1) return { owner: "duo", era: 1 };
  if (rIdx === 2) return loop ? { owner: "ai", era: 2 } : { owner: "duo", era: 1 };
  if (rIdx === 3)
    return loop
      ? { owner: "ai", era: 2 }
      : gate
        ? { owner: "duo", era: 1 }
        : { owner: "ai", era: 3 };
  return loop ? { owner: "ai", era: 2 } : gate ? { owner: "ai", era: 4 } : { owner: "ai", era: 3 };
};

const vrow = ({
  num,
  name,
  gloss,
  owner,
  color,
  loop,
}: {
  num: string;
  name: string;
  gloss: string;
  owner: Owner;
  color: string | undefined;
  loop: boolean;
}) =>
  `<div class="vrow" style="--cell:${color}">
       <div class="vnode"></div>
       <div class="vmeta"><span class="vnum">${num}</span><span class="vname">${name}</span>${loop ? `<span class="vloopmark" title="self-correcting loop">↻</span>` : ""}</div>
       <div class="vown">${ownBadge(owner)}</div>
       <div class="vgloss">${gloss}</div>
     </div>`;

// every rung renders the SAME rows; each step is painted the colour of the rung where it last changed
const renderTrack = (t: Track, rIdx: number) => {
  const [la, lb] = t.fuse,
    loopOn = rIdx >= 2;
  const rows = t.steps.map((s, i) => {
    const { owner, era } = cellState(rIdx, i, t);
    return vrow({
      num: pad(i),
      name: s.n,
      gloss: s[owner],
      owner,
      color: ERA[era],
      loop: loopOn && i >= la && i <= lb,
    });
  });
  const flow = loopOn
    ? rows.slice(0, la).join("") +
      `<div class="vloop">${rows.slice(la, lb + 1).join("")}</div>` +
      rows.slice(lb + 1).join("")
    : rows.join("");
  return `<h3>${t.title}</h3><div class="tsub">${t.sub}</div><div class="proc-flow ${rIdx === 4 ? "sealed" : ""}">${flow}</div>${back(t, rIdx === 4 ? "self-restarts each cycle" : "then back to the top")}`;
};

let r3 = 0,
  persona: Persona = "dev";
$("#procPersona")!.innerHTML = (["dev", "biz"] as const)
  .map(
    (k) =>
      `<button class="${k}" data-k="${k}" data-viz-id="procpersona-${k}" data-label="${PROC[k].title}">${PROC[k].title}</button>`,
  )
  .join("");
$("#procStep")!.innerHTML = RUNGS3.map(
  (r, i) => `
    <div class="proc-seg" style="--sc:${r.c}" data-i="${i}" data-viz-id="procseg-${r.name.toLowerCase()}" data-label="${r.name}">
      <div class="num">0${i + 1}</div><div class="nm">${r.name}</div><div class="sh">“${r.short}”</div>
    </div>`,
).join("");
const renderProc = () => {
  const r = RUNGS3[r3]!,
    t = PROC[persona];
  [...$("#procStep")!.children].forEach((seg, i) => {
    seg.classList.toggle("on", i === r3);
  });
  [...$("#procPersona")!.children].forEach((b) => {
    b.classList.toggle("on", b instanceof HTMLElement && b.dataset["k"] === persona);
  });
  const line = $("#procLine")!;
  line.style.setProperty("--sc", r.c);
  line.innerHTML = `<span><b>${r.name}.</b> ${r.line}</span>`;
  const st = $("#procStage")!;
  st.className = "proc-track " + persona;
  st.style.setProperty("--sc", r.c);
  st.innerHTML = renderTrack(t, r3);
};
$("#procStep")!.addEventListener("click", (e) => {
  const seg = e.target instanceof Element ? e.target.closest<HTMLElement>(".proc-seg") : null;
  if (!seg) return;
  r3 = +seg.dataset["i"]!;
  renderProc();
});
$("#procPersona")!.addEventListener("click", (e) => {
  const b = e.target instanceof Element ? e.target.closest("button") : null;
  if (!b) return;
  const k = b.dataset["k"];
  if (k === "dev" || k === "biz") persona = k;
  renderProc();
});
renderProc();
