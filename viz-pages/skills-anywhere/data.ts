// data.js — every fact on the page, in one place, so the matrix, the tabs and the
// checklist can never disagree with each other. Researched 2026-09-25, re-checked 2026-10-19; each platform
// carries its sources. `disputed` marks a place where two official pages disagree.

export type RouteId = "agents" | "claude" | "own" | "upload";
export type Tone = "good" | "accent" | "warn" | "danger" | "faint";
export type ScriptKind = "local" | "sandbox" | "nonet" | "none";
export type PlanKind = "free" | "paid" | "business" | "unknown";
export type Family = "code" | "chat";
export type Cmd = [label: string, hint: string, cmd: string];
export interface Platform {
  id: string;
  name: string;
  family: Family;
  vendor: string;
  sub: string;
  reads: { agents: boolean; claude: boolean; own: string | null; upload: boolean };
  scripts: ScriptKind;
  plan: PlanKind;
  planNote: string;
  disputed?: boolean;
  call: string;
  use: { lead: string; steps: string[]; cmds: Cmd[]; notes: string[] };
  make: { lead: string; must: string[]; extras: string; limits: string };
  src: [title: string, url: string][];
}
export interface Other {
  id: string;
  name: string;
  sub: string;
  family?: Family;
}
export interface Rule {
  id: string;
  title: string;
  why: string;
  hits: string[];
}
export interface Line {
  t: string;
  kind: string;
  note?: string;
  fix?: string | null;
}

export const ASOF = "2026-10-19";

// Routes into a platform. Order = matrix column order.
export const ROUTES: { id: RouteId; label: string; hint: string }[] = [
  { id: "agents", label: ".agents/skills/", hint: "the shared folder most tools now read" },
  { id: "claude", label: ".claude/skills/", hint: "Claude Code's folder — others read it too" },
  { id: "own", label: "its own folder", hint: "a path only this tool uses" },
  { id: "upload", label: "upload a zip", hint: "a settings page in a web app" },
];

export const SCRIPTS: Record<ScriptKind, { label: string; tone: Tone; hint: string }> = {
  local: {
    label: "on your machine",
    tone: "good",
    hint: "Scripts run locally, with your network and your tools.",
  },
  sandbox: {
    label: "cloud sandbox",
    tone: "accent",
    hint: "Scripts run in the vendor’s container; network depends on settings.",
  },
  nonet: {
    label: "cloud, no internet",
    tone: "warn",
    hint: "Scripts run, but cannot reach any website.",
  },
  none: { label: "no scripts", tone: "danger", hint: "Only the instructions are used." },
};

export const PLANS: Record<PlanKind, { label: string; tone: Tone; rank: number }> = {
  free: { label: "free plan works", tone: "good", rank: 0 },
  paid: { label: "paid personal", tone: "accent", rank: 1 },
  business: { label: "business plans", tone: "warn", rank: 2 },
  unknown: { label: "not stated", tone: "faint", rank: 3 },
};

export const FAMILIES: Record<Family, { label: string; note: string }> = {
  code: { label: "Coding agents", note: "A folder on disk. Scripts run on your machine." },
  chat: {
    label: "Chat apps",
    note: "Upload a zip in settings. Scripts run in the cloud, if at all.",
  },
};

// The four AIs shown up front: the two most-used coding assistants and the two most-used chat apps.
export const FEATURED = ["claude-code", "copilot", "chatgpt", "gemini-app"];

