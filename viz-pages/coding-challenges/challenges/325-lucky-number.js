// #325 · Lucky Number — vowels & consonants folded into two products.
// Single-approach: parse each name, count letters, take the min-product and the
// max-product (mins/maxes chosen INDEPENDENTLY across the two names), subtract.
import { el, esc, mountDebugger } from "../shared.js";

// All 6 official freeCodeCamp cases. Shared by the demo and the step-through, so
// this array alone is the module's coverage. "Chloe Perez" is the 0 → 13 rule;
// "Elizabeth Hernandez" is the longest pair and the only one with EQUAL lengths,
// so the len factor ties while vowels and consonants still split across the two
// names — the independent-per-factor rule with one factor held constant.
const PRESETS = ["John Doe", "Olivia Lewis", "James Wilson", "Chloe Perez", "Mike Walker", "Elizabeth Hernandez"];

function counts(s) {
  let v = 0, c = 0;
  for (const ch of s.toLowerCase()) {
    if ("aeiou".includes(ch)) v++;
    else if (ch >= "a" && ch <= "z") c++;
  }
  return { v, c, len: s.length };
}

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .ln-wrap { display:flex; flex-direction:column; gap:16px; }
    .ln-names { display:flex; gap:14px; flex-wrap:wrap; }
    .ln-name { flex:1 1 200px; border:1px solid var(--border); border-radius:12px; padding:12px 14px; background:var(--panel); }
    .ln-role { font:700 10px var(--sans); letter-spacing:.09em; text-transform:uppercase; color:var(--muted); margin-bottom:8px; }
    .ln-letters { display:flex; gap:4px; flex-wrap:wrap; margin-bottom:10px; }
    .ln-t { width:28px; height:34px; display:flex; align-items:center; justify-content:center;
            font:700 17px var(--mono); border-radius:7px; border:1px solid var(--border); background:var(--panel-2); }
    .ln-t.ln-v { color:var(--accent); border-color:color-mix(in srgb,var(--accent) 55%,var(--border));
                 background:color-mix(in srgb,var(--accent) 12%,transparent); }
    .ln-t.ln-c { color:var(--warn); border-color:color-mix(in srgb,var(--warn) 45%,var(--border));
                 background:color-mix(in srgb,var(--warn) 9%,transparent); }
    .ln-t.ln-o { color:var(--muted); opacity:.55; }
    .ln-cnt { display:flex; gap:6px; flex-wrap:wrap; font:700 12px var(--mono); }
    .ln-pill { padding:3px 9px; border-radius:20px; border:1px solid var(--border); }
    .ln-pill.v { color:var(--accent); border-color:color-mix(in srgb,var(--accent) 45%,var(--border)); }
    .ln-pill.c { color:var(--warn); border-color:color-mix(in srgb,var(--warn) 40%,var(--border)); }
    .ln-pill.l { color:var(--muted); }
    .ln-eq { border:1px solid var(--border); border-radius:12px; overflow:hidden; }
    .ln-eqrow { display:flex; align-items:center; gap:10px; padding:11px 14px; font:600 13px var(--mono); flex-wrap:wrap; }
    .ln-eqrow + .ln-eqrow { border-top:1px solid var(--border); }
    .ln-eqrow .lab { min-width:56px; font:700 11px var(--sans); letter-spacing:.06em; text-transform:uppercase; }
    .ln-eqrow.min .lab { color:var(--good); }
    .ln-eqrow.max .lab { color:var(--danger); }
    .ln-op { color:var(--muted); }
    .ln-fac { padding:2px 7px; border-radius:6px; background:var(--panel-2); border:1px solid var(--border); }
    .ln-fac.v { color:var(--accent); } .ln-fac.c { color:var(--warn); } .ln-fac.l { color:var(--text); }
    .ln-prod { margin-left:auto; font:800 18px var(--mono); }
    .ln-eqrow.min .ln-prod { color:var(--good); } .ln-eqrow.max .ln-prod { color:var(--danger); }
    .ln-final { display:flex; align-items:center; gap:14px; padding:16px 18px; border:1px solid var(--accent);
                border-radius:12px; background:color-mix(in srgb,var(--accent) 8%,transparent); flex-wrap:wrap; }
    .ln-sub { font:600 14px var(--mono); color:var(--muted); }
    .ln-sub b { color:var(--text); }
    .ln-num { margin-left:auto; font:800 40px var(--mono); color:var(--accent); font-variant-numeric:tabular-nums; }
    .ln-luck { font:700 22px; }
  `));
}

function facRow(kind, aVal, bVal, fn, cls) {
  const picked = fn(aVal, bVal);
  return `<span class="ln-fac ${cls}">${picked}</span>`;
}

function mount(host) {
  ensureStyle();
  const ctl = el("div", "controls");
  const inp = el("input"); inp.type = "text"; inp.value = "John Doe"; inp.style.width = "260px";
  ctl.append(el("span", "ctl-label", "First Last"), inp);
  const pre = el("div", "controls");
  PRESETS.forEach((v) => { const c = el("button", "chip", v); c.onclick = () => { inp.value = v; render(); }; pre.append(c); });
  const out = el("div", "ln-wrap");
  host.append(ctl, pre, out);
  inp.oninput = render;
  render();

  function letters(s) {
    return [...s].map((ch) => {
      const lo = ch.toLowerCase();
      const cls = "aeiou".includes(lo) ? "ln-v" : (lo >= "a" && lo <= "z") ? "ln-c" : "ln-o";
      return `<span class="ln-t ${cls}">${esc(ch)}</span>`;
    }).join("");
  }

  function render() {
    const parts = inp.value.trim().split(/\s+/).filter(Boolean);
    const first = parts[0] || "", last = parts.slice(1).join(" ") || "";
    const a = counts(first), b = counts(last);
    const small = Math.min(a.v, b.v) * Math.min(a.c, b.c) * Math.min(a.len, b.len);
    const large = Math.max(a.v, b.v) * Math.max(a.c, b.c) * Math.max(a.len, b.len);
    const diff = large - small;
    const result = diff === 0 ? 13 : diff;

    const nameBlock = (role, s, cnt) => `
      <div class="ln-name">
        <div class="ln-role">${role}</div>
        <div class="ln-letters">${letters(s) || '<span class="ln-t ln-o">–</span>'}</div>
        <div class="ln-cnt">
          <span class="ln-pill v">${cnt.v} vowel${cnt.v === 1 ? "" : "s"}</span>
          <span class="ln-pill c">${cnt.c} cons.</span>
          <span class="ln-pill l">len ${cnt.len}</span>
        </div>
      </div>`;

    const eqRow = (kind, cls, fn) => `
      <div class="ln-eqrow ${kind}">
        <span class="lab">${kind}</span>
        ${facRow("v", a.v, b.v, fn, "v")}<span class="ln-op">·</span>
        ${facRow("c", a.c, b.c, fn, "c")}<span class="ln-op">·</span>
        ${facRow("l", a.len, b.len, fn, "l")}
        <span class="ln-op">=</span>
        <span class="ln-prod">${cls}</span>
      </div>`;

    out.innerHTML = `
      <div class="ln-names">${nameBlock("First", first, a)}${nameBlock("Last", last, b)}</div>
      <div class="ln-eq">
        ${eqRow("min", small, Math.min)}
        ${eqRow("max", large, Math.max)}
      </div>
      <div class="ln-final">
        <div class="ln-sub"><b>${large}</b> − <b>${small}</b> = ${diff}${diff === 0 ? ' &nbsp;→&nbsp; <b class="ln-luck" style="color:var(--accent)">0 hits the rule → 13</b>' : ""}</div>
        <div class="ln-num">${result}</div>
      </div>
      ${diff === 0
        ? '<div class="note">Both products were equal, so the difference is 0. The rule says: when the result is 0, return the lucky number <b>13</b> instead.</div>'
        : '<div class="note">Mins and maxes are taken <b>independently</b> per factor — the smallest vowel count and smallest consonant count and shortest length need not come from the same name.</div>'}
    `;
  }
}

// ── STEP — the solution on the shared debugger. counts() is a nested helper, so
// it gets its OWN frame that pushes on each call and pops on return: v, c and ch
// live only inside that frame and vanish when it returns its {v,c,len} tally. ──
const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">getLuckyNumber</span>(<span class="tok" data-t="name">name</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> [first, last] = <span class="tok" data-t="split">name.<span class="fn">split</span>(<span class="st">" "</span>)</span>;` },
  { ln: 3,  html: `  <span class="k">const</span> <span class="fn">counts</span> = (s) =&gt; {` },
  { ln: 4,  html: `    <span class="k">let</span> v = 0, c = 0;` },
  { ln: 5,  html: `    <span class="k">for</span> (<span class="k">const</span> ch <span class="k">of</span> <span class="tok" data-t="loop">s.<span class="fn">toLowerCase</span>()</span>) {` },
  { ln: 6,  html: `      <span class="k">if</span> (<span class="tok" data-t="vowel"><span class="st">"aeiou"</span>.<span class="fn">includes</span>(ch)</span>) v++;` },
  { ln: 7,  html: `      <span class="k">else if</span> (<span class="tok" data-t="cons">ch &gt;= <span class="st">"a"</span> &amp;&amp; ch &lt;= <span class="st">"z"</span></span>) c++;` },
  { ln: 8,  html: `    }` },
  { ln: 9,  html: `    <span class="k">return</span> <span class="tok" data-t="ret">{ v, c, len: s.length }</span>;` },
  { ln: 10, html: `  };` },
  { ln: 11, html: `  <span class="k">const</span> a = <span class="tok" data-t="calls"><span class="fn">counts</span>(first)</span>, b = <span class="fn">counts</span>(last);` },
  { ln: 12, html: `  <span class="k">const</span> small = <span class="tok" data-t="min"><span class="fn">Math.min</span>(a.v, b.v) * <span class="fn">Math.min</span>(a.c, b.c) * <span class="fn">Math.min</span>(a.len, b.len)</span>;` },
  { ln: 13, html: `  <span class="k">const</span> large = <span class="tok" data-t="max"><span class="fn">Math.max</span>(a.v, b.v) * <span class="fn">Math.max</span>(a.c, b.c) * <span class="fn">Math.max</span>(a.len, b.len)</span>;` },
  { ln: 14, html: `  <span class="k">const</span> result = <span class="tok" data-t="sub">large - small</span>;` },
  { ln: 15, html: `  <span class="k">return</span> <span class="tok" data-t="rule">result === 0 ? 13 : result</span>;` },
  { ln: 16, html: `}` },
];

