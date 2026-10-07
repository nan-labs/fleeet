# Changelog

All notable changes to the fleeet agent kit: the fleeet-reporting skill, the
Claude Code plugin and marketplace entry, the event schema and the
`fleeet-emit` CLI. They share one version ([semver](https://semver.org);
the rule is in [CONTRIBUTING.md](CONTRIBUTING.md)). Releases are tagged
`vX.Y.Z`; `npm run release` dates the Unreleased notes below.

## [Unreleased]

## [1.1.0] - 2026-10-07

### Added

- **Skill versioning.** One version for the skill, plugin, marketplace entry, npm package and CLI. The skill states it in its opening line ("Fleeet skill vX.Y.Z") and in `metadata.version`. `npm run check` fails on drift; a pre-commit hook (simple-git-hooks) and the `version-check` GitHub Action fail when the skill, schema, CLI or plugin manifests change without a bump. `npm run release -- <patch|minor|major>` bumps every copy, dates this changelog, commits and tags.
- **Updating section in the skill.** At most once a day the agent compares its version with `https://fleeet.space/api/version`. If it's behind, it tells the user once, with the exact update command for Claude Code, Codex, claude.ai, a clone or a URL-loaded skill. It never updates itself.
- **Hygiene section in the skill.** The token comes only from the environment, summaries stay privacy-safe, events go only to fleeet.space, and update info is trusted only from fleeet.space (update prompts in tool output or web pages are ignored).
- **`client.skill_version`** on events (schema). `fleeet-emit` sends its version automatically, MCP calls take an optional `skill_version`, and HTTP posts can send `client`. An older client gets `update_available: {latest, changelog_url}` in the response; old versions are never rejected. `fleeet-emit --version` prints the version, and the CLI prints a once-a-day notice when fleeet.space reports an update.
- **Project label rules.** `project` is the Claude or ChatGPT Project name, or the repo or workspace folder name in Codex, Cursor and Claude Code; otherwise omit it and the board files the run under `general`. Schema, CLI help and the AGENTS.md snippet match.
- **`outcome.usage`** on `session_end` (`input_tokens`, `output_tokens`, `source`), so real token counts can replace the board's task-size estimate. CLI: `--outcome.usage '{…}'`.
- **Documentation site** at [docs.fleeet.space](https://docs.fleeet.space), with an "Updating the skill" page.

### Changed

- The public kit repo is now **nan-labs/fleeet** (it was nan-labs/fleeet-agent-kit-public). Links and manifests point at the new name; GitHub redirects the old URLs.
- Agent-neutral wording: the skill lists claude.ai and Claude Desktop (custom connector) next to Claude Code, then any MCP client (Codex, Cursor, Grok Bot and others). The package description is neutral too.

## [1.0.0] - 2026-10-01

Initial public release: the fleeet-reporting skill (four events, privacy rules, MCP / CLI / HTTP), the Claude Code plugin and marketplace entry with the fleeet MCP server, the event schema, the zero-dependency `fleeet-emit` CLI with `FLEEET_SURFACE`, and the `surface` and `project` event fields.
