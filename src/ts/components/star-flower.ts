import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement, query } from "lit/decorators.js";

@customElement("star-flower")
export class StarFlower extends LitElement {
  private now = 0;
  private rotationCurrent = 0;
  private rotationMax = 720;
  private rotationTarget = 0;
  private scrollY!: number;
  private rafId!: number;

  @query(".t")
  t!: HTMLElement;

  static styles?: CSSResultGroup | undefined = css`
    :host > div {
      display: none;
      position: fixed;
      top: 0;
      bottom: 0;

      @media (min-width: 40rem) {
        display: flex;
        align-items: flex-end;
        justify-content: center;
        width: 3.5rem;
        padding-bottom: 3rem;
      }
    }
  `;

  handleScroll = () => {
    this.scrollY = window.scrollY;

    // Get scroll position as a percentage of the total scrollable height
    const scrollPercent =
      this.scrollY /
      (document.documentElement.scrollHeight - window.innerHeight);

    this.rotationTarget = scrollPercent * this.rotationMax;
  };

  frame = () => {
    let delta = -this.now + (this.now = Date.now());
    delta *= 0.001;
    delta = Math.min(delta, 0.05);

    // update transform
    const diff = this.rotationTarget - this.rotationCurrent;
    if (Math.abs(diff) < 0.1) {
      this.rotationCurrent = this.rotationTarget;
    } else {
      this.rotationCurrent += diff * delta * 5;
    }
    this.t.style.transform = `rotate(${this.rotationCurrent}deg)`;

    this.rafId = window.requestAnimationFrame(() => this.frame());
  };

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("scroll", this.handleScroll);
    this.rafId = window.requestAnimationFrame(this.frame);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.cancelAnimationFrame(this.rafId);
  }

  render() {
    return html`
      <div>
        <div class="t" style="transform: rotate(0deg)"><slot></slot></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "star-flower": StarFlower;
  }
}
