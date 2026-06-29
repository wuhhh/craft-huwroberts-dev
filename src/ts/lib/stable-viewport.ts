/**
 * Caches the viewport height as a px custom property on :root so elements
 * sized by it don't transiently rescale during the iOS Safari chrome-collapse
 * animation.
 *
 * `vh` resolves to the large viewport at rest but re-resolves mid-collapse,
 * resizing anything sized in the unit for ~200ms. CSS units re-resolve on every
 * layout, so only a cached value read at rest — and never overwritten during a
 * collapse — avoids the rescale.
 *
 * `--stable-vh` is set once on load and refreshed only on `orientationchange`
 * (a discrete event, never fired mid-collapse). No `resize` listener: iOS fires
 * resize mid-collapse, and re-reading then would overwrite the stable value
 * with a transient one. Desktop window resizes won't update the var until
 * reload; if that's a problem, gate a resize refresh on layout-width change
 * (chrome collapse changes visual-viewport height, not layout width).
 *
 * Consumers: `height: var(--stable-vh, 100vh)`.
 */

let probe: HTMLDivElement | null = null;

/** Reads the large-viewport height in px via a hidden `height: 100vh` probe. */
function readViewportHeight(): number {
  if (!probe) {
    probe = document.createElement("div");
    probe.style.cssText =
      "position:absolute;left:-9999px;top:0;width:0;height:100vh;" +
      "pointer-events:none;visibility:hidden;";
    document.documentElement.appendChild(probe);
  }
  return probe.getBoundingClientRect().height;
}

function commit(): void {
  const h = readViewportHeight();
  if (h > 0) {
    document.documentElement.style.setProperty("--stable-vh", `${h}px`);
  }
}

// Read at rest on load, before first paint (no flash). Defer to `load` if
// layout isn't ready yet.
commit();
if (document.readyState === "loading") {
  window.addEventListener("load", commit, { once: true });
}

// Refresh only on rotation — never during a chrome collapse.
window.addEventListener("orientationchange", commit);
