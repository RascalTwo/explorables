// #327 · DB Migration — fill missing schema fields, never clobber the record.
// Single-approach: copy the record, then append any schema key the record lacks.
import { el, esc, mountDebugger } from "../shared.js";

// All 5 official freeCodeCamp cases, in the grader's order. No invented presets —
// the official set already covers every branch: record-only key kept, record
// complete (nothing filled), one gap filled, record-wins + append, wide schema.
const PRESETS = [
  { schema: { username: "", posts: 0 }, record: { verified: true } },
  { schema: { username: "", posts: 0 }, record: { username: "camper", posts: 5 } },
  { schema: { username: "", posts: 0, verified: false }, record: { username: "camper" } },
  { schema: { username: "", posts: 0 }, record: { username: "camper", role: "admin" } },
  {
    schema: { username: "", email: "", posts: 0, verified: false, role: "user", banned: false },
    record: { username: "camper", email: "camper@freecodecamp.org", role: "admin" },
  },
];

function migrate(schema, record) {
  const result = { ...record };
  for (const key in schema) if (!(key in result)) result[key] = schema[key];
  return result;
}

const fmt = (v) => typeof v === "string" ? `"${esc(v)}"` : String(v);

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .dm-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; align-items:start; }
    @media (max-width:640px){ .dm-grid { grid-template-columns:1fr; } }
    .dm-panel { border:1px solid var(--border); border-radius:12px; background:var(--panel); overflow:hidden; }
    .dm-cap { font:700 10px var(--sans); letter-spacing:.08em; text-transform:uppercase; padding:9px 13px;
              border-bottom:1px solid var(--border); color:var(--muted); display:flex; justify-content:space-between; }
    .dm-body { padding:6px 13px 10px; }
    .dm-panel.result { border-color:var(--accent); }
    .dm-panel.result .dm-cap { color:var(--accent); border-color:color-mix(in srgb,var(--accent) 40%,var(--border)); }
    .srow.dm-kept .k { color:var(--good); }
    .srow.dm-fill { background:color-mix(in srgb,var(--accent) 12%,transparent); border-radius:6px;
                    box-shadow:0 0 0 1px color-mix(in srgb,var(--accent) 35%,transparent) inset; }
    .srow.dm-fill .k { color:var(--accent); }
    .dm-src { color:var(--muted); font-size:10px; }
    .dm-badge { font:700 9px var(--sans); letter-spacing:.05em; padding:1px 6px; border-radius:20px;
                text-transform:uppercase; }
    .dm-badge.kept { color:var(--good); border:1px solid color-mix(in srgb,var(--good) 50%,var(--border)); }
    .dm-badge.fill { color:var(--accent); border:1px solid color-mix(in srgb,var(--accent) 50%,var(--border));
                     background:color-mix(in srgb,var(--accent) 14%,transparent); }
    .dm-arrow { text-align:center; font:700 12px var(--mono); color:var(--muted); margin:10px 0 4px; }
  `));
}

function mount(host) {
  ensureStyle();
  let cur = 2;
  const pre = el("div", "controls");
  PRESETS.forEach((p, i) => {
    const label = `record {${Object.keys(p.record).join(", ") || "∅"}}`;
    const c = el("button", "chip", label);
    c.onclick = () => { cur = i; sync(); render(); };
    pre.append(c); p._chip = c;
  });
  const out = el("div");
  host.append(pre, out);
  function sync() { PRESETS.forEach((p, i) => p._chip.classList.toggle("on", i === cur)); }
  sync(); render();

  function kvRows(obj, marker) {
    return Object.entries(obj).map(([k, v]) =>
      `<div class="srow"><span class="mark">${marker}</span><span class="k">${esc(k)}</span><span class="exp">:</span><span class="got mono">${fmt(v)}</span></div>`
    ).join("") || `<div class="srow"><span class="exp">— empty —</span></div>`;
  }

  function render() {
    const { schema, record } = PRESETS[cur];
    const result = migrate(schema, record);
    const inRecord = new Set(Object.keys(record));

    const resRows = Object.entries(result).map(([k, v]) => {
      const kept = inRecord.has(k);
      return `<div class="srow ${kept ? "dm-kept" : "dm-fill"}">
        <span class="mark">${kept ? "✓" : "+"}</span>
        <span class="k">${esc(k)}</span><span class="exp">:</span>
        <span class="got mono">${fmt(v)}</span>
        <span class="dm-badge ${kept ? "kept" : "fill"}" style="margin-left:auto">${kept ? "kept" : "default"}</span>
      </div>`;
    }).join("");

    const filled = Object.keys(schema).filter((k) => !(k in record));

    out.innerHTML = `
      <div class="dm-grid">
        <div class="dm-panel"><div class="dm-cap"><span>schema</span><span class="dm-src">defaults</span></div>
          <div class="dm-body">${kvRows(schema, "·")}</div></div>
        <div class="dm-panel"><div class="dm-cap"><span>record</span><span class="dm-src">incoming</span></div>
          <div class="dm-body">${kvRows(record, "·")}</div></div>
      </div>
      <div class="dm-arrow">▼ &nbsp;copy record, then append only the missing keys&nbsp; ▼</div>
      <div class="dm-panel result"><div class="dm-cap"><span>migrated record</span>
        <span class="dm-src">${Object.keys(record).length} kept · ${filled.length} filled</span></div>
        <div class="dm-body">${resRows}</div></div>
      <div class="note">The merge direction is the whole trick: <b>record wins</b>. Start from a copy of the record so existing values and their order survive, then add each schema key <code class='inl'>!(key in result)</code> — ${filled.length ? `here that appends <b>${filled.map((k) => esc(k)).join(", ")}</b>.` : `here the record already has every field, so nothing is added.`}</div>`;
  }
}

// ── STEP — the real migrate() on the shared debugger (single loop frame) ──────
// One call frame: `result` starts as a copy of the record (struct seeded), then
// grows only where a schema key is missing. `key` lives only inside the for-in
// loop, so it's absent from vars before and after (scope by omission).
const dFmtV = (v) => (typeof v === "string" ? `"${v}"` : String(v));
const dFmtObj = (o) => {
  const e = Object.entries(o);
  return e.length ? "{ " + e.map(([k, v]) => `${k}: ${dFmtV(v)}`).join(", ") + " }" : "{}";
};

// All 5 official freeCodeCamp cases (same set as PRESETS above), each labelled
// with the rule it demonstrates. Case 4 is the one that shows all three claims at
// once: a record key absent from the schema survives, the record wins the shared
// key, and the filled default lands LAST — so key ORDER is record-first.
const CASES = [
  { label: `extra field kept`, schema: { username: "", posts: 0 }, record: { verified: true } },
  { label: `record already complete`, schema: { username: "", posts: 0 }, record: { username: "camper", posts: 5 } },
  { label: `one gap filled`, schema: { username: "", posts: 0, verified: false }, record: { username: "camper" } },
  { label: `record wins, order survives`, schema: { username: "", posts: 0 }, record: { username: "camper", role: "admin" } },
  {
    label: `wide schema, partial record`,
    schema: { username: "", email: "", posts: 0, verified: false, role: "user", banned: false },
    record: { username: "camper", email: "camper@freecodecamp.org", role: "admin" },
  },
];

const SRC = [
  { ln: 1, html: `<span class="k">function</span> <span class="fn">migrateRecord</span>(schema, record) {` },
  { ln: 2, html: `  <span class="k">const</span> result = <span class="tok" data-t="copy">{ ...record }</span>;` },
  { ln: 3, html: `  <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="forkey">key</span> <span class="k">in</span> schema) {` },
  { ln: 4, html: `    <span class="k">if</span> (<span class="tok" data-t="cond">!(key <span class="k">in</span> result)</span>)` },
  { ln: 5, html: `      <span class="tok" data-t="assign">result[key] = schema[key]</span>;` },
  { ln: 6, html: `  }` },
  { ln: 7, html: `  <span class="k">return</span> <span class="tok" data-t="ret">result</span>;` },
  { ln: 8, html: `}` },
];

function traceMigrate(caseIndex) {
  const idx = Math.max(0, Math.min(CASES.length - 1, (caseIndex | 0) - 1));
  const c = CASES[idx] || CASES[0];
  const { schema, record, label } = c;
  const steps = [];
  const result = {};
  let key;
  const items = () => Object.entries(result).map(([k, v]) => `${k}: ${dFmtV(v)}`);
  const S = (line, note, x = {}) => {
    const keyLive = line >= 3 && line <= 5;
    const vars = { record: dFmtObj(record) };
    if (keyLive && key != null) vars.key = `"${key}"`;
    const structs = line >= 2 ? [{ label: "result", items: items(), newest: !!x.resNew }] : [];
    steps.push({
      line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
      frames: [{ title: "migrateRecord", vars, changed: x.changed || [], structs, ret: x.ret }],
    });
  };

  const recKeys = Object.keys(record).join(", ") || "∅";
  S(1, `<b>Case ${idx + 1}: ${esc(label)}.</b> Merge schema defaults into <b>record {${esc(recKeys)}}</b>. One rule settles every conflict: <b>the record always wins</b> — the schema only fills gaps.`, {});
  Object.assign(result, record);
  S(2, `Start from a <b>copy of the record</b> (<code class='inl'>{ ...record }</code>). Its values and their order are locked in first, so nothing the schema does later can overwrite them.`, { focus: "copy" });

  for (const k of Object.keys(schema)) {
    key = k;
    S(3, `Walk the schema keys. Current key: <b>${esc(k)}</b> — its default is <code class='inl'>${esc(dFmtV(schema[k]))}</code>.`, { focus: "forkey", changed: ["key"] });
    const has = k in result;
    S(4, `Does result already carry <b>${esc(k)}</b>? ${has ? "<b>Yes</b> — the record supplied it, so the default is dropped (record wins)" : "<b>No</b> — this is a gap"}. So <code class='inl'>!(key in result)</code> is <b>${!has}</b>.`, { focus: "cond", eval: { expr: `!("${k}" in result)`, val: !has } });
    if (!has) {
      result[k] = schema[k];
      S(5, `Gap filled — copy the schema default <code class='inl'>${esc(dFmtV(schema[k]))}</code> in under <b>${esc(k)}</b>. It's <b>appended</b> to result.`, { focus: "assign", resNew: true });
    }
    // has === true → condition false, no assignment: the record's own value stands.
  }
  S(7, `Every schema key has been checked. <b>Return result</b>: the record's own fields untouched, plus a default for each field it was missing.`, { focus: "ret", done: true, result: dFmtObj(result), ret: { value: dFmtObj(result) } });
  return steps;
}

