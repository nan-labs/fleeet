// fleeet-emit CLI: argument parsing and per-event validation, end to end.
// Runs the real CLI against a local HTTP server that records each POST.
//   node --test test/
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const CLI = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "fleeet-emit.mjs");
const RUN_ID = "11111111-1111-4111-8111-111111111111";
let server, endpoint, cwd;
const posts = [];

before(async () => {
  cwd = mkdtempSync(join(tmpdir(), "fleeet-emit-test-"));
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      posts.push({ auth: req.headers.authorization, body: JSON.parse(body) });
      res.writeHead(202, { "content-type": "application/json" });
      res.end('{"ok":true}');
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  endpoint = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); rmSync(cwd, { recursive: true, force: true }); });

function emit(args, env = {}) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [CLI, ...args], {
      cwd,
      // HOME/TMPDIR/FLEEET_ENV_FILE point into the temp dir so a real
      // ~/.config/fleeet/env or skipped-runs file never leaks into a test.
      env: { PATH: process.env.PATH, HOME: cwd, TMPDIR: cwd, FLEEET_ENV_FILE: join(cwd, "no-env-file"),
        FLEEET_ENDPOINT: endpoint, FLEEET_TOKEN: "flt_test", FLEEET_AGENT: "Tester", FLEEET_RUN_ID: RUN_ID, ...env },
    });
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => resolve({ code, out, err, sent: posts.length ? posts[posts.length - 1].body : null }));
  });
}
async function ok(args, env) {
  const before = posts.length;
  const r = await emit(args, env);
  assert.equal(r.code, 0, `exit ${r.code}: ${r.err}`);
  assert.equal(posts.length, before + 1, "one POST");
  return r.sent;
}

test("session_end handed_off with FLEEET_RUN_ID (the reported case)", async () => {
  const e = await ok(["session_end", "--summary", "handing over to Flo", "--outcome.status", "handed_off"]);
  assert.equal(e.event, "session_end");
  assert.equal(e.run_id, RUN_ID);
  assert.deepEqual(e.outcome, { status: "handed_off" });
  assert.equal(posts.at(-1).auth, "Bearer flt_test");
});

test("--key=value works (it used to exit 1: session_end requires --outcome.status)", async () => {
  const e = await ok(["session_end", "--summary=done", "--outcome.status=handed_off", "--outcome.note=see the PR"]);
  assert.equal(e.summary, "done");
  assert.deepEqual(e.outcome, { status: "handed_off", note: "see the PR" });
});

test("a flag with no value doesn't swallow the next flag", async () => {
  const e = await ok(["session_end", "--summary", "done", "--quiet", "--outcome.status", "handed_off"]);
  assert.equal(e.outcome.status, "handed_off");
  assert.equal(e.quiet, true);
});

test("--outcome '{…}' after --outcome.status merges instead of dropping status", async () => {
  const e = await ok(["session_end", "--summary", "done", "--outcome.status", "shipped",
    "--outcome", '{"artefacts":[{"kind":"commit","url":"https://github.com/nan-labs/fleeet"}]}']);
  assert.equal(e.outcome.status, "shipped");
  assert.equal(e.outcome.artefacts[0].kind, "commit");
});

test("text fields stay strings; counts become numbers", async () => {
  const e = await ok(["heartbeat", "--summary", "0", "--progress.commits", "3", "--project", "2026"]);
  assert.equal(e.summary, "0");
  assert.equal(e.project, "2026");
  assert.equal(e.progress.commits, 3);
  const e2 = await ok(["heartbeat", "--summary", "true"]);
  assert.equal(e2.summary, "true");
  const e3 = await ok(["heartbeat", "--summary", "[WIP] nav", "--outcome.usage.input_tokens", "1200"]);
  assert.equal(e3.summary, "[WIP] nav");
  const e4 = await ok(["session_end", "--summary", "x", "--outcome.status", "failed", "--outcome.note", "404"]);
  assert.equal(e4.outcome.note, "404");
});

test("JSON arrays and objects still parse", async () => {
  const e = await ok(["blocked", "--summary", "need a call", "--blocker.kind", "design_call",
    "--blocker.question", "blue or green?", "--blocker.options", '["blue","green"]']);
  assert.deepEqual(e.blocker, { kind: "design_call", question: "blue or green?", options: ["blue", "green"] });
});

test("session_start and heartbeat unchanged", async () => {
  const s = await ok(["session_start", "--task", "fix nav", "--summary", "starting", "--source.repo", "nan-labs/fleeet"]);
  assert.equal(s.task, "fix nav");
  assert.deepEqual(s.source, { repo: "nan-labs/fleeet" });
  const h = await ok(["heartbeat", "--summary", "nav done"]);
  assert.equal(h.event, "heartbeat");
});

