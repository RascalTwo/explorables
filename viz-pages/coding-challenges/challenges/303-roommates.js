// #303 · Roommates — slice() clamps, so the odd one out needs no branch at all.
//
// ONE approach, on purpose. CONTRIBUTING's three tests for a second variant:
//   1. Name the wasteful act — you can: "re-scan the whole roster once per group"
//      (collect the distinct groups, then filter the list again for each one).
//   2. Two different mental models — this one FAILS. Re-scan-vs-remember is a
//      real axis, but here it is literally `people.filter(p => p.group === g)`
//      swapped in for the one-pass Map: variant A with a line rewritten, which
//      CONTRIBUTING calls an edit, not an approach. #357 already owns that axis
//      on a problem where the absence genuinely forces it.
//   3. A visible cost gap — also weak: the official inputs are 3–6 people over
//      1–4 groups, so the counter would read 24 against 6 at its widest. A gap
//      that small buys a tab nothing.
// So: `Solution` + `Step through`, the normal outcome (33 of 55 modules).
//
// The real difficulty is not the grouping, it is the ODD ONE OUT — and the
// payoff is that it does not need handling. `names.slice(i, i + 2)` clamps at
// the end of the array, so the last lonely guest arrives as a 1-element array,
// and `join(" and ")` on one element never inserts the separator. The bare name
// falls out of the same expression that builds the shared rooms.
// ▸ Press ↑ on Angelica in case 3 and watch who ends up alone change.
import { el, esc, mountDebugger } from "../shared.js";

// Cases 1–5 are freeCodeCamp's five official tests, verbatim and in the order the
// grader publishes them, each carrying the grader's own expected output so the
// demo can tick itself off against it live. They already land on five different
// branches, which is why none of them is filler:
//   1 — a group of exactly ONE person (Bob is alone because nobody shares his B)
//   2 — a SINGLE-group roster with an odd count (the leftover is the 3rd name)
//   3 — INTERLEAVED groups, both odd — the case where arrival order is loudest
//   4 — four groups, TWO of them solo, two paired
//   5 — every group EVEN, so no singleton room exists at all
// Case 6 is MINE: a group of FIVE, the only input here where one group fills more
// than two rooms — it shows the leftover falling out after several full pairs,
// rather than immediately, and gives the reorder tools something long to chew on.
const CASES = [
  { label: "1 · a group of one", expect: ["Alice and Carol", "Bob"],
    people: [["Alice", "A"], ["Bob", "B"], ["Carol", "A"]] },
  { label: "2 · one group, odd", expect: ["John and Julia", "Jim"],
    people: [["John", "C"], ["Julia", "C"], ["Jim", "C"]] },
  { label: "3 · interleaved, both odd", expect: ["Adam and Augustus", "Angelica", "Abraham and Austin", "Aaron"],
    people: [["Adam", "D"], ["Abraham", "E"], ["Austin", "E"], ["Augustus", "D"], ["Angelica", "D"], ["Aaron", "E"]] },
  { label: "4 · four groups, two solo", expect: ["Frank and Bailey", "Emitt", "Daria and Albert", "Charles"],
    people: [["Frank", "A"], ["Emitt", "B"], ["Daria", "F"], ["Charles", "D"], ["Bailey", "A"], ["Albert", "F"]] },
  { label: "5 · all even, no singleton", expect: ["Kevin and Yuri", "Violet and Brett", "Hugo and Wayne"],
    people: [["Kevin", "A"], ["Yuri", "A"], ["Hugo", "B"], ["Violet", "A"], ["Brett", "A"], ["Wayne", "B"]] },
  { label: "6 · a group of five", // mine — no official case has a group past 4
    people: [["Nia", "X"], ["Omar", "Y"], ["Priya", "X"], ["Quinn", "X"], ["Rosa", "Y"], ["Sam", "X"], ["Tess", "X"], ["Uma", "Y"]] },
];
const OPEN_ON = 2;   // case 3 — interleaved, both odd: the clearest reorder payoff
const asRoster = (i) => CASES[i].people.map(([name, group]) => ({ name, group }));

