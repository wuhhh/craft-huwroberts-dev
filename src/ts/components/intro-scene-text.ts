import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators.js";

// Scroll-linked fade/blur — the labels fade + blur out as you scroll away,
// mapped directly to scroll position (not a triggered transition).
const FADE_VH = 0.15; // fraction of a viewport scrolled to fully fade (smaller = faster)
const MAX_BLUR = 8; // px blur at full fade

@customElement("intro-scene-text")
export class IntroSceneText extends LitElement {
  /**
   * Milliseconds before the first line begins to unclip. Set high enough to
   * clear the initial page reveal (the grid cover peels over ~1400ms at
   * ≥1280px). Configurable per-instance via the `reveal-delay` attribute.
   */
  @property({ type: Number, attribute: "reveal-delay" })
  revealDelay = 1250;

  #revealTimer?: number;
  #labels?: HTMLElement | null;

  // Scroll-linked fade + blur: map scroll position → 0..1 and drive opacity and
  // blur directly (no CSS transition, so it tracks the scroll frame-for-frame).
  #onScroll = () => {
    const el = this.#labels;
    if (!el) return;
    const dist = window.innerHeight * FADE_VH || 1;
    const p = Math.min(Math.max(window.scrollY / dist, 0), 1);
    el.style.opacity = `${1 - p}`;
    el.style.filter = p > 0 ? `blur(${p * MAX_BLUR}px)` : "";
  };

  static styles?: CSSResultGroup | undefined = css`
    :host {
      /* Per-line clip-reveal timing (stagger/duration are easy to tweak here;
         the start delay is the JS \`reveal-delay\` so it doesn't affect reverse). */
      --line-duration: 650ms;
      --line-stagger: 325ms;
      --line-ease: ease-out;

      position: absolute;
      inset: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: var(--font-mono);
      text-transform: uppercase;
      color: black;
      container-type: size;
    }

    .labels {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: space-between;
      width: 75%;
      height: 12rem;
      font-size: var(--text-xs);
      /* opacity + blur are driven inline on scroll; hint the compositor. */
      will-change: opacity, filter;
    }

    /* Each line wipes open left-to-right, staggered by its --i. Starts fully
       clipped; the host's [revealed] attribute drives the transition.
       fit-content shrinks the box to the text so the wipe spans the glyphs, not
       the full column width (otherwise the reveal crosses empty space). */
    .line {
      width: fit-content;
      clip-path: inset(0 100% 0 0);
      transition: clip-path var(--line-duration) var(--line-ease);
      transition-delay: calc(var(--i, 0) * var(--line-stagger));
      will-change: clip-path;
    }

    /* Right column is right-aligned, but a shrink-wrapped block/flex box ignores
       text-align — push it over so the lines stay flush right. */
    .labels > div:first-child .line {
      margin-left: auto;
    }

    :host([revealed]) .line {
      clip-path: inset(0 0 0 0);
    }

    @media (prefers-reduced-motion: reduce) {
      .line {
        transition: none;
      }
    }

    .labels > div:first-child {
      margin-right: 9rem;
      text-align: right;
    }

    .labels > div:last-child {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      margin-left: 2rem;
      text-align: left;
    }

    .labels > div:first-child > div:last-child {
      margin-right: 3rem;
    }

    .labels > div:last-child > div:last-child {
      margin-left: 3rem;
    }

    @media (min-width: 1024px) {
      .labels {
        width: 72%;
        height: 14rem;
      }
    }

    @media (min-width: 1280px) {
      .labels {
        font-size: var(--text-sm);
        width: 75%;
        height: 17.5rem;
      }
    }

    @media (min-width: 1536px) {
      .labels {
        width: 70%;
        height: 20rem;
        // font-size: 1rem;
      }

      .labels > div:last-child {
        margin-left: 2rem;
      }

      .labels > div:first-child > div:last-child {
        margin-right: 3rem;
      }

      .labels > div:last-child > div:last-child {
        margin-left: 3rem;
      }
    }

    @container (orientation: portrait) {
      .labels {
        width: clamp(280px, 550px, 80%);
        height: auto;
        position: absolute;
        top: 62%;
      }

      .labels > div:last-child {
        display: none;
      }

      .labels > div:first-child {
        margin-right: 0;
      }
    }
  `;

  firstUpdated() {
    // The whole scene requires JS, so starting clipped (hidden until revealed)
    // is safe. Under reduced motion, reveal immediately with no scroll fade.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.toggleAttribute("revealed", true);
      return;
    }

    // Wait out the initial page reveal, then unclip (staggered).
    this.#revealTimer = window.setTimeout(() => {
      this.toggleAttribute("revealed", true);
    }, this.revealDelay);

    // Scroll-linked fade/blur runs independently of the reveal, live from load.
    this.#labels = this.renderRoot.querySelector<HTMLElement>(".labels");
    window.addEventListener("scroll", this.#onScroll, { passive: true });
    this.#onScroll();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.#revealTimer) clearTimeout(this.#revealTimer);
    window.removeEventListener("scroll", this.#onScroll);
  }

  render() {
    return html`
      <div class="labels">
        <div>
          <div class="line" style="--i: 0">Design Conscious</div>
          <div class="line" style="--i: 1">Full Stack Developer</div>
        </div>
        <div>
          <div class="line" style="--i: 2">Partnering With Creative Teams</div>
          <div class="line" style="--i: 3">
            Building Modern, performant Websites
          </div>
        </div>
      </div>
    `;
  }
}
