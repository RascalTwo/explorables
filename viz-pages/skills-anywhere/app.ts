import { $, $$, esc, saveHash, loadHash } from "@viz/kit";
import {
  ASOF,
  ROUTES,
  SCRIPTS,
  PLANS,
  FAMILIES,
  PLATFORMS,
  OTHER,
  CHECKLIST,
  ANATOMY,
  TREE,
} from "./data.js";
import type { Cmd, Line, Platform, RouteId } from "./data.js";

type Role = "use" | "make" | "both";
interface State {
  role: Role;
  p: string;
  fixed: boolean;
  line: number;
  done: string[];
}

const byId = Object.fromEntries(PLATFORMS.map((p) => [p.id, p]));
const ORDER = (["code", "chat"] as const).flatMap((f) => PLATFORMS.filter((p) => p.family === f));
const ROUTE_COLOR: Record<RouteId, string> = {
  agents: "var(--c5)",
  claude: "var(--warn)",
  own: "var(--c4)",
  upload: "var(--accent)",
};
const tone = (t: string) => (t === "faint" ? "var(--faint)" : `var(--${t})`);
const rulesFor = (id: string) => CHECKLIST.filter((c) => c.hits.includes(id));

const state: State = Object.assign(
  { role: "both", p: "claude-code", fixed: false, line: 2, done: [] as string[] },
  loadHash<State>(),
);
const save = () => saveHash(state);

const ROLE_HINT = {
  use: "Showing install steps. Switch to “make” for what skill authors need to know.",
  make: "Showing what your skill must get right. Switch to “use” for install steps.",
  both: "Each AI shows install steps and author notes side by side.",
};