export const PLATFORMS: Platform[] = [
  // ───────────────────────── coding agents ─────────────────────────
  {
    id: "claude-code",
    name: "Claude Code",
    family: "code",
    vendor: "Anthropic",
    sub: "terminal, IDE, desktop",
    reads: { agents: false, claude: true, own: null, upload: false },
    scripts: "local",
    plan: "paid",
    planNote:
      "Pro, Max, Team, Enterprise or a Console (API) account. The free claude.ai plan doesn’t include Claude Code.",
    call: "/name",
    use: {
      lead: "Copy the skill folder into Claude’s skills folder. That is the whole install.",
      steps: [
        "Put the folder at <code>~/.claude/skills/&lt;name&gt;/</code> to have it in every project, or <code>.claude/skills/&lt;name&gt;/</code> inside one repo.",
        "Run <code>/skills</code> to check it loaded. Edits to existing skills reload live; if you just created the skills folder itself, run <code>/reload-skills</code> (or restart).",
        "Ask for what the skill does and Claude picks it up, or call it directly with <code>/&lt;name&gt;</code>.",
      ],
      cmds: [
        [
          "Install for all projects",
          "copies the folder into place",
          "mkdir -p ~/.claude/skills && cp -R ./my-skill ~/.claude/skills/",
        ],
      ],
      notes: [
        "Claude Code’s docs don’t list the shared <code>.agents/skills/</code> folder — use <code>.claude/skills/</code>. A symlink lets one copy serve both (see “Use it in several AIs at once” below).",
        "Skills you uploaded on claude.ai download into Claude Code automatically (<code>~/.claude/skills/synced/</code>). It needs Claude Code 2.1.273 or later and a claude.ai sign-in, not an API key, and it is one-way.",
        "Skills in <code>~/.claude/skills/</code> load in the terminal, IDE and desktop app, but not in Cowork or cloud sessions. Those only see skills on your claude.ai account.",
        "Scripts run on your machine with full network access, so read a skill from an untrusted repo before you use it.",
      ],
    },
    make: {
      lead: "The most forgiving host — and the one that makes it easiest to write a skill nobody else can load.",
      must: [
        "Nothing is strictly required: <code>name</code> defaults to the folder and <code>description</code> to the first non-empty line of the body. Set both anyway — every other host requires them.",
        "Invalid YAML fails <b>silently</b>: the skill loads with no fields, so it stops matching on its description (<code>/name</code> still works). Run Claude Code with <code>--debug</code> to see the parse error.",
      ],
      extras:
        "Claude-only fields (<code>when_to_use</code>, <code>argument-hint</code>, <code>disable-model-invocation</code>, <code>context: fork</code>, <code>hooks</code>, <code>model</code>…) and body features (<code>${CLAUDE_SKILL_DIR}</code>, <code>$ARGUMENTS</code>, <code>!`cmd`</code>) work only in Claude Code (and <code>${CLAUDE_SKILL_DIR}</code> also in Cowork). Elsewhere they arrive as literal text — and on claude.ai the extra fields reject the upload outright.",
      limits:
        "Description + <code>when_to_use</code> are cut at <b>1,536 characters</b> by default, and all your skills’ descriptions share about 1% of the context window. Past that, the least-used skills lose their descriptions first.",
    },
    src: [["Claude Code skills docs", "https://code.claude.com/docs/en/skills"]],
  },
  {
    id: "codex",
    name: "Codex",
    family: "code",
    vendor: "OpenAI",
    sub: "CLI, IDE, ChatGPT desktop’s Codex side",
    reads: { agents: true, claude: false, own: null, upload: false },
    scripts: "local",
    plan: "free",
    planNote:
      "Codex on your own machine (CLI, IDE, desktop app) is included on every ChatGPT plan, Free and Go too. Codex Cloud needs Plus or higher.",
    call: "$name",
    use: {
      lead: "Codex reads the shared <code>.agents/skills/</code> folder. The ChatGPT desktop app has a Codex side, so this covers it too.",
      steps: [
        "Put the folder at <code>~/.agents/skills/&lt;name&gt;/</code> for every project, or <code>.agents/skills/&lt;name&gt;/</code> in a repo.",
        "Run <code>/skills</code> to see it. Codex picks up new skills on its own; if it doesn’t show, restart Codex.",
        "Ask normally and it triggers on its own, or call it with <code>$&lt;name&gt;</code>. In the ChatGPT desktop app, switch to the Codex side.",
      ],
      cmds: [
        [
          "Install for all projects",
          "the shared folder — Cursor and Copilot read it too (Antigravity only inside a project)",
          "mkdir -p ~/.agents/skills && cp -R ./my-skill ~/.agents/skills/",
        ],
      ],
      notes: ["<code>$skill-installer &lt;name&gt;</code> installs from OpenAI’s curated catalog."],
    },
    make: {
      lead: "Codex follows the standard as written. Two things are specific to it.",
      must: [
        "<b>Descriptions share a budget</b> of at most 2% of the context window (8,000 characters if that’s unknown) across every installed skill (<code>skills.max_context_tokens</code> in the config raises it). When it’s tight, Codex shortens descriptions — put the trigger words first.",
      ],
      extras:
        "Branding (display name, icon, colour) and the switch to stop auto-triggering go in a separate <code>agents/openai.yaml</code>, not in SKILL.md — so other hosts never see it.",
      limits:
        "OpenAI’s recommended way to distribute is a <b>plugin</b>, which can bundle skills, MCP servers and apps.",
    },
    src: [
      ["Codex: build skills", "https://learn.chatgpt.com/docs/build-skills"],
      [
        "Codex on your ChatGPT plan",
        "https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan",
      ],
    ],
  },
  {
    id: "antigravity",
    name: "Antigravity",
    family: "code",
    vendor: "Google",
    sub: "IDE and CLI · replaced Gemini CLI",
    reads: { agents: true, claude: false, own: "~/.gemini/…/skills/", upload: false },
    scripts: "local",
    plan: "free",
    planNote: "There’s a $0 plan, and the skills docs don’t limit skills by plan.",
    call: "/name",
    use: {
      lead: "Google’s coding agent. In a project it reads the shared <code>.agents/skills/</code>; your personal skills go in a Gemini folder.",
      steps: [
        "For one project: <code>.agents/skills/&lt;name&gt;/</code>.",
        "For every project: <code>~/.gemini/config/skills/&lt;name&gt;/</code> in Antigravity 2.0, or <code>~/.gemini/antigravity-cli/skills/&lt;name&gt;/</code> for the CLI. (The older <code>~/.gemini/antigravity/skills/</code> still works in the IDE.)",
        "Ask normally, or call it with <code>/&lt;name&gt;</code>.",
      ],
      cmds: [
        [
          "Install into this project",
          "the shared project folder",
          "mkdir -p .agents/skills && cp -R ./my-skill .agents/skills/",
        ],
      ],
      notes: [
        "<b>Gemini CLI</b> stopped serving free, AI Pro and Ultra users on 2026-06-18. A skill’s contents work unchanged in Antigravity CLI, but the folders moved: <code>.gemini/skills/</code> is now <code>.agents/skills/</code> and <code>~/.gemini/skills/</code> is now <code>~/.gemini/antigravity-cli/skills/</code>. Move them by hand.",
      ],
    },
    make: {
      lead: "Standard-compatible, with one naming quirk.",
      must: [
        "<code>description</code> is required; <code>name</code> is optional and defaults to the folder.",
      ],
      extras:
        "Google’s docs call the optional folders <code>scripts/ examples/ resources/</code> rather than the standard’s <code>references/ assets/</code>.",
      limits: "",
    },
    src: [
      ["Antigravity skills", "https://antigravity.google/docs/skills/"],
      [
        "Gemini CLI → Antigravity CLI",
        "https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/",
      ],
    ],
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    family: "code",
    vendor: "GitHub",
    sub: "VS Code, JetBrains, CLI, cloud agent",
    reads: { agents: true, claude: true, own: ".github/skills/", upload: false },
    scripts: "local",
    plan: "free",
    planNote:
      "GitHub’s skills docs don’t name a plan. Copilot Free includes agent mode and the CLI, where skills run, so Free should work.",
    call: "/name",
    use: {
      lead: "Copilot reads three project folders and two personal ones, so a skill you already have for another tool usually just works.",
      steps: [
        "Easiest: <code>gh skill install &lt;owner/repo&gt;</code>, which fetches it from GitHub.",
        "Or copy the folder to <code>.github/skills/</code>, <code>.agents/skills/</code> or <code>.claude/skills/</code> in a repo — or <code>~/.copilot/skills/</code> / <code>~/.agents/skills/</code> for all repos.",
        "In VS Code agent mode, ask normally or type <code>/</code> to pick it. In the CLI, <code>/skills list</code> shows what loaded.",
      ],
      cmds: [
        ["Install from GitHub", "GitHub CLI 2.90+, public preview", "gh skill install owner/repo"],
        [
          "Install for another AI",
          "same command, aimed at Claude Code, Cursor, Codex, Antigravity and about 40 more",
          "gh skill install owner/repo --agent claude-code --scope user",
        ],
      ],
      notes: [
        "<code>gh skill install</code> isn’t only for Copilot: <code>--agent</code> puts the skill in another tool’s folder, and <code>--scope user</code> makes it available in every project.",
      ],
    },
    make: {
      lead: "Strict about names — and it fails without telling you.",
      must: [
        "Folder name must equal <code>name</code>. A slash, colon, dot or namespace prefix in the name makes VS Code <b>silently skip</b> the skill.",
        "<code>allowed-tools</code> can pre-approve the shell. GitHub warns to use it only for skills you trust.",
      ],
      extras:
        "<code>gh skill publish</code> validates your skill against the standard before release, and <code>--fix</code> repairs the metadata.",
      limits: "Name ≤ 64 characters, description ≤ 1,024.",
    },
    src: [
      [
        "About agent skills (GitHub Docs)",
        "https://docs.github.com/en/copilot/concepts/agents/about-agent-skills",
      ],
      [
        "VS Code agent skills",
        "https://code.visualstudio.com/docs/copilot/customization/agent-skills",
      ],
      [
        "gh skill changelog",
        "https://github.blog/changelog/2026-04-16-manage-agent-skills-with-github-cli/",
      ],
    ],
  },
  {
    id: "cursor",
    name: "Cursor",
    family: "code",
    vendor: "Anysphere",
    sub: "editor and CLI",
    reads: { agents: true, claude: true, own: ".cursor/skills/", upload: false },
    scripts: "local",
    plan: "free",
    planNote:
      "The skills docs don’t name a plan, and every plan includes Agent, Free too (with limited requests). Only the team skills marketplace needs Teams or Enterprise.",
    call: "/name",
    use: {
      lead: "Cursor has supported skills since version 2.4 (January 2026) and reads the shared folder.",
      steps: [
        "Put the folder at <code>~/.agents/skills/&lt;name&gt;/</code> (all projects) or <code>.agents/skills/&lt;name&gt;/</code> (one repo). <code>.cursor/skills/</code>, <code>.claude/skills/</code> and <code>.codex/skills/</code> work too.",
        "In Agent chat, ask normally or type <code>/&lt;name&gt;</code>.",
        "Press <b>Option/Alt+Enter</b> on it to apply the skill for the whole session.",
      ],
      cmds: [
        [
          "Install for all projects",
          "the shared folder",
          "mkdir -p ~/.agents/skills && cp -R ./my-skill ~/.agents/skills/",
        ],
      ],
      notes: [
        "Cursor’s Cloud Agents only get skills from <code>~/.cursor/skills/</code>, not <code>~/.agents/skills/</code>, and only after you turn on <b>Settings → Agents → Sync Skills for Cloud Agents</b>.",
      ],
    },
    make: {
      lead: "Loads standard skills as they are. Distribution is the catch.",
      must: [
        "Cursor won’t install a single skill from a GitHub link. Either tell users to copy the folder (or use <code>gh skill install --agent cursor</code>), or package it as a <b>plugin</b>: <b>Customize → From GitHub Repository</b> needs a <code>.cursor-plugin/marketplace.json</code> in the repo.",
      ],
      extras:
        "Cursor-only fields (<code>paths</code>, <code>icon</code>, <code>color</code>) are ignored elsewhere — but they’d still break a claude.ai upload.",
      limits: "",
    },
    src: [
      ["Cursor skills docs", "https://cursor.com/docs/context/skills"],
      ["Cursor 2.4 changelog", "https://cursor.com/changelog/2-4"],
    ],
  },

  // ───────────────────────── chat apps ─────────────────────────
  {
    id: "claude-app",
    name: "Claude app",
    family: "chat",
    vendor: "Anthropic",
    sub: "claude.ai, desktop app",
    reads: { agents: false, claude: false, own: null, upload: true },
    scripts: "sandbox",
    plan: "free",
    planNote:
      "Free, Pro, Max, Team and Enterprise, per the help center. An older developer page says Pro and up.",
    disputed: true,
    call: "by name",
    use: {
      lead: "Zip the folder and upload it in settings. Code execution has to be on.",
      steps: [
        "Zip the skill so the <b>folder</b> is at the top of the zip (<code>my-skill.zip → my-skill/SKILL.md</code>).",
        "Go to <b>Customize → Skills → + → Create skill → Upload a skill</b>, and pick the zip.",
        "Make sure code execution is on. On Enterprise an owner must also check that <b>Skills</b> and <b>Code execution</b> are on in Organization settings; Team has them on by default.",
        "Ask for the task and Claude uses the skill on its own, or name it: “use my brand-guidelines skill”.",
      ],
      cmds: [
        [
          "Zip it the right way",
          "run from the folder that contains my-skill/",
          "zip -r my-skill.zip my-skill",
        ],
      ],
      notes: [
        "An upload here doesn’t reach the Claude API. It does download to Claude Code 2.1.273 or later if you’re signed in with the same claude.ai account.",
        "On Team and Enterprise, owners can provision a skill for everyone, and members can share one with colleagues or publish it to the organization when an owner allows it.",
      ],
    },
    make: {
      lead: "The strictest host. If your skill uploads here, it will load almost anywhere.",
      must: [
        "<b>Only standard fields</b> in the frontmatter. Anything else fails the upload with <code>Unexpected key(s) in SKILL.md frontmatter</code>.",
        "Keep <code>description</code> to <b>200 characters</b>. The help center says 200; the standard says 1,024 — 200 is safe.",
        "No “claude” or “anthropic” in the name, and no XML tags in the name or description.",
        "Folder name must match <code>name</code>, and the folder must be at the top of the zip.",
      ],
      extras: "Skills can’t call each other here, so don’t write “then use the X skill”.",
      limits: "The maximum zip size isn’t published.",
    },
    src: [
      [
        "Use skills in Claude",
        "https://support.claude.com/en/articles/12512180-use-skills-in-claude",
      ],
      [
        "How to create custom skills",
        "https://support.claude.com/en/articles/12512198-how-to-create-custom-skills",
      ],
      [
        "Agent Skills overview",
        "https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview",
      ],
      [
        "Frontmatter outside Claude Code",
        "https://code.claude.com/docs/en/skills#using-skill-frontmatter-outside-claude-code",
      ],
    ],
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    family: "chat",
    vendor: "OpenAI",
    sub: "chat on web, desktop, mobile",
    reads: { agents: false, claude: false, own: null, upload: true },
    scripts: "sandbox",
    plan: "business",
    planNote:
      "Business, Enterprise, Healthcare and Edu only. Free, Go, Plus and Pro can’t upload skills to chat.",
    call: "@name",
    use: {
      lead: "On a work plan, upload it in the Plugins page. On a personal plan, use the Codex side of the desktop app instead.",
      steps: [
        "Open the sidebar → <b>Plugins</b> → <b>Skills</b> tab → <b>Create</b> → <b>Upload from your computer</b>.",
        "Wait for the scan. Most skills are ready straight away; some are marked <b>Needs review</b> or <b>Blocked</b>.",
        "Type <code>@&lt;name&gt;</code>, or just ask and it triggers on its own.",
      ],
      cmds: [],
      notes: [
        "<b>Personal plan?</b> Open the ChatGPT desktop app and use the Codex side (see the Codex tab). It works on every plan, Free included.",
        "A skill bundled inside a <b>plugin</b> can reach chat on any plan that can install that plugin.",
      ],
    },
    make: {
      lead: "Personal ChatGPT plans can’t upload your skill here.",
      must: [
        "To reach personal-plan users in chat, ship the skill inside a <b>plugin</b>. Otherwise point them to Codex.",
        "Uploads are scanned, and a skill can come back marked <b>Needs review</b> or <b>Blocked</b>.",
      ],
      extras: "",
      limits: "OpenAI doesn’t publish the upload format or size limit for chat.",
    },
    src: [
      ["Skills in ChatGPT", "https://help.openai.com/en/articles/20001066-skills-in-chatgpt"],
      ["Codex: build skills", "https://learn.chatgpt.com/docs/build-skills"],
    ],
  },
  {
    id: "gemini-app",
    name: "Gemini app",
    family: "chat",
    vendor: "Google",
    sub: "gemini.google.com, desktop, mobile",
    reads: { agents: false, claude: false, own: null, upload: true },
    scripts: "nonet",
    plan: "free",
    planNote:
      "Free: no Google AI subscription needed. Personal Google Accounts and Google Workspace (work and school) accounts both qualify. Needs age 18+ and Keep Activity on. Still rolling out, so it may not show on every account yet.",
    call: "@name",
    use: {
      lead: "Skills live in <b>Customize → Skills</b>. Upload the SKILL.md, a folder or a zip.",
      steps: [
        "On gemini.google.com, click <b>Customize</b> in the sidebar (under <b>More</b> if you don’t see it) → <b>Skills</b> → <b>Upload</b>.",
        "Upload the <code>SKILL.md</code> alone, or a folder or zip with SKILL.md at its top or inside one folder named exactly like the skill (100 files and 100 MB max).",
        "Ask normally, or type <code>@</code> to pick it (<code>/</code> was renamed to <code>@</code>). You can use several skills in one request.",
      ],
      cmds: [],
      notes: [
        "Skills you add on the web also show up in the desktop and mobile apps. Upload on the web to be safe; Google doesn’t say whether the phone app can upload.",
        "On a work or school account, skills in the Gemini app and skills in Gmail, Docs and the other Workspace apps don’t sync. Add the skill in each place.",
        "<b>Gems are being retired, but skills can’t replace every Gem yet.</b> On personal accounts Gems go read-only and turn into draft skills on 2026-11-17, and are removed on 2026-12-17. Work accounts lose Gems in March 2027 and school accounts in June 2027.",
        "<b>Skills don’t work with Canvas yet</b>, or with Deep Research, Create video, Create music and Guided learning. A skill that builds pages hands you the HTML as a code block instead. If a Gem depends on Canvas, keep it as a Gem while you still can; move everything else to a skill.",
        "Skills can’t be shared yet; Google says sharing is coming. For now, each person uploads the zip.",
      ],
    },
    make: {
      lead: "The strictest host here: no network for scripts, and for now only SKILL.md and images load.",
      must: [
        "<b>Put all text in SKILL.md.</b> As of 2026-10-23, a skill with any other text file (references, scripts, CSS) uploads fine, then fails to load in chat. Images load, and Gemini can see them. Google doesn’t document this.",
        "Only 47 file types upload: <code>.bmp .c .cc .cpp .css .csv .cxx .docx .gif .go .h .heic .heif .hh .hpp .htm .html .hxx .ico .ipynb .java .jpeg .jpg .js .json .md .odp .ods .odt .pdf .png .pptx .py .rs .rtf .sh .svg .tif .tiff .tsv .txt .webp .xlsx .xml .yaml .yml</code>. One other file rejects the whole upload, including fonts, files with no extension (<code>Makefile</code>, <code>LICENSE</code>) and <code>.toml</code>, despite Google’s list. Word and Excel files pass that check and are then refused.",
        "Scripts <b>can’t reach any website</b>. Anything that calls an API or downloads a package will fail here.",
        "Uploads are security-scanned. Instructions that read like a prompt injection (“reply with exactly X and nothing else”) are refused.",
      ],
      extras:
        "<code>.DS_Store</code>, <code>Thumbs.db</code>, <code>._*</code> files and <code>__MACOSX/</code> are skipped automatically, so a Finder zip is fine.",
      limits: "Whole skill ≤ 100 files and ≤ 100 MB.",
    },
    src: [
      ["Gemini Apps Help: skills", "https://support.google.com/gemini/answer/17094296"],
      ["Gems to skills", "https://support.google.com/gemini/answer/18560919"],
      [
        "Skills in the Gemini app for Workspace",
        "https://workspaceupdates.googleblog.com/2026/09/skills-gemini-app-workspace.html",
      ],
    ],
  },
];

