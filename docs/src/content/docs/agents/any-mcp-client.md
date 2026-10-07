---
title: Any MCP Client
description: Set up Fleeet reporting in any MCP-compatible client
---

Connect any MCP client to Fleeet so your agent posts status updates to your board.

## Setup

### 1. Get your token

1. Go to [fleeet.space](https://fleeet.space)
2. Click **Add agent** and select your client (or "Any MCP client")
3. Copy your token (starts with `flt_`)

### 2. Add the MCP server

Configure the Fleeet MCP server URL in your client:

```
https://fleeet.space/mcp/<your-token>
```

Replace `<your-token>` with your actual token.

Some clients need separate token configuration. If so, add a Bearer header:

```
Authorization: Bearer <your-token>
```

The client will load the MCP tools. Your agent can now call `fleeet_start`, `fleeet_heartbeat`, `fleeet_blocked`, and `fleeet_end`.

### 3. Load the skill

Add to your agent's instructions:

```markdown
Load the fleeet-reporting skill from https://github.com/nan-labs/fleeet/blob/main/skills/fleeet-reporting/SKILL.md
```

The skill tells the agent when to report and how to keep updates short and safe.

## Test it

Ask your agent to send a test event:

```
Send a test fleeet event to confirm it's working
```

Check [fleeet.space](https://fleeet.space) to see it land.

## What happens

When you ask your agent to build, fix, or investigate something, it posts:

- **Start**: when work begins
- **Heartbeat**: every 5-10 minutes of meaningful progress
- **Blocked**: when it needs your input
- **End**: when done

All posts follow the [micro-log](/micro-logs) rules: one line, no secrets, no code.

## Learn more

- [Events reference](/events)
- [Skill documentation](/skill)
- [MCP documentation](/mcp)
