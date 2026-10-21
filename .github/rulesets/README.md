# Rulesets

Import these in **Settings → Rules → Rulesets → New ruleset → Import a ruleset**.

- `main.json`: changes to the default branch go through a pull request with a code-owner (@flynnduism) approval, the `version` (version-check) and `signoff` (dco) checks must pass, and force-pushes and deletion are blocked. No bypass, so the maintainer goes through PRs too. Self-approval isn't possible on GitHub; while there's one maintainer, either add yourself as a bypass actor "for pull requests only" or lower the approval count to 0 and keep the code-owner rule for when a second maintainer joins.
- `release-tags.json`: only repository admins (role id 5) can create, move or delete `v*` tags. The release workflow only publishes from a tag that already exists, so a release always starts from a tag the maintainer pushed.
