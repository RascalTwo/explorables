// data.js — every fact on the page, in one place, so the matrix, the tabs and the
// checklist can never disagree with each other. Researched 2026-09-25; each platform
// carries its sources. `disputed` marks a place where two official pages disagree.

export type RouteId = 'agents' | 'claude' | 'own' | 'upload';
export type Tone = 'good' | 'accent' | 'warn' | 'danger' | 'faint';
export type ScriptKind = 'local' | 'sandbox' | 'nonet' | 'none';
export type PlanKind = 'free' | 'paid' | 'business' | 'unknown';
export type Family = 'code' | 'chat';
export type Cmd = [label: string, hint: string, cmd: string];
export interface Platform {
  id: string; name: string; family: Family; vendor: string; sub: string;
  reads: { agents: boolean; claude: boolean; own: string | null; upload: boolean };
  scripts: ScriptKind; plan: PlanKind; planNote: string; disputed?: boolean; call: string;
  use: { lead: string; steps: string[]; cmds: Cmd[]; notes: string[] };
  make: { lead: string; must: string[]; extras: string; limits: string };
  src: [title: string, url: string][];
}
export interface Other { id: string; name: string; sub: string; family?: Family }
export interface Rule { id: string; title: string; why: string; hits: string[] }
export interface Line { t: string; kind: string; note?: string; fix?: string | null }

export const ASOF = '2026-09-25';

// Routes into a platform. Order = matrix column order.
export const ROUTES: { id: RouteId; label: string; hint: string }[] = [
  { id: 'agents', label: '.agents/skills/', hint: 'the shared folder most tools now read' },
  { id: 'claude', label: '.claude/skills/', hint: "Claude Code's folder — others read it too" },
  { id: 'own',    label: 'its own folder',  hint: 'a path only this tool uses' },
  { id: 'upload', label: 'upload a zip',    hint: 'a settings page in a web app' },
];

export const SCRIPTS: Record<ScriptKind, { label: string; tone: Tone; hint: string }> = {
  local:   { label: 'on your machine',       tone: 'good',   hint: 'Scripts run locally, with your network and your tools.' },
  sandbox: { label: 'cloud sandbox',         tone: 'accent', hint: 'Scripts run in the vendor’s container; network depends on settings.' },
  nonet:   { label: 'cloud, no internet',    tone: 'warn',   hint: 'Scripts run, but cannot reach any website.' },
  none:    { label: 'no scripts',            tone: 'danger', hint: 'Only the instructions are used.' },
};

export const PLANS: Record<PlanKind, { label: string; tone: Tone; rank: number }> = {
  free:     { label: 'free plan works', tone: 'good',   rank: 0 },
  paid:     { label: 'paid personal',   tone: 'accent', rank: 1 },
  business: { label: 'business plans',  tone: 'warn',   rank: 2 },
  unknown:  { label: 'not stated',      tone: 'faint',  rank: 3 },
};

export const FAMILIES: Record<Family, { label: string; note: string }> = {
  code: { label: 'Coding agents', note: 'A folder on disk. Scripts run on your machine.' },
  chat: { label: 'Chat apps',     note: 'Upload a zip in settings. Scripts run in the cloud, if at all.' },
};