export const OTHER: Other = {
  id: "other",
  name: "Any other AI",
  sub: "about 40 more tools, or none at all",
};

// Everything a skill author should do, and which of the eight it protects you on.
// `hits` = the platforms where skipping it causes a real failure, not just untidiness.
export const CHECKLIST: Rule[] = [
  {
    id: "name",
    title:
      "Folder name = <code>name</code>. Lowercase letters, digits and single hyphens, 64 characters max.",
    why: "claude.ai rejects the upload; VS Code skips the skill without saying so.",
    hits: ["claude-app", "copilot", "codex", "cursor", "antigravity", "chatgpt", "gemini-app"],
  },
  {
    id: "desc",
    title:
      "Description says what it does <b>and when to use it</b>, trigger words first, 200 characters max.",
    why: "The description is the only thing that makes the skill trigger. claude.ai caps it at 200; Codex shortens long ones when many skills are installed.",
    hits: [
      "claude-code",
      "codex",
      "antigravity",
      "copilot",
      "cursor",
      "claude-app",
      "chatgpt",
      "gemini-app",
    ],
  },
  {
    id: "fields",
    title:
      "Only standard fields in the frontmatter: <code>name</code>, <code>description</code>, <code>license</code>, <code>compatibility</code>, <code>metadata</code>, <code>allowed-tools</code>.",
    why: "Any other key fails the claude.ai upload outright. Tool-specific settings belong in a separate file.",
    hits: ["claude-app"],
  },
  {
    id: "paths",
    title:
      "Plain relative paths like <code>scripts/run.py</code>. No <code>${CLAUDE_SKILL_DIR}</code>, <code>$ARGUMENTS</code> or <code>!`cmd`</code>.",
    why: "Those only work in Claude Code. Everywhere else they arrive as literal text the model has to guess at.",
    hits: ["codex", "antigravity", "copilot", "cursor", "claude-app", "chatgpt", "gemini-app"],
  },
  {
    id: "short",
    title:
      "SKILL.md under 500 lines. Move detail into <code>references/</code>, linked directly from SKILL.md.",
    why: "Only SKILL.md loads when the skill triggers; the rest loads when needed. A long SKILL.md costs context everywhere. Exception: the Gemini app currently fails to load skills with extra text files, so inline them there.",
    hits: [
      "claude-code",
      "codex",
      "antigravity",
      "copilot",
      "cursor",
      "claude-app",
      "chatgpt",
      "gemini-app",
    ],
  },
  {
    id: "offline",
    title: "Scripts work <b>offline</b>, with dependencies listed in <code>compatibility</code>.",
    why: "The Gemini app blocks all network access from scripts, and in the claude.ai sandbox network access depends on settings you don’t control.",
    hits: ["gemini-app", "claude-app"],
  },
  {
    id: "text",
    title:
      "Common text, code and image files only, 100 at most. No fonts, Word or Excel files, or files without an extension.",
    why: "The Gemini app rejects the whole upload over one file outside its 47 types, and its list differs from Google’s docs (<code>.toml</code> is refused, <code>.js</code> is fine).",
    hits: ["gemini-app"],
  },
  {
    id: "zip",
    title:
      "Zip the <b>folder</b>, not its contents: <code>my-skill.zip → my-skill/SKILL.md</code>.",
    why: "claude.ai requires it, and the Gemini app accepts it too (then checks the folder name matches <code>name</code>). ChatGPT doesn’t publish a layout.",
    hits: ["claude-app", "gemini-app"],
  },
  {
    id: "solo",
    title: "Self-contained. No secrets in the files, and no “then use the X skill”.",
    why: "claude.ai says skills can’t reference each other, and whoever installs your skill can read every file in it.",
    hits: ["claude-app"],
  },
  {
    id: "ship",
    title: "Publish it as a public GitHub repo, and say how to install it.",
    why: "<code>gh skill install</code> installs straight from a repo into Copilot, Cursor and dozens more; Cursor’s own installer and ChatGPT personal plans need a plugin instead.",
    hits: ["copilot", "cursor", "chatgpt"],
  },
];

