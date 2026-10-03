  import { arrowMarkers, side, vizAudit } from "/_kit/viz.js";

  /* ── Figure 1 · word-embedding parallelogram: ONE reusable "royalty" direction ── */
  (() => {
    const host = document.getElementById("fig-embed");
    if (!host) return;
    // data units → px: man(1,1) king(1,3) woman(3,1) queen(3,3)
    const PL = 72, PB = 64, PT = 34, W = 520, H = 360, VH = 404;
    const plotW = W - PL - 40, plotH = H - PT - PB, DMAX = 4;
    const sx = (d: number) => PL + (d / DMAX) * plotW;
    const sy = (d: number) => (H - PB) - (d / DMAX) * plotH;
    const P: Record<"man" | "king" | "woman" | "queen", [number, number]> = {
      man: [sx(1), sy(1)], king: [sx(1), sy(3)],
      woman: [sx(3), sy(1)], queen: [sx(3), sy(3)],
    };
    const dot = ([x, y]: [number, number]) => `<circle cx="${x}" cy="${y}" r="5" style="fill:var(--text)"/>`;
    host.innerHTML = `
      <svg viewBox="0 0 ${W} ${VH}" width="${W}" role="img"
           aria-label="Word-embedding scatter: the move from man to king is the same move as woman to queen — the reusable royalty direction — which is why king minus man plus woman lands on queen">
        ${arrowMarkers()}
        <!-- axes -->
        <line x1="${PL}" y1="${H - PB}" x2="${W - 40}" y2="${H - PB}" stroke="var(--border)" stroke-width="1.5" marker-end="url(#ah)"/>
        <line x1="${PL}" y1="${H - PB}" x2="${PL}" y2="${PT}" stroke="var(--border)" stroke-width="1.5" marker-end="url(#ah)"/>
        <text x="${PL + plotW / 2}" y="${H - 22}" text-anchor="middle" font-size="11.5" style="fill:var(--muted)">gender:  male → female</text>
        <text transform="translate(20,${PT + plotH / 2}) rotate(-90)" text-anchor="middle" font-size="11.5" style="fill:var(--muted)">status:  commoner → royal</text>
        <!-- faint secondary "gender" arrows — same horizontal move, top & bottom (completes the parallelogram) -->
        <line x1="${P.man[0] + 8}" y1="${P.man[1]}" x2="${P.woman[0] - 8}" y2="${P.woman[1]}" stroke="var(--muted)" stroke-width="1.4" stroke-dasharray="5 4" opacity="0.55" marker-end="url(#ah)"/>
        <line x1="${P.king[0] + 8}" y1="${P.king[1]}" x2="${P.queen[0] - 8}" y2="${P.queen[1]}" stroke="var(--muted)" stroke-width="1.4" stroke-dasharray="5 4" opacity="0.55" marker-end="url(#ah)"/>
        <text x="${(P.king[0] + P.queen[0]) / 2}" y="${P.king[1] - 9}" text-anchor="middle" font-size="10.5" style="fill:var(--muted)">same "gender" move</text>
        <!-- TWIN royalty arrows: the identical move man→king and woman→queen, same color, same label -->
        <line x1="${P.man[0]}" y1="${P.man[1] - 8}" x2="${P.king[0]}" y2="${P.king[1] + 8}" stroke="var(--accent)" stroke-width="2.4" marker-end="url(#ah-accent)"/>
        <line x1="${P.woman[0]}" y1="${P.woman[1] - 8}" x2="${P.queen[0]}" y2="${P.queen[1] + 8}" stroke="var(--accent)" stroke-width="2.4" marker-end="url(#ah-accent)"/>
        <text x="${P.man[0] + 10}" y="${(P.man[1] + P.king[1]) / 2}" text-anchor="start" font-size="11.5" font-weight="700" style="fill:var(--accent)">+ royalty</text>
        <text x="${P.woman[0] + 10}" y="${(P.woman[1] + P.queen[1]) / 2}" text-anchor="start" font-size="11.5" font-weight="700" style="fill:var(--accent)">+ royalty</text>
        ${dot(P.man)}${dot(P.king)}${dot(P.woman)}${dot(P.queen)}
        <text x="${P.man[0] - 8}" y="${P.man[1] + 4}" text-anchor="end" font-size="13" style="fill:var(--text)">man</text>
        <text x="${P.king[0] - 8}" y="${P.king[1] + 4}" text-anchor="end" font-size="13" style="fill:var(--text)">king</text>
        <text x="${P.woman[0] + 8}" y="${P.woman[1] + 4}" text-anchor="start" font-size="13" style="fill:var(--text)">woman</text>
        <text x="${P.queen[0] + 8}" y="${P.queen[1] + 4}" text-anchor="start" font-size="13" style="fill:var(--text)">queen</text>
        <!-- arithmetic annotation, below the plot -->
        <text x="${W / 2}" y="386" text-anchor="middle" font-size="12.5" style="fill:var(--muted)">king − man = the <tspan style="fill:var(--accent)" font-weight="700">"royalty" direction</tspan>  →  woman + that = <tspan style="fill:var(--text)" font-weight="700">queen</tspan></text>
      </svg>`;
  })();

  /* ── Figure 3 · hybrid fusion (two rankings → RRF) ── */
  (() => {
    const host = document.getElementById("fig-hybrid");
    if (!host) return;
    const semantic = ["A", "B", "C", "D"]; // vector ranking
    const keyword  = ["C", "A", "B", "D"]; // BM25 ranking
    const fused    = ["A", "C", "B", "D"]; // RRF result
    const color: Record<string, string> = { A: "#58a6ff", B: "#bc8cff", C: "#4ec9b0", D: "#d29922" };
    const boxW = 120, boxH = 38, leftX = 24, midX = 260, rightX = 496;
    const rowY = (i: number) => 44 + i * 52;
    const node = (x: number, order: string[], ch: string) => ({ x, y: rowY(order.indexOf(ch)), w: boxW, h: boxH });
    const pal = { "ah-A": color["A"]!, "ah-B": color["B"]!, "ah-C": color["C"]!, "ah-D": color["D"]! };

    const cols: { x: number; order: string[]; head: string; strong?: boolean }[] = [
      { x: leftX, order: semantic, head: "Semantic (vector)" },
      { x: midX, order: fused, head: "Fused (RRF)", strong: true },
      { x: rightX, order: keyword, head: "Keyword (BM25)" },
    ];

    let boxes = "";
    for (const col of cols) {
      col.order.forEach((ch, i) => {
        const n = { x: col.x, y: rowY(i), w: boxW, h: boxH };
        boxes += `
          <rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="6"
                fill="var(--panel-2)" stroke="${color[ch]}" stroke-width="${col.strong ? 2 : 1.4}"/>
          <text x="${n.x + 12}" y="${n.y + n.h / 2 + 4}" text-anchor="start" font-size="12.5" style="fill:var(--muted)">#${i + 1}</text>
          <text x="${n.x + 40}" y="${n.y + n.h / 2 + 4}" text-anchor="start" font-size="12.5" style="fill:var(--text)">Chunk ${ch}</text>`;
      });
    }

    let lines = "";
    for (const ch of ["A", "B", "C", "D"]) {
      const l = node(leftX, semantic, ch), m = node(midX, fused, ch), r = node(rightX, keyword, ch);
      const a = side(l, "right"), b = side(m, "left"), c = side(r, "left"), d = side(m, "right");
      lines += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${color[ch]}" stroke-width="1.6" opacity="0.75" marker-end="url(#ah-${ch})"/>`;
      lines += `<line x1="${c.x}" y1="${c.y}" x2="${d.x}" y2="${d.y}" stroke="${color[ch]}" stroke-width="1.6" opacity="0.75" marker-end="url(#ah-${ch})"/>`;
    }

    const heads = cols.map(c =>
      `<text x="${c.x + boxW / 2}" y="22" text-anchor="middle" font-size="11.5" font-weight="700"
             style="fill:${c.strong ? "var(--good)" : "var(--accent)"}">${c.head}</text>`).join("");

    host.innerHTML = `
      <svg viewBox="0 0 640 256" width="640" role="img"
           aria-label="Hybrid retrieval: semantic and keyword rankings fused with reciprocal-rank fusion">
        ${arrowMarkers(pal)}
        ${lines}
        ${boxes}
        ${heads}
      </svg>`;
  })();

  vizAudit();
