// #295–300 · Schema Validator — one recursive validate() walks value and schema together.
// A trace table shows every recursion step; parts 1–6 merged into one module.
import { el, esc, mountDebugger } from "../shared.js";

function mountSchema(host) {
  const ROLES = ["user", "creator", "moderator", "staff", "admin"];
  const S = {
    str: { kind: "string" }, num: { kind: "number" }, bool: { kind: "boolean" },
    role: { kind: "enum", name: "Roles", values: ROLES },
  };
  const base = {
    1: { username: S.str },
    2: { username: S.str, posts: S.num, verified: S.bool },
    3: { username: S.str, posts: S.num, verified: S.bool, role: S.role },
    4: { username: S.str, posts: S.num, verified: S.bool, role: S.role, supporter: S.bool },
    5: { username: S.str, posts: S.num, verified: S.bool, role: S.role, supporter: S.bool, badges: { kind: "array", of: S.str } },
  };
  const profile = { kind: "object", name: "UserProfile", fields: base[5], optional: ["supporter"] };
  const schemaFor = p => p <= 5
    ? { kind: "object", fields: base[p], optional: p >= 4 ? ["supporter"] : [] }
    : { kind: "object", fields: { users: { kind: "array", of: profile } }, optional: [] };

  // Provenance — tests[1] is freeCodeCamp's OFFICIAL Part 1 set: all five cases,
  // verbatim and in the published order (bob / jen+posts / "" / 7 / posts:25).
  // Cases for Parts 2–6 are ours, one per branch of the growing schema.
  const tests = {
    1: [["{ username: \"bob\" }", { username: "bob" }], ["{ username: \"jen\", posts: 30 }", { username: "jen", posts: 30 }], ["{ username: \"\" }", { username: "" }], ["{ username: 7 }", { username: 7 }], ["{ posts: 25 }", { posts: 25 }]],
    2: [["valid", { username: "alice", posts: 10, verified: false }], ["posts is a string", { username: "frank", posts: "21", verified: true }], ["posts missing", { username: "bill", verified: true }]],
    3: [["role: staff", { username: "henry", posts: 0, verified: true, role: "staff" }], ["role: guest", { username: "david", posts: 0, verified: false, role: "guest" }], ["role missing", { username: "wendy", posts: 10, verified: true }]],
    4: [["supporter omitted", { username: "rudolph", posts: 15, verified: true, role: "creator" }], ["supporter: \"true\"", { username: "julia", posts: 50, verified: true, role: "admin", supporter: "true" }]],
    5: [["badges ok", { username: "zara", posts: 0, verified: false, role: "user", supporter: false, badges: [] }], ["badge is a number", { username: "nicole", posts: 65, verified: true, role: "admin", supporter: false, badges: ["first-post", 18] }]],
    6: [["array of profiles", { users: [{ username: "ron", posts: 14, verified: true, role: "creator", badges: ["early-adopter"] }] }], ["empty users", { users: [] }], ["users is an object", { users: { username: "anne", posts: 0, verified: false, role: "user", badges: [] } }], ["one bad badge deep inside", { users: [{ username: "tony", posts: 10, verified: true, role: "creator", supporter: true, badges: ["liked", 6] }] }]],
  };

  const typeName = s => s.kind === "array" ? typeName(s.of) + "[]" : s.kind === "enum" ? (s.name || "enum") : s.kind === "object" ? (s.name || "object") : s.kind;
  const fmt = v => v === undefined ? "(absent)" : Array.isArray(v) ? "[" + v.map(fmt).join(", ") + "]" : typeof v === "string" ? `"${v}"` : typeof v === "object" && v !== null ? "{…}" : String(v);

  function trace(value, schema, label, depth, rows) {
    if (schema.kind === "object") {
      if (typeof value !== "object" || value === null || Array.isArray(value)) { rows.push({ depth, label, exp: typeName(schema), got: fmt(value), ok: false }); return false; }
      rows.push({ depth, label, exp: typeName(schema), got: "{…}", ok: true, head: true });
      let ok = true;
      for (const [k, sub] of Object.entries(schema.fields)) {
        const optional = schema.optional?.includes(k);
        if (!(k in value)) {
          if (optional) rows.push({ depth: depth + 1, label: k + "?", exp: typeName(sub), got: "(absent)", ok: true });
          else { rows.push({ depth: depth + 1, label: k, exp: typeName(sub), got: "(missing)", ok: false }); ok = false; }
          continue;
        }
        ok = trace(value[k], sub, optional ? k + "?" : k, depth + 1, rows) && ok;
      }
      // The validator never inspects keys the schema doesn't name. Surface them
      // so "extra keys are allowed" is visible in the table, not just in prose.
      for (const k of Object.keys(value)) {
        if (!(k in schema.fields)) rows.push({ depth: depth + 1, label: k, exp: "(ignored — extra keys allowed)", got: fmt(value[k]), ok: true, extra: true });
      }
      return ok;
    }
    if (schema.kind === "array") {
      if (!Array.isArray(value)) { rows.push({ depth, label, exp: typeName(schema), got: fmt(value), ok: false }); return false; }
      rows.push({ depth, label, exp: typeName(schema), got: `[${value.length}]`, ok: true, head: true });
      let ok = true;
      value.forEach((elv, i) => { ok = trace(elv, schema.of, `${label.replace(/\?$/, "")}[${i}]`, depth + 1, rows) && ok; });
      return ok;
    }
    let ok = schema.kind === "string" ? typeof value === "string"
      : schema.kind === "number" ? typeof value === "number"
      : schema.kind === "boolean" ? typeof value === "boolean"
      : typeof value === "string" && schema.values.includes(value);
    rows.push({ depth, label, exp: typeName(schema), got: fmt(value), ok });
    return ok;
  }

  let part = 1, idx = 0;
  const partBar = el("div", "controls");
  const caseBar = el("div", "controls");
  const out = el("div");
  host.append(el("div", "ctl-label", "Schema grows across the 6-part series:"), partBar, caseBar, out);

  function renderCases() {
    caseBar.innerHTML = "";
    tests[part].forEach((tc, i) => {
      const c = el("button", "chip" + (i === idx ? " on" : ""), esc(tc[0]));
      c.onclick = () => { idx = i; renderCases(); render(); };
      caseBar.append(c);
    });
  }
  function render() {
    const schema = schemaFor(part), value = tests[part][idx][1];
    const rows = []; const ok = trace(value, schema, "(root)", 0, rows);
    out.innerHTML = "";
    out.append(el("div", "result-line", `<span class="badge ${ok ? "ok" : "no"}">${ok ? "✓ isValidSchema → true" : "✗ isValidSchema → false"}</span>`));
    const box = el("div", "panel");
    rows.forEach(r => {
      const row = el("div", "srow" + (r.ok ? "" : " bad") + (r.head ? " head" : ""));
      row.style.paddingLeft = (r.depth * 16) + "px";
      row.innerHTML = `<span class="mark">${r.head ? "" : r.extra ? "–" : r.ok ? "✓" : "✗"}</span><span class="k">${esc(r.label)}</span><span class="exp">: ${esc(r.exp)}</span><span class="got" style="margin-left:auto">${esc(r.got)}</span>`;
      box.append(row);
    });
    out.append(box);
  }
  [1, 2, 3, 4, 5, 6].forEach(p => {
    const b = el("button", "chip" + (p === part ? " on" : ""), "Part " + p);
    b.onclick = () => { part = p; idx = 0; [...partBar.children].forEach((c, i) => c.classList.toggle("on", i === p - 1)); renderCases(); render(); };
    partBar.append(b);
  });
  renderCases(); render();
}