function trace(input) {
  const raw = String(input).trim().replace(/\s+/g, " ");
  const parts = raw.split(" ");
  const first = parts[0] || "", last = parts.slice(1).join(" ") || "";
  const steps = [];

  const main = {};   // getLuckyNumber vars — each appears only once it's in scope
  let cf = null;     // the active counts() frame: { s, v, c, ch?, letters: [] }

  const framesNow = (x) => {
    const frames = [{
      title: "getLuckyNumber",
      vars: { ...main },
      changed: cf ? [] : (x.changed || []),
      ret: (!cf && x.ret) ? x.ret : undefined,
    }];
    if (cf) {
      const vars = { s: `"${cf.s}"`, v: cf.v, c: cf.c };
      if (cf.ch !== undefined) vars.ch = `'${cf.ch}'`;
      frames.push({
        title: `counts("${cf.s}")`,
        vars,
        changed: x.changed || [],
        structs: [{ label: "letters seen", items: cf.letters.slice(), newest: !!x.newest }],
        ret: x.ret,
      });
    }
    return frames;
  };
  const S = (line, note, x = {}) => steps.push({
    line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result,
    frames: framesNow(x),
  });

  // counts(s): pushes its own frame, walks the letters, pops on return.
  const runCounts = (s, role) => {
    cf = { s, v: 0, c: 0, letters: [] };
    S(3, `<b>counts("${s}")</b> is called for the <b>${role}</b> name — a fresh frame opens on top to tally just this name's letters.`, {});
    S(4, `Inside the new frame, both tallies start at zero: <b>v = 0</b> vowels, <b>c = 0</b> consonants.`, { changed: ["v", "c"] });
    for (const ch of s.toLowerCase()) {
      cf.ch = ch;
      cf.letters.push(ch);
      const isV = "aeiou".includes(ch);
      const isC = ch >= "a" && ch <= "z";
      if (isV) {
        cf.v++;
        S(6, `<b>'${ch}'</b> is a vowel — bump <b>v</b> to ${cf.v}.`, { focus: "vowel", eval: { expr: `"aeiou".includes('${ch}')`, val: true }, changed: ["v"], newest: true });
      } else if (isC) {
        cf.c++;
        S(7, `<b>'${ch}'</b> isn't a vowel but is a-z — it's a consonant, so bump <b>c</b> to ${cf.c}.`, { focus: "cons", eval: { expr: `'${ch}' is a-z, not a vowel`, val: true }, changed: ["c"], newest: true });
      } else {
        S(6, `<b>'${ch}'</b> is neither a vowel nor a plain a-z letter — it counts toward neither tally.`, { focus: "vowel", eval: { expr: `"aeiou".includes('${ch}')`, val: false }, newest: true });
      }
    }
    cf.ch = undefined;
    const res = { v: cf.v, c: cf.c, len: s.length };
    S(9, `Every letter seen. Return the tally <b>{ v:${res.v}, c:${res.c}, len:${res.len} }</b> — <b>len</b> is the raw character count (${s.length}), vowels + consonants + anything else. This frame now pops.`, { focus: "ret", ret: { value: `{v:${res.v}, c:${res.c}, len:${res.len}}` } });
    cf = null;
    return res;
  };

  main.name = `"${raw}"`;
  S(1, `<b>getLuckyNumber(${main.name})</b> — turn a full name into its lucky number by comparing the two names' letter profiles.`, { focus: "name", changed: ["name"] });
  main.first = `"${first}"`; main.last = `"${last}"`;
  S(2, `Split on the space into two names: <b>first = "${first}"</b>, <b>last = "${last}"</b>.`, { focus: "split", changed: ["first", "last"] });

  S(11, `Tally each name with the same helper. First call <b>counts(first)</b>.`, { focus: "calls" });
  const a = runCounts(first, "first");
  main.a = `{v:${a.v}, c:${a.c}, len:${a.len}}`;
  S(11, `Back in the main frame: <b>a</b> holds the first name's tally. Now call <b>counts(last)</b>.`, { focus: "calls", changed: ["a"] });
  const b = runCounts(last, "last");
  main.b = `{v:${b.v}, c:${b.c}, len:${b.len}}`;
  S(11, `<b>b</b> holds the last name's tally. Both profiles are in hand.`, { changed: ["b"] });

  const minV = Math.min(a.v, b.v), minC = Math.min(a.c, b.c), minL = Math.min(a.len, b.len);
  const small = minV * minC * minL; main.small = small;
  S(12, `<b>small</b> multiplies the three <b>independent minimums</b>: min(${a.v},${b.v})=${minV} vowels · min(${a.c},${b.c})=${minC} cons · min(${a.len},${b.len})=${minL} len = <b>${small}</b>. Each factor's min is chosen on its own — they needn't come from the same name.`, { focus: "min", changed: ["small"] });
  const maxV = Math.max(a.v, b.v), maxC = Math.max(a.c, b.c), maxL = Math.max(a.len, b.len);
  const large = maxV * maxC * maxL; main.large = large;
  S(13, `<b>large</b> multiplies the three <b>independent maximums</b>: max(${a.v},${b.v})=${maxV} · max(${a.c},${b.c})=${maxC} · max(${a.len},${b.len})=${maxL} = <b>${large}</b>.`, { focus: "max", changed: ["large"] });
  const result = large - small; main.result = result;
  S(14, `Subtract the smaller product from the larger: <b>${large} − ${small} = ${result}</b>.`, { focus: "sub", changed: ["result"] });

  const isZero = result === 0;
  S(15, `Is that difference <b>0</b>? ${large} − ${small} = ${result} → <b>${isZero}</b>.`, { focus: "rule", eval: { expr: `${result} === 0`, val: isZero } });
  const out = isZero ? 13 : result;
  S(15, isZero
      ? `The two products tied, so the difference is 0 — the rule says hand back the lucky number <b>13</b> instead.`
      : `Not zero, so the difference itself <b>${result}</b> is the answer.`,
    { focus: "rule", done: true, result: out, ret: { value: out } });
  return steps;
}