export const PLATFORMS: Platform[] = [
  // ───────────────────────── coding agents ─────────────────────────
  {
    id: 'claude-code', name: 'Claude Code', family: 'code', vendor: 'Anthropic',
    sub: 'terminal, IDE, desktop',
    reads: { agents: false, claude: true, own: null, upload: false },
    scripts: 'local', plan: 'paid', planNote: 'Pro, Max, Team, Enterprise or a Console (API) account. The free claude.ai plan doesn’t include Claude Code.',
    call: '/name',
    use: {
      lead: 'Copy the skill folder into Claude’s skills folder. That is the whole install.',
      steps: [
        'Put the folder at <code>~/.claude/skills/&lt;name&gt;/</code> to have it in every project, or <code>.claude/skills/&lt;name&gt;/</code> inside one repo.',
        'Run <code>/skills</code> to check it loaded. A brand-new skills folder needs a restart; edits to an existing one reload live.',
        'Ask for what the skill does and Claude picks it up, or call it directly with <code>/&lt;name&gt;</code>.',
      ],
      cmds: [['Install for all projects', 'copies the folder into place', 'cp -R ./my-skill ~/.claude/skills/']],
      notes: [
        'Claude Code’s docs don’t list the shared <code>.agents/skills/</code> folder — use <code>.claude/skills/</code>. A symlink lets one copy serve both (section 3).',
        'Skills you uploaded on claude.ai download into Claude Code automatically (<code>~/.claude/skills/synced/</code>). That sync is one-way.',
        'Scripts run on your machine with full network access, so read a skill from an untrusted repo before you use it.',
      ],
    },
    make: {
      lead: 'The most forgiving host — and the one that makes it easiest to write a skill nobody else can load.',
      must: [
        'Nothing is strictly required: <code>name</code> defaults to the folder and <code>description</code> to the first paragraph. Set both anyway — every other host requires them.',
        'Invalid YAML fails <b>silently</b>: the skill loads with no fields and never triggers.',
      ],
      extras: 'Claude-only fields (<code>when_to_use</code>, <code>argument-hint</code>, <code>disable-model-invocation</code>, <code>context: fork</code>, <code>hooks</code>, <code>model</code>…) and body features (<code>${CLAUDE_SKILL_DIR}</code>, <code>$ARGUMENTS</code>, <code>!`cmd`</code>) work only here. Elsewhere they arrive as literal text — and on claude.ai the extra fields reject the upload outright.',
      limits: 'Description + <code>when_to_use</code> are cut at <b>1,536 characters</b>.',
    },
    src: [['Claude Code skills docs', 'https://code.claude.com/docs/en/skills']],
  },
  {
    id: 'codex', name: 'Codex', family: 'code', vendor: 'OpenAI',
    sub: 'CLI, IDE, ChatGPT desktop’s Codex side',
    reads: { agents: true, claude: false, own: null, upload: false },
    scripts: 'local', plan: 'free', planNote: 'Codex is included on every ChatGPT plan, Free and Go too.',
    call: '$name',
    use: {
      lead: 'Codex reads the shared <code>.agents/skills/</code> folder. The ChatGPT desktop app is Codex, so this covers it too.',
      steps: [
        'Put the folder at <code>~/.agents/skills/&lt;name&gt;/</code> for every project, or <code>.agents/skills/&lt;name&gt;/</code> in a repo.',
        'Restart Codex, then run <code>/skills</code> to see it.',
        'Ask normally and it triggers on its own, or call it with <code>$&lt;name&gt;</code>. In the ChatGPT desktop app use Work mode or the Codex side — plain Chat mode doesn’t load local skills.',
      ],
      cmds: [['Install for all projects', 'the shared folder — Cursor, Copilot and Antigravity read it too', 'cp -R ./my-skill ~/.agents/skills/']],
      notes: ['<code>$skill-installer &lt;name&gt;</code> installs from OpenAI’s curated catalog.'],
    },
    make: {
      lead: 'Codex follows the standard as written. Two things are specific to it.',
      must: [
        '<b>Descriptions share a budget</b> of 2% of the context window or 8,000 characters across every installed skill. When it’s tight, Codex shortens descriptions — put the trigger words first.',
      ],
      extras: 'Branding (display name, icon, colour) and the switch to stop auto-triggering go in a separate <code>agents/openai.yaml</code>, not in SKILL.md — so other hosts never see it.',
      limits: 'OpenAI’s recommended way to distribute is a <b>plugin</b>, which can bundle skills, MCP servers and apps.',
    },
    src: [['Codex: build skills', 'https://learn.chatgpt.com/docs/build-skills'], ['Codex on your ChatGPT plan', 'https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan']],
  },
  {
    id: 'antigravity', name: 'Antigravity', family: 'code', vendor: 'Google',
    sub: 'IDE and CLI · replaced Gemini CLI',
    reads: { agents: true, claude: false, own: '~/.gemini/…/skills/', upload: false },
    scripts: 'local', plan: 'free', planNote: 'There’s a $0 plan, and the skills docs don’t limit skills by plan.',
    call: '/name',
    use: {
      lead: 'Google’s coding agent. In a project it reads the shared <code>.agents/skills/</code>; your personal skills go in a Gemini folder.',
      steps: [
        'For one project: <code>.agents/skills/&lt;name&gt;/</code>.',
        'For every project: <code>~/.gemini/config/skills/&lt;name&gt;/</code> in Antigravity 2.0, or <code>~/.gemini/antigravity-cli/skills/&lt;name&gt;/</code> for the CLI. (Older IDE builds use <code>~/.gemini/antigravity/skills/</code>.)',
        'Ask normally, or call it with <code>/&lt;name&gt;</code>.',
      ],
      cmds: [['Install into this project', 'the shared project folder', 'mkdir -p .agents/skills && cp -R ./my-skill .agents/skills/']],
      notes: ['<b>Gemini CLI</b> stopped serving free, AI Pro and Ultra users on 2026-06-18. Its skills carry over to Antigravity CLI unchanged.'],
    },
    make: {
      lead: 'Standard-compatible, with one naming quirk.',
      must: ['<code>description</code> is required; <code>name</code> is optional and defaults to the folder.'],
      extras: 'Google’s docs call the optional folders <code>scripts/ examples/ resources/</code> rather than the standard’s <code>references/ assets/</code>. Both work — it only reads what SKILL.md links to.',
      limits: '',
    },
    src: [['Antigravity skills', 'https://antigravity.google/docs/skills/'], ['Gemini CLI → Antigravity CLI', 'https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/']],
  },
  {
    id: 'copilot', name: 'GitHub Copilot', family: 'code', vendor: 'GitHub',
    sub: 'VS Code, JetBrains, CLI, cloud agent',
    reads: { agents: true, claude: true, own: '.github/skills/', upload: false },
    scripts: 'local', plan: 'free', planNote: 'Copilot Free includes agent mode and the CLI, where skills run. The cloud agent needs a paid plan.',
    call: '/name',
    use: {
      lead: 'Copilot reads three project folders and two personal ones, so a skill you already have for another tool usually just works.',
      steps: [
        'Easiest: <code>gh skill install &lt;owner/repo&gt;</code>, which fetches it from GitHub.',
        'Or copy the folder to <code>.github/skills/</code>, <code>.agents/skills/</code> or <code>.claude/skills/</code> in a repo — or <code>~/.copilot/skills/</code> / <code>~/.agents/skills/</code> for all repos.',
        'In VS Code agent mode, ask normally or type <code>/</code> to pick it. In the CLI, <code>/skills list</code> shows what loaded.',
      ],
      cmds: [['Install from GitHub', 'GitHub CLI 2.90+, public preview', 'gh skill install owner/repo']],
      notes: ['The cloud agent and code review only see skills that are committed to the repo.'],
    },
    make: {
      lead: 'Strict about names — and it fails without telling you.',
      must: [
        'Folder name must equal <code>name</code>. A slash, colon, dot or namespace prefix in the name makes VS Code <b>silently skip</b> the skill.',
        '<code>allowed-tools</code> can pre-approve the shell. GitHub warns to use it only for skills you trust — users will see it.',
      ],
      extras: '<code>gh skill publish</code> validates your skill against the standard before release, and <code>--fix</code> repairs the metadata.',
      limits: 'Name ≤ 64 characters, description ≤ 1,024.',
    },
    src: [['About agent skills (GitHub Docs)', 'https://docs.github.com/en/copilot/concepts/agents/about-agent-skills'], ['VS Code agent skills', 'https://code.visualstudio.com/docs/copilot/customization/agent-skills'], ['gh skill changelog', 'https://github.blog/changelog/2026-04-16-manage-agent-skills-with-github-cli/']],
  },
  {
    id: 'cursor', name: 'Cursor', family: 'code', vendor: 'Anysphere',
    sub: 'editor and CLI',
    reads: { agents: true, claude: true, own: '.cursor/skills/', upload: false },
    scripts: 'local', plan: 'paid', planNote: 'Cursor’s pricing lists skills under Pro, not the free Hobby plan.',
    call: '/name',
    use: {
      lead: 'Cursor has supported skills since version 2.4 (January 2026) and reads the shared folder.',
      steps: [
        'Put the folder at <code>~/.agents/skills/&lt;name&gt;/</code> (all projects) or <code>.agents/skills/&lt;name&gt;/</code> (one repo). <code>.cursor/skills/</code>, <code>.claude/skills/</code> and <code>.codex/skills/</code> work too.',
        'In Agent chat, ask normally or type <code>/&lt;name&gt;</code>.',
        'Press <b>Option/Alt+Enter</b> on it to apply the skill for the whole session.',
      ],
      cmds: [['Install for all projects', 'the shared folder', 'cp -R ./my-skill ~/.agents/skills/']],
      notes: ['Your personal skills don’t reach Cursor’s Cloud Agents unless you turn that on.'],
    },
    make: {
      lead: 'Loads standard skills as they are. Distribution is the catch.',
      must: ['Cursor won’t install a skill straight from a GitHub link. Either tell users to copy the folder, or package it as a <b>plugin</b> in a marketplace.'],
      extras: 'Cursor-only fields (<code>paths</code>, <code>icon</code>, <code>color</code>) are ignored elsewhere — but they’d still break a claude.ai upload.',
      limits: '',
    },
    src: [['Cursor skills docs', 'https://cursor.com/docs/context/skills'], ['Cursor 2.4 changelog', 'https://cursor.com/changelog/2-4']],
  },

  // ───────────────────────── chat apps ─────────────────────────
  {
    id: 'claude-app', name: 'Claude app', family: 'chat', vendor: 'Anthropic',
    sub: 'claude.ai, desktop app',
    reads: { agents: false, claude: false, own: null, upload: true },
    scripts: 'sandbox', plan: 'free', planNote: 'Free, Pro, Max, Team and Enterprise, per the help center. An older developer page says Pro and up.',
    disputed: true,
    call: 'by name',
    use: {
      lead: 'Zip the folder and upload it in settings. Code execution has to be on.',
      steps: [
        'Zip the skill so the <b>folder</b> is at the top of the zip (<code>my-skill.zip → my-skill/SKILL.md</code>).',
        'Go to <b>Customize → Skills → + → Create skill → Upload a skill</b>, and pick the zip.',
        'Make sure code execution is on. On Team and Enterprise an owner must also switch on <b>Skills</b> and <b>Code execution</b> in Organization settings.',
        'Ask for the task and Claude uses the skill on its own, or name it: “use my brand-guidelines skill”.',
      ],
      cmds: [['Zip it the right way', 'run from the folder that contains my-skill/', 'zip -r my-skill.zip my-skill']],
      notes: [
        'An upload here doesn’t reach the Claude API. It does download to Claude Code if you’re signed in with the same account.',
        'Team and Enterprise admins can share a skill with the whole organization.',
      ],
    },
    make: {
      lead: 'The strictest host. If your skill uploads here, it will load almost anywhere.',
      must: [
        '<b>Only standard fields</b> in the frontmatter. Anything else fails the upload with <code>Unexpected key(s) in SKILL.md frontmatter</code>.',
        'Keep <code>description</code> to <b>200 characters</b>. The help center says 200; the standard says 1,024 — 200 is safe.',
        'No “claude” or “anthropic” in the name, and no XML tags in the name or description.',
        'Folder name must match <code>name</code>, and the folder must be at the top of the zip.',
      ],
      extras: 'Skills can’t call each other here, so don’t write “then use the X skill”.',
      limits: 'The maximum zip size isn’t published.',
    },
    src: [['Use skills in Claude', 'https://support.claude.com/en/articles/12512180-use-skills-in-claude'], ['How to create custom skills', 'https://support.claude.com/en/articles/12512198-how-to-create-custom-skills'], ['Agent Skills overview', 'https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview'], ['Frontmatter outside Claude Code', 'https://code.claude.com/docs/en/skills#using-skill-frontmatter-outside-claude-code']],
  },
  {
    id: 'chatgpt', name: 'ChatGPT', family: 'chat', vendor: 'OpenAI',
    sub: 'chat on web, desktop, mobile',
    reads: { agents: false, claude: false, own: null, upload: true },
    scripts: 'sandbox', plan: 'business', planNote: 'Business, Enterprise, Healthcare and Edu only. Free, Go, Plus and Pro can’t upload skills to chat.',
    call: '@name',
    use: {
      lead: 'On a work plan, upload it in the Plugins page. On a personal plan, use the Codex side of the desktop app instead.',
      steps: [
        'Open the sidebar → <b>Plugins</b> → <b>Skills</b> tab → <b>Create</b> → <b>Upload from your computer</b>.',
        'Wait for the scan. A skill comes back <b>Available</b>, <b>Needs review</b> or <b>Blocked</b>.',
        'Type <code>@&lt;name&gt;</code>, or just ask and it triggers on its own.',
      ],
      cmds: [],
      notes: [
        '<b>Personal plan?</b> Open the ChatGPT desktop app and use the Codex side (see the Codex tab). It works on every plan, Free included.',
        'A skill bundled inside a <b>plugin</b> can reach chat on any plan that can install that plugin.',
      ],
    },
    make: {
      lead: 'Most ChatGPT users are on personal plans, and they can’t upload your skill here.',
      must: [
        'To reach personal-plan users in chat, ship the skill inside a <b>plugin</b>. Otherwise point them to Codex.',
        'Uploads are scanned, so a script that downloads and runs code is the likeliest thing to get held for review.',
      ],
      extras: '',
      limits: 'OpenAI doesn’t publish the upload format or size limit for chat.',
    },
    src: [['Skills in ChatGPT', 'https://help.openai.com/en/articles/20001066-skills-in-chatgpt'], ['Codex: build skills', 'https://learn.chatgpt.com/docs/build-skills']],
  },
  {
    id: 'gemini-app', name: 'Gemini app', family: 'chat', vendor: 'Google',
    sub: 'gemini.google.com, Mac, mobile',
    reads: { agents: false, claude: false, own: null, upload: true },
    scripts: 'nonet', plan: 'paid', planNote: 'Personal Google AI Pro or Ultra, age 18+. Not in the EEA, UK, Switzerland or Nigeria.',
    call: '/name',
    use: {
      lead: 'Skills live under <b>Spark</b>, not in Gems. Upload the SKILL.md or a zip.',
      steps: [
        'On gemini.google.com, open the sidebar → <b>Switch to Spark</b> → <b>Skills</b>.',
        'Upload the <code>SKILL.md</code> alone, or a zip with SKILL.md at its top (100 MB max).',
        'Ask normally, or type <code>/</code> to pick it.',
      ],
      cmds: [],
      notes: [
        'Skills made here also work in the Mac app and in Spark on mobile (mobile only allows editing by chat).',
        '<b>Gems don’t take skills.</b> To use one in a Gem, paste the SKILL.md text into the Gem’s instructions (see Any other AI).',
      ],
    },
    make: {
      lead: 'The tightest sandbox of the eight.',
      must: [
        'Scripts <b>can’t reach any website</b>. Anything that calls an API or downloads a package will fail here.',
        'Text and code files only. A PDF, Word doc or image anywhere in the skill gets the upload rejected.',
      ],
      extras: '',
      limits: 'Whole skill ≤ 100 MB.',
    },
    src: [['Gemini Apps Help: skills', 'https://support.google.com/gemini/answer/17094296']],
  },
];

