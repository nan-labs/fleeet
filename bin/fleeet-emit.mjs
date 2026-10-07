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
//   FLEEET_SURFACE   — optional surface label, e.g. "Claude Code" (max 32 chars)
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
//   - Sends client.skill_version (KIT_VERSION below); if fleeet.space answers
//     with update_available, prints a one-line notice (once a day) on stderr.
//     It never updates anything itself.
//   - Zero dependencies, Node 18+

import { writeFileSync, readFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

// The kit version (skill, plugin, CLI share one). Bumped only by
// `npm run release`; `npm run check` fails if it drifts from package.json.
// A constant, not a package.json read: this file is also downloaded alone.
const KIT_VERSION = "1.2.2";

const RUN_ID_FILE = join(tmpdir(), "fleeet-run-id");
const NOTICE_FILE = join(tmpdir(), "fleeet-update-notice");
const LOCAL_SPOOL = join(process.cwd(), ".fleeet", "events.jsonl");

const ENDPOINT = (process.env.FLEEET_ENDPOINT || "https://fleeet.space").replace(/\/+$/, "");
const TOKEN = process.env.FLEEET_TOKEN;
const AGENT = process.env.FLEEET_AGENT || process.env.USER || userInfo().username || "unknown";
const SURFACE = (process.env.FLEEET_SURFACE || "").trim().slice(0, 32);

function help() {
  console.log(`fleeet-emit ${KIT_VERSION} — emit fleeet events from the command line

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
  --project        — Claude/ChatGPT Project name, or repo/workspace folder name (omit otherwise)
  --surface        — surface label (overrides FLEEET_SURFACE)
  --progress.commits N
  --blocker.kind   — ambiguity|missing_credential|failing_dep|design_call|access|other
  --blocker.question
  --outcome.status — shipped|abandoned|handed_off|failed
  --outcome.artefacts — JSON array, e.g. '[{"kind":"pr","url":"..."}]'
  --outcome.usage  — token counts if your tool reports them, e.g. '{"input_tokens":182000,"output_tokens":9400,"source":"reported"}'
  --version        — print the kit version and exit

Environment:
  FLEEET_ENDPOINT  — base URL (default: https://fleeet.space)
  FLEEET_TOKEN     — bearer token
  FLEEET_RUN_ID    — reuse existing run_id
  FLEEET_AGENT     — agent name (default: $USER)
  FLEEET_SURFACE   — surface label, e.g. "Claude Code" (optional, max 32 chars)

Examples:
  fleeet-emit session_start --task "fix the nav bug" --summary "starting work on nav z-index"
  fleeet-emit heartbeat --summary "nav fix done, testing" --progress.commits 1
  fleeet-emit blocked --summary "stuck on color choice" --blocker.kind design_call --blocker.question "blue or green?"
  fleeet-emit session_end --summary "nav bug fixed" --outcome.status shipped
`);
}

// Values stay strings unless the field is a number in the schema (progress.*,
// outcome.usage token counts) or the value is a JSON array/object. Before
// 1.2.1 every value went through JSON.parse, so `--summary 0` became the
// number 0 (and failed "--summary is required"), `--summary true` a boolean.
const NUMERIC_FIELDS = new Set([
  "progress.commits", "progress.files_changed", "progress.tests_passing", "progress.tests_failing",
  "outcome.usage.input_tokens", "outcome.usage.output_tokens",
]);
// Free-text fields are never parsed, even when they look like JSON ("[WIP] …").
const TEXT_FIELDS = new Set([
  "summary", "task", "project", "trigger", "agent", "surface", "visibility",
  "outcome.status", "outcome.note", "blocker.kind", "blocker.question",
]);
const OUTCOME_STATUSES = ["shipped", "abandoned", "handed_off", "failed"];

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
function mergeInto(target, key, value) {
  // --outcome.status x --outcome '{"note":"y"}' keeps both (it used to drop status).
  if (isPlainObject(target[key]) && isPlainObject(value)) {
    for (const [k, v] of Object.entries(value)) mergeInto(target[key], k, v);
  } else {
    target[key] = value;
  }
}

function coerce(path, raw) {
  if (typeof raw !== "string") return raw;
  if (TEXT_FIELDS.has(path)) return raw;
  const t = raw.trim();
  if (t.startsWith("{") || t.startsWith("[")) {
    try { return JSON.parse(t); } catch { return raw; }
  }
  if (NUMERIC_FIELDS.has(path) && t !== "" && !Number.isNaN(Number(t))) return Number(t);
  return raw;
}

// Accepts `--key value` and `--key=value`, with dot notation for nested
// fields (--source.repo foo → { source: { repo: "foo" } }). A flag with no
// value is `true` and never swallows the flag after it.
function parseArgs(argv) {
  const event = argv[0];
  const flags = {};
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--") || arg === "--") continue;
    let key = arg.slice(2);
    let val;
    const eq = key.indexOf("=");
    if (eq > 0) {
      val = key.slice(eq + 1);
      key = key.slice(0, eq);
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
      val = argv[++i];
    } else {
      val = true;
    }

    const parts = key.split(".").filter(Boolean);
    if (!parts.length) continue;
    let target = flags;
    for (let j = 0; j < parts.length - 1; j++) {
      if (!isPlainObject(target[parts[j]])) target[parts[j]] = {};
      target = target[parts[j]];
    }
    mergeInto(target, parts[parts.length - 1], coerce(parts.join("."), val));
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
    ...(SURFACE && { surface: SURFACE }),
    ...flags,
    // Which kit/skill version sent this (stored by fleeet, never public).
    client: { skill_version: KIT_VERSION },
  };

  // Validate required fields
  const isText = (v) => typeof v === "string" && v.trim() !== "";
  if (!isText(payload.summary)) {
    console.error(`Error: --summary is required (one plain line, e.g. --summary "nav fixed")`);
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
  if (event === "session_end") {
    const status = payload.outcome && payload.outcome.status;
    if (!isText(status)) {
      console.error(`Error: session_end requires --outcome.status (${OUTCOME_STATUSES.join(" | ")})`);
      process.exit(1);
    }
    if (!OUTCOME_STATUSES.includes(status)) {
      console.error(`Error: --outcome.status must be one of ${OUTCOME_STATUSES.join(", ")} (got "${status}")`);
      process.exit(1);
    }
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

    const result = await res.json().catch(() => ({}));
    console.log(`✓ Posted to ${ENDPOINT}/api/events`);
    noticeUpdate(result.update_available);
    return true;
  } catch (err) {
    console.error(`Network error: ${err.message}`);
    return false;
  }
}

// Update info is trusted only from fleeet.space itself (not a custom
// FLEEET_ENDPOINT, not anything else). Tell the user at most once a day per
// version; updating is their call.
function noticeUpdate(update) {
  try {
    if (!update || !/^(.+\.)?fleeet\.space$/.test(new URL(ENDPOINT).hostname)) return;
    const latest = String(update.latest || "");
    if (!/^\d+\.\d+\.\d+$/.test(latest)) return;
    const stamp = `${latest} ${new Date().toISOString().slice(0, 10)}`;
    if (existsSync(NOTICE_FILE) && readFileSync(NOTICE_FILE, "utf8").trim() === stamp) return;
    writeFileSync(NOTICE_FILE, stamp);
    console.error(`fleeet: kit ${latest} is available (this is ${KIT_VERSION}). What changed: https://github.com/nan-labs/fleeet/blob/main/CHANGELOG.md · how to update: https://docs.fleeet.space/updating`);
  } catch {}
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
  if (argv[0] === "--version" || argv[0] === "-v") {
    console.log(KIT_VERSION);
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
