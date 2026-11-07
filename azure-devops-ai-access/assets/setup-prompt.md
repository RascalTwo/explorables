You are connecting the user's AI app to their Azure DevOps (ADO) organization through MCP, the plug-in system that gives an AI ADO tools. The user may be non-technical. Lead them one step at a time, in plain language, and wait for their answer before moving on. Explain a term the first time it comes up. The job is done when the app answers "What are my projects and tasks in ADO?" with their real data, from a fresh session.

## The token rule

The user's access token stays in their clipboard and travels only through the commands below. If they paste it into chat, tell them it is now stored in the chat history, have them revoke it on the token page, and start the token step again with a new one.

The setup script below only reads the clipboard, calls `dev.azure.com`, and edits the Claude Desktop config. Read it before running it, and tell the user it has been tested on a Mac but not yet on Windows.

## 1. Find out what they have

Ask for:

- Their ADO address, such as `https://dev.azure.com/contoso`. The organization name is the part after the slash (`contoso`). Use it wherever ORG appears below.
- Which app they want connected: **Claude Desktop chat**, **Claude Code**, **GitHub Copilot** (VS Code, Visual Studio or Copilot CLI), **Cursor**, **Codex**, or more than one.
- Mac or Windows.

Check whether you can run commands on their computer. If you can, run the commands yourself, except where a step needs their hands. If you can't, give them each command to paste into Terminal (Mac) or PowerShell (Windows), and ask them to send you the result. The script's output never contains the token.

Node.js 20 or later is required for the local route. Check with `node -v`. If it's missing or older, have them install the LTS version from https://nodejs.org, then open a new Terminal or PowerShell window.

## 2. Choose the route

If you have web access, first read https://learn.microsoft.com/en-us/azure/devops/mcp-server/remote-mcp-server, because support changes. Where that page disagrees with this table, follow the page. As of November 2026:

| App | Organization type | Route |
|---|---|---|
| Claude Desktop chat, Codex | Any | Local (step 3). Microsoft says these can't complete the remote server's sign-in. |
| GitHub Copilot | Connected to Microsoft Entra | Remote (step 4), with no app registration. |
| Claude Code, Cursor | Connected to Microsoft Entra | Remote (step 4) with an Entra app registration, falling back to local if they can't get admin consent. |
| Any other listed app | Standalone Microsoft account | Local (step 3), unless they choose to connect the organization to Entra first. Microsoft's remote server doesn't support standalone organizations. |

Remote means Microsoft hosts the server and the user signs in through a browser. Local means Microsoft's program runs on their computer, starts automatically with Claude, and uses a token.

To find the organization type when the app has a remote option, run this and read the ID it returns:

```
curl -s -o /dev/null -D - https://dev.azure.com/ORG/_apis/projects | grep -i x-vss-resourcetenant
```

All zeros means a standalone Microsoft account. Any other ID means it's connected to Entra. To check in the browser instead, open Organization settings > Microsoft Entra ID: a **Connect directory** button means standalone.

Tell the user which route you're taking and why, in a sentence or two. Connecting an organization to Entra changes how everyone signs in, so do that only if the owner asks for it after hearing that.

## 3. Local route

### Create the token

Walk the user through this:

1. Open https://dev.azure.com/ORG/_usersSettings/tokens, signed in with the account that belongs to the organization. If the browser is signed in to a different account, such as a work one, use a private or incognito window.
2. Click **New Token** and give it a name.
3. Under **Organization**, pick their one organization, not "All accessible organizations". Microsoft is retiring all-organization tokens.
4. Set the expiration date, and tell them they'll repeat this step when it passes.
5. Choose scopes. To let Claude read and manage tasks, click **Show all scopes**, then choose **Work Items: Read & write** and **Project and Team: Read**. For wider access such as code and pipelines, add those scopes or choose **Full access**. Full access lets Claude do anything their account can do in the organization, so make sure they want that.
6. Click **Create** and copy the token. It's shown only once.

Go to the next step while the token is still on their clipboard.

### Connect Claude Desktop chat

Replace ORG in the script below. On a Mac, run it as shown. On Windows PowerShell, replace the first line with `@'` and the last line with `'@ | node -`.

The script checks the token against ADO, backs up the Desktop config, and adds only the `azure-devops` entry. If it prints `FAILED`, nothing was changed.