// The graded function, split one step earlier so the demo can also draw the rooms
// grouped by group. `rooms.map(r => r.names.join(" and "))` IS getRoommates().
function pack(people) {
  const groups = new Map();                       // insertion-ordered by design
  for (const { name, group } of people) {
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(name);
  }
  const rooms = [];
  for (const [group, names] of groups)
    for (let i = 0; i < names.length; i += 2) rooms.push({ group, names: names.slice(i, i + 2) });
  return { groups, rooms };
}
const roomStrings = (people) => pack(people).rooms.map((r) => r.names.join(" and "));
const quoted = (arr) => `[${arr.map((s) => `"${s}"`).join(", ")}]`;

let styled = false;
function ensureStyle() {
  if (styled) return; styled = true;
  document.head.append(el("style", null, `
    .rmm-rows { display:flex; flex-direction:column; gap:4px; margin:2px 0 10px; }
    .rmm-row { display:flex; align-items:center; gap:6px; padding:3px 7px; border:1px solid transparent; border-radius:7px; }
    .rmm-row.drag { opacity:.35; }
    .rmm-row.over { border-color:var(--accent); background:color-mix(in srgb,var(--accent) 13%,transparent); }
    .rmm-grip { color:var(--muted); cursor:grab; font:13px var(--mono); user-select:none; padding:0 2px; }
    .rmm-i { font:700 11px var(--mono); color:var(--muted); width:16px; text-align:right; flex:none; }
    .rmm-name { width:110px; }
    .rmm-grp { width:52px; text-align:center; }
    .rmm-lab { font:11px var(--sans); color:var(--muted); flex:none; }
    .rmm-b { font:700 12px var(--mono); background:var(--panel-2); border:1px solid var(--border);
             border-radius:6px; color:var(--muted); cursor:pointer; padding:3px 7px; line-height:1.2; }
    .rmm-b:hover:not(:disabled) { border-color:var(--accent); color:var(--text); }
    .rmm-b:disabled { opacity:.3; cursor:default; }
    .rmm-hotel { display:flex; flex-direction:column; gap:9px; margin-top:8px; max-width:430px; }
    .rmm-blk { border:1px solid var(--border); border-radius:10px; padding:8px 10px; background:var(--panel); }
    .rmm-blk-h { font:700 10px var(--sans); letter-spacing:.07em; text-transform:uppercase; margin-bottom:6px; }
    .rmm-doors { display:flex; flex-direction:column; gap:5px; }
    .rmm-door { display:flex; align-items:center; gap:9px; padding:5px 9px; border:1px solid var(--border);
                border-radius:8px; background:var(--panel-2); }
    .rmm-no { font:700 10.5px var(--mono); color:var(--muted); flex:none; width:30px; }
    .rmm-occ { font:700 13px var(--mono); color:var(--text); }
    .rmm-door.solo { border-color:var(--warn); background:color-mix(in srgb,var(--warn) 13%,transparent); }
    .rmm-door.solo .rmm-occ { color:var(--warn); }
    .rmm-tail { margin-left:auto; font:11px var(--sans); color:var(--muted); }
    .rmm-msg { font:12.5px var(--mono); color:var(--muted); margin:9px 0 2px; line-height:1.55; }
    .rmm-msg b { color:var(--text); }
  `));
}

