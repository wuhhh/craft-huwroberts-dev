import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("mouse-follower")
export class MouseFollower extends LitElement {
  render() {
    return html` <div class="follower">&bull;</div> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "mouse-follower": MouseFollower;
  }
}
