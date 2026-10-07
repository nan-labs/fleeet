# Fleeet Documentation

Documentation site for [fleeet.space](https://fleeet.space), built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build).

## Local development

```bash
npm ci
npm run dev
```

Open http://localhost:4321

## Building

```bash
npm run build
```

The build:

1. Copies source files from the kit (SKILL.md, version data) via `scripts/copy-source-files.mjs`
2. Runs Astro checks
3. Builds the static site to `dist/`

Check the output for:

- `llms.txt`, `llms-full.txt`, `llms-small.txt` (agent-friendly docs)
- `versions.json` (current skill/CLI/MCP versions)
- `skill.md` (raw skill file)
- `*.md` per page (raw markdown)
- `pagefind/` (search index)

## Deployment

The site deploys on Netlify from the `main` branch. Base directory: `docs/`.

### Netlify settings

- **Base directory**: `docs/`
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: 22 (set via `NODE_VERSION` env var)

### Build triggers

Builds run only when these paths change (relative to base directory `docs/`):

- `docs/` (the docs site itself)
- `skills/` (skill source)
- `schema/` (event schema)
- `package.json` (kit version)
- `CHANGELOG.md` (version history)

The ignore rule in `netlify.toml` keeps the build count low, since Netlify credits are shared across projects.

### Batched releases

Netlify's Free plan has a 300-credit monthly limit, and each production deploy costs 15 credits. Docs deploys share the pool with fleeet.space, so we batch doc releases with app releases (or publish by hand) instead of deploying on every push.

## Structure

```
docs/
├── src/
│   ├── content/
│   │   └── docs/          # Markdown content
│   ├── pages/
│   │   └── [slug].md.ts   # Raw markdown endpoint
│   └── styles/
│       └── custom.css     # Minimal custom styling
├── scripts/
│   └── copy-source-files.mjs  # Build-time file copying
├── public/                # Static assets (generated at build)
├── astro.config.mjs       # Astro + Starlight config
├── netlify.toml           # Netlify build settings
└── package.json
```

## License

[MIT](../LICENSE)
