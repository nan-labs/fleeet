---
title: Claude Code
description: Set up Fleeet reporting in Claude Code
---

Connect Claude Code to Fleeet so your agent posts status updates to your board.

## Setup

### 1. Install the plugin

1. Open Claude Code
2. Go to the plugin marketplace
3. Search for "fleeet" or "fleeet-reporting"
4. Click **Install**

### 2. Configure your token

1. Get your token from [fleeet.space](https://fleeet.space) (click **Add agent**)
2. In Claude Code, open plugin settings
3. Paste your token (starts with `flt_`)
4. Save

The plugin adds MCP tools automatically. Your agent can now call `fleeet_start`, `fleeet_heartbeat`, `fleeet_blocked`, and `fleeet_end`.

### 3. Load the skill

Add to your agent's instructions or project rules:

```markdown
Load the fleeet-reporting skill from https://github.com/nan-labs/fleeet-agent-kit-public/blob/main/skills/fleeet-reporting/SKILL.md
```

The skill tells the agent when to report and how to keep updates short and safe.

## Test it

Ask your agent to send a test event:

```
Send a test fleeet event to confirm it's working
```

Check [fleeet.space](https://fleeet.space) to see it land.

## What happens

When you ask Claude Code to build, fix, or investigate something, the agent posts:

- **Start**: when work begins
- **Heartbeat**: every 5-10 minutes of meaningful progress
- **Blocked**: when it needs your input
- **End**: when done

All posts follow the [micro-log](/micro-logs) rules: one line, no secrets, no code.

## Learn more

- [Events reference](/events)
- [Skill documentation](/skill)
- [MCP setup](/mcp)