// ── 1 · the map ─────────────────────────────────────────────────────────
function renderMap() {
  const make = state.role !== "use";
  // name · .agents · .claude · own folder (wider: shows the path) · upload · scripts · plan · call · [rules]
  const cols = `minmax(150px, 1.3fr) 106px 106px 132px 84px 142px 128px 100px${make ? " 150px" : ""}`;
  const maxRules = Math.max(...PLATFORMS.map((p) => rulesFor(p.id).length));
  const head = `
    <div class="mrow mhead" style="--cols:${cols}">
      <div class="mc name"><span class="mh" style="text-align:left;padding:0">AI</span></div>
      ${ROUTES.map((r) => `<div class="mh">${esc(r.label)}<i>${esc(r.hint)}</i></div>`).join("")}
      <div class="mh">scripts run<i>where the skill’s code executes</i></div>
      <div class="mh">plan needed<i>cheapest tier that gets skills</i></div>
      <div class="mh">call it<i>besides just asking</i></div>
      ${make ? `<div class="mh">rules that bite<i>of the ${CHECKLIST.length} in section 3</i></div>` : ""}
    </div>`;
  const row = (p: Platform) => {
    const s = SCRIPTS[p.scripts],
      pl = PLANS[p.plan],
      n = rulesFor(p.id).length;
    const dot = (
      r: RouteId,
      on: boolean,
    ) => `<div class="mc"><span class="route-dot${on ? " on" : ""}" style="--rc:${ROUTE_COLOR[r]}"
        data-viz-id="route-${p.id}-${r}" data-label="${esc(p.name)}: ${on ? "reads" : "no"} ${r}" title="${on ? "yes" : "no"}"></span></div>`;
    return `
    <div class="mrow${state.p === p.id ? " sel" : ""}" style="--cols:${cols}" data-p="${p.id}" data-viz-id="row-${p.id}" data-label="${esc(p.name)} row">
      <div class="mc name"><b>${esc(p.name)}</b><i>${esc(p.sub)}</i></div>
      ${dot("agents", p.reads.agents)}${dot("claude", p.reads.claude)}
      <div class="mc">${p.reads.own ? `<span class="route-own" title="${esc(p.reads.own)}">${esc(p.reads.own)}</span>` : '<span class="route-dot"></span>'}</div>
      ${dot("upload", p.reads.upload)}
      <div class="mc"><span class="pill" style="--pc:${tone(s.tone)}" title="${esc(s.hint)}">${s.label}</span></div>
      <div class="mc"><span class="pill${p.disputed ? " disputed" : ""}" style="--pc:${tone(pl.tone)}" title="${esc(p.planNote)}">${pl.label}</span></div>
      <div class="mc"><span class="sigil">${esc(p.call)}</span></div>
      ${
        make
          ? `<div class="mc"><div class="strict"><div class="bar" style="width:${(n / maxRules) * 100}px"
          data-viz-id="strict-${p.id}" data-label="${esc(p.name)}: ${n} rules bite"></div><b>${n}</b></div></div>`
          : ""
      }
    </div>`;
  };
  $("#map")!.innerHTML =
    head +
    (["code", "chat"] as const)
      .map(
        (f) => `
      <div class="mrow mfam">${FAMILIES[f].label}<span>${FAMILIES[f].note}</span></div>
      ${PLATFORMS.filter((p) => p.family === f)
        .map(row)
        .join("")}`,
      )
      .join("") +
    `
      <div class="mrow mfam">Everything else</div>
      <div class="mrow${state.p === "other" ? " sel" : ""}" style="--cols:${cols}" data-p="other" data-viz-id="row-other" data-label="Any other AI row">
        <div class="mc name"><b>Any other AI</b><i>${esc(OTHER.sub)}</i></div>
        <div class="mc"><span class="route-dot on" style="--rc:var(--c5)" title="most of them"></span></div>
        <div class="mc" style="grid-column: span ${make ? 7 : 6}; justify-content:flex-start; color:var(--muted)">
          About 40 more tools read <code>.agents/skills/</code>. With no skill support at all, you can still paste it in.</div>
      </div>`;

  $("#mapfoot")!.innerHTML = `
    <span><b>●</b> filled = works that way</span>
    ${Object.values(SCRIPTS)
      .slice(0, 3)
      .map(
        (s) =>
          `<span><span class="pill" style="--pc:${tone(s.tone)}">${s.label}</span> ${esc(s.hint)}</span>`,
      )
      .join("")}
    <span><b>?</b> = the vendor’s own pages disagree</span>
    <span>Hover a pill for the detail.</span>`;

  const shared = ORDER.filter((p) => p.family === "code" && p.reads.agents).map((p) => p.name);
  const both = ORDER.filter(
    (p) => p.family === "code" && (p.reads.agents || p.reads.claude),
  ).length;
  $("#shared-callout")!.innerHTML =
    `<b>The short version:</b> put the folder in <code>.agents/skills/</code> inside a project and
    ${shared.join(", ").replace(/, ([^,]*)$/u, " and $1")} all find it. Put a second copy (or a symlink) in <code>.claude/skills/</code> and you’ve covered
    all ${both} coding agents. Chat apps don’t read folders; you upload the skill to each one separately.`;

  const strictest = [...PLATFORMS].toSorted(
    (a, b) => rulesFor(b.id).length - rulesFor(a.id).length,
  )[0]!;
  $("#strict-callout")!.innerHTML =
    `<b>Test against the strictest host first.</b> ${esc(strictest.name)} is where the most rules bite
    (${rulesFor(strictest.id).length} of ${CHECKLIST.length}). A skill that uploads cleanly there and has offline scripts will load on every AI in this table.
    <span class="x-link" data-jump="s-port">See the checklist ↓</span>`;
}

// ── 2 · tabs ────────────────────────────────────────────────────────────
const cmdHtml = (cmds: Cmd[]) =>
  cmds
    .map(
      ([label, hint, cmd]) => `
  <div class="cmd"><label>${esc(label)} <span>— ${esc(hint)}</span></label>
    <pre><code>${esc(cmd)}</code></pre><button class="copy" data-copy="${esc(cmd)}">copy</button></div>`,
    )
    .join("");

