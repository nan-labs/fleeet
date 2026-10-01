#!/usr/bin/env node
// fleeet-emit — zero-dependency CLI for emitting fleeet events
//
// Usage:
//   fleeet-emit session_start --task "build the thing" --summary "starting work"
//   fleeet-emit heartbeat --summary "nav component done" --progress.commits 1
//   fleeet-emit blocked --summary "stuck on design" --blocker.kind ambiguity --blocker.question "which color?"
//   fleeet-emit session_end --summary "shipped" --outcome.status shipped --outcome.artefacts '[{"kind":"pr","url":"..."}]'
//
// Env:
//   FLEEET_ENDPOINT  — base URL (default https://fleeet.space), appends /api/events
//   FLEEET_TOKEN     — bearer token for auth
//   FLEEET_RUN_ID    — reuse existing run_id (or generates one for session_start)
//   FLEEET_AGENT     — agent name (defaults to $USER or 'unknown')
//
// Flags:
//   --task, --summary, --trigger, --source.repo, --progress.commits, etc.
//   Use dot notation for nested fields: --blocker.kind ambiguity
//   JSON arrays/objects: --outcome.artefacts '[...]' or --source '{"repo":"x"}'
//
// Behavior:
//   - Generates run_id on session_start, prints it, stores in /tmp/fleeet-run-id
//   - Reads run_id from /tmp/fleeet-run-id for subsequent events
//   - POSTs to $FLEEET_ENDPOINT/api/events with Bearer $FLEEET_TOKEN
//   - Falls back to ./.fleeet/events.jsonl on network errors
//   - Validates required fields per event type
//   - Zero dependencies, Node 18+

import { writeFileSync, readFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const RUN_ID_FILE = join(tmpdir(), "fleeet-run-id");
const LOCAL_SPOOL = join(process.cwd(), ".fleeet", "events.jsonl");

const ENDPOINT = (process.env.FLEEET_ENDPOINT || "https://fleeet.space").replace(/\/+$/, "");
const TOKEN = process.env.FLEEET_TOKEN;
const AGENT = process.env.FLEEET_AGENT || process.env.USER || userInfo().username || "unknown";

function help() {
  console.log(`fleeet-emit — emit fleeet events from the command line

Usage:
  fleeet-emit <event-type> [flags]

Event types:
  session_start    — begin work on a task (requires --task, --summary)
  heartbeat        — progress update (requires --summary)
  blocked          — stuck, need human input (requires --summary, --blocker.kind, --blocker.question)
  session_end      — work complete (requires --summary, --outcome.status)

Flags:
  --task           — task description (session_start only)
  --summary        — one sentence, present tense, no period
  --trigger        — user|routine|agent (default: user)
  --source.repo    — e.g. "owner/repo"
  --progress.commits N
  --blocker.kind   — ambiguity|missing_credential|failing_dep|design_call|access|other
  --blocker.question
  --outcome.status — shipped|abandoned|handed_off|failed
  --outcome.artefacts — JSON array, e.g. '[{"kind":"pr","url":"..."}]'

Environment:
  FLEEET_ENDPOINT  — base URL (default: https://fleeet.space)
  FLEEET_TOKEN     — bearer token
  FLEEET_RUN_ID    — reuse existing run_id
  FLEEET_AGENT     — agent name (default: $USER)

Examples:
  fleeet-emit session_start --task "fix the nav bug" --summary "starting work on nav z-index"
  fleeet-emit heartbeat --summary "nav fix done, testing" --progress.commits 1
  fleeet-emit blocked --summary "stuck on color choice" --blocker.kind design_call --blocker.question "blue or green?"
  fleeet-emit session_end --summary "nav bug fixed" --outcome.status shipped
`);
}

function parseArgs(argv) {
  const event = argv[0];
  const flags = {};
  for (let i = 1; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : "true";
    i++;

    // Handle dot notation: --source.repo foo → { source: { repo: "foo" } }
    const parts = key.split(".");
    let target = flags;
    for (let j = 0; j < parts.length - 1; j++) {
      if (!target[parts[j]]) target[parts[j]] = {};
      target = target[parts[j]];
    }
    const leaf = parts[parts.length - 1];

    // Try parsing as JSON first (for arrays/objects), then number, then string
    try {
      target[leaf] = JSON.parse(val);
    } catch {
      const num = Number(val);
      target[leaf] = Number.isNaN(num) ? val : num;
    }
  }
  return { event, flags };
}

function buildEvent({ event, flags }) {
  const runId =
    process.env.FLEEET_RUN_ID ||
    (event === "session_start"
      ? randomUUID()
      : existsSync(RUN_ID_FILE)
      ? readFileSync(RUN_ID_FILE, "utf8").trim()
      : null);

  if (!runId) {
    console.error("Error: no run_id found. Start with session_start or set FLEEET_RUN_ID.");
    process.exit(1);
  }

  const payload = {
    event,
    run_id: runId,
    ts: new Date().toISOString(),
    agent: AGENT,
    trigger: flags.trigger || "user",
    ...flags,
  };

  // Validate required fields
  if (!payload.summary) {
    console.error(`Error: --summary is required`);
    process.exit(1);
  }
  if (event === "session_start" && !payload.task) {
    console.error("Error: session_start requires --task");
    process.exit(1);
  }
  if (event === "blocked" && !payload.blocker) {
    console.error("Error: blocked requires --blocker.kind and --blocker.question");
    process.exit(1);
  }
  if (event === "session_end" && !(payload.outcome && payload.outcome.status)) {
    console.error("Error: session_end requires --outcome.status");
    process.exit(1);
  }

  return { payload, runId };
}

async function postEvent(payload) {
  if (!TOKEN) {
    console.error("FLEEET_TOKEN not set; not posting");
    return false;
  }

  try {
    const res = await fetch(`${ENDPOINT}/api/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`POST failed: ${res.status} ${err}`);
      return false;
    }

    const result = await res.json();
    console.log(`✓ Posted to ${ENDPOINT}/api/events`);
    return true;
  } catch (err) {
    console.error(`Network error: ${err.message}`);
    return false;
  }
}

function spoolLocal(payload) {
  const dir = join(process.cwd(), ".fleeet");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  appendFileSync(LOCAL_SPOOL, JSON.stringify(payload) + "\n");
  console.log(`✓ Spooled to ${LOCAL_SPOOL}`);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    help();
    process.exit(0);
  }

  const { event, flags } = parseArgs(argv);
  if (!["session_start", "heartbeat", "blocked", "session_end"].includes(event)) {
    console.error(`Error: invalid event type "${event}"`);
    console.error(`Valid types: session_start, heartbeat, blocked, session_end`);
    process.exit(1);
  }

  const { payload, runId } = buildEvent({ event, flags });

  // Save run_id on session_start
  if (event === "session_start") {
    writeFileSync(RUN_ID_FILE, runId);
    console.log(`run_id: ${runId}`);
  }

  // Try POST, fall back to local spool
  const posted = await postEvent(payload);
  if (!posted) {
    console.log("Falling back to local spool...");
    spoolLocal(payload);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
