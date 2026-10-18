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
//   FLEEET_EXCLUDE   — your own exclusions: patterns, comma or newline separated
//   FLEEET_ALLOW     — your own allowances: patterns that override the built-in filter
//   FLEEET_POLICY    — path to a policy file with Exclude: and Allow: lists
//   FLEEET_ENV_FILE  — env file to read FLEEET_* settings from
//                      (default ~/.config/fleeet/env; the environment wins)
//
// Commands:
//   fleeet-emit policy   — print the active filter rules (never the token)
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
//   - Skips (exit 0, or 3 with --strict; nothing posted or spooled) events
//     that look like the user's private life (first-person job search, health,
//     family, finances, legal, errands) or match FLEEET_EXCLUDE / the policy
//     file's Exclude list. FLEEET_ALLOW / Allow overrides the built-in filter.
//     Once a run's session_start is skipped, the rest of that run is skipped.
//     Skips are printed on stdout.
//   - Sends client.skill_version (KIT_VERSION below); if fleeet.space answers
//     with update_available, prints a one-line notice (once a day) on stderr.
//     It never updates anything itself.
//   - Zero dependencies, Node 18+

import { writeFileSync, readFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { tmpdir, userInfo, homedir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

// The kit version (skill, plugin, CLI share one). Bumped only by
// `npm run release`; `npm run check` fails if it drifts from package.json.
// A constant, not a package.json read: this file is also downloaded alone.
const KIT_VERSION = "1.5.0";

// Env file: FLEEET_* settings (token, endpoint, exclusions…) your setup keeps
// on disk. Values already in the environment win. Only FLEEET_* keys are read.
const ENV_FILE = process.env.FLEEET_ENV_FILE || join(homedir(), ".config", "fleeet", "env");
const ENV_FILE_LOADED = loadEnvFile(ENV_FILE);

function loadEnvFile(path) {
  let text;
  try { text = readFileSync(path, "utf8"); } catch { return false; }
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*(?:export\s+)?(FLEEET_[A-Z0-9_]+)\s*=\s*(.*)$/.exec(lines[i]);
    if (!m) continue;
    let [, key, val] = m;
    const q = val[0];
    if (q === '"' || q === "'") {
      // Quoted; a double-quoted value may span lines (one pattern per line).
      let body = val.slice(1);
      while (!body.trimEnd().endsWith(q) && q === '"' && i + 1 < lines.length) body += "\n" + lines[++i];
      val = body.trimEnd().endsWith(q) ? body.trimEnd().slice(0, -1) : body;
    } else {
      val = val.replace(/\s+#.*$/, "").trim();
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
  return true;
}

const RUN_ID_FILE = join(tmpdir(), "fleeet-run-id");
// Runs whose session_start was skipped: the rest of the run is skipped too.
const SKIPPED_RUNS_FILE = join(tmpdir(), "fleeet-skipped-runs");
const NOTICE_FILE = join(tmpdir(), "fleeet-update-notice");
const LOCAL_SPOOL = join(process.cwd(), ".fleeet", "events.jsonl");

const ENDPOINT = (process.env.FLEEET_ENDPOINT || "https://fleeet.space").replace(/\/+$/, "");
const TOKEN = process.env.FLEEET_TOKEN;
const AGENT = process.env.FLEEET_AGENT || process.env.USER || userInfo().username || "unknown";
const SURFACE = (process.env.FLEEET_SURFACE || "").trim().slice(0, 32);

// Personal-topic guard: Fleeet is a public work log. The user's private life
// (their own job search, health, family, money, legal, errands) is never
// posted. Job search matches first person only ("my job application",
// "I applied to…"), so product work like "user interviews", a "referral link"
// feature or a "résumé upload" component still posts. Email addresses and
// phone numbers are not skipped here: fleeet.space redacts them on ingest.
// (?<![\p{L}\p{N}_]) / (?![\p{L}\p{N}_]) are word edges that also work next to é.
const W0 = "(?<![\\p{L}\\p{N}_])", W1 = "(?![\\p{L}\\p{N}_])";
const words = (alts) => new RegExp(`${W0}(?:${alts.join("|")})${W1}`, "iu");
const PERSONAL_TOPICS = [
  ["job search", words([
    "my (?:own )?job (?:search(?:es)?|hunt(?:ing)?|applications?|offers?|interviews?)",
    "my (?:r[eé]sum[eé]s?|cv|cover letters?|offer letters?)",
    "my (?:applications?|interviews?) (?:to|for|at|with)",
    "my (?:next|new) job",
    "my referrals? (?:to|for|at)",
    "(?:referred|refer) me (?:to|for|at)",
    "I(?:'ve| have| had)? (?:applied|interviewed) (?:to|for|at|with)",
    "I(?:'m| am) (?:applying|interviewing) (?:to|for|at|with)",
    "I(?:'m| am) (?:job hunting|job searching|looking for (?:a )?(?:new )?job)",
    "I got (?:an?|the) (?:job )?offer",
  ])],
  ["health", /\b(doctor|dentist|medical|medication|prescription|therap(y|ist)|diagnos(is|ed)|hospital|clinic|symptoms?|surgery|health (insurance|appointment))\b/i],
  ["family", /\b(my (kids?|son|daughter|wife|husband|partner|mum|mom|dad|family)|kids?'? (school|pickup|birthday)|babysit\w*|childcare|daycare|birthday (party|gift))\b/i],
  ["finances", /\b(tax(es| return)|mortgage|salary|bank account|401k|brokerage|net worth|personal (budget|finances?))\b/i],
  ["legal", /\b(lawyer|attorney|lawsuit|court (case|filing|date)|landlord|tenant|eviction|small claims|legal (advice|filing|case))\b/i],
  ["personal errand", /\b(barber|haircut|groceries|grocery|laundry|dry clean\w*|kitchen (remodel|elevation)|home (repair|renovation)|personal errand)\b/i],
];

// Returns the first matching topic label, or null. Checks task, summary,
// blocker and outcome (text only, artefact URLs ignored).
// Recommended maximum lengths (warn only). Kept in step with schema/event-schema.json
// (x-recommendedMaxLength) and the skill's "Writing the task and summary" section.
const LENGTH_LIMITS = { task: 50, summary: 64 };

// The text the filters look at: task, summary, project, blocker and outcome
// (artefact URLs ignored).
function eventText(e) {
  const strip = (v) => (v && typeof v === "object" ? { ...v, artefacts: undefined } : v);
  return [e?.task, e?.summary, e?.project, strip(e?.blocker), strip(e?.outcome)]
    .map((v) => (typeof v === "string" ? v : v ? JSON.stringify(v) : ""))
    .join(" \n ");
}

function personalTopic(e) {
  const text = eventText(e);
  for (const [label, re] of PERSONAL_TOPICS) if (re.test(text)) return label;
  return null;
}

// --- Your own exclusions and allowances ------------------------------------
// FLEEET_EXCLUDE / FLEEET_ALLOW: patterns, comma or newline separated.
// FLEEET_POLICY: a markdown file with "Exclude:" and "Allow:" lists (bullets).
// A pattern is plain text, matched case-insensitively as whole words
// ("candidate sourcing"), or /regex/flags. In a policy file, a bullet with
// `backticked` terms uses those terms as its patterns; otherwise the bullet's
// text is the pattern. Exclude beats Allow; Allow beats the built-in filter.
function compilePattern(raw) {
  const p = raw.trim();
  if (!p) return null;
  const rx = /^\/(.+)\/([a-z]*)$/.exec(p);
  try {
    if (rx) return new RegExp(rx[1], rx[2].includes("i") ? rx[2] : rx[2] + "i");
    const body = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    return new RegExp(`${W0}${body}${W1}`, "iu");
  } catch (err) {
    console.error(`fleeet-emit: warning: ignoring invalid pattern ${JSON.stringify(p)} (${err.message})`);
    return null;
  }
}

const splitList = (v) => String(v || "").split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

function parsePolicyFile(text) {
  const out = { exclude: [], allow: [] };
  let section = null;
  const add = (item) => {
    item = item.trim().replace(/[.;]\s*$/, "");
    if (!item || !section) return;
    const ticks = [...item.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim()).filter(Boolean);
    out[section].push(...(ticks.length ? ticks : [item]));
  };
  for (const line of text.split(/\r?\n/)) {
    const head = /^\s*(?:#+\s*)?(?:\*\*)?(exclude|allow)(?:\*\*)?\s*:(?:\*\*)?\s*(.*)$/i.exec(line);
    if (head) {
      section = head[1].toLowerCase();
      for (const item of splitList(head[2])) add(item);
      continue;
    }
    if (/^\s*#/.test(line)) { section = null; continue; }
    const bullet = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (bullet) add(bullet[1]);
  }
  return out;
}

function loadPolicy() {
  const rules = { exclude: [], allow: [], file: null, fileState: null };
  const push = (kind, list, source) => {
    for (const pattern of list) {
      const re = compilePattern(pattern);
      if (re) rules[kind].push({ pattern, re, source });
    }
  };
  push("exclude", splitList(process.env.FLEEET_EXCLUDE), "FLEEET_EXCLUDE");
  push("allow", splitList(process.env.FLEEET_ALLOW), "FLEEET_ALLOW");
  const file = (process.env.FLEEET_POLICY || "").trim();
  if (file) {
    rules.file = resolve(file.replace(/^~(?=\/|$)/, homedir()));
    try {
      const parsed = parsePolicyFile(readFileSync(rules.file, "utf8"));
      push("exclude", parsed.exclude, "FLEEET_POLICY");
      push("allow", parsed.allow, "FLEEET_POLICY");
      rules.fileState = "loaded";
    } catch {
      rules.fileState = "not found";
    }
  }
  return rules;
}

// Runs whose session_start was skipped (one "run_id unix-seconds" per line).
const SKIP_TTL_S = 7 * 24 * 3600;
function readSkippedRuns() {
  try {
    const now = Date.now() / 1000;
    return readFileSync(SKIPPED_RUNS_FILE, "utf8").split("\n")
      .map((l) => l.trim().split(/\s+/)).filter(([id, t]) => id && now - Number(t || 0) < SKIP_TTL_S);
  } catch { return []; }
}
const runWasSkipped = (runId) => readSkippedRuns().some(([id]) => id === runId);
function markRunSkipped(runId) {
  try { appendFileSync(SKIPPED_RUNS_FILE, `${runId} ${Math.floor(Date.now() / 1000)}\n`); } catch {}
}
function unmarkRunSkipped(runId) {
  const rows = readSkippedRuns();
  if (!rows.some(([id]) => id === runId)) return;
  try { writeFileSync(SKIPPED_RUNS_FILE, rows.filter(([id]) => id !== runId).map((r) => r.join(" ") + "\n").join("")); } catch {}
}

// → null (post it) or { reason } (skip it). Order: a skipped run's later
// events, then your exclusions, then your allowances, then the built-in filter.
function filterDecision(payload, rules) {
  if (payload.event !== "session_start" && runWasSkipped(payload.run_id)) {
    return { reason: "this run's session_start was skipped, so the whole run stays off the board" };
  }
  const text = eventText(payload);
  const ex = rules.exclude.find((r) => r.re.test(text));
  if (ex) return { reason: `matches your exclusions (${JSON.stringify(ex.pattern)}, ${ex.source})` };
  if (rules.allow.some((r) => r.re.test(text))) return null;
  if (process.env.FLEEET_ALLOW_PERSONAL === "1") return null;
  const topic = personalTopic(payload);
  if (topic) return { reason: `looks personal (${topic})` };
  return null;
}

function printPolicy(rules) {
  const line = (s = "") => console.log(s);
  const list = (items) => (items.length ? items.forEach((r) => line(`  - ${JSON.stringify(r.pattern)}  [${r.source}]`)) : line("  (none)"));
  line(`fleeet-emit ${KIT_VERSION} policy`);
  line(`endpoint:    ${ENDPOINT}`);
  line(`token:       ${TOKEN ? "set (never shown)" : "not set"}`);
  line(`agent:       ${AGENT}`);
  line(`env file:    ${ENV_FILE} (${ENV_FILE_LOADED ? "read" : "not found"})`);
  line(`policy file: ${rules.file ? `${rules.file} (${rules.fileState})` : "none (FLEEET_POLICY not set)"}`);
  line();
  line("Built-in filter (skips the whole run):");
  line(`  ${PERSONAL_TOPICS.map(([l]) => (l === "job search" ? "job search (first person only)" : l)).join(", ")}`);
  line(`  FLEEET_ALLOW_PERSONAL=1: ${process.env.FLEEET_ALLOW_PERSONAL === "1" ? "on (built-in filter off for this command)" : "off"}`);
  line();
  line("Exclude (always skipped, whole run; beats Allow):");
  list(rules.exclude);
  line();
  line("Allow (overrides the built-in filter, never your exclusions):");
  list(rules.allow);
  line();
  line("Order: skipped run > Exclude > Allow > FLEEET_ALLOW_PERSONAL > built-in filter");
}

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
  --summary        — one plain sentence, no period
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
  --strict         — exit 3 (instead of 0) when the filter skips the event
  --version        — print the kit version and exit

Commands:
  policy           — print the active filter rules: built-in, your exclusions and
                     allowances, env and policy files (never the token)

Environment:
  FLEEET_ENDPOINT  — base URL (default: https://fleeet.space)
  FLEEET_TOKEN     — bearer token
  FLEEET_RUN_ID    — reuse existing run_id
  FLEEET_AGENT     — agent name (default: $USER)
  FLEEET_SURFACE   — surface label, e.g. "Claude Code" (optional, max 32 chars)
  FLEEET_EXCLUDE   — your exclusions: patterns, comma or newline separated
  FLEEET_ALLOW     — your allowances: patterns that override the built-in filter
  FLEEET_POLICY    — path to a file with Exclude: and Allow: lists
  FLEEET_ALLOW_PERSONAL=1 — skip the built-in filter for one deliberate false positive
  FLEEET_ENV_FILE  — env file for FLEEET_* settings (default ~/.config/fleeet/env)

Filter skips print "skipped, ..." on stdout and post nothing. Patterns are
plain text (whole words, any case) or /regex/.

Examples:
  fleeet-emit session_start --task "fix the nav bug" --summary "starting work on nav z-index"
  fleeet-emit heartbeat --summary "nav fix done, testing" --progress.commits 1
  fleeet-emit blocked --summary "stuck on color choice" --blocker.kind design_call --blocker.question "blue or green?"
  fleeet-emit session_end --summary "nav bug fixed" --outcome.status shipped
  FLEEET_EXCLUDE="candidate sourcing, /\\bpayroll\\b/" fleeet-emit policy
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
  // Length guidance (1.4.0): like an email subject line. The board's desktop log
  // column fits about 66 characters on one line, so longer text wraps or clips.
  // A warning only, never a failure: the event still posts.
  for (const [k, max] of Object.entries(LENGTH_LIMITS)) {
    const v = payload[k];
    if (isText(v) && v.trim().length > max) {
      console.error(`fleeet-emit: warning: --${k} is ${v.trim().length} chars; keep it to ${max} or fewer so it fits one line on the board`);
    }
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
  const rawArgv = process.argv.slice(2);
  const strict = rawArgv.includes("--strict");
  const argv = rawArgv.filter((a) => a !== "--strict");
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    help();
    process.exit(0);
  }
  if (argv[0] === "--version" || argv[0] === "-v") {
    console.log(KIT_VERSION);
    process.exit(0);
  }

  if (argv[0] === "policy") {
    printPolicy(loadPolicy());
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

  // Filter: skip (never post or spool). Exit 0, or 3 with --strict.
  const rules = loadPolicy();
  if (rules.fileState === "not found") console.error(`fleeet-emit: warning: FLEEET_POLICY file not found: ${rules.file}`);
  const skip = filterDecision(payload, rules);
  if (skip) {
    if (event === "session_start") markRunSkipped(runId);
    console.log(`fleeet-emit: skipped, ${skip.reason}. Nothing was posted.`);
    process.exit(strict ? 3 : 0);
  }
  if (event === "session_start") unmarkRunSkipped(runId);

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
