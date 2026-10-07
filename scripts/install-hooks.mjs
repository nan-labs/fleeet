#!/usr/bin/env node
// install-hooks.mjs — `npm install` runs this (prepare). It installs the
// pre-commit hook (package.json "simple-git-hooks") when this is a git
// checkout with devDependencies installed; otherwise it does nothing, so
// `npm install -g`, tarballs and CI installs without git still work.
// Skip with SKIP_INSTALL_SIMPLE_GIT_HOOKS=1.

import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

if (process.env.SKIP_INSTALL_SIMPLE_GIT_HOOKS || process.env.CI) process.exit(0);
let inGit = false;
try { inGit = execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() === "true"; } catch {}
if (!inGit || !existsSync("package.json")) process.exit(0);
let cli;
try { cli = createRequire(import.meta.url).resolve("simple-git-hooks/cli.js"); } catch { process.exit(0); }
try {
  execFileSync(process.execPath, [cli], { stdio: "inherit" });
} catch {
  console.warn("simple-git-hooks: couldn't install the pre-commit hook (run: npx simple-git-hooks)");
}
