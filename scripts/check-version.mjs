#!/usr/bin/env node
// check-version.mjs — fail on version drift, or on a shipped change without a bump.
//
//   node scripts/check-version.mjs                 working tree: every copy of the
//                                                  version agrees (npm run check)
//   node scripts/check-version.mjs --staged        pre-commit hook: the same on the
//                                                  index, plus: if anything under
//                                                  skills/, schema/, bin/ or
//                                                  .claude-plugin/{plugin,marketplace}.json
//                                                  is staged, the version must be
//                                                  higher than HEAD's
//   node scripts/check-version.mjs --range <base> [<head>]
//                                                  CI: the same between two commits.
//                                                  A missing, all-zero or unknown base
//                                                  (first push, force-push) falls back
//                                                  to <head>~1; a root commit gets the
//                                                  drift check only.
//
// Copies checked: scripts/versioning.mjs. Zero dependencies, Node 18+.

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { checkConsistency, compare, isGuarded } from "./versioning.mjs";

const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const tryGit = (...args) => { try { return git(...args); } catch { return null; } };
const fromTree = (rev) => (path) => tryGit("show", `${rev}:${path}`);
const fromDisk = (path) => (existsSync(path) ? readFileSync(path, "utf8") : null);
const isCommit = (rev) => !!rev && !/^0+$/.test(rev) && tryGit("rev-parse", "--verify", "--quiet", `${rev}^{commit}`) != null;
const versionAt = (read) => { try { return JSON.parse(read("package.json")).version; } catch { return undefined; } };

function fail(title, lines) {
  console.error(`✗ ${title}`);
  for (const l of lines) console.error(`  - ${l}`);
  process.exit(1);
}

function requireBump(changed, before, after, where) {
  const shipped = changed.filter(isGuarded);
  if (!shipped.length) return console.log(`✓ no skill/schema/bin/plugin changes ${where}; no bump needed`);
  if (!before) return console.log(`✓ ${where}: no earlier version to compare (${shipped.length} shipped file(s))`);
  if (compare(after, before) > 0) return console.log(`✓ version ${before} → ${after} covers ${shipped.length} shipped file(s) ${where}`);
  fail(`shipped files changed ${where} without a version bump (still ${after})`, [
    ...shipped.slice(0, 12), ...(shipped.length > 12 ? [`…and ${shipped.length - 12} more`] : []),
    "bump with: npm run release -- <patch|minor|major>   (rule: CONTRIBUTING.md)",
  ]);
}

const args = process.argv.slice(2);
const mode = args.includes("--staged") ? "staged" : args.includes("--range") ? "range" : "tree";

if (mode === "tree") {
  const { version, problems } = checkConsistency(fromDisk);
  if (problems.length) fail("version drift", problems);
  console.log(`✓ every copy says ${version}`);
} else if (mode === "staged") {
  const { version, problems } = checkConsistency(fromTree(""));
  if (problems.length) fail("version drift in the staged tree", problems);
  const changed = git("diff", "--cached", "--name-only", "--no-renames").split("\n").filter(Boolean);
  const hasHead = isCommit("HEAD");
  requireBump(changed, hasHead ? versionAt(fromTree("HEAD")) : undefined, version, "in this commit");
} else {
  const i = args.indexOf("--range");
  let base = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : "";
  const head = args[i + 2] && !args[i + 2].startsWith("--") ? args[i + 2] : "HEAD";
  if (!isCommit(head)) fail(`unknown head ${head}`, []);
  const { version, problems } = checkConsistency(fromTree(head));
  if (problems.length) fail(`version drift at ${head}`, problems);
  console.log(`✓ every copy says ${version} at ${head}`);
  if (!isCommit(base)) {
    const parent = isCommit(`${head}~1`) ? `${head}~1` : null;
    console.log(base && !/^0+$/.test(base)
      ? `! base ${base.slice(0, 12)} isn't in this clone (force-push?); comparing with ${parent || "nothing"}`
      : `! no base commit (first push or new branch); comparing with ${parent || "nothing"}`);
    base = parent;
  }
  if (!base) { console.log("✓ root commit: drift check only"); process.exit(0); }
  // Three dots: only what the head side changed since the merge base, so a PR
  // isn't blamed for main's newer commits. The version must still beat base's.
  const mergeBase = tryGit("merge-base", base, head)?.trim();
  const changed = git("diff", "--name-only", "--no-renames", mergeBase ? `${mergeBase}` : base, head).split("\n").filter(Boolean);
  requireBump(changed, versionAt(fromTree(base)), version, `in ${base.slice(0, 12)}..${head}`);
}
