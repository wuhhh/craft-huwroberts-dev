/**
 * Stable viewport height — guards against the iOS Safari chrome-collapse
 * rescale bump.
 *
 * On iOS, `vh`/`lvh` resolve to the large (toolbars-hidden) viewport *at rest*,
 * but can transiently re-resolve *during* the toolbar collapse animation.
 * Anything sized by those units then rescales for the ~200ms of the animation.
 * In this app that's two independent rescale drivers:
 *   1. the scene-canvas buffer (clientHeight → renderer.setSize), and
 *   2. each scene host (getBoundingClientRect → camera.setViewOffset frustum,
 *      plus getViewport/alignMeshWithDOM mesh scaling).
 * Both dip together → the "scaling bump" on scroll.
 *
 * Swapping `vh`→`lvh` in CSS doesn't help (the unit still re-resolves live
 * every layout), and debouncing a re-read doesn't either — it just captures the
 * transient value a few hundred ms later, producing a *delayed* jump. The only
 * safe read is one at a known-rest moment, never overwritten by a collapse.
 *
 * So: read the large-viewport height ONCE at module load (page at rest, toolbars
 * visible, `lvh` = large viewport), cache it as `--stable-vh` (px), and refresh
 * ONLY on `orientationchange` — a discrete event never fired mid-collapse. The
 * cached value doesn't re-resolve, so sizing stays put and the collapse becomes
 * a pure reveal.
 *
 * Tradeoff: desktop window resizes won't refresh `--stable-vh` (canvas keeps
 * the old height until reload). Add a width-change-guarded resize handler if
 * that becomes a problem — chrome collapse changes visual-viewport height, not
 * layout width, so filtering on width change would catch desktop resizes and
 * orientation changes without ever firing on a collapse.
 *
 * Consumers use `height: var(--stable-vh, <unit-fallback>)` so layout is correct
 * even before this module runs (progressive enhancement).
 */

let probe: HTMLDivElement | null = null;

/**
 * Reads the large-viewport height in px via a hidden `height: 100lvh` probe
 * (falling back to `100vh` where `lvh` is unsupported). `lvh` is, by spec, the
 * toolbars-hidden viewport — correct at rest regardless of current toolbar
 * state — so this returns the value we actually want.
 */
function readLargeViewportHeight(): number {
  if (!probe) {
    probe = document.createElement("div");
    // `100vh` first as a fallback for browsers without `lvh`; the second
    // declaration overrides it where supported.
    probe.style.cssText =
      "position:absolute;left:-9999px;top:0;width:0;" +
      "height:100vh;height:100lvh;" +
      "pointer-events:none;visibility:hidden;";
    document.documentElement.appendChild(probe);
  }
  return probe.getBoundingClientRect().height;
}

function commit(): void {
  const h = readLargeViewportHeight();
  if (h > 0) {
    document.documentElement.style.setProperty("--stable-vh", `${h}px`);
  }
}

// Read once at module load — at rest (no collapse in progress) → correct large
// value, available before first paint so there's no flash. If layout isn't
// ready yet (h === 0), defer to the `load` event and read once there.
commit();
if (document.readyState === "loading") {
  window.addEventListener("load", commit, { once: true });
}

// Refresh ONLY on orientationchange: a discrete event fired on device rotation,
// never during a chrome-collapse animation. (No `resize` listener — iOS fires
// resize mid-collapse, and re-reading then would overwrite the stable value
// with a transient one, causing a delayed rescale.)
window.addEventListener("orientationchange", commit);
