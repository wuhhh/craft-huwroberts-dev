# Journal by-year list — hover image preview

**Date:** 2026-07-21
**Branch:** `feat/journal-hover-card`
**Status:** Design approved, ready for implementation plan

## Goal

On the journal index (`templates/journal/_index.twig`), entries after the first
few render as a plain by-year list — a title + date per row, no imagery. Give
those rows a hover affordance: while the cursor is over a title row, that
entry's feature image appears as a floating preview that **trails the cursor on
a spring**. Move off the list and it disappears. Provide sensible static
fallbacks for keyboard focus and reduced-motion, and disable the feature on
touch.

This is a progressive, decorative enhancement. The row's existing `box-link`
`<a>` remains the real navigation; the preview never intercepts input and is
hidden from assistive tech.

## Scope

**In scope**
- Floating feature-image preview for the by-year list rows only (not the hero /
  medium cards at the top of the index).
- Pointer trailing motion, keyboard-focus static reveal, reduced-motion static
  reveal, touch disable, no-image skip, crossfade between adjacent rows.

**Out of scope**
- Any change to the card layout (`journalFeaturedCard.twig`) or entry detail.
- Adding a JS test runner (repo has none today — see Verification).
- The existing `<mouse-follower>` cursor-replacement system; this feature keeps
  the native cursor visible and is independent of it.

## Behavior

| Situation | Behavior |
|---|---|
| Pointer over a row with an image | Preview reveals (fade in) and **trails the cursor on a spring** — lag → ease → settle, no tilt. Native cursor stays visible. |
| Pointer sweeps between adjacent rows | One persistent preview **crossfades** to the new entry's image. No hide/re-show flicker. |
| Pointer over a row whose entry has **no** feature image | Nothing shown. |
| Pointer leaves the list | Preview fades out. |
| Keyboard focus (focus-visible) on a row's link | Preview **fades in, static**, anchored to the **right edge of the focused row**, vertically centered. No tracking. |
| `prefers-reduced-motion: reduce`, pointer | Preview reveals **static** — fades in at the pointer's entry position, does not track subsequent movement. |
| Touch / no-hover device | Feature disabled; list unchanged. |

The preview image is **~360×216**, landscape **456/273** crop, `rounded-lg` —
consistent with the journal cards' framing.

## Architecture

Three pieces, each with one clear responsibility. The list markup stays
structurally intact; the interaction is isolated in one component.

### 1. `<journal-hover-preview>` — Lit component (new)

`src/ts/components/journal-hover-preview.ts`. Mounted **once** as a sibling of
the by-year list. Auto-registered by the `import.meta.glob("./components/**")`
in `src/ts/app.ts` (no wiring needed).

- **Attribute** `for` (String, required) — the `id` of the list element to
  observe. The component resolves it via `document.getElementById` and attaches
  its listeners there (event delegation over the rows). Keeps the component
  decoupled from list internals — it only reads `data-preview-*` off rows.
- **Motion tuning** exposed as attributes with defaults (tunable during
  implementation): `omega` (spring angular frequency, rad/s) and `zeta`
  (damping ratio, default ≈ 1 for a clean, overshoot-free settle).
- **Shadow DOM** holds the floating preview: a `position: fixed`,
  `pointer-events: none`, `aria-hidden="true"` container with **two stacked
  `<img>` layers** (front / back) used to crossfade between entries. The
  container is `translate3d`-positioned each frame; opacity drives reveal/hide.
- Runs a **single `requestAnimationFrame` loop** (modeled on
  `PointerMotionController`: dt-clamped, respects `prefers-reduced-motion`,
  **idles out** when hidden and settled). The loop runs only while the spring is
  actively trailing (pointer mode); static reveals bypass it entirely.

Listeners on the referenced list element:
- `pointerover` — resolve `event.target.closest('[data-journal-preview]')`. If a
  row with preview data: set it active, reveal, and **seed the spring position
  to the current pointer** (so it starts at the cursor and trails from there,
  no fly-in from the origin). Crossfade if a different row was already active.
