#!/usr/bin/env node
// release.mjs — bump the kit version everywhere, date the CHANGELOG, commit, tag.
//
//   npm run release -- patch|minor|major [--no-tag] [--dry-run]
//
// 1. Refuses if the copies already disagree (npm run check) or if a file it
//    edits has unstaged changes. Changes you've staged go into the release
//    commit (stage the skill edit, then release: one commit, hook-clean).
// 2. Bumps every copy listed in scripts/versioning.mjs (package.json,
//    package-lock.json, plugin.json, marketplace.json ×2, SKILL.md metadata.version
//    + opening line, docs/public/skill.md, docs/public/versions.json,
//    KIT_VERSION in bin/fleeet-emit.mjs).
// 3. CHANGELOG.md: the "## [Unreleased]" notes become "## [X.Y.Z] - YYYY-MM-DD"
//    (a fresh empty Unreleased goes on top). No notes → the commit subjects
//    since the last v* tag, or a placeholder to edit before pushing.
// 4. Commits "Release vX.Y.Z" and creates the annotated tag vX.Y.Z.
// 5. Never pushes. Prints the push command.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { CHANGELOG, EMIT, SKILL, SKILL_COPY, bump, checkConsistency } from "./versioning.mjs";

const args = process.argv.slice(2);
const kind = args.find((a) => !a.startsWith("--"));
const noTag = args.includes("--no-tag");
const dryRun = args.includes("--dry-run");
const git = (...a) => execFileSync("git", a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const tryGit = (...a) => { try { return git(...a); } catch { return null; } };
const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : null);
const die = (msg, lines = []) => { console.error(`✗ ${msg}`); for (const l of lines) console.error(`  - ${l}`); process.exit(1); };

if (!["patch", "minor", "major"].includes(kind)) {
  die("usage: npm run release -- <patch|minor|major> [--no-tag] [--dry-run]", [
    "patch: wording and fixes, no behaviour change for agents",
    "minor: additive (new optional field, new section, new command)",
    "major: breaking (removed/renamed field or tool, changed meaning)",
  ]);
}
if (tryGit("rev-parse", "--is-inside-work-tree") !== "true") die("not inside a git work tree");
const root = git("rev-parse", "--show-toplevel");
process.chdir(root);

const { version: current, problems } = checkConsistency(read);
if (problems.length) die("the version copies disagree; fix that first (npm run check)", problems);
const next = bump(current, kind);
const tag = `v${next}`;
if (tryGit("rev-parse", "--verify", "--quiet", `refs/tags/${tag}`)) die(`tag ${tag} already exists`);

const FILES = ["package.json", "package-lock.json", ".claude-plugin/plugin.json", ".claude-plugin/marketplace.json",
  SKILL, SKILL_COPY, "docs/public/versions.json", EMIT, CHANGELOG].filter((f) => existsSync(f));
const unstaged = git("diff", "--name-only", "--", ...FILES).split("\n").filter(Boolean);
if (unstaged.length) die("these files have unstaged changes; stage (git add) or stash them first", unstaged);

// --- edits (formatting preserved: version strings are replaced in place) ---
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const edits = new Map();
const edit = (file, fn) => {
  const before = edits.get(file) ?? read(file);
  const after = fn(before);
  if (after === before) die(`couldn't find the version in ${file}`);
  edits.set(file, after);
};
const jsonVersionField = (text, count) => {
  // Replace the first `count` "version": "<current>" occurrences only.
  let n = 0;
  return text.replace(new RegExp(`("version"\\s*:\\s*")${esc(current)}(")`, "g"), (m, a, b) => (n++ < count ? `${a}${next}${b}` : m));
};
edit("package.json", (t) => jsonVersionField(t, 1));
if (existsSync("package-lock.json")) {
  edit("package-lock.json", (t) => {
    const lock = JSON.parse(t);
    lock.version = next;
    if (lock.packages?.[""]) lock.packages[""].version = next;
    return JSON.stringify(lock, null, 2) + "\n";
  });
}
edit(".claude-plugin/plugin.json", (t) => jsonVersionField(t, 1));
edit(".claude-plugin/marketplace.json", (t) => jsonVersionField(t, 2)); // metadata + plugin entry
edit(SKILL, (t) => t
  .replace(new RegExp(`^([ \\t]+version:[ \\t]*["']?)${esc(current)}(["']?[ \\t]*)$`, "m"), `$1${next}$2`)
  .replace(new RegExp(`^Fleeet skill v${esc(current)}\\b`, "m"), `Fleeet skill v${next}`));
edits.set(SKILL_COPY, edits.get(SKILL));
edit("docs/public/versions.json", (t) => {
  const v = JSON.parse(t);
  v.skill = next; v.cli = next; v.updated = new Date().toISOString();
  return JSON.stringify(v, null, 2) + (t.endsWith("\n") ? "\n" : "");
});
edit(EMIT, (t) => t.replace(new RegExp(`^const KIT_VERSION = "${esc(current)}";`, "m"), `const KIT_VERSION = "${next}";`));

// --- CHANGELOG ---
const d = new Date();
const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
edit(CHANGELOG, (t) => {
  const unrel = /^## \[Unreleased\][^\n]*\n([\s\S]*?)(?=^## \[|(?![\s\S]))/m.exec(t);
  const notes = unrel ? unrel[1].trim() : "";
  let body = notes;
  if (!body) {
    const lastTag = tryGit("describe", "--tags", "--abbrev=0", "--match", "v*");
    const subjects = lastTag
      ? git("log", "--no-merges", "--format=%s", `${lastTag}..HEAD`).split("\n").filter((s) => s && !/^Release v\d/.test(s))
      : [];
    body = subjects.length ? subjects.map((s) => `- ${s}`).join("\n") : "- TODO: describe this release (edit before pushing)";
  }
  const entry = `## [Unreleased]\n\n## [${next}] - ${date}\n\n${body}\n\n`;
  if (unrel) return t.slice(0, unrel.index) + entry + t.slice(unrel.index + unrel[0].length);
  const first = /^## \[/m.exec(t);
  return first ? t.slice(0, first.index) + entry + t.slice(first.index) : `${t.trimEnd()}\n\n${entry}`;
});

if (dryRun) {
  console.log(`dry run: ${current} → ${next} (${kind}); would edit:`);
  for (const f of edits.keys()) console.log(`  ${f}`);
  process.exit(0);
}
for (const [f, t] of edits) writeFileSync(f, t);

const after = checkConsistency(read);
if (after.problems.length || after.version !== next) die("post-bump check failed (files are edited, nothing committed)", after.problems);

git("add", "--", ...edits.keys());
try {
  execFileSync("git", ["commit", "-q", "-m", `Release ${tag}`], { stdio: "inherit" });
} catch {
  die("git commit failed (files are bumped and staged; fix and commit by hand)");
}
const branch = tryGit("symbolic-ref", "--short", "HEAD") || "HEAD";
const sha = git("rev-parse", "--short", "HEAD");
console.log(`✓ ${current} → ${next}: committed ${sha} "Release ${tag}"`);
if (noTag) {
  console.log(`  not tagged (--no-tag). Tag later with: git tag -a ${tag} -m "fleeet agent kit ${tag}" ${sha}`);
  console.log(`  push with: git push origin ${branch} && git push origin ${tag}`);
} else {
  git("tag", "-a", tag, "-m", `fleeet agent kit ${tag}`);
  console.log(`✓ tagged ${tag} (annotated). Nothing pushed. Push with:`);
  console.log(`  git push origin ${branch} && git push origin ${tag}`);
}
