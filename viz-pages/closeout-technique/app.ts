import type { Api } from "./common.js";
import { initMove } from "./tab-move.js";
import { initCushion } from "./tab-cushion.js";
import { initSide } from "./tab-side.js";
import { initFeet } from "./tab-feet.js";
import { initD3 } from "./tab-d3.js";
import { initSandbox } from "./tab-sandbox.js";
import { initTeam } from "./tab-team.js";
import { initRead } from "./tab-read.js";
import { initDrill } from "./tab-drill.js";

/* ---------------- TABS ---------------- */
const safe = (fn: (root: HTMLElement) => Api, el: HTMLElement | null) => {
  try {
    return fn(el!);
  } catch (e) {
    console.error("tab init failed:", e);
    return null;
  }
};
const inits: Record<string, Api | null> = {
  move: safe(initMove, document.querySelector("#tab-move")),
  cushion: safe(initCushion, document.querySelector("#tab-cushion")),
  side: safe(initSide, document.querySelector("#tab-side")),
  feet: safe(initFeet, document.querySelector("#tab-feet")),
  d3: safe(initD3, document.querySelector("#tab-d3")),
  sandbox: safe(initSandbox, document.querySelector("#tab-sandbox")),
  drill: safe(initDrill, document.querySelector("#tab-drill")),
  read: safe(initRead, document.querySelector("#tab-read")),
  team: safe(initTeam, document.querySelector("#tab-team")),
};
document.querySelector("#tabs")!.addEventListener("click", (e) => {
  const b = e.target instanceof Element ? e.target.closest<HTMLElement>("button[data-tab]") : null;
  if (!b) return;
  const id = b.dataset["tab"]!;
  document.querySelectorAll("#tabs button").forEach((x) => {
    x.classList.toggle("active", x === b);
  });
  document.querySelectorAll(".tab").forEach((s) => {
    s.classList.toggle("active", s.id === "tab-" + id);
  });
  Object.entries(inits).forEach(([k, api]) => {
    if (k !== id && api && api.onHide) api.onHide();
  });
  const cur = inits[id];
  if (cur && cur.onShow) cur.onShow();
});