// ── STEP — the recursive validate() on the shared debugger (a real call stack) ─
// Frames = each validate(value, schema) call. Nested values are stringified into
// the frame vars via fmt() (compact repr), so the engine needs no nested renderer.
const dTypeName = (s) => s.kind === "array" ? dTypeName(s.of) + "[]" : s.kind === "enum" ? (s.name || "enum") : s.kind === "object" ? (s.name || "object") : s.kind;
const dFmt = (v) => v === undefined ? "(absent)" : Array.isArray(v) ? "[" + v.map(dFmt).join(", ") + "]" : typeof v === "string" ? `"${v}"` : typeof v === "object" && v !== null ? "{…}" : String(v);

const D_ROLES = ["user", "creator", "moderator", "staff", "admin"];
const Dstr = { kind: "string" }, Dnum = { kind: "number" }, Dbool = { kind: "boolean" };
const Drole = { kind: "enum", name: "Role", values: D_ROLES };
const D_USER = { kind: "object", name: "User", fields: { username: Dstr, posts: Dnum, verified: Dbool }, optional: [] };
const D_USER3 = { kind: "object", name: "User", fields: { username: Dstr, posts: Dnum, verified: Dbool, role: Drole }, optional: [] };
const D_PROFILE = { kind: "object", name: "UserProfile", fields: { username: Dstr, posts: Dnum, verified: Dbool, role: Drole, supporter: Dbool, badges: { kind: "array", of: Dstr } }, optional: ["supporter"] };
const D_ROOT = { kind: "object", name: "Root", fields: { users: { kind: "array", of: D_PROFILE } }, optional: [] };

