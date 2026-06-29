/**
 * Stable viewport height — guards against the iOS Safari chrome-collapse
 * rescale bump.
 *
 * On iOS, `vh`/`lvh` resolve to the large (toolbars-hidden) viewport at rest,
 * but can transiently re-resolve *during* the toolbar collapse animation.
 * Anything sized by those units then rescales for the ~200ms of the animation.
 * In this app that's two independent rescale drivers:
 *   1. the scene-canvas buffer (clientHeight → renderer.setSize), and
 *   2. each scene host (getBoundingClientRect → camera.setViewOffset frustum,
 *      plus getViewport/alignMeshWithDOM mesh scaling).
 * Both dip together → the "scaling bump" on scroll.
 *
 * Swapping `vh`→`lvh` in CSS doesn't help because the unit still re-resolves
 * live every layout. Instead: read the large-viewport height ONCE at rest,
 * cache it as the `--stable-vh` custom property (in px), and refresh only on a
 * debounced resize/orientationchange so we never read mid-collapse. The cached
 * value doesn't re-resolve, so sizing stays put and the collapse becomes a
 * pure reveal.
 *
 * Consumers use `height: var(--stable-vh, <unit-fallback>)` so layout is
 * correct even before this module runs (progressive enhancement).
 */

// Past the iOS toolbar-collapse animation (~200–300ms) so a debounced re-read
// lands at rest, not mid-animation where `lvh` can transiently dip.
const REFRESH_DEBOUNCE_MS = 250;

let probe: HTMLDivElement | null = null;
let resizeTimer: number | undefined;

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

function scheduleCommit(): void {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(commit, REFRESH_DEBOUNCE_MS);
}

// Read at module load — at rest (no collapse in progress) → correct large value,
// available before first paint so there's no flash.
commit();
window.addEventListener("resize", scheduleCommit);
window.addEventListener("orientationchange", scheduleCommit);
