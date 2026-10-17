import { $ } from "@viz/kit";

interface Req {
  id: string;
  label: string;
  cls: string;
  keyPri: number;
  bodyPri: number | null;
}
interface Lane {
  id: string;
  cls: string;
  title: string;
  ep: string;
  how: string;
  flow: [string, string][];
  verdictIdle: string;
}

// The five requests. submit order = array order; blocker is already in the slot.
// keyPri = priority on the API key; bodyPri = priority the caller put in the request body.
const REQS: Req[] = [
  { id: "blocker", label: "blocker", cls: "blocker", keyPri: 100, bodyPri: null },
  { id: "batch1", label: "batch ①", cls: "batch", keyPri: 100, bodyPri: null },
  { id: "batch2", label: "batch ②", cls: "batch", keyPri: 100, bodyPri: null },
  { id: "chat", label: "chat", cls: "chat", keyPri: 0, bodyPri: null },
  { id: "cheat", label: "cheat", cls: "cheat", keyPri: 100, bodyPri: 0 },
];
const eff = (p: number | null): number => p ?? 100; // a missing priority is treated as low (100)

// Drain order per policy. Index 0 is the in-flight blocker (always first). The rest
// queue and are ordered by the policy's priority source; arrival index breaks ties.
function order(policy: string): Req[] {
  const inflight = REQS[0]!;
  const queued = REQS.slice(1).map((r, i) => ({ r, i }));
  let keyFn: (x: { r: Req; i: number }) => [number, number];
  if (policy === "A") keyFn = ({ i }) => [i, 0]; // FIFO — ignores priority
  if (policy === "B") keyFn = ({ r, i }) => [eff(r.bodyPri), i]; // body priority (forgeable)
  if (policy === "C") keyFn = ({ r, i }) => [r.keyPri, i]; // key priority (enforced)
  const cmp = (a: { r: Req; i: number }, b: { r: Req; i: number }): number => {
    const ka = keyFn(a),
      kb = keyFn(b);
    return ka[0] - kb[0] || ka[1] - kb[1];
  };
  return [inflight, ...queued.toSorted(cmp).map((x) => x.r)];
}

const LANES: Lane[] = [
  {
    id: "A",
    cls: "bad",
    title: "A · /v1 + priority in the body",
    ep: "POST /v1/chat/completions",
    how: `You pass <b>{"priority": 0}</b> to the normal endpoint. But <b>/v1 never invokes the scheduler</b> — a concurrency cap just serializes by arrival. Priority is ignored.`,
    flow: [
      ["box", "caller"],
      ["arr", "→"],
      ["box", "LiteLLM /v1"],
      ["arr", "→"],
      ["box", "model"],
    ],
    verdictIdle: "✗ does not order by priority",
  },
  {
    id: "B",
    cls: "bad",
    title: "B · /queue + built-in scheduler",
    ep: "POST /queue/chat/completions",
    how: `The real <b>[beta]</b> feature: a priority heap, drained only under rpm cooldown. But priority is read from the <span style="color:var(--danger)">caller's body</span> — so a batch job sets <b>priority:0</b> and jumps the line.`,
    flow: [
      ["box", "caller"],
      ["tag body", "body: priority"],
      ["arr", "→"],
      ["box", "/queue heap"],
      ["arr", "→"],
      ["box", "model"],
    ],
    verdictIdle: "✗ cheatable · ✗ rpm-flaky",
  },
  {
    id: "C",
    cls: "good",
    title: "C · in-process key gate (ours)",
    ep: "POST /v1/chat/completions",
    how: `A ~35-line hook. A priority semaphore admits the lowest <b>key</b> priority when a slot frees. The body is <span style="color:var(--good)">ignored</span> — a forged <b>priority:0</b> is stamped back to the key's 100.`,
    flow: [
      ["box", "key"],
      ["tag key", "key: priority"],
      ["arr", "→"],
      ["box", "gate /v1"],
      ["arr", "→"],
      ["box", "model"],
    ],
    verdictIdle: "✓ orders by priority · un-cheatable",
  },
];