const CASES = [
  { label: `valid user`, value: { username: "alice", posts: 10, verified: false }, schema: D_USER },
  { label: `username is a number`, value: { username: 7, posts: 3, verified: true }, schema: D_USER },
  { label: `role: "guest" (bad enum)`, value: { username: "david", posts: 0, verified: false, role: "guest" }, schema: D_USER3 },
  { label: `required field posts missing`, value: { username: "bill", verified: true }, schema: D_USER },
  { label: `one bad badge deep inside`, value: { users: [{ username: "tony", posts: 10, verified: true, role: "creator", supporter: true, badges: ["liked", 6] }] }, schema: D_ROOT },
  { label: `array of profiles, all valid`, value: { users: [{ username: "ron", posts: 14, verified: true, role: "creator", badges: ["early-adopter"] }] }, schema: D_ROOT },
];

const SRC_SCHEMA = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">validate</span>(value, schema) {` },
  { ln: 2,  html: `  <span class="k">if</span> (<span class="tok" data-t="objkind">schema.kind === "object"</span>) {` },
  { ln: 3,  html: `    <span class="k">if</span> (<span class="tok" data-t="objcheck">typeof value !== "object" || value === null</span>) <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 4,  html: `    <span class="k">for</span> (<span class="k">const</span> [<span class="tok" data-t="forfields">key</span>, sub] <span class="k">of</span> Object.<span class="fn">entries</span>(schema.fields)) {` },
  { ln: 5,  html: `      <span class="k">if</span> (<span class="tok" data-t="present">!(key <span class="k">in</span> value)</span>) {` },
  { ln: 6,  html: `        <span class="k">if</span> (<span class="tok" data-t="missing">!isOptional(key)</span>) <span class="k">return</span> <span class="k">false</span>; <span class="k">else</span> <span class="k">continue</span>;` },
  { ln: 7,  html: `      }` },
  { ln: 8,  html: `      <span class="k">if</span> (!<span class="tok" data-t="recur"><span class="fn">validate</span>(value[key], sub)</span>) <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 9,  html: `    }` },
  { ln: 10, html: `    <span class="k">return</span> <span class="tok" data-t="objtrue"><span class="k">true</span></span>;` },
  { ln: 11, html: `  }` },
  { ln: 12, html: `  <span class="k">if</span> (<span class="tok" data-t="arrkind">schema.kind === "array"</span>) {` },
  { ln: 13, html: `    <span class="k">if</span> (<span class="tok" data-t="arrcheck">!Array.isArray(value)</span>) <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 14, html: `    <span class="k">for</span> (<span class="k">const</span> <span class="tok" data-t="foritems">item</span> <span class="k">of</span> value) {` },
  { ln: 15, html: `      <span class="k">if</span> (!<span class="tok" data-t="itemrecur"><span class="fn">validate</span>(item, schema.of)</span>) <span class="k">return</span> <span class="k">false</span>;` },
  { ln: 16, html: `    }` },
  { ln: 17, html: `    <span class="k">return</span> <span class="tok" data-t="arrtrue"><span class="k">true</span></span>;` },
  { ln: 18, html: `  }` },
  { ln: 19, html: `  <span class="k">return</span> <span class="tok" data-t="scalar">matchesScalar(value, schema)</span>;   <span class="k">// string | number | boolean | enum</span>` },
  { ln: 20, html: `}` },
];

