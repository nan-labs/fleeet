# Releasing

This covers the release process for the fleeet agent kit: the skill, schema, CLI, and plugin.

## When to release

- **Batched by default**: Once a few merged changes accumulate under `## [Unreleased]` in CHANGELOG.md
- **Right away for security fixes**: Critical fixes ship immediately as a patch

## Who does what

1. **Agent prepares the release**: Run `npm run release -- <patch|minor|major>` to bump versions, date the CHANGELOG, and commit. The script creates an annotated tag `vX.Y.Z` but never pushes.
2. **Agent opens a PR**: Push the release commit and tag to a branch, open a PR with the release notes.
3. **Only Ronan pushes the tag**: After review, Ronan merges the PR and pushes the `vX.Y.Z` tag to trigger the release.

## What the tag triggers

- **GitHub Release**: The `release` workflow runs on tag push, creates a GitHub Release with CHANGELOG notes, SHA256SUMS, and build provenance attestation
- **fleeet.space version API**: The `/api/version` endpoint picks up the new release within ~15 minutes (no deploy needed)
- **Docs site**: Deploys automatically from Netlify (`docs/netlify.toml`), goes out in the same batch (no manual `--build` needed)

## Release checklist

Before pushing the tag, ensure the release PR includes:

- [ ] `## [Unreleased]` in CHANGELOG.md is dated and moved to `## [X.Y.Z] - YYYY-MM-DD`
- [ ] ROADMAP.md updated if any roadmap items are complete
- [ ] Milestone closed or updated on GitHub if items from it are shipping
- [ ] Roadmap issues closed if they're done (with "Closes #123" in commit messages or PR body)
- [ ] Release notes mention "roadmap items closed" when applicable
- [ ] Flo (the Fleeet PM) is notified

## Rollback

If a release needs to be rolled back:

1. Delete or yank the GitHub Release so `/api/version` falls back to the previous version
2. Fix forward with a patch release — never force-push or rewrite tags

## Current status

**v1.5.0 and v1.5.1 were never tagged** (both are in CHANGELOG but no git tag exists). The next step is either:
- Tag v1.5.1 on commit `abf5436`, or
- Cut v1.5.2 from the current `main` branch

Ronan will decide which path to take.
