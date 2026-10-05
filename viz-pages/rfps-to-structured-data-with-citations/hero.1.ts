// story-data.json → monster.citedPages (keys). 35 of 275. Regenerate with build-assets.py
// and re-paste; this card is static HTML for the unfurl, so it cannot read the JSON itself.
export const CITED = new Set([
  1, 2, 4, 10, 14, 15, 16, 24, 25, 26, 29, 40, 47, 50, 59, 98, 100, 105, 107, 137, 159, 175, 177,
  178, 184, 185, 195, 217, 218, 223, 224, 225, 226, 230, 233,
]);
const PAGES = 275,
  COLS = 25,
  W = 12,
  H = 15.5,
  GAP = 2.6;
const grid = document.querySelector("#grid");
if (grid)
  grid.innerHTML = Array.from({ length: PAGES }, (_, i) => {
    const hit = CITED.has(i + 1);
    return `<rect x="${(i % COLS) * (W + GAP)}" y="${Math.floor(i / COLS) * (H + GAP)}"
        width="${W}" height="${H}" rx="1.2"
        fill="${hit ? "var(--accent)" : "var(--panel-2)"}"
        ${hit ? 'stroke="var(--accent)" stroke-width="1.6" stroke-opacity=".35"' : ""}
        opacity="${hit ? 1 : 0.55}"/>`;
  }).join("");