function traceSchema(caseIndex) {
  const c = CASES[Math.max(0, Math.min(CASES.length - 1, (caseIndex | 0) - 1))] || CASES[0];
  const steps = [];
  const stack = []; // {value, schema, label, key}
  const framesNow = (opt = {}) => stack.map((fr, idx) => {
    const top = idx === stack.length - 1;
    const vars = { value: dFmt(fr.value), expects: dTypeName(fr.schema) };
    if (fr.key != null) vars.key = `"${fr.key}"`;
    return { title: `validate(${fr.label})`, vars, changed: top ? (opt.topChanged || []) : [], ret: top ? opt.ret : undefined };
  });
  const S = (line, note, x = {}) => steps.push({ line, note, focus: x.focus, eval: x.eval, done: x.done, result: x.result, frames: framesNow(x) });

  const ok = (function validate(value, schema, label) {
    const fr = { value, schema, label, key: null };
    stack.push(fr);
    S(1, `Enter <b>validate(${label})</b> — check ${dFmt(value)} against schema <b>${dTypeName(schema)}</b>. A new frame is <b>pushed</b>.`, { topChanged: ["value", "expects"] });

    if (schema.kind === "object") {
      S(2, `Schema kind is <b>object</b> → true.`, { focus: "objkind", eval: { expr: `schema.kind === "object"`, val: true } });
      const notObj = typeof value !== "object" || value === null || Array.isArray(value);
      S(3, `Is the value a plain object? ${notObj ? "<b>No</b>" : "<b>Yes</b>"}.`, { focus: "objcheck", eval: { expr: `value is a plain object`, val: !notObj } });
      if (notObj) { S(3, `Not an object — <b>return false</b> (frame pops).`, { focus: "objcheck", ret: { value: "false ✗" } }); stack.pop(); return false; }
      for (const [key, sub] of Object.entries(schema.fields)) {
        fr.key = key;
        S(4, `Next field: <b>${key}</b> : ${dTypeName(sub)}.`, { focus: "forfields", topChanged: ["key"] });
        const present = key in value;
        S(5, `Is <b>"${key}"</b> present in the value? → <b>${present}</b>.`, { focus: "present", eval: { expr: `"${key}" in value`, val: present } });
        if (!present) {
          const optional = (schema.optional || []).includes(key);
          if (!optional) { S(6, `Required field <b>${key}</b> is missing — <b>return false</b> (frame pops).`, { focus: "missing", ret: { value: "false ✗" } }); stack.pop(); return false; }
          S(6, `<b>${key}</b> is optional and absent — skip it, keep going.`, { focus: "missing" });
          continue;
        }
        S(8, `Recurse into field <b>${key}</b> — validate ${dFmt(value[key])} against ${dTypeName(sub)}.`, { focus: "recur" });
        const childOk = validate(value[key], sub, key);
        if (!childOk) { S(8, `Field <b>${key}</b> failed — <b>return false</b> (frame pops).`, { focus: "recur", ret: { value: "false ✗" } }); stack.pop(); return false; }
        S(8, `Field <b>${key}</b> passed ✓ — on to the next field.`, { focus: "recur" });
      }
      S(10, `Every required field matched — <b>return true</b> (frame pops).`, { focus: "objtrue", ret: { value: "true ✓" } });
      stack.pop(); return true;
    }

    if (schema.kind === "array") {
      S(12, `Schema kind is <b>array</b> of ${dTypeName(schema.of)} → true.`, { focus: "arrkind", eval: { expr: `schema.kind === "array"`, val: true } });
      const isArr = Array.isArray(value);
      S(13, `Is the value an array? → <b>${isArr}</b>.`, { focus: "arrcheck", eval: { expr: `Array.isArray(value)`, val: isArr } });
      if (!isArr) { S(13, `Not an array — <b>return false</b> (frame pops).`, { focus: "arrcheck", ret: { value: "false ✗" } }); stack.pop(); return false; }
      for (let ai = 0; ai < value.length; ai++) {
        const item = value[ai];
        fr.key = `[${ai}]`;
        S(14, `Element <b>[${ai}]</b> of ${value.length}.`, { focus: "foritems", topChanged: ["key"] });
        S(15, `Recurse into element <b>[${ai}]</b> — validate ${dFmt(item)}.`, { focus: "itemrecur" });
        const childOk = validate(item, schema.of, `${label}[${ai}]`);
        if (!childOk) { S(15, `Element <b>[${ai}]</b> failed — <b>return false</b> (frame pops).`, { focus: "itemrecur", ret: { value: "false ✗" } }); stack.pop(); return false; }
        S(15, `Element <b>[${ai}]</b> passed ✓ — on to the next.`, { focus: "itemrecur" });
      }
      S(17, `Every element matched — <b>return true</b> (frame pops).`, { focus: "arrtrue", ret: { value: "true ✓" } });
      stack.pop(); return true;
    }

    const scal = schema.kind === "string" ? typeof value === "string"
      : schema.kind === "number" ? typeof value === "number"
      : schema.kind === "boolean" ? typeof value === "boolean"
      : typeof value === "string" && schema.values.includes(value);
    S(19, `Scalar check: is ${dFmt(value)} a valid <b>${dTypeName(schema)}</b>? → <b>${scal}</b>. <b>Return ${scal}</b> (frame pops).`, { focus: "scalar", eval: { expr: `${dFmt(value)} : ${dTypeName(schema)}`, val: scal }, ret: { value: scal ? "true ✓" : "false ✗" } });
    stack.pop(); return scal;
  })(c.value, c.schema, "(root)");

  S(20, `Recursion finished — the stack is empty. <b>validate returned ${ok}</b>: the value ${ok ? "matches" : "does not match"} the schema.`, { done: true, result: ok });
  return steps;
}

