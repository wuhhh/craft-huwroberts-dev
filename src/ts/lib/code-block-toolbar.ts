// Adds a language label and a copy-to-clipboard control to the `<pre><code>`
// blocks emitted by the CKEditor `richTextPost` field.
//
// Runs off highlight.ts's lifecycle: enhanceCodeBlock() is called for each
// block right after highlight.js processes it, so it inherits that module's
// load / view-transition / MutationObserver handling — no second traversal.
//
// Mirrors the copy-clip component's copy→check principle and reuses the same
// icon artwork (src/public/images/icon--{copy,check}.svg), but as an
// always-visible corner control rather than a hover-revealed tip. The icons are
// inlined here (they can't be imported from Vite's publicDir) so this stays a
// self-contained unit; keep them in sync with the source SVGs if they change.

const COPY_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 40 40"><path fill="currentColor" d="M33.75 5.313h-20a.937.937 0 0 0-.937.937v6.563H6.25a.94.94 0 0 0-.937.937v20a.937.937 0 0 0 .937.938h20a.94.94 0 0 0 .938-.938v-6.562h6.562a.94.94 0 0 0 .938-.938v-20a.94.94 0 0 0-.938-.937m-8.437 27.5H7.188V14.686h18.125zm7.5-7.5h-5.626V13.75a.94.94 0 0 0-.937-.937H14.688V7.187h18.124z"/></svg>';

const CHECK_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 40 40"><path fill="currentColor" d="m35.663 11.913-20 20a.94.94 0 0 1-1.325 0l-8.75-8.75a.938.938 0 0 1 1.325-1.325L15 29.924l19.338-19.336a.937.937 0 0 1 1.325 1.325"/></svg>';

// CKEditor emits `<pre><code class="language-{slug}">`. These are the nine
// languages configured on the richTextPost codeBlock toolbar (see the field
// config); labels match the CKEditor dropdown.
const LANG_LABELS: Record<string, string> = {
  bash: "Bash",
  css: "CSS",
  html: "HTML",
  javascript: "JavaScript",
  md: "Markdown",
  plaintext: "Plaintext",
  rust: "Rust",
  twig: "Twig",
  typescript: "Typescript",
};

const COPIED_DURATION = 1500;

/** Read the language slug from a `<code class="language-xxx">` element. */
function getLanguageLabel(codeEl: Element): string | null {
  for (const cls of codeEl.classList) {
    if (cls.startsWith("language-")) {
      return LANG_LABELS[cls.slice("language-".length)] ?? null;
    }
  }
  return null;
}

/** Copy `text` to the clipboard, falling back to execCommand where needed. */
function copyText(text: string): void {
  try {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(fallbackCopy);
      return;
    }
  } catch {
    /* fall through to the legacy path */
  }
  fallbackCopy(text);
}

function fallbackCopy(text: string): void {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  } catch {
    /* best-effort only */
  }
}

/**
 * Wrap a highlighted `<pre><code>` block with a language label + copy control.
 * Idempotent: a block is only enhanced once, guarded by a data attribute.
 */
export function enhanceCodeBlock(codeEl: HTMLElement): void {
  const pre = codeEl.closest("pre");
  if (!pre || pre.dataset.codeToolbar) return;
  pre.dataset.codeToolbar = "true";

  // `pre` has `overflow-x: auto`; a toolbar positioned on it would scroll away
  // with wide code. A non-scrolling wrapper keeps the toolbar pinned instead.
  const wrapper = document.createElement("div");
  wrapper.className = "code-block";
  pre.replaceWith(wrapper);
  wrapper.appendChild(pre);

  const bar = document.createElement("div");
  bar.className = "code-block__bar";

  const label = getLanguageLabel(codeEl);
  if (label) {
    const langEl = document.createElement("span");
    langEl.className = "code-block__lang";
    langEl.textContent = label;
    bar.appendChild(langEl);
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "code-block__copy";
  button.setAttribute("aria-label", "Copy code");
  button.innerHTML =
    `<span class="code-block__icon code-block__icon--copy" aria-hidden="true">${COPY_ICON}</span>` +
    `<span class="code-block__icon code-block__icon--check" aria-hidden="true">${CHECK_ICON}</span>`;

  // Visually-hidden live region so screen readers announce the copy.
  const status = document.createElement("span");
  status.className = "code-block__status";
  status.setAttribute("aria-live", "polite");

  let timer: ReturnType<typeof setTimeout> | undefined;
  button.addEventListener("click", () => {
    const text = (codeEl.textContent ?? "").replace(/\n+$/, "");
    if (!text) return;

    copyText(text);
    button.classList.add("is-copied");
    status.textContent = "Copied";

    clearTimeout(timer);
    timer = setTimeout(() => {
      button.classList.remove("is-copied");
      status.textContent = "";
    }, COPIED_DURATION);
  });

  bar.appendChild(button);
  bar.appendChild(status);
  wrapper.appendChild(bar);
}
