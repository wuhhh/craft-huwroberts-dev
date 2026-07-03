# AGENTS.md

## Stack

Craft CMS (Craft 5) + PHP 8.4, MySQL 8.0, nginx-fpm. Frontend: Vite + Lit + Alpine + Tailwind. Managed by DDEV (project type `craftcms`).

## DDEV — always run commands in the container

`node_modules` is installed inside the container (Linux), so platform-specific binaries (e.g. `@rollup/rollup-linux-arm64-gnu`) only exist there. **Never run `npm`/`composer`/`php craft` on the host.** Prefix everything with `ddev`:

```sh
ddev npm run build          # production build → web/dist/
ddev npm run serve          # Vite dev server (:3000), set VITE_USE_DEV_SERVER=true
ddev composer craft-update  # apply migrations + clear caches
ddev exec php craft ...     # any craft CLI
ddev describe               # status / URLs
```

A `Makefile` wraps the common flows: `make build`, `make dev`, `make install`.

## Frontend build

- `vite.config.ts` — entry `src/ts/app.ts`, output `web/dist/`, base `/dist/`.
- Lit components in `src/ts/components/**/*.ts` are auto-registered via `import.meta.glob("./components/**/*.ts", { eager: true })` in `src/ts/app.ts`. Drop a `.ts` file in — no import wiring needed.
- Tailwind (`tailwind.config.ts`) scans `templates/**/*.twig`. Edit class strings in Twig and rebuild.
- Vite copies `src/public/images/**` and `src/public/fonts/**` into `web/dist/`. SVGs referenced in Twig via `svg('@webroot/dist/images/...')` must exist in `web/dist/images/` — **rebuild after adding/ changing assets under `src/public/`**.

### Dev server vs production bundle

`craft.vite.script()` (in `templates/_includes/scripts.twig`) serves from the Vite dev server when `VITE_USE_DEV_SERVER=true` *and* the server is up on :3000; otherwise it falls back to the compiled manifest in `web/dist/.vite/manifest.json`. If you change frontend source but the dev server isn't running, you must `ddev npm run build` or edits won't appear.

## Editing components

- Lit web components use Shadow DOM. To expose styling hooks to the outside, add `part="name"` and document a `::part(name)` selector. Don't try to reach into shadow DOM with external selectors.
- For slotted custom content (e.g. an SVG icon in a tooltip), use named slots (`<slot name="tip">`) and pass `<span slot="tip">…</span>` from Twig.
- Prefer `currentColor` in SVGs so they inherit `--cc-*` / text colors.

## Twig / templates

- `templates/_includes/` — shared partials (`footer.twig`, `scripts.twig`, `decor/*`).
- Footer content (email, social links, footer words) comes from the `globals` Craft section — edit in the CP, not in Twig.
- `svg('@webroot/dist/images/...')` inlines an SVG; chain `|attr({ class: '...' })` for sizing.

## Craft CLI

```sh
ddev exec php craft up --interactive=0          # apply pending migrations
ddev exec php craft clear-caches/all --interactive=0
ddev exec php craft invalidate-tags/all --interactive=0
```
