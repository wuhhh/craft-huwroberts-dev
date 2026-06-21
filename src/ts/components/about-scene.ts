import { LitElement, css, html, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("about-scene")
export class aboutScene extends LitElement {
  static styles?: CSSResultGroup | undefined = css`
    :host {
      background: #0033cc;
    }
  `;

  protected render(): unknown {
    return html` <div>About scene here..</div> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "about-scene": aboutScene;
  }
}