// ── Variant 1 — the editable roster ─────────────────────────────────────────
// Everything is live: rename, retype a group, drag a row (or press ↑ ↓) to change
// arrival order, add or evict a guest. The hotel re-packs on every keystroke, so
// "paired in the order they are given" is something you can push around by hand.
function mountDemo(host) {
  ensureStyle();
  let roster = asRoster(OPEN_ON);
  let active = OPEN_ON;                 // which official case is loaded, or -1 once edited
  let dragFrom = -1;

  const chipRow = el("div", "controls");
  const rowsBox = el("div", "rmm-rows");
  const tools = el("div", "controls");
  const bar = el("div", "result-line");
  const roomsN = el("span", "n", "0");
  const opc = el("span", "opcount cool");
  opc.append(roomsN, document.createTextNode(" rooms"));
  const outTag = el("span", "tag");
  bar.append(opc, outTag);
  const checkBox = el("div");
  const hotel = el("div", "rmm-hotel");
  const msg = el("div", "rmm-msg");

  const chips = CASES.map((c, i) => {
    const b = el("button", "chip" + (i === OPEN_ON ? " on" : ""), c.label);
    b.onclick = () => { roster = asRoster(i); active = i; markChip(i); rebuild(); render(); };
    chipRow.append(b);
    return b;
  });
  const markChip = (i) => chips.forEach((b, bi) => b.classList.toggle("on", bi === i));
  const dirty = () => { active = -1; markChip(-1); };

  const mkTool = (label, fn) => { const b = el("button", "chip", label); b.onclick = fn; tools.append(b); return b; };
  mkTool("+ guest", () => { roster.push({ name: "", group: "" }); dirty(); rebuild(); render(); });
  mkTool("🔀 shuffle arrivals", () => {
    for (let i = roster.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [roster[i], roster[j]] = [roster[j], roster[i]]; }
    dirty(); rebuild(); render();
  });

  host.append(chipRow, rowsBox, tools, bar, checkBox, hotel, msg);
  host.append(el("div", "note", `The roster is the input, top to bottom. Drag a row by its <b>⠿</b> handle (or press <b>↑ ↓</b>) to change who checks in first, retype a <b>group</b> to move someone, or evict them with <b>✕</b>. Swapping two people in the <i>same</i> group repacks that group's rooms — and swapping the last one changes <b>who sleeps alone</b>, which is the whole reason the pairing has to respect arrival order.`));

  function rebuild() {
    rowsBox.innerHTML = "";
    roster.forEach((p, i) => {
      const row = el("div", "rmm-row");
      const grip = el("span", "rmm-grip", "⠿");
      const name = el("input"); name.type = "text"; name.value = p.name; name.className = "rmm-name"; name.placeholder = "name";
      const grp = el("input"); grp.type = "text"; grp.value = p.group; grp.className = "rmm-grp"; grp.placeholder = "grp";
      name.oninput = () => { roster[i].name = name.value.trim(); dirty(); render(); };
      grp.oninput = () => { roster[i].group = grp.value.trim(); dirty(); render(); };
      const up = el("button", "rmm-b", "↑"), dn = el("button", "rmm-b", "↓"), rm = el("button", "rmm-b", "✕");
      up.disabled = i === 0; dn.disabled = i === roster.length - 1;
      const move = (from, to) => { const [m] = roster.splice(from, 1); roster.splice(to, 0, m); dirty(); rebuild(); render(); };
      up.onclick = () => move(i, i - 1);
      dn.onclick = () => move(i, i + 1);
      rm.onclick = () => { roster.splice(i, 1); dirty(); rebuild(); render(); };

      // Drag to reorder. The handle arms the drag so the text inputs stay
      // selectable — a row that is always draggable swallows click-and-drag.
      grip.onmousedown = () => { row.draggable = true; };
      row.ondragstart = (e) => { dragFrom = i; row.classList.add("drag"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); };
      row.ondragend = () => { row.draggable = false; dragFrom = -1; [...rowsBox.children].forEach((r) => r.classList.remove("drag", "over")); };
      row.ondragover = (e) => { if (dragFrom >= 0) { e.preventDefault(); row.classList.add("over"); } };
      row.ondragleave = () => row.classList.remove("over");
      row.ondrop = (e) => { e.preventDefault(); row.classList.remove("over"); if (dragFrom < 0 || dragFrom === i) return; move(dragFrom, i); };

      row.append(grip, el("span", "rmm-i", String(i + 1)), name, el("span", "rmm-lab", "group"), grp, up, dn, rm);
      rowsBox.append(row);
    });
  }

  function render() {
    hotel.innerHTML = ""; checkBox.innerHTML = "";
    if (!roster.length || roster.some((p) => !p.name || !p.group)) {
      roomsN.textContent = "0"; outTag.style.display = "none";
      msg.innerHTML = roster.length
        ? "Every guest needs both a <b>name</b> and a <b>group</b> before the hotel can be packed."
        : "Nobody has checked in — an empty roster books <b>no rooms</b> at all.";
      return;
    }
    const { groups, rooms } = pack(roster);
    const answer = rooms.map((r) => r.names.join(" and "));
    roomsN.textContent = String(rooms.length);
    outTag.style.display = ""; outTag.textContent = quoted(answer);

    // A live tick against the grader's own expected output, but only while the
    // roster is still an unedited official case — otherwise there is nothing to
    // compare against and a stale ✓ would be a lie.
    const exp = active >= 0 ? CASES[active].expect : null;
    if (exp) {
      const ok = JSON.stringify(answer) === JSON.stringify(exp);
      checkBox.append(el("div", "srow" + (ok ? "" : " bad"),
        `<span class="mark">${ok ? "✓" : "✗"}</span><span class="k">official case ${active + 1}</span>` +
        `<span class="exp">expects ${esc(quoted(exp))}</span>`));
    }

    let no = 0;
    let gi = 0;
    for (const [group, names] of groups) {
      const blk = el("div", "rmm-blk");
      const head = el("div", "rmm-blk-h", `group ${esc(group)} · ${names.length} guest${names.length === 1 ? "" : "s"}`);
      head.style.color = `var(--c${(gi % 6) + 1})`;   // read a kit colour, never redefine one
      const doors = el("div", "rmm-doors");
      rooms.filter((r) => r.group === group).forEach((r) => {
        no++;
        const solo = r.names.length === 1;
        doors.append(el("div", "rmm-door" + (solo ? " solo" : ""),
          `<span class="rmm-no">${no}</span><span class="rmm-occ">${esc(r.names.join(" and "))}</span>` +
          `<span class="rmm-tail">${solo ? "odd one out — sleeps alone" : "sharing"}</span>`));
      });
      blk.append(head, doors);
      hotel.append(blk);
      gi++;
    }

    const solos = rooms.filter((r) => r.names.length === 1);
    msg.innerHTML = `<b>${roster.length}</b> guest${roster.length === 1 ? "" : "s"} → <b>${groups.size}</b> group${groups.size === 1 ? "" : "s"} → <b>${rooms.length}</b> room${rooms.length === 1 ? "" : "s"}. ` + (solos.length
      ? `${solos.length === 1 ? "One group has" : `${solos.length} groups have`} an <b>odd</b> head-count, so ${solos.map((r) => `<b>${esc(r.names[0])}</b>`).join(" and ")} ${solos.length === 1 ? "gets" : "get"} a room alone — rendered as just the name, with no <code class='inl'>" and "</code> in it. The leftover is always the group's <b>last</b> arrival.`
      : `Every group has an <b>even</b> head-count, so every room is shared and no bare name appears in the answer.`);
  }

  rebuild();
  render();
}