export const OTHER: Other = {
  id: 'other', name: 'Any other AI', sub: 'about 40 more tools, or none at all',
};

// Everything a skill author should do, and which of the eight it protects you on.
// `hits` = the platforms where skipping it causes a real failure, not just untidiness.
export const CHECKLIST: Rule[] = [
  { id: 'name', title: 'Folder name = <code>name</code>. Lowercase letters, digits and single hyphens, 64 characters max.',
    why: 'claude.ai rejects the upload; VS Code skips the skill without saying so.',
    hits: ['claude-app', 'copilot', 'codex', 'cursor', 'antigravity', 'chatgpt', 'gemini-app'] },
  { id: 'desc', title: 'Description says what it does <b>and when to use it</b>, trigger words first, 200 characters max.',
    why: 'The description is the only thing that makes the skill trigger. claude.ai caps it at 200; Codex shortens long ones when many skills are installed.',
    hits: ['claude-code', 'codex', 'antigravity', 'copilot', 'cursor', 'claude-app', 'chatgpt', 'gemini-app'] },
  { id: 'fields', title: 'Only standard fields in the frontmatter: <code>name</code>, <code>description</code>, <code>license</code>, <code>compatibility</code>, <code>metadata</code>, <code>allowed-tools</code>.',
    why: 'Any other key fails the claude.ai upload outright. Tool-specific settings belong in a separate file.',
    hits: ['claude-app'] },
  { id: 'paths', title: 'Plain relative paths like <code>scripts/run.py</code>. No <code>${CLAUDE_SKILL_DIR}</code>, <code>$ARGUMENTS</code> or <code>!`cmd`</code>.',
    why: 'Those only work in Claude Code. Everywhere else they arrive as literal text the model has to guess at.',
    hits: ['codex', 'antigravity', 'copilot', 'cursor', 'claude-app', 'chatgpt', 'gemini-app'] },
  { id: 'short', title: 'SKILL.md under 500 lines. Move detail into <code>references/</code>, linked directly from SKILL.md.',
    why: 'Only SKILL.md loads when the skill triggers; the rest loads when needed. A long SKILL.md costs context everywhere.',
    hits: ['claude-code', 'codex', 'antigravity', 'copilot', 'cursor', 'claude-app', 'chatgpt', 'gemini-app'] },
  { id: 'offline', title: 'Scripts work <b>offline</b>, with dependencies listed in <code>compatibility</code>.',
    why: 'The Gemini app blocks all network access from scripts, and in the claude.ai and ChatGPT sandboxes network access depends on settings you don’t control.',
    hits: ['gemini-app', 'claude-app', 'chatgpt'] },
  { id: 'text', title: 'Text and code files only. No PDFs, Word docs or images inside the skill.',
    why: 'The Gemini app rejects the whole upload if it finds one.',
    hits: ['gemini-app'] },
  { id: 'zip', title: 'When you zip it, the <b>folder</b> goes at the top: <code>my-skill.zip → my-skill/SKILL.md</code>.',
    why: 'Every upload-based app expects this layout.',
    hits: ['claude-app', 'chatgpt', 'gemini-app'] },
  { id: 'solo', title: 'Self-contained. No secrets in the files, and no “then use the X skill”.',
    why: 'claude.ai says skills can’t reference each other, and whoever installs your skill can read every file in it.',
    hits: ['claude-app', 'chatgpt', 'gemini-app'] },
  { id: 'ship', title: 'Publish it as a public GitHub repo, and say how to install it.',
    why: 'Copilot installs straight from a repo; Cursor and ChatGPT personal plans need a plugin instead.',
    hits: ['copilot', 'cursor', 'chatgpt'] },
];