// The annotated SKILL.md. `kind`: ok = standard, host = one tool only, break = fails
// somewhere. `fix` is the portable replacement (null = delete the line).
export const ANATOMY: Line[] = [
  { t: "---", kind: "frame" },
  {
    t: "name: pdf-report",
    kind: "ok",
    note: "Required on most hosts (Claude Code and Antigravity default it to the folder name). Must match the folder name exactly: <code>pdf-report/</code>.",
  },
  {
    t: "description: Builds a branded PDF report from a CSV. Use when the user asks for a report, a PDF, or a summary of a spreadsheet.",
    kind: "ok",
    note: "Required. With the name, the only text the AI sees before it decides to use the skill — say what it does, then <b>when</b>. This one is 114 characters, under claude.ai’s 200.",
  },
  {
    t: "when_to_use: any time a CSV is attached",
    kind: "break",
    fix: null,
    note: "Claude Code only. Everyone else ignores it — except claude.ai, which <b>rejects the upload</b>. Fold it into the description.",
  },
  {
    t: "argument-hint: [csv-path]",
    kind: "break",
    fix: null,
    note: "Claude Code (and VS Code) only. Same problem: the claude.ai upload fails.",
  },
  {
    t: "compatibility: Python 3.10+, no network needed",
    kind: "ok",
    note: "Optional standard field. The place to say what the skill needs — hosts and people both read it.",
  },
  { t: "license: MIT", kind: "ok", note: "Optional standard field." },
  { t: "---", kind: "frame" },
  { t: "", kind: "blank" },
  { t: "# PDF report", kind: "body" },
  { t: "", kind: "blank" },
  { t: "1. Read the CSV the user gave you.", kind: "body" },
  {
    t: "2. Run `python ${CLAUDE_SKILL_DIR}/scripts/build.py <csv>`",
    kind: "break",
    fix: "2. Run `python scripts/build.py <csv>` from this skill’s folder.",
    note: "<code>${CLAUDE_SKILL_DIR}</code> is filled in by Claude Code only. Anywhere else the model sees the literal text and has to guess. A plain relative path works everywhere.",
  },
  {
    t: "3. Follow the house style in references/style.md.",
    kind: "ok",
    note: "Detail lives in <code>references/</code> and is loaded only when needed. Link it straight from SKILL.md — one level deep.",
  },
  {
    t: "4. pip install reportlab if it is missing.",
    kind: "break",
    fix: "4. Uses only the Python standard library (see compatibility).",
    note: "The Gemini app has no internet, and cloud sandboxes may block installs, so this step fails there. Make the script work without it.",
  },
];

export const TREE: { t: string; kind: string; note: string }[] = [
  { t: "pdf-report/", kind: "dir", note: "The folder name is the skill’s name." },
  { t: "  SKILL.md", kind: "ok", note: "The only required file. Capital letters — SKILL.md." },
  {
    t: "  scripts/build.py",
    kind: "ok",
    note: "Optional. Code the skill can run, where the host runs code.",
  },
  {
    t: "  references/style.md",
    kind: "ok",
    note: "Optional. Extra instructions, loaded only when SKILL.md points to them.",
  },
  {
    t: "  assets/template.md",
    kind: "ok",
    note: "Optional. Templates and files the skill uses. Keep them as plain text: the Gemini app rejects Word and Excel files.",
  },
  {
    t: "  agents/openai.yaml",
    kind: "host",
    note: "Codex-only extras (icon, display name). A separate file, so every other host just ignores it. This is the right way to add tool-specific settings.",
  },
];