const CODE = `// Group the people in ONE pass, then chunk each group two at a time.
type Person = { name: string; group: string };

function getRoommates(people: Person[]): string[] {
  // A Map keeps its keys in INSERTION order, so groups come back out in the order
  // they first appeared — and each list is in arrival order too. That is the whole
  // "paired in the order they are given" requirement, for free.
  const groups = new Map<string, string[]>();
  for (const { name, group } of people) {
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(name);
  }

  const rooms: string[] = [];
  for (const names of groups.values()) {
    for (let i = 0; i < names.length; i += 2) {
      // slice() clamps at the end, so a leftover person yields a 1-element array
      // and join() hands back the bare name — no odd-one-out branch needed.
      rooms.push(names.slice(i, i + 2).join(" and "));
    }
  }
  return rooms;
}`;

// ── Variant 2 — the step-through ────────────────────────────────────────────
const SRC = [
  { ln: 1,  html: `<span class="k">function</span> <span class="fn">getRoommates</span>(<span class="tok" data-t="param">people</span>) {` },
  { ln: 2,  html: `  <span class="k">const</span> groups = <span class="k">new</span> <span class="tok" data-t="map"><span class="fn">Map</span>()</span>;` },
  { ln: 3,  html: `  <span class="k">for</span> (<span class="k">const</span> { <span class="tok" data-t="destr">name, group</span> } <span class="k">of</span> people) {` },
  { ln: 4,  html: `    <span class="k">if</span> (<span class="tok" data-t="ensure">!groups.<span class="fn">has</span>(group)</span>) groups.<span class="fn">set</span>(group, []);` },
  { ln: 5,  html: `    <span class="tok" data-t="push">groups.<span class="fn">get</span>(group).<span class="fn">push</span>(name)</span>;` },
  { ln: 6,  html: `  }` },
  { ln: 7,  html: `  <span class="k">const</span> <span class="tok" data-t="rooms">rooms = []</span>;` },
  { ln: 8,  html: `  <span class="k">for</span> (<span class="k">const</span> names <span class="k">of</span> <span class="tok" data-t="values">groups.<span class="fn">values</span>()</span>) {` },
  { ln: 9,  html: `    <span class="k">for</span> (<span class="k">let</span> <span class="tok" data-t="forcond">i = 0; i &lt; names.length</span>; i += <span class="nu">2</span>) {` },
  { ln: 10, html: `      rooms.<span class="fn">push</span>(<span class="tok" data-t="chunk">names.<span class="fn">slice</span>(i, i + <span class="nu">2</span>).<span class="fn">join</span>(<span class="st">" and "</span>)</span>);` },
  { ln: 11, html: `    }` },
  { ln: 12, html: `  }` },
  { ln: 13, html: `  <span class="k">return</span> <span class="tok" data-t="ret">rooms</span>;` },
  { ln: 14, html: `}` },
];

