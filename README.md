# explorables

My collection of **explorable explanations** — small interactive web pages that try to make
an idea click by letting you poke at it, not just read about it. Some are serious, plenty are
just for fun. **Feel free to explore.**

[Explorable explanations](https://en.wikipedia.org/wiki/Explorable_explanation) are a small
genre with real history: the term comes from Bret Victor's 2011 essay, the idea was popularized
by Nicky Case ([explorabl.es](https://explorabl.es)), and the machine-learning branch lived at
[Distill.pub](https://distill.pub) (2017–2021). Historically each one was hand-crafted over days
or weeks. Most of these aren't — they were **generated with AI** (often in collaboration with
[Claude](https://claude.com/claude-code)) and then hand-tuned. That's the only new thing here:
cheap to make, so there can be a lot of them.

## How they're made

The visualizations are built with a custom **`/viz` skill** that lives right here in this repo
under [`skills/viz/`](./skills/viz) (a spec-compliant [Agent Skill](https://agentskills.io)).
It serves ad-hoc HTML/CSS/JS visualizations at a live,
hot-reloading local URL, keeps every page in git, and can publish any of them as a single
self-contained HTML file to a static host. It's included so the tool and its output live
together — take it, read it, adapt it.

## Layout

- **`viz-pages/`** — the explorables themselves. Each is a self-contained folder with an
  `index.html`; open it in a browser, no build step.
- **`skills/viz/`** — the `/viz` skill that generates and serves them, in the portable
  [Agent Skills](https://agentskills.io) `SKILL.md` format (works in Claude Code, Codex,
  Gemini CLI, Cursor, and other compatible tools).

## License

MIT — see [LICENSE](LICENSE).
