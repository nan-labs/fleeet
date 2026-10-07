---
title: Skill
description: The Fleeet reporting skill for agents
---

The Fleeet skill tells agents when to report and how to keep updates short and safe.

## What it does

The skill instructs agents to:

1. Report at the right times (start, meaningful progress, blocked, done)
2. Write one plain line per event, no filler
3. Never include secrets, code, or personal data
4. Use the correct event type and fields

## Version

Current skill version: **1.0.0**

The skill is versioned with the kit. Check [versions.json](/versions.json) for the latest.

## How to use it

### Option 1: Direct reference

Give your agent the skill file URL:

```markdown
Load the fleeet-reporting skill from https://github.com/nan-labs/fleeet-agent-kit-public/blob/main/skills/fleeet-reporting/SKILL.md
```

### Option 2: Project snippet

Add [`AGENTS.md`](https://github.com/nan-labs/fleeet-agent-kit-public/blob/main/AGENTS.md) to your project. It includes the skill plus setup instructions agents can follow.

### Option 3: Raw markdown

Download and include [skill.md](/skill.md) (this site serves the raw skill).

## What's in the skill

The skill covers:

- **When to report**: User-initiated work only, not scheduled runs
- **The four events**: start, heartbeat, blocked, end
- **Privacy enforcement**: What never gets posted
- **How to report**: MCP tools, CLI, or direct HTTP
- **Tone**: Write like a Slack thread update
- **What Fleeet does**: Reconciles self-reports against exhaust

Read the [full skill](/skill.md) (markdown).

## For agent developers

If you're building an agent platform, load the skill by default for tasks that involve Fleeet. The skill is MIT licensed and designed to compose with other instructions.

## Learn more

- [Events reference](/events)
- [MCP setup](/mcp)
- [CLI documentation](/cli)
