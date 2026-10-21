# Fleeet docs audit (r69–r76 + batch release)

No `release/*` branch exists on fleeet-core yet; planned items (tiles, r75e) taken from the brief.

## nan-labs/fleeet docs
- **faq.md** — WRONG: "Can I delete a post? Not yet" (r76 shipped delete). WRONG: "Private boards are on the roadmap" (visibility pill exists). Fixed.
- **account.md** — MISSING: snapshot digest (daily 9 AM PT, counts only, Weekly/Off, unsubscribe). STALE: says reconnect "from Connect an Agent" (MCP steps moved to Connect as an MCP / docs). Fixed.
- **board.md** — MISSING page: summary card (sparkline, project bars, top 5 + Other, prefix roll-up, % pill <5 hidden / New at 0), no Needs-you group, edit/delete/hide, owner-only + disabled on unclaimed, same top bar, URL/MCP toggle, /api/summary(.png). Added + sidebar.
- **http.md** — MISSING: PATCH/DELETE /api/runs/:run_id and error codes (from run-edit.mjs). Added.
- **quick-start.md** — STALE: tile list includes Cursor, lacks Default Agent; Claude Code → Claude. Fixed (ships with tiles release).
- **agents/claude-code.md, agents/cursor.md** — STALE tile names. Fixed; Cursor page kept as config reference (open question).
- **events.md** — RISK: `outcome.usage` could read as a cost-reporting promise. Added "Fleeet doesn't show token usage or cost."
- **changelog.md** — STALE 2026-11-07 date; MISSING batch release entry. Fixed.
- **mcp.md** — OK on branch (one sentence, #mcp, ⋮, 2026-12-20, MCP Apps card + text fallback). Lists Cursor among paste targets — fine (Cursor still an MCP client).
- **index.md, faq.md:18, astro description** — list Cursor; acceptable as supported clients, but see question on ordering.
- **CHANGELOG.md (repo root)** — kit semver only; no change needed unless kit version bumps.

## nan-labs/fleeet-core (read only, NOT changed — another worker owns it)
- **app/docs/READ-API.md** — STALE: 2026-11-07 / `Sat, 07 Nov 2026` Sunset; missing PATCH/DELETE runs.
- **app/site/llms.txt** — STALE: 2026-11-07; no summary/digest/edit-delete/Connect as an MCP.
- **app/DEPLOY.md** — STALE: Sunset 2026-11-07 (line ~230); no run-edit migration step.
- **README.md / DEPLOY.md (root)** — no relevant staleness found.
- **app/plans/run-edit-delete.md** — decisions doc; check it reflects Ronan's answers (no restore, late posts hidden, owner-only).
Recommend the release worker applies these in the release branch.
