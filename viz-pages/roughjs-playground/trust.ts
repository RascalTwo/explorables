// Flagship 1 — a "trust dashboard": the same metric (daily orders) measured six different ways.
// Roughness is the data-quality channel: shaky pen = low-trust source. Sources below the
// trust threshold are excluded from the consensus KPI, and the tiles' own roughness follows
// the average quality of what's left.
import { gen, sk, svgEl, h, P, boil, type Pt } from "./rk.js";
import { ink, clamp, txt, mark, mkSvg, rangeCtl, selectCtl, btn, readout } from "./ui.js";

interface Src {
  name: string;
  base: number;
  noise: number;
  completeness: number;
  freshHrs: number;
  accuracy: number;
}
const SOURCES: Src[] = [
  { name: "Payments API", base: 120, noise: 5, completeness: 0.99, freshHrs: 0.2, accuracy: 0.98 },
  { name: "Warehouse DB", base: 118, noise: 8, completeness: 0.97, freshHrs: 6, accuracy: 0.95 },
  { name: "Web analytics", base: 131, noise: 14, completeness: 0.9, freshHrs: 2, accuracy: 0.82 },
  { name: "CRM export", base: 109, noise: 12, completeness: 0.84, freshHrs: 24, accuracy: 0.78 },
  { name: "Support tickets", base: 95, noise: 20, completeness: 0.7, freshHrs: 12, accuracy: 0.55 },
  {
    name: "Manual spreadsheet",
    base: 152,
    noise: 28,
    completeness: 0.55,
    freshHrs: 72,
    accuracy: 0.35,
  },
];
const DAYS = 30;

// deterministic PRNG so the "data" is the same on every load
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    // oxlint-disable-next-line unicorn/prefer-math-trunc -- the bitwise-or wraps to int32 on purpose (the generator's arithmetic depends on it); Math.trunc would not wrap
    a |= 0;
    // oxlint-disable-next-line unicorn/prefer-math-trunc -- the bitwise-or wraps to int32 on purpose (the generator's arithmetic depends on it); Math.trunc would not wrap
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** 30 daily values per source; `null` = a missing day (probability 1 − completeness at generation). */
const SERIES: Array<Array<number | null>> = SOURCES.map((s, si) => {
  const r = mulberry32(1000 + si * 77);
  return Array.from({ length: DAYS }, (_, d) => {
    const v = s.base * (1 + 0.14 * Math.sin(d / 4.6 + si)) + (r() * 2 - 1) * s.noise;
    return r() > s.completeness ? null : Math.round(v);
  });
});

const fresh = (hrs: number): number => clamp(1 - hrs / 72, 0, 1);
const quality = (s: Src): number =>
  0.4 * s.completeness + 0.25 * fresh(s.freshHrs) + 0.35 * s.accuracy;
const rOf = (q: number): number => 5.5 * Math.pow(1 - q, 1.3); // quality → roughness
const mean7 = (vals: Array<number | null>): number => {
  const last = vals.slice(-7).filter((v): v is number => v !== null);
  return last.length > 0 ? last.reduce((a, b) => a + b, 0) / last.length : Number.NaN;
};

