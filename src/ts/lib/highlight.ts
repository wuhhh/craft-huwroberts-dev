// Highlight <pre><code> blocks emitted by the CKEditor `richTextPost` field.
//
// Mirrors the React app's RichTextPost.tsx setup: highlight.js core with only
// the languages configured on the codeBlock toolbar option (see the
// richTextPost field config), plus the rose-pine-dawn theme. Code blocks are
// server-rendered by Craft, so this runs on load and after view-transition
// navigations, with a MutationObserver to catch any dynamically swapped content.

import hljs from "highlight.js/lib/core";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import javascript from "highlight.js/lib/languages/javascript";
import rust from "highlight.js/lib/languages/rust";
import twig from "highlight.js/lib/languages/twig";
import typescript from "highlight.js/lib/languages/typescript";

import "highlight.js/styles/rose-pine-dawn.css";

// Register languages once (guards protect against HMR / re-imports)
if (!hljs.getLanguage("css")) hljs.registerLanguage("css", css);
if (!hljs.getLanguage("html")) hljs.registerLanguage("html", xml);
if (!hljs.getLanguage("javascript")) hljs.registerLanguage("javascript", javascript);
if (!hljs.getLanguage("rust")) hljs.registerLanguage("rust", rust);
if (!hljs.getLanguage("twig")) hljs.registerLanguage("twig", twig);
if (!hljs.getLanguage("typescript")) hljs.registerLanguage("typescript", typescript);

const SELECTOR = "pre code:not(.hljs)";

/** Highlight every un-highlighted `<pre><code>` block within `scope`. */
export function highlightAll(scope: ParentNode = document): void {
  scope.querySelectorAll<HTMLElement>(SELECTOR).forEach((block) => {
    if (!block.classList.contains("hljs")) {
      hljs.highlightElement(block);
    }
  });
}

function init(): void {
  highlightAll();

  // Server-rendered content is swapped on view-transition navigations
  window.addEventListener("pagereveal", () => highlightAll());

  // Catch dynamically inserted content (Alpine swaps, etc.)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;

        if (node.tagName === "CODE" && node.closest("pre") && !node.classList.contains("hljs")) {
          hljs.highlightElement(node);
        }

        highlightAll(node);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