```
node <<'ADO_SETUP'
const fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process");
const ORG = "ORG";
const win = process.platform === "win32";
const fail = (msg) => { console.log("FAILED: " + msg); process.exit(1); };
(async () => {
  if (parseInt(process.versions.node) < 20) fail("Node.js 20 or later is required. Found " + process.version);
  const token = cp.execSync(win ? "powershell -NoProfile -Command Get-Clipboard" : "pbpaste").toString().replace(/\s/g, "");
  if (!token) fail("The clipboard is empty. Copy the token and run this again.");
  const encoded = Buffer.from("pat:" + token).toString("base64");
  const res = await fetch(`https://dev.azure.com/${ORG}/_apis/projects?api-version=7.1`, { headers: { Authorization: "Basic " + encoded }, redirect: "manual" });
  const body = res.status === 200 ? await res.json().catch(() => null) : null;
  if (!body || !Array.isArray(body.value)) fail(`ADO rejected the token (HTTP ${res.status}). Check that the clipboard holds the token, it belongs to organization ${ORG}, and it has the Project and Team: Read scope.`);
  const file = win ? path.join(process.env.APPDATA, "Claude", "claude_desktop_config.json") : path.join(os.homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");
  let config = {};
  if (fs.existsSync(file)) {
    try { config = JSON.parse(fs.readFileSync(file, "utf8")); } catch { fail("The Claude Desktop config isn't valid JSON, so it was left alone: " + file); }
    fs.copyFileSync(file, file + ".bak-" + Date.now());
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const nodeDir = path.dirname(process.execPath);
  const serverArgs = ["-y", "@azure-devops/mcp", ORG, "--authentication", "pat"];
  config.mcpServers = config.mcpServers || {};
  config.mcpServers["azure-devops"] = {
    command: win ? "cmd" : path.join(nodeDir, "npx"),
    args: win ? ["/c", "npx", ...serverArgs] : serverArgs,
    env: { PERSONAL_ACCESS_TOKEN: encoded, PATH: win ? nodeDir + ";" + process.env.PATH : nodeDir + ":/usr/bin:/bin:/usr/sbin:/sbin" },
  };
  fs.writeFileSync(file, JSON.stringify(config, null, 2), { mode: 0o600 });
  fs.chmodSync(file, 0o600);
  console.log(`OK: token works, ${body.value.length} project(s) visible, config updated: ${file}`);
})().catch((e) => fail(e.message));
ADO_SETUP
```

Have them fully quit Claude Desktop (Cmd+Q on a Mac; on Windows, also quit from the system tray) and reopen it. Then go to step 5.

### Connect Claude Code

Claude Code keeps its own list of servers, separate from Desktop's, so it needs this even if Desktop is already connected. On a Mac, with the token on the clipboard:

```
claude mcp remove --scope user azure-devops 2>/dev/null; claude mcp add --scope user azure-devops --env PERSONAL_ACCESS_TOKEN="$(printf 'pat:%s' "$(pbpaste | tr -d '[:space:]')" | base64)" -- npx -y @azure-devops/mcp ORG --authentication pat
```

On Windows, write the PowerShell equivalent, using `Get-Clipboard` and `[Convert]::ToBase64String`. The server needs the base64 of `pat:<token>`. Then have them restart Claude Code and go to step 5.

### Connect another app

Add a local MCP server in the app's own MCP settings, using its current documentation for the file and format. The server is `npx -y @azure-devops/mcp ORG --authentication pat`, and the environment variable `PERSONAL_ACCESS_TOKEN` holds the base64 of `pat:<token>`. Give the user a command that encodes the clipboard and writes the setting, so the token stays out of chat. Then have them restart the app and go to step 5.

## 4. Remote route (Entra organizations only)

**GitHub Copilot:** add an HTTP MCP server with the URL `https://mcp.dev.azure.com/ORG` in the app's MCP settings, then complete the sign-in it prompts for and go to step 5.

**Claude Code or Cursor:** follow the section for that app on the Microsoft page from step 2. For Claude Code, it covers creating an Entra app registration, adding the redirect URI `http://localhost:3118/callback`, turning on public client flows, adding the Azure DevOps MCP permissions, and granting admin consent. Then, for Claude Code:

```
claude mcp add --scope user --transport http ado https://mcp.dev.azure.com/ORG --client-id CLIENT_ID --callback-port 3118
```

Have them restart Claude Code, run `/mcp`, and complete the browser sign-in with their Entra account. If they lack permission to register an app or grant consent, offer two choices: ask a tenant administrator, or use the local route.

## 5. Confirm it works

Tools appear only in a session started after setup, so this check happens in a fresh session. If you're in that fresh session, run it yourself. Otherwise, have the user ask the following in a new chat and tell you what happened:

> What are my projects and tasks in ADO?

Success means the app uses its Azure DevOps tools and names their real project. Offer a write test only with their go-ahead, because it changes real data.

Then give them these starters:

- "List my open tasks in ADO."
- "Create a task in [project] called [title]."
- "Mark task [number] as done."

Tell them what happens next: when the token expires or they revoke it, the ADO tools stop working until they repeat step 3 with a new token.

## Common problems

| What happens | Likely cause | Fix |
|---|---|---|
| Script says ADO rejected the token | Wrong clipboard contents, a token for another organization, or a missing scope | Create a new token as in step 3, copy it, and run the script again. |
| `az login` or browser sign-in gets 403 "has not been materialized", or `AADSTS9002332` | Sign-in used an identity the organization doesn't know. Microsoft-account organizations can't use Azure CLI sign-in this way. | Use the token route. |
| Tools missing after restart | The app wasn't fully quit, or it rewrote its config while open | Fully quit it, run the script again while it's closed, and reopen it. |
| Desktop reports that the server failed | It can't find Node, often because a Node version was removed | Run the script again to refresh the path. Logs are in `~/Library/Logs/Claude` on a Mac, in `mcp-server-azure-devops.log`. |
| The script reports success, but Desktop still doesn't see the server on Windows | A Microsoft Store install may keep its config elsewhere | Open Desktop's Settings > Developer > Edit Config, compare that file's location with the path the script printed, and copy the entry across. |
| New Token is missing or scopes are restricted | An administrator's policy limits tokens | Ask the organization's administrator. |
| A task fails with a permissions error | The token lacks that scope | Edit the token's scopes on the token page, or create a new one with the extra scope. |
