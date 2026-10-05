export {};

// ---- model: the one user's identifiers ----
const PRIMARY = "jdoe";
const ALTS = ["j.doe@example.com", "doe123", "80055512"];
const ALL_OWNED = new Set([PRIMARY, ...ALTS]);
const CHIPS: { v: string; label: string; bad?: boolean }[] = [
  { v: "jdoe", label: "jdoe (primary)" },
  { v: "j.doe@example.com", label: "j.doe@example.com" },
  { v: "doe123", label: "doe123" },
  { v: "80055512", label: "80055512 (member #)" },
  { v: "hacker99", label: "hacker99 (nobody's)", bad: true },
];

const typed = document.querySelector<HTMLInputElement>("#typed")!;
const scimEl = document.querySelector("#scim")!;
const verdictEl = document.querySelector("#verdict")!;
const chipsEl = document.querySelector("#chips")!;
const idRows = document.querySelector("#idRows")!;
const pkt = document.querySelector("#pkt")!;
const acctBox = document.querySelector("#acctBox")!;

// build chips
CHIPS.forEach((c) => {
  const b = document.createElement("button");
  b.className = "chip" + (c.bad ? " bad" : "");
  b.textContent = c.label;
  b.addEventListener("click", () => {
    typed.value = c.v;
    render();
  });
  chipsEl.append(b);
});

// build the left identifier rows in SVG
const rowYs: Record<string, number> = {};
CHIPS.forEach((c, i) => {
  const y = 56 + i * 56;
  rowYs[c.v] = y + 19;
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.dataset["v"] = c.v;
  g.innerHTML =
    `<rect x="20" y="${y}" width="240" height="38" rx="8" fill="#161b22" stroke="${c.bad ? "#f85149" : "#30363d"}" ${c.bad ? 'stroke-dasharray="4 3"' : ""}/>` +
    `<text class="mono" x="34" y="${y + 23}" fill="${c.bad ? "#f85149" : "#e6edf3"}">${c.v}</text>`;
  idRows.append(g);
  // edge from row to SCIM node
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", `M260,${y + 19} C282,${y + 19} 282,210 300,210`);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#30363d");
  path.setAttribute("stroke-width", "1.5");
  path.setAttribute("marker-end", "url(#ar)");
  path.dataset["edgeFor"] = c.v;
  idRows.append(path);
});
// edge SCIM -> account
const outEdge = document.createElementNS("http://www.w3.org/2000/svg", "path");
outEdge.setAttribute("d", "M450,210 H560");
outEdge.setAttribute("fill", "none");
outEdge.setAttribute("stroke", "#30363d");
outEdge.setAttribute("stroke-width", "2");
outEdge.setAttribute("marker-end", "url(#ar)");
idRows.append(outEdge);

function esc(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
}

let animToken = 0;
function render() {
  const val = typed.value.trim();
  const hit = ALL_OWNED.has(val) && val.length > 0;

  // SCIM string
  scimEl.innerHTML =
    `<span class="kw">GET</span> /environments/{env}/users\n  ?filter=` +
    `<span class="attr">username</span> <span class="kw">eq</span> <span class="val">"${esc(val)}"</span>\n` +
    `         <span class="kw">or</span> <span class="attr">alternateLoginIds</span> <span class="kw">eq</span> <span class="val">"${esc(val)}"</span>`;

  // verdict
  if (!val) {
    verdictEl.className = "verdict";
    verdictEl.textContent = "Type or pick an identifier…";
  } else if (hit) {
    verdictEl.className = "verdict match";
    verdictEl.textContent = `✓ Resolved → 1 account (jdoe). Matched on ${val === PRIMARY ? "primary username" : "alternateLoginIds[]"}.`;
  } else {
    verdictEl.className = "verdict miss";
    verdictEl.textContent = "✗ No match — 0 results. Login rejected.";
  }

  // highlight rows + edges
  [...idRows.querySelectorAll<SVGGElement>("g[data-v]")].forEach((g) => {
    const rect = g.querySelector("rect")!;
    const on = g.dataset["v"] === val;
    rect.setAttribute(
      "stroke",
      on ? (hit ? "#3fb950" : "#f85149") : g.dataset["v"] === "hacker99" ? "#f85149" : "#30363d",
    );
    rect.setAttribute("stroke-width", on ? "2.5" : "1.5");
  });
  [...idRows.querySelectorAll<SVGPathElement>("path[data-edge-for]")].forEach((p) => {
    const on = p.dataset["edgeFor"] === val;
    p.setAttribute("stroke", on ? (hit ? "#3fb950" : "#f85149") : "#30363d");
    p.setAttribute("stroke-width", on ? "2.5" : "1.5");
    p.setAttribute("marker-end", on && hit ? "url(#arM)" : "url(#ar)");
  });
  acctBox.setAttribute("stroke", hit ? "#3fb950" : "#30363d");
  outEdge.setAttribute("stroke", hit ? "#3fb950" : "#30363d");
  outEdge.setAttribute("marker-end", hit ? "url(#arM)" : "url(#ar)");

  animate(val, hit);
}

function animate(val: string, hit: boolean) {
  const token = ++animToken;
  const startY = rowYs[val];
  if (startY === undefined) {
    pkt.setAttribute("opacity", "0");
    return;
  }

  // leg 1: row -> SCIM node, leg 2 (only on hit): SCIM -> account
  const legs = [{ x0: 260, y0: startY, x1: 375, y1: 210 }];
  if (hit) legs.push({ x0: 450, y0: 210, x1: 652, y1: 210 });

  pkt.setAttribute("fill", hit ? "#3fb950" : "#f85149");
  let li = 0;
  function runLeg() {
    if (token !== animToken) return;
    const leg = legs[li]!;
    const start = performance.now(),
      ms = 600;
    function frame(now: number) {
      if (token !== animToken) return;
      const t = Math.min(1, (now - start) / ms);
      pkt.setAttribute("cx", String(leg.x0 + (leg.x1 - leg.x0) * t));
      pkt.setAttribute("cy", String(leg.y0 + (leg.y1 - leg.y0) * t));
      pkt.setAttribute("opacity", "1");
      if (t < 1) requestAnimationFrame(frame);
      else if (++li < legs.length) runLeg();
      else if (!hit) pkt.setAttribute("opacity", "0");
    }
    requestAnimationFrame(frame);
  }
  runLeg();
}

typed.addEventListener("input", render);
render();
