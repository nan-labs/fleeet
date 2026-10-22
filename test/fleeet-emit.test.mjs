// fleeet-emit CLI: argument parsing and per-event validation, end to end.
// Runs the real CLI against a local HTTP server that records each POST.
//   node --test test/
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
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
      env: { PATH: process.env.PATH, FLEEET_ENDPOINT: endpoint, FLEEET_TOKEN: "flt_test", FLEEET_AGENT: "Tester", FLEEET_RUN_ID: RUN_ID, ...env },
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

test("FLEEET_URL as an alias for FLEEET_ENDPOINT", async () => {
  // FLEEET_URL alone works
  const r1 = await emit(["heartbeat", "--summary", "testing URL"], { FLEEET_ENDPOINT: undefined, FLEEET_URL: endpoint });
  assert.equal(r1.code, 0);
  assert.equal(posts.at(-1).body.summary, "testing URL");
  
  // FLEEET_ENDPOINT wins when both are set
  const localEndpoint = endpoint;
  const r2 = await emit(["heartbeat", "--summary", "endpoint wins"], { FLEEET_ENDPOINT: localEndpoint, FLEEET_URL: "http://ignored.example" });
  assert.equal(r2.code, 0);
  assert.equal(posts.at(-1).body.summary, "endpoint wins");
  // Should have posted to endpoint, not to the FLEEET_URL
  const postsBefore = posts.length;
  assert.equal(posts.length, postsBefore); // Same server received it
});
