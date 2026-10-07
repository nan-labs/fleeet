# Fleeet reporting — Agent Instructions Snippet

> **Working on this repo itself?** Any change to the skill (`skills/`), the event schema (`schema/`), the CLI (`bin/`) or the plugin manifests (`.claude-plugin/plugin.json`, `marketplace.json`) needs a semver bump made with `npm run release -- <patch|minor|major>`: patch for wording, minor for additive, major for breaking. Never edit version numbers by hand. Add a CHANGELOG line under Unreleased, stage your change, then run the release script. It commits and tags but never pushes. Details are in [CONTRIBUTING.md](CONTRIBUTING.md). The snippet below is for *other* repos.

Include this in your agent's instructions file (such as `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, or `.github/AGENTS.md`) to enable fleeet reporting for agents working in this repo.

```markdown
## Fleeet reporting

When working on user-initiated tasks (prompts, features, bug fixes), report status to fleeet.space so the human can see what's happening without interrupting you.

**When to report:** User-initiated work only — the human asked you to do something specific.  
**When NOT to report:** Scheduled runs, cron jobs, background automation, routine checks.

### Quick Start

If you have fleeet MCP tools available:

```
# At task start
fleeet_start(task="what you're building", summary="one sentence status", project="<repo or workspace folder name>")
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

See the [Fleeet kit README](https://github.com/nan-labs/fleeet) and the docs at [docs.fleeet.space](https://docs.fleeet.space) for full installation and configuration.
```

---

## Integration Examples

### For Claude Code

Run `/plugin marketplace add nan-labs/fleeet`, then `/plugin install fleeet-reporting@fleeet-agent-kit`.

### For Codex

Include the skill in your agent's system prompt or load it as a context file at the start of each session.

### For Cursor

Add to your agent's instructions file (such as `.cursorrules` or `.github/AGENTS.md`):

```markdown
Load the fleeet-reporting skill from https://github.com/nan-labs/fleeet/blob/main/skills/fleeet-reporting/SKILL.md at session start when working on user-initiated tasks.
```

### For Grok Bot or Any MCP Client

Configure the MCP server at `https://fleeet.space/mcp` with the header `Authorization: Bearer <token>` (setup per client: https://docs.fleeet.space/mcp), or include the skill in your agent's instructions.

---

## Full Documentation

- Skill: `skills/fleeet-reporting/SKILL.md`
- CLI: `bin/fleeet-emit.mjs --help`
- Event Schema: https://github.com/nan-labs/fleeet/blob/main/schema/event-schema.json
- Installation: https://github.com/nan-labs/fleeet
- Docs: https://docs.fleeet.space
- App: https://fleeet.space
