import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("mouse-follower")
export class MouseFollower extends LitElement {
  @property({ type: Number })
  speed: number = 10;

  @state()
  private x = 0;
  @state()
  private y = 0;

  private now = 0;
  private rafId: number | undefined;

  static styles = css`
    :host {
      position: fixed;
    }
  `;

  private frame = () => {
    let delta: number = -this.now + (this.now = Date.now());
    delta *= 0.001;
    delta = Math.min(delta, 0.05);
    delta *= this.speed;

    const { e, f } = new DOMMatrix(this.style.transform);
    const [dx, dy] = [this.x - e, this.y - f];
    this.style.transform = `translate(${e + delta * dx}px, ${f + delta * dy}px)`;

    this.rafId = window.requestAnimationFrame(() => this.frame());
  };

  private handleMouseMove = (event: MouseEvent) => {
    this.x = event.clientX;
    this.y = event.clientY;
  };

  connectedCallback(): void {
    super.connectedCallback();
    this.rafId = window.requestAnimationFrame(this.frame);
    window.addEventListener("mousemove", this.handleMouseMove);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.rafId) window.cancelAnimationFrame(this.rafId);
    window.removeEventListener("mousemove", this.handleMouseMove);
  }

  render() {
    return html`
      <div>
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mouse-follower": MouseFollower;
  }
}
