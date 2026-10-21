# Rulesets

Import these in **Settings → Rules → Rulesets → New ruleset → Import a ruleset**.

- `main.json`: every change to the default branch goes through a pull request, the `version` (version-check) and `signoff` (dco) checks must pass, and force-pushes and deletion are blocked. There are no bypass actors: the maintainer uses the same PR workflow as everyone. Required approvals are 0 because GitHub doesn't let a sole maintainer approve his own PR. **Once there's a second maintainer, set required approvals to 1 and turn on "Require review from Code Owners".**
- `release-tags.json`: only repository admins (role id 5) can create, move or delete `v*` tags. The release workflow only publishes from a tag that already exists, so a release always starts from a tag the maintainer pushed.
