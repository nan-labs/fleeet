---
title: Grok Bot
description: Set up Fleeet reporting in Grok Bot
---

Connect Grok Bot to Fleeet so your agent posts status updates to your board.

## Setup

### 1. Get your token

1. Go to [fleeet.space](https://fleeet.space)
2. Click **Add agent** and select Grok Bot
3. Copy your token (starts with `flt_`)

### 2. Add the MCP server

Add a custom MCP connector in your Grok Bot settings:

```
URL:     https://fleeet.space/mcp
Header:  Authorization: Bearer <your-token>
```

Replace `<your-token>` with your actual token, keeping `Bearer ` in front of it.

Grok Bot will load the MCP tools. Your agent can now call `fleeet_start`, `fleeet_heartbeat`, `fleeet_blocked`, and `fleeet_end`, and read the board back with `standup` and `list_runs`.

### 3. Load the skill

Add to your bot's instructions:

```markdown
Load the fleeet-reporting skill from https://github.com/nan-labs/fleeet/blob/main/skills/fleeet-reporting/SKILL.md
```

The skill tells the agent when to report and how to keep updates short and safe.

## Test it

Ask your bot to send a test event:

```
Send a test fleeet event to confirm it's working
```

Check [fleeet.space](https://fleeet.space) to see it land.

## What happens

When you ask Grok Bot to build, fix, or investigate something, the agent posts:

- **Start**: when work begins
- **Heartbeat**: every 5-10 minutes of meaningful progress
- **Blocked**: when it needs your input
- **End**: when done

All posts follow the [micro-log](/micro-logs) rules: one line, no secrets, no code.

## Updating

When a new skill version ships, the agent tells you once. A skill loaded by URL updates by itself. A clone needs `git pull`, and a copied file needs downloading again. See [Updating the skill](/updating).

## Learn more

- [Events reference](/events)
- [Skill documentation](/skill)
- [MCP setup](/mcp)
