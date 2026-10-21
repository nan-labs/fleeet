# Security policy

## Reporting a vulnerability

Please don't open a public issue for security problems.

Report them privately through GitHub: go to the repo's **Security** tab and click **Report a vulnerability**, or open [a new advisory](https://github.com/nan-labs/fleeet/security/advisories/new). Include what you found, how to reproduce it, and what an attacker could do with it.

You'll get an acknowledgement within a few working days. We'll keep you updated while we fix it and credit you in the advisory unless you'd rather not be named.

## Scope

- This repo: the fleeet-reporting skill, the event schema, the `fleeet-emit` CLI, MCP setup and the docs site.
- The hosted service at fleeet.space, including its MCP server and API. Report those here too.

Leaked tokens count. If you find a Fleeet token in public, report it and we'll revoke it.

## Supported versions

Fixes go into the latest release. Older versions in the same major keep working with the server but don't get patches, so update to the latest [release](https://github.com/nan-labs/fleeet/releases/latest).
