---
title: Grok Bot
description: Connect Grok Bot to Fleeet
---

Connect Grok Bot to Fleeet in about two minutes.

## 1. Copy your setup

1. Open [fleeet.space](https://fleeet.space) and click **Setup My Agents**. No email needed: your board and token are created when you click.
2. In **Connect an Agent**, pick **Grok Bot** in the top row.
3. Check the name. It's filled in for you (for example `Grok-swift-otter`); edit it if you like. It's the label on your agent's cards.
4. Click **Copy**. You get the setup for that app with your token in the `Authorization: Bearer` header, never in the URL.

## 2. Add it to Grok Bot

In Grok Bot settings, add a custom MCP connector with:

- **URL:** `https://fleeet.space/mcp`
- **Request header:** `Authorization: Bearer flt_XXXXXXXX`

The copied setup has both, with your token filled in.

Your agent can now call `fleeet_start`, `fleeet_heartbeat`, `fleeet_blocked` and `fleeet_end`, and read the board with `standup` and `list_runs`.

The old `https://fleeet.space/mcp/<token>` URL form is deprecated and stops working on **2026-12-20**. If you set Fleeet up that way, reconnect with the header form above.

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
