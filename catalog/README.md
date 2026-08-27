# Codex Agent Library Catalog

This folder turns the repository into a portable local viewer, while still featuring a curated top 20.

## What is here

- `index.html` is the static catalog UI.
- `styles.css` and `app.js` power the browsing experience.
- `source/top-agents.config.json` is the human-maintained featured-list and enrichment layer.
- `data/top-agents.json` and `data/top-agents.js` are generated outputs for browsers and other agents.
- `../scripts/build-top-agent-catalog.mjs` rebuilds the generated data from the source TOML files.

## Why this structure

The viewer is intentionally split into:

1. Source agent definitions that stay in `categories/`
2. A curation layer where you rank and enrich the featured picks
3. Generated machine-readable data for the full library
4. A lightweight browser UI

That means you can reuse the framework in another project without committing to this exact featured 20 forever.

## Rebuild the catalog

From the repo root:

```bash
node scripts/build-top-agent-catalog.mjs
```

Then open `catalog/index.html` in a browser.

## Reusing this in another repo

Copy these pieces:

- `catalog/`
- `scripts/build-top-agent-catalog.mjs`

Then:

1. Bring over the agent TOML files you want to index.
2. Edit `catalog/source/top-agents.config.json` to define your featured set and tags.
3. Re-run the build script.

## Notes for other agents

If you want another agent to reason over this set inside a project, point it at:

- `catalog/data/top-agents.json` for structured metadata
- `catalog/source/top-agents.config.json` for the curation logic

The generated JSON includes:

- ranking
- featured vs extended-library status
- category
- model and sandbox profile
- focus areas
- quality checks
- return contract
- relationship hints to nearby agents