function whereText(p: Platform) {
  const w = [];
  if (p.reads.agents) w.push("<code>.agents/skills/</code>");
  if (p.reads.claude) w.push("<code>.claude/skills/</code>");
  if (p.reads.own) w.push(`<code>${esc(p.reads.own)}</code>`);
  if (p.reads.upload) w.push("upload a zip");
  return w.join(" · ");
}

function paneFor(p: Platform) {
  const s = SCRIPTS[p.scripts],
    pl = PLANS[p.plan];
  const bites = rulesFor(p.id);
  return `
    <div class="facts">
      <div class="fact"><label>kind</label><span>${FAMILIES[p.family].label.replace(/s$/u, "")}</span><small>${esc(p.vendor)}</small></div>
      <div class="fact" style="flex:1.4"><label>where it goes</label><span>${whereText(p)}</span></div>
      <div class="fact"><label>scripts</label><span style="color:${tone(s.tone)}">${s.label}</span><small>${esc(s.hint)}</small></div>
      <div class="fact"><label>plan</label><span style="color:${tone(pl.tone)}">${pl.label}${p.disputed ? " ?" : ""}</span><small>${esc(p.planNote)}</small></div>
      <div class="fact"><label>call it</label><span class="sigil">${esc(p.call)}</span><small>or just ask for the task</small></div>
    </div>
    <div class="halves">
      <div class="half only-use" data-role="use">
        <h3><span class="dot"></span>Use it here</h3>
        <p class="lead">${p.use.lead}</p>
        <ol class="steps">${p.use.steps.map((x) => `<li>${x}</li>`).join("")}</ol>
        ${cmdHtml(p.use.cmds)}
        ${p.use.notes.length > 0 ? `<ul class="plain">${p.use.notes.map((x) => `<li>${x}</li>`).join("")}</ul>` : ""}
      </div>
      <div class="half only-make" data-role="make">
        <h3><span class="dot"></span>Make it work here</h3>
        <p class="lead">${p.make.lead}</p>
        <ul class="plain" style="margin-top:0">${p.make.must.map((x) => `<li>${x}</li>`).join("")}</ul>
        ${p.make.extras ? `<p class="note">${p.make.extras}</p>` : ""}
        ${p.make.limits ? `<p class="note">${p.make.limits}</p>` : ""}
        <div class="sub-h">Checklist rules that bite here · ${bites.length} of ${CHECKLIST.length}</div>
        <div class="bites">${bites.map((c) => `<div class="bite" data-rule="${c.id}" data-viz-id="bite-${p.id}-${c.id}" data-label="${esc(p.name)}: rule ${c.id}">${c.title}</div>`).join("")}</div>
      </div>
    </div>
    <p class="srcs">Sources: ${p.src.map(([t, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(t)}</a>`).join(" · ")}</p>`;
}

function paneOther() {
  return `
    <div class="facts">
      <div class="fact" style="flex:1"><label>two cases</label><span>It reads skills folders — or it doesn’t support skills at all</span></div>
    </div>
    <div class="halves">
      <div class="half only-use" data-role="use">
        <h3><span class="dot"></span>Use it here</h3>
        <p class="lead"><b>If it’s a coding agent,</b> try the shared folder first. About 40 other tools support the standard, and most read
          <code>.agents/skills/</code>. The full list is at <a href="https://agentskills.io/" target="_blank" rel="noopener">agentskills.io</a>.</p>
        <p class="lead"><b>If it has no skill support</b> (a Gem, a Claude Project, a plain chatbot), paste the skill in by hand:</p>
        <ol class="steps">
          <li>Open <code>SKILL.md</code> and copy everything below the second <code>---</code> line.</li>
          <li>Paste it into the AI’s custom instructions (or a Project’s or Gem’s instructions).</li>
          <li>Attach any files from <code>references/</code> as knowledge files.</li>
        </ol>
        <ul class="plain">
          <li>Scripts won’t run unless that AI can run code and you upload them too.</li>
          <li>It’s no longer triggered on demand. The whole skill sits in context all the time, so this works best for one or two skills.</li>
          <li><b>Custom GPTs are being retired.</b> Personal plans can no longer create them, and OpenAI points people to plugins instead.</li>
        </ul>
      </div>
      <div class="half only-make" data-role="make">
        <h3><span class="dot"></span>Make it work here</h3>
        <p class="lead">Assume some people will <b>paste your SKILL.md into a chat</b>. Write it so it still makes sense that way.</p>
        <ul class="plain" style="margin-top:0">
          <li>Put the steps in SKILL.md in plain language, not only inside scripts. If the script can’t run, the model should still be able to do the job by hand.</li>
          <li>Keep it short. A pasted skill is in context for the whole conversation.</li>
          <li>Validate against the standard with <code>skills-ref validate ./my-skill</code>. Most of those ~40 tools will then load it as-is.</li>
        </ul>
      </div>
    </div>
    <p class="srcs">Sources: <a href="https://agentskills.io/" target="_blank" rel="noopener">agentskills.io</a> ·
      <a href="https://help.openai.com/en/articles/8554397-creating-and-editing-gpts" target="_blank" rel="noopener">Creating and editing GPTs</a></p>`;
}

function renderTabs() {
  const all = [...ORDER, OTHER];
  $("#tabs")!.innerHTML = `
    <div class="inst-tabs" role="tablist">${all
      .map(
        (p) => `
      <button class="inst-tab${state.p === p.id ? " on" : ""}" role="tab" data-p="${p.id}" data-viz-id="tab-${p.id}" data-label="${esc(p.name)} tab">
        <span class="fam">${p.family ? FAMILIES[p.family].label.replace(/s$/u, "") : "fallback"}</span>
        <b>${esc(p.name)}</b><i>${esc(p.sub)}</i></button>`,
      )
      .join("")}
    </div>
    <div class="inst-pane">${state.p === "other" ? paneOther() : paneFor((byId[state.p] ?? ORDER[0])!)}</div>`;
}

// ── 3 · anatomy ─────────────────────────────────────────────────────────
const NON_CC = PLATFORMS.filter((p) => p.id !== "claude-code").map((p) => p.id);
const FAILS = [
  // which AIs a bad line breaks (hard fail or garbled instructions)
  ["when_to_use", ["claude-app"]],
  ["argument-hint", ["claude-app"]],
  ["${CLAUDE_SKILL_DIR}", NON_CC],
  ["pip install", ["gemini-app"]],
] satisfies [string, string[]][];
const failsOf = (t: string) => FAILS.filter(([k]) => t.includes(k)).flatMap(([, v]) => v);

function explainBodyFor(sel: Line, selGone: boolean): string {
  if (sel.kind === "break" && state.fixed) {
    return (
      (selGone
        ? "Deleted. Its meaning moved into the description."
        : `Rewritten to work everywhere.`) +
      `<br><span style="color:var(--faint)">Was: ${esc(sel.t)}</span>`
    );
  }
  return sel.note ?? "Plain instructions. These read the same on every AI.";
}

function renderAnat() {
  let n = 0;
  const shown = ANATOMY.map(
    (l, i): { t: string; kind: string; i: number; gone?: true; no?: number } => {
      const broken = l.kind === "break";
      if (broken && state.fixed && l.fix === null) return { ...l, i, gone: true };
      const kind = broken && state.fixed ? "fixed" : l.kind;
      return { ...l, i, kind, t: broken && state.fixed ? l.fix! : l.t, no: ++n };
    },
  );
  const bad = new Set(
    state.fixed ? [] : ANATOMY.filter((l) => l.kind === "break").flatMap((l) => failsOf(l.t)),
  );
  const ok = PLATFORMS.length - bad.size;
  const sel = (ANATOMY[state.line] ?? ANATOMY[2])!;
  const selKind = sel.kind === "break" && state.fixed ? "fixed" : sel.kind;
  const selGone = sel.kind === "break" && state.fixed && sel.fix === null;
  const K: Record<string, string> = {
    ok: "standard · works everywhere",
    break: "breaks somewhere",
    fixed: "fixed",
    host: "one tool only · ignored elsewhere",
    dir: "folder",
  };
  const explainBody = explainBodyFor(sel, selGone);
  const failList =
    sel.kind === "break" && !state.fixed ? failsOf(sel.t).map((id) => byId[id]!.name) : [];

  $("#anat")!.innerHTML = `
    <div class="filebox">
      <div class="filebar"><span>pdf-report/SKILL.md</span><span class="sp"></span>
        <div class="toggle">
          <button class="${!state.fixed ? "on bad" : ""}" data-fix="0" data-viz-id="anat-as-written" data-label="show as written">as written</button>
          <button class="${state.fixed ? "on good" : ""}" data-fix="1" data-viz-id="anat-portable" data-label="make it portable">make it portable</button>
        </div></div>
      <div class="lines">${shown
        .map((l) =>
          l.gone
            ? ""
            : `
        <div class="ln k-${l.kind}${l.i === state.line ? " sel" : ""}" data-line="${l.i}" data-viz-id="line-${l.i}" data-label="SKILL.md line: ${esc(l.t.slice(0, 40))}">
          <span class="no">${l.no}</span><span class="tx">${esc(l.t) || " "}</span></div>`,
        )
        .join("")}
      </div>
    </div>
    <div class="side">
      <div class="score" data-viz-id="anat-score" data-label="loads cleanly on N of 8">
        <div class="big" style="color:${ok === PLATFORMS.length ? "var(--good)" : "var(--danger)"}">${ok}/${PLATFORMS.length}</div>
        <div class="lbl">AIs where this skill loads and reads cleanly
          <div class="pips">${ORDER.map((p) => `<span class="pip${bad.has(p.id) ? " x" : ""}" title="${esc(p.name)}: ${bad.has(p.id) ? "breaks" : "fine"}"></span>`).join("")}</div>
        </div>
      </div>
      <div class="explain">
        <span class="k ${selKind}">${K[selKind] ?? ""}</span>
        <code style="background:none;padding:0;color:var(--muted)">${esc(selGone ? sel.t : sel.kind === "break" && state.fixed ? sel.fix : sel.t).slice(0, 80)}</code>
        <div style="margin-top:8px">${explainBody}</div>
        ${failList.length > 0 ? `<div style="margin-top:8px;color:var(--danger);font-size:12px">Breaks on: ${failList.join(", ")}</div>` : ""}
      </div>
      <div class="filebox">
        <div class="filebar"><span>the folder</span></div>
        <div class="tree">${TREE.map(
          (l, i) => `
          <div class="ln k-${l.kind === "dir" ? "frame" : l.kind}" data-tree="${i}" title="${esc(l.note.replaceAll(/<[^>]+>/gu, ""))}"><span class="no"></span><span class="tx">${esc(l.t)}</span></div>`,
        ).join("")}
        </div>
      </div>
    </div>`;
}

// ── 3 · checklist grid ─────────────────────────────────────────────────
function renderChecklist() {
  const cols = ORDER.map(
    (p) => `<span class="colh" data-p="${p.id}" title="open ${esc(p.name)}">${esc(p.name)}</span>`,
  ).join("");
  const done = new Set(state.done);
  $("#checklist")!.innerHTML = `
    <div class="clrow hd"><span></span><span class="t" style="font:600 10.5px var(--mono);color:var(--faint);letter-spacing:.08em;text-transform:uppercase">
      The portable-skill checklist · tick them off as you go · click an AI’s name to open it</span>${cols}<span></span></div>
    ${CHECKLIST.map(
      (c) => `
      <div class="clrow${done.has(c.id) ? " done" : ""}" id="rule-${c.id}" data-rule="${c.id}">
        <span class="ck" data-tick="${c.id}" data-viz-id="tick-${c.id}" data-label="tick rule ${c.id}">${done.has(c.id) ? "✓" : ""}</span>
        <div class="t">${c.title}<small>${c.why}</small></div>
        ${ORDER.map(
          (
            p,
          ) => `<span class="cell${c.hits.includes(p.id) ? " hit" : ""}" data-viz-id="cell-${c.id}-${p.id}"
            data-label="${esc(p.name)} × rule ${c.id}" title="${c.hits.includes(p.id) ? "matters on " + esc(p.name) : "no effect on " + esc(p.name)}"></span>`,
        ).join("")}
        <span></span>
      </div>`,
    ).join("")}
    <div class="cl-foot"><span></span><span class="t">Rules still open that bite on each AI · ${done.size}/${CHECKLIST.length} done</span>
      ${ORDER.map((p) => {
        const left = rulesFor(p.id).filter((c) => !done.has(c.id)).length;
        return `<span class="n" style="color:${left ? "var(--c4)" : "var(--good)"}">${left || "✓"}</span>`;
      }).join("")}<span></span></div>`;
}

// ── 3 (use) · installing for several AIs ───────────────────────────────
function renderMulti() {
  const code = ORDER.filter((p) => p.family === "code");
  const bar = (label: string, list: string[], color: string) => `
    <div style="display:grid;grid-template-columns:170px 1fr 40px;gap:12px;align-items:center;margin:6px 0">
      <code>${label}</code>
      <div style="display:flex;gap:4px">${code
        .map(
          (
            p,
          ) => `<span title="${esc(p.name)}" style="flex:0 0 118px;padding:5px 8px;border-radius:6px;font-size:12px;
        ${list.includes(p.id) ? `background:color-mix(in srgb, ${color} 22%, transparent);color:var(--text);border:1px solid ${color}` : "color:var(--faint);border:1px dashed var(--border)"}">${esc(p.name)}</span>`,
        )
        .join("")}</div>
      <b style="font:700 15px var(--mono);color:${color}">${list.length}/${code.length}</b></div>`;
  $("#multi")!.innerHTML = `
    <div class="half" style="--role:var(--c5)">
      <h3><span class="dot"></span>Which project folder reaches which coding agent</h3>
      <p class="lead">The shared folder reaches most of them. Together, the two folders reach all five.</p>
      ${bar(
        ".agents/skills/",
        code.filter((p) => p.reads.agents).map((p) => p.id),
        "var(--c5)",
      )}
      ${bar(
        ".claude/skills/",
        code.filter((p) => p.reads.claude).map((p) => p.id),
        "var(--warn)",
      )}
      ${cmdHtml([["One copy, two folders", "a symlink, so there’s only one thing to update", 'ln -s "$PWD/.agents/skills/my-skill" .claude/skills/my-skill']])}
    </div>
    <div class="halves" style="margin-top:18px">
      <div class="half" style="--role:var(--c5)">
        <h3><span class="dot"></span>Or let a tool do it</h3>
        <p class="lead">Two free command-line tools copy a skill from a GitHub repo into whichever coding agents you name.</p>
        ${cmdHtml([
          [
            "npx skills",
            "about 70 agents; -g = all projects",
            "npx skills add owner/repo -s my-skill -a claude-code -a codex -a cursor -g",
          ],
          ["Update later", "pulls new versions everywhere it installed", "npx skills update"],
          [
            "gh skill",
            "GitHub CLI 2.90+, public preview; defaults to Copilot",
            "gh skill install owner/repo --agent claude-code",
          ],
        ])}
        <p class="note">One mismatch to know about: <code>npx skills</code> puts Codex skills in <code>~/.codex/skills/</code>, while Codex’s current docs list <code>~/.agents/skills/</code>.
          If Codex doesn’t see the skill, move it there.</p>
      </div>
      <div class="half" style="--role:var(--accent)">
        <h3><span class="dot"></span>Chat apps: once each</h3>
        <p class="lead">Chat apps don’t share anything. Upload the same zip to each one you use.</p>
        <ul class="plain" style="margin-top:0">
          <li><b>One exception:</b> a skill uploaded to claude.ai also shows up in Claude Code when you’re signed in with the same account.</li>
          <li>Make the zip once, with the folder at the top: <code>zip -r my-skill.zip my-skill</code>.</li>
          <li>ChatGPT takes it only on a work plan; the Gemini app only on personal Pro or Ultra. <span class="x-link" data-jump="s-map">Check the map ↑</span></li>
        </ul>
      </div>
    </div>
    <p class="srcs">Sources: <a href="https://github.com/vercel-labs/skills" target="_blank" rel="noopener">vercel-labs/skills</a> ·
      <a href="https://github.blog/changelog/2026-04-16-manage-agent-skills-with-github-cli/" target="_blank" rel="noopener">gh skill changelog</a></p>`;
}

// ── wiring ─────────────────────────────────────────────────────────────
function renderAll() {
  document.body.className = `r-${state.role}`;
  $$("#roles button").forEach((b) => {
    b.classList.toggle("on", b.dataset["role"] === state.role);
  });
  $("#rolehint")!.textContent = ROLE_HINT[state.role];
  $("#s-other-use .sec-n")!.textContent = state.role === "both" ? "4" : "3";
  renderMap();
  renderTabs();
  renderAnat();
  renderChecklist();
  renderMulti();
}

function pick(id: string, scroll: boolean) {
  state.p = id;
  save();
  renderMap();
  renderTabs();
  if (scroll) $("#s-tabs")!.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.addEventListener("click", (e) => {
  if (!(e.target instanceof Element)) return;
  const t = e.target;
  const role = t.closest<HTMLElement>("#roles button");
  if (role) {
    const next = role.dataset["role"];
    if (next === "use" || next === "make" || next === "both") state.role = next;
    save();
    renderAll();
    return;
  }
  const row = t.closest<HTMLElement>(".mrow[data-p]");
  if (row) return pick(row.dataset["p"]!, true);
  const tab = t.closest<HTMLElement>(".inst-tab");
  if (tab) return pick(tab.dataset["p"]!, false);
  const colh = t.closest<HTMLElement>(".colh");
  if (colh) return pick(colh.dataset["p"]!, true);
  const fix = t.closest<HTMLElement>("[data-fix]");
  if (fix) {
    state.fixed = fix.dataset["fix"] === "1";
    save();
    renderAnat();
    return;
  }
  const line = t.closest<HTMLElement>(".ln[data-line]");
  if (line && ANATOMY[+line.dataset["line"]!]!.note) {
    state.line = +line.dataset["line"]!;
    save();
    renderAnat();
    return;
  }
  const tick = t.closest<HTMLElement>("[data-tick]");
  if (tick) {
    const id = tick.dataset["tick"]!;
    state.done = state.done.includes(id) ? state.done.filter((x) => x !== id) : [...state.done, id];
    save();
    renderChecklist();
    return;
  }
  const bite = t.closest<HTMLElement>(".bite");
  if (bite) {
    const r = $(`#rule-${bite.dataset["rule"]}`)!;
    r.scrollIntoView({ behavior: "smooth", block: "center" });
    r.classList.add("flash");
    setTimeout(() => r.classList.remove("flash"), 1800);
    return;
  }
  const jump = t.closest<HTMLElement>("[data-jump]");
  if (jump) {
    $(`#${jump.dataset["jump"]}`)!.scrollIntoView({ behavior: "smooth" });
    return;
  }
  const copy = t.closest<HTMLElement>(".copy");
  if (copy) {
    navigator.clipboard?.writeText(copy.dataset["copy"]!).catch(console.error);
    copy.textContent = "copied ✓";
    copy.classList.add("ok");
    setTimeout(() => {
      copy.textContent = "copy";
      copy.classList.remove("ok");
    }, 1400);
  }
});

$("#asof")!.textContent = ASOF;
$("#asof-foot")!.innerHTML =
  `Checked against each vendor’s own docs on ${ASOF}. This moves fast: plans, folder names and limits change month to month,
  so each AI’s tab links its sources. The format itself is the open <a href="https://agentskills.io/specification" target="_blank" rel="noopener">Agent Skills standard</a>.`;
renderAll();
