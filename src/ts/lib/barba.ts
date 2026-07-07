// Barba SPA router driving the grid-transition overlay.
//
// Flow per internal click: leave() adds `.is-filling` to the persistent overlay
// (strips grow down from top origin, covering the viewport while the next page
// is fetched concurrently); once the fetch resolves + the fill animation has
// played, Barba swaps `#main`'s content; enter() removes `.is-filling`, adds
// `.is-revealing` (strips peel up from bottom origin, matching the original
// intro reveal), fires a synthetic `pagereveal` event (consumed by
// `./highlight.ts` to re-highlight new <pre><code>), resets scroll, and syncs
// <head> tags.
//
// First/hard load: `.is-revealing` is added to the overlay immediately so the
// existing intro reveal still plays once on cold load. Pages without a Barba
// container (404 / 500 / 503, which extend base.twig directly) bypass Barba
// entirely; clicking them as soft-nav targets falls back to a full reload via
// the `requestError` hook.

import barba from "@barba/core";
import { lenis } from "./lenis";

const OVERLAY_SELECTOR = "[data-grid-transition]";
const STRIPS_SELECTOR = ".grid-transition-animation-out";

// Total ms the *last* strip needs to finish its animation, read from CSS vars
// so the values stay DRY with the stylesheet in gridTransition.twig.
function cssTimeMs(el: Element, prop: string): number {
  const v = getComputedStyle(el).getPropertyValue(prop).trim();
  if (!v) return 0;
  if (v.endsWith("ms")) return parseFloat(v) || 0;
  if (v.endsWith("s")) return parseFloat(v) * 1000 || 0;
  return parseFloat(v) || 0;
}

function fillTotalMs(root: HTMLElement): number {
  // Last strip is fill-r: --fill-delay + 4*--fill-stagger + --fill-duration
  return (
    cssTimeMs(root, "--fill-delay") +
    4 * cssTimeMs(root, "--fill-stagger") +
    cssTimeMs(root, "--fill-duration")
  );
}

function revealTotalMs(root: HTMLElement): number {
  // Last strip is fill-r: --reveal-delay + 4*--strip-stagger + --reveal-duration
  return (
    cssTimeMs(root, "--reveal-delay") +
    4 * cssTimeMs(root, "--strip-stagger") +
    cssTimeMs(root, "--reveal-duration")
  );
}

function lastStripElement(root: HTMLElement): HTMLElement | null {
  // `.grid-transition--grid--fill-r` carries the longest delay in both phases.
  return root.querySelector<HTMLElement>(".grid-transition--grid--fill-r");
}

// Resolve when the last strip's `animationend` fires or after a computed
// timer fallback (whichever fires first). Mobile strips are display:none
// inside a hidden grid container, so `animationend` never fires there — the
// timer is the actual resolver in that case.
function gridVisible(): boolean {
  // `.grid-transition--grid` is display:none below 40rem (640px); strips never
  // animate there, so we don't make Barba wait for an animation that won't run.
  return window.matchMedia("(width >= 40rem)").matches;
}

function waitForPhase(root: HTMLElement, totalMs: number): Promise<void> {
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const last = lastStripElement(root);
    if (last) {
      last.addEventListener("animationend", finish, { once: true });
      last.addEventListener("animationcancel", finish, { once: true });
    }
    // Buffer covers paint + variance — strictly bounded so a stuck animation
    // never blocks Barba indefinitely.
    setTimeout(finish, totalMs + 120);
  });
}

// Minimal head sync (replaces the missing @barba/head plugin). Updates
// description, canonical, theme-color, and og:* meta from the next page's
// <head>. Barba v2 already keeps document.title in sync itself.
type MetaLike = HTMLMetaElement;
function getOrMakeMeta(selector: string, attr: "name" | "property", value: string): MetaLike {
  let el = document.head.querySelector<MetaLike>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, value);
    document.head.appendChild(el);
  }
  return el;
}