const DBG_INPUT = {
  label: "case =", value: OPEN_ON + 1, min: 1, max: CASES.length,
  presets: CASES.map((_, i) => i + 1), hint: `1–${CASES.length}: pick a roster`,
};
const dbgCase = (i) => CASES[Math.max(0, Math.min(CASES.length - 1, (i | 0) - 1))];

// Scope by omission, gated on the line that binds each name — and the same rule
// for the struct panels. `groups` exists from line 2; a per-group panel appears
// only once line 4 has actually created that group's list, and then stays for
// the rest of the call (which is exactly what makes the Map's insertion order
// visible — the panels never reshuffle). `name`/`group` are the for-of loop's
// own bindings, so they live on lines 3–5 and vanish afterwards; `rooms` from
// line 7; `names` across the group loop 8–11; `i` only inside the inner loop.
function trace(caseIndex) {
  const cs = dbgCase(caseIndex);
  const people = cs.people.map(([name, group]) => ({ name, group }));
  const steps = [];
  const groups = new Map(), order = [], rooms = [];
  let name = null, group = null, names = null, key = null, i = null;

  const S = (line, note, o = {}) => {
    const vars = {};
    if (line >= 3 && line <= 5) { vars.name = `"${name}"`; vars.group = `"${group}"`; }
    if (line >= 8 && line <= 11) vars.names = `[${names.join(", ")}]`;
    if (line >= 9 && line <= 11) vars.i = i;
    const structs = [{ label: "people", items: people.map((p) => `${p.name}·${p.group}`) }];
    if (line >= 2) order.forEach((k) => structs.push({ label: `groups["${k}"]`, items: groups.get(k).slice(), newest: o.grew === k }));
    if (line >= 7) structs.push({ label: "rooms", items: rooms.slice(), newest: !!o.newRoom });
    steps.push({ line, note, focus: o.focus, eval: o.eval, done: o.done, result: o.result,
      frames: [{ title: `getRoommates(${people.length} people)`, vars, changed: o.changed || [], structs, ret: o.ret }] });
  };

  S(1, `<b>${esc(cs.label)}.</b> ${people.length} people arrive in this exact order, each carrying a <code class='inl'>name</code> and a <code class='inl'>group</code>. Nothing is sorted anywhere below — the order you see in <b>people</b> is the order the pairing happens in.`, { focus: "param" });
  S(2, `An empty <b>Map</b>. A plain object would work for these keys too, but a Map is the honest choice: it promises insertion order for <i>any</i> key, while an object only preserves it for keys that aren't integer-like — <code class='inl'>"2"</code> would jump to the front.`, { focus: "map" });

  for (let j = 0; j < people.length; j++) {
    name = people[j].name; group = people[j].group;
    S(3, `Guest ${j + 1} of ${people.length}: <b>${esc(name)}</b>, group <b>${esc(group)}</b>. The for-of destructures both fields straight out of the record — one look at this person, and we never come back to them.`,
      { focus: "destr", changed: ["name", "group"] });

    const isNew = !groups.has(group);
    if (isNew) { groups.set(group, []); order.push(group); }
    S(4, isNew
      ? `No list for group <b>${esc(group)}</b> yet, so create an empty one. This is the moment group ${esc(group)}'s room block comes into existence — and its <b>position</b> in the Map is fixed right here, by whoever arrived first. That is why the answer's rooms come out grouped in first-appearance order.`
      : `Group <b>${esc(group)}</b> already has a list (opened by <b>${esc(groups.get(group)[0])}</b>), so there is nothing to create. Not touching it is the point: re-creating it would move ${esc(group)} to the back of the Map and reorder the whole answer.`,
      { focus: "ensure", eval: { expr: `!groups.has("${group}")`, val: isNew } });

    groups.get(group).push(name);
    S(5, `<b>Append</b> ${esc(name)} to group ${esc(group)}, which now reads <b>[${groups.get(group).join(", ")}]</b>. Appending — never inserting, never sorting — is the entire "paired in the order they are given" rule. Whoever is sitting at an even index will end up sharing with the person right after them.`,
      { focus: "push", grew: group });
  }
  name = null; group = null;
  S(6, `Every guest has been filed, in <b>one</b> pass over the list. The roster has nothing left to say: <b>${groups.size}</b> group${groups.size === 1 ? "" : "s"}, each already in arrival order, and <code class='inl'>people</code> is never read again.`);

  S(7, `<b>rooms = []</b> — the array that gets returned. It will be filled group by group, so the rooms of the first group all land before the rooms of the second.`, { focus: "rooms" });

  for (let g = 0; g < order.length; g++) {
    key = order[g];
    names = groups.get(key);
    S(8, `Group <b>${esc(key)}</b>: <b>[${names.join(", ")}]</b>. <code class='inl'>groups.values()</code> hands the groups back in the order their <i>first</i> member checked in — group ${esc(key)} is number ${g + 1} because ${esc(names[0])} opened it.`,
      { focus: "values", changed: ["names"] });

    for (i = 0; i < names.length; i += 2) {
      S(9, `<b>i = ${i}</b>, and the list holds ${names.length}. The step is <b>+2</b>, not +1 — each turn of this loop books one room, so it consumes two people at a time.`,
        { focus: "forcond", eval: { expr: `i = ${i} < ${names.length}`, val: true }, changed: ["i"] });
      const chunk = names.slice(i, i + 2);
      const room = chunk.join(" and ");
      rooms.push(room);
      S(10, chunk.length === 2
        ? `<code class='inl'>slice(${i}, ${i + 2})</code> lifts out <b>${esc(chunk[0])}</b> and <b>${esc(chunk[1])}</b>, and <code class='inl'>join(" and ")</code> welds them into <b>"${esc(room)}"</b> — a shared room, with the separator the spec asked for.`
        : `<code class='inl'>slice(${i}, ${i + 2})</code> asks for two, but only <b>${esc(chunk[0])}</b> is left. <b>slice clamps</b> to the end of the array rather than padding with <code class='inl'>undefined</code>, so it returns a <b>1-element</b> array — and <code class='inl'>join</code> only puts a separator <i>between</i> elements, so with one element it emits the bare name <b>"${esc(room)}"</b>. The odd one out needed no <code class='inl'>if</code>: it is the same expression, given one fewer person.`,
        { focus: "chunk", newRoom: true });
    }
    S(9, `<b>i = ${i}</b> has run past the end of group ${esc(key)}'s ${names.length}-person list, so this group is fully housed. ${names.length % 2 ? `Its last room holds one person — <b>${esc(names[names.length - 1])}</b>, the group's final arrival, which is always who the leftover is.` : `Its head-count was even, so nobody here is alone.`}`,
      { focus: "forcond", eval: { expr: `i = ${i} < ${names.length}`, val: false } });
  }
  names = null; i = null; key = null;

  S(13, `<b>Return ${esc(quoted(rooms))}</b> — ${rooms.length} room${rooms.length === 1 ? "" : "s"} for ${people.length} guest${people.length === 1 ? "" : "s"}, built in a single pass plus one walk over the groups. Every name is still in the order it arrived, and the lone guests are bare names rather than a special shape.`,
    { focus: "ret", done: true, result: quoted(rooms), ret: { value: quoted(rooms) } });
  return steps;
}

