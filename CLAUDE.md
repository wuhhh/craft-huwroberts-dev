# CLAUDE.md

**This project's instructions live in [`AGENTS.md`](AGENTS.md). Read it before
running any tooling or making changes.** It is the single source of truth —
this file is only a pointer, so don't add conventions here.

One rule matters before you run anything, because getting it wrong looks like a
broken repo rather than a mistake:

> `node_modules` is installed **inside the DDEV container** (Linux), so anything
> with a native binary only works there. That is the **build** specifically:
>
> ```sh
> ddev npm run build              # production build → web/dist/
> ```
>
> On the host it fails with a missing `@rollup/rollup-linux-arm64-gnu`, which is
> a host/container mismatch, not a dependency problem — don't try to fix it by
> installing anything.
>
> The checks are pure JS or PHP and run on the host, which is what the git hooks
> rely on — don't prefix these with `ddev`:
>
> ```sh
> npm run check                   # format + lint + twig-cs-fixer + typecheck
> ```

See `AGENTS.md` for the stack, build layout, and Lit/Twig conventions.
