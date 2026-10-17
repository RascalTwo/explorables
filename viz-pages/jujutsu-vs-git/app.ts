export {};
// === Workflow tabs ===
interface AnimEl extends SVGElement {
  __timer?: ReturnType<typeof setInterval> | null;
  __pos?: { x: number; y: number };
}

document.querySelectorAll<HTMLElement>(".compare .tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".compare .tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll<HTMLElement>(".compare .body").forEach((b) => {
      b.style.display = "none";
    });
    btn.classList.add("active");
    document.querySelector<HTMLElement>(`#cmp-${btn.dataset["tab"]}`)!.style.display = "grid";
  });
});

// === REBASE RACE ===
const wait = async (ms: number) => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

function resetRace(prefix: string) {
  ["f1", "f2", "f3"].forEach((id) => {
    const el = document.querySelector<AnimEl>(`#${prefix}-${id}`);
    if (!el) return;
    if (el.__timer) clearInterval(el.__timer);
    const x = Number(el.dataset["initX"]!);
    const y = Number(el.dataset["initY"]!);
    el.setAttribute("transform", `translate(${x} ${y})`);
    el.__pos = { x, y };
    el.classList.remove("in-conflict", "resolved");
  });
  const graph = document.querySelector(prefix === "g" ? "#git-graph" : "#jj-graph")!;
  graph.classList.remove("done");
  const panel = prefix === "g" ? "git" : "jj";
  ["cmds", "stops", "conflicts"].forEach((k) => {
    document.querySelector(`#${panel}-${k}`)!.textContent = "0";
  });
  document.querySelector(`#${panel}-log`)!.innerHTML = "";
}

function setMetric(panel: string, key: string, val: number) {
  document.querySelector(`#${panel}-${key}`)!.textContent = String(val);
}

function log(panel: string, text: string, cls = "") {
  const el = document.querySelector(`#${panel}-log`)!;
  const line = document.createElement("div");
  line.className = "line " + cls;
  line.textContent = text;
  el.append(line);
  el.scrollTop = el.scrollHeight;
}

