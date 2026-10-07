# Cursor Integration — fleeet Reporting

Cursor doesn't have a formal plugin system yet, but you can integrate fleeet reporting via:

## Option 1: Include the Skill in `.cursorrules`

Add this to your project's `.cursorrules` or `.github/AGENTS.md`:

```markdown
When working on user-initiated tasks, load and follow the fleeet-reporting skill:
https://github.com/nan-labs/fleeet/raw/main/skills/fleeet-reporting/SKILL.md

Use MCP tools if available (fleeet_start, fleeet_heartbeat, fleeet_blocked, fleeet_end).
If MCP isn't available, use the fleeet-emit CLI at the start and end of work.

Set in your environment:
  export FLEEET_ENDPOINT=https://fleeet.space
  export FLEEET_TOKEN=<your-token>
```

Cursor agents will load the skill at session start and follow its reporting guidelines.

## Option 2: Manual CLI Integration

If you're using Cursor Composer or Cursor Chat, you can manually call the fleeet CLI at key points:

```bash
# At the start of a task
fleeet-emit session_start --task "implement user profile page" --summary "starting work on profile editor"

# After meaningful progress
fleeet-emit heartbeat --summary "profile form complete, wiring up save" --progress.commits 2

# When blocked
fleeet-emit blocked --summary "stuck on avatar upload" --blocker.kind design_call --blocker.question "Should we support multiple avatar formats?"

# When done
fleeet-emit session_end --summary "profile page shipped" --outcome.status shipped --outcome.artefacts '[{"kind":"pr","url":"https://github.com/org/repo/pull/123"}]'
```

## Option 3: Git Hooks (Automated)

For automated reporting on git operations, add these hooks:

**`.git/hooks/post-commit`** (report progress after commits):

```bash
#!/bin/bash
# Auto-report heartbeat after commits (if FLEEET_ENDPOINT is set)
if [ -n "$FLEEET_ENDPOINT" ] && [ -n "$FLEEET_TOKEN" ]; then
  MESSAGE=$(git log -1 --pretty=%B)
  fleeet-emit heartbeat --summary "committed: $MESSAGE" --progress.commits 1 2>/dev/null || true
fi
```

**`.git/hooks/pre-push`** (optional session_end on push):

```bash
#!/bin/bash
# Report session_end when pushing to main/master
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
  if [ -n "$FLEEET_ENDPOINT" ] && [ -n "$FLEEET_TOKEN" ]; then
    fleeet-emit session_end --summary "pushed to $BRANCH" --outcome.status handed_off 2>/dev/null || true
  fi
fi
```

Make hooks executable:

```bash
chmod +x .git/hooks/post-commit .git/hooks/pre-push
```

## Option 4: MCP Server (Recommended)

Add the fleeet MCP server to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project):

```json
{
  "mcpServers": {
    "fleeet": {
      "url": "https://fleeet.space/mcp",
      "headers": { "Authorization": "Bearer ${env:FLEEET_TOKEN}" }
    }
  }
}
```

Cursor fills `${env:FLEEET_TOKEN}` from your environment, so the token never sits in the file. Then agents can call `fleeet_start`, `fleeet_heartbeat`, `fleeet_blocked`, and `fleeet_end` directly, and read the board back with `standup` and `list_runs`. Don't commit a project `mcp.json` that contains your token.

## Environment Setup

In your shell profile (`.bashrc`, `.zshrc`, etc.):

```bash
export FLEEET_ENDPOINT=https://fleeet.space
export FLEEET_TOKEN=<your-token-here>
export PATH="$PATH:/path/to/fleeet-agent-kit/bin"
```

Or create a project-specific `.env` that Cursor loads:

```bash
FLEEET_ENDPOINT=https://fleeet.space
FLEEET_TOKEN=<your-token>
```

## Verify Integration

Test that reporting works:

```bash
# Should POST to fleeet.space and return a run_id
fleeet-emit session_start --task "test integration" --summary "testing fleeet reporting from Cursor"

# Check fleeet.space — should see the event on your board
curl $FLEEET_ENDPOINT/api/events | jq .
```

## Best Practices

1. **Report at session boundaries** — when Cursor starts working on a task, and when it's done.
2. **Heartbeat on meaningful progress** — after commits, test passes, or design decisions.
3. **Use blocked early** — if the agent is about to guess at something ambiguous, report blocked first.
4. **Don't over-report** — silence is fine. The board shows "in flight" for quiet runs.

## See Also

- [SKILL.md](skills/fleeet-reporting/SKILL.md) — Full reporting guidelines for agents
- [README.md](README.md) — Installation and configuration
- [AGENTS.md](AGENTS.md) — AGENTS.md snippet for project documentation
