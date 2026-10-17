/** An element the markup is known to have; throws when it is missing. */
const need = <E extends Element>(e: E | null, sel: string): E => {
  if (!e) throw new Error("missing element " + sel);
  return e;
};
const $ = (s: string, r: ParentNode = document) => need(r.querySelector<HTMLElement>(s), s);
const $$ = (s: string, r: ParentNode = document) => [...r.querySelectorAll<HTMLElement>(s)];
const DEFAULTS = { machine: "dev-server", user: "you" };
const inputs = {
  machine: need(document.querySelector<HTMLInputElement>("#v-machine"), "#v-machine"),
  user: need(document.querySelector<HTMLInputElement>("#v-user"), "#v-user"),
};

interface State {
  machine: string;
  user: string;
  tab: string;
  flavor: string;
  done: string[];
}
export type { State }; // an export makes this a module
type Vars = { MACHINE: string; USER: string };

function loadState(): State {
  const h = new URLSearchParams(location.hash.slice(1));
  const done = h.get("done");
  // a missing or empty parameter falls back to its default
  const param = (k: string, dflt: string): string => {
    const v = h.get(k);
    return v === null || v === "" ? dflt : v;
  };
  return {
    machine: param("m", DEFAULTS.machine),
    user: param("u", DEFAULTS.user),
    tab: param("t", "1"),
    flavor: param("f", "a"),
    done: done ? done.split(",").filter(Boolean) : [],
  };
}
let state = loadState();

function vars(): Vars {
  return {
    MACHINE: inputs.machine.value || DEFAULTS.machine,
    USER: inputs.user.value || DEFAULTS.user,
  };
}
function fill(tpl: string, v: Vars) {
  return tpl.replaceAll(
    /\{\{(\w+)\}\}/gu,
    (_, k: string) => (v as Record<string, string>)[k] ?? `{{${k}}}`,
  );
}

function renderCmd(pre: HTMLElement, v: Vars) {
  pre.textContent = fill(pre.dataset["tpl"]!, v);
  const re = new RegExp(
    "(" +
      [v.MACHINE, v.USER].map((x) => x.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("|") +
      ")",
    "gu",
  );
  pre.innerHTML = pre.textContent.replace(re, (m) => `<span class="tok">${m}</span>`);
}

function render() {
  const v = vars();
  $$("[data-tpl]").forEach((p) => renderCmd(p, v));
  $$("[data-tpl-browser]").forEach((el) => {
    el.textContent = fill(el.dataset["tplBrowser"]!, v);
  });
  $$("[data-inl]").forEach((el) => {
    el.textContent = fill(el.dataset["inl"]!, v);
  });
  save();
}

function save() {
  state.machine = inputs.machine.value;
  state.user = inputs.user.value;
  const p = new URLSearchParams();
  p.set("m", state.machine);
  p.set("u", state.user);
  p.set("t", state.tab);
  p.set("f", state.flavor);
  if (state.done.length > 0) p.set("done", state.done.join(","));
  history.replaceState(null, "", "#" + p.toString());
}

inputs.machine.value = state.machine;
inputs.user.value = state.user;
Object.values(inputs).forEach((i) => i.addEventListener("input", render));

// tag static text nodes containing {{TOKENS}} so render() refreshes them
(function tagStatic() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const hits: Node[] = [];
  while (walker.nextNode()) {
    if (/\{\{\w+\}\}/u.test(walker.currentNode.nodeValue ?? "")) hits.push(walker.currentNode);
  }
  hits.forEach((n) => {
    const el = n.parentElement;
    if (
      el &&
      !Object.hasOwn(el.dataset, "tpl") &&
      !Object.hasOwn(el.dataset, "inl") &&
      !Object.hasOwn(el.dataset, "tplBrowser")
    ) {
      el.dataset["inl"] = el.textContent;
    }
  });
})();

// ---- tabs ----
const tabs = $$(".tab"),
  panels = $$(".taskpanel");
function setTab(id: string, scroll: boolean) {
  state.tab = id;
  save();
  tabs.forEach((t) => {
    t.classList.toggle("active", t.dataset["tab"] === id);
  });
  panels.forEach((p) => {
    p.classList.toggle("active", p.dataset["panel"] === id);
  });
  if (scroll) $("nav.tabs").scrollIntoView({ behavior: "smooth", block: "start" });
}
tabs.forEach((t) => t.addEventListener("click", () => setTab(t.dataset["tab"]!, true)));

// ---- copy ----
$$(".copy").forEach((btn) => {
  btn.addEventListener("click", () => {
    const pre = btn.parentElement!.querySelector("pre")!;
    navigator.clipboard
      .writeText(pre.textContent)
      .then(() => {
        btn.textContent = "Copied ✓";
        btn.classList.add("copied");
        toast();
        setTimeout(() => {
          btn.textContent = "Copy";
          btn.classList.remove("copied");
        }, 1400);
      })
      .catch((e: unknown) => {
        console.error("copy failed:", e);
      });
  });
});
let toastT: ReturnType<typeof setTimeout> | undefined;
function toast() {
  const t = $("#toast");
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), 1100);
}

// ---- step completion + per-tab done ----
const steps = $$(".step");
const inActiveFlavor = (s: Element) => {
  const fl = s.closest(".flavor");
  return !fl || fl.classList.contains("active");
};
function paintDone() {
  steps.forEach((s) => {
    s.classList.toggle("done", state.done.includes(s.dataset["step"]!));
  });
  const act = steps.filter(inActiveFlavor);
  const doneN = act.filter((s) => state.done.includes(s.dataset["step"]!)).length;
  $("#done-n").textContent = String(doneN);
  $("#total-n").textContent = String(act.length);
  $("#bar").style.width = (act.length > 0 ? (100 * doneN) / act.length : 0) + "%";
  // per-tab complete check (only steps in the active flavor count)
  tabs.forEach((t) => {
    const ps = $$(`.taskpanel[data-panel='${t.dataset["tab"]}'] .step`).filter(inActiveFlavor);
    const all = ps.length > 0 && ps.every((s) => state.done.includes(s.dataset["step"]!));
    t.classList.toggle("complete", all);
  });
}
function setFlavor(f: string) {
  state.flavor = f;
  save();
  $$(".flavor-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset["flavor"] === f);
  });
  $$(".flavor").forEach((p) => {
    p.classList.toggle("active", p.dataset["flavor"] === f);
  });
  paintDone();
}
$$(".flavor-btn").forEach((b) =>
  b.addEventListener("click", () => setFlavor(b.dataset["flavor"]!)),
);
steps.forEach((s) => {
  s.querySelector(".check")!.addEventListener("click", () => {
    const id = s.dataset["step"]!;
    state.done = state.done.includes(id) ? state.done.filter((x) => x !== id) : [...state.done, id];
    save();
    paintDone();
  });
});

render();
setTab(state.tab, false);
setFlavor(state.flavor);
paintDone();