export default {
  n: 295, id: "schema", title: "Schema Validator", dates: ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05", "2026-06-06"],
  statement: `Given an object, decide if it matches a schema. The schema grows over six parts — from <code>{ username: string }</code> to a <code>UserProfile[]</code> with enums, an optional field, and string arrays. <span class="rule">Extra keys are always allowed.</span>`,
  variants: [
    {
      // graded: false — this module MERGES the six-day series (#295–300), so no
      // single day's graded function is the answer. The shipped `code` is the
      // generalised validate(value, schema) the series builds up to, not any one
      // day's isValidSchema(). Grading it against dates[0] would be a category
      // error, not a bug.
      name: "Solution", cost: "O(size)", graded: false,
      approach: `One recursive <code class='inl'>validate(value, schema)</code> that dispatches on the schema's kind. Objects recurse over their fields; arrays recurse over their elements; the nested Part 6 case falls out for free. Missing keys pass only when optional; extra keys are never inspected.`,
      code: `// A schema is a tiny tagged union; validate() walks value + schema together.
type Schema =
  | { kind: "string" }
  | { kind: "number" }
  | { kind: "boolean" }
  | { kind: "enum"; values: string[] }
  | { kind: "array"; of: Schema }
  | { kind: "object"; fields: Record<string, Schema>; optional?: string[] };

function validate(value: unknown, schema: Schema): boolean {
  switch (schema.kind) {
    case "string":  return typeof value === "string";
    case "number":  return typeof value === "number";
    case "boolean": return typeof value === "boolean";
    case "enum":    return typeof value === "string" && schema.values.includes(value);
    case "array":   return Array.isArray(value) && value.every(v => validate(v, schema.of));
    case "object": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
      const obj = value as Record<string, unknown>;
      return Object.entries(schema.fields).every(([key, sub]) => {
        if (!(key in obj)) return schema.optional?.includes(key) ?? false; // missing → ok iff optional
        return validate(obj[key], sub);                                    // recurse
      });
      // extra keys are simply never inspected → always allowed
    }
  }
}`,
      mount: mountSchema,
    },
    { name: "Step through", cost: "call stack",
      approach: `The recursive validator in a debugger — watch the <b>call stack</b> grow as <code class='inl'>validate</code> descends into each field and array element, and shrink as frames <b>return</b>. Every frame shows the <code class='inl'>value</code> it's checking and the type it <code class='inl'>expects</code>; a single mismatch deep inside collapses the whole stack to <code class='inl'>false</code>. Pick a case, hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC_SCHEMA, trace: traceSchema, input: { label: "case =", value: 1, min: 1, max: CASES.length, presets: CASES.map((_, i) => i + 1), hint: "1–6: pick an example" } }) },
  ],
};
