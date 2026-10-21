# Open questions for Flo
1. % pill: code hides it when the previous count is under 5 and shows "New" only at 0. You said "'new' pill instead of a huge %". Keep code as is, or show "New" for any previous count under 5?
2. Cursor page: Cursor lost its tile but still works as an MCP client. Keep agents/cursor as a config reference, or fold it into "Any MCP client"?
3. Agent order across docs: currently Claude Code, claude.ai, Codex, Cursor, Grok Bot. Adopt tile order (Default Agent, Claude, Codex, Grok Bot, Other) everywhere?
4. `outcome.usage` stays in the event schema (used for task sizing, not shown). OK, or drop it from public docs?
