import { arrowMarkers, connect, labelBox, $, type Box } from "/_kit/viz.js";

// --- §2 rails pipeline: define each node once, derive arrows from geometry ---
const N = {
  uin:  { x:8,   y:92,  w:120, h:72 },
  inr:  { x:188, y:64,  w:168, h:128 },
  llm:  { x:412, y:92,  w:136, h:72 },
  outr: { x:604, y:64,  w:168, h:128 },
  uout: { x:832, y:92,  w:120, h:72 },
} satisfies Record<string, Box>;
type NodeKey = keyof typeof N;
const lab = (n: Box, html: string) => labelBox(n, `<div class="nlab">${html}</div>`);

$("#railflow")!.innerHTML = `
  ${arrowMarkers()}
  ${([["uin","inr"],["inr","llm"],["llm","outr"],["outr","uout"]] satisfies [NodeKey, NodeKey][])
      .map(([a,b]) => `<path d="${connect(N[a], N[b])}" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#ah-accent)"/>`)
      .join("")}

  <rect x="${N.uin.x}" y="${N.uin.y}" width="${N.uin.w}" height="${N.uin.h}" rx="12" class="node"/>
  ${lab(N.uin, `<div class="kick">user</div><div class="ttl">Prompt</div><div class="sub">what the user sent</div>`)}

  <rect x="${N.inr.x}" y="${N.inr.y}" width="${N.inr.w}" height="${N.inr.h}" rx="14" class="node rail railband"/>
  ${lab(N.inr, `<div class="kick">on the way in</div><div class="ttl acc">Input rails</div><div class="sub">look at the input · allow / transform / block</div>`)}

  <rect x="${N.llm.x}" y="${N.llm.y}" width="${N.llm.w}" height="${N.llm.h}" rx="12" class="node model"/>
  ${lab(N.llm, `<div class="kick">nemotron</div><div class="ttl mod">The model</div><div class="sub">only sees vetted input</div>`)}

  <rect x="${N.outr.x}" y="${N.outr.y}" width="${N.outr.w}" height="${N.outr.h}" rx="14" class="node rail railband"/>
  ${lab(N.outr, `<div class="kick">on the way out</div><div class="ttl acc">Output rails</div><div class="sub">look at the output · allow / transform / block</div>`)}

  <rect x="${N.uout.x}" y="${N.uout.y}" width="${N.uout.w}" height="${N.uout.h}" rx="12" class="node"/>
  ${lab(N.uout, `<div class="kick">user</div><div class="ttl">Reply</div><div class="sub">what the user gets back</div>`)}
`;
