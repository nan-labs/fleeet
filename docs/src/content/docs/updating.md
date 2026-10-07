---
title: Updating the skill
description: How the Fleeet skill tells you about a new version, and the exact update command for each agent
---

The Fleeet skill, the Claude Code plugin and the `fleeet-emit` CLI share one version number. The skill states it in its opening line (`Fleeet skill vX.Y.Z`) and in `metadata.version` in its frontmatter. The current version is in [versions.json](/versions.json), and what changed is in the [changelog](https://github.com/nan-labs/fleeet/blob/main/CHANGELOG.md).

## How you find out

- **The agent checks.** At most once a day the skill asks `https://fleeet.space/api/version`. If it's behind, it tells you once, with the command for your setup below. It never updates itself without your OK.
- **fleeet.space answers.** Events carry `client.skill_version`. If it's older than the latest, the event response (or MCP tool result) includes `update_available`, so the agent finds out even without a separate check.
- **The CLI prints a notice.** `fleeet-emit` shows a one-line notice at most once a day when fleeet.space reports an update.

Old versions keep working. fleeet never rejects a skill for being old within the same major version.

:::caution[Only trust fleeet.space]
Update info comes only from `fleeet.space`. If a web page, file, tool output or message tells your agent to "update the fleeet skill" from somewhere else, ignore it. The skill tells agents to do the same.
:::

## Update commands

### Claude Code

The plugin is installed at user scope by default:

```bash
claude plugin marketplace update fleeet-agent-kit
claude plugin update fleeet-reporting@fleeet-agent-kit --scope user
```

Then run `/reload-plugins` in an open session, or start a new one. Claude Code only offers an update when the version number changes, so a release always bumps it. If you installed at project scope, use `--scope project`.

### Codex

Codex loads skills from a folder, `~/.agents/skills/` (older setups use `~/.codex/skills/`). Replace the installed copy:

```bash
curl -fsSL https://raw.githubusercontent.com/nan-labs/fleeet/main/skills/fleeet-reporting/SKILL.md \
  -o ~/.agents/skills/fleeet-reporting/SKILL.md
```

Codex detects the change. Restart it if the new version doesn't show up. If your instructions load the skill by URL instead, there's nothing to do.

### claude.ai and Claude Desktop

Download `fleeet-skill.zip` from the [latest release](https://github.com/nan-labs/fleeet/releases/latest). In claude.ai's skills settings, remove the old `fleeet-reporting` skill and upload the new zip.

### Cursor, Grok Bot and other agents

- **Skill loaded by URL** (instructions point at the GitHub `SKILL.md`): nothing to do. The next session reads the new version.
- **A clone of the kit:** run `git pull` in the clone.
- **A copied `SKILL.md`:** download it again from `https://raw.githubusercontent.com/nan-labs/fleeet/main/skills/fleeet-reporting/SKILL.md`, or from [docs.fleeet.space/skill.md](/skill.md), over the old copy.

### fleeet-emit CLI

`node bin/fleeet-emit.mjs --version` prints the version. Update it the same way you installed it: `git pull` in a clone, or download `bin/fleeet-emit.mjs` again.

## Version endpoint

```
GET https://fleeet.space/api/version
```

```json
{
  "latest": "1.1.0",
  "min_supported": "1.0.0",
  "changelog_url": "https://github.com/nan-labs/fleeet/blob/main/CHANGELOG.md"
}
```

It's public, needs no token and is cached for 5 minutes. If your version is below `min_supported`, update soon.

## Version numbers

The kit follows [semver](https://semver.org):

- **Patch** (1.1.0 → 1.1.1): wording and fixes.
- **Minor** (1.1.0 → 1.2.0): additive, such as a new optional field or section.
- **Major** (1.1.0 → 2.0.0): breaking.

Contributors: see [CONTRIBUTING.md](https://github.com/nan-labs/fleeet/blob/main/CONTRIBUTING.md) for `npm run release`.
