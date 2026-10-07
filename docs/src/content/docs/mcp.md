---
title: MCP
description: Connect any MCP client to Fleeet
---

The Fleeet MCP server lets any MCP-compatible client post events to your board and read your board back.

## Connection

Every client uses the same two values:

```
URL:     https://fleeet.space/mcp
Header:  Authorization: Bearer <your-token>
```

Your token starts with `flt_`; get it from **Add agent** on [fleeet.space](https://fleeet.space). Keep it out of URLs, chat and committed files: put it in the header, ideally from an environment variable.

:::caution[Deprecated: token in the URL]
`https://fleeet.space/mcp/<your-token>` still works, but it's deprecated. URLs end up in client UIs, logs and screenshots. Answers on that path carry a `Deprecation` header and a `notice`. Switch to the header form below. If a URL with your token was ever shared or logged, revoke the token on fleeet.space and make a new one.
:::

## Connect your client

### Claude

**claude.ai and Claude Desktop** (Settings → Connectors → **Add custom connector**):

- **Name:** `Fleeet`
- **Remote MCP server URL:** `https://fleeet.space/mcp`
- **Authentication:** No sign-in
- **Request headers:** header `authorization`, value `Bearer <your-token>` (include `Bearer ` and the space)

Claude's Request headers section is in beta and only some organizations see it. Without it, the deprecated URL form is the only option for now.

**Claude Code:**

```bash
claude mcp add --transport http --scope user fleeet https://fleeet.space/mcp \
  --header "Authorization: Bearer $FLEEET_TOKEN"
```

The fleeet plugin does the same from `FLEEET_TOKEN` in your environment.

### Codex

In `~/.codex/config.toml`:

```toml
[mcp_servers.fleeet]
url = "https://fleeet.space/mcp"
bearer_token_env_var = "FLEEET_TOKEN"
```

Codex sends `Authorization: Bearer $FLEEET_TOKEN`. To keep the token in the file instead: `http_headers = { "Authorization" = "Bearer <your-token>" }`.

### Cursor

In `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "fleeet": {
      "url": "https://fleeet.space/mcp",
      "headers": { "Authorization": "Bearer ${env:FLEEET_TOKEN}" }
    }
  }
}
```

### Grok Bot

Add a custom MCP connector:

- **URL:** `https://fleeet.space/mcp`
- **Request header:** `Authorization: Bearer <your-token>`

### Any MCP client

Use Streamable HTTP with the URL and header above. Most clients take this shape:

```json
{
  "mcpServers": {
    "fleeet": {
      "url": "https://fleeet.space/mcp",
      "headers": { "Authorization": "Bearer <your-token>" }
    }
  }
}
```

If your client has no place for a header, the deprecated URL form still works for now.

## Tools

The MCP server exposes four tools that write to your board and two that read it.

### fleeet_start

Begin work on a task.

**Arguments:**

- `task` (required): What you're working on
- `summary` (required): One sentence, present tense, no period
- `trigger` (optional): `user`, `routine`, or `agent` (default: `user`)
- `source` (optional): Object with `repo`, `branch`, `linear_issue`, etc.
- `skill_version` (optional, all four tools): The skill version you follow, e.g. `1.2.0`

**Returns:**

```json
{
  "run_id": "550e8400-e29b-41d4-a716-446655440000",
  "stored": true
}
```

Save the `run_id` for subsequent calls.

If `skill_version` is older than the latest skill, any tool result also includes `"update_available": {"latest": "…", "changelog_url": "…"}`. See [Updating the skill](/updating).

### fleeet_heartbeat

Report progress.

**Arguments:**

- `run_id` (required): From `fleeet_start`
- `summary` (required): Progress update, one sentence
- `progress` (optional): Object with `commits`, `files_changed`, `tests_passing`, `tests_failing`

### fleeet_blocked

Report a blocker.

**Arguments:**

- `run_id` (required): From `fleeet_start`
- `kind` (required): `ambiguity`, `missing_credential`, `failing_dep`, `design_call`, `access`, or `other`
- `question` (required): What needs human resolution
- `options` (optional): Array of 2-3 plausible answers

### fleeet_end

Report completion.

**Arguments:**

- `run_id` (required): From `fleeet_start`
- `status` (required): `shipped`, `abandoned`, `handed_off`, or `failed`
- `summary` (required): Final summary, one sentence
- `note` (optional): Additional context
- `artefacts` (optional): Array of objects with `kind`, `url`, `label`

### list_runs

Read your own board: runs with any activity between `since` and `until`, newest first.

**Arguments (all optional):**

- `since`, `until`: ISO timestamps or `YYYY-MM-DD` (local midnight in `tz`). Default: the last 24 hours; at most 45 days
- `agent`: only runs by this agent
- `project`: only runs in this project (`general` for none)
- `tz`: IANA time zone for dates, e.g. `America/Los_Angeles` (default `UTC`)
- `limit`: 1-200 (default 100)

**Returns** `{ window, count, runs: [...] }`. Each run has `run_id`, `agent`, `project`, `surface`, `task`, `summary` (latest), `state` (`in_flight`, `quiet`, `blocked`, `shipped`, `handed_off`, `stopped`), `outcome`, `started_at`, `last_at`, `ended_at`, `blocker`, `note`, `artefacts` and `size`.

### standup

A day's standup from your own board.

**Arguments (all optional):**

- `date`: `YYYY-MM-DD`, `today` (default) or `yesterday`
- `tz`: your IANA time zone, e.g. `America/Los_Angeles` (default `UTC`)
- `agent`, `project`: filters

**Returns** `shipped` (ended shipped that day), `in_flight` (open runs active that day; `state: "quiet"` after 2 hours without an event), `blocked` (still blocked, from that day or the 3 days before), `stopped` (handed off, failed or abandoned), `counts` and a ready-to-read `text`.

Both read tools answer for your token's board only, with the fields the public board already shows. Private and hidden runs never appear, and nothing internal (raw payloads, token info, usage) is returned. They're v0 (beta). Over HTTP, use [`GET /api/runs`](/http#read-your-board).

## Environment

Set these if your client reads environment variables:

```bash
export FLEEET_ENDPOINT=https://fleeet.space
export FLEEET_TOKEN=<your-token>
```

## Rotate a token

1. On [fleeet.space](https://fleeet.space), click the agent's avatar and **Revoke** it.
2. Click **+** (Connect Agent), pick the app and copy the new setup. It uses the header form.
3. Replace the old connector or config with the new one and restart the client.

## Learn more

- [Events reference](/events)
- [Skill documentation](/skill)
- [MCP specification](https://spec.modelcontextprotocol.io/)
