import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("about-scene-decor")
export class AboutSceneDecor extends LitElement {
  static styles?: CSSResultGroup | undefined = css`
    :host {
      position: absolute;
      inset: 0;
      z-index: -1;
    }

    decor-diamond:nth-child(1) {
      position: absolute;
      left: 55%;
      top: 10%;
      width: 1.5rem;
      height: 1.5rem;
    }

    decor-diamond:nth-child(2) {
      position: absolute;
      left: 5%;
      top: 50%;
      width: 1.5rem;
      height: 1.5rem;
    }

    decor-diamond:nth-child(3) {
      position: absolute;
      left: 90%;
      top: 70%;
      width: 1.5rem;
      height: 1.5rem;
    }

    decor-diamond:nth-child(4) {
      position: absolute;
      left: 20%;
      top: 85%;
      width: 1.125rem;
      height: 1.125rem;
    }

    decor-diamond:nth-child(5) {
      position: absolute;
      left: 24%;
      top: 33%;
      width: 4rem;
      height: 4rem;
      filter: blur(0.5rem);
    }
  `;

  render() {
    return html`
      <decor-diamond color="indigo" decorStyle="fill"></decor-diamond>
      <decor-diamond color="indigo" decorStyle="outline"></decor-diamond>
      <decor-diamond color="coral" decorStyle="outline"></decor-diamond>
      <decor-diamond color="coral" decorStyle="fill"></decor-diamond>
      <decor-diamond color="coral" decorStyle="outline"></decor-diamond>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "about-scene-decor": AboutSceneDecor;
  }
}
