---
title: Changelog
description: Version history for the Fleeet skill, CLI, and MCP server
---

The skill, the Claude Code plugin and the `fleeet-emit` CLI share one [semver](https://semver.org) version. Each release is tagged `vX.Y.Z` and listed in [CHANGELOG.md](https://github.com/nan-labs/fleeet/blob/main/CHANGELOG.md).

## Current version

See [versions.json](/versions.json), or `GET https://fleeet.space/api/version`. To update, see [Updating the skill](/updating).

## 1.1.0 (2026-10-07)

- Skill versioning: one version everywhere, plus the release script, pre-commit hook and CI check.
- New skill sections: Updating (a daily version check, then the update command for your agent) and Hygiene.
- `client.skill_version` on events, and `update_available` in responses for older clients.
- `project` label rules and `outcome.usage` token counts.
- The repo is renamed to [nan-labs/fleeet](https://github.com/nan-labs/fleeet).

## 1.0.0 (2026-10-01)

Initial public release.