export default {
  n: 303, id: "roommates", title: "Roommates", dates: ["2026-06-09"],
  statement: `Given an array of people, each with a <code class="inl">name</code> and a <code class="inl">group</code>, return the hotel room assignments. Two people share a room only if they are in the <b>same group</b>, and they are <b>paired in the order they are given</b>. A shared room is the two names joined by <code class="inl">" and "</code>; a room with one person is <b>just the name</b>. <span class="rule">e.g. <code class="inl">[{name:"Alice",group:"A"},{name:"Bob",group:"B"},{name:"Carol",group:"A"}]</code> → <code class="inl">["Alice and Carol", "Bob"]</code>.</span>`,
  variants: [
    { name: "Solution", cost: "O(n)",
      approach: `One pass files every person into a <code class="inl">Map</code> keyed by their group. A <code class="inl">Map</code> iterates in <b>insertion order</b>, so the groups come back out in first-appearance order and each group's list is already in arrival order — the "paired in the order they are given" rule costs nothing extra. Then walk each list with <code class="inl">i += 2</code> and build a room from <code class="inl">names.slice(i, i + 2).join(" and ")</code>. The odd one out is <b>not a case</b>: <code class="inl">slice</code> clamps at the end, so the last lonely guest arrives as a one-element array and <code class="inl">join</code> returns the bare name. Drag a row to reorder the arrivals and watch the rooms re-pack.`,
      code: CODE, mount: mountDemo },
    { name: "Step through", cost: "insertion order",
      approach: `Watch a struct panel appear for each group the moment line 4 creates it — the panels never reorder afterwards, which <i>is</i> the Map's insertion-order guarantee made visible. Then follow the inner loop stepping <b>two at a time</b>, and stop on the last room of an odd group to see <code class="inl">slice</code> clamp and <code class="inl">join</code> drop the separator. Case 5 is the control: every group even, so no bare name ever appears. Hit <b>Step</b>, drag the scrubber, or press <b>Auto</b>.`,
      mount: (host) => mountDebugger(host, { source: SRC, trace, input: DBG_INPUT }) },
  ],
};
