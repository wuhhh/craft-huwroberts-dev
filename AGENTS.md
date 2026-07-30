# AGENTS.md

## Before you call a change done

```sh
npm run check    # format:check + eslint + twig-cs-fixer + tsc, ~4s on the host
```

Everything in it also runs in CI, so a failure here is a failure there. Individually: `npm run format` (write), `format:check`, `lint`, `lint:twig`, `typecheck`.

Three layers enforce this, and they are deliberately redundant:

| Layer                                                    | Covers                          | Bypassable                |
| -------------------------------------------------------- | ------------------------------- | ------------------------- |
| Claude Code `PostToolUse` hook (`.claude/settings.json`) | Prettier, on every file written | n/a — the harness runs it |
| Pre-commit (`.husky/pre-commit` → lint-staged)           | Staged files + full typecheck   | yes, `--no-verify`        |
| GitHub Actions (`.github/workflows/ci.yml`)              | Everything, plus the build      | no                        |

Do not add a formatter to two layers with different opinions — see the Twig linting section for why Prettier and twig-cs-fixer are kept to disjoint jobs.

## Stack

Craft CMS (Craft 5) + PHP 8.4, MySQL 8.0, nginx-fpm. Frontend: Vite + Lit + Tailwind. Managed by DDEV (project type `craftcms`).

## DDEV — what runs where

`node_modules` is installed inside the container (Linux), so anything with a **native binary** only works there. In practice that means the Vite build: only `@rollup/rollup-linux-arm64-gnu` is installed, so `vite build` on the host fails with a missing-binary error. That is a host/container mismatch, not a broken dependency — don't try to fix it by installing anything.

Run in the container:

```sh
ddev npm run build          # production build → web/dist/
ddev npm run serve          # Vite dev server (:3000), set VITE_USE_DEV_SERVER=true
ddev composer craft-update  # apply migrations + clear caches
ddev exec php craft ...     # any craft CLI (needs the DB)
ddev describe               # status / URLs
```

**The formatters and linters are pure JS or PHP and run fine on the host** — `prettier`, `eslint`, `tsc` and `vendor/bin/twig-cs-fixer` all work without `ddev`, which is why the git hooks call them directly. Prefixing those with `ddev` only makes them slower and makes them fail whenever the project is stopped.

A `Makefile` wraps the common flows: `make build`, `make dev`, `make install`.

## Frontend build

- `vite.config.ts` — entry `src/ts/app.ts`, output `web/dist/`, base `/dist/`.
- Lit components in `src/ts/components/**/*.ts` are auto-registered via `import.meta.glob("./components/**/*.ts", { eager: true })` in `src/ts/app.ts`. Drop a `.ts` file in — no import wiring needed.
- Tailwind (`tailwind.config.ts`) scans `templates/**/*.twig`. Edit class strings in Twig and rebuild.
- Vite copies `src/public/images/**` and `src/public/fonts/**` into `web/dist/`. SVGs referenced in Twig via `svg('@webroot/dist/images/...')` must exist in `web/dist/images/` — **rebuild after adding/ changing assets under `src/public/`**.

### Dev server vs production bundle

`craft.vite.script()` (in `templates/_includes/scripts.twig`) serves from the Vite dev server when `VITE_USE_DEV_SERVER=true` _and_ the server is up on :3000; otherwise it falls back to the compiled manifest in `web/dist/.vite/manifest.json`. If you change frontend source but the dev server isn't running, you must `ddev npm run build` or edits won't appear.

## Editing components

- Lit web components use Shadow DOM. To expose styling hooks to the outside, add `part="name"` and document a `::part(name)` selector. Don't try to reach into shadow DOM with external selectors.
- For slotted custom content (e.g. an SVG icon in a tooltip), use named slots (`<slot name="tip">`) and pass `<span slot="tip">…</span>` from Twig.
- Prefer `currentColor` in SVGs so they inherit `--cc-*` / text colors.

## Twig / templates

- `templates/_includes/` — shared partials (`footer.twig`, `scripts.twig`, `decor/*`).
- Footer content (email, social links, footer words) comes from the `globals` Craft section — edit in the CP, not in Twig.
- `svg('@webroot/dist/images/...')` inlines an SVG; chain `|attr({ class: '...' })` for sizing.

### Twig linting

```sh
npm run lint:twig    # must be clean; runs on the host, no ddev needed
```

Two tools with deliberately disjoint jobs — don't let them overlap:

- **Prettier** (`.prettierrc.json`, via `@zackad/prettier-plugin-twig`) owns _all_ formatting: whitespace, indentation, quotes, hash spacing, trailing commas.
- **twig-cs-fixer** (`.twig-cs-fixer.dist.php`) owns naming and correctness only. Its ruleset is an explicit allowlist, not a bundled standard — every standard leads with spacing rules that contradict Prettier, so adopting one makes the two fight on every save. Variables, macro args, named args, filenames and directories are camelCase with an optional `_` prefix.

Never register twig-cs-fixer as a formatter — don't run it with `--fix`, don't put it in `lint-staged` as a writer, and don't wire it into an editor's format-on-save. That is the collision the split exists to avoid. Two further constraints are documented in the config file itself: `allowNonFixableRules()` is required or every rule is silently dropped, and no rule may implement `NodeRuleInterface` or Twig's parser starts running and chokes on Craft's tags (`{% cache %}`, `{% nav %}`, `{% js %}`…).

## Craft CLI

```sh
ddev exec php craft up --interactive=0          # apply pending migrations
ddev exec php craft clear-caches/all --interactive=0
ddev exec php craft invalidate-tags/all --interactive=0
```