function easeOutBack(t: number) {
  const c1 = 1.3,
    c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function moveCommit(id: string, x: number, y: number, duration = 800) {
  const el = document.querySelector<AnimEl>(`#${id}`)!;
  if (el.__timer) clearInterval(el.__timer);
  const cur = el.__pos ?? { x: Number(el.dataset["initX"]!), y: Number(el.dataset["initY"]!) };
  const x0 = cur.x,
    y0 = cur.y,
    t0 = performance.now();
  const fps = 60;
  el.__timer = setInterval(() => {
    const t = Math.min(1, (performance.now() - t0) / duration);
    const e = easeOutBack(t);
    const cx = x0 + (x - x0) * e;
    const cy = y0 + (y - y0) * e;
    el.setAttribute("transform", `translate(${cx} ${cy})`);
    if (t >= 1) {
      clearInterval(el.__timer!);
      el.__timer = null;
      el.__pos = { x, y };
    }
  }, 1000 / fps);
}

async function runGit() {
  const btn = document.querySelector<HTMLButtonElement>('.play[data-race="git"]')!;
  btn.disabled = true;
  resetRace("g");
  await wait(300);

  let cmds = 0,
    stops = 0,
    conflicts = 0;
  document.querySelector("#git-graph")!.classList.add("done");

  cmds++;
  setMetric("git", "cmds", cmds);
  log("git", "$ git fetch origin");
  await wait(600);

  cmds++;
  setMetric("git", "cmds", cmds);
  log("git", "$ git rebase origin/main");
  await wait(500);

  // F1 — lands, has conflict
  log("git", "  applying F1...");
  moveCommit("g-f1", 90, 140);
  await wait(900);
  document.querySelector("#g-f1")!.classList.add("in-conflict");
  conflicts++;
  setMetric("git", "conflicts", conflicts);
  stops++;
  setMetric("git", "stops", stops);
  log("git", "! CONFLICT in F1 — rebase halted", "warn");
  await wait(1600);
  cmds++;
  setMetric("git", "cmds", cmds);
  log("git", "$ # ...edit files, resolve conflict");
  await wait(700);
  cmds++;
  setMetric("git", "cmds", cmds);
  log("git", "$ git add . && git rebase --continue");
  document.querySelector("#g-f1")!.classList.remove("in-conflict");
  document.querySelector("#g-f1")!.classList.add("resolved");
  await wait(700);

  // F2 — clean
  log("git", "  applying F2...");
  moveCommit("g-f2", 90, 90);
  await wait(900);
  document.querySelector("#g-f2")!.classList.add("resolved");
  log("git", "  F2 applied cleanly", "ok");
  await wait(500);

  // F3 — conflict
  log("git", "  applying F3...");
  moveCommit("g-f3", 90, 40);
  await wait(900);
  document.querySelector("#g-f3")!.classList.add("in-conflict");
  conflicts++;
  setMetric("git", "conflicts", conflicts);
  stops++;
  setMetric("git", "stops", stops);
  log("git", "! CONFLICT in F3 — rebase halted", "warn");
  await wait(1600);
  cmds++;
  setMetric("git", "cmds", cmds);
  log("git", "$ # ...edit files, resolve conflict");
  await wait(700);
  cmds++;
  setMetric("git", "cmds", cmds);
  log("git", "$ git add . && git rebase --continue");
  document.querySelector("#g-f3")!.classList.remove("in-conflict");
  document.querySelector("#g-f3")!.classList.add("resolved");
  await wait(500);

  log("git", "✓ rebase complete", "ok");
  btn.disabled = false;
  btn.textContent = "↻ Run again";
}

async function runJJ() {
  const btn = document.querySelector<HTMLButtonElement>('.play[data-race="jj"]')!;
  btn.disabled = true;
  resetRace("j");
  await wait(300);

  document.querySelector("#jj-graph")!.classList.add("done");

  setMetric("jj", "cmds", 1);
  log("jj", "$ jj git fetch");
  await wait(500);

  setMetric("jj", "cmds", 2);
  log("jj", "$ jj rebase -d main");
  await wait(400);

  // All three move together
  moveCommit("j-f1", 90, 140);
  moveCommit("j-f2", 90, 90);
  moveCommit("j-f3", 90, 40);
  await wait(900);

  // Conflicts are committed inline
  document.querySelector("#j-f1")!.classList.add("in-conflict");
  document.querySelector("#j-f3")!.classList.add("in-conflict");
  document.querySelector("#j-f2")!.classList.add("resolved");
  setMetric("jj", "conflicts", 2);
  log("jj", "  F1: conflicts recorded in commit");
  log("jj", "  F2: applied cleanly", "ok");
  log("jj", "  F3: conflicts recorded in commit");
  await wait(600);
  log("jj", "✓ rebase complete — resolve conflicts when convenient", "ok");

  btn.disabled = false;
  btn.textContent = "↻ Run again";
}

document.querySelector('.play[data-race="git"]')!.addEventListener("click", () => {
  runGit().catch(console.error);
});
document.querySelector('.play[data-race="jj"]')!.addEventListener("click", () => {
  runJJ().catch(console.error);
});

// === WORKING COPY DEMO ===
let wcGitCount = 0,
  wcJjCount = 0;

const $ = (id: string) => document.querySelector(`#${id}`)!;
const $btn = (id: string) => document.querySelector<HTMLButtonElement>(`#${id}`)!;
function setWc(state: string) {
  $("chip-wt").classList.toggle("show", state === "wt" || state === "idx" || state === "head");
  $("chip-idx").classList.toggle("show", state === "idx" || state === "head");
  $("chip-head").classList.toggle("show", state === "head");
  $("wc-wt").classList.toggle("has-file", state === "wt" || state === "idx" || state === "head");
  $("wc-idx").classList.toggle("has-file", state === "idx" || state === "head");
  $("wc-head").classList.toggle("has-file", state === "head");

  $("chip-jj").classList.toggle("show", state !== "idle");
  $("wc-jj-at").classList.toggle("has-file", state !== "idle");

  $btn("wc-edit").disabled = state !== "idle";
  $btn("wc-add").disabled = state !== "wt";
  $btn("wc-commit").disabled = state !== "idx";
}

$("wc-edit").addEventListener("click", () => {
  wcGitCount++;
  wcJjCount++;
  $("wc-git-count").textContent = String(wcGitCount);
  $("wc-jj-count").textContent = String(wcJjCount);
  setWc("wt");
});
$("wc-add").addEventListener("click", () => {
  wcGitCount++;
  $("wc-git-count").textContent = String(wcGitCount);
  setWc("idx");
});
$("wc-commit").addEventListener("click", () => {
  wcGitCount++;
  $("wc-git-count").textContent = String(wcGitCount);
  setWc("head");
});
$("wc-reset").addEventListener("click", () => {
  wcGitCount = 0;
  wcJjCount = 0;
  $("wc-git-count").textContent = String(0);
  $("wc-jj-count").textContent = String(0);
  setWc("idle");
});
setWc("idle");

// === BAR CHART (animate on scroll-into-view) ===
const chart = $("steps-chart");
const fillChart = () =>
  chart.querySelectorAll<HTMLElement>(".fill").forEach((f) => {
    f.style.width = f.dataset["w"] + "%";
  });
const chartObs = new IntersectionObserver(
  (entries, obs) => {
    if (entries.some((e) => e.isIntersecting)) {
      fillChart();
      obs.disconnect();
    }
  },
  { threshold: 0.05 },
);
chartObs.observe(chart);
// Failsafe if observer never fires (e.g. tab restored already past the chart)
setTimeout(() => {
  if (chart.querySelector<HTMLElement>(".fill")!.style.width === "") fillChart();
}, 2500);