test("validation still fails clearly, with exit 1 and no POST", async () => {
  for (const [args, msg] of [
    [["session_end", "--summary", "x"], /requires --outcome.status/],
    [["session_end", "--summary", "x", "--outcome.status", "handed-off"], /must be one of/],
    [["session_end", "--outcome.status", "shipped"], /--summary is required/],
    [["session_end", "--summary", "--outcome.status", "shipped"], /--summary is required/],
    [["session_start", "--summary", "x"], /requires --task/],
  ]) {
    const before = posts.length;
    const r = await emit(args);
    assert.equal(r.code, 1, args.join(" "));
    assert.match(r.err, msg);
    assert.equal(posts.length, before, "nothing posted");
  }
});

test("over-length task/summary warns on stderr but still posts (1.4.0)", async () => {
  const long = "Rewrote the onboarding guide, fixed three docs links and tidied up the footer copy";
  const before = posts.length;
  const r = await emit(["session_start", "--task", "Onboarding guide rewrite for new visitors to the docs site", "--summary", long]);
  assert.equal(r.code, 0, r.err);
  assert.equal(posts.length, before + 1, "still posts");
  assert.match(r.err, /--task is \d+ chars; keep it to 50/);
  assert.match(r.err, /--summary is \d+ chars; keep it to 64/);
  const s = await emit(["heartbeat", "--summary", "Docs links fixed, footer next"]);
  assert.doesNotMatch(s.err, /warning/);
});

// --- 1.5.0: narrower personal filter, your own exclusions, whole-run skips ---

async function skipped(args, env, re = /skipped, /) {
  const before = posts.length;
  const r = await emit(args, env);
  assert.equal(r.code, 0, `exit ${r.code}: ${r.err}`);
  assert.equal(posts.length, before, `nothing posted for: ${args.join(" ")}`);
  assert.match(r.out, re, "the skip is printed on stdout");
  return r;
}
const fresh = () => ({ FLEEET_RUN_ID: randomUUID() });

test("product work that shares a personal word still posts (false positives)", async () => {
  for (const summary of [
    "Ran user interviews for the onboarding flow",
    "Added the referral link feature to invites",
    "Built the résumé upload component for the hiring app",
    "Recruiting page copy for the careers site",
    "CV parser handles two-column layouts",
    "Plan B for the cache: fall back to disk",
    "New role picker in team settings",
    "Role posting form validates required fields",
    "Credit card form uses the payment SDK",
    "Loan calculator rounds to cents",
    "Interview scheduling tool sends reminders",
    "Contact form now redacts support@example.com and 415-555-0100",
  ]) {
    const e = await ok(["heartbeat", "--summary", summary], fresh());
    assert.equal(e.summary, summary);
  }
});

test("first-person job search is skipped (true positives)", async () => {
  for (const summary of [
    "Updated my résumé for a design role",
    "Tailored my cover letter for the studio",
    "Tracking my job applications",
    "I applied to three design studios",
    "I'm interviewing at a startup next week",
    "Prep for my interview with the hiring panel",
    "A friend referred me to the platform team",
  ]) {
    await skipped(["heartbeat", "--summary", summary], fresh(), /skipped, looks personal \(job search\)/);
  }
  // Other private-life topics are still skipped.
  await skipped(["heartbeat", "--summary", "Booked the dentist for Tuesday"], fresh(), /looks personal \(health\)/);
});

test("FLEEET_ALLOW_PERSONAL=1 still overrides one false positive", async () => {
  await ok(["heartbeat", "--summary", "Updated my résumé template in the app"], { ...fresh(), FLEEET_ALLOW_PERSONAL: "1" });
});

test("FLEEET_EXCLUDE adds skips; plain patterns match whole words, /regex/ works", async () => {
  const env = { FLEEET_EXCLUDE: "candidate sourcing, /\\bpayroll\\b/\nHR discussion" };
  await skipped(["heartbeat", "--summary", "Candidate  Sourcing for the platform role"], { ...fresh(), ...env },
    /skipped, matches your exclusions \("candidate sourcing", FLEEET_EXCLUDE\)/);
  await skipped(["heartbeat", "--summary", "Payroll export fixed"], { ...fresh(), ...env }, /matches your exclusions/);
  await skipped(["heartbeat", "--summary", "Notes from the HR discussion"], { ...fresh(), ...env }, /matches your exclusions/);
  await skipped(["heartbeat", "--summary", "Sprint notes", "--project", "payroll"], { ...fresh(), ...env }, /matches your exclusions/);
  await ok(["heartbeat", "--summary", "Candidates list sorts by date"], { ...fresh(), ...env });
});

test("FLEEET_ALLOW overrides the built-in filter but never an exclusion", async () => {
  const allow = { FLEEET_ALLOW: "my kids app" };
  await skipped(["heartbeat", "--summary", "Shipped my kids app onboarding"], fresh(), /looks personal \(family\)/);
  await ok(["heartbeat", "--summary", "Shipped my kids app onboarding"], { ...fresh(), ...allow });
  await skipped(["heartbeat", "--summary", "Shipped my kids app onboarding"],
    { ...fresh(), ...allow, FLEEET_EXCLUDE: "onboarding" }, /matches your exclusions/);
  // FLEEET_ALLOW_PERSONAL doesn't bypass your exclusions either.
  await skipped(["heartbeat", "--summary", "Onboarding copy"],
    { ...fresh(), FLEEET_EXCLUDE: "onboarding", FLEEET_ALLOW_PERSONAL: "1" }, /matches your exclusions/);
});