const lanesEl = $("#lanes")!;
function flowHTML(flow: [string, string][]): string {
  return (
    `<div class="flowrow">` +
    flow
      .map(([t, txt]) =>
        t === "arr"
          ? `<span class="arr">${txt}</span>`
          : t.startsWith("tag")
            ? `<span class="tag ${t.split(" ")[1]}">${txt}</span>`
            : `<span class="box">${txt}</span>`,
      )
      .join("") +
    `</div>`
  );
}
function render() {
  lanesEl.innerHTML = LANES.map(
    (L) => `
    <div class="lane ${L.cls}" data-lane="${L.id}">
      <h3>${L.title}</h3>
      <div class="ep">${L.ep}</div>
      <div class="how">${L.how}</div>
      ${flowHTML(L.flow)}
      <div class="track">
        <div class="slot"><span class="cap">in service · 1 slot</span><span data-slot></span></div>
        <div class="tlabel">waiting</div>
        <div class="queue" data-queue></div>
        <div class="tlabel">served · in order</div>
        <div class="served" data-served></div>
      </div>
      <div class="verdict idle" data-verdict>${L.verdictIdle}</div>
    </div>`,
  ).join("");
}
render();

const chipHTML = (r: Req, extra = ""): string =>
  `<span class="chip ${r.cls} ${extra}" data-viz-id="${r.id}" data-label="${r.label}">${r.label}${r.bodyPri !== null ? `<span class="pin">body:${r.bodyPri}</span>` : ""}</span>`;
const sleep = async (ms: number) => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

let running = false;
async function drop() {
  if (running) return;
  running = true;
  $<HTMLButtonElement>("#drop")!.disabled = true;
  // seed every lane: blocker in slot, the other four waiting (in submit order)
  for (const L of LANES) {
    const lane = lanesEl.querySelector(`[data-lane="${L.id}"]`)!;
    lane.querySelector("[data-slot]")!.innerHTML = "";
    lane.querySelector("[data-served]")!.innerHTML = "";
    lane.querySelector("[data-queue]")!.innerHTML = REQS.slice(1)
      .map((r) => chipHTML(r))
      .join("");
    const v = lane.querySelector("[data-verdict]")!;
    v.className = "verdict idle";
    v.textContent = "running…";
  }
  await sleep(350);
  // animate all three lanes in parallel
  await Promise.all(
    LANES.map(async (L) => {
      await runLane(L);
    }),
  );
  running = false;
  $<HTMLButtonElement>("#drop")!.disabled = false;
}

async function runLane(L: Lane): Promise<void> {
  const lane = lanesEl.querySelector(`[data-lane="${L.id}"]`)!;
  const slot = lane.querySelector("[data-slot]")!;
  const queue = lane.querySelector("[data-queue]")!;
  const served = lane.querySelector("[data-served]")!;
  const seq = order(L.id);
  for (let i = 0; i < seq.length; i++) {
    const r = seq[i]!;
    // pull from queue (if present) into the slot
    queue.querySelector(`[data-viz-id="${r.id}"]`)?.remove();
    slot.innerHTML = chipHTML(r, "inslot");
    // oxlint-disable-next-line no-await-in-loop -- the lane animates one chip at a time, in order
    await sleep(560);
    // move to served with its finishing rank
    slot.innerHTML = "";
    const extra = r.cls === "chat" ? "served-chat" : r.cls === "cheat" ? "served-cheat" : "";
    served.insertAdjacentHTML(
      "beforeend",
      `<span class="chip ${r.cls} ${extra}"><span class="rank">#${i + 1}</span>${r.label}</span>`,
    );
    // oxlint-disable-next-line no-await-in-loop -- the lane animates one chip at a time, in order
    await sleep(120);
  }
  // verdict per lane, computed from where chat & cheat landed
  const chatRank = seq.findIndex((r) => r.id === "chat") + 1;
  const cheatRank = seq.findIndex((r) => r.id === "cheat") + 1;
  const v = lane.querySelector("[data-verdict]")!;
  if (L.id === "A") {
    v.className = "verdict bad";
    v.innerHTML = `✗ FIFO — priority ignored. chat waited its turn (#${chatRank}).`;
  }
  if (L.id === "B") {
    v.className = "verdict bad";
    v.innerHTML = `✗ the cheat forged priority 0 and jumped to #${cheatRank}; chat finished #${chatRank} (last). Forgeable.`;
  }
  if (L.id === "C") {
    v.className = "verdict good";
    v.innerHTML = `✓ chat jumped to #${chatRank}; the cheat's forged 0 was stamped to 100 → #${cheatRank}. Un-cheatable.`;
  }
}

$("#drop")!.addEventListener("click", () => {
  drop().catch(console.error);
});
$("#reset")!.addEventListener("click", () => {
  if (running) return;
  render();
});
