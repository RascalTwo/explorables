# Gemini app skills, measured (as of 2026-10-23)

Google's help page was wrong or silent on several upload rules, so they were read from the Gemini web app's own code and tested by uploading. Account: a Google Workspace (business) account on gemini.google.com, web build `boq_gemini-web-uiserver_20261022.15_p0`. Confidence: 🟢 read from Google's code or reproduced by upload · 🟡 measured, cause unknown · 🔴 inferred.

## Upload checks in the browser (read from the upload dialog's code)

These run before anything is sent, so they are exact for this build. Minified names will change between builds.

| Rule | Code | Message shown |
|---|---|---|
| Extension must be one of 47: `.bmp .c .cc .cpp .css .csv .cxx .docx .gif .go .h .heic .heif .hh .hpp .htm .html .hxx .ico .ipynb .java .jpeg .jpg .js .json .md .odp .ods .odt .pdf .png .pptx .py .rs .rtf .sh .svg .tif .tiff .tsv .txt .webp .xlsx .xml .yaml .yml` | `hVm` set, checked by `iVm(path)`; a name without a dot is rejected | "The skill folder contains a file with an unsupported file type." |
| At most 100 files | `if(d.length>100)` | "The skill folder contains too many files." |
| At most 100 MiB | `size>104857600` | "The skill folder is too large." |
| `SKILL.md` at the first level of the folder (a single shared top folder is stripped) | | "SKILL.md file is missing. It must be in the first level of the folder." |
| Folder name equals the `name` in SKILL.md | | 'Folder name "…" does not match SKILL.md name "…".' |
| Name not already used by one of your skills | | 'A skill named "…" already exists.' |
| Skipped silently before any check: `.ds_store`, `thumbs.db`, `desktop.ini`, names starting `._`, anything under `__MACOSX/` | `z4b`, `A4b` | none |

Upload tests agreed with the code 🟢: 100 files passed and 101 failed; `.woff2` and `.toml` were refused; `.html`, `.css`, `.js`, `.svg`, `.sh`, `.png` and a `template/` folder were accepted.

## Upload checks on Google's server (measured)

These fail after the upload with a generic "There was an error uploading the skill" (batchexecute rpc `SMuXte`).

- `.docx` passes the browser check and is refused by the server. 🟢 (Google's page also says Word and Excel files aren't supported.)
- A normal multi-line `.json` file is accepted. A one-line `{"a":1}` named `.json` failed 3 of 3 times; the same bytes named `.txt` passed. 🟡
- Retrying in the same dialog right after a failed upload can return the generic error for a valid zip; reload first. 🟡
- A security scan reads the instructions. `reply with exactly the codeword … and nothing else` was refused with "The uploaded file did not pass the security scan"; the same skill worded as plain information passed. 🟢 for that case; the scan's rules are unknown.

## Where Google's help page disagrees

Help page: https://support.google.com/gemini/answer/17094296 `Supported file types`

| File | Help page | What happens |
|---|---|---|
| `.toml`, `.env`, `.sql`, `.tex`, `.log`, `.rst`, `Makefile`, `Dockerfile` | supported | refused by the browser check (`.toml` uploaded and refused 🟢; the rest from the code 🔴 not each uploaded) |
| `.js` | not listed | accepted 🟢 |
| `.docx`, `.xlsx` | not supported | `.docx` passes the browser, refused by the server 🟢 |
| File count | no limit stated | 100 🟢 |
| `.DS_Store` | "might cause the upload to fail" | skipped silently 🟢 |

The dialog itself says "PDF, CSV, PY, TXT, and MD files", narrower than both.

## In chat: which files Gemini can use (saved skills, then asked about them)

Invoked with `@name`; the prompt box says "/ is now @". 🟢

| Skill contents | Result |
|---|---|
| SKILL.md only | loads; answered from SKILL.md 🟢 |
| SKILL.md + PNG in `assets/` | loads; described the image correctly 🟢 |
| SKILL.md + PNG in `references/` | loads; described the image correctly 🟢 |
| SKILL.md + one `.md` in `assets/` | "the skill failed to load" 🟢 |
| SKILL.md + `.md` files in `references/` (one nested) | failed to load, again ~20 minutes after saving 🟢 |
| SKILL.md + `scripts/*.js` + `assets/*.css` | failed to load 🟢 |

So, as of 2026-10-23, any text file besides SKILL.md makes the skill fail to load, whatever folder it is in; images work. When it fails, Gemini's code sandbox is empty and it may fall back to searching the user's Drive. Nothing public documents this, so it may be a bug that gets fixed. 🟡 cause unknown.

## A skill and Canvas can't both be on (measured with the viz skill)

viz converted by agent-skill-to-gemini-skill: one 195K-character SKILL.md with 23 files inlined. Uploaded, saved and used in the same Workspace account.

| Test | Result |
|---|---|
| `@viz` + "show how a TCP three-way handshake works" | made an image, not a page 🟢 |
| `@viz` + "which version are you, which mode, quote the first line of kit/viz.js" | quoted the version, the mode and the kit line exactly, so the whole file loads, including text 100K+ characters in 🟢 |
| same reply, then asked to build | gave one HTML file in a code block ("save it and open it"); did not use Canvas and did not paste in the kit as told 🟢 |
| Canvas turned on first, then `@viz` | the `@` skill picker never appears 🟢 |
| typing `@` (seen by the user in their own chat) | Gemini shows "Avatar, Skills and Connectors are not available." 🟢 |
| `@viz` picked first, then the tools menu | Canvas is gone from the menu; only Deep research is left 🟢 |
| Canvas on, no `@`, "use my viz skill" | built a Canvas page but said it has no viz version, so the skill wasn't used 🟢 |

Google documents this: skills "do not yet work with features like Canvas and Deep Research", and Canvas, Deep research, Create video, Create music and Guided learning are listed as Gem tools that don't work with skills. 🟢 https://support.google.com/gemini/answer/18560919 `Do skills work with other Gemini features?` Gemini Enterprise, a separate paid product, says the opposite: "Skills work best with Canvas when a skill has only one SKILL.md file." 🟢 https://docs.cloud.google.com/gemini/enterprise/docs/skills `work best with Canvas`

So, as of 2026-10-23, a skill can't hand its output to Canvas. A skill that builds pages has to give the HTML as a code block. Gems could make Canvas their default tool, so this is a step back from Gems.

## Gems

- Personal accounts: Gems become read-only and turn into skills on 2026-11-17, and are removed on 2026-12-17. 🟢 https://support.google.com/gemini/answer/18560919 `December 17`
- Workspace: business, enterprise and nonprofit in March 2027, education in June 2027 (the Workspace post says no sooner than 2027-03-01 and 2027-06-01). 🟢 same page; https://workspaceupdates.googleblog.com/2026/09/skills-gemini-app-workspace.html `March 1, 2027`
- Sharing skills: "In the coming weeks, skills will have the features you loved in Gems, including the ability to share them with others." 🟢 support.google.com/gemini/answer/18560919 `share them with others`