export default {
  n: 327, id: "migrate", title: "DB Migration", dates: ["2026-07-03"],
  statement: `Given a <code class="inl">schema</code> object and a <code class="inl">record</code>, return the record with any missing schema properties filled from the schema — <span class="rule">never overwrite fields the record already has.</span> Example: <code class="inl">migrateRecord({username:"",posts:0,verified:false}, {username:"camper"})</code> → <code class="inl">{username:"camper", posts:0, verified:false}</code>.`,
  variants: [
    {
      name: "Solution", cost: "O(keys)",
      approach: `Spread the record first so its present values and order are preserved, then loop the schema keys and copy over only those <b>not already present</b> (<code class='inl'>!(key in result)</code>). Because the record is copied first, it always wins any conflict — the schema only supplies defaults for gaps.`,
      code: `function migrateRecord<T extends Record<string, unknown>>(
  schema: T,
  record: Partial<T>,
): T {
  const result: Record<string, unknown> = { ...record };
  for (const key in schema) if (!(key in result)) result[key] = schema[key];
  return result as T;
}`,
      mount,
    },
    { name: "Step through", cost: "line-by-line",
      approach: `A debugger for the merge — watch <code class='inl'>result</code> begin as a <b>copy of the record</b>, then grow only where the record had a gap. Each schema key hits the same conflict test <code class='inl'>!(key in result)</code>: keys the record already has are left alone (<b>record wins</b>), missing keys get the schema default appended. Pick a case, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace: traceMigrate, input: { label: "case =", value: 1, min: 1, max: CASES.length, presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick an example` } }) },
  ],
};
