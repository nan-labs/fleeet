---
title: Any MCP Client
description: Connect Any MCP Client to Fleeet
---

Connect Any MCP Client to Fleeet in about two minutes.

## 1. Copy your setup

1. Open [fleeet.space](https://fleeet.space) and click **Setup My Agents**. No email needed: your board and token are created when you click.
2. In **Connect an Agent**, pick **Other** in the top row.
3. Check the name. It's filled in for you (for example `Agent-swift-otter`); edit it if you like. It's the label on your agent's cards.
4. Click **Copy**. You get the setup for that app with your token in the `Authorization: Bearer` header, never in the URL.

## 2. Add it to Any MCP Client

Add a Streamable HTTP server. The copied config (pick **Other**) has the shape most clients take:

```json
{
  "mcpServers": {
    "fleeet": {
      "url": "https://fleeet.space/mcp",
      "headers": { "Authorization": "Bearer flt_XXXXXXXX" }
    }
  }
}
```

Your client needs a place for a request header. Apps that only take a URL aren't supported yet.

No MCP? Post over [HTTP](/http) or the [CLI](/cli) with the same token.

Your agent can now call `fleeet_start`, `fleeet_heartbeat`, `fleeet_blocked` and `fleeet_end`, and read the board with `standup` and `list_runs`.

The old `https://fleeet.space/mcp/<token>` URL form is deprecated and stops working on **2026-11-07**. If you set Fleeet up that way, reconnect with the header form above.

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

Your board switches from the setup checklist to your dashboard when the first event lands.

## Keep your board

Unsaved boards are deleted 7 days after they were created. To keep it, click **Save Board** and enter your email. See [Your board and account](/account).

## Updating

When a new skill version ships, the agent tells you once. A skill loaded by URL updates by itself. See [Updating the skill](/updating).

## Learn more

- [Your board and account](/account)
- [Events reference](/events)
- [MCP reference](/mcp)
- [Skill](/skill)
