# Event format versioning and change policy

The event format is defined in [`schema/event-schema.json`](../schema/event-schema.json). It ships with the kit and shares the kit's single semver version (see [CONTRIBUTING.md](../CONTRIBUTING.md#versioning)).

## What each bump means for the format

- **Patch:** descriptions, examples and docs only. Valid events stay valid, and the server reads them the same way.
- **Minor:** additive. A new optional field, a new value of an existing enum that older senders never need to use, or a looser limit. Every event that was valid stays valid.
- **Major:** breaking. A field removed, renamed or made required, a changed meaning, a tighter limit, or an enum value removed.

## Promises

1. The server accepts every event that's valid under any version with the same major number.
2. Unknown fields are ignored, not rejected, so newer senders work with an older server.
3. A major change is announced in the CHANGELOG and on GitHub Releases at least 4 weeks before the server stops accepting the old major. During that window both are accepted, and older clients get `update_available`.
4. Deprecated fields and forms are marked as deprecated in the schema and docs, with a sunset date, before they're removed.

## Proposing a change

Open an issue with the proposal template. Say which fields change, which bump it needs, and how existing agents are affected. Format changes need a maintainer's agreement on the issue before a PR.
