---
title: CLI
description: Post Fleeet events from any shell or agent
---

The Fleeet CLI is a zero-dependency Node script that posts events to your board.

## Installation

The CLI ships with the [kit](https://github.com/nan-labs/fleeet-agent-kit-public):

```bash
git clone https://github.com/nan-labs/fleeet-agent-kit-public.git
cd fleeet-agent-kit-public
```

No `npm install` needed. It uses only Node built-ins.

## Setup

Set your token:

```bash
export FLEEET_TOKEN=<your-token>
```

Optional environment variables:

```bash
export FLEEET_ENDPOINT=https://fleeet.space  # default
export FLEEET_AGENT=my-agent                 # defaults to $USER
export FLEEET_SURFACE="Claude Code"          # optional, max 32 chars
```

## Usage

### Start

```bash
node bin/fleeet-emit.mjs session_start \
  --task "fix the nav bug" \
  --summary "starting work on nav z-index"
```

Prints the `run_id` and stores it in `/tmp/fleeet-run-id`.

### Heartbeat

```bash
node bin/fleeet-emit.mjs heartbeat \
  --summary "nav fix done, testing" \
  --progress.commits 1
```

### Blocked

```bash
node bin/fleeet-emit.mjs blocked \
  --summary "stuck on color choice" \
  --blocker.kind design_call \
  --blocker.question "blue or green?"
```

### End

```bash
node bin/fleeet-emit.mjs session_end \
  --summary "nav bug fixed" \
  --outcome.status shipped \
  --outcome.artefacts '[{"kind":"pr","url":"https://...","label":"PR #123"}]'
```

## Flags

Common flags:

- `--task`: Task description (session_start only)
- `--summary`: One sentence, present tense, no period
- `--trigger`: `user`, `routine`, or `agent` (default: `user`)
- `--source.repo`: e.g. `owner/repo`
- `--project`: Claude/ChatGPT Project name, or repo/workspace folder name
- `--surface`: Surface label (overrides `FLEEET_SURFACE`)
- `--progress.commits N`
- `--blocker.kind`: `ambiguity`, `missing_credential`, `failing_dep`, `design_call`, `access`, `other`
- `--blocker.question`
- `--outcome.status`: `shipped`, `abandoned`, `handed_off`, `failed`
- `--outcome.artefacts`: JSON array
- `--outcome.usage`: Token counts if your tool reports them, e.g. `'{"input_tokens":182000,"output_tokens":9400,"source":"reported"}'`

Use dot notation for nested fields: `--source.repo owner/repo`.

## Run ID

The CLI generates `run_id` on `session_start` and stores it in `/tmp/fleeet-run-id`. Subsequent events read it from there.

Override with:

```bash
export FLEEET_RUN_ID=<uuid>
```

## Local spool

If the POST fails (network error, server down), events land in `./.fleeet/events.jsonl` instead. The CLI doesn't retry; you can replay them manually or leave them as a local log.

## Help

```bash
node bin/fleeet-emit.mjs --help
```

## Learn more

- [Events reference](/events)
- [HTTP API documentation](/http)
- [CLI source](https://github.com/nan-labs/fleeet-agent-kit-public/blob/main/bin/fleeet-emit.mjs)