export function sceneTrust(box: HTMLElement): () => void {
  const bar = h("div", "toolbar", "", box);
  let minTrust = 45,
    sortBy = "quality",
    sel = 0;
  const outage = new Set<string>();
  rangeCtl(
    bar,
    "min trust",
    0,
    100,
    1,
    minTrust,
    (v) => {
      minTrust = v;
      draw();
    },
    (v) => `${v}%`,
  );
  selectCtl(bar, "sort by", ["quality", "name", "latest value"], sortBy, (v) => {
    sortBy = v;
    draw();
  });
  btn(bar, "⚡ simulate outage", () => {
    const pool = SOURCES.filter((s) => !outage.has(s.name));
    if (pool.length > 0) outage.add(pool[Math.floor(Math.random() * pool.length)]!.name);
    draw();
  });
  btn(bar, "restore", () => {
    outage.clear();
    draw();
  });
  const info = readout(bar);
  info.textContent = "click a source to drill in";
  const svg = mkSvg(box);

  /** Effective source after any simulated outage: stale by 36 h and 15 pts less complete. */
  const eff = (s: Src): Src =>
    outage.has(s.name)
      ? { ...s, freshHrs: s.freshHrs + 36, completeness: Math.max(0.2, s.completeness - 0.15) }
      : s;

  function draw(): void {
    svg.replaceChildren();
    const rows = SOURCES.map((raw, i) => {
      const s = eff(raw);
      return { i, s, q: quality(s), m: mean7(SERIES[i]!), out: outage.has(raw.name) };
    });
    rows.sort((a, b) =>
      sortBy === "quality"
        ? b.q - a.q
        : sortBy === "name"
          ? a.s.name.localeCompare(b.s.name)
          : b.m - a.m,
    );
    const included = rows.filter((r) => r.q * 100 >= minTrust && Number.isFinite(r.m));
    const sumQ = included.reduce((a, r) => a + r.q, 0);
    const consensus = sumQ ? included.reduce((a, r) => a + r.q * r.m, 0) / sumQ : Number.NaN;
    const means = included.map((r) => r.m);
    const spread = means.length > 1 ? (Math.max(...means) - Math.min(...means)) / 2 : 0;
    const avgQ = included.length > 0 ? sumQ / included.length : 0;

    txt(svg, 24, 32, "Daily orders, measured six ways — the pen shows how far to trust each", {
      size: 24,
      weight: 700,
    });

    // ── rows: name · 30-day sparkline · quality meter ──
    const RX = 24,
      RY = 52,
      RH = 60,
      RW = 570;
    rows.forEach((r, k) => {
      const y = RY + k * RH;
      const on = r.q * 100 >= minTrust;
      const rr = rOf(r.q);
      const g = mark(
        svg,
        `src-${r.s.name}`,
        `${r.s.name}: quality ${(r.q * 100).toFixed(0)}%, last-7-day mean ${Math.round(r.m)}${on ? "" : " (excluded)"}`,
      );
      g.setAttribute("class", "hoverable");
      g.style.opacity = on ? "1" : "0.42";
      sk(
        g,
        gen.rectangle(RX, y, RW, RH - 8, {
          seed: 10 + r.i + boil,
          roughness: on ? 0.9 : 2.4,
          stroke: sel === r.i ? P.c4 : "#b9b3a3",
          strokeWidth: sel === r.i ? 3.2 : 1.6,
          ...(sel === r.i ? { fill: "#f3f2ff", fillStyle: "solid" } : {}),
        }),
      );
      txt(g, RX + 12, y + 26, r.s.name, { size: 24, weight: 700 });
      txt(
        g,
        RX + 12,
        y + 44,
        r.out
          ? "⚡ outage: stale + gaps"
          : `${r.s.freshHrs < 1 ? "<1" : Math.round(r.s.freshHrs)} h old`,
        { size: 16, fill: r.out ? P.c6 : P.muted, mono: false },
      );
      // sparkline: fixed 40–200 domain so sources are comparable
      const sx = (d: number): number => RX + 190 + (d / (DAYS - 1)) * 210;
      const sy = (v: number): number => y + RH - 16 - ((clamp(v, 40, 200) - 40) / 160) * 38;
      const vals = SERIES[r.i]!;
      let seg: Pt[] = [];
      const flush = (): void => {
        if (seg.length > 1)
          sk(
            g,
            gen.linearPath(seg, {
              seed: 50 + r.i + boil,
              roughness: rr,
              stroke: P.c1,
              strokeWidth: 2.2,
              bowing: 1 + rr * 0.2,
            }),
          );
        else if (seg.length === 1)
          sk(
            g,
            gen.circle(seg[0]![0], seg[0]![1], 5, {
              seed: 60 + r.i,
              roughness: rr,
              stroke: P.c1,
              strokeWidth: 2,
            }),
          );
        seg = [];
      };
      vals.forEach((v, d) => {
        if (v === null) {
          flush();
          sk(
            g,
            gen.line(sx(d) - 2, y + RH - 12, sx(d) + 2, y + RH - 12, {
              seed: 70 + d,
              roughness: 0,
              stroke: P.c6,
              strokeWidth: 2,
            }),
          );
        } else seg.push([sx(d), sy(v)]);
      });
      flush();
      txt(g, RX + 408, y + 34, String(Math.round(r.m)), { size: 26, weight: 700, anchor: "start" });
      // quality meter: bar length = quality
      sk(
        g,
        gen.rectangle(RX + 456, y + 12, 84, 16, {
          seed: 80 + r.i + boil,
          roughness: rr,
          stroke: ink,
          strokeWidth: 1.6,
          fill: r.q > 0.8 ? P.c2 : r.q > 0.55 ? P.c3 : P.c6,
          fillStyle: "hachure",
          hachureGap: 4,
        }),
      );
      svgEl(
        "rect",
        {
          x: RX + 456 + 84 * r.q,
          y: y + 11,
          width: 84 * (1 - r.q) + 2,
          height: 18,
          fill: "#fff",
          "fill-opacity": 0.85,
        },
        g,
      );
      txt(g, RX + 456, y + 46, `quality ${(r.q * 100).toFixed(0)}%`, { size: 17, fill: P.muted });
      g.addEventListener("click", () => {
        sel = r.i;
        draw();
      });
      g.addEventListener("pointerenter", () => {
        info.textContent = `${r.s.name}: quality ${(r.q * 100).toFixed(0)}% → roughness ${rr.toFixed(1)}${on ? "" : " · excluded below min trust"}`;
      });
    });
    txt(
      svg,
      RX,
      RY + 6 * RH + 14,
      "crisp line = trustworthy · shaky line = low quality · red ticks = missing days · bar = quality score",
      { size: 18, fill: P.muted },
    );
    txt(
      svg,
      RX,
      RY + 6 * RH + 38,
      "Faded rows fall below the min-trust slider and are left out of the consensus.",
      { size: 18, fill: P.muted },
    );

    // ── KPI tiles ── (their pen is as shaky as the average trust of the sources behind them)
    const TX = 620,
      TW = 260;
    const kr = rOf(avgQ || 0.2);
    const tile = (i: number, title: string, value: string, sub: string): void => {
      const y = 50 + i * 68;
      const g = mark(svg, `kpi-${i}`, `${title}: ${value}`);
      sk(
        g,
        gen.rectangle(TX, y, TW, 58, {
          seed: 200 + i + boil,
          roughness: kr,
          stroke: ink,
          strokeWidth: 2.4,
          fill: "#fff8e1",
          fillStyle: "hachure",
          hachureGap: 12,
          fillWeight: 0.7,
        }),
      );
      svgEl(
        "rect",
        {
          x: TX + 8,
          y: y + 6,
          width: TW - 16,
          height: 46,
          rx: 4,
          fill: "#fff",
          "fill-opacity": 0.9,
        },
        g,
      );
      txt(g, TX + 16, y + 26, title, { size: 17, fill: P.muted });
      txt(g, TX + 16, y + 48, value, { size: 26, weight: 700 });
      txt(g, TX + TW - 14, y + 48, sub, { size: 17, anchor: "end", fill: P.muted });
    };
    tile(
      0,
      "consensus orders / day (7-day)",
      Number.isFinite(consensus) ? consensus.toFixed(1) : "—",
      `pen roughness ${kr.toFixed(1)}`,
    );
    tile(
      1,
      "disagreement between sources",
      Number.isFinite(consensus) ? `± ${spread.toFixed(1)}` : "—",
      included.length > 1 ? "half of max−min" : "n/a",
    );
    tile(
      2,
      "sources trusted",
      `${included.length} / ${SOURCES.length}`,
      `avg quality ${(avgQ * 100).toFixed(0)}%`,
    );

    // ── drill-down: selected source in detail ──
    const s = rows.find((r) => r.i === sel) ?? rows[0]!;
    const DY = 270;
    const dg = mark(svg, "drill", `Drill-down: ${s.s.name}`);
    txt(dg, TX, DY, s.s.name, { size: 28, weight: 700 });
    const CX0 = TX,
      CX1 = TX + TW,
      CY0 = DY + 100,
      CY1 = DY + 26;
    sk(
      dg,
      gen.line(CX0, CY0, CX1, CY0, { seed: 300, roughness: 0.6, stroke: ink, strokeWidth: 1.6 }),
    );
    const vals = SERIES[s.i]!;
    const dx = (d: number): number => CX0 + 6 + (d / (DAYS - 1)) * (TW - 12);
    const dy = (v: number): number => CY0 - 6 - ((clamp(v, 40, 200) - 40) / 160) * (CY0 - CY1 - 10);
    const rr = rOf(s.q);
    let prev: Pt | null = null;
    vals.forEach((v, d) => {
      if (v === null) {
        sk(
          dg,
          gen.circle(dx(d), CY0 - 6, 6, {
            seed: 310 + d,
            roughness: 0.3,
            stroke: P.c6,
            strokeWidth: 1.4,
            strokeLineDash: [2, 2],
          }),
        );
        prev = null;
        return;
      }
      const p: Pt = [dx(d), dy(v)];
      if (prev)
        sk(
          dg,
          gen.line(prev[0], prev[1], p[0], p[1], {
            seed: 320 + d + boil,
            roughness: rr,
            stroke: P.c1,
            strokeWidth: 2.4,
          }),
        );
      sk(
        dg,
        gen.circle(p[0], p[1], 6, {
          seed: 330 + d,
          roughness: rr * 0.6,
          stroke: P.c1,
          strokeWidth: 1.6,
          fill: P.c1,
          fillStyle: "solid",
        }),
      );
      prev = p;
    });
    txt(dg, CX0, CY0 + 20, "30 days · dashed ○ = missing", { size: 16, fill: P.muted });
    const meters: Array<[string, number, string]> = [
      ["completeness", s.s.completeness, `${(s.s.completeness * 100).toFixed(0)}%`],
      [
        "freshness",
        fresh(s.s.freshHrs),
        `${s.s.freshHrs < 1 ? "<1" : Math.round(s.s.freshHrs)} h old`,
      ],
      ["accuracy", s.s.accuracy, `${(s.s.accuracy * 100).toFixed(0)}%`],
    ];
    meters.forEach(([label, v, txtv], i) => {
      const y = DY + 134 + i * 30;
      txt(dg, TX, y + 16, label, { size: 19 });
      sk(
        dg,
        gen.rectangle(TX + 108, y, 100 * v + 1, 20, {
          seed: 340 + i + boil,
          roughness: rOf(v),
          stroke: ink,
          strokeWidth: 1.8,
          fill: v > 0.8 ? P.c2 : v > 0.55 ? P.c3 : P.c6,
          fillStyle: "hachure",
          hachureGap: 4,
        }),
      );
      sk(
        dg,
        gen.rectangle(TX + 108, y, 100, 20, {
          seed: 350 + i,
          roughness: 0.4,
          stroke: "#c9c3b3",
          strokeWidth: 1,
          strokeLineDash: [3, 3],
        }),
      );
      txt(dg, TX + 216, y + 16, txtv, { size: 17, fill: P.muted });
    });
    txt(dg, TX, DY + 224, "quality = 0.40·complete + 0.25·fresh", { size: 15, fill: P.muted });
    txt(dg, TX, DY + 240, `+ 0.35·accurate  =  ${(s.q * 100).toFixed(0)}%`, {
      size: 15,
      fill: P.muted,
    });
  }
  draw();
  return draw;
}
