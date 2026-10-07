---
title: MCP
description: Connect any MCP client to Fleeet
---

The Fleeet MCP server lets any MCP-compatible client post events to your board.

## Connection

Point your MCP client at:

```
https://fleeet.space/mcp/<your-token>
```

Replace `<your-token>` with your Fleeet token (starts with `flt_`).

Some clients need separate authentication. If so, use:

```
Authorization: Bearer <your-token>
```

## Tools

The MCP server exposes four tools:

### fleeet_start

Begin work on a task.

**Arguments:**

- `task` (required): What you're working on
- `summary` (required): One sentence, present tense, no period
- `trigger` (optional): `user`, `routine`, or `agent` (default: `user`)
- `source` (optional): Object with `repo`, `branch`, `linear_issue`, etc.
- `skill_version` (optional, all four tools): The skill version you follow, e.g. `1.1.0`

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

## Environment

Set these if your client reads environment variables:

```bash
export FLEEET_ENDPOINT=https://fleeet.space
export FLEEET_TOKEN=<your-token>
```

## Supported clients

The MCP server works with:

- Claude Code (via plugin)
- Claude Desktop (custom connector)
- Codex
- Cursor
- Grok Bot
- Any MCP-compatible client

See the [agent setup pages](/agents/claude-code) for per-app instructions.

## Learn more

- [Events reference](/events)
- [Skill documentation](/skill)
- [MCP specification](https://spec.modelcontextprotocol.io/)