- `pointermove` — update the spring's target to the pointer position.
- `pointerout` — if the pointer is leaving the list entirely (relatedTarget not
  within the list), hide. Moving between rows does **not** hide (handled by the
  next row's `pointerover`).
- `focusin` / `focusout` — static focus reveal (see below).

### 2. `pointer-spring.ts` — motion lib (new)

`src/ts/lib/pointer-spring.ts`. A small, **dependency-free** 2D spring: a
per-axis critically-damped integrator, semi-implicit Euler with **sub-stepping**
so `ω·h` stays stable at low frame rates. API: `setTarget(x, y)`,
`update(dt)`, `snap(x, y)`, and readable current `x` / `y`.

- **One integrator, one time domain, no timers/flags/regimes.** The spring is
  the *only* thing that produces trailing motion. Static reveals do not run it —
  they position the image directly via `snap()` + a CSS opacity fade. So there
  is never a phase handoff or competing time domain: motion is either the single
  spring (pointer mode) or no motion at all (static/reduced-motion).
- Not reusing `spring.ts` — that lib imports `three/webgpu` for `Vector3` and is
  tied to the 3D scenes. This 2D spring stays light and independently testable.

### 3. `templates/journal/_index.twig` — edits

- **Query:** add `imageCaption.imageAsset` to the entries query's `.with([...])`
  so the by-year list doesn't N+1 the feature asset.
- **List container:** give it `id="journal-year-list"` and drop
  `<journal-hover-preview for="journal-year-list"></journal-hover-preview>`
  beside it (same parent).
- **Each row:** when the entry has a feature image, add to the row `<div>`:
  - `data-journal-preview` (marker — rows without an image omit this entirely,
    so the component skips them)
  - `data-preview-src` = `image.getUrl(previewTransform)`
  - `data-preview-srcset` = `image.getSrcset(['360w','540w','720w'], previewTransform)`
  - `data-preview-sizes` = `"360px"`
  - `data-preview-alt` = `image.alt ?? entry.title`

  where `previewTransform = { format: 'avif', mode: 'crop', width: 360,
  height: 216, quality: 82 }` (1× / 1.5× / 2× widths for DPR). Same field chain
  the cards use: `listEntry.imageCaption.imageAsset.one()`.

The image loads lazily on first hover; the reveal fade masks the fetch. The
back img layer's `load` event gates the crossfade so a not-yet-loaded image
never flashes in.

## Motion detail

- **Pointer mode:** spring target = pointer `clientX/clientY`, plus a small
  constant offset so the image doesn't sit directly under the cursor. Image
  center follows the sprung point. Reveal = container opacity 0→1.
- **Crossfade:** two `<img>` layers. On row change, set the back layer's
  `src`/`srcset`/`alt`; on its `load` (or immediately if cached), fade it to
  front over ~150–200ms and demote the old front to back. Same-row re-entry is
  a no-op.
- **Idle-out:** when hidden and the spring has settled, cancel the rAF loop;
  next `pointerover` restarts it.

## Static reveals (focus + reduced-motion)

Both share one static path — position via `snap()`, no rAF spring, opacity fade
only:

- **Keyboard focus:** on `focusin`, if the focused element matches
  `:focus-visible` and its row carries preview data, anchor the preview to the
  row's `getBoundingClientRect()` — `x = rect.right + gap`,
  `y = rect.top + rect.height/2`, image left-center at that point (sits to the
  right of the row). Fade in. `focusout` fades out (unless a pointer is still
  active over the list). **Clamp** within the viewport; if the right edge would
  overflow on narrow widths, flip to anchor left of the row.
- **Reduced-motion pointer:** `matchMedia('(prefers-reduced-motion: reduce)')`
  short-circuits pointer mode to static — snap to the pointer's entry position
  on `pointerover`, fade in, ignore subsequent `pointermove`.

**Precedence:** an active pointer over the list wins over focus (avoids a
double reveal); focus reveal only applies when no pointer is currently active
within the list.

## Capability gating

- **Touch / no-hover:** if `matchMedia('(hover: hover)')` does **not** match,
  the pointer path is not wired at all. (The focus path is benign on touch — it
  only fires on genuine `:focus-visible` — so keyboard parity on hybrid
  devices is preserved without showing anything on tap.)
- **Reduced-motion:** as above, forces static.

## Accessibility

- Preview container is `aria-hidden="true"` and `pointer-events: none` — never
  announced, never intercepts input. `alt` is still set on the imgs from
  `data-preview-alt` for correctness, though the hidden container means it isn't
  surfaced.
- Focus reveal is purely visual — it never moves or traps focus. The existing
  `group-hover:underline` continues to signal the active row.

## Files changed

- **new** `src/ts/components/journal-hover-preview.ts`
- **new** `src/ts/lib/pointer-spring.ts`
- **edit** `templates/journal/_index.twig` (query `.with`, list `id` +
  component, per-row `data-preview-*`)

## Verification

No JS test runner exists in the repo (no vitest/jest, no test scripts) and
adding one is out of scope. Verify via:

1. `ddev exec npx tsc --noEmit` — typecheck (incl. `ts-lit-plugin`).
2. `ddev exec npx eslint src/ts/components/journal-hover-preview.ts src/ts/lib/pointer-spring.ts`
3. `ddev npm run build` — production bundle.
4. Drive the running journal index (via `/verify`) and confirm:
   - hover reveals the correct entry's image and it trails on a spring;
   - sweeping between rows crossfades without flicker;
   - a row with no image shows nothing;
   - leaving the list hides the preview;
   - keyboard tab (focus-visible) shows the static preview at the row's right
     edge, clamped within the viewport;
   - `prefers-reduced-motion` gives a static fade at the entry point;
   - a touch / no-hover context shows nothing and leaves the list unchanged.
5. Spring settle / no-overshoot confirmed by observation in-app (a throwaway
   node snippet may be used during dev but is not committed).

## Risks / notes

- **First-hover fetch:** brief empty state possible before the image loads;
  mitigated by the reveal fade, small transform size, and gating the crossfade
  on the img `load` event. Acceptable.
- **Narrow viewports (focus anchor):** right-edge anchor could overflow; handled
  by viewport clamping / left-flip.
- **Pointer ↔ focus precedence:** defined above (pointer wins) to avoid a
  double reveal on mixed input.
