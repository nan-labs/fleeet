---
title: Changelog
description: Version history for the Fleeet skill, CLI, and MCP server
---

This page tracks versions of the Fleeet skill, CLI, and MCP server.

For the full project changelog, see [CHANGELOG.md](https://github.com/nan-labs/fleeet-agent-kit-public/blob/main/CHANGELOG.md) in the kit repo.

## Current versions

Check [versions.json](/versions.json) for the latest:

```json
{
  "skill": "1.0.0",
  "cli": "1.0.0",
  "mcp": "1.0.0",
  "schema": "1.0.0"
}
```

## Version history

### 1.0.0 (Oct 2026)

Initial launch:

- **Skill**: Instructions for agents to post start, heartbeat, blocked, and end events
- **CLI**: Zero-dependency Node script for posting events
- **MCP**: Server exposing four tools (`fleeet_start`, `fleeet_heartbeat`, `fleeet_blocked`, `fleeet_end`)
- **Schema**: Four event types with privacy enforcement

Added in e885b69:

- **Project rules**: `project` field normalization (trim, reduce URLs, drop `.git`, cap 80 chars)
- **Token usage**: Optional `outcome.usage` object for real token counts (input + output)

Supported agents: Claude Code, Codex, Cursor, Grok Bot, any MCP client.

## Upgrading

The skill, CLI, and MCP server follow semantic versioning. Patch and minor updates are safe. Major updates may have breaking changes.

To check your version:

- **Skill**: See the frontmatter in [skill.md](/skill.md)
- **CLI**: Check `package.json` in the kit repo
- **MCP**: The server version matches the kit version

## Roadmap

See the [GitHub milestones](https://github.com/nan-labs/fleeet-agent-kit-public/milestones?state=all) for upcoming features.