export default {
  n: 325, id: "lucky", title: "Lucky Number", dates: ["2026-07-01"],
  statement: `Split <code class="inl">"First Last"</code>, and for each name count vowels &amp; consonants. Multiply the <b>independent</b> mins — <code class="inl">min(vowels)·min(consonants)·min(length)</code> — and the independent maxes, then subtract the smaller product from the larger. If the difference is 0, return <b>13</b>. <span class="rule">Example: <code class="inl">getLuckyNumber("John Doe")</code> → <b>21</b> (small 1·1·3=3, large 2·3·4=24, 24−3=21).</span>`,
  variants: [
    {
      name: "Solution", cost: "O(len)",
      approach: `Count vowels and consonants in each name in one pass. Take <code class='inl'>Math.min</code> and <code class='inl'>Math.max</code> of each of the three factors <b>across the two names</b>, multiply within each row, and subtract. The min factors don't have to come from one name — they're chosen per-factor.`,
      code: `function getLuckyNumber(name: string): number {
  const [first, last] = name.split(" ");
  const counts = (s: string) => {
    let v = 0, c = 0;
    for (const ch of s.toLowerCase()) {
      if ("aeiou".includes(ch)) v++;
      else if (ch >= "a" && ch <= "z") c++;
    }
    return { v, c, len: s.length };
  };
  const a = counts(first), b = counts(last);
  const small = Math.min(a.v, b.v) * Math.min(a.c, b.c) * Math.min(a.len, b.len);
  const large = Math.max(a.v, b.v) * Math.max(a.c, b.c) * Math.max(a.len, b.len);
  const result = large - small;
  return result === 0 ? 13 : result;
}`,
      mount,
    },
    { name: "Step through", cost: "call stack",
      approach: `A debugger for the solution — watch the nested <code class='inl'>counts</code> helper get its <b>own call frame</b> for each name, walk that name's letters to tally <code class='inl'>v</code> and <code class='inl'>c</code>, then <b>return a {v,c,len} tally and pop</b>. Once both are back, see the <b>independent</b> mins and maxes multiply and subtract — and the 0 → <b>13</b> rule. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: { type: "text", label: "name =", value: "John Doe", presets: PRESETS, hint: "First Last" } }) },
  ],
};
