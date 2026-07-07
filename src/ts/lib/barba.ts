// Barba SPA router driving the grid-transition overlay.
//
// Per internal click: `.is-filling` covers the viewport while the next page is
// fetched concurrently; once both resolve the outgoing `#main` is hidden
// synchronously (both `#main`s are flex children and would squeeze to ~50%
// width, and about-scene bakes host dimensions at setup-time and never
// re-reads them — see about-scene.ts:481), Barba swaps in the new `#main`,
// then `.is-revealing` peels the cover away and focus moves to #main.
//
// Hard-loaded pages with no Barba container (404 / 500 / 503) play the
// reveal and skip Barba init; a click to one fetches ~404 → Barba's default
// requestError bails to a full reload.

import barba from "@barba/core";
import { lenis } from "./lenis";

const OVERLAY_SELECTOR = "[data-grid-transition]";

/* Read a CSS <time> custom property off `el`, returning ms. */
function cssTimeMs(el: Element, prop: string): number {
  const v = getComputedStyle(el).getPropertyValue(prop).trim();
  if (!v) return 0;
  return v.endsWith("ms")
    ? parseFloat(v) || 0
    : v.endsWith("s")
      ? parseFloat(v) * 1000 || 0
      : parseFloat(v) || 0;
}

/* Total ms until the last strip (fill-r) finishes, in each phase. */
const fillTotalMs = (root: HTMLElement) =>
  cssTimeMs(root, "--fill-delay") +
  4 * cssTimeMs(root, "--fill-stagger") +
  cssTimeMs(root, "--fill-duration");
const revealTotalMs = (root: HTMLElement) =>
  cssTimeMs(root, "--reveal-delay") +
  4 * cssTimeMs(root, "--reveal-stagger") +
  cssTimeMs(root, "--reveal-duration");

/* Resolve on the last strip's animationend, with a hard timer fallback so a
   stuck animation never blocks Barba indefinitely. */
function waitForPhase(root: HTMLElement, totalMs: number): Promise<void> {
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    const last = root.querySelector<HTMLElement>(
      ".grid-transition--grid--fill-r",
    );
    if (last) {
      last.addEventListener("animationend", finish, { once: true });
      last.addEventListener("animationcancel", finish, { once: true });
    }
    setTimeout(finish, totalMs + 120);
  });
}

/* Sync <head> meta + canonical from the incoming page. Barba v2 keeps
   document.title in sync itself. */
const META_SYNC: Array<{
  sel: string;
  attr: "name" | "property";
  key: string;
}> = [
  { sel: 'meta[name="keywords"]', attr: "name", key: "keywords" },
  { sel: 'meta[name="description"]', attr: "name", key: "description" },
  { sel: 'meta[name="theme-color"]', attr: "name", key: "theme-color" },
  { sel: 'meta[property="og:title"]', attr: "property", key: "og:title" },
  {
    sel: 'meta[property="og:description"]',
    attr: "property",
    key: "og:description",
  },
  { sel: 'meta[property="og:image"]', attr: "property", key: "og:image" },
  { sel: 'meta[property="og:url"]', attr: "property", key: "og:url" },
  { sel: 'meta[property="og:type"]', attr: "property", key: "og:type" },
];

function syncHead(nextHtml: string): void {
  const doc = new DOMParser().parseFromString(nextHtml, "text/html");
  for (const { sel, attr, key } of META_SYNC) {
    const incoming = doc.querySelector<HTMLMetaElement>(sel);
    const outgoing = document.head.querySelector<HTMLMetaElement>(sel);
    if (incoming) {
      const content = incoming.getAttribute("content") || "";
      if (outgoing) {
        outgoing.setAttribute("content", content);
      } else {
        const m = document.createElement("meta");
        m.setAttribute(attr, key);
        m.setAttribute("content", content);
        document.head.appendChild(m);
      }
    } else if (outgoing) {
      outgoing.remove();
    }
  }
  const incomingCanonical = doc.querySelector('link[rel="canonical"]');
  const outgoingCanonical = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (incomingCanonical) {
    const href = incomingCanonical.getAttribute("href") || "";
    if (outgoingCanonical) {
      outgoingCanonical.href = href;
    } else {
      const link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      link.href = href;
      document.head.appendChild(link);
    }
  } else if (outgoingCanonical) {
    outgoingCanonical.remove();
  }
}

/* Reset scroll, sync <head>, fire pageview + pagereveal, move focus to #main. */
function onEnter(
  next: { html?: string; url?: { path?: string } } | undefined,
): void {
  if (next?.html) syncHead(next.html);
  window.scrollTo(0, 0);
  lenis?.scrollTo(0, { immediate: true });
  // Plausible's auto-pageview script tracks full loads only — SPA nav needs
  // a manual event.
  const plausible = (
    window as unknown as { plausible?: (...a: unknown[]) => void }
  ).plausible;
  plausible?.("pageview", { props: { path: next?.url?.path ?? "" } });
  // Lets ./highlight.ts re-run on swapped <pre><code> etc.
  window.dispatchEvent(new Event("pagereveal"));
  // Move AT focus to the new page's main landmark.
  document.getElementById("main")?.focus({ preventScroll: true });
}

function init(): void {
  const root = document.querySelector<HTMLElement>(OVERLAY_SELECTOR);
  if (!root) return;
  // Cold-load reveal. State stays on so `forwards` keeps strips collapsed; the
  // next Barba `leave` swaps to `.is-filling`, whose `from` (scale 1 0) matches
  // the persisted end state — no flicker.
  root.classList.add("is-revealing");

  const container = document.querySelector<HTMLElement>(
    '[data-barba="container"]',
  );
  if (!container) return; // error pages — Barba never initialises

  barba.init({
    debug: false,
    cacheFirstPage: true,
    preventRunning: true,
    timeout: 10_000,
    transitions: [
      {
        name: "grid-fill-reveal",
        async leave(data) {
          root.classList.remove("is-revealing");
          root.classList.add("is-filling");
          await waitForPhase(root, fillTotalMs(root));
          // Hide the outgoing container after the fill covers the viewport
          // but before Barba `add()`s the new one. Done synchronously so the
          // incoming <scene-canvas>'s first-updated microtask (which fires
          // before Barba's `enter`) sees the correct full-width host.
          if (data.current?.container instanceof HTMLElement) {
            data.current.container.style.display = "none";
          }
        },
        enter(data) {
          root.classList.remove("is-filling");
          root.classList.add("is-revealing");
          onEnter(data.next);
          return waitForPhase(root, revealTotalMs(root));
        },
      },
    ],
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
