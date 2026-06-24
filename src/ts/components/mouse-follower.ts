import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

/**
 * <mouse-follower>
 *
 * Host element that eases toward the cursor and reports which kind of
 * follower-target (if any) sits beneath the pointer.
 *
 * Reflected attributes:
 *   data-active="<type>"  the data-follower value under the cursor, or "".
 *   data-hot              present when the cursor is over any [data-follower].
 */
@customElement("mouse-follower")
export class MouseFollower extends LitElement {
  /** Smoothing factor; higher = snappier follow. */
  @property({ type: Number })
  speed = 10;

  /** data-follower value currently under the cursor (reflected to [data-active]). */
  @property({ type: String, attribute: "data-active", reflect: true })
  followerType = "";

  /** Whether the cursor is over any [data-follower] target (reflected to [data-hot]). */
  @property({ type: Boolean, attribute: "data-hot", reflect: true })
  isHot = false;

  private x = 0;
  private y = 0;
  private now = 0;
  private rafId?: number;

  static styles = css`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      pointer-events: none;
    }
  `;

  private frame = () => {
    let delta = -this.now + (this.now = Date.now());
    delta *= 0.001;
    delta = Math.min(delta, 1 / 20);
    delta *= this.speed;

    const { e, f } = new DOMMatrix(this.style.transform);
    this.style.transform = `translate(${e + delta * (this.x - e)}px, ${f + delta * (this.y - f)}px)`;

    this.trackMouse();
    this.rafId = window.requestAnimationFrame(this.frame);
  };

  private handleMouseMove = (event: MouseEvent) => {
    this.x = event.clientX;
    this.y = event.clientY;
  };

  private trackMouse() {
    const el = document.elementFromPoint(this.x, this.y);
    const target = el?.closest("[data-follower]") as HTMLElement | null;
    const type = target?.dataset.follower ?? "";

    if (type !== this.followerType) this.followerType = type;
    const hot = Boolean(type);
    if (hot !== this.isHot) this.isHot = hot;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.rafId = window.requestAnimationFrame(this.frame);
    window.addEventListener("mousemove", this.handleMouseMove, {
      passive: true,
    });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.rafId !== undefined) window.cancelAnimationFrame(this.rafId);
    window.removeEventListener("mousemove", this.handleMouseMove);
  }

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mouse-follower": MouseFollower;
  }
}