function syncHead(nextHtml: string): void {
  const doc = new DOMParser().parseFromString(nextHtml, "text/html");

  const meta: Array<{ sel: string; attr: "name" | "property"; key: string }> = [
    { sel: 'meta[name="description"]', attr: "name", key: "description" },
    { sel: 'meta[name="theme-color"]', attr: "name", key: "theme-color" },
    { sel: 'meta[property="og:title"]', attr: "property", key: "og:title" },
    { sel: 'meta[property="og:description"]', attr: "property", key: "og:description" },
    { sel: 'meta[property="og:image"]', attr: "property", key: "og:image" },
    { sel: 'meta[property="og:url"]', attr: "property", key: "og:url" },
    { sel: 'meta[property="og:type"]', attr: "property", key: "og:type" },
  ];

  for (const { sel, attr, key } of meta) {
    const incoming = doc.querySelector<MetaLike>(sel);
    const outgoing = document.head.querySelector<MetaLike>(sel);
    if (incoming) {
      const content = incoming.getAttribute("content") || "";
      if (outgoing) outgoing.setAttribute("content", content);
      else getOrMakeMeta(sel, attr, key).setAttribute("content", content);
    } else if (outgoing) {
      outgoing.remove();
    }
  }

  // Canonical <link rel="canonical">
  const incomingCanonical = doc.querySelector('link[rel="canonical"]');
  let outgoingCanonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (incomingCanonical) {
    const href = incomingCanonical.getAttribute("href") || "";
    if (!outgoingCanonical) {
      outgoingCanonical = document.createElement("link");
      outgoingCanonical.setAttribute("rel", "canonical");
      document.head.appendChild(outgoingCanonical);
    }
    outgoingCanonical.href = href;
  } else if (outgoingCanonical) {
    outgoingCanonical.remove();
  }
}

function resetScroll(): void {
  window.scrollTo(0, 0);
  lenis?.scrollTo(0, { immediate: true });
}

function trackPageview(url: string): void {
  const plausible = (window as unknown as { plausible?: (...a: unknown[]) => void }).plausible;
  plausible?.("pageview", { props: { path: url } });
}

function initBarba(root: HTMLElement): void {
  const container = document.querySelector<HTMLElement>('[data-barba="container"]');
  if (!container) {
    // Hard-loaded page (404/500/503) has no container — play reveal and exit.
    root.classList.add("is-revealing");
    return;
  }

  barba.init({
    debug: false,
    cacheFirstPage: true,
    prefetchIgnore: false,
    preventRunning: true,
    timeout: 10_000,
    transitions: [
      {
        name: "grid-fill-reveal",
        leave(data) {
          // Strip any lingering reveal state from a previous navigation, then
          // start the cover-from-top fill.
          root.classList.remove("is-revealing");
          root.classList.add("is-filling");
          if (!gridVisible()) return Promise.resolve();
          return waitForPhase(root, fillTotalMs(root));
        },
        beforeEnter(data) {
          // Barba inserts the next `#main` as a sibling of the old one and
          // only removes the old one AFTER `enter` resolves. Both elements
          // hold `grow`, so the `.container.flex` parent squishes them
          // side-by-side — visible behind the peeling reveal strips. Hide
          // the outgoing container synchronously (before the next paint) so
          // only the incoming `#main` participates in the flex layout.
          const old = data.current?.container;
          if (old instanceof HTMLElement) {
            old.style.display = "none";
          }
        },
        enter(data) {
          // DOM is already swapped by Barba; now peel the cover away.
          root.classList.remove("is-filling");
          root.classList.add("is-revealing");

          // Sync <head> + analytics + scroll BEFORE the reveal animates so the
          // incoming page is already at-top and titled when strips peel.
          if (data.next?.html) syncHead(data.next.html);
          resetScroll();
          trackPageview(data.next?.url?.path ?? "");

          // Notify any listeners (e.g. highlight.ts re-runs on swap).
          window.dispatchEvent(new Event("pagereveal"));

          if (!gridVisible()) return Promise.resolve();
          return waitForPhase(root, revealTotalMs(root));
        },
        afterEnter() {
          // Intentionally no-op: `.is-revealing` is left on so the
          // `animation-fill-mode: forwards` end state (`scale: 1 0`) keeps
          // strips invisible until the next `leave` swaps to `.is-filling`.
          // Removing it would snap the strips back to their natural (full-size
          // cover) state.
        },
      },
    ],
  });
}

function init(): void {
  const root = document.querySelector<HTMLElement>(OVERLAY_SELECTOR);
  if (!root) return;

  // First/hard-load reveal — preserved exactly as the original intro. The
  // `.is-revealing` state is left on permanently so `forwards` keeps the
  // strips collapsed after the reveal finishes; a subsequent Barba `leave`
  // swaps to `.is-filling` clean-slate (CSS starts `grid-transition-fill`
  // from `scale 1 0`, which matches the persisted end state — no flicker).
  root.classList.add("is-revealing");

  initBarba(root);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}