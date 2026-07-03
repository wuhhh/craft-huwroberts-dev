import { css, html, LitElement, type CSSResultGroup, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("copy-clip")
export class CopyClip extends LitElement {
  /** Explicit value to copy. Falls back to the host's textContent. */
  @property({ type: String })
  value?: string;

  /** Fallback tip text (shown only when no element is slotted into `tip`). */
  @property({ type: String })
  tip: string = "Click to copy";

  /** Fallback text shown briefly after a copy (or slotted via `copied`). */
  @property({ type: String, attribute: "copied-tip" })
  copiedTip: string = "Copied";

  /** How long (ms) the "copied" state stays visible. */
  @property({ type: Number, attribute: "copied-duration" })
  copiedDuration: number = 1500;

  @state()
  private _copied = false;

  @state()
  private _hovered = false;

  @state()
  private _permanent = false;

  private _timer?: ReturnType<typeof setTimeout>;

  connectedCallback(): void {
    super.connectedCallback();

    // Permanent tip for touch / no-pointer devices.
    const mq = window.matchMedia("(pointer: none), (any-pointer: coarse)");
    this._setPermanent(mq.matches);
    mq.addEventListener("change", (e) => this._setPermanent(e.matches));
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this._timer);
  }

  private _setPermanent(v: boolean) {
    this._permanent = v;
    this.toggleAttribute("data-permanent", v);
  }

  private _getValue(): string {
    return this.value?.trim() || (this.textContent ?? "").trim();
  }

  private _copy = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();

    const text = this._getValue();
    if (!text) return;

    // Flip the copied state immediately — don't wait on the clipboard API.
    this._copied = true;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this._copied = false;
    }, this.copiedDuration);

    navigator.clipboard.writeText(text).catch(() => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        /* best-effort fallback only */
      }
    });
  };

  private _onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      this._copy(e);
    }
  };

  private _onEnter = () => {
    if (!this._permanent) this._hovered = true;
  };

  private _onLeave = () => {
    if (!this._permanent) this._hovered = false;
  };

  // Layout & sizing are controlled from outside
  static styles?: CSSResultGroup | undefined = css`
    :host {
      display: inline-block;
      cursor: pointer;
    }
    .wrapper {
      display: inline;
    }
  `;

  render() {
    const tipVisible = this._hovered || this._permanent;
    const showCopied = this._copied;
    const showPending = !this._copied && tipVisible;

    return html`
      <span
        class="wrapper"
        role="button"
        tabindex="0"
        @click=${this._copy}
        @keydown=${this._onKeydown}
        @pointerenter=${this._onEnter}
        @pointerleave=${this._onLeave}
      >
        <slot></slot>
        ${showPending
          ? html`<span aria-hidden="true"
              ><slot name="tip">${this.tip}</slot></span
            >`
          : nothing}
        ${showCopied
          ? html`<span role="status" aria-live="polite"
              ><slot name="copied">${this.copiedTip}</slot></span
            >`
          : nothing}
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "copy-clip": CopyClip;
  }
}
