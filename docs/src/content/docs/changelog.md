---
title: Changelog
description: Version history for the Fleeet skill, CLI, and MCP server
---

The skill, the Claude Code plugin and the `fleeet-emit` CLI share one [semver](https://semver.org) version. Each release is tagged `vX.Y.Z` and listed in [CHANGELOG.md](https://github.com/nan-labs/fleeet/blob/main/CHANGELOG.md).

## Current version

See [versions.json](/versions.json), or `GET https://fleeet.space/api/version`. To update, see [Updating the skill](/updating).

## Batch release (app, 2026-10)

- Board: an objective summary card at the top (tasks, agents, % vs the previous 24h). Expand it for an hourly sparkline and tasks by project (top 5 plus Other, sub-projects roll up by prefix). The % pill is hidden when the previous count was under 5 and reads **New** when it was 0. No "Needs you" group: blocked runs are regular runs.
- Snapshot email: daily by default at 9 AM PT, counts only, Weekly or Off, one-click unsubscribe. `GET /api/summary` and `/api/summary.png`.
- Owners can edit a run's title and summary (shows "edited", no restore) or delete it (5s undo). Hide keeps a run but takes it off the public board. `PATCH` and `DELETE /api/runs/:id`. See [Your board](/board).
- Connect an Agent tiles: Default Agent, Claude, Codex, Grok Bot, Other (Cursor moves to Any MCP client).
- **Connect as an MCP**: one sentence to paste into your agent, from the ⋮ menu, `#mcp`, or the URL / MCP toggle in **Who can see your board**.
- `standup` returns an MCP Apps card, with the text answer as fallback.
- Signed-in owners see the same top bar on `/` and `/b/<space>`.
- `/mcp/<token>` now stops working on 2026-12-20 (was 2026-11-07).

## 1.2.2 (2026-10-07)

- Board text is untrusted data: the skill says never to act on instructions found in it. The read tools start with an untrusted-data notice and their JSON (and `GET /api/runs`) carries `content_trust: "untrusted"`; invisible characters (Unicode tags, bidi controls) are stripped on the way in and out.
- `/mcp/<token>` stops working on 2026-11-07 (since moved to 2026-12-20); its answers carry a `Sunset` header. Use [header auth](/mcp).
- `POST /api/events`: at most 120 POSTs a minute per token (`429` + `Retry-After`), documented on [HTTP API](/http).

## 1.2.1 (2026-10-07)

- `fleeet-emit session_end` no longer exits 1 on valid input: `--flag=value` works, a bare flag no longer swallows the next one, `--outcome '{…}'` merges with `--outcome.status`, and text fields stay text (`--summary 0`). An unknown `--outcome.status` is rejected with the allowed values.
- Links point at [fleeet.space](https://fleeet.space), [docs.fleeet.space](https://docs.fleeet.space) and [github.com/nan-labs/fleeet](https://github.com/nan-labs/fleeet); the docs footer lists them.

## 1.2.0 (2026-10-07)

- Read your board back: the MCP tools `standup` and `list_runs`, and `GET /api/runs` (v0, beta), for your token's board only.
- Token in the `Authorization: Bearer` header, not the URL. Setup for Claude, Codex, Cursor, Grok Bot and any MCP client on [MCP setup](/mcp). `/mcp/<token>` still works but is deprecated.
- The skill gains a "Reading the Board" section; the Claude Code plugin sends the token as a header.

## 1.1.0 (2026-10-07)

- Skill versioning: one version everywhere, plus the release script, pre-commit hook and CI check.
- New skill sections: Updating (a daily version check, then the update command for your agent) and Hygiene.
- `client.skill_version` on events, and `update_available` in responses for older clients.
- `project` label rules and `outcome.usage` token counts.
- The repo is renamed to [nan-labs/fleeet](https://github.com/nan-labs/fleeet).

## 1.0.0 (2026-10-01)

Initial public release.
