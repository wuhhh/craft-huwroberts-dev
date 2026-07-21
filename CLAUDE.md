# CLAUDE.md

**This project's instructions live in [`AGENTS.md`](AGENTS.md). Read it before
running any tooling or making changes.** It is the single source of truth —
this file is only a pointer, so don't add conventions here.

One rule matters before you run anything, because getting it wrong looks like a
broken repo rather than a mistake:

> `node_modules` is installed **inside the DDEV container** (Linux), so
> platform-specific binaries only exist there. Never run `npm` / `composer` /
> `php craft` on the host — prefix everything with `ddev`:
>
> ```sh
> ddev npm run build              # production build → web/dist/
> ddev exec npx tsc --noEmit      # typecheck
> ddev exec npx eslint <paths>    # lint
> ```
>
> On the host these fail with a missing `@rollup/rollup-linux-arm64-gnu`, which
> is a host/container mismatch, not a dependency problem — don't try to fix it
> by installing anything.

See `AGENTS.md` for the stack, build layout, and Lit/Twig conventions.
