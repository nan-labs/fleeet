# Contributing

## Versioning

The kit has **one version**, shared by the fleeet-reporting skill, the Claude
Code plugin and its marketplace entry, the npm package and the `fleeet-emit`
CLI. It lives in these copies, and `npm run check` fails if any of them differ:

| Copy | Field |
|---|---|
| `package.json`, `package-lock.json` | `version` |
| `.claude-plugin/plugin.json` | `version` |
| `.claude-plugin/marketplace.json` | `metadata.version` and the `fleeet-reporting` entry's `version` |
| `skills/fleeet-reporting/SKILL.md` | `metadata.version` in the frontmatter, and the opening line `Fleeet skill vX.Y.Z` |
| `docs/public/skill.md` | byte-identical copy of SKILL.md |
| `docs/public/versions.json` | `skill` and `cli` |
| `bin/fleeet-emit.mjs` | `KIT_VERSION` (sent on every event as `client.skill_version`) |
| `CHANGELOG.md` | newest `## [X.Y.Z]` entry |

The version goes under `metadata:` in the skill frontmatter, not at the top
level: claude.ai skill uploads reject any top-level key other than `name`,
`description`, `license`, `compatibility`, `metadata` and `allowed-tools`.
The check enforces that too. The list itself is in `scripts/versioning.mjs`.

### Which number to bump

- **patch** (1.1.0 → 1.1.1): wording, typos, clearer examples, fixes. Nothing an
  agent or integration does differently.
- **minor** (1.1.0 → 1.2.0): additive. A new optional field, event detail,
  section, CLI flag or MCP argument. Old agents keep working.
- **major** (1.1.0 → 2.0.0): breaking. A removed or renamed field, tool, flag or
  event, a changed meaning, or a new required field.

fleeet never rejects an older skill within the same major. It answers with
`update_available` and the skill tells the user once.

### When a bump is required

Any change under `skills/`, `schema/` or `bin/`, or to
`.claude-plugin/plugin.json` or `.claude-plugin/marketplace.json`, ships to
users (Claude Code only offers an update when the version string changes), so
it needs a bump. Docs-only, README and tooling changes don't.

Three places enforce it with the same script, `scripts/check-version.mjs`:

- **Pre-commit hook.** `npm install` installs it through
  [simple-git-hooks](https://github.com/toplenboren/simple-git-hooks)
  (`prepare` runs `scripts/install-hooks.mjs`). It runs
  `node scripts/check-version.mjs --staged`, which fails if the staged copies
  disagree, or if a shipped file is staged and the staged version isn't higher
  than HEAD's. `git am` and `git rebase` don't run pre-commit, so applying
  patches is never blocked. Skip a single commit with
  `SKIP_SIMPLE_GIT_HOOKS=1 git commit …`, and run `npx simple-git-hooks`
  again after changing the hook config.
- **GitHub Action** `.github/workflows/version-check.yml`, on pushes to main
  and on pull requests. It runs the drift check, then
  `check-version.mjs --range <base> HEAD`, where the base is the PR's target
  tip or the push's `before` commit. A first push, a force-push whose old tip
  is gone, or a root commit falls back to `HEAD~1` or to the drift check only.
- **`npm run check`** runs the drift check and a CLI syntax check.

### Releasing

1. Make the change. Add a line under `## [Unreleased]` in CHANGELOG.md.
2. Stage it (`git add …`). Don't commit it yet: the hook would ask for a bump.
3. Run:

   ```bash
   npm run release -- patch    # or: minor, major
   ```

   The script checks that the copies agree and refuses if a file it edits has
   unstaged changes. It bumps every copy, turns `## [Unreleased]` into
   `## [X.Y.Z] - YYYY-MM-DD` with a fresh empty Unreleased above it (no notes
   means it uses the commit subjects since the last tag, or a TODO line), and
   commits your staged change with the bump as `Release vX.Y.Z`. It then
   creates the annotated tag `vX.Y.Z`.
   `--no-tag` skips the tag and `--dry-run` only lists the files.
4. It **never pushes**. It prints the command, for example
   `git push origin main && git push origin v1.2.0`.
5. After pushing: attach `fleeet-skill.zip` (`make skill`) to the GitHub
   release for the tag, since claude.ai users update from it, and bump
   `latest` on the server so `/api/version` and `update_available` report it.
