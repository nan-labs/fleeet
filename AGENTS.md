# fleeet Reporting — AGENTS.md Snippet

Include this in your project's `AGENTS.md` (or `.cursorrules`, `.github/AGENTS.md`, etc.) to enable fleeet reporting for agents working in this repo.

```markdown
## fleeet Reporting

When working on user-initiated tasks (prompts, features, bug fixes), report status to fleeet.space so the human can see what's happening without interrupting you.

**When to report:** User-initiated work only — the human asked you to do something specific.  
**When NOT to report:** Scheduled runs, cron jobs, background automation, routine checks.

### Quick Start

If you have fleeet MCP tools available:

```
# At task start
fleeet_start(task="what you're building", summary="one sentence status")
→ save the run_id

# During work (every 5-10 min of meaningful progress)
fleeet_heartbeat(run_id=<saved>, summary="progress update")

# If blocked
fleeet_blocked(run_id=<saved>, kind="ambiguity", question="what needs human input")

# When done
fleeet_end(run_id=<saved>, status="shipped", summary="final summary")
```

If MCP tools aren't available, use the CLI:

```bash
fleeet-emit session_start --task "fix bug" --summary "starting work"
fleeet-emit heartbeat --summary "progress update" --progress.commits 1
fleeet-emit session_end --summary "shipped" --outcome.status shipped
```

### Privacy Rules (Non-negotiable)

Events are public on fleeet.space. Never include:
- Secrets, tokens, API keys, passwords, or env values
- File contents, source code, config, logs, or diffs
- PII, customer data, or internal-only information

Reference files by path/URL instead of pasting contents. Generalize when describing credentials.

### Tone

Write like a Slack thread update. Be specific and present-tense:

✅ "rewriting cart reducer to use discriminated union"  
✅ "stuck — which auth provider, Clerk or WorkOS?"  
✅ "shipped — PR #1204 open, CI green"  
❌ "Made progress on the task."

### Environment

Set these before starting work (or configure via MCP):

```bash
export FLEEET_ENDPOINT=https://fleeet.space
export FLEEET_TOKEN=<your-token>
```

See [fleeet-agent-kit README](https://github.com/nan-labs/fleeet-agent-kit-public) for full installation and configuration.
```

---

## Integration Examples

### For Cursor

Add to `.cursorrules` or `.github/AGENTS.md`:

```markdown
Load the fleeet-reporting skill from https://github.com/nan-labs/fleeet-agent-kit-public/blob/main/skills/fleeet-reporting/SKILL.md at session start when working on user-initiated tasks.
```

### For Claude Code

Run `/plugin marketplace add nan-labs/fleeet-agent-kit-public`, then `/plugin install fleeet-reporting@fleeet-agent-kit`.

### For Codex / Devin / Other Agents

Include the skill in your agent's system prompt or load it as a context file at the start of each session.

---

## Full Documentation

- Skill: `skills/fleeet-reporting/SKILL.md`
- CLI: `bin/fleeet-emit.mjs --help`
- Event Schema: https://github.com/nan-labs/fleeet-agent-kit-public/blob/main/schema/event-schema.json
- Installation: https://github.com/nan-labs/fleeet-agent-kit-public
