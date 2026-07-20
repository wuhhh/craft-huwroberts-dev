// Highlight <pre><code> blocks emitted by the CKEditor `richTextPost` field.
//
// Mirrors the React app's RichTextPost.tsx setup: highlight.js core with only
// the languages configured on the codeBlock toolbar option (see the
// richTextPost field config), plus the rose-pine-dawn theme. Code blocks are
// server-rendered by Craft, so this runs on load and after view-transition
// navigations, with a MutationObserver to catch any dynamically swapped content.

import hljs from "highlight.js/lib/core";
import type { HLJSApi, Mode } from "highlight.js";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import javascript from "highlight.js/lib/languages/javascript";
import markdown from "highlight.js/lib/languages/markdown";
import plaintext from "highlight.js/lib/languages/plaintext";
import rust from "highlight.js/lib/languages/rust";
import twig from "highlight.js/lib/languages/twig";
import typescript from "highlight.js/lib/languages/typescript";
import yaml from "highlight.js/lib/languages/yaml";

import "highlight.js/styles/rose-pine-dawn.css";

import { enhanceCodeBlock } from "./code-block-toolbar";

// The stock markdown grammar has no notion of YAML frontmatter, so it parses a
// leading `---\n…\n---` block as markdown and mangles it. This wraps markdown
// with a frontmatter region highlighted as YAML. The `on:begin` guard restricts
// it to the very top of the block (index 0) so a `---` thematic break in the
// body isn't mistaken for frontmatter.
function markdownWithFrontmatter(hljs: HLJSApi): Mode {
  const md = markdown(hljs) as Mode;
  const frontmatter: Mode = {
    begin: /^---$/,
    end: /^---$/,
    subLanguage: "yaml",
    relevance: 0,
    "on:begin": (match, resp) => {
      if (match.index !== 0) resp.ignoreMatch();
    },
  };
  md.contains = [frontmatter, ...(md.contains ?? [])];
  return md;
}

// Register languages once (guards protect against HMR / re-imports).
// Names match the CKEditor `language-*` slugs from the richTextPost field
// config, so `md` maps to the markdown module (cf. `html` → the xml module).
if (!hljs.getLanguage("bash")) hljs.registerLanguage("bash", bash);
if (!hljs.getLanguage("css")) hljs.registerLanguage("css", css);
if (!hljs.getLanguage("html")) hljs.registerLanguage("html", xml);
if (!hljs.getLanguage("javascript")) hljs.registerLanguage("javascript", javascript);
if (!hljs.getLanguage("yaml")) hljs.registerLanguage("yaml", yaml);
if (!hljs.getLanguage("md")) hljs.registerLanguage("md", markdownWithFrontmatter);
if (!hljs.getLanguage("plaintext")) hljs.registerLanguage("plaintext", plaintext);
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
    enhanceCodeBlock(block);
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
          enhanceCodeBlock(node);
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
