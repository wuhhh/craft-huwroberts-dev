import { html, css, LitElement, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("decor-diamond")
export class DecorDiamond extends LitElement {
  @property({ type: String })
  color: "coral" | "indigo" = "coral";
  @property({ type: String })
  decorStyle: "outline" | "fill" = "fill";
  @property({ type: Boolean })
  pointerMotion = false;

  static styles?: CSSResultGroup | undefined = css`
    :host {
      display: block;
      transform: scaleY(0.67) rotateZ(45deg);
    }

    div {
      position: absolute;
      inset: 0;
    }

    .coral.outline {
      border: 1px solid var(--color-coral-red);
    }

    .coral.fill {
      background-color: var(--color-coral-red);
    }

    .indigo.outline {
      border: 1px solid var(--color-seabed-indigo);
    }

    .indigo.fill {
      background-color: var(--color-seabed-indigo);
    }
  `;

  render() {
    if (this.color === "coral" && this.decorStyle === "outline")
      return html`<div class="coral outline"></div>`;
    if (this.color === "coral" && this.decorStyle === "fill")
      return html`<div class="coral fill"></div>`;
    if (this.color === "indigo" && this.decorStyle === "outline")
      return html`<div class="indigo outline"></div>`;
    if (this.color === "indigo" && this.decorStyle === "fill")
      return html`<div class="indigo fill"></div>`;

    return html`<div></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "decor-diamond": DecorDiamond;
  }
}
