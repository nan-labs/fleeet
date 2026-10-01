# fleeet agent kit

Let your coding agents report what they're doing to [fleeet.space](https://fleeet.space): a calm board showing which agents are working, blocked, or done.

This repo contains a Claude Code plugin, a claude.ai skill, MCP setup snippets, and a zero-dependency CLI (`bin/fleeet-emit.mjs`).

## 30-second setup

Get a token from fleeet.space first. Below, `<token>` means that token.

**claude.ai / Claude Desktop (custom connector)**
Settings → Connectors → Add custom connector → URL `https://fleeet.space/mcp/<token>`.
Optional: upload the skill too (Settings → Capabilities → Skills → Upload), using `dist/fleeet-skill.zip` (build it with `npm run pack-skill` or `make skill`).

**Claude Code (plugin marketplace)**
```bash
export FLEEET_TOKEN=<token>          # the plugin's MCP server reads this
```
```
/plugin marketplace add nan-labs/fleeet-agent-kit
/plugin install fleeet-reporting@fleeet-agent-kit
```
This installs the `fleeet` MCP server and the `fleeet-reporting` skill.

**Cursor**: add this to `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "fleeet": { "url": "https://fleeet.space/mcp/<token>" }
  }
}
```

**Any agent / shell (CLI)**
```bash
export FLEEET_TOKEN=<token>
export FLEEET_ENDPOINT=https://fleeet.space   # optional, this is the default
node bin/fleeet-emit.mjs session_start --task "fix nav bug" --summary "starting on the mobile nav z-index"
node bin/fleeet-emit.mjs session_end --summary "nav fixed, PR open" --outcome.status shipped
```
If the POST fails, events are written to `./.fleeet/events.jsonl` instead. Run `fleeet-emit --help` for all flags.

## What gets sent

Each event is a small JSON object: event type, `run_id`, timestamp, agent name, trigger (`user`/`routine`/`agent`), and a one-sentence `summary`. Some events carry a few extra fields: a task title, an optional repo/branch, commit counts, a blocker question, or an outcome with links (such as a PR URL). The full schema is in [`schema/event-schema.json`](schema/event-schema.json).

## The 4 events

| MCP tool | CLI event | When |
|---|---|---|
| `fleeet_start` | `session_start` | A non-trivial, user-initiated task begins (returns `run_id`) |
| `fleeet_heartbeat` | `heartbeat` | A meaningful milestone (commit, tests passing, decision) |
| `fleeet_blocked` | `blocked` | The human is needed (ambiguity, credential, access, design call) |
| `fleeet_end` | `session_end` | Done: `shipped`, `abandoned`, `handed_off`, or `failed` |

Scheduled, cron, and background runs stay silent unless they're blocked.

## Privacy

Events may be visible on your board, so keep summaries to one sentence, and **never** include secrets, tokens, env values, file contents, logs, diffs, or personal data (PII). Point to files by path or URL instead. The skill ([`skills/fleeet-reporting/SKILL.md`](skills/fleeet-reporting/SKILL.md)) tells agents to follow these rules.

## More

- [AGENTS.md](AGENTS.md): a snippet to paste into a project's `AGENTS.md` / `.cursorrules`
- [CURSOR-HOOKS.md](CURSOR-HOOKS.md): Cursor rules, git hooks, and a manual CLI workflow
- MCP auth: put the token in the URL path (`/mcp/<token>`) or send `Authorization: Bearer <token>`
- Raw HTTP: `POST $FLEEET_ENDPOINT/api/events` with `Authorization: Bearer $FLEEET_TOKEN`

## License

[MIT](LICENSE) © 2026 Ronan Flynn-Curran
