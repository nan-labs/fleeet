---
name: fleeet-reporting
description: Report status to fleeet.space for user-initiated work. Use when the human asked you to do something specific. NOT for scheduled/cron/background automation. Keeps fleeet.space honest without pulling the human into the loop.
---

# fleeet reporting

You are working on a task the human initiated. Report status to **fleeet.space** — a calm dashboard the human checks to see what their agents are doing.

**When to report:** User-initiated prompts, tasks, and interactions only. The human asked you to build, fix, or investigate something.

**When NOT to report:** Scheduled runs, cron jobs, automated workflows, background monitoring, routine checks. If it runs without a human starting it, stay silent unless you hit a blocker.

## The Four Events

| Event | When | Returns |
|---|---|---|
| **start** | You begin real work on a named task | `run_id` (save this!) |
| **heartbeat** | You finish a meaningful unit of work (commit, test, decision) | — |
| **blocked** | You hit something you can't resolve alone | — |
| **end** | You're done — shipped, abandoned, or handing off | — |

Rules:
- **Don't heartbeat for its own sake.** If nothing changed, stay silent.
- **Be specific.** "Fixed z-index stacking in mobile menu — checkout button was covered" not "Fixed the nav bug".
- **Use blocked early.** If you're about to guess at something the human should answer, report blocked first.
- **One end per start** — especially if things went wrong.

## ⚠️ Privacy Enforcement

fleeet events are public on fleeet.space. Before reporting:
- **No secrets.** No tokens, API keys, passwords, env values, or Auth headers.
- **No file contents.** Never paste source, config, logs, or diffs. Reference by path or URL.
- **No PII.** No personal emails, customer data, or anything you wouldn't put on a billboard.
- **Generalize when needed.** "rotated the failing credential" not "set STRIPE_KEY=sk_live_…".

## How to Report

### Option 1: MCP Tools (Preferred)

If your environment provides fleeet MCP tools, use them:

```
fleeet_start(task="fix nav bug", summary="starting work on z-index")
→ returns run_id

fleeet_heartbeat(run_id=<run_id>, summary="nav fix done, testing", progress={"commits": 1})

fleeet_end(run_id=<run_id>, status="shipped", summary="nav bug fixed")
```

MCP tools are available when:
- Claude Code with the fleeet plugin installed
- claude.ai/Desktop with fleeet custom connector configured
- Any MCP client connected to `https://fleeet.space/mcp/<token>`

### Option 2: fleeet-emit CLI

If MCP tools aren't available but you can execute shell commands:

```bash
fleeet-emit session_start --task "fix nav bug" --summary "starting work"
fleeet-emit heartbeat --summary "nav fix done" --progress.commits 1
fleeet-emit session_end --summary "shipped" --outcome.status shipped
```

The CLI handles `run_id` generation, POSTs to `$FLEEET_ENDPOINT/api/events`, and falls back to local spool on network errors.

### Option 3: Direct HTTP POST

If neither MCP nor CLI is available:

```bash
curl -X POST $FLEEET_ENDPOINT/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FLEEET_TOKEN" \
  -d '{
    "event": "session_start",
    "run_id": "<uuid>",
    "ts": "<iso-timestamp>",
    "agent": "<your-name>",
    "trigger": "user",
    "task": "fix nav bug",
    "summary": "starting work on z-index"
  }'
```

See the [event schema](https://github.com/nan-labs/fleeet-agent-kit-public/blob/main/schema/event-schema.json) for full field definitions.

## Event Details

### start

```
fleeet_start(
  task="what you're working on",
  summary="one sentence, present tense, no period",
  trigger="user",  # user|routine|agent, default: user
  source={"repo": "owner/repo", "branch": "main"}  # optional
)
→ { run_id: "<uuid>", stored: true }
```

Save the `run_id` — you'll need it for heartbeat, blocked, and end.

### heartbeat

```
fleeet_heartbeat(
  run_id="<from-start>",
  summary="progress update, one sentence",
  progress={"commits": 2, "files_changed": 5}  # optional
)
```

Emit roughly every 5-10 min of meaningful work. Never more than every 2 min.

### blocked

```
fleeet_blocked(
  run_id="<from-start>",
  kind="ambiguity",  # ambiguity|missing_credential|failing_dep|design_call|access|other
  question="what needs human resolution",
  options=["Option A", "Option B"]  # optional, 2-3 max
)
```

Shows up as "needs you" on the board.

### end

```
fleeet_end(
  run_id="<from-start>",
  status="shipped",  # shipped|abandoned|handed_off|failed
  summary="final summary, one sentence",
  note="additional context",  # optional
  artefacts=[{"kind": "pr", "url": "https://...", "label": "PR #123"}]  # optional
)
```

## Tone

Write like a message in a Slack thread. Not a ticket, not a commit message, not a diary entry.

✅ `rewriting the cart reducer to use a discriminated union`  
✅ `stuck — which auth provider, Clerk or WorkOS?`  
✅ `done — PR #1204 open, CI green, preview deploy attached`  
❌ `Made progress on the task.`  
❌ `I have now completed the work you requested.`

## What fleeet Does

The board reconciles your self-reports against exhaust from GitHub, Linear, Vercel, etc.

- **Your honest report is your brand.** Say `status: shipped` with no commit and the human sees the mismatch. Don't overclaim.
- **blocked shows up as "needs you"** on the board. Use it.
- **Silence reads as "in flight."** Heartbeat to be visible; say so when you're done.

## Environment

Set these in your agent's environment:

```bash
export FLEEET_ENDPOINT=https://fleeet.space
export FLEEET_TOKEN=<your-token>
```

For MCP clients, configure the server at `https://fleeet.space/mcp/<token>`.

## Don't

- Don't emit status as a chat message — the board handles presentation.
- Don't include secrets, tokens, PII, or file contents.
- Don't change run_id mid-run.
- Don't apologize or preamble. Just report.
