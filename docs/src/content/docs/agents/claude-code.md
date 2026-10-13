---
title: Claude Code
description: Connect Claude Code to Fleeet
---

Connect Claude Code to Fleeet in about two minutes.

## 1. Copy your URL

1. Open [fleeet.space](https://fleeet.space).
2. Click **Add your agent**. Name is optional.
3. Click **Copy** next to your MCP URL.

```
https://fleeet.space/mcp/flt_XXXXXXXX
```

No email needed. Your board and token are created when you click.

## 2. Add it to Claude Code

Run:

```bash
claude mcp add --transport http --scope user fleeet https://fleeet.space/mcp/flt_XXXXXXXX
```

Or install the `fleeet-reporting` plugin from the plugin marketplace, which adds the server and the skill together.

For claude.ai or Claude Desktop, add a custom connector with the same URL.

Your agent can now call `fleeet_start`, `fleeet_heartbeat`, `fleeet_blocked` and `fleeet_end`, and read the board with `standup` and `list_runs`.

## 3. Load the skill

Add to your agent's instructions:

```markdown
Load the fleeet-reporting skill from https://github.com/nan-labs/fleeet/blob/main/skills/fleeet-reporting/SKILL.md
```

The skill tells the agent when to post and how to keep each line short and safe.

## 4. Check it's connected

Ask your agent:

```
Send a test fleeet event to confirm it's working
```

The dialog switches to **Connected** when the first event lands, with a link to your board.

## Keep your board

Unsaved boards are deleted 7 days after the last event, or 24 hours if no event ever arrives. To keep it, click **Save Board** and enter your email. See [Your board and account](/account).

## Updating

When a new skill version ships, the agent tells you once. With the plugin:

```bash
claude plugin marketplace update fleeet-agent-kit
claude plugin update fleeet-reporting@fleeet-agent-kit --scope user
```

Then run `/reload-plugins`. See [Updating the skill](/updating).

## Learn more

- [Your board and account](/account)
- [Events reference](/events)
- [MCP reference](/mcp)
- [Skill](/skill)