// The annotated SKILL.md. `kind`: ok = standard, host = one tool only, break = fails
// somewhere. `fix` is the portable replacement (null = delete the line).
export const ANATOMY: Line[] = [
  { t: '---', kind: 'frame' },
  { t: 'name: pdf-report', kind: 'ok', note: 'Required everywhere. Must match the folder name exactly: <code>pdf-report/</code>.' },
  { t: 'description: Builds a branded PDF report from a CSV. Use when the user asks for a report, a PDF, or a summary of a spreadsheet.', kind: 'ok', note: 'Required. The only text the AI sees before it decides to use the skill — say what it does, then <b>when</b>. This one is 136 characters, under claude.ai’s 200.' },
  { t: 'when_to_use: any time a CSV is attached', kind: 'break', fix: null, note: 'Claude Code only. Everyone else ignores it — except claude.ai, which <b>rejects the upload</b>. Fold it into the description.' },
  { t: 'argument-hint: [csv-path]', kind: 'break', fix: null, note: 'Claude Code (and VS Code) only. Same problem: the claude.ai upload fails.' },
  { t: 'compatibility: Python 3.10+, no network needed', kind: 'ok', note: 'Optional standard field. The place to say what the skill needs — hosts and people both read it.' },
  { t: 'license: MIT', kind: 'ok', note: 'Optional standard field.' },
  { t: '---', kind: 'frame' },
  { t: '', kind: 'blank' },
  { t: '# PDF report', kind: 'body' },
  { t: '', kind: 'blank' },
  { t: '1. Read the CSV the user gave you.', kind: 'body' },
  { t: '2. Run `python ${CLAUDE_SKILL_DIR}/scripts/build.py <csv>`', kind: 'break', fix: '2. Run `python scripts/build.py <csv>` from this skill’s folder.', note: '<code>${CLAUDE_SKILL_DIR}</code> is filled in by Claude Code only. Anywhere else the model sees the literal text and has to guess. A plain relative path works everywhere.' },
  { t: '3. Follow the house style in references/style.md.', kind: 'ok', note: 'Detail lives in <code>references/</code> and is loaded only when needed. Link it straight from SKILL.md — one level deep.' },
  { t: '4. pip install reportlab if it is missing.', kind: 'break', fix: '4. Uses only the Python standard library (see compatibility).', note: 'The Gemini app has no internet, and cloud sandboxes may block installs, so this step fails there. Make the script work without it.' },
];

export const TREE: { t: string; kind: string; note: string }[] = [
  { t: 'pdf-report/', kind: 'dir', note: 'The folder name is the skill’s name.' },
  { t: '  SKILL.md', kind: 'ok', note: 'The only required file. Capital letters — SKILL.md.' },
  { t: '  scripts/build.py', kind: 'ok', note: 'Optional. Code the skill can run, where the host runs code.' },
  { t: '  references/style.md', kind: 'ok', note: 'Optional. Extra instructions, loaded only when SKILL.md points to them.' },
  { t: '  assets/template.md', kind: 'ok', note: 'Optional. Templates and files the skill uses. Keep them as text: the Gemini app rejects images and PDFs.' },
  { t: '  agents/openai.yaml', kind: 'host', note: 'Codex-only extras (icon, display name). A separate file, so every other host just ignores it. This is the right way to add tool-specific settings.' },
];