test("FLEEET_POLICY file: Exclude:/Allow: lists, backticked terms", async () => {
  const file = join(cwd, "policy.md");
  writeFileSync(file, [
    "# Team policy", "", "## Fleeet reporting",
    "Exclude:",
    "- A recruiting agent's HR work: `candidate scoring`, `sourcing call`",
    "- vendor contract review",
    "Allow:",
    "- `tax return export` (we build tax software)",
    "", "## Something else", "- not a rule",
  ].join("\n"));
  const env = { FLEEET_POLICY: file };
  await skipped(["heartbeat", "--summary", "Candidate scoring for the design role"], { ...fresh(), ...env },
    /matches your exclusions \("candidate scoring", FLEEET_POLICY\)/);
  await skipped(["heartbeat", "--summary", "Vendor contract review done"], { ...fresh(), ...env }, /matches your exclusions/);
  await ok(["heartbeat", "--summary", "Tax return export handles amended filings"], { ...fresh(), ...env });
  await ok(["heartbeat", "--summary", "Not a rule anymore"], { ...fresh(), ...env });
  await skipped(["heartbeat", "--summary", "Filed my tax return"], fresh(), /looks personal \(finances\)/);
});

test("exclusions are read from the env file; the environment wins", async () => {
  const envFile = join(cwd, "env");
  writeFileSync(envFile, [
    "# fleeet settings", "export FLEEET_EXCLUDE=\"side project\nweekend build\"", "FLEEET_ALLOW=my kids app # inline comment",
    "OTHER_SECRET=ignored",
  ].join("\n"));
  const env = { FLEEET_ENV_FILE: envFile };
  await skipped(["heartbeat", "--summary", "Side project landing page"], { ...fresh(), ...env }, /matches your exclusions/);
  await skipped(["heartbeat", "--summary", "Weekend build of the timer"], { ...fresh(), ...env }, /matches your exclusions/);
  await ok(["heartbeat", "--summary", "Shipped my kids app onboarding"], { ...fresh(), ...env });
  await ok(["heartbeat", "--summary", "Side project landing page"], { ...fresh(), ...env, FLEEET_EXCLUDE: "" });
});

test("once session_start is skipped, the whole run is skipped", async () => {
  const run = fresh();
  await skipped(["session_start", "--task", "Job search tracker", "--summary", "Updating my job applications"], run);
  await skipped(["heartbeat", "--summary", "Sorted the list by date"], run, /this run's session_start was skipped/);
  await skipped(["session_end", "--summary", "Done", "--outcome.status", "shipped"], run, /this run's session_start was skipped/);
  // Other runs are unaffected.
  await ok(["heartbeat", "--summary", "Sorted the list by date"], fresh());
  // Re-posting the start deliberately (a false positive) reopens the run.
  await ok(["session_start", "--task", "Job search tracker", "--summary", "Updating my job applications"],
    { ...run, FLEEET_ALLOW_PERSONAL: "1" });
  await ok(["heartbeat", "--summary", "Sorted the list by date"], run);
});

test("--strict exits 3 on a skip and 0 when the event posts", async () => {
  const before = posts.length;
  const r = await emit(["heartbeat", "--summary", "I applied to two studios", "--strict"], fresh());
  assert.equal(r.code, 3);
  assert.equal(posts.length, before);
  assert.match(r.out, /skipped, looks personal/);
  const e = await ok(["heartbeat", "--strict", "--summary", "Board filter pill shipped"], fresh());
  assert.equal(e.strict, undefined, "--strict is not sent as a field");
});

test("policy command prints the active rules and never the token", async () => {
  const file = join(cwd, "policy2.md");
  writeFileSync(file, "Exclude:\n- `payroll`\nAllow:\n- `my kids app`\n");
  const before = posts.length;
  const r = await emit(["policy"], { FLEEET_EXCLUDE: "candidate sourcing", FLEEET_POLICY: file, FLEEET_TOKEN: "flt_supersecret_123" });
  assert.equal(r.code, 0, r.err);
  assert.equal(posts.length, before, "policy posts nothing");
  assert.doesNotMatch(r.out + r.err, /flt_supersecret_123/);
  assert.match(r.out, /token:\s+set \(never shown\)/);
  assert.match(r.out, /job search \(first person only\)/);
  assert.match(r.out, /"candidate sourcing"\s+\[FLEEET_EXCLUDE\]/);
  assert.match(r.out, /"payroll"\s+\[FLEEET_POLICY\]/);
  assert.match(r.out, /"my kids app"\s+\[FLEEET_POLICY\]/);
  assert.match(r.out, new RegExp(`policy file:\\s+${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\(loaded\\)`));
  const none = await emit(["policy"], { FLEEET_TOKEN: "" });
  assert.match(none.out, /token:\s+not set/);
  assert.match(none.out, /Exclude[^\n]*\n\s+\(none\)/);
});
